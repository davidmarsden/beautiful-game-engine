import { seedClubsByStrength, CLUB_STRENGTH_MODEL_VERSION, DEFAULT_STRENGTH_WEIGHTS } from "./calculateClubStrength.js";

export const DIVISION_SEEDING_VERSION = "tbg-inaugural-seeding-v0.1";

function createDivisions(ranked) {
  return Array.from({ length: 4 }, (_, index) => {
    const level = index + 1;
    const members = ranked.filter((entry) => entry.division_level === level);
    return {
      division_id: `division-${level}`,
      level,
      name: `Division ${level}`,
      club_capacity: 20,
      club_ids: members.map((entry) => entry.club.tbg_club_id),
      seeds: members.map((entry) => ({
        seed: entry.division_seed,
        world_rank: entry.world_rank,
        tbg_club_id: entry.club.tbg_club_id,
        club_name: entry.club.canonical_name,
        strength_score: entry.strength.strength_score
      })),
      seeding_status: "inaugural_membership_frozen",
      competition_id: `league-division-${level}`,
      promotion_places: level === 1 ? 0 : 4,
      relegation_places: level === 4 ? 0 : 4,
      automatic_sacking_places: 3
    };
  });
}

function createCompetitions() {
  return [
    ...Array.from({ length: 4 }, (_, index) => ({
      competition_id: `league-division-${index + 1}`,
      name: `TBG Division ${index + 1}`,
      type: "league",
      level: index + 1,
      club_capacity: 20,
      format: "double_round_robin",
      matchdays: 38,
      status: "inaugural_membership_frozen"
    })),
    {
      competition_id: "tbg-cup",
      name: "The Beautiful Game Cup",
      type: "knockout_cup",
      club_capacity: 80,
      format: "to_be_ratified",
      status: "foundation_shell"
    }
  ];
}

export function applyInauguralDivisionSeeding(world) {
  const ranked = seedClubsByStrength(world.clubs, world.players, { divisions: 4, clubsPerDivision: 20 });
  const clubs = ranked.map(({ club, strength, world_rank, division_level, division_seed }) => ({
    ...club,
    world_strength_rank: world_rank,
    club_strength: strength,
    division_id: `division-${division_level}`,
    division_seed,
    seeding_status: "inaugural_membership_frozen",
    history: {
      ...club.history,
      division_history: [{
        season_id: world.active_season_id,
        division_id: `division-${division_level}`,
        entry_reason: "inaugural_strength_seeding",
        strength_rank_at_entry: world_rank
      }]
    }
  }));
  const divisions = createDivisions(ranked);
  const competitions = createCompetitions();
  const standings = divisions.flatMap((division) => division.club_ids.map((clubId, index) => ({
    season_id: world.active_season_id,
    division_id: division.division_id,
    tbg_club_id: clubId,
    preseason_seed: index + 1,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goals_for: 0,
    goals_against: 0,
    goal_difference: 0,
    points: 0
  })));

  return {
    ...world,
    status: "inaugural_divisions_frozen",
    rules: {
      ...world.rules,
      divisions: 4,
      clubs_per_division: 20,
      league_matchdays: 38
    },
    clubs,
    divisions,
    competitions,
    season: {
      ...world.season,
      status: "divisions_seeded",
      calendar: {
        ...world.season.calendar,
        league_matchdays: Array.from({ length: 38 }, (_, index) => ({ matchday: index + 1, fixture_status: "not_generated" }))
      },
      standings
    },
    histories: {
      ...world.histories,
      divisions: divisions.map((division) => ({
        season_id: world.active_season_id,
        division_id: division.division_id,
        club_ids: division.club_ids,
        status: "frozen"
      }))
    },
    inaugural_seeding: {
      version: DIVISION_SEEDING_VERSION,
      strength_model_version: CLUB_STRENGTH_MODEL_VERSION,
      weights: DEFAULT_STRENGTH_WEIGHTS,
      frozen_at: new Date().toISOString(),
      principle: "The 80 launch clubs are ranked by weighted assigned-squad strength and placed sequentially into four divisions of 20. Reputation and launch slot are used only as final deterministic tie-breakers.",
      rankings: ranked.map((entry) => ({
        world_rank: entry.world_rank,
        division_level: entry.division_level,
        division_seed: entry.division_seed,
        tbg_club_id: entry.club.tbg_club_id,
        club_name: entry.club.canonical_name,
        strength: entry.strength
      }))
    },
    diagnostics: {
      ...world.diagnostics,
      division_seeding_errors: validateSeededWorld({ clubs, divisions, standings })
    }
  };
}

export function validateSeededWorld({ clubs, divisions, standings }) {
  const errors = [];
  if (divisions.length !== 4) errors.push(`Expected 4 divisions; received ${divisions.length}.`);
  if (divisions.some((division) => division.club_ids.length !== 20)) errors.push("Every division must contain exactly 20 clubs.");
  if (new Set(divisions.flatMap((division) => division.club_ids)).size !== 80) errors.push("Division membership must contain 80 unique clubs.");
  if (clubs.some((club) => !club.division_id || !club.club_strength)) errors.push("Every club must have a division and strength record.");
  if (standings.length !== 80) errors.push(`Expected 80 initial standings rows; received ${standings.length}.`);
  return errors;
}
