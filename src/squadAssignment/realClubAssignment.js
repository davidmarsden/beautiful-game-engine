import { clubImportanceFor, selectGlobalImportanceClubs } from "./globalClubImportance.js";

const DEFAULT_REAL_CLUB_RULES = {
  clubCount: 100,
  minSquadSize: 18,
  targetSquadSize: 25,
  divisions: 5,
  clubsPerDivision: 20,
  selectionMode: "real-clubs",
  clubUniverse: null,
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

function normalise(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
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
    real_club_source_id: club.source_club_id,
    continent: club.global_importance?.continent || "Unknown",
    league: club.global_importance?.league || club.current_competition_code || "Unknown",
    club_universe_slot: club.universe_slot ?? null
  };
}

function clubReport(club, rank, division, squad, strength, totalMarketValue) {
  const ratings = squad.map(rating).filter(Boolean);
  const importance = club.global_importance || clubImportanceFor({
    clubId: club.tbg_club_id,
    clubName: club.club_name,
    competitionCode: club.current_competition_code
  });
  return {
    club_id: club.tbg_club_id,
    source_club_id: club.source_club_id,
    club_name: club.club_name,
    universe_slot: club.universe_slot ?? null,
    universe_name: club.universe_name || "",
    continent: importance.continent,
    league: importance.league || club.current_competition_code,
    global_importance: importance.importance,
    selection_reason: importance.selection_reason,
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
    continent: report.continent,
    league: report.league,
    universe_slot: report.universe_slot,
    source_club_id: report.source_club_id,
    current_competition_code: report.current_competition_code
  };
}

function buildCandidateClubs(players, mergedRules) {
  return groupByRealClub(players)
    .filter((club) => club.players.length >= mergedRules.minSquadSize)
    .map((club) => {
      const globalImportance = clubImportanceFor({
        clubId: club.tbg_club_id,
        clubName: club.club_name,
        competitionCode: club.current_competition_code
      });
      return {
        ...club,
        global_importance: globalImportance,
        weighted_squad_strength: weightedSquadStrength(club.players, mergedRules.strengthWeights),
        total_market_value_eur: clubMarketValue(club.players)
      };
    });
}

function selectClubUniverse(candidateClubs, mergedRules) {
  const universeClubs = mergedRules.clubUniverse?.clubs || [];
  const byTmId = new Map(candidateClubs.map((club) => [String(club.source_club_id), club]));
  const byName = new Map(candidateClubs.map((club) => [normalise(club.club_name), club]));
  const missingClubUniverseClubs = [];
  const duplicateUniverseIds = [];
  const seenIds = new Set();
  const selected = [];

  for (const universeClub of universeClubs) {
    const tmId = String(universeClub.transfermarkt_club_id || "").trim();
    if (tmId) {
      if (seenIds.has(tmId)) duplicateUniverseIds.push({ slot: universeClub.slot, name: universeClub.name, transfermarkt_club_id: tmId });
      seenIds.add(tmId);
    }
    const candidate = (tmId && byTmId.get(tmId)) || byName.get(normalise(universeClub.name));
    if (!candidate) {
      missingClubUniverseClubs.push({
        slot: universeClub.slot,
        club_name: universeClub.name,
        transfermarkt_club_id: tmId,
        continent: universeClub.continent,
        country: universeClub.country,
        league: universeClub.league,
        reason: tmId ? "not_imported_or_below_min_squad_size" : "missing_transfermarkt_club_id"
      });
      continue;
    }
    selected.push({
      ...candidate,
      universe_slot: universeClub.slot,
      universe_name: universeClub.name,
      global_importance: {
        ...(candidate.global_importance || {}),
        continent: universeClub.continent || candidate.global_importance?.continent || "Unknown",
        league: universeClub.league || candidate.global_importance?.league || candidate.current_competition_code || "Unknown",
        importance: universeClub.importance ?? candidate.global_importance?.importance ?? 0,
        country: universeClub.country || "",
        selection_reason: "club_universe"
      }
    });
  }

  return {
    clubs: selected
      .sort((a, b) => b.weighted_squad_strength - a.weighted_squad_strength || Number(a.universe_slot ?? 9999) - Number(b.universe_slot ?? 9999))
      .slice(0, mergedRules.clubCount),
    missingClubUniverseClubs,
    duplicateUniverseIds
  };
}

function selectClubs(candidateClubs, mergedRules) {
  if (mergedRules.selectionMode === "club-universe") return selectClubUniverse(candidateClubs, mergedRules);
  if (mergedRules.selectionMode === "global-importance") {
    return {
      clubs: selectGlobalImportanceClubs(candidateClubs, {
        clubCount: mergedRules.clubCount,
        continentTargets: mergedRules.continentTargets
      }),
      missingClubUniverseClubs: [],
      duplicateUniverseIds: []
    };
  }
  return {
    clubs: candidateClubs
      .sort((a, b) => b.weighted_squad_strength - a.weighted_squad_strength
        || b.total_market_value_eur - a.total_market_value_eur
        || String(a.club_name).localeCompare(String(b.club_name)))
      .slice(0, mergedRules.clubCount),
    missingClubUniverseClubs: [],
    duplicateUniverseIds: []
  };
}

export function assignRealClubSquads({ players = [], rules = {} } = {}) {
  const mergedRules = {
    ...DEFAULT_REAL_CLUB_RULES,
    ...rules,
    selectionMode: rules.selectionMode ?? rules.mode ?? DEFAULT_REAL_CLUB_RULES.selectionMode,
    strengthWeights: { ...DEFAULT_REAL_CLUB_RULES.strengthWeights, ...(rules.strengthWeights ?? {}) }
  };

  const candidateClubs = buildCandidateClubs(players, mergedRules);
  const selection = selectClubs(candidateClubs, mergedRules);
  const clubs = selection.clubs;
  const selectedClubIds = new Set(clubs.map((club) => club.tbg_club_id));
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

  const continent_counts = clubReports.reduce((memo, club) => {
    memo[club.continent] = (memo[club.continent] ?? 0) + 1;
    return memo;
  }, {});
  const league_counts = clubReports.reduce((memo, club) => {
    memo[club.league] = (memo[club.league] ?? 0) + 1;
    return memo;
  }, {});

  return {
    assignedPlayers: assignedPlayers.sort((a, b) => Number(a.real_club_rank) - Number(b.real_club_rank) || rating(b) - rating(a)),
    unsignedPlayers,
    clubReports,
    clubs: clubReports.map(toWorldClub),
    summary: {
      mode: mergedRules.selectionMode,
      club_count_target: mergedRules.clubCount,
      clubs: clubReports.length,
      candidate_clubs: candidateClubs.length,
      squad_size_target: mergedRules.targetSquadSize,
      min_squad_size: mergedRules.minSquadSize,
      assigned_players: assignedPlayers.length,
      unsigned_players: unsignedPlayers.length,
      duplicate_assigned_ids: [...new Set(duplicateAssignedIds)],
      duplicate_universe_club_ids: selection.duplicateUniverseIds || [],
      missing_club_universe_clubs: selection.missingClubUniverseClubs || [],
      complete_squads: clubReports.filter((club) => club.squad_size >= mergedRules.targetSquadSize).length,
      incomplete_squads: clubReports.filter((club) => club.squad_size < mergedRules.targetSquadSize).length,
      continent_counts,
      league_counts,
      divisions: Array.from({ length: mergedRules.divisions }, (_, index) => {
        const division = index + 1;
        return {
          division,
          clubs: clubReports.filter((club) => club.division === division).map((club) => ({
            rank: club.real_club_rank,
            club_id: club.club_id,
            club_name: club.club_name,
            universe_slot: club.universe_slot,
            continent: club.continent,
            league: club.league,
            strength: club.weighted_squad_strength,
            squad_size: club.squad_size
          }))
        };
      }),
      rules: mergedRules,
      excluded_candidate_club_ids: candidateClubs
        .filter((club) => !selectedClubIds.has(club.tbg_club_id))
        .sort((a, b) => b.weighted_squad_strength - a.weighted_squad_strength)
        .slice(0, 50)
        .map((club) => ({
          club_id: club.tbg_club_id,
          club_name: club.club_name,
          continent: club.global_importance?.continent || "Unknown",
          league: club.global_importance?.league || club.current_competition_code || "Unknown",
          strength: Number(club.weighted_squad_strength.toFixed(2))
        }))
    }
  };
}
