function round(value) {
  return Number(Number(value ?? 0).toFixed(2));
}

function fixtureScore(fixture) {
  const home = Number(fixture.score?.home ?? fixture.goals?.home ?? fixture.teams?.home?.goals ?? 0);
  const away = Number(fixture.score?.away ?? fixture.goals?.away ?? fixture.teams?.away?.goals ?? 0);
  return { home, away };
}

function actualFixtureRows(pack) {
  return (pack.fixtures ?? []).filter((fixture) => {
    const status = String(fixture.status?.short ?? fixture.status ?? "").toUpperCase();
    return !status || status === "FT" || status === "AET" || status === "PEN";
  });
}

function statsFromFixtures(fixtures) {
  const totals = {
    fixtures: 0,
    goals: 0,
    homeGoals: 0,
    awayGoals: 0,
    homeWins: 0,
    draws: 0,
    awayWins: 0,
    over25: 0,
    bothTeamsScored: 0,
    cleanSheets: 0,
    biggestWins: []
  };

  for (const fixture of fixtures) {
    const score = fixtureScore(fixture);
    const goals = score.home + score.away;
    const margin = Math.abs(score.home - score.away);

    totals.fixtures += 1;
    totals.goals += goals;
    totals.homeGoals += score.home;
    totals.awayGoals += score.away;
    if (score.home > score.away) totals.homeWins += 1;
    else if (score.home === score.away) totals.draws += 1;
    else totals.awayWins += 1;
    if (goals > 2.5) totals.over25 += 1;
    if (score.home > 0 && score.away > 0) totals.bothTeamsScored += 1;
    if (score.home === 0 || score.away === 0) totals.cleanSheets += 1;

    totals.biggestWins.push({
      fixtureId: fixture.fixtureId ?? fixture.id,
      homeTeamName: fixture.homeTeamName ?? fixture.home?.name ?? fixture.teams?.home?.name ?? fixture.homeTeamId,
      awayTeamName: fixture.awayTeamName ?? fixture.away?.name ?? fixture.teams?.away?.name ?? fixture.awayTeamId,
      score,
      margin
    });
  }

  totals.biggestWins = totals.biggestWins
    .sort((a, b) => b.margin - a.margin || (b.score.home + b.score.away) - (a.score.home + a.score.away))
    .slice(0, 5);

  return {
    fixtures: totals.fixtures,
    goals: totals.goals,
    goalsPerMatch: round(totals.fixtures ? totals.goals / totals.fixtures : 0),
    homeGoals: totals.homeGoals,
    awayGoals: totals.awayGoals,
    homeGoalsPerMatch: round(totals.fixtures ? totals.homeGoals / totals.fixtures : 0),
    awayGoalsPerMatch: round(totals.fixtures ? totals.awayGoals / totals.fixtures : 0),
    homeWins: totals.homeWins,
    draws: totals.draws,
    awayWins: totals.awayWins,
    homeWinRate: round(totals.fixtures ? totals.homeWins / totals.fixtures : 0),
    drawRate: round(totals.fixtures ? totals.draws / totals.fixtures : 0),
    awayWinRate: round(totals.fixtures ? totals.awayWins / totals.fixtures : 0),
    over25: totals.over25,
    over25Rate: round(totals.fixtures ? totals.over25 / totals.fixtures : 0),
    bothTeamsScored: totals.bothTeamsScored,
    bothTeamsScoredRate: round(totals.fixtures ? totals.bothTeamsScored / totals.fixtures : 0),
    cleanSheets: totals.cleanSheets,
    cleanSheetRate: round(totals.fixtures ? totals.cleanSheets / totals.fixtures : 0),
    biggestWins: totals.biggestWins
  };
}

function diffStats(simulated, actual) {
  return {
    goals: simulated.goals - actual.goals,
    goalsPerMatch: round(simulated.goalsPerMatch - actual.goalsPerMatch),
    homeWinRate: round(simulated.homeWinRate - actual.homeWinRate),
    drawRate: round(simulated.drawRate - actual.drawRate),
    awayWinRate: round(simulated.awayWinRate - actual.awayWinRate),
    over25Rate: round(simulated.over25Rate - actual.over25Rate),
    bothTeamsScoredRate: round(simulated.bothTeamsScoredRate - actual.bothTeamsScoredRate),
    cleanSheetRate: round(simulated.cleanSheetRate - actual.cleanSheetRate)
  };
}

export function calibrateSeasonDistribution(replay, pack) {
  const simulated = statsFromFixtures(replay.results ?? []);
  const actual = statsFromFixtures(actualFixtureRows(pack));

  return {
    simulated,
    actual,
    difference: diffStats(simulated, actual)
  };
}

export function formatSeasonDistributionReport(calibration) {
  const { simulated, actual, difference } = calibration;
  return [
    "",
    "# Season Distribution",
    "Metric                 Sim Actual Diff",
    `Goals                 ${String(simulated.goals).padStart(4, " ")} ${String(actual.goals).padStart(6, " ")} ${String(difference.goals).padStart(5, " ")}`,
    `Goals/match           ${String(simulated.goalsPerMatch).padStart(4, " ")} ${String(actual.goalsPerMatch).padStart(6, " ")} ${String(difference.goalsPerMatch).padStart(5, " ")}`,
    `Home win rate         ${String(simulated.homeWinRate).padStart(4, " ")} ${String(actual.homeWinRate).padStart(6, " ")} ${String(difference.homeWinRate).padStart(5, " ")}`,
    `Draw rate             ${String(simulated.drawRate).padStart(4, " ")} ${String(actual.drawRate).padStart(6, " ")} ${String(difference.drawRate).padStart(5, " ")}`,
    `Away win rate         ${String(simulated.awayWinRate).padStart(4, " ")} ${String(actual.awayWinRate).padStart(6, " ")} ${String(difference.awayWinRate).padStart(5, " ")}`,
    `Over 2.5 rate         ${String(simulated.over25Rate).padStart(4, " ")} ${String(actual.over25Rate).padStart(6, " ")} ${String(difference.over25Rate).padStart(5, " ")}`,
    `BTTS rate             ${String(simulated.bothTeamsScoredRate).padStart(4, " ")} ${String(actual.bothTeamsScoredRate).padStart(6, " ")} ${String(difference.bothTeamsScoredRate).padStart(5, " ")}`,
    `Clean sheet rate      ${String(simulated.cleanSheetRate).padStart(4, " ")} ${String(actual.cleanSheetRate).padStart(6, " ")} ${String(difference.cleanSheetRate).padStart(5, " ")}`
  ].join("\n");
}
