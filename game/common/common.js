// Supabase 初期化
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 共通インサート関数
async function insertScore(gameId, userId, score) {
  const { data, error } = await supabase
    .from("studio_ysn_table")
    .insert({
      GAMEID: gameId,
      USERID: userId,
      SCORE: score
      // TIMESTAMP は now() が自動で入る
    });

  if (error) {
    console.error("Insert error:", error);
    return null;
  }

  return data;
}
