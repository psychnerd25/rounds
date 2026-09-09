# Development readiness

Updated 9 September 2026. The content-only Firebase development preview is deployed and verified. See [live Firebase test results](firebase-test-results.md) for the current 68-test and desktop/mobile browser verification. Reviewed medical-content release remains blocked by editorial metadata; native runtime checks are still outstanding.

See [the app guide](app-guide.md) for the complete business rules, API response contract, Firebase Hosting setup and ownership handover. It supersedes the earlier account-oriented backend proposal. Learner data stays local.

The supplied logo is now integrated into native and web branding. See [production preparation](production-readiness.md) for the current build configuration, verification and remaining public-release requirements.

## Business-logic fixes completed

| Finding | Current behavior |
| --- | --- |
| Partial downloads replaced the whole cache | Explicit full/delta envelopes. Delta card upserts merge by stable ID; removals are explicit. Full snapshots are authoritative. |
| Older responses could roll back content | Increasing catalog revisions, matching delta bases, per-card version checks and rejection of teaching edits without a version increment. A missing delta base requests a full snapshot once. |
| Corrupt cache, cache-write failures and hung requests broke fallback | Cache/bundle opens before network; eight-second fetch/JSON timeout; invalid cache falls back to the bundle; fresh data survives a failed cache write in memory and persistence can retry. |
| A brief impression demoted a new card | Only completed read/recall of the current version marks a card covered. New cards follow publication order in both modes. |
| Read-only and migrated cards had inconsistent priority | Strict covered-card need order: again, partial, read-only, known. Impressions are only secondary tie-break information. |
| Edited cards inherited obsolete knowledge | Session snapshots and completion records retain contentVersion. New versions start unassessed; history, bookmarks and rewards remain. Legacy records without a version belong to version 1. |
| Weak-card CTA opened an empty due-only queue | Progress and weak-card collection use the same available/current-version weak filter. Weak practice works immediately; Smart Review retains due dates. |
| A one-card round could not restart | Next-round exclusion is relaxed only when it leaves no otherwise eligible candidates. All collection/publication filters still apply. |
| Content loaded only on mount | Configurable public URL, startup refresh, five-minute active/foreground checks and Settings refresh with status/retry. |
| Refresh could disturb a round | Additions and edits wait until the next round. Attempts use the displayed version. Withdrawals replace obsolete rounds while preserving earned progress. |

The earlier fixes remain: safe selected-card links, chronological affinity, runtime catalog validation, invalid command/session rejection, migration and reward idempotency, publication filtering and local persistence retry.

## Verification

- 68 individual automated tests pass across nine files, including content-sync, study-ordering, publishing and preview-policy regressions.
- TypeScript strict checking and the standard test command pass.
- Web, Android and iOS exports pass with `EXPO_OFFLINE=1 npx expo export --platform all --output-dir /tmp/rounds-content-sync-export`.
- Browser integration passes against the running Expo app with intercepted HTTP fixtures: startup content loading, delta refresh, stable active round/version, newest-first Read/Recall, immediate weak practice, one-card repeat, withdrawal, manual refresh, and offline cached recovery. No page errors; content requests contained no learner payloads.
- The release-content gate still fails as expected: the bundled 30-card preview lacks medical review, references and publication dates. Runtime validation checks metadata, not medical accuracy.

Reproduce domain checks with `npm run typecheck` and `npm test`. Run each `scripts/*.test.mjs` directly with Node when the sandbox runner summarizes only per-file results. Browser instructions are in the app guide; `scripts/browser-content.cjs` uses mock content, not Firebase.

## Remaining boundaries

1. The live preview URL, Hosting CORS/cache headers, publishing and recovery are now verified on `rounds-b01c3`, with billing disabled. Supply a reviewed catalog for the production path; the development preview connection is complete.
2. Obtain independent medical sign-off, references and publication dates, with someone responsible for correction/withdrawal. Do not mark preview content reviewed just to pass the gate.
3. Test signed native builds, foreground/background behavior, storage-full/process-kill recovery, VoiceOver/TalkBack and large text on real devices. JavaScript export and browser tests do not establish these.
4. Local history, command IDs and sessions grow with use; whole snapshots are serialized. Multi-tab writes remain last-writer-wins; pending writes can be lost on abrupt termination. There is no cross-device recovery or progress sync.
5. Complete public-release operations: final app assets/identifiers, support/privacy information, CI and dependency maintenance. Earlier advisory and signing findings were not part of this content-logic change. The source tree includes pre-existing untracked files; commit intended source and fixtures before expecting a clean checkout.
6. The bundled preview remains the last-resort fallback. A cached withdrawal cannot reach a device that stays offline, and clearing content cache can return it to the bundled preview. A public release needs a reviewed bundled catalog and an explicit operational policy for stale offline material.

Authentication, server-calculated rewards and multi-device synchronization are future features only if the product scope changes. They are not needed to upload new educational content.
