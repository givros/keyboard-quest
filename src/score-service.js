(function registerScoreService(CQ) {
  const { loadJson, saveJson } = CQ.utils;
  const POINTS_BY_DIFFICULTY = {
    calme: 3,
    rythme: 7,
    defi: 16,
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

  function gameRewardBonus(gameId) {
    return Number(CQ.gameRewardBonuses?.[gameId]) || 0;
  }

  function gradeTarget(grade) {
    return Number(CQ.gradeScoreTargets?.[grade]) || 60;
  }

  function roundedHalf(value) {
    return Math.round(value * 2) / 2;
  }

  function gradeReport(total, grade) {
    const target = gradeTarget(grade);
    const safeTotal = Math.max(0, Number(total) || 0);
    const ratio = target ? safeTotal / target : 0;
    const note = Math.min(20, roundedHalf(ratio * 20));
    let mention = "progress";
    if (ratio >= 2) mention = "gold";
    else if (ratio >= 1.5) mention = "silver";
    else if (ratio >= 1.25) mention = "bronze";
    else if (ratio >= 1) mention = "validated";
    return { note, target, mention, ratio };
  }

  function pointsFor({ difficulty, grade, gameId }) {
    const base = POINTS_BY_DIFFICULTY[difficulty] || 1;
    return base + gameRewardBonus(gameId) + (grade === "4e" ? 2 : 0);
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

  function defaultRoom() {
    return cleanRoom(CQ.scoreConfig?.relay?.room || CQ.DEFAULT_SCORE_ROOM || "1") || "1";
  }

  function loadRoom() {
    return defaultRoom();
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

  function roomEventsKey(room) {
    return `${CQ.SCORE_STORAGE_KEY}:events:${room}`;
  }

  function roomMetaKey(room) {
    return `${CQ.SCORE_STORAGE_KEY}:meta:${room}`;
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
    relayPollTimer: 0,
    lastResetAt: 0,
    seenEvents: new Set(),
    entryListeners: [],
    statusListeners: [],

    pointsFor(options) {
      return pointsFor(options);
    },

    difficultyMultiplier(difficulty) {
      return POINTS_BY_DIFFICULTY[difficulty] || 1;
    },

    gradeTarget(grade) {
      return gradeTarget(grade);
    },

    gradeReport(total, grade) {
      return gradeReport(total, grade);
    },

    awardAvailability({ gameId, grade, difficulty }) {
      const entry = this.entriesById[this.player.id] || {};
      const key = `${gameId}:${grade}:${difficulty}`;
      const nextAvailableAt = Number(entry.cooldowns?.[key]) || 0;
      const now = Date.now();
      return {
        available: now >= nextAvailableAt,
        nextAvailableAt,
      };
    },

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
      const nextRoom = defaultRoom();
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
          console.warn("Live score profile sync unavailable.", error);
          this.emitStatus("relayError");
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

    activeEventsKey() {
      return this.room ? roomEventsKey(this.room) : `${CQ.SCORE_STORAGE_KEY}:events:local`;
    },

    loadSeenEvents(room) {
      const saved = loadJson(roomEventsKey(room), []);
      this.seenEvents = new Set(Array.isArray(saved) ? saved.slice(-1200) : []);
    },

    saveSeenEvents() {
      const events = Array.from(this.seenEvents).slice(-1200);
      saveJson(this.activeEventsKey(), events);
    },

    loadRoomMeta(room) {
      const meta = loadJson(roomMetaKey(room), {});
      this.lastResetAt = Number(meta.lastResetAt) || 0;
    },

    saveRoomMeta() {
      if (!this.room) return;
      saveJson(roomMetaKey(this.room), {
        lastResetAt: this.lastResetAt,
      });
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
      if (this.relayPollTimer) window.clearInterval(this.relayPollTimer);
      this.relayPollTimer = 0;
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
      this.loadRoomMeta(clean);
      this.relay = {
        baseUrl: relayBaseUrl(CQ.scoreConfig),
        topic: relayTopic(CQ.scoreConfig, clean),
        eventSource: null,
        lastEnvelopeId: "",
      };
      this.loadSeenEvents(clean);
      this.emitEntries();
      this.emitStatus("relayConnecting");

      try {
        await this.loadRelayCache();
        this.emitEntries();
      } catch (error) {
        console.warn("Live score history unavailable.", error);
      }

      this.watchRelay();
      this.startRelayPolling();

      if (this.player.nickname) {
        this.publishProfile().catch((error) => {
          console.warn("Live score profile sync unavailable.", error);
          this.emitStatus("relayError");
          this.startRelayPolling();
        });
      }
    },

    async loadRelayCache() {
      if (!this.relay) return;
      const since = encodeURIComponent(this.relay.lastEnvelopeId || "all");
      const response = await fetchWithTimeout(`${this.relay.baseUrl}/${this.relay.topic}/json?poll=1&since=${since}`);
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
      this.saveSeenEvents();
    },

    watchRelay() {
      if (!window.EventSource || !this.relay) {
        this.emitStatus("relayError");
        return false;
      }
      const since = encodeURIComponent(this.relay.lastEnvelopeId || "all");
      const source = new EventSource(`${this.relay.baseUrl}/${this.relay.topic}/sse?since=${since}`);
      this.relay.eventSource = source;
      source.onopen = () => {
        this.emitStatus("relay");
      };
      source.onmessage = (event) => {
        try {
          this.consumeRelayEnvelope(JSON.parse(event.data));
          this.saveActiveEntries();
          this.saveSeenEvents();
          this.emitEntries();
        } catch (error) {
          console.warn("Invalid live score event.", error);
        }
      };
      source.onerror = () => {
        this.emitStatus("relayError");
        this.startRelayPolling();
      };
      return true;
    },

    startRelayPolling() {
      if (!this.relay || this.relayPollTimer) return;
      const poll = () => {
        if (!this.relay) return;
        this.loadRelayCache()
          .then(() => {
            this.emitEntries();
            this.emitStatus("relay");
          })
          .catch((error) => {
            console.warn("Live score polling unavailable.", error);
            this.emitStatus("relayError");
          });
      };
      this.relayPollTimer = window.setInterval(poll, 7000);
      poll();
    },

    stopRelayPolling() {
      if (!this.relayPollTimer) return;
      window.clearInterval(this.relayPollTimer);
      this.relayPollTimer = 0;
    },

    consumeRelayEnvelope(envelope) {
      if (this.relay && envelope?.id) this.relay.lastEnvelopeId = String(envelope.id);
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

      if (payload.type === "reset") {
        this.seenEvents.add(payload.eventId);
        this.saveSeenEvents();
        const at = Number(payload.at) || Date.now();
        if (at >= this.lastResetAt) {
          this.lastResetAt = at;
          this.entriesById = {};
          this.saveRoomMeta();
          this.saveActiveEntries();
        }
        return;
      }

      const playerId = String(payload.player?.id || "").slice(0, 90);
      const nickname = cleanNickname(payload.player?.nickname);
      if (!playerId || !nickname) return;
      const at = Number(payload.at) || Date.now();
      if (at <= this.lastResetAt) {
        this.seenEvents.add(payload.eventId);
        this.saveSeenEvents();
        return;
      }
      this.seenEvents.add(payload.eventId);
      this.saveSeenEvents();

      if (payload.type === "profile") {
        this.ensureRelayEntry(playerId, nickname, at);
        return;
      }

      if (!["award", "penalty"].includes(payload.type) || !payload.award) return;
      const award = payload.award;
      const entry = this.ensureRelayEntry(playerId, nickname, at);
      const key = `${award.gameId}:${award.grade}:${award.difficulty}`;
      const cooldowns = entry.cooldowns || {};
      const points = pointsFor({ difficulty: award.difficulty, grade: award.grade, gameId: award.gameId });

      if (payload.type === "penalty") {
        this.entriesById[playerId] = {
          ...entry,
          nickname,
          total: (Number(entry.total) || 0) - points,
          updatedAt: at,
          lastGame: String(award.gameTitle || award.gameId || "").slice(0, 64),
          cooldowns,
        };
        return;
      }

      const nextAvailableAt = Number(cooldowns[key]) || 0;
      if (at < nextAvailableAt) return;

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

    async clearRoom() {
      const room = this.room || defaultRoom();
      if (!this.relay && relayEnabled(CQ.scoreConfig)) await this.connectRelay(room);
      const payload = {
        app: "keyboard-quest",
        version: 1,
        type: "reset",
        eventId: createEventId(this.player.id),
        room,
        at: Date.now(),
      };

      if (this.relay) {
        try {
          await this.publishRelayPayload(payload);
          this.applyRelayPayload(payload);
          this.saveActiveEntries();
          this.emitEntries();
          this.emitStatus("relay");
          return { cleared: true, live: true };
        } catch (error) {
          console.warn("Live score reset unavailable.", error);
          this.emitStatus("relayError");
          this.startRelayPolling();
        }
      }

      this.applyRelayPayload(payload);
      this.saveActiveEntries();
      this.emitEntries();
      return { cleared: true, live: false };
    },

    async submitAward(payload) {
      if (!this.player.nickname) return { awarded: false, points: 0, reason: "missingPlayer" };
      if (!payload?.success) {
        if (payload?.difficulty !== "defi") return { awarded: false, points: 0, reason: "failed" };
        return this.submitPenalty(payload);
      }
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
          console.warn("Live score award unavailable.", error);
          this.emitStatus("relayError");
          this.startRelayPolling();
        }
      }
      return this.submitLocalAward(award);
    },

    submitPenalty(payload) {
      const penalty = {
        ...payload,
        points: pointsFor(payload),
        now: Date.now(),
      };
      if (this.relay) {
        return this.submitRelayPenalty(penalty).catch((error) => {
          console.warn("Live score penalty unavailable.", error);
          this.emitStatus("relayError");
          this.startRelayPolling();
          return this.submitLocalPenalty(penalty);
        });
      }
      return this.submitLocalPenalty(penalty);
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

    submitLocalPenalty(penalty) {
      this.ensureActiveEntry();
      const entry = this.entriesById[this.player.id];
      this.entriesById[this.player.id] = {
        ...entry,
        nickname: this.player.nickname,
        total: (Number(entry.total) || 0) - penalty.points,
        updatedAt: penalty.now,
        lastGame: penalty.gameTitle || penalty.gameId,
        cooldowns: entry.cooldowns || {},
      };
      this.saveActiveEntries();
      this.emitEntries();
      return {
        awarded: false,
        penalized: true,
        points: penalty.points,
        reason: "penalty",
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

    async submitRelayPenalty(penalty) {
      this.ensureActiveEntry();
      const payload = {
        app: "keyboard-quest",
        version: 1,
        type: "penalty",
        eventId: createEventId(this.player.id),
        room: this.room,
        at: penalty.now,
        player: {
          id: this.player.id,
          nickname: this.player.nickname,
        },
        award: {
          gameId: penalty.gameId,
          gameTitle: penalty.gameTitle,
          grade: penalty.grade,
          difficulty: penalty.difficulty,
        },
      };
      await this.publishRelayPayload(payload);
      this.applyRelayPayload(payload);
      this.saveActiveEntries();
      this.emitEntries();
      return {
        awarded: false,
        penalized: true,
        points: penalty.points,
        reason: "penalty",
      };
    },
  };

  CQ.scoreService = service;
})(window.CQ = window.CQ || {});
