import { createHash } from "node:crypto";

export const WORLD_FOUNDATION_VERSION = "tbg-world-foundation-v0.2";
export const WORLD_CONTRACT_VERSION = "tbg-world-contract-v1.0";

const text = (value) => String(value ?? "").trim();
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const normalise = (value) => text(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const stableHash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 20);
const stableClubId = (slot) => `tbg-club-${String(slot).padStart(3, "0")}`;
const stableManagerSlotId = (slot) => `manager-slot-${String(slot).padStart(3, "0")}`;

function playersArray(value) { return Array.isArray(value) ? value : value?.players || []; }
function clubsArray(value) { return Array.isArray(value) ? value : value?.clubs || []; }

function buildClubIndexes(clubs) {
  const byTmId = new Map();
  const byName = new Map();
  for (const club of clubs) {
    if (club.transfermarkt_club_id) byTmId.set(text(club.transfermarkt_club_id), club);
    byName.set(normalise(club.name), club);
  }
  return { byTmId, byName };
}

function sourceClubForPlayer(player, indexes) {
  const id = text(player.tbg_club_id || player.current_club_id || player.transfermarkt_club_id);
  if (id && indexes.byTmId.has(id)) return indexes.byTmId.get(id);
  const name = normalise(player.tbg_club_name || player.current_club || player.club_name);
  return indexes.byName.get(name) || null;
}

function createDivisionShells() {
  return Array.from({ length: 4 }, (_, index) => ({
    division_id: `division-${index + 1}`,
    level: index + 1,
    name: `Division ${index + 1}`,
    club_capacity: 20,
    club_ids: [],
    seeding_status: "pending_club_strength",
    competition_id: `league-division-${index + 1}`,
    promotion_places: index === 0 ? 0 : 4,
    relegation_places: index === 3 ? 0 : 4,
    automatic_sacking_places: 3
  }));
}

function createCompetitionShells() {
  return [
    ...Array.from({ length: 4 }, (_, index) => ({
      competition_id: `league-division-${index + 1}`,
      name: `TBG Division ${index + 1}`,
      type: "league",
      level: index + 1,
      club_capacity: 20,
      format: "double_round_robin",
      matchdays: 38,
      status: "awaiting_division_seeding"
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

function createCalendarShell(seasonId) {
  return {
    season_id: seasonId,
    status: "unscheduled",
    date_policy: "Dates are assigned when the season generator is configured.",
    league_matchdays: Array.from({ length: 38 }, (_, index) => ({ matchday: index + 1, fixture_status: "not_generated" })),
    cup_rounds: [],
    transfer_windows: [],
    international_breaks: []
  };
}

function buildWorldClubs(clubUniverse, assignedPlayers) {
  const assignedByClub = new Map();
  const universeClubs = clubsArray(clubUniverse).filter((club) => number(club.slot) <= 80);
  const indexes = buildClubIndexes(universeClubs);
  for (const player of assignedPlayers) {
    const club = sourceClubForPlayer(player, indexes);
    if (!club) continue;
    const key = text(club.transfermarkt_club_id);
    if (!assignedByClub.has(key)) assignedByClub.set(key, []);
    assignedByClub.get(key).push(player);
  }
  return universeClubs.sort((a, b) => number(a.slot) - number(b.slot)).map((club) => {
    const squadPlayers = assignedByClub.get(text(club.transfermarkt_club_id)) || [];
    const clubId = stableClubId(club.slot);
    return {
      tbg_club_id: clubId,
      launch_slot: number(club.slot),
      canonical_name: club.name,
      short_name: club.short_name || club.name,
      transfermarkt_club_id: text(club.transfermarkt_club_id),
      country: club.country || "",
      continent: club.continent || "",
      real_world_league: club.league || "",
      importance: number(club.importance),
      division_id: null,
      division_seed: null,
      seeding_status: "pending_club_strength",
      manager_slot_id: stableManagerSlotId(club.slot),
      squad: {
        player_ids: squadPlayers.map((player) => player.tbg_player_id).filter(Boolean).sort(),
        first_team_capacity: 25,
        youth_team_capacity: 20,
        launch_first_team_cap: 20,
        launch_youth_team_cap: 10,
        assigned_players: squadPlayers.length
      },
      finances: { balance_eur: null, transfer_budget_eur: null, wage_budget_eur: null, status: "awaiting_finance_initialisation" },
      tactics: { formation: null, mentality: null, pressing: null, tempo: null, width: null, status: "awaiting_manager" },
      history: { founded_in_world_season: "season-001", honours: [], division_history: [], manager_history: [] }
    };
  });
}

function buildPlayerOwnership(players, clubs) {
  const clubByPlayerId = new Map();
  for (const club of clubs) for (const playerId of club.squad.player_ids) clubByPlayerId.set(playerId, club.tbg_club_id);
  return players.map((player) => {
    const clubId = clubByPlayerId.get(player.tbg_player_id) || null;
    return {
      tbg_player_id: player.tbg_player_id,
      transfermarkt_id: text(player.transfermarkt_id || player.transfermarkt_player_id),
      display_name: player.display_name || player.player_name || player.canonical_name || "",
      ownership_status: clubId ? "club_owned" : "unsigned",
      tbg_club_id: clubId,
      contract: clubId ? {
        contract_id: `contract-${player.tbg_player_id}`,
        status: "active_launch_contract",
        starts_season_id: "season-001",
        expires_season_id: null,
        wage_eur: null,
        squad_registration: number(player.age) <= 21 ? "youth_eligible" : "senior"
      } : null,
      career: {
        current_season_appearances: 0,
        current_season_goals: 0,
        current_season_assists: 0,
        current_season_cards: { yellow: 0, red: 0 },
        club_history: clubId ? [{ tbg_club_id: clubId, from_season_id: "season-001", to_season_id: null, appearances: 0, goals: 0 }] : []
      }
    };
  });
}

function validateFoundation(world) {
  const errors = [];
  if (world.clubs.length !== 80) errors.push(`Expected 80 clubs; received ${world.clubs.length}.`);
  if (world.divisions.length !== 4) errors.push(`Expected 4 divisions; received ${world.divisions.length}.`);
  if (world.divisions.some((division) => division.club_capacity !== 20)) errors.push("Every division must have capacity 20.");
  if (new Set(world.clubs.map((club) => club.tbg_club_id)).size !== world.clubs.length) errors.push("Duplicate TBG club IDs detected.");
  if (new Set(world.players.map((player) => player.tbg_player_id)).size !== world.players.length) errors.push("Duplicate TBG player IDs detected.");
  const ownershipIds = new Set(world.player_ownership.map((row) => row.tbg_player_id));
  const unknownSquadPlayers = world.clubs.flatMap((club) => club.squad.player_ids).filter((id) => !ownershipIds.has(id));
  if (unknownSquadPlayers.length) errors.push(`${unknownSquadPlayers.length} squad player IDs are absent from the ownership ledger.`);
  return errors;
}

export function buildWorldFoundation({ clubUniverse, gamePlayers = [], unsignedPlayers = [], worldId = "tbg-world-001", seasonId = "season-001", generatedAt = new Date().toISOString() }) {
  const assigned = playersArray(gamePlayers);
  const unsigned = playersArray(unsignedPlayers);
  const allPlayers = [...assigned, ...unsigned];
  const clubs = buildWorldClubs(clubUniverse, assigned);
  const divisions = createDivisionShells();
  const playerOwnership = buildPlayerOwnership(allPlayers, clubs);
  const managerSlots = clubs.map((club) => ({ manager_slot_id: club.manager_slot_id, tbg_club_id: club.tbg_club_id, manager_id: null, manager_name: null, manager_type: "vacant", appointed_at: null, status: "open" }));
  const snapshot = {
    club_universe_version: clubUniverse.version || "unknown",
    clubs: clubs.map((club) => [club.tbg_club_id, club.transfermarkt_club_id, club.squad.player_ids]),
    players: playerOwnership.map((player) => [player.tbg_player_id, player.tbg_club_id])
  };
  const world = {
    world_id: worldId,
    contract_version: WORLD_CONTRACT_VERSION,
    foundation_version: WORLD_FOUNDATION_VERSION,
    generated_at: generatedAt,
    data_snapshot_id: stableHash(snapshot),
    status: "foundation_ready_for_strength_seeding",
    active_season_id: seasonId,
    rules: {
      playable_clubs: 80,
      divisions: 4,
      clubs_per_division: 20,
      promotion_places: 4,
      relegation_places: 4,
      automatic_sacking_places: 3,
      launch_first_team_cap: 20,
      launch_youth_team_cap: 10,
      full_first_team_capacity: 25,
      full_youth_team_capacity: 20
    },
    clubs,
    divisions,
    competitions: createCompetitionShells(),
    manager_slots: managerSlots,
    players: allPlayers,
    player_ownership: playerOwnership,
    season: {
      season_id: seasonId,
      ordinal: 1,
      status: "foundation",
      calendar: createCalendarShell(seasonId),
      fixtures: [], standings: [], transfers: [], disciplinary_events: [], injuries: [], honours: []
    },
    histories: { clubs: [], players: [], managers: [], divisions: [], honours: [] },
    diagnostics: {
      assigned_players: assigned.length,
      unsigned_players: unsigned.length,
      clubs_with_assigned_players: clubs.filter((club) => club.squad.assigned_players > 0).length,
      clubs_without_assigned_players: clubs.filter((club) => club.squad.assigned_players === 0).map((club) => club.tbg_club_id),
      validation_errors: []
    }
  };
  world.diagnostics.validation_errors = validateFoundation(world);
  if (world.diagnostics.validation_errors.length) {
    const error = new Error(`Invalid world foundation: ${world.diagnostics.validation_errors[0]}`);
    error.validationErrors = world.diagnostics.validation_errors;
    throw error;
  }
  return world;
}

export function summariseWorldFoundation(world) {
  return {
    world_id: world.world_id,
    contract_version: world.contract_version,
    foundation_version: world.foundation_version,
    data_snapshot_id: world.data_snapshot_id,
    status: world.status,
    clubs: world.clubs.length,
    divisions: world.divisions.length,
    clubs_per_division: world.rules.clubs_per_division,
    players: world.players.length,
    assigned_players: world.diagnostics.assigned_players,
    unsigned_players: world.diagnostics.unsigned_players,
    manager_slots: world.manager_slots.length,
    competitions: world.competitions.length,
    league_matchdays_planned: world.season.calendar.league_matchdays.length,
    division_seeding_status: "pending_club_strength",
    validation_errors: world.diagnostics.validation_errors
  };
}
