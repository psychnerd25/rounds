# Rounds app guide

This is the current business-logic and content-integration guide (9 September 2026). Rounds keeps study history, bookmarks, preferences, rewards and appearance on the device. An optional public content endpoint supplies new cards. It receives no learner data. Native installs have a bundled offline library; the web app still needs its application assets to load and is not an offline-reload PWA.

## The main user flow

The app opens on Discovery in Recall mode. A round is a snapshot of up to ten cards. A learner tries to retrieve the answer before revealing it, then chooses `Didn't know`, `Partially knew` or `Knew it`. Reading is a secondary mode for a first pass: the learner spends time with the explanation and explicitly marks the card as read.

The mode switcher replaces the current round with a new one in the selected mode. A card can be saved from its card controls. Saved cards appear in Saved and can be sent into a recall round. Smart Review selects due cards and first-recall candidates. Progress also offers immediate practice of weak cards, even before their scheduled due date.

Onboarding is a demo only. It explains Discovery, active recall and Miso's room, and its completion is stored without adding study activity or Paw Points. Settings can replay it.

## Provider and adapter layers

`ContentProvider` loads a `Catalog` through `ContentRepository`. The default adapter is `localContentRepository`, which reads the bundled JSON catalog. It validates the catalog before screens receive it.

`StudyProvider` loads and saves one `StudyState` through `UserProgressRepository`. The default adapter is AsyncStorage. The reducer applies each command to a complete snapshot, and writes are serialized so a slow write cannot overtake a newer one.

`src/backend/remote/content.ts` binds the tested HTTP client to AsyncStorage. `src/backend/content-repository.ts` is already connected in the app layout. To activate it, copy `.env.example` to `.env.local` and set a public endpoint:

```dotenv
EXPO_PUBLIC_CONTENT_API_URL=https://YOUR-PROJECT.web.app/catalog.json
```

Restart Expo after changing the variable; release builds must be rebuilt with the URL. Leave it blank to keep the bundled preview. Use HTTPS in deployment. The URL is embedded in the app and is not secret. No Firebase SDK, account login or private key is needed for the static JSON option.

`load()` opens the validated cache, otherwise the bundle, without waiting for the network. `ContentProvider` then calls `refresh()`. It checks again every five minutes while active, on returning to the foreground if at least five minutes have passed, and through **Settings → Check for new cards**. Concurrent refreshes share one request. Existing screens remain usable while refreshing or offline. Settings reports the last successful check and errors; unconfigured builds explicitly say updates are not connected.

The request is a credential-free GET with an optional catalog `since` revision. No study history, preferences, bookmarks, event log or rewards enter the request. The hosting provider can still see normal HTTP metadata, such as an IP address. A public endpoint must expose only intended public material; client filtering does not protect drafts from direct requests.

## Content API contract

The endpoint must return the versioned envelope below, not a bare array/catalog or Firestore's REST document format. See `src/domain/catalog-sync.ts` for the exact types and `src/domain/content.ts` for every card field.

```ts
// Full: the entire authoritative public catalog.
{
  schemaVersion: 1,
  kind: "full",
  revision: 12,
  catalog: { subjects: Subject[], topics: Topic[], cards: RevisionCard[] }
}

// Delta: only card additions/edits plus explicit removals.
{
  schemaVersion: 1,
  kind: "delta",
  baseRevision: 12,
  revision: 13,
  catalog: { subjects: Subject[], topics: Topic[], cards: RevisionCard[] },
  removedCardIds: ["withdrawn-card-id"]
}
```

These are shape examples, not literal JSON: replace the type placeholders with actual arrays. Subjects and topics are **complete metadata in both formats**, including relationships for all retained cards. Delta cards are upserts by stable ID; omitted cards survive. Full responses replace catalog membership: an omitted card is withdrawn. An ID cannot appear both in a delta's cards and removals.

Use increasing positive integer catalog revisions and publish each revision atomically. Lower revisions are rejected, equal revisions are no-ops, and delta bases must match the accepted revision. A mismatched base triggers one retry without `since`, which must return a full snapshot. A static host can ignore `since` and always serve a full response; this is the easiest starting point. HTTP 304 is supported when a valid snapshot exists, but the client does not currently send ETags.

Every response and merged catalog passes runtime validation: unique IDs, valid subject/topic relationships, card fields, dates, versions and reference URLs. Published remote cards also require reviewed status, references and a publication date. Invalid responses never replace the accepted cache. The client rejects lower card versions and teaching-text changes without a version increase. Publishing metadata may change without resetting learning, but every catalog change still needs a higher catalog revision.

Requests time out after eight seconds, including reading JSON; a late response cannot overwrite accepted data. Cache corruption/read errors fall back to the bundle. Cache-write failure keeps fresh data in memory and displays a warning; a subsequent successful check retries persistence. Each endpoint has a separate `rounds.content.catalog.v2:<URL>` cache. The old unversioned placeholder cache is ignored. User progress storage is separate and is never reset by content recovery.

## Content model and publishing

A catalog contains subjects, topics and cards. Card IDs are stable strings: never reuse an old ID for an unrelated concept. Cards carry `contentVersion`, visibility, publication dates, editorial status, references, difficulty, tags, related IDs and teaching text. Read/recall attempts and session snapshots retain the studied version. Removing a card does not erase history, points or saved IDs; unavailable bookmarks are hidden until that ID returns. There is no archived-card reader yet.

The development workbook currently produces cards with unknown dates, no references and `unreviewed` status. That is intentional. The release-content check rejects these records until medical review, references and publication dates exist. A content publisher should:

1. edit or create a card in the editorial source;
2. preserve its ID when the teaching text is still the same card;
3. increment `contentVersion` when the teaching text changes;
4. set `reviewed`, add references and choose a publication date;
5. increase the catalog revision and publish the complete response atomically;
6. retain previous source/export files privately for corrections and comparison; withdraw cards explicitly with a delta removal or full-catalog omission.

To undo incorrect teaching, publish the corrected text with a **higher** card version and catalog revision. Do not roll the revision numbers backward. New versions start unassessed without deleting historical attempts. Old records that lack a version are conservatively treated as version 1; they cannot establish knowledge of version 2+. This optional extension preserves existing state-v4 snapshots and migrations from versions 1–3.

## Card ordering

The ranking code receives the catalog, the learner snapshot and the current mode. It filters out draft, archived and future cards before ranking.

New cards have no completed read or recall of the **current content version**. Impressions, opening, revealing, saving and skipping do not count as completed study. New cards appear before covered cards, newest `publishedAt` first; null dates follow dated cards. `updatedAt` does not change posting order. This applies to both Read and Recall and includes newly edited versions. Recall also requires a prompt.

After a card has been covered, the ranking uses need rather than novelty:

- a latest `again` recall is highest need;
- a latest `partial` recall follows;
- a card read but never recalled is treated as needing recall;
- a latest `known` recall is lowest need;
- the existing exposure, freshness, saved, preferred-subject, skipped and diversity weights break ties and reduce immediate repeats.

The need order is strict: `again` → `partial` → read-only → `known`, using the latest current-version recall by timestamp. Reading again does not erase an existing recall assessment. Secondary weights only break ties within these ordering groups. Subject preferences do not override posting order or knowledge need.

Smart Review uses its due-date calculation. Without a current-version recall, saved, unfinished, read-only and updated-since-study cards are eligible immediately. Progress's weak-card count and weak collection share one filter: available, recall-capable cards whose latest current-version rating is `again` or `partial`, regardless of due date. A direct card link passes publication, subject, topic, collection and (for Smart Review) due-date checks.

The active round is a snapshot. Completing, saving, rating, downloading additions or editing cards does not reorder or replace its contents. Each completion records the version shown in that session, even if a newer one downloaded meanwhile. The next round uses the newest catalog and progress. Withdrawals are the exception: removing or unpublishing a planned card restarts the obsolete round; already-earned progress remains.

Another round normally excludes the previous round's final card. If that exclusion leaves no eligible cards, it retries without the exclusion. This lets a one-card collection repeat. It never bypasses publication, saved, weak or due-date filters; an actually empty collection stays empty.

## Study rules

An impression requires 800 ms of foreground time and is counted once per card per session. Read completion requires 8 seconds of foreground time and an explicit Mark as read action. Recall requires a prompt, a reveal, 3 seconds of foreground time and an explicit rating. Swiping only moves through cards; it never completes one.

Each command receives an idempotency ID. Processed IDs prevent retrying the same command from duplicating activity or rewards. A session completes only when every planned card is completed. A skipped or abandoned round remains partial.

Review scheduling uses the last recall rating: `again` returns after one day, `partial` after two days and `known` after seven days. Due cards receive priority; repeated weak recalls, saved cards and unfinished cards add need. This is a transparent practice schedule, not a validated mastery model.

## Paw Points, streaks and Miso

Read completion awards four Paw Points once per card per local day. Recall awards six once per card per local day, regardless of rating. Four distinct completed cards add twelve points; the first completion on each seventh qualifying streak day adds ten. Reading and recalling the same card can earn their separate rewards, but count as one distinct card toward the daily goal. A same-day edited version can record fresh learning without earning another reward for the same mode/card/day. Reads deduplicate by card/day/version; repeat recalls preserve attempts without paying twice.

A local day with any completed study counts toward the streak. Yesterday's streak remains active until today is missed. A gap resets the current streak but does not remove points or permanent room unlocks. Award IDs and daily keys make rewards idempotent. The balance, lifetime total, ledger and unlocks live in the same snapshot as study activity.

After a reward, the app shows an animated points or streak celebration. It combines the first daily streak check and points into one modal, animates the count and room-progress bar, respects reduced-motion settings, and stays until the learner taps Keep learning. A smaller points receipt remains visible until the learner moves to another card.

## Persistence and failure behavior

The local repository retains the `rounds.study.v1` storage key while migrating payloads to state version 4. Corrupt or invalid snapshots fail closed and show recovery UI instead of silently resetting progress. Saves are serialized and Settings reports saving or retry status. A process kill during an outstanding write can still lose that pending write; the app does not claim cross-device durability.

Appearance is stored separately as `rounds.appearance.v1`. New cats default to Tuxedo; existing saved breeds are preserved. Name and breed commands are validated before they enter state.

## A content-only Firebase setup

The repo includes `firebase.json`, a connection-check file, and checked publishing commands. Project `rounds-b01c3` now hosts the authorized 30-card development preview. Follow [the workspace Firebase setup](firebase-setup.md) for live URLs and upload commands.

For this small text library, Firebase **Hosting on Spark** serving a `catalog.json` file is the simplest fit. It avoids a database, authentication and a running API server. It has no-cost storage/transfer quotas; monitor usage because exceeding Spark allowances can stop delivery or new deployments. Keep the project on Spark for the intended $0 arrangement. [Firebase Hosting quotas](https://firebase.google.com/docs/hosting/usage-quotas-pricing).

1. Create a Firebase project under your Google account and select the Spark plan.
2. In a separate publishing folder, set up Firebase Hosting using the Firebase CLI. Choose a `public` folder and no single-page-app rewrite for this JSON endpoint.
3. Place a reviewed, full envelope in `public/catalog.json`. Include the complete current public library each time; keep drafts in your private editorial source.
4. Configure public GET access for the JSON and short/no caching for the mutable manifest. For web use, a Hosting header rule can set `Access-Control-Allow-Origin: *` and `Cache-Control: no-cache` for `/catalog.json`. These are public educational files with no credentials. [Hosting configuration](https://firebase.google.com/docs/hosting/full-config).
5. Deploy Hosting from that folder and put its HTTPS `/catalog.json` URL in `.env.local`. Restart Expo. In Settings, check for new cards and verify downloaded content before distributing a build.
6. To add or correct cards later, update the source and envelope, increase revisions, and deploy the JSON again. App users need no new app build for content updates at the same endpoint.

There is no upload/admin screen in Rounds. This path publishes files through the CLI. If you later want a browser editing form, add a separate authenticated editor, or use Firestore as an editorial source and export this same public envelope. A raw Firestore REST URL does not match this adapter's contract.

You can start with your own Google account and later add another person as **Owner** in Firebase project settings → Users and permissions. Have them accept the invitation and verify access before removing your account. Keeping the same project preserves its resources and content URL. Organization policies and any separately configured billing access may need separate handling. [Firebase project membership](https://support.google.com/firebase/answer/7000272?hl=en).

Firebase Hosting is deployed and development builds are connected through `EXPO_PUBLIC_PREVIEW_CONTENT_API_URL`. This separate preview envelope declares `channel: "preview"`; the original unreviewed metadata stays intact. `__DEV__` controls preview opt-in, and production builds ignore this URL. Reviewed publication still uses the strict `EXPO_PUBLIC_CONTENT_API_URL` path. A reviewed catalog remains to be supplied for release. Accounts and cross-device progress sync are outside the current content-only scope.

## Verification commands

```bash
npm run typecheck
npm test
npm run check:release-content
npx expo export --platform all
```

The first two commands are development gates. The release-content check is expected to fail until the catalog has editorial sign-off and real references. Bundle export confirms JavaScript bundling; it does not replace signed native builds, physical-device accessibility checks or medical review.

`scripts/content-sync.test.mjs` tests full/delta merging, stale versions, cache recovery, timeouts, late responses, request coalescing and retry. `scripts/study-ordering.test.mjs` tests completion-based novelty, need order, legacy versions, weak cards, repeat rounds and rewards across edits.

For the optional browser integration check, install Playwright/Chromium in your test environment, run Expo with `EXPO_PUBLIC_CONTENT_API_URL=http://localhost:8097/catalog.json` on port 8086, then run `node scripts/browser-content.cjs`. `ROUNDS_PLAYWRIGHT_MODULE` can point to an external Playwright installation. The script intercepts the content URL and supplies test fixtures; it needs no real server on port 8097 and uploads nothing. It verifies the wired provider, active session stability, next-round ordering, weak/repeat flows, withdrawal, manual refresh and offline cache recovery. Stop that Expo process afterward; its endpoint is only a test setting.
