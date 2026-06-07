// components.jsx — Icon set, Pokéball, Header, BottomNav, PlayerPicker.

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

const AVATAR = '/assets/druygon-avatar.png';
const TUTOR_URL = '/tutor';
function openTutor(topic) { try { window.open(TUTOR_URL + (topic ? ('?topic=' + encodeURIComponent(topic)) : ''), '_blank'); } catch (e) {} }

// ── SlotAvatar — trainer icon per player ────────────────────────────────────
const SLOT_COLORS = ['#8B5CF6', '#00D9B8', '#FFCB05', '#EE3D34'];
const SLOT_NAMES  = ['Dru', 'Oming', 'Reymar', 'Ilyas'];
const TRAINER_IMGS = {
  'Dru':    '/assets/trainers/trainer-dru.svg',
  'Oming':  '/assets/trainers/trainer-oming.svg',
  'Reymar': '/assets/trainers/trainer-reymar.svg',
  'Ilyas':  '/assets/trainers/trainer-ilyas.svg',
};

function SlotAvatar({ name, size = 36, active = false }) {
  const idx  = Math.max(0, SLOT_NAMES.indexOf(name));
  const bg   = SLOT_COLORS[idx % SLOT_COLORS.length];
  const img  = TRAINER_IMGS[name];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg + '22',
      border: active ? `2.5px solid ${bg}` : '2.5px solid rgba(255,255,255,.1)',
      boxShadow: active ? `0 0 0 2px #0b0a16, 0 0 10px ${bg}88` : 'none',
      overflow: 'hidden', transition: 'box-shadow .15s',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {img
        ? <img src={img} width={size - 4} height={size - 4} alt={name || '?'}
            style={{ objectFit: 'contain', display: 'block' }} />
        : <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: Math.round(size * 0.4), color: bg }}>
            {(name || '?')[0].toUpperCase()}
          </span>
      }
    </div>
  );
}

// ── PlayerPicker overlay — shown on avatar tap or first launch ────────────────
function PlayerPicker({ allSlots, activeSlot, onSelect, onClose, isFirstLaunch }) {
  React.useEffect(() => {
    if (isFirstLaunch) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isFirstLaunch, onClose]);

  return (
    <div className="player-picker-overlay" role="presentation" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8,7,20,.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={isFirstLaunch ? undefined : onClose}>
      <div className="player-picker-dialog" role="dialog" aria-modal="true"
        aria-labelledby="player-picker-title" style={{
        width: '100%', maxWidth: 360,
        background: 'var(--bg-card, #16132e)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 20, padding: '28px 20px 20px',
        boxShadow: '0 24px 64px rgba(0,0,0,.6)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--accent)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
              {isFirstLaunch ? 'Selamat Datang' : 'Ganti Pemain'}
            </div>
            <div id="player-picker-title" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0eeff)' }}>
              {isFirstLaunch ? 'Pilih karaktermu' : 'Pilih karakter'}
            </div>
          </div>
          {!isFirstLaunch && (
            <button aria-label="Tutup pemilih pemain" onClick={onClose} style={{
              background: 'rgba(255,255,255,.07)', border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="x" size={16} />
            </button>
          )}
        </div>

        {/* Slot grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(allSlots && allSlots.length > 0 ? allSlots : SLOT_NAMES.map((n, i) => ({ slot: i + 1, name: n, level: 1, caughtCount: 0, coins: 0 }))).map(s => {
            const isActive = s.slot === activeSlot;
            return (
              <button key={s.slot} aria-label={`Pilih pemain ${s.name}`}
                onClick={() => onSelect(s.slot)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 8, padding: '16px 12px', borderRadius: 14, cursor: 'pointer',
                border: isActive ? '2px solid var(--accent)' : '2px solid rgba(255,255,255,.07)',
                background: isActive ? 'var(--accent-soft, rgba(139,92,246,.12))' : 'rgba(255,255,255,.04)',
                transition: 'all .15s',
                position: 'relative',
              }}>
                <SlotAvatar name={s.name} size={52} active={isActive} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: isActive ? 'var(--accent)' : 'var(--text-primary, #f0eeff)' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary, #9aa0b5)', marginTop: 2 }}>
                    Lv {s.level} &middot; {s.caughtCount} caught
                  </div>
                </div>
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'var(--accent)', borderRadius: 4,
                    fontSize: 8, fontWeight: 700, color: '#fff',
                    padding: '2px 5px', letterSpacing: .5,
                  }}>
                    AKTIF
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {isFirstLaunch && (
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary, #4b4680)', marginTop: 16, marginBottom: 0 }}>
            Bisa diganti kapan saja lewat ikon di pojok kanan atas
          </p>
        )}
      </div>
    </div>
  );
}

// ── Header — avatar tap opens PlayerPicker ───────────────────────────────────
function Header({ region, title, sub, onBack, coins, playerName, onAvatarTap }) {
  return (
    <div className="appbar">
      {onBack && <button className="appbar-back" onClick={onBack}><Icon name="back" size={20} /></button>}
      {title
        ? <div className="appbar-title">{title}{sub && <small>{sub}</small>}</div>
        : <div className="appbar-logo">DRUYGON</div>}
      <button className="appbar-draco" onClick={() => openTutor()} title="Tanya Draco — AI tutor">
        <Icon name="hint" size={15} /> Draco
      </button>
      <div className="coin-chip"><Icon name="coin" size={15} color="var(--yellow)" /> {coins}</div>
      {/* Avatar button — tap to open player picker */}
      <button aria-label={'Ganti pemain. Pemain aktif: ' + (playerName || 'belum dipilih')}
        onClick={onAvatarTap} style={{
        background: 'none', border: 'none', padding: 2, cursor: 'pointer',
        borderRadius: '50%', lineHeight: 0,
      }} title={'Pemain: ' + (playerName || 'Pilih karakter')}>
        <SlotAvatar name={playerName} size={32} active />
      </button>
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

Object.assign(window, {
  Icon, Pokeball, Header, BottomNav, SlotAvatar, PlayerPicker,
  AVATAR, openTutor, TUTOR_URL, SLOT_COLORS, SLOT_NAMES,
});
