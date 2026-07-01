export function createSeasonCalendar(world) {
  if (!world?.meta?.season || !Array.isArray(world.divisions)) {
    throw new Error("createSeasonCalendar requires a generated world.");
  }

  const leagueTurns = 38;

  return {
    season: world.meta.season,
    cadence: {
      leagueTurnsPerWeek: 2,
      cupTurns: "between-league-turns"
    },
    phases: [
      { id: "pre-season", name: "Pre-season", order: 1 },
      { id: "league", name: "League season", order: 2, turns: leagueTurns },
      { id: "season-review", name: "Season review", order: 3 }
    ],
    leagueTurns: Array.from({ length: leagueTurns }, (_, index) => ({
      turn: index + 1,
      status: "planned",
      fixtureIds: []
    }))
  };
}
