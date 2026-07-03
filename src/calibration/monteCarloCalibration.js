function round(value) {
  return Number(Number(value ?? 0).toFixed(3));
}

function normaliseName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&apos;/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function actualRowsFromPack(pack) {
  return (pack.standings ?? [])
    .map((row, index) => ({
      position: Number(row.position ?? row.rank ?? index + 1),
      teamId: row.teamId ?? row.id ?? row.team?.id ?? row.team?.teamId ?? null,
      teamName: row.teamName ?? row.name ?? row.team?.name ?? row.team?.teamName ?? null,
      points: Number(row.points ?? 0)
    }))
    .filter((row) => row.teamName || row.teamId)
    .sort((a, b) => a.position - b.position);
}

function byIdentity(rows) {
  const byTeamId = new Map();
  const byName = new Map();
  for (const row of rows) {
    if (row.teamId) byTeamId.set(String(row.teamId), row);
    if (row.teamName) byName.set(normaliseName(row.teamName), row);
  }
  return { byTeamId, byName };
}

function matchActual(team, index) {
  if (team.teamId && index.byTeamId.has(String(team.teamId))) return index.byTeamId.get(String(team.teamId));
  return index.byName.get(normaliseName(team.teamName)) ?? null;
}

function mean(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreFromError(error, scale) {
  return round(clamp(1 - error / scale, 0, 1));
}

function recommendation(metrics) {
  const notes = [];

  if (metrics.titleConcentration < 0.35) {
    notes.push("Increase rating influence and/or reduce match variance: title probability is too evenly spread.");
  }
  if (metrics.averageBestWorstSpan > 16) {
    notes.push("Reduce league-table volatility: too many clubs can finish anywhere from 1st to 20th.");
  }
  if (metrics.eliteAveragePositionError > 4) {
    notes.push("Strengthen elite separation: real top-four clubs are not consistently ranking near the top.");
  }
  if (metrics.relegationConcentration < 0.45) {
    notes.push("Increase bottom-club risk: relegation probability is too widely distributed.");
  }

  if (!notes.length) notes.push("Monte Carlo distribution is broadly plausible for this first calibration pass.");
  return notes;
}

export function calibrateMonteCarlo(monteCarloReport, pack, options = {}) {
  const actualRows = actualRowsFromPack(pack);
  const actualIndex = byIdentity(actualRows);
  const matched = [];

  for (const team of monteCarloReport.teams ?? []) {
    const actual = matchActual(team, actualIndex);
    if (!actual) continue;
    matched.push({
      teamName: team.teamName,
      teamId: team.teamId,
      averagePosition: team.averagePosition,
      titleProbability: team.titleProbability,
      relegationProbability: team.relegationProbability,
      bestPosition: team.bestPosition,
      worstPosition: team.worstPosition,
      actualPosition: actual.position,
      positionError: team.averagePosition - actual.position,
      bestWorstSpan: team.worstPosition - team.bestPosition
    });
  }

  const topActual = matched.filter((team) => team.actualPosition <= Number(options.elitePlaces ?? 4));
  const bottomActual = matched.filter((team) => team.actualPosition > matched.length - Number(options.relegationPlaces ?? 3));
  const titleConcentration = matched
    .filter((team) => team.actualPosition <= Number(options.titleContenderPlaces ?? 4))
    .reduce((sum, team) => sum + team.titleProbability, 0);
  const relegationConcentration = bottomActual.reduce((sum, team) => sum + team.relegationProbability, 0);
  const averagePositionError = mean(matched.map((team) => Math.abs(team.positionError)));
  const eliteAveragePositionError = mean(topActual.map((team) => Math.abs(team.positionError)));
  const averageBestWorstSpan = mean(matched.map((team) => team.bestWorstSpan));

  const metrics = {
    teamsMatched: matched.length,
    titleConcentration: round(titleConcentration),
    relegationConcentration: round(relegationConcentration),
    averagePositionError: round(averagePositionError),
    eliteAveragePositionError: round(eliteAveragePositionError),
    averageBestWorstSpan: round(averageBestWorstSpan)
  };

  const subscores = {
    position: scoreFromError(metrics.averagePositionError, 8),
    elite: scoreFromError(metrics.eliteAveragePositionError, 8),
    titleConcentration: scoreFromError(Math.max(0, 0.45 - metrics.titleConcentration), 0.45),
    relegationConcentration: scoreFromError(Math.max(0, 0.55 - metrics.relegationConcentration), 0.55),
    volatility: scoreFromError(Math.max(0, metrics.averageBestWorstSpan - 12), 8)
  };

  const score = round(mean(Object.values(subscores)) * 100);

  return {
    score,
    subscores,
    metrics,
    recommendations: recommendation(metrics),
    biggestMisses: [...matched]
      .sort((a, b) => Math.abs(b.positionError) - Math.abs(a.positionError) || a.teamName.localeCompare(b.teamName))
      .slice(0, 6),
    teams: matched
  };
}

export function formatMonteCarloCalibration(calibration) {
  const lines = [
    "",
    "# Monte Carlo Calibration",
    `Calibration score: ${calibration.score}/100`,
    `Teams matched: ${calibration.metrics.teamsMatched}`,
    `Average position error: ${calibration.metrics.averagePositionError}`,
    `Elite average position error: ${calibration.metrics.eliteAveragePositionError}`,
    `Title concentration: ${calibration.metrics.titleConcentration}`,
    `Relegation concentration: ${calibration.metrics.relegationConcentration}`,
    `Average best-worst span: ${calibration.metrics.averageBestWorstSpan}`,
    "",
    "Recommendations:"
  ];

  for (const note of calibration.recommendations) lines.push(`- ${note}`);

  lines.push("", "Biggest average-position misses:", "Team                     Actual AvgPos Diff");
  for (const team of calibration.biggestMisses) {
    lines.push([
      team.teamName.padEnd(24, " "),
      String(team.actualPosition).padStart(6, " "),
      String(team.averagePosition).padStart(6, " "),
      String(round(team.positionError)).padStart(5, " ")
    ].join(" "));
  }

  return lines.join("\n");
}
