function round(value, digits = 2) {
  return Number(Number(value ?? 0).toFixed(digits));
}

function playerRating(player) {
  return Number(
    player.ratings?.effectiveMatchRating
    ?? player.ratings?.ability
    ?? player.rating
    ?? player.ability
    ?? 0
  );
}

function playerAge(player) {
  const value = Number(player.age ?? player.profile?.age ?? 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function providerTeamId(club) {
  return String(club.source?.providerTeamId ?? club.providerTeamId ?? club.id ?? "");
}

function playerTeamId(player) {
  return String(player.team?.providerTeamId ?? player.teamId ?? player.clubId ?? "");
}

function playerRoles(player) {
  const raw = player.roles ?? player.positionRoles ?? player.role ?? player.position ?? "UNK";
  const roles = Array.isArray(raw) ? raw : [raw];
  return roles.map((role) => String(role).toUpperCase());
}

function roleGroup(player) {
  const roles = playerRoles(player);
  if (roles.some((role) => ["GK", "GOALKEEPER"].includes(role))) return "GK";
  if (roles.some((role) => ["CB", "RB", "LB", "RWB", "LWB", "DEFENDER"].includes(role))) return "DEF";
  if (roles.some((role) => ["CM", "DM", "AM", "RM", "LM", "MIDFIELDER"].includes(role))) return "MID";
  if (roles.some((role) => ["ST", "CF", "LW", "RW", "FORWARD", "ATTACKER", "WINGER"].includes(role))) return "ATT";
  return "UNK";
}

function mean(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function sortedPlayers(players) {
  return [...players].sort((a, b) => playerRating(b) - playerRating(a) || String(a.name).localeCompare(String(b.name)));
}

function topAverage(players, count) {
  return round(mean(sortedPlayers(players).slice(0, count).map(playerRating)));
}

function groupSummary(players, group) {
  const grouped = sortedPlayers(players.filter((player) => roleGroup(player) === group));
  return {
    count: grouped.length,
    best: grouped[0] ? round(playerRating(grouped[0])) : 0,
    averageTop: topAverage(grouped, Math.min(grouped.length, group === "GK" ? 1 : 4)),
    players: grouped.slice(0, 5).map(formatPlayer)
  };
}

function formatPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    age: playerAge(player),
    position: player.position ?? player.profile?.position ?? null,
    roles: playerRoles(player),
    ability: Number(player.ratings?.ability ?? player.ability ?? player.rating ?? 0),
    form: Number(player.ratings?.form ?? player.form ?? 0),
    effectiveMatchRating: round(playerRating(player), 1)
  };
}

function clubPlayers(pack, club) {
  const id = providerTeamId(club);
  return Object.values(pack.players ?? {}).filter((player) => playerTeamId(player) === id);
}

export function buildRatingExplorer(pack, options = {}) {
  const topPlayerLimit = Number(options.topPlayerLimit ?? 8);
  const clubs = Object.values(pack.clubs ?? {}).map((club) => {
    const players = sortedPlayers(clubPlayers(pack, club));
    const ages = players.map(playerAge).filter((age) => age !== null);
    const topXI = players.slice(0, 11);
    const bench = players.slice(11, 18);

    return {
      clubId: club.id,
      providerTeamId: providerTeamId(club),
      clubName: club.name,
      squadSize: players.length,
      bestXI: topAverage(players, 11),
      top18: topAverage(players, 18),
      squadAverage: round(mean(players.map(playerRating))),
      benchAverage: round(mean(bench.map(playerRating))),
      depthRating: round(topAverage(players, 18) - topAverage(players, 11)),
      ageAverage: ages.length ? round(mean(ages), 1) : null,
      u21Count: ages.length ? players.filter((player) => (playerAge(player) ?? 99) <= 21).length : null,
      over30Count: ages.length ? players.filter((player) => (playerAge(player) ?? 0) >= 30).length : null,
      groups: {
        GK: groupSummary(players, "GK"),
        DEF: groupSummary(players, "DEF"),
        MID: groupSummary(players, "MID"),
        ATT: groupSummary(players, "ATT")
      },
      topPlayers: players.slice(0, topPlayerLimit).map(formatPlayer),
      topXIPlayers: topXI.map(formatPlayer),
      benchPlayers: bench.map(formatPlayer)
    };
  }).sort((a, b) => b.bestXI - a.bestXI || b.top18 - a.top18 || a.clubName.localeCompare(b.clubName));

  return {
    meta: {
      league: pack.meta?.source?.league,
      season: pack.meta?.source?.season,
      clubs: clubs.length,
      generatedAt: new Date().toISOString()
    },
    spread: {
      bestXIHigh: clubs[0]?.bestXI ?? 0,
      bestXILow: clubs.at(-1)?.bestXI ?? 0,
      bestXIRange: round((clubs[0]?.bestXI ?? 0) - (clubs.at(-1)?.bestXI ?? 0)),
      top18High: clubs[0]?.top18 ?? 0,
      top18Low: clubs.at(-1)?.top18 ?? 0,
      top18Range: round((clubs[0]?.top18 ?? 0) - (clubs.at(-1)?.top18 ?? 0))
    },
    clubs
  };
}

function pad(value, length) {
  return String(value ?? "").padStart(length, " ");
}

export function formatRatingExplorer(report) {
  const lines = [
    "# Rating Explorer",
    `Clubs: ${report.meta.clubs}`,
    `Best XI range: ${report.spread.bestXIRange} (${report.spread.bestXIHigh} to ${report.spread.bestXILow})`,
    `Top 18 range: ${report.spread.top18Range} (${report.spread.top18High} to ${report.spread.top18Low})`,
    "",
    "Club                     BestXI Top18 Squad Bench Age  U21 30+  GK DEF MID ATT"
  ];

  for (const club of report.clubs) {
    lines.push([
      club.clubName.padEnd(24, " "),
      pad(club.bestXI, 6),
      pad(club.top18, 5),
      pad(club.squadAverage, 5),
      pad(club.benchAverage, 5),
      pad(club.ageAverage ?? "-", 4),
      pad(club.u21Count ?? "-", 3),
      pad(club.over30Count ?? "-", 3),
      pad(club.groups.GK.best, 3),
      pad(club.groups.DEF.averageTop, 3),
      pad(club.groups.MID.averageTop, 3),
      pad(club.groups.ATT.averageTop, 3)
    ].join(" "));
  }

  lines.push("", "Top players by club:");
  for (const club of report.clubs) {
    lines.push("", `${club.clubName}:`);
    for (const player of club.topPlayers) {
      lines.push(`- ${player.name} ${player.effectiveMatchRating} (${player.position ?? player.roles[0]})`);
    }
  }

  return lines.join("\n");
}
