import { writeFile } from "node:fs/promises";
import {
  buildSeasonReport,
  formatSeasonReport,
  loadLeaguePack,
  simulateSeason
} from "../src/index.js";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    args[key] = value ?? true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const packPath = args.pack;

if (!packPath) {
  console.error("Usage: node scripts/simulate-season.js --pack=<league-pack.json> [--json=season-report.json]");
  process.exit(1);
}

const pack = await loadLeaguePack(packPath);
const replay = simulateSeason(pack, {
  seed: args.seed ?? "season-replay",
  useLineups: true,
  allowSynthetic: args.allowSynthetic === "true",
  maxFixtures: args.maxFixtures ? Number(args.maxFixtures) : undefined
});
const report = buildSeasonReport(replay, {
  title: args.title ?? "Season Replay"
});

console.log(formatSeasonReport(report));

if (args.json) {
  await writeFile(args.json, `${JSON.stringify({ report, replay }, null, 2)}\n`, "utf8");
  console.log(`\nWrote JSON report: ${args.json}`);
}
