import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWorldStateFromPlayerPools,
  summariseWorldState,
  validateTbgPlayers
} from "../src/index.js";

function player(overrides = {}) {
  return {
    tbg_player_id: "tbg-test-001",
    transfermarkt_id: "1",
    display_name: "Test Player",
    full_name: "Test Player",
    name_key: "test player",
    date_of_birth: "2000-01-01",
    age: 26,
    status: "active",
    nationality: ["England"],
    position: "Central Midfield",
    position_group: "MID",
    foot: "right",
    height_cm: 180,
    current_club: "Test FC",
    current_club_id: "100",
    current_competition_code: "TBG1",
    contract_until: "2028-06-30",
    market_value_eur: 10000000,
    highest_market_value_eur: 12000000,
    international_team: "",
    international_caps: 0,
    tbg_rating: 90,
    underlying_ability_rating: 90,
    effective_match_rating: 90,
    current_state_total_modifier: 0,
    smw_equivalent_rating: 89,
    rating_band: "top_tier",
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
      underlying_ability_rating: 90,
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
      effective_match_rating: 90
    },
    tbg_club_id: "club-test",
    tbg_club_name: "Test FC",
    owner_manager: "Test Manager",
    assignment_status: "assigned",
    first_seen_at: "2026-01-01T00:00:00.000Z",
    last_seen_at: "2026-01-01T00:00:00.000Z",
    profile_url: "",
    photo_url: "",
    ...overrides
  };
}

test("validates TBG player contract basics", () => {
  assert.deepEqual(validateTbgPlayers([player()]), []);
  assert.ok(validateTbgPlayers([player({ status: "loaned_to_mars" })])[0].includes("Invalid status"));
});

test("builds a contract-shaped world state from player pools", () => {
  const worldState = buildWorldStateFromPlayerPools({
    gamePlayers: [player(), player({
      tbg_player_id: "tbg-test-002",
      transfermarkt_id: "2",
      display_name: "Second Player",
      position_group: "ATT",
      tbg_rating: 88,
      underlying_ability_rating: 88,
      effective_match_rating: 88
    })],
    unsignedPlayers: [player({
      tbg_player_id: "tbg-test-003",
      transfermarkt_id: "3",
      display_name: "Unsigned Player",
      tbg_club_id: "",
      tbg_club_name: "",
      owner_manager: "",
      assignment_status: "unsigned"
    })],
    submittedPlayers: [],
    seasonId: "season-test",
    worldId: "world-test",
    generatedAt: "2026-01-01T00:00:00.000Z"
  });

  assert.equal(worldState.contract_version, "tbg-contract-v0.1");
  assert.equal(worldState.players.length, 3);
  assert.equal(worldState.clubs.length, 1);
  assert.equal(worldState.clubs[0].squad.length, 2);
  assert.equal(worldState.diagnostics.closed_world_warning.includes("real-life player development"), true);
});

test("summarises world-state player pool", () => {
  const worldState = buildWorldStateFromPlayerPools({
    gamePlayers: [player()],
    unsignedPlayers: [player({
      tbg_player_id: "tbg-test-004",
      transfermarkt_id: "4",
      display_name: "Unsigned Player",
      underlying_ability_rating: 80,
      effective_match_rating: 80,
      tbg_club_id: "",
      tbg_club_name: "",
      owner_manager: "",
      assignment_status: "unsigned"
    })]
  });
  const summary = summariseWorldState(worldState);

  assert.equal(summary.players, 2);
  assert.equal(summary.clubs, 1);
  assert.equal(summary.assigned_players, 1);
  assert.equal(summary.unsigned_players, 1);
  assert.equal(summary.average_ability, 85);
});
