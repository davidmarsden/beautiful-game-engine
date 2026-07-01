export function averageClubRating(clubs) {
  if (!Array.isArray(clubs) || clubs.length === 0) return 0;
  const total = clubs.reduce((sum, club) => sum + club.rating, 0);
  return Number((total / clubs.length).toFixed(2));
}
