import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertCatalog } from "../src/domain/catalog-validation.ts";
import { selectStudyDeck } from "../src/domain/feed-selection.ts";
import { localRecommendations } from "../src/domain/ranking.ts";
import { applyStudyCommand } from "../src/domain/study-service.ts";
import { emptyState, parseState } from "../src/state/progress.ts";

const now = new Date("2026-09-09T12:00:00Z");
const raw = JSON.parse(readFileSync(new URL("../src/backend/local/catalog.json", import.meta.url)));
const catalog = () => ({ ...structuredClone(raw), topics: raw.cards.map(c => ({ id: c.topicId, subjectId: c.subjectId, title: c.topic })) });
const session = () => ({ id: "session", mode: "recall", startedAt: now.toISOString(), completedAt: null, cardIds: ["a"], completedCardIds: [], revealedCardIds: [], impressionCardIds: [], earnedPaws: 0, activeMilliseconds: 0 });
const run = (state, command, id = "command") => applyStudyCommand(state, command, id, now);

test("bundled content passes the same runtime boundary as external JSON", () => {
  const payload = catalog();
  assert.equal(assertCatalog(payload), payload);
});
test("a public content gate rejects the unreviewed development catalog", () => {
  assert.throws(() => assertCatalog(catalog(), { requireReviewed: true }), /needs editorial review/);
  const payload = catalog();
  payload.cards = payload.cards.map(c => ({ ...c, editorialStatus: "reviewed", publishedAt: now.toISOString(), references: [{ id: "reference", title: "Fixture reference", url: "https://example.org/reference" }] }));
  assert.doesNotThrow(() => assertCatalog(payload, { requireReviewed: true }));
});
test("malformed API catalog fields fail before reaching UI", () => {
  const corruptions = [
    p => { p.subjects[0] = null; },
    p => { p.subjects[0].topics = "not-an-array"; },
    p => { p.subjects.push(p.subjects[0]); },
    p => { p.topics.push(p.topics[0]); },
    p => { p.topics[0].subjectId = p.subjects[1].id; },
    p => { p.cards[0].prompt = {}; },
    p => { p.cards[0].priority = null; },
    p => { p.cards[0].tags = [42]; },
    p => { p.cards[0].references = [{ id: "x", title: "x", url: "https://" }]; },
    p => { p.cards[0].source = { id: "x", title: "x", url: "javascript:alert(1)" }; },
  ];
  for (const corrupt of corruptions) { const payload = catalog(); corrupt(payload); assert.throws(() => assertCatalog(payload)); }
});
test("deep links cannot introduce future, draft, excluded or wrong-rotation cards", () => {
  const cards = catalog().cards.slice(0, 2);
  const selected = cards[0];
  for (const change of [{ publishedAt: "2027-01-01T00:00:00Z" }, { visibility: "draft" }, { visibility: "archived" }]) {
    const deck = selectStudyDeck([{ ...selected, ...change }, cards[1]], emptyState, { card: selected.id }, "read", "all", now);
    assert.ok(!deck.some(c => c.id === selected.id));
  }
  assert.deepEqual(selectStudyDeck(cards, emptyState, { card: selected.id }, "read", "different-subject", now), []);
  assert.ok(!selectStudyDeck(cards, emptyState, { card: selected.id }, "read", "all", now, [selected.id]).some(c => c.id === selected.id));
});
test("selected saved cards remain first but a deep link cannot bypass review due dates", () => {
  const cards = catalog().cards.slice(0, 2);
  const selected = cards[1];
  const state = { ...emptyState, saved: cards.map(c => c.id) };
  assert.equal(selectStudyDeck(cards, state, { collection: "saved", card: selected.id }, "recall", "all", now)[0].id, selected.id);
  state.events = [{ id: "known", cardId: selected.id, rating: "known", at: now.toISOString(), day: "2026-09-09" }];
  assert.ok(!selectStudyDeck(cards, state, { collection: "review", card: selected.id }, "recall", "all", now).some(c => c.id === selected.id));
});
test("discovery affinity uses the most recent combined reads and recalls", () => {
  const base = catalog().cards[0];
  const cards = [{ ...base, id: "a", subjectId: "old", topicId: "a" }, { ...base, id: "z", subjectId: "new", topicId: "z" }];
  const state = { ...emptyState,
    reads: Array.from({ length: 100 }, (_, i) => ({ id: `r${i}`, cardId: "a", day: "2026-01-01", at: "2026-01-01T12:00:00Z" })),
    events: [{ id: "old-known", cardId: "a", rating: "known", day: "2026-01-01", at: "2026-01-01T12:00:00Z" }, ...Array.from({ length: 100 }, (_, i) => ({ id: `e${i}`, cardId: "z", rating: "known", day: "2026-09-08", at: "2026-09-08T12:00:00Z" }))],
  };
  assert.equal(localRecommendations.rank(cards, state, { now, mode: "discovery", limit: 1 })[0].id, "z");
});
test("new cards follow publication order, then covered cards follow recall need", () => {
  const base = catalog().cards.slice(0, 3).map((card, index) => ({
    ...card,
    id: `ordered-${index}`,
    topicId: `ordered-topic-${index}`,
    publishedAt: `2026-09-0${index + 1}T12:00:00Z`,
  }));
  const state = {
    ...emptyState,
    interactions: {
      [base[0].id]: { viewCount: 1, firstViewedAt: "2026-09-01T12:00:00Z", lastViewedAt: "2026-09-01T12:00:00Z", lastOpenedAt: null, lastRevealedAt: null, lastSkippedAt: null, completedAt: "2026-09-01T12:00:00Z" },
      [base[1].id]: { viewCount: 1, firstViewedAt: "2026-09-01T12:00:00Z", lastViewedAt: "2026-09-01T12:00:00Z", lastOpenedAt: null, lastRevealedAt: null, lastSkippedAt: null, completedAt: "2026-09-01T12:00:00Z" },
    },
    events: [
      { id: "again", cardId: base[0].id, rating: "again", at: "2026-09-02T12:00:00Z", day: "2026-09-02" },
      { id: "known", cardId: base[1].id, rating: "known", at: "2026-09-02T12:00:00Z", day: "2026-09-02" },
    ],
  };
  const deck = selectStudyDeck(base, state, {}, "recall", "all", now);
  assert.deepEqual(deck.map(card => card.id), [base[2].id, base[0].id, base[1].id]);
});
test("cat preferences cannot write a snapshot that fails to reload", () => {
  for (const name of ["", "  ", "x".repeat(31), null]) assert.equal(run(emptyState, { kind: "miso_name", name }).state, emptyState);
  assert.equal(run(emptyState, { kind: "miso_breed", breed: "unknown" }).state, emptyState);
  const state = run(emptyState, { kind: "miso_name", name: "  Miso  " }).state;
  assert.equal(parseState(JSON.stringify(state)).preferences.misoName, "Miso");
});
test("sessions cannot be precredited, duplicated or contain unrelated completed cards", () => {
  for (const change of [{ earnedPaws: 100 }, { completedCardIds: ["a"] }, { cardIds: ["a", "a"] }, { completedCardIds: ["outside"] }, { mode: "unknown" }]) {
    assert.equal(run(emptyState, { kind: "start", session: { ...session(), ...change } }).state, emptyState);
  }
  for (const change of [{ cardIds: ["a", "a"] }, { completedCardIds: ["outside"] }, { completedAt: now.toISOString() }]) {
    assert.throws(() => parseState(JSON.stringify({ ...emptyState, sessions: [{ ...session(), ...change }] })));
  }
  assert.throws(() => parseState(JSON.stringify({ ...emptyState, sessions: [session(), session()] })));
});
test("invalid recall ratings cannot award points or corrupt persistent history", () => {
  let state = run(emptyState, { kind: "start", session: session() }, "start").state;
  state = run(state, { kind: "interaction", event: { name: "card_revealed", cardId: "a", sessionId: "session" } }, "reveal").state;
  for (const rating of ["invalid", "", undefined]) assert.equal(run(state, { kind: "complete", cardId: "a", sessionId: "session", rating, activeMs: 8000 }).state, state);
  assert.equal(run(state, { kind: "interaction", event: { name: "paw_points_earned", cardId: "a", sessionId: "session" } }).state, state);
});
