const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const text = (value) => String(value ?? "").trim();

export const CLUB_STRENGTH_VERSION = "tbg-club-strength-v0.1";

export const DEFAULT_STRENGTH_POLICY = Object.freeze({
  first_team_size: 20,
  starting_xi_size: 11,
  depth_size: 9,
  youth_age_max: 21,
  weights: {
    starting_xi: 0.60,
    first_team_depth: 0.22,
    positional_balance: 0.13,
    youth_strength: 0.05
  },
  positional_requirements: {
    GK: 1,
    DEF: 4,
    MID: 3,
    ATT: 3
  },
  missing_position_penalty: 1.5
});

function ratingOf(player) {
  return number(
    player.underlying_ability_rating ??
    player.tbg_rating ??
    player.tbgRating ??
    player.effective_match_rating ??
    player.rating,
    0
  );
}

function ageOf(player) {
  return number(player.age, 99);
}

function positionGroup(player) {
  const raw = text(player.position_group || player.positionGroup || player.position_category || player.primary_position || player.position).toUpperCase();
  if (raw === "GK" || /GOAL/.test(raw)) return "GK";
  if (raw === "DEF" || /CENTRE-BACK|CENTER-BACK|FULL-BACK|WING-BACK|DEFENDER|\bCB\b|\bLB\b|\bRB\b/.test(raw)) return "DEF";
  if (raw === "MID" || /MIDFIELD|\bDM\b|\bCM\b|\bAM\b/.test(raw)) return "MID";
  if (raw === "ATT" || /FORWARD|STRIKER|WINGER|\bCF\b|\bST\b|\bLW\b|\bRW\b/.test(raw)) return "ATT";
  return "OTHER";
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value, digits = 2) {
  return Number(Number(value).toFixed(digits));
}

function chooseBestXi(players, policy) {
  const remaining = [...players].sort((a, b) => ratingOf(b) - ratingOf(a) || text(a.tbg_player_id).localeCompare(text(b.tbg_player_id)));
  const selected = [];
  for (const [group, required] of Object.entries(policy.positional_requirements)) {
    for (let index = 0; index < required; index += 1) {
      const playerIndex = remaining.findIndex((player) => positionGroup(player) === group);
      if (playerIndex === -1) break;
      selected.push(remaining.splice(playerIndex, 1)[0]);
    }
  }
  while (selected.length < policy.starting_xi_size && remaining.length) selected.push(remaining.shift());
  return { selected, remaining };
}

function positionalBalance(players, policy) {
  const counts = players.reduce((memo, player) => {
    const group = positionGroup(player);
    memo[group] = (memo[group] || 0) + 1;
    return memo;
  }, {});
  const requiredTotal = Object.values(policy.positional_requirements).reduce((sum, value) => sum + value, 0);
  let fulfilled = 0;
  let shortages = 0;
  for (const [group, required] of Object.entries(policy.positional_requirements)) {
    fulfilled += Math.min(required, counts[group] || 0);
    shortages += Math.max(0, required - (counts[group] || 0));
  }
  const coverage = requiredTotal ? fulfilled / requiredTotal : 0;
  return {
    score: Math.max(0, 100 * coverage - shortages * policy.missing_position_penalty),
    counts,
    shortages
  };
}

export function calculateClubStrength(club, playersById, policy = DEFAULT_STRENGTH_POLICY) {
  const squadPlayers = (club.squad?.player_ids || [])
    .map((id) => playersById.get(id))
    .filter(Boolean)
    .sort((a, b) => ratingOf(b) - ratingOf(a) || text(a.tbg_player_id).localeCompare(text(b.tbg_player_id)));
  const firstTeam = squadPlayers.slice(0, policy.first_team_size);
  const { selected: startingXi, remaining } = chooseBestXi(firstTeam, policy);
  const depth = remaining.slice(0, policy.depth_size);
  const youth = squadPlayers.filter((player) => ageOf(player) <= policy.youth_age_max).slice(0, 10);
  const balance = positionalBalance(firstTeam, policy);
  const xiAverage = average(startingXi.map(ratingOf));
  const depthAverage = average(depth.map(ratingOf));
  const youthAverage = average(youth.map(ratingOf));
  const weighted =
    xiAverage * policy.weights.starting_xi +
    depthAverage * policy.weights.first_team_depth +
    balance.score * policy.weights.positional_balance +
    youthAverage * policy.weights.youth_strength;

  return {
    tbg_club_id: club.tbg_club_id,
    club_name: club.canonical_name,
    strength_score: round(weighted),
    components: {
      starting_xi_average: round(xiAverage),
      first_team_depth_average: round(depthAverage),
      positional_balance_score: round(balance.score),
      youth_strength_average: round(youthAverage)
    },
    squad: {
      assigned_players: squadPlayers.length,
      rated_players: squadPlayers.filter((player) => ratingOf(player) > 0).length,
      first_team_players_used: firstTeam.length,
      starting_xi_player_ids: startingXi.map((player) => player.tbg_player_id),
      depth_player_ids: depth.map((player) => player.tbg_player_id),
      youth_player_ids: youth.map((player) => player.tbg_player_id),
      position_counts: balance.counts,
      position_shortages: balance.shortages
    }
  };
}

export function seedWorldDivisions(world, policy = DEFAULT_STRENGTH_POLICY) {
  if (!world || !Array.isArray(world.clubs) || !Array.isArray(world.players)) throw new Error("Invalid world state.");
  if (world.clubs.length !== 80) throw new Error(`Division seeding requires exactly 80 clubs; received ${world.clubs.length}.`);
  if (world.rules?.divisions !== 4 || world.rules?.clubs_per_division !== 20) throw new Error("Division seeding requires four divisions of twenty clubs.");

  const playersById = new Map(world.players.map((player) => [player.tbg_player_id, player]));
  const rankings = world.clubs
    .map((club) => calculateClubStrength(club, playersById, policy))
    .sort((a, b) => b.strength_score - a.strength_score || a.club_name.localeCompare(b.club_name) || a.tbg_club_id.localeCompare(b.tbg_club_id))
    .map((entry, index) => ({ ...entry, world_rank: index + 1, division_level: Math.floor(index / 20) + 1, division_seed: (index % 20) + 1 }));

  const rankingByClub = new Map(rankings.map((entry) => [entry.tbg_club_id, entry]));
  const clubs = world.clubs.map((club) => {
    const ranking = rankingByClub.get(club.tbg_club_id);
    return {
      ...club,
      division_id: `division-${ranking.division_level}`,
      division_seed: ranking.division_seed,
      seeding_status: "frozen_inaugural_membership",
      strength: ranking
    };
  });

  const divisions = Array.from({ length: 4 }, (_, index) => {
    const level = index + 1;
    const existing = world.divisions.find((division) => division.level === level) || {};
    const members = rankings.filter((entry) => entry.division_level === level);
    return {
      ...existing,
      division_id: `division-${level}`,
      level,
      name: `Division ${level}`,
      club_capacity: 20,
      club_ids: members.map((entry) => entry.tbg_club_id),
      seeding_status: "frozen_inaugural_membership",
      inaugural_strength_range: {
        strongest: members[0]?.strength_score ?? null,
        weakest: members.at(-1)?.strength_score ?? null
      }
    };
  });

  const competitions = world.competitions.map((competition) => competition.type === "league"
    ? { ...competition, club_capacity: 20, matchdays: 38, status: "inaugural_membership_frozen", club_ids: divisions.find((division) => division.level === competition.level)?.club_ids || [] }
    : competition);

  const seededWorld = {
    ...world,
    status: "inaugural_divisions_seeded",
    strength_version: CLUB_STRENGTH_VERSION,
    strength_policy: policy,
    clubs,
    divisions,
    competitions,
    inaugural_division_membership: {
      frozen_at: new Date().toISOString(),
      principle: "The inaugural 80 clubs are ranked by weighted assigned-squad strength. Reputation and launch-slot importance do not affect the strength score.",
      rankings
    }
  };

  const errors = validateSeededWorld(seededWorld);
  if (errors.length) {
    const error = new Error(`Invalid seeded world: ${errors[0]}`);
    error.validationErrors = errors;
    throw error;
  }
  return seededWorld;
}

export function validateSeededWorld(world) {
  const errors = [];
  if (world.divisions.length !== 4) errors.push(`Expected 4 divisions; received ${world.divisions.length}.`);
  for (const division of world.divisions) {
    if (division.club_ids.length !== 20) errors.push(`${division.name} has ${division.club_ids.length} clubs instead of 20.`);
    if (new Set(division.club_ids).size !== division.club_ids.length) errors.push(`${division.name} contains duplicate clubs.`);
  }
  const allIds = world.divisions.flatMap((division) => division.club_ids);
  if (allIds.length !== 80 || new Set(allIds).size !== 80) errors.push("The four divisions do not contain exactly 80 unique clubs.");
  if (world.clubs.some((club) => !club.division_id || !club.division_seed || !club.strength)) errors.push("At least one club lacks frozen division or strength metadata.");
  return errors;
}

export function summariseDivisionSeeding(world) {
  const rankings = world.inaugural_division_membership?.rankings || [];
  return {
    world_id: world.world_id,
    status: world.status,
    strength_version: world.strength_version,
    clubs: world.clubs.length,
    divisions: world.divisions.length,
    clubs_per_division: 20,
    strongest_club: rankings[0] || null,
    weakest_club: rankings.at(-1) || null,
    division_summaries: world.divisions.map((division) => ({
      division_id: division.division_id,
      name: division.name,
      clubs: division.club_ids.length,
      strongest_score: division.inaugural_strength_range.strongest,
      weakest_score: division.inaugural_strength_range.weakest
    })),
    validation_errors: validateSeededWorld(world)
  };
}
