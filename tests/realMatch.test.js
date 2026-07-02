import test from "node:test";
import assert from "node:assert/strict";
import { findFixtureByTeams } from "../src/index.js";

const pack = {
  clubs: {
    mun: { id: "mun", name: "Manchester United" },
    liv: { id: "liv", name: "Liverpool" },
    ars: { id: "ars", name: "Arsenal" }
  },
  fixtures: [
    { id: "f1", homeTeamId: "mun", awayTeamId: "liv" },
    { id: "f2", homeTeamId: "ars", awayTeamId: "mun" }
  ]
};

test("finds a fixture by team names", () => {
  const fixture = findFixtureByTeams(pack, { home: "Manchester United", away: "Liverpool" });
  assert.equal(fixture.id, "f1");
});

test("can find a reverse fixture when allowed", () => {
  const fixture = findFixtureByTeams(pack, { home: "Liverpool", away: "Manchester United" });
  assert.equal(fixture.id, "f1");
});

test("throws when a named fixture cannot be found", () => {
  assert.throws(() => findFixtureByTeams(pack, { home: "Chelsea", away: "Liverpool" }), /No fixture found/);
});
