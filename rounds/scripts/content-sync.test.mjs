import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { mergeCatalogUpdate, CatalogBaseMismatch } from "../src/domain/catalog-sync.ts";
import { createContentClient } from "../src/backend/remote/content-client.ts";

const raw = JSON.parse(readFileSync(new URL("../src/backend/local/catalog.json", import.meta.url)));
const cards = raw.cards.slice(0, 3).map(c => ({ ...c, contentVersion: 1, editorialStatus: "reviewed",
  publishedAt: "2026-09-01T00:00:00Z", references: [{ id: "fixture", title: "Test fixture", url: "https://example.org" }] }));
const catalog = (list = cards) => ({ subjects: raw.subjects,
  topics: cards.map(c => ({ id: c.topicId, subjectId: c.subjectId, title: c.topic })), cards: list });
const full = (revision = 1, list = cards) => ({ schemaVersion: 1, kind: "full", revision, catalog: catalog(list) });
const delta = (baseRevision, revision, list = [], removedCardIds = []) => ({
  schemaVersion: 1, kind: "delta", baseRevision, revision, catalog: catalog(list), removedCardIds,
});
const storage = (initial = null) => ({ value: initial, writes: 0,
  async getItem() { return this.value; },
  async setItem(key, value) { this.writes++; this.value = value; },
});
const response = value => ({ ok: true, status: 200, json: async () => value });
const client = (store, options = {}) => createContentClient({
  endpoint: "https://example.org/catalog.json", timeoutMs: 50,
  fallback: { load: async () => catalog([]) }, ...options,
}, store);

test("delta merges stable IDs, preserves untouched cards, updates versions and explicitly withdraws", () => {
  const current = full(1, cards.slice(0, 2));
  const updated = { ...cards[0], contentVersion: 2, title: "Updated teaching" };
  const next = mergeCatalogUpdate(current, delta(1, 2, [updated, cards[2]]));
  assert.deepEqual(next.catalog.cards.map(c => c.id), cards.map(c => c.id));
  assert.equal(next.catalog.cards[0].contentVersion, 2);
  assert.equal(current.catalog.cards[0].contentVersion, 1);
  const withdrawn = mergeCatalogUpdate(next, delta(2, 3, [], [cards[1].id]));
  assert.deepEqual(withdrawn.catalog.cards.map(c => c.id), [cards[0].id, cards[2].id]);
});
test("full snapshots replace membership; stale responses cannot restore withdrawn cards", () => {
  const next = mergeCatalogUpdate(full(1), full(2, [cards[0]]));
  assert.equal(next.catalog.cards.length, 1);
  assert.throws(() => mergeCatalogUpdate(next, full(1)), /Stale/);
  assert.equal(mergeCatalogUpdate(next, full(2)), next);
});
test("unversioned responses, mismatched deltas and silent teaching edits are rejected", () => {
  assert.throws(() => mergeCatalogUpdate(null, catalog()), /envelope/);
  assert.throws(() => mergeCatalogUpdate(null, delta(1, 2)), CatalogBaseMismatch);
  assert.throws(() => mergeCatalogUpdate(full(1), delta(2, 3)), CatalogBaseMismatch);
  assert.throws(() => mergeCatalogUpdate(full(1), full(2, [{ ...cards[0], title: "Silent edit" }])), /contentVersion/);
  assert.throws(() => mergeCatalogUpdate(full(1, [{ ...cards[0], contentVersion: 2 }]), full(2)), /contentVersion/);
});
test("duplicate IDs, conflicting removals and broken relationships cannot poison the catalog", () => {
  assert.throws(() => mergeCatalogUpdate(full(1), delta(1, 2, [cards[0], cards[0]])));
  assert.throws(() => mergeCatalogUpdate(full(1), delta(1, 2, [cards[0]], [cards[0].id])));
  const broken = delta(1, 2); broken.catalog.topics = [];
  assert.throws(() => mergeCatalogUpdate(full(1), broken), /card/);
  const reviewed = { ...full(2, [{ ...cards[0], editorialStatus: "unreviewed" }]), channel: "reviewed" };
  assert.throws(() => mergeCatalogUpdate(full(1), reviewed), /review/);
});
test("valid cache loads immediately without waiting for the network", async () => {
  let calls = 0;
  const repo = client(storage(JSON.stringify(full())), { fetcher: async () => { calls++; throw Error("offline"); } });
  assert.deepEqual(await repo.load(), catalog());
  assert.equal(calls, 0);
  await assert.rejects(repo.refresh(), /offline/);
  assert.deepEqual(await repo.load(), catalog());
});
test("corrupt and inaccessible caches fall back to the bundle and recover on refresh", async () => {
  for (const store of [storage("{broken"), { ...storage(), async getItem() { throw Error("storage denied"); } }]) {
    const repo = client(store, { fetcher: async () => response(full()) });
    assert.deepEqual(await repo.load(), catalog([]));
    assert.deepEqual(await repo.refresh(), catalog());
    assert.equal(JSON.parse(store.value).revision, 1);
  }
});
test("cache-write failure keeps fresh network data in memory and retries persistence", async () => {
  const store = storage(); let failed = true;
  store.setItem = async function(key, value) { if (failed) throw Error("quota"); this.value = value; };
  const repo = client(store, { fetcher: async () => response(full()) });
  assert.deepEqual(await repo.refresh(), catalog());
  assert.match(repo.getWarning(), /offline/);
  assert.deepEqual(await repo.load(), catalog());
  failed = false;
  await repo.refresh();
  assert.equal(JSON.parse(store.value).revision, 1);
  assert.equal(repo.getWarning(), null);
});
test("timeouts cover fetch and JSON decoding even if fetch ignores abort", async () => {
  for (const fetcher of [async () => new Promise(() => {}), async () => ({ ok: true, json: () => new Promise(() => {}) })]) {
    const repo = client(storage(JSON.stringify(full())), { fetcher, timeoutMs: 10 });
    await assert.rejects(repo.refresh(), /timed out/);
    assert.deepEqual(await repo.load(), catalog());
  }
});
test("a response arriving after timeout cannot overwrite an accepted cache", async () => {
  let resolve;
  const store = storage(JSON.stringify(full()));
  const repo = client(store, { fetcher: () => new Promise(r => { resolve = r; }), timeoutMs: 10 });
  await assert.rejects(repo.refresh(), /timed out/);
  resolve(response(full(2, [])));
  await new Promise(r => setImmediate(r));
  assert.deepEqual(await repo.load(), catalog());
  assert.equal(store.writes, 0);
});
test("concurrent refreshes share a request and send only the catalog revision", async () => {
  let calls = 0;
  const store = storage(JSON.stringify(full()));
  const repo = client(store, { fetcher: async (url, init) => {
    calls++;
    assert.equal(url, "https://example.org/catalog.json?since=1");
    assert.equal(init.credentials, "omit");
    assert.equal(init.body, undefined);
    return response(delta(1, 2, [], [cards[0].id]));
  } });
  const [a, b] = await Promise.all([repo.refresh(), repo.refresh()]);
  assert.equal(calls, 1); assert.equal(a, b); assert.equal(a.cards.length, 2);
});
test("Firestore document refreshes never add the custom revision query", async () => {
  const endpoint = "https://firestore.googleapis.com/v1/projects/demo/databases/(default)/documents/published/catalog";
  const urls = [];
  const repo = createContentClient({
    endpoint,
    timeoutMs: 50,
    fallback: { load: async () => catalog([]) },
    fetcher: async url => { urls.push(url); return response(full(2)); },
  }, storage(JSON.stringify(full())));
  await repo.refresh();
  assert.deepEqual(urls, [endpoint]);
});
test("a missing delta base retries once with a request for the full catalog", async () => {
  const urls = [];
  const repo = client(storage(JSON.stringify(full())), { fetcher: async url => {
    urls.push(url); return response(urls.length === 1 ? delta(2, 3) : full(3));
  } });
  await repo.refresh();
  assert.deepEqual(urls, ["https://example.org/catalog.json?since=1", "https://example.org/catalog.json"]);
});
test("bad or stale network data leaves last good cache unchanged", async () => {
  for (const payload of [{}, full(1), full(3, [{ ...cards[0], facts: [] }])]) {
    const store = storage(JSON.stringify(full(2)));
    const repo = client(store, { fetcher: async () => response(payload) });
    await assert.rejects(repo.refresh());
    assert.deepEqual(await repo.load(), catalog()); assert.equal(store.writes, 0);
  }
});
test("first install without a bundle can fetch; 304 preserves an accepted snapshot", async () => {
  let calls = 0;
  const repo = client(storage(), { fallback: undefined, fetcher: async () => ++calls === 1 ? response(full()) : { status: 304 } });
  assert.deepEqual(await repo.load(), catalog());
  assert.deepEqual(await repo.refresh(), catalog());
});
