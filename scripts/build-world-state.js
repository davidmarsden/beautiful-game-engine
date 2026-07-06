import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { buildWorldStateFromPlayerPools, summariseWorldState } from "../src/worldState/buildWorldState.js";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    args[key] = value ?? true;
  }
  return args;
}

async function readJson(path, fallback = []) {
  if (!path) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

const args = parseArgs(process.argv.slice(2));
const globalPlayersPath = args.globalPlayers ?? "../beautiful-game-data/derived/tbg-player-pools/global-players.json";
const gamePlayersPath = args.gamePlayers ?? "../beautiful-game-data/derived/tbg-player-pools/game-players.json";
const unsignedPlayersPath = args.unsignedPlayers ?? "../beautiful-game-data/derived/tbg-player-pools/unsigned-players.json";
const submittedPlayersPath = args.submittedPlayers ?? "../beautiful-game-data/derived/tbg-player-pools/submitted-players.json";
const outputPath = args.output ?? "derived/world-state/tbg-alpha-world.json";
const summaryPath = args.summary ?? "derived/world-state/tbg-alpha-world-summary.json";

const [globalPlayers, gamePlayers, unsignedPlayers, submittedPlayers] = await Promise.all([
  readJson(globalPlayersPath, []),
  readJson(gamePlayersPath, []),
  readJson(unsignedPlayersPath, []),
  readJson(submittedPlayersPath, [])
]);

const worldState = buildWorldStateFromPlayerPools({
  globalPlayers,
  gamePlayers,
  unsignedPlayers,
  submittedPlayers,
  seasonId: args.seasonId ?? "season-001",
  worldId: args.worldId ?? "tbg-alpha-world"
});
const summary = summariseWorldState(worldState);

for (const path of [outputPath, summaryPath]) await mkdir(dirname(path), { recursive: true });
await writeFile(outputPath, JSON.stringify(worldState, null, 2) + "\n", "utf8");
await writeFile(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf8");

console.log(JSON.stringify(summary, null, 2));
console.log(`Wrote world state: ${outputPath}`);
console.log(`Wrote world state summary: ${summaryPath}`);
