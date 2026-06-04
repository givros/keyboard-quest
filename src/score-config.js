(function registerScoreConfig(CQ) {
  CQ.SCORE_STORAGE_KEY = "clavierQuestLeaderboard:v1";
  CQ.PLAYER_STORAGE_KEY = "clavierQuestPlayer:v1";
  CQ.SCORE_ROOM_STORAGE_KEY = "clavierQuestScoreRoom:v1";
  CQ.SCORE_COOLDOWN_MS = 10 * 60 * 1000;
  CQ.DEFAULT_SCORE_ROOM = "1";

  CQ.scoreConfig = {
    provider: "supabase",
    cooldownMs: CQ.SCORE_COOLDOWN_MS,
    supabase: {
      enabled: true,
      url: "https://xyckwwhcwfsywwmomevb.supabase.co",
      anonKey: "sb_publishable_7_MeeyNGPOb3WoS5nxPktw_PDjiCYdx",
      table: "keyboard_quest_scores",
      pollMs: 3000,
    },
    relay: {
      enabled: true,
      endpoint: "https://ntfy.sh",
      topicPrefix: "keyboard-quest-givros",
      room: CQ.DEFAULT_SCORE_ROOM,
    },
  };
})(window.CQ = window.CQ || {});
