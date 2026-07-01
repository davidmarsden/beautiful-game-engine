export const CUP_SHELLS = Object.freeze([
  { idPrefix: "national-cup", name: "National Cup", type: "cup" },
  { idPrefix: "league-cup", name: "League Cup", type: "cup" },
  { idPrefix: "youth-cup", name: "Youth Cup", type: "youth-cup" }
]);

export function createCupShells(world) {
  if (!world?.clubs || !world?.meta?.season) {
    throw new Error("createCupShells requires a generated world.");
  }

  const clubIds = world.clubs.map((club) => club.id);

  return CUP_SHELLS.map((cup) => ({
    id: `${cup.idPrefix}-s${world.meta.season}`,
    type: cup.type,
    name: cup.name,
    season: world.meta.season,
    clubIds,
    rules: {
      status: "shell",
      participants: clubIds.length
    }
  }));
}
