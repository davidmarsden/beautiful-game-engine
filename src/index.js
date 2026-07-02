import { getGovernanceCompatibility } from "./governance/compatibility.js";
import { averageClubRating } from "./ratings/index.js";
import { generateWorld } from "./world/generateWorld.js";
import { createSeasonShell } from "./world/seasonShell.js";
import { validateWorld } from "./world/validateWorld.js";

export {
  applyCohesionModifierToXg,
  cohesionMatchModifier,
  createCohesionState,
  updateCohesionState
} from "./cohesion/index.js";
export {
  GOVERNANCE_COMPATIBILITY,
  getGovernanceCompatibility
} from "./governance/compatibility.js";
export {
  createWorldFromLeaguePack,
  loadLeaguePack,
  loadLeaguePackFromObject,
  summariseLeaguePack,
  validateLeaguePack
} from "./leaguePack/index.js";
export {
  FORMATIONS,
  getFormationSlots,
  playerRating,
  playerRoles,
  roleFitScore,
  selectLineup
} from "./lineups/index.js";
export { resolveManagerPlan } from "./managers/index.js";
export { buildManagerProfilesFromFixtureDetails } from "./managerIntelligence/index.js";
export { expectedGoals, simulateFixture } from "./match/index.js";
export {
  availabilityReason,
  availabilityStatus,
  effectiveRatingWithFatigue,
  fatigueFromMinutes,
  fatigueRatingAdjustment,
  isPlayerAvailable,
  recoverFatigue,
  recoveryRateForAge,
  updateFatigueAfterMatch
} from "./playerCondition/index.js";
export { findFixtureByTeams } from "./realMatch/index.js";
export {
  applyTacticalModifiersToXg,
  tacticalIdentityFromManagerProfile,
  tacticalModifier
} from "./tactics/index.js";
export { averageClubRating } from "./ratings/index.js";
export { generateWorld } from "./world/generateWorld.js";
export { createSeasonShell } from "./world/seasonShell.js";
export { validateWorld } from "./world/validateWorld.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  const world = generateWorld({ seed: "demo", season: 1 });
  const shell = createSeasonShell(world);

  console.log(JSON.stringify({
    seed: world.meta.seed,
    clubs: world.clubs.length,
    divisions: world.divisions.length,
    squads: world.squads.length,
    managerSlots: world.managerSlots.length,
    competitions: world.competitions.length,
    calendarTurns: world.calendar.leagueTurns.length,
    valid: validateWorld(world),
    governance: getGovernanceCompatibility(),
    averageRating: averageClubRating(world.clubs),
    seasonShell: shell.divisions
  }, null, 2));
}
