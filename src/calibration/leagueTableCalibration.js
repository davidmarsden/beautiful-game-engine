function normaliseName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&apos;/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function actualRowsFromPack(pack) {
  const rows = Array.isArray(pack.standings) ? pack.standings : [];
  return rows
    .map((row, index) => ({
      position: Number(row.position ?? row.rank ?? index + 1),
      teamId: row.teamId ?? row.id ?? row.team?.id ?? row.team?.teamId ?? null,
      teamName: row.teamName ?? row.name ?? row.team?.name ?? row.team?.teamName ?? null,
      played: Number(row.played ?? row.all?.played ?? row.games ?? 0),
      won: Number(row.won ?? row.all?.win ?? row.all?.won ?? 0),
      drawn: Number(row.drawn ?? row.draw ?? row.all?.draw ?? 0),
      lost: Number(row.lost ?? row.lose ?? row.all?.lose ?? row.all?.lost ?? 0),
      goalsFor: Number(row.goalsFor ?? row.goals?.for ?? row.all?.goals?.for ?? 0),
      goalsAgainst: Number(row.goalsAgainst ?? row.goals?.against ?? row.all?.goals?.against ?? 0),
      goalDifference: Number(row.goalDifference ?? row.goalsDiff ?? row.goals?.diff ?? 0),
      points: Number(row.points ?? 0)
    }))
    .filter((row) => row.teamName || row.teamId)
    .sort((a, b) => a.position - b.position);
}

function simulatedRowsFromReplay(replay) {
  return replay.summary.table.map((row, index) => ({ position: index + 1, ...row }));
}

function indexRows(rows) {
  const byTeamId = new Map();
  const byName = new Map();

  for (const row of rows) {
    if (row.teamId) byTeamId.set(String(row.teamId), row);
    if (row.teamName) byName.set(normaliseName(row.teamName), row);
  }

  return { byTeamId, byName };
}

function matchActualRow(simulatedRow, actualIndex) {
  if (simulatedRow.teamId && actualIndex.byTeamId.has(String(simulatedRow.teamId))) {
    return actualIndex.byTeamId.get(String(simulatedRow.teamId));
  }

  return actualIndex.byName.get(normaliseName(simulatedRow.teamName)) ?? null;
}

function mean(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return Number((clean.reduce((sum, value) => sum + value, 0) / clean.length).toFixed(2));
}

function rootMeanSquare(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return Number(Math.sqrt(clean.reduce((sum, value) => sum + value ** 2, 0) / clean.length).toFixed(2));
}

export function calibrateLeagueTable(replay, pack) {
  const actualRows = actualRowsFromPack(pack);
  const simulatedRows = simulatedRowsFromReplay(replay);
  const actualIndex = indexRows(actualRows);
  const teams = [];

  for (const simulated of simulatedRows) {
    const actual = matchActualRow(simulated, actualIndex);
    if (!actual) continue;

    teams.push({
      teamId: simulated.teamId,
      teamName: simulated.teamName,
      simulated: {
        position: simulated.position,
        points: simulated.points,
        goalsFor: simulated.goalsFor,
        goalsAgainst: simulated.goalsAgainst,
        goalDifference: simulated.goalDifference
      },
      actual: {
        position: actual.position,
        points: actual.points,
        goalsFor: actual.goalsFor,
        goalsAgainst: actual.goalsAgainst,
        goalDifference: actual.goalDifference
      },
      error: {
        position: simulated.position - actual.position,
        points: simulated.points - actual.points,
        goalsFor: simulated.goalsFor - actual.goalsFor,
        goalsAgainst: simulated.goalsAgainst - actual.goalsAgainst,
        goalDifference: simulated.goalDifference - actual.goalDifference
      }
    });
  }

  const positionErrors = teams.map((team) => team.error.position);
  const pointsErrors = teams.map((team) => team.error.points);
  const goalsForErrors = teams.map((team) => team.error.goalsFor);
  const goalsAgainstErrors = teams.map((team) => team.error.goalsAgainst);

  return {
    teamsMatched: teams.length,
    teamsExpected: simulatedRows.length,
    metrics: {
      meanAbsolutePositionError: mean(positionErrors.map(Math.abs)),
      rootMeanSquarePositionError: rootMeanSquare(positionErrors),
      meanAbsolutePointsError: mean(pointsErrors.map(Math.abs)),
      rootMeanSquarePointsError: rootMeanSquare(pointsErrors),
      meanAbsoluteGoalsForError: mean(goalsForErrors.map(Math.abs)),
      meanAbsoluteGoalsAgainstError: mean(goalsAgainstErrors.map(Math.abs))
    },
    biggestPositionMisses: [...teams]
      .sort((a, b) => Math.abs(b.error.position) - Math.abs(a.error.position) || a.teamName.localeCompare(b.teamName))
      .slice(0, 5),
    teams
  };
}

export function formatCalibrationReport(calibration) {
  const lines = [
    "",
    "# Calibration",
    `Teams matched: ${calibration.teamsMatched}/${calibration.teamsExpected}`,
    `Mean absolute position error: ${calibration.metrics.meanAbsolutePositionError}`,
    `RMSE position error: ${calibration.metrics.rootMeanSquarePositionError}`,
    `Mean absolute points error: ${calibration.metrics.meanAbsolutePointsError}`,
    `RMSE points error: ${calibration.metrics.rootMeanSquarePointsError}`,
    `Mean absolute goals-for error: ${calibration.metrics.meanAbsoluteGoalsForError}`,
    `Mean absolute goals-against error: ${calibration.metrics.meanAbsoluteGoalsAgainstError}`,
    "",
    "Biggest position misses:",
    "Team                     Sim Actual Diff"
  ];

  for (const team of calibration.biggestPositionMisses) {
    lines.push([
      team.teamName.padEnd(24, " "),
      String(team.simulated.position).padStart(3, " "),
      String(team.actual.position).padStart(6, " "),
      String(team.error.position).padStart(4, " ")
    ].join(" "));
  }

  return lines.join("\n");
}
