import assert from "node:assert/strict";
import { test } from "node:test";
import {
  localRecommendations,
  discoveryScore,
  reviewStatus,
} from "../src/domain/ranking.ts";
import { applyStudyCommand } from "../src/domain/study-service.ts";
import { emptyState, parseState } from "../src/state/progress.ts";
import { emptyInteraction } from "../src/domain/interactions.ts";
import { awardPawPoints, emptyPawState } from "../src/state/paw-points.ts";
import { toCatalog } from "./import-content-bank.mjs";
const now = new Date("2026-09-06T12:00:00Z");
const card = (id, subjectId = "a", publishedAt = null) => ({
  id,
  subjectId,
  topicId: id,
  prompt: "q",
  publishedAt,
  priority: 0,
  visibility: "published",
  contentVersion: 1,
});
const session = (id = "s", mode = "read") => ({
  id,
  mode,
  startedAt: now.toISOString(),
  completedAt: null,
  cardIds: ["a", "b", "c", "d"],
  completedCardIds: [],
  revealedCardIds: [],
  impressionCardIds: [],
  earnedPaws: 0,
  activeMilliseconds: 0,
});
const run = (s, c, id = "command", at = now) => applyStudyCommand(s, c, id, at);
test("discovery keeps newest incomplete cards first despite impressions, stable across calls", () => {
  const a = card("a"),
    b = card("b", "b", now.toISOString());
  assert.ok(
    discoveryScore(b, emptyState, { now }) >
      discoveryScore(a, emptyState, { now }),
  );
  const state = {
    ...emptyState,
    interactions: {
      b: { ...emptyInteraction, viewCount: 5, lastViewedAt: now.toISOString() },
    },
  };
  assert.equal(
    localRecommendations.rank([b, a], state, { now, mode: "discovery" })[0].id,
    "b",
  );
  assert.deepEqual(
    localRecommendations.rank([b, a], state, { now, mode: "discovery" }),
    localRecommendations.rank([b, a], state, { now, mode: "discovery" }),
  );
});
test("diversity, unique cards, no immediate repeat, unpublished and future excluded", () => {
  const list = [
    card("a"),
    card("a"),
    card("b"),
    card("c", "b"),
    { ...card("draft"), visibility: "draft" },
    card("future", "c", "2027-01-01"),
  ];
  const result = localRecommendations.rank(list, emptyState, {
    now,
    mode: "discovery",
    excludeIds: ["b"],
  });
  assert.deepEqual(
    result.map((c) => c.id),
    ["a", "c"],
  );
  assert.equal(
    localRecommendations.rank(list, emptyState, {
      now,
      mode: "discovery",
      subjectId: "a",
    }).length,
    2,
  );
});
test("impressions count once per session, including repeated callbacks and reload", () => {
  let s = run(emptyState, { kind: "start", session: session() }, "start").state;
  const event = {
    id: "e",
    schemaVersion: 1,
    name: "feed_card_impression",
    at: now.toISOString(),
    cardId: "a",
    sessionId: "s",
  };
  s = run(s, { kind: "interaction", event }, "i").state;
  s = run(
    parseState(JSON.stringify(s)),
    { kind: "interaction", event },
    "i2",
  ).state;
  assert.equal(s.interactions.a.viewCount, 1);
  assert.equal(s.reads.length, 0);
  assert.equal(s.paws.total, 0);
});
test("study requires active time and explicit completion; duplicate daily awards cannot be farmed", () => {
  let s = run(emptyState, { kind: "start", session: session() }, "start").state;
  const command = {
    kind: "complete",
    cardId: "a",
    sessionId: "s",
    rating: null,
    activeMs: 8000,
  };
  assert.equal(run(s, { ...command, activeMs: 0 }).state, s);
  s = run(s, command, "c").state;
  assert.equal(s.paws.total, 4);
  assert.equal(run(s, command, "c-again").amount, 0);
  s = run(s, { kind: "start", session: session("s2") }, "start2").state;
  assert.equal(run(s, { ...command, sessionId: "s2" }, "c2").amount, 0);
});
test("goal counts distinct cards, complete session requires all cards, retry is idempotent", () => {
  let s = run(emptyState, { kind: "start", session: session() }, "start").state;
  assert.equal(
    run(s, { kind: "finish", sessionId: "s" }).state.sessions[0].completedAt,
    null,
  );
  for (const cardId of ["a", "b", "c", "d"])
    s = run(
      s,
      {
        kind: "complete",
        cardId,
        sessionId: "s",
        rating: null,
        activeMs: 9000,
      },
      cardId,
    ).state;
  assert.equal(s.paws.total, 28);
  s = run(s, { kind: "finish", sessionId: "s" }, "finish").state;
  assert.equal(s.sessions[0].earnedPaws, 28);
  assert.ok(s.sessions[0].completedAt);
  assert.deepEqual(
    run(s, { kind: "finish", sessionId: "s" }, "finish").state,
    s,
  );
});
test("recall requires reveal; rating honesty does not change paws", () => {
  for (const rating of ["again", "partial", "known"]) {
    let s = run(
      emptyState,
      { kind: "start", session: session("s", "recall") },
      "start",
    ).state;
    const c = {
      kind: "complete",
      cardId: "a",
      sessionId: "s",
      rating,
      activeMs: 5000,
    };
    assert.equal(run(s, c).amount, 0);
    s = run(
      s,
      {
        kind: "interaction",
        event: { name: "card_revealed", cardId: "a", sessionId: "s" },
      },
      "reveal",
    ).state;
    assert.equal(run(s, c, "rated").amount, 6);
  }
});
test("review waits for due date; missed recalls prioritized; saved unseen is eligible", () => {
  const event = {
    id: "e",
    cardId: "a",
    rating: "again",
    at: "2026-09-04T12:00:00Z",
    day: "2026-09-04",
  };
  const s = { ...emptyState, events: [event] };
  assert.ok(reviewStatus(card("a"), s, now).eligible);
  assert.equal(
    reviewStatus(
      card("a"),
      { ...s, events: [{ ...event, rating: "known" }] },
      now,
    ).eligible,
    false,
  );
  assert.ok(reviewStatus(card("b"), { ...s, saved: ["b"] }, now).eligible);
});
test("migration preserves existing v3 rewards and rejects corrupt v4 without reset", () => {
  const paws = {
    ...emptyPawState,
    total: 80,
    lifetime: 80,
    progressionLevel: 1,
    unlocked: ["quiet-corner", "cushion"],
    unseenUnlocked: ["cushion"],
  };
  const v3 = { version: 3, saved: ["legacy"], reads: [], events: [], paws };
  delete v3.paws.ledger;
  const s = parseState(JSON.stringify(v3));
  assert.equal(s.paws.total, 80);
  assert.deepEqual(s.saved, ["legacy"]);
  assert.equal(s.version, 4);
  assert.throws(() => parseState(JSON.stringify({ ...s, sessions: [{}] })));
  assert.throws(() => parseState(JSON.stringify({ ...s, paws: null })));
});
test("duplicate IDs within one award batch, multi-unlock, permanent progress", () => {
  const award = { id: "a", action: "short_completed", amount: 500 };
  const r = awardPawPoints({ ...emptyPawState, ledger: [] }, [award, award]);
  assert.equal(r.amount, 500);
  assert.deepEqual(r.newUnlocks, ["cushion", "plant", "shelf"]);
  assert.equal(
    awardPawPoints(r.state, [{ ...award, id: "negative", amount: -400 }]).state
      .total,
    500,
  );
});
test("onboarding touches neither study statistics nor rewards", () => {
  const s = run(emptyState, { kind: "onboard", skipped: false }).state;
  assert.deepEqual(s.events, []);
  assert.deepEqual(s.sessions, []);
  assert.equal(s.paws.total, 0);
  assert.ok(parseState(JSON.stringify(s)).onboarding.completedAt);
});
test("editing a title preserves identity, references and dates but invalidates review", () => {
  const record = {
    subject: "Emergency Medicine",
    title: "Title",
    question: "Question",
    management: "Management",
    pearl: "Pearl",
  };
  const before = toCatalog([record]);
  before.cards[0].editorialStatus = "reviewed";
  before.cards[0].references = [
    { id: "r", title: "Reference", url: "https://example.org" },
  ];
  const after = toCatalog([{ ...record, title: "Edited title" }], before);
  assert.equal(after.cards[0].id, before.cards[0].id);
  assert.equal(after.cards[0].contentVersion, 2);
  assert.equal(after.cards[0].editorialStatus, "unreviewed");
  assert.deepEqual(after.cards[0].references, before.cards[0].references);
  assert.equal(after.cards[0].publishedAt, null);
});
test("v3 migration does not repay a previously credited card on the same day", () => {
  const base = {
    version: 3,
    saved: [],
    events: [],
    reads: [
      { id: "old", cardId: "a", day: "2026-09-06", at: now.toISOString() },
    ],
    paws: { ...emptyPawState, ledger: [], total: 4, lifetime: 4 },
  };
  let s = parseState(JSON.stringify(base));
  s = run(s, { kind: "start", session: session() }, "new-session").state;
  assert.equal(
    run(s, {
      kind: "complete",
      cardId: "a",
      sessionId: "s",
      rating: null,
      activeMs: 9000,
    }).amount,
    0,
  );
});
test("a gap cannot remove points/unlocks, seventh-day reward is unique", () => {
  let s = {
    ...emptyState,
    reads: Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      cardId: "old",
      day: `2026-08-${26 + i}`,
      at: `2026-08-${26 + i}T12:00:00Z`,
    })),
  };
  const seventh = new Date("2026-09-01T12:00:00Z");
  s = run(s, { kind: "start", session: session() }, "start", seventh).state;
  const result = run(
    s,
    {
      kind: "complete",
      cardId: "a",
      sessionId: "s",
      rating: null,
      activeMs: 9000,
    },
    "complete",
    seventh,
  );
  assert.equal(result.amount, 14);
  const later = parseState(JSON.stringify(result.state));
  assert.equal(later.paws.total, 14);
});
