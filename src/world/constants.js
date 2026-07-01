export const WORLD_CONFIG = Object.freeze({
  divisions: 5,
  clubsPerDivision: 20,
  totalClubs: 100,
  governance: {
    world: "world-constitution-v0.3",
    ratings: "player-rating-constitution-v1.1"
  }
});

export const DIVISION_RATING_BANDS = Object.freeze({
  1: { min: 89, typicalMin: 90, typicalMax: 92, eliteMin: 93, eliteMax: 96 },
  2: { min: 87, typicalMin: 88, typicalMax: 90, eliteMin: 90, eliteMax: 91 },
  3: { min: 86, typicalMin: 87, typicalMax: 89, eliteMin: 89, eliteMax: 90 },
  4: { min: 85, typicalMin: 86, typicalMax: 88, eliteMin: 88, eliteMax: 89 },
  5: { min: 85, typicalMin: 87, typicalMax: 89, eliteMin: 89, eliteMax: 90 }
});
