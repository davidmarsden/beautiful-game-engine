function rating(player) {
  return Number(player.underlying_ability_rating ?? player.tbg_rating ?? player.effective_match_rating ?? 0);
}

function value(player) {
  return Number(player.market_value_eur ?? 0);
}

function age(player) {
  return Number(player.age ?? 99);
}

function clone(item) {
  return JSON.parse(JSON.stringify(item));
}

function seededNumber(seedText) {
  let seed = 2166136261;
  for (const char of String(seedText)) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function shuffle(items, seedText) {
  const result = [...items];
  let seed = seededNumber(seedText);
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0;
    const swapIndex = seed % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function eligiblePlayers(players) {
  return players
    .filter((player) => player.tbg_player_id)
    .filter((player) => player.status !== "retired")
    .filter((player) => rating(player) > 0)
    .sort((a, b) => rating(b) - rating(a) || value(b) - value(a) || age(a) - age(b) || String(a.display_name).localeCompare(String(b.display_name)));
}

function startingDraftOrder(clubs, { seed = "tbg-snake-draft", order = "division-balanced" } = {}) {
  const sorted = [...clubs].sort((a, b) => Number(a.division) - Number(b.division) || String(a.name).localeCompare(String(b.name)));
  if (order === "random") return shuffle(sorted, seed);
  if (order === "reverse-strength") return sorted.reverse();
  return sorted;
}

function countPositions(squad) {
  return squad.reduce((memo, player) => {
    const group = player.position_group || "UNK";
    memo[group] = (memo[group] ?? 0) + 1;
    return memo;
  }, { GK: 0, DEF: 0, MID: 0, ATT: 0, UNK: 0 });
}

function desiredPositionForPick(squad, quotas) {
  const counts = countPositions(squad);
  const deficit = Object.entries(quotas)
    .map(([group, quota]) => ({ group, deficit: quota - (counts[group] ?? 0) }))
    .filter((item) => item.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit || a.group.localeCompare(b.group));
  return deficit[0]?.group || null;
}

function pickBestCandidate(pool, usedIds, preferredGroup) {
  const preferredIndex = preferredGroup
    ? pool.findIndex((player) => !usedIds.has(player.tbg_player_id) && player.position_group === preferredGroup)
    : -1;
  const index = preferredIndex >= 0 ? preferredIndex : pool.findIndex((player) => !usedIds.has(player.tbg_player_id));
  if (index < 0) return null;
  const [player] = pool.splice(index, 1);
  usedIds.add(player.tbg_player_id);
  return player;
}

function assignPlayer(player, club) {
  return {
    ...clone(player),
    tbg_club_id: club.id,
    tbg_club_name: club.name,
    owner_manager: club.manager?.manager_name || "",
    tbg_division: club.division,
    division: club.division,
    assignment_status: "assigned"
  };
}

function createClubReport(club, squad) {
  const ratings = squad.map(rating).filter(Boolean);
  const positions = countPositions(squad);
  return {
    club_id: club.id,
    club_name: club.name,
    division: club.division,
    squad_size: squad.length,
    average_rating: ratings.length ? Number((ratings.reduce((sum, item) => sum + item, 0) / ratings.length).toFixed(2)) : 0,
    strongest_rating: ratings.length ? Math.max(...ratings) : 0,
    weakest_rating: ratings.length ? Math.min(...ratings) : 0,
    positions
  };
}

function unsignedFromPool(pool, usedIds) {
  return pool
    .filter((player) => !usedIds.has(player.tbg_player_id))
    .map((player) => ({ ...clone(player), tbg_club_id: "", tbg_club_name: "", owner_manager: "", assignment_status: "unsigned" }))
    .sort((a, b) => rating(b) - rating(a) || value(b) - value(a));
}

export function runSnakeDraft({
  players = [],
  clubs = [],
  squadSize = 25,
  quotas = { GK: 3, DEF: 8, MID: 8, ATT: 6 },
  seed = "tbg-snake-draft",
  order = "division-balanced"
} = {}) {
  const pool = eligiblePlayers(players);
  const draftOrder = startingDraftOrder(clubs, { seed, order });
  const squads = new Map(draftOrder.map((club) => [club.id, []]));
  const usedIds = new Set();
  const draftPicks = [];

  for (let round = 1; round <= squadSize; round += 1) {
    const roundOrder = round % 2 === 1 ? draftOrder : [...draftOrder].reverse();
    for (const club of roundOrder) {
      const squad = squads.get(club.id);
      const preferredGroup = desiredPositionForPick(squad, quotas);
      const candidate = pickBestCandidate(pool, usedIds, preferredGroup);
      if (!candidate) continue;
      const assigned = assignPlayer(candidate, club);
      squad.push(assigned);
      draftPicks.push({
        round,
        pick: draftPicks.length + 1,
        club_id: club.id,
        club_name: club.name,
        player_id: assigned.tbg_player_id,
        player_name: assigned.display_name,
        position_group: assigned.position_group,
        rating: rating(assigned),
        market_value_eur: value(assigned)
      });
    }
  }

  const assignedPlayers = [...squads.values()].flat();
  const unsignedPlayers = unsignedFromPool(pool, usedIds);
  const clubReports = draftOrder
    .map((club) => createClubReport(club, squads.get(club.id)))
    .sort((a, b) => Number(a.division) - Number(b.division) || String(a.club_name).localeCompare(String(b.club_name)));
  const duplicateAssignedIds = assignedPlayers
    .map((player) => player.tbg_player_id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);

  return {
    assignedPlayers: assignedPlayers.sort((a, b) => String(a.tbg_club_name).localeCompare(String(b.tbg_club_name)) || rating(b) - rating(a)),
    unsignedPlayers,
    clubReports,
    draftPicks,
    summary: {
      mode: "snake-draft",
      clubs: draftOrder.length,
      squad_size_target: squadSize,
      assigned_players: assignedPlayers.length,
      unsigned_players: unsignedPlayers.length,
      duplicate_assigned_ids: [...new Set(duplicateAssignedIds)],
      complete_squads: clubReports.filter((club) => club.squad_size >= squadSize).length,
      incomplete_squads: clubReports.filter((club) => club.squad_size < squadSize).length,
      draft_order: draftOrder.map((club) => ({ club_id: club.id, club_name: club.name, division: club.division })),
      rules: { squadSize, quotas, seed, order }
    }
  };
}
