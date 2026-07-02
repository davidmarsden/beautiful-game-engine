function normalise(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function teamNameMatches(club, query) {
  const clubName = normalise(club?.name);
  const wanted = normalise(query);
  return clubName === wanted || clubName.includes(wanted) || wanted.includes(clubName);
}

export function findFixtureByTeams(pack, { home, away, allowReverse = true } = {}) {
  if (!home || !away) {
    throw new Error("findFixtureByTeams requires home and away team names.");
  }

  const matches = pack.fixtures.filter((fixture) => {
    const homeClub = pack.clubs[fixture.homeTeamId];
    const awayClub = pack.clubs[fixture.awayTeamId];

    const direct = teamNameMatches(homeClub, home) && teamNameMatches(awayClub, away);
    const reverse = allowReverse && teamNameMatches(homeClub, away) && teamNameMatches(awayClub, home);

    return direct || reverse;
  });

  if (!matches.length) {
    throw new Error(`No fixture found for ${home} vs ${away}.`);
  }

  return matches[0];
}
