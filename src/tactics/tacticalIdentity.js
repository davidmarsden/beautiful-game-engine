function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalise(value) {
  return String(value ?? "").toLowerCase();
}

function formationWidth(formation) {
  const text = normalise(formation);
  if (text.includes("3-5") || text.includes("5-3") || text.includes("4-4")) return "wide";
  if (text.includes("4-2-3-1") || text.includes("4-3-3")) return "balanced";
  return "narrow";
}

export function tacticalIdentityFromManagerProfile(profile = {}) {
  const formation = profile.preferredFormation ?? "4-3-3";
  const aggression = profile.aggression ?? "medium";
  const subTiming = profile.substitutionTiming ?? "normal";
  const rotation = profile.rotation ?? "medium";
  const structured = profile.tacticalIntent === "structured" || formation.startsWith("3-") || formation.includes("5");

  return {
    formation,
    mentality: structured ? "structured" : "balanced",
    pressing: aggression === "high" ? "high" : aggression === "low" ? "controlled" : "standard",
    tempo: subTiming === "early" ? "high" : subTiming === "late" ? "measured" : "standard",
    width: formationWidth(formation),
    defensiveLine: structured ? "standard" : aggression === "high" ? "high" : "standard",
    passing: structured ? "direct" : "mixed",
    rotation,
    aggression,
    risk: aggression === "high" ? "brave" : aggression === "low" ? "careful" : "balanced"
  };
}

export function tacticalModifier(identity = {}) {
  let attack = 0;
  let defence = 0;
  let volatility = 0;

  if (identity.pressing === "high") {
    attack += 0.08;
    defence -= 0.03;
    volatility += 0.05;
  }

  if (identity.pressing === "controlled") {
    attack -= 0.03;
    defence += 0.05;
    volatility -= 0.03;
  }

  if (identity.tempo === "high") {
    attack += 0.06;
    volatility += 0.04;
  }

  if (identity.tempo === "measured") {
    attack -= 0.03;
    defence += 0.03;
    volatility -= 0.02;
  }

  if (identity.defensiveLine === "high") {
    attack += 0.04;
    defence -= 0.04;
    volatility += 0.04;
  }

  if (identity.mentality === "structured") {
    attack -= 0.02;
    defence += 0.07;
    volatility -= 0.04;
  }

  if (identity.width === "wide") attack += 0.03;
  if (identity.passing === "direct") volatility += 0.03;

  return {
    attack: Number(clamp(attack, -0.25, 0.25).toFixed(3)),
    defence: Number(clamp(defence, -0.25, 0.25).toFixed(3)),
    volatility: Number(clamp(volatility, -0.2, 0.2).toFixed(3))
  };
}

export function applyTacticalModifiersToXg(xg, { homeIdentity = null, awayIdentity = null } = {}) {
  const home = tacticalModifier(homeIdentity ?? {});
  const away = tacticalModifier(awayIdentity ?? {});

  return {
    home: Number(clamp(xg.home * (1 + home.attack - away.defence), 0.15, 5).toFixed(2)),
    away: Number(clamp(xg.away * (1 + away.attack - home.defence), 0.15, 5).toFixed(2)),
    modifiers: { home, away }
  };
}
