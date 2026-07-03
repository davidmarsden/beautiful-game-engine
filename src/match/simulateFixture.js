import { validateLeaguePack } from "../leaguePack/validateLeaguePack.js";
import { resolveManagerPlan } from "../managers/index.js";
import { createRng } from "../shared/rng.js";
import { applyTacticalModifiersToXg } from "../tactics/index.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function poisson(rng, lambda, varianceScale = 1) {
  const scaledLambda = lambda * varianceScale;
  const limit = Math.exp(-scaledLambda);
  let product = 1;
  let goals = 0;

  do {
    goals += 1;
    product *= rng();
  } while (product > limit);

  return Math.round((goals - 1) / varianceScale);
}

function clubStrength(club) {
  return Number(club.squad?.overall ?? club.squad?.startingStrength ?? 75);
}

function lineupStrength(lineup) {
  return Number(lineup.strength?.startingXI ?? lineup.strength?.roleFit ?? 75);
}

function calibrationOptions(options = {}) {
  return {
    baseHomeXg: Number(options.baseHomeXg ?? 1.38),
    baseAwayXg: Number(options.baseAwayXg ?? 1.14),
    homeAdvantageXg: Number(options.homeAdvantageXg ?? 0.2),
    strengthGapFactor: Number(options.strengthGapFactor ?? 0.075),
    favouriteSuppressionFactor: Number(options.favouriteSuppressionFactor ?? 0.025),
    minHomeXg: Number(options.minHomeXg ?? 0.25),
    maxHomeXg: Number(options.maxHomeXg ?? 4.8),
    minAwayXg: Number(options.minAwayXg ?? 0.18),
    maxAwayXg: Number(options.maxAwayXg ?? 4.4),
    varianceScale: Number(options.varianceScale ?? 1.25)
  };
}

function expectedGoalsFromStrengths({ homeStrength, awayStrength }, options = {}) {
  const calibration = calibrationOptions(options);
  const strengthGap = homeStrength - awayStrength;
  const favouriteBoost = Math.max(0, strengthGap) * calibration.favouriteSuppressionFactor;
  const awayFavouriteBoost = Math.max(0, -strengthGap) * calibration.favouriteSuppressionFactor;

  return {
    home: Number(clamp(
      calibration.baseHomeXg + calibration.homeAdvantageXg + calibration.strengthGapFactor * strengthGap + favouriteBoost,
      calibration.minHomeXg,
      calibration.maxHomeXg
    ).toFixed(2)),
    away: Number(clamp(
      calibration.baseAwayXg - calibration.strengthGapFactor * strengthGap + awayFavouriteBoost,
      calibration.minAwayXg,
      calibration.maxAwayXg
    ).toFixed(2))
  };
}

function expectedGoals({ homeClub, awayClub, homeLineup = null, awayLineup = null, homeTactics = null, awayTactics = null, calibration = {} }) {
  const homeStrength = homeLineup ? lineupStrength(homeLineup) : clubStrength(homeClub);
  const awayStrength = awayLineup ? lineupStrength(awayLineup) : clubStrength(awayClub);
  const base = expectedGoalsFromStrengths({ homeStrength, awayStrength }, calibration);
  if (!homeTactics && !awayTactics) return base;
  return applyTacticalModifiersToXg(base, { homeIdentity: homeTactics, awayIdentity: awayTactics });
}

function outcome(homeGoals, awayGoals) {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

function clubPlayers(pack, club) {
  return Object.values(pack.players).filter((player) => player.team?.providerTeamId === club.source?.providerTeamId);
}

function resolveFixturePlan(pack, club, submittedPlan, options) {
  const shouldResolve = options.useLineups || submittedPlan;
  if (!shouldResolve) return null;

  return resolveManagerPlan({
    players: clubPlayers(pack, club),
    submittedPlan,
    fallbackFormation: options.formation ?? "4-3-3",
    benchSize: options.benchSize ?? 7,
    allowSynthetic: options.allowSynthetic ?? false,
    syntheticBaseRating: Number(options.syntheticBaseRating ?? 65)
  });
}

export function simulateFixture(pack, fixtureId, options = {}) {
  validateLeaguePack(pack);

  const fixture = pack.fixtures.find((candidate) => candidate.id === fixtureId);
  if (!fixture) {
    throw new Error(`Fixture not found: ${fixtureId}`);
  }

  const homeClub = pack.clubs[fixture.homeTeamId];
  const awayClub = pack.clubs[fixture.awayTeamId];

  if (!homeClub || !awayClub) {
    throw new Error(`Fixture ${fixtureId} references unknown clubs.`);
  }

  const seed = options.seed ?? `${fixtureId}:default`;
  const rng = createRng(seed);
  const calibration = calibrationOptions(options.calibration ?? options);
  const homePlan = resolveFixturePlan(pack, homeClub, options.homePlan, options);
  const awayPlan = resolveFixturePlan(pack, awayClub, options.awayPlan, options);
  const homeLineup = homePlan?.lineup ?? null;
  const awayLineup = awayPlan?.lineup ?? null;
  const homeTactics = options.homeTactics ?? homePlan?.tacticalIdentity ?? null;
  const awayTactics = options.awayTactics ?? awayPlan?.tacticalIdentity ?? null;
  const xg = expectedGoals({ homeClub, awayClub, homeLineup, awayLineup, homeTactics, awayTactics, calibration });
  const homeGoals = poisson(rng, xg.home, calibration.varianceScale);
  const awayGoals = poisson(rng, xg.away, calibration.varianceScale);

  return {
    fixtureId,
    seed,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    homeTeamName: homeClub.name,
    awayTeamName: awayClub.name,
    formation: homePlan?.formation ?? awayPlan?.formation ?? null,
    tactics: homeTactics || awayTactics
      ? {
          home: homeTactics,
          away: awayTactics,
          modifiers: xg.modifiers ?? null
        }
      : null,
    syntheticPlayersUsed: {
      home: homeLineup?.syntheticPlayersUsed ?? 0,
      away: awayLineup?.syntheticPlayersUsed ?? 0
    },
    managerPlans: homePlan || awayPlan
      ? {
          home: homePlan,
          away: awayPlan
        }
      : null,
    lineups: homeLineup || awayLineup
      ? {
          home: homeLineup,
          away: awayLineup
        }
      : null,
    expectedGoals: {
      home: xg.home,
      away: xg.away
    },
    score: {
      home: homeGoals,
      away: awayGoals
    },
    outcome: outcome(homeGoals, awayGoals),
    summary: `${homeClub.name} ${homeGoals}-${awayGoals} ${awayClub.name}`
  };
}

export { expectedGoals, expectedGoalsFromStrengths };
