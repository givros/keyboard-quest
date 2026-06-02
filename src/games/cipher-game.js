(function registerCipherGame(CQ) {
  const { compareChar, printableKey, randomOf, shuffle } = CQ.utils;
  const { drawKeycap, drawRoundRect, drawStageBackground } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class CipherGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.timeLimit = this.settings.time + 12;
      this.timeLeft = this.timeLimit;
      this.pool = shuffle(CQ.symbolSets[this.grade] || CQ.symbolSets["5e"]);
      this.targetRounds = (this.difficulty === "imma" ? 2 : this.difficulty === "calme" ? 4 : this.difficulty === "rythme" ? 6 : 10) + Math.ceil(this.settings.wordTargetBonus / 2);
      this.completed = 0;
      this.sequence = [];
      this.cursor = 0;
      this.previewLeft = 0;
      this.state = "preview";
      this.messageTimer = 0;
      this.beginRound();
    }

    sequenceLength() {
      const difficultyBonus = this.difficulty === "defi" ? 4 : this.difficulty === "rythme" ? 1 : 0;
      const gradeBonus = this.grade === "4e" ? 1 : 0;
      const baseLength = this.difficulty === "imma" ? 2 : 3;
      return Math.min(10, baseLength + this.completed + difficultyBonus + gradeBonus);
    }

    beginRound() {
      const length = this.sequenceLength();
      this.sequence = Array.from({ length }, () => randomOf(this.pool));
      this.cursor = 0;
      this.state = "preview";
      this.previewLeft = 1.15 + length * 0.32;
    }

    update(dt) {
      this.timeLeft -= dt;
      this.messageTimer = Math.max(0, this.messageTimer - dt);
      if (this.state === "preview") {
        this.previewLeft -= dt;
        if (this.previewLeft <= 0) this.state = "input";
      }
      if (this.timeLeft <= 0) this.finish(this.completed >= Math.ceil(this.targetRounds * 0.6), this.t("cipher.timeUp"));
    }

    handleKeyDown(event) {
      if (this.state !== "input") return;
      const key = printableKey(event);
      if (!key) return;
      event.preventDefault();

      if (compareChar(key, this.sequence[this.cursor].symbol)) {
        this.cursor += 1;
        this.addHit(18);
        if (this.cursor >= this.sequence.length) {
          this.completed += 1;
          this.score += 35 + this.sequence.length * 8;
          if (this.completed >= this.targetRounds) {
            this.finish(true, this.t("cipher.success"));
          } else {
            this.beginRound();
          }
        }
      } else {
        this.addMiss();
        this.messageTimer = 0.9;
        this.beginRound();
      }
    }

    render(context) {
      drawStageBackground(context, "teal");
      context.save();
      context.textAlign = "center";

      context.fillStyle = "rgba(255,253,248,0.9)";
      context.font = "900 28px Inter, sans-serif";
      context.fillText(this.state === "preview" ? this.t("cipher.preview") : this.t("cipher.input"), W / 2, 86);

      const totalWidth = this.sequence.length * 70 + (this.sequence.length - 1) * 12;
      let x = W / 2 - totalWidth / 2;
      for (let i = 0; i < this.sequence.length; i += 1) {
        const item = this.sequence[i];
        const isTyped = i < this.cursor;
        const label = this.state === "preview" || isTyped ? item.symbol : "•";
        const fill = isTyped ? "#8fc7a3" : this.state === "preview" ? "#e7c66f" : "#f6efe1";
        drawKeycap(context, x, 158, 70, 68, label, fill);
        x += 82;
      }

      drawRoundRect(context, W / 2 - 185, 286, 370, 90, 10);
      context.fillStyle = "rgba(255,253,248,0.14)";
      context.fill();
      context.strokeStyle = "rgba(255,253,248,0.32)";
      context.lineWidth = 2;
      context.stroke();

      context.fillStyle = this.messageTimer ? "#e87861" : "rgba(255,253,248,0.9)";
      context.font = "850 20px Inter, sans-serif";
      const mission = this.messageTimer
        ? this.t("cipher.wrong")
        : this.state === "preview"
          ? this.t("cipher.missionPreview")
          : this.t("cipher.missionInput");
      context.fillText(mission, W / 2, 338);

      context.fillStyle = "rgba(255,253,248,0.82)";
      context.font = "850 20px Inter, sans-serif";
      context.fillText(this.t("cipher.sequence", { current: this.completed + 1, target: this.targetRounds }), W / 2, H - 72);
      context.restore();
    }

    hud() {
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.sequences"),
        meterValue: `${this.completed}/${this.targetRounds}`,
        meterRatio: this.completed / this.targetRounds,
        mission: `<strong>${this.state === "preview" ? this.t("cipher.preview") : this.t("cipher.input")}</strong> <br> ${this.state === "preview" ? this.t("cipher.missionPreview") : this.t("cipher.missionInput")}`,
      };
    }
  }

  CQ.CipherGame = CipherGame;
})(window.CQ = window.CQ || {});
