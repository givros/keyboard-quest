(function registerRelayRaceGame(CQ) {
  const { canonicalCombo, compareChar, isBrowserReservedShortcut, printableKey, randomOf, shuffle } = CQ.utils;
  const { drawCenteredWrappedText, drawKeycap, drawRoundRect, drawStageBackground } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  const PLAYER_SHEET = (() => {
    const image = new Image();
    image.src = "assets/rpg/player/sheet-transparent.png";
    return { image, cols: 4, rows: 4 };
  })();

  function drawPlayer(context, x, y, frame) {
    if (PLAYER_SHEET.image.complete && PLAYER_SHEET.image.naturalWidth > 0) {
      const sourceWidth = PLAYER_SHEET.image.naturalWidth / PLAYER_SHEET.cols;
      const sourceHeight = PLAYER_SHEET.image.naturalHeight / PLAYER_SHEET.rows;
      const sourceX = (frame % 4) * sourceWidth;
      context.drawImage(PLAYER_SHEET.image, sourceX, 2 * sourceHeight, sourceWidth, sourceHeight, x - 25, y - 58, 50, 62);
      return;
    }
    context.beginPath();
    context.fillStyle = "#d95842";
    context.arc(x, y - 25, 18, 0, Math.PI * 2);
    context.fill();
  }

  class RelayRaceGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.gates = shuffle(this.buildGates());
      this.goal = (this.difficulty === "calme" ? 8 : this.difficulty === "rythme" ? 12 : 18) + this.settings.shortcutGoalBonus;
      this.completed = 0;
      this.index = 0;
      this.current = this.gates[this.index % this.gates.length];
      this.buffer = "";
      this.progress = 0;
      this.speed = this.difficulty === "calme" ? 0.065 : this.difficulty === "rythme" ? 0.08 : 0.095;
      this.gateDistance = 0.72;
      this.timeLimit = this.settings.time + 10;
      this.timeLeft = this.timeLimit;
      this.lives = this.difficulty === "calme" ? 5 : this.difficulty === "rythme" ? 5 : 4;
      this.flash = 0;
    }

    buildGates() {
      const symbols = this.symbolPool().map((item) => ({ type: "text", label: item.symbol, answer: item.symbol, hint: item.combo }));
      const letters = (this.content.keys || []).slice(0, this.grade === "4e" ? 18 : 12).map((key) => ({ type: "text", label: key, answer: key, hint: this.t("relay.key") }));
      const extras = (this.content.extraKeys || []).slice(0, this.grade === "4e" ? 12 : 7).map((key) => ({ type: "text", label: key, answer: key, hint: this.t("relay.key") }));
      const combos = (this.content.shortcuts || [])
        .filter((item) => !isBrowserReservedShortcut(item.combo))
        .map((item) => ({ type: "combo", label: item.combo, answer: item.combo, hint: item.action }));
      if (this.difficulty === "calme") return [...letters, ...symbols.filter((item) => ["@", "#", "€", "?", "!"].includes(item.answer))];
      if (this.difficulty === "rythme") return [...letters, ...extras, ...symbols, ...combos.filter((item) => ["Tab", "Enter", "Escape", "Ctrl+C", "Ctrl+V", "Ctrl+Z"].includes(item.answer))];
      return [...symbols, ...extras, ...combos, ...letters.slice(0, 8)];
    }

    nextGate(success) {
      if (success) {
        this.completed += 1;
        this.score += 24 + this.current.label.length * 4;
        if (this.completed >= this.goal) {
          this.finish(true, this.t("relay.success"));
          return;
        }
      } else {
        this.lives -= 1;
        this.addMiss();
        this.score = Math.max(0, this.score - 8);
        this.flash = 0.2;
        if (this.lives <= 0) {
          this.finish(false, this.t("relay.lost"));
          return;
        }
      }
      this.index += 1;
      if (this.index % this.gates.length === 0) this.gates = shuffle(this.gates);
      this.current = this.gates[this.index % this.gates.length];
      this.buffer = "";
      this.progress = 0;
    }

    update(dt) {
      this.timeLeft -= dt;
      this.flash = Math.max(0, this.flash - dt);
      this.progress += dt * this.speed * this.settings.speed;
      if (this.progress >= this.gateDistance) this.nextGate(false);
      if (this.timeLeft <= 0) this.finish(this.completed >= Math.ceil(this.goal * 0.65), this.t("relay.timeUp"));
    }

    handleKeyDown(event) {
      if (this.current.type === "combo") {
        const combo = canonicalCombo(event);
        if (!combo) return;
        if (event.ctrlKey || event.altKey || event.metaKey || event.key === "Tab") event.preventDefault();
        if (combo === this.current.answer) {
          this.addHit(26);
          this.nextGate(true);
        } else {
          this.nextGate(false);
        }
        return;
      }

      const key = printableKey(event);
      if (!key || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();
      const expected = this.current.answer[Array.from(this.buffer).length];
      if (compareChar(key, expected)) {
        this.buffer += expected;
        this.addHit(18);
        if (this.buffer === this.current.answer) this.nextGate(true);
      } else {
        this.nextGate(false);
      }
    }

    render(context) {
      drawStageBackground(context, "teal");
      context.save();

      drawRoundRect(context, 78, 188, W - 156, 92, 10);
      context.fillStyle = "rgba(255,253,248,0.16)";
      context.fill();
      context.strokeStyle = "rgba(255,253,248,0.35)";
      context.lineWidth = 4;
      context.stroke();

      const runnerX = 126 + this.progress * (W - 286);
      drawPlayer(context, runnerX, 273, this.completed % 4);

      const gateX = 126 + this.gateDistance * (W - 286);
      drawRoundRect(context, gateX - 8, 150, 16, 178, 6);
      context.fillStyle = this.flash ? "#e87861" : "#e7c66f";
      context.fill();
      drawKeycap(context, gateX - 90, 92, 180, 58, this.current.label, "#f6efe1");

      context.textAlign = "center";
      context.fillStyle = "rgba(255,253,248,0.9)";
      context.font = "900 26px Inter, sans-serif";
      context.fillText(this.t("relay.title"), W / 2, 48);
      context.font = "850 19px Inter, sans-serif";
      drawCenteredWrappedText(context, this.current.hint, W / 2, 356, W - 220, 24);
      context.fillText(`${this.t("relay.lives")} ${"■".repeat(Math.max(0, this.lives))}`, W / 2, 408);
      context.fillText(`${this.completed}/${this.goal}`, W / 2, H - 66);
      context.restore();
    }

    hud() {
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.gates"),
        meterValue: `${this.completed}/${this.goal}`,
        meterRatio: this.completed / this.goal,
        mission: `<strong>${this.current.label}</strong><br>${this.t("relay.mission")}`,
      };
    }
  }

  CQ.RelayRaceGame = RelayRaceGame;
})(window.CQ = window.CQ || {});
