import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureOpponentClubId, loanEligibility, parentClubRestrictionEnabled } from '../src/world/loanEligibility.js';

const world = {
  players: [{ tbg_player_id: 'p1', display_name: 'Loan Player' }],
  player_ownership: [{
    tbg_player_id: 'p1',
    tbg_club_id: 'parent',
    loan: { status: 'loaned_out', club_id: 'borrower' }
  }],
  rules: { loans: { parent_club_restriction: true } }
};

const parentFixture = { id: 'f1', home_club_id: 'borrower', away_club_id: 'parent' };
const otherFixture = { id: 'f2', home_club_id: 'borrower', away_club_id: 'other' };

test('blocks a loan player against the owning club when the rule is enabled', () => {
  const result = loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture: parentFixture, world });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'parent_club_fixture');
  assert.equal(result.parent_club_id, 'parent');
});

test('reads the canonical ownership club id from world foundation rows', () => {
  const result = loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture: parentFixture, world });
  assert.equal(result.parent_club_id, 'parent');
  assert.equal(result.eligible, false);
});

test('recognises league-pack fixture team IDs', () => {
  const fixture = { id: 'f3', homeTeamId: 'borrower', awayTeamId: 'parent' };
  assert.equal(fixtureOpponentClubId(fixture, 'borrower'), 'parent');
  assert.equal(loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture, world }).eligible, false);
});

test('allows the same player against other clubs', () => {
  assert.equal(loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture: otherFixture, world }).eligible, true);
});

test('defaults to allowing parent-club appearances unless a world or competition enables the dial', () => {
  const openWorld = { ...world, rules: {} };
  assert.equal(parentClubRestrictionEnabled({ world: openWorld, fixture: parentFixture }), false);
  assert.equal(loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture: parentFixture, world: openWorld }).eligible, true);
});

test('allows fixture competition rules to override the world default', () => {
  const fixture = { ...parentFixture, competition_rules: { parent_club_restriction: false } };
  assert.equal(loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture, world }).eligible, true);
});

test('resolves competition-specific overrides from world.competitions', () => {
  const competitionWorld = {
    ...world,
    rules: { loans: { parent_club_restriction: false } },
    competitions: [{ id: 'league-1', rules: { loans: { parent_club_restriction: true } } }]
  };
  const fixture = { ...parentFixture, competition_id: 'league-1' };
  assert.equal(parentClubRestrictionEnabled({ world: competitionWorld, fixture }), true);
  assert.equal(loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture, world: competitionWorld }).eligible, false);
});
