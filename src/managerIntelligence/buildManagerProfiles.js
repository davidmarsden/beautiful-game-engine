function normaliseFormation(value) {
  return String(value ?? "unknown").trim() || "unknown";
}

function minuteFromEvent(event) {
  return Number(event.time?.elapsed ?? event.time?.elapsedTime ?? 0);
}

function isCardEvent(event) {
  return String(event.type ?? "").toLowerCase() === "card";
}

function isSubstitutionEvent(event) {
  return String(event.type ?? "").toLowerCase() === "subst" || String(event.type ?? "").toLowerCase() === "substitution";
}

function teamIdFromLineup(lineup) {
  return String(lineup.team?.id ?? lineup.team?.providerTeamId ?? "");
}

function teamIdFromEvent(event) {
  return String(event.team?.id ?? event.team?.providerTeamId ?? "");
}

function addFormation(profile, formation) {
  const key = normaliseFormation(formation);
  profile.formations[key] = (profile.formations[key] ?? 0) + 1;
}

function average(values) {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!clean.length) return null;
  return Number((clean.reduce((sum, value) => sum + value, 0) / clean.length).toFixed(1));
}

function topFormation(formations) {
  return Object.entries(formations).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "4-3-3";
}

function classifyRotation(uniqueStarters, matches) {
  if (!matches) return "unknown";
  const ratio = uniqueStarters / (matches * 11);
  if (ratio < 0.55) return "low";
  if (ratio < 0.75) return "medium";
  return "high";
}

function classifyAggression(cardsPerMatch) {
  if (cardsPerMatch < 1.6) return "low";
  if (cardsPerMatch < 2.4) return "medium";
  return "high";
}

function classifySubTiming(avgSubMinute) {
  if (!avgSubMinute) return "unknown";
  if (avgSubMinute < 58) return "early";
  if (avgSubMinute < 70) return "normal";
  return "late";
}

function emptyProfile(teamId, teamName = null) {
  return {
    teamId,
    teamName,
    matches: 0,
    formations: {},
    starterIds: new Set(),
    substitutionMinutes: [],
    cards: 0
  };
}

function finaliseProfile(profile) {
  const matches = profile.matches;
  const cardsPerMatch = matches ? Number((profile.cards / matches).toFixed(2)) : 0;
  const avgSubMinute = average(profile.substitutionMinutes);
  const preferredFormation = topFormation(profile.formations);

  return {
    teamId: profile.teamId,
    teamName: profile.teamName,
    matches,
    preferredFormation,
    formations: profile.formations,
    rotation: classifyRotation(profile.starterIds.size, matches),
    uniqueStarters: profile.starterIds.size,
    averageSubstitutionMinute: avgSubMinute,
    substitutionTiming: classifySubTiming(avgSubMinute),
    cards: profile.cards,
    cardsPerMatch,
    aggression: classifyAggression(cardsPerMatch),
    tacticalIntent: preferredFormation.includes("5") || preferredFormation.startsWith("3-") ? "structured" : "balanced"
  };
}

export function buildManagerProfilesFromFixtureDetails(fixtureDetailsRows) {
  const profiles = new Map();

  for (const fixtureDetail of fixtureDetailsRows ?? []) {
    const lineups = fixtureDetail.lineups ?? [];
    const events = fixtureDetail.events ?? [];

    for (const lineup of lineups) {
      const teamId = teamIdFromLineup(lineup);
      if (!teamId) continue;

      if (!profiles.has(teamId)) {
        profiles.set(teamId, emptyProfile(teamId, lineup.team?.name ?? null));
      }

      const profile = profiles.get(teamId);
      profile.matches += 1;
      addFormation(profile, lineup.formation);

      for (const starter of lineup.startXI ?? lineup.startingXI ?? []) {
        const playerId = starter.player?.id ?? starter.player?.providerPlayerId;
        if (playerId) profile.starterIds.add(String(playerId));
      }
    }

    for (const event of events) {
      const teamId = teamIdFromEvent(event);
      if (!teamId) continue;

      if (!profiles.has(teamId)) {
        profiles.set(teamId, emptyProfile(teamId, event.team?.name ?? null));
      }

      const profile = profiles.get(teamId);
      if (isSubstitutionEvent(event)) profile.substitutionMinutes.push(minuteFromEvent(event));
      if (isCardEvent(event)) profile.cards += 1;
    }
  }

  return Object.fromEntries([...profiles.entries()].map(([teamId, profile]) => [teamId, finaliseProfile(profile)]));
}
