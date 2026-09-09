export const eventNames = [
  "feed_card_impression",
  "feed_card_opened",
  "card_revealed",
  "card_completed",
  "card_saved",
  "card_unsaved",
  "card_skipped",
  "recall_submitted",
  "study_session_started",
  "study_session_completed",
  "paw_points_earned",
  "miso_unlock_seen",
  "onboarding_completed",
] as const;
export type EventName = (typeof eventNames)[number];
// Allowlist only; no free-text answers, content bodies, email or patient information.
export type ProductEvent = {
  id: string;
  schemaVersion: 1;
  name: EventName;
  at: string;
  cardId?: string;
  sessionId?: string;
  amount?: number;
  contentVersion?: number;
};
export type CardInteraction = {
  viewCount: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  lastOpenedAt: string | null;
  lastRevealedAt: string | null;
  lastSkippedAt: string | null;
  completedAt: string | null;
};
export const emptyInteraction: CardInteraction = {
  viewCount: 0,
  firstViewedAt: null,
  lastViewedAt: null,
  lastOpenedAt: null,
  lastRevealedAt: null,
  lastSkippedAt: null,
  completedAt: null,
};
export type StudySession = {
  id: string;
  mode: "read" | "recall";
  startedAt: string;
  completedAt: string | null;
  cardIds: string[];
  // Older snapshots omit this map; their completions belong to version 1.
  cardVersions?: Record<string, number>;
  completedCardIds: string[];
  revealedCardIds: string[];
  impressionCardIds: string[];
  earnedPaws: number;
  activeMilliseconds: number;
};
export const catBreeds = ["tuxedo", "ginger", "siamese"] as const;
export type CatBreed = (typeof catBreeds)[number];
export type Preferences = {
  subjectIds: string[];
  examDate: string | null;
  analyticsConsent: boolean;
  misoBreed: CatBreed;
  misoName: string;
};
export const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
