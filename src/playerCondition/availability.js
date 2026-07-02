export function availabilityStatus(player = {}) {
  if (player.availability?.injured) return "injured";
  if (player.availability?.suspended) return "suspended";
  if (player.availability?.unregistered) return "unregistered";
  if (Number(player.condition?.fatigue ?? 0) >= 90) return "exhausted";
  return "available";
}

export function isPlayerAvailable(player = {}) {
  return availabilityStatus(player) === "available";
}

export function availabilityReason(player = {}) {
  const status = availabilityStatus(player);
  return status === "available" ? null : status;
}
