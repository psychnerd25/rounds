import type { RevisionCard } from "./content";
import type { StudyState } from "../state/progress";
export function isAvailableCard(card: RevisionCard, now = new Date()) {
  return card.visibility === "published" &&
    (!card.publishedAt || Date.parse(card.publishedAt) <= now.getTime());
}
export const rankingWeights = {
  unseen: 60,
  freshness: 24,
  freshDays: 30,
  recentView: 55,
  recentDays: 3,
  repetition: 4,
  repetitionCap: 6,
  saved: -8,
  preferredSubject: 18,
  practicedSubject: 8,
  weakTopic: 3,
  skipped: 15,
  priority: 10,
  subjectRepeat: 65,
  topicRepeat: 35,
} as const;
const days = (at: string | null, now: Date) =>
  at ? Math.max(0, (now.getTime() - Date.parse(at)) / 86400000) : Infinity;
export type RankContext = {
  now: Date;
  studyMode?: "read" | "recall";
  subjectId?: string;
  excludeIds?: string[];
  limit?: number;
  subjectAffinity?: Record<string, number>;
};

export function latestReview(card: RevisionCard, state: StudyState) {
  return state.events
    .filter((event) => matchesCardVersion(card, event))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .at(-1);
}

export function matchesCardVersion(card: RevisionCard, event: { cardId: string; contentVersion?: number }) {
  return event.cardId === card.id && (event.contentVersion ?? 1) === card.contentVersion;
}

export function isUnseen(card: RevisionCard, state: StudyState) {
  return !state.events.some((event) => matchesCardVersion(card, event)) &&
    !state.reads.some((event) => matchesCardVersion(card, event));
}

export function isWeakCard(card: RevisionCard, state: StudyState, now = new Date()) {
  const last = latestReview(card, state);
  return isAvailableCard(card, now) && !!card.prompt && !!last && last.rating !== "known";
}

// New cards are an editorial stream: newest published cards lead the stream.
// Once a card has been covered, the learner's latest recall determines need.
function freshnessAndNeedOrder(a: RevisionCard, b: RevisionCard, state: StudyState) {
  const aNew = isUnseen(a, state);
  const bNew = isUnseen(b, state);
  if (aNew !== bNew) return aNew ? -1 : 1;
  if (aNew && bNew) {
    const aPublished = a.publishedAt ? Date.parse(a.publishedAt) : -Infinity;
    const bPublished = b.publishedAt ? Date.parse(b.publishedAt) : -Infinity;
    if (aPublished !== bPublished) return bPublished - aPublished;
  } else {
    const need = (card: RevisionCard) => {
      const review = latestReview(card, state);
      if (!review) return 30;
      return review.rating === "again" ? 100 : review.rating === "partial" ? 60 : 0;
    };
    const difference = need(b) - need(a);
    if (difference) return difference;
  }
  return 0;
}
export function discoveryScore(
  card: RevisionCard,
  state: StudyState,
  context: RankContext,
) {
  const w = rankingWeights,
    exposure = state.interactions[card.id];
  const last = latestReview(card, state);
  return (
    (isUnseen(card, state) ? w.unseen : 0) +
    w.freshness *
      Math.max(0, 1 - days(card.publishedAt, context.now) / w.freshDays) -
    w.recentView *
      Math.max(
        0,
        1 - days(exposure?.lastViewedAt ?? null, context.now) / w.recentDays,
      ) -
    Math.min(exposure?.viewCount ?? 0, w.repetitionCap) * w.repetition +
    (state.saved.includes(card.id) ? w.saved : 0) +
    (state.preferences.subjectIds.includes(card.subjectId)
      ? w.preferredSubject
      : 0) +
    Math.min(1, context.subjectAffinity?.[card.subjectId] ?? 0) *
      w.practicedSubject +
    (last && last.rating !== "known" ? w.weakTopic : 0) -
    (days(exposure?.lastSkippedAt ?? null, context.now) < 1 ? w.skipped : 0) +
    Math.max(0, Math.min(1, card.priority)) * w.priority
  );
}
export function reviewStatus(card: RevisionCard, state: StudyState, now: Date) {
  const history = state.events
    .filter((e) => matchesCardVersion(card, e))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const last = history.at(-1);
  const interval =
    last?.rating === "known" ? 7 : last?.rating === "partial" ? 2 : 1;
  const dueAt = last
    ? new Date(Date.parse(last.at) + interval * 86400000).toISOString()
    : null;
  const due = !!dueAt && Date.parse(dueAt) <= now.getTime();
  const saved = state.saved.includes(card.id);
  const read = state.reads.some(e => matchesCardVersion(card, e));
  const updated = isUnseen(card, state) && [...state.events, ...state.reads]
    .some(e => e.cardId === card.id && (e.contentVersion ?? 1) < card.contentVersion);
  const unfinished =
    !!state.interactions[card.id]?.viewCount &&
    !state.interactions[card.id]?.completedAt &&
    !last;
  const score =
    (due ? 60 + Math.min(30, days(dueAt, now)) : 0) +
    (last?.rating === "again" ? 30 : last?.rating === "partial" ? 15 : 0) +
    Math.min(3, history.slice(-3).filter((e) => e.rating === "again").length) *
      5 +
    (saved ? 12 : 0) +
    (unfinished ? 8 : 0);
  return {
    dueAt,
    eligible: !!card.prompt && (due || (!last && (saved || unfinished || read || updated))),
    score,
    reason: due
      ? "Due for recall"
      : updated
        ? "Updated since your last study"
        : saved && !last
        ? "Saved for a first recall"
        : read && !last
          ? "Read; ready for first recall"
        : "Not yet completed",
    mastery:
      last?.rating === "known"
        ? "confident"
        : last
          ? "developing"
          : "unassessed",
  };
}
export interface RecommendationService {
  rank(
    cards: readonly RevisionCard[],
    state: StudyState,
    context: RankContext & { mode: "discovery" | "review" },
  ): RevisionCard[];
}
export const localRecommendations: RecommendationService = {
  rank(cards, state, context) {
    const byId = new Map(cards.map((c) => [c.id, c]));
    const counts: Record<string, number> = {};
    for (const event of [...state.events, ...state.reads].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(-100)) {
      const subject = byId.get(event.cardId)?.subjectId;
      if (subject) counts[subject] = (counts[subject] ?? 0) + 1;
    }
    const maximum = Math.max(1, ...Object.values(counts));
    context = {
      ...context,
      subjectAffinity:
        context.subjectAffinity ??
        Object.fromEntries(
          Object.entries(counts).map(([id, count]) => [id, count / maximum]),
        ),
    };
    const available = [...new Map(cards.map((c) => [c.id, c])).values()].filter(
      (c) =>
        isAvailableCard(c, context.now) &&
        (!context.subjectId || c.subjectId === context.subjectId) &&
        !context.excludeIds?.includes(c.id) &&
        (context.mode !== "review" ||
          reviewStatus(c, state, context.now).eligible),
    );
    const result: RevisionCard[] = [];
    while (available.length && result.length < (context.limit ?? 10)) {
      const score = (c: RevisionCard) =>
        (context.mode === "review"
          ? reviewStatus(c, state, context.now).score
          : discoveryScore(c, state, context)) -
        (!context.subjectId && result.at(-1)?.subjectId === c.subjectId
          ? rankingWeights.subjectRepeat
          : 0) -
        (result.slice(-2).some((p) => p.topicId === c.topicId)
          ? rankingWeights.topicRepeat
          : 0);
      available.sort((a, b) =>
        (context.mode === "review" ? 0 : freshnessAndNeedOrder(a, b, state)) ||
        score(b) - score(a) ||
        a.id.localeCompare(b.id),
      );
      result.push(available.shift()!);
    }
    return result;
  },
};
