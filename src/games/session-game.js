(function registerSessionGame(CQ) {
  class SessionGame {
    constructor({ grade, difficulty, language }) {
      this.grade = grade;
      this.difficulty = difficulty;
      this.language = language || CQ.i18n.language;
      this.content = CQ.i18n.gradeData(grade, this.language);
      this.gradeTuning = CQ.gradeTuning[grade] || CQ.gradeTuning["5e"];
      this.settings = this.buildSettings(CQ.difficultySettings[difficulty]);
      this.score = 0;
      this.combo = 0;
      this.hits = 0;
      this.misses = 0;
      this.done = false;
      this.success = false;
      this.message = "";
    }

    t(path, values = {}) {
      return CQ.i18n.t(path, values, this.language);
    }

    buildSettings(baseSettings) {
      return {
        ...baseSettings,
        speed: baseSettings.speed * this.gradeTuning.speedMultiplier,
        spawn: baseSettings.spawn * this.gradeTuning.spawnMultiplier,
        time: Math.round(baseSettings.time * this.gradeTuning.timeMultiplier),
        lives: Math.max(1, baseSettings.lives + this.gradeTuning.livesDelta),
        tokens: Math.max(1, baseSettings.tokens + this.gradeTuning.tokensDelta),
        wordTargetBonus: this.gradeTuning.wordTargetBonus,
        shortcutGoalBonus: this.gradeTuning.shortcutGoalBonus,
        meteorExtraPool: this.gradeTuning.meteorExtraPool,
      };
    }

    symbolPool() {
      return CQ.symbolSetFor?.(this.grade, this.difficulty) || CQ.symbolSets[this.grade] || CQ.symbolSets["5e"];
    }

    get accuracy() {
      const total = this.hits + this.misses;
      return total ? this.hits / total : 1;
    }

    addHit(points) {
      this.hits += 1;
      this.combo += 1;
      this.score += Math.round(points + Math.min(this.combo, 20) * 2);
      CQ.audio.playTone("hit");
    }

    addMiss(amount = 1) {
      this.misses += amount;
      this.combo = 0;
      CQ.audio.playTone("miss");
    }

    finish(success, message) {
      if (this.done) return;
      this.done = true;
      this.success = success;
      this.message = message;
      if (success) {
        this.score += 80 + Math.round(this.accuracy * 120);
        CQ.audio.playTone("done");
      }
    }

    hud() {
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: "Temps",
        meterValue: "",
        meterRatio: 1,
        mission: "",
      };
    }
  }

  CQ.SessionGame = SessionGame;
})(window.CQ = window.CQ || {});
