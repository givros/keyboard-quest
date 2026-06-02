(function registerI18n(CQ) {
  function readLanguage() {
    try {
      const saved = localStorage.getItem(CQ.LANGUAGE_STORAGE_KEY);
      if (CQ.languages.some((language) => language.id === saved)) return saved;
    } catch {
      return CQ.DEFAULT_LANGUAGE;
    }
    return CQ.DEFAULT_LANGUAGE;
  }

  function resolvePath(source, path) {
    return path.split(".").reduce((value, part) => value?.[part], source);
  }

  function interpolate(text, values = {}) {
    if (typeof text !== "string") return text;
    return text.replace(/\{(\w+)\}/g, (_, key) => (values[key] ?? `{${key}}`));
  }

  function bundle(language = CQ.i18n?.language || CQ.DEFAULT_LANGUAGE) {
    return CQ.translations[language] || CQ.translations[CQ.DEFAULT_LANGUAGE];
  }

  CQ.i18n = {
    language: readLanguage(),

    setLanguage(language) {
      if (!CQ.languages.some((item) => item.id === language)) return;
      this.language = language;
      document.documentElement.lang = language;
      try {
        localStorage.setItem(CQ.LANGUAGE_STORAGE_KEY, language);
      } catch {
        // Local storage is optional; the current session can still switch language.
      }
    },

    t(path, values = {}, language = this.language) {
      const translated = resolvePath(bundle(language), path);
      const fallback = resolvePath(bundle(CQ.DEFAULT_LANGUAGE), path);
      return interpolate(translated ?? fallback ?? path, values);
    },

    gameCard(id, language = this.language) {
      return {
        ...this.t(`games.${id}`, {}, language),
        id,
      };
    },

    gradeData(grade, language = this.language) {
      const localized = CQ.localizedGradeData[language]?.[grade];
      return localized || CQ.localizedGradeData[CQ.DEFAULT_LANGUAGE][grade];
    },
  };

  CQ.i18n.setLanguage(CQ.i18n.language);
})(window.CQ = window.CQ || {});
