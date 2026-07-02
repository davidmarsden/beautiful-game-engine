import test from "node:test";
import assert from "node:assert/strict";
import { expectedGoals, simulateFixture } from "../src/index.js";

function player(id, teamId, position, rating) {
  return {
    id,
    name: id,
    position,
    team: { providerTeamId: teamId },
    ratings: { ability: rating, effectiveMatchRating: rating }
  };
}

function squad(teamId, base) {
  return Object.fromEntries([
    player(`${teamId}-gk`, teamId, "Goalkeeper", base),
    player(`${teamId}-rb`, teamId, "Defender", base - 1),
    player(`${teamId}-cb1`, teamId, "Defender", base),
    player(`${teamId}-cb2`, teamId, "Defender", base - 2),
    player(`${teamId}-lb`, teamId, "Defender", base - 1),
    player(`${teamId}-cm1`, teamId, "Midfielder", base),
    player(`${teamId}-cm2`, teamId, "Midfielder", base - 1),
    player(`${teamId}-cm3`, teamId, "Midfielder", base - 2),
    player(`${teamId}-rw`, teamId, "Winger", base - 1),
    player(`${teamId}-lw`, teamId, "Winger", base - 1),
    player(`${teamId}-st", teamId, "Attacker", base + 1),
    player(`${teamId}-sub1`, teamId, "Forward", base - 4),
    player(`${teamId}-sub2`, teamId, "Midfielder", base - 5)
  ].map((row) => [row.id, row]));
}

const samplePack = {
  meta: {
    version: "league-pack-v0.1",
    source: { league: "39", season: "2025" }
  },
  clubs: {
    "club-strong": {
      id: "club-strong",
      name: "Strong FC",
      source: { providerTeamId: "strong" },
      squad: { overall: 92, startingStrength: 93 }
    },
    "club-weak": {
      id: "club-weak",
      name: "Weak FC",
      source: { providerTeamId: "weak" },
      squad: { overall: 78, startingStrength: 78 }
    }
  },
  players: {
    ...squad("strong", 90),
    ...squad("weak", 76)
  },
  managerSlots: {
    "club-strong": { status: "vacant" },
    "club-weak": { status: "vacant" }
  },
  fixtures: [
    {
      id: "fixture-1",
      homeTeamId: "club-strong",
      awayTeamId: "club-weak"
    },
    {
      id: "fixture-2",
      homeTeamId: "club-weak",
      awayTeamId: "club-strong"
    }
  ],
  standings: []
};

test("expected goals favour the stronger club", () => {
  const xg = expectedGoals({
    homeClub: samplePack.clubs["club-strong"],
    awayClub: samplePack.clubs["club-weak"]
  });

  assert.ok(xg.home > xg.away);
});

test("simulateFixture is deterministic for the same seed", () => {
  const first = simulateFixture(samplePack, "fixture-1", { seed: "same-seed" });
  const second = simulateFixture(samplePack, "fixture-1", { seed: "same-seed" });

  assert.deepEqual(first, second);
});

test("simulateFixture returns a complete result shape", () => {
  const result = simulateFixture(samplePack, "fixture-1", { seed: "shape" });

  assert.equal(result.fixtureId, "fixture-1");
  assert.equal(result.homeTeamName, "Strong FC");
  assert.equal(result.awayTeamName, "Weak FC");
  assert.equal(result.lineups, null);
  assert.equal(typeof result.expectedGoals.home, "number");
  assert.equal(typeof result.expectedGoals.away, "number");
  assert.equal(Number.isInteger(result.score.home), true);
  assert.equal(Number.isInteger(result.score.away), true);
  assert.ok(["home", "away", "draw"].includes(result.outcome));
  assert.match(result.summary, /Strong FC \d+-\d+ Weak FC/);
});

test("simulateFixture can use generated lineups", () => {
  const result = simulateFixture(samplePack, "fixture-1", {
    seed: "lineups",
    useLineups: true,
    formation: "4-3-3"
  });

  assert.equal(result.formation, "4-3-3");
  assert.equal(result.lineups.home.starters.length, 11);
  assert.equal(result.lineups.away.starters.length, 11);
  assert.equal(result.lineups.home.starters[0].slot, "GK");
  assert.ok(result.expectedGoals.home > result.expectedGoals.away);
});

test("simulateFixture rejects unknown fixtures", () => {
  assert.throws(() => simulateFixture(samplePack, "missing"), /Fixture not found/);
});
