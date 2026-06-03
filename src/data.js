(function registerData(CQ) {
  CQ.STORAGE_KEY = "clavierQuestScores:v1";
  CQ.LANGUAGE_STORAGE_KEY = "clavierQuestLanguage:v1";
  CQ.DEFAULT_LANGUAGE = "fr";

  CQ.languages = [
    { id: "fr", label: "FR", name: "Français" },
    { id: "en", label: "EN", name: "English" },
    { id: "es", label: "ES", name: "Español" },
  ];

  CQ.difficultySettings = {
    calme: {
      speed: 0.75,
      spawn: 1.25,
      time: 82,
      lives: 7,
      tokens: 5,
    },
    rythme: {
      speed: 1.12,
      spawn: 0.75,
      time: 58,
      lives: 4,
      tokens: 8,
    },
    defi: {
      speed: 1.8,
      spawn: 0.35,
      time: 36,
      lives: 2,
      tokens: 12,
    },
  };

  CQ.gradeTuning = {
    "5e": {
      speedMultiplier: 1,
      spawnMultiplier: 1,
      timeMultiplier: 1,
      livesDelta: 0,
      tokensDelta: 0,
      wordTargetBonus: 0,
      shortcutGoalBonus: 0,
      meteorExtraPool: 0,
    },
    "4e": {
      speedMultiplier: 1.18,
      spawnMultiplier: 0.82,
      timeMultiplier: 0.9,
      livesDelta: -1,
      tokensDelta: 2,
      wordTargetBonus: 2,
      shortcutGoalBonus: 3,
      meteorExtraPool: 4,
    },
  };

  CQ.gradeScoreTargets = {
    "5e": 60,
    "4e": 75,
  };

  CQ.gameCards = [
    {
      id: "meteors",
      art: ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P", "Q", "S"],
    },
    {
      id: "words",
      art: ["é", "q", "u", "a", "t", "i", "o", "n", ".", ";", "?", "!"],
    },
    {
      id: "typing",
      art: ["5", "lignes", "AZ", "é", "@", "#", "€", "{", "}", "Entrée", "vite", "✓"],
    },
    {
      id: "shortcuts",
      art: ["Ctrl", "C", "V", "Z", "S", "F", "Tab", "↵", "Esc", "B", "I", "U"],
    },
    {
      id: "maze",
      art: ["↑", "←", "↓", "→", "Z", "Q", "S", "D", "A", "E", "R", "T"],
    },
    {
      id: "symbols",
      art: ["@", "#", "€", "_", "{", "}", "[", "]", "|", "\\", "~", "^"],
    },
    {
      id: "cipher",
      art: ["@", "€", "#", "?", "!", "{", "}", "~", "|", "[", "]", "\\"],
    },
    {
      id: "formula",
      art: ["@", "#", "€", "=", "+", ":", "/", "_", ".", "-", "{", "}"],
    },
    {
      id: "rpg",
      art: ["@", "#", "€", "{", "}", "PNJ", "↵", "Z", "Q", "S", "D", "✓"],
    },
  ];

  CQ.gameRewardBonuses = {
    meteors: 0,
    words: 1,
    typing: 5,
    shortcuts: 2,
    maze: 2,
    symbols: 3,
    cipher: 4,
    formula: 4,
    rpg: 6,
  };

  CQ.symbolSets = {
    "5e": [
      { symbol: "@", combo: "AltGr + 0", modifier: "AltGr" },
      { symbol: "#", combo: "AltGr + 3", modifier: "AltGr" },
      { symbol: "€", combo: "AltGr + E", modifier: "AltGr" },
      { symbol: "_", combo: "8", modifier: "direct" },
      { symbol: "-", combo: "6", modifier: "direct" },
      { symbol: "?", combo: "Maj + ,", modifier: "Maj" },
      { symbol: "!", combo: "Maj + 8", modifier: "Maj" },
      { symbol: ".", combo: "Maj + ;", modifier: "Maj" },
      { symbol: "/", combo: "Maj + :", modifier: "Maj" },
      { symbol: ":", combo: ".", modifier: "direct" },
    ],
    "4e": [
      { symbol: "@", combo: "AltGr + 0", modifier: "AltGr" },
      { symbol: "#", combo: "AltGr + 3", modifier: "AltGr" },
      { symbol: "€", combo: "AltGr + E", modifier: "AltGr" },
      { symbol: "{", combo: "AltGr + 4", modifier: "AltGr" },
      { symbol: "}", combo: "AltGr + =", modifier: "AltGr" },
      { symbol: "[", combo: "AltGr + 5", modifier: "AltGr" },
      { symbol: "]", combo: "AltGr + )", modifier: "AltGr" },
      { symbol: "|", combo: "AltGr + 6", modifier: "AltGr" },
      { symbol: "\\", combo: "AltGr + 8", modifier: "AltGr" },
      { symbol: "~", combo: "AltGr + 2", modifier: "AltGr" },
      { symbol: "_", combo: "8", modifier: "direct" },
      { symbol: "^", combo: "touche ^", modifier: "direct" },
      { symbol: "?", combo: "Maj + ,", modifier: "Maj" },
      { symbol: "!", combo: "Maj + 8", modifier: "Maj" },
      { symbol: "/", combo: "Maj + :", modifier: "Maj" },
    ],
  };

  CQ.difficultySymbolSets = {
    "5e": {
      calme: ["_", "-", "?", "!", ".", "/", ":", "@"],
      rythme: ["@", "#", "€", "_", "-", "?", "!", ".", "/", ":"],
      defi: ["@", "#", "€", "_", "-", "?", "!", ".", "/", ":", "{", "}", "[", "]"],
    },
    "4e": {
      calme: ["@", "#", "€", "_", "-", "?", "!", ".", "/", ":"],
      rythme: ["@", "#", "€", "{", "}", "[", "]", "|", "\\", "_", "?", "!", "/", ":"],
      defi: ["@", "#", "€", "{", "}", "[", "]", "|", "\\", "~", "^", "_", "?", "!", "/", ":", "."],
    },
  };

  CQ.symbolSetFor = function symbolSetFor(grade, difficulty) {
    const fallback = CQ.symbolSets["5e"];
    const gradeSet = CQ.symbolSets[grade] || fallback;
    const allSets = [...(CQ.symbolSets["5e"] || []), ...(CQ.symbolSets["4e"] || [])];
    const allowed = CQ.difficultySymbolSets[grade]?.[difficulty];
    if (!allowed) return gradeSet;
    const selected = allowed
      .map((symbol) => gradeSet.find((item) => item.symbol === symbol) || allSets.find((item) => item.symbol === symbol))
      .filter(Boolean);
    return selected.length ? selected : gradeSet;
  };

  CQ.typingTexts = {
    fr: {
      "5e": {
        calme: [
          "Le clavier reste calme et précis.",
          "Je lis la ligne puis je tape sans courir.",
          "Chaque espace compte dans le texte.",
          "Mes doigts reviennent au point de départ.",
          "La dernière ligne valide le sprint.",
        ],
        rythme: [
          "La classe prépare un exposé clair.",
          "Chaque équipe note les idées importantes.",
          "Le symbole @ sert pour une adresse.",
          "Le prix de 12€ apparaît dans l'exercice.",
          "Je termine vite, mais sans oublier la ponctuation.",
        ],
        defi: [
          "Mission #clavier : écrire cinq lignes sans pause.",
          "L'adresse aide@college.fr doit rester exacte.",
          "Le budget affiche 18€, puis une question ?",
          "Je garde les accents : é, è, à et ç.",
          "Fin du sprint : @ # € ? ! tout est validé.",
        ],
      },
      "4e": {
        calme: [
          "Un argument solide se construit avec méthode.",
          "La vitesse dépend du temps et de la distance.",
          "Je vérifie les accents avant de valider.",
          "Une formule claire évite les erreurs.",
          "La cinquième ligne conclut le sprint.",
        ],
        rythme: [
          "Le tableau[3] indique une position précise.",
          "Le bloc { score: 12 } garde une valeur.",
          "La barre | sépare deux choix logiques.",
          "Le chemin C:\\docs demande une barre inverse.",
          "Je tape vite : @ # € et les crochets restent exacts.",
        ],
        defi: [
          "Défi final #4e : vitesse, précision et mémoire.",
          "mail@class.fr coûte 25€ ? réponse immédiate !",
          "tableau[3] = { score: 12 } | bonus",
          "Chemin C:\\docs\\notes puis symbole ~ et ^.",
          "Dernière ligne : @ # € { } [ ] | \\ ~ ^",
        ],
      },
    },
    en: {
      "5e": {
        calme: [
          "The keyboard stays calm and precise.",
          "I read the line before typing fast.",
          "Every space counts in the text.",
          "My fingers return to the home row.",
          "The last line completes the sprint.",
        ],
        rythme: [
          "The class prepares a clear report.",
          "Each team writes the important ideas.",
          "The @ symbol is used in an address.",
          "The price shows 12€ in the exercise.",
          "I finish quickly, but keep punctuation.",
        ],
        defi: [
          "Mission #keyboard: type five lines nonstop.",
          "The address help@school.org must stay exact.",
          "The budget shows 18€, then a question ?",
          "I keep accents when they appear: é and ç.",
          "Final sprint: @ # € ? ! everything is right.",
        ],
      },
      "4e": {
        calme: [
          "A strong argument is built with method.",
          "Speed depends on distance and time.",
          "I check punctuation before validating.",
          "A clear formula avoids mistakes.",
          "The fifth line closes the sprint.",
        ],
        rythme: [
          "The array[3] shows a precise position.",
          "The block { score: 12 } stores a value.",
          "The bar | separates two logical choices.",
          "The path C:\\docs needs a backslash.",
          "I type fast: @ # € and brackets stay exact.",
        ],
        defi: [
          "Final #4e challenge: speed, accuracy, memory.",
          "mail@class.org costs 25€ ? answer now !",
          "array[3] = { score: 12 } | bonus",
          "Path C:\\docs\\notes then symbols ~ and ^.",
          "Last line: @ # € { } [ ] | \\ ~ ^",
        ],
      },
    },
    es: {
      "5e": {
        calme: [
          "El teclado queda tranquilo y preciso.",
          "Leo la línea antes de escribir rápido.",
          "Cada espacio cuenta en el texto.",
          "Mis dedos vuelven a la fila inicial.",
          "La última línea valida el sprint.",
        ],
        rythme: [
          "La clase prepara una exposición clara.",
          "Cada equipo anota las ideas importantes.",
          "El símbolo @ sirve para una dirección.",
          "El precio muestra 12€ en el ejercicio.",
          "Termino rápido, pero cuido la puntuación.",
        ],
        defi: [
          "Misión #teclado: escribir cinco líneas sin pausa.",
          "La dirección ayuda@colegio.es debe ser exacta.",
          "El presupuesto marca 18€, luego una pregunta ?",
          "Conservo los acentos: á, é, í, ó y ñ.",
          "Sprint final: @ # € ? ! todo queda validado.",
        ],
      },
      "4e": {
        calme: [
          "Un argumento sólido se construye con método.",
          "La velocidad depende del tiempo y la distancia.",
          "Reviso los acentos antes de validar.",
          "Una fórmula clara evita errores.",
          "La quinta línea cierra el sprint.",
        ],
        rythme: [
          "La tabla[3] indica una posición precisa.",
          "El bloque { score: 12 } guarda un valor.",
          "La barra | separa dos opciones lógicas.",
          "La ruta C:\\docs pide una barra inversa.",
          "Escribo rápido: @ # € y corchetes exactos.",
        ],
        defi: [
          "Reto final #4e: velocidad, precisión y memoria.",
          "mail@clase.es cuesta 25€ ? respuesta ya !",
          "tabla[3] = { score: 12 } | bonus",
          "Ruta C:\\docs\\notas luego símbolos ~ y ^.",
          "La última línea: @ # € { } [ ] | \\ ~ ^",
        ],
      },
    },
  };

  function addTypingLines(language, grade, difficulty, lines) {
    CQ.typingTexts[language][grade][difficulty].push(...lines);
  }

  addTypingLines("fr", "5e", "calme", [
    "Le regard suit les mots sans paniquer.",
    "Une erreur se corrige avec patience.",
    "La main gauche trouve a, z, e et r.",
    "La main droite garde le rythme.",
    "Je garde un souffle régulier.",
    "Le texte court reste bien aligné.",
    "Chaque touche reçoit son moment.",
    "Je finis proprement la ligne.",
  ]);
  addTypingLines("fr", "5e", "rythme", [
    "Le résumé indique trois idées utiles.",
    "Le groupe écrit : titre, exemple, conclusion.",
    "Une adresse test@college.fr reste lisible.",
    "Le total vaut 15€, puis 18€ avec bonus.",
    "Le symbole # classe le mot important.",
    "Je tape vite ; la virgule reste placée.",
    "Le point final arrive au bon endroit.",
    "La question ? demande une réponse nette.",
  ]);
  addTypingLines("fr", "5e", "defi", [
    "Le défi #vitesse mélange @, € et ?.",
    "contact@club.fr coûte 9€ aujourd'hui !",
    "Je tape : é, è, à, ç, puis j'avance.",
    "Le code @#€?! doit rester dans l'ordre.",
    "Mission rapide : zéro faute, cinq lignes.",
    "Le lien aide@cours.fr finit par /docs.",
    "Je note #maths, #info et 12€.",
    "Attention : espaces, accents et symboles !",
  ]);
  addTypingLines("fr", "4e", "calme", [
    "Le graphique compare deux grandeurs.",
    "L'hypothèse demande une preuve courte.",
    "La méthode évite les réponses floues.",
    "Je relis chaque signe avant Entrée.",
    "Le raisonnement avance sans pause.",
    "Une donnée précise aide le calcul.",
    "La phrase reste claire et complète.",
    "Je garde vitesse et précision ensemble.",
  ]);
  addTypingLines("fr", "4e", "rythme", [
    "tableau[2] contient une valeur précise.",
    "objet { note: 14 } reste bien formé.",
    "Le choix a | b demande une lecture nette.",
    "Le chemin C:\\cours\\maths reste exact.",
    "Le mail prof@college.fr répond vite.",
    "Je combine @, #, €, puis les crochets.",
    "La formule x / y garde ses espaces.",
    "Le bloc { actif: vrai } se referme.",
  ]);
  addTypingLines("fr", "4e", "defi", [
    "Défi #4e : @mail.fr, 25€ et tableau[3].",
    "objet { score: 18 } | bonus reste exact.",
    "Chemin C:\\dev\\notes puis test ~ et ^.",
    "Suite rapide : @ # € { } [ ] | \\.",
    "mail@classe.fr ? réponse : oui !",
    "La ligne code[5] = { ok: vrai }.",
    "Je tape \\ puis | sans inverser les deux.",
    "Final : #algo @lab.fr 42€ {x|y}.",
  ]);

  addTypingLines("en", "5e", "calme", [
    "The line stays short and clear.",
    "A calm hand keeps the rhythm.",
    "I type each word in order.",
    "The home row helps my fingers.",
    "Every space has its place.",
    "I finish the sentence cleanly.",
    "The sprint starts without panic.",
    "My eyes follow the next word.",
  ]);
  addTypingLines("en", "5e", "rythme", [
    "The report gives three useful ideas.",
    "The group writes: title, example, ending.",
    "An address like test@school.org stays clear.",
    "The price is 15€, then 18€ with a bonus.",
    "The # sign marks an important keyword.",
    "I type fast; the comma stays in place.",
    "The final period lands correctly.",
    "The question ? asks for a clear answer.",
  ]);
  addTypingLines("en", "5e", "defi", [
    "Speed #test mixes @, €, ? and !.",
    "club@school.org costs 9€ today !",
    "I type: accents, spaces, then symbols.",
    "The code @#€?! must stay in order.",
    "Fast mission: no mistake, five lines.",
    "The link help@class.org ends with /docs.",
    "I note #maths, #info and 12€.",
    "Watch spaces, capitals and symbols !",
  ]);
  addTypingLines("en", "4e", "calme", [
    "The graph compares two quantities.",
    "The hypothesis needs a short proof.",
    "A method avoids unclear answers.",
    "I check every sign before Enter.",
    "The reasoning moves without a pause.",
    "Precise data helps the calculation.",
    "The sentence stays clear and complete.",
    "I keep speed and accuracy together.",
  ]);
  addTypingLines("en", "4e", "rythme", [
    "array[2] contains a precise value.",
    "object { mark: 14 } stays well formed.",
    "The choice a | b needs clear reading.",
    "The path C:\\class\\maths stays exact.",
    "The mail teacher@school.org is fast.",
    "I combine @, #, €, then brackets.",
    "The formula x / y keeps its spaces.",
    "The block { active: true } closes.",
  ]);
  addTypingLines("en", "4e", "defi", [
    "Final #4e: @mail.org, 25€ and array[3].",
    "object { score: 18 } | bonus stays exact.",
    "Path C:\\dev\\notes then test ~ and ^.",
    "Quick suite: @ # € { } [ ] | \\.",
    "mail@class.org ? answer: yes !",
    "The line code[5] = { ok: true }.",
    "I type \\ then | without swapping them.",
    "Final: #algo @lab.org 42€ {x|y}.",
  ]);

  addTypingLines("es", "5e", "calme", [
    "La mirada sigue las palabras sin miedo.",
    "Un error se corrige con paciencia.",
    "La mano izquierda encuentra a, s, d y f.",
    "La mano derecha conserva el ritmo.",
    "Mantengo una respiración regular.",
    "El texto corto queda bien alineado.",
    "Cada tecla recibe su momento.",
    "Termino limpiamente la línea.",
  ]);
  addTypingLines("es", "5e", "rythme", [
    "El resumen indica tres ideas útiles.",
    "El grupo escribe: título, ejemplo, cierre.",
    "Una dirección test@colegio.es queda clara.",
    "El total vale 15€, luego 18€ con bonus.",
    "El símbolo # marca una palabra importante.",
    "Escribo rápido ; la coma queda colocada.",
    "El punto final llega al lugar correcto.",
    "La pregunta ? pide una respuesta clara.",
  ]);
  addTypingLines("es", "5e", "defi", [
    "El reto #velocidad mezcla @, € y ?.",
    "club@colegio.es cuesta 9€ hoy !",
    "Escribo: á, é, í, ó, ñ y sigo.",
    "El código @#€?! debe quedar ordenado.",
    "Misión rápida: cero fallos, cinco líneas.",
    "El enlace ayuda@clase.es termina en /docs.",
    "Anoto #mates, #info y 12€.",
    "Atención: espacios, acentos y símbolos !",
  ]);
  addTypingLines("es", "4e", "calme", [
    "El gráfico compara dos magnitudes.",
    "La hipótesis necesita una prueba corta.",
    "El método evita respuestas confusas.",
    "Reviso cada signo antes de Enter.",
    "El razonamiento avanza sin pausa.",
    "Un dato preciso ayuda al cálculo.",
    "La frase queda clara y completa.",
    "Conservo velocidad y precisión juntas.",
  ]);
  addTypingLines("es", "4e", "rythme", [
    "tabla[2] contiene un valor preciso.",
    "objeto { nota: 14 } queda bien formado.",
    "La opción a | b exige lectura clara.",
    "La ruta C:\\clase\\mates queda exacta.",
    "El mail profe@colegio.es responde rápido.",
    "Combino @, #, €, luego corchetes.",
    "La fórmula x / y conserva espacios.",
    "El bloque { activo: true } se cierra.",
  ]);
  addTypingLines("es", "4e", "defi", [
    "Reto #4e: @mail.es, 25€ y tabla[3].",
    "objeto { score: 18 } | bonus exacto.",
    "Ruta C:\\dev\\notas luego test ~ y ^.",
    "Secuencia rápida: @ # € { } [ ] | \\.",
    "mail@clase.es ? respuesta: sí !",
    "La línea code[5] = { ok: true }.",
    "Tecleo \\ luego | sin cambiar el orden.",
    "Final: #algo @lab.es 42€ {x|y}.",
  ]);

  CQ.typingTextProfiles = {
    fr: {
      "5e": {
        calme: { min: 185, max: 220, lineMax: 58 },
        rythme: { min: 200, max: 250, lineMax: 60 },
        defi: { min: 214, max: 265, lineMax: 60 },
      },
      "4e": {
        calme: { min: 204, max: 240, lineMax: 60 },
        rythme: { min: 216, max: 265, lineMax: 60 },
        defi: { min: 205, max: 275, lineMax: 60 },
      },
    },
    en: {
      "5e": {
        calme: { min: 171, max: 215, lineMax: 58 },
        rythme: { min: 181, max: 240, lineMax: 60 },
        defi: { min: 211, max: 260, lineMax: 60 },
      },
      "4e": {
        calme: { min: 177, max: 230, lineMax: 60 },
        rythme: { min: 195, max: 255, lineMax: 60 },
        defi: { min: 188, max: 270, lineMax: 60 },
      },
    },
    es: {
      "5e": {
        calme: { min: 176, max: 220, lineMax: 58 },
        rythme: { min: 195, max: 245, lineMax: 60 },
        defi: { min: 222, max: 265, lineMax: 60 },
      },
      "4e": {
        calme: { min: 192, max: 240, lineMax: 60 },
        rythme: { min: 200, max: 260, lineMax: 60 },
        defi: { min: 198, max: 275, lineMax: 60 },
      },
    },
  };

  function shuffleTypingLines(lines) {
    const copy = [...lines];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function typingLineTotal(lines) {
    return lines.reduce((sum, line) => sum + line.length, 0);
  }

  function typingProfileFor(language, grade, difficulty) {
    return CQ.typingTextProfiles[language]?.[grade]?.[difficulty] || CQ.typingTextProfiles[CQ.DEFAULT_LANGUAGE]["5e"].calme;
  }

  function balancedTypingLines(source, profile) {
    const lines = shuffleTypingLines(source);
    const valid = [];
    for (let a = 0; a < lines.length - 4; a += 1) {
      for (let b = a + 1; b < lines.length - 3; b += 1) {
        for (let c = b + 1; c < lines.length - 2; c += 1) {
          for (let d = c + 1; d < lines.length - 1; d += 1) {
            for (let e = d + 1; e < lines.length; e += 1) {
              const sample = [lines[a], lines[b], lines[c], lines[d], lines[e]];
              const total = typingLineTotal(sample);
              if (total >= profile.min && total <= profile.max) valid.push(sample);
            }
          }
        }
      }
    }
    return valid.length ? valid[Math.floor(Math.random() * valid.length)] : null;
  }

  function rebalanceTypingLines(lines, source, profile) {
    const selected = [...lines];
    for (let guard = 0; guard < 30; guard += 1) {
      const total = typingLineTotal(selected);
      if (total >= profile.min && total <= profile.max) return selected;

      const unused = source.filter((line) => !selected.includes(line));
      if (!unused.length) return selected;

      if (total < profile.min) {
        let shortestIndex = 0;
        selected.forEach((line, index) => {
          if (line.length < selected[shortestIndex].length) shortestIndex = index;
        });
        const replacement = unused
          .filter((line) => line.length > selected[shortestIndex].length)
          .sort((a, b) => a.length - b.length)
          .find((line) => total - selected[shortestIndex].length + line.length <= profile.max);
        if (!replacement) return selected;
        selected[shortestIndex] = replacement;
      } else {
        let longestIndex = 0;
        selected.forEach((line, index) => {
          if (line.length > selected[longestIndex].length) longestIndex = index;
        });
        const replacement = unused
          .filter((line) => line.length < selected[longestIndex].length)
          .sort((a, b) => b.length - a.length)
          .find((line) => total - selected[longestIndex].length + line.length >= profile.min);
        if (!replacement) return selected;
        selected[longestIndex] = replacement;
      }
    }
    return selected;
  }

  CQ.typingTextFor = function typingTextFor(language, grade, difficulty) {
    const bundle = CQ.typingTexts[language] || CQ.typingTexts[CQ.DEFAULT_LANGUAGE];
    const bank = bundle?.[grade]?.[difficulty] || CQ.typingTexts[CQ.DEFAULT_LANGUAGE]["5e"].calme;
    const profile = typingProfileFor(language, grade, difficulty);
    const usable = bank.filter((line) => line.length <= profile.lineMax);
    const source = usable.length >= 5 ? usable : bank;
    const balanced = balancedTypingLines(source, profile);
    if (balanced) return balanced;

    let best = source.slice(0, 5);
    let bestScore = Infinity;

    for (let attempt = 0; attempt < 120; attempt += 1) {
      const sample = shuffleTypingLines(source).slice(0, 5);
      const total = typingLineTotal(sample);
      const score = total < profile.min ? profile.min - total : Math.max(0, total - profile.max);
      if (score < bestScore) {
        best = sample;
        bestScore = score;
      }
      if (score === 0) return sample;
    }

    return rebalanceTypingLines(best, source, profile);
  };

  CQ.rpgQuests = {
    fr: [
      { id: "mail", x: 8, y: 5, icon: "@", npc: "Messager Pixel", title: "Le portail @", prompt: "Le portail du collège réclame le symbole arobase.", answer: "@", type: "text" },
      { id: "tag", x: 15, y: 7, icon: "#", npc: "Archiviste Hashtag", title: "Le mur des hashtags", prompt: "Inscris le symbole qui lance un mot-clé.", answer: "#", type: "text" },
      { id: "euro", x: 27, y: 7, icon: "€", npc: "Marchande d'euros", title: "La boutique en euros", prompt: "La caisse magique attend le signe de la monnaie européenne.", answer: "€", type: "text" },
      { id: "braces", x: 32, y: 10, icon: "{}", npc: "Forgeron AltGr", title: "La forge des accolades", prompt: "Reproduis le couple d'accolades.", answer: "{}", type: "text" },
      { id: "brackets", x: 12, y: 14, icon: "[]", npc: "Gardienne des tableaux", title: "La salle des crochets", prompt: "Ouvre et ferme un tableau avec les crochets.", answer: "[]", type: "text" },
      { id: "bar", x: 22, y: 14, icon: "|", npc: "Oracle logique", title: "Le pont logique", prompt: "Tape la barre verticale qui sépare deux choix.", answer: "|", type: "text" },
      { id: "slash", x: 35, y: 16, icon: "\\", npc: "Exploratrice système", title: "Le chemin inverse", prompt: "Tape la barre oblique inverse.", answer: "\\", type: "text" },
      { id: "accents", x: 7, y: 19, icon: "ç", npc: "Scribe des accents", title: "La cédille", prompt: "Tape seulement ç.", answer: "ç", type: "text" },
      { id: "shortcut", x: 18, y: 21, icon: "Ctrl", npc: "Maître Annulation", title: "Le raccourci oublié", prompt: "Lance le raccourci pour annuler.", answer: "Ctrl+Z", type: "combo" },
      { id: "final", x: 31, y: 22, icon: "★", npc: "Gardienne finale", title: "Le grand examen clavier", prompt: "Mélange final : arobase, hashtag, euro, point d'interrogation.", answer: "@#€?", type: "text" },
    ],
    en: [
      { id: "mail", x: 8, y: 5, icon: "@", npc: "Pixel Messenger", title: "The @ Gate", prompt: "The school portal asks for the at sign.", answer: "@", type: "text" },
      { id: "tag", x: 15, y: 7, icon: "#", npc: "Hashtag Archivist", title: "The Hashtag Wall", prompt: "Type the symbol that starts a keyword.", answer: "#", type: "text" },
      { id: "euro", x: 27, y: 7, icon: "€", npc: "Euro Merchant", title: "The Euro Shop", prompt: "The magic register expects the European currency sign.", answer: "€", type: "text" },
      { id: "braces", x: 32, y: 10, icon: "{}", npc: "AltGr Smith", title: "The Brace Forge", prompt: "Reproduce the pair of braces.", answer: "{}", type: "text" },
      { id: "brackets", x: 12, y: 14, icon: "[]", npc: "Array Guardian", title: "The Bracket Hall", prompt: "Open and close an array with brackets.", answer: "[]", type: "text" },
      { id: "bar", x: 22, y: 14, icon: "|", npc: "Logic Oracle", title: "The Logic Bridge", prompt: "Type the vertical bar that separates two choices.", answer: "|", type: "text" },
      { id: "slash", x: 35, y: 16, icon: "\\", npc: "System Explorer", title: "The Reverse Path", prompt: "Type the backslash.", answer: "\\", type: "text" },
      { id: "accents", x: 7, y: 19, icon: "ç", npc: "Accent Scribe", title: "The Cedilla", prompt: "Type only ç.", answer: "ç", type: "text" },
      { id: "shortcut", x: 18, y: 21, icon: "Ctrl", npc: "Undo Master", title: "The Forgotten Shortcut", prompt: "Trigger the shortcut for undo.", answer: "Ctrl+Z", type: "combo" },
      { id: "final", x: 31, y: 22, icon: "★", npc: "Final Guardian", title: "The Grand Keyboard Trial", prompt: "Final mix: at sign, hashtag, euro, question mark.", answer: "@#€?", type: "text" },
    ],
    es: [
      { id: "mail", x: 8, y: 5, icon: "@", npc: "Mensajero Pixel", title: "El portal @", prompt: "El portal del colegio pide la arroba.", answer: "@", type: "text" },
      { id: "tag", x: 15, y: 7, icon: "#", npc: "Archivista Hashtag", title: "El muro de hashtags", prompt: "Escribe el símbolo que inicia una palabra clave.", answer: "#", type: "text" },
      { id: "euro", x: 27, y: 7, icon: "€", npc: "Mercader de euros", title: "La tienda en euros", prompt: "La caja mágica espera el signo de moneda europea.", answer: "€", type: "text" },
      { id: "braces", x: 32, y: 10, icon: "{}", npc: "Herrero AltGr", title: "La forja de llaves", prompt: "Reproduce la pareja de llaves.", answer: "{}", type: "text" },
      { id: "brackets", x: 12, y: 14, icon: "[]", npc: "Guardiana de tablas", title: "La sala de corchetes", prompt: "Abre y cierra una tabla con corchetes.", answer: "[]", type: "text" },
      { id: "bar", x: 22, y: 14, icon: "|", npc: "Oráculo lógico", title: "El puente lógico", prompt: "Escribe la barra vertical que separa dos opciones.", answer: "|", type: "text" },
      { id: "slash", x: 35, y: 16, icon: "\\", npc: "Exploradora del sistema", title: "El camino inverso", prompt: "Escribe la barra inversa.", answer: "\\", type: "text" },
      { id: "accents", x: 7, y: 19, icon: "ç", npc: "Escriba de acentos", title: "La cedilla", prompt: "Escribe solo ç.", answer: "ç", type: "text" },
      { id: "shortcut", x: 18, y: 21, icon: "Ctrl", npc: "Maestro Deshacer", title: "El atajo olvidado", prompt: "Activa el atajo para deshacer.", answer: "Ctrl+Z", type: "combo" },
      { id: "final", x: 31, y: 22, icon: "★", npc: "Guardiana final", title: "El gran examen de teclado", prompt: "Mezcla final: arroba, hashtag, euro, signo de interrogación.", answer: "@#€?", type: "text" },
    ],
  };

  CQ.translations = {
    fr: {
      meta: {
        title: "Clavier Quest - 5e / 4e",
      },
      aria: {
        home: "Retour accueil",
        language: "Langue",
        sound: "Son",
        settings: "Réglages de session",
        grade: "Niveau scolaire",
        intensity: "Intensité",
        virtualKeyboard: "Clavier tactile de jeu",
      },
      home: {
        eyebrow: "Entraînement clavier",
        title: "Des mini-jeux courts pour gagner en précision.",
        description: "Sélectionne un niveau, choisis un défi, puis joue au clavier. Les scores restent enregistrés dans ce navigateur.",
        choose: "Choisis ton entraînement",
      },
      landing: {
        eyebrow: "Entrée dans la guilde",
        title: "Choisis ton pseudo avant de commencer.",
        description: "Ton pseudo sera utilisé pour le classement. Les points sont gagnés uniquement quand une mission est réussie.",
        label: "Pseudo",
        placeholder: "Ex : NeoClavier",
        roomLabel: "Room",
        roomPlaceholder: "Ex : 4821",
        start: "Commencer",
        required: "Entre un pseudo pour rejoindre la partie.",
      },
      onboarding: {
        eyebrow: "Mode d'emploi",
        title: "Comprendre le clavier, pas seulement aller vite.",
        keyboard: "Chaque mini-jeu fait travailler une zone du clavier : lettres, accents, symboles, raccourcis et touches combinées.",
        points: "Pour gagner des points de classement, il faut réussir le défi choisi.",
        cooldown: "Quand un défi a déjà donné des points, le même jeu au même niveau et à la même intensité ne rapporte plus avant le délai indiqué. En mode Défi, un échec retire le nombre de points prévu.",
        close: "J'ai compris",
      },
      controls: {
        grade: "Niveau",
        intensity: "Intensité",
      },
      actions: {
        home: "← Accueil",
        homeShort: "Accueil",
        replay: "Rejouer",
      },
      hud: {
        score: "Score",
        combo: "Série",
        accuracy: "Précision",
      },
      score: {
        best: "Meilleur score : {score}",
        player: "{name} · {score} pts",
        record: "Record {score}",
        new: "Nouveau",
        live: "Scores live",
        local: "Scores locaux",
        pointsBadge: "Gain : +{points} pt(s)",
        defiPointsBadge: "Gain : +{points} · Échec : -{points}",
        cooldownBadge: "Gain bloqué jusqu'à {time}",
        defiCooldownBadge: "Gain bloqué jusqu'à {time} · Échec : -{points}",
      },
      difficulties: {
        calme: "Calme",
        rythme: "Rythme",
        defi: "Défi",
      },
      results: {
        eyebrow: "Session terminée",
        success: "Mission réussie",
        finished: "Session terminée",
        summary: "{title} : {score} points, {accuracy} de précision. {message}",
        awardPending: "Calcul des points de classement...",
        awardSuccess: "+{points} point(s) de classement. Prochain gain possible pour ce défi à {time}.",
        awardCooldown: "Score déjà gagné récemment pour ce défi. Prochain gain possible à {time}.",
        awardFailed: "Pas de point de classement : il faut réussir la mission.",
        penalty: "Malus Défi : -{points} point(s) de classement.",
      },
      leaderboard: {
        eyebrow: "Classement live",
        title: "Scores des joueurs",
        description: "Tableau classé automatiquement du plus grand score au plus petit.",
        rank: "Rang",
        player: "Pseudo",
        points: "Points",
        note: "Note /20",
        mention: "Mention",
        hideGrades: "Cacher note et mention",
        showGrades: "Afficher note et mention",
        lastGame: "Dernier jeu",
        updated: "Mise à jour",
        empty: "Aucun score pour l'instant.",
        live: "Salon {room} actif : scores synchronises en direct.",
        connecting: "Connexion au salon {room}...",
        relayError: "Salon {room} indisponible : les scores restent locaux.",
        local: "Mode local : aucune room active.",
        gradingScale: "Barème 1 h {grade} : {target} pts = 20/20",
        mentions: {
          progress: "En cours",
          validated: "Objectif atteint",
          bronze: "Bronze",
          silver: "Argent",
          gold: "Or",
        },
        never: "Jamais",
      },
      play: {
        defaultMode: "Mini-jeu",
        defaultTitle: "Jeu",
      },
      games: {
        meteors: {
          title: "Météores de touches",
          mode: "Réflexes",
          summary: "Des touches tombent : vise juste, garde la série et protège la ligne.",
          tag: "lettres",
        },
        words: {
          title: "Atelier des mots",
          mode: "Précision",
          summary: "Écris des mots et phrases de cours sans perdre le fil.",
          tag: "mots",
        },
        typing: {
          title: "Sprint 5 lignes",
          mode: "Vitesse",
          summary: "Tape un texte de 5 lignes le plus vite possible sans casser la précision.",
          tag: "vitesse",
        },
        shortcuts: {
          title: "Raccourcis express",
          mode: "Méthode",
          summary: "Enchaîne les raccourcis utiles pour travailler plus vite.",
          tag: "Ctrl",
        },
        maze: {
          title: "Labyrinthe clavier",
          mode: "Déplacement",
          summary: "Explore, ouvre les bornes et rejoins la sortie avant la fin.",
          tag: "flèches",
        },
        symbols: {
          title: "Forgeron AltGr",
          mode: "Symboles",
          summary: "Forge @, #, €, accolades et autres touches difficiles avec les bons modificateurs.",
          tag: "AltGr",
        },
        cipher: {
          title: "Code secret",
          mode: "Mémoire",
          summary: "Observe une suite de symboles, puis reproduis-la sans te tromper.",
          tag: "mémo",
        },
        formula: {
          title: "Réparateur de formules",
          mode: "Contexte",
          summary: "Répare des adresses, hashtags et formules en tapant le symbole manquant.",
          tag: "@ # €",
        },
        rpg: {
          title: "Aventure clavier",
          mode: "RPG",
          summary: "Explore une cité top-down, parle aux PNJ et termine 10 quêtes de clavier.",
          tag: "quête",
        },
      },
      meters: {
        time: "Temps",
        progress: "Progression",
        beacons: "Bornes",
        charges: "Charges",
        sequences: "Suites",
        repairs: "Réparations",
        quests: "Quêtes",
        lines: "Lignes",
      },
      meteor: {
        line: "ligne de concentration",
        lives: "Vies",
        livesCount: "{count} vies",
        lost: "La ligne a été touchée trop souvent.",
        success: "La pluie de touches est maîtrisée.",
        mission: "Appuie sur la touche affichée avant qu'elle traverse la ligne.",
      },
      word: {
        item: "Mot {current} / {target}",
        timeUp: "Le temps est écoulé.",
        success: "La série de mots est validée.",
        enterHint: "Entrée valide aussi une phrase complète",
        mission: "Respecte les accents, les espaces et la ponctuation.",
      },
      typing: {
        timeUp: "Le temps est écoulé avant la fin du texte.",
        success: "Les 5 lignes sont tapées dans le temps.",
        mission: "Tape exactement les 5 lignes. Entrée sert à passer à la ligne.",
        line: "Ligne {current} / {target}",
        wpm: "{wpm} mots/min",
      },
      shortcut: {
        timeUp: "La manche est terminée.",
        success: "Les raccourcis s'enchaînent avec assurance.",
        correct: "Correct",
        received: "Reçu : {combo}",
        yourTurn: "À toi",
      },
      maze: {
        exitLabel: "S",
        timeUp: "La porte s'est refermée.",
        exitSuccess: "Sortie atteinte.",
        missingBeacons: "Il reste des bornes à activer.",
        beacon: "Borne {label}",
        activate: "Active la touche puis file vers la sortie. Temps : {seconds} s",
        remaining: "{count} bornes restantes",
        move: "Déplacement avec flèches ou ZQSD. Temps : {seconds} s",
      },
      symbols: {
        target: "Symbole cible",
        combo: "Combinaison",
        queue: "file de forge",
        timeUp: "Le temps de forge est écoulé.",
        success: "Les symboles difficiles sont bien forgés.",
        mission: "Tape le symbole affiché. Aide-toi de la combinaison indiquée : AltGr, Maj ou touche directe.",
      },
      cipher: {
        preview: "Observe",
        input: "Reproduis",
        sequence: "Suite {current} / {target}",
        timeUp: "Le coffre s'est verrouillé.",
        success: "Le code secret est mémorisé.",
        wrong: "Suite brouillée, recommence celle-ci.",
        missionPreview: "Mémorise les symboles dans l'ordre.",
        missionInput: "Reproduis la suite sans regarder le modèle.",
      },
      formula: {
        placeholder: "symbole manquant",
        timeUp: "L'atelier de correction ferme.",
        success: "Les lignes sont réparées.",
        mission: "Tape le symbole qui remplace le carré.",
      },
      rpg: {
        timeUp: "La cloche sonne avant la fin de l'aventure.",
        success: "Toutes les quêtes clavier sont validées.",
        moveHint: "Déplace-toi avec les flèches ou ZQSD.",
        interactHint: "Entrée près d'un PNJ pour lancer une quête.",
        completed: "Quête terminée",
        alreadyDone: "Cette quête est déjà validée.",
        answer: "Réponse",
        comboAnswer: "Raccourci attendu",
        enterValidate: "Entrée pour valider. Échap pour fermer.",
        questDone: "{count}/{target} quêtes terminées",
        nearby: "Parle à {name}",
        noQuest: "Explore la cité et cherche les symboles.",
      },
    },
    en: {
      meta: {
        title: "Keyboard Quest - Grade 7 / 8",
      },
      aria: {
        home: "Back home",
        language: "Language",
        sound: "Sound",
        settings: "Session settings",
        grade: "School level",
        intensity: "Intensity",
        virtualKeyboard: "Touch game keyboard",
      },
      home: {
        eyebrow: "Keyboard training",
        title: "Short mini-games to build speed and accuracy.",
        description: "Choose a level, pick a challenge, then play with the keyboard. Scores are saved in this browser.",
        choose: "Choose your training",
      },
      landing: {
        eyebrow: "Guild entrance",
        title: "Choose your nickname before you start.",
        description: "Your nickname is used for the leaderboard. Points are earned only when a mission is completed.",
        label: "Nickname",
        placeholder: "Example: KeyHero",
        roomLabel: "Room",
        roomPlaceholder: "Example: 4821",
        start: "Start",
        required: "Enter a nickname to join the game.",
      },
      onboarding: {
        eyebrow: "How it works",
        title: "Understand the keyboard, not just speed up.",
        keyboard: "Each mini-game trains a keyboard area: letters, accents, symbols, shortcuts, and combined keys.",
        points: "To earn leaderboard points, you must complete the selected challenge.",
        cooldown: "When a challenge has already awarded points, the same game at the same level and intensity cannot award more before the displayed delay. In Challenge mode, failing removes the planned points.",
        close: "Got it",
      },
      controls: {
        grade: "Level",
        intensity: "Intensity",
      },
      actions: {
        home: "← Home",
        homeShort: "Home",
        replay: "Play again",
      },
      hud: {
        score: "Score",
        combo: "Streak",
        accuracy: "Accuracy",
      },
      score: {
        best: "Best score: {score}",
        player: "{name} · {score} pts",
        record: "Record {score}",
        new: "New",
        live: "Live scores",
        local: "Local scores",
        pointsBadge: "Reward: +{points} pt(s)",
        defiPointsBadge: "Reward: +{points} · Fail: -{points}",
        cooldownBadge: "Reward locked until {time}",
        defiCooldownBadge: "Reward locked until {time} · Fail: -{points}",
      },
      difficulties: {
        calme: "Calm",
        rythme: "Rhythm",
        defi: "Challenge",
      },
      results: {
        eyebrow: "Session complete",
        success: "Mission complete",
        finished: "Session complete",
        summary: "{title}: {score} points, {accuracy} accuracy. {message}",
        awardPending: "Calculating leaderboard points...",
        awardSuccess: "+{points} leaderboard point(s). Next point for this challenge after {time}.",
        awardCooldown: "This challenge already gave points recently. Next point after {time}.",
        awardFailed: "No leaderboard point: complete the mission first.",
        penalty: "Challenge penalty: -{points} leaderboard point(s).",
      },
      leaderboard: {
        eyebrow: "Live ranking",
        title: "Player scores",
        description: "Table sorted automatically from highest score to lowest.",
        rank: "Rank",
        player: "Nickname",
        points: "Points",
        note: "Grade /20",
        mention: "Mention",
        hideGrades: "Hide grade and mention",
        showGrades: "Show grade and mention",
        lastGame: "Last game",
        updated: "Updated",
        empty: "No scores yet.",
        live: "Room {room} active: scores are syncing live.",
        connecting: "Connecting to room {room}...",
        relayError: "Room {room} unavailable: scores stay local.",
        local: "Local mode: no room is active.",
        gradingScale: "1-hour scale {grade}: {target} pts = 20/20",
        mentions: {
          progress: "In progress",
          validated: "Target reached",
          bronze: "Bronze",
          silver: "Silver",
          gold: "Gold",
        },
        never: "Never",
      },
      play: {
        defaultMode: "Mini-game",
        defaultTitle: "Game",
      },
      games: {
        meteors: {
          title: "Key Meteors",
          mode: "Reflexes",
          summary: "Keys fall from above: hit the right one and protect the line.",
          tag: "letters",
        },
        words: {
          title: "Word Workshop",
          mode: "Accuracy",
          summary: "Type lesson words and sentences without losing the thread.",
          tag: "words",
        },
        typing: {
          title: "5-Line Sprint",
          mode: "Speed",
          summary: "Type a 5-line text as fast as possible without breaking accuracy.",
          tag: "speed",
        },
        shortcuts: {
          title: "Shortcut Sprint",
          mode: "Method",
          summary: "Chain useful shortcuts to work faster.",
          tag: "Ctrl",
        },
        maze: {
          title: "Keyboard Maze",
          mode: "Movement",
          summary: "Explore, activate beacons, and reach the exit before time runs out.",
          tag: "arrows",
        },
        symbols: {
          title: "AltGr Forge",
          mode: "Symbols",
          summary: "Forge @, #, €, braces and other tricky keys with the right modifiers.",
          tag: "AltGr",
        },
        cipher: {
          title: "Secret Code",
          mode: "Memory",
          summary: "Watch a symbol sequence, then reproduce it without a mistake.",
          tag: "memory",
        },
        formula: {
          title: "Formula Fixer",
          mode: "Context",
          summary: "Repair emails, hashtags and formulas by typing the missing symbol.",
          tag: "@ # €",
        },
        rpg: {
          title: "Keyboard Adventure",
          mode: "RPG",
          summary: "Explore a top-down city, talk to NPCs, and complete 10 keyboard quests.",
          tag: "quest",
        },
      },
      meters: {
        time: "Time",
        progress: "Progress",
        beacons: "Beacons",
        charges: "Charges",
        sequences: "Sequences",
        repairs: "Repairs",
        quests: "Quests",
        lines: "Lines",
      },
      meteor: {
        line: "focus line",
        lives: "Lives",
        livesCount: "{count} lives",
        lost: "The line was hit too many times.",
        success: "The key storm is under control.",
        mission: "Press the displayed key before it crosses the line.",
      },
      word: {
        item: "Word {current} / {target}",
        timeUp: "Time is up.",
        success: "The word streak is validated.",
        enterHint: "Enter also validates a full sentence",
        mission: "Respect spaces, capitals, and punctuation.",
      },
      typing: {
        timeUp: "Time ran out before the text was complete.",
        success: "The 5 lines were typed in time.",
        mission: "Type exactly the 5 lines. Enter moves to the next line.",
        line: "Line {current} / {target}",
        wpm: "{wpm} wpm",
      },
      shortcut: {
        timeUp: "The round is over.",
        success: "You can chain shortcuts with confidence.",
        correct: "Correct",
        received: "Received: {combo}",
        yourTurn: "Your turn",
      },
      maze: {
        exitLabel: "E",
        timeUp: "The gate has closed.",
        exitSuccess: "Exit reached.",
        missingBeacons: "Some beacons still need activation.",
        beacon: "Beacon {label}",
        activate: "Activate the key, then head to the exit. Time: {seconds} s",
        remaining: "{count} beacons left",
        move: "Move with arrow keys or ZQSD. Time: {seconds} s",
      },
      symbols: {
        target: "Target symbol",
        combo: "Combination",
        queue: "forge queue",
        timeUp: "Forge time is over.",
        success: "The tricky symbols are forged.",
        mission: "Type the displayed symbol. Use the hint: AltGr, Shift, or direct key.",
      },
      cipher: {
        preview: "Watch",
        input: "Repeat",
        sequence: "Sequence {current} / {target}",
        timeUp: "The vault has locked.",
        success: "The secret code is memorized.",
        wrong: "Sequence scrambled, retry this one.",
        missionPreview: "Memorize the symbols in order.",
        missionInput: "Reproduce the sequence without looking at the model.",
      },
      formula: {
        placeholder: "missing symbol",
        timeUp: "The repair workshop is closing.",
        success: "The lines are repaired.",
        mission: "Type the symbol that replaces the square.",
      },
      rpg: {
        timeUp: "The bell rings before the adventure is complete.",
        success: "All keyboard quests are complete.",
        moveHint: "Move with arrow keys or ZQSD.",
        interactHint: "Press Enter near an NPC to start a quest.",
        completed: "Quest complete",
        alreadyDone: "This quest is already complete.",
        answer: "Answer",
        comboAnswer: "Expected shortcut",
        enterValidate: "Enter to validate. Escape to close.",
        questDone: "{count}/{target} quests complete",
        nearby: "Talk to {name}",
        noQuest: "Explore the city and look for symbols.",
      },
    },
    es: {
      meta: {
        title: "Teclado Quest - 5.º / 4.º",
      },
      aria: {
        home: "Volver al inicio",
        language: "Idioma",
        sound: "Sonido",
        settings: "Ajustes de sesión",
        grade: "Nivel escolar",
        intensity: "Intensidad",
        virtualKeyboard: "Teclado táctil de juego",
      },
      home: {
        eyebrow: "Entrenamiento de teclado",
        title: "Mini juegos cortos para ganar precisión.",
        description: "Elige un nivel, selecciona un reto y juega con el teclado. Las puntuaciones se guardan en este navegador.",
        choose: "Elige tu entrenamiento",
      },
      landing: {
        eyebrow: "Entrada al gremio",
        title: "Elige tu seudónimo antes de empezar.",
        description: "Tu seudónimo se usa para la clasificación. Los puntos se ganan solo cuando completas una misión.",
        label: "Seudónimo",
        placeholder: "Ej.: TecnoHeroe",
        roomLabel: "Room",
        roomPlaceholder: "Ej.: 4821",
        start: "Empezar",
        required: "Escribe un seudónimo para unirte a la partida.",
      },
      onboarding: {
        eyebrow: "Cómo funciona",
        title: "Entender el teclado, no solo ir rápido.",
        keyboard: "Cada mini juego entrena una zona del teclado: letras, acentos, símbolos, atajos y teclas combinadas.",
        points: "Para ganar puntos de clasificación, debes completar el reto elegido.",
        cooldown: "Cuando un reto ya dio puntos, el mismo juego con el mismo nivel e intensidad no vuelve a dar puntos antes del plazo indicado. En modo Reto, fallar quita los puntos previstos.",
        close: "Entendido",
      },
      controls: {
        grade: "Nivel",
        intensity: "Intensidad",
      },
      actions: {
        home: "← Inicio",
        homeShort: "Inicio",
        replay: "Jugar otra vez",
      },
      hud: {
        score: "Puntos",
        combo: "Racha",
        accuracy: "Precisión",
      },
      score: {
        best: "Mejor puntuación: {score}",
        player: "{name} · {score} pts",
        record: "Récord {score}",
        new: "Nuevo",
        live: "Puntuaciones live",
        local: "Puntuaciones locales",
        pointsBadge: "Recompensa: +{points} pt(s)",
        defiPointsBadge: "Recompensa: +{points} · Fallo: -{points}",
        cooldownBadge: "Recompensa bloqueada hasta {time}",
        defiCooldownBadge: "Recompensa bloqueada hasta {time} · Fallo: -{points}",
      },
      difficulties: {
        calme: "Tranquilo",
        rythme: "Ritmo",
        defi: "Reto",
      },
      results: {
        eyebrow: "Sesión terminada",
        success: "Misión cumplida",
        finished: "Sesión terminada",
        summary: "{title}: {score} puntos, {accuracy} de precisión. {message}",
        awardPending: "Calculando puntos de clasificación...",
        awardSuccess: "+{points} punto(s) de clasificación. Próximo punto para este reto después de {time}.",
        awardCooldown: "Este reto ya dio puntos recientemente. Próximo punto después de {time}.",
        awardFailed: "Sin punto de clasificación: primero completa la misión.",
        penalty: "Malus Reto: -{points} punto(s) de clasificación.",
      },
      leaderboard: {
        eyebrow: "Clasificación live",
        title: "Puntuaciones de jugadores",
        description: "Tabla ordenada automáticamente de mayor a menor puntuación.",
        rank: "Rango",
        player: "Seudónimo",
        points: "Puntos",
        note: "Nota /20",
        mention: "Mención",
        hideGrades: "Ocultar nota y mención",
        showGrades: "Mostrar nota y mención",
        lastGame: "Último juego",
        updated: "Actualizado",
        empty: "Todavía no hay puntuaciones.",
        live: "Sala {room} activa: puntuaciones sincronizadas en directo.",
        connecting: "Conectando a la sala {room}...",
        relayError: "Sala {room} no disponible: las puntuaciones siguen locales.",
        local: "Modo local: no hay room activa.",
        gradingScale: "Baremo 1 h {grade}: {target} pts = 20/20",
        mentions: {
          progress: "En curso",
          validated: "Objetivo alcanzado",
          bronze: "Bronce",
          silver: "Plata",
          gold: "Oro",
        },
        never: "Nunca",
      },
      play: {
        defaultMode: "Mini juego",
        defaultTitle: "Juego",
      },
      games: {
        meteors: {
          title: "Meteoros de teclas",
          mode: "Reflejos",
          summary: "Caen teclas: pulsa la correcta y protege la línea.",
          tag: "letras",
        },
        words: {
          title: "Taller de palabras",
          mode: "Precisión",
          summary: "Escribe palabras y frases de clase sin perder el hilo.",
          tag: "palabras",
        },
        typing: {
          title: "Sprint 5 líneas",
          mode: "Velocidad",
          summary: "Escribe un texto de 5 líneas lo más rápido posible sin perder precisión.",
          tag: "velocidad",
        },
        shortcuts: {
          title: "Atajos rápidos",
          mode: "Método",
          summary: "Encadena atajos útiles para trabajar más rápido.",
          tag: "Ctrl",
        },
        maze: {
          title: "Laberinto de teclado",
          mode: "Movimiento",
          summary: "Explora, activa balizas y llega a la salida antes del final.",
          tag: "flechas",
        },
        symbols: {
          title: "Forja AltGr",
          mode: "Símbolos",
          summary: "Forja @, #, €, llaves y otras teclas difíciles con los modificadores correctos.",
          tag: "AltGr",
        },
        cipher: {
          title: "Código secreto",
          mode: "Memoria",
          summary: "Observa una secuencia de símbolos y reprodúcela sin equivocarte.",
          tag: "memoria",
        },
        formula: {
          title: "Reparador de fórmulas",
          mode: "Contexto",
          summary: "Repara correos, hashtags y fórmulas escribiendo el símbolo que falta.",
          tag: "@ # €",
        },
        rpg: {
          title: "Aventura de teclado",
          mode: "RPG",
          summary: "Explora una ciudad top-down, habla con PNJ y completa 10 misiones de teclado.",
          tag: "misión",
        },
      },
      meters: {
        time: "Tiempo",
        progress: "Progreso",
        beacons: "Balizas",
        charges: "Cargas",
        sequences: "Secuencias",
        repairs: "Reparaciones",
        quests: "Misiones",
        lines: "Líneas",
      },
      meteor: {
        line: "línea de concentración",
        lives: "Vidas",
        livesCount: "{count} vidas",
        lost: "La línea fue tocada demasiadas veces.",
        success: "La lluvia de teclas está dominada.",
        mission: "Pulsa la tecla mostrada antes de que cruce la línea.",
      },
      word: {
        item: "Palabra {current} / {target}",
        timeUp: "Se acabó el tiempo.",
        success: "La serie de palabras está validada.",
        enterHint: "Enter también valida una frase completa",
        mission: "Respeta espacios, acentos y puntuación.",
      },
      typing: {
        timeUp: "Se acabó el tiempo antes de terminar el texto.",
        success: "Las 5 líneas se escribieron a tiempo.",
        mission: "Escribe exactamente las 5 líneas. Enter pasa a la línea siguiente.",
        line: "Línea {current} / {target}",
        wpm: "{wpm} ppm",
      },
      shortcut: {
        timeUp: "La ronda ha terminado.",
        success: "Encadenas los atajos con seguridad.",
        correct: "Correcto",
        received: "Recibido: {combo}",
        yourTurn: "Tu turno",
      },
      maze: {
        exitLabel: "S",
        timeUp: "La puerta se ha cerrado.",
        exitSuccess: "Salida alcanzada.",
        missingBeacons: "Quedan balizas por activar.",
        beacon: "Baliza {label}",
        activate: "Activa la tecla y ve a la salida. Tiempo: {seconds} s",
        remaining: "Quedan {count} balizas",
        move: "Muévete con flechas o ZQSD. Tiempo: {seconds} s",
      },
      symbols: {
        target: "Símbolo objetivo",
        combo: "Combinación",
        queue: "cola de forja",
        timeUp: "Se acabó el tiempo de forja.",
        success: "Los símbolos difíciles están forjados.",
        mission: "Escribe el símbolo mostrado. Usa la pista: AltGr, Mayús o tecla directa.",
      },
      cipher: {
        preview: "Observa",
        input: "Repite",
        sequence: "Secuencia {current} / {target}",
        timeUp: "La caja fuerte se ha bloqueado.",
        success: "El código secreto está memorizado.",
        wrong: "Secuencia mezclada, repite esta.",
        missionPreview: "Memoriza los símbolos en orden.",
        missionInput: "Reproduce la secuencia sin mirar el modelo.",
      },
      formula: {
        placeholder: "símbolo que falta",
        timeUp: "El taller de reparación cierra.",
        success: "Las líneas están reparadas.",
        mission: "Escribe el símbolo que sustituye al cuadrado.",
      },
      rpg: {
        timeUp: "Suena la campana antes de terminar la aventura.",
        success: "Todas las misiones de teclado están completas.",
        moveHint: "Muévete con flechas o ZQSD.",
        interactHint: "Pulsa Enter cerca de un PNJ para iniciar una misión.",
        completed: "Misión completada",
        alreadyDone: "Esta misión ya está validada.",
        answer: "Respuesta",
        comboAnswer: "Atajo esperado",
        enterValidate: "Enter para validar. Escape para cerrar.",
        questDone: "{count}/{target} misiones completadas",
        nearby: "Habla con {name}",
        noQuest: "Explora la ciudad y busca símbolos.",
      },
    },
  };

  CQ.localizedGradeData = {
    fr: {
      "5e": {
        keys: ["a", "z", "e", "r", "t", "y", "u", "i", "o", "p", "q", "s", "d", "f", "g", "h", "j", "k", "l", "m"],
        extraKeys: ["é", "è", "à", "ç", ",", ".", ";", "?", "1", "2", "3", "4", "5"],
        words: [
          "fraction",
          "croquis",
          "citadelle",
          "volcan",
          "bibliothèque",
          "moyen âge",
          "énergie",
          "proportion",
          "Le chevalier ajuste son heaume.",
          "Une carte claire aide la mémoire.",
          "La rivière traverse la vallée.",
          "Le résultat se vérifie en calculant.",
        ],
        shortcuts: [
          { combo: "Ctrl+C", action: "copier" },
          { combo: "Ctrl+V", action: "coller" },
          { combo: "Ctrl+Z", action: "annuler" },
          { combo: "Ctrl+A", action: "tout sélectionner" },
          { combo: "Ctrl+S", action: "enregistrer" },
          { combo: "Ctrl+F", action: "chercher" },
          { combo: "Tab", action: "champ suivant" },
          { combo: "Shift+Tab", action: "champ précédent" },
          { combo: "Enter", action: "valider" },
          { combo: "Escape", action: "fermer" },
        ],
        formulas: [
          { text: "contact□college.fr", symbol: "@" },
          { text: "□maths", symbol: "#" },
          { text: "prix : 12□", symbol: "€" },
          { text: "note□10", symbol: "/" },
          { text: "groupe□5e", symbol: "_" },
          { text: "fin de phrase□", symbol: "." },
        ],
      },
      "4e": {
        keys: ["a", "z", "e", "r", "t", "y", "u", "i", "o", "p", "q", "s", "d", "f", "g", "h", "j", "k", "l", "m", "w", "x", "c", "v", "b", "n"],
        extraKeys: ["é", "è", "à", "ç", ",", ".", ";", ":", "!", "?", "(", ")", "6", "7", "8", "9"],
        words: [
          "équation",
          "révolution",
          "hypothèse",
          "chlorophylle",
          "citoyenneté",
          "algorithmique",
          "proportionnalité",
          "coordonnées",
          "La vitesse dépend de la distance et du temps.",
          "Un argument solide s'appuie sur des preuves.",
          "L'expérience confirme l'hypothèse.",
          "Le graphique compare deux grandeurs.",
        ],
        shortcuts: [
          { combo: "Ctrl+C", action: "copier" },
          { combo: "Ctrl+V", action: "coller" },
          { combo: "Ctrl+X", action: "couper" },
          { combo: "Ctrl+Z", action: "annuler" },
          { combo: "Ctrl+Y", action: "rétablir" },
          { combo: "Ctrl+S", action: "enregistrer" },
          { combo: "Ctrl+F", action: "chercher" },
          { combo: "Ctrl+B", action: "gras" },
          { combo: "Ctrl+I", action: "italique" },
          { combo: "Ctrl+U", action: "souligner" },
          { combo: "Shift+Tab", action: "champ précédent" },
          { combo: "Escape", action: "fermer" },
        ],
        formulas: [
          { text: "eleve□college.fr", symbol: "@" },
          { text: "□algorithmique", symbol: "#" },
          { text: "budget = 18□", symbol: "€" },
          { text: "tableau□3]", symbol: "[" },
          { text: "tableau[3□", symbol: "]" },
          { text: "objet □ cle: 4 }", symbol: "{" },
          { text: "objet { cle: 4 □", symbol: "}" },
          { text: "a □ b", symbol: "|" },
        ],
      },
    },
    en: {
      "5e": {
        keys: ["a", "s", "d", "f", "g", "h", "j", "k", "l", "e", "r", "t", "u", "i", "o", "p", "c", "v", "b", "n"],
        extraKeys: [",", ".", ";", "?", "!", "'", "1", "2", "3", "4", "5"],
        words: [
          "fraction",
          "sketch",
          "castle",
          "volcano",
          "library",
          "middle age",
          "energy",
          "proportion",
          "The knight adjusts his helmet.",
          "A clear map helps memory.",
          "The river crosses the valley.",
          "The result is checked by calculating.",
        ],
        shortcuts: [
          { combo: "Ctrl+C", action: "copy" },
          { combo: "Ctrl+V", action: "paste" },
          { combo: "Ctrl+Z", action: "undo" },
          { combo: "Ctrl+A", action: "select all" },
          { combo: "Ctrl+S", action: "save" },
          { combo: "Ctrl+F", action: "find" },
          { combo: "Tab", action: "next field" },
          { combo: "Shift+Tab", action: "previous field" },
          { combo: "Enter", action: "confirm" },
          { combo: "Escape", action: "close" },
        ],
        formulas: [
          { text: "contact□school.org", symbol: "@" },
          { text: "□science", symbol: "#" },
          { text: "price: 12□", symbol: "€" },
          { text: "score□10", symbol: "/" },
          { text: "group□grade7", symbol: "_" },
          { text: "end of line□", symbol: "." },
        ],
      },
      "4e": {
        keys: ["a", "s", "d", "f", "g", "h", "j", "k", "l", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "z", "x", "c", "v", "b", "n", "m"],
        extraKeys: [",", ".", ";", ":", "!", "?", "(", ")", "'", "6", "7", "8", "9"],
        words: [
          "equation",
          "revolution",
          "hypothesis",
          "chlorophyll",
          "citizenship",
          "algorithm",
          "proportionality",
          "coordinates",
          "Speed depends on distance and time.",
          "A strong argument relies on evidence.",
          "The experiment confirms the hypothesis.",
          "The graph compares two quantities.",
        ],
        shortcuts: [
          { combo: "Ctrl+C", action: "copy" },
          { combo: "Ctrl+V", action: "paste" },
          { combo: "Ctrl+X", action: "cut" },
          { combo: "Ctrl+Z", action: "undo" },
          { combo: "Ctrl+Y", action: "redo" },
          { combo: "Ctrl+S", action: "save" },
          { combo: "Ctrl+F", action: "find" },
          { combo: "Ctrl+B", action: "bold" },
          { combo: "Ctrl+I", action: "italic" },
          { combo: "Ctrl+U", action: "underline" },
          { combo: "Shift+Tab", action: "previous field" },
          { combo: "Escape", action: "close" },
        ],
        formulas: [
          { text: "student□school.org", symbol: "@" },
          { text: "□algorithm", symbol: "#" },
          { text: "budget = 18□", symbol: "€" },
          { text: "array□3]", symbol: "[" },
          { text: "array[3□", symbol: "]" },
          { text: "object □ key: 4 }", symbol: "{" },
          { text: "object { key: 4 □", symbol: "}" },
          { text: "a □ b", symbol: "|" },
        ],
      },
    },
    es: {
      "5e": {
        keys: ["a", "s", "d", "f", "g", "h", "j", "k", "l", "e", "r", "t", "u", "i", "o", "p", "c", "v", "b", "n"],
        extraKeys: ["á", "é", "í", "ó", "ú", "ñ", ",", ".", ";", "?", "1", "2", "3", "4", "5"],
        words: [
          "fracción",
          "croquis",
          "ciudadela",
          "volcán",
          "biblioteca",
          "edad media",
          "energía",
          "proporción",
          "El caballero ajusta su casco.",
          "Un mapa claro ayuda a la memoria.",
          "El río cruza el valle.",
          "El resultado se comprueba calculando.",
        ],
        shortcuts: [
          { combo: "Ctrl+C", action: "copiar" },
          { combo: "Ctrl+V", action: "pegar" },
          { combo: "Ctrl+Z", action: "deshacer" },
          { combo: "Ctrl+A", action: "seleccionar todo" },
          { combo: "Ctrl+S", action: "guardar" },
          { combo: "Ctrl+F", action: "buscar" },
          { combo: "Tab", action: "campo siguiente" },
          { combo: "Shift+Tab", action: "campo anterior" },
          { combo: "Enter", action: "validar" },
          { combo: "Escape", action: "cerrar" },
        ],
        formulas: [
          { text: "contacto□colegio.es", symbol: "@" },
          { text: "□ciencias", symbol: "#" },
          { text: "precio: 12□", symbol: "€" },
          { text: "nota□10", symbol: "/" },
          { text: "grupo□5e", symbol: "_" },
          { text: "fin de línea□", symbol: "." },
        ],
      },
      "4e": {
        keys: ["a", "s", "d", "f", "g", "h", "j", "k", "l", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "z", "x", "c", "v", "b", "n", "m"],
        extraKeys: ["á", "é", "í", "ó", "ú", "ñ", ",", ".", ";", ":", "!", "?", "(", ")", "6", "7", "8", "9"],
        words: [
          "ecuación",
          "revolución",
          "hipótesis",
          "clorofila",
          "ciudadanía",
          "algoritmo",
          "proporcionalidad",
          "coordenadas",
          "La velocidad depende de la distancia y del tiempo.",
          "Un argumento sólido se apoya en pruebas.",
          "El experimento confirma la hipótesis.",
          "El gráfico compara dos magnitudes.",
        ],
        shortcuts: [
          { combo: "Ctrl+C", action: "copiar" },
          { combo: "Ctrl+V", action: "pegar" },
          { combo: "Ctrl+X", action: "cortar" },
          { combo: "Ctrl+Z", action: "deshacer" },
          { combo: "Ctrl+Y", action: "rehacer" },
          { combo: "Ctrl+S", action: "guardar" },
          { combo: "Ctrl+F", action: "buscar" },
          { combo: "Ctrl+B", action: "negrita" },
          { combo: "Ctrl+I", action: "cursiva" },
          { combo: "Ctrl+U", action: "subrayar" },
          { combo: "Shift+Tab", action: "campo anterior" },
          { combo: "Escape", action: "cerrar" },
        ],
        formulas: [
          { text: "alumno□colegio.es", symbol: "@" },
          { text: "□algoritmo", symbol: "#" },
          { text: "presupuesto = 18□", symbol: "€" },
          { text: "tabla□3]", symbol: "[" },
          { text: "tabla[3□", symbol: "]" },
          { text: "objeto □ clave: 4 }", symbol: "{" },
          { text: "objeto { clave: 4 □", symbol: "}" },
          { text: "a □ b", symbol: "|" },
        ],
      },
    },
  };

  function pushUnique(target, items, keyOf) {
    const seen = new Set(target.map(keyOf));
    items.forEach((item) => {
      const key = keyOf(item);
      if (!seen.has(key)) {
        target.push(item);
        seen.add(key);
      }
    });
  }

  function extendGradeData(language, grade, addition) {
    const target = CQ.localizedGradeData[language]?.[grade];
    if (!target) return;
    if (addition.extraKeys) pushUnique(target.extraKeys, addition.extraKeys, String);
    if (addition.words) pushUnique(target.words, addition.words, String);
    if (addition.shortcuts) pushUnique(target.shortcuts, addition.shortcuts, (item) => item.combo);
    if (addition.formulas) pushUnique(target.formulas, addition.formulas, (item) => `${item.text}:${item.symbol}`);
  }

  extendGradeData("fr", "5e", {
    extraKeys: ["!", ":", "'", "0", "6", "7", "8", "9"],
    words: [
      "océan",
      "boussole",
      "symétrie",
      "latitude",
      "chapitre",
      "Le schéma résume la leçon.",
      "Un exemple précis aide la réponse.",
      "La phrase commence par une majuscule.",
      "Le groupe compare deux résultats.",
      "Je vérifie le signe avant de finir.",
    ],
    shortcuts: [
      { combo: "Ctrl+P", action: "imprimer" },
      { combo: "Ctrl+O", action: "ouvrir" },
      { combo: "Ctrl+N", action: "nouveau document" },
    ],
    formulas: [
      { text: "prenom.nom□college.fr", symbol: "@" },
      { text: "□histoire", symbol: "#" },
      { text: "total : 15□", symbol: "€" },
      { text: "page□12", symbol: "/" },
      { text: "equipe□bleue", symbol: "_" },
      { text: "phrase terminee□", symbol: "." },
    ],
  });

  extendGradeData("fr", "4e", {
    extraKeys: ["<", ">", "+", "=", "*", "%", "0", "'", "\""],
    words: [
      "démonstration",
      "parallélogramme",
      "statistique",
      "concentration",
      "La variable change selon la situation.",
      "Le raisonnement s'appuie sur une preuve.",
      "Une fonction associe une valeur à une autre.",
      "La conclusion répond clairement au problème.",
      "L'algorithme répète les étapes nécessaires.",
      "Le résultat dépend des données choisies.",
    ],
    shortcuts: [
      { combo: "Ctrl+P", action: "imprimer" },
      { combo: "Ctrl+O", action: "ouvrir" },
      { combo: "Ctrl+N", action: "nouveau document" },
      { combo: "Ctrl+L", action: "sélectionner la barre d'adresse" },
      { combo: "Ctrl+H", action: "historique" },
      { combo: "Ctrl+K", action: "recherche rapide" },
    ],
    formulas: [
      { text: "contact□classe.fr", symbol: "@" },
      { text: "□proportionnalite", symbol: "#" },
      { text: "achat = 25□", symbol: "€" },
      { text: "liste□4]", symbol: "[" },
      { text: "liste[4□", symbol: "]" },
      { text: "style □ couleur: bleu }", symbol: "{" },
      { text: "style { couleur: bleu □", symbol: "}" },
      { text: "vrai □ faux", symbol: "|" },
    ],
  });

  extendGradeData("en", "5e", {
    extraKeys: ["!", ":", "0", "6", "7", "8", "9", "-"],
    words: [
      "compass",
      "symmetry",
      "latitude",
      "chapter",
      "diagram",
      "The diagram sums up the lesson.",
      "A clear example helps the answer.",
      "The sentence starts with a capital.",
      "The group compares two results.",
      "I check the sign before finishing.",
    ],
    shortcuts: [
      { combo: "Ctrl+P", action: "print" },
      { combo: "Ctrl+O", action: "open" },
      { combo: "Ctrl+N", action: "new document" },
    ],
    formulas: [
      { text: "first.last□school.org", symbol: "@" },
      { text: "□history", symbol: "#" },
      { text: "total: 15□", symbol: "€" },
      { text: "page□12", symbol: "/" },
      { text: "team□blue", symbol: "_" },
      { text: "sentence done□", symbol: "." },
    ],
  });

  extendGradeData("en", "4e", {
    extraKeys: ["<", ">", "+", "=", "*", "%", "0", "\""],
    words: [
      "demonstration",
      "parallelogram",
      "statistics",
      "concentration",
      "The variable changes with the situation.",
      "The reasoning relies on evidence.",
      "A function links one value to another.",
      "The conclusion answers the problem clearly.",
      "The algorithm repeats the needed steps.",
      "The result depends on the chosen data.",
    ],
    shortcuts: [
      { combo: "Ctrl+P", action: "print" },
      { combo: "Ctrl+O", action: "open" },
      { combo: "Ctrl+N", action: "new document" },
      { combo: "Ctrl+L", action: "select address bar" },
      { combo: "Ctrl+H", action: "history" },
      { combo: "Ctrl+K", action: "quick search" },
    ],
    formulas: [
      { text: "contact□class.org", symbol: "@" },
      { text: "□proportionality", symbol: "#" },
      { text: "purchase = 25□", symbol: "€" },
      { text: "list□4]", symbol: "[" },
      { text: "list[4□", symbol: "]" },
      { text: "style □ color: blue }", symbol: "{" },
      { text: "style { color: blue □", symbol: "}" },
      { text: "true □ false", symbol: "|" },
    ],
  });

  extendGradeData("es", "5e", {
    extraKeys: ["!", ":", "0", "6", "7", "8", "9", "-"],
    words: [
      "brújula",
      "simetría",
      "latitud",
      "capítulo",
      "diagrama",
      "El esquema resume la lección.",
      "Un ejemplo claro ayuda la respuesta.",
      "La frase empieza con mayúscula.",
      "El grupo compara dos resultados.",
      "Reviso el signo antes de terminar.",
    ],
    shortcuts: [
      { combo: "Ctrl+P", action: "imprimir" },
      { combo: "Ctrl+O", action: "abrir" },
      { combo: "Ctrl+N", action: "nuevo documento" },
    ],
    formulas: [
      { text: "nombre.apellido□colegio.es", symbol: "@" },
      { text: "□historia", symbol: "#" },
      { text: "total: 15□", symbol: "€" },
      { text: "pagina□12", symbol: "/" },
      { text: "equipo□azul", symbol: "_" },
      { text: "frase terminada□", symbol: "." },
    ],
  });

  extendGradeData("es", "4e", {
    extraKeys: ["<", ">", "+", "=", "*", "%", "0", "\""],
    words: [
      "demostración",
      "paralelogramo",
      "estadística",
      "concentración",
      "La variable cambia según la situación.",
      "El razonamiento se apoya en pruebas.",
      "Una función asocia un valor con otro.",
      "La conclusión responde al problema con claridad.",
      "El algoritmo repite los pasos necesarios.",
      "El resultado depende de los datos elegidos.",
    ],
    shortcuts: [
      { combo: "Ctrl+P", action: "imprimir" },
      { combo: "Ctrl+O", action: "abrir" },
      { combo: "Ctrl+N", action: "nuevo documento" },
      { combo: "Ctrl+L", action: "seleccionar barra de dirección" },
      { combo: "Ctrl+H", action: "historial" },
      { combo: "Ctrl+K", action: "búsqueda rápida" },
    ],
    formulas: [
      { text: "contacto□clase.es", symbol: "@" },
      { text: "□proporcionalidad", symbol: "#" },
      { text: "compra = 25□", symbol: "€" },
      { text: "lista□4]", symbol: "[" },
      { text: "lista[4□", symbol: "]" },
      { text: "estilo □ color: azul }", symbol: "{" },
      { text: "estilo { color: azul □", symbol: "}" },
      { text: "verdadero □ falso", symbol: "|" },
    ],
  });

  CQ.rpgQuestVariants = {
    fr: {
      mail: [
        { prompt: "Le portail du collège réclame le symbole arobase.", answer: "@" },
        { prompt: "Complète une adresse en tapant seulement l'arobase.", answer: "@" },
      ],
      tag: [
        { prompt: "Inscris le symbole qui lance un mot-clé.", answer: "#" },
        { prompt: "Le mur attend le signe placé devant un hashtag.", answer: "#" },
      ],
      euro: [
        { prompt: "La caisse magique attend le signe de la monnaie européenne.", answer: "€" },
        { prompt: "Tape le symbole utilisé pour écrire un prix en euros.", answer: "€" },
      ],
      accents: [
        { prompt: "Tape seulement ç.", answer: "ç" },
        { prompt: "Le scribe demande la cédille seule.", answer: "ç" },
      ],
      final: [
        { prompt: "Mélange final : arobase, hashtag, euro, point d'interrogation.", answer: "@#€?" },
        { prompt: "Mélange final : hashtag, arobase, euro, point d'exclamation.", answer: "#@€!" },
      ],
    },
    en: {
      mail: [
        { prompt: "The school portal asks for the at sign.", answer: "@" },
        { prompt: "Complete an email address by typing only the at sign.", answer: "@" },
      ],
      tag: [
        { prompt: "Type the symbol that starts a keyword.", answer: "#" },
        { prompt: "The wall expects the sign before a hashtag.", answer: "#" },
      ],
      euro: [
        { prompt: "The magic register expects the European currency sign.", answer: "€" },
        { prompt: "Type the symbol used to write a price in euros.", answer: "€" },
      ],
      accents: [
        { prompt: "Type only ç.", answer: "ç" },
        { prompt: "The scribe asks for the cedilla alone.", answer: "ç" },
      ],
      final: [
        { prompt: "Final mix: at sign, hashtag, euro, question mark.", answer: "@#€?" },
        { prompt: "Final mix: hashtag, at sign, euro, exclamation mark.", answer: "#@€!" },
      ],
    },
    es: {
      mail: [
        { prompt: "El portal del colegio pide la arroba.", answer: "@" },
        { prompt: "Completa un correo escribiendo solo la arroba.", answer: "@" },
      ],
      tag: [
        { prompt: "Escribe el símbolo que inicia una palabra clave.", answer: "#" },
        { prompt: "El muro espera el signo de un hashtag.", answer: "#" },
      ],
      euro: [
        { prompt: "La caja mágica espera el signo de moneda europea.", answer: "€" },
        { prompt: "Escribe el símbolo usado para un precio en euros.", answer: "€" },
      ],
      accents: [
        { prompt: "Escribe solo ç.", answer: "ç" },
        { prompt: "El escriba pide únicamente la cedilla.", answer: "ç" },
      ],
      final: [
        { prompt: "Mezcla final: arroba, hashtag, euro, signo de interrogación.", answer: "@#€?" },
        { prompt: "Mezcla final: hashtag, arroba, euro, signo de exclamación.", answer: "#@€!" },
      ],
    },
  };

  CQ.gradeScoreTargets = {
    "5e": 160,
    "4e": 205,
  };

  CQ.gameCards.push(
    {
      id: "duel",
      art: ["Ctrl", "C", "Ctrl", "V", "Tab", "Entrée", "Esc", "Ctrl", "S", "Shift", "Tab", "✓"],
    },
    {
      id: "shop",
      art: ["@", "#", "€", "_", "-", "{", "}", "[", "]", "|", "\\", "client"],
    },
    {
      id: "flash",
      art: ["lis", "cache", "tape", "é", "ç", "?", "!", ".", "@", "#", "€", "✓"],
    },
    {
      id: "tower",
      art: ["A", "Z", "@", "#", "€", "[]", "{}", "?!", "_", "-", "base", "✓"],
    },
    {
      id: "coordinates",
      art: ["A", "1", "B", "4", "(", "3", ";", "7", "x", "=", "y", "2"],
    },
    {
      id: "repair",
      art: ["□", "ç", "@", "#", "€", "?", "/", "-", "{", "}", "fix", "✓"],
    },
    {
      id: "relay",
      art: ["run", "A", "Z", "@", "#", "Ctrl", "C", "Tab", "€", "porte", "vite", "✓"],
    },
    {
      id: "boss",
      art: ["@", "#", "€", "Ctrl", "Tab", "mémo", "A1", "{}", "[]", "?!", "Boss", "✓"],
    },
  );

  Object.assign(CQ.gameRewardBonuses, {
    meteors: 1,
    words: 2,
    typing: 8,
    shortcuts: 3,
    maze: 3,
    symbols: 4,
    cipher: 5,
    formula: 5,
    rpg: 9,
    duel: 5,
    shop: 5,
    flash: 6,
    tower: 6,
    coordinates: 4,
    repair: 5,
    relay: 5,
    boss: 12,
  });

  function extendTranslations(language, patch) {
    const target = CQ.translations[language];
    if (!target) return;
    Object.keys(patch).forEach((section) => {
      target[section] = target[section] || {};
      Object.assign(target[section], patch[section]);
    });
  }

  extendTranslations("fr", {
    keyboard: {
      show: "Afficher le clavier",
      hide: "Réduire le clavier",
    },
    games: {
      duel: {
        title: "Duel de raccourcis",
        mode: "Réflexe méthode",
        summary: "Un adversaire lance des actions : bloque-les avec le bon raccourci avant l'impact.",
        tag: "Ctrl",
      },
      shop: {
        title: "Boutique AltGr",
        mode: "Symboles utiles",
        summary: "Complète les commandes des clients avec @, #, €, accolades et autres touches rares.",
        tag: "AltGr",
      },
      flash: {
        title: "Dictée flash",
        mode: "Mémoire",
        summary: "Lis une ligne très vite, puis retape-la quand elle disparaît.",
        tag: "mémo",
      },
      tower: {
        title: "Tour clavier",
        mode: "Défense",
        summary: "Des vagues avancent vers la base : tape la bonne étiquette pour les arrêter.",
        tag: "stratégie",
      },
      coordinates: {
        title: "Carte aux coordonnées",
        mode: "Repérage",
        summary: "Compose les coordonnées caractère par caractère pour guider le personnage.",
        tag: "coord.",
      },
      repair: {
        title: "Réparation de message",
        mode: "Correction",
        summary: "Repère le caractère manquant dans une phrase et saisis la correction.",
        tag: "texte",
      },
      relay: {
        title: "Course relais",
        mode: "Vitesse ciblée",
        summary: "Passe les portes avec les bonnes touches avant que le coureur n'arrive dessus.",
        tag: "course",
      },
      boss: {
        title: "Boss final clavier",
        mode: "Mix complet",
        summary: "Symboles, raccourcis, mémoire et saisie rapide dans une épreuve plus longue.",
        tag: "boss",
      },
    },
    meters: {
      duels: "Duels",
      orders: "Commandes",
      defenses: "Défenses",
      maps: "Cartes",
      gates: "Portes",
      phases: "Phases",
    },
    duel: {
      attack: "Action entrante",
      prompt: "Exécute le raccourci avant l'impact.",
      guard: "Garde",
      tooSlow: "Trop lent",
      lost: "La garde est brisée.",
      timeUp: "Le duel s'arrête.",
      blocked: "Bloqué",
      received: "Reçu : {combo}",
      success: "Le duel est gagné.",
      mission: "Réponds dans {seconds} s avec le bon raccourci.",
    },
    shop: {
      single: "Le client demande {symbol}",
      customer: "Commande client",
      hint: "Indice :",
      timeUp: "La boutique ferme.",
      success: "Les commandes sont servies.",
      mission: "Tape le caractère attendu avant le départ du client. Patience : {seconds} s",
    },
    flash: {
      look: "Lis maintenant",
      type: "Retape de mémoire",
      timeUp: "La mémoire flash s'éteint.",
      success: "Les lignes sont mémorisées.",
      mission: "Observe, puis reproduis exactement la ligne cachée.",
    },
    tower: {
      base: "BASE",
      lives: "Base",
      wait: "Prépare-toi",
      lost: "La base est submergée.",
      timeUp: "La vague se disperse.",
      success: "La base tient bon.",
      mission: "Tape l'étiquette la plus proche de la base.",
    },
    coordinates: {
      target: "Case : {label}",
      typeSequence: "Tape les caractères dans l'ordre",
      timeUp: "La carte se referme.",
      success: "Le trajet est validé.",
      mission: "Ce n'est pas une seule touche : tape chaque caractère de la coordonnée, dans l'ordre.",
    },
    repair: {
      title: "Message à réparer",
      symbolHint: "symbole manquant",
      timeUp: "Le message reste incomplet.",
      success: "Les messages sont réparés.",
      mission: "Tape uniquement le caractère manquant.",
    },
    relay: {
      title: "Course relais clavier",
      key: "touche directe",
      lives: "Essais",
      timeUp: "Le relais est terminé.",
      lost: "Trop de portes ratées.",
      success: "Le relais est réussi.",
      mission: "Valide la porte avant que le coureur ne la touche.",
    },
    boss: {
      copy: "Recopie exactement",
      memory: "Mémorise la suite",
      comboHint: "Raccourci attendu",
      lives: "Garde",
      preview: "Observe avant de répondre.",
      mission: "Réponds sans erreur : une faute coûte une garde.",
      timeUp: "Le boss tient encore.",
      lost: "Le boss gagne cette manche.",
      success: "Le boss final est vaincu.",
      types: {
        symbol: "Symbole",
        text: "Saisie",
        combo: "Raccourci",
        memory: "Mémoire",
      },
    },
  });

  extendTranslations("en", {
    keyboard: {
      show: "Show keyboard",
      hide: "Collapse keyboard",
    },
    games: {
      duel: { title: "Shortcut Duel", mode: "Method reflex", summary: "An opponent launches actions: block them with the right shortcut before impact.", tag: "Ctrl" },
      shop: { title: "AltGr Shop", mode: "Useful symbols", summary: "Complete customer orders with @, #, €, braces and other rare keys.", tag: "AltGr" },
      flash: { title: "Flash Dictation", mode: "Memory", summary: "Read a line quickly, then type it back when it disappears.", tag: "memo" },
      tower: { title: "Keyboard Tower", mode: "Defense", summary: "Waves move toward the base: type the right label to stop them.", tag: "strategy" },
      coordinates: { title: "Coordinate Map", mode: "Location", summary: "Build coordinates character by character to guide the character.", tag: "coord." },
      repair: { title: "Message Repair", mode: "Correction", summary: "Find the missing character in a sentence and type the correction.", tag: "text" },
      relay: { title: "Relay Race", mode: "Target speed", summary: "Pass gates with the right keys before the runner reaches them.", tag: "race" },
      boss: { title: "Keyboard Final Boss", mode: "Full mix", summary: "Symbols, shortcuts, memory and fast typing in a longer challenge.", tag: "boss" },
    },
    meters: { duels: "Duels", orders: "Orders", defenses: "Defenses", maps: "Maps", gates: "Gates", phases: "Phases" },
    duel: {
      attack: "Incoming action", prompt: "Perform the shortcut before impact.", guard: "Guard", tooSlow: "Too slow", lost: "Your guard broke.", timeUp: "The duel stops.", blocked: "Blocked", received: "Received: {combo}", success: "The duel is won.", mission: "Answer in {seconds} s with the right shortcut.",
    },
    shop: {
      single: "The customer asks for {symbol}", customer: "Customer order", hint: "Hint:", timeUp: "The shop closes.", success: "The orders are served.", mission: "Type the expected character before the customer leaves. Patience: {seconds} s",
    },
    flash: {
      look: "Read now", type: "Type from memory", timeUp: "Flash memory fades.", success: "The lines are memorized.", mission: "Watch, then reproduce the hidden line exactly.",
    },
    tower: {
      base: "BASE", lives: "Base", wait: "Get ready", lost: "The base is overwhelmed.", timeUp: "The wave disperses.", success: "The base holds.", mission: "Type the label closest to the base.",
    },
    coordinates: {
      target: "Tile: {label}", typeSequence: "Type the characters in order", timeUp: "The map closes.", success: "The route is validated.", mission: "It is not one key: type each coordinate character in order.",
    },
    repair: {
      title: "Message to repair", symbolHint: "missing symbol", timeUp: "The message stays incomplete.", success: "The messages are repaired.", mission: "Type only the missing character.",
    },
    relay: {
      title: "Keyboard Relay Race", key: "direct key", lives: "Tries", timeUp: "The relay is over.", lost: "Too many gates missed.", success: "The relay is complete.", mission: "Validate the gate before the runner touches it.",
    },
    boss: {
      copy: "Copy exactly", memory: "Memorize the sequence", comboHint: "Expected shortcut", lives: "Guard", preview: "Watch before answering.", mission: "Answer without mistakes: one error costs one guard.", timeUp: "The boss still stands.", lost: "The boss wins this round.", success: "The final boss is defeated.", types: { symbol: "Symbol", text: "Typing", combo: "Shortcut", memory: "Memory" },
    },
  });

  extendTranslations("es", {
    keyboard: {
      show: "Mostrar teclado",
      hide: "Reducir teclado",
    },
    games: {
      duel: { title: "Duelo de atajos", mode: "Reflejo método", summary: "Un adversario lanza acciones: bloquéalas con el atajo correcto.", tag: "Ctrl" },
      shop: { title: "Tienda AltGr", mode: "Símbolos útiles", summary: "Completa pedidos con @, #, €, llaves y otras teclas raras.", tag: "AltGr" },
      flash: { title: "Dictado flash", mode: "Memoria", summary: "Lee una línea rápido y escríbela cuando desaparece.", tag: "memo" },
      tower: { title: "Torre teclado", mode: "Defensa", summary: "Las oleadas avanzan hacia la base: escribe la etiqueta correcta.", tag: "estrategia" },
      coordinates: { title: "Mapa de coordenadas", mode: "Ubicación", summary: "Compón coordenadas carácter por carácter para guiar al personaje.", tag: "coord." },
      repair: { title: "Reparación de mensaje", mode: "Corrección", summary: "Encuentra el carácter que falta y escribe la corrección.", tag: "texto" },
      relay: { title: "Carrera de relevos", mode: "Velocidad precisa", summary: "Pasa puertas con las teclas correctas antes de llegar.", tag: "carrera" },
      boss: { title: "Boss final teclado", mode: "Mezcla completa", summary: "Símbolos, atajos, memoria y escritura rápida en un reto largo.", tag: "boss" },
    },
    meters: { duels: "Duelos", orders: "Pedidos", defenses: "Defensas", maps: "Mapas", gates: "Puertas", phases: "Fases" },
    duel: {
      attack: "Acción entrante", prompt: "Haz el atajo antes del impacto.", guard: "Guardia", tooSlow: "Demasiado lento", lost: "La guardia se rompe.", timeUp: "El duelo termina.", blocked: "Bloqueado", received: "Recibido: {combo}", success: "El duelo está ganado.", mission: "Responde en {seconds} s con el atajo correcto.",
    },
    shop: {
      single: "El cliente pide {symbol}", customer: "Pedido cliente", hint: "Pista:", timeUp: "La tienda cierra.", success: "Los pedidos están servidos.", mission: "Escribe el carácter esperado antes de que el cliente se vaya. Paciencia: {seconds} s",
    },
    flash: {
      look: "Lee ahora", type: "Escribe de memoria", timeUp: "La memoria flash se apaga.", success: "Las líneas están memorizadas.", mission: "Observa y reproduce exactamente la línea oculta.",
    },
    tower: {
      base: "BASE", lives: "Base", wait: "Prepárate", lost: "La base está superada.", timeUp: "La oleada se dispersa.", success: "La base resiste.", mission: "Escribe la etiqueta más cercana a la base.",
    },
    coordinates: {
      target: "Casilla: {label}", typeSequence: "Escribe los caracteres en orden", timeUp: "El mapa se cierra.", success: "La ruta está validada.", mission: "No es una sola tecla: escribe cada carácter de la coordenada en orden.",
    },
    repair: {
      title: "Mensaje para reparar", symbolHint: "símbolo que falta", timeUp: "El mensaje queda incompleto.", success: "Los mensajes están reparados.", mission: "Escribe solo el carácter que falta.",
    },
    relay: {
      title: "Carrera de relevos teclado", key: "tecla directa", lives: "Intentos", timeUp: "El relevo ha terminado.", lost: "Demasiadas puertas falladas.", success: "El relevo está logrado.", mission: "Valida la puerta antes de que el corredor la toque.",
    },
    boss: {
      copy: "Copia exactamente", memory: "Memoriza la secuencia", comboHint: "Atajo esperado", lives: "Guardia", preview: "Observa antes de responder.", mission: "Responde sin errores: un fallo cuesta una guardia.", timeUp: "El boss aún resiste.", lost: "El boss gana esta ronda.", success: "El boss final está vencido.", types: { symbol: "Símbolo", text: "Escritura", combo: "Atajo", memory: "Memoria" },
    },
  });
})(window.CQ = window.CQ || {});
