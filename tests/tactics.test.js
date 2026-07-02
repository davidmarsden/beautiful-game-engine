import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTacticalModifiersToXg,
  tacticalIdentityFromManagerProfile,
  tacticalModifier
} from "../src/index.js";

test("creates tactical identity from profile", () => {
  const identity = tacticalIdentityFromManagerProfile({
    preferredFormation: "3-5-2",
    aggression: "high",
    substitutionTiming: "early",
    rotation: "medium",
    tacticalIntent: "structured"
  });

  assert.equal(identity.formation, "3-5-2");
  assert.equal(identity.mentality, "structured");
  assert.equal(identity.pressing, "high");
  assert.equal(identity.tempo, "high");
  assert.equal(identity.width, "wide");
});

test("calculates bounded tactical numbers", () => {
  const modifier = tacticalModifier({
    pressing: "high",
    tempo: "high",
    defensiveLine: "high",
    mentality: "balanced",
    width: "wide",
    passing: "direct"
  });

  assert.ok(modifier.attack > 0);
  assert.ok(modifier.defence < 0);
  assert.ok(modifier.volatility > 0);
});

test("applies tactical numbers to expected goals", () => {
  const base = { home: 1.5, away: 1.0 };
  const modified = applyTacticalModifiersToXg(base, {
    homeIdentity: { pressing: "high", tempo: "high", defensiveLine: "high", mentality: "balanced", width: "wide" },
    awayIdentity: { pressing: "controlled", tempo: "measured", mentality: "structured" }
  });

  assert.ok(modified.home > base.home);
  assert.ok(modified.away < base.away);
  assert.equal(typeof modified.modifiers.home.attack, "number");
});
