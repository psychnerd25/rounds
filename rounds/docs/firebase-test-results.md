# Firebase preview verification

Verified 9 September 2026 after the user authorized uploading the existing content as a development preview.

## Live connection

- Firebase project: `rounds-b01c3`; billing confirmed disabled before deployment.
- Published endpoint: https://rounds-b01c3.web.app/preview-catalog.json
- Revision 1, `channel: "preview"`, 30 cards. Downloaded JSON matches the generated export exactly; all card text, IDs, versions and editorial metadata match the bundled source.
- HTTP 200, `Content-Type: application/json`, `Access-Control-Allow-Origin: *`, `Cache-Control: no-cache` verified from the live host and through Chromium.
- Development builds use the preview URL from ignored `.env.local`. Production composition ignores that variable. The normal remote policy rejects preview envelopes from network and cache.
- No learner data uploaded: observed catalog traffic consisted of GET requests with no request body.

## Checks and outcomes

| Check | Result |
| --- | --- |
| Strict TypeScript | Pass |
| Automated domain/import/publishing/remote-client tests | 68 individual tests across nine files pass |
| Live Firebase app integration | Pass at 1280×1000, 390×844 and 320×640 |
| Actual live catalog download and cached reload | All 30 original cards present |
| Recall and Read | Explicit completion, reveal/time thresholds, correct version retained |
| Rewards | Recall 6 + Read 4; repeating the same read/day does not award again |
| Progress/bookmarks | Survive navigation, reload, failed refresh and content-cache corruption |
| Weak-card practice and sole-card repeat | Work immediately and restart successfully |
| Navigation and appearance | Main routes open; dark preference persists after reload |
| Offline/cache failure simulation | Existing cache or bundle remains usable; reconnected refresh repairs content cache without resetting study state |
| Update/withdrawal simulation | Next-round ordering, active session/version stability, explicit withdrawal, manual refresh and fallback pass in an isolated browser context |
| Web/Android/iOS production exports | Pass; output `/tmp/rounds-firebase-export` |
| Browser runtime errors | None in the tested flows |

The real Firebase catalog remained at revision 1 throughout testing. Update/withdrawal fixtures and simulated network failures were isolated to browser contexts; no fake study cards or learner records were deployed.

## Reproduction

The connected Expo development server runs on port 8086. A pre-existing process occupied port 8085, so it was left running.

```bash
EXPO_OFFLINE=1 npx expo start --web --port 8086
ROUNDS_PLAYWRIGHT_MODULE=/tmp/rounds-browser/node_modules/playwright node scripts/browser-firebase.cjs
ROUNDS_PLAYWRIGHT_MODULE=/tmp/rounds-browser/node_modules/playwright ROUNDS_MOCK_CONTENT_URL=https://rounds-b01c3.web.app/preview-catalog.json node scripts/browser-content.cjs
npm run typecheck
npm test
```

The Playwright installation is a workspace testing dependency outside the app. Screenshots are saved under `/tmp/rounds-firebase-1280.png`, `/tmp/rounds-firebase-390.png` and `/tmp/rounds-firebase-320.png`.

## Limits

No failing app behavior remains from these checks. They do not establish native runtime behavior on a physical Android/iOS device, long-term uptime, or medical accuracy. The 30 cards remain visibly marked as an editorial preview; medical review/references are still needed for the reviewed release path. Expo's optional native DevTools installer reported a missing `libgtk-3.so.0` in this Codespace; the web server, browser tests and platform exports still completed successfully.

See [Firebase setup](firebase-setup.md) for future uploads and [the app guide](app-guide.md) for business rules.
