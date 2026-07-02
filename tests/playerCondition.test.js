import test from "node:test";
import assert from "node:assert/strict";
import {
  availabilityStatus,
  effectiveRatingWithFatigue,
  fatigueFromMinutes,
  fatigueRatingAdjustment,
  recoverFatigue,
  recoveryRateForAge,
  updateFatigueAfterMatch
} from "../src/index.js";

test("calculates fatigue from minutes", () => {
  assert.equal(fatigueFromMinutes(90), 22);
  assert.equal(fatigueFromMinutes(45), 11);
});

test("older players recover more slowly", () => {
  assert.ok(recoveryRateForAge(20) > recoveryRateForAge(34));
  assert.ok(recoverFatigue(60, { restDays: 3, age: 20 }) < recoverFatigue(60, { restDays: 3, age: 34 }));
});

test("updates fatigue after recovery and match minutes", () => {
  const fatigue = updateFatigueAfterMatch(50, { minutes: 90, restDays: 2, age: 30 });
  assert.equal(fatigue, 44);
});

test("fatigue lowers effective rating", () => {
  assert.equal(fatigueRatingAdjustment(20), 0);
  assert.equal(fatigueRatingAdjustment(50), -3);
  assert.equal(effectiveRatingWithFatigue(90, 70), 85);
});

test("availability detects unavailable states", () => {
  assert.equal(availabilityStatus({}), "available");
  assert.equal(availabilityStatus({ availability: { injured: true } }), "injured");
  assert.equal(availabilityStatus({ availability: { suspended: true } }), "suspended");
  assert.equal(availabilityStatus({ condition: { fatigue: 95 } }), "exhausted");
});
