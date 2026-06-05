(function registerShortcutGame(CQ) {
  const { canonicalCombo, isBrowserReservedShortcut, shuffle } = CQ.utils;
  const { drawCenteredWrappedText, drawKeycap, drawStageBackground } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class ShortcutGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.timeLimit = this.settings.time;
      this.timeLeft = this.timeLimit;
      this.deck = shuffle(this.selectShortcuts());
      this.index = 0;
      this.current = this.deck[this.index];
      this.feedback = "";
      this.feedbackTimer = 0;
      this.goal = (this.difficulty === "calme" ? 10 : this.difficulty === "rythme" ? 14 : 20) + this.settings.shortcutGoalBonus;
      this.completed = 0;
    }

    selectShortcuts() {
      const all = this.content.shortcuts || [];
      const available = all.filter((item) => !isBrowserReservedShortcut(item.combo));
      const essential = new Set(["Ctrl+C", "Ctrl+V", "Ctrl+Z", "Ctrl+A", "Ctrl+S", "Ctrl+F", "Tab", "Enter", "Escape"]);
      const method = new Set([...essential, "Ctrl+X", "Ctrl+Y", "Shift+Tab"]);
      let deck = available;

      if (this.difficulty === "calme") {
        deck = available.filter((item) => essential.has(item.combo));
      } else if (this.difficulty === "rythme") {
        deck = available.filter((item) => method.has(item.combo));
      }

      return deck.length ? deck : available.length ? available : all;
    }

    update(dt) {
      this.timeLeft -= dt;
      this.feedbackTimer = Math.max(0, this.feedbackTimer - dt);
      if (!this.feedbackTimer) this.feedback = "";
      if (this.timeLeft <= 0) this.finish(this.completed >= Math.ceil(this.goal * 0.6), this.t("shortcut.timeUp"));
    }

    handleKeyDown(event) {
      const combo = canonicalCombo(event);
      if (!combo) return;
      if (event.ctrlKey || event.altKey || event.metaKey || event.key === "Tab") event.preventDefault();

      if (combo === this.current.combo) {
        this.completed += 1;
        this.addHit(20);
        this.feedback = "correct";
        this.feedbackTimer = 0.42;
        if (this.completed >= this.goal) {
          this.finish(true, this.t("shortcut.success"));
          return;
        }
        this.index = (this.index + 1) % this.deck.length;
        if (this.index === 0) this.deck = shuffle(this.deck);
        this.current = this.deck[this.index];
      } else {
        this.addMiss();
        this.feedback = combo;
        this.feedbackTimer = 0.65;
      }
    }

    render(context) {
      drawStageBackground(context, "plum");
      context.save();
      context.textAlign = "center";
      context.fillStyle = "rgba(255,253,248,0.9)";
      context.font = "850 24px Inter, sans-serif";
      drawCenteredWrappedText(context, this.current.action, W / 2, 98, W - 170, 30);

      const parts = this.current.combo.split("+");
      const totalWidth = parts.reduce((sum, part) => sum + Math.max(76, part.length * 21 + 28), 0) + (parts.length - 1) * 16;
      let x = W / 2 - totalWidth / 2;
      for (const part of parts) {
        const keyWidth = Math.max(76, part.length * 21 + 28);
        drawKeycap(context, x, 176, keyWidth, 76, part, "#f6efe1");
        x += keyWidth + 16;
      }

      context.font = "900 32px Inter, sans-serif";
      context.fillStyle = this.feedback === "correct" ? "#8fc7a3" : this.feedback ? "#e87861" : "#fffdf8";
      const message = this.feedback === "correct" ? this.t("shortcut.correct") : this.feedback ? this.t("shortcut.received", { combo: this.feedback }) : this.t("shortcut.yourTurn");
      drawCenteredWrappedText(context, message, W / 2, 336, W - 150, 38);

      context.fillStyle = "rgba(255,253,248,0.82)";
      context.font = "850 20px Inter, sans-serif";
      context.fillText(`${this.completed} / ${this.goal}`, W / 2, H - 72);
      context.restore();
    }

    hud() {
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.time"),
        meterValue: `${Math.ceil(Math.max(0, this.timeLeft))} s`,
        meterRatio: this.timeLeft / this.timeLimit,
        mission: `<strong>${this.current.action}</strong> <br> ${this.current.combo.replaceAll("+", " + ")}`,
      };
    }
  }

  CQ.ShortcutGame = ShortcutGame;
})(window.CQ = window.CQ || {});
