// components.jsx — Icon set (Feather/Tabler 1.5px stroke), CSS Pokéball, Header, BottomNav.

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5',
  map: 'M9 4 3 6v15l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v15m6-13v15',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  bag: 'M5 8h14l-1.2 11.5a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Zm3.5 0V6.5a3.5 3.5 0 0 1 7 0V8',
  user: 'M5 20v-1.5A4.5 4.5 0 0 1 9.5 14h5a4.5 4.5 0 0 1 4.5 4.5V20M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  back: 'M15 5l-7 7 7 7',
  arrowR: 'M5 12h14M13 6l6 6-6 6',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v10M9.2 9.6h4a1.6 1.6 0 0 1 0 3.2h-2.2a1.6 1.6 0 0 0 0 3.2h4',
  lock: 'M6 11h12v9H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
  check: 'M4 12.5 9 17.5 20 6.5',
  star: 'M12 3l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 17.8 6.2 21l1.5-6.5-5-4.4 6.6-.6Z',
  zap: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z',
  flag: 'M5 21V4h11l-2 4 2 4H5',
  hint: 'M12 3a6 6 0 0 1 4 10.5c-.8.8-1 1.6-1 2.5H9c0-.9-.2-1.7-1-2.5A6 6 0 0 1 12 3ZM9.5 19.5h5M10.5 22h3',
  x: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  sparkles: 'M12 3l1.8 4.8L18.5 9l-4.7 1.2L12 15l-1.8-4.8L5.5 9l4.7-1.2L12 3ZM18 14l.9 2.4 2.4.9-2.4.9L18 21l-.9-2.4-2.4-.9 2.4-.9L18 14Z',
  flame: 'M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c2 1.5 3 3.5 3 5.5a5 5 0 0 1-10 0C7 12 11 9 12 3Z',
  sigma: 'M6 4h12M6 4l7 8-7 8h12v-3',
  leaf: 'M5 19c0-8 6-13 14-13 0 9-5 14-13 14M5 19c2-4 5-6 9-7',
  cpu: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3',
  users: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 11a3.5 3.5 0 0 0 0-7M21 20v-1.5a4 4 0 0 0-3-3.8',
  archive: 'M4 7h16v3H4zM5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9M9.5 14h5M4 7l1.5-3h13L20 7',
  chart: 'M5 21V9M12 21V4M19 21v-7M3 21h18',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
};
const FILLED = new Set(['star']);

function Icon({ name, size = 22, color = 'currentColor', sw = 1.7, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={FILLED.has(name) ? color : 'none'}
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      <path d={ICONS[name] || ICONS.target} />
    </svg>
  );
}

// Per-tier pokéball SVG paths (served from /images/pokeballs/<id>.svg)
// Falls back to CSS-art div if SVG not loaded
const POKEBALL_SVG = {
  pokeball:   '/images/pokeballs/pokeball.svg',
  greatball:  '/images/pokeballs/greatball.svg',
  ultraball:  '/images/pokeballs/ultraball.svg',
  masterball: '/images/pokeballs/masterball.svg',
};
function getPokeballImg(ballId) { return POKEBALL_SVG[ballId] || POKEBALL_SVG.pokeball; }

function Pokeball({ size = 30, top = '#EE3D34', id, style }) {
  if (id && POKEBALL_SVG[id]) {
    return <img src={POKEBALL_SVG[id]} width={size} height={size} alt={id}
      style={{ objectFit: 'contain', flexShrink: 0, ...style }} />;
  }
  return <div className="pokeball" style={{ width: size, height: size, '--ball-top': top, ...style }} />;
}

const AVATAR = '/assets/druygon-avatar.png';  // absolute — safe from any page URL
const TUTOR_URL = '/tutor';   // the separate AI-tutor app; swap for the real path
function openTutor(topic) { try { window.open(TUTOR_URL + (topic ? ('?topic=' + encodeURIComponent(topic)) : ''), '_blank'); } catch (e) {} }

function Header({ region, title, sub, onBack, coins, playerName }) {
  const r = region ? REGIONS[region] : null;
  return (
    <div className="appbar">
      {onBack && <button className="appbar-back" onClick={onBack}><Icon name="back" size={20} /></button>}
      {title
        ? <div className="appbar-title">{title}{sub && <small>{sub}</small>}</div>
        : <div className="appbar-logo">DRUYGON</div>}
      <button className="appbar-draco" onClick={() => openTutor()} title="Tanya Draco — AI tutor"><Icon name="hint" size={15} /> Draco</button>
      <div className="coin-chip"><Icon name="coin" size={15} color="var(--yellow)" /> {coins}</div>
      <div className="avatar"><img src={AVATAR} alt="Dru" /></div>
    </div>
  );
}

function BottomNav({ active, go }) {
  const items = [
    ['home', 'home', 'Home'], ['map', 'map', 'Peta'], ['collection', 'grid', 'Koleksi'],
    ['store', 'bag', 'Toko'], ['profile', 'user', 'Profil'],
  ];
  return (
    <div className="nav">
      {items.map(([id, ic, label]) => (
        <button key={id} className={'nav-slot' + (active === id ? ' on' : '')} onClick={() => go(id)}>
          <span className="nav-ico"><Icon name={ic} size={22} /></span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { Icon, Pokeball, Header, BottomNav, AVATAR, openTutor, TUTOR_URL });
