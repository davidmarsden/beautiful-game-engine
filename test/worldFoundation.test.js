import test from "node:test";
import assert from "node:assert/strict";
import { buildWorldFoundation } from "../src/worldFoundation/buildWorldFoundation.js";

function clubUniverse() {
  return {
    version: "test-clubs-v1",
    clubs: Array.from({ length: 80 }, (_, index) => ({
      slot: index + 1,
      name: `Club ${index + 1}`,
      transfermarkt_club_id: String(index + 100),
      continent: "Europe",
      country: "Testland",
      league: "Test League",
      importance: 100 - index
    }))
  };
}

function player(id, clubId, age = 25) {
  return {
    tbg_player_id: `tbg-player-${id}`,
    transfermarkt_id: String(id),
    display_name: `Player ${id}`,
    current_club_id: String(clubId),
    current_club: `Club ${clubId - 99}`,
    assignment_status: clubId ? "assigned" : "unsigned",
    age
  };
}

test("builds a valid 80-club, five-division world foundation", () => {
  const world = buildWorldFoundation({
    clubUniverse: clubUniverse(),
    gamePlayers: [player(1, 100), player(2, 101, 20)],
    unsignedPlayers: [{ ...player(3, null), current_club_id: "", current_club: "Without Club" }],
    generatedAt: "2026-07-14T00:00:00.000Z"
  });

  assert.equal(world.clubs.length, 80);
  assert.equal(world.divisions.length, 5);
  assert.equal(world.manager_slots.length, 80);
  assert.equal(world.competitions.length, 6);
  assert.equal(world.season.calendar.league_matchdays.length, 30);
  assert.equal(world.status, "foundation_ready_for_strength_seeding");
  assert.deepEqual(world.diagnostics.validation_errors, []);
  assert.equal(world.player_ownership.find((row) => row.tbg_player_id === "tbg-player-1").ownership_status, "club_owned");
  assert.equal(world.player_ownership.find((row) => row.tbg_player_id === "tbg-player-3").ownership_status, "unsigned");
  assert.ok(world.clubs.every((club) => club.division_id === null));
});
