(function registerKeyboardRpgGame(CQ) {
  const { canonicalCombo, compareChar, printableKey } = CQ.utils;
  const { drawKeycap, drawRoundRect, drawStageBackground, wrapText } = CQ.drawing;
  const { width: W, height: H } = CQ.stage;

  const TILE = 32;
  const MAP_W = 42;
  const MAP_H = 28;
  const TERRAIN = {
    grass: 0,
    path: 1,
    water: 2,
    tree: 3,
    flower: 4,
    school: 5,
    shop: 6,
    tower: 7,
    library: 8,
    door: 9,
    quest: 10,
    done: 11,
    sign: 12,
    bridge: 13,
    hedge: 14,
    portal: 15,
  };
  const PLAYER_ROWS = {
    down: 0,
    left: 1,
    right: 2,
    up: 3,
  };
  const RPG_SHEETS = {
    terrain: loadSheet("assets/rpg/terrain/sheet-transparent.png", 4, 4),
    player: loadSheet("assets/rpg/player/sheet-transparent.png", 4, 4),
    npcs: loadSheet("assets/rpg/npcs/sheet-transparent.png", 4, 4),
  };

  function loadSheet(src, cols, rows) {
    const image = new Image();
    image.src = src;
    return { image, cols, rows };
  }

  function sheetReady(sheet) {
    return sheet.image.complete && sheet.image.naturalWidth > 0;
  }

  function drawSheetFrame(context, sheet, index, x, y, width, height, anchor = "topleft") {
    if (!sheetReady(sheet)) return false;
    const sourceWidth = sheet.image.naturalWidth / sheet.cols;
    const sourceHeight = sheet.image.naturalHeight / sheet.rows;
    const sourceX = (index % sheet.cols) * sourceWidth;
    const sourceY = Math.floor(index / sheet.cols) * sourceHeight;
    let dx = x;
    let dy = y;
    if (anchor === "center") {
      dx -= width / 2;
      dy -= height / 2;
    } else if (anchor === "feet") {
      dx -= width / 2;
      dy -= height;
    }
    context.drawImage(sheet.image, sourceX, sourceY, sourceWidth, sourceHeight, dx, dy, width, height);
    return true;
  }

  class KeyboardRpgGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      const questTimeBonus = {
        calme: 135,
        rythme: 95,
        defi: 60,
      };
      this.timeLimit = this.settings.time + (questTimeBonus[this.difficulty] || 110);
      this.timeLeft = this.timeLimit;
      this.player = { x: 8, y: 6, facing: "down", step: 0 };
      this.blocked = new Set();
      this.buildings = [];
      this.terrain = this.buildTerrain();
      this.quests = this.selectQuests(CQ.rpgQuests[this.language] || CQ.rpgQuests.fr);
      this.activeQuest = null;
      this.buffer = "";
      this.feedback = "";
      this.feedbackTimer = 0;
      this.completed = 0;
    }

    selectQuests(quests) {
      const plans = {
        "5e": {
          calme: ["mail", "tag", "euro", "accents", "shortcut", "final"],
          rythme: ["mail", "tag", "euro", "braces", "brackets", "accents", "shortcut", "final"],
          defi: ["mail", "tag", "euro", "braces", "brackets", "bar", "slash", "accents", "shortcut", "final"],
        },
        "4e": {
          calme: ["mail", "tag", "euro", "braces", "brackets", "accents", "shortcut"],
          rythme: ["mail", "tag", "euro", "braces", "brackets", "bar", "slash", "accents", "shortcut"],
          defi: ["mail", "tag", "euro", "braces", "brackets", "bar", "slash", "accents", "shortcut", "final"],
        },
      };
      const ids = plans[this.grade]?.[this.difficulty] || plans["5e"].calme;
      const byId = new Map(quests.map((quest) => [quest.id, quest]));
      return ids.map((id) => byId.get(id)).filter(Boolean).map((quest) => ({ ...quest, done: false }));
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
      if (["tree", "water", "hedge"].includes(type)) this.blocked.add(`${x},${y}`);
    }

    addBuilding(terrain, x, y, width, height, type) {
      for (let yy = y; yy < y + height; yy += 1) {
        for (let xx = x; xx < x + width; xx += 1) {
          this.setTile(terrain, xx, yy, "grass");
          this.blocked.add(`${xx},${yy}`);
        }
      }
      const doorX = x + Math.floor(width / 2);
      const doorY = y + height - 1;
      terrain[doorY][doorX] = "door";
      this.blocked.delete(`${doorX},${doorY}`);
      this.buildings.push({ x, y, width, height, type });
    }

    update(dt) {
      this.timeLeft -= dt;
      this.feedbackTimer = Math.max(0, this.feedbackTimer - dt);
      if (!this.feedbackTimer) this.feedback = "";
      if (this.timeLeft <= 0) this.finish(this.completed >= this.timeoutQuestTarget(), this.t("rpg.timeUp"));
    }

    timeoutQuestTarget() {
      return this.quests.length;
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
      this.drawBuildings(context);
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
      const base = type === "path" || type === "door" ? TERRAIN.path : type === "water" ? TERRAIN.water : TERRAIN.grass;
      drawSheetFrame(context, RPG_SHEETS.terrain, base, px, py, TILE, TILE);
      if (type === "tree") {
        drawSheetFrame(context, RPG_SHEETS.terrain, TERRAIN.tree, px + TILE / 2, py + TILE + 5, 46, 52, "feet");
      } else if (type === "flower") {
        drawSheetFrame(context, RPG_SHEETS.terrain, TERRAIN.flower, px, py, TILE, TILE);
      } else if (type === "door") {
        drawSheetFrame(context, RPG_SHEETS.terrain, TERRAIN.door, px + TILE / 2, py + TILE + 7, 44, 52, "feet");
      }
    }

    drawBuildings(context) {
      const sorted = [...this.buildings].sort((a, b) => a.y + a.height - (b.y + b.height));
      for (const building of sorted) {
        const px = building.x * TILE;
        const py = building.y * TILE - 18;
        const frame = TERRAIN[building.type] ?? TERRAIN.school;
        drawSheetFrame(context, RPG_SHEETS.terrain, frame, px, py, building.width * TILE, building.height * TILE + 26);
      }
    }

    drawQuests(context) {
      this.quests.forEach((quest, index) => {
        const px = quest.x * TILE + TILE / 2;
        const py = quest.y * TILE + TILE / 2;
        drawSheetFrame(context, RPG_SHEETS.npcs, index % 16, px, py + 18, 48, 58, "feet");
        drawSheetFrame(context, RPG_SHEETS.terrain, quest.done ? TERRAIN.done : TERRAIN.quest, px + 16, py - 20, 28, 28, "center");
      });
    }

    drawPlayer(context) {
      const px = this.player.x * TILE + TILE / 2;
      const py = this.player.y * TILE + TILE / 2;
      const row = PLAYER_ROWS[this.player.facing] || PLAYER_ROWS.down;
      const frame = row * 4 + this.player.step;
      drawSheetFrame(context, RPG_SHEETS.player, frame, px, py + 24, 46, 58, "feet");
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
          : `<strong>${this.t("rpg.questDone", { count: this.completed, target: this.quests.length })}</strong> <br> ${this.t("rpg.moveHint")} ${this.t("rpg.interactHint")}`,
      };
    }
  }

  CQ.KeyboardRpgGame = KeyboardRpgGame;
})(window.CQ = window.CQ || {});
