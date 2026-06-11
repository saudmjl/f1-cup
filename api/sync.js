// GET /api/sync — يسحب الجدول والنتائج من openfootball ويحدّث قاعدة البيانات
// ثم يعيد حساب نقاط كل التوقعات. يُستدعى تلقائيًا (cron) ويدويًا.
import { db, json } from "./_lib.js";

const SOURCE = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// قواعد النقاط (نسخة خادم): نتيجة دقيقة=50، فائز صح=20، غلط=0، الدبل يضاعف
function calcPoints(p1, p2, s1, s2, dbl) {
  if (s1 == null || s2 == null) return 0;
  let pts = 0;
  if (p1 === s1 && p2 === s2) pts = 50;
  else if (Math.sign(p1 - p2) === Math.sign(s1 - s2)) pts = 20;
  return dbl ? pts * 2 : pts;
}

// تحويل وقت openfootball ("2026-06-11" + "20:00 UTC-6") إلى ISO
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

const THROTTLE_MS = 3 * 60 * 1000;   // مزامنة فعلية مرة كل 3 دقائق كحد أقصى

export default async function handler(req, res) {
  try {
    // ── مكابح: نتفادى المزامنة المتكررة (يستدعيها كل لاعب عند الفتح) ──
    const force = req.query && (req.query.force === "1");
    if (!force) {
      const { data: recent } = await db.from("matches")
        .select("updated_at").order("updated_at", { ascending: false }).limit(1);
      const last = recent && recent[0] ? new Date(recent[0].updated_at).getTime() : 0;
      if (Date.now() - last < THROTTLE_MS) {
        return json(res, 200, { ok: true, skipped: true });
      }
    }

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

    // upsert المباريات
    await db.from("matches").upsert(rows, { onConflict: "id" });

    // إعادة حساب النقاط للمباريات المنتهية غير المحسوبة
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
