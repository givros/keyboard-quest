(function registerScoreService(CQ) {
  const { loadJson, saveJson } = CQ.utils;
  const POINTS_BY_DIFFICULTY = {
    calme: 1,
    rythme: 2,
    defi: 3,
  };

  function cleanNickname(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[<>]/g, "")
      .slice(0, 18);
  }

  function createLocalId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function sortedEntries(entriesById) {
    return Object.entries(entriesById || {})
      .map(([id, entry]) => ({ id, ...entry, total: Number(entry.total) || 0 }))
      .sort((a, b) => b.total - a.total || String(a.nickname || "").localeCompare(String(b.nickname || "")));
  }

  function pointsFor({ difficulty, grade }) {
    const base = POINTS_BY_DIFFICULTY[difficulty] || 1;
    return base + (grade === "4e" ? 1 : 0);
  }

  function loadPlayer() {
    const saved = loadJson(CQ.PLAYER_STORAGE_KEY, null);
    if (saved?.id) {
      return {
        id: saved.id,
        nickname: cleanNickname(saved.nickname),
      };
    }
    return {
      id: createLocalId(),
      nickname: "",
    };
  }

  function configuredServerBaseUrl(config) {
    const explicitUrl = String(config?.server?.baseUrl || "").trim();
    if (explicitUrl) return explicitUrl.replace(/\/+$/, "");
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      return window.location.origin;
    }
    return "";
  }

  function isServerEnabled(config) {
    return config?.provider !== "local" && config?.server?.enabled !== false;
  }

  async function fetchJson(url, options = {}, timeoutMs = 1400) {
    const controller = window.AbortController ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : 0;
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller?.signal,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }

  function entriesArrayToMap(entries) {
    return (entries || []).reduce((map, entry) => {
      if (!entry?.id) return map;
      const { id, ...rest } = entry;
      map[id] = rest;
      return map;
    }, {});
  }

  const service = {
    player: loadPlayer(),
    entriesById: loadJson(CQ.SCORE_STORAGE_KEY, {}),
    status: "local",
    server: null,
    entryListeners: [],
    statusListeners: [],

    init({ onEntries, onStatus } = {}) {
      if (onEntries) this.entryListeners.push(onEntries);
      if (onStatus) this.statusListeners.push(onStatus);
      saveJson(CQ.PLAYER_STORAGE_KEY, this.player);
      this.ensureLocalEntry();
      this.emitEntries();
      this.emitStatus("local");
      if (isServerEnabled(CQ.scoreConfig)) {
        this.connectServer();
      }
      return this.player;
    },

    getPlayer() {
      return this.player;
    },

    setPlayerName(name) {
      const nickname = cleanNickname(name);
      if (!nickname) return false;
      this.player.nickname = nickname;
      saveJson(CQ.PLAYER_STORAGE_KEY, this.player);
      this.ensureLocalEntry();
      this.emitEntries();
      if (this.server) {
        this.syncServerProfile().catch((error) => {
          console.warn("Score server profile sync unavailable, using local scores.", error);
          this.fallbackToLocal();
        });
      }
      return true;
    },

    leaderboard() {
      return sortedEntries(this.entriesById);
    },

    emitEntries() {
      const entries = this.leaderboard();
      this.entryListeners.forEach((listener) => listener(entries));
    },

    emitStatus(status) {
      this.status = status;
      this.statusListeners.forEach((listener) => listener(status));
    },

    ensureLocalEntry() {
      if (!this.player.nickname) return;
      const current = this.entriesById[this.player.id] || {};
      this.entriesById[this.player.id] = {
        nickname: this.player.nickname,
        total: Number(current.total) || 0,
        updatedAt: current.updatedAt || Date.now(),
        lastGame: current.lastGame || "",
        cooldowns: current.cooldowns || {},
      };
      saveJson(CQ.SCORE_STORAGE_KEY, this.entriesById);
    },

    applyRemoteEntries(entries) {
      this.entriesById = entriesArrayToMap(entries);
      this.emitEntries();
    },

    async connectServer() {
      const baseUrl = configuredServerBaseUrl(CQ.scoreConfig);
      if (!baseUrl) return;

      try {
        const health = await fetchJson(`${baseUrl}/api/score/health`, { method: "GET" });
        if (!health?.ok) throw new Error("Score server health check failed");
        this.server = { baseUrl, eventSource: null };
        this.emitStatus("server");
        this.watchServerLeaderboard();
        await this.syncServerProfile();
        await this.refreshServerLeaderboard();
      } catch (error) {
        console.warn("Score server unavailable, using local scores.", error);
        this.fallbackToLocal();
      }
    },

    fallbackToLocal() {
      if (this.server?.eventSource) this.server.eventSource.close();
      this.server = null;
      this.entriesById = loadJson(CQ.SCORE_STORAGE_KEY, {});
      this.ensureLocalEntry();
      this.emitEntries();
      this.emitStatus("local");
    },

    watchServerLeaderboard() {
      if (!window.EventSource || !this.server) return;
      const source = new EventSource(`${this.server.baseUrl}/api/score/events`);
      this.server.eventSource = source;
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data.entries)) this.applyRemoteEntries(data.entries);
        } catch (error) {
          console.warn("Invalid score stream event.", error);
        }
      };
      source.onerror = () => {
        console.warn("Score server stream disconnected, using local scores.");
        this.fallbackToLocal();
      };
    },

    async refreshServerLeaderboard() {
      if (!this.server) return;
      const data = await fetchJson(`${this.server.baseUrl}/api/score/leaderboard`, { method: "GET" });
      if (Array.isArray(data.entries)) this.applyRemoteEntries(data.entries);
    },

    async syncServerProfile() {
      if (!this.server || !this.player.nickname) return;
      const data = await fetchJson(`${this.server.baseUrl}/api/score/player`, {
        method: "POST",
        body: JSON.stringify({
          id: this.player.id,
          nickname: this.player.nickname,
        }),
      });
      if (data.player?.id) {
        this.player = {
          id: data.player.id,
          nickname: cleanNickname(data.player.nickname),
        };
        saveJson(CQ.PLAYER_STORAGE_KEY, this.player);
      }
      if (Array.isArray(data.entries)) this.applyRemoteEntries(data.entries);
    },

    async submitAward(payload) {
      if (!payload?.success) return { awarded: false, points: 0, reason: "failed" };
      if (!this.player.nickname) return { awarded: false, points: 0, reason: "missingPlayer" };
      const award = {
        ...payload,
        points: pointsFor(payload),
        key: `${payload.gameId}:${payload.grade}:${payload.difficulty}`,
        cooldownMs: CQ.scoreConfig?.cooldownMs || CQ.SCORE_COOLDOWN_MS,
        now: Date.now(),
      };
      if (this.server) {
        try {
          return await this.submitServerAward(award);
        } catch (error) {
          console.warn("Score server award unavailable, using local scores.", error);
          this.fallbackToLocal();
        }
      }
      return this.submitLocalAward(award);
    },

    submitLocalAward(award) {
      this.ensureLocalEntry();
      const entry = this.entriesById[this.player.id];
      const cooldowns = entry.cooldowns || {};
      const nextAvailableAt = Number(cooldowns[award.key]) || 0;
      if (award.now < nextAvailableAt) {
        return {
          awarded: false,
          points: 0,
          reason: "cooldown",
          nextAvailableAt,
        };
      }

      const nextCooldown = award.now + award.cooldownMs;
      this.entriesById[this.player.id] = {
        ...entry,
        nickname: this.player.nickname,
        total: (Number(entry.total) || 0) + award.points,
        updatedAt: award.now,
        lastGame: award.gameTitle || award.gameId,
        cooldowns: {
          ...cooldowns,
          [award.key]: nextCooldown,
        },
      };
      saveJson(CQ.SCORE_STORAGE_KEY, this.entriesById);
      this.emitEntries();
      return {
        awarded: true,
        points: award.points,
        reason: "awarded",
        nextAvailableAt: nextCooldown,
      };
    },

    async submitServerAward(award) {
      const data = await fetchJson(`${this.server.baseUrl}/api/score/award`, {
        method: "POST",
        body: JSON.stringify({
          id: this.player.id,
          nickname: this.player.nickname,
          gameId: award.gameId,
          gameTitle: award.gameTitle,
          grade: award.grade,
          difficulty: award.difficulty,
          success: true,
        }),
      });
      if (Array.isArray(data.entries)) this.applyRemoteEntries(data.entries);
      return {
        awarded: Boolean(data.awarded),
        points: Number(data.points) || 0,
        reason: data.reason || (data.awarded ? "awarded" : "cooldown"),
        nextAvailableAt: data.nextAvailableAt,
      };
    },
  };

  CQ.scoreService = service;
})(window.CQ = window.CQ || {});
