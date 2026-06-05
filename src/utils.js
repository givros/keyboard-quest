(function registerUtils(CQ) {
  function loadJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function randomOf(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatPercent(value) {
    return `${Math.round(clamp(value, 0, 1) * 100)}%`;
  }

  function printableKey(event) {
    const key = String(event.key || "").normalize("NFC");
    if (Array.from(key).length === 1) return key;
    return "";
  }

  function compareChar(typed, expected) {
    if (!typed || !expected) return false;
    const a = typed.normalize("NFC");
    const b = expected.normalize("NFC");
    if (a.toLocaleLowerCase("fr-FR") === b.toLocaleLowerCase("fr-FR") && /[a-zA-Z]/.test(b)) return true;
    return a === b;
  }

  function canonicalCombo(event) {
    const keyAliases = {
      " ": "Space",
      Esc: "Escape",
      ArrowLeft: "ArrowLeft",
      ArrowRight: "ArrowRight",
      ArrowUp: "ArrowUp",
      ArrowDown: "ArrowDown",
    };
    const ignored = ["Control", "Shift", "Alt", "Meta"];
    if (ignored.includes(event.key)) return "";

    const parts = [];
    if (event.ctrlKey) parts.push("Ctrl");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");

    let key = keyAliases[event.key] || event.key;
    if (key.length === 1) key = key.toLocaleUpperCase("fr-FR");
    parts.push(key);
    return parts.join("+");
  }

  function isBrowserReservedShortcut(combo) {
    const parts = String(combo || "").split("+");
    return parts.includes("Ctrl") && ["N", "P", "O", "L", "H", "K", "R", "T", "W"].includes(parts.at(-1));
  }

  CQ.utils = {
    loadJson,
    saveJson,
    randomOf,
    shuffle,
    clamp,
    formatPercent,
    printableKey,
    compareChar,
    canonicalCombo,
    isBrowserReservedShortcut,
  };

  CQ.audio = {
    enabled: true,
    context: null,
    playTone(type = "hit") {
      if (!this.enabled) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.context) this.context = new AudioContext();
      const audio = this.context;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const now = audio.currentTime;
      const presets = {
        hit: [660, 0.045, 0.045],
        miss: [150, 0.08, 0.05],
        done: [880, 0.12, 0.06],
      };
      const [freq, duration, volume] = presets[type] || presets.hit;
      osc.frequency.setValueAtTime(freq, now);
      osc.type = type === "miss" ? "sawtooth" : "triangle";
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + duration);
    },
  };
})(window.CQ = window.CQ || {});
