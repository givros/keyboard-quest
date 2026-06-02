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

  function hasFirebaseConfig(config) {
    return Boolean(config?.firebase?.apiKey && config.firebase.databaseURL && config.firebase.projectId && config.firebase.appId);
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

  const service = {
    player: loadPlayer(),
    entriesById: loadJson(CQ.SCORE_STORAGE_KEY, {}),
    status: "local",
    firebase: null,
    entryListeners: [],
    statusListeners: [],

    init({ onEntries, onStatus } = {}) {
      if (onEntries) this.entryListeners.push(onEntries);
      if (onStatus) this.statusListeners.push(onStatus);
      saveJson(CQ.PLAYER_STORAGE_KEY, this.player);
      this.ensureLocalEntry();
      this.emitEntries();
      this.emitStatus("local");
      if (CQ.scoreConfig?.provider === "firebase" && hasFirebaseConfig(CQ.scoreConfig)) {
        this.connectFirebase();
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
      if (this.firebase) this.syncFirebaseProfile();
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

    async connectFirebase() {
      const config = CQ.scoreConfig;
      const version = config.firebaseVersion || "12.4.0";
      try {
        const appModule = await import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`);
        const authModule = await import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`);
        const databaseModule = await import(`https://www.gstatic.com/firebasejs/${version}/firebase-database.js`);
        const app = appModule.initializeApp(config.firebase);
        const auth = authModule.getAuth(app);
        await authModule.signInAnonymously(auth);
        const uid = auth.currentUser.uid;
        this.player.id = uid;
        saveJson(CQ.PLAYER_STORAGE_KEY, this.player);
        const database = databaseModule.getDatabase(app);
        this.firebase = {
          database,
          ref: databaseModule.ref,
          onValue: databaseModule.onValue,
          runTransaction: databaseModule.runTransaction,
          update: databaseModule.update,
          path: config.firebasePath || "keyboardQuest/leaderboard",
        };
        this.emitStatus("live");
        this.watchFirebaseLeaderboard();
        await this.syncFirebaseProfile();
      } catch (error) {
        console.warn("Firebase score mode unavailable, using local scores.", error);
        this.firebase = null;
        this.emitStatus("local");
      }
    },

    watchFirebaseLeaderboard() {
      const listRef = this.firebase.ref(this.firebase.database, this.firebase.path);
      this.firebase.onValue(listRef, (snapshot) => {
        this.entriesById = snapshot.val() || {};
        saveJson(CQ.SCORE_STORAGE_KEY, this.entriesById);
        this.emitEntries();
      });
    },

    async syncFirebaseProfile() {
      if (!this.firebase || !this.player.nickname) return;
      const profileRef = this.firebase.ref(this.firebase.database, `${this.firebase.path}/${this.player.id}`);
      await this.firebase.update(profileRef, {
        nickname: this.player.nickname,
        updatedAt: Date.now(),
      });
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
      if (this.firebase) return this.submitFirebaseAward(award);
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

    async submitFirebaseAward(award) {
      const awardId = `${award.now}-${Math.random().toString(16).slice(2)}`;
      const playerRef = this.firebase.ref(this.firebase.database, `${this.firebase.path}/${this.player.id}`);
      const result = await this.firebase.runTransaction(playerRef, (current) => {
        const entry = current && typeof current === "object" ? current : {};
        const cooldowns = entry.cooldowns || {};
        const nextAvailableAt = Number(cooldowns[award.key]) || 0;
        const baseEntry = {
          ...entry,
          nickname: this.player.nickname,
          total: Number(entry.total) || 0,
          cooldowns,
        };

        if (award.now < nextAvailableAt) {
          return {
            ...baseEntry,
            lastAttempt: {
              awardId,
              awarded: false,
              nextAvailableAt,
              at: award.now,
            },
          };
        }

        return {
          ...baseEntry,
          total: baseEntry.total + award.points,
          updatedAt: award.now,
          lastGame: award.gameTitle || award.gameId,
          lastGameId: award.gameId,
          cooldowns: {
            ...cooldowns,
            [award.key]: award.now + award.cooldownMs,
          },
          lastAttempt: {
            awardId,
            awarded: true,
            points: award.points,
            nextAvailableAt: award.now + award.cooldownMs,
            at: award.now,
          },
        };
      });

      const attempt = result.snapshot.val()?.lastAttempt || {};
      return {
        awarded: Boolean(attempt.awarded),
        points: Number(attempt.points) || 0,
        reason: attempt.awarded ? "awarded" : "cooldown",
        nextAvailableAt: attempt.nextAvailableAt,
      };
    },
  };

  CQ.scoreService = service;
})(window.CQ = window.CQ || {});
