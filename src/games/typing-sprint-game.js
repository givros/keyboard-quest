(function registerTypingSprintGame(CQ) {
  const { clamp, compareChar, printableKey } = CQ.utils;
  const { drawKeycap, drawRoundRect, drawStageBackground } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class TypingSprintGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.lines = CQ.typingTextFor(this.language, this.grade, this.difficulty);
      this.text = this.lines.join("\n");
      this.timeLimit = this.buildTimeLimit();
      this.timeLeft = this.timeLimit;
      this.cursor = 0;
      this.shake = 0;
      this.lineBonuses = new Set();
    }

    buildTimeLimit() {
      const base = {
        calme: 112,
        rythme: 138,
        defi: 168,
      }[this.difficulty] || 76;
      return Math.round(base * (this.grade === "4e" ? 1.08 : 1));
    }

    difficultyBonus() {
      return {
        calme: 0,
        rythme: 1,
        defi: 3,
      }[this.difficulty] || 0;
    }

    lineStart(index) {
      return this.lines.slice(0, index).reduce((sum, line) => sum + line.length + 1, 0);
    }

    currentLineIndex() {
      for (let i = 0; i < this.lines.length; i += 1) {
        const end = this.lineStart(i) + this.lines[i].length;
        if (this.cursor <= end) return i;
      }
      return this.lines.length - 1;
    }

    lineProgress(index) {
      const start = this.lineStart(index);
      const line = this.lines[index];
      const typedCount = clamp(this.cursor - start, 0, line.length);
      return {
        typed: line.slice(0, typedCount),
        current: line[typedCount] || "",
        remaining: line.slice(typedCount),
        complete: typedCount >= line.length && (index === this.lines.length - 1 || this.cursor > start + line.length),
      };
    }

    completedLines() {
      return this.lines.filter((_, index) => this.lineProgress(index).complete).length;
    }

    wordsPerMinute() {
      const elapsed = Math.max(1, this.timeLimit - this.timeLeft);
      const typedCharacters = this.text.slice(0, this.cursor).replace(/\n/g, "").length;
      return Math.round((typedCharacters / 5) / (elapsed / 60));
    }

    lineFontSize(line) {
      if (line.length > 56) return 20;
      if (line.length > 50) return 21;
      if (line.length > 44) return 22;
      return 24;
    }

    update(dt) {
      this.timeLeft -= dt;
      this.shake = Math.max(0, this.shake - dt);
      if (this.timeLeft <= 0) this.finish(false, this.t("typing.timeUp"));
    }

    handleKeyDown(event) {
      if (this.done) return;

      if (event.key === "Backspace") {
        event.preventDefault();
        if (this.cursor > 0) {
          this.cursor -= 1;
          this.addMiss();
          this.score = Math.max(0, this.score - 8);
        }
        return;
      }

      const expected = this.text[this.cursor];
      if (expected === "\n") {
        event.preventDefault();
        if (event.key === "Enter") {
          this.advance();
        } else {
          this.reject();
        }
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        this.reject();
        return;
      }

      const key = printableKey(event);
      if (!key || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();

      if (compareChar(key, expected)) {
        this.advance();
      } else {
        this.reject();
      }
    }

    advance() {
      const beforeLine = this.currentLineIndex();
      this.cursor += 1;
      this.addHit(5 + this.difficultyBonus());
      const progress = this.lineProgress(beforeLine);
      if (progress.complete && !this.lineBonuses.has(beforeLine)) {
        this.lineBonuses.add(beforeLine);
        this.score += 55 + this.difficultyBonus() * 20;
      }
      if (this.cursor >= this.text.length) this.finish(true, this.t("typing.success"));
    }

    reject() {
      this.addMiss();
      this.score = Math.max(0, this.score - 6);
      this.shake = 0.16;
    }

    render(context) {
      drawStageBackground(context, "teal");
      context.save();
      context.translate(Math.sin(this.shake * 80) * 8, 0);

      drawRoundRect(context, 54, 54, W - 108, 402, 10);
      context.fillStyle = "rgba(255,253,248,0.94)";
      context.fill();
      context.strokeStyle = this.shake ? "#e87861" : "#18212b";
      context.lineWidth = this.shake ? 7 : 4;
      context.stroke();

      context.textBaseline = "middle";
      const activeLine = this.currentLineIndex();
      this.lines.forEach((line, index) => {
        const y = 112 + index * 66;
        const progress = this.lineProgress(index);
        const isActive = index === activeLine && !this.done;

        drawRoundRect(context, 82, y - 27, W - 164, 52, 8);
        context.fillStyle = isActive ? "rgba(231,198,111,0.28)" : "rgba(24,33,43,0.06)";
        context.fill();

        context.fillStyle = "#65717e";
        context.font = "900 18px Inter, sans-serif";
        context.textAlign = "center";
        context.fillText(String(index + 1), 106, y);

        const fontSize = this.lineFontSize(line);
        context.font = `850 ${fontSize}px Inter, sans-serif`;
        context.textAlign = "left";
        const x = 136;
        context.fillStyle = "#167c80";
        context.fillText(progress.typed, x, y);
        const typedWidth = context.measureText(progress.typed).width;

        if (isActive && progress.current) {
          const currentWidth = Math.max(12, context.measureText(progress.current).width);
          context.fillStyle = "rgba(22,124,128,0.18)";
          context.fillRect(x + typedWidth, y - 21, currentWidth + 4, 36);
        }

        context.fillStyle = "#18212b";
        context.fillText(progress.remaining, x + typedWidth, y);

        if (progress.complete) {
          drawKeycap(context, W - 138, y - 21, 56, 42, "✓", "#8fc7a3");
        } else if (isActive && !progress.current) {
          drawKeycap(context, W - 164, y - 21, 82, 42, "Entrée", "#e7c66f");
        }
      });

      context.textAlign = "center";
      context.fillStyle = "rgba(255,253,248,0.88)";
      context.font = "850 20px Inter, sans-serif";
      context.fillText(this.t("typing.wpm", { wpm: this.wordsPerMinute() }), W / 2, H - 54);
      context.restore();
    }

    hud() {
      const current = this.currentLineIndex() + 1;
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.lines"),
        meterValue: `${this.completedLines()}/${this.lines.length}`,
        meterRatio: this.cursor / this.text.length,
        mission: `<strong>${this.t("typing.line", { current, target: this.lines.length })} · ${Math.ceil(Math.max(0, this.timeLeft))} s</strong> <br> ${this.t("typing.mission")} <br> ${this.t("typing.wpm", { wpm: this.wordsPerMinute() })}`,
      };
    }
  }

  CQ.TypingSprintGame = TypingSprintGame;
})(window.CQ = window.CQ || {});
