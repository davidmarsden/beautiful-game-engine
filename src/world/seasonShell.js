export function createSeasonShell(world) {
  if (!world || !Array.isArray(world.divisions)) {
    throw new Error("createSeasonShell requires a generated world.");
  }

  return {
    season: world.meta.season,
    divisions: world.divisions.map((division) => {
      const clubCount = division.clubIds.length;
      return {
        divisionId: division.id,
        clubCount,
        matchdays: (clubCount - 1) * 2,
        totalFixtures: clubCount * (clubCount - 1)
      };
    })
  };
}
