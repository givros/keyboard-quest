(function registerMazeGame(CQ) {
  const { compareChar, printableKey, shuffle } = CQ.utils;
  const { drawKeycap, drawStageBackground } = CQ.drawing;
  const { width: W } = CQ.stage;

  class MazeGame extends CQ.SessionGame {
    constructor(options) {
      super(options);
      this.timeLimit = this.settings.time + 20;
      this.timeLeft = this.timeLimit;
      this.map = [
        "##################",
        "#S...#...........#",
        "#.##.#.#####.###.#",
        "#....#.....#...#.#",
        "####.#####.###.#.#",
        "#....#.....#...#.#",
        "#.####.#####.###.#",
        "#......#.....#...#",
        "#.######.###.#.#.#",
        "#........#.....#E#",
        "#.##############.#",
        "##################",
      ].map((row) => row.split(""));
      this.cols = this.map[0].length;
      this.rows = this.map.length;
      this.tile = 36;
      this.offsetX = (W - this.cols * this.tile) / 2;
      this.offsetY = 50;
      this.player = { x: 1, y: 1 };
      this.exit = { x: 16, y: 9 };
      this.tokens = this.createTokens();
      this.bump = 0;
    }

    createTokens() {
      const spots = [
        [3, 3],
        [8, 3],
        [12, 3],
        [2, 5],
        [9, 5],
        [14, 5],
        [5, 7],
        [11, 7],
        [2, 9],
        [13, 9],
        [4, 1],
        [6, 7],
        [1, 10],
        [8, 8],
        [11, 1],
        [16, 6],
        [14, 7],
        [16, 8],
      ];
      const validSpots = this.validTokenSpots(spots);
      const pool = shuffle(this.tokenPool()).slice(0, this.settings.tokens);
      return shuffle(validSpots).slice(0, this.settings.tokens).map(([x, y], index) => ({
        x,
        y,
        label: pool[index],
        done: false,
      }));
    }

    distanceFromStart() {
      const start = { x: 1, y: 1 };
      const queue = [start];
      const distances = new Map([[`${start.x},${start.y}`, 0]]);

      for (let index = 0; index < queue.length; index += 1) {
        const cell = queue[index];
        const distance = distances.get(`${cell.x},${cell.y}`);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const x = cell.x + dx;
          const y = cell.y + dy;
          const key = `${x},${y}`;
          if (this.map[y]?.[x] === "#" || distances.has(key)) return;
          distances.set(key, distance + 1);
          queue.push({ x, y });
        });
      }

      return distances;
    }

    validTokenSpots(spots) {
      const distances = this.distanceFromStart();
      const exitDistance = distances.get(`${this.exit.x},${this.exit.y}`) ?? Number.POSITIVE_INFINITY;
      return spots.filter(([x, y]) => {
        const distance = distances.get(`${x},${y}`);
        return this.map[y]?.[x] !== "#" && Number.isFinite(distance) && distance > 0 && distance < exitDistance;
      });
    }

    tokenPool() {
      const keys = this.content.keys || [];
      const extras = this.content.extraKeys || [];
      const symbols = this.symbolPool().map((item) => item.symbol);
      let pool = keys;

      if (this.difficulty === "calme") {
        const keyCount = this.grade === "4e" ? keys.length : Math.ceil(keys.length * 0.75);
        pool = keys.slice(0, keyCount);
      } else if (this.difficulty === "rythme") {
        const extraCount = this.grade === "4e" ? 12 : 7;
        pool = [...extras.slice(0, extraCount), ...keys];
      } else {
        pool = [...symbols, ...extras, ...keys.slice(0, this.grade === "4e" ? 8 : 5)];
      }

      const movementKeys = new Set(["z", "q", "s", "d"]);
      const clean = (items) => [...new Set(items)].filter((item) => item && !movementKeys.has(String(item).toLocaleLowerCase("fr-FR")));
      const unique = clean(pool);
      return unique.length >= this.settings.tokens ? unique : clean([...unique, ...keys, ...extras, ...symbols]);
    }

    update(dt) {
      this.timeLeft -= dt;
      this.bump = Math.max(0, this.bump - dt);
      if (this.timeLeft <= 0) this.finish(false, this.t("maze.timeUp"));
    }

    tokenAtPlayer() {
      return this.tokens.find((token) => !token.done && token.x === this.player.x && token.y === this.player.y);
    }

    handleKeyDown(event) {
      const key = printableKey(event);
      const token = this.tokenAtPlayer();
      if (token && key && compareChar(key, token.label)) {
        event.preventDefault();
        token.done = true;
        this.addHit(28);
        return;
      }

      const moves = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        z: [0, -1],
        Z: [0, -1],
        s: [0, 1],
        S: [0, 1],
        q: [-1, 0],
        Q: [-1, 0],
        d: [1, 0],
        D: [1, 0],
      };
      if (moves[event.key]) {
        event.preventDefault();
        this.move(...moves[event.key]);
        return;
      }

      if (token && key) {
        event.preventDefault();
        this.addMiss();
        this.bump = 0.18;
      }
    }

    move(dx, dy) {
      const nx = this.player.x + dx;
      const ny = this.player.y + dy;
      if (this.map[ny]?.[nx] === "#") {
        this.addMiss();
        this.bump = 0.16;
        return;
      }
      this.player.x = nx;
      this.player.y = ny;
      this.score += 1;
      if (nx === this.exit.x && ny === this.exit.y) {
        const allDone = this.tokens.every((token) => token.done);
        if (allDone) {
          this.finish(true, this.t("maze.exitSuccess"));
        } else {
          this.player.x -= dx;
          this.player.y -= dy;
          this.addMiss();
          this.bump = 0.18;
        }
      }
    }

    render(context) {
      drawStageBackground(context, "green");
      context.save();
      context.translate(Math.sin(this.bump * 80) * 8, 0);

      for (let y = 0; y < this.rows; y += 1) {
        for (let x = 0; x < this.cols; x += 1) {
          const px = this.offsetX + x * this.tile;
          const py = this.offsetY + y * this.tile;
          if (this.map[y][x] === "#") {
            context.fillStyle = "#22333a";
            context.fillRect(px, py, this.tile, this.tile);
            context.fillStyle = "rgba(255,253,248,0.06)";
            context.fillRect(px + 3, py + 3, this.tile - 6, this.tile - 6);
          } else {
            context.fillStyle = "#f1e4c7";
            context.fillRect(px, py, this.tile, this.tile);
            context.strokeStyle = "rgba(24,33,43,0.08)";
            context.strokeRect(px, py, this.tile, this.tile);
          }
        }
      }

      context.fillStyle = this.tokens.every((token) => token.done) ? "#8fc7a3" : "#d8d0c0";
      context.fillRect(this.offsetX + this.exit.x * this.tile + 5, this.offsetY + this.exit.y * this.tile + 5, this.tile - 10, this.tile - 10);
      context.fillStyle = "#18212b";
      context.font = "900 16px Inter, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(this.t("maze.exitLabel"), this.offsetX + this.exit.x * this.tile + this.tile / 2, this.offsetY + this.exit.y * this.tile + this.tile / 2);

      for (const token of this.tokens) {
        if (token.done) continue;
        drawKeycap(
          context,
          this.offsetX + token.x * this.tile + 3,
          this.offsetY + token.y * this.tile + 3,
          this.tile - 6,
          this.tile - 6,
          token.label,
          "#e7c66f",
        );
      }

      const px = this.offsetX + this.player.x * this.tile + this.tile / 2;
      const py = this.offsetY + this.player.y * this.tile + this.tile / 2;
      context.beginPath();
      context.fillStyle = "#d95842";
      context.arc(px, py, 14, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#fffdf8";
      context.lineWidth = 4;
      context.stroke();
      context.fillStyle = "#fffdf8";
      context.font = "900 15px Inter, sans-serif";
      context.fillText("K", px, py + 1);
      context.restore();
    }

    hud() {
      const left = this.tokens.filter((token) => !token.done).length;
      const token = this.tokenAtPlayer();
      return {
        score: this.score,
        combo: this.combo,
        accuracy: this.accuracy,
        meterLabel: this.t("meters.beacons"),
        meterValue: `${this.tokens.length - left}/${this.tokens.length}`,
        meterRatio: (this.tokens.length - left) / this.tokens.length,
        mission: token
          ? `<strong>${this.t("maze.beacon", { label: token.label })}</strong> <br> ${this.t("maze.activate", { seconds: Math.ceil(Math.max(0, this.timeLeft)) })}`
          : `<strong>${this.t("maze.remaining", { count: left })}</strong> <br> ${this.t("maze.move", { seconds: Math.ceil(Math.max(0, this.timeLeft)) })}`,
      };
    }
  }

  CQ.MazeGame = MazeGame;
})(window.CQ = window.CQ || {});
