function normalise(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function seededNumber(seedText) {
  let seed = 2166136261;
  for (const char of String(seedText)) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function shuffle(items, seedText) {
  const result = [...items];
  let seed = seededNumber(seedText);
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0;
    const swapIndex = seed % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function weightedTickets(manager) {
  const weight = Math.max(1, Math.floor(Number(manager.priority_weight ?? 1)));
  return Array.from({ length: weight }, (_, index) => ({ ...manager, ticket_index: index + 1 }));
}

function buildClubIndex(clubs) {
  const byName = new Map();
  for (const club of clubs) {
    byName.set(normalise(club.name || club.club_name), club);
    byName.set(normalise(club.club_name), club);
    byName.set(normalise(club.id || club.club_id), club);
  }
  return byName;
}

function resolvePreference(preference, byClubName) {
  return byClubName.get(normalise(preference)) || null;
}

function managerKey(manager) {
  return manager.manager_id || normalise(manager.manager_name);
}

export function allocateManagerClubs({ clubs = [], preferences = {}, seed = "tbg-club-lottery" } = {}) {
  const managerRows = preferences.managers || [];
  const lotterySeed = preferences.lottery_seed || seed;
  const byClubName = buildClubIndex(clubs);
  const assignedClubIds = new Set();
  const assignedManagerKeys = new Set();
  const allocations = [];
  const unresolvedPreferences = [];

  const ticketOrder = shuffle(managerRows.flatMap(weightedTickets), lotterySeed);
  const drawOrder = [];

  for (const ticket of ticketOrder) {
    const key = managerKey(ticket);
    if (assignedManagerKeys.has(key)) continue;
    assignedManagerKeys.add(key);
    drawOrder.push({ manager_id: ticket.manager_id || "", manager_name: ticket.manager_name, priority_weight: ticket.priority_weight ?? 1 });
  }

  for (const manager of drawOrder) {
    const original = managerRows.find((row) => managerKey(row) === (manager.manager_id || normalise(manager.manager_name))) || manager;
    const preferencesList = original.preferences || [];
    let chosen = null;
    let chosenPreferenceRank = null;
    const unresolved = [];

    for (const [index, preference] of preferencesList.entries()) {
      const club = resolvePreference(preference, byClubName);
      if (!club) {
        unresolved.push(preference);
        continue;
      }
      const clubId = club.id || club.club_id;
      if (!assignedClubIds.has(clubId)) {
        chosen = club;
        chosenPreferenceRank = index + 1;
        break;
      }
    }

    if (chosen) {
      const clubId = chosen.id || chosen.club_id;
      assignedClubIds.add(clubId);
      allocations.push({
        manager_id: manager.manager_id || "",
        manager_name: manager.manager_name,
        club_id: clubId,
        club_name: chosen.name || chosen.club_name,
        division: chosen.division ?? null,
        rating: chosen.rating ?? chosen.weighted_squad_strength ?? null,
        preference_rank: chosenPreferenceRank,
        allocation_status: "allocated"
      });
    } else {
      allocations.push({
        manager_id: manager.manager_id || "",
        manager_name: manager.manager_name,
        club_id: "",
        club_name: "",
        division: null,
        rating: null,
        preference_rank: null,
        allocation_status: "unassigned"
      });
    }

    if (unresolved.length) {
      unresolvedPreferences.push({
        manager_id: manager.manager_id || "",
        manager_name: manager.manager_name,
        unresolved_preferences: unresolved
      });
    }
  }

  const unclaimedClubs = clubs
    .filter((club) => !assignedClubIds.has(club.id || club.club_id))
    .map((club) => ({
      club_id: club.id || club.club_id,
      club_name: club.name || club.club_name,
      division: club.division ?? null,
      rating: club.rating ?? club.weighted_squad_strength ?? null,
      continent: club.continent || "",
      league: club.league || ""
    }))
    .sort((a, b) => Number(a.division ?? 99) - Number(b.division ?? 99) || Number(b.rating ?? 0) - Number(a.rating ?? 0));

  return {
    version: "tbg-club-allocation-v0.1",
    lottery_seed: lotterySeed,
    draw_order: drawOrder,
    allocations,
    unassigned_managers: allocations.filter((allocation) => allocation.allocation_status === "unassigned"),
    unclaimed_clubs: unclaimedClubs,
    unresolved_preferences: unresolvedPreferences,
    summary: {
      managers: managerRows.length,
      allocated: allocations.filter((allocation) => allocation.allocation_status === "allocated").length,
      unassigned: allocations.filter((allocation) => allocation.allocation_status === "unassigned").length,
      clubs: clubs.length,
      unclaimed_clubs: unclaimedClubs.length
    }
  };
}
