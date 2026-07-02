import { getFormationSlots } from "./formations.js";
import { playerRating, playerRoles, roleFitScore } from "./playerRoles.js";

function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return Number((clean.reduce((sum, value) => sum + value, 0) / clean.length).toFixed(1));
}

function syntheticPositionForSlot(slot) {
  if (slot === "GK") return "Goalkeeper";
  if (["CB", "RB", "LB", "RWB", "LWB"].includes(slot)) return "Defender";
  if (["ST"].includes(slot)) return "Attacker";
  if (["RW", "LW", "RM", "LM"].includes(slot)) return "Winger";
  return "Midfielder";
}

function createSyntheticPlayer({ slot, index, baseRating }) {
  return {
    id: `synthetic-${slot.toLowerCase()}-${index}`,
    name: `Synthetic ${slot} ${index}`,
    age: 21,
    position: syntheticPositionForSlot(slot),
    synthetic: true,
    ratings: {
      ability: baseRating,
      effectiveMatchRating: baseRating
    }
  };
}

function expandPartialSquad(players, slots, { allowSynthetic = false, syntheticBaseRating = 65 }) {
  if (!allowSynthetic || players.length >= slots.length) return players;

  const expanded = [...players];
  let syntheticIndex = 1;

  while (expanded.length < slots.length) {
    const slot = slots[expanded.length];
    expanded.push(createSyntheticPlayer({ slot, index: syntheticIndex, baseRating: syntheticBaseRating }));
    syntheticIndex += 1;
  }

  return expanded;
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
  const expandedPlayers = expandPartialSquad(players, slots, {
    allowSynthetic: options.allowSynthetic ?? false,
    syntheticBaseRating: Number(options.syntheticBaseRating ?? 65)
  });
  const selectedIds = new Set();
  const starters = [];

  for (const slot of slots) {
    const selected = bestAvailableForSlot(expandedPlayers, selectedIds, slot);
    if (!selected) {
      throw new Error(`Not enough players to fill ${formation}.`);
    }
    selectedIds.add(selected.player.id);
    starters.push(selected);
  }

  const bench = selectBench(expandedPlayers, selectedIds, benchSize);
  const captain = pickCaptain(starters);
  const setPieceTaker = pickSetPieceTaker(starters);

  return {
    formation,
    syntheticPlayersUsed: starters.filter((starter) => starter.player.synthetic).length,
    starters: starters.map((starter, index) => ({
      slot: starter.slot,
      order: index + 1,
      playerId: starter.player.id,
      name: starter.player.name,
      rating: starter.rating,
      fitScore: starter.fitScore,
      roles: playerRoles(starter.player),
      synthetic: starter.player.synthetic === true
    })),
    bench: bench.map((benchPlayer, index) => ({
      order: index + 1,
      playerId: benchPlayer.player.id,
      name: benchPlayer.player.name,
      rating: benchPlayer.rating,
      roles: benchPlayer.roles,
      synthetic: benchPlayer.player.synthetic === true
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
