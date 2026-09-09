import { useEffect, useRef, useState } from "react";
import {
  AppState,
  type FlatList,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import type { Recall, RevisionCard } from "../domain/content";
import {
  localRecommendations,
  isAvailableCard,
  type RecommendationService,
} from "../domain/ranking";
import { newId } from "../domain/interactions";
import { rewardEconomy } from "../domain/study-service";
import { useStudy } from "../state/study";
import { useContent } from "../state/content";
import { selectStudyDeck, type FeedParams } from "../domain/feed-selection";
export type { FeedParams } from "../domain/feed-selection";
export function useStudyFeed(
  params: FeedParams,
  reduced: boolean,
  recommendations: RecommendationService = localRecommendations,
) {
  const study = useStudy(),
    { cards } = useContent();
  // Active recall is the primary study path. Reading remains available as a
  // deliberate secondary mode for first exposure and explanation.
  const [mode, setModeValue] = useState<"read" | "recall">("recall");
  const [rotation, setRotation] = useState(!!params.subject);
  const [subject, setSubjectValue] = useState(params.subject ?? "all");
  const [deck, setDeck] = useState<RevisionCard[]>([]);
  const [index, setIndex] = useState(0),
    [height, setHeight] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<Record<string, Recall>>({});
  const [elapsed, setElapsed] = useState(0);
  const [pawFeedback, setPawFeedback] = useState<{
    amount: number;
    unlocked: boolean;
  } | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const list = useRef<FlatList<RevisionCard | null>>(null),
    currentIndex = useRef(0);
  const foreground = useRef(
    AppState.currentState !== "background" &&
      AppState.currentState !== "inactive",
  );
  const activeMs = useRef(0);
  const begin = (
    nextMode = mode,
    nextSubject = subject,
    excludeIds: string[] = [],
    allowRepeatIfEmpty = false,
  ) => {
    const snapshot = study.snapshot(),
      now = new Date();
    const ranked = selectStudyDeck(cards, snapshot, params, nextMode, nextSubject, now, excludeIds, recommendations, allowRepeatIfEmpty);
    const id = newId();
    study.dispatch(
      {
        kind: "start",
        session: {
          id,
          mode: nextMode,
          startedAt: now.toISOString(),
          completedAt: null,
          cardIds: ranked.map((c) => c.id),
          cardVersions: Object.fromEntries(ranked.map(c => [c.id, c.contentVersion])),
          completedCardIds: [],
          revealedCardIds: [],
          impressionCardIds: [],
          earnedPaws: 0,
          activeMilliseconds: 0,
        },
      },
      `start:${id}`,
    );
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    setSessionId(id);
    setDeck(ranked);
    setModeValue(nextMode);
    setSubjectValue(nextSubject);
    setIndex(0);
    currentIndex.current = 0;
    activeMs.current = 0;
    setElapsed(0);
    setRevealed({});
    setRatings({});
    setPawFeedback(null);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };
  useEffect(() => {
    const review =
      params.mode !== "read" ||
      params.collection === "weak" ||
      params.collection === "review";
    setRotation(!!params.subject);
    begin(review ? "recall" : "read", params.subject ?? "all");
    // Session snapshots intentionally don't reorder when study state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.subject,
    params.topic,
    params.collection,
    params.card,
    params.mode,
    recommendations,
  ]);
  useEffect(() => {
    // Additions and edits wait for the next round. Withdrawals stop an obsolete
    // round immediately; already earned progress remains in local history.
    const available = new Set(cards.filter(c => isAvailableCard(c)).map(c => c.id));
    if (deck.some(c => !available.has(c.id))) begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      foreground.current = s === "active";
    });
    return () => {
      sub.remove();
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);
  const card = deck[index];
  const track = (
    name:
      | "feed_card_impression"
      | "feed_card_opened"
      | "card_revealed"
      | "card_skipped",
    target = card,
  ) => {
    if (!target) return;
    const id =
      name === "feed_card_impression"
        ? `impression:${sessionId}:${target.id}`
        : newId();
    study.dispatch(
      {
        kind: "interaction",
        event: {
          id,
          schemaVersion: 1,
          name,
          at: new Date().toISOString(),
          cardId: target.id,
          sessionId,
          contentVersion: target.contentVersion,
        },
      },
      id,
    );
  };
  useEffect(() => {
    activeMs.current = 0;
    setElapsed(0);
    if (!card || !sessionId) return;
    let previous = Date.now(),
      impressed = false;
    const timer = setInterval(() => {
      const now = Date.now(),
        delta = Math.min(1000, now - previous);
      previous = now;
      if (!foreground.current) return;
      activeMs.current += delta;
      setElapsed(activeMs.current);
      if (!impressed && activeMs.current >= 800) {
        track("feed_card_impression");
        impressed = true;
      }
    }, 250);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, sessionId]);
  const session = study.sessions.find((s) => s.id === sessionId);
  const settle = (next: number) => {
    next = Math.max(0, Math.min(deck.length, next));
    const previous = currentIndex.current;
    if (next === previous) return;
    if (
      deck[previous] &&
      !session?.completedCardIds.includes(deck[previous].id)
    )
      track("card_skipped", deck[previous]);
    setPawFeedback(null);
    currentIndex.current = next;
    setIndex(next);
  };
  const move = (delta: number) => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    const next = Math.max(
      0,
      Math.min(deck.length, currentIndex.current + delta),
    );
    settle(next);
    list.current?.scrollToOffset({ offset: next * height, animated: !reduced });
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!height) return;
    const next = Math.round(event.nativeEvent.contentOffset.y / height);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => settle(next), 140);
  };
  const complete = (rating: Recall | null) => {
    if (!card) return;
    const result = study.dispatch(
      {
        kind: "complete",
        cardId: card.id,
        sessionId,
        rating,
        activeMs: activeMs.current,
      },
      `complete:${sessionId}:${card.id}`,
    );
    const recorded = study
      .snapshot()
      .sessions.find((s) => s.id === sessionId)
      ?.completedCardIds.includes(card.id);
    if (!recorded) return;
    if (rating) setRatings((r) => ({ ...r, [card.id]: rating }));
    if (result?.amount) {
      setPawFeedback({
        amount: result.amount,
        unlocked: !!result.newUnlocks.length,
      });
    }
    study.dispatch({ kind: "finish", sessionId }, `finish:${sessionId}`);
  };
  return {
    study,
    mode,
    rotation,
    subject,
    deck,
    card,
    index,
    height,
    setHeight,
    list,
    currentIndex,
    scrollTimer,
    revealed,
    ratings,
    pawFeedback,
    session,
    settle,
    move,
    onScroll,
    canComplete:
      elapsed >=
      (mode === "read" ? rewardEconomy.minReadMs : rewardEconomy.minRecallMs),
    completed: !!card && !!session?.completedCardIds.includes(card.id),
    completeRead: () => complete(null),
    rate: (r: Recall) => complete(r),
    reveal: () => {
      if (card) {
        track("card_revealed");
        setRevealed((r) => ({ ...r, [card.id]: true }));
      }
    },
    open: () => track("feed_card_opened"),
    reset: () => begin(mode, subject, deck.length ? [deck.at(-1)!.id] : [], true),
    setMode: (value: "read" | "recall") => begin(value),
    setSubject: (value: string) => begin(mode, value),
    switchPath: (value: boolean) => {
      setRotation(value);
      begin(mode, "all");
    },
  };
}
