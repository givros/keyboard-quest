(function registerKeyboardRpgGame(CQ) {
  const { canonicalCombo, compareChar, printableKey } = CQ.utils;
  const { drawKeycap, drawRoundRect, drawStageBackground, wrapText } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  const TILE = 32;
  const MAP_W = 42;
  const MAP_H = 28;

  class KeyboardRpgGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.timeLimit = this.settings.time + 135;
      this.timeLeft = this.timeLimit;
      this.player = { x: 8, y: 6, facing: "down", step: 0 };
      this.blocked = new Set();
      this.terrain = this.buildTerrain();
      this.quests = (CQ.rpgQuests[this.language] || CQ.rpgQuests.fr).map((quest) => ({ ...quest, done: false }));
      this.activeQuest = null;
      this.buffer = "";
      this.feedback = "";
      this.feedbackTimer = 0;
      this.completed = 0;
    }

    buildTerrain() {
      const terrain = Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => "grass"));

      for (let y = 0; y < MAP_H; y += 1) {
        for (let x = 0; x < MAP_W; x += 1) {
          if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) this.setTile(terrain, x, y, "tree");
          if ((x === 20 || x === 21) && y > 2 && y < MAP_H - 3) this.setTile(terrain, x, y, "path");
          if ((y === 13 || y === 14) && x > 2 && x < MAP_W - 3) this.setTile(terrain, x, y, "path");
          if (x > 2 && x < 39 && y > 22 && y < 25) this.setTile(terrain, x, y, "water");
        }
      }

      this.addBuilding(terrain, 5, 2, 6, 3, "school");
      this.addBuilding(terrain, 24, 3, 7, 4, "shop");
      this.addBuilding(terrain, 29, 18, 7, 4, "tower");
      this.addBuilding(terrain, 10, 17, 6, 4, "library");

      for (let x = 4; x < 38; x += 5) this.setTile(terrain, x, 9, "flower");
      for (let y = 4; y < 22; y += 4) this.setTile(terrain, 37, y, "tree");
      return terrain;
    }

    setTile(terrain, x, y, type) {
      terrain[y][x] = type;
      if (["tree", "water", "school", "shop", "tower", "library"].includes(type)) this.blocked.add(`${x},${y}`);
    }

    addBuilding(terrain, x, y, width, height, type) {
      for (let yy = y; yy < y + height; yy += 1) {
        for (let xx = x; xx < x + width; xx += 1) this.setTile(terrain, xx, yy, type);
      }
      const doorX = x + Math.floor(width / 2);
      const doorY = y + height - 1;
      terrain[doorY][doorX] = "door";
      this.blocked.delete(`${doorX},${doorY}`);
    }

    update(dt) {
      this.timeLeft -= dt;
      this.feedbackTimer = Math.max(0, this.feedbackTimer - dt);
      if (!this.feedbackTimer) this.feedback = "";
      if (this.timeLeft <= 0) this.finish(this.completed >= 6, this.t("rpg.timeUp"));
    }

    questAt(x, y) {
      return this.quests.find((quest) => Math.abs(quest.x - x) + Math.abs(quest.y - y) <= 1);
    }

    nearbyQuest() {
      return this.questAt(this.player.x, this.player.y);
    }

    handleKeyDown(event) {
      if (this.activeQuest) {
        this.handleQuestInput(event);
        return;
      }

      const moves = {
        ArrowUp: [0, -1, "up"],
        ArrowDown: [0, 1, "down"],
        ArrowLeft: [-1, 0, "left"],
        ArrowRight: [1, 0, "right"],
        z: [0, -1, "up"],
        Z: [0, -1, "up"],
        s: [0, 1, "down"],
        S: [0, 1, "down"],
        q: [-1, 0, "left"],
        Q: [-1, 0, "left"],
        d: [1, 0, "right"],
        D: [1, 0, "right"],
      };
      if (moves[event.key]) {
        event.preventDefault();
        this.move(...moves[event.key]);
        return;
      }
      if (event.key === "Enter" || event.key === "e" || event.key === "E") {
        event.preventDefault();
        this.openNearbyQuest();
      }
    }

    move(dx, dy, facing) {
      this.player.facing = facing;
      const nx = this.player.x + dx;
      const ny = this.player.y + dy;
      if (nx < 1 || ny < 1 || nx >= MAP_W - 1 || ny >= MAP_H - 1 || this.blocked.has(`${nx},${ny}`)) {
        this.addMiss();
        return;
      }
      this.player.x = nx;
      this.player.y = ny;
      this.player.step = (this.player.step + 1) % 4;
      this.score += 1;
    }

    openNearbyQuest() {
      const quest = this.nearbyQuest();
      if (!quest) {
        this.feedback = this.t("rpg.noQuest");
        this.feedbackTimer = 1.2;
        return;
      }
      this.activeQuest = quest;
      this.buffer = "";
      this.feedback = quest.done ? this.t("rpg.alreadyDone") : "";
      this.feedbackTimer = quest.done ? 1.2 : 0;
    }

    handleQuestInput(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.activeQuest = null;
        this.buffer = "";
        return;
      }
      if (this.activeQuest.done) {
        if (event.key === "Enter") {
          event.preventDefault();
          this.activeQuest = null;
        }
        return;
      }

      if (this.activeQuest.type === "combo") {
        const combo = canonicalCombo(event);
        if (!combo) return;
        if (event.ctrlKey || event.altKey || event.metaKey) event.preventDefault();
        this.buffer = combo;
        if (combo === this.activeQuest.answer) this.completeQuest();
        else {
          this.addMiss();
          this.feedback = combo;
          this.feedbackTimer = 0.9;
        }
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        this.buffer = this.buffer.slice(0, -1);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (this.buffer === this.activeQuest.answer) this.completeQuest();
        else {
          this.addMiss();
          this.feedback = this.buffer || "…";
          this.feedbackTimer = 0.9;
        }
        return;
      }
      const key = printableKey(event);
      if (!key || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();
      const expected = this.activeQuest.answer[this.buffer.length];
      if (compareChar(key, expected)) {
        this.buffer += expected;
        this.addHit(8);
        if (this.buffer === this.activeQuest.answer) this.completeQuest();
      } else {
        this.addMiss();
        this.feedback = key;
        this.feedbackTimer = 0.7;
      }
    }

    completeQuest() {
      this.activeQuest.done = true;
      this.completed += 1;
      this.score += 120 + this.combo * 3;
      this.feedback = this.t("rpg.completed");
      this.feedbackTimer = 1.2;
      this.buffer = "";
      if (this.completed >= this.quests.length) this.finish(true, this.t("rpg.success"));
    }

    camera() {
      const worldW = MAP_W * TILE;
      const worldH = MAP_H * TILE;
      return {
        x: Math.max(0, Math.min(this.player.x * TILE - W / 2, worldW - W)),
        y: Math.max(0, Math.min(this.player.y * TILE - H / 2, worldH - H)),
      };
    }

    render(context) {
      drawStageBackground(context, "green");
      const cam = this.camera();
      context.save();
      context.translate(-cam.x, -cam.y);
      this.drawMap(context);
      this.drawQuests(context);
      this.drawPlayer(context);
      context.restore();
      this.drawOverlay(context);
    }

    drawMap(context) {
      for (let y = 0; y < MAP_H; y += 1) {
        for (let x = 0; x < MAP_W; x += 1) {
          this.drawTile(context, x, y, this.terrain[y][x]);
        }
      }
    }

    drawTile(context, x, y, type) {
      const px = x * TILE;
      const py = y * TILE;
      const colors = {
        grass: "#7fb46f",
        path: "#dfc782",
        water: "#4d91b8",
        tree: "#295b3b",
        flower: "#8fc7a3",
        school: "#8d6b58",
        shop: "#ba7f52",
        tower: "#756391",
        library: "#6c8365",
        door: "#d6b15f",
      };
      context.fillStyle = colors[type] || colors.grass;
      context.fillRect(px, py, TILE, TILE);
      context.strokeStyle = "rgba(24,33,43,0.08)";
      context.strokeRect(px, py, TILE, TILE);
      if (type === "tree") {
        context.fillStyle = "#1e4230";
        context.fillRect(px + 7, py + 7, 18, 18);
      } else if (["school", "shop", "tower", "library"].includes(type)) {
        context.fillStyle = "rgba(255,253,248,0.18)";
        context.fillRect(px + 4, py + 5, 24, 9);
      } else if (type === "flower") {
        context.fillStyle = "#e87861";
        context.fillRect(px + 12, py + 12, 8, 8);
      }
    }

    drawQuests(context) {
      for (const quest of this.quests) {
        const px = quest.x * TILE + TILE / 2;
        const py = quest.y * TILE + TILE / 2;
        context.save();
        context.translate(px, py);
        context.fillStyle = quest.done ? "#8fc7a3" : "#e7c66f";
        context.strokeStyle = "#18212b";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(0, 0, 14, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.fillStyle = "#18212b";
        context.font = quest.icon.length > 2 ? "900 10px Inter, sans-serif" : "900 15px Inter, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(quest.done ? "✓" : quest.icon, 0, 1);
        context.restore();
      }
    }

    drawPlayer(context) {
      const px = this.player.x * TILE + TILE / 2;
      const py = this.player.y * TILE + TILE / 2;
      context.save();
      context.translate(px, py);
      context.fillStyle = "rgba(24,33,43,0.28)";
      context.beginPath();
      context.ellipse(0, 13, 12, 5, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#d95842";
      context.fillRect(-9, -6, 18, 18);
      context.fillStyle = "#f7d8a8";
      context.fillRect(-7, -20, 14, 14);
      context.fillStyle = "#26333f";
      context.fillRect(-9, -22, 18, 5);
      context.fillStyle = "#fffdf8";
      context.fillRect(-5, -15, 3, 3);
      context.fillRect(2, -15, 3, 3);
      context.fillStyle = "#18212b";
      context.fillRect(-8, 12, 6, 8 + (this.player.step % 2));
      context.fillRect(2, 12, 6, 8 + ((this.player.step + 1) % 2));
      context.restore();
    }

    drawOverlay(context) {
      const quest = this.nearbyQuest();
      if (!this.activeQuest && quest) {
        this.drawChip(context, this.t("rpg.nearby", { name: quest.npc }), 28, 24);
      } else if (!this.activeQuest && this.feedback) {
        this.drawChip(context, this.feedback, 28, 24);
      }
      if (this.activeQuest) this.drawQuestPanel(context);
    }

    drawChip(context, text, x, y) {
      context.save();
      context.font = "850 18px Inter, sans-serif";
      const width = Math.min(520, context.measureText(text).width + 34);
      drawRoundRect(context, x, y, width, 42, 8);
      context.fillStyle = "rgba(255,253,248,0.92)";
      context.fill();
      context.strokeStyle = "rgba(24,33,43,0.18)";
      context.stroke();
      context.fillStyle = "#18212b";
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(text, x + 17, y + 21);
      context.restore();
    }

    drawQuestPanel(context) {
      const quest = this.activeQuest;
      context.save();
      drawRoundRect(context, 110, 86, W - 220, 330, 10);
      context.fillStyle = "rgba(255,253,248,0.96)";
      context.fill();
      context.strokeStyle = quest.done ? "#8fc7a3" : "#18212b";
      context.lineWidth = 4;
      context.stroke();

      context.fillStyle = "#65717e";
      context.font = "900 18px Inter, sans-serif";
      context.textAlign = "left";
      context.fillText(quest.npc, 144, 130);
      context.fillStyle = "#18212b";
      context.font = "900 32px Inter, sans-serif";
      context.fillText(quest.title, 144, 174);
      context.font = "800 20px Inter, sans-serif";
      wrapText(context, quest.prompt, 144, 218, W - 288, 30);

      const label = quest.type === "combo" ? this.t("rpg.comboAnswer") : this.t("rpg.answer");
      context.fillStyle = "#65717e";
      context.font = "850 17px Inter, sans-serif";
      context.fillText(label, 144, 300);
      drawKeycap(context, 144, 316, 330, 58, quest.done ? "✓" : this.buffer || "…", quest.done ? "#8fc7a3" : "#f6efe1");
      context.fillStyle = this.feedbackTimer ? "#d95842" : "#65717e";
      context.font = "850 17px Inter, sans-serif";
      context.fillText(this.feedback || this.t("rpg.enterValidate"), 500, 351);
      context.restore();
    }

    hud() {
      const nearby = this.nearbyQuest();
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.quests"),
        meterValue: `${this.completed}/${this.quests.length}`,
        meterRatio: this.completed / this.quests.length,
        mission: nearby
          ? `<strong>${this.t("rpg.nearby", { name: nearby.npc })}</strong> <br> ${nearby.done ? this.t("rpg.alreadyDone") : nearby.title}`
          : `<strong>${this.t("rpg.questDone", { count: this.completed })}</strong> <br> ${this.t("rpg.moveHint")} ${this.t("rpg.interactHint")}`,
      };
    }
  }

  CQ.KeyboardRpgGame = KeyboardRpgGame;
})(window.CQ = window.CQ || {});
