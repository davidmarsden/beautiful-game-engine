export function leagueRulesForDivision(level, totalDivisions, clubsPerDivision) {
  return {
    clubs: clubsPerDivision,
    promoted: level === 1 ? 0 : 4,
    relegated: level === totalDivisions ? 0 : 4,
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForDefeat: 0
  };
}

export function cupRules(participants) {
  return {
    format: "cup-shell",
    participants
  };
}
