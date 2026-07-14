import test from "node:test";
import assert from "node:assert/strict";
import { calculateClubStrength, seedClubsByStrength } from "../src/clubStrength/calculateClubStrength.js";
import { applyInauguralDivisionSeeding } from "../src/clubStrength/seedWorldDivisions.js";

function makePlayer(clubIndex, playerIndex, rating) {
  const groups = ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "ATT", "ATT", "ATT", "GK", "DEF", "MID", "ATT", "DEF", "MID", "ATT", "DEF", "MID"];
  return {
    tbg_player_id: `player-${clubIndex}-${playerIndex}`,
    display_name: `Player ${clubIndex}-${playerIndex}`,
    age: playerIndex >= 16 ? 20 : 25,
    position_group: groups[playerIndex % groups.length],
    underlying_ability_rating: rating,
    effective_match_rating: rating,
    market_value_eur: rating * 1000000
  };
}

function makeWorld() {
  const players = [];
  const clubs = Array.from({ length: 80 }, (_, clubIndex) => {
    const rating = 96 - Math.floor(clubIndex / 4);
    const squad = Array.from({ length: 20 }, (_, playerIndex) => makePlayer(clubIndex, playerIndex, rating - (playerIndex % 4)));
    players.push(...squad);
    return {
      tbg_club_id: `club-${String(clubIndex + 1).padStart(3, "0")}`,
      canonical_name: `Club ${clubIndex + 1}`,
      launch_slot: clubIndex + 1,
      squad: { player_ids: squad.map((player) => player.tbg_player_id) },
      history: { division_history: [] }
    };
  });
  return {
    world_id: "test-world",
    active_season_id: "season-001",
    rules: {},
    clubs,
    players,
    season: { calendar: {}, standings: [] },
    histories: { divisions: [] },
    diagnostics: {}
  };
}

test("calculates transparent weighted strength components", () => {
  const world = makeWorld();
  const playersById = new Map(world.players.map((player) => [player.tbg_player_id, player]));
  const result = calculateClubStrength(world.clubs[0], playersById);
  assert.ok(result.strength_score > 80);
  assert.equal(result.squad_counts.first_team_pool, 20);
  assert.equal(result.squad_counts.best_xi, 11);
  assert.equal(result.best_xi_player_ids.length, 11);
});

test("ranks 80 clubs and seeds four divisions of 20", () => {
  const world = makeWorld();
  const ranked = seedClubsByStrength(world.clubs, world.players);
  assert.equal(ranked.length, 80);
  assert.equal(ranked[0].division_level, 1);
  assert.equal(ranked[19].division_level, 1);
  assert.equal(ranked[20].division_level, 2);
  assert.equal(ranked[79].division_level, 4);
});

test("freezes inaugural league membership and creates initial tables", () => {
  const seeded = applyInauguralDivisionSeeding(makeWorld());
  assert.equal(seeded.status, "inaugural_divisions_frozen");
  assert.equal(seeded.divisions.length, 4);
  assert.ok(seeded.divisions.every((division) => division.club_ids.length === 20));
  assert.equal(seeded.season.calendar.league_matchdays.length, 38);
  assert.equal(seeded.season.standings.length, 80);
  assert.equal(seeded.competitions.filter((competition) => competition.type === "league").length, 4);
  assert.deepEqual(seeded.diagnostics.division_seeding_errors, []);
});
