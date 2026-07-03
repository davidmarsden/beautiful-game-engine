import test from "node:test";
import assert from "node:assert/strict";
import { expectedGoals } from "../src/index.js";

const homeClub = { id: "home", name: "Home", squad: { overall: 90 } };
const awayClub = { id: "away", name: "Away", squad: { overall: 80 } };

test("expected goals favour stronger club more under stronger calibration", () => {
  const defaultXg = expectedGoals({ homeClub, awayClub });
  const tunedXg = expectedGoals({
    homeClub,
    awayClub,
    calibration: {
      strengthGapFactor: 0.1,
      favouriteSuppressionFactor: 0.04
    }
  });

  assert.ok(defaultXg.home > defaultXg.away);
  assert.ok(tunedXg.home - tunedXg.away > defaultXg.home - defaultXg.away);
});

test("lineup strength uses starting XI before role fit", () => {
  const homeLineup = { strength: { startingXI: 92, roleFit: 75 } };
  const awayLineup = { strength: { startingXI: 82, roleFit: 95 } };
  const xg = expectedGoals({ homeClub, awayClub, homeLineup, awayLineup });

  assert.ok(xg.home > xg.away);
});
