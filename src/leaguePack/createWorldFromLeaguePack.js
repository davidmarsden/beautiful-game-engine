import { validateLeaguePack } from "./validateLeaguePack.js";

export function createWorldFromLeaguePack(pack, options = {}) {
  validateLeaguePack(pack);

  return {
    meta: {
      source: "league-pack",
      leaguePackVersion: pack.meta.version,
      season: options.season ?? pack.meta.source?.season ?? null,
      league: options.league ?? pack.meta.source?.league ?? null,
      createdAt: options.createdAt ?? new Date().toISOString(),
      packSource: pack.meta.source
    },
    clubs: Object.values(pack.clubs),
    players: Object.values(pack.players),
    managerSlots: pack.managerSlots,
    fixtures: pack.fixtures,
    standings: pack.standings
  };
}
