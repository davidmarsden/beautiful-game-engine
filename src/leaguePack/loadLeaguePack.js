import { readFile } from "node:fs/promises";
import { validateLeaguePack } from "./validateLeaguePack.js";

export async function loadLeaguePack(filePath) {
  const raw = await readFile(filePath, "utf8");
  const pack = JSON.parse(raw);
  validateLeaguePack(pack);
  return pack;
}

export function loadLeaguePackFromObject(pack) {
  validateLeaguePack(pack);
  return pack;
}
