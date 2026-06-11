// GET /api/fd?key=BACKUP_KEY → فحص بيانات football-data.org لكأس العالم (مؤقت للتطوير)
import { json } from "./_lib.js";

export default async function handler(req, res) {
  if (!process.env.BACKUP_KEY || req.query?.key !== process.env.BACKUP_KEY) {
    return json(res, 403, { error: "forbidden" });
  }
  try {
    const r = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_KEY || "" },
    });
    const d = await r.json();
    const ms = (d.matches || []).map(m => ({
      date: m.utcDate,
      status: m.status,
      home: m.homeTeam?.name, homeTla: m.homeTeam?.tla,
      away: m.awayTeam?.name, awayTla: m.awayTeam?.tla,
      ft: m.score?.fullTime,
    }));
    return json(res, 200, {
      apiStatus: r.status,
      season: d.competition?.name + " / " + (d.filters?.season || (d.matches?.[0]?.season?.startDate || "")),
      count: ms.length,
      finished: ms.filter(x => x.status === "FINISHED"),
      sample: ms.slice(0, 6),
    });
  } catch (e) { return json(res, 500, { error: String(e) }); }
}
