import test from "node:test";
import assert from "node:assert/strict";
import { resolveManagerPlan, simulateFixture } from "../src/index.js";

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
  return [
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
    player(`${teamId}-st`, teamId, "Attacker", base + 1),
    player(`${teamId}-sub1`, teamId, "Forward", base - 4),
    player(`${teamId}-sub2`, teamId, "Midfielder", base - 5)
  ];
}

const homeSquad = squad("home", 88);
const awaySquad = squad("away", 78);
const players = [...homeSquad, ...awaySquad];
const playerMap = Object.fromEntries(players.map((row) => [row.id, row]));

const pack = {
  meta: { version: "league-pack-v0.1", source: { league: "39", season: "2024" } },
  clubs: {
    home: { id: "home", name: "Home FC", source: { providerTeamId: "home" }, squad: { overall: 88 } },
    away: { id: "away", name: "Away FC", source: { providerTeamId: "away" }, squad: { overall: 78 } }
  },
  players: playerMap,
  managerSlots: {
    home: { status: "vacant" },
    away: { status: "vacant" }
  },
  fixtures: [{ id: "fixture-1", homeTeamId: "home", awayTeamId: "away" }],
  standings: []
};

const manualPlan = {
  managerId: "human-1",
  controllerType: "human",
  formation: "4-3-3",
  starters: [
    "home-gk",
    "home-rb", "home-cb1", "home-cb2", "home-lb",
    "home-cm1", "home-cm2", "home-cm3",
    "home-rw", "home-st", "home-lw"
  ],
  bench: ["home-sub1", "home-sub2"],
  captain: "home-cm1",
  tacticalIntent: "balanced"
};

test("resolves AI-generated manager plans when no human XI is supplied", () => {
  const resolved = resolveManagerPlan({ players: homeSquad, submittedPlan: { formation: "4-2-3-1" } });

  assert.equal(resolved.source, "ai-generated");
  assert.equal(resolved.formation, "4-2-3-1");
  assert.equal(resolved.lineup.starters.length, 11);
});

test("resolves a human-submitted XI", () => {
  const resolved = resolveManagerPlan({ players: homeSquad, submittedPlan: manualPlan });

  assert.equal(resolved.source, "human-submitted");
  assert.equal(resolved.managerId, "human-1");
  assert.equal(resolved.controllerType, "human");
  assert.equal(resolved.lineup.starters[0].playerId, "home-gk");
  assert.equal(resolved.lineup.captain.playerId, "home-cm1");
});

test("rejects duplicate manual selections", () => {
  assert.throws(() => resolveManagerPlan({
    players: homeSquad,
    submittedPlan: {
      ...manualPlan,
      bench: ["home-gk"]
    }
  }), /duplicate player/);
});

test("fixture simulation can use a human manager plan", () => {
  const result = simulateFixture(pack, "fixture-1", {
    seed: "human-plan",
    homePlan: manualPlan,
    awayPlan: { formation: "4-3-3" }
  });

  assert.equal(result.managerPlans.home.source, "human-submitted");
  assert.equal(result.managerPlans.away.source, "ai-generated");
  assert.equal(result.lineups.home.starters[0].playerId, "home-gk");
  assert.equal(typeof result.expectedGoals.home, "number");
});
