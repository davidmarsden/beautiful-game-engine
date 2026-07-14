import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { seedWorldDivisions, summariseDivisionSeeding } from "../src/clubStrength/seedDivisions.js";

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
const seeded = seedWorldDivisions(world);
const summary = summariseDivisionSeeding(seeded);

await Promise.all([
  writeJson(join(outputDir, "world.json"), seeded),
  writeJson(join(outputDir, "world-summary.json"), {
    world_id: seeded.world_id,
    status: seeded.status,
    clubs: seeded.clubs.length,
    divisions: seeded.divisions.length,
    clubs_per_division: 20,
    players: seeded.players.length,
    assigned_players: seeded.diagnostics.assigned_players,
    unsigned_players: seeded.diagnostics.unsigned_players,
    manager_slots: seeded.manager_slots.length,
    competitions: seeded.competitions.length,
    league_matchdays_planned: seeded.season.calendar.league_matchdays.length,
    division_seeding_status: "frozen_inaugural_membership",
    strength_version: seeded.strength_version,
    validation_errors: summary.validation_errors
  }),
  writeJson(join(outputDir, "clubs.json"), seeded.clubs),
  writeJson(join(outputDir, "divisions.json"), seeded.divisions),
  writeJson(join(outputDir, "competitions.json"), seeded.competitions),
  writeJson(join(outputDir, "club-strength-rankings.json"), seeded.inaugural_division_membership.rankings),
  writeJson(join(outputDir, "division-seeding-summary.json"), summary)
]);

console.log(JSON.stringify(summary, null, 2));
console.log(`Seeded inaugural divisions in ${outputDir}`);
