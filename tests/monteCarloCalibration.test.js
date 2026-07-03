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
    {
      teamId: "a",
      teamName: "Alpha",
      averagePosition: 1.5,
      titleProbability: 0.55,
      topFourProbability: 1,
      relegationProbability: 0,
      bestPosition: 1,
      worstPosition: 3,
      positionCounts: { 1: 55, 2: 35, 3: 10 }
    },
    {
      teamId: "b",
      teamName: "Beta",
      averagePosition: 2.2,
      titleProbability: 0.3,
      topFourProbability: 1,
      relegationProbability: 0,
      bestPosition: 1,
      worstPosition: 5,
      positionCounts: { 1: 30, 2: 35, 3: 20, 4: 15 }
    },
    {
      teamId: "c",
      teamName: "Gamma",
      averagePosition: 3.8,
      titleProbability: 0.1,
      topFourProbability: 0.75,
      relegationProbability: 0.05,
      bestPosition: 1,
      worstPosition: 8,
      positionCounts: { 1: 10, 2: 10, 3: 25, 4: 30, 5: 20, 6: 5 }
    },
    {
      teamId: "d",
      teamName: "Delta",
      averagePosition: 12,
      titleProbability: 0.01,
      topFourProbability: 0.03,
      relegationProbability: 0.7,
      bestPosition: 8,
      worstPosition: 20,
      positionCounts: { 1: 1, 4: 2, 10: 10, 18: 30, 19: 27, 20: 30 }
    }
  ]
};

test("scores Monte Carlo tail-risk calibration", () => {
  const calibration = calibrateMonteCarlo(report, pack, { relegationPlaces: 1 });

  assert.equal(calibration.metrics.teamsMatched, 4);
  assert.ok(calibration.score >= 0);
  assert.ok(calibration.score <= 100);
  assert.ok(calibration.metrics.titleConcentration > 0.9);
  assert.equal(calibration.metrics.bottomClubTitleRate, 0.01);
  assert.ok(calibration.tailRisks.elite.length > 0);
  assert.ok(calibration.tailRisks.bottom.length > 0);
  assert.equal(calibration.biggestMisses[0].teamName, "Delta");
});

test("formats Monte Carlo tail-risk calibration", () => {
  const calibration = calibrateMonteCarlo(report, pack, { relegationPlaces: 1 });
  const text = formatMonteCarloCalibration(calibration);

  assert.match(text, /# Monte Carlo Calibration/);
  assert.match(text, /Calibration score:/);
  assert.match(text, /Recommendations:/);
  assert.match(text, /Biggest average-position misses/);
  assert.match(text, /Elite tail risk/);
  assert.match(text, /Bottom-club miracle risk/);
});
