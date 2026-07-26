export function createSquadShell(club) {
  if (!club?.id) {
    throw new Error("createSquadShell requires a club with an id.");
  }

  return {
    clubId: club.id,
    seniorPlayerIds: [],
    youthPlayerIds: [],
    registeredSeniorPlayerIds: [],
    limits: {
      maxSeniorPlayers: 35,
      maxRegisteredSeniorPlayers: 25,
      maxLoansIn: 5,
      maxLoansOut: 5
    },
    loanEligibility: {
      parentClubRestriction: false
    }
  };
}

export function createSquadShells(clubs) {
  if (!Array.isArray(clubs)) {
    throw new Error("createSquadShells requires a club array.");
  }

  return clubs.map(createSquadShell);
}
