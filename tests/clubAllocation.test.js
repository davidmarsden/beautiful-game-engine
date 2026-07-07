import test from "node:test";
import assert from "node:assert/strict";
import { allocateManagerClubs } from "../src/index.js";

const clubs = [
  { id: "tm-club-418", name: "Real Madrid", division: 1, rating: 92.95, continent: "Europe", league: "LaLiga" },
  { id: "tm-club-281", name: "Manchester City", division: 1, rating: 92.2, continent: "Europe", league: "Premier League" },
  { id: "tm-club-614", name: "CR Flamengo", division: 3, rating: 86.5, continent: "South America", league: "Brasileirão" }
];

test("allocates managers to highest available preferences", () => {
  const allocation = allocateManagerClubs({
    clubs,
    preferences: {
      lottery_seed: "test-seed",
      managers: [
        { manager_id: "m1", manager_name: "Manager One", preferences: ["Real Madrid", "CR Flamengo"] },
        { manager_id: "m2", manager_name: "Manager Two", preferences: ["Real Madrid", "Manchester City"] }
      ]
    }
  });

  assert.equal(allocation.summary.managers, 2);
  assert.equal(allocation.summary.allocated, 2);
  assert.equal(new Set(allocation.allocations.map((item) => item.club_id)).size, 2);
});

test("reports unresolved preferences and unclaimed clubs", () => {
  const allocation = allocateManagerClubs({
    clubs,
    preferences: {
      managers: [
        { manager_id: "m1", manager_name: "Manager One", preferences: ["Not A Club"] }
      ]
    }
  });

  assert.equal(allocation.summary.allocated, 0);
  assert.equal(allocation.summary.unassigned, 1);
  assert.equal(allocation.unresolved_preferences.length, 1);
  assert.equal(allocation.unclaimed_clubs.length, 3);
});
