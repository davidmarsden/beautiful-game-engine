import { getFormationSlots } from "./formations.js";
import { playerRating, playerRoles, roleFitScore } from "./playerRoles.js";

function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return Number((clean.reduce((sum, value) => sum + value, 0) / clean.length).toFixed(1));
}

function bestAvailableForSlot(players, selectedIds, slot) {
  return players
    .filter((player) => !selectedIds.has(player.id))
    .map((player) => ({
      player,
      slot,
      fitScore: roleFitScore(player, slot),
      rating: playerRating(player)
    }))
    .sort((a, b) => b.fitScore - a.fitScore || b.rating - a.rating || String(a.player.id).localeCompare(String(b.player.id)))[0] ?? null;
}

function selectBench(players, selectedIds, size) {
  return players
    .filter((player) => !selectedIds.has(player.id))
    .map((player) => ({
      player,
      rating: playerRating(player),
      roles: playerRoles(player)
    }))
    .sort((a, b) => b.rating - a.rating || String(a.player.id).localeCompare(String(b.player.id)))
    .slice(0, size);
}

function pickCaptain(starters) {
  return starters
    .map((starter) => starter.player)
    .sort((a, b) => {
      const ageGap = Number(b.age ?? 0) - Number(a.age ?? 0);
      if (ageGap !== 0) return ageGap;
      return playerRating(b) - playerRating(a);
    })[0] ?? null;
}

function pickSetPieceTaker(starters) {
  return starters
    .map((starter) => starter.player)
    .sort((a, b) => playerRating(b) - playerRating(a))[0] ?? null;
}

export function selectLineup(players, options = {}) {
  if (!Array.isArray(players)) throw new Error("selectLineup requires a player array.");

  const formation = options.formation ?? "4-3-3";
  const benchSize = Number(options.benchSize ?? 7);
  const slots = getFormationSlots(formation);
  const selectedIds = new Set();
  const starters = [];

  for (const slot of slots) {
    const selected = bestAvailableForSlot(players, selectedIds, slot);
    if (!selected) {
      throw new Error(`Not enough players to fill ${formation}.`);
    }
    selectedIds.add(selected.player.id);
    starters.push(selected);
  }

  const bench = selectBench(players, selectedIds, benchSize);
  const captain = pickCaptain(starters);
  const setPieceTaker = pickSetPieceTaker(starters);

  return {
    formation,
    starters: starters.map((starter, index) => ({
      slot: starter.slot,
      order: index + 1,
      playerId: starter.player.id,
      name: starter.player.name,
      rating: starter.rating,
      fitScore: starter.fitScore,
      roles: playerRoles(starter.player)
    })),
    bench: bench.map((benchPlayer, index) => ({
      order: index + 1,
      playerId: benchPlayer.player.id,
      name: benchPlayer.player.name,
      rating: benchPlayer.rating,
      roles: benchPlayer.roles
    })),
    captain: captain ? { playerId: captain.id, name: captain.name } : null,
    setPieces: {
      penalties: setPieceTaker ? { playerId: setPieceTaker.id, name: setPieceTaker.name } : null,
      freeKicks: setPieceTaker ? { playerId: setPieceTaker.id, name: setPieceTaker.name } : null,
      corners: setPieceTaker ? { playerId: setPieceTaker.id, name: setPieceTaker.name } : null
    },
    strength: {
      startingXI: average(starters.map((starter) => starter.rating)),
      roleFit: average(starters.map((starter) => starter.fitScore)),
      bench: average(bench.map((benchPlayer) => benchPlayer.rating))
    }
  };
}
