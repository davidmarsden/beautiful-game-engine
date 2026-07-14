import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { buildWorldFoundation, summariseWorldFoundation } from "../src/worldFoundation/buildWorldFoundation.js";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    args[key] = value ?? true;
  }
  return args;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

const args = parseArgs(process.argv.slice(2));
const dataRoot = args.dataRoot || "../beautiful-game-data";
const clubUniversePath = args.clubUniverse || join(dataRoot, "data/config/tbg-club-universe.json");
const gamePlayersPath = args.gamePlayers || join(dataRoot, "derived/tbg-player-pools/game-players.json");
const unsignedPlayersPath = args.unsignedPlayers || join(dataRoot, "derived/tbg-player-pools/unsigned-players.json");
const outputDir = args.outputDir || "derived/world";
const worldId = args.worldId || "tbg-world-001";
const seasonId = args.seasonId || "season-001";

const [clubUniverse, gamePlayers, unsignedPlayers] = await Promise.all([
  readJson(clubUniversePath),
  readJson(gamePlayersPath),
  readJson(unsignedPlayersPath)
]);

const world = buildWorldFoundation({ clubUniverse, gamePlayers, unsignedPlayers, worldId, seasonId });
const summary = summariseWorldFoundation(world);

await Promise.all([
  writeJson(join(outputDir, "world.json"), world),
  writeJson(join(outputDir, "world-summary.json"), summary),
  writeJson(join(outputDir, "clubs.json"), world.clubs),
  writeJson(join(outputDir, "divisions.json"), world.divisions),
  writeJson(join(outputDir, "competitions.json"), world.competitions),
  writeJson(join(outputDir, "manager-slots.json"), world.manager_slots),
  writeJson(join(outputDir, "player-ownership.json"), world.player_ownership),
  writeJson(join(outputDir, "histories", "index.json"), world.histories),
  writeJson(join(outputDir, "seasons", seasonId, "season.json"), world.season),
  writeJson(join(outputDir, "seasons", seasonId, "calendar.json"), world.season.calendar),
  writeJson(join(outputDir, "seasons", seasonId, "fixtures.json"), world.season.fixtures),
  writeJson(join(outputDir, "seasons", seasonId, "standings.json"), world.season.standings),
  writeJson(join(outputDir, "seasons", seasonId, "honours.json"), world.season.honours)
]);

console.log(JSON.stringify(summary, null, 2));
console.log(`Built Phase 2A world foundation at ${outputDir}`);
