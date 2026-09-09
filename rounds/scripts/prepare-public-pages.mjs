import { copyFileSync, readFileSync, writeFileSync } from "node:fs";

const publisher = JSON.parse(readFileSync(new URL("../src/config/publisher.json", import.meta.url), "utf8"));
const directory = new URL("../hosting/public/", import.meta.url);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const name = escape(publisher.name), email = escape(publisher.email);
const contact = `<a href="mailto:${email}">${email}</a>`;
function page(filename, title, body) {
  writeFileSync(new URL(filename, directory), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#24272f">
  <meta name="description" content="Rounds by ${name}: medical student revision, support and privacy information.">
  <title>${escape(title)} · Rounds</title>
  <link rel="icon" type="image/png" href="/brand.png">
  <link rel="stylesheet" href="/site.css">
</head>
<body>
  <header><a class="brand" href="/"><img src="/brand.png" width="48" height="48" alt=""><span>Rounds<small>by ${name}</small></span></a></header>
  <main><h1>${escape(title)}</h1>${body}</main>
  <footer><nav aria-label="Footer"><a href="/">Rounds</a><a href="/support.html">Support</a><a href="/privacy.html">Privacy</a><a href="${escape(publisher.instagramUrl)}" rel="noreferrer">Instagram</a></nav><p>${name} · ${contact}</p></footer>
</body>
</html>
`);
}
writeFileSync(new URL("site.css", directory), `:root{color-scheme:light dark;--bg:#f7f7f3;--surface:#fff;--ink:#24272f;--muted:#555d65;--accent:#006e68;--line:#d8dfdc}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,sans-serif;line-height:1.7;overflow-wrap:anywhere}
header,main,footer{max-width:760px;margin:auto;padding:24px}header{padding-top:32px}.brand{display:inline-flex;gap:12px;align-items:center;text-decoration:none;font-size:24px;font-weight:700;color:var(--ink)}.brand img{border-radius:12px}.brand small{display:block;font-size:12px;font-weight:400;color:var(--muted)}
main{background:var(--surface);border:1px solid var(--line);border-radius:24px;margin:12px auto}h1{font-size:clamp(30px,6vw,44px);line-height:1.2;letter-spacing:-1px}h2{font-size:21px;line-height:1.4;margin-top:32px}p,li{font-size:16px}a{color:var(--accent);text-underline-offset:3px}a:focus-visible{outline:3px solid var(--accent);outline-offset:4px}li+li{margin-top:8px}.note,footer{color:var(--muted)}nav{display:flex;flex-wrap:wrap;gap:8px 24px}nav a{padding:8px 0}footer p{font-size:13px}
@media(max-width:800px){main{margin:12px 16px}header,footer{padding:24px}}@media(prefers-color-scheme:dark){:root{--bg:#1c1f25;--surface:#24272f;--ink:#f4f5f2;--muted:#bdc5c9;--accent:#73d3c5;--line:#424851}}
`);
copyFileSync(new URL("../assets/brand/rounds-favicon.png", import.meta.url), new URL("brand.png", directory));
page("index.html", "Make room for recall.", `
<p>Rounds is a medical student revision app from ${name}. Start with active recall, read a short explanation, and return to the cards you need to practise.</p>
<ul><li>Recall and read in short study rounds.</li><li>Save cards and revisit topics that need attention.</li><li>Keep your study history, streaks and companion cat on your device.</li><li>Study the downloaded library offline, without creating an account.</li></ul>
<p class="note">The app is being prepared for iOS. The current content library is an editorial preview with medical review pending.</p>
<p>Rounds is for education. It does not diagnose, treat or provide patient-specific advice. Check with a qualified clinician before making medical decisions.</p>
<p><a href="/support.html">Get help or contact ${name} →</a></p>`);
page("support.html", "How can we help?", `
<p>Contact ${name} at ${contact} for Rounds support, privacy questions or content corrections.</p>
<h2>Report a problem</h2><p>Include your Rounds version (shown in Settings), device model and iOS version, what you expected, and the steps that caused the problem. A screenshot can help; remove personal or patient information before sending it.</p>
<h2>Suggest a content correction</h2><p>Include the card title, the part that needs correcting and a reliable reference. The current library is an editorial preview; medical review is pending.</p>
<h2>Where is my progress?</h2><p>Saved cards, recall ratings, read history, rewards, preferences and your cat live in this device’s app storage. There is no Rounds account or server backup of your progress. Reinstalling or clearing storage can remove it; our support team cannot restore a copy from a Rounds server.</p>
<h2>Study offline</h2><p>The bundled and previously downloaded cards work offline. Connect to the internet to check for content updates in Settings when updates are enabled. Existing cards remain available if an update fails.</p>
<h2>Delete local data</h2><p>On iOS, use Delete App in Settings → General → iPhone Storage → Rounds to remove the app and its local data. Offload App retains documents and data. Device backups are managed separately in your Apple settings. On the web, clear site data in your browser.</p>
<h2>Medical questions</h2><p>This mailbox provides app and content support, not clinical care. Do not send patient records. For diagnosis or treatment, consult a qualified clinician; for an emergency, contact your local emergency service.</p>
<p><a href="/privacy.html">Read the privacy policy →</a></p>`);
page("privacy.html", "Privacy policy", `
<p class="note">Updated 9 September 2026 · Rounds by ${name}</p>
<p>This policy describes the current Rounds app and its support website. Privacy contact: ${contact}.</p>
<h2>Study information stays on your device</h2><p>Rounds stores saved cards, recall ratings, reading and session history, points, streaks, preferences, onboarding status, your cat’s name and appearance, and a local activity log in device storage. Downloaded content is cached there too. Rounds does not upload this study information or create a user account.</p>
<p>Local data remains until app or browser storage is deleted. Device backups, if enabled, are controlled by your operating system and backup provider, not a Rounds account. See <a href="/support.html">support</a> for deletion instructions. We cannot read, recover or remotely delete your device’s study history.</p>
<h2>Content downloads and this website</h2><p>The app can request public content from Google Firebase Hosting. Requests include the content address and may include the cached catalog revision; they do not include your answers, saved cards, cat name or study history. Normal network requests also expose technical information such as your IP address to the hosting provider.</p>
<p>Google states that Firebase Hosting uses IP addresses for abuse prevention and usage analysis and retains IP data for a few months. See <a href="https://firebase.google.com/support/privacy">Firebase privacy and security information</a>. This website uses the same hosting service.</p>
<h2>No advertising or study tracking</h2><p>The current app and this website contain no advertising, analytics SDK, tracking pixels or crash-reporting SDK. The local activity log is not transmitted. The app does not request contacts, location, microphone, camera or health-record access.</p>
<h2>If you contact support</h2><p>Sending an email shares your email address and anything you include with the ${name} support mailbox, hosted by Gmail. That information is used to answer your request and investigate issues. Correspondence remains in the mailbox until deleted; you can request deletion by emailing ${contact}. Do not include patient information. Email and hosting providers process information under their service terms, including the <a href="https://policies.google.com/privacy">Google Privacy Policy</a>.</p>
<h2>External links</h2><p>Instagram, reference websites and your email provider have their own privacy practices. Rounds does not send your local study history when opening these links. These services and hosting providers may process information in countries other than yours.</p>
<h2>Who Rounds is for</h2><p>Rounds is designed for medical students. It is not a service for collecting patient records or children’s personal information.</p>
<h2>Changes and questions</h2><p>We will update this page if the app’s data practices change. Contact ${contact} for questions or requests concerning information you have shared with support.</p>`);
console.log("Prepared Rounds landing, support and privacy pages for dailydose.md_.");
