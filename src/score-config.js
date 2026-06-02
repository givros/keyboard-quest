(function registerScoreConfig(CQ) {
  CQ.SCORE_STORAGE_KEY = "clavierQuestLeaderboard:v1";
  CQ.PLAYER_STORAGE_KEY = "clavierQuestPlayer:v1";
  CQ.SCORE_COOLDOWN_MS = 10 * 60 * 1000;

  CQ.scoreConfig = {
    provider: "local",
    cooldownMs: CQ.SCORE_COOLDOWN_MS,
    firebaseVersion: "12.4.0",
    firebasePath: "keyboardQuest/leaderboard",
    firebase: {
      apiKey: "",
      authDomain: "",
      databaseURL: "",
      projectId: "",
      appId: "",
    },
  };
})(window.CQ = window.CQ || {});
