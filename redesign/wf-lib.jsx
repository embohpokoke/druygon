// wf-lib.jsx — low-fi wireframe primitives for the Druygon redesign canvas.
// Sketchy / hand-drawn vocabulary: paper fills, ink strokes, rough SVG-filter
// edges, hand fonts, placeholder image boxes labelled with asset-manifest paths.
// All components exported to window for the screen files to consume.

const WF = {
  ink:    '#2c2823',
  ink2:   '#7a7066',
  faint:  '#b8b0a4',
  paper:  '#fbfaf6',
  paper2: '#f1eee7',
  line:   '#37322c',
  // region accents (from design-system.css tokens)
  yellow: '#E0A800',   // Dataran Ilmu (curriculum) — dimmed for paper legibility
  teal:   '#129e88',   // Rimba Sains (science)
  purple: '#7c4ddb',   // Sirkuit Digital (compsci) — the hero skin
  blue:   '#3a7fd0',
  hand:   "'Gaegu', 'Comic Sans MS', cursive",
  marker: "'Architects Daughter', 'Comic Sans MS', cursive",
};

// region → accent + label helpers
const REGIONS = {
  curriculum: { accent: WF.yellow, name: 'Dataran Ilmu', tag: 'Curriculum' },
  science:    { accent: WF.teal,   name: 'Rimba Sains',  tag: 'Science' },
  compsci:    { accent: WF.purple, name: 'Sirkuit Digital', tag: 'Compsci' },
};

// One-time wireframe stylesheet + the rough-edge SVG filter.
if (typeof document !== 'undefined' && !document.getElementById('wf-styles')) {
  const s = document.createElement('style');
  s.id = 'wf-styles';
  s.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Gaegu:wght@300;400;700&family=Architects+Daughter&display=swap');
  .wf * { box-sizing: border-box; font-family: ${WF.hand}; }
  .wf-marker { font-family: ${WF.marker} !important; }
  .wf-rough { filter: url(#wf-rough); }
  .wf-scroll::-webkit-scrollbar { display: none; }
  .wf-tap { cursor: pointer; -webkit-tap-highlight-color: transparent; transition: transform .12s ease, background .12s ease; }
  .wf-tap:active { transform: scale(.97); }
  @keyframes wf-pop { 0%{ transform: scale(.4); opacity: 0 } 70%{ transform: scale(1.08) } 100%{ transform: scale(1); opacity: 1 } }
  @keyframes wf-burst { 0%{ transform: scale(.2); opacity: 1 } 100%{ transform: scale(2.4); opacity: 0 } }
  @keyframes wf-shake { 0%,100%{ transform: translateX(0) } 25%{ transform: translateX(-4px) rotate(-3deg) } 75%{ transform: translateX(4px) rotate(3deg) } }
  @keyframes wf-throw { 0%{ transform: translate(0,40px) scale(.6); opacity:0 } 40%{ opacity:1 } 100%{ transform: translate(0,-90px) scale(.9); opacity:1 } }
  @keyframes wf-rise { from{ transform: translateY(100%) } to{ transform: translateY(0) } }
  `;
  document.head.appendChild(s);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML = `<filter id="wf-rough"><feTurbulence type="fractalNoise" baseFrequency="0.013 0.02" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  document.body.appendChild(svg);
}

// ── PhoneFrame ────────────────────────────────────────────────
// The 480-frame mobile shell, drawn as a sketchy phone. Header + scrolly
// body + optional bottom nav. `nav` is the active nav slot id (or null).
function PhoneFrame({ children, header, nav = null, region = 'compsci', noNav = false, bodyStyle = {}, dark = false }) {
  const bg = dark ? '#16121f' : WF.paper;
  return (
    <div className="wf" style={{ position: 'relative', width: '100%', height: '100%', background: bg, overflow: 'hidden', color: WF.ink, display: 'flex', flexDirection: 'column' }}>
      {/* rough phone edge */}
      <div className="wf-rough" style={{ position: 'absolute', inset: 4, border: `2.5px solid ${WF.line}`, borderRadius: 26, pointerEvents: 'none', zIndex: 30 }} />
      <StatusBar dark={dark} />
      {header}
      <div className="wf-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', ...bodyStyle }}>
        {children}
      </div>
      {!noNav && <BottomNav active={nav} region={region} dark={dark} />}
    </div>
  );
}

function StatusBar({ dark }) {
  const c = dark ? 'rgba(255,255,255,.7)' : WF.ink2;
  return (
    <div style={{ height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', fontSize: 11, color: c, zIndex: 5 }}>
      <span style={{ fontWeight: 700 }}>9:41</span>
      <div style={{ position: 'absolute', left: '50%', top: 7, transform: 'translateX(-50%)', width: 46, height: 13, background: dark ? '#000' : WF.line, borderRadius: 8 }} />
      <span style={{ letterSpacing: 1 }}>▮▮▮ ▽ 89</span>
    </div>
  );
}

function AppHeader({ region = 'compsci', title, back = false, coins = 240, dark = false }) {
  const r = REGIONS[region];
  const ink = dark ? '#f0eeff' : WF.ink;
  return (
    <div style={{ flexShrink: 0, height: 46, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', borderBottom: `1.5px dashed ${dark ? 'rgba(255,255,255,.18)' : WF.faint}`, zIndex: 5 }}>
      {back
        ? <div className="wf-tap" style={{ fontSize: 20, color: ink, lineHeight: 1, marginRight: 2 }}>‹</div>
        : <div style={{ width: 9, height: 9, borderRadius: 9, background: r.accent }} />}
      <span className="wf-marker" style={{ fontSize: title ? 15 : 13, fontWeight: 700, letterSpacing: .3, color: ink, flex: 1 }}>
        {title || 'DRUYGON'}
      </span>
      <Pill small><Glyph n="coin" s={11} /> {coins}</Pill>
      <DruAvatar size={28} ring={r.accent} />
    </div>
  );
}

function BottomNav({ active, region = 'compsci', dark }) {
  const r = REGIONS[region];
  const items = [['home', 'Home'], ['map', 'Peta'], ['grid', 'Koleksi'], ['bag', 'Toko'], ['user', 'Profil']];
  const ink = dark ? 'rgba(255,255,255,.45)' : WF.faint;
  return (
    <div style={{ flexShrink: 0, height: 50, display: 'flex', borderTop: `2px solid ${dark ? 'rgba(255,255,255,.12)' : WF.line}`, background: dark ? 'rgba(255,255,255,.03)' : WF.paper2, zIndex: 20 }}>
      {items.map(([id, label]) => {
        const on = id === active;
        return (
          <div key={id} className="wf-tap" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: on ? r.accent : ink }}>
            <Glyph n={id} s={18} c={on ? r.accent : ink} />
            <span style={{ fontSize: 9, fontWeight: on ? 700 : 400 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Placeholder image box: dashed rough box + diagonal X + manifest path ──
function ImgBox({ path, h = 80, w = '100%', label, accent, r = 12, style = {}, mascot = false, corner = false, children }) {
  if (corner) {
    return (
      <div style={{ position: 'relative', width: w, height: h, flexShrink: 0, overflow: 'hidden', ...style }}>
        <div className="wf-rough" style={{ position: 'absolute', inset: 0, border: `2px dashed ${accent || WF.faint}`, borderRadius: r, background: accent ? hexA(accent, .07) : 'rgba(120,110,98,.05)' }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .2 }} preserveAspectRatio="none">
          <line x1="0" y1="0" x2="100%" y2="100%" stroke={accent || WF.faint} strokeWidth="1.1" />
          <line x1="100%" y1="0" x2="0" y2="100%" stroke={accent || WF.faint} strokeWidth="1.1" />
        </svg>
        {(label || path) && <div className="wf-anno" style={{ position: 'absolute', top: 5, left: 6, fontSize: 7.5, fontFamily: 'ui-monospace,monospace', color: accent || WF.ink2, background: hexA('#fbfaf6', .8), padding: '1px 4px', borderRadius: 4, lineHeight: 1.2, maxWidth: '85%' }}>{label}{label && path ? ' · ' : ''}{path}</div>}
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', width: w, height: h, flexShrink: 0, ...style }}>
      <div className="wf-rough" style={{ position: 'absolute', inset: 0, border: `2px dashed ${accent || WF.faint}`, borderRadius: r, background: accent ? hexA(accent, .07) : 'rgba(120,110,98,.05)' }} />
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .28 }} preserveAspectRatio="none">
        <line x1="0" y1="0" x2="100%" y2="100%" stroke={accent || WF.faint} strokeWidth="1.3" />
        <line x1="100%" y1="0" x2="0" y2="100%" stroke={accent || WF.faint} strokeWidth="1.3" />
      </svg>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: 6, textAlign: 'center' }}>
        {mascot && <span style={{ fontSize: Math.min(h * .42, 40), lineHeight: 1, opacity: .8 }}>🐉</span>}
        {children}
        {label && <span style={{ fontSize: 10, fontWeight: 700, color: accent || WF.ink2 }}>{label}</span>}
        {path && <span style={{ fontSize: 8.5, color: WF.ink2, fontFamily: 'ui-monospace, monospace', opacity: .75, wordBreak: 'break-all', lineHeight: 1.15 }}>{path}</span>}
      </div>
    </div>
  );
}

// generic "text line" placeholder bar
function Bar({ w = '100%', h = 9, c, mt = 0, mb = 0, r = 5 }) {
  return <div style={{ width: w, height: h, marginTop: mt, marginBottom: mb, borderRadius: r, background: c || 'rgba(120,110,98,.22)' }} />;
}

function Btn({ children, accent = WF.purple, full = false, ghost = false, small = false, onClick, style = {} }) {
  return (
    <div className="wf-tap" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      width: full ? '100%' : 'auto', padding: small ? '5px 12px' : '9px 16px',
      borderRadius: 12, fontWeight: 700, fontSize: small ? 12 : 14, whiteSpace: 'nowrap',
      border: `2px solid ${WF.line}`,
      background: ghost ? 'transparent' : accent, color: ghost ? WF.ink : '#fff',
      boxShadow: ghost ? 'none' : `2px 2px 0 ${WF.line}`, ...style,
    }}>{children}</div>
  );
}

function Pill({ children, accent, small, style = {} }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: small ? '2px 8px' : '3px 10px', borderRadius: 999, border: `1.5px solid ${accent || WF.faint}`, fontSize: small ? 10 : 11, fontWeight: 700, color: accent || WF.ink2, ...style }}>{children}</span>
  );
}

// section heading with hand-underline
function Head({ children, link, mt = 0 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: mt, marginBottom: 8 }}>
      <span className="wf-marker" style={{ fontSize: 14, fontWeight: 700, letterSpacing: .2, whiteSpace: 'nowrap' }}>{children}</span>
      {link && <span style={{ fontSize: 10, color: WF.ink2, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8 }}>{link} ›</span>}
    </div>
  );
}

// XP / HP bar
function Meter({ pct = 50, c = WF.purple, h = 7, track = 'rgba(120,110,98,.2)' }) {
  return (
    <div style={{ width: '100%', height: h, borderRadius: 99, background: track, overflow: 'hidden', border: `1px solid ${WF.faint}` }}>
      <div style={{ width: pct + '%', height: '100%', background: c, transition: 'width .5s cubic-bezier(.2,.8,.3,1)' }} />
    </div>
  );
}

// a yellow on-canvas annotation callout (rationale)
function Note({ children, c = WF.purple }) {
  return (
    <div className="wf-marker wf-anno" style={{ fontSize: 11, color: WF.ink2, display: 'flex', gap: 5, lineHeight: 1.35, padding: '6px 2px' }}>
      <span style={{ color: c, fontWeight: 700 }}>✎</span>
      <span>{children}</span>
    </div>
  );
}

// hex + alpha
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// minimal stroke glyph set (sketch icons)
function Glyph({ n, s = 18, c = 'currentColor', sw = 1.8 }) {
  const p = {
    home: 'M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z',
    map: 'M9 3L3 5v16l6-2 6 2 6-2V3l-6 2-6-2zM9 3v16M15 5v16',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    bag: 'M5 8h14l-1 12H6L5 8zM8 8V6a4 4 0 0 1 8 0v2',
    user: 'M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9 9.5h4a1.5 1.5 0 0 1 0 3h-2a1.5 1.5 0 0 0 0 3h4',
    lock: 'M6 11h12v9H6zM8 11V7a4 4 0 0 1 8 0v4',
    check: 'M4 12l5 5L20 6',
    star: 'M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 17l-5.6 3 1.5-6.3L3 9.5 9.4 9z',
    bolt: 'M13 2L4 14h6l-1 8 9-12h-6z',
    play: 'M6 4l14 8-14 8z',
    flag: 'M5 21V4h11l-2 4 2 4H5',
    branch: 'M6 4v10a4 4 0 0 0 4 4h4M6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM18 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    hint: 'M12 3a6 6 0 0 1 4 10c-1 1-1 2-1 3H9c0-1 0-2-1-3a6 6 0 0 1 4-10zM9 20h6M10 23h4',
    ball: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h6m6 0h6M12 12a3 3 0 1 0 0 .01',
    plus: 'M12 5v14M5 12h14',
    arrow: 'M5 12h14M13 6l6 6-6 6',
  }[n] || 'M4 4h16v16H4z';
  const fillIcons = ['play', 'star'];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fillIcons.includes(n) ? c : 'none'} stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={p} />
    </svg>
  );
}

// Dru player avatar (the uploaded trainer image), shown when the active slot is Dru.
function DruAvatar({ size = 40, ring = WF.purple, rw = 2 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 999, overflow: 'hidden', flexShrink: 0, border: `${rw}px solid ${ring}`, background: hexA(ring, .1) }}>
      <img src="assets/druygon-avatar.png" alt="Dru" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}

Object.assign(window, { WF, REGIONS, PhoneFrame, StatusBar, AppHeader, BottomNav, ImgBox, Bar, Btn, Pill, Head, Meter, Note, Glyph, hexA, DruAvatar });
