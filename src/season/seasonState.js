import { createCohesionState, updateCohesionState } from "../cohesion/index.js";
import { simulateFixture } from "../match/index.js";
import { applyResultToTable, createLeagueTable, tableRows } from "./leagueTable.js";

function createCohesionStates(clubs) {
  return Object.fromEntries(Object.values(clubs).map((club) => [club.id, createCohesionState()]));
}

export function createSeasonState(pack, options = {}) {
  return {
    season: options.season ?? pack.meta?.source?.season ?? null,
    league: options.league ?? pack.meta?.source?.league ?? null,
    nextFixtureIndex: 0,
    completedFixtures: [],
    table: createLeagueTable(pack.clubs),
    cohesion: createCohesionStates(pack.clubs),
    playerCondition: {},
    meta: {
      createdAt: options.createdAt ?? new Date().toISOString(),
      fixturesTotal: pack.fixtures.length
    }
  };
}

function fixtureByIndex(pack, state) {
  return pack.fixtures[state.nextFixtureIndex] ?? null;
}

export function processNextFixture(pack, state, options = {}) {
  const fixture = fixtureByIndex(pack, state);
  if (!fixture) {
    return { state, result: null, complete: true };
  }

  const result = simulateFixture(pack, fixture.id, options);
  const next = structuredClone(state);

  next.table = applyResultToTable(next.table, result);
  next.completedFixtures.push(result.fixtureId);
  next.nextFixtureIndex += 1;

  if (result.lineups?.home) {
    next.cohesion[result.homeTeamId] = updateCohesionState(next.cohesion[result.homeTeamId], result.lineups.home);
  }

  if (result.lineups?.away) {
    next.cohesion[result.awayTeamId] = updateCohesionState(next.cohesion[result.awayTeamId], result.lineups.away);
  }

  return { state: next, result, complete: next.nextFixtureIndex >= pack.fixtures.length };
}

export function seasonSummary(state) {
  return {
    season: state.season,
    league: state.league,
    fixturesPlayed: state.completedFixtures.length,
    fixturesRemaining: Math.max(0, state.meta.fixturesTotal - state.completedFixtures.length),
    table: tableRows(state.table)
  };
}
