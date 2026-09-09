import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyState, parseState } from "../src/state/progress.ts";
import { emptyInteraction } from "../src/domain/interactions.ts";
import { isUnseen, isWeakCard, reviewStatus } from "../src/domain/ranking.ts";
import { selectStudyDeck } from "../src/domain/feed-selection.ts";
import { applyStudyCommand } from "../src/domain/study-service.ts";

const now = new Date("2026-09-09T12:00:00Z");
const card = (id, version = 1, publishedAt = "2026-09-01T00:00:00Z") => ({
  id, contentVersion: version, publishedAt, visibility: "published", prompt: "Question", topic: id,
  subjectId: "subject", topicId: id, priority: 0,
});
const event = (cardId, rating, version) => ({ id: `${cardId}-${rating ?? "read"}-${version ?? 1}`, cardId,
  ...(rating ? { rating } : {}), ...(version === undefined ? {} : { contentVersion: version }),
  at: now.toISOString(), day: "2026-09-09",
});
const select = (cards, state, mode = "recall", params = {}, exclude = [], repeat = false) =>
  selectStudyDeck(cards, state, params, mode, "all", now, exclude, undefined, repeat);

test("glanced and skipped cards stay new in both modes; covered cards follow need", () => {
  const cards = [card("known"), card("read"), card("partial"), card("again"),
    card("old-new"), card("glanced", 1, "2026-09-08T00:00:00Z")];
  const state = { ...emptyState, reads: [event("read")],
    events: [event("known", "known"), event("partial", "partial"), event("again", "again")],
    interactions: { glanced: { ...emptyInteraction, viewCount: 9, lastViewedAt: now.toISOString(), lastSkippedAt: now.toISOString() } },
  };
  for (const mode of ["recall", "read"]) assert.deepEqual(select(cards, state, mode).map(c => c.id),
    ["glanced", "old-new", "again", "partial", "read", "known"]);
});
test("legacy reads without impressions are covered and need recall before known cards", () => {
  const state = parseState(JSON.stringify({ version: 2, saved: [], events: [event("known", "known")], reads: [event("read")] }));
  assert.equal(isUnseen(card("read"), state), false);
  assert.deepEqual(select([card("known"), card("read")], state).map(c => c.id), ["read", "known"]);
  assert.equal(reviewStatus(card("read"), state, now).eligible, true);
});
test("an updated card is unassessed and ready for recall without deleting old progress", () => {
  const state = { ...emptyState, saved: ["updated"], events: [event("updated", "known", 1)] };
  assert.equal(reviewStatus(card("updated"), state, now).eligible, false);
  const status = reviewStatus(card("updated", 2), state, now);
  assert.equal(status.mastery, "unassessed"); assert.equal(status.dueAt, null); assert.equal(status.eligible, true);
  assert.equal(isUnseen(card("updated", 2), state), true);
  assert.equal(isWeakCard(card("updated", 2), state, now), false);
  assert.equal(state.events.length, 1); assert.deepEqual(state.saved, ["updated"]);
});
test("weak collection matches Progress immediately while Smart Review respects due dates", () => {
  const cards = [card("again"), card("partial"), card("known"), card("updated", 2),
    { ...card("draft"), visibility: "draft" }, { ...card("no-prompt"), prompt: undefined }];
  const state = { ...emptyState, events: cards.map(c => event(c.id, c.id === "known" ? "known" : c.id === "partial" ? "partial" : "again", 1)) };
  const weak = cards.filter(c => isWeakCard(c, state, now)).map(c => c.id);
  assert.deepEqual(weak, ["again", "partial"]);
  assert.deepEqual(select(cards, state, "recall", { collection: "weak" }).map(c => c.id), weak);
  assert.deepEqual(select(cards.slice(0, 3), state, "recall", { collection: "review" }), []);
  assert.ok(!select(cards, state, "recall", { collection: "weak", card: "known" }).some(c => c.id === "known"));
});
test("another round can repeat a sole eligible card but cannot bypass publication or collection filters", () => {
  const a = card("a");
  assert.deepEqual(select([a], emptyState, "recall", {}, ["a"]), []);
  assert.deepEqual(select([a], emptyState, "recall", {}, ["a"], true), [a]);
  assert.deepEqual(select([a, card("b")], emptyState, "recall", {}, ["a"], true).map(c => c.id), ["b"]);
  for (const params of [{ collection: "saved" }, { collection: "weak" }, { collection: "review" }, { topic: "missing" }])
    assert.deepEqual(select([a], emptyState, "recall", params, ["a"], true), []);
  for (const change of [{ visibility: "draft" }, { publishedAt: "2027-01-01" }, { prompt: undefined }])
    assert.deepEqual(select([{ ...a, ...change }], emptyState, "recall", {}, ["a"], true), []);
});
const session = (id, version, mode = "read") => ({ id, mode, startedAt: now.toISOString(), completedAt: null,
  cardIds: ["a"], cardVersions: { a: version }, completedCardIds: [], revealedCardIds: [], impressionCardIds: [],
  earnedPaws: 0, activeMilliseconds: 0 });
const run = (state, command, id) => applyStudyCommand(state, command, id, now);
test("sessions preserve their studied version across updates without paying twice for same-day edits", () => {
  let state = emptyState;
  for (const version of [1, 2]) {
    const s = session(`session-${version}`, version);
    state = run(state, { kind: "start", session: s }, `start-${version}`).state;
    const result = run(state, { kind: "complete", cardId: "a", sessionId: s.id, rating: null, activeMs: 8000 }, `complete-${version}`);
    assert.equal(result.amount, version === 1 ? 4 : 0);
    state = parseState(JSON.stringify(result.state));
    assert.equal(state.reads.at(-1).contentVersion, version);
    assert.equal(isUnseen(card("a", version), state), false);
    assert.equal(isUnseen(card("a", version + 1), state), true);
  }
  assert.equal(state.reads.length, 2); assert.equal(state.paws.total, 4);
});
test("recall records session version and the current version alone determines mastery", () => {
  let state = run(emptyState, { kind: "start", session: session("s", 2, "recall") }, "start").state;
  state = run(state, { kind: "interaction", event: { name: "card_revealed", cardId: "a", sessionId: "s" } }, "reveal").state;
  state = run(state, { kind: "complete", cardId: "a", sessionId: "s", rating: "partial", activeMs: 3000 }, "complete").state;
  assert.equal(state.events[0].contentVersion, 2);
  assert.equal(reviewStatus(card("a", 2), state, now).mastery, "developing");
  assert.equal(reviewStatus(card("a", 3), state, now).mastery, "unassessed");
});
test("invalid history versions and incomplete session version maps are rejected on reload", () => {
  for (const contentVersion of [0, -1, 1.5, "2", null])
    assert.throws(() => parseState(JSON.stringify({ ...emptyState, reads: [{ ...event("a"), contentVersion }] })));
  for (const cardVersions of [{}, { a: 0 }, { a: 1, b: 1 }, null, []])
    assert.throws(() => parseState(JSON.stringify({ ...emptyState, sessions: [{ ...session("s", 1), cardVersions }] })));
  const legacy = session("old", 1); delete legacy.cardVersions;
  assert.doesNotThrow(() => parseState(JSON.stringify({ ...emptyState, sessions: [legacy] })));
});
