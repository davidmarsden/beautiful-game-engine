export function createManagerSlots(clubs) {
  if (!Array.isArray(clubs)) {
    throw new Error("createManagerSlots requires a club array.");
  }

  return clubs.map((club) => ({
    clubId: club.id,
    managerId: null,
    status: "vacant",
    caretaker: {
      active: true,
      reason: "world-generation"
    },
    contract: null,
    objective: null
  }));
}
