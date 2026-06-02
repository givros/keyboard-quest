(function registerFormulaFixGame(CQ) {
  const { compareChar, printableKey, shuffle } = CQ.utils;
  const { drawKeycap, drawRoundRect, drawStageBackground } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class FormulaFixGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.timeLimit = this.settings.time + 8;
      this.timeLeft = this.timeLimit;
      this.tasks = shuffle(this.content.formulas || []);
      this.goal = (this.difficulty === "calme" ? 7 : this.difficulty === "rythme" ? 12 : 22) + this.settings.wordTargetBonus;
      this.completed = 0;
      this.index = 0;
      this.flash = 0;
      this.current = this.tasks[this.index % this.tasks.length];
    }

    symbolMeta(symbol) {
      return (CQ.symbolSets[this.grade] || CQ.symbolSets["5e"]).find((item) => item.symbol === symbol) || { symbol, combo: symbol };
    }

    nextTask() {
      this.completed += 1;
      if (this.completed >= this.goal) {
        this.finish(true, this.t("formula.success"));
        return;
      }
      this.index = (this.index + 1) % this.tasks.length;
      if (this.index === 0) this.tasks = shuffle(this.tasks);
      this.current = this.tasks[this.index % this.tasks.length];
    }

    update(dt) {
      this.timeLeft -= dt;
      this.flash = Math.max(0, this.flash - dt);
      if (this.timeLeft <= 0) this.finish(this.completed >= Math.ceil(this.goal * 0.6), this.t("formula.timeUp"));
    }

    handleKeyDown(event) {
      const key = printableKey(event);
      if (!key) return;
      event.preventDefault();

      if (compareChar(key, this.current.symbol)) {
        this.addHit(24);
        this.score += 12;
        this.nextTask();
      } else {
        this.addMiss();
        this.score = Math.max(0, this.score - 6);
        this.flash = 0.18;
      }
    }

    drawFormula(context) {
      const parts = this.current.text.split("□");
      const before = parts[0] || "";
      const after = parts.slice(1).join("□");
      context.font = "900 38px Inter, sans-serif";
      const beforeWidth = context.measureText(before).width;
      const squareWidth = 58;
      const afterWidth = context.measureText(after).width;
      let x = W / 2 - (beforeWidth + squareWidth + afterWidth) / 2;
      const y = 218;

      context.fillStyle = "#18212b";
      context.textAlign = "left";
      context.fillText(before, x, y);
      x += beforeWidth;
      drawKeycap(context, x + 4, y - 44, 48, 50, "□", this.flash ? "#e87861" : "#e7c66f");
      x += squareWidth;
      context.fillText(after, x, y);
    }

    render(context) {
      drawStageBackground(context, "coral");
      context.save();

      drawRoundRect(context, 78, 92, W - 156, 280, 10);
      context.fillStyle = "rgba(255,253,248,0.94)";
      context.fill();
      context.strokeStyle = this.flash ? "#e87861" : "#18212b";
      context.lineWidth = this.flash ? 7 : 4;
      context.stroke();

      context.textAlign = "center";
      context.fillStyle = "#65717e";
      context.font = "850 19px Inter, sans-serif";
      context.fillText(this.t("formula.placeholder"), W / 2, 136);

      this.drawFormula(context);

      const meta = this.symbolMeta(this.current.symbol);
      context.fillStyle = "#18212b";
      context.font = "900 24px Inter, sans-serif";
      context.fillText(`${meta.symbol} · ${meta.combo}`, W / 2, 316);

      context.fillStyle = "rgba(255,253,248,0.88)";
      context.font = "850 20px Inter, sans-serif";
      context.fillText(`${this.completed} / ${this.goal}`, W / 2, H - 70);
      context.restore();
    }

    hud() {
      const meta = this.symbolMeta(this.current.symbol);
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.repairs"),
        meterValue: `${this.completed}/${this.goal}`,
        meterRatio: this.completed / this.goal,
        mission: `<strong>${meta.symbol} · ${meta.combo}</strong> <br> ${this.t("formula.mission")}`,
      };
    }
  }

  CQ.FormulaFixGame = FormulaFixGame;
})(window.CQ = window.CQ || {});
