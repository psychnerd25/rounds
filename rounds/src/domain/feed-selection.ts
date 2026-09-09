import type { RevisionCard } from "./content";
import type { StudyState } from "../state/progress";
import { isAvailableCard, isWeakCard, localRecommendations, type RecommendationService } from "./ranking.ts";

export type FeedParams = {
  subject?: string;
  topic?: string;
  collection?: string;
  card?: string;
  mode?: string;
};

export function selectStudyDeck(
  cards: readonly RevisionCard[],
  state: StudyState,
  params: FeedParams,
  mode: "read" | "recall",
  subject: string,
  now: Date,
  excludeIds: string[] = [],
  recommendations: RecommendationService = localRecommendations,
  allowRepeatIfEmpty = false,
) {
  const candidates = cards.filter(c =>
    isAvailableCard(c, now) &&
    (subject === "all" || c.subjectId === subject) &&
    (!params.topic || c.topic === params.topic) &&
    (params.collection !== "saved" || state.saved.includes(c.id)) &&
    (params.collection !== "weak" || isWeakCard(c, state, now)) &&
    (mode !== "recall" || !!c.prompt) &&
    !excludeIds.includes(c.id),
  );
  const smart = params.collection === "review";
  const ranked = recommendations.rank(candidates, state, {
    now,
    studyMode: mode,
    mode: smart ? "review" : "discovery",
    subjectId: subject === "all" ? undefined : subject,
    excludeIds,
    limit: 10,
  });
  // A deep link must obey the same publication/filter rules as a ranked card.
  // Smart Review must also keep its due-date eligibility rules.
  const selected = (smart ? ranked : candidates).find(c => c.id === params.card);
  if (!ranked.length && allowRepeatIfEmpty && excludeIds.length) {
    return selectStudyDeck(cards, state, params, mode, subject, now, [], recommendations);
  }
  return selected
    ? [selected, ...ranked.filter(c => c.id !== selected.id)].slice(0, 10)
    : ranked;
}
