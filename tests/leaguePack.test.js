import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorldFromLeaguePack,
  loadLeaguePackFromObject,
  summariseLeaguePack,
  validateLeaguePack
} from "../src/index.js";

const samplePack = {
  meta: {
    version: "league-pack-v0.1",
    source: { league: "39", season: "2025" }
  },
  clubs: {
    "provider:api-football:50": {
      id: "provider:api-football:50",
      name: "Example FC",
      squad: { overall: 88 }
    },
    "provider:api-football:51": {
      id: "provider:api-football:51",
      name: "Away FC",
      squad: { overall: 82 }
    }
  },
  players: {
    "provider:api-football:123": {
      id: "provider:api-football:123",
      name: "Example Player"
    }
  },
  managerSlots: {
    "provider:api-football:50": { status: "vacant" },
    "provider:api-football:51": { status: "vacant" }
  },
  fixtures: [
    {
      id: "provider:api-football:999",
      homeTeamId: "provider:api-football:50",
      awayTeamId: "provider:api-football:51"
    }
  ],
  standings: [
    { teamId: "provider:api-football:50", rank: 1 }
  ]
};

test("validates a league pack", () => {
  assert.equal(validateLeaguePack(samplePack), true);
});

test("loads a league pack object", () => {
  const pack = loadLeaguePackFromObject(samplePack);
  assert.equal(pack.meta.version, "league-pack-v0.1");
});

test("summarises a league pack", () => {
  const summary = summariseLeaguePack(samplePack);

  assert.equal(summary.clubs, 2);
  assert.equal(summary.players, 1);
  assert.equal(summary.fixtures, 1);
  assert.equal(summary.managerSlots, 2);
  assert.equal(summary.vacantManagerSlots, 2);
  assert.equal(summary.averageClubOverall, 85);
  assert.equal(summary.strongestClub, "Example FC");
});

test("creates an engine world from a league pack", () => {
  const world = createWorldFromLeaguePack(samplePack, { createdAt: "2026-07-01T00:00:00.000Z" });

  assert.equal(world.meta.source, "league-pack");
  assert.equal(world.meta.league, "39");
  assert.equal(world.meta.season, "2025");
  assert.equal(world.clubs.length, 2);
  assert.equal(world.players.length, 1);
  assert.equal(world.fixtures.length, 1);
});

test("rejects fixture references to unknown clubs", () => {
  const broken = {
    ...samplePack,
    fixtures: [{ id: "bad", homeTeamId: "provider:api-football:999", awayTeamId: "provider:api-football:51" }]
  };

  assert.throws(() => validateLeaguePack(broken), /unknown home team/);
});
