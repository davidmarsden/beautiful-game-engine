import test from "node:test";
import assert from "node:assert/strict";
import { runSnakeDraft } from "../src/index.js";

function makePlayer(index, positionGroup, rating = 85) {
  return {
    tbg_player_id: `tbg-draft-${String(index).padStart(4, "0")}`,
    display_name: `Draft Player ${index}`,
    age: 18 + (index % 15),
    status: "active",
    position_group: positionGroup,
    market_value_eur: rating * 100000,
    tbg_rating: rating,
    underlying_ability_rating: rating,
    effective_match_rating: rating,
    assignment_status: "unsigned"
  };
}

function playerPool() {
  const players = [];
  let index = 1;
  for (const group of ["GK", "DEF", "MID", "ATT"]) {
    for (let count = 0; count < 20; count += 1) {
      players.push(makePlayer(index, group, 95 - count));
      index += 1;
    }
  }
  return players;
}

const clubs = [
  { id: "club-001", name: "Alpha FC", division: 1 },
  { id: "club-002", name: "Beta FC", division: 1 },
  { id: "club-003", name: "Gamma FC", division: 2 }
];

test("snake draft assigns complete balanced squads without duplicate ownership", () => {
  const result = runSnakeDraft({
    players: playerPool(),
    clubs,
    squadSize: 8,
    quotas: { GK: 1, DEF: 3, MID: 2, ATT: 2 },
    seed: "test-draft"
  });

  assert.equal(result.summary.mode, "snake-draft");
  assert.equal(result.summary.assigned_players, 24);
  assert.equal(result.summary.complete_squads, 3);
  assert.deepEqual(result.summary.duplicate_assigned_ids, []);
  assert.equal(result.draftPicks.length, 24);

  for (const club of result.clubReports) {
    assert.equal(club.squad_size, 8);
    assert.equal(club.positions.GK, 1);
    assert.equal(club.positions.DEF, 3);
    assert.equal(club.positions.MID, 2);
    assert.equal(club.positions.ATT, 2);
  }
});

test("snake draft reverses order on even rounds", () => {
  const result = runSnakeDraft({
    players: playerPool(),
    clubs: clubs.slice(0, 2),
    squadSize: 2,
    quotas: { GK: 1, DEF: 1, MID: 0, ATT: 0 },
    seed: "test-draft",
    order: "division-balanced"
  });

  assert.equal(result.draftPicks[0].club_id, "club-001");
  assert.equal(result.draftPicks[1].club_id, "club-002");
  assert.equal(result.draftPicks[2].club_id, "club-002");
  assert.equal(result.draftPicks[3].club_id, "club-001");
});
