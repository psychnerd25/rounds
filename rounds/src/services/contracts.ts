import type { Catalog } from "../domain/content";
import type { StudyState } from "../state/progress";
import type { ProductEvent } from "../domain/interactions";
// Remote adapters must validate unknown JSON and cache an accepted catalog for offline use.
export interface ContentRepository {
  load(): Promise<Catalog>;
  refresh?(): Promise<Catalog>;
  getWarning?(): string | null;
}
// A single local transaction keeps activity, saves, sessions and rewards consistent.
// This is a local snapshot boundary, NOT a cross-device sync protocol.
// An account adapter must be bound to one immutable user identity; remount
// StudyProvider with key={userId} when auth identity changes. Never send these
// whole snapshots directly to a shared server row without conflict handling.
export interface UserProgressRepository {
  load(): Promise<StudyState>;
  save(state: StudyState): Promise<void>;
}
export interface AnalyticsSink {
  send(events: readonly ProductEvent[]): Promise<void>;
}
export const disabledAnalytics: AnalyticsSink = { async send() {} };
