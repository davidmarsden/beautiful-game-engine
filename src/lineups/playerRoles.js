const POSITION_ROLE_MAP = Object.freeze({
  goalkeeper: ["GK"],
  keeper: ["GK"],
  defender: ["CB", "RB", "LB", "RWB", "LWB"],
  centreback: ["CB"],
  centerback: ["CB"],
  fullback: ["RB", "LB", "RWB", "LWB"],
  midfielder: ["CM", "DM", "AM", "RM", "LM"],
  defensive_midfielder: ["DM", "CM"],
  attacking_midfielder: ["AM", "CM", "LW", "RW"],
  winger: ["LW", "RW", "LM", "RM"],
  attacker: ["ST", "LW", "RW", "AM"],
  forward: ["ST", "LW", "RW"],
  striker: ["ST"]
});

const ROLE_GROUPS = Object.freeze({
  GK: "goalkeeper",
  CB: "defence",
  RB: "defence",
  LB: "defence",
  RWB: "defence",
  LWB: "defence",
  DM: "midfield",
  CM: "midfield",
  AM: "midfield",
  RM: "wide",
  LM: "wide",
  RW: "wide",
  LW: "wide",
  ST: "attack"
});

function normalisePosition(position) {
  return String(position ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function playerRoles(player) {
  if (Array.isArray(player.roles) && player.roles.length) return player.roles;

  const position = normalisePosition(player.position);

  for (const [key, roles] of Object.entries(POSITION_ROLE_MAP)) {
    if (position.includes(key)) return roles;
  }

  return ["CM"];
}

export function playerRating(player) {
  return Number(player.ratings?.effectiveMatchRating ?? player.ratings?.ability ?? player.rating ?? 50);
}

export function roleFitScore(player, slot) {
  const roles = playerRoles(player);
  const rating = playerRating(player);

  if (roles.includes(slot)) return rating;

  const slotGroup = ROLE_GROUPS[slot];
  const hasSameGroupRole = roles.some((role) => ROLE_GROUPS[role] === slotGroup);

  if (hasSameGroupRole) return rating - 4;

  if (slotGroup === "wide" && roles.some((role) => ["AM", "ST"].includes(role))) return rating - 8;
  if (slotGroup === "attack" && roles.some((role) => ["LW", "RW", "AM"].includes(role))) return rating - 7;
  if (slotGroup === "midfield" && roles.some((role) => ["RM", "LM", "AM"].includes(role))) return rating - 5;
  if (slotGroup === "defence" && roles.some((role) => ["DM"].includes(role))) return rating - 9;

  return rating - 18;
}
