(function registerScoreConfig(CQ) {
  CQ.SCORE_STORAGE_KEY = "clavierQuestLeaderboard:v1";
  CQ.PLAYER_STORAGE_KEY = "clavierQuestPlayer:v1";
  CQ.SCORE_COOLDOWN_MS = 10 * 60 * 1000;

  CQ.scoreConfig = {
    provider: "auto",
    cooldownMs: CQ.SCORE_COOLDOWN_MS,
    server: {
      enabled: true,
      baseUrl: "",
    },
  };
})(window.CQ = window.CQ || {});
