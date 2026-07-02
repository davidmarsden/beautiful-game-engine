function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function uniquePlayerIds(lineup = {}) {
  return [...new Set((lineup.starters ?? []).map((starter) => String(starter.playerId)).filter(Boolean))];
}

function overlapRatio(previousIds, currentIds) {
  if (!previousIds.length || !currentIds.length) return 0;
  const previous = new Set(previousIds);
  const shared = currentIds.filter((id) => previous.has(id)).length;
  return shared / Math.max(previousIds.length, currentIds.length);
}

function formationKey(formation) {
  return String(formation ?? "4-3-3");
}

export function createCohesionState({ baseCohesion = 0.45, baseFamiliarity = 0.35 } = {}) {
  return {
    cohesion: Number(clamp(baseCohesion, 0, 1).toFixed(3)),
    familiarity: {},
    lastStartingIds: [],
    lastFormation: null,
    baseFamiliarity: Number(clamp(baseFamiliarity, 0, 1).toFixed(3)),
    matchesTracked: 0
  };
}

export function updateCohesionState(state, lineup, options = {}) {
  const next = structuredClone(state ?? createCohesionState());
  const currentIds = uniquePlayerIds(lineup);
  const formation = formationKey(lineup?.formation ?? options.formation);
  const continuity = overlapRatio(next.lastStartingIds, currentIds);
  const learningRate = Number(options.learningRate ?? 0.045);
  const churnRate = Number(options.churnRate ?? 0.035);
  const familiarityLearningRate = Number(options.familiarityLearningRate ?? 0.055);

  const cohesionDelta = next.matchesTracked === 0
    ? learningRate * 0.5
    : (continuity - 0.55) * learningRate - (1 - continuity) * churnRate * 0.35;

  next.cohesion = Number(clamp(next.cohesion + cohesionDelta, 0, 1).toFixed(3));
  next.familiarity[formation] = Number(clamp((next.familiarity[formation] ?? next.baseFamiliarity) + familiarityLearningRate, 0, 1).toFixed(3));

  for (const knownFormation of Object.keys(next.familiarity)) {
    if (knownFormation !== formation) {
      next.familiarity[knownFormation] = Number(clamp(next.familiarity[knownFormation] - 0.01, 0, 1).toFixed(3));
    }
  }

  next.lastStartingIds = currentIds;
  next.lastFormation = formation;
  next.matchesTracked += 1;

  return next;
}

export function cohesionMatchModifier(state, formation) {
  const safeState = state ?? createCohesionState();
  const familiarity = safeState.familiarity?.[formationKey(formation)] ?? safeState.baseFamiliarity ?? 0.35;
  const cohesion = safeState.cohesion ?? 0.45;

  return {
    cohesion: Number(cohesion.toFixed(3)),
    familiarity: Number(familiarity.toFixed(3)),
    attack: Number(((cohesion - 0.5) * 0.08 + (familiarity - 0.5) * 0.05).toFixed(3)),
    defence: Number(((cohesion - 0.5) * 0.10 + (familiarity - 0.5) * 0.04).toFixed(3)),
    reliability: Number(clamp(0.5 + cohesion * 0.3 + familiarity * 0.2, 0, 1).toFixed(3))
  };
}

export function applyCohesionModifierToXg(xg, { homeState = null, awayState = null, homeFormation = null, awayFormation = null } = {}) {
  const home = cohesionMatchModifier(homeState, homeFormation);
  const away = cohesionMatchModifier(awayState, awayFormation);

  return {
    home: Number(clamp(xg.home * (1 + home.attack - away.defence), 0.15, 5).toFixed(2)),
    away: Number(clamp(xg.away * (1 + away.attack - home.defence), 0.15, 5).toFixed(2)),
    modifiers: { home, away }
  };
}
