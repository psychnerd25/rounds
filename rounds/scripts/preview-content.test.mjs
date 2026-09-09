import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { preparePublishedContent } from "./prepare-content.mjs";
import { parseCatalogUpdate, mergeCatalogUpdate } from "../src/domain/catalog-sync.ts";
import { resolveContentConfig } from "../src/backend/content-config.ts";
import { createContentClient } from "../src/backend/remote/content-client.ts";

const raw = JSON.parse(readFileSync(new URL("../src/backend/local/catalog.json", import.meta.url)));
const preview = () => preparePublishedContent(raw, 1, null, new Date(), { preview: true });
test("preview export retains every card and original editorial metadata", () => {
  const snapshot = preview();
  assert.equal(snapshot.channel, "preview");
  assert.deepEqual(snapshot.catalog.cards, raw.cards);
  assert.equal(snapshot.catalog.cards.length, 30);
  assert.throws(() => preparePublishedContent(raw, 1), /editorial review/);
});
test("preview requires explicit opt-in and cannot claim to be a reviewed response", () => {
  const snapshot = preview();
  assert.throws(() => parseCatalogUpdate(snapshot), /Preview content is disabled/);
  assert.doesNotThrow(() => parseCatalogUpdate(snapshot, { allowPreview: true }));
  assert.throws(() => parseCatalogUpdate({ ...snapshot, channel: "reviewed" }, { allowPreview: true }), /editorial review/);
  assert.throws(() => parseCatalogUpdate({ ...snapshot, channel: "other" }, { allowPreview: true }), /channel/);
});
test("preview still rejects silent teaching changes and stale revisions", () => {
  const current = preview(), next = structuredClone(current);
  next.revision = 2; next.catalog.cards[0].title = "Edited fixture";
  assert.throws(() => mergeCatalogUpdate(current, next, { allowPreview: true }), /contentVersion/);
  next.catalog.cards[0].contentVersion++;
  const merged = mergeCatalogUpdate(current, next, { allowPreview: true });
  assert.equal(merged.channel, "preview");
  assert.throws(() => mergeCatalogUpdate(merged, current, { allowPreview: true }), /Stale/);
});
test("production composition ignores the preview URL even if it is configured", () => {
  assert.deepEqual(resolveContentConfig(false, "", "https://example.org/preview.json"), { endpoint: undefined, allowPreview: false });
  assert.deepEqual(resolveContentConfig(false, "https://example.org/catalog.json", "https://example.org/preview.json"),
    { endpoint: "https://example.org/catalog.json", allowPreview: false });
  assert.deepEqual(resolveContentConfig(true, "", "https://example.org/preview.json"),
    { endpoint: "https://example.org/preview.json", allowPreview: true });
});
test("preview client caches labelled content; default client rejects that same cache and network payload", async () => {
  let value = null;
  const storage = { async getItem() { return value; }, async setItem(key, data) { value = data; } };
  const options = { endpoint: "https://example.org/preview.json", fetcher: async () => ({ ok: true, status: 200, json: async () => preview() }) };
  const dev = createContentClient({ ...options, allowPreview: true }, storage);
  assert.equal((await dev.refresh()).cards.length, 30);
  assert.equal(JSON.parse(value).channel, "preview");
  const prod = createContentClient(options, storage);
  await assert.rejects(prod.load(), /Preview content is disabled/);
});
