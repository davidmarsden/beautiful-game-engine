import { createRng } from "../shared/rng.js";
import { validateLeaguePack } from "../leaguePack/validateLeaguePack.js";

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

function expectedGoals({ homeClub, awayClub }) {
  const homeStrength = clubStrength(homeClub);
  const awayStrength = clubStrength(awayClub);
  const strengthGap = homeStrength - awayStrength;

  return {
    home: Number(clamp(1.35 + 0.035 * strengthGap + 0.18, 0.25, 4.5).toFixed(2)),
    away: Number(clamp(1.20 - 0.035 * strengthGap, 0.20, 4.2).toFixed(2))
  };
}

function outcome(homeGoals, awayGoals) {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
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
  const xg = expectedGoals({ homeClub, awayClub });
  const homeGoals = poisson(rng, xg.home);
  const awayGoals = poisson(rng, xg.away);

  return {
    fixtureId,
    seed,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    homeTeamName: homeClub.name,
    awayTeamName: awayClub.name,
    expectedGoals: xg,
    score: {
      home: homeGoals,
      away: awayGoals
    },
    outcome: outcome(homeGoals, awayGoals),
    summary: `${homeClub.name} ${homeGoals}-${awayGoals} ${awayClub.name}`
  };
}

export { expectedGoals };
