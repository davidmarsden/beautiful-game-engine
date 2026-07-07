import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { allocateManagerClubs } from "../src/clubAllocation/allocateManagerClubs.js";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    args[key] = value ?? true;
  }
  return args;
}

async function readJson(path, fallback = null) {
  if (!path) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

const args = parseArgs(process.argv.slice(2));
const clubsPath = args.clubs ?? "derived/squad-assignment/real-clubs.json";
const preferencesPath = args.preferences ?? "data/examples/manager-club-preferences.example.json";
const outputPath = args.output ?? "derived/club-allocation/manager-club-allocations.json";

const clubs = await readJson(clubsPath, []);
const preferences = await readJson(preferencesPath, { managers: [] });
const allocation = allocateManagerClubs({ clubs, preferences, seed: args.seed ?? "tbg-club-lottery" });

await writeJson(outputPath, allocation);
console.log(JSON.stringify(allocation.summary, null, 2));
console.log(`Wrote manager club allocations: ${outputPath}`);
