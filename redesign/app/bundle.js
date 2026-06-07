(() => {
  const SPRITE = (dex) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dex}.png`;
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
    { id: "greatball", name: "Great Ball", rate: 0.7, price: 300, own: 2, top: "#3B6FB5", label: "G" },
    { id: "ultraball", name: "Ultra Ball", rate: 0.88, price: 800, own: 1, top: "#F0C419", label: "U" },
    { id: "masterball", name: "Master Ball", rate: 1, price: 5e3, own: 0, top: "#7C3AED", label: "M" }
  ];
  const REGION_META = {
    curriculum: { name: "Dataran Ilmu", tag: "Curriculum", accent: "#FFCB05", accentVar: "--yellow", blurb: "Math & literacy plains", icon: "sigma" },
    science: { name: "Rimba Sains", tag: "Science", accent: "#00D9B8", accentVar: "--teal", blurb: "Living-world wilds", icon: "leaf" },
    compsci: { name: "Sirkuit Digital", tag: "Compsci", accent: "#8B5CF6", accentVar: "--purple", blurb: "Logic & circuits", icon: "cpu" }
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
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2"
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
  const POKEBALL_SVG = {
    pokeball: "/images/pokeballs/pokeball.svg",
    greatball: "/images/pokeballs/greatball.svg",
    ultraball: "/images/pokeballs/ultraball.svg",
    masterball: "/images/pokeballs/masterball.svg"
  };
  function Pokeball({ size = 30, top = "#EE3D34", id, style }) {
    if (id && POKEBALL_SVG[id]) {
      return /* @__PURE__ */ React.createElement(
        "img",
        {
          src: POKEBALL_SVG[id],
          width: size,
          height: size,
          alt: id,
          style: { objectFit: "contain", flexShrink: 0, ...style }
        }
      );
    }
    return /* @__PURE__ */ React.createElement("div", { className: "pokeball", style: { width: size, height: size, "--ball-top": top, ...style } });
  }
  const AVATAR = "../assets/druygon-avatar.png";
  const TUTOR_URL = "/tutor";
  function openTutor(topic) {
    try {
      window.open(TUTOR_URL + (topic ? "?topic=" + encodeURIComponent(topic) : ""), "_blank");
    } catch (e) {
    }
  }
  function Header({ region, title, sub, onBack, coins }) {
    const r = region ? REGIONS[region] : null;
    return /* @__PURE__ */ React.createElement("div", { className: "appbar" }, onBack && /* @__PURE__ */ React.createElement("button", { className: "appbar-back", onClick: onBack }, /* @__PURE__ */ React.createElement(Icon, { name: "back", size: 20 })), title ? /* @__PURE__ */ React.createElement("div", { className: "appbar-title" }, title, sub && /* @__PURE__ */ React.createElement("small", null, sub)) : /* @__PURE__ */ React.createElement("div", { className: "appbar-logo" }, "DRUYGON"), /* @__PURE__ */ React.createElement("button", { className: "appbar-draco", onClick: () => openTutor(), title: "Tanya Draco \u2014 AI tutor" }, /* @__PURE__ */ React.createElement(Icon, { name: "hint", size: 15 }), " Draco"), /* @__PURE__ */ React.createElement("div", { className: "coin-chip" }, /* @__PURE__ */ React.createElement(Icon, { name: "coin", size: 15, color: "var(--yellow)" }), " ", coins), /* @__PURE__ */ React.createElement("div", { className: "avatar" }, /* @__PURE__ */ React.createElement("img", { src: AVATAR, alt: "Dru" })));
  }
  function BottomNav({ active, go }) {
    const items = [
      ["home", "home", "Home"],
      ["map", "map", "Peta"],
      ["collection", "grid", "Koleksi"],
      ["store", "bag", "Toko"],
      ["profile", "user", "Profil"]
    ];
    return /* @__PURE__ */ React.createElement("div", { className: "nav" }, items.map(([id, ic, label]) => /* @__PURE__ */ React.createElement("button", { key: id, className: "nav-slot" + (active === id ? " on" : ""), onClick: () => go(id) }, /* @__PURE__ */ React.createElement("span", { className: "nav-ico" }, /* @__PURE__ */ React.createElement(Icon, { name: ic, size: 22 })), /* @__PURE__ */ React.createElement("span", null, label))));
  }
  Object.assign(window, { Icon, Pokeball, Header, BottomNav, AVATAR, openTutor, TUTOR_URL });
  const { useState: uS1, useRef: uR1, useEffect: uE1 } = React;
  const PLAYER = { name: "Dru", level: 7, xpPct: 62 };
  const RANK = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
  const rarest = (mons) => mons.reduce((a, b) => RANK[b.rarity] > RANK[a.rarity] ? b : a, mons[0]);
  const zoneState = (z) => z.zone === 1 ? "cleared" : PLAYER.level >= z.minLevel ? "open" : "locked";
  function ContentLoading() {
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim" }, /* @__PURE__ */ React.createElement("div", { className: "pad", style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16, color: "var(--text-secondary)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32 } }, "\u26A1"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-display)", fontSize: 14 } }, "Loading world data\u2026")));
  }
  function Home({ go, caught, coins }) {
    const { regions, ready } = useContent();
    if (!ready || !regions) return /* @__PURE__ */ React.createElement(ContentLoading, null);
    const order = ["curriculum", "science", "compsci"].filter((id) => regions[id]);
    const prog = { curriculum: 2, science: 1, compsci: 1 };
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim" }, /* @__PURE__ */ React.createElement("div", { className: "pad" }, /* @__PURE__ */ React.createElement("div", { className: "hero", "data-region": "compsci" }, /* @__PURE__ */ React.createElement("div", { className: "hero-bg", style: { background: "radial-gradient(130% 130% at 88% -20%, rgba(139,92,246,.5), transparent 55%), radial-gradient(90% 120% at 0% 120%, rgba(74,158,255,.28), transparent 60%), linear-gradient(160deg, #1b1540, #0c0a1e 72%)" } }), /* @__PURE__ */ React.createElement("div", { className: "hero-glow" }), /* @__PURE__ */ React.createElement("div", { className: "hero-top" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "hero-greet" }, "Hi, ", /* @__PURE__ */ React.createElement("b", null, "Dru"), " \u{1F44B}"), /* @__PURE__ */ React.createElement("div", { className: "hero-sub" }, "Trainer \xB7 ", caught.length, " caught \xB7 keep the streak!")), /* @__PURE__ */ React.createElement("div", { className: "hero-lvl" }, "LVL ", PLAYER.level)), /* @__PURE__ */ React.createElement("div", { className: "hero-xp" }, /* @__PURE__ */ React.createElement("small", null, "XP"), /* @__PURE__ */ React.createElement("div", { className: "meter", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("i", { style: { width: PLAYER.xpPct + "%" } }))), /* @__PURE__ */ React.createElement("div", { className: "hero-stats" }, /* @__PURE__ */ React.createElement("div", { className: "hero-stat" }, /* @__PURE__ */ React.createElement("b", null, PLAYER.level), /* @__PURE__ */ React.createElement("span", null, "Level")), /* @__PURE__ */ React.createElement("div", { className: "hero-stat" }, /* @__PURE__ */ React.createElement("b", null, coins), /* @__PURE__ */ React.createElement("span", null, "Coins")), /* @__PURE__ */ React.createElement("div", { className: "hero-stat" }, /* @__PURE__ */ React.createElement("b", null, caught.length), /* @__PURE__ */ React.createElement("span", null, "Caught")))), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Choose a world")), /* @__PURE__ */ React.createElement("div", { className: "regions" }, order.map((id) => {
      const r = regions[id];
      const next = r.zones.find((z) => zoneState(z) !== "cleared") || r.zones[2];
      return /* @__PURE__ */ React.createElement("div", { key: id, className: "region-card", "data-region": id, style: { "--rc": r.accent, "--rc-soft": "var(--accent-soft)" }, onClick: () => go("map", id) }, /* @__PURE__ */ React.createElement("div", { className: "region-glow" }), /* @__PURE__ */ React.createElement("div", { className: "region-emblem" }, /* @__PURE__ */ React.createElement(Icon, { name: r.icon, size: 30 })), /* @__PURE__ */ React.createElement("div", { className: "region-main" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "region-name" }, r.name), /* @__PURE__ */ React.createElement("div", { className: "region-tag" }, r.blurb, " \xB7 next: ", next.name)), /* @__PURE__ */ React.createElement("div", { className: "region-foot" }, /* @__PURE__ */ React.createElement("b", null, prog[id], "/3 zones"), /* @__PURE__ */ React.createElement("div", { className: "region-mons" }, r.zones[0].mons.slice(0, 3).map((m) => /* @__PURE__ */ React.createElement("img", { key: m.dex, src: m.sprite, alt: "", crossOrigin: "anonymous" })))), /* @__PURE__ */ React.createElement("div", { className: "meter" }, /* @__PURE__ */ React.createElement("i", { style: { width: prog[id] / 3 * 100 + "%" } }))), /* @__PURE__ */ React.createElement("div", { className: "region-arrow" }, /* @__PURE__ */ React.createElement(Icon, { name: "arrowR", size: 20, color: r.accent })));
    })), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Daily mission"), /* @__PURE__ */ React.createElement("a", null, "Refresh")), /* @__PURE__ */ React.createElement("div", { className: "mission", "data-region": "compsci" }, /* @__PURE__ */ React.createElement("div", { className: "mission-ico" }, /* @__PURE__ */ React.createElement(Icon, { name: "flame", size: 22 })), /* @__PURE__ */ React.createElement("div", { className: "mission-main" }, /* @__PURE__ */ React.createElement("b", null, "Catch 3 in Sirkuit Digital"), /* @__PURE__ */ React.createElement("p", null, "1 of 3 done \xB7 streak \xD710 bonus active"), /* @__PURE__ */ React.createElement("div", { className: "meter" }, /* @__PURE__ */ React.createElement("i", { style: { width: "33%" } }))), /* @__PURE__ */ React.createElement("div", { className: "pill", style: { color: "var(--accent)", borderColor: "var(--accent)" } }, "+50")), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Achievements"), /* @__PURE__ */ React.createElement("a", null, "All")), /* @__PURE__ */ React.createElement("div", { className: "chips-row", "data-region": "compsci" }, [["zap", "Logika Master", "Cleared zone 1"], ["flame", "Streak \xD710", "Today"], ["star", "First Catch", "Unlocked"]].map(([ic, n, d]) => /* @__PURE__ */ React.createElement("div", { key: n, className: "ach" }, /* @__PURE__ */ React.createElement("div", { className: "ach-ico" }, /* @__PURE__ */ React.createElement(Icon, { name: ic, size: 16 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("b", null, n), /* @__PURE__ */ React.createElement("span", null, d))))), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Leaderboard"), /* @__PURE__ */ React.createElement("a", null, "Class 4B")), /* @__PURE__ */ React.createElement("div", { className: "lb", "data-region": "compsci" }, [["1", "Nadia", "24 caught", "4,820"], ["2", "Dru", "you \xB7 12 caught", "3,140", true], ["3", "Bima", "9 caught", "2,510"]].map(([rk, nm, sub, sc, me]) => /* @__PURE__ */ React.createElement("div", { key: rk, className: "lb-row" + (me ? " me" : "") }, /* @__PURE__ */ React.createElement("div", { className: "lb-rank" }, rk), /* @__PURE__ */ React.createElement("div", { className: "lb-av" }, me ? /* @__PURE__ */ React.createElement("img", { src: AVATAR, alt: "" }) : "\u{1F9D1}"), /* @__PURE__ */ React.createElement("div", { className: "lb-name" }, /* @__PURE__ */ React.createElement("b", null, nm), /* @__PURE__ */ React.createElement("span", null, sub)), /* @__PURE__ */ React.createElement("div", { className: "lb-score" }, /* @__PURE__ */ React.createElement("b", null, sc)))))));
  }
  function RegionMap({ region, go, caught }) {
    const { regions, ready } = useContent();
    if (!ready || !regions) return /* @__PURE__ */ React.createElement(ContentLoading, null);
    const r = regions[region];
    if (!r) return /* @__PURE__ */ React.createElement(ContentLoading, null);
    const feat = rarest(r.zones[r.zones.length - 1].mons);
    const clearedCount = r.zones.filter((z) => zoneState(z) === "cleared").length;
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim" }, /* @__PURE__ */ React.createElement("div", { className: "pad" }, /* @__PURE__ */ React.createElement("div", { className: "map-banner" }, /* @__PURE__ */ React.createElement("div", { className: "hero-bg", style: { background: `radial-gradient(120% 120% at 80% 10%, ${r.accent}44, transparent 60%), linear-gradient(135deg, #16122c, #0b0a18)` } }), /* @__PURE__ */ React.createElement("img", { className: "map-banner-mon", src: feat.sprite, alt: "", crossOrigin: "anonymous" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow", style: { color: r.accent } }, "Region \xB7 ", r.tag), /* @__PURE__ */ React.createElement("div", { className: "region-name", style: { fontSize: 22, color: r.accent } }, r.name))), /* @__PURE__ */ React.createElement("div", { className: "map-meta" }, /* @__PURE__ */ React.createElement("div", { className: "pill", style: { color: r.accent, borderColor: r.accent } }, "LVL ", PLAYER.level), /* @__PURE__ */ React.createElement("span", { className: "eyebrow" }, clearedCount, " / ", r.zones.length, " zones cleared")), r.zones.map((z) => {
      const st = zoneState(z);
      const locked = st === "locked", cleared = st === "cleared";
      return /* @__PURE__ */ React.createElement("div", { key: z.zone, className: "zone " + st, onClick: () => !locked && go("catch", region, z.zone) }, /* @__PURE__ */ React.createElement("div", { className: "zone-no" }, cleared ? /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 18, color: "var(--green)", sw: 2.4 }) : locked ? /* @__PURE__ */ React.createElement(Icon, { name: "lock", size: 15 }) : z.zone), /* @__PURE__ */ React.createElement("div", { className: "zone-main" }, /* @__PURE__ */ React.createElement("b", null, z.name), /* @__PURE__ */ React.createElement("code", null, z.topic, locked ? ` \xB7 unlocks LVL ${z.minLevel}` : "")), /* @__PURE__ */ React.createElement("div", { className: "zone-mons" }, z.mons.slice(0, 3).map((m, i) => locked || !cleared && i > 0 ? /* @__PURE__ */ React.createElement("div", { key: i, className: "silh" }, "?") : /* @__PURE__ */ React.createElement("img", { key: i, src: m.sprite, alt: "", crossOrigin: "anonymous" }))), locked ? /* @__PURE__ */ React.createElement(Icon, { name: "lock", size: 16, color: "var(--text-tertiary)" }) : /* @__PURE__ */ React.createElement(Icon, { name: "arrowR", size: 18, color: r.accent }));
    }), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 6 } }, "Tap an open zone to enter the catch loop.")));
  }
  function Catch({ region, zone, go, onCaught, pokeballs: pokeballsProp }) {
    const { regions, questions, ready } = useContent();
    if (!ready || !regions) return /* @__PURE__ */ React.createElement(ContentLoading, null);
    const r = regions[region];
    if (!r) return /* @__PURE__ */ React.createElement(ContentLoading, null);
    const z = r.zones.find((x) => x.zone === zone) || r.zones[0];
    const wild = uR1(rarest(z.mons)).current;
    const firstFallback = Object.values(questions)[0] || [];
    const bank = questions[z.topic] || firstFallback;
    const [hp, setHp] = uS1(100);
    const [qi, setQi] = uS1(0);
    const [phase, setPhase] = uS1("quiz");
    const [fb, setFb] = uS1(null);
    const [hit, setHit] = uS1(false);
    const [ball, setBall] = uS1(null);
    const q = bank[qi % bank.length];
    const answer = (i) => {
      if (phase !== "quiz" || fb) return;
      const ok = i === q.a;
      setFb({ ok, pick: i });
      if (ok) {
        setHit(true);
        setTimeout(() => setHit(false), 400);
      }
      setTimeout(() => {
        setFb(null);
        if (ok) {
          const nh = Math.max(0, hp - 34);
          setHp(nh);
          if (nh <= 8) setPhase("ready");
          else setQi((v) => v + 1);
        } else setQi((v) => v + 1);
      }, 700);
    };
    const throwBall = (b) => {
      setBall(b);
      setPhase("wobble");
      setTimeout(() => onCaught(wild, b), 1500);
    };
    return /* @__PURE__ */ React.createElement("div", { className: "catch screen-anim" }, /* @__PURE__ */ React.createElement("div", { className: "stage" }, /* @__PURE__ */ React.createElement("div", { className: "hero-bg", style: { background: `radial-gradient(120% 90% at 50% 0%, ${r.accent}3a, transparent 55%), linear-gradient(180deg, #15122b, #0a0818)` } }), /* @__PURE__ */ React.createElement("div", { className: "stage-field" }), /* @__PURE__ */ React.createElement("div", { className: "wild-card" }, /* @__PURE__ */ React.createElement("div", { className: "nm" }, /* @__PURE__ */ React.createElement("b", null, wild.name), /* @__PURE__ */ React.createElement("span", null, "Lv ", 3 + zone * 2)), /* @__PURE__ */ React.createElement("div", { className: "hp" }, /* @__PURE__ */ React.createElement("small", null, "HP"), /* @__PURE__ */ React.createElement("div", { className: "meter" }, /* @__PURE__ */ React.createElement("i", { style: { width: hp + "%", background: hp <= 8 ? "var(--red)" : hp < 40 ? "linear-gradient(90deg,#FF6B2B,#FFCB05)" : "linear-gradient(90deg,#4ADE80,#00D9B8)" } }))), /* @__PURE__ */ React.createElement("div", { className: "type-chip", style: { marginTop: 7, background: TYPE_COLOR[wild.type] } }, wild.type)), /* @__PURE__ */ React.createElement("img", { className: "wild-sprite" + (hit ? " hit" : "") + (phase === "wobble" ? " wobble" : ""), src: wild.sprite, alt: wild.name, crossOrigin: "anonymous" }), phase === "wobble" && /* @__PURE__ */ React.createElement("div", { className: "thrown" }, /* @__PURE__ */ React.createElement(Pokeball, { size: 34, top: ball?.top }))), /* @__PURE__ */ React.createElement("div", { className: "cmd" }, phase === "quiz" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "q-prompt" }, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "Question ", qi + 1, " \xB7 ", z.topic), /* @__PURE__ */ React.createElement("h3", null, q.q), /* @__PURE__ */ React.createElement("div", { className: "expr" }, q.expr)), /* @__PURE__ */ React.createElement("div", { className: "answers" + (q.opts.length > 2 ? " two" : "") }, q.opts.map((o, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "ans" + (fb ? i === q.a ? " ok" : i === fb.pick ? " no" : "" : ""), onClick: () => answer(i) }, q.opts.length <= 2 && /* @__PURE__ */ React.createElement("kbd", null, i + 1), /* @__PURE__ */ React.createElement("span", { className: "grow" }, o), fb && i === q.a && /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 18, color: "var(--green)", sw: 2.4 })))), /* @__PURE__ */ React.createElement("div", { className: "cmd-foot" }, /* @__PURE__ */ React.createElement("div", { className: "draco wf-tap", onClick: () => openTutor(z.topic) }, /* @__PURE__ */ React.createElement(Icon, { name: "hint", size: 15 }), " Ask Draco"), /* @__PURE__ */ React.createElement("span", { className: "cmd-hint" }, "Correct answer \u2192 attack \u2193 HP"))), phase === "ready" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ball-prompt" }, "It\u2019s weak \u2014 choose a Pok\xE9 Ball!"), /* @__PURE__ */ React.createElement("div", { className: "balls" }, (pokeballsProp || POKEBALLS).map((b) => /* @__PURE__ */ React.createElement("div", { key: b.id, className: "ball-opt" + (b.own === 0 ? " dim" : ""), onClick: () => b.own > 0 && throwBall(b) }, /* @__PURE__ */ React.createElement(Pokeball, { size: 34, id: b.id, top: b.top }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("b", null, b.name), /* @__PURE__ */ React.createElement("span", null, "\xD7", b.own, " \xB7 ", Math.round(b.rate * 100), "%"))))), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 14 } }, "Higher tiers catch better but are scarcer.")), phase === "wobble" && /* @__PURE__ */ React.createElement("div", { style: { margin: "auto", textAlign: "center", color: "var(--text-secondary)", fontFamily: "var(--font-display)", fontWeight: 700 } }, "\u2026wobble\u2026 wobble\u2026")));
  }
  function Celebration({ mon, region, onDone, onTeam }) {
    const r = REGIONS[region];
    const rar = RARITY[mon.rarity];
    return /* @__PURE__ */ React.createElement("div", { className: "celeb", "data-region": region }, /* @__PURE__ */ React.createElement("svg", { className: "celeb-rays", viewBox: "0 0 400 400", preserveAspectRatio: "xMidYMid slice" }, Array.from({ length: 22 }).map((_, i) => {
      const a = i / 22 * Math.PI * 2;
      return /* @__PURE__ */ React.createElement("line", { key: i, x1: "200", y1: "200", x2: 200 + 360 * Math.cos(a), y2: 200 + 360 * Math.sin(a), stroke: r.accent, strokeWidth: i % 2 ? 6 : 14, opacity: i % 2 ? 0.25 : 0.12 });
    })), /* @__PURE__ */ React.createElement("div", { className: "celeb-eyebrow", style: { color: rar.c } }, mon.rarity === "legendary" ? "\u2605 LEGENDARY CATCH \u2605" : "GOTCHA!"), /* @__PURE__ */ React.createElement("img", { className: "celeb-sprite", src: mon.sprite, alt: mon.name, crossOrigin: "anonymous" }), /* @__PURE__ */ React.createElement("h2", null, mon.name), /* @__PURE__ */ React.createElement("div", { className: "meta" }, /* @__PURE__ */ React.createElement("span", { className: "type-chip", style: { background: TYPE_COLOR[mon.type], verticalAlign: "middle" } }, mon.type), /* @__PURE__ */ React.createElement("span", { style: { color: rar.c, marginLeft: 8, fontWeight: 700 } }, rar.label), " \xB7 added to Koleksi"), /* @__PURE__ */ React.createElement("div", { className: "celeb-rewards" }, [["+50", "XP"], ["+50", "Coins"], ["New", "Pok\xE9dex"]].map(([v, l]) => /* @__PURE__ */ React.createElement("div", { key: l, className: "reward" }, /* @__PURE__ */ React.createElement("b", { style: { color: l === "Coins" ? "var(--yellow)" : "var(--accent)" } }, v), /* @__PURE__ */ React.createElement("span", null, l)))), /* @__PURE__ */ React.createElement("div", { className: "celeb-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary btn-block", onClick: onTeam }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 16, color: "#0b0a16" }), " Add to team"), /* @__PURE__ */ React.createElement("div", { className: "celeb-skip", onClick: onDone }, "Continue \u2192")));
  }
  Object.assign(window, { Home, RegionMap, Catch, Celebration, PLAYER, zoneState, rarest, RANK });
  const regionMons = (id) => {
    const seen = {};
    const out = [];
    REGIONS[id].zones.forEach((z) => z.mons.forEach((m) => {
      if (!seen[m.dex]) {
        seen[m.dex] = 1;
        out.push(m);
      }
    }));
    return out;
  };
  function Collection({ caught, region, go }) {
    const order = ["curriculum", "science", "compsci"];
    const [filter, setFilter] = React.useState("all");
    const has = (dex) => caught.includes(dex);
    const all = order.flatMap(regionMons);
    const total = all.length;
    const legend = all.filter((m) => has(m.dex) && m.rarity === "legendary").length;
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim" }, /* @__PURE__ */ React.createElement("div", { className: "pad" }, /* @__PURE__ */ React.createElement("div", { className: "col-stats" }, /* @__PURE__ */ React.createElement("div", { className: "col-stat", style: { "--accent": REGIONS[region].accent } }, /* @__PURE__ */ React.createElement("b", { style: { color: "var(--accent)" } }, caught.length), /* @__PURE__ */ React.createElement("span", null, "Caught")), /* @__PURE__ */ React.createElement("div", { className: "col-stat" }, /* @__PURE__ */ React.createElement("b", null, total), /* @__PURE__ */ React.createElement("span", null, "Pok\xE9dex")), /* @__PURE__ */ React.createElement("div", { className: "col-stat" }, /* @__PURE__ */ React.createElement("b", { style: { color: "var(--yellow)" } }, legend), /* @__PURE__ */ React.createElement("span", null, "Legendary"))), /* @__PURE__ */ React.createElement("div", { className: "col-filters", "data-region": region }, [["all", "All"], ...order.map((id) => [id, REGIONS[id].tag])].map(([id, label]) => /* @__PURE__ */ React.createElement("div", { key: id, className: "filter" + (filter === id ? " on" : ""), onClick: () => setFilter(id) }, label))), order.filter((id) => filter === "all" || filter === id).map((id) => {
      const r = REGIONS[id];
      const mons = regionMons(id);
      const c = mons.filter((m) => has(m.dex)).length;
      return /* @__PURE__ */ React.createElement("div", { key: id, "data-region": id }, /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", { style: { color: "var(--accent)", fontSize: 15 } }, r.name), /* @__PURE__ */ React.createElement("a", null, c, "/", mons.length)), /* @__PURE__ */ React.createElement("div", { className: "col-grid" }, mons.map((m) => /* @__PURE__ */ React.createElement("div", { key: m.dex, className: "dex" + (has(m.dex) ? "" : " un"), style: has(m.dex) ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : {} }, /* @__PURE__ */ React.createElement("span", { className: "rar", style: { background: RARITY[m.rarity].c } }), /* @__PURE__ */ React.createElement("img", { src: m.sprite, alt: has(m.dex) ? m.name : "???", crossOrigin: "anonymous" }), /* @__PURE__ */ React.createElement("span", { className: "no" }, "#", String(m.dex).padStart(3, "0"))))));
    })));
  }
  function Store({ coins, region, pokeballs }) {
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim", "data-region": region }, /* @__PURE__ */ React.createElement("div", { className: "pad" }, /* @__PURE__ */ React.createElement("div", { className: "wallet" }, /* @__PURE__ */ React.createElement(Pokeball, { size: 40, id: "pokeball", top: "#EE3D34" }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("span", null, "Your coins"), /* @__PURE__ */ React.createElement("b", null, coins)), /* @__PURE__ */ React.createElement("div", { className: "pill" }, /* @__PURE__ */ React.createElement(Icon, { name: "zap", size: 13 }), " Earn more")), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Pok\xE9 Balls")), (pokeballs || POKEBALLS).map((b) => {
      const afford = coins >= b.price;
      return /* @__PURE__ */ React.createElement("div", { key: b.id, className: "store-row", style: { borderLeft: `4px solid ${b.top}` } }, /* @__PURE__ */ React.createElement(Pokeball, { size: 46, id: b.id, top: b.top }), /* @__PURE__ */ React.createElement("div", { className: "info" }, /* @__PURE__ */ React.createElement("b", null, b.name), /* @__PURE__ */ React.createElement("span", null, "Catch rate ", Math.round(b.rate * 100), "% \xB7 you own ", b.own)), /* @__PURE__ */ React.createElement("div", { className: "buy" + (afford ? "" : " disabled") }, /* @__PURE__ */ React.createElement(Icon, { name: "coin", size: 13, color: afford ? "#0b0a16" : "var(--text-tertiary)" }), " ", b.price));
    }), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Items")), /* @__PURE__ */ React.createElement("div", { className: "store-row" }, /* @__PURE__ */ React.createElement("div", { className: "mission-ico", style: { width: 46, height: 46 } }, /* @__PURE__ */ React.createElement(Icon, { name: "hint", size: 22 })), /* @__PURE__ */ React.createElement("div", { className: "info" }, /* @__PURE__ */ React.createElement("b", null, "Draco Hint \xD73"), /* @__PURE__ */ React.createElement("span", null, "Reveal a clue during any zone")), /* @__PURE__ */ React.createElement("div", { className: "buy" }, /* @__PURE__ */ React.createElement(Icon, { name: "coin", size: 13, color: "#0b0a16" }), " 150"))));
  }
  function Profile({ caught, region, go }) {
    const prog = { curriculum: 66, science: 33, compsci: 12 };
    return /* @__PURE__ */ React.createElement("div", { className: "body screen-anim", "data-region": region }, /* @__PURE__ */ React.createElement("div", { className: "pad" }, /* @__PURE__ */ React.createElement("div", { className: "prof-card" }, /* @__PURE__ */ React.createElement("div", { className: "prof-av" }, /* @__PURE__ */ React.createElement("img", { src: AVATAR, alt: "Dru" })), /* @__PURE__ */ React.createElement("div", { className: "who" }, /* @__PURE__ */ React.createElement("b", null, "Dru"), /* @__PURE__ */ React.createElement("span", null, "Trainer \xB7 Level ", PLAYER.level, " \xB7 ", caught.length, " caught"), /* @__PURE__ */ React.createElement("div", { className: "meter", style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement("i", { style: { width: PLAYER.xpPct + "%" } })))), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Player slots")), /* @__PURE__ */ React.createElement("div", { className: "slots" }, /* @__PURE__ */ React.createElement("div", { className: "slot on" }, /* @__PURE__ */ React.createElement("div", { className: "slot-av" }, /* @__PURE__ */ React.createElement("img", { src: AVATAR, alt: "Dru" })), /* @__PURE__ */ React.createElement("b", null, "Dru")), /* @__PURE__ */ React.createElement("div", { className: "slot add" }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 26 }), /* @__PURE__ */ React.createElement("b", null, "Add"))), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "Progress by world")), ["curriculum", "science", "compsci"].map((id) => {
      const r = REGIONS[id];
      return /* @__PURE__ */ React.createElement("div", { key: id, className: "prog-row", "data-region": id }, /* @__PURE__ */ React.createElement("b", { style: { color: "var(--accent)" } }, r.name), /* @__PURE__ */ React.createElement("div", { className: "meter" }, /* @__PURE__ */ React.createElement("i", { style: { width: prog[id] + "%" } })), /* @__PURE__ */ React.createElement("span", null, prog[id], "%"));
    }), /* @__PURE__ */ React.createElement("div", { className: "sec-head" }, /* @__PURE__ */ React.createElement("h2", null, "For grown-ups")), /* @__PURE__ */ React.createElement("div", { className: "link-row" }, /* @__PURE__ */ React.createElement("div", { className: "ic" }, /* @__PURE__ */ React.createElement(Icon, { name: "chart", size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "tx" }, /* @__PURE__ */ React.createElement("b", null, "Parent dashboard"), /* @__PURE__ */ React.createElement("span", null, "Time played \xB7 topics \xB7 accuracy \xB7 /parent")), /* @__PURE__ */ React.createElement(Icon, { name: "arrowR", size: 18, color: "var(--text-tertiary)" })), /* @__PURE__ */ React.createElement("div", { className: "link-row archive" }, /* @__PURE__ */ React.createElement("div", { className: "ic" }, /* @__PURE__ */ React.createElement(Icon, { name: "archive", size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "tx" }, /* @__PURE__ */ React.createElement("b", null, "Modul Lama"), /* @__PURE__ */ React.createElement("span", null, "Math Arena, Word Search, Ramadhan\u2026 \xB7 /archive")), /* @__PURE__ */ React.createElement(Icon, { name: "arrowR", size: 18, color: "var(--text-tertiary)" }))));
  }
  Object.assign(window, { Collection, Store, Profile, regionMons });
  const NAV_LS = "druygon-nav-v2";
  const SLOT = 1;
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
  function App() {
    const nav = loadNav();
    const [screen, setScreen] = React.useState(nav.screen);
    const [region, setRegion] = React.useState(nav.region);
    const [zone, setZone] = React.useState(nav.zone);
    const [playerReady, setPlayerReady] = React.useState(false);
    const [playerErr, setPlayerErr] = React.useState(null);
    const [profile, setProfile] = React.useState({ level: 1, xp: 0, xpToNext: 100, coins: 0, stats: {}, pokeballs: { pokeball: 5, greatball: 0, ultraball: 0, masterball: 0 } });
    const [caught, setCaught] = React.useState([]);
    const [progress, setProgress] = React.useState([]);
    const [celeb, setCeleb] = React.useState(null);
    React.useEffect(() => {
      apiGet(`/api/player/${SLOT}`).then((data) => {
        setProfile(data.profile);
        setCaught(data.caught || []);
        setProgress(data.progress || []);
        setPlayerReady(true);
      }).catch((err) => {
        console.warn("[App] player load failed, using defaults:", err.message);
        setPlayerReady(true);
        setPlayerErr(err.message);
      });
    }, []);
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
      setCaught(
        (prev) => prev.some((c) => c.dex === mon.dex) ? prev : [...prev, { dex: mon.dex, zoneId: ball._zoneId || "", caughtAt: (/* @__PURE__ */ new Date()).toISOString() }]
      );
      setProfile((prev) => ({
        ...prev,
        coins: prev.coins + (ball._coinAward ?? 50),
        pokeballs: {
          ...prev.pokeballs,
          [ball.id]: Math.max(0, (prev.pokeballs[ball.id] ?? 0) - 1)
        }
      }));
      setCeleb({ mon, region });
      try {
        const data = await apiPost(`/api/player/${SLOT}/catch`, {
          dex: mon.dex,
          zoneId: ball._zoneId || "",
          ballType: ball.id
        });
        setProfile((prev) => ({
          ...prev,
          coins: data.coinsNow ?? prev.coins,
          level: data.levelNow ?? prev.level,
          xp: data.xpNow ?? prev.xp,
          pokeballs: data.pokeballs ?? prev.pokeballs
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
    const pokeballs = POKEBALLS.map((b) => ({
      ...b,
      own: profile.pokeballs[b.id] ?? 0,
      _zoneId: currentZoneId,
      _coinAward: b.id === "pokeball" ? 50 : b.id === "greatball" ? 80 : b.id === "ultraball" ? 120 : 300
    }));
    if (!playerReady) {
      return /* @__PURE__ */ React.createElement("div", { className: "device" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12, color: "var(--text-secondary)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32 } }, "\u26A1"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-display)", fontSize: 13 } }, "Loading Dru's data\u2026")));
    }
    const r = window.REGIONS && window.REGIONS[region];
    let header, content, showNav = true;
    if (screen === "home") {
      header = /* @__PURE__ */ React.createElement(Header, { region, coins: profile.coins });
      content = /* @__PURE__ */ React.createElement(Home, { go, caught: caughtDex, coins: profile.coins });
    } else if (screen === "map") {
      header = /* @__PURE__ */ React.createElement(Header, { region, title: r ? r.name : "\u2026", sub: "Region map", coins: profile.coins, onBack: () => go("home") });
      content = /* @__PURE__ */ React.createElement(RegionMap, { region, go, caught: caughtDex });
    } else if (screen === "catch") {
      const z = r && r.zones.find((x) => x.zone === zone);
      header = /* @__PURE__ */ React.createElement(Header, { region, title: z ? z.name : "\u2026", sub: r ? r.name : "\u2026", coins: profile.coins, onBack: () => go("map", region) });
      content = /* @__PURE__ */ React.createElement(Catch, { region, zone, go, onCaught, pokeballs });
      showNav = false;
    } else if (screen === "collection") {
      header = /* @__PURE__ */ React.createElement(Header, { region, title: "Koleksi", sub: "Your Pok\xE9dex", coins: profile.coins });
      content = /* @__PURE__ */ React.createElement(Collection, { caught: caughtDex, region, go });
    } else if (screen === "store") {
      header = /* @__PURE__ */ React.createElement(Header, { region, title: "Toko", sub: "Balls & items", coins: profile.coins });
      content = /* @__PURE__ */ React.createElement(Store, { coins: profile.coins, region, pokeballs });
    } else if (screen === "profile") {
      header = /* @__PURE__ */ React.createElement(Header, { region, title: "Profil", sub: "Trainer & parent", coins: profile.coins });
      content = /* @__PURE__ */ React.createElement(Profile, { caught: caughtDex, region, go, profile });
    }
    const navActive = screen === "catch" ? "map" : screen;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "device", "data-region": region }, header, content, showNav && /* @__PURE__ */ React.createElement(BottomNav, { active: navActive, go: (s) => go(s) }), celeb && /* @__PURE__ */ React.createElement(Celebration, { mon: celeb.mon, region: celeb.region, onDone: closeCeleb, onTeam: closeCeleb })), playerErr && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", bottom: 8, left: "50%", transform: "translateX(-50%)", background: "#2a1a1a", color: "#f87171", padding: "6px 14px", borderRadius: 8, fontSize: 11, zIndex: 9999, maxWidth: 300, textAlign: "center" } }, "Offline mode \u2014 progress may not save. (", playerErr, ")"));
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
})();
