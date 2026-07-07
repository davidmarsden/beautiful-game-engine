import test from "node:test";
import assert from "node:assert/strict";
import { assignRealClubSquads } from "../src/index.js";

function player(index, clubId, clubName, rating, positionGroup = "MID") {
  return {
    tbg_player_id: `tbg-real-${clubId}-${index}`,
    display_name: `${clubName} Player ${index}`,
    age: 24,
    status: "active",
    position_group: positionGroup,
    current_club: clubName,
    current_club_id: clubId,
    current_competition_code: "TEST",
    market_value_eur: rating * 1000000,
    underlying_ability_rating: rating,
    effective_match_rating: rating,
    tbg_rating: rating,
    assignment_status: "unsigned"
  };
}

function clubPlayers(clubId, clubName, baseRating, size = 25) {
  const groups = ["GK", "DEF", "MID", "ATT"];
  return Array.from({ length: size }, (_, index) => player(index + 1, clubId, clubName, baseRating - (index % 5), groups[index % groups.length]));
}

test("assigns real club squads and ranks divisions by weighted TBG strength", () => {
  const players = [
    ...clubPlayers("1", "Real Madrid", 96),
    ...clubPlayers("2", "Manchester City", 95),
    ...clubPlayers("3", "Brighton", 88),
    ...clubPlayers("4", "Santos", 84),
    ...clubPlayers("5", "Tiny Squad", 90, 10)
  ];

  const result = assignRealClubSquads({
    players,
    rules: { clubCount: 4, targetSquadSize: 25, minSquadSize: 18, clubsPerDivision: 2, divisions: 2 }
  });

  assert.equal(result.summary.mode, "real-clubs");
  assert.equal(result.summary.clubs, 4);
  assert.equal(result.summary.assigned_players, 100);
  assert.deepEqual(result.summary.duplicate_assigned_ids, []);
  assert.equal(result.clubReports[0].club_name, "Real Madrid");
  assert.equal(result.clubReports[0].division, 1);
  assert.equal(result.clubReports[1].club_name, "Manchester City");
  assert.equal(result.clubReports[1].division, 1);
  assert.equal(result.clubReports[2].division, 2);
  assert.equal(result.clubReports.some((club) => club.club_name === "Tiny Squad"), false);
});

test("keeps players outside top real clubs unsigned", () => {
  const players = [
    ...clubPlayers("1", "Elite FC", 95),
    ...clubPlayers("2", "Other FC", 80)
  ];

  const result = assignRealClubSquads({ players, rules: { clubCount: 1, targetSquadSize: 25, minSquadSize: 18 } });

  assert.equal(result.summary.clubs, 1);
  assert.equal(result.assignedPlayers.length, 25);
  assert.equal(result.unsignedPlayers.length, 25);
  assert.equal(result.unsignedPlayers.every((item) => item.assignment_status === "unsigned"), true);
});
