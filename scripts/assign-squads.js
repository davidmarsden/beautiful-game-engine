import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { generateWorld } from "../src/world/generateWorld.js";
import { assignSquadsToClubs } from "../src/squadAssignment/assignSquads.js";
import { runSnakeDraft } from "../src/squadAssignment/snakeDraft.js";
import { assignRealClubSquads } from "../src/squadAssignment/realClubAssignment.js";
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
const clubUniversePath = args.clubUniverse ?? "../beautiful-game-data/data/config/tbg-club-universe.json";
const seed = args.seed ?? "tbg-alpha-squad-assignment";
const seasonId = args.seasonId ?? "season-001";
const worldId = args.worldId ?? "tbg-alpha-world";
const squadSize = Number(args.squadSize ?? 25);
const assignmentMode = args.assignmentMode ?? "club-universe";
const draftOrder = args.draftOrder ?? "division-balanced";
const clubCount = Number(args.clubCount ?? 100);
const minSquadSize = Number(args.minSquadSize ?? 18);

const [globalPlayers, unsignedPlayers, submittedPlayers, clubUniverse] = await Promise.all([
  readJson(globalPlayersPath, []),
  readJson(unsignedPlayersPath, []),
  readJson(submittedPlayersPath, []),
  readJson(clubUniversePath, null)
]);

const sourcePlayers = globalPlayers.length ? globalPlayers : unsignedPlayers;
const usesRealClubSource = ["real-clubs", "global-importance", "club-universe"].includes(assignmentMode);
const worldShell = usesRealClubSource
  ? { clubs: [] }
  : generateWorld({ seed, season: Number(String(seasonId).replace(/[^0-9]/g, "")) || 1 });
const assignment = usesRealClubSource
  ? assignRealClubSquads({
    players: sourcePlayers,
    rules: { clubCount, targetSquadSize: squadSize, minSquadSize, selectionMode: assignmentMode, clubUniverse }
  })
  : assignmentMode === "snake-draft"
    ? runSnakeDraft({
      players: sourcePlayers,
      clubs: worldShell.clubs,
      squadSize,
      seed,
      order: draftOrder
    })
    : assignSquadsToClubs({
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
const strengthKey = usesRealClubSource ? "weighted_squad_strength" : "average_rating";
const fullSummary = {
  ...worldSummary,
  squad_assignment: assignment.summary,
  weakest_complete_clubs: assignment.clubReports
    .filter((club) => club.squad_size >= squadSize)
    .sort((a, b) => Number(a[strengthKey] ?? a.average_rating) - Number(b[strengthKey] ?? b.average_rating))
    .slice(0, 10),
  strongest_clubs: assignment.clubReports
    .sort((a, b) => Number(b[strengthKey] ?? b.average_rating) - Number(a[strengthKey] ?? a.average_rating))
    .slice(0, 10)
};

await writeJson(args.assignedPlayersOutput ?? "derived/squad-assignment/assigned-players.json", assignment.assignedPlayers);
await writeJson(args.unsignedPlayersOutput ?? "derived/squad-assignment/unsigned-players-after-assignment.json", assignment.unsignedPlayers);
await writeJson(args.clubReportOutput ?? "derived/squad-assignment/club-squad-report.json", assignment.clubReports);
await writeJson(args.assignmentSummaryOutput ?? "derived/squad-assignment/summary.json", assignment.summary);
if (assignment.clubs) await writeJson(args.clubsOutput ?? "derived/squad-assignment/real-clubs.json", assignment.clubs);
if (assignment.draftPicks) await writeJson(args.draftPicksOutput ?? "derived/squad-assignment/draft-picks.json", assignment.draftPicks);
await writeJson(args.worldOutput ?? "derived/world-state/tbg-alpha-world.json", worldState);
await writeJson(args.worldSummaryOutput ?? "derived/world-state/tbg-alpha-world-summary.json", fullSummary);

console.log(JSON.stringify(fullSummary, null, 2));
console.log("Squad assignment complete.");
