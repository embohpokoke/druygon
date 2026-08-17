// data.jsx — content helpers for the Druygon redesign.
// Phase B: REGIONS and QUESTIONS are loaded from /api/content/* at runtime.
// Static fallbacks are used until the first fetch resolves.

const SPRITE = (dex) =>
  `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${dex}.png`;

// type → accent color
const TYPE_COLOR = {
  Normal: '#A8A878', Fire: '#F08030', Water: '#6890F0', Electric: '#F7D02C',
  Grass: '#78C850', Ice: '#98D8D8', Fighting: '#C03028', Poison: '#A040A0',
  Ground: '#E0C068', Flying: '#A890F0', Psychic: '#F85888', Bug: '#A8B820',
  Rock: '#B8A038', Ghost: '#705898', Dragon: '#7038F8', Steel: '#B8B8D0', Fairy: '#EE99AC',
};

const RARITY = {
  common:    { label: 'Common',    c: '#9aa0b5' },
  uncommon:  { label: 'Uncommon',  c: '#4ADE80' },
  rare:      { label: 'Rare',      c: '#4A9EFF' },
  legendary: { label: 'Legendary', c: '#FFCB05' },
};

const POKEBALLS = [
  { id: 'pokeball',   name: 'Poké Ball',   rate: 0.50, price: 100,  own: 5, top: '#EE3D34', label: 'P' },
  { id: 'greatball',  name: 'Great Ball',  rate: 0.70, price: 200,  own: 2, top: '#3B6FB5', label: 'G' },
  { id: 'ultraball',  name: 'Ultra Ball',  rate: 0.88, price: 500,  own: 1, top: '#F0C419', label: 'U' },
  { id: 'masterball', name: 'Master Ball', rate: 1.00, price: 2000, own: 0, top: '#7C3AED', label: 'M' },
];

// Static metadata (colours, blurbs, icons) — these never change at runtime.
const REGION_META = {
  curriculum: { name: 'Math Plains',      tag: 'Math',     accent: '#FFCB05', accentVar: '--yellow',  blurb: 'Numbers & problem solving', icon: 'sigma' },
  science:    { name: 'Science Wilds',    tag: 'Science',  accent: '#00D9B8', accentVar: '--teal',    blurb: 'Living-world wilds',        icon: 'leaf'  },
  matpel:     { name: 'MATPEL Sekolah',   tag: 'School',   accent: '#F97316', accentVar: '--orange',  blurb: 'Pelajaran sekolah kelas 5', icon: 'book'  },
};

// ── Live state — mutated by loadContent() ────────────────────────────────────
// REGIONS and QUESTIONS start as null; components should show a loading state
// until window.__contentReady resolves (or use the useContent() hook below).
let REGIONS   = null;
let QUESTIONS = {};
let _contentReady = false;
const _callbacks  = [];

function onContentReady(fn) {
  if (_contentReady) { fn(); return; }
  _callbacks.push(fn);
}

function _notifyReady() {
  _contentReady = true;
  _callbacks.forEach((fn) => fn());
  _callbacks.length = 0;
}

// ── API loaders ───────────────────────────────────────────────────────────────

async function _fetchRegions() {
  const res = await fetch('/api/content/regions');
  if (!res.ok) throw new Error(`/api/content/regions → ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);

  // Merge API data with static metadata (accent, icon, blurb, tag)
  const regions = {};
  for (const [id, r] of Object.entries(data.regions)) {
    const meta = REGION_META[id] || {};
    regions[id] = {
      id,
      name:      r.name,
      accent:    r.accent || meta.accent,
      accentVar: meta.accentVar || '',
      blurb:     meta.blurb    || '',
      tag:       meta.tag      || id,
      icon:      meta.icon     || 'star',
      zones:     r.zones.map((z) => ({
        zone:     z.zone,
        id:       z.id,
        name:     z.name,
        topic:    z.topic,
        minLevel: z.minLevel,
        mons:     z.mons,         // already have .sprite from API
      })),
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

    // Collect all topics from all regions
    const topics = [];
    for (const r of Object.values(REGIONS)) {
      for (const z of r.zones) {
        if (z.topic && !topics.includes(z.topic)) topics.push(z.topic);
      }
    }

    // Fetch all topics in parallel
    const results = await Promise.all(topics.map((t) => _fetchQuestions(t)));
    topics.forEach((t, i) => { if (results[i].length) QUESTIONS[t] = results[i]; });

    console.log('[data] content loaded — regions:', Object.keys(REGIONS).length, '| topics:', Object.keys(QUESTIONS).length);
    _notifyReady();
  } catch (err) {
    console.error('[data] loadContent failed:', err);
    // Fall back to minimal placeholder so the UI doesn't hang
    REGIONS = REGIONS || _staticFallback();
    _notifyReady();
  }
}

// ── Minimal static fallback (identical to old data.jsx) ─────────────────────
// Used only if the API is unreachable on first load.
function _staticFallback() {
  const mon = (dex, name, type, rarity) => ({ dex, name, type, rarity, sprite: SPRITE(dex) });
  return {
    curriculum: {
      id: 'curriculum', name: 'Dataran Ilmu',   accent: '#FFCB05', accentVar: '--yellow', blurb: 'Math & literacy plains', tag: 'Curriculum', icon: 'sigma',
      zones: [
        { zone: 1, name: 'Padang Pemula',   topic: 'operasi_hitung', minLevel: 1,  mons: [mon(19,'Rattata','Normal','common'),mon(16,'Pidgey','Flying','common'),mon(133,'Eevee','Normal','uncommon'),mon(25,'Pikachu','Electric','rare')] },
        { zone: 2, name: 'Lembah Belajar',  topic: 'pecahan',        minLevel: 6,  mons: [mon(52,'Meowth','Normal','common'),mon(7,'Squirtle','Water','uncommon'),mon(4,'Charmander','Fire','uncommon')] },
        { zone: 3, name: 'Puncak Cendekia', topic: 'geometri',       minLevel: 11, mons: [mon(1,'Bulbasaur','Grass','common'),mon(65,'Alakazam','Psychic','rare'),mon(150,'Mewtwo','Psychic','legendary')] },
      ],
    },
    science: {
      id: 'science', name: 'Rimba Sains', accent: '#00D9B8', accentVar: '--teal', blurb: 'Living-world wilds', tag: 'Science', icon: 'leaf',
      zones: [
        { zone: 1, name: 'Tunas Hijau',     topic: 'makhluk_hidup',      minLevel: 1,  mons: [mon(43,'Oddish','Grass','common'),mon(548,'Petilil','Grass','uncommon')] },
        { zone: 2, name: 'Sarang Serangga', topic: 'serangga_ekosistem', minLevel: 6,  mons: [mon(13,'Weedle','Bug','common'),mon(637,'Volcarona','Bug','legendary')] },
        { zone: 3, name: 'Reaktor Mineral', topic: 'materi_energi',      minLevel: 11, mons: [mon(74,'Geodude','Rock','common'),mon(145,'Zapdos','Electric','legendary')] },
      ],
    },
    matpel: {
      id: 'matpel', name: 'MATPEL Sekolah', accent: '#F97316', accentVar: '--orange', blurb: 'Pelajaran sekolah kelas 5', tag: 'School', icon: 'book',
      zones: [
        { zone: 1, name: 'Pulau Puisi',      topic: 'puisi',             minLevel: 1,  mons: [mon(39,'Jigglypuff','Normal','common'),mon(441,'Chatot','Flying','common'),mon(648,'Meloetta','Psychic','rare')] },
        { zone: 4, name: 'Cahaya At-Tiin',   topic: 'qs_at_tiin',        minLevel: 1,  mons: [mon(928,'Smoliv','Grass','common'),mon(173,'Cleffa','Fairy','common'),mon(929,'Dolliv','Grass','rare')] },
        { zone: 2, name: 'Benteng Perjuangan', topic: 'perjuangan_bangsa', minLevel: 1, mons: [mon(140,'Kabuto','Rock','common'),mon(138,'Omanyte','Rock','common'),mon(142,'Aerodactyl','Flying','rare')] },
      ],
    },
  };
}

// ── "Tahukah kamu?" — curated, kid-safe facts shown after a catch ────────────
// Keyed by zone topic. Facts are deliberately simple & verifiable (QA-gated).
const FUNFACTS = {
  makhluk_hidup: [
    'Did you know? The oldest tree on Earth is over 4,800 years old — older than the pyramids!',
    'Did you know? Your body has about 37 trillion cells, all working together every second.',
  ],
  serangga_ekosistem: [
    'Did you know? An ant can lift up to 50 times its own body weight!',
    'Did you know? Without bees, many fruits and vegetables would not grow — they help pollinate.',
  ],
  materi_energi: [
    'Did you know? Water can be solid (ice), liquid, and gas (steam) — same stuff, different states.',
    'Did you know? Sunlight takes about 8 minutes to travel all the way to Earth.',
  ],
  atom_dan_unsur: [
    'Did you know? Everything is made of atoms — so tiny you can never see one with your eyes.',
    'Did you know? Gold and iron are both elements, but their atoms are different kinds.',
  ],
  galaksi_dan_angkasa: [
    'Did you know? Our galaxy, the Milky Way, has more than 100 billion stars.',
    'Did you know? One day on Venus is longer than one whole year on Venus!',
  ],
  puisi: [
    'Tahukah kamu? Puisi sudah ada sejak ribuan tahun lalu — jauh sebelum orang menulis buku cerita.',
    'Tahukah kamu? Chairil Anwar adalah penyair Indonesia yang terkenal dengan puisi "Aku".',
  ],
  perjuangan_bangsa: [
    'Tahukah kamu? Rempah-rempah Indonesia seperti pala dan cengkeh dulu lebih berharga daripada emas.',
    'Tahukah kamu? Sumpah Pemuda 1928 diikrarkan 17 tahun sebelum Proklamasi Kemerdekaan.',
  ],
  toleransi_bela_negara: [
    'Tahukah kamu? Indonesia punya lebih dari 1.300 suku bangsa — semuanya bisa hidup rukun.',
    'Tahukah kamu? Bhineka Tunggal Ika artinya berbeda-beda tetapi tetap satu.',
  ],
  qs_at_tiin: [
    'Tahukah kamu? Buah Tin (ara) disebut dalam Al-Qur\'an dan sudah dimakan manusia sejak ribuan tahun lalu.',
    'Tahukah kamu? Surat At-Tiin ada di juz 30 — juz yang berisi surat-surat pendek.',
  ],
  kisah_teladan: [
    'Tahukah kamu? Asmaul Husna berjumlah 99 nama Allah yang baik.',
    'Tahukah kamu? Bersedekah tidak membuat harta berkurang — justru membawa keberkahan.',
  ],
  english_past_inventors: [
    'Did you know? Thomas Edison tried thousands of materials before his light bulb worked.',
    'Did you know? The first airplane flight by the Wright brothers lasted only 12 seconds!',
  ],
  seni_karya: [
    'Tahukah kamu? Origami berasal dari Jepang — "oru" artinya melipat dan "kami" artinya kertas.',
    'Tahukah kamu? Botol plastik bekas bisa menjadi pot tanaman, celengan, atau hiasan dinding.',
  ],
};
function funFactForTopic(topic) {
  const list = FUNFACTS[topic];
  if (!list || !list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

// ── React hook for components ─────────────────────────────────────────────────
// Usage: const { regions, questions, ready } = useContent();
function useContent() {
  const [ready, setReady] = React.useState(_contentReady);
  React.useEffect(() => {
    if (_contentReady) { setReady(true); return; }
    onContentReady(() => setReady(true));
  }, []);
  return { regions: REGIONS, questions: QUESTIONS, ready };
}

// Kick off the load immediately when this script executes
loadContent();

Object.assign(window, {
  SPRITE, TYPE_COLOR, RARITY, POKEBALLS, REGION_META, FUNFACTS, funFactForTopic,
  // Live-updated refs — components read these after ready
  get REGIONS()   { return REGIONS;   },
  get QUESTIONS() { return QUESTIONS; },
  useContent, onContentReady, loadContent,
});
