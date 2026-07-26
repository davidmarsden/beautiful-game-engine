import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLoanEligibilitySnapshot,
  fixtureEligibilityCheckpoint,
  fixtureOpponentClubId,
  loanEligibility,
  parentClubRestrictionEnabled,
  resolveParentClubRestriction
} from '../src/world/loanEligibility.js';

const world = {
  players: [{ tbg_player_id: 'p1', display_name: 'Loan Player' }],
  player_ownership: [{
    tbg_player_id: 'p1',
    tbg_club_id: 'parent',
    loan: { status: 'loaned_out', club_id: 'borrower', start_at: '2026-07-01T00:00:00.000Z', end_at: '2026-08-31T23:59:59.000Z' }
  }],
  rules: { loans: { parent_club_restriction: true } }
};

const parentFixture = { id: 'f1', home_club_id: 'borrower', away_club_id: 'parent', lock_at: '2026-07-20T18:00:00.000Z', kickoff_at: '2026-07-20T20:00:00.000Z' };
const otherFixture = { id: 'f2', home_club_id: 'borrower', away_club_id: 'other', kickoff_at: '2026-07-20T20:00:00.000Z' };

test('blocks a loan player against the owning club when the rule is enabled', () => {
  const result = loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture: parentFixture, world });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'parent_club_fixture');
  assert.equal(result.parent_club_id, 'parent');
  assert.equal(result.checkpoint.source, 'fixture_lock');
});

test('reads the canonical ownership club id from world foundation rows', () => {
  const result = loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture: parentFixture, world });
  assert.equal(result.parent_club_id, 'parent');
  assert.equal(result.eligible, false);
});

test('recognises league-pack fixture team IDs', () => {
  const fixture = { id: 'f3', homeTeamId: 'borrower', awayTeamId: 'parent', kickoff_at: parentFixture.kickoff_at };
  assert.equal(fixtureOpponentClubId(fixture, 'borrower'), 'parent');
  assert.equal(loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture, world }).eligible, false);
});

test('allows the same player against other clubs', () => {
  assert.equal(loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture: otherFixture, world }).eligible, true);
});

test('defaults to allowing parent-club appearances unless a world or competition enables the dial', () => {
  const openWorld = { ...world, rules: {} };
  assert.equal(parentClubRestrictionEnabled({ world: openWorld, fixture: parentFixture }), false);
  assert.equal(resolveParentClubRestriction({ world: openWorld, fixture: parentFixture }).source, 'global_default');
});

test('treats explicit competition inherit as inheritance rather than truthy enablement', () => {
  const fixture = { ...parentFixture, competition_rules: { parent_club_restriction: 'inherit' } };
  const result = resolveParentClubRestriction({ world, fixture });
  assert.equal(result.enabled, true);
  assert.equal(result.source, 'world');
});

test('allows an explicit false competition override', () => {
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
});

test('uses the fixture lock instant and falls back to kickoff', () => {
  assert.deepEqual(fixtureEligibilityCheckpoint(parentFixture), { type: 'timestamp', value: parentFixture.lock_at, source: 'fixture_lock' });
  assert.deepEqual(fixtureEligibilityCheckpoint(otherFixture), { type: 'timestamp', value: otherFixture.kickoff_at, source: 'scheduled_kickoff' });
});

test('evaluates loan dates at the canonical checkpoint', () => {
  const expiredFixture = { ...parentFixture, lock_at: '2026-09-01T18:00:00.000Z' };
  const result = loanEligibility({ player_id: 'p1', club_id: 'borrower', fixture: expiredFixture, world });
  assert.equal(result.loan_active_at_checkpoint, false);
  assert.equal(result.eligible, true);
});

test('creates an auditable lock snapshot', () => {
  const snapshot = createLoanEligibilitySnapshot({ playerIds: ['p1'], clubId: 'borrower', fixture: parentFixture, world });
  assert.equal(snapshot.version, 'loan-fixture-eligibility-v0.2');
  assert.equal(snapshot.rule.source, 'world');
  assert.equal(snapshot.checkpoint.value, parentFixture.lock_at);
  assert.equal(snapshot.outcomes[0].reason, 'parent_club_fixture');
});
