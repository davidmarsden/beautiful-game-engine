export const GOVERNANCE_COMPATIBILITY = Object.freeze({
  world: "world-constitution-v0.3",
  playerRatings: "player-rating-constitution-v1.1",
  scoutingFinance: "scouting-finance-constitution-v0.2",
  contractsAgents: "contracts-agents-constitution-v2.1",
  youthDiscovery: "youth-discovery-constitution-v6.1",
  matchEngine: "match-engine-constitution-v0.3",
  informationMedia: "information-media-communication-constitution-v1.2",
  managerCareer: "manager-career-participation-governance-constitution-v1.0"
});

export function getGovernanceCompatibility() {
  return { ...GOVERNANCE_COMPATIBILITY };
}
