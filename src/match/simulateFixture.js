import { validateLeaguePack } from "../leaguePack/validateLeaguePack.js";
import { resolveManagerPlan } from "../managers/index.js";
import { createRng } from "../shared/rng.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function poisson(rng, lambda) {
  const limit = Math.exp(-lambda);
  let product = 1;
  let goals = 0;

  do {
    goals += 1;
    product *= rng();
  } while (product > limit);

  return goals - 1;
}

function clubStrength(club) {
  return Number(club.squad?.overall ?? club.squad?.startingStrength ?? 75);
}

function lineupStrength(lineup) {
  return Number(lineup.strength?.roleFit ?? lineup.strength?.startingXI ?? 75);
}

function expectedGoalsFromStrengths({ homeStrength, awayStrength }) {
  const strengthGap = homeStrength - awayStrength;

  return {
    home: Number(clamp(1.35 + 0.035 * strengthGap + 0.18, 0.25, 4.5).toFixed(2)),
    away: Number(clamp(1.20 - 0.035 * strengthGap, 0.20, 4.2).toFixed(2))
  };
}

function expectedGoals({ homeClub, awayClub, homeLineup = null, awayLineup = null }) {
  const homeStrength = homeLineup ? lineupStrength(homeLineup) : clubStrength(homeClub);
  const awayStrength = awayLineup ? lineupStrength(awayLineup) : clubStrength(awayClub);
  return expectedGoalsFromStrengths({ homeStrength, awayStrength });
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
  const homePlan = resolveFixturePlan(pack, homeClub, options.homePlan, options);
  const awayPlan = resolveFixturePlan(pack, awayClub, options.awayPlan, options);
  const homeLineup = homePlan?.lineup ?? null;
  const awayLineup = awayPlan?.lineup ?? null;
  const xg = expectedGoals({ homeClub, awayClub, homeLineup, awayLineup });
  const homeGoals = poisson(rng, xg.home);
  const awayGoals = poisson(rng, xg.away);

  return {
    fixtureId,
    seed,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    homeTeamName: homeClub.name,
    awayTeamName: awayClub.name,
    formation: homePlan?.formation ?? awayPlan?.formation ?? null,
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
    expectedGoals: xg,
    score: {
      home: homeGoals,
      away: awayGoals
    },
    outcome: outcome(homeGoals, awayGoals),
    summary: `${homeClub.name} ${homeGoals}-${awayGoals} ${awayClub.name}`
  };
}

export { expectedGoals, expectedGoalsFromStrengths };
