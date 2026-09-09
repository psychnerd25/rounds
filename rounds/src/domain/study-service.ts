import { validSession } from "./validation.ts";
import { catBreeds } from "./interactions.ts";
import type { Recall } from "./content";
import {
  emptyInteraction,
  type CatBreed,
  type ProductEvent,
  type StudySession,
} from "./interactions.ts";
import {
  activity,
  completeActivity,
  type StudyState,
} from "../state/progress.ts";
import { awardPawPoints, type PawAward } from "../state/paw-points.ts";
export const rewardEconomy = {
  read: 4,
  recall: 6,
  dailyGoal: 4,
  dailyBonus: 12,
  streakEvery: 7,
  streakBonus: 10,
  minReadMs: 8000,
  minRecallMs: 3000,
};
export type StudyCommand =
  | { kind: "start"; session: StudySession }
  | { kind: "interaction"; event: ProductEvent }
  | {
      kind: "complete";
      cardId: string;
      sessionId: string;
      rating: Recall | null;
      activeMs: number;
    }
  | { kind: "finish"; sessionId: string }
  | { kind: "save"; cardId: string }
  | { kind: "onboard"; skipped: boolean }
  | { kind: "unlocks_seen" }
  | { kind: "preferences"; subjectIds: string[] }
  | { kind: "miso_breed"; breed: CatBreed }
  | { kind: "miso_name"; name: string };
export function applyStudyCommand(
  state: StudyState,
  command: StudyCommand,
  id: string,
  now = new Date(),
) {
  if (typeof id !== "string" || !id.trim() || state.processedCommands.includes(id))
    return { state, amount: 0, newUnlocks: [] as string[], firstToday: false };
  let next = state,
    amount = 0,
    newUnlocks: string[] = [],
    firstToday = false;
  const at = now.toISOString();
  const log = (
    name: ProductEvent["name"],
    metadata: Partial<ProductEvent> = {},
  ) => {
    next = {
      ...next,
      analytics: [
        ...next.analytics,
        {
          id: `${id}:${name}`,
          schemaVersion: 1 as const,
          name,
          at,
          ...metadata,
        },
      ].slice(-500),
    };
  };
  const sessionId =
    "sessionId" in command
      ? command.sessionId
      : command.kind === "interaction"
        ? command.event.sessionId
        : undefined;
  const session = state.sessions.find((s) => s.id === sessionId);
  const updateSession = (patch: Partial<StudySession>) => {
    next = {
      ...next,
      sessions: next.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...patch } : s,
      ),
    };
  };
  if (command.kind === "start") {
    if (!validSession(command.session) || command.session.completedAt !== null ||
      command.session.completedCardIds.length || command.session.revealedCardIds.length ||
      command.session.impressionCardIds.length || command.session.earnedPaws !== 0 ||
      command.session.activeMilliseconds !== 0 ||
      state.sessions.some((s) => s.id === command.session.id))
      return { state, amount, newUnlocks, firstToday };
    next = { ...state, sessions: [...state.sessions, command.session] };
    log("study_session_started", { sessionId: command.session.id });
  } else if (command.kind === "interaction") {
    const e = command.event;
    if (
      !["feed_card_impression", "feed_card_opened", "card_revealed", "card_skipped"].includes(e.name) ||
      !session ||
      session.completedAt ||
      !e.cardId ||
      !session.cardIds.includes(e.cardId)
    )
      return { state, amount, newUnlocks, firstToday };
    const old = state.interactions[e.cardId] ?? emptyInteraction;
    let interaction = { ...old };
    if (e.name === "feed_card_impression") {
      if (session.impressionCardIds.includes(e.cardId))
        return { state, amount, newUnlocks, firstToday };
      interaction = {
        ...old,
        viewCount: old.viewCount + 1,
        firstViewedAt: old.firstViewedAt ?? at,
        lastViewedAt: at,
      };
      updateSession({
        impressionCardIds: [...session.impressionCardIds, e.cardId],
      });
    } else if (e.name === "card_revealed") {
      interaction.lastRevealedAt = at;
      updateSession({
        revealedCardIds: [...new Set([...session.revealedCardIds, e.cardId])],
      });
    } else if (e.name === "feed_card_opened") interaction.lastOpenedAt = at;
    else if (e.name === "card_skipped") interaction.lastSkippedAt = at;
    next = {
      ...next,
      interactions: { ...next.interactions, [e.cardId]: interaction },
    };
    log(e.name, {
      cardId: e.cardId,
      sessionId,
      contentVersion: e.contentVersion,
    });
  } else if (command.kind === "complete") {
    if (
      (command.rating !== null && !["again", "partial", "known"].includes(command.rating)) ||
      !session ||
      session.completedAt ||
      !session.cardIds.includes(command.cardId) ||
      session.completedCardIds.includes(command.cardId) ||
      !Number.isFinite(command.activeMs) ||
      command.activeMs <
        (command.rating
          ? rewardEconomy.minRecallMs
          : rewardEconomy.minReadMs) ||
      (session.mode === "recall" &&
        (!command.rating ||
          !session.revealedCardIds.includes(command.cardId))) ||
      (session.mode === "read" && command.rating)
    )
      return { state, amount, newUnlocks, firstToday };
    const contentVersion = session.cardVersions?.[command.cardId] ?? 1;
    const result = completeActivity(state, command.cardId, command.rating, now, contentVersion);
    next = result.state;
    firstToday = result.firstToday;
    const action = command.rating ? "recall_answered" : "short_completed";
    const awards: PawAward[] = [
      {
        id: `${action}:${command.cardId}:${result.day}`,
        action,
        amount: command.rating ? rewardEconomy.recall : rewardEconomy.read,
        at,
      },
    ];
    const uniqueToday = new Set(
      activity(next)
        .filter((e) => e.day === result.day)
        .map((e) => e.cardId),
    ).size;
    if (uniqueToday >= rewardEconomy.dailyGoal)
      awards.push({
        id: `goal:${result.day}`,
        action: "daily_goal",
        amount: rewardEconomy.dailyBonus,
        at,
      });
    if (firstToday && result.streak % rewardEconomy.streakEvery === 0)
      awards.push({
        id: `streak:${result.day}`,
        action: "streak",
        amount: rewardEconomy.streakBonus,
        at,
      });
    const paws = awardPawPoints(next.paws, awards);
    amount = paws.amount;
    newUnlocks = paws.newUnlocks;
    next = {
      ...next,
      paws: paws.state,
      interactions: {
        ...next.interactions,
        [command.cardId]: {
          ...(next.interactions[command.cardId] ?? emptyInteraction),
          completedAt: at,
        },
      },
    };
    updateSession({
      completedCardIds: [...session.completedCardIds, command.cardId],
      earnedPaws: session.earnedPaws + amount,
      activeMilliseconds:
        session.activeMilliseconds +
        Math.round(Math.min(command.activeMs, 300000)),
    });
    log(command.rating ? "recall_submitted" : "card_completed", {
      cardId: command.cardId,
      contentVersion,
      sessionId,
    });
    if (amount) log("paw_points_earned", { sessionId, amount });
  } else if (command.kind === "finish") {
    if (
      !session ||
      session.completedAt ||
      !session.cardIds.length ||
      session.completedCardIds.length !== session.cardIds.length
    )
      return { state, amount, newUnlocks, firstToday };
    updateSession({ completedAt: at });
    log("study_session_completed", { sessionId, amount: session.earnedPaws });
  } else if (command.kind === "save") {
    const saved = state.saved.includes(command.cardId);
    next = {
      ...state,
      saved: saved
        ? state.saved.filter((x) => x !== command.cardId)
        : [...state.saved, command.cardId],
    };
    log(saved ? "card_unsaved" : "card_saved", { cardId: command.cardId });
  } else if (command.kind === "onboard") {
    next = {
      ...state,
      onboarding: { version: 1, completedAt: at, skipped: command.skipped },
    };
    log("onboarding_completed");
  } else if (command.kind === "unlocks_seen") {
    next = { ...state, paws: { ...state.paws, unseenUnlocked: [] } };
    if (state.paws.unseenUnlocked.length) log("miso_unlock_seen");
  } else if (command.kind === "preferences") {
    next = {
      ...state,
      preferences: {
        ...state.preferences,
        subjectIds: [...new Set(command.subjectIds)],
      },
    };
  } else if (command.kind === "miso_breed") {
    if (!catBreeds.includes(command.breed)) return { state, amount, newUnlocks, firstToday };
    next = {
      ...state,
      preferences: { ...state.preferences, misoBreed: command.breed },
    };
  } else if (command.kind === "miso_name") {
    if (typeof command.name !== "string" || !command.name.trim() || command.name.trim().length > 30)
      return { state, amount, newUnlocks, firstToday };
    next = {
      ...state,
      preferences: { ...state.preferences, misoName: command.name.trim() },
    };
  }
  return {
    state: { ...next, processedCommands: [...next.processedCommands, id] },
    amount,
    newUnlocks,
    firstToday,
  };
}
