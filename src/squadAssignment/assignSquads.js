const DEFAULT_SQUAD_RULES = {
  squadSize: 25,
  quotas: {
    GK: 3,
    DEF: 8,
    MID: 8,
    ATT: 6
  },
  divisionCeilings: {
    1: 99,
    2: 93,
    3: 91,
    4: 90,
    5: 89
  },
  divisionFloors: {
    1: 88,
    2: 86,
    3: 84,
    4: 82,
    5: 80
  }
};

function rating(player) {
  return Number(player.underlying_ability_rating ?? player.tbg_rating ?? player.effective_match_rating ?? 0);
}

function value(player) {
  return Number(player.market_value_eur ?? 0);
}

function age(player) {
  return Number(player.age ?? 99);
}

function clonePlayer(player) {
  return JSON.parse(JSON.stringify(player));
}

function groupPlayers(players) {
  const groups = { GK: [], DEF: [], MID: [], ATT: [], UNK: [] };
  for (const player of players) {
    const key = groups[player.position_group] ? player.position_group : "UNK";
    groups[key].push(player);
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => rating(b) - rating(a) || value(b) - value(a) || age(a) - age(b) || String(a.display_name).localeCompare(String(b.display_name)));
  }
  return groups;
}

function clubStrengthSort(a, b) {
  return Number(a.division) - Number(b.division)
    || Number(b.rating ?? b.reputation ?? 0) - Number(a.rating ?? a.reputation ?? 0)
    || String(a.name).localeCompare(String(b.name));
}

function chooseCandidate(group, usedIds, { targetRating, floor, ceiling, allowAboveCeiling = false }) {
  const upper = allowAboveCeiling ? 99 : ceiling;
  let bestIndex = -1;
  let bestScore = Infinity;

  for (let index = 0; index < group.length; index += 1) {
    const player = group[index];
    if (usedIds.has(player.tbg_player_id)) continue;
    const playerRating = rating(player);
    if (playerRating < floor || playerRating > upper) continue;

    const distance = Math.abs(playerRating - targetRating);
    const score = distance * 1000000000 - value(player) / 1000 + age(player) * 1000;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  if (bestIndex === -1 && !allowAboveCeiling) {
    return chooseCandidate(group, usedIds, { targetRating, floor, ceiling, allowAboveCeiling: true });
  }

  if (bestIndex === -1 && floor > 40) {
    return chooseCandidate(group, usedIds, { targetRating, floor: Math.max(40, floor - 2), ceiling, allowAboveCeiling: true });
  }

  if (bestIndex === -1) return null;
  const [player] = group.splice(bestIndex, 1);
  usedIds.add(player.tbg_player_id);
  return player;
}

function activeEligiblePlayers(players) {
  return players
    .filter((player) => player.tbg_player_id)
    .filter((player) => player.status !== "retired")
    .filter((player) => rating(player) > 0);
}

function targetRatingForClub(club, rules) {
  const division = Number(club.division || 5);
  const floor = rules.divisionFloors[division] ?? 80;
  const ceiling = rules.divisionCeilings[division] ?? 99;
  const clubRating = Number(club.rating ?? ceiling);
  return Math.max(floor, Math.min(ceiling, clubRating));
}

function assignToClub(player, club) {
  return {
    ...clonePlayer(player),
    tbg_club_id: club.id,
    tbg_club_name: club.name,
    owner_manager: club.manager?.manager_name || "",
    tbg_division: club.division,
    division: club.division,
    assignment_status: "assigned"
  };
}

function createClubReport(club, players) {
  const byGroup = players.reduce((memo, player) => {
    memo[player.position_group] = (memo[player.position_group] ?? 0) + 1;
    return memo;
  }, {});
  const ratings = players.map(rating).filter(Boolean);
  return {
    club_id: club.id,
    club_name: club.name,
    division: club.division,
    squad_size: players.length,
    average_rating: ratings.length ? Number((ratings.reduce((sum, item) => sum + item, 0) / ratings.length).toFixed(2)) : 0,
    strongest_rating: ratings.length ? Math.max(...ratings) : 0,
    weakest_rating: ratings.length ? Math.min(...ratings) : 0,
    positions: {
      GK: byGroup.GK ?? 0,
      DEF: byGroup.DEF ?? 0,
      MID: byGroup.MID ?? 0,
      ATT: byGroup.ATT ?? 0,
      UNK: byGroup.UNK ?? 0
    }
  };
}

function unassignedFromGroups(groups, usedIds) {
  return Object.values(groups)
    .flat()
    .filter((player) => !usedIds.has(player.tbg_player_id))
    .map((player) => ({
      ...clonePlayer(player),
      tbg_club_id: "",
      tbg_club_name: "",
      owner_manager: "",
      assignment_status: "unsigned"
    }))
    .sort((a, b) => rating(b) - rating(a) || value(b) - value(a));
}

export function assignSquadsToClubs({ players = [], clubs = [], rules = {} } = {}) {
  const mergedRules = {
    ...DEFAULT_SQUAD_RULES,
    ...rules,
    quotas: { ...DEFAULT_SQUAD_RULES.quotas, ...(rules.quotas ?? {}) },
    divisionCeilings: { ...DEFAULT_SQUAD_RULES.divisionCeilings, ...(rules.divisionCeilings ?? {}) },
    divisionFloors: { ...DEFAULT_SQUAD_RULES.divisionFloors, ...(rules.divisionFloors ?? {}) }
  };

  const eligiblePlayers = activeEligiblePlayers(players);
  const groups = groupPlayers(eligiblePlayers);
  const usedIds = new Set();
  const assignedPlayers = [];
  const clubReports = [];
  const sortedClubs = [...clubs].sort(clubStrengthSort);

  for (const club of sortedClubs) {
    const clubPlayers = [];
    const division = Number(club.division || 5);
    const targetRating = targetRatingForClub(club, mergedRules);
    const floor = mergedRules.divisionFloors[division] ?? 80;
    const ceiling = mergedRules.divisionCeilings[division] ?? 99;

    for (const [group, quota] of Object.entries(mergedRules.quotas)) {
      for (let count = 0; count < quota; count += 1) {
        const candidate = chooseCandidate(groups[group] ?? [], usedIds, { targetRating, floor, ceiling });
        if (candidate) clubPlayers.push(assignToClub(candidate, club));
      }
    }

    while (clubPlayers.length < mergedRules.squadSize) {
      const fallbackGroups = ["MID", "DEF", "ATT", "GK", "UNK"];
      let candidate = null;
      for (const group of fallbackGroups) {
        candidate = chooseCandidate(groups[group] ?? [], usedIds, { targetRating, floor, ceiling });
        if (candidate) break;
      }
      if (!candidate) break;
      clubPlayers.push(assignToClub(candidate, club));
    }

    assignedPlayers.push(...clubPlayers);
    clubReports.push(createClubReport(club, clubPlayers));
  }

  const unsignedPlayers = unassignedFromGroups(groups, usedIds);
  const duplicateAssignedIds = assignedPlayers
    .map((player) => player.tbg_player_id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);

  return {
    assignedPlayers: assignedPlayers.sort((a, b) => String(a.tbg_club_name).localeCompare(String(b.tbg_club_name)) || rating(b) - rating(a)),
    unsignedPlayers,
    clubReports: clubReports.sort((a, b) => Number(a.division) - Number(b.division) || String(a.club_name).localeCompare(String(b.club_name))),
    summary: {
      clubs: sortedClubs.length,
      squad_size_target: mergedRules.squadSize,
      assigned_players: assignedPlayers.length,
      unsigned_players: unsignedPlayers.length,
      duplicate_assigned_ids: [...new Set(duplicateAssignedIds)],
      complete_squads: clubReports.filter((club) => club.squad_size >= mergedRules.squadSize).length,
      incomplete_squads: clubReports.filter((club) => club.squad_size < mergedRules.squadSize).length,
      rules: mergedRules
    }
  };
}

export { DEFAULT_SQUAD_RULES };
