import test from "node:test";
import assert from "node:assert/strict";
import { expectedGoals, simulateFixture } from "../src/index.js";

const samplePack = {
  meta: {
    version: "league-pack-v0.1",
    source: { league: "39", season: "2025" }
  },
  clubs: {
    "club-strong": {
      id: "club-strong",
      name: "Strong FC",
      squad: { overall: 92, startingStrength: 93 }
    },
    "club-weak": {
      id: "club-weak",
      name: "Weak FC",
      squad: { overall: 78, startingStrength: 78 }
    }
  },
  players: {
    "player-1": { id: "player-1", name: "Example Player" }
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
  assert.equal(typeof result.expectedGoals.home, "number");
  assert.equal(typeof result.expectedGoals.away, "number");
  assert.equal(Number.isInteger(result.score.home), true);
  assert.equal(Number.isInteger(result.score.away), true);
  assert.ok(["home", "away", "draw"].includes(result.outcome));
  assert.match(result.summary, /Strong FC \d+-\d+ Weak FC/);
});

test("simulateFixture rejects unknown fixtures", () => {
  assert.throws(() => simulateFixture(samplePack, "missing"), /Fixture not found/);
});
