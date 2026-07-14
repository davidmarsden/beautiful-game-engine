import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { applyInauguralDivisionSeeding } from "../src/clubStrength/seedWorldDivisions.js";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    args[key] = value ?? true;
  }
  return args;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

const args = parseArgs(process.argv.slice(2));
const worldPath = args.world || "derived/world/world.json";
const outputDir = args.outputDir || "derived/world";
const world = JSON.parse(await readFile(worldPath, "utf8"));
const seeded = applyInauguralDivisionSeeding(world);

if (seeded.diagnostics.division_seeding_errors.length) {
  throw new Error(`Invalid seeded world: ${seeded.diagnostics.division_seeding_errors[0]}`);
}

const summary = {
  world_id: seeded.world_id,
  status: seeded.status,
  strength_model_version: seeded.inaugural_seeding.strength_model_version,
  seeding_version: seeded.inaugural_seeding.version,
  clubs: seeded.clubs.length,
  divisions: seeded.divisions.length,
  clubs_per_division: 20,
  league_matchdays: 38,
  strongest_club: seeded.inaugural_seeding.rankings[0],
  weakest_club: seeded.inaugural_seeding.rankings.at(-1),
  validation_errors: seeded.diagnostics.division_seeding_errors
};

await Promise.all([
  writeJson(join(outputDir, "world.json"), seeded),
  writeJson(join(outputDir, "world-summary.json"), summary),
  writeJson(join(outputDir, "clubs.json"), seeded.clubs),
  writeJson(join(outputDir, "divisions.json"), seeded.divisions),
  writeJson(join(outputDir, "competitions.json"), seeded.competitions),
  writeJson(join(outputDir, "club-strength-rankings.json"), seeded.inaugural_seeding.rankings),
  writeJson(join(outputDir, "inaugural-division-seeding.json"), seeded.inaugural_seeding),
  writeJson(join(outputDir, "seasons", seeded.active_season_id, "season.json"), seeded.season),
  writeJson(join(outputDir, "seasons", seeded.active_season_id, "calendar.json"), seeded.season.calendar),
  writeJson(join(outputDir, "seasons", seeded.active_season_id, "standings.json"), seeded.season.standings)
]);

console.log(JSON.stringify(summary, null, 2));
console.log("Inaugural league membership is now frozen: four divisions of 20 clubs.");
