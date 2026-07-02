export const FORMATIONS = Object.freeze({
  "4-3-3": Object.freeze([
    "GK",
    "RB", "CB", "CB", "LB",
    "CM", "CM", "CM",
    "RW", "ST", "LW"
  ]),
  "4-2-3-1": Object.freeze([
    "GK",
    "RB", "CB", "CB", "LB",
    "DM", "DM",
    "RW", "AM", "LW",
    "ST"
  ]),
  "3-5-2": Object.freeze([
    "GK",
    "CB", "CB", "CB",
    "RWB", "CM", "CM", "CM", "LWB",
    "ST", "ST"
  ]),
  "4-4-2": Object.freeze([
    "GK",
    "RB", "CB", "CB", "LB",
    "RM", "CM", "CM", "LM",
    "ST", "ST"
  ])
});

export function getFormationSlots(formation = "4-3-3") {
  const slots = FORMATIONS[formation];
  if (!slots) {
    throw new Error(`Unknown formation: ${formation}`);
  }
  return [...slots];
}
