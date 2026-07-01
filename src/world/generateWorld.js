import { getGovernanceCompatibility } from "../governance/compatibility.js";
import { createRng, integerBetween } from "../shared/rng.js";
import { CLUB_NAMES } from "./clubNames.js";
import { DIVISION_RATING_BANDS, WORLD_CONFIG } from "./constants.js";

function padClubId(number) {
  return `club-${String(number).padStart(3, "0")}`;
}

function ratingForDivision(rng, division) {
  const band = DIVISION_RATING_BANDS[division];
  const eliteRoll = rng();

  if (eliteRoll > 0.86) {
    return integerBetween(rng, band.eliteMin, band.eliteMax);
  }

  return integerBetween(rng, band.typicalMin, band.typicalMax);
}

export function generateWorld(options = {}) {
  const seed = options.seed ?? "beautiful-game-s1";
  const rng = createRng(seed);

  const clubs = CLUB_NAMES.map((name, index) => {
    const division = Math.floor(index / WORLD_CONFIG.clubsPerDivision) + 1;

    return {
      id: padClubId(index + 1),
      name,
      division,
      rating: ratingForDivision(rng, division),
      reputation: Math.max(1, 101 - index),
      finances: {
        tier: division <= 2 ? "strong" : division === 3 ? "stable" : "limited"
      }
    };
  });

  return {
    meta: {
      seed,
      season: options.season ?? 1,
      generatedBy: "beautiful-game-engine@0.1.0",
      governance: getGovernanceCompatibility()
    },
    clubs,
    divisions: Array.from({ length: WORLD_CONFIG.divisions }, (_, index) => {
      const division = index + 1;
      return {
        id: `division-${division}`,
        level: division,
        name: `Division ${division}`,
        clubIds: clubs.filter((club) => club.division === division).map((club) => club.id)
      };
    })
  };
}
