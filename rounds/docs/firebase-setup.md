# Connect Firebase Hosting

For transferring this existing project to dailydose.md.social@gmail.com and the
day-to-day content workflow, use [the handover guide](firebase-handover.md).

## Current workspace connection

- Project: `rounds-b01c3` (selected in `.firebaserc`).
- Billing: confirmed disabled through the Google Cloud billing API on 9 September 2026.
- Hosting: connection check deployed at `https://rounds-b01c3.web.app/health.json`.
- Development preview: `https://rounds-b01c3.web.app/preview-catalog.json`, revision 1, with all 30 existing cards. The user authorized publishing the unreviewed preview. Original teaching text, IDs, versions, references and date metadata are preserved.
- `.env.local` connects development builds using `EXPO_PUBLIC_PREVIEW_CONTENT_API_URL`. The regular release endpoint remains unset until reviewed content is published. Production builds ignore the preview URL.
- CLI login belongs to the local Firebase tooling; no login tokens or credentials are stored in the app.

This repository is prepared for classic Firebase Hosting on the Spark plan. It serves public content files; study data remains local. No Firebase database, app SDK, Analytics or billing account is required for this path. Hosting is subject to its no-cost quotas. [Official Hosting setup](https://firebase.google.com/docs/hosting/quickstart) and [usage limits](https://firebase.google.com/docs/hosting/usage-quotas-pricing).

## One-time account step

Create a project in the [Firebase Console](https://console.firebase.google.com), keep it on Spark, and copy its **Project ID** from Project settings → General. Do not use its display name or project number.

The Firebase CLI has been installed separately in this workspace at `/tmp/rounds-firebase/node_modules/.bin/firebase`; it is not an app dependency. In your Codespaces terminal, sign in:

```bash
/tmp/rounds-firebase/node_modules/.bin/firebase login --no-localhost
```

Follow the link and enter any returned authorization code **in that terminal**, not in chat or a source file. Optional CLI telemetry/Gemini prompts can be declined. This remote login flow is described in the [CLI documentation](https://firebase.google.com/docs/cli#sign-in-test-cli).

The temporary installation may disappear when the workspace is rebuilt. To install it again, run `npm install --prefix /tmp/rounds-firebase firebase-tools`.

## First connection check

`firebase.json` publishes only `hosting/public`, with CORS enabled and revalidation headers for JSON. That directory also contains the public landing, support and privacy pages. It has no app-page rewrites or paid services. A predeploy check validates its public files.

The initial deployment used only `health.json` to verify Firebase credentials, hosting and the public HTTPS address. The current deployment also serves the explicitly labelled preview catalog; cards show “Editorial preview · review pending”.

After selecting and verifying the intended project's Hosting site, deploy from the app directory:

```bash
cd /workspaces/rounds/rounds
/tmp/rounds-firebase/node_modules/.bin/firebase deploy --only hosting --project YOUR_PROJECT_ID
```

Use a new project's unused default Hosting site. Deploying to a site that already hosts another website would replace that site's files; create a separate Hosting site/target in that case.

The connection check is `https://YOUR_PROJECT_ID.web.app/health.json`. A successful response alone confirms Hosting, not study-catalog synchronization.

## Publish cards and connect the app

For the authorized development preview, use:

```bash
npm run content:prepare -- 2 --preview
npm run content:check
/tmp/rounds-firebase/node_modules/.bin/firebase deploy --only hosting --project rounds-b01c3
```

Use the next increasing revision, not always 2. This exports the bundled source into `hosting/public/preview-catalog.json` with `channel: "preview"`. It preserves unreviewed status and unknown dates, while still checking structure, versions, stable IDs and public visibility. Preview files are publicly accessible. The strict `catalog.json` publication check remains intact. The client requires explicit development opt-in for preview content and rejects it from both network and cache under the default reviewed-content policy.

For a future reviewed release, follow the remaining steps below.

Prepare a reviewed content source with stable IDs, references and publication dates. The existing bundled medical preview intentionally fails this publishing gate. It is never automatically relabeled.

```bash
npm run content:prepare -- 1 /path/to/reviewed-catalog.json
npm run content:check
```

The source can be a Catalog, a full envelope, or the workbook import's subjects/cards JSON. The command derives topics when needed, omits unpublished/future cards and their topic metadata, validates relationships and creates `hosting/public/catalog.json`. A subsequent export must increase the revision and teaching edits must increase contentVersion. It compares against the existing local output; keep that file aligned with the latest live catalog when publishing from a new machine. Inspect full-catalog omissions: they withdraw cards from clients. No upload occurs during preparation.

Deploy Hosting again. Then add this line to `.env.local` (preserve any other existing variables):

```dotenv
EXPO_PUBLIC_CONTENT_API_URL=https://YOUR_PROJECT_ID.web.app/catalog.json
```

Restart Expo and use Settings → Check for new cards. Verify the live JSON and CORS headers, a successful check, next-round ordering and offline cache recovery. Native release builds must be rebuilt with the URL. Later content changes at that same URL need only another content deployment.

If all cards must be withdrawn, deliberately publish and review a valid empty full envelope with a higher revision. The preparation command refuses empty exports to catch accidental empty inputs; the predeploy validator supports an intentional empty catalog.

For card schema, ordering, caching and ownership handover, see [the app guide](app-guide.md).
