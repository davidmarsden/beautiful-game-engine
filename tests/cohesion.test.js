import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCohesionModifierToXg,
  cohesionMatchModifier,
  createCohesionState,
  updateCohesionState
} from "../src/index.js";

function lineup(ids, formation = "4-3-3") {
  return {
    formation,
    starters: ids.map((id, index) => ({ playerId: id, order: index + 1 }))
  };
}

const stableIds = Array.from({ length: 11 }, (_, index) => `p${index}`);
const changedIds = Array.from({ length: 11 }, (_, index) => `q${index}`);

test("creates a default cohesion state", () => {
  const state = createCohesionState();
  assert.equal(state.cohesion, 0.45);
  assert.equal(state.baseFamiliarity, 0.35);
  assert.equal(state.matchesTracked, 0);
});

test("stable teams gain cohesion and formation familiarity", () => {
  let state = createCohesionState();
  state = updateCohesionState(state, lineup(stableIds, "4-3-3"));
  state = updateCohesionState(state, lineup(stableIds, "4-3-3"));
  state = updateCohesionState(state, lineup(stableIds, "4-3-3"));

  assert.ok(state.cohesion > 0.45);
  assert.ok(state.familiarity["4-3-3"] > 0.35);
  assert.equal(state.lastFormation, "4-3-3");
});

test("large XI changes slow cohesion growth", () => {
  let stable = createCohesionState();
  stable = updateCohesionState(stable, lineup(stableIds));
  stable = updateCohesionState(stable, lineup(stableIds));

  let churned = createCohesionState();
  churned = updateCohesionState(churned, lineup(stableIds));
  churned = updateCohesionState(churned, lineup(changedIds));

  assert.ok(stable.cohesion > churned.cohesion);
});

test("cohesion creates match modifiers", () => {
  const state = {
    ...createCohesionState(),
    cohesion: 0.8,
    familiarity: { "4-3-3": 0.75 }
  };
  const modifier = cohesionMatchModifier(state, "4-3-3");

  assert.ok(modifier.attack > 0);
  assert.ok(modifier.defence > 0);
  assert.ok(modifier.reliability > 0.5);
});

test("applies cohesion modifiers to expected goals", () => {
  const base = { home: 1.5, away: 1.2 };
  const strong = { ...createCohesionState(), cohesion: 0.85, familiarity: { "4-3-3": 0.85 } };
  const weak = { ...createCohesionState(), cohesion: 0.2, familiarity: { "4-3-3": 0.2 } };
  const modified = applyCohesionModifierToXg(base, {
    homeState: strong,
    awayState: weak,
    homeFormation: "4-3-3",
    awayFormation: "4-3-3"
  });

  assert.ok(modified.home > base.home);
  assert.ok(modified.away < base.away);
});
