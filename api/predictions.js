// /api/predictions
//   GET  ?token=...           → مباريات + توقعات اللاعب
//   POST { token, matchId, pred1, pred2, isDouble } → حفظ توقع
import { db, readToken, json } from "./_lib.js";

// مفتاح الجولة: دور المجموعات 3 جولات (Matchday 1-7 / 8-13 / 14-17)، ثم الأدوار الإقصائية
function roundKey(md) {
  const m = /Matchday\s+(\d+)/i.exec(md || "");
  if (m) { const n = +m[1]; return n <= 7 ? "g1" : n <= 13 ? "g2" : "g3"; }
  if (/Round of 32/i.test(md)) return "r32";
  if (/Round of 16/i.test(md)) return "r16";
  if (/Quarter/i.test(md)) return "qf";
  if (/Semi/i.test(md)) return "sf";
  if (/third/i.test(md)) return "third";
  if (/Final/i.test(md)) return "final";
  return md || "other";
}

export default async function handler(req, res) {
  const token = req.method === "GET" ? req.query.token : req.body?.token;
  const user = readToken(token || "");
  if (!user) return json(res, 401, { error: "جلسة غير صالحة — سجّل دخول" });

  // ─── جلب المباريات + توقعات اللاعب ───
  if (req.method === "GET") {
    const { data: matches } = await db.from("matches").select("*").order("kickoff");
    const { data: mine } = await db.from("predictions").select("*").eq("player_id", user.id);
    const predMap = Object.fromEntries((mine || []).map(p => [p.match_id, p]));
    return json(res, 200, { matches: matches || [], predictions: predMap, now: new Date().toISOString() });
  }

  // ─── حفظ توقع ───
  if (req.method === "POST") {
    const { matchId, pred1, pred2, isDouble } = req.body || {};
    if (pred1 == null || pred2 == null) return json(res, 400, { error: "اكتب النتيجة" });

    const { data: match } = await db.from("matches").select("*").eq("id", matchId).single();
    if (!match) return json(res, 404, { error: "مباراة غير موجودة" });

    // قفل عند صافرة البداية
    if (new Date(match.kickoff) <= new Date()) {
      return json(res, 403, { error: "أُقفلت — بدأت المباراة" });
    }

    // الدبل: مباراة واحدة لكل جولة. نلغي الدبل عن بقية مباريات نفس الجولة لنفس اللاعب.
    if (isDouble) {
      const rk = roundKey(match.matchday);
      const { data: allMatches } = await db.from("matches").select("id,matchday");
      const ids = (allMatches || [])
        .filter(m => roundKey(m.matchday) === rk)
        .map(m => m.id);
      await db.from("predictions").update({ is_double: false })
        .eq("player_id", user.id).in("match_id", ids);
    }

    await db.from("predictions").upsert({
      player_id: user.id, match_id: matchId,
      pred1: parseInt(pred1), pred2: parseInt(pred2),
      is_double: !!isDouble, scored: false, points: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "player_id,match_id" });

    return json(res, 200, { ok: true });
  }

  return json(res, 405, { error: "method" });
}
