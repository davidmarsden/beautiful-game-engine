function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return Number((clean.reduce((sum, value) => sum + value, 0) / clean.length).toFixed(1));
}

export function summariseLeaguePack(pack) {
  const clubs = Object.values(pack.clubs);
  const players = Object.values(pack.players);
  const managerSlots = Object.values(pack.managerSlots);

  return {
    version: pack.meta.version,
    source: pack.meta.source,
    clubs: clubs.length,
    players: players.length,
    fixtures: pack.fixtures.length,
    standings: pack.standings.length,
    managerSlots: managerSlots.length,
    vacantManagerSlots: managerSlots.filter((slot) => slot.status === "vacant").length,
    averageClubOverall: average(clubs.map((club) => club.squad?.overall)),
    strongestClub: clubs
      .filter((club) => Number.isFinite(club.squad?.overall))
      .sort((a, b) => b.squad.overall - a.squad.overall)[0]?.name ?? null
  };
}
