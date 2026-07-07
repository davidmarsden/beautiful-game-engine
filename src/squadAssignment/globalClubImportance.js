const CLUB_IMPORTANCE = {
  "tm-club-418": { continent: "Europe", league: "LaLiga", importance: 100, aliases: ["Real Madrid"] },
  "tm-club-281": { continent: "Europe", league: "Premier League", importance: 99, aliases: ["Manchester City"] },
  "tm-club-11": { continent: "Europe", league: "Premier League", importance: 97, aliases: ["Arsenal FC"] },
  "tm-club-27": { continent: "Europe", league: "Bundesliga", importance: 98, aliases: ["Bayern Munich"] },
  "tm-club-583": { continent: "Europe", league: "Ligue 1", importance: 97, aliases: ["Paris Saint-Germain"] },
  "tm-club-31": { continent: "Europe", league: "Premier League", importance: 98, aliases: ["Liverpool FC"] },
  "tm-club-131": { continent: "Europe", league: "LaLiga", importance: 99, aliases: ["FC Barcelona"] },
  "tm-club-631": { continent: "Europe", league: "Premier League", importance: 95, aliases: ["Chelsea FC"] },
  "tm-club-985": { continent: "Europe", league: "Premier League", importance: 96, aliases: ["Manchester United"] },
  "tm-club-148": { continent: "Europe", league: "Premier League", importance: 92, aliases: ["Tottenham Hotspur"] },
  "tm-club-13": { continent: "Europe", league: "LaLiga", importance: 94, aliases: ["Atlético de Madrid"] },
  "tm-club-46": { continent: "Europe", league: "Serie A", importance: 94, aliases: ["Inter Milan"] },
  "tm-club-5": { continent: "Europe", league: "Serie A", importance: 95, aliases: ["AC Milan"] },
  "tm-club-506": { continent: "Europe", league: "Serie A", importance: 95, aliases: ["Juventus FC"] },
  "tm-club-16": { continent: "Europe", league: "Bundesliga", importance: 92, aliases: ["Borussia Dortmund"] },
  "tm-club-15": { continent: "Europe", league: "Bundesliga", importance: 89, aliases: ["Bayer 04 Leverkusen"] },
  "tm-club-23826": { continent: "Europe", league: "Bundesliga", importance: 86, aliases: ["RB Leipzig"] },
  "tm-club-12": { continent: "Europe", league: "Serie A", importance: 88, aliases: ["AS Roma"] },
  "tm-club-398": { continent: "Europe", league: "Serie A", importance: 84, aliases: ["SS Lazio"] },
  "tm-club-36": { continent: "Europe", league: "Süper Lig", importance: 86, aliases: ["Fenerbahce", "Fenerbahçe"] },
  "tm-club-141": { continent: "Europe", league: "Süper Lig", importance: 87, aliases: ["Galatasaray"] },
  "tm-club-114": { continent: "Europe", league: "Süper Lig", importance: 82, aliases: ["Besiktas JK", "Beşiktaş"] },
  "tm-club-244": { continent: "Europe", league: "Ligue 1", importance: 86, aliases: ["Olympique Marseille"] },
  "tm-club-1082": { continent: "Europe", league: "Ligue 1", importance: 82, aliases: ["LOSC Lille"] },
  "tm-club-621": { continent: "Europe", league: "LaLiga", importance: 84, aliases: ["Athletic Bilbao"] },
  "tm-club-681": { continent: "Europe", league: "LaLiga", importance: 83, aliases: ["Real Sociedad"] },
  "tm-club-1050": { continent: "Europe", league: "LaLiga", importance: 83, aliases: ["Villarreal CF"] },
  "tm-club-150": { continent: "Europe", league: "LaLiga", importance: 82, aliases: ["Real Betis Balompié"] },

  "tm-club-614": { continent: "South America", league: "Brasileirão", importance: 95, aliases: ["CR Flamengo", "Flamengo"] },
  "tm-club-1023": { continent: "South America", league: "Brasileirão", importance: 94, aliases: ["SE Palmeiras", "Palmeiras"] },
  "tm-club-209": { continent: "South America", league: "Argentina Primera División", importance: 94, aliases: ["River Plate"] },
  "tm-club-189": { continent: "South America", league: "Argentina Primera División", importance: 93, aliases: ["Boca Juniors"] },
  "tm-club-221": { continent: "South America", league: "Brasileirão", importance: 89, aliases: ["São Paulo FC", "Sao Paulo"] },
  "tm-club-199": { continent: "South America", league: "Brasileirão", importance: 89, aliases: ["Corinthians"] },
  "tm-club-2462": { continent: "South America", league: "Brasileirão", importance: 88, aliases: ["Botafogo FR", "Botafogo"] },
  "tm-club-330": { continent: "South America", league: "Brasileirão", importance: 88, aliases: ["Fluminense FC", "Fluminense"] },
  "tm-club-1459": { continent: "South America", league: "Brasileirão", importance: 87, aliases: ["Atlético Mineiro", "Atletico Mineiro"] },
  "tm-club-1234": { continent: "South America", league: "Argentina Primera División", importance: 86, aliases: ["Racing Club"] },
  "tm-club-1235": { continent: "South America", league: "Argentina Primera División", importance: 85, aliases: ["Independiente"] },
  "tm-club-866": { continent: "South America", league: "Uruguay Primera División", importance: 84, aliases: ["Club Nacional", "Nacional"] },
  "tm-club-1017": { continent: "South America", league: "Uruguay Primera División", importance: 83, aliases: ["Peñarol", "Penarol"] },
  "tm-club-897": { continent: "South America", league: "Chile Primera División", importance: 82, aliases: ["Colo-Colo"] },
  "tm-club-1044": { continent: "South America", league: "Ecuador Serie A", importance: 81, aliases: ["LDU Quito"] },

  "tm-club-18544": { continent: "Asia", league: "Saudi Pro League", importance: 91, aliases: ["Al-Nassr FC"] },
  "tm-club-1114": { continent: "Asia", league: "Saudi Pro League", importance: 92, aliases: ["Al-Hilal SFC"] },
  "tm-club-8023": { continent: "Asia", league: "Saudi Pro League", importance: 88, aliases: ["Al-Ittihad Club"] },
  "tm-club-18487": { continent: "Asia", league: "Saudi Pro League", importance: 88, aliases: ["Al-Ahli SFC"] },
  "tm-club-26069": { continent: "Asia", league: "Saudi Pro League", importance: 85, aliases: ["Al-Qadsiah FC"] },
  "tm-club-34911": { continent: "Asia", league: "Saudi Pro League", importance: 80, aliases: ["NEOM SC"] },
  "tm-club-828": { continent: "Asia", league: "J1 League", importance: 84, aliases: ["Urawa Red Diamonds"] },
  "tm-club-995": { continent: "Asia", league: "J1 League", importance: 83, aliases: ["Kashima Antlers"] },
  "tm-club-1416": { continent: "Asia", league: "K League 1", importance: 83, aliases: ["Ulsan HD", "Ulsan Hyundai"] },
  "tm-club-1743": { continent: "Asia", league: "K League 1", importance: 82, aliases: ["Jeonbuk Hyundai Motors"] },

  "tm-club-69261": { continent: "North America", league: "MLS", importance: 87, aliases: ["Inter Miami CF"] },
  "tm-club-51828": { continent: "North America", league: "MLS", importance: 84, aliases: ["Los Angeles FC"] },
  "tm-club-9636": { continent: "North America", league: "MLS", importance: 83, aliases: ["Seattle Sounders FC"] },
  "tm-club-1061": { continent: "North America", league: "MLS", importance: 84, aliases: ["Los Angeles Galaxy"] },
  "tm-club-51663": { continent: "North America", league: "MLS", importance: 81, aliases: ["Atlanta United FC"] },
  "tm-club-9168": { continent: "North America", league: "MLS", importance: 80, aliases: ["Houston Dynamo FC"] },
  "tm-club-363": { continent: "North America", league: "Liga MX", importance: 87, aliases: ["Club América", "Club America"] },
  "tm-club-630": { continent: "North America", league: "Liga MX", importance: 85, aliases: ["CF Monterrey", "Monterrey"] },
  "tm-club-4494": { continent: "North America", league: "Liga MX", importance: 84, aliases: ["Tigres UANL"] },
  "tm-club-1087": { continent: "North America", league: "Liga MX", importance: 82, aliases: ["CD Guadalajara", "Chivas"] },

  "tm-club-7": { continent: "Africa", league: "Egyptian Premier League", importance: 95, aliases: ["Al Ahly SC", "Al Ahly"] },
  "tm-club-3587": { continent: "Africa", league: "Egyptian Premier League", importance: 88, aliases: ["Zamalek SC", "Zamalek"] },
  "tm-club-2727": { continent: "Africa", league: "Moroccan Botola", importance: 86, aliases: ["Wydad Casablanca"] },
  "tm-club-2728": { continent: "Africa", league: "Moroccan Botola", importance: 85, aliases: ["Raja Casablanca"] },
  "tm-club-3674": { continent: "Africa", league: "South African Premiership", importance: 84, aliases: ["Mamelodi Sundowns"] },
  "tm-club-3675": { continent: "Africa", league: "Tunisian Ligue Professionnelle 1", importance: 83, aliases: ["Espérance Tunis", "Esperance Tunis"] },

  "tm-club-6357": { continent: "Oceania", league: "New Zealand National League", importance: 85, aliases: ["Auckland City FC", "Auckland City"] }
};

const DEFAULT_CONTINENT_TARGETS = {
  Europe: { min: 58, target: 68, max: 72 },
  "South America": { min: 10, target: 14, max: 16 },
  Asia: { min: 6, target: 8, max: 10 },
  "North America": { min: 5, target: 7, max: 9 },
  Africa: { min: 3, target: 4, max: 6 },
  Oceania: { min: 0, target: 1, max: 1 }
};

function normaliseName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

const IMPORTANCE_BY_NAME = new Map(Object.entries(CLUB_IMPORTANCE).flatMap(([clubId, meta]) => [
  [normaliseName(meta.aliases?.[0] || ""), { clubId, ...meta }],
  ...(meta.aliases || []).map((alias) => [normaliseName(alias), { clubId, ...meta }])
]));

export function clubImportanceFor({ clubId, clubName, competitionCode } = {}) {
  const byId = CLUB_IMPORTANCE[clubId];
  if (byId) return { clubId, ...byId, selection_reason: "curated_id" };

  const byName = IMPORTANCE_BY_NAME.get(normaliseName(clubName));
  if (byName) return { ...byName, selection_reason: "curated_name" };

  const code = String(competitionCode || "");
  if (["GB1", "GB2", "ES1", "IT1", "L1", "FR1", "TR1", "BE1", "NL1", "PO1"].includes(code)) return { continent: "Europe", league: code, importance: 50, selection_reason: "inferred_europe" };
  if (["SA1", "JAP1", "KR1", "C1"].includes(code)) return { continent: "Asia", league: code, importance: 45, selection_reason: "inferred_asia" };
  if (["MLS1", "MEXA"].includes(code)) return { continent: "North America", league: code, importance: 45, selection_reason: "inferred_north_america" };
  if (["BRA1", "AR1", "URU1", "CL1", "EC1"].includes(code)) return { continent: "South America", league: code, importance: 55, selection_reason: "inferred_south_america" };
  if (["EGY1", "MAR1", "ZA1", "TN1"].includes(code)) return { continent: "Africa", league: code, importance: 50, selection_reason: "inferred_africa" };
  if (["NZ1", "AUS1"].includes(code)) return { continent: "Oceania", league: code, importance: 40, selection_reason: "inferred_oceania" };
  return { continent: "Unknown", league: code || "Unknown", importance: 0, selection_reason: "unknown" };
}

function scoreClubForSelection(club) {
  const strength = Number(club.weighted_squad_strength || 0);
  const importance = Number(club.global_importance?.importance || 0);
  return strength * 0.7 + importance * 0.3;
}

function sortForSelection(a, b) {
  return scoreClubForSelection(b) - scoreClubForSelection(a)
    || Number(b.weighted_squad_strength || 0) - Number(a.weighted_squad_strength || 0)
    || Number(b.total_market_value_eur || 0) - Number(a.total_market_value_eur || 0)
    || String(a.club_name).localeCompare(String(b.club_name));
}

export function selectGlobalImportanceClubs(clubs, { clubCount = 100, continentTargets = DEFAULT_CONTINENT_TARGETS } = {}) {
  const enriched = clubs.map((club) => ({
    ...club,
    global_importance: clubImportanceFor({
      clubId: club.tbg_club_id,
      clubName: club.club_name,
      competitionCode: club.current_competition_code
    })
  })).sort(sortForSelection);

  const selected = [];
  const selectedIds = new Set();
  const countByContinent = {};

  function addClub(club) {
    if (!club || selectedIds.has(club.tbg_club_id) || selected.length >= clubCount) return false;
    const continent = club.global_importance.continent;
    const max = continentTargets[continent]?.max ?? clubCount;
    if ((countByContinent[continent] ?? 0) >= max) return false;
    selected.push(club);
    selectedIds.add(club.tbg_club_id);
    countByContinent[continent] = (countByContinent[continent] ?? 0) + 1;
    return true;
  }

  for (const [continent, target] of Object.entries(continentTargets)) {
    const candidates = enriched
      .filter((club) => club.global_importance.continent === continent)
      .sort(sortForSelection);
    for (const club of candidates) {
      if ((countByContinent[continent] ?? 0) >= target.min) break;
      addClub(club);
    }
  }

  for (const club of enriched) addClub(club);

  return selected
    .slice(0, clubCount)
    .sort((a, b) => Number(b.weighted_squad_strength || 0) - Number(a.weighted_squad_strength || 0)
      || scoreClubForSelection(b) - scoreClubForSelection(a)
      || String(a.club_name).localeCompare(String(b.club_name)));
}

export { CLUB_IMPORTANCE, DEFAULT_CONTINENT_TARGETS };
