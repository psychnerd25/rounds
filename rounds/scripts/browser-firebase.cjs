// Runs the actual app against live Firebase, then simulates a disconnected API.
const { chromium } = require(process.env.ROUNDS_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const endpoint = 'https://rounds-b01c3.web.app/preview-catalog.json';
const appUrl = process.env.ROUNDS_BROWSER_URL || 'http://localhost:8086';
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/backend/local/catalog.json')));

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const viewport of [{ width: 1280, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [], requests = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (r.url().startsWith(endpoint)) requests.push({ method: r.method(), body: r.postData() }); });
      await page.clock.install();
      const responsePromise = page.waitForResponse(r => r.url().startsWith(endpoint) && r.status() === 200, { timeout: 90000 });
      await page.goto(appUrl);
      const response = await responsePromise;
      const payload = await response.json();
      assert.equal(payload.channel, 'preview');
      assert.deepEqual(payload.catalog.cards, raw.cards);
      assert.equal(response.headers()['access-control-allow-origin'], '*');
      await page.getByRole('button', { name: 'Skip tour', exact: true }).click({ timeout: 60000 });
      const cacheKey = `rounds.content.catalog.v2:${endpoint}`;
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.catalog.cards.length === 30, cacheKey);
      const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('rounds.study.v1')));
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('rounds.study.v1') || 'null')?.sessions.length);
      assert.equal((await state()).preferences.misoBreed, 'tuxedo');
      const cardId = (await state()).sessions.at(-1).cardIds[0];
      await page.getByRole('button', { name: 'Recall mode', exact: true }).waitFor();
      await page.getByText('Editorial preview · review pending', { exact: true }).first().waitFor();
      await page.getByRole('button', { name: 'Save card', exact: true }).click();
      await page.getByRole('button', { name: 'Reveal the answer ↗', exact: true }).click();
      await page.clock.runFor(3500);
      await page.getByRole('button', { name: "Didn't know", exact: true }).click();
      await page.getByRole('button', { name: 'Keep learning →', exact: true }).click();
      assert.equal((await state()).paws.total, 6);
      assert.equal((await state()).events[0].contentVersion, raw.cards.find(c => c.id === cardId).contentVersion);
      await page.getByRole('tab', { name: /Progress/ }).click();
      await page.getByText('1 to revisit', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Revisit weak cards →', exact: true }).click();
      await page.getByRole('button', { name: 'Reveal the answer ↗', exact: true }).waitFor();
      assert.deepEqual((await state()).sessions.at(-1).cardIds, [cardId]);
      await page.getByRole('button', { name: 'Finish round', exact: true }).click();
      await page.getByRole('button', { name: 'Another round ↗', exact: true }).click();
      await page.getByRole('button', { name: 'Reveal the answer ↗', exact: true }).waitFor();
      await page.goto(`${appUrl}/?collection=saved&card=${encodeURIComponent(cardId)}&mode=read`);
      await page.clock.runFor(8500);
      await page.getByRole('button', { name: 'Mark as read · up to 4 paws', exact: true }).click({ timeout: 20000 });
      await page.getByRole('button', { name: 'Keep learning →', exact: true }).click();
      assert.equal((await state()).paws.total, 10);
      await page.getByRole('button', { name: 'Read mode', exact: true }).click();
      await page.clock.runFor(8500);
      await page.getByRole('button', { name: 'Mark as read · up to 4 paws', exact: true }).click();
      assert.equal((await state()).paws.total, 10);
      assert.equal((await state()).reads.length, 1);

      // Every main route stays usable after live data loading.
      for (const name of [/Topics/, /Saved/, /Progress/, /Cat/, /Settings/]) {
        await page.getByRole('tab', { name }).click();
      }
      await page.getByRole('radio', { name: 'Dark mode', exact: true }).click();
      await page.getByRole('button', { name: 'Check for new cards', exact: true }).click();
      await page.getByText(/Last checked/).waitFor();
      await page.reload();
      await page.getByRole('radio', { name: 'Dark mode', exact: true }).waitFor();
      assert.equal(await page.getByRole('radio', { name: 'Dark mode', exact: true }).getAttribute('aria-checked'), 'true');
      assert.equal((await state()).paws.total, 10);
      assert.deepEqual((await state()).saved, [cardId]);

      await page.route(`${endpoint}*`, route => route.abort('failed'));
      await page.getByRole('button', { name: 'Check for new cards', exact: true }).click();
      await page.getByText(/Could not check for new cards/).waitFor();
      await page.reload();
      await page.getByText(/Could not check for new cards/).waitFor();
      assert.equal((await state()).paws.total, 10);
      assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).catalog.cards.length, cacheKey), 30);
      // A corrupt content cache also cannot reset or block existing study data.
      await page.evaluate(key => localStorage.setItem(key, '{broken'), cacheKey);
      await page.reload();
      await page.getByText(/Could not check for new cards/).waitFor();
      await page.getByRole('tab', { name: /Feed/ }).click();
      await page.getByRole('button', { name: 'Reveal the answer ↗', exact: true }).waitFor();
      assert.equal((await state()).paws.total, 10);
      await page.getByRole('tab', { name: /Settings/ }).click();
      await page.unroute(`${endpoint}*`);
      await page.getByRole('button', { name: 'Check for new cards', exact: true }).click();
      await page.getByText(/Last checked/).waitFor();
      assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).catalog.cards.length, cacheKey), 30);
      assert.ok(requests.every(r => r.method === 'GET' && r.body === null));
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `/tmp/rounds-firebase-${viewport.width}.png`, fullPage: true });
      console.log(`PASS ${viewport.width}px: live Firebase 30-card payload/CORS, recall/read, rewards/dedup, saved, weak/repeat, routes/theme, refresh/reload, disconnected/corrupt-cache recovery; no page errors.`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
