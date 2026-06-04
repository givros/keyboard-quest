(function registerFinalBossGame(CQ) {
  const { canonicalCombo, compareChar, printableKey, randomOf, shuffle } = CQ.utils;
  const { drawCenteredWrappedText, drawKeycap, drawRoundRect, drawStageBackground, wrapText } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class FinalBossGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.timeLimit = this.buildTimeLimit();
      this.timeLeft = this.timeLimit;
      this.goal = (this.difficulty === "calme" ? 7 : this.difficulty === "rythme" ? 10 : 15) + this.settings.shortcutGoalBonus;
      this.completed = 0;
      this.lives = this.difficulty === "calme" ? 5 : this.difficulty === "rythme" ? 5 : 4;
      this.phaseDeck = this.buildPhaseDeck();
      this.current = null;
      this.buffer = "";
      this.previewLeft = 0;
      this.state = "input";
      this.flash = 0;
      this.nextChallenge();
    }

    buildTimeLimit() {
      const base = {
        calme: 96,
        rythme: 112,
        defi: 138,
      }[this.difficulty] || 70;
      return Math.round(base * (this.grade === "4e" ? 1.08 : 1));
    }

    buildPhaseDeck() {
      const phases = ["symbol", "text", "combo", "memory"];
      if (this.difficulty === "calme") return ["symbol", "text", "combo"];
      if (this.difficulty === "rythme") return phases;
      return ["symbol", "memory", "combo", "text", "memory", "combo"];
    }

    nextChallenge() {
      const type = randomOf(this.phaseDeck);
      this.current = this.createChallenge(type);
      this.buffer = "";
      if (type === "memory") {
        this.state = "preview";
        this.previewLeft = Math.max(1.6, (this.difficulty === "defi" ? 1.6 : this.difficulty === "rythme" ? 1.9 : 2.2) + this.current.answer.length * 0.22);
      } else {
        this.state = "input";
        this.previewLeft = 0;
      }
    }

    createChallenge(type) {
      if (type === "combo") {
        const shortcuts = this.selectShortcuts();
        const item = randomOf(shortcuts);
        return {
          type,
          prompt: item.action,
          answer: item.combo,
          label: item.combo,
        };
      }
      if (type === "text") {
        const words = (this.content.words || []).filter((word) => word.length <= (this.difficulty === "defi" ? 20 : 14));
        const symbols = this.symbolPool().map((item) => item.symbol);
        const fragments = ["@#€", "?!", "[]", "{}"].filter((fragment) => Array.from(fragment).every((char) => symbols.includes(char)));
        const candidates = this.difficulty === "calme" ? words : [...words, ...symbols, ...fragments].filter(Boolean);
        const answer = randomOf(candidates.length ? candidates : ["clavier"]);
        return {
          type,
          prompt: this.t("boss.copy"),
          answer,
          label: answer,
        };
      }
      if (type === "memory") {
        const pool = this.symbolPool().map((item) => item.symbol);
        const length = (this.difficulty === "defi" ? 5 : this.difficulty === "rythme" ? 4 : 3) + (this.grade === "4e" ? 1 : 0);
        let answer = "";
        for (let i = 0; i < length; i += 1) answer += randomOf(pool);
        return {
          type,
          prompt: this.t("boss.memory"),
          answer,
          label: answer,
        };
      }
      const item = randomOf(this.symbolPool());
      return {
        type: "symbol",
        prompt: item.combo,
        answer: item.symbol,
        label: item.symbol,
      };
    }

    selectShortcuts() {
      const all = this.content.shortcuts || [];
      const browserReservedCombo = (combo) => {
        const parts = String(combo || "").split("+");
        return parts[0] === "Ctrl" && ["N", "P", "O", "L", "H", "K"].includes(parts.at(-1));
      };
      if (this.difficulty === "calme") return all.filter((item) => ["Ctrl+C", "Ctrl+V", "Ctrl+Z", "Ctrl+S", "Tab", "Enter", "Escape"].includes(item.combo)) || all;
      if (this.difficulty === "rythme") return all.filter((item) => !browserReservedCombo(item.combo)) || all;
      return all.length ? all : [{ combo: "Ctrl+C", action: "copy" }];
    }

    answerChars() {
      return Array.from(this.current.answer.normalize("NFC"));
    }

    update(dt) {
      this.timeLeft -= dt;
      this.flash = Math.max(0, this.flash - dt);
      if (this.state === "preview") {
        this.previewLeft -= dt;
        if (this.previewLeft <= 0) this.state = "input";
      }
      if (this.timeLeft <= 0) this.finish(this.completed >= Math.ceil(this.goal * 0.65), this.t("boss.timeUp"));
    }

    acceptChallenge() {
      this.completed += 1;
      this.score += 46 + this.current.answer.length * 9;
      if (this.completed >= this.goal) {
        this.finish(true, this.t("boss.success"));
        return;
      }
      this.nextChallenge();
    }

    rejectChallenge() {
      this.lives -= 1;
      this.addMiss();
      this.score = Math.max(0, this.score - 10);
      this.flash = 0.22;
      if (this.lives <= 0) this.finish(false, this.t("boss.lost"));
      else this.nextChallenge();
    }

    handleKeyDown(event) {
      if (this.state === "preview") return;
      if (this.current.type === "combo") {
        const combo = canonicalCombo(event);
        if (!combo) return;
        if (event.ctrlKey || event.altKey || event.metaKey || event.key === "Tab") event.preventDefault();
        if (combo === this.current.answer) {
          this.addHit(34);
          this.acceptChallenge();
        } else {
          this.rejectChallenge();
        }
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        this.buffer = Array.from(this.buffer).slice(0, -1).join("");
        return;
      }
      const key = printableKey(event);
      if (!key || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();
      const expected = this.answerChars()[Array.from(this.buffer).length];
      if (compareChar(key, expected)) {
        this.buffer += expected;
        this.addHit(this.current.type === "memory" ? 18 : 14);
        if (this.buffer === this.current.answer) this.acceptChallenge();
      } else {
        this.rejectChallenge();
      }
    }

    drawTarget(context, label, hidden) {
      context.save();
      const x = 134;
      const y = 218;
      const width = W - 268;
      const height = 94;
      drawRoundRect(context, x, y, width, height, 10);
      context.fillStyle = this.state === "preview" ? "#fff4cf" : "#f6efe1";
      context.fill();
      context.strokeStyle = "rgba(24,33,43,0.24)";
      context.lineWidth = 3;
      context.stroke();

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#18212b";
      const visibleLabel = hidden ? "••••" : label;
      const size = visibleLabel.length > 34 ? 20 : visibleLabel.length > 22 ? 24 : visibleLabel.length > 12 ? 30 : 38;
      context.font = `900 ${size}px Inter, sans-serif`;
      if (visibleLabel.length > 28) {
        context.textBaseline = "alphabetic";
        drawCenteredWrappedText(context, visibleLabel, W / 2, y + 40, width - 48, 28);
      } else {
        context.fillText(visibleLabel, W / 2, y + height / 2);
      }
      context.textBaseline = "alphabetic";
      context.restore();
    }

    render(context) {
      drawStageBackground(context, "plum");
      context.save();
      context.translate(Math.sin(this.flash * 80) * 8, 0);

      drawRoundRect(context, 68, 56, W - 136, 388, 10);
      context.fillStyle = "rgba(255,253,248,0.94)";
      context.fill();
      context.strokeStyle = this.flash ? "#e87861" : "#18212b";
      context.lineWidth = this.flash ? 8 : 4;
      context.stroke();

      context.textAlign = "center";
      context.fillStyle = "#65717e";
      context.font = "900 19px Inter, sans-serif";
      context.fillText(this.t(`boss.types.${this.current.type}`), W / 2, 108);

      context.fillStyle = "#18212b";
      context.font = "900 25px Inter, sans-serif";
      drawCenteredWrappedText(context, this.current.prompt, W / 2, 154, W - 252, 32);

      const hidden = this.current.type === "memory" && this.state === "input";
      const label = hidden ? "••••" : this.current.label;
      this.drawTarget(context, label, hidden);

      context.fillStyle = this.flash ? "#d95842" : "#167c80";
      context.font = "900 24px Inter, sans-serif";
      context.textAlign = "center";
      context.fillText(this.current.type === "combo" ? this.t("boss.comboHint") : this.buffer || "…", W / 2, 366);

      context.fillStyle = "rgba(255,253,248,0.88)";
      context.font = "850 20px Inter, sans-serif";
      context.textAlign = "center";
      context.fillText(`${this.t("boss.lives")} ${"■".repeat(Math.max(0, this.lives))} · ${this.completed}/${this.goal}`, W / 2, H - 66);
      context.restore();
    }

    hud() {
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.phases"),
        meterValue: `${this.completed}/${this.goal}`,
        meterRatio: this.completed / this.goal,
        mission: `<strong>${this.t(`boss.types.${this.current.type}`)}</strong><br>${this.state === "preview" ? this.t("boss.preview") : this.t("boss.mission")}`,
      };
    }
  }

  CQ.FinalBossGame = FinalBossGame;
})(window.CQ = window.CQ || {});
