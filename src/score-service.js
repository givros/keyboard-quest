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
    if (CQ.scoreConfig?.provider === "supabase") return supabaseRoom(CQ.scoreConfig);
    return cleanRoom(CQ.scoreConfig?.relay?.room || CQ.DEFAULT_SCORE_ROOM || "1") || "1";
  }

  function loadRoom() {
    return defaultRoom();
  }

  function relayEnabled(config) {
    return config?.provider === "relay" && config?.relay?.enabled !== false;
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

  function supabaseUrl(config) {
    return String(config?.supabase?.url || "").replace(/\/+$/, "");
  }

  function supabaseAnonKey(config) {
    return String(config?.supabase?.anonKey || "");
  }

  function supabaseTable(config) {
    return String(config?.supabase?.table || "keyboard_quest_scores").replace(/[^a-zA-Z0-9_]/g, "");
  }

  function supabaseRoom(config) {
    return cleanRoom(config?.supabase?.room || CQ.DEFAULT_SCORE_ROOM || "1") || "1";
  }

  function supabaseConfigured(config) {
    const url = supabaseUrl(config);
    const key = supabaseAnonKey(config);
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && key && !/COLLE_TA_CLE|ANON_ICI/i.test(key);
  }

  function supabaseEnabled(config) {
    return config?.provider === "supabase" && config?.supabase?.enabled !== false && supabaseConfigured(config);
  }

  function supabaseRequestedButMissing(config) {
    return config?.provider === "supabase" && !supabaseEnabled(config);
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
    supabase: null,
    supabasePollTimer: 0,
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
      if (this.room && supabaseEnabled(CQ.scoreConfig)) {
        this.connectSupabase(this.room);
      } else if (supabaseRequestedButMissing(CQ.scoreConfig)) {
        this.useLocalScores("supabaseMissingConfig");
      } else if (this.room && relayEnabled(CQ.scoreConfig)) {
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
      if (!nextRoom) {
        this.useLocalScores("local");
        return true;
      }
      if (supabaseEnabled(CQ.scoreConfig)) this.connectSupabase(nextRoom);
      else if (relayEnabled(CQ.scoreConfig)) this.connectRelay(nextRoom);
      else this.useLocalScores(supabaseRequestedButMissing(CQ.scoreConfig) ? "supabaseMissingConfig" : "local");
      return true;
    },

    setPlayerName(name) {
      const nickname = cleanNickname(name);
      if (!nickname) return false;
      this.player.nickname = nickname;
      saveJson(CQ.PLAYER_STORAGE_KEY, this.player);
      this.ensureActiveEntry();
      this.emitEntries();
      if (this.relay || this.supabase) {
        this.publishProfile().catch((error) => {
          console.warn("Live score profile sync unavailable.", error);
          this.emitStatus(this.supabase ? "supabaseError" : "relayError");
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
      return (this.relay || this.supabase) && this.room ? roomCacheKey(this.room) : CQ.SCORE_STORAGE_KEY;
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

    disconnectSupabase() {
      if (this.supabasePollTimer) window.clearInterval(this.supabasePollTimer);
      this.supabasePollTimer = 0;
      this.supabase = null;
    },

    useLocalScores(status) {
      this.disconnectRelay();
      this.disconnectSupabase();
      this.entriesById = loadJson(CQ.SCORE_STORAGE_KEY, {});
      this.ensureActiveEntry();
      this.emitEntries();
      this.emitStatus(status);
    },

    async connectSupabase(room) {
      const clean = cleanRoom(room);
      if (!clean || !supabaseEnabled(CQ.scoreConfig)) {
        this.useLocalScores(supabaseRequestedButMissing(CQ.scoreConfig) ? "supabaseMissingConfig" : "local");
        return;
      }

      this.disconnectRelay();
      this.disconnectSupabase();
      this.room = clean;
      saveJson(CQ.SCORE_ROOM_STORAGE_KEY, clean);
      this.entriesById = loadJson(roomCacheKey(clean), {});
      this.supabase = {
        baseUrl: supabaseUrl(CQ.scoreConfig),
        anonKey: supabaseAnonKey(CQ.scoreConfig),
        table: supabaseTable(CQ.scoreConfig),
        pollMs: Math.max(1500, Number(CQ.scoreConfig?.supabase?.pollMs) || 3000),
      };
      this.emitEntries();
      this.emitStatus("supabaseConnecting");

      try {
        await this.loadSupabaseScores();
        this.emitEntries();
        this.emitStatus("supabase");
      } catch (error) {
        console.warn("Supabase score load unavailable.", error);
        this.emitStatus("supabaseError");
      }

      this.startSupabasePolling();
      if (this.player.nickname) {
        this.publishProfile().catch((error) => {
          console.warn("Supabase profile sync unavailable.", error);
          this.emitStatus("supabaseError");
        });
      }
    },

    async supabaseRequest(path, options = {}) {
      if (!this.supabase) throw new Error("No Supabase score connection");
      const headers = {
        apikey: this.supabase.anonKey,
        Authorization: `Bearer ${this.supabase.anonKey}`,
        ...options.headers,
      };
      const response = await fetchWithTimeout(`${this.supabase.baseUrl}/rest/v1/${path}`, {
        ...options,
        headers,
      }, 6000);
      const text = await response.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    },

    async loadSupabaseScores() {
      if (!this.supabase || !this.room) return;
      const select = "player_id,nickname,total,last_game,updated_at,cooldowns";
      const rows = await this.supabaseRequest(`${this.supabase.table}?select=${select}&order=total.desc`);
      const nextEntries = {};
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        const playerId = String(row.player_id || "").slice(0, 90);
        const nickname = cleanNickname(row.nickname);
        if (!playerId || !nickname) return;
        const updatedAt = Date.parse(row.updated_at);
        nextEntries[playerId] = {
          nickname,
          total: Number(row.total) || 0,
          updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
          lastGame: String(row.last_game || "").slice(0, 64),
          cooldowns: row.cooldowns && typeof row.cooldowns === "object" ? row.cooldowns : {},
        };
      });
      this.entriesById = nextEntries;
      this.saveActiveEntries();
    },

    startSupabasePolling() {
      if (!this.supabase || this.supabasePollTimer) return;
      const poll = () => {
        if (!this.supabase) return;
        this.loadSupabaseScores()
          .then(() => {
            this.emitEntries();
            this.emitStatus("supabase");
          })
          .catch((error) => {
            console.warn("Supabase score polling unavailable.", error);
            this.emitStatus("supabaseError");
          });
      };
      this.supabasePollTimer = window.setInterval(poll, this.supabase.pollMs);
    },

    async upsertSupabaseEntry(playerId, entry) {
      if (!this.supabase || !this.room || !entry) return;
      const row = {
        player_id: playerId,
        nickname: cleanNickname(entry.nickname),
        total: Number(entry.total) || 0,
        last_game: String(entry.lastGame || "").slice(0, 64),
        cooldowns: entry.cooldowns || {},
        updated_at: new Date(Number(entry.updatedAt) || Date.now()).toISOString(),
      };
      await this.supabaseRequest(`${this.supabase.table}?on_conflict=player_id`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(row),
      });
    },

    async publishSupabaseProfile() {
      this.ensureActiveEntry();
      await this.upsertSupabaseEntry(this.player.id, this.entriesById[this.player.id]);
      this.emitEntries();
    },

    async submitSupabaseAward(award) {
      await this.loadSupabaseScores().catch((error) => {
        console.warn("Supabase pre-award refresh unavailable.", error);
      });
      const result = this.submitLocalAward(award);
      if (result.awarded) {
        try {
          await this.upsertSupabaseEntry(this.player.id, this.entriesById[this.player.id]);
        } catch (error) {
          console.warn("Supabase score upsert unavailable.", error);
          this.emitStatus("supabaseError");
        }
      }
      return result;
    },

    async submitSupabasePenalty(penalty) {
      await this.loadSupabaseScores().catch((error) => {
        console.warn("Supabase pre-penalty refresh unavailable.", error);
      });
      const result = this.submitLocalPenalty(penalty);
      try {
        await this.upsertSupabaseEntry(this.player.id, this.entriesById[this.player.id]);
      } catch (error) {
        console.warn("Supabase penalty upsert unavailable.", error);
        this.emitStatus("supabaseError");
      }
      return result;
    },

    async clearSupabaseRoom() {
      if (!this.supabase && supabaseEnabled(CQ.scoreConfig)) await this.connectSupabase(this.room || defaultRoom());
      if (this.supabase && this.room) {
        try {
          await this.supabaseRequest(`${this.supabase.table}?player_id=not.is.null`, {
            method: "DELETE",
            headers: {
              Prefer: "return=minimal",
            },
          });
          this.entriesById = {};
          this.saveActiveEntries();
          this.emitEntries();
          this.emitStatus("supabase");
          return { cleared: true, live: true };
        } catch (error) {
          console.warn("Supabase score reset unavailable.", error);
          this.emitStatus("supabaseError");
        }
      }

      this.entriesById = {};
      this.saveActiveEntries();
      this.emitEntries();
      return { cleared: true, live: false };
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
      if (this.supabase && this.player.nickname) return this.publishSupabaseProfile();
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
      if (this.supabase) return this.clearSupabaseRoom();
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
      if (this.supabase) {
        try {
          return await this.submitSupabaseAward(award);
        } catch (error) {
          console.warn("Supabase score award unavailable.", error);
          this.emitStatus("supabaseError");
        }
      }
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
      if (this.supabase) {
        return this.submitSupabasePenalty(penalty).catch((error) => {
          console.warn("Supabase score penalty unavailable.", error);
          this.emitStatus("supabaseError");
          return this.submitLocalPenalty(penalty);
        });
      }
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
