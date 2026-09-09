// Run against Expo with EXPO_PUBLIC_CONTENT_API_URL=http://localhost:8097/catalog.json.
// Requires Playwright + Chromium; see docs/app-guide.md. All API responses are mocked.
const { chromium } = require(process.env.ROUNDS_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/backend/local/catalog.json')));
  const base = raw.cards.slice(0, 3).map((c, i) => ({ ...c, id: `browser-card-${i}`, contentVersion: 1,
    title: `Browser card ${i}`, prompt: `Browser question ${i}?`, editorialStatus: 'reviewed',
    publishedAt: `2026-09-0${i === 0 ? 8 : i === 1 ? 7 : 9}T00:00:00Z`,
    references: [{ id: 'fixture', title: 'Browser fixture', url: 'https://example.org' }] }));
  const catalog = cards => ({ subjects: raw.subjects, topics: base.map(c => ({ id: c.topicId, subjectId: c.subjectId, title: c.topic })), cards });
  const full = (revision, cards) => ({ schemaVersion: 1, kind: 'full', revision, catalog: catalog(cards) });
  let payload = full(1, base.slice(0, 2)), offline = false;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.install({ time: new Date('2026-09-09T12:00:00Z') });
    await page.route(`${process.env.ROUNDS_MOCK_CONTENT_URL || 'http://localhost:8097/catalog.json'}*`, async route => {
      requests.push({ url: route.request().url(), method: route.request().method(), body: route.request().postData() });
      if (offline) return route.abort('failed');
      await route.fulfill({ status: 200, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(payload) });
    });
    const snapshot = () => page.evaluate(() => JSON.parse(localStorage.getItem('rounds.study.v1')));
    const revision = () => page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.startsWith('rounds.content.catalog.v2:'));
      return key ? JSON.parse(localStorage.getItem(key)).revision : null;
    });
    const waitRevision = n => page.waitForFunction(n => {
      const key = Object.keys(localStorage).find(k => k.startsWith('rounds.content.catalog.v2:'));
      return key && JSON.parse(localStorage.getItem(key)).revision === n;
    }, n);
    await page.goto(process.env.ROUNDS_BROWSER_URL || 'http://localhost:8086/');
    await page.getByRole('button', { name: 'Skip tour' }).waitFor({ timeout: 90000 });
    await waitRevision(1);
    await page.getByRole('button', { name: 'Skip tour' }).click();
    await page.getByRole('button', { name: 'Recall mode', exact: true }).waitFor();
    await page.getByText(base[0].prompt, { exact: true }).waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('rounds.study.v1'))?.sessions.length);
    const originalSession = (await snapshot()).sessions.at(-1);
    assert.equal(originalSession.cardVersions[base[0].id], 1);

    const updated = { ...base[0], title: 'Updated browser card', prompt: 'Updated browser question?', contentVersion: 2 };
    payload = { schemaVersion: 1, kind: 'delta', baseRevision: 1, revision: 2,
      catalog: catalog([updated, base[2]]), removedCardIds: [] };
    await page.clock.fastForward(301000);
    await waitRevision(2);
    assert.equal((await snapshot()).sessions.at(-1).id, originalSession.id);
    await page.getByText(base[0].prompt, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Reveal the answer ↗', exact: true }).click();
    await page.clock.runFor(3500);
    await page.getByRole('button', { name: 'Knew it', exact: true }).click();
    await page.getByRole('button', { name: 'Keep learning →', exact: true }).click();
    const answered = (await snapshot()).events.at(-1);
    assert.equal(answered.contentVersion, 1);

    await page.getByRole('button', { name: 'Read mode', exact: true }).click();
    await page.getByText(base[2].title, { exact: true }).first().waitFor();
    await page.getByRole('button', { name: 'Recall mode', exact: true }).click();
    await page.getByText(base[2].prompt, { exact: true }).waitFor();
    assert.equal((await snapshot()).sessions.at(-1).cardVersions[base[0].id], 2);
    await page.getByRole('button', { name: 'Reveal the answer ↗', exact: true }).click();
    await page.clock.runFor(3500);
    await page.getByRole('button', { name: "Didn't know", exact: true }).click();
    await page.getByRole('button', { name: 'Keep learning →', exact: true }).click();
    await page.getByRole('tab', { name: /Progress/ }).click();
    await page.getByText('1 to revisit', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Revisit weak cards →', exact: true }).click();
    await page.getByText(base[2].prompt, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Finish round', exact: true }).click();
    await page.getByRole('button', { name: 'Another round ↗', exact: true }).click();
    await page.getByText(base[2].prompt, { exact: true }).waitFor();
    assert.deepEqual((await snapshot()).sessions.at(-1).cardIds, [base[2].id]);

    // Explicit withdrawal interrupts the obsolete round without erasing history.
    payload = full(3, [updated, base[1]]);
    await page.clock.fastForward(301000);
    await waitRevision(3);
    await page.getByText('Your collection starts with one card.', { exact: true }).waitFor();
    assert.ok((await snapshot()).events.some(e => e.cardId === base[2].id));
    await page.getByRole('tab', { name: /Settings/ }).click();
    await page.getByRole('button', { name: 'Check for new cards', exact: true }).click();
    assert.equal(await revision(), 3);
    offline = true;
    await page.getByRole('button', { name: 'Check for new cards', exact: true }).click();
    await page.getByText(/Could not check for new cards/).waitFor();
    await page.reload();
    await page.getByText(/Could not check for new cards/).waitFor({ timeout: 60000 });
    assert.equal(await revision(), 3);
    await page.getByRole('tab', { name: /Feed/ }).click();
    await page.getByRole('button', { name: 'Read mode', exact: true }).click();
    await page.getByText(updated.title, { exact: true }).first().waitFor();
    assert.ok((await snapshot()).events.some(e => e.cardId === base[2].id));
    assert.ok(requests.length >= 5);
    assert.ok(requests.every(r => r.method === 'GET' && r.body === null));
    assert.deepEqual(errors, []);
    console.log('PASS: startup, delta refresh, stable active round/version, newest-first Read/Recall, weak cards, one-card repeat, withdrawal, manual refresh, cached offline recovery; no page errors or learner uploads.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
