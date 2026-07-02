function blankRow(club) {
  return {
    teamId: club.id,
    teamName: club.name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0
  };
}

function sortRows(rows) {
  return rows.sort((a, b) =>
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.teamName.localeCompare(b.teamName)
  );
}

export function createLeagueTable(clubs) {
  return Object.fromEntries(Object.values(clubs).map((club) => [club.id, blankRow(club)]));
}

function applySide(row, goalsFor, goalsAgainst) {
  row.played += 1;
  row.goalsFor += goalsFor;
  row.goalsAgainst += goalsAgainst;
  row.goalDifference = row.goalsFor - row.goalsAgainst;

  if (goalsFor > goalsAgainst) {
    row.won += 1;
    row.points += 3;
  } else if (goalsFor === goalsAgainst) {
    row.drawn += 1;
    row.points += 1;
  } else {
    row.lost += 1;
  }
}

export function applyResultToTable(table, result) {
  const next = structuredClone(table);
  const home = next[result.homeTeamId];
  const away = next[result.awayTeamId];

  if (!home || !away) {
    throw new Error(`Cannot apply result for unknown teams: ${result.homeTeamId} vs ${result.awayTeamId}`);
  }

  applySide(home, result.score.home, result.score.away);
  applySide(away, result.score.away, result.score.home);

  return next;
}

export function tableRows(table) {
  return sortRows(Object.values(table).map((row) => ({ ...row })));
}
