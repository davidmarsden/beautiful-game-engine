import { getFormationSlots } from "../lineups/formations.js";
import { playerRating, playerRoles, roleFitScore } from "../lineups/playerRoles.js";
import { selectLineup } from "../lineups/selectLineup.js";

function byId(players) {
  return Object.fromEntries(players.map((player) => [player.id, player]));
}

function normalisePlan(plan = {}) {
  return {
    managerId: plan.managerId ?? null,
    controllerType: plan.controllerType ?? "ai",
    formation: plan.formation ?? "4-3-3",
    starters: Array.isArray(plan.starters) ? plan.starters : null,
    bench: Array.isArray(plan.bench) ? plan.bench : null,
    captain: plan.captain ?? null,
    setPieces: plan.setPieces ?? null,
    tacticalIntent: plan.tacticalIntent ?? "balanced"
  };
}

function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return Number((clean.reduce((sum, value) => sum + value, 0) / clean.length).toFixed(1));
}

function validateUnique(ids, label) {
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${label} contains duplicate player ${id}.`);
    seen.add(id);
  }
}

function hydrateSelectedPlayer({ player, slot, order }) {
  const rating = playerRating(player);
  return {
    slot,
    order,
    playerId: player.id,
    name: player.name,
    rating,
    fitScore: roleFitScore(player, slot),
    roles: playerRoles(player)
  };
}

function buildManualLineup(players, plan) {
  const formationSlots = getFormationSlots(plan.formation);
  const playersById = byId(players);
  const starterIds = plan.starters ?? [];
  const benchIds = plan.bench ?? [];

  if (starterIds.length !== 11) {
    throw new Error("Manual manager plan must include exactly 11 starters.");
  }

  validateUnique([...starterIds, ...benchIds], "Manual manager plan");

  const starters = starterIds.map((playerId, index) => {
    const player = playersById[playerId];
    if (!player) throw new Error(`Manual manager plan references unknown starter ${playerId}.`);
    return hydrateSelectedPlayer({ player, slot: formationSlots[index], order: index + 1 });
  });

  const bench = benchIds.map((playerId, index) => {
    const player = playersById[playerId];
    if (!player) throw new Error(`Manual manager plan references unknown bench player ${playerId}.`);
    return {
      order: index + 1,
      playerId: player.id,
      name: player.name,
      rating: playerRating(player),
      roles: playerRoles(player)
    };
  });

  const captainPlayer = playersById[plan.captain] ?? playersById[starterIds[0]] ?? null;

  return {
    formation: plan.formation,
    starters,
    bench,
    captain: captainPlayer ? { playerId: captainPlayer.id, name: captainPlayer.name } : null,
    setPieces: plan.setPieces ?? {
      penalties: captainPlayer ? { playerId: captainPlayer.id, name: captainPlayer.name } : null,
      freeKicks: captainPlayer ? { playerId: captainPlayer.id, name: captainPlayer.name } : null,
      corners: captainPlayer ? { playerId: captainPlayer.id, name: captainPlayer.name } : null
    },
    strength: {
      startingXI: average(starters.map((starter) => starter.rating)),
      roleFit: average(starters.map((starter) => starter.fitScore)),
      bench: average(bench.map((benchPlayer) => benchPlayer.rating))
    }
  };
}

export function resolveManagerPlan({ players, submittedPlan = null, fallbackFormation = "4-3-3", benchSize = 7 }) {
  const plan = normalisePlan(submittedPlan ?? { formation: fallbackFormation });
  const isManual = Array.isArray(plan.starters);

  const lineup = isManual
    ? buildManualLineup(players, plan)
    : selectLineup(players, { formation: plan.formation, benchSize });

  return {
    managerId: plan.managerId,
    controllerType: plan.controllerType,
    source: isManual ? "human-submitted" : "ai-generated",
    tacticalIntent: plan.tacticalIntent,
    formation: lineup.formation,
    lineup
  };
}
