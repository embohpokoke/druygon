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

// Look up a Pokémon by dex number across all loaded regions.
const findMonByDex = (regions, dex) => {
  if (!regions) return null;
  for (const r of Object.values(regions)) {
    for (const z of (r.zones || [])) {
      const m = (z.mons || []).find(mm => mm.dex === dex);
      if (m) return m;
    }
  }
  return null;
};

function Collection({ caught, region, go, team, onTeamAdd, onTeamRemove }) {
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
        {caught.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
            <img src="/assets/dru/dru-idle.png" alt="Dru" width={96} height={96}
              style={{ objectFit: 'contain', marginBottom: 16 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary, #f0eeff)' }}>Belum ada Pokémon</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #9aa0b5)', margin: 0, maxWidth: 280 }}>
              Ayo tangkap! Kembali ke Peta dan jawab soal untuk bertemu Pokémon liar.
            </p>
          </div>
        ) : (
          <React.Fragment>
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
              <div className="sec-head" style={{ gap: 8 }}>
                <img src={'/assets/regions/' + id + '-icon.png'} alt={r.name} width={22} height={22}
                  style={{ objectFit: 'contain', flexShrink: 0 }} />
                <h2 style={{ color: 'var(--accent)', fontSize: 15 }}>{r.name}</h2>
                <a>{c}/{mons.length}</a>
              </div>
              <div className="col-grid">
                {mons.map((m) => {
                  const inTeam = (team || []).includes(m.dex);
                  const caught = has(m.dex);
                  return (
                  <div key={m.dex} className={'dex' + (caught ? '' : ' un')}
                    style={caught ? { borderColor: inTeam ? 'var(--yellow)' : 'var(--accent)', background: inTeam ? 'rgba(255,203,5,.08)' : 'var(--accent-soft)' } : {}}>
                    <span className="rar" style={{ background: RARITY[m.rarity].c }} />
                    <img src={m.sprite} alt={caught ? m.name : '???'} crossOrigin="anonymous" />
                    <span className="no">#{String(m.dex).padStart(3, '0')}</span>
                    {inTeam && <span style={{ position: 'absolute', top: 2, right: 2, fontSize: 14, lineHeight: 1, filter: 'drop-shadow(0 0 3px rgba(255,203,5,.6))' }} title="In team">⭐</span>}
                    {caught && onTeamAdd && onTeamRemove && (
                      inTeam
                        ? <div onClick={(e) => { e.stopPropagation(); onTeamRemove(m.dex); }} style={{ position: 'absolute', bottom: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: 'rgba(238,61,52,.8)', color: '#fff', fontSize: 14, lineHeight: '18px', textAlign: 'center', cursor: 'pointer' }} title="Remove from team">−</div>
                        : (!inTeam && (team || []).length < 3)
                          ? <div onClick={(e) => { e.stopPropagation(); onTeamAdd(m.dex); }} style={{ position: 'absolute', bottom: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: 'rgba(139,92,246,.8)', color: '#fff', fontSize: 14, lineHeight: '18px', textAlign: 'center', cursor: 'pointer' }} title="Add to team">+</div>
                          : null
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

function Store({ coins, region, pokeballs, activeSlot, onPurchase }) {
  const [buying, setBuying] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const buy = async (b) => {
    if (!activeSlot || buying) return;
    setBuying(b.id);
    setErr(null);
    try {
      const idem = 'purchase_' + activeSlot + '_' + b.id + '_' + Date.now();
      const data = await apiPost('/api/player/' + activeSlot + '/purchase', { item: b.id, idempotencyKey: idem });
      if (onPurchase) onPurchase(data);
    } catch (e) {
      setErr(e.message || 'Purchase failed');
    } finally {
      setBuying(null);
    }
  };
  return (
    <div className="body screen-anim" data-region={region}>
      <div className="pad">
        <div className="wallet">
          <Pokeball size={40} id="pokeball" top="#EE3D34" />
          <div style={{ flex: 1 }}><span>Your coins</span><b>{coins}</b></div>
          <div className="pill" onClick={() => window.open('https://druygon.my.id', '_self')} style={{ cursor: 'pointer' }}>
            <Icon name="zap" size={13} /> Earn more
          </div>
        </div>
        <div className="sec-head"><h2>Poké Balls</h2></div>
        {(pokeballs || POKEBALLS).map((b) => {
          const afford = coins >= b.price;
          const busy = buying === b.id;
          return (
            <div key={b.id} className="store-row" style={{ borderLeft: '4px solid ' + b.top, opacity: busy ? 0.6 : 1 }}>
              <Pokeball size={46} id={b.id} top={b.top} />
              <div className="info"><b>{b.name}</b><span>Catch rate {Math.round(b.rate * 100)}% · you own {b.own}</span></div>
              <div className={'buy' + (afford && !busy ? '' : ' disabled')} onClick={() => afford && !busy && buy(b)} style={{ cursor: afford && !busy ? 'pointer' : 'not-allowed' }}>
                <Icon name="coin" size={13} color={afford && !busy ? '#0b0a16' : 'var(--text-tertiary)'} /> {busy ? '...' : b.price}
              </div>
            </div>
          );
        })}
        {err && <div style={{ color: 'var(--red)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>{err}</div>}
        <div className="sec-head"><h2>Items</h2></div>
        <div className="store-row">
          <div className="mission-ico" style={{ width: 46, height: 46 }}><Icon name="hint" size={22} /></div>
          <div className="info"><b>Draco Hint ×3</b><span>Reveal a clue during any zone</span></div>
          <div className="buy disabled" style={{ cursor: 'not-allowed' }}>
            <Icon name="coin" size={13} color="var(--text-tertiary)" /> 150 (soon)
          </div>
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

function Profile({ caught, region, go, profile, playerName, activeSlot, allSlots, onSwitchSlot, team, badges, dailyMission, progress, onTeamRemove }) {
  const { regions } = useContent();

  // XP % for meter
  const xpPct = profile.xpToNext > 0
    ? Math.round((profile.xp / profile.xpToNext) * 100)
    : 100;

  // Zone progress per region — uses server-authoritative progress data
  const clearedByRegion = React.useMemo(() => {
    const out = {};
    if (!regions) return out;
    for (const [rid, r] of Object.entries(regions)) {
      const total   = r.zones.length;
      const cleared = r.zones.filter(z =>
        (progress || []).some(p => p.zoneId === z.id && p.status === 'cleared')
      ).length;
      out[rid] = total > 0 ? Math.round((cleared / total) * 100) : 0;
    }
    return out;
  }, [regions, progress]);

  // ── Achievements badges ──

  return (
    <div className="body screen-anim" data-region={region}>
      <div className="pad">

        {/* ── Active player card ── */}
        <div className="prof-card">
          <img src="/assets/dru/dru-trainer.png" alt="Dru" width={56} height={56}
            style={{ objectFit: 'contain', flexShrink: 0 }} />
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
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--surface-2)'}}/>
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
                <img src={'/assets/regions/' + id + '-icon.png'} alt={r.name} width={24} height={24}
                  style={{ objectFit: 'contain', flexShrink: 0 }} />
                <b style={{ color:'var(--accent)', minWidth:90, fontSize:13 }}>{r.name}</b>
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

        {/* ── Team ── */}
        <div className="sec-head"><h2>Team ({team ? team.length : 0}/3)</h2></div>
        {team && team.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {team.map((dex) => {
              const mon = findMonByDex(regions, dex);
              return (
                <div key={dex} style={{ display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--surface-2)', borderRadius: 10, padding: '6px 12px', fontSize: 13, position: 'relative' }}>
                  {mon && <img src={mon.sprite} alt={mon.name} width={32} height={32} style={{ objectFit: 'contain' }} crossOrigin="anonymous" />}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{mon ? mon.name : '#' + String(dex).padStart(3, '0')}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>#{String(dex).padStart(3, '0')} · {mon ? mon.type : '???'}</div>
                  </div>
                  {onTeamRemove && (
                    <span onClick={() => onTeamRemove(dex)} style={{ cursor: 'pointer', color: 'var(--red)', fontSize: 18, lineHeight: 1, marginLeft: 'auto' }} title="Remove from team">×</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>No team yet — catch Pokémon and add them from the celebration screen!</p>
        )}

        {/* ── Achievements ── */}
        {badges && badges.length > 0 && (
          <React.Fragment>
            <div className="sec-head"><h2>Achievements ({badges.length})</h2></div>
            <div className="chips-row" data-region={region} style={{ marginBottom: 12 }}>
              {badges.map(b => (
                <div key={b.id} className="ach"><div className="ach-ico"><Icon name={b.icon} size={16} /></div><div><b>{b.name}</b><span>{b.description}</span></div></div>
              ))}
            </div>
          </React.Fragment>
        )}

        {/* ── Region medals ── */}
        {regions && (
          <React.Fragment>
            <div className="sec-head"><h2>Medali Region</h2></div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              {Object.entries(regions).map(([id, r]) => {
                const pct = clearedByRegion[id] ?? 0;
                const earned = pct > 0;
                return (
                  <div key={id} title={r.name + (earned ? ' (' + pct + '% clear)' : ' — locked')}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: earned ? 1 : 0.35 }}>
                    <img src={'/assets/ui/medal-' + id + '.svg'} alt={r.name + ' medal'} width={56} height={62}
                      style={{ objectFit: 'contain', filter: earned ? 'none' : 'grayscale(1)' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: earned ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        )}

        {/* ── Streak ── */}
        {dailyMission && dailyMission.streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
            <Icon name="flame" size={20} color="var(--yellow)" />
            <div>
              <b style={{ color: 'var(--yellow)' }}>{dailyMission.streak}-day streak</b>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>Keep catching every day to grow it!</p>
            </div>
          </div>
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
