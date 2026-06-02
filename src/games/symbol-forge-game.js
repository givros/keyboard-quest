(function registerSymbolForgeGame(CQ) {
  const { compareChar, printableKey, randomOf, shuffle } = CQ.utils;
  const { drawKeycap, drawRoundRect, drawStageBackground } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class SymbolForgeGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.timeLimit = this.settings.time;
      this.timeLeft = this.timeLimit;
      this.pool = shuffle(this.symbolPool());
      this.goal = (this.difficulty === "calme" ? 9 : this.difficulty === "rythme" ? 16 : 28) + this.settings.shortcutGoalBonus;
      this.completed = 0;
      this.queue = [];
      this.flash = 0;
      this.current = null;
      this.refillQueue();
      this.nextSymbol();
    }

    refillQueue() {
      while (this.queue.length < 5) this.queue.push(randomOf(this.pool));
    }

    nextSymbol() {
      this.refillQueue();
      this.current = this.queue.shift();
      this.refillQueue();
    }

    update(dt) {
      this.timeLeft -= dt;
      this.flash = Math.max(0, this.flash - dt);
      if (this.timeLeft <= 0) this.finish(this.completed >= Math.ceil(this.goal * 0.65), this.t("symbols.timeUp"));
    }

    handleKeyDown(event) {
      const key = printableKey(event);
      if (!key) return;
      event.preventDefault();
      if (compareChar(key, this.current.symbol)) {
        this.completed += 1;
        this.addHit(26);
        this.nextSymbol();
        if (this.completed >= this.goal) this.finish(true, this.t("symbols.success"));
      } else {
        this.addMiss();
        this.score = Math.max(0, this.score - 5);
        this.flash = 0.18;
      }
    }

    render(context) {
      drawStageBackground(context, "plum");
      context.save();

      drawRoundRect(context, 74, 70, W - 148, 320, 10);
      context.fillStyle = "rgba(255,253,248,0.94)";
      context.fill();
      context.strokeStyle = this.flash ? "#e87861" : "#18212b";
      context.lineWidth = this.flash ? 7 : 4;
      context.stroke();

      context.fillStyle = "#65717e";
      context.font = "900 20px Inter, sans-serif";
      context.textAlign = "center";
      context.fillText(this.t("symbols.target"), W / 2, 112);

      drawKeycap(context, W / 2 - 82, 145, 164, 128, this.current.symbol, "#e7c66f");

      context.fillStyle = "#18212b";
      context.font = "900 30px Inter, sans-serif";
      context.fillText(this.current.combo, W / 2, 326);
      context.fillStyle = "#65717e";
      context.font = "800 17px Inter, sans-serif";
      context.fillText(this.t("symbols.combo"), W / 2, 356);

      context.textAlign = "left";
      context.fillStyle = "rgba(255,253,248,0.86)";
      context.font = "850 18px Inter, sans-serif";
      context.fillText(this.t("symbols.queue"), 82, H - 75);
      this.queue.forEach((item, index) => {
        drawKeycap(context, 240 + index * 78, H - 106, 56, 52, item.symbol, "#f6efe1");
      });

      context.restore();
    }

    hud() {
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.charges"),
        meterValue: `${this.completed}/${this.goal}`,
        meterRatio: this.completed / this.goal,
        mission: `<strong>${this.current.symbol} · ${this.current.combo}</strong> <br> ${this.t("symbols.mission")}`,
      };
    }
  }

  CQ.SymbolForgeGame = SymbolForgeGame;
})(window.CQ = window.CQ || {});
