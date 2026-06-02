(function registerScoreService(CQ) {
  const { loadJson, saveJson } = CQ.utils;
  const POINTS_BY_DIFFICULTY = {
    imma: 1,
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

  function cleanRoom(value) {
    return String(value || "")
      .trim()
      .replace(/\D/g, "")
      .slice(0, 8);
  }

  function cleanTopicPart(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 32)
      .toLowerCase();
  }

  function createLocalId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createEventId(playerId) {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${playerId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

  function roomFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return cleanRoom(params.get("room") || params.get("classe") || params.get("class"));
  }

  function loadRoom() {
    return roomFromUrl() || cleanRoom(loadJson(CQ.SCORE_ROOM_STORAGE_KEY, ""));
  }

  function relayEnabled(config) {
    return config?.provider !== "local" && config?.relay?.enabled !== false;
  }

  function relayBaseUrl(config) {
    return String(config?.relay?.endpoint || "https://ntfy.sh").replace(/\/+$/, "");
  }

  function relayTopic(config, room) {
    const prefix = cleanTopicPart(config?.relay?.topicPrefix || "keyboard-quest") || "keyboard-quest";
    return `${prefix}-${cleanRoom(room)}`;
  }

  function roomCacheKey(room) {
    return `${CQ.SCORE_STORAGE_KEY}:room:${room}`;
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
    const controller = window.AbortController ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : 0;
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller?.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }

  const service = {
    player: loadPlayer(),
    room: loadRoom(),
    entriesById: loadJson(CQ.SCORE_STORAGE_KEY, {}),
    status: "local",
    relay: null,
    seenEvents: new Set(),
    entryListeners: [],
    statusListeners: [],

    init({ onEntries, onStatus } = {}) {
      if (onEntries) this.entryListeners.push(onEntries);
      if (onStatus) this.statusListeners.push(onStatus);
      saveJson(CQ.PLAYER_STORAGE_KEY, this.player);
      if (this.room && relayEnabled(CQ.scoreConfig)) {
        this.connectRelay(this.room);
      } else {
        this.useLocalScores("local");
      }
      return this.player;
    },

    getPlayer() {
      return this.player;
    },

    getRoom() {
      return this.room;
    },

    setRoom(room) {
      const nextRoom = cleanRoom(room);
      this.room = nextRoom;
      saveJson(CQ.SCORE_ROOM_STORAGE_KEY, nextRoom);
      if (!nextRoom || !relayEnabled(CQ.scoreConfig)) {
        this.useLocalScores("local");
        return true;
      }
      this.connectRelay(nextRoom);
      return true;
    },

    setPlayerName(name) {
      const nickname = cleanNickname(name);
      if (!nickname) return false;
      this.player.nickname = nickname;
      saveJson(CQ.PLAYER_STORAGE_KEY, this.player);
      this.ensureActiveEntry();
      this.emitEntries();
      if (this.relay) {
        this.publishProfile().catch((error) => {
          console.warn("Live score profile sync unavailable, using local scores.", error);
          this.useLocalScores("relayError");
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

    activeStorageKey() {
      return this.relay && this.room ? roomCacheKey(this.room) : CQ.SCORE_STORAGE_KEY;
    },

    saveActiveEntries() {
      saveJson(this.activeStorageKey(), this.entriesById);
    },

    ensureActiveEntry() {
      if (!this.player.nickname) return null;
      const current = this.entriesById[this.player.id] || {};
      this.entriesById[this.player.id] = {
        nickname: this.player.nickname,
        total: Number(current.total) || 0,
        updatedAt: Number(current.updatedAt) || Date.now(),
        lastGame: current.lastGame || "",
        cooldowns: current.cooldowns || {},
      };
      this.saveActiveEntries();
      return this.entriesById[this.player.id];
    },

    disconnectRelay() {
      if (this.relay?.eventSource) this.relay.eventSource.close();
      this.relay = null;
      this.seenEvents = new Set();
    },

    useLocalScores(status) {
      this.disconnectRelay();
      this.entriesById = loadJson(CQ.SCORE_STORAGE_KEY, {});
      this.ensureActiveEntry();
      this.emitEntries();
      this.emitStatus(status);
    },

    async connectRelay(room) {
      const clean = cleanRoom(room);
      if (!clean) {
        this.useLocalScores("local");
        return;
      }

      this.disconnectRelay();
      this.room = clean;
      saveJson(CQ.SCORE_ROOM_STORAGE_KEY, clean);
      this.entriesById = loadJson(roomCacheKey(clean), {});
      this.relay = {
        baseUrl: relayBaseUrl(CQ.scoreConfig),
        topic: relayTopic(CQ.scoreConfig, clean),
        eventSource: null,
      };
      this.emitEntries();
      this.emitStatus("relayConnecting");

      try {
        await this.loadRelayCache();
        this.emitEntries();
        this.emitStatus("relay");
        this.watchRelay();
        if (this.player.nickname) await this.publishProfile();
      } catch (error) {
        console.warn("Live score relay unavailable, using local scores.", error);
        this.useLocalScores("relayError");
      }
    },

    async loadRelayCache() {
      if (!this.relay) return;
      const response = await fetchWithTimeout(`${this.relay.baseUrl}/${this.relay.topic}/json?poll=1&since=all`);
      const text = await response.text();
      text.split("\n").forEach((line) => {
        if (!line.trim()) return;
        try {
          this.consumeRelayEnvelope(JSON.parse(line));
        } catch (error) {
          console.warn("Invalid cached score event.", error);
        }
      });
      this.saveActiveEntries();
    },

    watchRelay() {
      if (!window.EventSource || !this.relay) return;
      const source = new EventSource(`${this.relay.baseUrl}/${this.relay.topic}/sse?since=all`);
      this.relay.eventSource = source;
      source.onopen = () => this.emitStatus("relay");
      source.onmessage = (event) => {
        try {
          this.consumeRelayEnvelope(JSON.parse(event.data));
          this.saveActiveEntries();
          this.emitEntries();
        } catch (error) {
          console.warn("Invalid live score event.", error);
        }
      };
      source.onerror = () => {
        this.emitStatus("relayError");
      };
    },

    consumeRelayEnvelope(envelope) {
      if (envelope?.event !== "message" || !envelope.message) return;
      let payload;
      try {
        payload = JSON.parse(envelope.message);
      } catch {
        return;
      }
      this.applyRelayPayload(payload);
    },

    applyRelayPayload(payload) {
      if (payload?.app !== "keyboard-quest" || payload.room !== this.room || !payload.eventId) return;
      if (this.seenEvents.has(payload.eventId)) return;
      this.seenEvents.add(payload.eventId);

      const playerId = String(payload.player?.id || "").slice(0, 90);
      const nickname = cleanNickname(payload.player?.nickname);
      if (!playerId || !nickname) return;

      if (payload.type === "profile") {
        this.ensureRelayEntry(playerId, nickname, payload.at);
        return;
      }

      if (payload.type !== "award" || !payload.award) return;
      const award = payload.award;
      const entry = this.ensureRelayEntry(playerId, nickname, payload.at);
      const key = `${award.gameId}:${award.grade}:${award.difficulty}`;
      const at = Number(payload.at) || Date.now();
      const cooldowns = entry.cooldowns || {};
      const nextAvailableAt = Number(cooldowns[key]) || 0;
      if (at < nextAvailableAt) return;

      const points = pointsFor({ difficulty: award.difficulty, grade: award.grade });
      this.entriesById[playerId] = {
        ...entry,
        nickname,
        total: (Number(entry.total) || 0) + points,
        updatedAt: at,
        lastGame: String(award.gameTitle || award.gameId || "").slice(0, 64),
        cooldowns: {
          ...cooldowns,
          [key]: at + (CQ.scoreConfig?.cooldownMs || CQ.SCORE_COOLDOWN_MS),
        },
      };
    },

    ensureRelayEntry(playerId, nickname, at = Date.now()) {
      const current = this.entriesById[playerId] || {};
      this.entriesById[playerId] = {
        nickname,
        total: Number(current.total) || 0,
        updatedAt: Number(current.updatedAt) || Number(at) || Date.now(),
        lastGame: current.lastGame || "",
        cooldowns: current.cooldowns || {},
      };
      return this.entriesById[playerId];
    },

    async publishRelayPayload(payload) {
      if (!this.relay) throw new Error("No live score relay");
      await fetchWithTimeout(`${this.relay.baseUrl}/${this.relay.topic}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async publishProfile() {
      if (!this.relay || !this.player.nickname) return;
      const payload = {
        app: "keyboard-quest",
        version: 1,
        type: "profile",
        eventId: createEventId(this.player.id),
        room: this.room,
        at: Date.now(),
        player: {
          id: this.player.id,
          nickname: this.player.nickname,
        },
      };
      await this.publishRelayPayload(payload);
      this.applyRelayPayload(payload);
      this.saveActiveEntries();
      this.emitEntries();
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
      if (this.relay) {
        try {
          return await this.submitRelayAward(award);
        } catch (error) {
          console.warn("Live score award unavailable, using local scores.", error);
          this.useLocalScores("relayError");
        }
      }
      return this.submitLocalAward(award);
    },

    submitLocalAward(award) {
      this.ensureActiveEntry();
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
      this.saveActiveEntries();
      this.emitEntries();
      return {
        awarded: true,
        points: award.points,
        reason: "awarded",
        nextAvailableAt: nextCooldown,
      };
    },

    async submitRelayAward(award) {
      this.ensureActiveEntry();
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

      const payload = {
        app: "keyboard-quest",
        version: 1,
        type: "award",
        eventId: createEventId(this.player.id),
        room: this.room,
        at: award.now,
        player: {
          id: this.player.id,
          nickname: this.player.nickname,
        },
        award: {
          gameId: award.gameId,
          gameTitle: award.gameTitle,
          grade: award.grade,
          difficulty: award.difficulty,
        },
      };
      await this.publishRelayPayload(payload);
      this.applyRelayPayload(payload);
      this.saveActiveEntries();
      this.emitEntries();
      return {
        awarded: true,
        points: award.points,
        reason: "awarded",
        nextAvailableAt: award.now + award.cooldownMs,
      };
    },
  };

  CQ.scoreService = service;
})(window.CQ = window.CQ || {});
