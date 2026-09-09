import type { Recall } from "../data/cards";
import { emptyPawState, parsePawState, type PawState } from "./paw-points.ts";
import {
  newId,
  type CardInteraction,
  type StudySession,
  type Preferences,
  type ProductEvent,
} from "../domain/interactions.ts";
import { validateExtensions } from "../domain/validation.ts";
export type ReviewEvent = {
  id: string;
  cardId: string;
  contentVersion?: number;
  rating: Recall;
  at: string;
  day: string;
};
export type ReadEvent = { id: string; cardId: string; contentVersion?: number; at: string; day: string };
export type StudyState = {
  version: 4;
  saved: string[];
  events: ReviewEvent[];
  reads: ReadEvent[];
  paws: PawState;
  interactions: Record<string, CardInteraction>;
  sessions: StudySession[];
  preferences: Preferences;
  onboarding: { version: number; completedAt: string | null; skipped: boolean };
  analytics: ProductEvent[];
  processedCommands: string[];
};
export const emptyState: StudyState = {
  version: 4,
  saved: [],
  events: [],
  reads: [],
  paws: emptyPawState,
  interactions: {},
  sessions: [],
  preferences: {
    subjectIds: [],
    examDate: null,
    analyticsConsent: false,
    misoBreed: "tuxedo",
    misoName: "Miso",
  },
  onboarding: { version: 1, completedAt: null, skipped: false },
  analytics: [],
  processedCommands: [],
};
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function previousDay(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}
export function streak(events: { day: string }[], now = new Date()) {
  const days = new Set(events.map((e) => e.day));
  let cursor = days.has(dayKey(now)) ? now : previousDay(now),
    count = 0;
  while (days.has(dayKey(cursor))) {
    count++;
    cursor = previousDay(cursor);
  }
  return count;
}
function validEvent(event: unknown): event is ReadEvent {
  if (!event || typeof event !== "object") return false;
  const e = event as ReadEvent;
  return (
    typeof e.id === "string" &&
    typeof e.cardId === "string" &&
    (e.contentVersion === undefined || (Number.isSafeInteger(e.contentVersion) && e.contentVersion >= 1)) &&
    typeof e.day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.day) &&
    typeof e.at === "string" &&
    Number.isFinite(Date.parse(e.at))
  );
}
export function parseState(raw: string | null): StudyState {
  if (!raw) return emptyState;
  const value = JSON.parse(raw);
  if (
    !value ||
    ![1, 2, 3, 4].includes(value.version) ||
    !Array.isArray(value.saved) ||
    !value.saved.every((x: unknown) => typeof x === "string") ||
    !Array.isArray(value.events) ||
    !value.events.every(
      (e: ReviewEvent) =>
        validEvent(e) && ["again", "partial", "known"].includes(e.rating),
    ) ||
    (value.version >= 2 &&
      (!Array.isArray(value.reads) || !value.reads.every(validEvent)))
  )
    throw new Error("Invalid saved data");
  if (value.version === 4) validateExtensions(value);
  const paws = value.version >= 3 ? parsePawState(value.paws) : emptyPawState;
  // Earlier versions minted event-ID rewards. Seed daily keys to prevent migration
  // from paying again for study already credited that day.
  const migratedPaws =
    value.version === 3
      ? {
          ...paws,
          awarded: [
            ...new Set([
              ...paws.awarded,
              ...value.events.map(
                (e: ReviewEvent) => `recall_answered:${e.cardId}:${e.day}`,
              ),
              ...value.reads.map(
                (e: ReadEvent) => `short_completed:${e.cardId}:${e.day}`,
              ),
            ]),
          ],
        }
      : paws;
  const savedPreferences = value.version === 4 ? value.preferences : {};
  return {
    ...emptyState,
    ...(value.version === 4 ? value : {}),
    version: 4,
    saved: value.saved,
    events: value.events,
    reads: value.version === 1 ? [] : value.reads,
    paws: migratedPaws,
    preferences: {
      ...emptyState.preferences,
      ...savedPreferences,
      misoName: savedPreferences?.misoName === "Cat" ? "Miso" : (savedPreferences?.misoName ?? emptyState.preferences.misoName),
    },
  };
}
export function activity(state: StudyState) {
  return [...state.events, ...state.reads];
}
export function completeActivity(
  state: StudyState,
  cardId: string,
  rating: Recall | null,
  now = new Date(),
  contentVersion?: number,
) {
  const day = dayKey(now);
  const firstToday = !activity(state).some((e) => e.day === day);
  const event = {
    id: newId(),
    cardId,
    ...(contentVersion === undefined ? {} : { contentVersion }),
    at: now.toISOString(),
    day,
  };
  const next: StudyState = rating
    ? { ...state, events: [...state.events, { ...event, rating }] }
    : state.reads.some((e) => e.day === day && e.cardId === cardId && (e.contentVersion ?? 1) === (contentVersion ?? 1))
      ? state
      : { ...state, reads: [...state.reads, event] };
  return {
    state: next,
    firstToday,
    streak: streak(activity(next), now),
    day,
    event: next === state ? null : event,
  };
}
