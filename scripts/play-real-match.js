import { findFixtureByTeams } from "../src/realMatch/index.js";
import { loadLeaguePack, simulateFixture } from "../src/index.js";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    args[key] = value ?? true;
  }
  return args;
}

function starterLine(starter) {
  const marker = starter.synthetic ? "*" : " ";
  return `${marker}${String(starter.order).padStart(2, "0")}. ${starter.slot.padEnd(3)} ${starter.name} (${starter.rating})`;
}

function printLineup(label, plan) {
  console.log(`\n${label} — ${plan.formation} [${plan.source}]`);
  console.log(`Captain: ${plan.lineup.captain?.name ?? "None"}`);
  if (plan.lineup.syntheticPlayersUsed > 0) {
    console.log(`Synthetic players used: ${plan.lineup.syntheticPlayersUsed}`);
  }
  console.log("Starting XI:");
  for (const starter of plan.lineup.starters) {
    console.log(`  ${starterLine(starter)}`);
  }
  console.log("Bench:");
  for (const sub of plan.lineup.bench) {
    const marker = sub.synthetic ? "*" : " ";
    console.log(`  ${marker}${String(sub.order).padStart(2, "0")}. ${sub.name} (${sub.rating})`);
  }
}

const args = parseArgs(process.argv.slice(2));
const packPath = args.pack;
const home = args.home ?? "Manchester United";
const away = args.away ?? "Liverpool";
const seed = args.seed ?? "first-real-match";
const formation = args.formation ?? "4-3-3";

if (!packPath) {
  console.error("Usage: node scripts/play-real-match.js --pack=<path> --home='Manchester United' --away=Liverpool");
  process.exit(1);
}

const pack = await loadLeaguePack(packPath);
const fixture = findFixtureByTeams(pack, { home, away });
const result = simulateFixture(pack, fixture.id, {
  seed,
  useLineups: true,
  formation,
  allowSynthetic: true,
  syntheticBaseRating: 65
});

console.log("# First Real Match");
console.log(`${result.summary}`);
console.log(`Fixture: ${fixture.id}`);
console.log(`Date: ${fixture.date ?? "unknown"}`);
console.log(`xG: ${result.homeTeamName} ${result.expectedGoals.home} — ${result.expectedGoals.away} ${result.awayTeamName}`);
console.log(`Outcome: ${result.outcome}`);
console.log(`Synthetic players: ${result.homeTeamName} ${result.syntheticPlayersUsed.home}, ${result.awayTeamName} ${result.syntheticPlayersUsed.away}`);

printLineup(result.homeTeamName, result.managerPlans.home);
printLineup(result.awayTeamName, result.managerPlans.away);
