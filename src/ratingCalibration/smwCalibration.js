function round(value, digits = 3) {
  return Number(Number(value ?? 0).toFixed(digits));
}

function normaliseName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&apos;/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function modelRating(player) {
  return Number(
    player.ratings?.effectiveMatchRating
    ?? player.ratings?.ability
    ?? player.rating
    ?? player.ability
    ?? 0
  );
}

function playerPosition(player) {
  return String(player.position ?? player.profile?.position ?? player.roles?.[0] ?? "unknown");
}

function positionGroup(position) {
  const value = String(position ?? "").toLowerCase();
  if (value.includes("goalkeeper") || value === "gk") return "GK";
  if (value.includes("defender") || value.startsWith("d") || value.includes("back")) return "DEF";
  if (value.includes("midfielder") || value.startsWith("m")) return "MID";
  if (value.includes("attacker") || value.includes("forward") || value.includes("winger") || value.startsWith("f") || value.startsWith("am")) return "ATT";
  return "UNK";
}

function targetRating(row) {
  return Number(row.smwRating ?? row.soccerwikiRating ?? row.targetRating ?? row.rating ?? row.rt ?? 0);
}

function targetName(row) {
  return row.name ?? row.playerName ?? row.player ?? null;
}

function targetClub(row) {
  return row.club ?? row.clubName ?? row.team ?? row.teamName ?? null;
}

function playerClub(player) {
  return player.team?.name ?? player.clubName ?? player.teamName ?? null;
}

function playerKey(name, club = null) {
  const base = normaliseName(name);
  const clubPart = club ? normaliseName(club) : "";
  return clubPart ? `${base}|${clubPart}` : base;
}

function buildTargetIndex(targetRows) {
  const byNameClub = new Map();
  const byName = new Map();

  for (const row of targetRows ?? []) {
    const name = targetName(row);
    const rating = targetRating(row);
    if (!name || !Number.isFinite(rating) || rating <= 0) continue;

    const target = {
      name,
      club: targetClub(row),
      rating,
      raw: row
    };

    if (target.club) byNameClub.set(playerKey(name, target.club), target);
    if (!byName.has(playerKey(name))) byName.set(playerKey(name), target);
  }

  return { byNameClub, byName };
}

function matchTarget(player, index) {
  const name = player.name;
  const club = playerClub(player);
  if (name && club && index.byNameClub.has(playerKey(name, club))) return index.byNameClub.get(playerKey(name, club));
  if (name && index.byName.has(playerKey(name))) return index.byName.get(playerKey(name));
  return null;
}

function mean(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function median(values) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) return 0;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
}

function groupBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function summariseErrors(rows) {
  const errors = rows.map((row) => row.error);
  const absolute = errors.map(Math.abs);
  return {
    count: rows.length,
    meanError: round(mean(errors)),
    meanAbsoluteError: round(mean(absolute)),
    medianAbsoluteError: round(median(absolute)),
    maxAbsoluteError: round(Math.max(0, ...absolute))
  };
}

export function calibrateSmwRatings(pack, targetRows, options = {}) {
  const index = buildTargetIndex(targetRows);
  const rows = [];
  const unmatchedTargets = new Set((targetRows ?? []).map((row) => playerKey(targetName(row), targetClub(row))).filter(Boolean));

  for (const player of Object.values(pack.players ?? {})) {
    const target = matchTarget(player, index);
    if (!target) continue;

    const predicted = modelRating(player);
    if (!Number.isFinite(predicted) || predicted <= 0) continue;

    const actual = target.rating;
    const error = predicted - actual;
    const row = {
      playerId: player.id,
      playerName: player.name,
      clubName: playerClub(player),
      position: playerPosition(player),
      positionGroup: positionGroup(playerPosition(player)),
      predictedRating: round(predicted, 1),
      targetRating: actual,
      error: round(error, 3),
      absoluteError: round(Math.abs(error), 3)
    };
    rows.push(row);

    unmatchedTargets.delete(playerKey(target.name, target.club));
    unmatchedTargets.delete(playerKey(target.name));
  }

  const byPosition = Object.fromEntries(
    [...groupBy(rows, (row) => row.positionGroup).entries()]
      .map(([group, groupRows]) => [group, summariseErrors(groupRows)])
      .sort(([a], [b]) => a.localeCompare(b))
  );

  const summary = summariseErrors(rows);
  const score = round(Math.max(0, 100 - summary.meanAbsoluteError * Number(options.pointsPerRatingError ?? 15)), 2);

  return {
    score,
    summary,
    byPosition,
    matchedPlayers: rows.length,
    targetPlayers: (targetRows ?? []).length,
    unmatchedTargetCount: unmatchedTargets.size,
    biggestMisses: [...rows]
      .sort((a, b) => b.absoluteError - a.absoluteError || a.playerName.localeCompare(b.playerName))
      .slice(0, Number(options.biggestMissLimit ?? 20)),
    rows: rows.sort((a, b) => b.targetRating - a.targetRating || b.predictedRating - a.predictedRating || a.playerName.localeCompare(b.playerName))
  };
}

export function formatSmwRatingCalibration(report) {
  const lines = [
    "# SMW Rating Calibration",
    `Score: ${report.score}/100`,
    `Matched players: ${report.matchedPlayers}/${report.targetPlayers}`,
    `Unmatched targets: ${report.unmatchedTargetCount}`,
    `Mean error: ${report.summary.meanError}`,
    `Mean absolute error: ${report.summary.meanAbsoluteError}`,
    `Median absolute error: ${report.summary.medianAbsoluteError}`,
    `Max absolute error: ${report.summary.maxAbsoluteError}`,
    "",
    "Bias by position:",
    "Group Count MeanErr MAE MedianAE MaxAE"
  ];

  for (const [group, summary] of Object.entries(report.byPosition)) {
    lines.push([
      group.padEnd(5, " "),
      String(summary.count).padStart(5, " "),
      String(summary.meanError).padStart(7, " "),
      String(summary.meanAbsoluteError).padStart(5, " "),
      String(summary.medianAbsoluteError).padStart(8, " "),
      String(summary.maxAbsoluteError).padStart(5, " ")
    ].join(" "));
  }

  lines.push("", "Biggest misses:", "Player                   Club                     Pos Pred SMW Diff");
  for (const row of report.biggestMisses) {
    lines.push([
      row.playerName.padEnd(24, " "),
      String(row.clubName ?? "").padEnd(24, " "),
      row.positionGroup.padEnd(3, " "),
      String(row.predictedRating).padStart(4, " "),
      String(row.targetRating).padStart(3, " "),
      String(row.error).padStart(5, " ")
    ].join(" "));
  }

  return lines.join("\n");
}
