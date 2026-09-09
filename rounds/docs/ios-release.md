# Rounds iOS release · dailydose.md_

The public app is Rounds by **dailydose.md_**. Support contact:
**dailydose.md.social@gmail.com**. No individual developer credit belongs in the
app, website, marketing copy, copyright field or screenshots. Required third-party
license notices stay intact. The linked Expo project is an existing development
resource; it is not an Apple seller identity. No Apple account or membership has
been verified, no identifier has been registered with Apple, and no iOS binary
has been uploaded in this session.

## Account and cost

Use the friend's Apple Developer membership. An individual membership displays
that person's legal name as the App Store seller. A registered organization uses
its legal entity name; an Instagram handle alone is not a legal entity. Apple
lists membership at US$99 per year, with regional pricing and certain fee waivers.
Do not enroll or purchase anything under the current developer's personal name.
See [Apple enrollment](https://developer.apple.com/programs/enroll/).

The website and in-app credit can use dailydose.md_ independently of the legal
seller name. Firebase content hosting does not cover Apple's membership cost.
Use secure CLI/browser login for Apple authentication; do not put passwords,
verification codes, private signing keys or recovery codes in this repository.

The Expo project can be handed over separately if the friend should own builds
and service access too. Keeping the existing project ID for development does not
transfer Firebase or Apple ownership. Before the first release build, decide the
friend's Expo project/team and Apple team, then configure the matching credentials.

## Prepared metadata

| Field | Prepared value |
| --- | --- |
| App name | Rounds (availability to be checked in App Store Connect) |
| Subtitle | Recall. Read. Remember. |
| Brand | dailydose.md_ |
| Bundle identifier | `com.dailydosemd.rounds` (availability not yet checked with Apple) |
| Version | 1.0.0 |
| Primary category suggestion | Education |
| Marketing URL | https://rounds-b01c3.web.app/ |
| Support URL | https://rounds-b01c3.web.app/support.html |
| Privacy URL | https://rounds-b01c3.web.app/privacy.html |
| Support email | dailydose.md.social@gmail.com |
| Keywords draft | medicine,revision,recall,flashcards,medical student,study,spaced repetition |

Name/subtitle/keywords are drafts for the publisher to enter into App Store
Connect. Legal copyright owner, review contact name/phone, Apple Team ID,
numeric App Store Connect app ID, age rating and territory/trader declarations
must come from the friend and actual account; none are fabricated here.

### Description draft

Rounds by dailydose.md_ makes room for medical revision in your daily routine.

Start with active recall: try the question, reveal the answer, and rate how well
you knew it. Read short explanations and return to the cards that need more
practice. Save useful cards, build a study streak and grow your companion cat as
you learn.

Your study progress stays on your device. No account is required, and the bundled
and downloaded library remains available offline.

Rounds is an educational revision tool for medical students. It does not provide
patient-specific medical advice, diagnosis or treatment. Consult a qualified
clinician before making medical decisions.

### Review notes draft — finish after content review

No sign-in or demo account is required. On first launch, finish or skip the guided
tour to start Recall. Reveal an answer, then select a recall rating. Read mode is
available in the same feed. Saved, Progress, Cat and Settings are in the navigation.
Settings contains support and privacy links. Study progress is local; the public
content endpoint downloads educational cards and does not receive learner data.

Before sending these notes, add the actual content-review process and references.
Do not claim that the current preview is medically reviewed. Answer Apple's age
rating and privacy questionnaires from the signed app and actual service practices.

## Remaining release sequence

1. Confirm the friend's active Apple Developer membership and seller name. Create
   the App Store Connect app under that team using the brand bundle identifier.
   Put its real numeric app ID in `submit.production.ios.ascAppId` in `eas.json`.
2. Complete medical review, references and publication metadata for bundled and
   remote cards. Publish the reviewed catalog with the existing content tooling.
   Set `EXPO_PUBLIC_CONTENT_API_URL` in the production EAS environment and leave
   `EXPO_PUBLIC_PREVIEW_CONTENT_API_URL` unset. Do not change review flags merely
   to pass a build check.
3. Confirm the public privacy page matches publisher practices (including support
   email handling). Audit third-party SDKs and Firebase Hosting metadata for the
   App Privacy answers; “no study uploads” does not mean “no network data.” Choose
   the applicable standard or custom license in App Store Connect.
4. Run local checks below, configure Apple signing for the intended team, and
   build using `eas build --platform ios --profile production`. This starts a
   cloud build; first check the available build allowance. This guide does not
   authorize a paid plan or membership purchase.
5. Upload the tested build with `eas submit --platform ios --profile production`.
   EAS upload places it in App Store Connect/TestFlight, not immediately on the
   public store. Test on real iPhones: install/cold start, offline and process-kill
   recovery, data persistence, light/dark mode, small/large text, VoiceOver,
   support/privacy links, rewards and content refresh.
6. Capture screenshots from the signed app, complete store metadata, privacy and
   age-rating disclosures, select the build and submit it for Apple App Review.
   Approval and release availability are determined by Apple.

```bash
npm run site:prepare
npm run content:check
npm run check:brand
npm run typecheck
npm test
npm run check:production
```

The production check intentionally fails until the reviewed library and URL exist.
The internal preview build is not a public medical-content release. No store
submission or paid cloud build was performed while these blockers remain.

## Verified in this preparation

- EAS rejected an empty environment value in the old production profile; the
  invalid entry is removed. Project lookup now passes EAS configuration validation.
- The app's public branding and support data come from `src/config/publisher.json`.
- `npm run site:prepare` reproduces the static landing, support and privacy pages.
- The existing hosting allowlist now permits exactly those pages, stylesheet and
  icon alongside the existing JSON endpoints. Content review checks remain intact.
- The landing, support and privacy pages were deployed to Firebase Hosting and
  checked live in a browser at 320px width. Contact links, Settings URLs and
  attribution passed with no page errors or horizontal page overflow.
- TypeScript, all nine test files, content/asset checks, the updated iOS export
  and an isolated native iOS prebuild passed. Generated Xcode settings use
  `com.dailydosemd.rounds`. These checks do not replace signing or device tests.
- The production content check still fails as expected: the bundled cards lack
  editorial review/references/publication dates, and the reviewed production
  catalog URL is unset.

References: [EAS iOS submission](https://docs.expo.dev/submit/ios/),
[Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/),
[App Privacy details](https://developer.apple.com/app-store/app-privacy-details/),
[Firebase privacy](https://firebase.google.com/support/privacy).
