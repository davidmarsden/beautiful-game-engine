import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { simulateLeagueSeasons } from "../src/seasonSimulation/simulateLeagueSeasons.js";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    args[key] = value ?? true;
  }
  return args;
}

async function readJson(path, fallback = []) {
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

function toMarkdown(report) {
  const lines = [];
  lines.push("# TBG Season Simulation Report");
  lines.push("");
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Seed: ${report.seed}`);
  lines.push(`Seasons: ${report.summary.seasons}`);
  lines.push("");
  lines.push("## Headline metrics");
  lines.push("");
  lines.push(`- Fixtures: ${report.summary.fixtures}`);
  lines.push(`- Goals: ${report.summary.goals}`);
  lines.push(`- Goals per match: ${report.summary.goals_per_match}`);
  lines.push(`- Draw rate: ${report.summary.draw_rate}`);
  lines.push(`- Unique D1 champions: ${report.summary.unique_champions}`);
  lines.push(`- Clubs moved at least once: ${report.summary.clubs_moved_at_least_once}`);
  lines.push("");
  lines.push("## Most titles");
  lines.push("");
  lines.push("| Club | Titles |");
  lines.push("|---|---:|");
  for (const row of report.summary.most_titles) lines.push(`| ${row.club_name} | ${row.titles} |`);
  lines.push("");
  lines.push("## Biggest climbers");
  lines.push("");
  lines.push("| Club | Initial | Final | Change |");
  lines.push("|---|---:|---:|---:|");
  for (const row of report.summary.biggest_climbers) lines.push(`| ${row.club_name} | D${row.initial_division} | D${row.final_division} | +${row.change} |`);
  lines.push("");
  lines.push("## Biggest fallers");
  lines.push("");
  lines.push("| Club | Initial | Final | Change |");
  lines.push("|---|---:|---:|---:|");
  for (const row of report.summary.biggest_fallers) lines.push(`| ${row.club_name} | D${row.initial_division} | D${row.final_division} | ${row.change} |`);
  lines.push("");
  lines.push("## Season champions");
  lines.push("");
  lines.push("| Season | D1 | D2 | D3 | D4 |");
  lines.push("|---:|---|---|---|---|");
  for (const season of report.seasons) {
    const champions = new Map(season.champions.map((row) => [row.division, row.club_name]));
    lines.push(`| ${season.season} | ${champions.get(1) || ""} | ${champions.get(2) || ""} | ${champions.get(3) || ""} | ${champions.get(4) || ""} |`);
  }
  lines.push("");
  lines.push("## Last-season final tables");
  lines.push("");
  const lastSeason = report.seasons.at(-1);
  for (const division of lastSeason.divisions) {
    lines.push(`### Division ${division.division}`);
    lines.push("");
    lines.push("| Pos | Club | Pts | GD | GF | GA |");
    lines.push("|---:|---|---:|---:|---:|---:|");
    for (const row of division.table) lines.push(`| ${row.position} | ${row.name} | ${row.points} | ${row.gd} | ${row.gf} | ${row.ga} |`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

const args = parseArgs(process.argv.slice(2));
const clubsPath = args.clubs ?? "derived/squad-assignment/real-clubs.json";
const output = args.output ?? "derived/season-simulation/season-simulation-report.json";
const markdownOutput = args.markdown ?? "derived/season-simulation/season-simulation-report.md";
const seasons = Number(args.seasons ?? 20);
const seed = args.seed ?? "tbg-alpha-season-test";

const clubs = await readJson(clubsPath, []);
if (!clubs.length) throw new Error(`No clubs found at ${clubsPath}`);

const report = simulateLeagueSeasons({
  clubs,
  seasons,
  seed,
  config: {
    promotionPlaces: Number(args.promotionPlaces ?? 4),
    relegationPlaces: Number(args.relegationPlaces ?? 4),
    baseGoals: Number(args.baseGoals ?? 1.28),
    homeAdvantage: Number(args.homeAdvantage ?? 0.18),
    gapScale: Number(args.gapScale ?? 0.095),
    matchVariance: Number(args.matchVariance ?? 0.22)
  }
});

await writeJson(output, report);
await mkdir(dirname(markdownOutput), { recursive: true });
await writeFile(markdownOutput, toMarkdown(report), "utf8");

console.log(JSON.stringify(report.summary, null, 2));
console.log(`Wrote simulation report: ${output}`);
console.log(`Wrote simulation markdown: ${markdownOutput}`);
