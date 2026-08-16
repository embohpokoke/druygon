// components.jsx — Icon set, Pokéball, identity, SFX, Header, BottomNav, PlayerPicker, DracoSheet.

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
  send: 'M5 12h14M13 6l6 6-6 6',
  volume: 'M4 9v6h4l5 4V5L8 9H4ZM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  volumeOff: 'M4 9v6h4l5 4V5L8 9H4ZM17 9l4 6M21 9l-4 6',
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

const POKEBALL_IMG = {
  pokeball:   '/images/pokeballs/pokeball.png',
  greatball:  '/images/pokeballs/greatball.png',
  ultraball:  '/images/pokeballs/ultraball.png',
  masterball: '/images/pokeballs/masterball.png',
};
function getPokeballImg(ballId) { return POKEBALL_IMG[ballId] || POKEBALL_IMG.pokeball; }

function Pokeball({ size = 30, top = '#EE3D34', id, style }) {
  if (id && POKEBALL_IMG[id]) {
    return <img src={POKEBALL_IMG[id]} width={size} height={size} alt={id}
      style={{ objectFit: 'contain', flexShrink: 0, ...style }} />;
  }
  return <div className="pokeball" style={{ width: size, height: size, '--ball-top': top, ...style }} />;
}

const AVATAR = '/assets/druygon-avatar.png';
const TUTOR_URL = 'https://draco.druygon.my.id/';
function openTutor(topic) { try { window.open(TUTOR_URL + (topic ? ('?topic=' + encodeURIComponent(topic)) : ''), '_blank'); } catch (e) {} }

// ── Player identity — partner Pokémon + personal colour per trainer ──────────
const PARTNERS = {
  Dru:    { dex: 25,  mon: 'Pikachu',    color: '#FFCB05', title: 'Electric Trainer' },
  Oming:  { dex: 4,   mon: 'Charmander', color: '#FF6B2B', title: 'Fire Trainer' },
  Reymar: { dex: 7,   mon: 'Squirtle',   color: '#4A9EFF', title: 'Water Trainer' },
  Ilyas:  { dex: 1,   mon: 'Bulbasaur',  color: '#4ADE80', title: 'Grass Trainer' },
  Kai:    { dex: 133, mon: 'Eevee',      color: '#F472B6', title: 'Rookie Trainer' },
};
function playerIdentity(name) {
  return PARTNERS[name] || { dex: 133, mon: 'Eevee', color: '#8B5CF6', title: 'Trainer' };
}
const SLOT_COLORS = ['#FFCB05', '#FF6B2B', '#4A9EFF', '#4ADE80'];
const SLOT_NAMES  = ['Dru', 'Oming', 'Reymar', 'Ilyas'];

// ── SFX — tiny WebAudio synth, mute persisted ────────────────────────────────
const SFX = (() => {
  const LS = 'druygon-sfx';
  let ctx = null;
  let on = true;
  try { on = localStorage.getItem(LS) !== 'off'; } catch (e) {}
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }
  function tone(freq, t0, dur, type, vol, slide) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, c.currentTime + t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + t0 + dur);
    g.gain.setValueAtTime(vol || 0.1, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.02);
  }
  const bank = {
    correct() { tone(660, 0, .09, 'square', .1); tone(880, .09, .14, 'square', .1); },
    wrong()   { tone(180, 0, .2, 'sawtooth', .07); },
    throw()   { tone(280, 0, .3, 'sine', .09, 900); },
    catch()   { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .11, .14, 'square', .1)); },
    levelup() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * .09, .12, 'triangle', .11)); },
    combo()   { tone(740, 0, .07, 'square', .09); tone(988, .07, .1, 'square', .09); },
    click()   { tone(520, 0, .05, 'sine', .05); },
  };
  return {
    isOn: () => on,
    setOn(v) { on = !!v; try { localStorage.setItem(LS, on ? 'on' : 'off'); } catch (e) {} },
    play(name) { if (!on) return; try { (bank[name] || bank.click)(); } catch (e) {} },
  };
})();

// ── SlotAvatar — partner Pokémon in a coloured ring ──────────────────────────
function SlotAvatar({ name, size = 36, active = false }) {
  const idn = playerIdentity(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: idn.color + '1e',
      border: active ? `2.5px solid ${idn.color}` : '2.5px solid rgba(255,255,255,.1)',
      boxShadow: active ? `0 0 0 2px #0b0a16, 0 0 10px ${idn.color}88` : 'none',
      overflow: 'hidden', transition: 'box-shadow .15s',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <img src={SPRITE(idn.dex)} width={size - 6} height={size - 6} alt={name || '?'} crossOrigin="anonymous"
        style={{ objectFit: 'contain', display: 'block' }} />
    </div>
  );
}

// ── PlayerPicker — full-screen trainer select (design: Druygon Portal) ────────
function PlayerPicker({ allSlots, activeSlot, onSelect, onClose, isFirstLaunch }) {
  const [picked, setPicked] = React.useState(null);

  React.useEffect(() => {
    if (isFirstLaunch) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isFirstLaunch, onClose]);

  const slots = (allSlots && allSlots.length > 0)
    ? allSlots
    : SLOT_NAMES.map((n, i) => ({ slot: i + 1, name: n, level: 1, caughtCount: 0, coins: 0 }));

  const pick = (s) => {
    if (picked != null) return;
    SFX.play('click');
    setPicked(s.slot);
    setTimeout(() => onSelect(s.slot), 420);
  };

  const stars = [
    { top: 70, left: 36, s: 4, d: '2.6s', dl: '0s' },
    { top: 130, right: 52, s: 3, d: '3.4s', dl: '.6s' },
    { top: 44, right: 120, s: 2, d: '2.2s', dl: '1.1s' },
    { bottom: 150, left: 24, s: 3, d: '3s', dl: '.3s' },
    { top: 220, left: 60, s: 2, d: '2.8s', dl: '.9s' },
  ];

  return (
    <div className="player-picker-overlay" role="presentation" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'radial-gradient(130% 100% at 50% -12%, #1b1540 0%, #0d0b20 55%, #080714 100%)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }} onClick={isFirstLaunch ? undefined : onClose}>

      {/* star field + floating pokéballs */}
      {stars.map((st, i) => (
        <div key={i} style={{ position: 'absolute', top: st.top, left: st.left, right: st.right, bottom: st.bottom,
          width: st.s, height: st.s, borderRadius: '50%', background: '#F0EEFF',
          animation: `twinkle ${st.d} ease-in-out ${st.dl} infinite` }} />
      ))}
      <div className="pokeball" style={{ position: 'absolute', top: 96, right: -26, width: 120, height: 120, opacity: .09, animation: 'floaty 5s ease-in-out infinite', '--ball-top': '#EE3D34' }} />
      <div className="pokeball" style={{ position: 'absolute', bottom: 60, left: -34, width: 150, height: 150, opacity: .07, animation: 'floaty 6.5s ease-in-out 1s infinite', '--ball-top': '#7C3AED' }} />

      <div className="player-picker-dialog" role="dialog" aria-modal="true"
        aria-labelledby="player-picker-title"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '52px 20px 20px', overflowY: 'auto', position: 'relative', zIndex: 1, width: '100%', maxWidth: 480, margin: '0 auto' }}
        onClick={e => e.stopPropagation()}>

        {/* logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, animation: 'riseIn .5s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFCB05', boxShadow: '0 0 24px rgba(255,203,5,.4)', animation: 'pulseDot 2s ease-in-out infinite' }} />
          <div style={{ fontFamily: 'var(--font-game)', fontSize: 15, color: '#FFCB05', letterSpacing: '.08em', textShadow: '0 0 14px rgba(255,203,5,.5)' }}>DRUYGON</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '.22em', color: 'var(--text-tertiary)', marginTop: 10, animation: 'riseIn .5s cubic-bezier(0.16,1,0.3,1) .08s both' }}>LEARNING · GAME PORTAL</div>

        {/* title row (+ close when not first launch) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 30, animation: 'riseIn .55s cubic-bezier(0.16,1,0.3,1) .15s both' }}>
          <div style={{ flex: 1 }}>
            <div id="player-picker-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 27, letterSpacing: '-.02em', lineHeight: 1.15 }}>
              {isFirstLaunch ? 'Choose your character' : 'Choose character'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 7 }}>Who's playing today?</div>
          </div>
          {!isFirstLaunch && (
            <button aria-label="Close player picker" onClick={onClose} style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)',
              cursor: 'pointer', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="x" size={16} />
            </button>
          )}
        </div>

        {/* trainer cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginTop: 22 }}>
          {slots.map((s, i) => {
            const idn = playerIdentity(s.name);
            const isPicked = picked === s.slot;
            const dimmed = picked != null && !isPicked;
            return (
              <button key={s.slot} aria-label={`Choose player ${s.name}`}
                onClick={() => pick(s)} style={{
                position: 'relative', borderRadius: 20, overflow: 'hidden', padding: '18px 12px 16px',
                cursor: 'pointer', isolation: 'isolate', textAlign: 'center',
                background: `linear-gradient(160deg, ${idn.color}22, var(--bg-card) 65%)`,
                border: isPicked ? `2px solid ${idn.color}` : '1px solid rgba(255,255,255,.08)',
                boxShadow: isPicked ? `0 0 30px ${idn.color}55, var(--card-shadow)` : 'var(--card-shadow)',
                opacity: dimmed ? .25 : 1,
                transform: isPicked ? 'scale(1.04)' : dimmed ? 'scale(.95)' : 'none',
                transition: 'transform .35s cubic-bezier(0.16,1,0.3,1), opacity .35s, border-color .2s, box-shadow .35s',
                animation: `cardIn .55s cubic-bezier(0.16,1,0.3,1) ${.25 + i * .09}s both`,
                color: 'var(--text-primary)',
              }}>
                <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', top: -38, right: -30, background: `radial-gradient(circle, ${idn.color}, transparent 68%)`, opacity: .25, zIndex: -1 }} />
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                  <img src={SPRITE(idn.dex)} alt={idn.mon} width={84} height={84} crossOrigin="anonymous"
                    style={{ objectFit: 'contain', animation: `floaty ${3 + i * .4}s ease-in-out ${i * .3}s infinite` }} />
                </div>
                <div style={{ position: 'relative', marginTop: 6 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, letterSpacing: '-.01em' }}>{s.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: idn.color, marginTop: 2 }}>{idn.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 9 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: idn.color, color: '#0b0a16' }}>Lv {s.level}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 999, border: '1px solid rgba(255,255,255,.14)', color: 'var(--text-secondary)' }}>{s.caughtCount} caught</span>
                  </div>
                </div>
                {s.slot === activeSlot && !isFirstLaunch && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: idn.color, borderRadius: 6, fontSize: 8, fontWeight: 700, color: '#0b0a16', padding: '2px 6px', letterSpacing: .5 }}>AKTIF</div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 'auto', paddingTop: 18, animation: 'fadeIn .8s .9s both' }}>
          Progress is saved separately for each trainer.
        </div>
      </div>
    </div>
  );
}

// ── Splash — shown right after picking a trainer ─────────────────────────────
function PickSplash({ name }) {
  const idn = playerIdentity(name);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .3s', background: `radial-gradient(110% 90% at 50% 40%, ${idn.color}33, #0a0818 70%)`,
    }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 190, height: 190, borderRadius: '50%', position: 'absolute', top: -20, animation: 'ringPulse 1.1s ease-out infinite' }} />
        <img src={SPRITE(idn.dex)} alt={idn.mon} width={150} height={150} crossOrigin="anonymous"
          style={{ objectFit: 'contain', animation: 'pop .55s cubic-bezier(0.34,1.56,0.64,1) both' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-.01em', marginTop: 16, animation: 'riseIn .4s .15s both' }}>Let's go, {name}!</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', animation: 'riseIn .4s .3s both' }}>Loading your world…</div>
      </div>
    </div>
  );
}

// ── DracoSheet — in-app hint sheet (QA'd hints from the question bank) ────────
// ctx = { zoneName, question, hint } | null. Full AI chat lives at /tutor.
function DracoSheet({ open, onClose, ctx, playerName }) {
  const [msgs, setMsgs] = React.useState([]);
  const [typing, setTyping] = React.useState(false);
  const timers = React.useRef([]);

  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  React.useEffect(() => {
    if (!open) return undefined;
    const name = playerName || 'Trainer';
    setMsgs([{ who: 'draco', text: ctx
      ? `Hi ${name}! Stuck on a question in ${ctx.zoneName}? Don't worry, I've got you. 🐉`
      : `Hi ${name}! I'm Draco, your AI tutor. I give hints, not straight answers — so YOU become the champ. 🐉` }]);
    setTyping(false);
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [open]);  // eslint-disable-line

  React.useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const pushDraco = (text) => {
    setTyping(true);
    later(() => { setTyping(false); setMsgs(m => [...m, { who: 'draco', text }]); }, 750);
  };

  const giveHint = () => {
    SFX.play('click');
    setMsgs(m => [...m, { who: 'me', text: 'Give me a hint 💡' }]);
    pushDraco(ctx && ctx.hint ? ctx.hint : "Open a zone first, then ask me while you're on a question — I always know which one you're facing!");
  };

  const openFullTutor = () => {
    SFX.play('click');
    openTutor(ctx ? ctx.topic : undefined);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(8,7,20,.7)', animation: 'fadeIn .25s' }} />
      <div role="dialog" aria-modal="true" aria-label="Draco AI tutor" style={{
        position: 'relative', maxHeight: '76%', background: 'var(--bg-surface)',
        borderRadius: '24px 24px 0 0', borderTop: '1px solid rgba(139,92,246,.4)',
        display: 'flex', flexDirection: 'column', animation: 'sheetUp .35s cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden', width: '100%', maxWidth: 480, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 38, height: 4, borderRadius: 999, background: 'rgba(255,255,255,.18)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '6px 16px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #8B5CF6, #4A9EFF)', boxShadow: '0 0 16px rgba(139,92,246,.4)' }}>
            <Icon name="sparkles" size={22} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <b style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, display: 'block' }}>Draco</b>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--green)' }}>
              <i style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />AI Tutor · online
            </span>
          </div>
          <button aria-label="Close Draco" onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <Icon name="x" size={15} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 120 }}>
          {ctx && ctx.question && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', padding: '2px 12px' }}>
              Soal: “{ctx.question}”
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.who === 'me' ? 'flex-end' : 'flex-start' }}>
              <div style={m.who === 'me'
                ? { maxWidth: '80%', background: 'rgba(139,92,246,.16)', border: '1px solid rgba(139,92,246,.4)', borderRadius: '16px 16px 4px 16px', padding: '10px 14px', fontSize: 13, lineHeight: 1.5 }
                : { maxWidth: '85%', background: 'var(--bg-card)', border: '1px solid rgba(139,92,246,.3)', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', fontSize: 13, lineHeight: 1.5 }}>
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(139,92,246,.3)', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', display: 'flex', gap: 5 }}>
                <i style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6', animation: 'dotHop 1.2s infinite' }} />
                <i style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6', animation: 'dotHop 1.2s .15s infinite' }} />
                <i style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6', animation: 'dotHop 1.2s .3s infinite' }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '10px 16px calc(16px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          {ctx && ctx.hint && (
            <button onClick={giveHint} style={{ padding: '9px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: '1px solid rgba(139,92,246,.45)', background: 'transparent', color: '#B79BFF', cursor: 'pointer' }}>
              💡 Kasih petunjuk
            </button>
          )}
          <button onClick={openFullTutor} style={{ padding: '9px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: 'none', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: '#fff', cursor: 'pointer', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Chat lengkap dengan Draco <Icon name="arrowR" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Header — avatar tap opens PlayerPicker; identity-coloured ring ────────────
function Header({ region, title, sub, onBack, coins, playerName, onAvatarTap, onOpenDraco }) {
  const idn = playerIdentity(playerName);
  return (
    <div className="appbar">
      {onBack && <button className="appbar-back" onClick={onBack}><Icon name="back" size={20} /></button>}
      {title
        ? <div className="appbar-title">{title}{sub && <small>{sub}</small>}</div>
        : <div className="appbar-logo">DRUYGON</div>}
      <button className="appbar-draco" onClick={() => (onOpenDraco ? onOpenDraco(null) : openTutor())} title="Ask Draco — AI tutor">
        <Icon name="hint" size={15} /> Draco
      </button>
      <div className="coin-chip"><Icon name="coin" size={15} color="var(--yellow)" /> {(coins ?? 0).toLocaleString()}</div>
      {/* Avatar button — tap to open player picker */}
      <button aria-label={'Switch player. Active player: ' + (playerName || 'none')}
        onClick={onAvatarTap} style={{
        background: idn.color + '1e', border: `2px solid ${idn.color}`, padding: 0, cursor: 'pointer',
        borderRadius: '50%', lineHeight: 0, overflow: 'hidden', width: 38, height: 38, flexShrink: 0,
        boxShadow: `0 0 0 2px rgba(255,255,255,.05), 0 0 14px ${idn.color}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} title={'Player: ' + (playerName || 'Choose character')}>
        <img src={SPRITE(idn.dex)} width={30} height={30} crossOrigin="anonymous"
          alt={playerName || 'Trainer'} style={{ objectFit: 'contain', display: 'block' }} />
      </button>
    </div>
  );
}

function BottomNav({ active, go }) {
  const items = [
    ['home', 'home', 'Home'], ['map', 'map', 'Map'], ['collection', 'grid', 'Collection'],
    ['store', 'bag', 'Shop'], ['profile', 'user', 'Profile'],
  ];
  return (
    <div className="nav">
      {items.map(([id, ic, label]) => (
        <button key={id} className={'nav-slot' + (active === id ? ' on' : '')} onClick={() => { SFX.play('click'); go(id); }}>
          <span className="nav-ico"><Icon name={ic} size={22} /></span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

Object.assign(window, {
  Icon, Pokeball, Header, BottomNav, SlotAvatar, PlayerPicker, PickSplash, DracoSheet,
  AVATAR, openTutor, TUTOR_URL, SLOT_COLORS, SLOT_NAMES, PARTNERS, playerIdentity, SFX,
});
