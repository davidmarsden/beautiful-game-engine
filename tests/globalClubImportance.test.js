import test from "node:test";
import assert from "node:assert/strict";
import {
  assignRealClubSquads,
  clubImportanceFor
} from "../src/index.js";

function player(index, clubId, clubName, rating, competitionCode = "GB1") {
  return {
    tbg_player_id: `tbg-global-${clubId}-${index}`,
    display_name: `${clubName} Player ${index}`,
    age: 24,
    status: "active",
    position_group: ["GK", "DEF", "MID", "ATT"][index % 4],
    current_club: clubName,
    current_club_id: clubId,
    current_competition_code: competitionCode,
    market_value_eur: rating * 1000000,
    underlying_ability_rating: rating,
    effective_match_rating: rating,
    tbg_rating: rating,
    assignment_status: "unsigned"
  };
}

function clubPlayers(clubId, clubName, rating, competitionCode, size = 25) {
  return Array.from({ length: size }, (_, index) => player(index + 1, clubId, clubName, rating - (index % 4), competitionCode));
}

test("identifies curated global club importance metadata", () => {
  assert.equal(clubImportanceFor({ clubId: "tm-club-614", clubName: "CR Flamengo" }).continent, "South America");
  assert.equal(clubImportanceFor({ clubName: "Al Ahly" }).continent, "Africa");
  assert.equal(clubImportanceFor({ competitionCode: "MLS1" }).continent, "North America");
});

test("global-importance mode selects clubs across continents before ranking divisions by strength", () => {
  const players = [
    ...clubPlayers("418", "Real Madrid", 96, "ES1"),
    ...clubPlayers("281", "Manchester City", 95, "GB1"),
    ...clubPlayers("11", "Arsenal FC", 94, "GB1"),
    ...clubPlayers("614", "CR Flamengo", 88, "BRA1"),
    ...clubPlayers("1023", "SE Palmeiras", 87, "BRA1"),
    ...clubPlayers("209", "River Plate", 86, "AR1"),
    ...clubPlayers("189", "Boca Juniors", 85, "AR1"),
    ...clubPlayers("7", "Al Ahly SC", 84, "EGY1"),
    ...clubPlayers("363", "Club América", 84, "MEXA"),
    ...clubPlayers("1114", "Al-Hilal SFC", 86, "SA1"),
    ...clubPlayers("828", "Urawa Red Diamonds", 82, "JAP1"),
    ...clubPlayers("6357", "Auckland City FC", 78, "NZ1")
  ];

  const result = assignRealClubSquads({
    players,
    rules: {
      selectionMode: "global-importance",
      clubCount: 10,
      targetSquadSize: 25,
      minSquadSize: 18,
      clubsPerDivision: 5,
      divisions: 2,
      continentTargets: {
        Europe: { min: 2, max: 3 },
        "South America": { min: 3, max: 4 },
        Africa: { min: 1, max: 2 },
        "North America": { min: 1, max: 2 },
        Asia: { min: 1, max: 2 },
        Oceania: { min: 0, max: 1 }
      }
    }
  });

  assert.equal(result.summary.mode, "global-importance");
  assert.equal(result.summary.clubs, 10);
  assert.ok(result.summary.continent_counts["South America"] >= 3);
  assert.ok(result.summary.continent_counts.Africa >= 1);
  assert.ok(result.summary.continent_counts["North America"] >= 1);
  assert.ok(result.summary.continent_counts.Asia >= 1);
  assert.equal(result.clubReports[0].club_name, "Real Madrid");
  assert.equal(result.clubReports[0].division, 1);
});
