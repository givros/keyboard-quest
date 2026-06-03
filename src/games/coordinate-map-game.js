(function registerCoordinateMapGame(CQ) {
  const { compareChar, printableKey } = CQ.utils;
  const { drawKeycap, drawRoundRect, drawStageBackground } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class CoordinateMapGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.cols = this.grade === "4e" ? 8 : 6;
      this.rows = this.grade === "4e" ? 6 : 5;
      this.tile = 54;
      this.offsetX = W / 2 - (this.cols * this.tile) / 2;
      this.offsetY = 78;
      this.timeLimit = this.settings.time + 16;
      this.timeLeft = this.timeLimit;
      this.goal = (this.difficulty === "calme" ? 5 : this.difficulty === "rythme" ? 8 : 13) + Math.ceil(this.settings.wordTargetBonus / 2);
      this.completed = 0;
      this.player = { x: 0, y: 0 };
      this.target = this.randomTarget();
      this.buffer = "";
      this.flash = 0;
    }

    randomTarget() {
      let next;
      do {
        next = {
          x: Math.floor(Math.random() * this.cols),
          y: Math.floor(Math.random() * this.rows),
        };
      } while (next.x === this.player.x && next.y === this.player.y);
      return next;
    }

    targetLabel() {
      const col = String.fromCharCode(65 + this.target.x);
      const row = String(this.target.y + 1);
      if (this.difficulty === "calme") return `${col}${row}`;
      if (this.difficulty === "rythme") return `(${this.target.x + 1};${this.target.y + 1})`;
      return `x=${this.target.x + 1};y=${this.target.y + 1}`;
    }

    targetSequenceLabel() {
      return Array.from(this.targetLabel()).join("  ");
    }

    expectedChars() {
      return Array.from(this.targetLabel().normalize("NFC"));
    }

    nextTarget() {
      this.completed += 1;
      this.score += 36 + this.targetLabel().length * 5;
      this.player = { ...this.target };
      if (this.completed >= this.goal) {
        this.finish(true, this.t("coordinates.success"));
        return;
      }
      this.target = this.randomTarget();
      this.buffer = "";
    }

    update(dt) {
      this.timeLeft -= dt;
      this.flash = Math.max(0, this.flash - dt);
      if (this.timeLeft <= 0) this.finish(this.completed >= Math.ceil(this.goal * 0.65), this.t("coordinates.timeUp"));
    }

    handleKeyDown(event) {
      if (event.key === "Backspace") {
        event.preventDefault();
        this.buffer = Array.from(this.buffer).slice(0, -1).join("");
        return;
      }
      const key = printableKey(event);
      if (!key || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();
      const expected = this.expectedChars()[Array.from(this.buffer).length];
      if (compareChar(key, expected)) {
        this.buffer += expected;
        this.addHit(12);
        if (this.buffer === this.targetLabel()) this.nextTarget();
      } else {
        this.addMiss();
        this.score = Math.max(0, this.score - 6);
        this.buffer = "";
        this.flash = 0.18;
      }
    }

    render(context) {
      drawStageBackground(context, "green");
      context.save();
      context.translate(Math.sin(this.flash * 80) * 8, 0);

      for (let y = 0; y < this.rows; y += 1) {
        for (let x = 0; x < this.cols; x += 1) {
          const px = this.offsetX + x * this.tile;
          const py = this.offsetY + y * this.tile;
          const isTarget = x === this.target.x && y === this.target.y;
          const isPlayer = x === this.player.x && y === this.player.y;
          drawRoundRect(context, px, py, this.tile - 6, this.tile - 6, 8);
          context.fillStyle = isTarget ? "#e7c66f" : isPlayer ? "#8fc7a3" : "rgba(255,253,248,0.9)";
          context.fill();
          context.strokeStyle = "rgba(24,33,43,0.2)";
          context.lineWidth = 2;
          context.stroke();
          context.fillStyle = "#18212b";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.font = "900 16px Inter, sans-serif";
          context.fillText(`${String.fromCharCode(65 + x)}${y + 1}`, px + this.tile / 2 - 3, py + this.tile / 2 - 3);
        }
      }

      const label = this.targetLabel();
      context.textAlign = "center";
      context.fillStyle = "rgba(255,253,248,0.9)";
      context.font = "900 26px Inter, sans-serif";
      context.fillText(this.t("coordinates.target", { label }), W / 2, 44);

      const chars = Array.from(label);
      const keyWidth = Math.min(64, Math.max(42, (W - 220) / Math.max(chars.length, 1) - 8));
      const totalWidth = chars.length * keyWidth + (chars.length - 1) * 8;
      let keyX = W / 2 - totalWidth / 2;
      context.fillStyle = "rgba(255,253,248,0.86)";
      context.font = "850 18px Inter, sans-serif";
      context.fillText(this.t("coordinates.typeSequence"), W / 2, H - 132);
      chars.forEach((char, index) => {
        const typed = Array.from(this.buffer)[index];
        const fill = typed ? "#8fc7a3" : "#f6efe1";
        drawKeycap(context, keyX, H - 116, keyWidth, 48, typed || char, fill);
        keyX += keyWidth + 8;
      });

      context.fillStyle = "rgba(255,253,248,0.86)";
      context.font = "850 20px Inter, sans-serif";
      context.fillText(`${this.completed}/${this.goal}`, W / 2, H - 36);
      context.restore();
    }

    hud() {
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.maps"),
        meterValue: `${this.completed}/${this.goal}`,
        meterRatio: this.completed / this.goal,
        mission: `<strong>${this.targetSequenceLabel()}</strong><br>${this.t("coordinates.mission")}`,
      };
    }
  }

  CQ.CoordinateMapGame = CoordinateMapGame;
})(window.CQ = window.CQ || {});
