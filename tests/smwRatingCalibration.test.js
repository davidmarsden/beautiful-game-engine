import test from "node:test";
import assert from "node:assert/strict";
import { calibrateSmwRatings, formatSmwRatingCalibration } from "../src/index.js";

const pack = {
  players: {
    salah: {
      id: "salah",
      name: "Mohamed Salah",
      position: "Attacker",
      team: { name: "Liverpool" },
      ratings: { ability: 88.5, effectiveMatchRating: 88.5 }
    },
    saka: {
      id: "saka",
      name: "Bukayo Saka",
      position: "Attacker",
      team: { name: "Arsenal" },
      ratings: { ability: 90, effectiveMatchRating: 90 }
    },
    rice: {
      id: "rice",
      name: "Declan Rice",
      position: "Midfielder",
      team: { name: "Arsenal" },
      ratings: { ability: 87.5, effectiveMatchRating: 87.5 }
    }
  }
};

const targets = [
  { name: "Mohamed Salah", club: "Liverpool", smwRating: 94 },
  { name: "Bukayo Saka", club: "Arsenal", smwRating: 94 },
  { name: "Declan Rice", club: "Arsenal", smwRating: 94 }
];

test("calibrates generated ratings against SMW targets", () => {
  const report = calibrateSmwRatings(pack, targets);

  assert.equal(report.matchedPlayers, 3);
  assert.equal(report.targetPlayers, 3);
  assert.ok(report.summary.meanAbsoluteError > 0);
  assert.equal(report.byPosition.ATT.count, 2);
  assert.equal(report.biggestMisses[0].playerName, "Declan Rice");
});

test("formats SMW rating calibration report", () => {
  const report = calibrateSmwRatings(pack, targets);
  const text = formatSmwRatingCalibration(report);

  assert.match(text, /# SMW Rating Calibration/);
  assert.match(text, /Mean absolute error/);
  assert.match(text, /Bias by position/);
  assert.match(text, /Biggest misses/);
});
