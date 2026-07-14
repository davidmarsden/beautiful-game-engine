import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { acceptManagerDecision } from "../src/managerPortal/decisionSubmission.js";

const port = Number(process.env.PORT || 4173);
const publicDir = "public/manager-portal";
const worldPath = process.env.TBG_WORLD_PATH || "derived/world/world.json";
const submissionsPath = process.env.TBG_SUBMISSIONS_PATH || "derived/manager-decisions/submissions.json";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

async function json(path, fallback = null) {
  try { return JSON.parse(await readFile(path, "utf8")); } catch { return fallback; }
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function send(response, status, body, contentType = "application/json; charset=utf-8") {
  response.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  response.end(typeof body === "string" ? body : JSON.stringify(body, null, 2));
}

function demoFixture(world, club) {
  const opponent = world.clubs.find((candidate) => candidate.division_id === club.division_id && candidate.tbg_club_id !== club.tbg_club_id) || world.clubs.find((candidate) => candidate.tbg_club_id !== club.tbg_club_id);
  return {
    fixture_id: `fixture-demo-${club.tbg_club_id}`,
    competition: club.division_id ? club.division_id.replace("division-", "Division ") : "Pre-season",
    home_club_id: club.tbg_club_id,
    away_club_id: opponent?.tbg_club_id || null,
    opponent_name: opponent?.canonical_name || "Opponent TBC",
    venue: "home",
    status: "team_selection_open",
    kickoff: null,
    deadline: null
  };
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const world = await json(worldPath);
    if (!world) return send(response, 503, { error: `World state not found at ${worldPath}` });

    if (request.method === "GET" && url.pathname === "/api/bootstrap") {
      const requestedClub = url.searchParams.get("club_id");
      const club = world.clubs.find((row) => row.tbg_club_id === requestedClub) || world.clubs[0];
      const playersById = new Map(world.players.map((player) => [player.tbg_player_id, player]));
      const squad = (club.squad?.player_ids || []).map((id) => playersById.get(id)).filter(Boolean);
      return send(response, 200, {
        world: { world_id: world.world_id, season_id: world.active_season_id, status: world.status },
        manager: { manager_id: "manager-demo", manager_name: "Demo Manager", manager_type: "human" },
        club,
        squad,
        next_fixture: demoFixture(world, club),
        navigation: ["Dashboard", "Squad", "Tactics", "Schedule", "Finances", "Facilities", "History", "Transfers", "Competitions", "Game World"]
      });
    }

    if (request.method === "POST" && url.pathname === "/api/decisions") {
      const payload = await readBody(request);
      const accepted = acceptManagerDecision(payload, world);
      const submissions = await json(submissionsPath, []);
      const next = submissions.filter((row) => row.submission_id !== accepted.submission_id);
      next.push(accepted);
      await mkdir("derived/manager-decisions", { recursive: true });
      await writeFile(submissionsPath, JSON.stringify(next, null, 2) + "\n", "utf8");
      return send(response, 201, accepted);
    }

    if (request.method === "GET" && url.pathname === "/api/decisions") {
      return send(response, 200, await json(submissionsPath, []));
    }

    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = normalize(pathname).replace(/^([.][.][/\\])+/, "");
    const filePath = join(publicDir, safePath);
    const content = await readFile(filePath);
    return send(response, 200, content, mime[extname(filePath)] || "application/octet-stream");
  } catch (error) {
    if (error.code === "ENOENT") return send(response, 404, { error: "Not found" });
    return send(response, error.validationErrors ? 400 : 500, { error: error.message, validation_errors: error.validationErrors || [] });
  }
});

server.listen(port, () => console.log(`TBG Manager Portal running at http://localhost:${port}`));
