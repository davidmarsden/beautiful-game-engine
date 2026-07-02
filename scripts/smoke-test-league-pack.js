import { loadLeaguePack, simulateFixture, summariseLeaguePack } from "../src/index.js";

const packPath = process.argv[2];

if (!packPath) {
  console.error("Usage: node scripts/smoke-test-league-pack.js <league-pack-path>");
  process.exit(1);
}

const pack = await loadLeaguePack(packPath);
const summary = summariseLeaguePack(pack);

if (!pack.fixtures.length) {
  throw new Error("League pack has no fixtures to simulate.");
}

const result = simulateFixture(pack, pack.fixtures[0].id, { seed: "cross-repo-smoke" });

console.log(JSON.stringify({
  summary,
  simulatedFixture: result
}, null, 2));
