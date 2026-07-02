export function buildSeasonReport(replay, options = {}) {
  const table = replay.summary.table.map((row, index) => ({
    position: index + 1,
    ...row
  }));
  const relegationPlaces = Number(options.relegationPlaces ?? 3);

  return {
    title: options.title ?? "Season Replay",
    complete: replay.complete,
    fixturesPlayed: replay.summary.fixturesPlayed,
    fixturesRemaining: replay.summary.fixturesRemaining,
    champion: table[0] ?? null,
    topFour: table.slice(0, 4),
    relegated: relegationPlaces > 0 ? table.slice(-relegationPlaces) : [],
    table
  };
}

function pad(value, width, align = "right") {
  const text = String(value ?? "");
  return align === "left" ? text.padEnd(width, " ") : text.padStart(width, " ");
}

export function formatLeagueTable(table) {
  const header = "Pos Team                     P   W   D   L  GF  GA  GD Pts";
  const lines = table.map((row) => [
    pad(row.position, 3),
    pad(row.teamName, 24, "left"),
    pad(row.played, 2),
    pad(row.won, 3),
    pad(row.drawn, 3),
    pad(row.lost, 3),
    pad(row.goalsFor, 3),
    pad(row.goalsAgainst, 3),
    pad(row.goalDifference, 3),
    pad(row.points, 3)
  ].join(" "));

  return [header, ...lines].join("\n");
}

export function formatSeasonReport(report) {
  const champion = report.champion ? report.champion.teamName : "n/a";
  const relegated = report.relegated.length ? report.relegated.map((row) => row.teamName).join(", ") : "n/a";

  return [
    `# ${report.title}`,
    `Fixtures played: ${report.fixturesPlayed}`,
    `Fixtures remaining: ${report.fixturesRemaining}`,
    `Champion: ${champion}`,
    `Relegated: ${relegated}`,
    "",
    formatLeagueTable(report.table)
  ].join("\n");
}
