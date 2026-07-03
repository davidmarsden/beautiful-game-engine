import { writeFile } from "node:fs/promises";
import {
  buildRatingExplorer,
  formatRatingExplorer,
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

const args = parseArgs(process.argv.slice(2));
const packPath = args.pack;

if (!packPath) {
  console.error("Usage: node scripts/rating-explorer.js --pack=<league-pack.json> [--json=rating-explorer.json]");
  process.exit(1);
}

const pack = await loadLeaguePack(packPath);
const report = buildRatingExplorer(pack, {
  topPlayerLimit: args.topPlayerLimit ? Number(args.topPlayerLimit) : 8
});

console.log(formatRatingExplorer(report));

if (args.json) {
  await writeFile(args.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\nWrote JSON report: ${args.json}`);
}
