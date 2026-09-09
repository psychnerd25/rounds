# Production preparation

The logo and native configuration are prepared. **The app is not ready for a public medical-content release yet.** The production build check reports the concrete remaining content blockers; internal development testing still works.

## Completed

- Cleaned the supplied WhatsApp logo with the built-in imagegen tool, preserved the design and original file, and saved project-owned masters. Exported a 1024px opaque store icon, safe transparent Android foreground/monochrome mask, splash mark and 64px favicon. [Artwork and exact prompts](../assets/brand/README.md).
- Replaced the Expo launcher, iOS Icon Composer starter, splash and favicon references. Charcoal splash/adaptive background matches the logo. The existing wordmark, attribution and study UI colors are preserved.
- Set the brand-based iOS bundle identifier and Android application ID to `com.dailydosemd.rounds`. Verify availability under the friend's Apple Developer account before registration/signing; no store app was registered here. Earlier generated Android builds use the previous identifier; regenerate Android before its next build.
- Set native appearance support to automatic so the app's light/dark controls are not constrained by a light-only native setting.
- Blocked unused Android shared-storage read/write permissions in app configuration. Prebuild emits manifest removal directives. No camera, contacts or location feature was added.
- Installed SDK-compatible `expo-dev-client` 57.0.18 to support the existing development-client profile.
- Explicit EAS environments: development, preview and production. Development has the public Firebase preview URL; preview creates an internal Android APK; production creates an Android App Bundle and increments build numbers remotely.
- Production runs asset/content checks through `eas-build-post-install`. Leave the preview URL unset in EAS's production environment: the check rejects it if populated. EAS does not accept an empty string in profile environment values, so that invalid entry was removed. Checks require reviewed bundled content and a working reviewed HTTPS catalog. Preview/internal builds are not blocked by the public-release checks.
- Settings derives the displayed app version from Expo config and shows the editorial-preview description based on actual content. Removed the obsolete promise of account deletion from this account-free app.
- Publisher branding and support contact are now `dailydose.md_` and `dailydose.md.social@gmail.com`. Settings links to privacy/support pages generated with `npm run site:prepare`. See the [iOS release guide](ios-release.md) for App Store metadata and account requirements.

## Verification

- `npm run check:brand`: passed opaque dimensions, transparent padding, Android safe-zone bounds, monochrome alpha, splash and favicon checks.
- `npm run typecheck` and all 68 business/import/publishing tests: passed.
- Both Android and iOS native prebuilds: passed in `/tmp/rounds-native-brand`, using Expo's bundled template. Generated iOS icon/splash and Android adaptive/themed icon resources point to the new artwork. This is native configuration generation, not a signed binary/device test.
- The workspace's ignored Android directory was regenerated from Expo configuration so local Android builds receive the new resources too. An initial relative-template-path invocation failed; the retry with the absolute bundled template path passed. EAS clean builds also regenerate native directories from config.
- Production lifecycle check fails as intended for the current unreviewed bundled content and absent reviewed-content URL. Internal-build lifecycle check passes.
- Web, Android and iOS exports passed in `/tmp/rounds-branded-export`. Live Firebase browser regression checks passed at desktop, 390px and 320px widths with no page errors after the branding/dependency changes.
- Current `npm audit --omit=dev`: 14 moderate affected-package entries; 0 high and 0 critical. Two underlying advisories affect `decode-uri-component` and `uuid`. npm's proposed fixes downgrade Expo packages, so no forced downgrade or untested major override was applied.

## Still required before public release

1. **Reviewed content:** medical sign-off, real references and publication dates for the bundled library and remote release catalog. Publish the reviewed envelope to Firebase and set `EXPO_PUBLIC_CONTENT_API_URL` in EAS's production environment. The existing 30-card Firebase preview stays labelled unreviewed and is ignored by production composition.
2. **Publisher/account details:** the brand, contact email and public pages are prepared. The friend must confirm their Apple account's legal seller identity and that the privacy description matches their support-mailbox practices, then complete App Store privacy, age-rating, contact and territory disclosures. Do not use the current developer's personal Apple membership. Branding does not override Apple's legal seller-name rules.
3. **Store accounts, signing and native testing:** confirm the iOS identifier with the Apple account, configure signing credentials and submission IDs, build signed Android/iOS artifacts, and test installation, launcher masks, cold-start splash, offline launch, background/process-kill recovery, VoiceOver/TalkBack and large text on physical devices. Web tests and prebuild do not certify native runtime behavior.
4. **Dependency advisories:** review SDK-compatible patched releases for the two audit findings. [URI decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
5. **Reproducible repository and release operations:** commit the intended source, lockfile, logo assets, configuration and fixtures (most source is currently untracked), add CI, finalize store screenshots/descriptions and privacy declarations. No app-store submission or paid cloud build was started.

## Commands

```bash
npm run brand:export
npm run check:brand
npm run typecheck
npm test
npm run check:production
```

`check:production` reads the environment of the command/EAS build; it does not automatically load `.env.local`. A passing content check still requires the human/store/device items above. After prerequisites are complete, use the `production` EAS profile. The internal `preview` profile is a release-mode binary and ignores development-only remote preview content; it retains the bundled library for device testing.

Official references: [Expo app icon and splash](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/), [Android adaptive icon safe zone](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive), [EAS lifecycle hooks](https://docs.expo.dev/build-reference/npm-hooks/).
