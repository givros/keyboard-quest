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
        [15, 5],
        [5, 7],
        [11, 7],
        [2, 9],
        [13, 9],
      ];
      const pool = shuffle([...this.content.keys, ...this.content.extraKeys]).slice(0, this.settings.tokens);
      return spots.slice(0, this.settings.tokens).map(([x, y], index) => ({
        x,
        y,
        label: pool[index],
        done: false,
      }));
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

      const key = printableKey(event);
      const token = this.tokenAtPlayer();
      if (token && key) {
        event.preventDefault();
        if (compareChar(key, token.label)) {
          token.done = true;
          this.addHit(28);
        } else {
          this.addMiss();
          this.bump = 0.18;
        }
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
        this.finish(allDone, allDone ? this.t("maze.exitSuccess") : this.t("maze.missingBeacons"));
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
          ? `<strong>${this.t("maze.beacon", { label: token.label })}</strong><br>${this.t("maze.activate", { seconds: Math.ceil(Math.max(0, this.timeLeft)) })}`
          : `<strong>${this.t("maze.remaining", { count: left })}</strong><br>${this.t("maze.move", { seconds: Math.ceil(Math.max(0, this.timeLeft)) })}`,
      };
    }
  }

  CQ.MazeGame = MazeGame;
})(window.CQ = window.CQ || {});
