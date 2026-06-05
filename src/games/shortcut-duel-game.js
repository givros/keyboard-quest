(function registerShortcutDuelGame(CQ) {
  const { canonicalCombo, isBrowserReservedShortcut, randomOf, shuffle } = CQ.utils;
  const { drawCenteredWrappedText, drawKeycap, drawRoundRect, drawStageBackground } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class ShortcutDuelGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.timeLimit = this.settings.time + 10;
      this.timeLeft = this.timeLimit;
      this.deck = shuffle(this.selectDeck());
      this.current = randomOf(this.deck);
      this.completed = 0;
      this.goal = (this.difficulty === "calme" ? 9 : this.difficulty === "rythme" ? 13 : 19) + this.settings.shortcutGoalBonus;
      this.playerHp = this.difficulty === "calme" ? 5 : this.difficulty === "rythme" ? 4 : 4;
      this.maxHp = this.playerHp;
      this.turnLimit = this.buildTurnLimit();
      this.turnLeft = this.turnLimit;
      this.flash = 0;
      this.feedback = "";
      this.feedbackTimer = 0;
    }

    buildTurnLimit() {
      const base = {
        calme: 5.2,
        rythme: 4.6,
        defi: 4,
      }[this.difficulty] || 4;
      return Math.max(3.4, base);
    }

    selectDeck() {
      const all = this.content.shortcuts || [];
      const available = all.filter((item) => !isBrowserReservedShortcut(item.combo));
      return available.length ? available : all;
    }

    nextAttack() {
      const previous = this.current?.combo;
      const candidates = this.deck.filter((item) => item.combo !== previous);
      this.current = randomOf(candidates.length ? candidates : this.deck);
      this.turnLimit = this.buildTurnLimit();
      this.turnLeft = this.turnLimit;
    }

    update(dt) {
      this.timeLeft -= dt;
      this.turnLeft -= dt;
      this.flash = Math.max(0, this.flash - dt);
      this.feedbackTimer = Math.max(0, this.feedbackTimer - dt);
      if (!this.feedbackTimer) this.feedback = "";

      if (this.turnLeft <= 0) {
        this.playerHp -= 1;
        this.addMiss();
        this.flash = 0.2;
        this.feedback = this.t("duel.tooSlow");
        this.feedbackTimer = 0.8;
        if (this.playerHp <= 0) {
          this.finish(false, this.t("duel.lost"));
          return;
        }
        this.nextAttack();
      }

      if (this.timeLeft <= 0) this.finish(this.completed >= Math.ceil(this.goal * 0.65), this.t("duel.timeUp"));
    }

    handleKeyDown(event) {
      const combo = canonicalCombo(event);
      if (!combo) return;
      if (event.ctrlKey || event.altKey || event.metaKey || event.key === "Tab") event.preventDefault();

      if (combo === this.current.combo) {
        this.completed += 1;
        this.addHit(30 + (this.turnLeft / this.turnLimit) * 20);
        this.feedback = this.t("duel.blocked");
        this.feedbackTimer = 0.5;
        if (this.completed >= this.goal) {
          this.finish(true, this.t("duel.success"));
          return;
        }
        this.nextAttack();
      } else {
        this.playerHp -= 1;
        this.addMiss();
        this.flash = 0.22;
        this.feedback = this.t("duel.received", { combo });
        this.feedbackTimer = 0.9;
        if (this.playerHp <= 0) this.finish(false, this.t("duel.lost"));
        else this.nextAttack();
      }
    }

    render(context) {
      drawStageBackground(context, "plum");
      context.save();

      drawRoundRect(context, 70, 70, W - 140, 330, 10);
      context.fillStyle = "rgba(255,253,248,0.93)";
      context.fill();
      context.strokeStyle = this.flash ? "#e87861" : "#18212b";
      context.lineWidth = this.flash ? 7 : 4;
      context.stroke();

      context.textAlign = "center";
      context.fillStyle = "#65717e";
      context.font = "900 19px Inter, sans-serif";
      context.fillText(this.t("duel.attack"), W / 2, 118);

      context.fillStyle = "#18212b";
      context.font = "900 30px Inter, sans-serif";
      drawCenteredWrappedText(context, this.current.action, W / 2, 154, W - 210, 34);

      const parts = this.current.combo.split("+");
      const totalWidth = parts.reduce((sum, part) => sum + Math.max(76, part.length * 20 + 28), 0) + (parts.length - 1) * 14;
      let x = W / 2 - totalWidth / 2;
      parts.forEach((part) => {
        const keyWidth = Math.max(76, part.length * 20 + 28);
        drawKeycap(context, x, 206, keyWidth, 70, part, "#e7c66f");
        x += keyWidth + 14;
      });

      context.fillStyle = this.feedback === this.t("duel.blocked") ? "#167c80" : this.feedback ? "#d95842" : "#65717e";
      context.font = "850 21px Inter, sans-serif";
      drawCenteredWrappedText(context, this.feedback || this.t("duel.prompt"), W / 2, 318, W - 180, 28);

      context.fillStyle = "#18212b";
      context.font = "900 18px Inter, sans-serif";
      context.fillText(`${this.t("duel.guard")} ${"■".repeat(Math.max(0, this.playerHp))}`, W / 2, 366);
      context.fillStyle = "rgba(255,253,248,0.86)";
      context.fillText(`${this.completed}/${this.goal}`, W / 2, H - 70);
      context.restore();
    }

    hud() {
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.duels"),
        meterValue: `${this.completed}/${this.goal}`,
        meterRatio: this.completed / this.goal,
        mission: `<strong>${this.current.combo.replaceAll("+", " + ")}</strong><br>${this.t("duel.mission", { seconds: Math.ceil(this.turnLeft) })}`,
      };
    }
  }

  CQ.ShortcutDuelGame = ShortcutDuelGame;
})(window.CQ = window.CQ || {});
