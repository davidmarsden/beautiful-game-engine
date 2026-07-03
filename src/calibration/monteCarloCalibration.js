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

function probabilityForPositions(team, predicate) {
  const counts = team.positionCounts ?? {};
  const total = Object.values(counts).reduce((sum, count) => sum + Number(count ?? 0), 0);
  if (!total) return 0;

  const hits = Object.entries(counts)
    .filter(([position]) => predicate(Number(position)))
    .reduce((sum, [, count]) => sum + Number(count ?? 0), 0);

  return hits / total;
}

function recommendation(metrics) {
  const notes = [];

  if (metrics.titleConcentration < 0.35) {
    notes.push("Increase rating influence and/or reduce match variance: title probability is too evenly spread.");
  }
  if (metrics.eliteAveragePositionError > 4) {
    notes.push("Strengthen elite separation: real top-four clubs are not consistently ranking near the top.");
  }
  if (metrics.eliteRelegationRate > 0.03) {
    notes.push("Thin the disaster tail for elite clubs: relegation-level collapses are happening too often.");
  }
  if (metrics.eliteBottomHalfRate > 0.15) {
    notes.push("Reduce elite bottom-half frequency while still allowing rare historical collapses.");
  }
  if (metrics.bottomClubTitleRate > 0.02) {
    notes.push("Thin the miracle tail for bottom clubs: title-winning miracles are too common.");
  }
  if (metrics.bottomClubTopFourRate > 0.08) {
    notes.push("Reduce bottom-club European-place miracles without removing them completely.");
  }
  if (metrics.relegationConcentration < 0.45) {
    notes.push("Increase bottom-club risk: relegation probability is too widely distributed.");
  }

  if (!notes.length) notes.push("Monte Carlo distribution is broadly plausible for this calibration pass.");
  return notes;
}

export function calibrateMonteCarlo(monteCarloReport, pack, options = {}) {
  const actualRows = actualRowsFromPack(pack);
  const actualIndex = byIdentity(actualRows);
  const matched = [];
  const elitePlaces = Number(options.elitePlaces ?? 4);
  const relegationPlaces = Number(options.relegationPlaces ?? 3);
  const bottomStart = Math.max(1, actualRows.length - relegationPlaces + 1);

  for (const team of monteCarloReport.teams ?? []) {
    const actual = matchActual(team, actualIndex);
    if (!actual) continue;

    const enriched = {
      teamName: team.teamName,
      teamId: team.teamId,
      averagePosition: team.averagePosition,
      titleProbability: team.titleProbability,
      topFourProbability: team.topFourProbability,
      relegationProbability: team.relegationProbability,
      bestPosition: team.bestPosition,
      worstPosition: team.worstPosition,
      actualPosition: actual.position,
      positionError: team.averagePosition - actual.position,
      bottomHalfProbability: probabilityForPositions(team, (position) => position > matched.length / 2),
      topHalfProbability: probabilityForPositions(team, (position) => position <= matched.length / 2),
      topFourProbabilityFromCounts: probabilityForPositions(team, (position) => position <= elitePlaces),
      relegationProbabilityFromCounts: probabilityForPositions(team, (position) => position >= bottomStart),
      titleProbabilityFromCounts: probabilityForPositions(team, (position) => position === 1)
    };

    matched.push(enriched);
  }

  const leagueSize = matched.length;
  for (const team of matched) {
    team.bottomHalfProbability = probabilityForPositions(team, () => false);
    const sourceTeam = (monteCarloReport.teams ?? []).find((candidate) => candidate.teamId === team.teamId || candidate.teamName === team.teamName);
    team.bottomHalfProbability = probabilityForPositions(sourceTeam ?? {}, (position) => position > leagueSize / 2);
    team.topHalfProbability = probabilityForPositions(sourceTeam ?? {}, (position) => position <= leagueSize / 2);
  }

  const topActual = matched.filter((team) => team.actualPosition <= elitePlaces);
  const bottomActual = matched.filter((team) => team.actualPosition >= bottomStart);
  const titleConcentration = matched
    .filter((team) => team.actualPosition <= Number(options.titleContenderPlaces ?? 4))
    .reduce((sum, team) => sum + team.titleProbability, 0);
  const relegationConcentration = bottomActual.reduce((sum, team) => sum + team.relegationProbability, 0);
  const averagePositionError = mean(matched.map((team) => Math.abs(team.positionError)));
  const eliteAveragePositionError = mean(topActual.map((team) => Math.abs(team.positionError)));
  const eliteRelegationRate = mean(topActual.map((team) => team.relegationProbability));
  const eliteBottomHalfRate = mean(topActual.map((team) => team.bottomHalfProbability));
  const bottomClubTitleRate = mean(bottomActual.map((team) => team.titleProbability));
  const bottomClubTopFourRate = mean(bottomActual.map((team) => team.topFourProbability));
  const bottomClubTopHalfRate = mean(bottomActual.map((team) => team.topHalfProbability));

  const metrics = {
    teamsMatched: matched.length,
    titleConcentration: round(titleConcentration),
    relegationConcentration: round(relegationConcentration),
    averagePositionError: round(averagePositionError),
    eliteAveragePositionError: round(eliteAveragePositionError),
    eliteRelegationRate: round(eliteRelegationRate),
    eliteBottomHalfRate: round(eliteBottomHalfRate),
    bottomClubTitleRate: round(bottomClubTitleRate),
    bottomClubTopFourRate: round(bottomClubTopFourRate),
    bottomClubTopHalfRate: round(bottomClubTopHalfRate)
  };

  const subscores = {
    position: scoreFromError(metrics.averagePositionError, 8),
    elite: scoreFromError(metrics.eliteAveragePositionError, 8),
    titleConcentration: scoreFromError(Math.max(0, 0.45 - metrics.titleConcentration), 0.45),
    relegationConcentration: scoreFromError(Math.max(0, 0.55 - metrics.relegationConcentration), 0.55),
    eliteDisasterTail: scoreFromError(Math.max(0, metrics.eliteRelegationRate - 0.02), 0.12),
    eliteBottomHalfTail: scoreFromError(Math.max(0, metrics.eliteBottomHalfRate - 0.12), 0.3),
    bottomMiracleTail: scoreFromError(Math.max(0, metrics.bottomClubTitleRate - 0.01), 0.08),
    bottomTopFourTail: scoreFromError(Math.max(0, metrics.bottomClubTopFourRate - 0.05), 0.2)
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
    tailRisks: {
      elite: topActual.map((team) => ({
        teamName: team.teamName,
        bottomHalfProbability: team.bottomHalfProbability,
        relegationProbability: team.relegationProbability
      })),
      bottom: bottomActual.map((team) => ({
        teamName: team.teamName,
        titleProbability: team.titleProbability,
        topFourProbability: team.topFourProbability,
        topHalfProbability: team.topHalfProbability
      }))
    },
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
    `Elite relegation rate: ${calibration.metrics.eliteRelegationRate}`,
    `Elite bottom-half rate: ${calibration.metrics.eliteBottomHalfRate}`,
    `Bottom-club title rate: ${calibration.metrics.bottomClubTitleRate}`,
    `Bottom-club top-four rate: ${calibration.metrics.bottomClubTopFourRate}`,
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

  lines.push("", "Elite tail risk:", "Team                     BottomHalf Releg");
  for (const team of calibration.tailRisks.elite) {
    lines.push([
      team.teamName.padEnd(24, " "),
      `${Math.round(team.bottomHalfProbability * 100)}%`.padStart(10, " "),
      `${Math.round(team.relegationProbability * 100)}%`.padStart(5, " ")
    ].join(" "));
  }

  lines.push("", "Bottom-club miracle risk:", "Team                     Title Top4 TopHalf");
  for (const team of calibration.tailRisks.bottom) {
    lines.push([
      team.teamName.padEnd(24, " "),
      `${Math.round(team.titleProbability * 100)}%`.padStart(5, " "),
      `${Math.round(team.topFourProbability * 100)}%`.padStart(4, " "),
      `${Math.round(team.topHalfProbability * 100)}%`.padStart(7, " ")
    ].join(" "));
  }

  return lines.join("\n");
}
