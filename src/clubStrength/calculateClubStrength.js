const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));

export const CLUB_STRENGTH_MODEL_VERSION = "tbg-club-strength-v0.1";

export const DEFAULT_STRENGTH_WEIGHTS = Object.freeze({
  best_xi: 0.62,
  first_team_depth: 0.22,
  positional_balance: 0.10,
  youth_depth: 0.04,
  goalkeeper_security: 0.02
});

const POSITION_TARGETS = Object.freeze({ GK: 1, DEF: 4, MID: 3, ATT: 3 });

function playerRating(player) {
  return number(player.effective_match_rating ?? player.underlying_ability_rating ?? player.tbg_rating, 0);
}

function sortPlayers(players) {
  return [...players].sort((a, b) => playerRating(b) - playerRating(a)
    || number(b.market_value_eur) - number(a.market_value_eur)
    || String(a.display_name).localeCompare(String(b.display_name)));
}

function average(players) {
  return players.length ? players.reduce((sum, player) => sum + playerRating(player), 0) / players.length : 0;
}

function selectBalancedXi(players) {
  const remaining = sortPlayers(players);
  const selected = [];
  for (const [group, target] of Object.entries(POSITION_TARGETS)) {
    const candidates = remaining.filter((player) => player.position_group === group).slice(0, target);
    selected.push(...candidates);
    for (const player of candidates) remaining.splice(remaining.indexOf(player), 1);
  }
  selected.push(...remaining.slice(0, Math.max(0, 11 - selected.length)));
  return sortPlayers(selected).slice(0, 11);
}

function positionalBalance(players) {
  const counts = players.reduce((memo, player) => {
    const group = player.position_group || "UNK";
    memo[group] = (memo[group] || 0) + 1;
    return memo;
  }, {});
  const requirements = { GK: 2, DEF: 6, MID: 5, ATT: 4 };
  const coverage = Object.entries(requirements).map(([group, target]) => Math.min(1, number(counts[group]) / target));
  return 70 + (coverage.reduce((sum, value) => sum + value, 0) / coverage.length) * 30;
}

export function calculateClubStrength(club, playersById, weights = DEFAULT_STRENGTH_WEIGHTS) {
  const squadPlayers = club.squad.player_ids.map((id) => playersById.get(id)).filter(Boolean);
  const senior = sortPlayers(squadPlayers.filter((player) => number(player.age, 99) > 21));
  const youth = sortPlayers(squadPlayers.filter((player) => number(player.age, 99) <= 21));
  const firstTeamPool = sortPlayers([...senior.slice(0, 20), ...youth.slice(0, Math.max(0, 20 - senior.length))]).slice(0, 20);
  const bestXi = selectBalancedXi(firstTeamPool);
  const depth = firstTeamPool.slice(11, 20);
  const goalkeepers = sortPlayers(firstTeamPool.filter((player) => player.position_group === "GK"));

  const components = {
    best_xi: average(bestXi),
    first_team_depth: average(depth),
    positional_balance: positionalBalance(firstTeamPool),
    youth_depth: average(youth.slice(0, 10)),
    goalkeeper_security: average(goalkeepers.slice(0, 2))
  };
  const score = Object.entries(weights).reduce((sum, [key, weight]) => sum + number(components[key]) * weight, 0);

  return {
    model_version: CLUB_STRENGTH_MODEL_VERSION,
    strength_score: round(score, 3),
    components: Object.fromEntries(Object.entries(components).map(([key, value]) => [key, round(value, 3)])),
    squad_counts: {
      assigned: squadPlayers.length,
      first_team_pool: firstTeamPool.length,
      best_xi: bestXi.length,
      senior: senior.length,
      youth: youth.length,
      goalkeepers: goalkeepers.length
    },
    best_xi_player_ids: bestXi.map((player) => player.tbg_player_id),
    first_team_player_ids: firstTeamPool.map((player) => player.tbg_player_id)
  };
}

export function seedClubsByStrength(clubs, players, { divisions = 4, clubsPerDivision = 20 } = {}) {
  if (clubs.length !== divisions * clubsPerDivision) {
    throw new Error(`Cannot seed ${clubs.length} clubs into ${divisions} divisions of ${clubsPerDivision}.`);
  }
  const playersById = new Map(players.map((player) => [player.tbg_player_id, player]));
  const ranked = clubs.map((club) => ({ club, strength: calculateClubStrength(club, playersById) }))
    .sort((a, b) => b.strength.strength_score - a.strength.strength_score
      || b.strength.components.best_xi - a.strength.components.best_xi
      || b.strength.components.first_team_depth - a.strength.components.first_team_depth
      || a.club.launch_slot - b.club.launch_slot);

  return ranked.map((entry, index) => ({
    ...entry,
    world_rank: index + 1,
    division_level: Math.floor(index / clubsPerDivision) + 1,
    division_seed: (index % clubsPerDivision) + 1
  }));
}
