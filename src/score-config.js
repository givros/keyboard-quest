(function registerScoreConfig(CQ) {
  CQ.SCORE_STORAGE_KEY = "clavierQuestLeaderboard:v1";
  CQ.PLAYER_STORAGE_KEY = "clavierQuestPlayer:v1";
  CQ.SCORE_ROOM_STORAGE_KEY = "clavierQuestScoreRoom:v1";
  CQ.SCORE_COOLDOWN_MS = 10 * 60 * 1000;

  CQ.scoreConfig = {
    provider: "relay",
    cooldownMs: CQ.SCORE_COOLDOWN_MS,
    relay: {
      enabled: true,
      endpoint: "https://ntfy.sh",
      topicPrefix: "keyboard-quest",
    },
  };
})(window.CQ = window.CQ || {});
