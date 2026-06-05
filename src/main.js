(function bootstrapClavierQuest(CQ) {
  const canvas = document.querySelector("#gameCanvas");
  const ctx = canvas.getContext("2d");
  const { clamp, formatPercent, loadJson, saveJson } = CQ.utils;

  const els = {
    landing: document.querySelector("#landingScreen"),
    home: document.querySelector("#homeScreen"),
    play: document.querySelector("#playScreen"),
    scores: document.querySelector("#scoreScreen"),
    gameGrid: document.querySelector("#gameGrid"),
    playerForm: document.querySelector("#playerForm"),
    playerName: document.querySelector("#playerName"),
    clearScoreRoom: document.querySelector("#clearScoreRoom"),
    landingScoreStatus: document.querySelector("#landingScoreStatus"),
    onboardingModal: document.querySelector("#onboardingModal"),
    onboardingClose: document.querySelector("#onboardingClose"),
    difficultyRewards: document.querySelector("#difficultyRewards"),
    gameTitle: document.querySelector("#gameTitle"),
    gameModeLabel: document.querySelector("#gameModeLabel"),
    backToHome: document.querySelector("#backToHome"),
    restartGame: document.querySelector("#restartGame"),
    playAgain: document.querySelector("#playAgain"),
    resultHome: document.querySelector("#resultHome"),
    resultPanel: document.querySelector("#resultPanel"),
    resultTitle: document.querySelector("#resultTitle"),
    resultText: document.querySelector("#resultText"),
    resultAwardText: document.querySelector("#resultAwardText"),
    hudScore: document.querySelector("#hudScore"),
    hudCombo: document.querySelector("#hudCombo"),
    hudAccuracy: document.querySelector("#hudAccuracy"),
    hudMeterLabel: document.querySelector("#hudMeterLabel"),
    hudMeterValue: document.querySelector("#hudMeterValue"),
    hudMeterFill: document.querySelector("#hudMeterFill"),
    hudMission: document.querySelector("#hudMission"),
    bestScorePill: document.querySelector("#bestScorePill"),
    soundToggle: document.querySelector("#soundToggle"),
    navHome: document.querySelector("[data-nav-home]"),
    scoreHome: document.querySelector("#scoreHome"),
    toggleScoreGrades: document.querySelector("#toggleScoreGrades"),
    scoreTable: document.querySelector("#scoreTable"),
    scoreStatus: document.querySelector("#scoreStatus"),
    scoreTableBody: document.querySelector("#scoreTableBody"),
    mobileKeyboard: document.querySelector("#mobileKeyboard"),
  };

  const gameFactories = {
    meteors: (options) => new CQ.MeteorGame(options),
    words: (options) => new CQ.WordGame(options),
    typing: (options) => new CQ.TypingSprintGame(options),
    shortcuts: (options) => new CQ.ShortcutGame(options),
    maze: (options) => new CQ.MazeGame(options),
    symbols: (options) => new CQ.SymbolForgeGame(options),
    cipher: (options) => new CQ.CipherGame(options),
    formula: (options) => new CQ.FormulaFixGame(options),
    rpg: (options) => new CQ.KeyboardRpgGame(options),
    duel: (options) => new CQ.ShortcutDuelGame(options),
    shop: (options) => new CQ.AltgrShopGame(options),
    flash: (options) => new CQ.FlashDictationGame(options),
    tower: (options) => new CQ.TowerDefenseGame(options),
    coordinates: (options) => new CQ.CoordinateMapGame(options),
    repair: (options) => new CQ.TextRepairGame(options),
    relay: (options) => new CQ.RelayRaceGame(options),
    boss: (options) => new CQ.FinalBossGame(options),
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
    leaderboard: [],
    scoreStatus: "local",
    scoreGradesHidden: false,
  };

  const virtualKeyboardState = {
    ctrl: false,
    shift: false,
    altgr: false,
    open: false,
  };

  const virtualKeyboardRows = [
    {
      className: "mobile-keyboard-controls",
      keys: [
        { key: "ArrowLeft", label: "←", type: "action", aria: "Arrow left" },
        { key: "ArrowUp", label: "↑", type: "action", aria: "Arrow up" },
        { key: "ArrowDown", label: "↓", type: "action", aria: "Arrow down" },
        { key: "ArrowRight", label: "→", type: "action", aria: "Arrow right" },
        { key: "Enter", label: "↵", type: "action", wide: true, aria: "Enter" },
        { key: "Backspace", label: "⌫", type: "action", aria: "Backspace" },
        { key: "Escape", label: "Esc", type: "action", aria: "Escape" },
      ],
    },
    {
      keys: [
        { modifier: "ctrl", label: "Ctrl", type: "modifier", wide: true, aria: "Control" },
        { modifier: "shift", label: "⇧", type: "modifier", wide: true, aria: "Shift" },
        { modifier: "altgr", label: "AltGr", type: "modifier", wide: true, aria: "AltGr" },
        { key: "Tab", label: "Tab", type: "action", aria: "Tab" },
        { key: "Space", label: "␣", type: "action", extraWide: true, aria: "Space" },
      ],
    },
    { keys: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] },
    { keys: ["a", "z", "e", "r", "t", "y", "u", "i", "o", "p"] },
    { keys: ["q", "s", "d", "f", "g", "h", "j", "k", "l", "m"] },
    { keys: ["w", "x", "c", "v", "b", "n", "é", "è", "à", "ç"] },
    { keys: ["á", "í", "ó", "ú", "ñ", "¿", "¡", "â", "ê", "î"] },
    { keys: ["@", "#", "€", "_", "-", "?", "!", ".", ",", ";"] },
    { keys: [":", "/", "\\", "|", "{", "}", "[", "]", "~", "^"] },
    { keys: ["'", '"', "(", ")", "+", "=", "<", ">", "*", "%"] },
  ];

  const altGrOutputMap = {
    "0": "@",
    "2": "~",
    "3": "#",
    "4": "{",
    "5": "[",
    "6": "|",
    "8": "\\",
    ")": "]",
    "=": "}",
    e: "€",
    E: "€",
  };

  const shiftOutputMap = {
    ",": "?",
    "8": "!",
    ";": ".",
    ":": "/",
  };

  function t(path, values = {}) {
    return CQ.i18n.t(path, values, app.language);
  }

  function currentPlayer() {
    return CQ.scoreService.getPlayer();
  }

  function hasPlayerName() {
    return Boolean(currentPlayer().nickname);
  }

  function currentLeaderboardEntry() {
    const player = currentPlayer();
    return app.leaderboard.find((entry) => entry.id === player.id);
  }

  function playerTotal() {
    return Number(currentLeaderboardEntry()?.total) || 0;
  }

  function formatTime(timestamp) {
    if (!timestamp) return t("leaderboard.never");
    return new Intl.DateTimeFormat(app.language, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  }

  function formatDateTime(timestamp) {
    if (!timestamp) return t("leaderboard.never");
    return new Intl.DateTimeFormat(app.language, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  }

  function formatNote(value) {
    return new Intl.NumberFormat(app.language, {
      maximumFractionDigits: 1,
    }).format(value);
  }

  function gradingScaleText() {
    return t("leaderboard.gradingScale", {
      grade: app.grade,
      target: CQ.scoreService.gradeTarget(app.grade),
    });
  }

  function scoreStatusText() {
    const room = CQ.scoreService.getRoom();
    if (app.scoreStatus === "supabase") return t("leaderboard.live", { room });
    if (app.scoreStatus === "supabaseConnecting") return t("leaderboard.supabaseConnecting", { room });
    if (app.scoreStatus === "supabaseError") return t("leaderboard.supabaseError", { room });
    if (app.scoreStatus === "supabaseMissingConfig") return t("leaderboard.supabaseMissingConfig");
    if (app.scoreStatus === "relay") return t("leaderboard.live", { room });
    if (app.scoreStatus === "relayConnecting") return t("leaderboard.connecting", { room });
    if (app.scoreStatus === "relayError") return t("leaderboard.relayError", { room });
    return t("leaderboard.local");
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

  function pointsForChallenge(gameId, difficulty = app.difficulty) {
    return CQ.scoreService.pointsFor({ gameId, difficulty, grade: app.grade });
  }

  function renderDifficultyRewards() {
    if (!els.difficultyRewards) return;
    const chips = Object.keys(CQ.difficultySettings)
      .map((difficulty) => {
        const multiplier = CQ.scoreService.difficultyMultiplier(difficulty);
        const active = difficulty === app.difficulty ? " active" : "";
        return `<span class="reward-chip${active}">x${multiplier}</span>`;
      })
      .join("");
    els.difficultyRewards.innerHTML = `<span class="reward-chip-row">${chips}</span>`;
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
      const points = pointsForChallenge(game.id);
      const availability = CQ.scoreService.awardAvailability({ gameId: game.id, grade: app.grade, difficulty: app.difficulty });
      const rewardClass = availability.available ? "card-reward" : "card-reward card-reward-warning";
      const rewardText = app.difficulty === "defi"
        ? availability.available
          ? t("score.defiPointsBadge", { points })
          : t("score.defiCooldownBadge", { points, time: formatTime(availability.nextAvailableAt) })
        : availability.available
          ? t("score.pointsBadge", { points })
          : t("score.cooldownBadge", { time: formatTime(availability.nextAvailableAt) });
      card.innerHTML = `
        <div class="card-art" aria-hidden="true">
          ${game.art.map((key) => `<span class="mini-key">${key}</span>`).join("")}
        </div>
        <h3>${game.title}</h3>
        <p>${game.summary}</p>
        <div class="${rewardClass}">${rewardText}</div>
        <div class="card-footer">
          <span class="tag">${game.tag}</span>
          <span>${best ? t("score.record", { score: best }) : t("score.new")}</span>
        </div>
      `;
      card.addEventListener("click", () => startGame(game.id));
      els.gameGrid.appendChild(card);
    }
    renderDifficultyRewards();
    updateBestPill();
  }

  function updateBestPill() {
    if (hasPlayerName()) {
      els.bestScorePill.textContent = t("score.player", { name: currentPlayer().nickname, score: playerTotal() });
      return;
    }
    const values = Object.values(app.scores);
    const best = values.length ? Math.max(...values) : 0;
    els.bestScorePill.textContent = t("score.best", { score: best });
  }

  function setScreen(screen) {
    els.landing.classList.toggle("screen-active", screen === "landing");
    els.home.classList.toggle("screen-active", screen === "home");
    els.play.classList.toggle("screen-active", screen === "play");
    els.scores.classList.toggle("screen-active", screen === "scores");
    if (typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    }
    updateVirtualKeyboardVisibility();
  }

  function isScoresPath() {
    return /\/scores\.html$/i.test(window.location.pathname);
  }

  function replaceRouteFile(fileName) {
    const url = new URL(window.location.href);
    const directory = url.pathname.replace(/[^/]*$/, "");
    url.pathname = `${directory}${fileName}`;
    url.search = "";
    url.hash = "";
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function showScoreRouteUrl() {
    if (!isScoresPath()) replaceRouteFile("scores.html");
  }

  function showHomeRouteUrl() {
    if (isScoresPath() || window.location.hash === "#scores") replaceRouteFile("index.html");
  }

  function openOnboardingModal() {
    if (!els.onboardingModal) return;
    els.onboardingModal.classList.remove("hidden");
    els.onboardingModal.setAttribute("aria-hidden", "false");
    els.onboardingClose?.focus();
  }

  function closeOnboardingModal() {
    els.onboardingModal?.classList.add("hidden");
    els.onboardingModal?.setAttribute("aria-hidden", "true");
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
    if (!hasPlayerName()) {
      setScreen("landing");
      els.playerName.focus();
      return;
    }
    const definition = gameDefinition(gameId);
    const createGame = gameFactories[gameId];
    if (!definition || !createGame) return;
    stopLoop();
    app.gameId = gameId;
    app.game = createGame({ grade: app.grade, difficulty: app.difficulty, language: app.language });
    app.running = true;
    virtualKeyboardState.open = false;
    resetVirtualModifiers();
    app.lastResult = null;
    app.lastTime = performance.now();

    els.resultPanel.classList.add("hidden");
    els.resultAwardText.textContent = "";
    updatePlayHeader();
    setScreen("play");
    canvas.focus({ preventScroll: true });
    loop(app.lastTime);
  }

  function stopLoop() {
    if (app.frameId) cancelAnimationFrame(app.frameId);
    app.frameId = 0;
    app.running = false;
    virtualKeyboardState.open = false;
    resetVirtualModifiers();
    updateVirtualKeyboardVisibility();
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

  function renderScoreStatus() {
    const statusText = scoreStatusText();
    els.landingScoreStatus.textContent = statusText;
    els.scoreStatus.textContent = `${statusText} · ${gradingScaleText()}`;
  }

  function renderLeaderboard(entries = app.leaderboard) {
    els.scoreTable?.classList.toggle("score-grades-hidden", app.scoreGradesHidden);
    if (els.toggleScoreGrades) {
      els.toggleScoreGrades.textContent = app.scoreGradesHidden ? t("leaderboard.showGrades") : t("leaderboard.hideGrades");
      els.toggleScoreGrades.setAttribute("aria-pressed", String(app.scoreGradesHidden));
    }

    els.scoreTableBody.innerHTML = "";
    if (!entries.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = app.scoreGradesHidden ? 5 : 7;
      cell.textContent = t("leaderboard.empty");
      row.appendChild(cell);
      els.scoreTableBody.appendChild(row);
      return;
    }

    entries.forEach((entry, index) => {
      const row = document.createElement("tr");
      const rank = document.createElement("td");
      const name = document.createElement("td");
      const points = document.createElement("td");
      const note = document.createElement("td");
      const mention = document.createElement("td");
      const lastGame = document.createElement("td");
      const updated = document.createElement("td");
      const total = Number(entry.total) || 0;
      const report = CQ.scoreService.gradeReport(total, app.grade);

      rank.className = "score-rank";
      note.className = "score-note score-grade-column";
      mention.className = `score-mention score-grade-column score-mention-${report.mention}`;
      rank.textContent = `#${index + 1}`;
      name.textContent = entry.nickname || "???";
      points.textContent = String(total);
      note.textContent = `${formatNote(report.note)}/20`;
      mention.textContent = t(`leaderboard.mentions.${report.mention}`);
      lastGame.textContent = entry.lastGame || "-";
      updated.textContent = formatDateTime(entry.updatedAt);

      row.append(rank, name, points, note, mention, lastGame, updated);
      els.scoreTableBody.appendChild(row);
    });
  }

  async function awardLeaderboardPoints() {
    if (!app.lastResult) return;
    const { gameId, success } = app.lastResult;

    const definition = gameDefinition(gameId);
    els.resultAwardText.textContent = t("results.awardPending");
    try {
      const award = await CQ.scoreService.submitAward({
        success,
        gameId,
        gameTitle: definition.title,
        grade: app.grade,
        difficulty: app.difficulty,
      });
      if (award.penalized) {
        els.resultAwardText.textContent = t("results.penalty", { points: award.points });
      } else if (award.awarded) {
        els.resultAwardText.textContent = t("results.awardSuccess", { points: award.points, time: formatTime(award.nextAvailableAt) });
      } else if (award.reason === "cooldown") {
        els.resultAwardText.textContent = t("results.awardCooldown", { time: formatTime(award.nextAvailableAt) });
      } else {
        els.resultAwardText.textContent = t("results.awardFailed");
      }
      app.leaderboard = CQ.scoreService.leaderboard();
      renderLeaderboard();
      updateBestPill();
      renderGameCards();
    } catch {
      els.resultAwardText.textContent = t("leaderboard.local");
    }
  }

  async function clearScoreRoom() {
    if (!els.clearScoreRoom) return;
    els.clearScoreRoom.disabled = true;
    els.scoreStatus.textContent = t("leaderboard.clearing");
    try {
      await CQ.scoreService.clearRoom();
      app.leaderboard = CQ.scoreService.leaderboard();
      renderLeaderboard();
      updateBestPill();
      renderGameCards();
      renderScoreStatus();
    } finally {
      els.clearScoreRoom.disabled = false;
    }
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
    awardLeaderboardPoints();
    els.resultPanel.classList.remove("hidden");
    renderGameCards();
    updateVirtualKeyboardVisibility();
  }

  function goHome() {
    stopLoop();
    showHomeRouteUrl();
    setScreen(hasPlayerName() ? "home" : "landing");
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
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
    });
    document.querySelectorAll("[data-difficulty]").forEach((button) => {
      button.textContent = t(`difficulties.${button.dataset.difficulty}`);
    });
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.classList.toggle("active", button.dataset.language === app.language);
    });
    updateBestPill();
    updatePlayHeader();
    renderDifficultyRewards();
    updateVirtualKeyboardToggle();
    renderResult();
    renderScoreStatus();
    renderLeaderboard();
  }

  function isLikelyMobilePortrait() {
    const forceMobileKeyboard = new URLSearchParams(window.location.search).has("mobileKeyboard");
    if (forceMobileKeyboard) return true;
    const hasTouch = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
    const compactPortrait = window.matchMedia("(max-width: 1100px) and (orientation: portrait)").matches;
    return hasTouch && compactPortrait;
  }

  function updateVirtualKeyboardVisibility() {
    if (!els.mobileKeyboard) return;
    const showKeyboard = els.play.classList.contains("screen-active") && app.running;
    els.mobileKeyboard.classList.toggle("mobile-keyboard-active", showKeyboard);
    els.mobileKeyboard.classList.toggle("mobile-keyboard-open", showKeyboard && virtualKeyboardState.open);
    els.mobileKeyboard.setAttribute("aria-hidden", String(!showKeyboard));
    document.body.classList.toggle("has-mobile-keyboard", showKeyboard);
    document.body.classList.toggle("virtual-keyboard-open", showKeyboard && virtualKeyboardState.open);
    updateVirtualKeyboardToggle();
  }

  function virtualKeyType(key) {
    if (key.length === 1 && /^[a-zéèàç]$/i.test(key)) return "letter";
    if (key.length === 1) return "symbol";
    return "action";
  }

  function normalizeVirtualKeyDefinition(definition) {
    if (typeof definition === "string") {
      return {
        key: definition,
        label: definition,
        type: virtualKeyType(definition),
      };
    }
    return definition;
  }

  function updateVirtualModifiers() {
    if (!els.mobileKeyboard) return;
    els.mobileKeyboard.querySelectorAll("[data-virtual-modifier]").forEach((button) => {
      const modifier = button.dataset.virtualModifier;
      const active = Boolean(virtualKeyboardState[modifier]);
      button.classList.toggle("virtual-key-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function resetVirtualModifiers() {
    virtualKeyboardState.ctrl = false;
    virtualKeyboardState.shift = false;
    virtualKeyboardState.altgr = false;
    updateVirtualModifiers();
  }

  function toggleVirtualKeyboardOpen() {
    virtualKeyboardState.open = !virtualKeyboardState.open;
    updateVirtualKeyboardVisibility();
    try {
      canvas.focus({ preventScroll: true });
    } catch {
      canvas.focus();
    }
  }

  function updateVirtualKeyboardToggle() {
    if (!els.mobileKeyboard) return;
    const button = els.mobileKeyboard.querySelector("[data-virtual-keyboard-toggle]");
    if (!button) return;
    const label = virtualKeyboardState.open ? t("keyboard.hide") : t("keyboard.show");
    button.textContent = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-expanded", String(virtualKeyboardState.open));
  }

  function toggleVirtualModifier(modifier) {
    virtualKeyboardState[modifier] = !virtualKeyboardState[modifier];
    updateVirtualModifiers();
    try {
      canvas.focus({ preventScroll: true });
    } catch {
      canvas.focus();
    }
  }

  function resolveVirtualKey(rawKey) {
    let key = rawKey === "Space" ? " " : rawKey;
    const modifiers = {
      ctrlKey: virtualKeyboardState.ctrl,
      shiftKey: virtualKeyboardState.shift,
      altKey: virtualKeyboardState.altgr,
      metaKey: false,
    };

    if (virtualKeyboardState.altgr && key.length === 1) {
      key = altGrOutputMap[key] || altGrOutputMap[key.toLocaleLowerCase("fr-FR")] || key;
      modifiers.ctrlKey = false;
      modifiers.shiftKey = false;
      modifiers.altKey = false;
    } else if (virtualKeyboardState.shift && key.length === 1) {
      if (shiftOutputMap[key]) {
        key = shiftOutputMap[key];
        modifiers.shiftKey = false;
      } else if (!virtualKeyboardState.ctrl && key.toLocaleLowerCase("fr-FR") !== key.toLocaleUpperCase("fr-FR")) {
        key = key.toLocaleUpperCase("fr-FR");
        modifiers.shiftKey = false;
      }
    }

    return { key, modifiers };
  }

  function sendVirtualKey(rawKey) {
    if (!app.game || !app.running) {
      resetVirtualModifiers();
      return;
    }

    const { key, modifiers } = resolveVirtualKey(rawKey);
    const syntheticEvent = {
      key,
      ...modifiers,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };

    try {
      canvas.focus({ preventScroll: true });
    } catch {
      canvas.focus();
    }
    app.game.handleKeyDown(syntheticEvent);
    resetVirtualModifiers();
  }

  function createVirtualKey(definition) {
    const key = normalizeVirtualKeyDefinition(definition);
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "virtual-key",
      `virtual-key-${key.type || "action"}`,
      key.wide ? "virtual-key-wide" : "",
      key.extraWide ? "virtual-key-extra-wide" : "",
    ].filter(Boolean).join(" ");
    button.textContent = key.label;
    button.setAttribute("aria-label", key.aria || key.label);

    if (key.modifier) {
      button.dataset.virtualModifier = key.modifier;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", (event) => {
        event.preventDefault();
        toggleVirtualModifier(key.modifier);
      });
    } else {
      button.dataset.virtualKey = key.key;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        sendVirtualKey(key.key);
      });
    }
    return button;
  }

  function renderVirtualKeyboard() {
    if (!els.mobileKeyboard) return;
    els.mobileKeyboard.innerHTML = "";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mobile-keyboard-toggle";
    toggle.dataset.virtualKeyboardToggle = "true";
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      toggleVirtualKeyboardOpen();
    });
    els.mobileKeyboard.appendChild(toggle);

    const keyPanel = document.createElement("div");
    keyPanel.className = "mobile-keyboard-keys";
    for (const rowDefinition of virtualKeyboardRows) {
      const row = document.createElement("div");
      row.className = ["mobile-keyboard-row", rowDefinition.className || ""].filter(Boolean).join(" ");
      for (const key of rowDefinition.keys) row.appendChild(createVirtualKey(key));
      keyPanel.appendChild(row);
    }
    els.mobileKeyboard.appendChild(keyPanel);
    updateVirtualModifiers();
    updateVirtualKeyboardToggle();
    updateVirtualKeyboardVisibility();
  }

  function bindVirtualKeyboard() {
    renderVirtualKeyboard();
    window.addEventListener("resize", updateVirtualKeyboardVisibility);
    window.addEventListener("orientationchange", updateVirtualKeyboardVisibility);
  }

  function routeFromHash() {
    if (window.location.hash === "#scores" || isScoresPath()) {
      stopLoop();
      showScoreRouteUrl();
      setScreen("scores");
      renderLeaderboard();
      return;
    }
    setScreen(hasPlayerName() ? "home" : "landing");
  }

  function bindPlayerForm() {
    els.playerName.value = currentPlayer().nickname || "";
    els.playerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!CQ.scoreService.setPlayerName(els.playerName.value)) {
        els.landingScoreStatus.textContent = t("landing.required");
        els.playerName.focus();
        return;
      }
      app.leaderboard = CQ.scoreService.leaderboard();
      updateBestPill();
      renderLeaderboard();
      renderGameCards();
      setScreen("home");
      openOnboardingModal();
    });
  }

  function initScoreService() {
    CQ.scoreService.init({
      onEntries(entries) {
        app.leaderboard = entries;
        updateBestPill();
        renderLeaderboard(entries);
      },
      onStatus(status) {
        app.scoreStatus = status;
        renderScoreStatus();
      },
    });
    app.leaderboard = CQ.scoreService.leaderboard();
  }

  function bindSegmentedControls() {
    document.querySelectorAll("[data-grade]").forEach((button) => {
      button.addEventListener("click", () => {
        app.grade = button.dataset.grade;
        document.querySelectorAll("[data-grade]").forEach((item) => item.classList.toggle("active", item === button));
        renderGameCards();
        renderScoreStatus();
        renderLeaderboard();
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
    document.addEventListener("keydown", (event) => {
      const gameActive = els.play.classList.contains("screen-active") && app.game && app.running;
      if (!gameActive || event.getModifierState?.("AltGraph")) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.key === "Tab" || event.key === "Backspace") {
        event.preventDefault();
      }
    }, { capture: true });

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
    els.scoreHome.addEventListener("click", goHome);
    els.toggleScoreGrades?.addEventListener("click", () => {
      app.scoreGradesHidden = !app.scoreGradesHidden;
      renderLeaderboard();
    });
    els.clearScoreRoom?.addEventListener("click", clearScoreRoom);
    els.restartGame.addEventListener("click", () => startGame(app.gameId));
    els.playAgain.addEventListener("click", () => startGame(app.gameId));
    els.onboardingClose?.addEventListener("click", closeOnboardingModal);
    els.onboardingModal?.addEventListener("click", (event) => {
      if (event.target === els.onboardingModal) closeOnboardingModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.onboardingModal?.classList.contains("hidden")) closeOnboardingModal();
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
    window.addEventListener("hashchange", routeFromHash);
  }

  initScoreService();
  bindPlayerForm();
  bindSegmentedControls();
  bindGameInput();
  bindNavigation();
  bindVirtualKeyboard();
  applyLanguage();
  renderGameCards();
  routeFromHash();
})(window.CQ = window.CQ || {});
