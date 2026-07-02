import test from "node:test";
import assert from "node:assert/strict";
import { getFormationSlots, playerRoles, roleFitScore, selectLineup } from "../src/index.js";

function player(id, position, rating, age = 25) {
  return {
    id,
    name: id,
    age,
    position,
    ratings: { ability: rating, effectiveMatchRating: rating }
  };
}

const squad = [
  player("gk1", "Goalkeeper", 88, 34),
  player("gk2", "Goalkeeper", 75),
  player("rb1", "Defender", 83),
  player("cb1", "Defender", 87),
  player("cb2", "Defender", 85),
  player("lb1", "Defender", 82),
  player("dm1", "Midfielder", 84),
  player("cm1", "Midfielder", 86),
  player("cm2", "Midfielder", 83),
  player("am1", "Attacking Midfielder", 85),
  player("rw1", "Winger", 84),
  player("lw1", "Winger", 84),
  player("st1", "Attacker", 89),
  player("st2", "Forward", 81),
  player("cb3", "Defender", 80),
  player("cm3", "Midfielder", 79),
  player("rw2", "Winger", 78),
  player("st3", "Striker", 77)
];

test("formation slots are known", () => {
  assert.equal(getFormationSlots("4-3-3").length, 11);
  assert.throws(() => getFormationSlots("2-2-6"), /Unknown formation/);
});

test("maps provider positions to playable roles", () => {
  assert.deepEqual(playerRoles(player("x", "Goalkeeper", 80)), ["GK"]);
  assert.ok(playerRoles(player("x", "Attacking Midfielder", 80)).includes("AM"));
  assert.ok(playerRoles(player("x", "Winger", 80)).includes("LW"));
});

test("role fit rewards natural roles", () => {
  const keeper = player("gk", "Goalkeeper", 80);
  assert.ok(roleFitScore(keeper, "GK") > roleFitScore(keeper, "ST"));
});

test("selects a valid starting XI and bench", () => {
  const lineup = selectLineup(squad, { formation: "4-3-3", benchSize: 5 });

  assert.equal(lineup.formation, "4-3-3");
  assert.equal(lineup.starters.length, 11);
  assert.equal(lineup.bench.length, 5);
  assert.equal(new Set(lineup.starters.map((starter) => starter.playerId)).size, 11);
  assert.equal(lineup.starters[0].slot, "GK");
  assert.equal(lineup.starters[0].playerId, "gk1");
  assert.equal(lineup.captain.playerId, "gk1");
  assert.ok(lineup.strength.startingXI > 80);
  assert.ok(lineup.strength.roleFit > 75);
});

test("supports alternative formations", () => {
  const lineup = selectLineup(squad, { formation: "4-2-3-1", benchSize: 7 });

  assert.equal(lineup.starters.length, 11);
  assert.equal(lineup.starters.filter((starter) => starter.slot === "DM").length, 2);
  assert.equal(lineup.starters.some((starter) => starter.slot === "AM"), true);
});

test("can fill a partial squad with synthetic players when explicitly allowed", () => {
  const partial = [
    player("real-gk", "Goalkeeper", 80),
    player("real-st", "Attacker", 82)
  ];
  const lineup = selectLineup(partial, {
    formation: "4-3-3",
    benchSize: 0,
    allowSynthetic: true,
    syntheticBaseRating: 65
  });

  assert.equal(lineup.starters.length, 11);
  assert.equal(lineup.syntheticPlayersUsed, 9);
  assert.equal(lineup.starters.filter((starter) => starter.synthetic).length, 9);
});

test("skips players who are not available", () => {
  const unavailableKeeper = {
    ...player("gk1", "Goalkeeper", 99, 34),
    availability: { injured: true }
  };
  const lineup = selectLineup([unavailableKeeper, ...squad.filter((candidate) => candidate.id !== "gk1")], {
    formation: "4-3-3",
    benchSize: 5
  });

  assert.equal(lineup.starters[0].slot, "GK");
  assert.equal(lineup.starters[0].playerId, "gk2");
});
