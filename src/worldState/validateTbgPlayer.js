const VALID_STATUSES = new Set(["active", "without_club", "retired", "unknown"]);
const VALID_POSITION_GROUPS = new Set(["GK", "DEF", "MID", "ATT", "UNK"]);
const VALID_ASSIGNMENT_STATUSES = new Set(["assigned", "unsigned"]);

function isRating(value) {
  return value === null || (typeof value === "number" && value >= 40 && value <= 99);
}

export function validateTbgPlayer(player) {
  const errors = [];

  if (!player || typeof player !== "object") return ["Player must be an object."];
  if (!player.tbg_player_id) errors.push("Missing tbg_player_id.");
  if (!player.display_name) errors.push("Missing display_name.");
  if (!VALID_STATUSES.has(player.status)) errors.push(`Invalid status: ${player.status}`);
  if (!VALID_POSITION_GROUPS.has(player.position_group)) errors.push(`Invalid position_group: ${player.position_group}`);
  if (!VALID_ASSIGNMENT_STATUSES.has(player.assignment_status)) errors.push(`Invalid assignment_status: ${player.assignment_status}`);
  if (!isRating(player.underlying_ability_rating)) errors.push(`Invalid underlying_ability_rating: ${player.underlying_ability_rating}`);
  if (!isRating(player.effective_match_rating)) errors.push(`Invalid effective_match_rating: ${player.effective_match_rating}`);
  if (typeof player.age !== "number" && player.age !== null) errors.push(`Invalid age: ${player.age}`);
  if (typeof player.market_value_eur !== "number") errors.push(`Invalid market_value_eur: ${player.market_value_eur}`);

  return errors;
}

export function validateTbgPlayers(players, { maxErrors = 25 } = {}) {
  const errors = [];
  const seenIds = new Set();

  if (!Array.isArray(players)) return ["Players payload must be an array."];

  for (const [index, player] of players.entries()) {
    const id = player?.tbg_player_id;
    if (id && seenIds.has(id)) errors.push(`Duplicate tbg_player_id at index ${index}: ${id}`);
    if (id) seenIds.add(id);

    for (const error of validateTbgPlayer(player)) {
      errors.push(`Player ${id || index}: ${error}`);
      if (errors.length >= maxErrors) return errors;
    }
  }

  return errors;
}
