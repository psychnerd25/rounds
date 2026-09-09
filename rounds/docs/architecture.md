# Rounds: product foundations

> Historical decision record. The current content-only implementation, versioned
> attempts, ranking and Firebase Hosting connection are documented in
> [the app guide](app-guide.md). Account tables and sync proposals below are
> optional future designs, not requirements for publishing new cards.

Implementation decision record, September 2026. This is a local educational preview,
not a public-release certification. No backend, analytics SDK or crash-reporting
transport is deployed.

## Audit and decisions

Keep the parchment/teal visual system, vertical shorts, honest three-way recall,
bookmarks and permanent Miso room. The previous prototype rewarded swipes,
randomized discovery, minted repeat recall rewards, imported static data in
screens, and had neither exposure nor session records. Storage failures could
stop saving indefinitely. Onboarding, settings and a release plan were missing.
The launcher still uses Expo starter assets.

The local workbook supplies all 30 cards across six rotations. It has no
publication dates, references or editorial approval. Dates remain null and
editorialStatus is unreviewed. The cards are visible in this development preview;
do not ship this catalog publicly without medical editorial review and references.
No clinical guidance was rewritten or independently validated in this pass.

## Architecture and practical boundaries

- Domain: `domain/content.ts`, `interactions.ts`, `ranking.ts`,
  `study-service.ts`; pure TypeScript, no React or vendor SDK.
- Persistence model/migrations: `state/progress.ts` and
  `domain/validation.ts`. Reward ledger/progression: `state/paw-points.ts`.
- Contracts: `services/contracts.ts`. ContentRepository loads a Catalog;
  UserProgressRepository loads/saves a learner snapshot; AnalyticsSink accepts
  allowlisted events. The default analytics sink is disabled.
- Local adapters: bundled catalog and AsyncStorage. The old storage key
  `rounds.study.v1` is retained. Payload version is now 4.
- Composition: ContentProvider accepts an injected ContentRepository;
  StudyProvider accepts an injected UserProgressRepository. UI consumes hooks.
  Existing `data/cards.ts` / `backend/models.ts` remain compatibility facades;
  live screens no longer import static catalog arrays.
- `use-study-feed.ts` owns UI session orchestration, foreground-time measurement,
  exposure and paging. It accepts a RecommendationService. An eventual remote
  recommender can load/cache a ranked list behind that contract; keep a synchronous
  offline ranking fallback. Network requests must not be added to render functions.
- The command reducer applies activity, rewards, sessions and local events in one
  snapshot transaction. Separate local Saved/Rewards repositories would introduce
  partial-write failures for no practical benefit at this stage. They are separate
  domains within one unit of work; the backend can normalize them into tables.

## Content and identifiers

Cards have stable string IDs, topic IDs, subject IDs, contentVersion, nullable
created/published/updated dates, difficulty, duration, tags, series, optional
prompt, body, explanation, pearl, related IDs, reference arrays, visibility,
editorial status and priority. Topics are separate entities in Catalog.
Learner state never lives in content objects.

Retain existing string IDs as database text primary keys; there is no reason to
renumber them for a backend. Importer preserves IDs when a title or prompt still
identifies the previous card, increments versions on teaching-text edits, and
invalidates editorial approval. Editing both title and prompt needs an explicit
ID column or editorial alias before import. Unknown dates remain unknown.
Source/reference metadata survives import. Removing a card from the workbook
does not erase user history; its existing history displays as Archived card.
The three retired pre-workbook sample IDs are preserved in local history.

Future content repository: download a published catalog manifest plus versioned
card payloads to a persistent cache, then atomically switch the manifest.
Visibility/publication-date checks are enforced by ranking. Public catalog
validation must also require reviewed content and references. Keep archived
payloads needed by bookmarks, subject to safety-related withdrawal rules.

## Discovery ranking

Deterministic greedy ranking with ID tie-breaks, ten-card rounds and unique IDs.
The score is configured in `rankingWeights`:

| Factor | Contribution |
| --- | --- |
| Unseen | +60 |
| Freshness | +24 fading linearly over 30 days; null dates get 0 |
| Recently viewed | −55 fading over 3 days |
| Repeat exposure | −4/view, capped at 6 views |
| Saved | −8; primarily belongs in Saved/Review |
| Explicit subject preference | +18 |
| Subject study affinity | 0–8, normalized from the last 100 read/recall events |
| Latest weak recall | +3; deliberately small in Discovery |
| Skipped in past day | −15 |
| Editorial priority | 0–10, bounded |
| Consecutive subject | −65 unless a specific subject was selected |
| Topic in previous two results | −35 |

Rank only published, non-future cards. Subject and collection filters precede
ranking. Starting another round excludes the prior round's final card. Exposure
penalties and unseen boosts reduce broader repeats; the small catalog can still
resurface older material. Preference collection is optional in Settings.
Exam date has a reserved nullable field; no exam-specific ranking claim yet.

The round is a snapshot: completing/saving a card never reshuffles the active
list. Navigation to another flow creates a fresh session. Partial sessions remain
in history but are not yet resumable. No infinite-scroll screen-time objective.

## Study, review and rewards

An impression requires 800 ms in the foreground and counts once per card/session.
Rendering prefetched cards does not count. Opening details, revealing, skipping,
saving and unsaving are distinct interactions. Swiping never completes a card.

Reading requires explicit Mark as read after 8 foreground seconds. Recall
requires a prompt, reveal, 3 foreground seconds and an honest rating. These time
checks prevent accidental gestures; they do not prove learning or prevent a
determined client manipulator. No points are awarded for elapsed time itself.
Review history stores actual ratings; analytics does not receive their text.

Every session stores planned IDs, exposed/revealed/completed IDs, timestamps,
earned paws and capped active study time. It completes only when every planned
card is completed. Skipped-only rounds remain partial. There is no extra repeatable
session bonus; the summary explains the earned card and daily-goal rewards.

Smart Review is a separate route from Discovery. Last rating sets due interval:
again 1 day, partial 2 days, known 7 days. Due cards get +60 plus up to 30 overdue
days. Weak ratings add 30/15; last-three mistakes add up to 15; saved adds 12;
viewed but never completed adds 8. A not-yet-due reviewed card is excluded even
if saved. Saved/unfinished cards with no recall are eligible for a first attempt.
This is transparent scheduling, not a clinically validated mastery algorithm.

| Paw action | Reward / guard |
| --- | --- |
| Read completion | +4 once/card/local calendar day |
| Recall attempt | +6 once/card/local calendar day, identical for all ratings |
| Four distinct completed cards | +12 once/day; read+recall of one card counts once |
| Every seventh day in a study streak | +10 once/qualifying day |

Command IDs prevent retries applying twice. Daily reward keys prevent new
sessions farming the same card. Award batches also deduplicate internally.
The ledger retains action, timestamp and amount; balance, lifetime, milestone,
unlocks and unseen unlock IDs persist. v3 migration seeds new daily keys from
previously credited history so migration does not pay again.

Milestones are centralized: quiet corner 0, cushion 80, plant 220, study shelf 480,
lamp 850, nap 1350. No spending or decay. Miso shows level, today's rewards,
recent ledger, next threshold and the evolving room. Reduced motion stops idle
animation. Nav, tour and rewards use the same terracotta Miso/paw design.

## First run and accessibility

Three-step isolated demo: Discovery/next arrow or swipe and save; reveal and rate;
Miso room and where to find Progress/Topics/Smart Review. Skip or complete is
persisted; Settings replays without changing real activity or paws.

Content bodies always scroll, including large-font/short-screen cases. Offscreen
pages are hidden from assistive technology. Buttons use minimum 46-point height;
navigation labels remain visible. Recovery UI covers catalog loading, storage
retry and render exceptions. No user-content text is sent with errors.

Do not mistake web bundle tests for native accessibility certification. VoiceOver,
TalkBack, large system fonts, contrast and nested scrolling still require the
physical-device checklist below.

## Persistence, offline and analytics

v1/v2/v3 upgrade to v4 without resetting bookmarks, recall/read history or paws.
Onboarding/preferences default only when previously absent. Invalid/future
snapshots fail closed: show retry and preserve the original storage.
Writes serialize, errors are visible, and Retry writes the latest in-memory
snapshot. A process kill before a pending write finishes can lose that pending
action; UI reports saving status in Settings. There is no cross-device promise.

The installed native app's entire catalog is bundled, so all current content,
bookmarks and commands work offline. Web has local study storage but is not yet
an installable/offline-reload PWA. No network-status banner is needed for a build
whose learning functionality makes no network requests.

ProductEvent v1: id, schemaVersion, name, ISO at; optional cardId, sessionId,
amount, contentVersion. No names, email, answers or content body. Event names:
`feed_card_impression`, `feed_card_opened`, `card_revealed`, `card_completed`,
`card_saved`, `card_unsaved`, `card_skipped`, `recall_submitted`,
`study_session_started`, `study_session_completed`, `paw_points_earned`,
`miso_unlock_seen`, `onboarding_completed`.

Keep the last 500 product events locally for diagnostics only. This is NOT a
durable sync outbox. Session/history/reward data and command dedup IDs are separate
and retained. No remote collection or upload of old local events without a future
consent/retention decision. analyticsConsent defaults false. An eventual sink
must enforce that preference before transport.

At substantial history volume, replace whole-snapshot AsyncStorage with SQLite
transactions/indexes behind UserProgressRepository; do not prune learning history
to solve payload size. Multi-tab editing is currently last-writer-wins and needs a
single-writer/transactional strategy before multi-tab web release.

## Backend recommendation and proposed schema

Recommend Supabase/Postgres for the first account-backed version: relational
content/version/reference records fit SQL, with managed auth and row policies.
Keep SDKs inside adapters. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
describes how policies restrict records; policies must be tested, not assumed.

| Approach | Fit / tradeoff |
| --- | --- |
| Supabase + Postgres | Pragmatic recommendation; relational data/auth with less operations work. Offline mutation reconciliation remains our responsibility. |
| Firebase/Firestore | Strong client cache/sync support; document denormalization makes relational editorial/version history less natural. |
| Custom API + Postgres | Most control over transactions and recommendations; more auth, deployment, security and operational ownership now. |

Firestore caches and synchronizes offline data on supported SDKs; same-document
conflicts use last-write-wins. Verify React Native SDK support when choosing it.
[Firestore offline documentation](https://firebase.google.com/docs/firestore/manage-data/enable-offline).

Proposed logical tables (planning only; no migrations are deployed):

| Table | Key / essential fields |
| --- | --- |
| users | auth UUID PK, created_at, deletion_requested_at |
| user_preferences | user_id PK/FK, subject_ids, exam_date, timezone, onboarding_version/completed_at/skipped, analytics_consent/consented_at |
| subjects | text id PK, name, display_order |
| topics | text id PK, subject_id FK, title |
| cards | text id PK, topic_id FK, current_version, visibility, published_at |
| card_versions | PK(card_id,version), title, body JSON, prompt nullable, explanation, pearl, difficulty, seconds, series_id, editorial_status, reviewer_id, reviewed_at, created_at |
| references | id PK, title, url, accessed_at |
| card_references | PK(card_id,version,reference_id) |
| tags / card_tags | tag id PK / PK(card_id,tag_id) |
| series / related_cards | series id PK / PK(card_id,related_card_id) |
| user_card_state | PK(user_id,card_id), views, first/last_viewed_at, last_opened/revealed/skipped/completed_at, mastery_estimate, due_at, revision |
| saved_cards | PK(user_id,card_id), saved boolean, changed_at, mutation_id |
| study_sessions | UUID id PK, user_id FK, mode, started_at, completed_at nullable, active_ms, status |
| session_cards | PK(session_id,card_id), content_version, completed_at nullable |
| recall_attempts | UUID id PK, user_id/card_id/session_id FKs, content_version, rating, occurred_at |
| reward_ledger | UUID id PK, user_id FK, unique(user_id,idempotency_key), action, amount, earned_at, session_id nullable |
| user_unlocks | PK(user_id,milestone_id), unlocked_at, seen_at nullable |
| user_reward_totals | user_id PK, lifetime/balance, projection_version; derived from ledger |
| mutations | unique(user_id,mutation_id), device_id, kind, payload_version, occurred_at, received_at |
| product_events | UUID id PK, pseudonymous installation/user key, schema_version, name, allowlisted metadata, expiry_at |

User-owned tables: authenticated owner-only row policies; editorial writes require
an editorial role; clients read only published reviewed content. Never trust a
client-supplied reward amount. The server validates study mutations and calculates
ledger entries in the same transaction as activity/session updates.

Sync approach for the next phase: locally generated UUID mutation IDs, UTC event
times plus device local day/timezone, versioned payloads, persistent outbox with
acknowledgment cursors. Append/deduplicate attempts by ID; monotonic counters derive
from events; bookmarks/preferences use server revision + deterministic last-write
policy including tombstones; rewards unique by semantic key; unlocks union and
seen timestamps monotonic. Resolve time-zone/day policy and clock manipulation
explicitly. Existing v4 snapshots need a one-time import/baseline transaction,
including legacy rewards without invented historical ledger dates.

## Remaining public-release checklist

- Independent medical review, real references, content correction/withdrawal
  process, licensed material, clinical-review ownership, version-aware attempts.
- Public privacy policy and terms hosted at real URLs; operator/support identity;
  accurate retention/deletion description. Account deletion in-app and required
  web pathway once accounts exist. Assess analytics consent before adding SDKs.
- App Store privacy labels, Play Data Safety and Health apps declaration reflecting
  actual behavior. Avoid clinical decision-support, exam-success guarantees, or
  unsupported regulatory claims. [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/)
  and [Google Health declaration](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en).
- Replace Expo launcher/splash assets. Use the in-app Miso shape as the single
  source: create a 1024×1024 opaque parchment/terracotta master at
  assets/brand/rounds-icon.png, Android adaptive foreground/monochrome layers,
  and iOS Icon Composer layers. Use exports for app icon, splash and favicon;
  preview at 24/48 px. No inconsistent generated placeholder artwork is needed.
- iOS bundle identifier, build numbers, signed dev/release builds, target SDK and
  permission audit, store screenshots/age rating/reviewer notes, support URL.
- VoiceOver/TalkBack, 200% font size, 320 px width, landscape/tablet, color contrast,
  reduced motion, keyboard focus and card-scroll gesture testing on devices.
- Background/process-kill saving, storage-full recovery, corrupt snapshot recovery
  UX, multiple browser tabs, long-history performance and offline restart tests.
- Add a consent-aware crash sink with content/PII scrubbing, retention policy and
  symbol upload. Render recovery currently stays local.
- Backend auth/RLS authorization tests, deletion job, backups/restore drill,
  editorial publication workflow, sync conflict tests and abuse/clock policy.

Commands: npm run typecheck; npm test; npx expo export --platform all.
Domain tests prioritize ranking, exposure, read eligibility, reveal/rating,
session completion, deduplication, review due dates, rewards and migrations.
