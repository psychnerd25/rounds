# Rounds

Rounds is a medical-student revision app built from educational content by **dailydose.md_**. It turns short clinical teaching points into active-recall cards, saved review, progress tracking, and a lightweight Paw Points / cat progression loop.

## Project

The Expo / React Native app lives in [`rounds/`](./rounds).

```bash
cd rounds
npm install
npm start
```

Useful checks:

```bash
npm run typecheck
npm test
```

Android demo build:

```bash
eas build -p android --profile preview
```

## Content workflow

The original content bank uses five teaching fields:

- Subject
- Topic Title
- Question
- Next Best Step / Management
- Clinical Pearl / Key Takeaway

The Firebase admin page lets the content owner add or edit those fields without exposing internal app metadata. Stable IDs and other implementation fields remain internal so saves, history, and feed behavior continue to work.

## Repository layout

- `rounds/src/` — mobile/web client
- `rounds/admin/` — simple Firebase content editor
- `rounds/assets/brand/` — production branding
- `rounds/scripts/` — tests/build/import utilities
- `rounds/hosting/` — Firebase Hosting assets
- `rounds-content-bank.xlsx` — original content source
- root HTML/image files — original design/brand references

## Privacy

Learner progress is stored locally in the app. Firebase is currently used for content/editorial delivery, not learner accounts. Do not commit `.env` files, signing keys, service-account credentials, or other private credentials; repository and app-level `.gitignore` rules protect these patterns.
