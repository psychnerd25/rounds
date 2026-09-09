# Rounds · dailydose.md_

A local-first medical student revision app built with Expo 57, React Native and
TypeScript. The original HTML concepts and content-bank workbook remain intact.

## Run

Use Node 22.13+ (Node 24 for the domain tests).

```bash
npm install
npm run web
# Physical device: a compatible Expo Go/development build
npm start
npm run typecheck
npm test
npx expo export --platform all
```

## Current product

- Recall is the default. Up to ten cards per round: incomplete current versions
  newest-first, then covered cards by recall need. Impressions never count as study.
- Read completion is explicit; recall requires reveal plus an honest rating.
  Swipes and screen opens never earn points.
- Smart Review in Progress schedules recall and introduces saved/unfinished cards.
- Saved cards, study sessions, history, streaks and permanent Miso progression
  persist locally. Storage problems have a retry path.
- A short interactive first-run tour is isolated from real statistics and
  replayable in Settings.
- All 30 workbook cards are bundled for offline study. This is an editorial
  preview: medical review and real references are required before public release.
- No authentication, remote analytics or crash SDK. Firebase Hosting serves a
  content-only development preview; learner progress stays on the device.
- An optional content-only HTTP adapter supports versioned full/delta updates,
  offline caching and refresh from Settings. Copy `.env.example` to `.env.local`
  and supply a public catalog URL to enable it.

## Architecture and release plan

Start with [the app guide](docs/app-guide.md) for current business logic, the
content API contract, Firebase Hosting setup and ownership handover.

For the current App Store preparation and account requirements, see the
[iOS release guide](docs/ios-release.md). Support: dailydose.md.social@gmail.com.

For Firebase ownership and adding cards, share the
[handover and content-publishing guide](docs/firebase-handover.md) and
[new-card brief](docs/new-card-brief.md) with the publisher.
Shareable Word copies: [handover guide](docs/firebase-handover.docx) and
[new-card template](docs/new-card-brief.docx).

See [the architecture decision record](docs/architecture.md) for the audit,
repository/domain boundaries, ranking weights, reward economy, v4 migrations,
analytics schema, backend comparison, proposed database tables, offline conflict
strategy, mascot asset specifications and remaining release checklist.

`src/domain` contains pure business rules. `src/services/contracts.ts` defines
replaceable repositories. Local adapters live in `src/backend/local`; providers
compose them and screens use hooks. One local transaction keeps study and rewards
consistent. A backend must validate study mutations and derive rewards itself.

## Content imports

```bash
npm run import:content-bank
npm run import:instagram -- /path/to/owner-json-export /path/to/new-drafts.json
```

The workbook importer preserves current card IDs when title or prompt still
matches. If editing both, add an explicit ID mapping first. Do not regenerate
IDs when migrating to a backend. Teaching-text edits increment contentVersion
and invalidate editorial approval. The five workbook columns remain verbatim.

Instagram imports are editorial drafts only; no account scraping or login is
performed. The importer preserves source captions/media references and refuses
to overwrite draft output. Put local owner exports in ignored content-inbox.
Medical summaries need independent review before publication.

## Validation

Domain tests cover exposure, ranking, freshness, diversity, due review,
completion eligibility, duplicate rewards, milestones and schema migrations.
All-platform exports validate bundling, not native device behavior.
Physical-device accessibility, offline restart, process-kill saving and store
review checks remain necessary; see the decision record.
