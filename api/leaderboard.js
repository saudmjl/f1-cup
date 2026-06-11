// GET /api/leaderboard → الترتيب العام (عام، لا يحتاج تسجيل)
import { db, json } from "./_lib.js";

export default async function handler(req, res) {
  const { data, error } = await db.from("leaderboard").select("*");
  if (error) return json(res, 500, { error: "تعذّر جلب الترتيب" });
  return json(res, 200, { leaderboard: data || [] });
}
