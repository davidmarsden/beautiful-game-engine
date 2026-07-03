import { writeFile } from "node:fs/promises";
import {
  calibrateMonteCarlo,
  formatMonteCarloCalibration,
  formatMonteCarloReport,
  loadLeaguePack,
  runMonteCarloSeason
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
  console.error("Usage: node scripts/monte-carlo-season.js --pack=<league-pack.json> [--runs=100] [--json=monte-carlo-report.json]");
  process.exit(1);
}

const pack = await loadLeaguePack(packPath);
const report = runMonteCarloSeason(pack, {
  runs: args.runs ? Number(args.runs) : 100,
  seed: args.seed ?? "monte-carlo",
  useLineups: true,
  allowSynthetic: args.allowSynthetic === "true",
  maxFixtures: args.maxFixtures ? Number(args.maxFixtures) : undefined
});
const calibration = calibrateMonteCarlo(report, pack);

console.log(formatMonteCarloReport(report));
console.log(formatMonteCarloCalibration(calibration));

if (args.json) {
  await writeFile(args.json, `${JSON.stringify({ report, calibration }, null, 2)}\n`, "utf8");
  console.log(`\nWrote JSON report: ${args.json}`);
}
