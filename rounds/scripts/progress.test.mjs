import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activity,
  completeActivity,
  dayKey,
  emptyState,
  parseState,
  streak,
} from "../src/state/progress.ts";
import { awardPawPoints, emptyPawState } from "../src/state/paw-points.ts";
const event = (day) => ({
  id: day,
  cardId: "ards",
  rating: "known",
  at: `${day}T12:00:00Z`,
  day,
});
test("streak is zero for no activity and breaks after a missed day", () => {
  assert.equal(streak([], new Date(2026, 8, 6)), 0);
  assert.equal(streak([event("2026-09-04")], new Date(2026, 8, 6)), 0);
});
test("yesterday carries the streak and repeated activity does not inflate days", () => {
  const events = [
    event("2026-09-04"),
    event("2026-09-05"),
    event("2026-09-05"),
  ];
  assert.equal(streak(events, new Date(2026, 8, 6)), 2);
  assert.equal(
    streak([...events, event("2026-09-06")], new Date(2026, 8, 6)),
    3,
  );
});
test("streak crosses year boundaries", () =>
  assert.equal(
    streak([event("2025-12-31"), event("2026-01-01")], new Date(2026, 0, 1)),
    2,
  ));
test("calendar keys use local dates", () =>
  assert.equal(dayKey(new Date(2026, 0, 2, 23)), "2026-01-02"));
test("v1 migration preserves bookmarks, recall history, and streak", () => {
  const v1 = { version: 1, saved: ["ards"], events: [event("2026-09-06")] };
  const migrated = parseState(JSON.stringify(v1));
  assert.deepEqual(migrated, { ...emptyState, ...v1, version: 4, reads: [], paws: emptyState.paws });
  assert.equal(streak(activity(migrated), new Date(2026, 8, 6)), 1);
});
test("storage rejects corrupt data and supports v2 round trips", () => {
  const state = completeActivity(
    emptyState,
    "ards",
    null,
    new Date(2026, 8, 6),
  ).state;
  assert.deepEqual(parseState(JSON.stringify(state)), state);
  for (const raw of [
    "{",
    "null",
    JSON.stringify({ ...state, version: 99 }),
    JSON.stringify({ ...state, reads: [{}] }),
    JSON.stringify({ ...state, events: [{}] }),
  ])
    assert.throws(() => parseState(raw));
});
test("first short earns a celebration but never a recall rating", () => {
  const result = completeActivity(
    emptyState,
    "ards",
    null,
    new Date(2026, 8, 6),
  );
  assert.equal(result.firstToday, true);
  assert.equal(result.streak, 1);
  assert.equal(result.state.reads.length, 1);
  assert.equal(result.state.events.length, 0);
});
test("first flashcard earns today regardless of correct or incorrect recall", () => {
  for (const rating of ["again", "partial", "known"]) {
    const result = completeActivity(
      emptyState,
      "ards",
      rating,
      new Date(2026, 8, 6),
    );
    assert.equal(result.firstToday, true);
    assert.equal(result.streak, 1);
  }
});
test("read then recall, replay, and reload celebrate only once per day", () => {
  const now = new Date(2026, 8, 6);
  const first = completeActivity(emptyState, "ards", null, now);
  const recall = completeActivity(first.state, "ards", "known", now);
  assert.equal(recall.firstToday, false);
  const replay = completeActivity(
    parseState(JSON.stringify(recall.state)),
    "ards",
    null,
    now,
  );
  assert.equal(replay.firstToday, false);
  assert.equal(replay.state.reads.length, 1);
  assert.equal(replay.state.events.length, 1);
});
test("tomorrow earns a new check across read and recall and a gap restarts at one", () => {
  const first = completeActivity(
    emptyState,
    "ards",
    "again",
    new Date(2026, 8, 6),
  );
  const second = completeActivity(
    first.state,
    "ards",
    null,
    new Date(2026, 8, 7),
  );
  assert.equal(second.firstToday, true);
  assert.equal(second.streak, 2);
  const missed = completeActivity(
    second.state,
    "ards",
    null,
    new Date(2026, 8, 9),
  );
  assert.equal(missed.firstToday, true);
  assert.equal(missed.streak, 1);
});
test("paw awards are idempotent and unlock room milestones automatically", () => {
  const first = awardPawPoints(emptyPawState, [
    { id: "review:one", action: "recall_answered", amount: 80 },
  ]);
  assert.equal(first.amount, 80);
  assert.deepEqual(first.newUnlocks, ["cushion"]);
  const replay = awardPawPoints(first.state, [
    { id: "review:one", action: "recall_answered", amount: 80 },
  ]);
  assert.equal(replay.amount, 0);
  assert.equal(replay.state.total, 80);
});
