// screens-home-map.jsx — Home (2 variants) + Region map (2 variants).
// Consumes wf-lib primitives from window.

// Shared player-hero block (reused .player-hero from design-system.css)
function PlayerHero({ compact = false }) {
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: `2px solid ${WF.line}`, background: WF.paper2, padding: 12, marginBottom: 12 }}>
      <div style={{ position: 'absolute', inset: 0, opacity: .55 }}>
        <ImgBox path="assets/druygon-banner-header.jpg" label="player banner" h="100%" r={0} corner />
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div className="wf-marker" style={{ fontSize: 16, fontWeight: 700 }}>Hi, Dru <span style={{ color: WF.purple }}>👋</span></div>
            <div style={{ fontSize: 10, color: WF.ink2, marginTop: 1, whiteSpace: 'nowrap' }}>Trainer · 12 caught</div>
          </div>
          <Pill accent={WF.purple} small>LVL 7</Pill>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <span style={{ fontSize: 9, color: WF.ink2 }}>XP</span>
          <div style={{ flex: 1 }}><Meter pct={62} c={WF.purple} /></div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[['7', 'LEVEL'], ['240', 'COINS'], ['12', 'CAUGHT']].map(([v, l]) => (
            <div key={l}><div style={{ fontSize: 13, fontWeight: 700, color: WF.purple }}>{v}</div><div style={{ fontSize: 8, color: WF.ink2, letterSpacing: 1 }}>{l}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// region card — big tappable, in its accent
function RegionCard({ region, zones, cleared, teaser, onTap, big = true }) {
  const r = REGIONS[region];
  return (
    <div className="wf-tap" onClick={onTap} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: `2px solid ${WF.line}`, boxShadow: `3px 3px 0 ${hexA(r.accent, .5)}`, marginBottom: 12, background: WF.paper }}>
      <div style={{ display: 'flex', height: big ? 96 : 76 }}>
        <div style={{ width: big ? 104 : 84, position: 'relative', flexShrink: 0 }}>
          <ImgBox path={`regions/${region}-hero.jpg`} label={r.tag} accent={r.accent} h="100%" r={0} />
        </div>
        <div style={{ flex: 1, padding: '9px 11px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ImgBox path="" label="" accent={r.accent} h={18} w={18} r={5} />
              <span className="wf-marker" style={{ fontSize: 13.5, fontWeight: 700, color: r.accent, whiteSpace: 'nowrap' }}>{r.name}</span>
            </div>
            <div style={{ fontSize: 9.5, color: WF.ink2, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Next: {teaser}</div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: WF.ink2, marginBottom: 3 }}>
              <span>{cleared}/{zones} zones cleared</span><span>{Math.round(cleared / zones * 100)}%</span>
            </div>
            <Meter pct={cleared / zones * 100} c={r.accent} h={6} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HOME · Variant A — stacked region cards (evolves .game-card-featured) ──
function HomeA({ go }) {
  return (
    <PhoneFrame nav="home" region="compsci" header={<AppHeader region="compsci" />}>
      <div style={{ padding: '12px 14px 18px' }}>
        <PlayerHero />
        <Head link="All">Choose a world</Head>
        <RegionCard region="curriculum" zones={3} cleared={2} teaser="Puncak Cendekia · geometri" onTap={() => go && go('map')} />
        <RegionCard region="science" zones={3} cleared={1} teaser="Sarang Serangga · locked LVL 6" onTap={() => go && go('map')} />
        <RegionCard region="compsci" zones={3} cleared={0} teaser="Gerbang Logika · start here" onTap={() => go && go('map')} />

        <Head mt={6}>Daily mission</Head>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', border: `2px dashed ${WF.faint}`, borderRadius: 12, padding: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 22 }}>🔥</div>
          <div style={{ flex: 1 }}><Bar w="70%" h={8} /><Bar w="45%" h={7} mt={5} c="rgba(120,110,98,.14)" /></div>
          <Pill accent={WF.purple} small>+50</Pill>
        </div>

        <Head>Achievements</Head>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }} className="wf-scroll">
          {['Sains Rookie', 'Logika Master', 'Streak 10'].map((a) => (
            <div key={a} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${WF.faint}`, borderRadius: 99, padding: '5px 10px' }}>
              <span style={{ fontSize: 14 }}>🏅</span><span style={{ fontSize: 10, fontWeight: 700 }}>{a}</span>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

// ── HOME · Variant B — hero spotlight + compact region grid ──
function HomeB() {
  return (
    <PhoneFrame nav="home" region="compsci" header={<AppHeader region="compsci" />}>
      <div style={{ padding: '12px 14px 18px' }}>
        <PlayerHero />
        <Head>Continue</Head>
        {/* spotlight current region full-bleed */}
        <div className="wf-tap" style={{ position: 'relative', height: 150, borderRadius: 16, overflow: 'hidden', border: `2px solid ${WF.line}`, marginBottom: 12 }}>
          <ImgBox path="regions/compsci-hero.jpg" accent={WF.purple} h="100%" r={0} corner />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, background: 'linear-gradient(transparent, rgba(40,36,30,.18))' }}>
            <Pill accent={WF.purple} small style={{ background: WF.paper }}>RESUME</Pill>
            <div className="wf-marker" style={{ fontSize: 17, fontWeight: 700, color: WF.purple, marginTop: 5 }}>Sirkuit Digital</div>
            <div style={{ fontSize: 10, color: WF.ink2 }}>Zone 1 · Gerbang Logika</div>
            <div style={{ marginTop: 6 }}><Btn accent={WF.purple} small><Glyph n="play" s={11} c="#fff" /> Play</Btn></div>
          </div>
        </div>
        <Head>Worlds</Head>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {['curriculum', 'science'].map((rg) => {
            const r = REGIONS[rg];
            return (
              <div key={rg} className="wf-tap" style={{ borderRadius: 14, overflow: 'hidden', border: `2px solid ${WF.line}`, boxShadow: `2px 2px 0 ${hexA(r.accent, .5)}` }}>
                <ImgBox path={`regions/${rg}-icon.png`} accent={r.accent} h={64} r={0} label={r.tag} />
                <div style={{ padding: 8 }}>
                  <div className="wf-marker" style={{ fontSize: 12, fontWeight: 700, color: r.accent }}>{r.name}</div>
                  <div style={{ marginTop: 5 }}><Meter pct={rg === 'curriculum' ? 66 : 33} c={r.accent} h={5} /></div>
                </div>
              </div>
            );
          })}
        </div>
        <Note c={WF.purple}>B leads with “continue where you left off”; the 3rd region drops to the grid. Trades discovery for momentum.</Note>
      </div>
    </PhoneFrame>
  );
}

// ── REGION MAP · Variant A — vertical winding journey path ──
function MapA({ go }) {
  const zones = [
    { n: 1, name: 'Gerbang Logika', topic: 'urutan_logika', state: 'cleared' },
    { n: 2, name: 'Jaringan', topic: 'perulangan_jaringan', state: 'open' },
    { n: 3, name: 'Inti Prosesor', topic: 'algoritma_debug', state: 'locked', lvl: 11 },
  ];
  return (
    <PhoneFrame nav="map" region="compsci" header={<AppHeader region="compsci" title="Sirkuit Digital" back />}
      bodyStyle={{ background: WF.paper }}>
      <div style={{ position: 'absolute', inset: 0, opacity: .5 }}><ImgBox path="maps/compsci-bg.jpg" label="map backdrop" accent={WF.purple} h="100%" r={0} corner /></div>
      <div style={{ position: 'relative', padding: '14px 16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Pill accent={WF.purple}>LVL 7</Pill>
          <span style={{ fontSize: 10, color: WF.ink2 }}>1 / 3 zones cleared</span>
        </div>
        {/* winding nodes */}
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="none" viewBox="0 0 100 300">
            <path d="M22 24 Q90 70 50 130 Q10 190 78 256" fill="none" stroke={WF.line} strokeWidth="1.4" strokeDasharray="4 4" />
          </svg>
          {zones.map((z, i) => <ZoneNode key={z.n} z={z} align={i % 2 ? 'right' : 'left'} onTap={() => z.state !== 'locked' && go && go('zone')} />)}
        </div>
        <Note c={WF.purple}>A: literal “journey” — winding dashed path, nodes alternate L/R. Most game-like; the cleared→open→locked rhythm is obvious.</Note>
      </div>
    </PhoneFrame>
  );
}

function ZoneNode({ z, align, onTap }) {
  const locked = z.state === 'locked';
  const cleared = z.state === 'cleared';
  const c = locked ? WF.faint : WF.purple;
  return (
    <div style={{ display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', marginBottom: 28 }}>
      <div className={locked ? '' : 'wf-tap'} onClick={onTap} style={{ width: 188, display: 'flex', gap: 9, alignItems: 'center', flexDirection: align === 'right' ? 'row-reverse' : 'row', opacity: locked ? .6 : 1 }}>
        <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
          <ImgBox path={`maps/node-${cleared ? 'cleared' : locked ? 'locked' : 'open'}.png`} accent={c} h={54} w={54} r={16} corner>
            <span style={{ fontSize: 22 }}>{cleared ? '✅' : locked ? '🔒' : '🌿'}</span>
          </ImgBox>
          <div style={{ position: 'absolute', top: -6, [align === 'right' ? 'left' : 'right']: -6, width: 22, height: 22, borderRadius: 99, background: WF.paper, border: `2px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: c, zIndex: 2 }}>
            {cleared ? <Glyph n="check" s={12} c={c} sw={2.4} /> : locked ? <Glyph n="lock" s={11} c={c} /> : z.n}
          </div>
        </div>
        <div style={{ textAlign: align === 'right' ? 'right' : 'left', minWidth: 0, background: hexA(WF.paper, .82), borderRadius: 8, padding: '3px 5px' }}>
          <div className="wf-marker" style={{ fontSize: 13, fontWeight: 700, color: c, whiteSpace: 'nowrap' }}>{z.name}</div>
          <div style={{ fontSize: 9, color: WF.ink2, fontFamily: 'ui-monospace,monospace', whiteSpace: 'nowrap' }}>{z.topic}</div>
          {locked
            ? <Pill small style={{ marginTop: 4 }}><Glyph n="lock" s={9} /> LVL {z.lvl}</Pill>
            : <div style={{ display: 'flex', gap: 3, marginTop: 4, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
                {[0, 1, 2].map((i) => <div key={i} style={{ width: 13, height: 13, borderRadius: 99, border: `1.5px solid ${c}`, background: cleared ? hexA(c, .3) : 'transparent' }} />)}
              </div>}
        </div>
      </div>
    </div>
  );
}

// ── REGION MAP · Variant B — linear stepper list (denser, scannable) ──
function MapB({ go }) {
  const zones = [
    { n: 1, name: 'Gerbang Logika', topic: 'urutan_logika', state: 'cleared', mons: 4 },
    { n: 2, name: 'Jaringan', topic: 'perulangan_jaringan', state: 'open', mons: 5 },
    { n: 3, name: 'Inti Prosesor', topic: 'algoritma_debug', state: 'locked', mons: 4, lvl: 11 },
  ];
  return (
    <PhoneFrame nav="map" region="compsci" header={<AppHeader region="compsci" title="Sirkuit Digital" back />}>
      <div style={{ padding: '12px 14px 20px' }}>
        <div style={{ position: 'relative', height: 84, borderRadius: 14, overflow: 'hidden', border: `2px solid ${WF.line}`, marginBottom: 14 }}>
          <ImgBox path="maps/compsci-bg.jpg" accent={WF.purple} h="100%" r={0} label="region banner" corner />
        </div>
        {zones.map((z) => {
          const locked = z.state === 'locked', cleared = z.state === 'cleared';
          const c = locked ? WF.faint : WF.purple;
          return (
            <div key={z.n} className={locked ? '' : 'wf-tap'} onClick={() => !locked && go && go('zone')} style={{ display: 'flex', gap: 10, alignItems: 'center', border: `2px solid ${locked ? WF.faint : WF.line}`, borderLeft: `5px solid ${c}`, borderRadius: 12, padding: 10, marginBottom: 10, opacity: locked ? .6 : 1, background: WF.paper }}>
              <div style={{ width: 34, height: 34, borderRadius: 99, border: `2px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: c, flexShrink: 0 }}>
                {cleared ? <Glyph n="check" s={16} c={c} sw={2.4} /> : locked ? <Glyph n="lock" s={13} c={c} /> : z.n}
              </div>
              <div style={{ flex: 1 }}>
                <div className="wf-marker" style={{ fontSize: 13, fontWeight: 700, color: c }}>{z.name}</div>
                <div style={{ fontSize: 9, color: WF.ink2, fontFamily: 'ui-monospace,monospace' }}>{z.topic}</div>
              </div>
              <div style={{ display: 'flex', gap: -6 }}>
                {Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ width: 22, height: 22, borderRadius: 99, border: `1.5px solid ${c}`, background: WF.paper2, marginLeft: i ? -6 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{locked || (!cleared && i > 0) ? '?' : '◓'}</div>)}
              </div>
              {locked ? <Pill small>LVL {z.lvl}</Pill> : <Glyph n="arrow" s={16} c={c} />}
            </div>
          );
        })}
        <Note c={WF.purple}>B: linear list — shows topic id + how many mons live in each zone up-front. Denser, faster to scan, less “adventure” feel.</Note>
      </div>
    </PhoneFrame>
  );
}

Object.assign(window, { PlayerHero, RegionCard, HomeA, HomeB, MapA, MapB, ZoneNode });
