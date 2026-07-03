import test from "node:test";
import assert from "node:assert/strict";
import { buildRatingExplorer, formatRatingExplorer } from "../src/index.js";

function player(id, teamId, name, position, rating, age = 25) {
  return {
    id,
    name,
    age,
    position,
    team: { providerTeamId: teamId },
    ratings: { ability: rating, form: 0, effectiveMatchRating: rating }
  };
}

const pack = {
  meta: { source: { league: "test", season: "1" } },
  clubs: {
    alpha: { id: "alpha", name: "Alpha", source: { providerTeamId: "alpha" } },
    beta: { id: "beta", name: "Beta", source: { providerTeamId: "beta" } }
  },
  players: Object.fromEntries([
    player("a-gk", "alpha", "Alpha GK", "Goalkeeper", 90, 31),
    player("a-cb", "alpha", "Alpha CB", "Defender", 88, 28),
    player("a-cm", "alpha", "Alpha CM", "Midfielder", 87, 23),
    player("a-st", "alpha", "Alpha ST", "Attacker", 89, 21),
    player("b-gk", "beta", "Beta GK", "Goalkeeper", 80, 30),
    player("b-cb", "beta", "Beta CB", "Defender", 78, 27),
    player("b-cm", "beta", "Beta CM", "Midfielder", 77, 22),
    player("b-st", "beta", "Beta ST", "Attacker", 79, 20)
  ].map((row) => [row.id, row]))
};

test("builds rating explorer report", () => {
  const report = buildRatingExplorer(pack, { topPlayerLimit: 2 });

  assert.equal(report.clubs.length, 2);
  assert.equal(report.clubs[0].clubName, "Alpha");
  assert.equal(report.clubs[0].squadSize, 4);
  assert.ok(report.spread.bestXIRange > 0);
  assert.equal(report.clubs[0].groups.GK.best, 90);
  assert.equal(report.clubs[0].topPlayers.length, 2);
});

test("formats rating explorer report", () => {
  const report = buildRatingExplorer(pack, { topPlayerLimit: 2 });
  const text = formatRatingExplorer(report);

  assert.match(text, /# Rating Explorer/);
  assert.match(text, /Best XI range/);
  assert.match(text, /Alpha/);
  assert.match(text, /Top players by club/);
});
