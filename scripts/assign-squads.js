import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { generateWorld } from "../src/world/generateWorld.js";
import { assignSquadsToClubs } from "../src/squadAssignment/assignSquads.js";
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

async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

const args = parseArgs(process.argv.slice(2));
const globalPlayersPath = args.globalPlayers ?? "../beautiful-game-data/derived/tbg-player-pools/global-players.json";
const unsignedPlayersPath = args.unsignedPlayers ?? "../beautiful-game-data/derived/tbg-player-pools/unsigned-players.json";
const submittedPlayersPath = args.submittedPlayers ?? "../beautiful-game-data/derived/tbg-player-pools/submitted-players.json";
const seed = args.seed ?? "tbg-alpha-squad-assignment";
const seasonId = args.seasonId ?? "season-001";
const worldId = args.worldId ?? "tbg-alpha-world";
const squadSize = Number(args.squadSize ?? 25);

const [globalPlayers, unsignedPlayers, submittedPlayers] = await Promise.all([
  readJson(globalPlayersPath, []),
  readJson(unsignedPlayersPath, []),
  readJson(submittedPlayersPath, [])
]);

const sourcePlayers = unsignedPlayers.length ? unsignedPlayers : globalPlayers;
const worldShell = generateWorld({ seed, season: Number(String(seasonId).replace(/\D/g, "")) || 1 });
const assignment = assignSquadsToClubs({
  players: sourcePlayers,
  clubs: worldShell.clubs,
  rules: { squadSize }
});

if (assignment.summary.duplicate_assigned_ids.length) {
  throw new Error(`Duplicate assigned players: ${assignment.summary.duplicate_assigned_ids.join(", ")}`);
}

const worldState = buildWorldStateFromPlayerPools({
  gamePlayers: assignment.assignedPlayers,
  unsignedPlayers: assignment.unsignedPlayers,
  submittedPlayers,
  seasonId,
  worldId
});
const worldSummary = summariseWorldState(worldState);
const fullSummary = {
  ...worldSummary,
  squad_assignment: assignment.summary,
  weakest_complete_clubs: assignment.clubReports
    .filter((club) => club.squad_size >= squadSize)
    .sort((a, b) => a.average_rating - b.average_rating)
    .slice(0, 10),
  strongest_clubs: assignment.clubReports
    .sort((a, b) => b.average_rating - a.average_rating)
    .slice(0, 10)
};

await writeJson(args.assignedPlayersOutput ?? "derived/squad-assignment/assigned-players.json", assignment.assignedPlayers);
await writeJson(args.unsignedPlayersOutput ?? "derived/squad-assignment/unsigned-players-after-assignment.json", assignment.unsignedPlayers);
await writeJson(args.clubReportOutput ?? "derived/squad-assignment/club-squad-report.json", assignment.clubReports);
await writeJson(args.assignmentSummaryOutput ?? "derived/squad-assignment/summary.json", assignment.summary);
await writeJson(args.worldOutput ?? "derived/world-state/tbg-alpha-world.json", worldState);
await writeJson(args.worldSummaryOutput ?? "derived/world-state/tbg-alpha-world-summary.json", fullSummary);

console.log(JSON.stringify(fullSummary, null, 2));
console.log("Squad assignment complete.");
