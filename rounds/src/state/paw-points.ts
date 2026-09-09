export type PawAction =
  "short_completed" | "recall_answered" | "daily_goal" | "streak";

export type PawAward = {
  id: string;
  action: PawAction;
  amount: number;
  at?: string;
};

export type PawState = {
  version: 1;
  total: number;
  lifetime: number;
  progressionLevel: number;
  unlocked: string[];
  unseenUnlocked: string[];
  awarded: string[];
  ledger: PawAward[];
};

export const pawMilestones = [
  {
    id: "quiet-corner",
    at: 0,
    name: "Quiet corner",
    detail: "A place to settle in.",
  },
  {
    id: "cushion",
    at: 80,
    name: "Window cushion",
    detail: "A soft spot by the light.",
  },
  {
    id: "plant",
    at: 220,
    name: "Little plant",
    detail: "Something green to keep you company.",
  },
  {
    id: "shelf",
    at: 480,
    name: "Study shelf",
    detail: "The room is learning your rhythm.",
  },
  {
    id: "lamp",
    at: 850,
    name: "Reading lamp",
    detail: "A warmer corner for late rounds.",
  },
  {
    id: "nap",
    at: 1350,
    name: "Afternoon nap",
    detail: "Your cat has found its favourite pose.",
  },
] as const;

export const emptyPawState: PawState = {
  version: 1,
  total: 0,
  lifetime: 0,
  progressionLevel: 0,
  unlocked: [pawMilestones[0].id],
  unseenUnlocked: [],
  awarded: [],
  ledger: [],
};

function validPawState(value: unknown): value is PawState {
  if (!value || typeof value !== "object") return false;
  const paws = value as PawState;
  return (
    paws.version === 1 &&
    Number.isSafeInteger(paws.total) &&
    paws.total >= 0 &&
    Number.isSafeInteger(paws.lifetime) &&
    paws.lifetime >= 0 &&
    Number.isInteger(paws.progressionLevel) &&
    paws.progressionLevel >= 0 &&
    Array.isArray(paws.unlocked) &&
    paws.unlocked.every((id) => typeof id === "string") &&
    Array.isArray(paws.unseenUnlocked) &&
    paws.unseenUnlocked.every((id) => typeof id === "string") &&
    Array.isArray(paws.awarded) &&
    paws.awarded.every((id) => typeof id === "string")
  );
}

export function parsePawState(value: unknown): PawState {
  if (!validPawState(value)) throw new Error("Invalid Paw Points data");
  if (
    value.ledger !== undefined &&
    (!Array.isArray(value.ledger) ||
      !value.ledger.every(
        (e) =>
          e &&
          typeof e.id === "string" &&
          Number.isSafeInteger(e.amount) &&
          e.amount > 0 &&
          [
            "short_completed",
            "recall_answered",
            "daily_goal",
            "streak",
          ].includes(e.action) &&
          (e.at === undefined ||
            (typeof e.at === "string" && Number.isFinite(Date.parse(e.at)))),
      ))
  )
    throw new Error("Invalid Paw Points ledger");
  const level = Math.min(
    pawMilestones.length - 1,
    Math.max(
      value.progressionLevel,
      ...pawMilestones.map((milestone, index) =>
        value.total >= milestone.at || value.unlocked.includes(milestone.id)
          ? index
          : 0,
      ),
    ),
  );
  const unlocked = [
    ...new Set([
      ...value.unlocked,
      ...pawMilestones.slice(0, level + 1).map((m) => m.id),
    ]),
  ];
  return {
    ...value,
    ledger: Array.isArray(value.ledger) ? value.ledger : [],
    total: Math.max(0, value.total),
    lifetime: Math.max(value.total, value.lifetime),
    progressionLevel: level,
    unlocked: unlocked.length ? unlocked : [pawMilestones[0].id],
  };
}

export function awardPawPoints(state: PawState, awards: PawAward[]) {
  const seen = new Set(state.awarded);
  const fresh = awards.filter((award) => {
    if (
      !Number.isSafeInteger(award.amount) ||
      award.amount <= 0 ||
      seen.has(award.id)
    )
      return false;
    seen.add(award.id);
    return true;
  });
  if (!fresh.length) return { state, amount: 0, newUnlocks: [] as string[] };
  const amount = fresh.reduce((sum, award) => sum + award.amount, 0);
  const total = state.total + amount;
  const milestoneLevel = Math.max(
    state.progressionLevel,
    pawMilestones.reduce(
      (level, milestone, index) => (total >= milestone.at ? index : level),
      0,
    ),
  );
  const newUnlocks = pawMilestones
    .slice(state.progressionLevel + 1, milestoneLevel + 1)
    .map((milestone) => milestone.id);
  return {
    amount,
    newUnlocks,
    state: {
      ...state,
      total,
      lifetime: state.lifetime + amount,
      progressionLevel: milestoneLevel,
      unlocked: Array.from(new Set([...state.unlocked, ...newUnlocks])),
      unseenUnlocked: Array.from(
        new Set([...state.unseenUnlocked, ...newUnlocks]),
      ),
      awarded: [...state.awarded, ...fresh.map((award) => award.id)],
      ledger: [...state.ledger, ...fresh],
    },
  };
}

export function nextPawMilestone(state: PawState) {
  return pawMilestones[state.progressionLevel + 1] ?? null;
}

export function markPawUnlocksSeen(state: PawState): PawState {
  return state.unseenUnlocked.length ? { ...state, unseenUnlocked: [] } : state;
}
