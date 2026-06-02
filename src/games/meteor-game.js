(function registerMeteorGame(CQ) {
  const { compareChar, printableKey, randomOf } = CQ.utils;
  const { drawKeycap, drawStageBackground } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class MeteorGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.timeLimit = this.settings.time;
      this.timeLeft = this.timeLimit;
      this.lives = this.settings.lives;
      this.spawnTimer = 0;
      this.items = [];
      this.flash = 0;
      const extraCount = (this.difficulty === "defi" ? 16 : this.difficulty === "rythme" ? 12 : 8) + this.settings.meteorExtraPool;
      this.pool = [
        ...this.content.keys,
        ...this.content.extraKeys.slice(0, extraCount),
      ];
    }

    update(dt) {
      this.timeLeft -= dt;
      this.spawnTimer -= dt;
      this.flash = Math.max(0, this.flash - dt);
      if (this.spawnTimer <= 0) {
        this.spawn();
        this.spawnTimer = this.settings.spawn * (0.75 + Math.random() * 0.45);
      }

      for (const item of this.items) {
        item.y += item.speed * dt;
        item.spin += dt * item.spinSpeed;
      }

      const before = this.items.length;
      this.items = this.items.filter((item) => item.y < H - 66);
      const lost = before - this.items.length;
      if (lost) {
        this.lives -= lost;
        this.addMiss(lost);
        this.flash = 0.2;
      }

      if (this.lives <= 0) this.finish(false, this.t("meteor.lost"));
      if (this.timeLeft <= 0) this.finish(true, this.t("meteor.success"));
    }

    spawn() {
      const label = randomOf(this.pool);
      const columns = 10;
      const column = Math.floor(Math.random() * columns);
      const x = 70 + column * ((W - 140) / (columns - 1)) + (Math.random() - 0.5) * 26;
      const color = randomOf(["#f0c15c", "#93c7a8", "#e87861", "#c1a3d9", "#f7f3ea"]);
      this.items.push({
        label,
        x,
        y: -50,
        w: 58 + Math.min(label.length, 3) * 12,
        h: 52,
        speed: (92 + Math.random() * 70) * this.settings.speed,
        spin: 0,
        spinSpeed: (Math.random() - 0.5) * 0.9,
        color,
      });
    }

    handleKeyDown(event) {
      const key = printableKey(event);
      if (!key) return;
      event.preventDefault();
      const index = this.items.findIndex((item) => compareChar(key, item.label));
      if (index >= 0) {
        const [item] = this.items.splice(index, 1);
        this.addHit(12 + (H - item.y) / 30);
      } else {
        this.addMiss();
        this.flash = 0.12;
      }
    }

    render(context) {
      drawStageBackground(context, "teal");
      context.save();
      context.strokeStyle = this.flash ? "#e87861" : "#f0c15c";
      context.lineWidth = this.flash ? 8 : 4;
      context.beginPath();
      context.moveTo(34, H - 58);
      context.lineTo(W - 34, H - 58);
      context.stroke();
      context.fillStyle = "rgba(255,253,248,0.8)";
      context.font = "800 18px Inter, sans-serif";
      context.textAlign = "center";
      context.fillText(this.t("meteor.line"), W / 2, H - 28);

      for (const item of this.items) {
        context.translate(item.x, item.y);
        context.rotate(item.spin);
        drawKeycap(context, -item.w / 2, -item.h / 2, item.w, item.h, item.label, item.color);
        context.setTransform(1, 0, 0, 1, 0, 0);
      }

      context.fillStyle = "rgba(255,253,248,0.92)";
      context.font = "900 26px Inter, sans-serif";
      context.textAlign = "left";
      context.fillText(`${this.t("meteor.lives")} ${"■".repeat(Math.max(0, this.lives))}`, 34, 44);
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
        mission: `<strong>${this.t("meteor.livesCount", { count: this.lives })}</strong> <br> ${this.t("meteor.mission")}`,
      };
    }
  }

  CQ.MeteorGame = MeteorGame;
})(window.CQ = window.CQ || {});
