import { readFile, writeFile } from "node:fs/promises";
import {
  calibrateSmwRatings,
  formatSmwRatingCalibration,
  loadLeaguePack
} from "../src/index.js";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    args[key] = value ?? true;
  }
  return args;
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

async function loadTargets(path) {
  const text = await readFile(path, "utf8");
  if (path.endsWith(".json")) return JSON.parse(text);
  if (path.endsWith(".csv")) return parseCsv(text);
  throw new Error("Target file must be .json or .csv");
}

const args = parseArgs(process.argv.slice(2));

if (!args.pack || !args.targets) {
  console.error("Usage: node scripts/smw-rating-calibration.js --pack=<league-pack.json> --targets=<smw-ratings.csv|json> [--json=report.json]");
  process.exit(1);
}

const pack = await loadLeaguePack(args.pack);
const targets = await loadTargets(args.targets);
const report = calibrateSmwRatings(pack, targets);

console.log(formatSmwRatingCalibration(report));

if (args.json) {
  await writeFile(args.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\nWrote JSON report: ${args.json}`);
}
