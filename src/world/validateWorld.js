import { WORLD_CONFIG } from "./constants.js";

function fail(message) {
  throw new Error(`Invalid world: ${message}`);
}

function assertUniqueIds(items, label) {
  const ids = items.map((item) => item.id);
  const uniqueIds = new Set(ids);

  if (ids.length !== uniqueIds.size) {
    fail(`${label} ids must be unique.`);
  }
}

export function validateWorld(world) {
  if (!world || typeof world !== "object") fail("world must be an object.");
  if (!world.meta?.seed) fail("world meta requires a seed.");
  if (!Array.isArray(world.clubs)) fail("clubs must be an array.");
  if (!Array.isArray(world.divisions)) fail("divisions must be an array.");

  if (world.clubs.length !== WORLD_CONFIG.totalClubs) {
    fail(`expected ${WORLD_CONFIG.totalClubs} clubs.`);
  }

  if (world.divisions.length !== WORLD_CONFIG.divisions) {
    fail(`expected ${WORLD_CONFIG.divisions} divisions.`);
  }

  assertUniqueIds(world.clubs, "club");
  assertUniqueIds(world.divisions, "division");

  const clubIds = new Set(world.clubs.map((club) => club.id));

  for (const division of world.divisions) {
    if (division.clubIds.length !== WORLD_CONFIG.clubsPerDivision) {
      fail(`${division.id} must contain ${WORLD_CONFIG.clubsPerDivision} clubs.`);
    }

    for (const clubId of division.clubIds) {
      if (!clubIds.has(clubId)) fail(`${division.id} contains unknown club ${clubId}.`);
    }
  }

  if (!Array.isArray(world.squads) || world.squads.length !== WORLD_CONFIG.totalClubs) {
    fail("one squad shell is required for each club.");
  }

  if (!Array.isArray(world.managerSlots) || world.managerSlots.length !== WORLD_CONFIG.totalClubs) {
    fail("one manager slot is required for each club.");
  }

  if (!Array.isArray(world.competitions) || world.competitions.length !== WORLD_CONFIG.divisions + 3) {
    fail("league and cup competition shells are required.");
  }

  if (!world.calendar?.leagueTurns || world.calendar.leagueTurns.length !== 38) {
    fail("calendar requires 38 league turns.");
  }

  return true;
}
