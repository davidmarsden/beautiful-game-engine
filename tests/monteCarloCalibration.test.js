import test from "node:test";
import assert from "node:assert/strict";
import { calibrateMonteCarlo, formatMonteCarloCalibration } from "../src/index.js";

const pack = {
  standings: [
    { teamId: "a", teamName: "Alpha", position: 1, points: 90 },
    { teamId: "b", teamName: "Beta", position: 2, points: 80 },
    { teamId: "c", teamName: "Gamma", position: 3, points: 70 },
    { teamId: "d", teamName: "Delta", position: 4, points: 60 }
  ]
};

const report = {
  runs: 100,
  teams: [
    { teamId: "a", teamName: "Alpha", averagePosition: 1.5, titleProbability: 0.55, relegationProbability: 0, bestPosition: 1, worstPosition: 3 },
    { teamId: "b", teamName: "Beta", averagePosition: 2.2, titleProbability: 0.3, relegationProbability: 0, bestPosition: 1, worstPosition: 5 },
    { teamId: "c", teamName: "Gamma", averagePosition: 3.8, titleProbability: 0.1, relegationProbability: 0.05, bestPosition: 1, worstPosition: 8 },
    { teamId: "d", teamName: "Delta", averagePosition: 12, titleProbability: 0.01, relegationProbability: 0.7, bestPosition: 8, worstPosition: 20 }
  ]
};

test("scores Monte Carlo calibration", () => {
  const calibration = calibrateMonteCarlo(report, pack, { relegationPlaces: 1 });

  assert.equal(calibration.metrics.teamsMatched, 4);
  assert.ok(calibration.score >= 0);
  assert.ok(calibration.score <= 100);
  assert.ok(calibration.metrics.titleConcentration > 0.9);
  assert.equal(calibration.biggestMisses[0].teamName, "Delta");
});

test("formats Monte Carlo calibration", () => {
  const calibration = calibrateMonteCarlo(report, pack, { relegationPlaces: 1 });
  const text = formatMonteCarloCalibration(calibration);

  assert.match(text, /# Monte Carlo Calibration/);
  assert.match(text, /Calibration score:/);
  assert.match(text, /Recommendations:/);
  assert.match(text, /Biggest average-position misses/);
});
