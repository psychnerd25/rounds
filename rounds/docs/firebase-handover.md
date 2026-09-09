# Rounds: Firebase handover and adding content

For **dailydose.md_** and the person helping publish the app.

Owner/contact email: **dailydose.md.social@gmail.com**

Project: **rounds-b01c3** · Prepared 9 September 2026

## 1. Transfer control of the existing Firebase project

Keep the existing project. Add the Daily Dose account as an Owner, verify its
access, and then remove the outgoing owner's access when the handover is complete.
The hosted files and URLs stay in the same project, so this membership change
does not require changing the app's content URL or rebuilding the app.

The current Owner should:

1. Open [Firebase project permissions](https://console.firebase.google.com/project/rounds-b01c3/settings/iam).
   Alternatively, open Firebase → **rounds-b01c3** → gear icon → **Project
   settings → Users and permissions**.
2. Select **Add member**.
3. Enter **dailydose.md.social@gmail.com** exactly.
4. Choose **Owner**, then add/invite the member. Owner gives full project control,
   including management of other members.
5. Have the recipient sign into that Google account and accept the invitation.
   Firebase lists an Owner invitation as pending until it is accepted.
6. Have her independently open the project, view Hosting and Users and permissions,
   and confirm that the Owner role is active. Access changes can take a few minutes.
7. Complete the source-file and publishing-access handover below. Only then remove
   the outgoing owner's membership if that access is no longer needed. Keep at
   least one working Owner account.

This guide does not change project permissions or send an invitation. Complete
these steps in the console. If an organization policy prevents the invitation,
the organization's administrator must resolve it; creating another Firebase
project is not the normal handover path.

Sources: [Firebase membership and Owner invitations](https://support.google.com/firebase/answer/7000272?hl=en),
[Firebase roles and permission management](https://firebase.google.com/docs/projects/iam/roles).

## 2. Give the publishing helper her own access

The Daily Dose account should retain ownership. The publishing helper can use her
own Google account instead of sharing the Daily Dose password.

For someone who only needs to publish the content and support website, the Owner
can use [Google Cloud IAM for this project](https://console.cloud.google.com/iam-admin/iam?project=rounds-b01c3)
→ **Grant access**, enter the helper's Google email, and assign both:

- **Firebase Hosting Admin** — `roles/firebasehosting.admin`.
- **API Keys Viewer** — `roles/serviceusage.apiKeysViewer`, which Firebase documents
  as additionally required for CLI deployment.

These are classic **Firebase Hosting** permissions, not Firebase **App Hosting**.
Hosting Admin can manage the hosted resources. It does not make the helper the
project Owner. No service-account key needs to be downloaded for this workflow.
[Official Hosting roles](https://firebase.google.com/docs/projects/iam/roles-predefined-product#hosting).

Firebase access, Expo/EAS build access, repository access and Apple Developer/App
Store Connect access are separate. Hand over or invite the helper to each service
she needs. Firebase ownership does not change the App Store seller. The Apple team
used for submission determines that seller; see the accompanying iOS release guide.

## 3. What to hand over

- The complete current project source, including the `rounds` app folder, source
  catalog, scripts, `package.json`, `package-lock.json`, `app.json`, `eas.json`,
  `firebase.json`, `.firebaserc`, assets, docs and **all of `hosting/public`**.
- The latest full editorial catalog and the latest deployed export for each
  channel, plus any private references and medical-review records.
- The original content-bank workbook if it is still used for drafting.
- Access to the Expo project and Apple publishing team as needed, through their
  normal account access controls. Do not put login tokens or signing keys in the
  handover document or app source.

Much of this workspace is currently untracked in Git. An old repository clone
alone may not contain the finished app. Make sure the intended source is committed
to the private repository or included in the actual handover copy. `node_modules`,
temporary CLI installations, local caches and authentication files are not needed.

Current addresses:

| Purpose | URL / status |
| --- | --- |
| Website | https://rounds-b01c3.web.app/ |
| Support | https://rounds-b01c3.web.app/support.html |
| Privacy | https://rounds-b01c3.web.app/privacy.html |
| Connection check | https://rounds-b01c3.web.app/health.json |
| Development content | https://rounds-b01c3.web.app/preview-catalog.json — 30 cards, revision 1 at handover |
| Future reviewed content | https://rounds-b01c3.web.app/catalog.json — not published yet |

The project uses classic Firebase Hosting, with no learner database. Billing was
verified disabled on 9 September 2026. Check the console at handover and retain
Spark if staying within no-cost Hosting quotas. This workflow does not require
Firestore, Storage, Functions or App Hosting. Firebase quotas still apply;
Apple membership and build-service allowances are separate.
[Hosting usage and pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing).

## 4. How she adds a new card

**Current workflow: write → review → prepare → publish.** There is no upload or
editing dashboard in the app or a Firestore collection to edit. Firebase Hosting
serves the prepared JSON files; dropping a Word document or spreadsheet into
Firebase will not turn it into cards.

She can write cards in a document or spreadsheet and pass them to the helper.
For each card, supply:

| Field | What to provide |
| --- | --- |
| Subject | The rotation/subject the card belongs to |
| Title | A short topic title |
| Recall question | The question shown before revealing the answer |
| Answer / management | The teaching text and explanation |
| Clinical pearl | One useful takeaway |
| References | Real source titles and URLs supporting the teaching |
| Publication time | When the card should become available, including timezone |
| Review record | Who reviewed this exact version, when, and any corrections |
| Existing card | Its current ID if this is an edit rather than a new card |

Use the accompanying **new-card-brief.md** as a reusable draft template. The
existing subjects are Internal Medicine Floors, Cardiology / Cardiac ICU,
Neurology Floors, Infectious Disease Elective, General Surgery and Emergency
Medicine. A new subject also needs subject metadata in the catalog.

The helper adds the card to the **complete current editorial catalog**. Both
Read and Recall use the same card, so it should have a recall question and an
explanation. The helper can duplicate the structure of an existing card in
`src/backend/local/catalog.json`, give a new card its own unique `id` and `topicId`,
set `contentVersion` to 1, and replace all teaching and metadata fields.

The full field definitions are in `src/domain/content.ts`. Match `subjectId` to
an existing subject; when the source explicitly contains a `topics` array, add
the topic there too. Otherwise the preparation script derives topics from cards.
References are objects with `id`, `title`, `url` and optional `accessedAt`.

Drafts use `visibility: "draft"` and `editorialStatus: "unreviewed"`. Once the
actual content review is complete, set `editorialStatus: "reviewed"`, retain real
references, set the ISO publication timestamp, and set visibility to `published`.
Keep the reviewer's record privately; the app's flag is not proof of a clinical review.

For an existing card, preserve its ID and original publication time. Increase
`contentVersion` whenever teaching text changes, update `updatedAt`, and arrange
a new review. Do not increase the version merely to bump a card up the feed.

### Optional workbook drafting

The existing workbook has five columns in its first sheet: Subject, Topic Title,
Question, Next Best Step / Management, and Clinical Pearl / Key Takeaway. It does
not hold review records, references or publication dates; those must be added
to the editorial catalog separately.

The current importer is tailored to the supplied workbook's inline-string XLSX
format. It is **not a general Excel/Google Sheets importer**; some resaved files
use shared-string tables that it does not understand. Treat spreadsheets as
authoring material unless the helper verifies the import, or edit the JSON catalog
directly. Importing a workbook replaces the output catalog's membership; a sheet
containing only new rows is not an append operation. Matching relies on unchanged
title or question, so editing both needs manual ID preservation. Use a working
copy and compare every imported field and ID before publishing.

## 5. Publisher setup and deployment

These terminal steps are for the helper. Run them from the app directory that
contains `firebase.json` and `package.json`, not its parent directory. Use Node
24, npm and the supplied source files. A Mac, Linux machine or Codespace can
publish Hosting content; building iOS is a separate workflow.

Install the app dependencies and Firebase CLI, then sign into the helper's own
Google account after its permissions have been granted:

```bash
npm ci
npm install --global firebase-tools
firebase login
firebase projects:list
```

In a remote Codespace, use `firebase login --no-localhost` instead. Enter login
codes in the CLI/browser flow. Confirm `rounds-b01c3` appears. Do not run
`firebase init` over this prepared project; its Hosting configuration already exists.
[Firebase CLI setup](https://firebase.google.com/docs/cli#sign-in-test-cli).

Before each publication, sync the latest project/source from the other publisher
and check the current live catalog's revision. The preparation script compares
with **local** `hosting/public/catalog.json` or `preview-catalog.json`; it does not
download the current live revision for you. Keep those local exports aligned
with the latest deployment. Have one person publish at a time.

### First reviewed release

Finish the complete source catalog in `src/backend/local/catalog.json`. All
published bundled cards must meet the medical review, reference and publication
date requirements. The currently supplied preview intentionally does not pass.

If no reviewed catalog has ever been deployed, its first revision can be 1:

```bash
npm run check:release-content
npm run content:prepare -- 1
npm run site:prepare
npm run content:check
```

Inspect the generated `hosting/public/catalog.json`: it must contain the entire
intended public library, with correct IDs, versions, references and dates. Drafts,
archived cards and future posts are excluded by preparation. **A full catalog
omission withdraws that card from clients.** Do not export just the new cards.

When that exact output is ready to publish:

```bash
firebase deploy --only hosting --project rounds-b01c3
```

This deploy publishes the entire `hosting/public` directory, including the support
website. Keep its other files and endpoints intact. Private drafts, backups and
reviewer records belong outside that public directory.

For the first native release, set this public value in **EAS's production
environment** before building:

```dotenv
EXPO_PUBLIC_CONTENT_API_URL=https://rounds-b01c3.web.app/catalog.json
```

Leave `EXPO_PUBLIC_PREVIEW_CONTENT_API_URL` unset in production. The local
`.env.local` file alone does not configure EAS production. The production build
check reads its process environment and checks the reviewed source and live URL.
The first iOS build needs this endpoint embedded; after that, content deployments
to the same endpoint do not require a new app binary.

### Subsequent content updates

Update the complete master catalog, preserving existing cards and IDs. Complete
review, increase any edited card's `contentVersion`, then prepare a higher catalog
revision. For example, after reviewed revision 1 is live:

```bash
npm run content:prepare -- 2
npm run site:prepare
npm run content:check
firebase deploy --only hosting --project rounds-b01c3
```

Use the actual next revision each time, not always 2. To use a separately maintained
full source file, pass its path after the revision:

```bash
npm run content:prepare -- 3 /path/to/complete-reviewed-catalog.json
```

Keep the bundled source aligned for the next app binary too. New native installs
use their bundled library until a newer catalog is fetched.

Future-dated cards need another prepare/deploy at or after their publication time:
this static Hosting setup has no automatic scheduled publishing job.

### Development preview only

To test unreviewed drafts as an explicitly public development preview, choose the
next **preview** revision and use `--preview`:

```bash
npm run content:prepare -- 2 --preview
npm run content:check
firebase deploy --only hosting --project rounds-b01c3
```

This command still includes only published, currently eligible cards; ordinary
private drafts remain excluded. The preview URL is publicly accessible, so only
use it for material intended to be shared as a preview. Production ignores this
channel. Preview and reviewed catalogs have separate revision sequences.

## 6. Check the result and correct mistakes

1. Open the deployed catalog URL and confirm its revision and complete card list.
   Also open the support/privacy pages to verify they remain available.
2. In an app connected to that channel, use **Settings → Check for new cards**.
   Confirm a successful check, then start the next round. A round already in
   progress keeps its existing card snapshot.
3. Confirm the new question and answer in Recall and Read. New/current-version
   unfinished cards appear before covered cards, ordered newest publication first.
   Covered cards then favor what that learner needs to revisit.
4. Confirm existing saved cards, progress and rewards remain intact. Disconnect
   and reopen to check the downloaded library remains usable.

The app checks at startup, about every five minutes while active, on eligible
foreground returns, and manually in Settings. Offline devices receive changes
when they reconnect. Firebase receives content requests, not the learner's
answers or progress; normal hosting metadata still applies.

If teaching needs correction, publish corrected text with a **higher card version
and catalog revision**. To withdraw a card, archive it in the full master source
and prepare/deploy a higher catalog revision. Do not delete its historical ID or
reuse it for a different concept. The preparation tool intentionally refuses
an empty export; withdrawing the whole library needs a deliberate reviewed empty
envelope using the procedure in `docs/firebase-setup.md`.

Avoid using Hosting's rollback as the normal content fix: clients reject older
catalog revisions. Publish a forward correction, even when restoring earlier
teaching text. Keep private backups of the source and each released export.

Common messages:

- **Needs editorial review, references and a publication date:** finish those
  fields after actual review; do not bypass the release check.
- **Increase the catalog revision:** use a number above the latest deployed one.
- **Version or teaching-text conflict:** keep the ID and increase the edited card's
  content version; reconcile with the latest live export.
- **Permission denied:** check the signed-in Google account, accepted membership,
  Hosting Admin and API Keys Viewer roles. Allow time for permission propagation.
- **No new cards visible:** check the build's endpoint/channel, live revision,
  visibility and publication time, refresh Settings, and start a new round.

For full field definitions and ordering rules, see `docs/app-guide.md`. For Apple
account, signing, TestFlight and App Store requirements, see `docs/ios-release.md`.
