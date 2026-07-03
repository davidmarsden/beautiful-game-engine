import test from "node:test";
import assert from "node:assert/strict";
import { formatMonteCarloReport, runMonteCarloSeason } from "../src/index.js";

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
    player(`${teamId}-rb`, teamId, "Defender", base),
    player(`${teamId}-cb1`, teamId, "Defender", base),
    player(`${teamId}-cb2`, teamId, "Defender", base),
    player(`${teamId}-lb`, teamId, "Defender", base),
    player(`${teamId}-cm1`, teamId, "Midfielder", base),
    player(`${teamId}-cm2`, teamId, "Midfielder", base),
    player(`${teamId}-cm3`, teamId, "Midfielder", base),
    player(`${teamId}-rw`, teamId, "Winger", base),
    player(`${teamId}-lw`, teamId, "Winger", base),
    player(`${teamId}-st`, teamId, "Attacker", base),
    player(`${teamId}-sub`, teamId, "Forward", base - 3)
  ];
}

function totalPositionCounts(team) {
  return Object.values(team.positionCounts).reduce((sum, count) => sum + count, 0);
}

const players = [...squad("alpha", 90), ...squad("beta", 80)];
const playerMap = Object.fromEntries(players.map((row) => [row.id, row]));

const pack = {
  meta: {
    version: "league-pack-v0.1",
    source: { league: "test", season: "1" },
    counts: {
      clubs: 2,
      players: Object.keys(playerMap).length,
      fixtures: 2,
      standings: 0,
      managerSlots: 2
    }
  },
  clubs: {
    alpha: { id: "alpha", name: "Alpha", source: { providerTeamId: "alpha" }, squad: { overall: 90 } },
    beta: { id: "beta", name: "Beta", source: { providerTeamId: "beta" }, squad: { overall: 80 } }
  },
  players: playerMap,
  managerSlots: {
    alpha: { status: "vacant" },
    beta: { status: "vacant" }
  },
  fixtures: [
    { id: "fixture-1", homeTeamId: "alpha", awayTeamId: "beta" },
    { id: "fixture-2", homeTeamId: "beta", awayTeamId: "alpha" }
  ],
  standings: []
};

test("runs Monte Carlo season simulations", () => {
  const report = runMonteCarloSeason(pack, { runs: 5, seed: "test-mc" });

  assert.equal(report.runs, 5);
  assert.equal(report.teams.length, 2);
  assert.equal(totalPositionCounts(report.teams[0]), 5);
  assert.ok(report.teams[0].averagePosition >= 1);
});

test("formats Monte Carlo report", () => {
  const report = runMonteCarloSeason(pack, { runs: 3, seed: "format-mc" });
  const text = formatMonteCarloReport(report);

  assert.match(text, /# Monte Carlo Season/);
  assert.match(text, /Runs: 3/);
  assert.match(text, /Title/);
  assert.match(text, /Alpha/);
});
