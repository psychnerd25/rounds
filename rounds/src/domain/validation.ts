import { catBreeds, eventNames } from "./interactions.ts";
const strings = (v: any) =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
const date = (v: any) =>
  v === null || (typeof v === "string" && Number.isFinite(Date.parse(v)));
const natural = (v: any) => Number.isSafeInteger(v) && v >= 0;
export function validSession(s: any): boolean {
  if (!s || typeof s.id !== "string" || !s.id.trim() ||
    !["read", "recall"].includes(s.mode) || typeof s.startedAt !== "string" || !date(s.startedAt) ||
    !date(s.completedAt) || !natural(s.earnedPaws) || !natural(s.activeMilliseconds)) return false;
  const keys = ["cardIds", "completedCardIds", "revealedCardIds", "impressionCardIds"];
  if (!keys.every(k => strings(s[k]) && s[k].every((id: string) => !!id.trim()) && new Set(s[k]).size === s[k].length)) return false;
  if (!keys.slice(1).every(k => s[k].every((id: string) => s.cardIds.includes(id)))) return false;
  if (s.cardVersions !== undefined && (!s.cardVersions || typeof s.cardVersions !== "object" ||
    Array.isArray(s.cardVersions) || Object.keys(s.cardVersions).length !== s.cardIds.length ||
    !s.cardIds.every((id: string) => Object.hasOwn(s.cardVersions, id) &&
      Number.isSafeInteger(s.cardVersions[id]) && s.cardVersions[id] >= 1))) return false;
  return s.completedAt === null || (s.cardIds.length > 0 && s.completedCardIds.length === s.cardIds.length &&
    Date.parse(s.completedAt) >= Date.parse(s.startedAt));
}
// Reject corrupt snapshots as a unit. The repository never silently resets user data.
export function validateExtensions(v: any) {
  if (
    !v.interactions ||
    typeof v.interactions !== "object" ||
    Array.isArray(v.interactions) ||
    !Object.values(v.interactions).every(
      (x: any) =>
        x &&
        natural(x.viewCount) &&
        [
          "firstViewedAt",
          "lastViewedAt",
          "lastOpenedAt",
          "lastRevealedAt",
          "lastSkippedAt",
          "completedAt",
        ].every((k) => date(x[k])),
    ) ||
    !Array.isArray(v.sessions) ||
    !v.sessions.every(validSession) ||
    new Set(v.sessions.map((s: any) => s.id)).size !== v.sessions.length ||
    !v.preferences ||
    !strings(v.preferences.subjectIds) ||
    !date(v.preferences.examDate) ||
    typeof v.preferences.analyticsConsent !== "boolean" ||
    (v.preferences.misoBreed !== undefined &&
      !catBreeds.includes(v.preferences.misoBreed)) ||
    (v.preferences.misoName !== undefined &&
      (typeof v.preferences.misoName !== "string" ||
        !v.preferences.misoName.trim() ||
        v.preferences.misoName.length > 30)) ||
    !v.onboarding ||
    !natural(v.onboarding.version) ||
    !date(v.onboarding.completedAt) ||
    typeof v.onboarding.skipped !== "boolean" ||
    !strings(v.processedCommands) ||
    !Array.isArray(v.analytics) ||
    !v.analytics.every(
      (e: any) =>
        e &&
        typeof e.id === "string" &&
        e.schemaVersion === 1 &&
        eventNames.includes(e.name) &&
        typeof e.at === "string" &&
        date(e.at),
    )
  )
    throw new Error("Invalid study snapshot");
}
