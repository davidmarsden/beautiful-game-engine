import test from "node:test";
import assert from "node:assert/strict";
import { calibrateSeasonDistribution, formatSeasonDistributionReport } from "../src/index.js";

const replay = {
  results: [
    { fixtureId: "s1", homeTeamName: "Alpha", awayTeamName: "Beta", score: { home: 2, away: 1 } },
    { fixtureId: "s2", homeTeamName: "Gamma", awayTeamName: "Delta", score: { home: 0, away: 0 } },
    { fixtureId: "s3", homeTeamName: "Alpha", awayTeamName: "Gamma", score: { home: 1, away: 3 } }
  ]
};

const pack = {
  fixtures: [
    { id: "a1", homeTeamName: "Alpha", awayTeamName: "Beta", status: { short: "FT" }, score: { home: 1, away: 0 } },
    { id: "a2", homeTeamName: "Gamma", awayTeamName: "Delta", status: { short: "FT" }, score: { home: 2, away: 2 } },
    { id: "a3", homeTeamName: "Alpha", awayTeamName: "Gamma", status: { short: "FT" }, score: { home: 0, away: 2 } }
  ]
};

test("calibrates season-level scoring distribution", () => {
  const calibration = calibrateSeasonDistribution(replay, pack);

  assert.equal(calibration.simulated.fixtures, 3);
  assert.equal(calibration.actual.fixtures, 3);
  assert.equal(calibration.simulated.goals, 7);
  assert.equal(calibration.actual.goals, 7);
  assert.equal(calibration.simulated.homeWins, 1);
  assert.equal(calibration.simulated.draws, 1);
  assert.equal(calibration.simulated.awayWins, 1);
  assert.equal(calibration.difference.goals, 0);
});

test("formats season distribution report", () => {
  const calibration = calibrateSeasonDistribution(replay, pack);
  const text = formatSeasonDistributionReport(calibration);

  assert.match(text, /# Season Distribution/);
  assert.match(text, /Goals\/match/);
  assert.match(text, /Home win rate/);
  assert.match(text, /BTTS rate/);
});
