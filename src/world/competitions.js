import { WORLD_CONFIG } from "./constants.js";
import { leagueRulesForDivision } from "./competitionRules.js";
import { createCupShells } from "./cups.js";

export function createCompetitionShells(world) {
  if (!world?.divisions || !world?.clubs) {
    throw new Error("createCompetitionShells requires a generated world.");
  }

  const leagues = world.divisions.map((division) => ({
    id: `league-d${division.level}-s${world.meta.season}`,
    type: "league",
    name: `Division ${division.level}`,
    season: world.meta.season,
    divisionLevel: division.level,
    clubIds: [...division.clubIds],
    rules: leagueRulesForDivision(
      division.level,
      WORLD_CONFIG.divisions,
      WORLD_CONFIG.clubsPerDivision
    )
  }));

  return [...leagues, ...createCupShells(world)];
}
