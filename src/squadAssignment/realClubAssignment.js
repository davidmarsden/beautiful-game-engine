const DEFAULT_REAL_CLUB_RULES = {
  clubCount: 100,
  minSquadSize: 18,
  targetSquadSize: 25,
  divisions: 5,
  clubsPerDivision: 20,
  strengthWeights: {
    starters: 0.7,
    bench: 0.2,
    depth: 0.1
  }
};

function rating(player) {
  return Number(player.underlying_ability_rating ?? player.tbg_rating ?? player.effective_match_rating ?? 0);
}

function value(player) {
  return Number(player.market_value_eur ?? 0);
}

function clone(item) {
  return JSON.parse(JSON.stringify(item));
}

function activePlayers(players) {
  return players
    .filter((player) => player.tbg_player_id)
    .filter((player) => player.status !== "retired")
    .filter((player) => player.current_club_id)
    .filter((player) => player.current_club && player.current_club !== "Without Club")
    .filter((player) => rating(player) > 0);
}

function groupByRealClub(players) {
  const clubs = new Map();
  for (const player of activePlayers(players)) {
    const clubId = `tm-club-${player.current_club_id}`;
    if (!clubs.has(clubId)) {
      clubs.set(clubId, {
        source_club_id: String(player.current_club_id),
        tbg_club_id: clubId,
        club_name: player.current_club,
        current_competition_code: player.current_competition_code || "",
        players: []
      });
    }
    clubs.get(clubId).players.push(player);
  }
  return [...clubs.values()].map((club) => ({
    ...club,
    players: club.players.sort((a, b) => rating(b) - rating(a) || value(b) - value(a) || String(a.display_name).localeCompare(String(b.display_name)))
  }));
}

function average(items) {
  return items.length ? items.reduce((sum, item) => sum + item, 0) / items.length : 0;
}

function weightedSquadStrength(players, weights) {
  const ratings = players.map(rating).filter(Boolean).sort((a, b) => b - a);
  const starters = ratings.slice(0, 11);
  const bench = ratings.slice(11, 18);
  const depth = ratings.slice(18, 25);
  return (average(starters) * weights.starters)
    + (average(bench) * weights.bench)
    + (average(depth) * weights.depth);
}

function clubMarketValue(players) {
  return players.reduce((sum, player) => sum + value(player), 0);
}

function positionCounts(players) {
  return players.reduce((memo, player) => {
    const group = player.position_group || "UNK";
    memo[group] = (memo[group] ?? 0) + 1;
    return memo;
  }, { GK: 0, DEF: 0, MID: 0, ATT: 0, UNK: 0 });
}

function divisionForRank(rank, rules) {
  return Math.floor((rank - 1) / rules.clubsPerDivision) + 1;
}

function assignPlayerToRealClub(player, club, rank, division) {
  return {
    ...clone(player),
    tbg_club_id: club.tbg_club_id,
    tbg_club_name: club.club_name,
    owner_manager: "",
    tbg_division: division,
    division,
    assignment_status: "assigned",
    real_club_rank: rank,
    real_club_source_id: club.source_club_id
  };
}

function clubReport(club, rank, division, squad, strength, totalMarketValue) {
  const ratings = squad.map(rating).filter(Boolean);
  return {
    club_id: club.tbg_club_id,
    source_club_id: club.source_club_id,
    club_name: club.club_name,
    current_competition_code: club.current_competition_code,
    real_club_rank: rank,
    division,
    squad_size: squad.length,
    average_rating: ratings.length ? Number(average(ratings).toFixed(2)) : 0,
    weighted_squad_strength: Number(strength.toFixed(2)),
    strongest_rating: ratings.length ? Math.max(...ratings) : 0,
    weakest_rating: ratings.length ? Math.min(...ratings) : 0,
    total_market_value_eur: totalMarketValue,
    positions: positionCounts(squad)
  };
}

function toWorldClub(report) {
  return {
    id: report.club_id,
    name: report.club_name,
    division: report.division,
    rating: report.weighted_squad_strength,
    source_club_id: report.source_club_id,
    current_competition_code: report.current_competition_code
  };
}

export function assignRealClubSquads({ players = [], rules = {} } = {}) {
  const mergedRules = {
    ...DEFAULT_REAL_CLUB_RULES,
    ...rules,
    strengthWeights: { ...DEFAULT_REAL_CLUB_RULES.strengthWeights, ...(rules.strengthWeights ?? {}) }
  };

  const clubs = groupByRealClub(players)
    .filter((club) => club.players.length >= mergedRules.minSquadSize)
    .map((club) => ({
      ...club,
      weighted_squad_strength: weightedSquadStrength(club.players, mergedRules.strengthWeights),
      total_market_value_eur: clubMarketValue(club.players)
    }))
    .sort((a, b) => b.weighted_squad_strength - a.weighted_squad_strength
      || b.total_market_value_eur - a.total_market_value_eur
      || String(a.club_name).localeCompare(String(b.club_name)))
    .slice(0, mergedRules.clubCount);

  const topClubIds = new Set(clubs.map((club) => club.tbg_club_id));
  const assignedPlayers = [];
  const clubReports = [];

  clubs.forEach((club, index) => {
    const rank = index + 1;
    const division = divisionForRank(rank, mergedRules);
    const squad = club.players.slice(0, mergedRules.targetSquadSize);
    assignedPlayers.push(...squad.map((player) => assignPlayerToRealClub(player, club, rank, division)));
    clubReports.push(clubReport(club, rank, division, squad, club.weighted_squad_strength, club.total_market_value_eur));
  });

  const assignedIds = new Set(assignedPlayers.map((player) => player.tbg_player_id));
  const unsignedPlayers = players
    .filter((player) => !assignedIds.has(player.tbg_player_id))
    .map((player) => ({
      ...clone(player),
      tbg_club_id: "",
      tbg_club_name: "",
      owner_manager: "",
      assignment_status: "unsigned"
    }))
    .sort((a, b) => rating(b) - rating(a) || value(b) - value(a));

  const duplicateAssignedIds = assignedPlayers
    .map((player) => player.tbg_player_id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);

  return {
    assignedPlayers: assignedPlayers.sort((a, b) => Number(a.real_club_rank) - Number(b.real_club_rank) || rating(b) - rating(a)),
    unsignedPlayers,
    clubReports,
    clubs: clubReports.map(toWorldClub),
    summary: {
      mode: "real-clubs",
      club_count_target: mergedRules.clubCount,
      clubs: clubReports.length,
      squad_size_target: mergedRules.targetSquadSize,
      min_squad_size: mergedRules.minSquadSize,
      assigned_players: assignedPlayers.length,
      unsigned_players: unsignedPlayers.length,
      duplicate_assigned_ids: [...new Set(duplicateAssignedIds)],
      complete_squads: clubReports.filter((club) => club.squad_size >= mergedRules.targetSquadSize).length,
      incomplete_squads: clubReports.filter((club) => club.squad_size < mergedRules.targetSquadSize).length,
      divisions: Array.from({ length: mergedRules.divisions }, (_, index) => {
        const division = index + 1;
        return {
          division,
          clubs: clubReports.filter((club) => club.division === division).map((club) => ({
            rank: club.real_club_rank,
            club_id: club.club_id,
            club_name: club.club_name,
            strength: club.weighted_squad_strength,
            squad_size: club.squad_size
          }))
        };
      }),
      rules: mergedRules,
      excluded_top_club_ids: [...topClubIds].length === clubReports.length ? [] : [...topClubIds].filter((clubId) => !clubReports.some((club) => club.club_id === clubId))
    }
  };
}
