(function registerTextRepairGame(CQ) {
  const { compareChar, printableKey, shuffle } = CQ.utils;
  const { drawCenteredWrappedText, drawKeycap, drawRoundRect, drawStageBackground } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class TextRepairGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.tasks = shuffle(this.buildTasks());
      this.index = 0;
      this.current = this.tasks[this.index % this.tasks.length];
      this.buffer = "";
      this.completed = 0;
      this.goal = (this.difficulty === "calme" ? 8 : this.difficulty === "rythme" ? 12 : 17) + this.settings.wordTargetBonus;
      this.timeLimit = this.settings.time + 14;
      this.timeLeft = this.timeLimit;
      this.flash = 0;
    }

    buildTasks() {
      const allowed = new Set(this.symbolPool().map((item) => item.symbol));
      const formulaTasks = (this.content.formulas || [])
        .filter((task) => allowed.has(task.symbol))
        .map((task) => ({
          text: task.text,
          answer: task.symbol,
          hint: this.t("repair.symbolHint"),
        }));

      const languageTasks = {
        fr: [
          { text: "gar□on", answer: "ç", hint: "cédille" },
          { text: "Le prix est de 12□.", answer: "€", hint: "monnaie" },
          { text: "mot□cle", answer: "-", hint: "trait d'union" },
          { text: "question□", answer: "?", hint: "ponctuation" },
          { text: "choix A □ choix B", answer: "/", hint: "séparation" },
        ],
        en: [
          { text: "price is 12□.", answer: "€", hint: "currency" },
          { text: "key□word", answer: "-", hint: "hyphen" },
          { text: "question□", answer: "?", hint: "punctuation" },
          { text: "choice A □ choice B", answer: "/", hint: "separator" },
        ],
        es: [
          { text: "precio de 12□.", answer: "€", hint: "moneda" },
          { text: "palabra□clave", answer: "-", hint: "guion" },
          { text: "pregunta□", answer: "?", hint: "puntuación" },
          { text: "opción A □ opción B", answer: "/", hint: "separador" },
        ],
      }[this.language] || [];

      const base = [...languageTasks, ...formulaTasks].filter((task) => task.answer && (allowed.has(task.answer) || ["ç", "-", "?", "/", "€"].includes(task.answer)));
      if (this.difficulty === "calme") return base.filter((task) => ["ç", "-", "?", ".", "@", "#", "€"].includes(task.answer));
      if (this.difficulty === "rythme") return base.filter((task) => !["{", "}", "|", "\\", "~", "^"].includes(task.answer));
      return base;
    }

    answerChars() {
      return Array.from(this.current.answer.normalize("NFC"));
    }

    nextTask() {
      this.completed += 1;
      this.score += 32 + this.current.answer.length * 10;
      if (this.completed >= this.goal) {
        this.finish(true, this.t("repair.success"));
        return;
      }
      this.index += 1;
      if (this.index % this.tasks.length === 0) this.tasks = shuffle(this.tasks);
      this.current = this.tasks[this.index % this.tasks.length];
      this.buffer = "";
    }

    update(dt) {
      this.timeLeft -= dt;
      this.flash = Math.max(0, this.flash - dt);
      if (this.timeLeft <= 0) this.finish(this.completed >= Math.ceil(this.goal * 0.65), this.t("repair.timeUp"));
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
      const expected = this.answerChars()[Array.from(this.buffer).length];
      if (compareChar(key, expected)) {
        this.buffer += expected;
        this.addHit(14);
        if (this.buffer === this.current.answer) this.nextTask();
      } else {
        this.addMiss();
        this.score = Math.max(0, this.score - 6);
        this.flash = 0.18;
      }
    }

    render(context) {
      drawStageBackground(context, "coral");
      context.save();
      context.translate(Math.sin(this.flash * 80) * 8, 0);

      drawRoundRect(context, 68, 78, W - 136, 316, 10);
      context.fillStyle = "rgba(255,253,248,0.94)";
      context.fill();
      context.strokeStyle = this.flash ? "#e87861" : "#18212b";
      context.lineWidth = this.flash ? 7 : 4;
      context.stroke();

      context.textAlign = "center";
      context.fillStyle = "#65717e";
      context.font = "900 19px Inter, sans-serif";
      context.fillText(this.t("repair.title"), W / 2, 124);

      context.fillStyle = "#18212b";
      context.font = "900 36px Inter, sans-serif";
      drawCenteredWrappedText(context, this.current.text, W / 2, 206, W - 252, 46);

      drawKeycap(context, W / 2 - 86, 288, 172, 64, this.buffer || "□", this.flash ? "#e87861" : "#e7c66f");
      context.fillStyle = "#65717e";
      context.font = "850 18px Inter, sans-serif";
      context.fillText(this.current.hint, W / 2, 372);

      context.fillStyle = "rgba(255,253,248,0.86)";
      context.font = "850 20px Inter, sans-serif";
      context.fillText(`${this.completed}/${this.goal}`, W / 2, H - 68);
      context.restore();
    }

    hud() {
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.repairs"),
        meterValue: `${this.completed}/${this.goal}`,
        meterRatio: this.completed / this.goal,
        mission: `<strong>${this.t("repair.mission")}</strong><br>${this.current.hint}`,
      };
    }
  }

  CQ.TextRepairGame = TextRepairGame;
})(window.CQ = window.CQ || {});
