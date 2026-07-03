import { simulateSeason } from "../season/index.js";

function round(value) {
  return Number(Number(value ?? 0).toFixed(3));
}

function rowPoints(row) {
  const value = Number(row.points ?? row.pts ?? row.totalPoints ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function blankTeam(row) {
  return {
    teamId: row.teamId,
    teamName: row.teamName,
    titleWins: 0,
    topFour: 0,
    relegations: 0,
    totalPosition: 0,
    bestPosition: null,
    worstPosition: null,
    positionCounts: {},
    totalPoints: 0
  };
}

function updateTeam(summary, row, simulations, options) {
  const position = row.position;
  summary.totalPosition += position;
  summary.totalPoints += rowPoints(row);
  summary.bestPosition = summary.bestPosition === null ? position : Math.min(summary.bestPosition, position);
  summary.worstPosition = summary.worstPosition === null ? position : Math.max(summary.worstPosition, position);
  summary.positionCounts[position] = (summary.positionCounts[position] ?? 0) + 1;

  if (position === 1) summary.titleWins += 1;
  if (position <= Number(options.topPlaces ?? 4)) summary.topFour += 1;
  if (position > simulations.teamCount - Number(options.relegationPlaces ?? 3)) summary.relegations += 1;
}

function finaliseTeam(summary, runs) {
  const safeRuns = Math.max(1, Number(runs ?? 0));
  return {
    teamId: summary.teamId,
    teamName: summary.teamName,
    averagePosition: round(summary.totalPosition / safeRuns),
    averagePoints: round(summary.totalPoints / safeRuns),
    bestPosition: summary.bestPosition,
    worstPosition: summary.worstPosition,
    titleProbability: round(summary.titleWins / safeRuns),
    topFourProbability: round(summary.topFour / safeRuns),
    relegationProbability: round(summary.relegations / safeRuns),
    positionCounts: summary.positionCounts
  };
}

export function runMonteCarloSeason(pack, options = {}) {
  const runs = Number(options.runs ?? 100);
  const baseSeed = options.seed ?? "monte-carlo";
  const teamSummaries = new Map();
  const champions = {};
  let teamCount = 0;

  for (let index = 0; index < runs; index += 1) {
    const replay = simulateSeason(pack, {
      seed: `${baseSeed}:${index}`,
      useLineups: options.useLineups ?? true,
      allowSynthetic: options.allowSynthetic ?? false,
      maxFixtures: options.maxFixtures,
      calibration: options.calibration
    });
    const table = replay.summary.table.map((row, rowIndex) => ({ position: rowIndex + 1, ...row }));
    teamCount = Math.max(teamCount, table.length);
    const champion = table[0];
    if (champion) champions[champion.teamName] = (champions[champion.teamName] ?? 0) + 1;

    const simulationContext = { teamCount };
    for (const row of table) {
      if (!teamSummaries.has(row.teamId)) teamSummaries.set(row.teamId, blankTeam(row));
      updateTeam(teamSummaries.get(row.teamId), row, simulationContext, options);
    }
  }

  const teams = [...teamSummaries.values()]
    .map((summary) => finaliseTeam(summary, runs))
    .sort((a, b) => a.averagePosition - b.averagePosition || b.titleProbability - a.titleProbability || a.teamName.localeCompare(b.teamName));

  return {
    runs,
    seed: baseSeed,
    calibration: options.calibration ?? null,
    teamCount,
    champions,
    teams
  };
}

export function formatMonteCarloReport(report) {
  const lines = [
    "# Monte Carlo Season",
    `Runs: ${report.runs}`,
    `Seed: ${report.seed}`,
    report.calibration ? `Calibration: ${JSON.stringify(report.calibration)}` : null,
    "",
    "Team                     AvgPos AvgPts Title Top4 Releg Best Worst"
  ].filter((line) => line !== null);

  for (const team of report.teams) {
    lines.push([
      team.teamName.padEnd(24, " "),
      String(team.averagePosition).padStart(6, " "),
      String(team.averagePoints).padStart(6, " "),
      String(Math.round(team.titleProbability * 100)).padStart(5, " ") + "%",
      String(Math.round(team.topFourProbability * 100)).padStart(4, " ") + "%",
      String(Math.round(team.relegationProbability * 100)).padStart(5, " ") + "%",
      String(team.bestPosition).padStart(4, " "),
      String(team.worstPosition).padStart(5, " ")
    ].join(" "));
  }

  return lines.join("\n");
}
