import { createHash } from "node:crypto";
import { validateTbgPlayers } from "./validateTbgPlayer.js";

const CONTRACT_VERSION = "tbg-contract-v0.1";
const ENGINE_VERSION = "beautiful-game-engine@0.1.0";

function stableHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function normaliseClubId(value) {
  return String(value || "").trim();
}

function playerSort(a, b) {
  return (Number(b.underlying_ability_rating ?? 0) - Number(a.underlying_ability_rating ?? 0))
    || (Number(b.market_value_eur ?? 0) - Number(a.market_value_eur ?? 0))
    || String(a.display_name).localeCompare(String(b.display_name));
}

function clubSort(a, b) {
  return Number(a.division) - Number(b.division) || String(a.club_name).localeCompare(String(b.club_name));
}

function inferClubName(player) {
  return player.tbg_club_name || player.current_club || "Unassigned Club";
}

function inferClubId(player, fallbackIndex) {
  return normaliseClubId(player.tbg_club_id)
    || normaliseClubId(player.current_club_id && `tm-club-${player.current_club_id}`)
    || `club-${String(fallbackIndex + 1).padStart(3, "0")}`;
}

function buildClubFromPlayers(clubId, clubPlayers, index) {
  const sample = clubPlayers[0] || {};
  const squad = clubPlayers.map((player) => player.tbg_player_id).sort();
  const averageAbility = clubPlayers.length
    ? clubPlayers.reduce((sum, player) => sum + Number(player.underlying_ability_rating ?? 0), 0) / clubPlayers.length
    : 0;

  return {
    tbg_club_id: clubId,
    club_name: inferClubName(sample),
    short_name: inferClubName(sample),
    division: sample.tbg_division || sample.division || "unassigned",
    country: sample.country || "",
    reputation: Math.max(1, Math.round(averageAbility || 1)),
    budget_eur: 0,
    wage_budget_eur: 0,
    manager: {
      manager_id: sample.owner_manager ? `manager-${clubId}` : "",
      manager_name: sample.owner_manager || "",
      manager_type: sample.owner_manager ? "human" : "vacant"
    },
    squad,
    tactics: {
      formation: "4-2-3-1",
      mentality: "balanced",
      pressing: "standard",
      tempo: "standard",
      width: "standard"
    },
    world_state_index: index
  };
}

function buildClubsFromAssignedPlayers(players) {
  const assigned = players.filter((player) => player.assignment_status === "assigned" && player.tbg_player_id);
  const byClub = new Map();

  for (const player of assigned) {
    const clubId = inferClubId(player, byClub.size);
    if (!byClub.has(clubId)) byClub.set(clubId, []);
    byClub.get(clubId).push(player);
  }

  return [...byClub.entries()]
    .map(([clubId, clubPlayers], index) => buildClubFromPlayers(clubId, clubPlayers.sort(playerSort), index))
    .sort(clubSort);
}

function emptyDiagnostics(players, clubs) {
  return {
    engine_version: ENGINE_VERSION,
    data_contract_version: CONTRACT_VERSION,
    seasons_simulated: 0,
    closed_world_warning: "This world-state loader validates data shape only. It does not test real-life player development or future human manager transfer decisions.",
    summary_status: "info",
    player_count: players.length,
    club_count: clubs.length,
    assigned_player_count: players.filter((player) => player.assignment_status === "assigned").length,
    unsigned_player_count: players.filter((player) => player.assignment_status === "unsigned").length,
    season_diagnostics: []
  };
}

export function buildWorldStateFromPlayerPools({
  globalPlayers = [],
  gamePlayers = [],
  unsignedPlayers = [],
  submittedPlayers = [],
  seasonId = "season-001",
  worldId = "tbg-alpha-world",
  generatedAt = new Date().toISOString()
} = {}) {
  const players = [...gamePlayers, ...unsignedPlayers].length ? [...gamePlayers, ...unsignedPlayers] : globalPlayers;
  const validationErrors = validateTbgPlayers(players);
  if (validationErrors.length) {
    const error = new Error(`Invalid TBG player pool: ${validationErrors[0]}`);
    error.validationErrors = validationErrors;
    throw error;
  }

  const sortedPlayers = [...players].sort(playerSort);
  const clubs = buildClubsFromAssignedPlayers(sortedPlayers);
  const dataSnapshotId = stableHash({ players: sortedPlayers.map((player) => [player.tbg_player_id, player.underlying_ability_rating, player.assignment_status, player.tbg_club_id]), submittedPlayers });

  return {
    world_id: worldId,
    contract_version: CONTRACT_VERSION,
    generated_at: generatedAt,
    data_snapshot_id: dataSnapshotId,
    season_id: seasonId,
    players: sortedPlayers,
    clubs,
    competitions: [],
    fixtures: [],
    transfers: submittedPlayers.map((submission, index) => ({
      transfer_id: `submission-${String(index + 1).padStart(5, "0")}`,
      season_id: seasonId,
      tbg_player_id: submission.tbg_player_id || "pending-player-import",
      transfermarkt_id: submission.transfermarkt_id || "",
      from_club_id: null,
      to_club_id: null,
      transfer_type: "manager_submission",
      fee_eur: null,
      wage_eur: null,
      contract_until: "",
      status: submission.status === "pending" ? "proposed" : submission.status || "proposed",
      actor: {
        actor_type: "human_manager",
        actor_id: submission.submitted_by || "",
        actor_name: submission.submitted_by || ""
      },
      created_at: submission.submitted_at || generatedAt,
      completed_at: ""
    })),
    diagnostics: emptyDiagnostics(sortedPlayers, clubs)
  };
}

export function summariseWorldState(worldState) {
  const players = worldState.players || [];
  const clubs = worldState.clubs || [];
  return {
    world_id: worldState.world_id,
    contract_version: worldState.contract_version,
    data_snapshot_id: worldState.data_snapshot_id,
    players: players.length,
    clubs: clubs.length,
    assigned_players: players.filter((player) => player.assignment_status === "assigned").length,
    unsigned_players: players.filter((player) => player.assignment_status === "unsigned").length,
    average_ability: players.length
      ? Number((players.reduce((sum, player) => sum + Number(player.underlying_ability_rating ?? 0), 0) / players.length).toFixed(2))
      : 0,
    top_players: players.slice(0, 10).map((player) => ({
      name: player.display_name,
      ability: player.underlying_ability_rating,
      effective: player.effective_match_rating,
      club: player.tbg_club_name || player.current_club || "Unsigned"
    }))
  };
}
