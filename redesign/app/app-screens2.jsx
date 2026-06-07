// app-screens2.jsx — Collection, Store, Profile / Parent.

// regionMons: safe helper — requires regions object from useContent()
const regionMons = (regions, id) => {
  if (!regions || !regions[id]) return [];
  const seen = {}; const out = [];
  regions[id].zones.forEach((z) => (z.mons || []).forEach((m) => {
    if (!seen[m.dex]) { seen[m.dex] = 1; out.push(m); }
  }));
  return out;
};

function Collection({ caught, region, go }) {
  const { regions, ready } = useContent();
  if (!ready || !regions) return <ContentLoading />;

  const order = ['curriculum', 'science', 'compsci'].filter(id => regions[id]);
  const [filter, setFilter] = React.useState('all');
  const has = (dex) => caught.includes(dex);
  const all = order.flatMap(id => regionMons(regions, id));
  const total = all.length;
  const legend = all.filter((m) => has(m.dex) && m.rarity === 'legendary').length;
  const accent = (regions[region] || regions[order[0]] || {}).accent || 'var(--accent)';

  return (
    <div className="body screen-anim">
      <div className="pad">
        <div className="col-stats">
          <div className="col-stat" style={{ '--accent': accent }}>
            <b style={{ color: 'var(--accent)' }}>{caught.length}</b><span>Caught</span>
          </div>
          <div className="col-stat"><b>{total}</b><span>Pokédex</span></div>
          <div className="col-stat"><b style={{ color: 'var(--yellow)' }}>{legend}</b><span>Legendary</span></div>
        </div>
        <div className="col-filters" data-region={region}>
          {[['all', 'All'], ...order.map((id) => [id, regions[id].tag || id])].map(([id, label]) => (
            <div key={id} className={'filter' + (filter === id ? ' on' : '')} onClick={() => setFilter(id)}>{label}</div>
          ))}
        </div>
        {order.filter((id) => filter === 'all' || filter === id).map((id) => {
          const r = regions[id];
          const mons = regionMons(regions, id);
          const c = mons.filter((m) => has(m.dex)).length;
          return (
            <div key={id} data-region={id}>
              <div className="sec-head">
                <h2 style={{ color: 'var(--accent)', fontSize: 15 }}>{r.name}</h2>
                <a>{c}/{mons.length}</a>
              </div>
              <div className="col-grid">
                {mons.map((m) => (
                  <div key={m.dex} className={'dex' + (has(m.dex) ? '' : ' un')}
                    style={has(m.dex) ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}}>
                    <span className="rar" style={{ background: RARITY[m.rarity].c }} />
                    <img src={m.sprite} alt={has(m.dex) ? m.name : '???'} crossOrigin="anonymous" />
                    <span className="no">#{String(m.dex).padStart(3, '0')}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Store({ coins, region, pokeballs }) {
  return (
    <div className="body screen-anim" data-region={region}>
      <div className="pad">
        <div className="wallet">
          <Pokeball size={40} id="pokeball" top="#EE3D34" />
          <div style={{ flex: 1 }}><span>Your coins</span><b>{coins}</b></div>
          <div className="pill"><Icon name="zap" size={13} /> Earn more</div>
        </div>
        <div className="sec-head"><h2>Poké Balls</h2></div>
        {(pokeballs || POKEBALLS).map((b) => {
          const afford = coins >= b.price;
          return (
            <div key={b.id} className="store-row" style={{ borderLeft: `4px solid ${b.top}` }}>
              <Pokeball size={46} id={b.id} top={b.top} />
              <div className="info"><b>{b.name}</b><span>Catch rate {Math.round(b.rate * 100)}% · you own {b.own}</span></div>
              <div className={'buy' + (afford ? '' : ' disabled')}><Icon name="coin" size={13} color={afford ? '#0b0a16' : 'var(--text-tertiary)'} /> {b.price}</div>
            </div>
          );
        })}
        <div className="sec-head"><h2>Items</h2></div>
        <div className="store-row">
          <div className="mission-ico" style={{ width: 46, height: 46 }}><Icon name="hint" size={22} /></div>
          <div className="info"><b>Draco Hint ×3</b><span>Reveal a clue during any zone</span></div>
          <div className="buy"><Icon name="coin" size={13} color="#0b0a16" /> 150</div>
        </div>
      </div>
    </div>
  );
}

// Slot avatar initials (no raster avatar per-player yet)
function SlotAvatar({ name, size = 44, active }) {
  const initial = (name || '?')[0].toUpperCase();
  const colors  = ['#8B5CF6','#00D9B8','#FFCB05','#EE3D34'];
  const idx     = Math.max(0, ['Dru','Oming','Reymar','Ilyas'].indexOf(name));
  const bg      = colors[idx % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.4,
      color: '#fff', border: active ? `2px solid ${bg}` : '2px solid transparent',
      boxShadow: active ? `0 0 12px ${bg}66` : 'none', flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

function Profile({ caught, region, go, profile, playerName, activeSlot, allSlots, onSwitchSlot }) {
  const { regions } = useContent();

  // XP % for meter
  const xpPct = profile.xpToNext > 0
    ? Math.round((profile.xp / profile.xpToNext) * 100)
    : 100;

  // Zone progress per region
  const clearedByRegion = React.useMemo(() => {
    const out = {};
    if (!regions) return out;
    for (const [rid, r] of Object.entries(regions)) {
      const total   = r.zones.length;
      const cleared = r.zones.filter(z =>
        (window._progress || []).some(p => p.zoneId === z.id && p.status === 'cleared')
      ).length;
      out[rid] = total > 0 ? Math.round((cleared / total) * 100) : 0;
    }
    return out;
  }, [regions]);

  // expose progress to the memo above via window (simple bridge)
  React.useEffect(() => { window._progress = []; }, []);

  return (
    <div className="body screen-anim" data-region={region}>
      <div className="pad">

        {/* ── Active player card ── */}
        <div className="prof-card">
          <SlotAvatar name={playerName} size={56} active />
          <div className="who">
            <b>{playerName}</b>
            <span>Level {profile.level} · {caught.length} caught · {profile.coins} koin</span>
            <div className="meter" style={{ marginTop: 8 }}>
              <i style={{ width: xpPct + '%' }} />
            </div>
            <small style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
              {profile.xp} / {profile.xpToNext} XP
            </small>
          </div>
        </div>

        {/* ── Slot selector ── */}
        <div className="sec-head"><h2>Ganti pemain</h2></div>
        <div className="slots">
          {allSlots.length > 0
            ? allSlots.map(s => (
                <div
                  key={s.slot}
                  className={'slot' + (s.slot === activeSlot ? ' on' : '')}
                  onClick={() => onSwitchSlot && onSwitchSlot(s.slot)}
                  style={{ cursor: s.slot === activeSlot ? 'default' : 'pointer' }}
                >
                  <SlotAvatar name={s.name} size={40} active={s.slot === activeSlot} />
                  <div style={{ display:'flex', flexDirection:'column', gap:1, minWidth:0 }}>
                    <b style={{ fontSize:13 }}>{s.name}</b>
                    <span style={{ fontSize:10, color:'var(--text-tertiary)' }}>
                      Lv {s.level} · {s.caughtCount} caught
                    </span>
                  </div>
                  {s.slot === activeSlot && (
                    <span style={{ marginLeft:'auto', fontSize:10, color:'var(--accent)', fontWeight:700 }}>AKTIF</span>
                  )}
                </div>
              ))
            : /* loading fallback */
              [1,2,3,4].map(n => (
                <div key={n} className={'slot' + (n === activeSlot ? ' on' : '')}
                  style={{ opacity: 0.4, cursor: 'default' }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--surface-2)' }}/>
                  <b style={{ fontSize:13 }}>—</b>
                </div>
              ))
          }
        </div>

        {/* ── Progress by world ── */}
        {regions && (
          <React.Fragment>
            <div className="sec-head"><h2>Progress per dunia</h2></div>
            {Object.entries(regions).map(([id, r]) => (
              <div key={id} className="prog-row" data-region={id}>
                <b style={{ color:'var(--accent)', minWidth:110, fontSize:13 }}>{r.name}</b>
                <div className="meter" style={{ flex:1 }}>
                  <i style={{ width: (clearedByRegion[id] ?? 0) + '%' }} />
                </div>
                <span style={{ fontSize:11, minWidth:32, textAlign:'right' }}>
                  {clearedByRegion[id] ?? 0}%
                </span>
              </div>
            ))}
          </React.Fragment>
        )}

        {/* ── Pokéball inventory ── */}
        <div className="sec-head"><h2>Pokéball</h2></div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:8 }}>
          {POKEBALLS.map(b => (
            <div key={b.id} style={{ display:'flex', alignItems:'center', gap:6,
              background:'var(--surface-2)', borderRadius:10, padding:'6px 12px', fontSize:13 }}>
              <Pokeball size={24} id={b.id} top={b.top} />
              <span style={{ fontWeight:700 }}>
                ×{profile.pokeballs?.[b.id] ?? 0}
              </span>
            </div>
          ))}
        </div>

        {/* ── Links ── */}
        <div className="sec-head"><h2>Untuk orang tua</h2></div>
        <div className="link-row" onClick={() => window.open('/parent','_blank')}>
          <div className="ic"><Icon name="chart" size={20} /></div>
          <div className="tx"><b>Parent dashboard</b><span>Waktu main · topik · akurasi</span></div>
          <Icon name="arrowR" size={18} color="var(--text-tertiary)" />
        </div>
        <div className="link-row archive">
          <div className="ic"><Icon name="archive" size={20} /></div>
          <div className="tx"><b>Modul Lama</b><span>Math Arena, Word Search, Ramadhan…</span></div>
          <Icon name="arrowR" size={18} color="var(--text-tertiary)" />
        </div>

      </div>
    </div>
  );
}

Object.assign(window, { Collection, Store, Profile, regionMons });
