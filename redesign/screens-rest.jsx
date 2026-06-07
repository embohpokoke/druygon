// screens-rest.jsx — Collection, Store (4 pokéball tiers), Profile / Parent.

// ── COLLECTION — grouped by subject, silhouettes for uncaught ──
function Collection() {
  const groups = [
    { region: 'compsci', caught: ['🌿', null, '⚡', null], total: 4 },
    { region: 'science', caught: ['🐛', '🌸', null, null], total: 4 },
    { region: 'curriculum', caught: ['🔢', '📐', '➗', null, null], total: 5 },
  ];
  return (
    <PhoneFrame nav="grid" region="compsci" header={<AppHeader region="compsci" title="Koleksi" />}>
      <div style={{ padding: '12px 14px 18px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, border: `2px solid ${WF.line}`, borderRadius: 12, padding: 10, textAlign: 'center' }}>
            <div className="wf-marker" style={{ fontSize: 20, fontWeight: 700, color: WF.purple }}>12</div><div style={{ fontSize: 9, color: WF.ink2 }}>CAUGHT</div>
          </div>
          <div style={{ flex: 1, border: `2px solid ${WF.line}`, borderRadius: 12, padding: 10, textAlign: 'center' }}>
            <div className="wf-marker" style={{ fontSize: 20, fontWeight: 700 }}>13</div><div style={{ fontSize: 9, color: WF.ink2 }}>POKÉDEX</div>
          </div>
          <div style={{ flex: 1, border: `2px solid ${WF.line}`, borderRadius: 12, padding: 10, textAlign: 'center' }}>
            <div className="wf-marker" style={{ fontSize: 20, fontWeight: 700, color: WF.yellow }}>1</div><div style={{ fontSize: 9, color: WF.ink2 }}>LEGENDARY</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }} className="wf-scroll">
          {['All', 'Compsci', 'Science', 'Curriculum'].map((t, i) => <Pill key={t} accent={i === 0 ? WF.purple : undefined} style={i === 0 ? { background: hexA(WF.purple, .12) } : {}}>{t}</Pill>)}
        </div>
        {groups.map((g) => {
          const r = REGIONS[g.region];
          return (
            <div key={g.region} style={{ marginBottom: 16 }}>
              <Head>{r.name} <span style={{ color: r.accent }}>· {g.caught.filter(Boolean).length}/{g.total}</span></Head>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {g.caught.map((mon, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', border: `2px solid ${mon ? r.accent : WF.faint}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: mon ? hexA(r.accent, .08) : 'rgba(120,110,98,.05)' }}>
                    {mon
                      ? <span style={{ fontSize: 24 }}>{mon}</span>
                      : <span style={{ fontSize: 24, filter: 'grayscale(1) brightness(.4)', opacity: .35 }}>❔</span>}
                    <span style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 7, color: WF.ink2, fontFamily: 'ui-monospace,monospace' }}>#{(i + 1).toString().padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <Note c={WF.purple}>Re-skin of existing /collection — group by subject/zone; uncaught show as silhouettes. Reuses rarity styling from routes/.</Note>
      </div>
    </PhoneFrame>
  );
}

// ── STORE — 4 pokéball tiers with per-tier art ──
function Store() {
  const tiers = [
    { id: 'pokeball', name: 'Poké Ball', rate: '40%', price: 100, c: '#d24a3d', own: 5 },
    { id: 'greatball', name: 'Great Ball', rate: '60%', price: 300, c: '#3a7fd0', own: 2 },
    { id: 'ultraball', name: 'Ultra Ball', rate: '80%', price: 800, c: '#E0A800', own: 1 },
    { id: 'masterball', name: 'Master Ball', rate: '100%', price: 5000, c: '#7c4ddb', own: 0 },
  ];
  return (
    <PhoneFrame nav="bag" region="compsci" header={<AppHeader region="compsci" title="Toko" />}>
      <div style={{ padding: '12px 14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `2px solid ${WF.line}`, borderRadius: 12, padding: '10px 12px', marginBottom: 14, background: hexA(WF.yellow, .08) }}>
          <Glyph n="coin" s={22} c={WF.yellow} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: WF.ink2 }}>Your coins</div><div className="wf-marker" style={{ fontSize: 18, fontWeight: 700, color: WF.yellow }}>240</div></div>
          <Btn small ghost><Glyph n="plus" s={12} c={WF.ink} /> Earn</Btn>
        </div>
        <Head>Poké Balls</Head>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tiers.map((t) => {
            const afford = 240 >= t.price;
            return (
              <div key={t.id} style={{ display: 'flex', gap: 11, alignItems: 'center', border: `2px solid ${WF.line}`, borderLeft: `5px solid ${t.c}`, borderRadius: 12, padding: 10, background: WF.paper }}>
                <ImgBox path={`images/pokeballs/${t.id}.png`} accent={t.c} h={48} w={48} r={14}>
                  <div style={{ width: 30, height: 30, borderRadius: 99, border: `2px solid ${WF.line}`, background: t.c }} />
                </ImgBox>
                <div style={{ flex: 1 }}>
                  <div className="wf-marker" style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: WF.ink2 }}>Catch rate {t.rate} · own {t.own}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Btn small accent={t.c} ghost={!afford} style={{ color: afford ? '#fff' : WF.faint, borderColor: afford ? WF.line : WF.faint, boxShadow: afford ? `2px 2px 0 ${WF.line}` : 'none' }}>
                    <Glyph n="coin" s={11} c={afford ? '#fff' : WF.faint} /> {t.price}
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
        <Note c={WF.purple}>Per-tier art replaces the single generic ball image. Manifest C → images/pokeballs/*.png; getPokeballImg repoints by ball id.</Note>
      </div>
    </PhoneFrame>
  );
}

// ── PROFILE / PARENT — slot UI + parent dashboard + Modul Lama link ──
function Profile() {
  return (
    <PhoneFrame nav="user" region="compsci" header={<AppHeader region="compsci" title="Profil" />}>
      <div style={{ padding: '12px 14px 18px' }}>
        {/* trainer card */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', border: `2px solid ${WF.line}`, borderRadius: 16, padding: 12, marginBottom: 12, boxShadow: `3px 3px 0 ${hexA(WF.purple, .4)}` }}>
          <DruAvatar size={58} ring={WF.purple} rw={2.5} />
          <div style={{ flex: 1 }}>
            <div className="wf-marker" style={{ fontSize: 17, fontWeight: 700 }}>Dru</div>
            <div style={{ fontSize: 10, color: WF.ink2 }}>Trainer · Level 7 · since Mar 2026</div>
            <div style={{ marginTop: 6 }}><Meter pct={62} c={WF.purple} h={6} /></div>
          </div>
        </div>

        {/* slot switcher */}
        <Head>Player slots</Head>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[['dru', 'Dru', true], ['＋', 'Add', false]].map(([e, n, on]) => (
            <div key={n} className="wf-tap" style={{ flex: 1, border: `2px solid ${on ? WF.purple : WF.faint}`, borderStyle: on ? 'solid' : 'dashed', borderRadius: 12, padding: '10px 8px', textAlign: 'center', background: on ? hexA(WF.purple, .08) : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              {e === 'dru' ? <DruAvatar size={30} ring={WF.purple} /> : <div style={{ fontSize: 22 }}>{e}</div>}
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{n}</div>
            </div>
          ))}
        </div>

        {/* per-region progress */}
        <Head>Progress by world</Head>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {[['curriculum', 66], ['science', 33], ['compsci', 10]].map(([rg, p]) => {
            const r = REGIONS[rg];
            return (
              <div key={rg} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: r.accent, width: 92 }}>{r.name}</span>
                <div style={{ flex: 1 }}><Meter pct={p} c={r.accent} h={6} /></div>
                <span style={{ fontSize: 10, color: WF.ink2, width: 30, textAlign: 'right' }}>{p}%</span>
              </div>
            );
          })}
        </div>

        {/* parent dashboard entry + archive */}
        <Head>For grown-ups</Head>
        <div className="wf-tap" style={{ display: 'flex', alignItems: 'center', gap: 10, border: `2px solid ${WF.line}`, borderRadius: 12, padding: 11, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>👪</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>Parent dashboard</div><div style={{ fontSize: 10, color: WF.ink2 }}>Time played · topics · accuracy · /parent</div></div>
          <Glyph n="arrow" s={16} c={WF.ink2} />
        </div>
        <div className="wf-tap" style={{ display: 'flex', alignItems: 'center', gap: 10, border: `2px dashed ${WF.faint}`, borderRadius: 12, padding: 11 }}>
          <span style={{ fontSize: 18 }}>📦</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>Modul Lama</div><div style={{ fontSize: 10, color: WF.ink2 }}>Math Arena, Word Search, Ramadhan… · /archive</div></div>
          <Glyph n="arrow" s={16} c={WF.ink2} />
        </div>
        <Note c={WF.purple}>Reuses existing slot UI + /parent. “Modul Lama” surfaces archived legacy games without deleting them (IA archive strategy).</Note>
      </div>
    </PhoneFrame>
  );
}

Object.assign(window, { Collection, Store, Profile });
