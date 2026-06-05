(function registerAltgrShopGame(CQ) {
  const { clamp, compareChar, printableKey, randomOf, shuffle } = CQ.utils;
  const { drawCenteredWrappedText, drawKeycap, drawRoundRect, drawStageBackground } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class AltgrShopGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.timeLimit = this.settings.time + 8;
      this.timeLeft = this.timeLimit;
      this.orders = shuffle(this.buildOrders());
      this.index = 0;
      this.current = this.orders[this.index % this.orders.length];
      this.buffer = "";
      this.completed = 0;
      this.goal = (this.difficulty === "calme" ? 8 : this.difficulty === "rythme" ? 13 : 18) + this.settings.wordTargetBonus;
      this.patienceLimit = this.buildPatienceLimit();
      this.patience = this.patienceLimit;
      this.flash = 0;
    }

    buildPatienceLimit() {
      const base = {
        calme: 10,
        rythme: 7.8,
        defi: 6.5,
      }[this.difficulty] || 7;
      return Math.max(5.5, base);
    }

    allowedSymbols() {
      return new Set(this.symbolPool().map((item) => item.symbol));
    }

    symbolMeta(symbol) {
      return this.symbolPool().find((item) => item.symbol === symbol) || { symbol, combo: symbol };
    }

    buildOrders() {
      const formulas = this.content.formulas || [];
      const allowed = this.allowedSymbols();
      const formulaOrders = formulas
        .filter((task) => allowed.has(task.symbol))
        .map((task) => ({
          display: task.text,
          answer: task.symbol,
          hint: this.symbolMeta(task.symbol).combo,
        }));

      const symbols = this.symbolPool().filter((item) => allowed.has(item.symbol));
      const singleOrders = symbols.map((item) => ({
        display: this.t("shop.single", { symbol: item.symbol }),
        answer: item.symbol,
        hint: item.combo,
      }));

      const rhythmOrders = [
        { display: "prix□25", answer: "€", hint: this.symbolMeta("€").combo },
        { display: "tag□cours", answer: "#", hint: this.symbolMeta("#").combo },
        { display: "mail□classe.fr", answer: "@", hint: this.symbolMeta("@").combo },
      ].filter((order) => allowed.has(order.answer));

      const hardOrders = [
        { display: "total□15€", answer: "=", hint: "=" },
        { display: "liste□4]", answer: "[", hint: this.symbolMeta("[").combo },
        { display: "objet□score:12}", answer: "{", hint: this.symbolMeta("{").combo },
        { display: "a□b", answer: "|", hint: this.symbolMeta("|").combo },
        { display: "chemin□docs", answer: "\\", hint: this.symbolMeta("\\").combo },
      ].filter((order) => allowed.has(order.answer) || ["=", "\\"].includes(order.answer));

      if (this.difficulty === "calme") return [...formulaOrders, ...singleOrders].filter((order) => ["@", "#", "€", "_", "-", "?", "!", ".", "/", ":"].includes(order.answer));
      if (this.difficulty === "rythme") return [...formulaOrders, ...rhythmOrders, ...singleOrders].filter(Boolean);
      return [...formulaOrders, ...rhythmOrders, ...hardOrders, ...singleOrders].filter(Boolean);
    }

    answerChars() {
      return Array.from(this.current.answer.normalize("NFC"));
    }

    nextOrder() {
      this.completed += 1;
      this.score += 26 + this.current.answer.length * 8;
      if (this.completed >= this.goal) {
        this.finish(true, this.t("shop.success"));
        return;
      }
      this.index += 1;
      if (this.index % this.orders.length === 0) this.orders = shuffle(this.orders);
      this.current = this.orders[this.index % this.orders.length];
      this.buffer = "";
      this.patienceLimit = this.buildPatienceLimit();
      this.patience = this.patienceLimit;
    }

    update(dt) {
      this.timeLeft -= dt;
      this.patience -= dt;
      this.flash = Math.max(0, this.flash - dt);
      if (this.patience <= 0) {
        this.addMiss();
        this.score = Math.max(0, this.score - 8);
        this.flash = 0.2;
        this.nextCustomerAfterMiss();
      }
      if (this.timeLeft <= 0) this.finish(this.completed >= Math.ceil(this.goal * 0.65), this.t("shop.timeUp"));
    }

    nextCustomerAfterMiss() {
      this.index += 1;
      this.current = this.orders[this.index % this.orders.length];
      this.buffer = "";
      this.patienceLimit = this.buildPatienceLimit();
      this.patience = this.patienceLimit;
    }

    handleKeyDown(event) {
      const key = printableKey(event);
      if (!key || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();
      const expected = this.answerChars()[Array.from(this.buffer).length];
      if (compareChar(key, expected)) {
        this.buffer += expected;
        this.addHit(18);
        if (this.buffer === this.current.answer) this.nextOrder();
      } else {
        this.addMiss();
        this.score = Math.max(0, this.score - 5);
        this.flash = 0.16;
      }
    }

    render(context) {
      drawStageBackground(context, "coral");
      context.save();

      drawRoundRect(context, 76, 76, W - 152, 322, 10);
      context.fillStyle = "rgba(255,253,248,0.94)";
      context.fill();
      context.strokeStyle = this.flash ? "#e87861" : "#18212b";
      context.lineWidth = this.flash ? 7 : 4;
      context.stroke();

      context.fillStyle = "#65717e";
      context.font = "900 18px Inter, sans-serif";
      context.textAlign = "center";
      context.fillText(this.t("shop.customer"), W / 2, 122);

      context.fillStyle = "#18212b";
      context.font = "900 34px Inter, sans-serif";
      drawCenteredWrappedText(context, this.current.display, W / 2, 188, W - 276, 42);

      drawKeycap(context, W / 2 - 72, 270, 144, 76, this.buffer || "…", this.flash ? "#e87861" : "#e7c66f");
      context.fillStyle = "#65717e";
      context.font = "850 18px Inter, sans-serif";
      context.fillText(`${this.t("shop.hint")} ${this.current.hint}`, W / 2, 370);

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
        meterLabel: this.t("meters.orders"),
        meterValue: `${this.completed}/${this.goal}`,
        meterRatio: this.completed / this.goal,
        mission: `<strong>${this.current.answer} · ${this.current.hint}</strong><br>${this.t("shop.mission", { seconds: Math.ceil(Math.max(0, this.patience)) })}`,
      };
    }
  }

  CQ.AltgrShopGame = AltgrShopGame;
})(window.CQ = window.CQ || {});
