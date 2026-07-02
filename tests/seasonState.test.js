import test from "node:test";
import assert from "node:assert/strict";
import {
  applyResultToTable,
  createLeagueTable,
  createSeasonState,
  processNextFixture,
  seasonSummary,
  tableRows
} from "../src/index.js";

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

const players = [...squad("home", 88), ...squad("away", 82)];
const playerMap = Object.fromEntries(players.map((row) => [row.id, row]));

const pack = {
  meta: {
    version: "league-pack-v0.1",
    source: { league: "39", season: "2024" },
    counts: {
      clubs: 2,
      players: Object.keys(playerMap).length,
      fixtures: 1,
      standings: 0,
      managerSlots: 2
    }
  },
  clubs: {
    home: { id: "home", name: "Home FC", source: { providerTeamId: "home" }, squad: { overall: 88 } },
    away: { id: "away", name: "Away FC", source: { providerTeamId: "away" }, squad: { overall: 82 } }
  },
  players: playerMap,
  managerSlots: {
    home: { status: "vacant" },
    away: { status: "vacant" }
  },
  fixtures: [{ id: "fixture-1", homeTeamId: "home", awayTeamId: "away" }],
  standings: []
};

test("creates and sorts a league table", () => {
  let table = createLeagueTable(pack.clubs);
  table = applyResultToTable(table, {
    homeTeamId: "home",
    awayTeamId: "away",
    score: { home: 2, away: 1 }
  });

  const rows = tableRows(table);
  assert.equal(rows[0].teamId, "home");
  assert.equal(rows[0].points, 3);
  assert.equal(rows[1].played, 1);
});

test("creates season state from a league pack", () => {
  const state = createSeasonState(pack, { createdAt: "test" });

  assert.equal(state.season, "2024");
  assert.equal(state.league, "39");
  assert.equal(state.nextFixtureIndex, 0);
  assert.equal(Object.keys(state.table).length, 2);
  assert.equal(Object.keys(state.cohesion).length, 2);
});

test("processes one fixture and updates state", () => {
  const initial = createSeasonState(pack, { createdAt: "test" });
  const { state, result, complete } = processNextFixture(pack, initial, {
    seed: "season-state-test",
    useLineups: true
  });
  const summary = seasonSummary(state);

  assert.equal(result.fixtureId, "fixture-1");
  assert.equal(state.nextFixtureIndex, 1);
  assert.equal(state.completedFixtures.length, 1);
  assert.equal(summary.fixturesPlayed, 1);
  assert.equal(complete, true);
  assert.ok(state.cohesion.home.matchesTracked > 0);
  assert.equal(summary.table.reduce((sum, row) => sum + row.played, 0), 2);
});
