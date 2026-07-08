function hashSeed(seed) {
  let h = 2166136261;
  for (const char of String(seed)) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = hashSeed(seed);
  return function random() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(lambda, random) {
  const safeLambda = Math.max(0.05, lambda);
  const limit = Math.exp(-safeLambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= random();
  } while (p > limit && k < 12);
  return k - 1;
}

function cloneClub(club) {
  return {
    id: club.id || club.club_id,
    name: club.name || club.club_name,
    division: Number(club.division || 1),
    rating: Number(club.rating ?? club.weighted_squad_strength ?? club.average_rating ?? 85),
    continent: club.continent || "Unknown",
    league: club.league || "Unknown",
    universe_slot: club.universe_slot ?? null
  };
}

function createEmptyTable(clubs) {
  return clubs.map((club) => ({
    ...club,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0
  }));
}

function sortTable(table) {
  return [...table].sort((a, b) =>
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    b.rating - a.rating ||
    String(a.name).localeCompare(String(b.name))
  );
}

function fixturePairs(clubs) {
  const fixtures = [];
  for (let i = 0; i < clubs.length; i += 1) {
    for (let j = i + 1; j < clubs.length; j += 1) {
      fixtures.push([clubs[i], clubs[j]]);
      fixtures.push([clubs[j], clubs[i]]);
    }
  }
  return fixtures;
}

function simulateMatch(home, away, random, config) {
  const strengthGap = home.rating - away.rating;
  const homeAdvantage = Number(config.homeAdvantage ?? 0.18);
  const baseGoals = Number(config.baseGoals ?? 1.28);
  const gapScale = Number(config.gapScale ?? 0.095);
  const variance = Number(config.matchVariance ?? 0.22);
  const noiseHome = (random() - 0.5) * variance;
  const noiseAway = (random() - 0.5) * variance;
  const homeLambda = baseGoals + homeAdvantage + (strengthGap * gapScale) + noiseHome;
  const awayLambda = baseGoals - (strengthGap * gapScale) + noiseAway;
  return {
    home_goals: poisson(homeLambda, random),
    away_goals: poisson(awayLambda, random)
  };
}

function applyResult(rowById, home, away, result) {
  const h = rowById.get(home.id);
  const a = rowById.get(away.id);
  h.played += 1;
  a.played += 1;
  h.gf += result.home_goals;
  h.ga += result.away_goals;
  a.gf += result.away_goals;
  a.ga += result.home_goals;
  h.gd = h.gf - h.ga;
  a.gd = a.gf - a.ga;
  if (result.home_goals > result.away_goals) {
    h.won += 1; h.points += 3;
    a.lost += 1;
  } else if (result.home_goals < result.away_goals) {
    a.won += 1; a.points += 3;
    h.lost += 1;
  } else {
    h.drawn += 1; a.drawn += 1;
    h.points += 1; a.points += 1;
  }
}

function simulateDivisionSeason(clubs, random, config) {
  const table = createEmptyTable(clubs);
  const rowById = new Map(table.map((row) => [row.id, row]));
  const fixtures = fixturePairs(clubs);
  let goals = 0;
  let draws = 0;
  let homeWins = 0;
  let awayWins = 0;
  for (const [home, away] of fixtures) {
    const result = simulateMatch(home, away, random, config);
    goals += result.home_goals + result.away_goals;
    if (result.home_goals === result.away_goals) draws += 1;
    else if (result.home_goals > result.away_goals) homeWins += 1;
    else awayWins += 1;
    applyResult(rowById, home, away, result);
  }
  const sorted = sortTable(table).map((row, index) => ({ ...row, position: index + 1 }));
  return { table: sorted, fixtures: fixtures.length, goals, draws, homeWins, awayWins };
}

function applyPromotionRelegation(seasonTables, config) {
  const promotionPlaces = Number(config.promotionPlaces ?? 4);
  const relegationPlaces = Number(config.relegationPlaces ?? 4);
  const divisions = [...seasonTables.keys()].sort((a, b) => a - b);
  const promoted = [];
  const relegated = [];
  const nextDivisionByClub = new Map();

  for (const division of divisions) {
    const table = seasonTables.get(division);
    for (const row of table) nextDivisionByClub.set(row.id, division);
  }

  for (const division of divisions) {
    const table = seasonTables.get(division);
    if (division > Math.min(...divisions)) {
      const movers = table.slice(0, promotionPlaces);
      for (const row of movers) {
        promoted.push({ club_id: row.id, club_name: row.name, from: division, to: division - 1, position: row.position });
        nextDivisionByClub.set(row.id, division - 1);
      }
    }
    if (division < Math.max(...divisions)) {
      const movers = table.slice(-relegationPlaces);
      for (const row of movers) {
        relegated.push({ club_id: row.id, club_name: row.name, from: division, to: division + 1, position: row.position });
        nextDivisionByClub.set(row.id, division + 1);
      }
    }
  }

  return { promoted, relegated, nextDivisionByClub };
}

function summariseRun(seasons, initialClubs) {
  const champions = seasons.map((season) => season.divisions[0].table[0]);
  const championCounts = champions.reduce((memo, row) => {
    memo[row.name] = (memo[row.name] || 0) + 1;
    return memo;
  }, {});
  const uniqueChampions = Object.keys(championCounts).length;
  const totalFixtures = seasons.reduce((sum, season) => sum + season.totals.fixtures, 0);
  const totalGoals = seasons.reduce((sum, season) => sum + season.totals.goals, 0);
  const totalDraws = seasons.reduce((sum, season) => sum + season.totals.draws, 0);
  const movements = seasons.flatMap((season) => [...season.promoted, ...season.relegated]);
  const movedClubIds = new Set(movements.map((move) => move.club_id));
  const byClubInitialDivision = new Map(initialClubs.map((club) => [club.id, club.division]));
  const finalRows = seasons.at(-1).divisions.flatMap((division) => division.table.map((row) => ({ ...row, final_division: division.division })));
  const netDivisionChanges = finalRows.map((row) => ({
    club_id: row.id,
    club_name: row.name,
    initial_division: byClubInitialDivision.get(row.id),
    final_division: row.final_division,
    change: Number(byClubInitialDivision.get(row.id)) - Number(row.final_division)
  })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || String(a.club_name).localeCompare(String(b.club_name)));

  return {
    seasons: seasons.length,
    fixtures: totalFixtures,
    goals: totalGoals,
    goals_per_match: Number((totalGoals / Math.max(1, totalFixtures)).toFixed(3)),
    draw_rate: Number((totalDraws / Math.max(1, totalFixtures)).toFixed(3)),
    unique_champions: uniqueChampions,
    champion_counts: championCounts,
    most_titles: Object.entries(championCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([club_name, titles]) => ({ club_name, titles })),
    promoted_count: seasons.reduce((sum, season) => sum + season.promoted.length, 0),
    relegated_count: seasons.reduce((sum, season) => sum + season.relegated.length, 0),
    clubs_moved_at_least_once: movedClubIds.size,
    biggest_climbers: netDivisionChanges.filter((row) => row.change > 0).slice(0, 10),
    biggest_fallers: netDivisionChanges.filter((row) => row.change < 0).slice(0, 10)
  };
}

export function simulateLeagueSeasons({ clubs = [], seasons = 10, seed = "tbg-season-test", config = {} } = {}) {
  const random = mulberry32(seed);
  let currentClubs = clubs.map(cloneClub);
  const initialClubs = currentClubs.map(cloneClub);
  const seasonReports = [];

  for (let seasonNumber = 1; seasonNumber <= seasons; seasonNumber += 1) {
    const divisions = [...new Set(currentClubs.map((club) => club.division))].sort((a, b) => a - b);
    const seasonTables = new Map();
    const divisionReports = [];
    const totals = { fixtures: 0, goals: 0, draws: 0, homeWins: 0, awayWins: 0 };

    for (const division of divisions) {
      const divisionClubs = currentClubs.filter((club) => club.division === division).sort((a, b) => b.rating - a.rating || String(a.name).localeCompare(String(b.name)));
      const result = simulateDivisionSeason(divisionClubs, random, config);
      seasonTables.set(division, result.table);
      divisionReports.push({
        division,
        champion: result.table[0],
        promoted: [],
        relegated: [],
        table: result.table
      });
      totals.fixtures += result.fixtures;
      totals.goals += result.goals;
      totals.draws += result.draws;
      totals.homeWins += result.homeWins;
      totals.awayWins += result.awayWins;
    }

    const movement = applyPromotionRelegation(seasonTables, config);
    for (const report of divisionReports) {
      report.promoted = movement.promoted.filter((move) => move.from === report.division);
      report.relegated = movement.relegated.filter((move) => move.from === report.division);
    }

    seasonReports.push({
      season: seasonNumber,
      totals,
      champions: divisionReports.map((division) => ({ division: division.division, club_name: division.champion.name, points: division.champion.points })),
      promoted: movement.promoted,
      relegated: movement.relegated,
      divisions: divisionReports
    });

    currentClubs = currentClubs.map((club) => ({
      ...club,
      division: movement.nextDivisionByClub.get(club.id) ?? club.division
    }));
  }

  return {
    generated_at: new Date().toISOString(),
    seed,
    config: {
      seasons,
      promotionPlaces: Number(config.promotionPlaces ?? 4),
      relegationPlaces: Number(config.relegationPlaces ?? 4),
      baseGoals: Number(config.baseGoals ?? 1.28),
      homeAdvantage: Number(config.homeAdvantage ?? 0.18),
      gapScale: Number(config.gapScale ?? 0.095),
      matchVariance: Number(config.matchVariance ?? 0.22)
    },
    summary: summariseRun(seasonReports, initialClubs),
    seasons: seasonReports
  };
}
