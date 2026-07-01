import test from "node:test";
import assert from "node:assert/strict";
import { generateWorld, createSeasonShell, averageClubRating } from "../src/index.js";

test("world generation creates 100 clubs across five divisions", () => {
  const world = generateWorld({ seed: "test-seed" });

  assert.equal(world.clubs.length, 100);
  assert.equal(world.divisions.length, 5);

  for (const division of world.divisions) {
    assert.equal(division.clubIds.length, 20);
  }
});

test("world generation is deterministic for the same seed", () => {
  const first = generateWorld({ seed: "same-seed" });
  const second = generateWorld({ seed: "same-seed" });

  assert.deepEqual(first, second);
});

test("season shell creates double round-robin fixture counts", () => {
  const world = generateWorld({ seed: "fixtures" });
  const shell = createSeasonShell(world);

  assert.equal(shell.divisions.length, 5);

  for (const division of shell.divisions) {
    assert.equal(division.clubCount, 20);
    assert.equal(division.matchdays, 38);
    assert.equal(division.totalFixtures, 380);
  }
});

test("average club rating is calculated", () => {
  const world = generateWorld({ seed: "ratings" });
  const average = averageClubRating(world.clubs);

  assert.equal(typeof average, "number");
  assert.ok(average >= 85);
  assert.ok(average <= 96);
});
