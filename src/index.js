import { getGovernanceCompatibility } from "./governance/compatibility.js";
import { averageClubRating } from "./ratings/index.js";
import { generateWorld } from "./world/generateWorld.js";
import { createSeasonShell } from "./world/seasonShell.js";
import { validateWorld } from "./world/validateWorld.js";

export {
  calibrateLeagueTable,
  calibrateMonteCarlo,
  calibrateSeasonDistribution,
  formatCalibrationReport,
  formatMonteCarloCalibration,
  formatSeasonDistributionReport
} from "./calibration/index.js";
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
  formatMonteCarloReport,
  runMonteCarloSeason
} from "./monteCarlo/index.js";
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
export {
  calibrateSmwRatings,
  formatSmwRatingCalibration
} from "./ratingCalibration/index.js";
export {
  buildRatingExplorer,
  formatRatingExplorer
} from "./ratingExplorer/index.js";
export { findFixtureByTeams } from "./realMatch/index.js";
export {
  applyResultToTable,
  buildSeasonReport,
  createLeagueTable,
  createSeasonState,
  formatLeagueTable,
  formatSeasonReport,
  processNextFixture,
  seasonSummary,
  simulateSeason,
  tableRows
} from "./season/index.js";
export {
  applyTacticalModifiersToXg,
  tacticalIdentityFromManagerProfile,
  tacticalModifier
} from "./tactics/index.js";
export {
  DEFAULT_SQUAD_RULES,
  assignSquadsToClubs
} from "./squadAssignment/assignSquads.js";
export { runSnakeDraft } from "./squadAssignment/snakeDraft.js";
export { assignRealClubSquads } from "./squadAssignment/realClubAssignment.js";
export {
  CLUB_IMPORTANCE,
  DEFAULT_CONTINENT_TARGETS,
  clubImportanceFor,
  selectGlobalImportanceClubs
} from "./squadAssignment/globalClubImportance.js";
export { allocateManagerClubs } from "./clubAllocation/allocateManagerClubs.js";
export { averageClubRating } from "./ratings/index.js";
export { generateWorld } from "./world/generateWorld.js";
export { createSeasonShell } from "./world/seasonShell.js";
export { validateWorld } from "./world/validateWorld.js";
export {
  DEFAULT_LOAN_ELIGIBILITY_RULES,
  fixtureOpponentClubId,
  isLoanPlayerEligibleForFixture,
  loanEligibility,
  parentClubRestrictionEnabled
} from "./world/loanEligibility.js";
export {
  buildWorldStateFromPlayerPools,
  summariseWorldState
} from "./worldState/buildWorldState.js";
export {
  validateTbgPlayer,
  validateTbgPlayers
} from "./worldState/validateTbgPlayer.js";
export {
  buildWorldFoundation,
  summariseWorldFoundation,
  WORLD_CONTRACT_VERSION,
  WORLD_FOUNDATION_VERSION
} from "./worldFoundation/buildWorldFoundation.js";

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
