import { getGovernanceCompatibility } from "./governance/compatibility.js";
import { averageClubRating } from "./ratings/index.js";
import { generateWorld } from "./world/generateWorld.js";
import { createSeasonShell } from "./world/seasonShell.js";

export {
  GOVERNANCE_COMPATIBILITY,
  getGovernanceCompatibility
} from "./governance/compatibility.js";
export { averageClubRating } from "./ratings/index.js";
export { generateWorld } from "./world/generateWorld.js";
export { createSeasonShell } from "./world/seasonShell.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  const world = generateWorld({ seed: "demo", season: 1 });
  const shell = createSeasonShell(world);

  console.log(JSON.stringify({
    seed: world.meta.seed,
    clubs: world.clubs.length,
    divisions: world.divisions.length,
    governance: getGovernanceCompatibility(),
    averageRating: averageClubRating(world.clubs),
    seasonShell: shell.divisions
  }, null, 2));
}
