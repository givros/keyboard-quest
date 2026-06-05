(function registerTowerDefenseGame(CQ) {
  const { compareChar, printableKey, randomOf, shuffle } = CQ.utils;
  const { drawKeycap, drawRoundRect, drawStageBackground } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  class TowerDefenseGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.timeLimit = this.settings.time + 12;
      this.timeLeft = this.timeLimit;
      this.lives = this.difficulty === "calme" ? 6 : this.difficulty === "rythme" ? 5 : 4;
      this.spawnTimer = 0;
      this.enemies = [];
      this.pool = shuffle(this.buildPool());
      this.destroyed = 0;
      this.goal = (this.difficulty === "calme" ? 14 : this.difficulty === "rythme" ? 22 : 32) + this.settings.tokens;
      this.buffer = "";
      this.flash = 0;
      this.lanes = [106, 178, 250, 322, 394];
    }

    buildPool() {
      const keys = this.content.keys || [];
      const extras = this.content.extraKeys || [];
      const symbols = this.symbolPool().map((item) => item.symbol);
      if (this.difficulty === "calme") return [...keys.slice(0, this.grade === "4e" ? 20 : 15), ...extras.slice(0, this.grade === "4e" ? 6 : 4), ...symbols];
      if (this.difficulty === "rythme") return [...keys.slice(0, 14), ...extras.slice(0, this.grade === "4e" ? 14 : 8), ...symbols];
      const pairs = ["@#", "#€", "?!", "[]", "{}", "\\|", "_-", "/:"].filter((pair) => Array.from(pair).every((char) => symbols.includes(char) || extras.includes(char)));
      return [...symbols, ...extras, ...pairs, ...keys.slice(0, this.grade === "4e" ? 10 : 6)].filter(Boolean);
    }

    nextLabel() {
      return randomOf(this.pool.length ? this.pool : ["a", "e", "@"]);
    }

    spawn() {
      const lane = Math.floor(Math.random() * this.lanes.length);
      const label = this.nextLabel();
      this.enemies.push({
        label,
        x: -50,
        y: this.lanes[lane],
        lane,
        speed: (62 + Math.random() * 42) * this.settings.speed,
      });
    }

    focusedEnemy() {
      return [...this.enemies].sort((a, b) => b.x - a.x)[0] || null;
    }

    update(dt) {
      this.timeLeft -= dt;
      this.spawnTimer -= dt;
      this.flash = Math.max(0, this.flash - dt);

      if (this.spawnTimer <= 0) {
        this.spawn();
        this.spawnTimer = Math.max(0.28, this.settings.spawn * (0.86 + Math.random() * 0.55));
      }

      this.enemies.forEach((enemy) => {
        enemy.x += enemy.speed * dt;
      });

      const before = this.enemies.length;
      this.enemies = this.enemies.filter((enemy) => enemy.x < W - 104);
      const leaked = before - this.enemies.length;
      if (leaked) {
        this.lives -= leaked;
        this.addMiss(leaked);
        this.buffer = "";
        this.flash = 0.22;
      }

      if (this.lives <= 0) this.finish(false, this.t("tower.lost"));
      if (this.destroyed >= this.goal) this.finish(true, this.t("tower.success"));
      if (this.timeLeft <= 0) this.finish(this.destroyed >= Math.ceil(this.goal * 0.65), this.t("tower.timeUp"));
    }

    handleKeyDown(event) {
      const enemy = this.focusedEnemy();
      if (!enemy) return;
      const key = printableKey(event);
      if (!key || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();

      const chars = Array.from(enemy.label.normalize("NFC"));
      const expected = chars[Array.from(this.buffer).length];
      if (compareChar(key, expected)) {
        this.buffer += expected;
        this.addHit(14 + enemy.x / 80);
        if (this.buffer === enemy.label) {
          this.enemies = this.enemies.filter((item) => item !== enemy);
          this.destroyed += 1;
          this.score += 18 + enemy.label.length * 12;
          this.buffer = "";
        }
      } else {
        this.addMiss();
        this.score = Math.max(0, this.score - 5);
        this.buffer = "";
        this.flash = 0.16;
      }
    }

    render(context) {
      drawStageBackground(context, "green");
      context.save();

      this.lanes.forEach((y) => {
        context.strokeStyle = "rgba(255,253,248,0.22)";
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(44, y);
        context.lineTo(W - 118, y);
        context.stroke();
      });

      drawRoundRect(context, W - 110, 78, 58, 358, 8);
      context.fillStyle = this.flash ? "#e87861" : "#e7c66f";
      context.fill();
      context.strokeStyle = "#18212b";
      context.lineWidth = 4;
      context.stroke();
      context.fillStyle = "#18212b";
      context.textAlign = "center";
      context.font = "900 19px Inter, sans-serif";
      context.fillText(this.t("tower.base"), W - 81, 262);

      const focused = this.focusedEnemy();
      this.enemies.forEach((enemy) => {
        const active = enemy === focused;
        drawKeycap(context, enemy.x, enemy.y - 26, 64 + enemy.label.length * 16, 52, enemy.label, active ? "#e7c66f" : "#f6efe1");
        if (active && this.buffer) {
          context.fillStyle = "#167c80";
          context.font = "900 16px Inter, sans-serif";
          context.fillText(this.buffer, enemy.x + 34, enemy.y + 42);
        }
      });

      context.fillStyle = "rgba(255,253,248,0.9)";
      context.textAlign = "left";
      context.font = "900 24px Inter, sans-serif";
      context.fillText(`${this.t("tower.lives")} ${"■".repeat(Math.max(0, this.lives))}`, 34, 44);
      context.textAlign = "center";
      context.font = "850 20px Inter, sans-serif";
      context.fillText(`${this.destroyed}/${this.goal}`, W / 2, H - 64);
      context.restore();
    }

    hud() {
      const focused = this.focusedEnemy();
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.defenses"),
        meterValue: `${this.destroyed}/${this.goal}`,
        meterRatio: this.destroyed / this.goal,
        mission: focused
          ? `<strong>${focused.label}</strong><br>${this.t("tower.mission")}`
          : `<strong>${this.t("tower.wait")}</strong><br>${this.t("tower.mission")}`,
      };
    }
  }

  CQ.TowerDefenseGame = TowerDefenseGame;
})(window.CQ = window.CQ || {});
