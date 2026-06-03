(function registerFlashDictationGame(CQ) {
  const { compareChar, printableKey, shuffle } = CQ.utils;
  const { drawKeycap, drawRoundRect, drawStageBackground, wrapText } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class FlashDictationGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.rounds = shuffle(this.selectLines());
      this.target = (this.difficulty === "calme" ? 4 : this.difficulty === "rythme" ? 5 : 7) + Math.ceil(this.settings.wordTargetBonus / 2);
      this.index = 0;
      this.current = this.rounds[this.index % this.rounds.length];
      this.buffer = "";
      this.completed = 0;
      this.timeLimit = this.settings.time + 18;
      this.timeLeft = this.timeLimit;
      this.previewLimit = this.previewTime();
      this.previewLeft = this.previewLimit;
      this.state = "preview";
      this.flash = 0;
    }

    previewTime() {
      const base = {
        calme: 2.6,
        rythme: 1.75,
        defi: 1.05,
      }[this.difficulty] || 2;
      return Math.max(0.85, base * (this.grade === "4e" ? 0.86 : 1));
    }

    selectLines() {
      const words = this.content.words || [];
      const sentences = words.filter((word) => /[.!?]$/.test(word.trim()));
      const terms = words.filter((word) => !sentences.includes(word));
      const typingLines = CQ.typingTextFor(this.language, this.grade, this.difficulty).filter((line) => line.length <= (this.difficulty === "defi" ? 54 : 42));
      if (this.difficulty === "calme") return [...terms.filter((word) => word.length <= 13), ...sentences.filter((line) => line.length <= 38)].filter(Boolean);
      if (this.difficulty === "rythme") return [...terms, ...sentences, ...typingLines].filter((line) => line.length <= 46);
      return [...sentences, ...typingLines, ...terms].filter((line) => line.length <= 58);
    }

    textChars() {
      return Array.from(this.current.normalize("NFC"));
    }

    bufferChars() {
      return Array.from(this.buffer.normalize("NFC"));
    }

    nextLine() {
      this.completed += 1;
      this.score += 42 + this.current.length;
      if (this.completed >= this.target) {
        this.finish(true, this.t("flash.success"));
        return;
      }
      this.index += 1;
      if (this.index % this.rounds.length === 0) this.rounds = shuffle(this.rounds);
      this.current = this.rounds[this.index % this.rounds.length];
      this.buffer = "";
      this.previewLimit = this.previewTime();
      this.previewLeft = this.previewLimit;
      this.state = "preview";
    }

    update(dt) {
      this.timeLeft -= dt;
      this.flash = Math.max(0, this.flash - dt);
      if (this.state === "preview") {
        this.previewLeft -= dt;
        if (this.previewLeft <= 0) this.state = "input";
      }
      if (this.timeLeft <= 0) this.finish(this.completed >= Math.ceil(this.target * 0.6), this.t("flash.timeUp"));
    }

    handleKeyDown(event) {
      if (this.state !== "input") return;
      if (event.key === "Backspace") {
        event.preventDefault();
        this.buffer = this.bufferChars().slice(0, -1).join("");
        return;
      }

      const expected = this.textChars()[this.bufferChars().length];
      if (expected === " " && event.key === " ") {
        event.preventDefault();
        this.buffer += " ";
        this.addHit(8);
      } else {
        const key = printableKey(event);
        if (!key || event.ctrlKey || event.altKey || event.metaKey) return;
        event.preventDefault();
        if (compareChar(key, expected)) {
          this.buffer += expected;
          this.addHit(8);
        } else {
          this.addMiss();
          this.score = Math.max(0, this.score - 7);
          this.flash = 0.18;
        }
      }

      if (this.buffer === this.current) this.nextLine();
    }

    render(context) {
      drawStageBackground(context, "teal");
      context.save();
      context.translate(Math.sin(this.flash * 80) * 8, 0);

      drawRoundRect(context, 72, 72, W - 144, 330, 10);
      context.fillStyle = "rgba(255,253,248,0.94)";
      context.fill();
      context.strokeStyle = this.flash ? "#e87861" : "#18212b";
      context.lineWidth = this.flash ? 7 : 4;
      context.stroke();

      context.textAlign = "center";
      context.fillStyle = "#65717e";
      context.font = "900 19px Inter, sans-serif";
      context.fillText(this.state === "preview" ? this.t("flash.look") : this.t("flash.type"), W / 2, 122);

      context.fillStyle = "#18212b";
      context.font = "900 34px Inter, sans-serif";
      if (this.state === "preview") {
        context.textAlign = "center";
        wrapText(context, this.current, W / 2, 192, W - 252, 44);
      } else {
        context.textAlign = "center";
        context.fillStyle = "#65717e";
        context.font = "900 58px Inter, sans-serif";
        context.fillText("••••••", W / 2, 210);
        context.fillStyle = "#167c80";
        context.font = "900 28px Inter, sans-serif";
        context.textAlign = "left";
        wrapText(context, this.buffer || "…", 126, 296, W - 252, 38);
      }

      context.textAlign = "center";
      drawKeycap(context, W / 2 - 90, 344, 180, 46, this.state === "preview" ? `${Math.ceil(this.previewLeft)} s` : `${this.bufferChars().length}/${this.textChars().length}`, "#e7c66f");
      context.fillStyle = "rgba(255,253,248,0.86)";
      context.font = "850 20px Inter, sans-serif";
      context.fillText(`${this.completed}/${this.target}`, W / 2, H - 68);
      context.restore();
    }

    hud() {
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.lines"),
        meterValue: `${this.completed}/${this.target}`,
        meterRatio: this.completed / this.target,
        mission: `<strong>${this.state === "preview" ? this.t("flash.look") : this.t("flash.type")}</strong><br>${this.t("flash.mission")}`,
      };
    }
  }

  CQ.FlashDictationGame = FlashDictationGame;
})(window.CQ = window.CQ || {});
