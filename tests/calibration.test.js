import test from "node:test";
import assert from "node:assert/strict";
import { calibrateLeagueTable, formatCalibrationReport } from "../src/index.js";

const replay = {
  summary: {
    table: [
      { teamId: "a", teamName: "Alpha", played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 5, goalsAgainst: 1, goalDifference: 4, points: 6 },
      { teamId: "b", teamName: "Beta", played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 1, goalsAgainst: 5, goalDifference: -4, points: 0 }
    ]
  }
};

const pack = {
  standings: [
    { teamId: "b", teamName: "Beta", position: 1, points: 4, goalsFor: 3, goalsAgainst: 2, goalDifference: 1 },
    { teamId: "a", teamName: "Alpha", position: 2, points: 1, goalsFor: 2, goalsAgainst: 3, goalDifference: -1 }
  ]
};

test("calibrates simulated table against real standings", () => {
  const calibration = calibrateLeagueTable(replay, pack);

  assert.equal(calibration.teamsMatched, 2);
  assert.equal(calibration.metrics.meanAbsolutePositionError, 1);
  assert.equal(calibration.metrics.meanAbsolutePointsError, 4.5);
  assert.equal(calibration.biggestPositionMisses.length, 2);
});

test("formats calibration report", () => {
  const calibration = calibrateLeagueTable(replay, pack);
  const text = formatCalibrationReport(calibration);

  assert.match(text, /# Calibration/);
  assert.match(text, /Teams matched: 2\/2/);
  assert.match(text, /Mean absolute position error: 1/);
  assert.match(text, /Biggest position misses/);
});
