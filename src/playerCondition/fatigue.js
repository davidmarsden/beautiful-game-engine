function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function recoveryRateForAge(age = 25) {
  const numericAge = Number(age ?? 25);
  if (numericAge <= 21) return 18;
  if (numericAge <= 28) return 16;
  if (numericAge <= 32) return 14;
  return 12;
}

export function fatigueFromMinutes(minutes = 0, options = {}) {
  const intensity = Number(options.intensity ?? 1);
  return Number(clamp((Number(minutes) / 90) * 22 * intensity, 0, 35).toFixed(1));
}

export function recoverFatigue(currentFatigue = 0, { restDays = 3, age = 25 } = {}) {
  const recovery = Number(restDays) * recoveryRateForAge(age);
  return Number(clamp(Number(currentFatigue) - recovery, 0, 100).toFixed(1));
}

export function updateFatigueAfterMatch(currentFatigue = 0, { minutes = 90, age = 25, restDays = 3, intensity = 1 } = {}) {
  const recovered = recoverFatigue(currentFatigue, { restDays, age });
  return Number(clamp(recovered + fatigueFromMinutes(minutes, { intensity }), 0, 100).toFixed(1));
}

export function fatigueRatingAdjustment(fatigue = 0) {
  const value = Number(fatigue ?? 0);
  if (value < 25) return 0;
  if (value < 45) return -1;
  if (value < 65) return -3;
  if (value < 80) return -5;
  return -8;
}

export function effectiveRatingWithFatigue(rating, fatigue = 0) {
  return Number(clamp(Number(rating) + fatigueRatingAdjustment(fatigue), 1, 100).toFixed(1));
}
