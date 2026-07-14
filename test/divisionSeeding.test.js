import test from "node:test";
import assert from "node:assert/strict";
import { buildWorldFoundation } from "../src/worldFoundation/buildWorldFoundation.js";
import { seedWorldDivisions } from "../src/clubStrength/seedDivisions.js";

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
      importance: index === 79 ? 100 : 1
    }))
  };
}

function squadForClub(clubIndex, baseRating) {
  const groups = ["GK", "GK", "DEF", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "ATT", "ATT", "ATT", "ATT", "ATT", "MID", "DEF"];
  return groups.map((group, playerIndex) => ({
    tbg_player_id: `club-${clubIndex}-player-${playerIndex}`,
    transfermarkt_id: `${clubIndex}${String(playerIndex).padStart(2, "0")}`,
    display_name: `Club ${clubIndex} Player ${playerIndex}`,
    current_club_id: String(clubIndex + 99),
    current_club: `Club ${clubIndex}`,
    assignment_status: "assigned",
    underlying_ability_rating: baseRating,
    position_group: group,
    age: playerIndex > 15 ? 20 : 27
  }));
}

test("seeds exactly four divisions of twenty by squad strength, not importance", () => {
  const gamePlayers = [];
  for (let clubIndex = 1; clubIndex <= 80; clubIndex += 1) gamePlayers.push(...squadForClub(clubIndex, 101 - clubIndex));
  const foundation = buildWorldFoundation({ clubUniverse: clubUniverse(), gamePlayers, unsignedPlayers: [], generatedAt: "2026-07-14T00:00:00.000Z" });
  const seeded = seedWorldDivisions(foundation);

  assert.equal(seeded.divisions.length, 4);
  assert.ok(seeded.divisions.every((division) => division.club_ids.length === 20));
  assert.equal(new Set(seeded.divisions.flatMap((division) => division.club_ids)).size, 80);
  assert.equal(seeded.inaugural_division_membership.rankings[0].club_name, "Club 1");
  assert.equal(seeded.inaugural_division_membership.rankings.at(-1).club_name, "Club 80");
  assert.equal(seeded.clubs.find((club) => club.canonical_name === "Club 80").division_id, "division-4");
  assert.equal(seeded.status, "inaugural_divisions_seeded");
});
