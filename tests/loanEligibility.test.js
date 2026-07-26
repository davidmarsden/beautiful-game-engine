import test from 'node:test';
import assert from 'node:assert/strict';
import { loanEligibility, parentClubRestrictionEnabled } from '../src/world/loanEligibility.js';

const world = {
  players: [{ tbg_player_id: 'p1', display_name: 'Loan Player' }],
  player_ownership: [{
    tbg_player_id: 'p1',
    club_id: 'parent',
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

test('allows the same player against other clubs', () => {
  assert.equal(loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture: otherFixture, world }).eligible, true);
});

test('defaults to allowing parent-club appearances unless a world or competition enables the dial', () => {
  const openWorld = { ...world, rules: {} };
  assert.equal(parentClubRestrictionEnabled({ world: openWorld, fixture: parentFixture }), false);
  assert.equal(loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture: parentFixture, world: openWorld }).eligible, true);
});

test('allows competition rules to override the world default', () => {
  const fixture = { ...parentFixture, competition_rules: { parent_club_restriction: false } };
  assert.equal(loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture, world }).eligible, true);
});
