import test from "node:test";
import assert from "node:assert/strict";
import { buildSeasonReport, formatLeagueTable, formatSeasonReport } from "../src/index.js";

const replay = {
  complete: true,
  summary: {
    fixturesPlayed: 2,
    fixturesRemaining: 0,
    table: [
      { teamId: "a", teamName: "Alpha", played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 5, goalsAgainst: 1, goalDifference: 4, points: 6 },
      { teamId: "b", teamName: "Beta", played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 1, goalsAgainst: 5, goalDifference: -4, points: 0 }
    ]
  }
};

test("builds season report from replay", () => {
  const report = buildSeasonReport(replay, { title: "Test Replay", relegationPlaces: 1 });

  assert.equal(report.title, "Test Replay");
  assert.equal(report.champion.teamName, "Alpha");
  assert.equal(report.relegated[0].teamName, "Beta");
  assert.equal(report.table[0].position, 1);
});

test("formats league table", () => {
  const report = buildSeasonReport(replay, { relegationPlaces: 1 });
  const table = formatLeagueTable(report.table);

  assert.match(table, /Pos Team/);
  assert.match(table, /Alpha/);
  assert.match(table, /Beta/);
});

test("formats full season report", () => {
  const report = buildSeasonReport(replay, { title: "Test Replay", relegationPlaces: 1 });
  const text = formatSeasonReport(report);

  assert.match(text, /Champion: Alpha/);
  assert.match(text, /Relegated: Beta/);
  assert.match(text, /Fixtures played: 2/);
});
