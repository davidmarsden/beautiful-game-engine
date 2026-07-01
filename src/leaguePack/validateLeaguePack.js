function fail(message) {
  throw new Error(`Invalid league pack: ${message}`);
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object.`);
  }
}

export function validateLeaguePack(pack) {
  assertObject(pack, "pack");
  assertObject(pack.meta, "meta");
  assertObject(pack.clubs, "clubs");
  assertObject(pack.players, "players");
  assertObject(pack.managerSlots, "managerSlots");

  if (pack.meta.version !== "league-pack-v0.1") {
    fail("unsupported version.");
  }

  if (!Array.isArray(pack.fixtures)) fail("fixtures must be an array.");
  if (!Array.isArray(pack.standings)) fail("standings must be an array.");

  const clubIds = Object.keys(pack.clubs);
  const playerIds = Object.keys(pack.players);
  const managerSlotIds = Object.keys(pack.managerSlots);

  if (!clubIds.length) fail("at least one club is required.");
  if (!playerIds.length) fail("at least one player is required.");

  for (const clubId of clubIds) {
    const club = pack.clubs[clubId];
    if (club.id !== clubId) fail(`club key mismatch for ${clubId}.`);
    if (!pack.managerSlots[clubId]) fail(`missing manager slot for ${clubId}.`);
  }

  for (const slotId of managerSlotIds) {
    if (!pack.clubs[slotId]) fail(`manager slot has unknown club ${slotId}.`);
  }

  for (const fixture of pack.fixtures) {
    if (fixture.homeTeamId && !pack.clubs[fixture.homeTeamId]) {
      fail(`fixture ${fixture.id} has unknown home team.`);
    }
    if (fixture.awayTeamId && !pack.clubs[fixture.awayTeamId]) {
      fail(`fixture ${fixture.id} has unknown away team.`);
    }
  }

  return true;
}
