export { expectedGoals, simulateFixture } from "./simulateFixture.js";

export function placeholderExpectedResult(homeClub, awayClub) {
  if (!homeClub || !awayClub) {
    throw new Error("placeholderExpectedResult requires two clubs.");
  }

  const homeEdge = 1.5;
  const gap = homeClub.rating + homeEdge - awayClub.rating;

  return {
    homeClubId: homeClub.id,
    awayClubId: awayClub.id,
    ratingGap: Number(gap.toFixed(2)),
    note: "Temporary placeholder only. Real match engine is intentionally not implemented yet."
  };
}
