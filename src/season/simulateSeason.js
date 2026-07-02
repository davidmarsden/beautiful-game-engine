import { createSeasonState, processNextFixture, seasonSummary } from "./seasonState.js";

export function simulateSeason(pack, options = {}) {
  let state = createSeasonState(pack, {
    season: options.season,
    league: options.league,
    createdAt: options.createdAt
  });
  const results = [];
  const maxFixtures = Number(options.maxFixtures ?? pack.fixtures.length);

  while (state.nextFixtureIndex < pack.fixtures.length && results.length < maxFixtures) {
    const fixtureSeed = `${options.seed ?? "season"}:${state.nextFixtureIndex}`;
    const processed = processNextFixture(pack, state, {
      ...options.fixtureOptions,
      seed: fixtureSeed,
      useLineups: options.useLineups ?? true,
      allowSynthetic: options.allowSynthetic ?? false
    });

    state = processed.state;
    if (processed.result) results.push(processed.result);
    if (processed.complete) break;
  }

  return {
    state,
    results,
    summary: seasonSummary(state),
    complete: state.nextFixtureIndex >= pack.fixtures.length
  };
}
