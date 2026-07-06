import test from "node:test";
import assert from "node:assert/strict";
import { assignSquadsToClubs } from "../src/index.js";

function makePlayer(index, positionGroup, rating = 85) {
  return {
    tbg_player_id: `tbg-test-${String(index).padStart(4, "0")}`,
    transfermarkt_id: String(index),
    display_name: `Player ${index}`,
    age: 20 + (index % 15),
    status: "active",
    nationality: ["Testland"],
    position: positionGroup,
    position_group: positionGroup,
    current_club: "",
    current_club_id: "",
    current_competition_code: "",
    market_value_eur: rating * 100000,
    highest_market_value_eur: rating * 100000,
    tbg_rating: rating,
    underlying_ability_rating: rating,
    effective_match_rating: rating,
    current_state_total_modifier: 0,
    smw_equivalent_rating: rating,
    rating_band: "first_team",
    ability_profile: null,
    current_state: {
      form_modifier: 0,
      fitness_modifier: 0,
      match_sharpness_modifier: 0,
      morale_modifier: 0,
      fatigue_modifier: 0,
      tactical_fit_modifier: 0,
      availability_modifier: 0,
      total_modifier: 0
    },
    engine_profile: {
      underlying_ability_rating: rating,
      current_state: {
        form_modifier: 0,
        fitness_modifier: 0,
        match_sharpness_modifier: 0,
        morale_modifier: 0,
        fatigue_modifier: 0,
        tactical_fit_modifier: 0,
        availability_modifier: 0,
        total_modifier: 0
      },
      effective_match_rating: rating
    },
    tbg_club_id: "",
    tbg_club_name: "",
    owner_manager: "",
    assignment_status: "unsigned",
    first_seen_at: "",
    last_seen_at: "",
    profile_url: "",
    photo_url: ""
  };
}

function playerPool() {
  const groups = ["GK", "DEF", "MID", "ATT"];
  const players = [];
  let index = 1;
  for (const group of groups) {
    for (let count = 0; count < 20; count += 1) {
      players.push(makePlayer(index, group, 90 - (count % 8)));
      index += 1;
    }
  }
  return players;
}

const clubs = [
  { id: "club-001", name: "Alpha FC", division: 1, rating: 92 },
  { id: "club-002", name: "Beta FC", division: 1, rating: 90 }
];

test("assigns full balanced squads without duplicate ownership", () => {
  const result = assignSquadsToClubs({ players: playerPool(), clubs, rules: { squadSize: 10, quotas: { GK: 1, DEF: 3, MID: 3, ATT: 3 } } });

  assert.equal(result.summary.assigned_players, 20);
  assert.equal(result.summary.complete_squads, 2);
  assert.deepEqual(result.summary.duplicate_assigned_ids, []);

  for (const club of result.clubReports) {
    assert.equal(club.squad_size, 10);
    assert.equal(club.positions.GK, 1);
    assert.equal(club.positions.DEF, 3);
    assert.equal(club.positions.MID, 3);
    assert.equal(club.positions.ATT, 3);
  }

  const assignedIds = result.assignedPlayers.map((player) => player.tbg_player_id);
  assert.equal(new Set(assignedIds).size, assignedIds.length);
});

test("retired players are not assigned", () => {
  const players = playerPool();
  players[0].status = "retired";
  const result = assignSquadsToClubs({ players, clubs: clubs.slice(0, 1), rules: { squadSize: 4, quotas: { GK: 1, DEF: 1, MID: 1, ATT: 1 } } });

  assert.equal(result.assignedPlayers.some((player) => player.status === "retired"), false);
  assert.equal(result.assignedPlayers.length, 4);
});
