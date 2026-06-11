// GET /api/sync — يسحب الجدول والنتائج من openfootball ويحدّث قاعدة البيانات
// ثم يعيد حساب نقاط كل التوقعات. يُستدعى تلقائيًا (cron) ويدويًا.
import { db, json } from "./_lib.js";

const SOURCE = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

function calcPoints(p1, p2, s1, s2, dbl) {
  if (s1 == null || s2 == null) return 0;
  let pts = 0;
  if (p1 === s1 && p2 === s2) pts = 3;
  else if (Math.sign(p1 - p2) === Math.sign(s1 - s2)) pts = 1;
  return dbl ? pts * 2 : pts;
}

function toKickoff(date, time) {
  if (!time) return new Date(date + "T18:00:00Z").toISOString();
  const m = time.match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  if (!m) return new Date(date + "T18:00:00Z").toISOString();
  const [, hh, mm, off] = m;
  const utcH = parseInt(hh) - parseInt(off);
  const d = new Date(date + "T00:00:00Z");
  d.setUTCHours(utcH, parseInt(mm));
  return d.toISOString();
}

export default async function handler(req, res) {
  try {
    const r = await fetch(SOURCE, { cache: "no-store" });
    const data = await r.json();
    const rows = [];
    let idCounter = 1;

    for (const m of data.matches) {
      const score = m.score?.ft;
      rows.push({
        id: idCounter++,
        matchday: m.round,
        round_label: m.group || m.round,
        team1: m.team1,
        team2: m.team2,
        grp: m.group || null,
        kickoff: toKickoff(m.date, m.time),
        score1: score ? score[0] : null,
        score2: score ? score[1] : null,
        status: score ? "finished" : "scheduled",
        updated_at: new Date().toISOString(),
      });
    }

    await db.from("matches").upsert(rows, { onConflict: "id" });

    const { data: finished } = await db.from("matches")
      .select("id,score1,score2").eq("status", "finished");
    const finMap = Object.fromEntries((finished || []).map(f => [f.id, f]));

    const { data: preds } = await db.from("predictions").select("*");
    const updates = [];
    for (const p of preds || []) {
      const fm = finMap[p.match_id];
      if (!fm) continue;
      const pts = calcPoints(p.pred1, p.pred2, fm.score1, fm.score2, p.is_double);
      if (!p.scored || p.points !== pts) {
        updates.push({ id: p.id, points: pts, scored: true });
      }
    }
    for (const u of updates) {
      await db.from("predictions").update({ points: u.points, scored: u.scored }).eq("id", u.id);
    }

    return json(res, 200, { ok: true, matches: rows.length, recalculated: updates.length });
  } catch (e) {
    return json(res, 500, { error: "تعذّر المزامنة", detail: String(e) });
  }
}
