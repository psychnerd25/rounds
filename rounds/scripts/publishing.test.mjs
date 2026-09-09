import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { preparePublishedContent } from "./prepare-content.mjs";

const raw = JSON.parse(readFileSync(new URL("../src/backend/local/catalog.json", import.meta.url)));
const now = new Date("2026-09-09T12:00:00Z");
const reviewed = () => ({ ...structuredClone(raw), cards: raw.cards.slice(0, 3).map(c => ({
  ...c, editorialStatus: "reviewed", publishedAt: "2026-09-01T00:00:00Z",
  references: [{ id: "fixture", title: "Test fixture", url: "https://example.org" }],
})) });

test("publishing does not relabel unreviewed cards or invent missing metadata", () => {
  const before = structuredClone(raw);
  assert.throws(() => preparePublishedContent(raw, 1, null, now), /editorial review/);
  assert.deepEqual(raw, before);
});
test("public export excludes drafts, future posts and their topic metadata", () => {
  const source = reviewed();
  source.cards[1].visibility = "draft";
  source.cards[2].publishedAt = "2027-01-01T00:00:00Z";
  const result = preparePublishedContent(source, 1, null, now);
  assert.equal(result.catalog.cards.length, 1);
  assert.deepEqual(result.catalog.topics.map(t => t.id), [source.cards[0].topicId]);
  assert.ok(result.catalog.subjects.every(s => s.topics.every(t => result.catalog.topics.some(topic => topic.title === t))));
});
test("publishing requires increasing revisions and versions for teaching edits", () => {
  const source = reviewed(), previous = preparePublishedContent(source, 1, null, now);
  assert.throws(() => preparePublishedContent(source, 1, previous, now), /revision/);
  source.cards[0].title = "Updated fixture";
  assert.throws(() => preparePublishedContent(source, 2, previous, now), /contentVersion/);
  source.cards[0].contentVersion++;
  assert.equal(preparePublishedContent(source, 2, previous, now).revision, 2);
});
test("initial export cannot silently publish an empty catalog", () => {
  assert.throws(() => preparePublishedContent({ ...raw, cards: [] }, 1, null, now), /No published cards/);
});
