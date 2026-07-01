import test from "node:test";
import assert from "node:assert/strict";
import { generateWorld, validateWorld } from "../src/index.js";

test("generated world validates", () => {
  const world = generateWorld({ seed: "valid-world" });

  assert.equal(validateWorld(world), true);
});

test("world validation rejects missing clubs", () => {
  const world = generateWorld({ seed: "invalid-world" });
  const broken = { ...world, clubs: world.clubs.slice(1) };

  assert.throws(() => validateWorld(broken), /expected 100 clubs/);
});

test("world includes one empty squad shell per club", () => {
  const world = generateWorld({ seed: "squads" });

  assert.equal(world.squads.length, 100);
  assert.equal(world.squads[0].seniorPlayerIds.length, 0);
  assert.equal(world.squads[0].registeredSeniorPlayerIds.length, 0);
  assert.equal(world.squads[0].limits.maxSeniorPlayers, 35);
  assert.equal(world.squads[0].limits.maxRegisteredSeniorPlayers, 25);
});

test("world includes one vacant manager slot per club", () => {
  const world = generateWorld({ seed: "managers" });

  assert.equal(world.managerSlots.length, 100);
  assert.equal(world.managerSlots[0].managerId, null);
  assert.equal(world.managerSlots[0].status, "vacant");
  assert.equal(world.managerSlots[0].caretaker.active, true);
});

test("world includes league and cup competition shells", () => {
  const world = generateWorld({ seed: "competitions" });
  const leagues = world.competitions.filter((competition) => competition.type === "league");
  const cups = world.competitions.filter((competition) => competition.type !== "league");

  assert.equal(world.competitions.length, 8);
  assert.equal(leagues.length, 5);
  assert.equal(cups.length, 3);
  assert.equal(world.competitions[0].rules.relegated, 4);
  assert.equal(world.competitions[4].rules.promoted, 4);
  assert.equal(world.competitions[4].rules.relegated, 0);
  assert.deepEqual(cups.map((cup) => cup.name), ["National Cup", "League Cup", "Youth Cup"]);
  assert.ok(cups.every((cup) => cup.clubIds.length === 100));
});

test("world includes a 38-turn calendar shell", () => {
  const world = generateWorld({ seed: "calendar" });

  assert.equal(world.calendar.leagueTurns.length, 38);
  assert.equal(world.calendar.leagueTurns[0].turn, 1);
  assert.equal(world.calendar.leagueTurns[37].turn, 38);
});
