(function registerWordGame(CQ) {
  const { compareChar, printableKey, shuffle } = CQ.utils;
  const { drawRoundRect, drawStageBackground, wrapText } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class WordGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.timeLimit = this.settings.time + 12;
      this.timeLeft = this.timeLimit;
      this.phrases = shuffle(this.content.words);
      this.index = 0;
      this.current = this.phrases[this.index];
      this.buffer = "";
      this.shake = 0;
      this.completed = 0;
      this.target = (this.difficulty === "calme" ? 6 : this.difficulty === "rythme" ? 10 : 18) + this.settings.wordTargetBonus;
    }

    update(dt) {
      this.timeLeft -= dt;
      this.shake = Math.max(0, this.shake - dt);
      if (this.timeLeft <= 0) this.finish(this.completed >= Math.ceil(this.target * 0.6), this.t("word.timeUp"));
    }

    nextPhrase() {
      this.completed += 1;
      this.score += 30 + Math.round(this.current.length * 0.8);
      if (this.completed >= this.target) {
        this.finish(true, this.t("word.success"));
        return;
      }
      this.index = (this.index + 1) % this.phrases.length;
      this.current = this.phrases[this.index];
      this.buffer = "";
    }

    handleKeyDown(event) {
      if (event.key === "Backspace") {
        event.preventDefault();
        this.buffer = this.buffer.slice(0, -1);
        return;
      }
      if (event.key === "Enter" && this.buffer === this.current) {
        event.preventDefault();
        this.nextPhrase();
        return;
      }
      const key = printableKey(event);
      if (!key || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();

      const expected = this.current[this.buffer.length];
      if (compareChar(key, expected)) {
        this.buffer += expected;
        this.addHit(6);
        if (this.buffer.length === this.current.length) this.nextPhrase();
      } else {
        this.addMiss();
        this.score = Math.max(0, this.score - 4);
        this.shake = 0.16;
      }
    }

    render(context) {
      drawStageBackground(context, "coral");
      context.save();
      const cardX = 70 + Math.sin(this.shake * 80) * 10;
      const cardY = 86;
      drawRoundRect(context, cardX, cardY, W - 140, 270, 10);
      context.fillStyle = "rgba(255,253,248,0.94)";
      context.fill();
      context.strokeStyle = "#18212b";
      context.lineWidth = 4;
      context.stroke();

      context.fillStyle = "#65717e";
      context.font = "800 19px Inter, sans-serif";
      context.textAlign = "left";
      context.fillText(this.t("word.item", { current: this.completed + 1, target: this.target }), cardX + 34, cardY + 44);

      context.font = "900 38px Inter, sans-serif";
      context.fillStyle = "#18212b";
      wrapText(context, this.current, cardX + 34, cardY + 112, W - 208, 48);

      const typedWidth = context.measureText(this.buffer).width;
      context.fillStyle = "#167c80";
      context.font = "900 38px Inter, sans-serif";
      wrapText(context, this.buffer, cardX + 34, cardY + 205, W - 208, 48);
      context.fillStyle = "rgba(22,124,128,0.22)";
      context.fillRect(cardX + 34, cardY + 220, Math.min(typedWidth, W - 208), 10);

      context.fillStyle = "#fffdf8";
      context.font = "850 20px Inter, sans-serif";
      context.textAlign = "center";
      context.fillText(this.t("word.enterHint"), W / 2, H - 68);
      context.restore();
    }

    hud() {
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.progress"),
        meterValue: `${this.completed}/${this.target}`,
        meterRatio: this.completed / this.target,
        mission: `<strong>${Math.ceil(Math.max(0, this.timeLeft))} s</strong> <br> ${this.t("word.mission")}`,
      };
    }
  }

  CQ.WordGame = WordGame;
})(window.CQ = window.CQ || {});
