import { loadLeaguePack, simulateSeason } from "../src/index.js";

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
  console.error("Usage: node scripts/simulate-season.js --pack=<league-pack.json>");
  process.exit(1);
}

const pack = await loadLeaguePack(packPath);
const replay = simulateSeason(pack, {
  seed: args.seed ?? "season-replay",
  useLineups: true,
  allowSynthetic: args.allowSynthetic === "true",
  maxFixtures: args.maxFixtures ? Number(args.maxFixtures) : undefined
});

console.log("# Season Replay");
console.log(`Fixtures played: ${replay.summary.fixturesPlayed}`);
console.log(`Fixtures remaining: ${replay.summary.fixturesRemaining}`);
console.log("");
console.log("Pos Team P W D L GF GA GD Pts");

replay.summary.table.forEach((row, index) => {
  console.log([
    String(index + 1).padStart(2, " "),
    row.teamName.padEnd(24, " "),
    String(row.played).padStart(2, " "),
    String(row.won).padStart(2, " "),
    String(row.drawn).padStart(2, " "),
    String(row.lost).padStart(2, " "),
    String(row.goalsFor).padStart(3, " "),
    String(row.goalsAgainst).padStart(3, " "),
    String(row.goalDifference).padStart(3, " "),
    String(row.points).padStart(3, " ")
  ].join(" "));
});
