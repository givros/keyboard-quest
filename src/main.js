(function bootstrapClavierQuest(CQ) {
  const canvas = document.querySelector("#gameCanvas");
  const ctx = canvas.getContext("2d");
  const { clamp, formatPercent, loadJson, saveJson } = CQ.utils;

  const els = {
    home: document.querySelector("#homeScreen"),
    play: document.querySelector("#playScreen"),
    gameGrid: document.querySelector("#gameGrid"),
    gameTitle: document.querySelector("#gameTitle"),
    gameModeLabel: document.querySelector("#gameModeLabel"),
    backToHome: document.querySelector("#backToHome"),
    restartGame: document.querySelector("#restartGame"),
    playAgain: document.querySelector("#playAgain"),
    resultHome: document.querySelector("#resultHome"),
    resultPanel: document.querySelector("#resultPanel"),
    resultTitle: document.querySelector("#resultTitle"),
    resultText: document.querySelector("#resultText"),
    hudScore: document.querySelector("#hudScore"),
    hudCombo: document.querySelector("#hudCombo"),
    hudAccuracy: document.querySelector("#hudAccuracy"),
    hudMeterLabel: document.querySelector("#hudMeterLabel"),
    hudMeterValue: document.querySelector("#hudMeterValue"),
    hudMeterFill: document.querySelector("#hudMeterFill"),
    hudMission: document.querySelector("#hudMission"),
    bestScorePill: document.querySelector("#bestScorePill"),
    resetProgress: document.querySelector("#resetProgress"),
    soundToggle: document.querySelector("#soundToggle"),
    navHome: document.querySelector("[data-nav-home]"),
  };

  const gameFactories = {
    meteors: (options) => new CQ.MeteorGame(options),
    words: (options) => new CQ.WordGame(options),
    shortcuts: (options) => new CQ.ShortcutGame(options),
    maze: (options) => new CQ.MazeGame(options),
    symbols: (options) => new CQ.SymbolForgeGame(options),
    cipher: (options) => new CQ.CipherGame(options),
    formula: (options) => new CQ.FormulaFixGame(options),
    rpg: (options) => new CQ.KeyboardRpgGame(options),
  };

  const app = {
    grade: "5e",
    difficulty: "calme",
    language: CQ.i18n.language,
    gameId: null,
    game: null,
    lastTime: 0,
    frameId: 0,
    running: false,
    scores: loadJson(CQ.STORAGE_KEY, {}),
    lastResult: null,
  };

  function t(path, values = {}) {
    return CQ.i18n.t(path, values, app.language);
  }

  function scoreKey(gameId = app.gameId) {
    return `${gameId}:${app.grade}:${app.difficulty}`;
  }

  function bestScore(gameId = app.gameId) {
    return app.scores[scoreKey(gameId)] || 0;
  }

  function setBestScore(gameId, score) {
    const key = scoreKey(gameId);
    app.scores[key] = Math.max(app.scores[key] || 0, Math.round(score));
    saveJson(CQ.STORAGE_KEY, app.scores);
  }

  function gameDefinition(gameId) {
    const base = CQ.gameCards.find((game) => game.id === gameId);
    if (!base) return null;
    return {
      ...base,
      ...CQ.i18n.gameCard(gameId, app.language),
    };
  }

  function renderGameCards() {
    els.gameGrid.innerHTML = "";
    for (const base of CQ.gameCards) {
      const game = gameDefinition(base.id);
      const card = document.createElement("button");
      card.className = "game-card";
      card.type = "button";
      card.dataset.game = game.id;
      const best = bestScore(game.id);
      card.innerHTML = `
        <div class="card-art" aria-hidden="true">
          ${game.art.map((key) => `<span class="mini-key">${key}</span>`).join("")}
        </div>
        <h3>${game.title}</h3>
        <p>${game.summary}</p>
        <div class="card-footer">
          <span class="tag">${game.tag}</span>
          <span>${best ? t("score.record", { score: best }) : t("score.new")}</span>
        </div>
      `;
      card.addEventListener("click", () => startGame(game.id));
      els.gameGrid.appendChild(card);
    }
    updateBestPill();
  }

  function updateBestPill() {
    const values = Object.values(app.scores);
    const best = values.length ? Math.max(...values) : 0;
    els.bestScorePill.textContent = t("score.best", { score: best });
  }

  function setScreen(screen) {
    els.home.classList.toggle("screen-active", screen === "home");
    els.play.classList.toggle("screen-active", screen === "play");
  }

  function updatePlayHeader() {
    if (!app.gameId) {
      els.gameModeLabel.textContent = t("play.defaultMode");
      els.gameTitle.textContent = t("play.defaultTitle");
      return;
    }
    const definition = gameDefinition(app.gameId);
    const difficulty = t(`difficulties.${app.difficulty}`);
    els.gameTitle.textContent = definition.title;
    els.gameModeLabel.textContent = `${definition.mode} · ${app.grade} · ${difficulty}`;
  }

  function startGame(gameId) {
    const definition = gameDefinition(gameId);
    const createGame = gameFactories[gameId];
    if (!definition || !createGame) return;
    stopLoop();
    app.gameId = gameId;
    app.game = createGame({ grade: app.grade, difficulty: app.difficulty, language: app.language });
    app.running = true;
    app.lastResult = null;
    app.lastTime = performance.now();

    els.resultPanel.classList.add("hidden");
    updatePlayHeader();
    setScreen("play");
    canvas.focus();
    loop(app.lastTime);
  }

  function stopLoop() {
    if (app.frameId) cancelAnimationFrame(app.frameId);
    app.frameId = 0;
    app.running = false;
  }

  function loop(time) {
    if (!app.running || !app.game) return;
    const dt = Math.min(0.05, (time - app.lastTime) / 1000 || 0);
    app.lastTime = time;
    app.game.update(dt);
    app.game.render(ctx);
    updateHud(app.game.hud());

    if (app.game.done) {
      endGame();
      return;
    }
    app.frameId = requestAnimationFrame(loop);
  }

  function updateHud(hud) {
    els.hudScore.textContent = Math.round(hud.score);
    els.hudCombo.textContent = hud.combo;
    els.hudAccuracy.textContent = formatPercent(hud.accuracy);
    els.hudMeterLabel.textContent = hud.meterLabel;
    els.hudMeterValue.textContent = hud.meterValue;
    els.hudMeterFill.style.transform = `scaleX(${clamp(hud.meterRatio, 0, 1)})`;
    els.hudMission.innerHTML = hud.mission;
  }

  function renderResult() {
    if (!app.lastResult) return;
    const { gameId, score, accuracy, success, message } = app.lastResult;
    const definition = gameDefinition(gameId);
    els.resultTitle.textContent = success ? t("results.success") : t("results.finished");
    els.resultText.textContent = t("results.summary", {
      title: definition.title,
      score,
      accuracy: formatPercent(accuracy),
      message,
    });
  }

  function endGame() {
    stopLoop();
    const game = app.game;
    app.lastResult = {
      gameId: app.gameId,
      score: Math.round(game.score),
      accuracy: game.accuracy,
      success: game.success,
      message: game.message,
    };
    setBestScore(app.gameId, game.score);
    renderResult();
    els.resultPanel.classList.remove("hidden");
    renderGameCards();
  }

  function goHome() {
    stopLoop();
    setScreen("home");
    renderGameCards();
  }

  function applyLanguage() {
    CQ.i18n.setLanguage(app.language);
    document.title = t("meta.title");
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
      node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((node) => {
      node.setAttribute("title", t(node.dataset.i18nTitle));
    });
    document.querySelectorAll("[data-difficulty]").forEach((button) => {
      button.textContent = t(`difficulties.${button.dataset.difficulty}`);
    });
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.classList.toggle("active", button.dataset.language === app.language);
    });
    updateBestPill();
    updatePlayHeader();
    renderResult();
  }

  function bindSegmentedControls() {
    document.querySelectorAll("[data-grade]").forEach((button) => {
      button.addEventListener("click", () => {
        app.grade = button.dataset.grade;
        document.querySelectorAll("[data-grade]").forEach((item) => item.classList.toggle("active", item === button));
        renderGameCards();
      });
    });

    document.querySelectorAll("[data-difficulty]").forEach((button) => {
      button.addEventListener("click", () => {
        app.difficulty = button.dataset.difficulty;
        document.querySelectorAll("[data-difficulty]").forEach((item) => item.classList.toggle("active", item === button));
        renderGameCards();
      });
    });

    document.querySelectorAll("[data-language]").forEach((button) => {
      button.addEventListener("click", () => {
        const shouldRestartCurrentGame = app.running && app.gameId && els.play.classList.contains("screen-active");
        app.language = button.dataset.language;
        applyLanguage();
        renderGameCards();
        if (shouldRestartCurrentGame) startGame(app.gameId);
      });
    });
  }

  function bindGameInput() {
    canvas.addEventListener("keydown", (event) => {
      if (app.game && app.running) app.game.handleKeyDown(event);
    });

    document.addEventListener("keydown", (event) => {
      if (els.play.classList.contains("screen-active") && app.game && app.running && document.activeElement !== canvas) {
        canvas.focus();
        app.game.handleKeyDown(event);
      }
    });
  }

  function bindNavigation() {
    els.backToHome.addEventListener("click", goHome);
    els.resultHome.addEventListener("click", goHome);
    els.restartGame.addEventListener("click", () => startGame(app.gameId));
    els.playAgain.addEventListener("click", () => startGame(app.gameId));
    els.resetProgress.addEventListener("click", () => {
      app.scores = {};
      saveJson(CQ.STORAGE_KEY, app.scores);
      renderGameCards();
    });
    els.soundToggle.addEventListener("click", () => {
      CQ.audio.enabled = !CQ.audio.enabled;
      els.soundToggle.setAttribute("aria-pressed", String(CQ.audio.enabled));
      els.soundToggle.textContent = CQ.audio.enabled ? "♪" : "×";
    });
    els.navHome.addEventListener("click", (event) => {
      event.preventDefault();
      goHome();
    });
  }

  bindSegmentedControls();
  bindGameInput();
  bindNavigation();
  applyLanguage();
  renderGameCards();
})(window.CQ = window.CQ || {});
