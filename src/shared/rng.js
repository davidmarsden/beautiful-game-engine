export function createRng(seed = "beautiful-game") {
  let h = 1779033703 ^ String(seed).length;

  for (let i = 0; i < String(seed).length; i += 1) {
    h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return function rng() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function integerBetween(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick(rng, values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Cannot pick from an empty list.");
  }

  return values[Math.floor(rng() * values.length)];
}
