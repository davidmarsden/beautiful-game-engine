import { readFile } from "node:fs/promises";
import { buildManagerProfilesFromFixtureDetails } from "../src/index.js";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node scripts/build-manager-profiles.js <fixture-details.json>");
  process.exit(1);
}

const snapshot = JSON.parse(await readFile(filePath, "utf8"));
const profiles = buildManagerProfilesFromFixtureDetails(snapshot.rows ?? []);
const sorted = Object.values(profiles).sort((a, b) => String(a.teamName).localeCompare(String(b.teamName)));

console.log("# Manager Intelligence Profiles");
console.log(`Profiles: ${sorted.length}`);

for (const profile of sorted) {
  console.log(`\n${profile.teamName ?? profile.teamId}`);
  console.log(`  Preferred formation: ${profile.preferredFormation}`);
  console.log(`  Matches analysed: ${profile.matches}`);
  console.log(`  Rotation: ${profile.rotation} (${profile.uniqueStarters} unique starters)`);
  console.log(`  Substitution timing: ${profile.substitutionTiming} (${profile.averageSubstitutionMinute ?? "n/a"})`);
  console.log(`  Aggression: ${profile.aggression} (${profile.cardsPerMatch} cards/match)`);
  console.log(`  Tactical intent: ${profile.tacticalIntent}`);
}
