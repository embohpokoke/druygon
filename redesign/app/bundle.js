(() => {
  const SPRITE = (dex) => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${dex}.png`;
  const TYPE_COLOR = {
    Normal: "#A8A878",
    Fire: "#F08030",
    Water: "#6890F0",
    Electric: "#F7D02C",
    Grass: "#78C850",
    Ice: "#98D8D8",
    Fighting: "#C03028",
    Poison: "#A040A0",
    Ground: "#E0C068",
    Flying: "#A890F0",
    Psychic: "#F85888",
    Bug: "#A8B820",
    Rock: "#B8A038",
    Ghost: "#705898",
    Dragon: "#7038F8",
    Steel: "#B8B8D0",
    Fairy: "#EE99AC"
  };
  const RARITY = {
    common: { label: "Common", c: "#9aa0b5" },
    uncommon: { label: "Uncommon", c: "#4ADE80" },
    rare: { label: "Rare", c: "#4A9EFF" },
    legendary: { label: "Legendary", c: "#FFCB05" }
  };
  const POKEBALLS = [
    { id: "pokeball", name: "Pok\xE9 Ball", rate: 0.5, price: 100, own: 5, top: "#EE3D34", label: "P" },
    { id: "greatball", name: "Great Ball", rate: 0.7, price: 200, own: 2, top: "#3B6FB5", label: "G" },
    { id: "ultraball", name: "Ultra Ball", rate: 0.88, price: 500, own: 1, top: "#F0C419", label: "U" },
    { id: "masterball", name: "Master Ball", rate: 1, price: 2e3, own: 0, top: "#7C3AED", label: "M" }
  ];
  const REGION_META = {
    curriculum: { name: "Math Plains", tag: "Math", accent: "#FFCB05", accentVar: "--yellow", blurb: "Numbers & problem solving", icon: "sigma" },
    science: { name: "Science Wilds", tag: "Science", accent: "#00D9B8", accentVar: "--teal", blurb: "Living-world wilds", icon: "leaf" },
    compsci: { name: "Digital Circuit", tag: "Compsci", accent: "#8B5CF6", accentVar: "--purple", blurb: "Logic & circuits", icon: "cpu" }
  };
  let REGIONS = null;
  let QUESTIONS = {};
  let _contentReady = false;
  const _callbacks = [];
  function onContentReady(fn) {
    if (_contentReady) {
      fn();
      return;
    }
    _callbacks.push(fn);
  }
  function _notifyReady() {
    _contentReady = true;
    _callbacks.forEach((fn) => fn());
    _callbacks.length = 0;
  }
  async function _fetchRegions() {
    const res = await fetch("/api/content/regions");
    if (!res.ok) throw new Error(`/api/content/regions \u2192 ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    const regions = {};
    for (const [id, r] of Object.entries(data.regions)) {
      const meta = REGION_META[id] || {};
      regions[id] = {
        id,
        name: r.name,
        accent: r.accent || meta.accent,
        accentVar: meta.accentVar || "",
        blurb: meta.blurb || "",
        tag: meta.tag || id,
        icon: meta.icon || "star",
        zones: r.zones.map((z) => ({
          zone: z.zone,
          id: z.id,
          name: z.name,
          topic: z.topic,
          minLevel: z.minLevel,
          mons: z.mons
          // already have .sprite from API
        }))
      };
    }
    return regions;
  }
  async function _fetchQuestions(topic) {
    const res = await fetch(`/api/content/questions?topic=${encodeURIComponent(topic)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.questions : [];
  }
  async function loadContent() {
    try {
      REGIONS = await _fetchRegions();
      const topics = [];
      for (const r of Object.values(REGIONS)) {
        for (const z of r.zones) {
          if (z.topic && !topics.includes(z.topic)) topics.push(z.topic);
        }
      }
      const results = await Promise.all(topics.map((t) => _fetchQuestions(t)));
      topics.forEach((t, i) => {
        if (results[i].length) QUESTIONS[t] = results[i];
      });
      console.log("[data] content loaded \u2014 regions:", Object.keys(REGIONS).length, "| topics:", Object.keys(QUESTIONS).length);
      _notifyReady();
    } catch (err) {
      console.error("[data] loadContent failed:", err);
      REGIONS = REGIONS || _staticFallback();
      _notifyReady();
    }
  }
  function _staticFallback() {
    const mon = (dex, name, type, rarity) => ({ dex, name, type, rarity, sprite: SPRITE(dex) });
    return {
      curriculum: {
        id: "curriculum",
        name: "Dataran Ilmu",
        accent: "#FFCB05",
        accentVar: "--yellow",
        blurb: "Math & literacy plains",
        tag: "Curriculum",
        icon: "sigma",
        zones: [
          { zone: 1, name: "Padang Pemula", topic: "operasi_hitung", minLevel: 1, mons: [mon(19, "Rattata", "Normal", "common"), mon(16, "Pidgey", "Flying", "common"), mon(133, "Eevee", "Normal", "uncommon"), mon(25, "Pikachu", "Electric", "rare")] },
          { zone: 2, name: "Lembah Belajar", topic: "pecahan", minLevel: 6, mons: [mon(52, "Meowth", "Normal", "common"), mon(7, "Squirtle", "Water", "uncommon"), mon(4, "Charmander", "Fire", "uncommon")] },
          { zone: 3, name: "Puncak Cendekia", topic: "geometri", minLevel: 11, mons: [mon(1, "Bulbasaur", "Grass", "common"), mon(65, "Alakazam", "Psychic", "rare"), mon(150, "Mewtwo", "Psychic", "legendary")] }
        ]
      },
      science: {
        id: "science",
        name: "Rimba Sains",
        accent: "#00D9B8",
        accentVar: "--teal",
        blurb: "Living-world wilds",
        tag: "Science",
        icon: "leaf",
        zones: [
          { zone: 1, name: "Tunas Hijau", topic: "makhluk_hidup", minLevel: 1, mons: [mon(43, "Oddish", "Grass", "common"), mon(548, "Petilil", "Grass", "uncommon")] },
          { zone: 2, name: "Sarang Serangga", topic: "serangga_ekosistem", minLevel: 6, mons: [mon(13, "Weedle", "Bug", "common"), mon(637, "Volcarona", "Bug", "legendary")] },
          { zone: 3, name: "Reaktor Mineral", topic: "materi_energi", minLevel: 11, mons: [mon(74, "Geodude", "Rock", "common"), mon(145, "Zapdos", "Electric", "legendary")] }
        ]
      },
      compsci: {
        id: "compsci",
        name: "Sirkuit Digital",
        accent: "#8B5CF6",
        accentVar: "--purple",
        blurb: "Logic & circuits",
        tag: "Compsci",
        icon: "cpu",
        zones: [
          { zone: 1, name: "Gerbang Logika", topic: "urutan_logika", minLevel: 1, mons: [mon(81, "Magnemite", "Electric", "common"), mon(137, "Porygon", "Normal", "uncommon")] },
          { zone: 2, name: "Jaringan", topic: "perulangan_jaringan", minLevel: 6, mons: [mon(233, "Porygon2", "Normal", "uncommon"), mon(479, "Rotom", "Electric", "rare")] },
          { zone: 3, name: "Inti Prosesor", topic: "algoritma_debug", minLevel: 11, mons: [mon(474, "Porygon-Z", "Normal", "rare"), mon(1008, "Miraidon", "Electric", "legendary")] }
        ]
      }
    };
  }
  const FUNFACTS = {
    makhluk_hidup: [
      "Did you know? The oldest tree on Earth is over 4,800 years old \u2014 older than the pyramids!",
      "Did you know? Your body has about 37 trillion cells, all working together every second."
    ],
    serangga_ekosistem: [
      "Did you know? An ant can lift up to 50 times its own body weight!",
      "Did you know? Without bees, many fruits and vegetables would not grow \u2014 they help pollinate."
    ],
    materi_energi: [
      "Did you know? Water can be solid (ice), liquid, and gas (steam) \u2014 same stuff, different states.",
      "Did you know? Sunlight takes about 8 minutes to travel all the way to Earth."
    ],
    atom_dan_unsur: [
      "Did you know? Everything is made of atoms \u2014 so tiny you can never see one with your eyes.",
      "Did you know? Gold and iron are both elements, but their atoms are different kinds."
    ],
    galaksi_dan_angkasa: [
      "Did you know? Our galaxy, the Milky Way, has more than 100 billion stars.",
      "Did you know? One day on Venus is longer than one whole year on Venus!"
    ],
    urutan_logika: [
      "Did you know? Computers understand only two numbers: 0 and 1 \u2014 that is called binary.",
      "Did you know? An algorithm is just a list of steps in order, like a cooking recipe."
    ],
    perulangan_jaringan: [
      "Did you know? A loop lets a computer repeat a task thousands of times without getting tired.",
      "Did you know? The internet is millions of computers all connected around the world."
    ],
    algoritma_debug: [
      'Did you know? The first computer "bug" was a real moth stuck inside the machine!',
      "Did you know? Debugging means finding and fixing mistakes in code."
    ],
    jaringan_dunia: [
      "Did you know? Wi-Fi sends data using radio waves, a lot like how a radio works.",
      "Did you know? Always keep your password secret \u2014 never share it with anyone."
    ],
    kecerdasan_buatan: [
      "Did you know? AI learns from lots of examples, kind of like how you learn from practice.",
      "Did you know? AI can make mistakes too \u2014 so always double-check its answers."
    ]
  };
  function funFactForTopic(topic) {
    const list = FUNFACTS[topic];
    if (!list || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }
  function useContent() {
    const [ready, setReady] = React.useState(_contentReady);
    React.useEffect(() => {
      if (_contentReady) {
        setReady(true);
        return;
      }
      onContentReady(() => setReady(true));
    }, []);
    return { regions: REGIONS, questions: QUESTIONS, ready };
  }
  loadContent();
  Object.assign(window, {
    SPRITE,
    TYPE_COLOR,
    RARITY,
    POKEBALLS,
    REGION_META,
    FUNFACTS,
    funFactForTopic,
    // Live-updated refs — components read these after ready
    get REGIONS() {
      return REGIONS;
    },
    get QUESTIONS() {
      return QUESTIONS;
    },
    useContent,
    onContentReady,
    loadContent
  });
  const ICONS = {
    home: "M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5",
    map: "M9 4 3 6v15l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v15m6-13v15",
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    bag: "M5 8h14l-1.2 11.5a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Zm3.5 0V6.5a3.5 3.5 0 0 1 7 0V8",
    user: "M5 20v-1.5A4.5 4.5 0 0 1 9.5 14h5a4.5 4.5 0 0 1 4.5 4.5V20M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    back: "M15 5l-7 7 7 7",
    arrowR: "M5 12h14M13 6l6 6-6 6",
    coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v10M9.2 9.6h4a1.6 1.6 0 0 1 0 3.2h-2.2a1.6 1.6 0 0 0 0 3.2h4",
    lock: "M6 11h12v9H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11",
    check: "M4 12.5 9 17.5 20 6.5",
    star: "M12 3l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 17.8 6.2 21l1.5-6.5-5-4.4 6.6-.6Z",
    zap: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
    flag: "M5 21V4h11l-2 4 2 4H5",
    hint: "M12 3a6 6 0 0 1 4 10.5c-.8.8-1 1.6-1 2.5H9c0-.9-.2-1.7-1-2.5A6 6 0 0 1 12 3ZM9.5 19.5h5M10.5 22h3",
    x: "M6 6l12 12M18 6 6 18",
    plus: "M12 5v14M5 12h14",
    sparkles: "M12 3l1.8 4.8L18.5 9l-4.7 1.2L12 15l-1.8-4.8L5.5 9l4.7-1.2L12 3ZM18 14l.9 2.4 2.4.9-2.4.9L18 21l-.9-2.4-2.4-.9 2.4-.9L18 14Z",
    flame: "M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c2 1.5 3 3.5 3 5.5a5 5 0 0 1-10 0C7 12 11 9 12 3Z",
    sigma: "M6 4h12M6 4l7 8-7 8h12v-3",
    leaf: "M5 19c0-8 6-13 14-13 0 9-5 14-13 14M5 19c2-4 5-6 9-7",
    cpu: "M7 7h10v10H7zM10 10h4v4h-4zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3",
    users: "M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 11a3.5 3.5 0 0 0 0-7M21 20v-1.5a4 4 0 0 0-3-3.8",
    archive: "M4 7h16v3H4zM5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9M9.5 14h5M4 7l1.5-3h13L20 7",
    chart: "M5 21V9M12 21V4M19 21v-7M3 21h18",
    target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
    send: "M5 12h14M13 6l6 6-6 6",
    volume: "M4 9v6h4l5 4V5L8 9H4ZM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12",
    volumeOff: "M4 9v6h4l5 4V5L8 9H4ZM17 9l4 6M21 9l-4 6"
  };
  const FILLED = /* @__PURE__ */ new Set(["star"]);
  function Icon({ name, size = 22, color = "currentColor", sw = 1.7, style }) {
    return /* @__PURE__ */ React.createElement(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: FILLED.has(name) ? color : "none",
        stroke: color,
        strokeWidth: sw,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        style: { flexShrink: 0, ...style }
      },
      /* @__PURE__ */ React.createElement("path", { d: ICONS[name] || ICONS.target })
    );
  }
  const POKEBALL_IMG = {
    pokeball: "/images/pokeballs/pokeball.png",
    greatball: "/images/pokeballs/greatball.png",
    ultraball: "/images/pokeballs/ultraball.png",
    masterball: "/images/pokeballs/masterball.png"
  };
  function Pokeball({ size = 30, top = "#EE3D34", id, style }) {
    if (id && POKEBALL_IMG[id]) {
      return /* @__PURE__ */ React.createElement(
        "img",
        {
          src: POKEBALL_IMG[id],
          width: size,
          height: size,
          alt: id,
          style: { objectFit: "contain", flexShrink: 0, ...style }
        }
      );
    }
    return /* @__PURE__ */ React.createElement("div", { className: "pokeball", style: { width: size, height: size, "--ball-top": top, ...style } });
  }
  const AVATAR = "/assets/druygon-avatar.png";
  const TUTOR_URL = "https://draco.druygon.my.id/";
  function openTutor(topic) {
    try {
      window.open(TUTOR_URL + (topic ? "?topic=" + encodeURIComponent(topic) : ""), "_blank");
    } catch (e) {
    }
  }
  const PARTNERS = {
    Dru: { dex: 25, mon: "Pikachu", color: "#FFCB05", title: "Electric Trainer" },
    Oming: { dex: 4, mon: "Charmander", color: "#FF6B2B", title: "Fire Trainer" },
    Reymar: { dex: 7, mon: "Squirtle", color: "#4A9EFF", title: "Water Trainer" },
    Ilyas: { dex: 1, mon: "Bulbasaur", color: "#4ADE80", title: "Grass Trainer" },
    Kai: { dex: 133, mon: "Eevee", color: "#F472B6", title: "Rookie Trainer" }
  };
  function playerIdentity(name) {
    return PARTNERS[name] || { dex: 133, mon: "Eevee", color: "#8B5CF6", title: "Trainer" };
  }
  const SLOT_COLORS = ["#FFCB05", "#FF6B2B", "#4A9EFF", "#4ADE80"];
  const SLOT_NAMES = ["Dru", "Oming", "Reymar", "Ilyas"];
  const SFX = (() => {
    const LS = "druygon-sfx";
    let ctx = null;
    let on = true;
    try {
      on = localStorage.getItem(LS) !== "off";
    } catch (e) {
    }
    function ac() {
      if (!ctx) {
        try {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
        }
      }
      if (ctx && ctx.state === "suspended") {
        try {
          ctx.resume();
        } catch (e) {
        }
      }
      return ctx;
    }
    function tone(freq, t0, dur, type, vol, slide) {
      const c = ac();
      if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, c.currentTime + t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + t0 + dur);
      g.gain.setValueAtTime(vol || 0.1, c.currentTime + t0);
      g.gain.exponentialRampToValueAtTime(1e-4, c.currentTime + t0 + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(c.currentTime + t0);
      o.stop(c.currentTime + t0 + dur + 0.02);
    }
    const bank = {
      correct() {
        tone(660, 0, 0.09, "square", 0.1);
        tone(880, 0.09, 0.14, "square", 0.1);
      },
      wrong() {
        tone(180, 0, 0.2, "sawtooth", 0.07);
      },
      throw() {
        tone(280, 0, 0.3, "sine", 0.09, 900);
      },
      catch() {
        [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.14, "square", 0.1));
      },
      levelup() {
        [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.12, "triangle", 0.11));
      },
      combo() {
        tone(740, 0, 0.07, "square", 0.09);
        tone(988, 0.07, 0.1, "square", 0.09);
      },
      click() {
        tone(520, 0, 0.05, "sine", 0.05);
      }
    };
    return {
      isOn: () => on,
      setOn(v) {
        on = !!v;
        try {
          localStorage.setItem(LS, on ? "on" : "off");
        } catch (e) {
        }
      },
      play(name) {
        if (!on) return;
        try {
          (bank[name] || bank.click)();
        } catch (e) {
        }
      }
    };
  })();
  function SlotAvatar({ name, size = 36, active = false }) {
    const idn = playerIdentity(name);
    return /* @__PURE__ */ React.createElement("div", { style: {
      width: size,
      height: size,
      borderRadius: "50%",
      flexShrink: 0,
      background: idn.color + "1e",
      border: active ? `2.5px solid ${idn.color}` : "2.5px solid rgba(255,255,255,.1)",
      boxShadow: active ? `0 0 0 2px #0b0a16, 0 0 10px ${idn.color}88` : "none",
      overflow: "hidden",
      transition: "box-shadow .15s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    } }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: SPRITE(idn.dex),
        width: size - 6,
        height: size - 6,
        alt: name || "?",
        crossOrigin: "anonymous",
        style: { objectFit: "contain", display: "block" }
      }
    ));
  }
  function PlayerPicker({ allSlots, activeSlot, onSelect, onClose, isFirstLaunch }) {
    const [picked, setPicked] = React.useState(null);
    React.useEffect(() => {
      if (isFirstLaunch) return void 0;
      const closeOnEscape = (event) => {
        if (event.key === "Escape") onClose();
      };
      document.addEventListener("keydown", closeOnEscape);
      return () => document.removeEventListener("keydown", closeOnEscape);
    }, [isFirstLaunch, onClose]);
    const slots = allSlots && allSlots.length > 0 ? allSlots : SLOT_NAMES.map((n, i) => ({ slot: i + 1, name: n, level: 1, caughtCount: 0, coins: 0 }));
    const pick = (s) => {
      if (picked != null) return;
      SFX.play("click");
      setPicked(s.slot);
      setTimeout(() => onSelect(s.slot), 420);
    };
    const stars = [
      { top: 70, left: 36, s: 4, d: "2.6s", dl: "0s" },
      { top: 130, right: 52, s: 3, d: "3.4s", dl: ".6s" },
      { top: 44, right: 120, s: 2, d: "2.2s", dl: "1.1s" },
      { bottom: 150, left: 24, s: 3, d: "3s", dl: ".3s" },
      { top: 220, left: 60, s: 2, d: "2.8s", dl: ".9s" }
    ];
    return /* @__PURE__ */ React.createElement("div", { className: "player-picker-overlay", role: "presentation", style: {
      position: "fixed",
      inset: 0,
      zIndex: 1e3,
      background: "radial-gradient(130% 100% at 50% -12%, #1b1540 0%, #0d0b20 55%, #080714 100%)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }, onClick: isFirstLaunch ? void 0 : onClose }, stars.map((st, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      position: "absolute",
      top: st.top,
      left: st.left,
      right: st.right,
      bottom: st.bottom,
      width: st.s,
      height: st.s,
      borderRadius: "50%",
      background: "#F0EEFF",
      animation: `twinkle ${st.d} ease-in-out ${st.dl} infinite`
    } })), /* @__PURE__ */ React.createElement("div", { className: "pokeball", style: { position: "absolute", top: 96, right: -26, width: 120, height: 120, opacity: 0.09, animation: "floaty 5s ease-in-out infinite", "--ball-top": "#EE3D34" } }), /* @__PURE__ */ React.createElement("div", { className: "pokeball", style: { position: "absolute", bottom: 60, left: -34, width: 150, height: 150, opacity: 0.07, animation: "floaty 6.5s ease-in-out 1s infinite", "--ball-top": "#7C3AED" } }), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "player-picker-dialog",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "player-picker-title",
        style: { flex: 1, display: "flex", flexDirection: "column", padding: "52px 20px 20px", overflowY: "auto", position: "relative", zIndex: 1, width: "100%", maxWidth: 480, margin: "0 auto" },
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 9, animation: "riseIn .5s cubic-bezier(0.16,1,0.3,1) both" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 8, height: 8, borderRadius: "50%", background: "#FFCB05", boxShadow: "0 0 24px rgba(255,203,5,.4)", animation: "pulseDot 2s ease-in-out infinite" } }), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-game)", fontSize: 15, color: "#FFCB05", letterSpacing: ".08em", textShadow: "0 0 14px rgba(255,203,5,.5)" } }, "DRUYGON")),
      /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", fontSize: 10, fontWeight: 700, letterSpacing: ".22em", color: "var(--text-tertiary)", marginTop: 10, animation: "riseIn .5s cubic-bezier(0.16,1,0.3,1) .08s both" } }, "LEARNING \xB7 GAME PORTAL"),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "flex-start", marginTop: 30, animation: "riseIn .55s cubic-bezier(0.16,1,0.3,1) .15s both" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { id: "player-picker-title", style: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 27, letterSpacing: "-.02em", lineHeight: 1.15 } }, isFirstLaunch ? "Choose your character" : "Choose character"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--text-secondary)", marginTop: 7 } }, "Who's playing today?")), !isFirstLaunch && /* @__PURE__ */ React.createElement("button", { "aria-label": "Close player picker", onClick: onClose, style: {
        width: 36,
        height: 36,
        borderRadius: "50%",
        flexShrink: 0,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-medium)",
        cursor: "pointer",
        color: "var(--text-secondary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      } }, /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 16 }))),
      /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13, marginTop: 22 } }, slots.map((s, i) => {
        const idn = playerIdentity(s.name);
        const isPicked = picked === s.slot;
        const dimmed = picked != null && !isPicked;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: s.slot,
            "aria-label": `Choose player ${s.name}`,
            onClick: () => pick(s),
            style: {
              position: "relative",
              borderRadius: 20,
              overflow: "hidden",
              padding: "18px 12px 16px",
              cursor: "pointer",
              isolation: "isolate",
              textAlign: "center",
              background: `linear-gradient(160deg, ${idn.color}22, var(--bg-card) 65%)`,
              border: isPicked ? `2px solid ${idn.color}` : "1px solid rgba(255,255,255,.08)",
              boxShadow: isPicked ? `0 0 30px ${idn.color}55, var(--card-shadow)` : "var(--card-shadow)",
              opacity: dimmed ? 0.25 : 1,
              transform: isPicked ? "scale(1.04)" : dimmed ? "scale(.95)" : "none",
              transition: "transform .35s cubic-bezier(0.16,1,0.3,1), opacity .35s, border-color .2s, box-shadow .35s",
              animation: `cardIn .55s cubic-bezier(0.16,1,0.3,1) ${0.25 + i * 0.09}s both`,
              color: "var(--text-primary)"
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", width: 120, height: 120, borderRadius: "50%", top: -38, right: -30, background: `radial-gradient(circle, ${idn.color}, transparent 68%)`, opacity: 0.25, zIndex: -1 } }),
          /* @__PURE__ */ React.createElement("div", { style: { position: "relative", display: "flex", justifyContent: "center" } }, /* @__PURE__ */ React.createElement(
            "img",
            {
              src: SPRITE(idn.dex),
              alt: idn.mon,
              width: 84,
              height: 84,
              crossOrigin: "anonymous",
              style: { objectFit: "contain", animation: `floaty ${3 + i * 0.4}s ease-in-out ${i * 0.3}s infinite` }
            }
          )),
          /* @__PURE__ */ React.createElement("div", { style: { position: "relative", marginTop: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, letterSpacing: "-.01em" } }, s.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: idn.color, marginTop: 2 } }, idn.title), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", gap: 6, marginTop: 9 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: idn.color, color: "#0b0a16" } }, "Lv ", s.level), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", color: "var(--text-secondary)" } }, s.caughtCount, " caught"))),
          s.slot === activeSlot && !isFirstLaunch && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 8, right: 8, background: idn.color, borderRadius: 6, fontSize: 8, fontWeight: 700, color: "#0b0a16", padding: "2px 6px", letterSpacing: 0.5 } }, "AKTIF")
        );
      })),
      /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", fontSize: 11, color: "var(--text-tertiary)", marginTop: "auto", paddingTop: 18, animation: "fadeIn .8s .9s both" } }, "Progress is saved separately for each trainer.")
    ));
  }
  function PickSplash({ name }) {
    const idn = playerIdentity(name);
    return /* @__PURE__ */ React.createElement("div", { style: {
      position: "fixed",
      inset: 0,
      zIndex: 1100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "fadeIn .3s",
      background: `radial-gradient(110% 90% at 50% 40%, ${idn.color}33, #0a0818 70%)`
    } }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 190, height: 190, borderRadius: "50%", position: "absolute", top: -20, animation: "ringPulse 1.1s ease-out infinite" } }), /* @__PURE__ */ React.createElement(
      "img",
      {
        src: SPRITE(idn.dex),
        alt: idn.mon,
        width: 150,
        height: 150,
        crossOrigin: "anonymous",
        style: { objectFit: "contain", animation: "pop .55s cubic-bezier(0.34,1.56,0.64,1) both" }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, letterSpacing: "-.01em", marginTop: 16, animation: "riseIn .4s .15s both" } }, "Let's go, ", name, "!"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--text-secondary)", animation: "riseIn .4s .3s both" } }, "Loading your world\u2026")));
  }
  function DracoSheet({ open, onClose, ctx, playerName }) {
    const [msgs, setMsgs] = React.useState([]);
    const [typing, setTyping] = React.useState(false);
    const timers = React.useRef([]);
    const later = (fn, ms) => {
      timers.current.push(setTimeout(fn, ms));
    };
    React.useEffect(() => {
      if (!open) return void 0;
      const name = playerName || "Trainer";
      setMsgs([{ who: "draco", text: ctx ? `Hi ${name}! Stuck on a question in ${ctx.zoneName}? Don't worry, I've got you. \u{1F409}` : `Hi ${name}! I'm Draco, your AI tutor. I give hints, not straight answers \u2014 so YOU become the champ. \u{1F409}` }]);
      setTyping(false);
      return () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
      };
    }, [open]);
    React.useEffect(() => {
      if (!open) return void 0;
      const closeOnEscape = (e) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", closeOnEscape);
      return () => document.removeEventListener("keydown", closeOnEscape);
    }, [open, onClose]);
    if (!open) return null;
    const pushDraco = (text) => {
      setTyping(true);
      later(() => {
        setTyping(false);
        setMsgs((m) => [...m, { who: "draco", text }]);
      }, 750);
    };
    const giveHint = () => {
      SFX.play("click");
      setMsgs((m) => [...m, { who: "me", text: "Give me a hint \u{1F4A1}" }]);
      pushDraco(ctx && ctx.hint ? ctx.hint : "Open a zone first, then ask me while you're on a question \u2014 I always know which one you're facing!");
    };
    const openFullTutor = () => {
      SFX.play("click");
      openTutor(ctx ? ctx.topic : void 0);
    };
    return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 900, display: "flex", flexDirection: "column", justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement("div", { onClick: onClose, style: { position: "absolute", inset: 0, background: "rgba(8,7,20,.7)", animation: "fadeIn .25s" } }), /* @__PURE__ */ React.createElement("div", { role: "dialog", "aria-modal": "true", "aria-label": "Draco AI tutor", style: {
      position: "relative",
      maxHeight: "76%",
      background: "var(--bg-surface)",
      borderRadius: "24px 24px 0 0",
      borderTop: "1px solid rgba(139,92,246,.4)",
      display: "flex",
      flexDirection: "column",
      animation: "sheetUp .35s cubic-bezier(0.16,1,0.3,1)",
      overflow: "hidden",
      width: "100%",
      maxWidth: 480,
      margin: "0 auto"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", padding: "10px 0 4px" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 38, height: 4, borderRadius: 999, background: "rgba(255,255,255,.18)" } })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 11, padding: "6px 16px 12px", borderBottom: "1px solid var(--border-subtle)" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 42, height: 42, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #8B5CF6, #4A9EFF)", boxShadow: "0 0 16px rgba(139,92,246,.4)" } }, /* @__PURE__ */ React.createElement(Icon, { name: "sparkles", size: 22, color: "#fff" })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("b", { style: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, display: "block" } }, "Draco"), /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--green)" } }, /* @__PURE__ */ React.createElement("i", { style: { width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" } }), "AI Tutor \xB7 online")), /* @__PURE__ */ React.createElement("button", { "aria-label": "Close Draco", onClick: onClose, style: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-elevated)", border: "1px solid var(--border-medium)", color: "var(--text-secondary)", cursor: "pointer" } }, /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 15 }))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, minHeight: 120 } }, ctx && ctx.question && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", padding: "2px 12px" } }, "Soal: \u201C", ctx.question, "\u201D"), msgs.map((m, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", justifyContent: m.who === "me" ? "flex-end" : "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: m.who === "me" ? { maxWidth: "80%", background: "rgba(139,92,246,.16)", border: "1px solid rgba(139,92,246,.4)", borderRadius: "16px 16px 4px 16px", padding: "10px 14px", fontSize: 13, lineHeight: 1.5 } : { maxWidth: "85%", background: "var(--bg-card)", border: "1px solid rgba(139,92,246,.3)", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", fontSize: 13, lineHeight: 1.5 } }, m.text))), typing && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "var(--bg-card)", border: "1px solid rgba(139,92,246,.3)", borderRadius: "16px 16px 16px 4px", padding: "12px 16px", display: "flex", gap: 5 } }, /* @__PURE__ */ React.createElement("i", { style: { width: 6, height: 6, borderRadius: "50%", background: "#8B5CF6", animation: "dotHop 1.2s infinite" } }), /* @__PURE__ */ React.createElement("i", { style: { width: 6, height: 6, borderRadius: "50%", background: "#8B5CF6", animation: "dotHop 1.2s .15s infinite" } }), /* @__PURE__ */ React.createElement("i", { style: { width: 6, height: 6, borderRadius: "50%", background: "#8B5CF6", animation: "dotHop 1.2s .3s infinite" } })))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, padding: "10px 16px calc(16px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap" } }, ctx && ctx.hint && /* @__PURE__ */ React.createElement("button", { onClick: giveHint, style: { padding: "9px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, border: "1px solid rgba(139,92,246,.45)", background: "transparent", color: "#B79BFF", cursor: "pointer" } }, "\u{1F4A1} Kasih petunjuk"), /* @__PURE__ */ React.createElement("button", { onClick: openFullTutor, style: { padding: "9px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "none", background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#fff", cursor: "pointer", marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 } }, "Chat lengkap dengan Draco ", /* @__PURE__ */ React.createElement(Icon, { name: "arrowR", size: 14 })))));
  }
  function Header({ region, title, sub, onBack, coins, playerName, onAvatarTap, onOpenDraco }) {
    const idn = playerIdentity(playerName);
    return /* @__PURE__ */ React.createElement("div", { className: "appbar" }, onBack && /* @__PURE__ */ React.createElement("button", { className: "appbar-back", onClick: onBack }, /* @__PURE__ */ React.createElement(Icon, { name: "back", size: 20 })), title ? /* @__PURE__ */ React.createElement("div", { className: "appbar-title" }, title, sub && /* @__PURE__ */ React.createElement("small", null, sub)) : /* @__PURE__ */ React.createElement("div", { className: "appbar-logo" }, "DRUYGON"), /* @__PURE__ */ React.createElement("button", { className: "appbar-draco", onClick: () => onOpenDraco ? onOpenDraco(null) : openTutor(), title: "Ask Draco \u2014 AI tutor" }, /* @__PURE__ */ React.createElement(Icon, { name: "hint", size: 15 }), " Draco"), /* @__PURE__ */ React.createElement("div", { className: "coin-chip" }, /* @__PURE__ */ React.createElement(Icon, { name: "coin", size: 15, color: "var(--yellow)" }), " ", (coins != null ? coins : 0).toLocaleString()), /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": "Switch player. Active player: " + (playerName || "none"),
        onClick: onAvatarTap,
        style: {
          background: idn.color + "1e",
          border: `2px solid ${idn.color}`,
          padding: 0,
          cursor: "pointer",
          borderRadius: "50%",
          lineHeight: 0,
          overflow: "hidden",
          width: 38,
          height: 38,
          flexShrink: 0,
          boxShadow: `0 0 0 2px rgba(255,255,255,.05), 0 0 14px ${idn.color}66`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        },
        title: "Player: " + (playerName || "Choose character")
      },
      /* @__PURE__ */ React.createElement(
        "img",
        {
          src: SPRITE(idn.dex),
          width: 30,
          height: 30,
          crossOrigin: "anonymous",
          alt: playerName || "Trainer",
          style: { objectFit: "contain", display: "block" }
        }
      )
    ));
  }
  function BottomNav({ active, go }) {
    const items = [
      ["home", "home", "Home"],
      ["map", "map", "Map"],
      ["collection", "grid", "Collection"],
      ["store", "bag", "Shop"],
      ["profile", "user", "Profile"]
    ];
    return /* @__PURE__ */ React.createElement("div", { className: "nav" }, items.map(([id, ic, label]) => /* @__PURE__ */ React.createElement("button", { key: id, className: "nav-slot" + (active === id ? " on" : ""), onClick: () => {
      SFX.play("click");
      go(id);
    } }, /* @__PURE__ */ React.createElement("span", { className: "nav-ico" }, /* @__PURE__ */ React.createElement(Icon, { name: ic, size: 22 })), /* @__PURE__ */ React.createElement("span", null, label))));
  }
  Object.assign(window, {
    Icon,
    Pokeball,
    Header,
    BottomNav,
    SlotAvatar,
    PlayerPicker,
    PickSplash,
    DracoSheet,
    AVATAR,
    openTutor,
    TUTOR_URL,
    SLOT_COLORS,
    SLOT_NAMES,
    PARTNERS,
    playerIdentity,
    SFX
  });
  const { useState: uS1, useRef: uR1, useEffect: uE1 } = React;
  const PLAYER = { name: "Dru", level: 7, xpPct: 62 };
  const RANK = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
  function weightedPick(mons) {
    if (!mons || mons.length === 0) return null;
    const weights = mons.map((m) => {
      switch (m.rarity) {
        case "legendary":
          return 2;
        case "rare":
          return 8;
        case "uncommon":
          return 20;
        default:
          return 70;
      }
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < mons.length; i++) {
      r -= weights[i];
      if (r <= 0) return mons[i];
    }
    return mons[mons.length - 1];
  }
  const rarest = (mons) => mons.reduce((a, b) => RANK[b.rarity] > RANK[a.rarity] ? b : a, mons[0]);
  const zoneState = (z, profile = PLAYER, caught = [], progress = [], allZones = []) => {
    if (!z) return "locked";
    const prog = progress.find((p) => p.zoneId === z.id);
    if ((prog == null ? void 0 : prog.status) === "cleared") return "cleared";
    const zoneCaught = caught.filter((c) => c.zoneId === z.id);
    if (new Set(zoneCaught.map((c) => c.dex)).size >= 2) return "cleared";
    const prevZone = (allZones || []).find((x) => x.zone === z.zone - 1);
    let prevCleared = !prevZone;
    if (prevZone) {
      const prevProg = progress.find((p) => p.zoneId === prevZone.id);
      if ((prevProg == null ? void 0 : prevProg.status) === "cleared") prevCleared = true;
      else {
        const prevCaught = caught.filter((c) => c.zoneId === prevZone.id);
        if (new Set(prevCaught.map((c) => c.dex)).size >= 2) prevCleared = true;
      }
    }
    if (prevCleared) return "open";
    return "locked";
  };
  function ContentLoading() {
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim" }, /* @__PURE__ */ React.createElement("div", { className: "pad", style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16, color: "var(--text-secondary)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32 } }, "\u26A1"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-display)", fontSize: 14 } }, "Loading world data\u2026")));
  }
  function Home({ go, caught, coins, profile, playerName, allSlots, activeSlot, progress, dailyMission, badges, onClaimMission, onOpenDraco }) {
    var _a;
    const { regions, ready } = useContent();
    if (!ready || !regions) return /* @__PURE__ */ React.createElement(ContentLoading, null);
    const order = ["curriculum", "science", "compsci"].filter((id) => regions[id]);
    const level = (_a = profile == null ? void 0 : profile.level) != null ? _a : PLAYER.level;
    const xpPct = profile && profile.xpToNext > 0 ? Math.round(profile.xp / profile.xpToNext * 100) : PLAYER.xpPct;
    const name = playerName || "Trainer";
    const idn = playerIdentity(playerName);
    const prog = Object.fromEntries(order.map((id) => {
      const r = regions[id];
      const cleared = r.zones.filter((z) => zoneState(z, profile, caught, progress, r.zones) === "cleared").length;
      return [id, cleared];
    }));
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim" }, /* @__PURE__ */ React.createElement("div", { className: "pad" }, /* @__PURE__ */ React.createElement("div", { className: "hero", "data-region": "compsci" }, /* @__PURE__ */ React.createElement("div", { className: "hero-bg", style: { background: `radial-gradient(130% 130% at 88% -20%, ${idn.color}55, transparent 55%), radial-gradient(90% 120% at 0% 120%, rgba(74,158,255,.28), transparent 60%), linear-gradient(160deg, #1b1540, #0c0a1e 72%)` } }), /* @__PURE__ */ React.createElement("div", { className: "hero-glow", style: { background: `radial-gradient(circle, ${idn.color}66, transparent 65%)` } }), /* @__PURE__ */ React.createElement(
      "img",
      {
        src: SPRITE(idn.dex),
        alt: idn.mon,
        width: 92,
        height: 92,
        crossOrigin: "anonymous",
        style: { position: "absolute", right: 6, top: 4, objectFit: "contain", opacity: 0.9, zIndex: -1, animation: "floaty 3.5s ease-in-out infinite", filter: "drop-shadow(0 8px 14px rgba(0,0,0,.5))" }
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "hero-top" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "hero-greet" }, "Hi, ", /* @__PURE__ */ React.createElement("b", { style: { color: idn.color } }, name), " \u{1F44B}"), /* @__PURE__ */ React.createElement("div", { className: "hero-sub" }, idn.title, " \xB7 ", caught.length, " caught \xB7 keep the streak!")), /* @__PURE__ */ React.createElement("div", { className: "hero-lvl", style: { background: idn.color } }, "LVL ", level)), /* @__PURE__ */ React.createElement("div", { className: "hero-xp" }, /* @__PURE__ */ React.createElement("small", null, "XP"), /* @__PURE__ */ React.createElement("div", { className: "meter", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("i", { style: { width: xpPct + "%", background: `linear-gradient(90deg, ${idn.color}, #FF6B2B)` } }))), /* @__PURE__ */ React.createElement("div", { className: "hero-stats" }, /* @__PURE__ */ React.createElement("div", { className: "hero-stat" }, /* @__PURE__ */ React.createElement("b", { style: { color: idn.color } }, level), /* @__PURE__ */ React.createElement("span", null, "Level")), /* @__PURE__ */ React.createElement("div", { className: "hero-stat" }, /* @__PURE__ */ React.createElement("b", { style: { color: idn.color } }, (coins != null ? coins : 0).toLocaleString()), /* @__PURE__ */ React.createElement("span", null, "Coins")), /* @__PURE__ */ React.createElement("div", { className: "hero-stat" }, /* @__PURE__ */ React.createElement("b", { style: { color: idn.color } }, caught.length), /* @__PURE__ */ React.createElement("span", null, "Caught")))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          window.location.href = "https://cody.druygon.my.id/?slot=" + activeSlot;
        },
        style: {
          width: "100%",
          marginTop: 14,
          borderRadius: 20,
          overflow: "hidden",
          padding: 0,
          display: "grid",
          gridTemplateColumns: "78px 1fr 34px",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
          textAlign: "left",
          color: "#F7F5FF",
          position: "relative",
          background: "linear-gradient(120deg, #23204F 0%, #34266E 58%, #4A35A8 100%)",
          border: "1px solid rgba(46,201,192,.34)",
          boxShadow: "var(--card-shadow)"
        },
        "aria-label": "Buka DruCode, modul belajar coding"
      },
      /* @__PURE__ */ React.createElement("div", { style: { height: 92, display: "grid", placeItems: "center", background: "rgba(46,201,192,.12)" } }, /* @__PURE__ */ React.createElement(Icon, { name: "cpu", size: 34, color: "#64E0D8" })),
      /* @__PURE__ */ React.createElement("div", { style: { padding: "14px 0" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("b", { style: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17 } }, "DruCode"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, fontWeight: 800, letterSpacing: ".08em", color: "#1A4744", background: "#65E4DC", padding: "3px 8px", borderRadius: 999 } }, "MODUL BARU")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "rgba(247,245,255,.7)", marginTop: 5, lineHeight: 1.45 } }, "Belajar blok visual, Python, dan web bersama Robo.")),
      /* @__PURE__ */ React.createElement(Icon, { name: "arrowR", size: 18, color: "#F7F5FF" })
    ), /* @__PURE__ */ React.createElement("div", { onClick: () => onOpenDraco && onOpenDraco(null), style: { position: "relative", marginTop: 14, borderRadius: 20, overflow: "hidden", padding: 16, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", isolation: "isolate", background: "linear-gradient(120deg, #241a4d 0%, #16123a 55%, #101030 100%)", border: "1px solid rgba(139,92,246,.35)", boxShadow: "var(--card-shadow)" } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", width: 150, height: 150, borderRadius: "50%", right: -40, top: -50, background: "radial-gradient(circle, rgba(139,92,246,.4), transparent 68%)", zIndex: -1 } }), /* @__PURE__ */ React.createElement("div", { style: { width: 56, height: 56, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #8B5CF6, #4A9EFF)", boxShadow: "0 0 20px rgba(139,92,246,.45)", animation: "floaty 3.5s ease-in-out infinite" } }, /* @__PURE__ */ React.createElement(Icon, { name: "sparkles", size: 28, color: "#fff" })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 7 } }, /* @__PURE__ */ React.createElement("b", { style: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 } }, "Draco"), /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 700, letterSpacing: ".08em", color: "var(--green)", background: "rgba(74,222,128,.12)", padding: "2px 7px", borderRadius: 999 } }, /* @__PURE__ */ React.createElement("i", { style: { width: 5, height: 5, borderRadius: "50%", background: "var(--green)", display: "inline-block" } }), "AI TUTOR")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "rgba(240,238,255,.65)", marginTop: 3, lineHeight: 1.4 } }, "Stuck on a question? Ask me \u2014 science, code, or homework.")), /* @__PURE__ */ React.createElement("div", { style: { width: 34, height: 34, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(139,92,246,.2)", border: "1px solid rgba(139,92,246,.5)", color: "#B79BFF" } }, /* @__PURE__ */ React.createElement(Icon, { name: "arrowR", size: 17 }))), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Choose a world")), /* @__PURE__ */ React.createElement("div", { className: "regions" }, order.map((id) => {
      const r = regions[id];
      const next = r.zones.find((z) => zoneState(z, profile, caught, progress, r.zones) !== "cleared") || r.zones[r.zones.length - 1];
      return /* @__PURE__ */ React.createElement("div", { key: id, className: "region-card", "data-region": id, style: { "--rc": r.accent, "--rc-soft": "var(--accent-soft)" }, onClick: () => go("map", id) }, /* @__PURE__ */ React.createElement("div", { className: "region-glow" }), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, zIndex: -1, background: `linear-gradient(90deg, rgba(10,8,24,.88) 0%, rgba(10,8,24,.35) 60%, rgba(10,8,24,.12) 100%), url(assets/regions/${id}-hero.jpg)`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" } }), /* @__PURE__ */ React.createElement("div", { className: "region-emblem", style: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement(Icon, { name: r.icon, size: 30 }), /* @__PURE__ */ React.createElement(
        "img",
        {
          src: "assets/regions/" + id + "-icon.png",
          alt: "",
          width: 42,
          height: 42,
          style: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", objectFit: "contain" },
          onError: function(e) {
            e.target.remove();
          }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "region-main" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "region-name" }, r.name), /* @__PURE__ */ React.createElement("div", { className: "region-tag" }, r.blurb, " \xB7 next: ", next.name)), /* @__PURE__ */ React.createElement("div", { className: "region-foot" }, /* @__PURE__ */ React.createElement("b", null, prog[id], "/", r.zones.length, " zones"), /* @__PURE__ */ React.createElement("div", { className: "region-mons" }, r.zones[0].mons.slice(0, 3).map((m) => /* @__PURE__ */ React.createElement("img", { key: m.dex, src: m.sprite, alt: "", crossOrigin: "anonymous" })))), /* @__PURE__ */ React.createElement("div", { className: "meter" }, /* @__PURE__ */ React.createElement("i", { style: { width: prog[id] / r.zones.length * 100 + "%" } })), id === "curriculum" && /* @__PURE__ */ React.createElement("div", { onClick: (e) => {
        e.stopPropagation();
        go("mathblitz", "curriculum");
      }, style: { marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(255,203,5,.08)", border: "1px solid rgba(255,203,5,.2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background .15s" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16 } }, "\u23F1\uFE0F"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, fontSize: 12, fontWeight: 700, color: "#FFCB05" } }, "5-Minute Math"), /* @__PURE__ */ React.createElement(Icon, { name: "arrowR", size: 16, color: "#FFCB05" }))), /* @__PURE__ */ React.createElement("div", { className: "region-arrow" }, /* @__PURE__ */ React.createElement(Icon, { name: "arrowR", size: 20, color: r.accent })));
    })), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Daily mission"), dailyMission && !dailyMission.claimed && dailyMission.completed && /* @__PURE__ */ React.createElement("a", { onClick: onClaimMission, style: { cursor: "pointer" } }, "Claim")), /* @__PURE__ */ React.createElement("div", { className: "mission", "data-region": "compsci" }, /* @__PURE__ */ React.createElement("div", { className: "mission-ico" }, /* @__PURE__ */ React.createElement(Icon, { name: "flame", size: 22 })), /* @__PURE__ */ React.createElement("div", { className: "mission-main" }, /* @__PURE__ */ React.createElement("b", null, "Catch 3 Pok\xE9mon today"), /* @__PURE__ */ React.createElement("p", null, dailyMission ? dailyMission.progress : 0, " of ", dailyMission ? dailyMission.target : 3, " done \xB7 streak \xD7", dailyMission ? dailyMission.streak : 0, " active"), /* @__PURE__ */ React.createElement("div", { className: "meter" }, /* @__PURE__ */ React.createElement("i", { style: { width: (dailyMission ? dailyMission.progress / dailyMission.target * 100 : 0) + "%" } }))), dailyMission ? dailyMission.claimed ? /* @__PURE__ */ React.createElement("div", { className: "pill", style: { color: "var(--green)", borderColor: "var(--green)" } }, "Done") : dailyMission.completed ? /* @__PURE__ */ React.createElement("div", { className: "pill", style: { color: "var(--accent)", borderColor: "var(--accent)", cursor: "pointer" }, onClick: onClaimMission }, "+50") : null : null), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Achievements")), /* @__PURE__ */ React.createElement("div", { className: "chips-row", "data-region": "compsci" }, badges && badges.length > 0 ? badges.map((b) => /* @__PURE__ */ React.createElement("div", { key: b.id, className: "ach" }, /* @__PURE__ */ React.createElement("div", { className: "ach-ico" }, /* @__PURE__ */ React.createElement(Icon, { name: b.icon, size: 16 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("b", null, b.name), /* @__PURE__ */ React.createElement("span", null, b.description)))) : /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 0", color: "var(--text-tertiary)", fontSize: 13, textAlign: "center", width: "100%" } }, "Catch Pok\xE9mon and clear zones to earn badges!")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 18, marginTop: 2 } }, order.map((id) => {
      var _a2, _b;
      const c = prog[id] || 0;
      const t = (((_a2 = regions[id]) == null ? void 0 : _a2.zones) || []).length;
      const earned = c > 0;
      return /* @__PURE__ */ React.createElement("div", { key: id, style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: earned ? 1 : 0.35, filter: earned ? "none" : "grayscale(1)" } }, /* @__PURE__ */ React.createElement("img", { src: `assets/ui/medal-${id}.svg`, alt: ((_b = regions[id]) == null ? void 0 : _b.name) || id, width: 52, height: 52, style: { objectFit: "contain" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "var(--text-tertiary)", fontWeight: 700 } }, c, "/", t));
    })), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Leaderboard")), /* @__PURE__ */ React.createElement("div", { className: "lb", "data-region": "compsci" }, allSlots && allSlots.length > 0 ? [...allSlots].sort((a, b) => b.coins - a.coins || b.caughtCount - a.caughtCount).map((s, i) => {
      const isMe = s.slot === activeSlot;
      const sIdn = playerIdentity(s.name);
      return /* @__PURE__ */ React.createElement("div", { key: s.slot, className: "lb-row" + (isMe ? " me" : ""), style: isMe ? { background: sIdn.color + "1c" } : void 0 }, /* @__PURE__ */ React.createElement("div", { className: "lb-rank" }, i === 0 ? "\u{1F3C6}" : i + 1), /* @__PURE__ */ React.createElement("div", { className: "lb-av", style: { border: `1.5px solid ${sIdn.color}66`, background: "var(--bg-elevated)" } }, /* @__PURE__ */ React.createElement("img", { src: SPRITE(sIdn.dex), alt: "", crossOrigin: "anonymous", style: { objectFit: "contain", padding: 3 } })), /* @__PURE__ */ React.createElement("div", { className: "lb-name" }, /* @__PURE__ */ React.createElement("b", null, s.name), /* @__PURE__ */ React.createElement("span", null, isMe ? "you \xB7 " : "", s.caughtCount, " caught")), /* @__PURE__ */ React.createElement("div", { className: "lb-score" }, /* @__PURE__ */ React.createElement("b", { style: { color: "#FFCB05" } }, s.coins.toLocaleString())));
    }) : (
      /* loading skeleton */
      [1, 2, 3].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "lb-row", style: { opacity: 0.3 } }, /* @__PURE__ */ React.createElement("div", { className: "lb-rank" }, i), /* @__PURE__ */ React.createElement("div", { className: "lb-av" }, "\u{1F9D1}"), /* @__PURE__ */ React.createElement("div", { className: "lb-name" }, /* @__PURE__ */ React.createElement("b", null, "\u2014"), /* @__PURE__ */ React.createElement("span", null, "loading\u2026")), /* @__PURE__ */ React.createElement("div", { className: "lb-score" }, /* @__PURE__ */ React.createElement("b", null, "\u2014"))))
    ))));
  }
  function RegionMap({ region, go, caught, profile, progress }) {
    var _a;
    const { regions, ready } = useContent();
    if (!ready || !regions) return /* @__PURE__ */ React.createElement(ContentLoading, null);
    const r = regions[region];
    if (!r) return /* @__PURE__ */ React.createElement(ContentLoading, null);
    const feat = rarest(r.zones[r.zones.length - 1].mons);
    const clearedCount = r.zones.filter((z) => zoneState(z, profile, caught, progress, r.zones) === "cleared").length;
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim" }, /* @__PURE__ */ React.createElement("div", { className: "pad" }, /* @__PURE__ */ React.createElement("div", { className: "map-banner" }, /* @__PURE__ */ React.createElement("div", { className: "hero-bg", style: { background: `url(assets/maps/${region}-bg.jpg) center/cover no-repeat, radial-gradient(120% 120% at 80% 10%, ${r.accent}44, transparent 60%), linear-gradient(135deg, #16122c, #0b0a18)` } }), /* @__PURE__ */ React.createElement("img", { className: "map-banner-mon", src: feat.sprite, alt: "", crossOrigin: "anonymous" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow", style: { color: r.accent } }, "Region \xB7 ", r.tag), /* @__PURE__ */ React.createElement("div", { className: "region-name", style: { fontSize: 22, color: r.accent } }, r.name))), /* @__PURE__ */ React.createElement("div", { className: "map-meta" }, /* @__PURE__ */ React.createElement("div", { className: "pill", style: { color: r.accent, borderColor: r.accent } }, "LVL ", (_a = profile == null ? void 0 : profile.level) != null ? _a : PLAYER.level), /* @__PURE__ */ React.createElement("span", { className: "eyebrow" }, clearedCount, " / ", r.zones.length, " zones cleared")), r.zones.map((z) => {
      const st = zoneState(z, profile, caught, progress, r.zones);
      const locked = st === "locked", cleared = st === "cleared";
      return /* @__PURE__ */ React.createElement("div", { key: z.zone, className: "zone " + st, onClick: () => !locked && go("catch", region, z.zone) }, /* @__PURE__ */ React.createElement("div", { className: "zone-no", style: { border: "none", background: "transparent", borderRadius: 0, width: 52, height: 52 } }, /* @__PURE__ */ React.createElement("img", { src: `assets/maps/node-${st}.svg`, alt: st, width: 52, height: 52, style: { objectFit: "contain" } })), /* @__PURE__ */ React.createElement("div", { className: "zone-main" }, /* @__PURE__ */ React.createElement("b", null, z.name), /* @__PURE__ */ React.createElement("code", null, z.topic, locked ? ` \xB7 selesaikan zona sebelumnya` : "")), /* @__PURE__ */ React.createElement("div", { className: "zone-mons" }, z.mons.slice(0, 3).map((m, i) => locked || !cleared && i > 0 ? /* @__PURE__ */ React.createElement("div", { key: i, className: "silh" }, "?") : /* @__PURE__ */ React.createElement("img", { key: i, src: m.sprite, alt: "", crossOrigin: "anonymous" }))), locked ? /* @__PURE__ */ React.createElement(Icon, { name: "lock", size: 16, color: "var(--text-tertiary)" }) : /* @__PURE__ */ React.createElement(Icon, { name: "arrowR", size: 18, color: r.accent }));
    }), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 6 } }, "Tap an open zone to enter the catch loop.")));
  }
  const CHEER_WRONG = [
    "So close! Read the question one more time \u{1F440}",
    "It's okay \u2014 even great trainers get some wrong \u{1F4AA}",
    "Try again \u2014 you can totally do this! \u{1F525}",
    "Hmm, almost there! Take it slow and think it through \u{1F9E0}",
    "Ask Draco if you need a hint \u{1F409}"
  ];
  function Catch({ region, zone, go, onCaught, pokeballs: pokeballsProp, caught, onAnswer, onOpenDraco }) {
    const { regions, questions, ready } = useContent();
    if (!ready || !regions) return /* @__PURE__ */ React.createElement(ContentLoading, null);
    const r = regions[region];
    if (!r) return /* @__PURE__ */ React.createElement(ContentLoading, null);
    const z = r.zones.find((x) => x.zone === zone) || r.zones[0];
    const caughtDex = React.useMemo(() => (caught || []).map((c) => c.dex), [caught]);
    const firstFallback = Object.values(questions)[0] || [];
    const shuffleDeck = (raw, avoidQ) => {
      const copy = [...raw || []];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      if (avoidQ && copy.length > 1 && copy[0].q === avoidQ.q) {
        [copy[0], copy[1]] = [copy[1], copy[0]];
      }
      return copy;
    };
    const srcBank = questions[z.topic] || firstFallback;
    const [bank, setBank] = uS1(() => srcBank && srcBank.length ? shuffleDeck(srcBank) : []);
    const pickWild = (excludeDex) => {
      const uncaught = (z.mons || []).filter((m) => !caughtDex.includes(m.dex) && m.dex !== excludeDex);
      let pool = uncaught.length > 0 ? uncaught : (z.mons || []).filter((m) => m.dex !== excludeDex);
      if (pool.length === 0) pool = z.mons || [];
      return weightedPick(pool) || pool[0];
    };
    const [wild, setWild] = uS1(() => pickWild(null));
    const rerollWild = () => {
      setWild(pickWild(wild ? wild.dex : null));
      setBank(shuffleDeck(srcBank));
      setHp(100);
      setQi(0);
      setPhase("quiz");
      setFb(null);
      setBall(null);
      setAnswerReward(false);
    };
    const [hp, setHp] = uS1(100);
    const [qi, setQi] = uS1(0);
    const [phase, setPhase] = uS1("quiz");
    const [fb, setFb] = uS1(null);
    const [hit, setHit] = uS1(false);
    const [ball, setBall] = uS1(null);
    const [answerReward, setAnswerReward] = uS1(false);
    const [combo, setCombo] = uS1(0);
    const [cheer, setCheer] = uS1(null);
    const q = bank.length ? bank[qi % bank.length] : srcBank[0] || {};
    const nextQ = () => {
      const nv = qi + 1;
      if (bank.length > 1 && nv % bank.length === 0) setBank(shuffleDeck(srcBank, q));
      setQi(nv);
    };
    const answer = (i) => {
      if (phase !== "quiz" || fb) return;
      const ok = i === q.a;
      setFb({ ok, pick: i });
      if (ok) {
        const nc = combo + 1;
        setCombo(nc);
        setCheer(null);
        SFX.play(nc >= 2 ? "combo" : "correct");
        setHit(true);
        setTimeout(() => setHit(false), 400);
        if (onAnswer) onAnswer(true, z.id);
        setAnswerReward(true);
        setTimeout(() => setAnswerReward(false), 1600);
      } else {
        setCombo(0);
        SFX.play("wrong");
        setCheer(CHEER_WRONG[Math.floor(Math.random() * CHEER_WRONG.length)]);
        setTimeout(() => setCheer(null), 2e3);
      }
      setTimeout(() => {
        setFb(null);
        if (ok) {
          const dmg = 34 + Math.min(combo, 3) * 6;
          const nh = Math.max(0, hp - dmg);
          setHp(nh);
          if (nh <= 8) setPhase("ready");
          else nextQ();
        } else nextQ();
      }, 700);
    };
    const throwBall = (b) => {
      setBall(b);
      setPhase("wobble");
      SFX.play("throw");
      setTimeout(() => {
        SFX.play("catch");
        onCaught(wild, { ...b, _zoneId: z.id, _topic: z.topic });
      }, 1700);
    };
    return /* @__PURE__ */ React.createElement("div", { className: "catch screen-anim" }, /* @__PURE__ */ React.createElement("div", { className: "stage" }, /* @__PURE__ */ React.createElement("div", { className: "hero-bg", style: { background: `radial-gradient(120% 90% at 50% 0%, ${r.accent}3a, transparent 55%), linear-gradient(180deg, #15122b, #0a0818)` } }), /* @__PURE__ */ React.createElement("div", { className: "stage-field" }), /* @__PURE__ */ React.createElement("div", { className: "wild-card" }, /* @__PURE__ */ React.createElement("div", { className: "nm" }, /* @__PURE__ */ React.createElement("b", null, wild.name), /* @__PURE__ */ React.createElement("span", null, "Lv ", 3 + zone * 2)), /* @__PURE__ */ React.createElement("div", { className: "hp" }, /* @__PURE__ */ React.createElement("small", null, "HP"), /* @__PURE__ */ React.createElement("div", { className: "meter" }, /* @__PURE__ */ React.createElement("i", { style: { width: hp + "%", background: hp <= 8 ? "var(--red)" : hp < 40 ? "linear-gradient(90deg,#FF6B2B,#FFCB05)" : "linear-gradient(90deg,#4ADE80,#00D9B8)" } }))), /* @__PURE__ */ React.createElement("div", { className: "type-chip", style: { marginTop: 7, background: TYPE_COLOR[wild.type] } }, wild.type)), /* @__PURE__ */ React.createElement("img", { className: "wild-sprite" + (hit ? " hit" : "") + (phase === "wobble" ? " wobble" : ""), src: wild.sprite, alt: wild.name, crossOrigin: "anonymous" }), phase === "wobble" && /* @__PURE__ */ React.createElement("div", { className: "thrown" }, /* @__PURE__ */ React.createElement(Pokeball, { size: 34, id: ball == null ? void 0 : ball.id, top: ball == null ? void 0 : ball.top })), combo >= 2 && phase === "quiz" && /* @__PURE__ */ React.createElement("div", { key: combo, className: "combo-badge" }, "Combo \xD7", combo, " \u{1F525}"), answerReward && /* @__PURE__ */ React.createElement("div", { className: "float-reward" }, "+5 \u{1FA99} +5 XP")), /* @__PURE__ */ React.createElement("div", { className: "cmd" }, phase === "quiz" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "q-prompt" }, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "Question ", qi + 1, " \xB7 ", z.name), /* @__PURE__ */ React.createElement("h3", null, q.q), /* @__PURE__ */ React.createElement("div", { className: "expr" }, q.expr), cheer && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--yellow)", marginTop: 6, animation: "riseIn .3s both" } }, cheer)), /* @__PURE__ */ React.createElement("div", { className: "answers" + (q.opts.length > 2 ? " two" : "") }, q.opts.map((o, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "ans" + (fb ? i === q.a ? " ok" : i === fb.pick ? " no" : "" : ""), onClick: () => answer(i) }, q.opts.length <= 2 && /* @__PURE__ */ React.createElement("kbd", null, i + 1), /* @__PURE__ */ React.createElement("span", { className: "grow" }, o), fb && i === q.a && /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 18, color: "var(--green)", sw: 2.4 })))), /* @__PURE__ */ React.createElement("div", { className: "cmd-foot" }, /* @__PURE__ */ React.createElement("img", { src: "assets/dru/dru-think.png", alt: "Ask Draco", style: { width: 36, height: 36, objectFit: "contain", marginRight: 4, flexShrink: 0 } }), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "draco wf-tap",
        style: { borderColor: "rgba(139,92,246,.5)", color: "#B79BFF" },
        onClick: () => onOpenDraco ? onOpenDraco({ zoneName: z.name, question: q.q, hint: q.hint, topic: z.topic }) : openTutor(z.topic)
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "hint", size: 15 }),
      " Ask Draco"
    ), /* @__PURE__ */ React.createElement("span", { className: "cmd-hint" }, "Correct answer \u2192 attack, HP drops")), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 8 } }, /* @__PURE__ */ React.createElement("span", { onClick: rerollWild, style: { fontSize: 11, color: "var(--text-tertiary)", cursor: "pointer", userSelect: "none" } }, "\u{1F504} Find another Pok\xE9mon"))), phase === "ready" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ball-prompt" }, "It is weak now \u2014 pick a Pok\xE9 Ball! \u{1F3AF}"), /* @__PURE__ */ React.createElement("div", { className: "balls" }, (pokeballsProp || POKEBALLS).map((b) => /* @__PURE__ */ React.createElement("div", { key: b.id, className: "ball-opt" + (b.own === 0 ? " dim" : ""), onClick: () => b.own > 0 && throwBall(b) }, /* @__PURE__ */ React.createElement(Pokeball, { size: 34, id: b.id, top: b.top }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("b", null, b.name), /* @__PURE__ */ React.createElement("span", null, "\xD7", b.own, " \xB7 ", Math.round(b.rate * 100), "%"))))), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 14 } }, "Higher tiers catch better but are scarcer."), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 6 } }, /* @__PURE__ */ React.createElement("span", { onClick: rerollWild, style: { fontSize: 11, color: "var(--text-tertiary)", cursor: "pointer", userSelect: "none" } }, "\u{1F504} Find another Pok\xE9mon"))), phase === "wobble" && /* @__PURE__ */ React.createElement("div", { style: { margin: "auto", textAlign: "center", color: "var(--text-secondary)", fontFamily: "var(--font-display)", fontWeight: 700 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15 } }, "\u2026wobble\u2026 wobble\u2026"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--text-tertiary)", marginTop: 6, animation: "fadeIn .4s .8s both" } }, "Will it catch? \u{1F91E}"))));
  }
  function Celebration({ mon, region, coins, fact, onDone, onTeam, activeSlot, onTeamAdd, newLevel, rewardBalls, levelUp }) {
    const { regions } = useContent();
    const r = regions && regions[region] || { accent: "#8B5CF6" };
    const rar = RARITY[mon.rarity] || RARITY.common;
    const confetti = React.useMemo(() => Array.from({ length: 26 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.7,
      dur: 2 + Math.random() * 1.6,
      size: 6 + Math.random() * 6,
      color: [r.accent, "#FFCB05", "#4ADE80", "#4A9EFF", "#F472B6"][i % 5],
      rot: Math.random() * 360
    })), []);
    React.useEffect(() => {
      if (levelUp) SFX.play("levelup");
    }, [levelUp]);
    return /* @__PURE__ */ React.createElement("div", { className: "celeb", "data-region": region }, confetti.map((c, i) => /* @__PURE__ */ React.createElement("i", { key: i, className: "confetti", style: {
      left: c.left + "%",
      width: c.size,
      height: c.size * 0.45,
      background: c.color,
      animationDelay: c.delay + "s",
      animationDuration: c.dur + "s",
      transform: `rotate(${c.rot}deg)`
    } })), /* @__PURE__ */ React.createElement("svg", { className: "celeb-rays", viewBox: "0 0 400 400", preserveAspectRatio: "xMidYMid slice" }, Array.from({ length: 22 }).map((_, i) => {
      const a = i / 22 * Math.PI * 2;
      return /* @__PURE__ */ React.createElement("line", { key: i, x1: "200", y1: "200", x2: 200 + 360 * Math.cos(a), y2: 200 + 360 * Math.sin(a), stroke: r.accent, strokeWidth: i % 2 ? 6 : 14, opacity: i % 2 ? 0.25 : 0.12 });
    })), /* @__PURE__ */ React.createElement("div", { className: "celeb-eyebrow", style: { color: rar.c } }, mon.rarity === "legendary" ? "\u2605 LEGENDARY CATCH \u2605" : "GOTCHA!"), /* @__PURE__ */ React.createElement("img", { src: "assets/dru/dru-cheer.png", alt: "Dru cheering", style: { width: 80, height: 80, objectFit: "contain", marginBottom: -18, zIndex: 1, position: "relative", filter: "drop-shadow(0 0 12px rgba(255,203,5,.25))" } }), /* @__PURE__ */ React.createElement("img", { className: "celeb-sprite", src: mon.sprite, alt: mon.name, crossOrigin: "anonymous" }), /* @__PURE__ */ React.createElement("h2", null, mon.name), /* @__PURE__ */ React.createElement("div", { className: "meta" }, /* @__PURE__ */ React.createElement("span", { className: "type-chip", style: { background: TYPE_COLOR[mon.type], verticalAlign: "middle" } }, mon.type), /* @__PURE__ */ React.createElement("span", { style: { color: rar.c, marginLeft: 8, fontWeight: 700 } }, rar.label), " \xB7 added to Collection"), /* @__PURE__ */ React.createElement("div", { className: "celeb-rewards" }, [["+50", "XP"], ["+" + (coins != null ? coins : 50), "Coins"], ["New", "Pok\xE9dex"]].map(([v, l]) => /* @__PURE__ */ React.createElement("div", { key: l, className: "reward" }, /* @__PURE__ */ React.createElement("b", { style: { color: l === "Coins" ? "var(--yellow)" : "var(--accent)" } }, v), /* @__PURE__ */ React.createElement("span", null, l)))), fact && /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(139,92,246,.1)", border: "1px solid rgba(139,92,246,.3)", borderRadius: 12, padding: "10px 14px", margin: "2px 0 4px", maxWidth: 300, position: "relative", display: "flex", gap: 8, alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, lineHeight: 1.2 } }, "\u{1F4A1}"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, textAlign: "left" } }, fact)), levelUp && rewardBalls && /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(255,203,5,.1)", border: "1px solid rgba(255,203,5,.3)", borderRadius: 12, padding: "10px 16px", marginTop: 4, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "#FFCB05", fontFamily: "var(--font-display)", marginBottom: 4 } }, "\u{1F389} Level Up! Level ", newLevel, "!"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--text-secondary)" } }, rewardBalls.pokeball > 0 && /* @__PURE__ */ React.createElement("span", null, "+", rewardBalls.pokeball, " Pok\xE9 Ball", rewardBalls.pokeball > 1 ? "s" : "", " "), rewardBalls.greatball > 0 && /* @__PURE__ */ React.createElement("span", null, "+", rewardBalls.greatball, " Great Ball", rewardBalls.greatball > 1 ? "s" : "", " "), rewardBalls.ultraball > 0 && /* @__PURE__ */ React.createElement("span", null, "+", rewardBalls.ultraball, " Ultra Ball", rewardBalls.ultraball > 1 ? "s" : "", " "))), /* @__PURE__ */ React.createElement("div", { className: "celeb-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary btn-block", onClick: () => {
      if (activeSlot && onTeamAdd) onTeamAdd(mon.dex);
      onTeam();
    } }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 16, color: "#0b0a16" }), " Add to team"), /* @__PURE__ */ React.createElement("div", { className: "celeb-skip", onClick: onDone }, "Continue \u2192")));
  }
  function MathBlitz({ activeSlot, onReward, go }) {
    const [phase, setPhase] = React.useState("loading");
    const [timeLeft, setTimeLeft] = React.useState(300);
    const [score, setScore] = React.useState(0);
    const [total, setTotal] = React.useState(0);
    const [questions, setQuestions] = React.useState([]);
    const [qIndex, setQIndex] = React.useState(0);
    const [feedback, setFeedback] = React.useState(null);
    const [pickIdx, setPickIdx] = React.useState(null);
    const [reward, setReward] = React.useState(null);
    const [retryKey, setRetryKey] = React.useState(0);
    const postedRef = React.useRef(false);
    React.useEffect(() => {
      const topics = ["penjumlahan", "pengurangan", "perkalian", "pembagian", "pecahan", "desimal"];
      Promise.all(topics.map(async (t) => {
        try {
          const r = await fetch(`/api/content/questions?topic=${encodeURIComponent(t)}`);
          const d = await r.json();
          return d.success ? d.questions : [];
        } catch {
          return [];
        }
      })).then((results) => {
        const all = results.flat();
        for (let i = all.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [all[i], all[j]] = [all[j], all[i]];
        }
        setQuestions(all);
        setPhase("ready");
      }).catch(() => setPhase("ready"));
    }, [retryKey]);
    React.useEffect(() => {
      if (phase !== "active") return;
      const id = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setPhase("end");
            return 0;
          }
          return t - 1;
        });
      }, 1e3);
      return () => clearInterval(id);
    }, [phase]);
    React.useEffect(() => {
      if (phase !== "end" || postedRef.current || !activeSlot) return;
      postedRef.current = true;
      const sessionKey = "mb_" + activeSlot + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      fetch(`/api/player/${activeSlot}/mathblitz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correct: score, total, sessionKey })
      }).then((r) => r.json()).then((data) => {
        if (data.success) {
          setReward(data);
          if (onReward) onReward(data);
        }
      }).catch((e) => console.error("[MathBlitz] post failed:", e));
    }, [phase]);
    const start = () => {
      setPhase("active");
      setTimeLeft(300);
      setScore(0);
      setTotal(0);
      setQIndex(0);
      setFeedback(null);
      postedRef.current = false;
      setReward(null);
    };
    const retry = () => setRetryKey((k) => k + 1);
    const answer = (idx) => {
      if (feedback || phase !== "active" || qIndex >= questions.length) return;
      const q = questions[qIndex];
      const ok = idx === q.a;
      setPickIdx(idx);
      setFeedback(ok ? "correct" : "wrong");
      SFX.play(ok ? "correct" : "wrong");
      if (ok) setScore((s) => s + 1);
      setTotal((t) => t + 1);
      setTimeout(() => {
        setFeedback(null);
        setPickIdx(null);
        setQIndex((i) => {
          if (i + 1 >= questions.length) {
            const copy = [...questions];
            for (let k = copy.length - 1; k > 0; k--) {
              const j = Math.floor(Math.random() * (k + 1));
              [copy[k], copy[j]] = [copy[j], copy[k]];
            }
            setQuestions(copy);
            return 0;
          }
          return i + 1;
        });
      }, 550);
    };
    const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    const pct = timeLeft / 300 * 100;
    if (phase === "loading") return /* @__PURE__ */ React.createElement(ContentLoading, null);
    if (phase === "ready") return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim", "data-region": "curriculum" }, /* @__PURE__ */ React.createElement("div", { className: "pad", style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 340, gap: 16, textAlign: "center" } }, /* @__PURE__ */ React.createElement("img", { src: "assets/dru/dru-point.png", alt: "Dru", style: { width: 80, height: 80, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("h2", { style: { fontFamily: "var(--font-display)", fontSize: 22, color: "#FFCB05", margin: 0 } }, "\u23F1\uFE0F 5-Minute Math"), /* @__PURE__ */ React.createElement("p", { style: { color: "var(--text-secondary)", fontSize: 14, margin: 0, maxWidth: 260, lineHeight: 1.6 } }, "Answer as many math questions as you can in 5 minutes. Earn coins and XP!"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: start, style: { marginTop: 8 } }, "Start \u26A1")));
    if (phase === "active") {
      const q = questions[qIndex];
      if (!q) return /* @__PURE__ */ React.createElement(ContentLoading, null);
      return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim", "data-region": "curriculum" }, /* @__PURE__ */ React.createElement("div", { className: "pad" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 } }, /* @__PURE__ */ React.createElement("div", { className: "meter", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("i", { style: { width: pct + "%", background: timeLeft < 60 ? "var(--red)" : timeLeft < 120 ? "linear-gradient(90deg,#FFCB05,#FF6B2B)" : "linear-gradient(90deg,#4ADE80,#00D9B8)" } })), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: timeLeft < 60 ? "var(--red)" : "var(--text-primary)", minWidth: 56, textAlign: "right" } }, mmss(timeLeft))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 20 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "var(--text-tertiary)" } }, "Correct: ", /* @__PURE__ */ React.createElement("b", { style: { color: "var(--green)" } }, score)), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "var(--text-tertiary)" } }, "Question ", total + 1)), /* @__PURE__ */ React.createElement("div", { className: "q-prompt", style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "Math \xB7 ", q.difficulty || "easy"), /* @__PURE__ */ React.createElement("h3", null, q.q), /* @__PURE__ */ React.createElement("div", { className: "expr", style: { fontSize: 22 } }, q.expr)), /* @__PURE__ */ React.createElement("div", { className: "answers" + (q.opts.length <= 2 ? " one" : " two") }, q.opts.map((o, i) => {
        let cls = "ans";
        if (feedback && i === q.a) cls += " ok";
        if (feedback && i === pickIdx && i !== q.a) cls += " no";
        return /* @__PURE__ */ React.createElement("div", { key: i, className: cls, onClick: () => answer(i) }, q.opts.length <= 2 && /* @__PURE__ */ React.createElement("kbd", null, i + 1), /* @__PURE__ */ React.createElement("span", { className: "grow" }, o), feedback && i === q.a && /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 18, color: "var(--green)", sw: 2.4 }));
      })), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 14 } }, "Answer fast \u2014 each correct +2 coins, +5 XP")));
    }
    const acc = total > 0 ? Math.round(score / total * 100) : 0;
    const good = acc >= 70 || score >= 10;
    const coinsEarned = Math.min(score * 2, 200);
    const xpEarned = Math.min(score * 5, 500);
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim", "data-region": "curriculum" }, /* @__PURE__ */ React.createElement("div", { className: "pad", style: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minHeight: 340, gap: 12 } }, /* @__PURE__ */ React.createElement("img", { src: good ? "assets/dru/dru-cheer.png" : "assets/dru/dru-idle.png", alt: "Dru", style: { width: 80, height: 80, objectFit: "contain", marginBottom: 4 } }), /* @__PURE__ */ React.createElement("div", { className: "eyebrow", style: { color: good ? "var(--green)" : "var(--text-tertiary)" } }, good ? "Awesome!" : "Time's up!"), /* @__PURE__ */ React.createElement("h2", { style: { fontFamily: "var(--font-display)", fontSize: 20, color: "var(--text-primary)", margin: 0 } }, score, " / ", total, " correct"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, color: "var(--text-secondary)" } }, "Accuracy ", acc, "%"), /* @__PURE__ */ React.createElement("div", { className: "celeb-rewards", style: { justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { className: "reward" }, /* @__PURE__ */ React.createElement("b", { style: { color: "var(--accent)" } }, "+", xpEarned), /* @__PURE__ */ React.createElement("span", null, "XP")), /* @__PURE__ */ React.createElement("div", { className: "reward" }, /* @__PURE__ */ React.createElement("b", { style: { color: "var(--yellow)" } }, "+", coinsEarned), /* @__PURE__ */ React.createElement("span", null, "Coins")), reward && reward.best > 0 && /* @__PURE__ */ React.createElement("div", { className: "reward" }, /* @__PURE__ */ React.createElement("b", { style: { color: "#FFCB05" } }, reward.best), /* @__PURE__ */ React.createElement("span", null, "Best"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 12 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: retry, style: { minWidth: 120 } }, "Play again"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-ghost", onClick: () => go("home"), style: { minWidth: 100 } }, "Done"))));
  }
  Object.assign(window, { Home, RegionMap, Catch, Celebration, MathBlitz, PLAYER, zoneState, rarest, RANK });
  const regionMons = (regions, id) => {
    if (!regions || !regions[id]) return [];
    const seen = {};
    const out = [];
    regions[id].zones.forEach((z) => (z.mons || []).forEach((m) => {
      if (!seen[m.dex]) {
        seen[m.dex] = 1;
        out.push(m);
      }
    }));
    return out;
  };
  const findMonByDex = (regions, dex) => {
    if (!regions) return null;
    for (const r of Object.values(regions)) {
      for (const z of r.zones || []) {
        const m = (z.mons || []).find((mm) => mm.dex === dex);
        if (m) return m;
      }
    }
    return null;
  };
  function Collection({ caught, region, go, team, onTeamAdd, onTeamRemove }) {
    const { regions, ready } = useContent();
    if (!ready || !regions) return /* @__PURE__ */ React.createElement(ContentLoading, null);
    const order = ["curriculum", "science", "compsci"].filter((id) => regions[id]);
    const [filter, setFilter] = React.useState("all");
    const has = (dex) => caught.includes(dex);
    const all = order.flatMap((id) => regionMons(regions, id));
    const total = all.length;
    const legend = all.filter((m) => has(m.dex) && m.rarity === "legendary").length;
    const accent = (regions[region] || regions[order[0]] || {}).accent || "var(--accent)";
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim" }, /* @__PURE__ */ React.createElement("div", { className: "pad" }, caught.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" } }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: "/assets/dru/dru-idle.png",
        alt: "Dru",
        width: 96,
        height: 96,
        style: { objectFit: "contain", marginBottom: 16 }
      }
    ), /* @__PURE__ */ React.createElement("h3", { style: { fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary, #f0eeff)" } }, "No Pok\xE9mon yet"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: "var(--text-secondary, #9aa0b5)", margin: 0, maxWidth: 280 } }, "Go catch some! Head to the Map and answer questions to meet wild Pok\xE9mon.")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "col-stats" }, /* @__PURE__ */ React.createElement("div", { className: "col-stat", style: { "--accent": accent } }, /* @__PURE__ */ React.createElement("b", { style: { color: "var(--accent)" } }, caught.length), /* @__PURE__ */ React.createElement("span", null, "Caught")), /* @__PURE__ */ React.createElement("div", { className: "col-stat" }, /* @__PURE__ */ React.createElement("b", null, total), /* @__PURE__ */ React.createElement("span", null, "Pok\xE9dex")), /* @__PURE__ */ React.createElement("div", { className: "col-stat" }, /* @__PURE__ */ React.createElement("b", { style: { color: "var(--yellow)" } }, legend), /* @__PURE__ */ React.createElement("span", null, "Legendary"))), /* @__PURE__ */ React.createElement("div", { className: "col-filters", "data-region": region }, [["all", "All"], ...order.map((id) => [id, regions[id].tag || id])].map(([id, label]) => /* @__PURE__ */ React.createElement("div", { key: id, className: "filter" + (filter === id ? " on" : ""), onClick: () => setFilter(id) }, label))), order.filter((id) => filter === "all" || filter === id).map((id) => {
      const r = regions[id];
      const mons = regionMons(regions, id);
      const c = mons.filter((m) => has(m.dex)).length;
      return /* @__PURE__ */ React.createElement("div", { key: id, "data-region": id }, /* @__PURE__ */ React.createElement("div", { className: "sec-head", style: { gap: 8 } }, /* @__PURE__ */ React.createElement(
        "img",
        {
          src: "/assets/regions/" + id + "-icon.png",
          alt: r.name,
          width: 22,
          height: 22,
          style: { objectFit: "contain", flexShrink: 0 }
        }
      ), /* @__PURE__ */ React.createElement("h2", { style: { color: "var(--accent)", fontSize: 15 } }, r.name), /* @__PURE__ */ React.createElement("a", null, c, "/", mons.length)), /* @__PURE__ */ React.createElement("div", { className: "col-grid" }, mons.map((m) => {
        const inTeam = (team || []).includes(m.dex);
        const caught2 = has(m.dex);
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: m.dex,
            className: "dex" + (caught2 ? "" : " un"),
            style: caught2 ? { borderColor: inTeam ? "var(--yellow)" : "var(--accent)", background: inTeam ? "rgba(255,203,5,.08)" : "var(--accent-soft)" } : {}
          },
          /* @__PURE__ */ React.createElement("span", { className: "rar", style: { background: RARITY[m.rarity].c } }),
          /* @__PURE__ */ React.createElement("img", { src: m.sprite, alt: caught2 ? m.name : "???", crossOrigin: "anonymous" }),
          /* @__PURE__ */ React.createElement("span", { className: "no" }, "#", String(m.dex).padStart(3, "0")),
          inTeam && /* @__PURE__ */ React.createElement("span", { style: { position: "absolute", top: 2, right: 2, fontSize: 14, lineHeight: 1, filter: "drop-shadow(0 0 3px rgba(255,203,5,.6))" }, title: "In team" }, "\u2B50"),
          caught2 && onTeamAdd && onTeamRemove && (inTeam ? /* @__PURE__ */ React.createElement("div", { onClick: (e) => {
            e.stopPropagation();
            onTeamRemove(m.dex);
          }, style: { position: "absolute", bottom: 2, right: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(238,61,52,.8)", color: "#fff", fontSize: 14, lineHeight: "18px", textAlign: "center", cursor: "pointer" }, title: "Remove from team" }, "\u2212") : !inTeam && (team || []).length < 3 ? /* @__PURE__ */ React.createElement("div", { onClick: (e) => {
            e.stopPropagation();
            onTeamAdd(m.dex);
          }, style: { position: "absolute", bottom: 2, right: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(139,92,246,.8)", color: "#fff", fontSize: 14, lineHeight: "18px", textAlign: "center", cursor: "pointer" }, title: "Add to team" }, "+") : null)
        );
      })));
    }))));
  }
  function Store({ coins, region, pokeballs, activeSlot, onPurchase }) {
    const [buying, setBuying] = React.useState(null);
    const [err, setErr] = React.useState(null);
    const buy = async (b) => {
      if (!activeSlot || buying) return;
      setBuying(b.id);
      setErr(null);
      try {
        const idem = "purchase_" + activeSlot + "_" + b.id + "_" + Date.now();
        const data = await apiPost("/api/player/" + activeSlot + "/purchase", { item: b.id, idempotencyKey: idem });
        SFX.play("correct");
        if (onPurchase) onPurchase(data);
      } catch (e) {
        setErr(e.message || "Purchase failed");
      } finally {
        setBuying(null);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim", "data-region": region }, /* @__PURE__ */ React.createElement("div", { className: "pad" }, /* @__PURE__ */ React.createElement("div", { className: "wallet" }, /* @__PURE__ */ React.createElement(Pokeball, { size: 40, id: "pokeball", top: "#EE3D34" }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("span", null, "Your coins"), /* @__PURE__ */ React.createElement("b", null, coins)), /* @__PURE__ */ React.createElement("div", { className: "pill", onClick: () => window.open("https://druygon.my.id", "_self"), style: { cursor: "pointer" } }, /* @__PURE__ */ React.createElement(Icon, { name: "zap", size: 13 }), " Earn more")), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Pok\xE9 Balls")), (pokeballs || POKEBALLS).map((b) => {
      const afford = coins >= b.price;
      const busy = buying === b.id;
      return /* @__PURE__ */ React.createElement("div", { key: b.id, className: "store-row", style: { borderLeft: "4px solid " + b.top, opacity: busy ? 0.6 : 1 } }, /* @__PURE__ */ React.createElement(Pokeball, { size: 46, id: b.id, top: b.top }), /* @__PURE__ */ React.createElement("div", { className: "info" }, /* @__PURE__ */ React.createElement("b", null, b.name), /* @__PURE__ */ React.createElement("span", null, "Catch rate ", Math.round(b.rate * 100), "% \xB7 you own ", b.own)), /* @__PURE__ */ React.createElement("div", { className: "buy" + (afford && !busy ? "" : " disabled"), onClick: () => afford && !busy && buy(b), style: { cursor: afford && !busy ? "pointer" : "not-allowed" } }, /* @__PURE__ */ React.createElement(Icon, { name: "coin", size: 13, color: afford && !busy ? "#0b0a16" : "var(--text-tertiary)" }), " ", busy ? "..." : b.price));
    }), err && /* @__PURE__ */ React.createElement("div", { style: { color: "var(--red)", fontSize: 12, textAlign: "center", marginTop: 8 } }, err), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Items")), /* @__PURE__ */ React.createElement("div", { className: "store-row" }, /* @__PURE__ */ React.createElement("div", { className: "mission-ico", style: { width: 46, height: 46 } }, /* @__PURE__ */ React.createElement(Icon, { name: "hint", size: 22 })), /* @__PURE__ */ React.createElement("div", { className: "info" }, /* @__PURE__ */ React.createElement("b", null, "Draco Hint \xD73"), /* @__PURE__ */ React.createElement("span", null, "Reveal a clue during any zone")), /* @__PURE__ */ React.createElement("div", { className: "buy disabled", style: { cursor: "not-allowed" } }, /* @__PURE__ */ React.createElement(Icon, { name: "coin", size: 13, color: "var(--text-tertiary)" }), " 150 (soon)"))));
  }
  function Profile({ caught, region, go, profile, playerName, activeSlot, allSlots, onSwitchSlot, team, badges, dailyMission, progress, onTeamRemove }) {
    const { regions } = useContent();
    const xpPct = profile.xpToNext > 0 ? Math.round(profile.xp / profile.xpToNext * 100) : 100;
    const clearedByRegion = React.useMemo(() => {
      const out = {};
      if (!regions) return out;
      for (const [rid, r] of Object.entries(regions)) {
        const total = r.zones.length;
        const cleared = r.zones.filter(
          (z) => (progress || []).some((p) => p.zoneId === z.id && p.status === "cleared")
        ).length;
        out[rid] = total > 0 ? Math.round(cleared / total * 100) : 0;
      }
      return out;
    }, [regions, progress]);
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim", "data-region": region }, /* @__PURE__ */ React.createElement("div", { className: "pad" }, (() => {
      var _a;
      const idn = playerIdentity(playerName);
      return /* @__PURE__ */ React.createElement("div", { className: "prof-card", style: { background: `linear-gradient(135deg, ${idn.color}22, var(--bg-card))` } }, /* @__PURE__ */ React.createElement("div", { style: { width: 62, height: 62, borderRadius: "50%", overflow: "hidden", border: `2.5px solid ${idn.color}`, flexShrink: 0, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement(
        "img",
        {
          src: SPRITE(idn.dex),
          alt: idn.mon,
          width: 52,
          height: 52,
          crossOrigin: "anonymous",
          style: { objectFit: "contain" }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "who", style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("b", null, playerName), /* @__PURE__ */ React.createElement("span", null, idn.title, " \xB7 Level ", profile.level, " \xB7 ", caught.length, " caught \xB7 ", ((_a = profile.coins) != null ? _a : 0).toLocaleString(), " coins"), /* @__PURE__ */ React.createElement("div", { className: "meter", style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement("i", { style: { width: xpPct + "%", background: `linear-gradient(90deg, ${idn.color}, #FF6B2B)` } })), /* @__PURE__ */ React.createElement("small", { style: { color: "var(--text-tertiary)", fontSize: 10 } }, profile.xp, " / ", profile.xpToNext, " XP")));
    })(), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Switch player")), /* @__PURE__ */ React.createElement("div", { className: "slots" }, allSlots.length > 0 ? allSlots.map((s) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: s.slot,
        className: "slot" + (s.slot === activeSlot ? " on" : ""),
        onClick: () => onSwitchSlot && onSwitchSlot(s.slot),
        style: { cursor: s.slot === activeSlot ? "default" : "pointer" }
      },
      /* @__PURE__ */ React.createElement(SlotAvatar, { name: s.name, size: 40, active: s.slot === activeSlot }),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("b", { style: { fontSize: 13 } }, s.name), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "var(--text-tertiary)" } }, "Lv ", s.level, " \xB7 ", s.caughtCount, " caught")),
      s.slot === activeSlot && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "auto", fontSize: 10, color: "var(--accent)", fontWeight: 700 } }, "ACTIVE")
    )) : (
      /* loading fallback */
      [1, 2, 3, 4].map((n) => /* @__PURE__ */ React.createElement(
        "div",
        {
          key: n,
          className: "slot" + (n === activeSlot ? " on" : ""),
          style: { opacity: 0.4, cursor: "default" }
        },
        /* @__PURE__ */ React.createElement("div", { style: { width: 40, height: 40, borderRadius: "50%", background: "var(--surface-2)" } }),
        /* @__PURE__ */ React.createElement("b", { style: { fontSize: 13 } }, "\u2014")
      ))
    )), regions && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Progress by world")), Object.entries(regions).map(([id, r]) => {
      var _a, _b;
      return /* @__PURE__ */ React.createElement("div", { key: id, className: "prog-row", "data-region": id }, /* @__PURE__ */ React.createElement(
        "img",
        {
          src: "/assets/regions/" + id + "-icon.png",
          alt: r.name,
          width: 24,
          height: 24,
          style: { objectFit: "contain", flexShrink: 0 }
        }
      ), /* @__PURE__ */ React.createElement("b", { style: { color: "var(--accent)", minWidth: 90, fontSize: 13 } }, r.name), /* @__PURE__ */ React.createElement("div", { className: "meter", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("i", { style: { width: ((_a = clearedByRegion[id]) != null ? _a : 0) + "%" } })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, minWidth: 32, textAlign: "right" } }, (_b = clearedByRegion[id]) != null ? _b : 0, "%"));
    })), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Team (", team ? team.length : 0, "/3)")), team && team.length > 0 ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 } }, team.map((dex) => {
      const mon = findMonByDex(regions, dex);
      return /* @__PURE__ */ React.createElement("div", { key: dex, style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "var(--surface-2)",
        borderRadius: 10,
        padding: "6px 12px",
        fontSize: 13,
        position: "relative"
      } }, mon && /* @__PURE__ */ React.createElement("img", { src: mon.sprite, alt: mon.name, width: 32, height: 32, style: { objectFit: "contain" }, crossOrigin: "anonymous" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 13, lineHeight: 1.3 } }, mon ? mon.name : "#" + String(dex).padStart(3, "0")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "var(--text-tertiary)" } }, "#", String(dex).padStart(3, "0"), " \xB7 ", mon ? mon.type : "???")), onTeamRemove && /* @__PURE__ */ React.createElement("span", { onClick: () => onTeamRemove(dex), style: { cursor: "pointer", color: "var(--red)", fontSize: 18, lineHeight: 1, marginLeft: "auto" }, title: "Remove from team" }, "\xD7"));
    })) : /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: "var(--text-tertiary)", marginBottom: 12 } }, "No team yet \u2014 catch Pok\xE9mon and add them from the celebration screen!"), badges && badges.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Achievements (", badges.length, ")")), /* @__PURE__ */ React.createElement("div", { className: "chips-row", "data-region": region, style: { marginBottom: 12 } }, badges.map((b) => /* @__PURE__ */ React.createElement("div", { key: b.id, className: "ach" }, /* @__PURE__ */ React.createElement("div", { className: "ach-ico" }, /* @__PURE__ */ React.createElement(Icon, { name: b.icon, size: 16 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("b", null, b.name), /* @__PURE__ */ React.createElement("span", null, b.description)))))), regions && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Region Medals")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" } }, Object.entries(regions).map(([id, r]) => {
      var _a;
      const pct = (_a = clearedByRegion[id]) != null ? _a : 0;
      const earned = pct > 0;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: id,
          title: r.name + (earned ? " (" + pct + "% clear)" : " \u2014 locked"),
          style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: earned ? 1 : 0.35 }
        },
        /* @__PURE__ */ React.createElement(
          "img",
          {
            src: "/assets/ui/medal-" + id + ".svg",
            alt: r.name + " medal",
            width: 56,
            height: 62,
            style: { objectFit: "contain", filter: earned ? "none" : "grayscale(1)" }
          }
        ),
        /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: earned ? "var(--accent)" : "var(--text-tertiary)" } }, pct, "%")
      );
    }))), dailyMission && dailyMission.streak > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, background: "var(--surface-2)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13 } }, /* @__PURE__ */ React.createElement(Icon, { name: "flame", size: 20, color: "var(--yellow)" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("b", { style: { color: "var(--yellow)" } }, dailyMission.streak, "-day streak"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: "var(--text-tertiary)", margin: "2px 0 0" } }, "Keep catching every day to grow it!"))), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Pok\xE9ball")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 } }, POKEBALLS.map((b) => {
      var _a, _b;
      return /* @__PURE__ */ React.createElement("div", { key: b.id, style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "var(--surface-2)",
        borderRadius: 10,
        padding: "6px 12px",
        fontSize: 13
      } }, /* @__PURE__ */ React.createElement(Pokeball, { size: 24, id: b.id, top: b.top }), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700 } }, "\xD7", (_b = (_a = profile.pokeballs) == null ? void 0 : _a[b.id]) != null ? _b : 0));
    })), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Settings")), /* @__PURE__ */ React.createElement(SoundRow, null), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "For parents")), /* @__PURE__ */ React.createElement("div", { className: "link-row", onClick: () => window.open("/parent", "_blank") }, /* @__PURE__ */ React.createElement("div", { className: "ic" }, /* @__PURE__ */ React.createElement(Icon, { name: "chart", size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "tx" }, /* @__PURE__ */ React.createElement("b", null, "Parent dashboard"), /* @__PURE__ */ React.createElement("span", null, "Play time \xB7 topics \xB7 accuracy")), /* @__PURE__ */ React.createElement(Icon, { name: "arrowR", size: 18, color: "var(--text-tertiary)" })), /* @__PURE__ */ React.createElement("div", { className: "link-row archive" }, /* @__PURE__ */ React.createElement("div", { className: "ic" }, /* @__PURE__ */ React.createElement(Icon, { name: "archive", size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "tx" }, /* @__PURE__ */ React.createElement("b", null, "Legacy Modules"), /* @__PURE__ */ React.createElement("span", null, "Math Arena, Word Search, Ramadhan\u2026")), /* @__PURE__ */ React.createElement(Icon, { name: "arrowR", size: 18, color: "var(--text-tertiary)" }))));
  }
  function SoundRow() {
    const [on, setOn] = React.useState(SFX.isOn());
    const toggle = () => {
      const v = !on;
      SFX.setOn(v);
      setOn(v);
      if (v) SFX.play("click");
    };
    return /* @__PURE__ */ React.createElement("div", { className: "link-row", onClick: toggle, style: { cursor: "pointer" } }, /* @__PURE__ */ React.createElement("div", { className: "ic" }, /* @__PURE__ */ React.createElement(Icon, { name: on ? "volume" : "volumeOff", size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "tx" }, /* @__PURE__ */ React.createElement("b", null, "Sound effects"), /* @__PURE__ */ React.createElement("span", null, on ? "On \u2014 sounds when you answer & catch" : "Off")), /* @__PURE__ */ React.createElement("div", { style: {
      width: 40,
      height: 22,
      borderRadius: 999,
      flexShrink: 0,
      position: "relative",
      transition: "background .2s",
      background: on ? "var(--accent)" : "var(--bg-elevated)",
      border: "1px solid " + (on ? "var(--accent)" : "var(--border-medium)")
    } }, /* @__PURE__ */ React.createElement("i", { style: { position: "absolute", top: 2, left: on ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" } })));
  }
  Object.assign(window, { Collection, Store, Profile, regionMons, SoundRow });
  const NAV_LS = "druygon-nav-v2";
  const SLOT_LS = "druygon-slot-v1";
  const VALID_SLOTS = [1, 2, 3, 4];
  const NAV_DEFAULT = { screen: "home", region: "science", zone: 1 };
  function loadNav() {
    try {
      return { ...NAV_DEFAULT, ...JSON.parse(localStorage.getItem(NAV_LS) || "{}") };
    } catch {
      return NAV_DEFAULT;
    }
  }
  function saveNav(screen, region, zone) {
    try {
      localStorage.setItem(NAV_LS, JSON.stringify({ screen, region, zone }));
    } catch {
    }
  }
  function loadSlot() {
    try {
      const n = parseInt(localStorage.getItem(SLOT_LS) || "1", 10);
      return VALID_SLOTS.includes(n) ? n : 1;
    } catch {
      return 1;
    }
  }
  function saveSlot(slot) {
    try {
      localStorage.setItem(SLOT_LS, String(slot));
    } catch {
    }
  }
  async function apiGet(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`${path} \u2192 ${r.status}`);
    return r.json();
  }
  async function apiPost(path, body) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok || !data.success) throw new Error(data.error || `${path} \u2192 ${r.status}`);
    return data;
  }
  async function fetchPlayer(slot) {
    var _a;
    try {
      const d = await apiGet(`/api/player/${slot}`);
      if (!d.name || ((_a = d.profile) == null ? void 0 : _a.disabled)) return null;
      return d;
    } catch {
      return null;
    }
  }
  function App() {
    const nav = loadNav();
    const [activeSlot, setActiveSlot] = React.useState(loadSlot);
    const [screen, setScreen] = React.useState(nav.screen);
    const [region, setRegion] = React.useState(nav.region);
    const [zone, setZone] = React.useState(nav.zone);
    const [playerReady, setPlayerReady] = React.useState(false);
    const [playerErr, setPlayerErr] = React.useState(null);
    const [playerName, setPlayerName] = React.useState("");
    const [profile, setProfile] = React.useState({ level: 1, xp: 0, xpToNext: 100, coins: 0, stats: {}, pokeballs: { pokeball: 5, greatball: 0, ultraball: 0, masterball: 0 } });
    const [caught, setCaught] = React.useState([]);
    const [progress, setProgress] = React.useState([]);
    const [team, setTeam] = React.useState([]);
    const [badges, setBadges] = React.useState([]);
    const [dailyMission, setDailyMission] = React.useState({ progress: 0, target: 3, completed: false, claimed: false, streak: 0 });
    const [allSlots, setAllSlots] = React.useState([]);
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [isFirstLaunch, setIsFirstLaunch] = React.useState(false);
    const [splashName, setSplashName] = React.useState(null);
    const [draco, setDraco] = React.useState(null);
    const openDraco = React.useCallback((ctx) => {
      SFX.play("click");
      setDraco({ ctx: ctx || null });
    }, []);
    const closeDraco = React.useCallback(() => setDraco(null), []);
    const [celeb, setCeleb] = React.useState(null);
    const loadActivePlayer = React.useCallback((slot) => {
      setPlayerReady(false);
      setPlayerErr(null);
      apiGet(`/api/player/${slot}`).then((data) => {
        setPlayerName(data.name || "Trainer");
        setProfile(data.profile);
        setCaught(data.caught || []);
        setProgress(data.progress || []);
        setTeam(data.team || []);
        setBadges(data.badges || []);
        setDailyMission(data.dailyMission || { progress: 0, target: 3, completed: false, claimed: false, streak: 0 });
        setPlayerReady(true);
      }).catch((err) => {
        console.warn("[App] player load failed:", err.message);
        setPlayerReady(true);
        setPlayerErr(err.message);
      });
    }, []);
    React.useEffect(() => {
      const neverChosen = !localStorage.getItem(SLOT_LS);
      if (neverChosen) setIsFirstLaunch(true);
      loadActivePlayer(activeSlot);
      Promise.all(VALID_SLOTS.map((s) => fetchPlayer(s))).then((results) => {
        const slots = results.map(
          (d, i) => d ? { slot: VALID_SLOTS[i], name: d.name, level: d.profile ? d.profile.level : 1, coins: d.profile ? d.profile.coins : 0, caughtCount: (d.caught || []).length } : null
        ).filter(Boolean);
        setAllSlots(slots);
        if (neverChosen) setPickerOpen(true);
      });
    }, []);
    const switchSlot = (slot) => {
      setPickerOpen(false);
      setIsFirstLaunch(false);
      saveSlot(slot);
      const picked = allSlots.find((s) => s.slot === slot);
      if (picked) {
        setSplashName(picked.name);
        setTimeout(() => setSplashName(null), 1500);
      }
      if (slot === activeSlot) return;
      setActiveSlot(slot);
      const newNav = { screen: "home", region: "science", zone: 1 };
      setScreen(newNav.screen);
      setRegion(newNav.region);
      setZone(newNav.zone);
      saveNav(newNav.screen, newNav.region, newNav.zone);
      loadActivePlayer(slot);
    };
    const onTeamAdd = async (dex) => {
      try {
        const data = await apiPost(`/api/player/${activeSlot}/team`, { action: "add", dex });
        setTeam(data.team || []);
      } catch (err) {
        console.error("[App] team add failed:", err.message);
      }
    };
    const onTeamRemove = async (dex) => {
      try {
        const data = await apiPost(`/api/player/${activeSlot}/team`, { action: "remove", dex });
        setTeam(data.team || []);
      } catch (err) {
        console.error("[App] team remove failed:", err.message);
      }
    };
    const onClaimMission = async () => {
      const idem = "mission_" + activeSlot + "_" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + "_" + Date.now();
      try {
        const data = await apiPost(`/api/player/${activeSlot}/mission/claim`, { idempotencyKey: idem });
        setProfile((prev) => {
          var _a, _b, _c, _d;
          return {
            ...prev,
            coins: (_a = data.coinsNow) != null ? _a : prev.coins,
            xp: (_b = data.xpNow) != null ? _b : prev.xp,
            level: (_c = data.levelNow) != null ? _c : prev.level,
            pokeballs: (_d = data.pokeballs) != null ? _d : prev.pokeballs
          };
        });
        setDailyMission((prev) => ({ ...prev, claimed: true, completed: true }));
      } catch (err) {
        console.error("[App] mission claim failed:", err.message);
      }
    };
    const onAnswer = async (correct, zoneId) => {
      if (!correct) return;
      try {
        const data = await apiPost(`/api/player/${activeSlot}/answer`, { correct: true, zoneId });
        setProfile((prev) => {
          var _a, _b, _c;
          return {
            ...prev,
            coins: (_a = data.coinsNow) != null ? _a : prev.coins,
            xp: (_b = data.xpNow) != null ? _b : prev.xp,
            level: (_c = data.levelNow) != null ? _c : prev.level
          };
        });
      } catch (err) {
        console.error("[App] answer reward failed:", err.message);
      }
    };
    const go = (toScreen, toRegion, toZone) => {
      const s = toScreen;
      const r2 = toRegion || region;
      const z = toZone != null ? toZone : zone;
      setScreen(s);
      setRegion(r2);
      setZone(z);
      saveNav(s, r2, z);
      requestAnimationFrame(() => {
        const b = document.querySelector(".body");
        if (b) b.scrollTop = 0;
      });
    };
    const onCaught = async (mon, ball) => {
      var _a;
      setCaught(
        (prev) => prev.some((c) => c.dex === mon.dex) ? prev : [...prev, { dex: mon.dex, zoneId: ball._zoneId || "", caughtAt: (/* @__PURE__ */ new Date()).toISOString() }]
      );
      setProfile((prev) => {
        var _a2, _b;
        return {
          ...prev,
          coins: prev.coins + ((_a2 = ball._coinAward) != null ? _a2 : 50),
          pokeballs: { ...prev.pokeballs, [ball.id]: Math.max(0, ((_b = prev.pokeballs[ball.id]) != null ? _b : 0) - 1) }
        };
      });
      setCeleb({ mon, region, coins: (_a = ball._coinAward) != null ? _a : 50, fact: funFactForTopic(ball._topic) });
      try {
        const data = await apiPost(`/api/player/${activeSlot}/catch`, {
          dex: mon.dex,
          zoneId: ball._zoneId || "",
          ballType: ball.id
        });
        setProfile((prev) => {
          var _a2, _b, _c, _d;
          return {
            ...prev,
            coins: (_a2 = data.coinsNow) != null ? _a2 : prev.coins,
            level: (_b = data.levelNow) != null ? _b : prev.level,
            xp: (_c = data.xpNow) != null ? _c : prev.xp,
            pokeballs: (_d = data.pokeballs) != null ? _d : prev.pokeballs
          };
        });
        if (data.levelUp) {
          setCeleb((prev) => prev ? { ...prev, newLevel: data.levelNow, rewardBalls: data.rewardBalls, levelUp: true } : prev);
        }
        setDailyMission((prev) => ({
          ...prev,
          progress: Math.min(prev.target, prev.progress + 1),
          completed: prev.progress + 1 >= prev.target
        }));
      } catch (err) {
        console.error("[App] catch persist failed:", err.message);
      }
    };
    const closeCeleb = () => {
      setCeleb(null);
      go("map", region);
    };
    const caughtDex = caught.map((c) => c.dex);
    const currentZoneId = (() => {
      if (!window.REGIONS || !window.REGIONS[region]) return "";
      const z = window.REGIONS[region].zones.find((x) => x.zone === zone);
      return z ? z.id : "";
    })();
    const pokeballs = POKEBALLS.map((b) => {
      var _a;
      return {
        ...b,
        own: (_a = profile.pokeballs[b.id]) != null ? _a : 0,
        _zoneId: currentZoneId,
        _coinAward: b.id === "pokeball" ? 50 : b.id === "greatball" ? 80 : b.id === "ultraball" ? 120 : 300
      };
    });
    if (!playerReady) {
      return /* @__PURE__ */ React.createElement("div", { className: "device" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12, color: "var(--text-secondary)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32 } }, "\u26A1"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-display)", fontSize: 13 } }, "Loading\u2026")));
    }
    const r = window.REGIONS && window.REGIONS[region];
    let header, content, showNav = true;
    const openPicker = () => setPickerOpen(true);
    const closePicker = () => {
      setPickerOpen(false);
      setIsFirstLaunch(false);
    };
    const hProps = { playerName, onAvatarTap: openPicker, onOpenDraco: openDraco };
    if (screen === "home") {
      header = /* @__PURE__ */ React.createElement(Header, { region, coins: profile.coins, ...hProps });
      content = /* @__PURE__ */ React.createElement(Home, { go, caught, coins: profile.coins, profile, playerName, allSlots, activeSlot, progress, dailyMission, badges, onClaimMission, onOpenDraco: openDraco });
    } else if (screen === "map") {
      header = /* @__PURE__ */ React.createElement(Header, { region, title: r ? r.name : "\u2026", sub: "Region map", coins: profile.coins, onBack: () => go("home"), ...hProps });
      content = /* @__PURE__ */ React.createElement(RegionMap, { region, go, caught, profile, progress });
    } else if (screen === "catch") {
      const z = r && r.zones.find((x) => x.zone === zone);
      header = /* @__PURE__ */ React.createElement(Header, { region, title: z ? z.name : "\u2026", sub: r ? r.name : "\u2026", coins: profile.coins, onBack: () => go("map", region), ...hProps });
      content = /* @__PURE__ */ React.createElement(Catch, { region, zone, go, onCaught, pokeballs, caught, onAnswer, onOpenDraco: openDraco });
      showNav = false;
    } else if (screen === "collection") {
      header = /* @__PURE__ */ React.createElement(Header, { region, title: "Collection", sub: "Your Pok\xE9dex", coins: profile.coins, ...hProps });
      content = /* @__PURE__ */ React.createElement(Collection, { caught: caughtDex, region, go, team, onTeamAdd, onTeamRemove });
    } else if (screen === "store") {
      header = /* @__PURE__ */ React.createElement(Header, { region, title: "Shop", sub: "Balls & items", coins: profile.coins, ...hProps });
      content = /* @__PURE__ */ React.createElement(Store, { coins: profile.coins, region, pokeballs, activeSlot, onPurchase: (data) => setProfile((prev) => {
        var _a, _b;
        return { ...prev, coins: (_a = data.coinsNow) != null ? _a : prev.coins, pokeballs: (_b = data.pokeballs) != null ? _b : prev.pokeballs };
      }) });
    } else if (screen === "profile") {
      header = /* @__PURE__ */ React.createElement(Header, { region, title: "Profile", sub: "Trainer & parent", coins: profile.coins, ...hProps });
      content = /* @__PURE__ */ React.createElement(
        Profile,
        {
          caught: caughtDex,
          region,
          go,
          profile,
          playerName,
          activeSlot,
          allSlots,
          onSwitchSlot: switchSlot,
          team,
          badges,
          dailyMission,
          progress,
          onTeamRemove
        }
      );
    } else if (screen === "mathblitz") {
      header = /* @__PURE__ */ React.createElement(Header, { region: "curriculum", title: "5-Minute Math", sub: "Timed practice", coins: profile.coins, onBack: () => go("home"), ...hProps });
      content = /* @__PURE__ */ React.createElement(MathBlitz, { activeSlot, onReward: (data) => setProfile((prev) => {
        var _a, _b, _c;
        return { ...prev, coins: (_a = data.coinsNow) != null ? _a : prev.coins, xp: (_b = data.xpNow) != null ? _b : prev.xp, level: (_c = data.levelNow) != null ? _c : prev.level };
      }), go });
      showNav = false;
    }
    const navActive = screen === "catch" || screen === "mathblitz" ? "map" : screen;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "device", "data-region": region }, header, content, showNav && /* @__PURE__ */ React.createElement(BottomNav, { active: navActive, go: (s) => go(s) }), celeb && /* @__PURE__ */ React.createElement(Celebration, { mon: celeb.mon, region: celeb.region, coins: celeb.coins, fact: celeb.fact, onDone: closeCeleb, onTeam: closeCeleb, activeSlot, onTeamAdd, newLevel: celeb.newLevel, rewardBalls: celeb.rewardBalls, levelUp: celeb.levelUp })), pickerOpen && /* @__PURE__ */ React.createElement(
      PlayerPicker,
      {
        allSlots,
        activeSlot,
        onSelect: switchSlot,
        onClose: closePicker,
        isFirstLaunch
      }
    ), splashName && /* @__PURE__ */ React.createElement(PickSplash, { name: splashName }), /* @__PURE__ */ React.createElement(DracoSheet, { open: !!draco, onClose: closeDraco, ctx: draco ? draco.ctx : null, playerName }), playerErr && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", bottom: 8, left: "50%", transform: "translateX(-50%)", background: "#2a1a1a", color: "#f87171", padding: "6px 14px", borderRadius: 8, fontSize: 11, zIndex: 9999, maxWidth: 300, textAlign: "center" } }, "Offline mode \u2014 progress may not save."));
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
})();
