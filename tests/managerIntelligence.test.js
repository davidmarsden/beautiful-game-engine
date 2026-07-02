import test from "node:test";
import assert from "node:assert/strict";
import { buildManagerProfilesFromFixtureDetails } from "../src/index.js";

const rows = [
  {
    fixtureId: 1,
    lineups: [
      {
        team: { id: 10, name: "Alpha FC" },
        formation: "4-3-3",
        startXI: Array.from({ length: 11 }, (_, index) => ({ player: { id: `a${index}` } }))
      },
      {
        team: { id: 20, name: "Beta FC" },
        formation: "3-5-2",
        startXI: Array.from({ length: 11 }, (_, index) => ({ player: { id: `b${index}` } }))
      }
    ],
    events: [
      { team: { id: 10 }, type: "subst", time: { elapsed: 55 } },
      { team: { id: 10 }, type: "Card", time: { elapsed: 40 } },
      { team: { id: 20 }, type: "subst", time: { elapsed: 75 } },
      { team: { id: 20 }, type: "Card", time: { elapsed: 30 } },
      { team: { id: 20 }, type: "Card", time: { elapsed: 60 } }
    ]
  },
  {
    fixtureId: 2,
    lineups: [
      {
        team: { id: 10, name: "Alpha FC" },
        formation: "4-3-3",
        startXI: Array.from({ length: 11 }, (_, index) => ({ player: { id: `a${index}` } }))
      },
      {
        team: { id: 20, name: "Beta FC" },
        formation: "4-2-3-1",
        startXI: Array.from({ length: 11 }, (_, index) => ({ player: { id: `b2-${index}` } }))
      }
    ],
    events: [
      { team: { id: 10 }, type: "subst", time: { elapsed: 60 } },
      { team: { id: 20 }, type: "subst", time: { elapsed: 70 } }
    ]
  }
];

test("builds manager intelligence profiles from fixture details", () => {
  const profiles = buildManagerProfilesFromFixtureDetails(rows);
  const alpha = profiles["10"];
  const beta = profiles["20"];

  assert.equal(Object.keys(profiles).length, 2);
  assert.equal(alpha.teamName, "Alpha FC");
  assert.equal(alpha.preferredFormation, "4-3-3");
  assert.equal(alpha.matches, 2);
  assert.equal(alpha.rotation, "low");
  assert.equal(alpha.substitutionTiming, "early");
  assert.equal(alpha.cards, 1);

  assert.equal(beta.preferredFormation, "3-5-2");
  assert.equal(beta.rotation, "high");
  assert.equal(beta.substitutionTiming, "late");
  assert.equal(beta.aggression, "low");
});
