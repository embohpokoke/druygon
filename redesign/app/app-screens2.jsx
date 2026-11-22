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

function Collection({ caught, region, go, team, onTeamAdd, onTeamRemove, shiny = [] }) {
  const [filter, setFilter] = React.useState('all');
  const { regions, ready } = useContent();
  if (!ready || !regions) return <ContentLoading />;

  const order = ['curriculum', 'science', 'matpel'].filter(id => regions[id]);
  const has = (dex) => caught.includes(dex);
  const hasShiny = (dex) => (shiny || []).some((s) => s && s.dex === dex);
  const all = order.flatMap(id => regionMons(regions, id));
  const total = all.length;
  const shinyCount = (shiny || []).length;
  const legend = all.filter((m) => has(m.dex) && m.rarity === 'legendary').length;
  const accent = (regions[region] || regions[order[0]] || {}).accent || 'var(--accent)';

  // v2 tabs: shiny is a cross-region collection; legendary shows owned legendaries.
  const isShinyTab = filter === 'shiny';
  const isLegendTab = filter === 'legend';
  const monsFor = (id) => {
    const mons = regionMons(regions, id);
    if (isShinyTab) return mons.filter((m) => hasShiny(m.dex));
    if (isLegendTab) return mons.filter((m) => m.rarity === 'legendary' && has(m.dex));
    return mons;
  };
  const shownRegions = order.filter((id) => filter === 'all' || filter === id || isShinyTab || isLegendTab);
  const visibleCount = shownRegions.reduce((n, id) => n + monsFor(id).length, 0);
  const emptyText = isShinyTab
    ? 'Belum ada shiny — terus cari! ✨'
    : isLegendTab
      ? 'Belum ada legendary — selesaikan semua zona region untuk membuka gerbang legenda.'
      : 'Belum ada Pokémon yang cocok dengan filter ini.';

  return (
    <div className="body screen-anim">
      <div className="pad">
        {caught.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
            <img src="/assets/dru/dru-idle.png" alt="Dru" width={96} height={96}
              style={{ objectFit: 'contain', marginBottom: 16 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary, #f0eeff)' }}>No Pokémon yet</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #9aa0b5)', margin: 0, maxWidth: 280 }}>
              Go catch some! Head to the Map and answer questions to meet wild Pokémon.
            </p>
          </div>
        ) : (
          <React.Fragment>
        <div className="col-stats">
          <div className="col-stat" style={{ '--accent': accent }}>
            <b style={{ color: 'var(--accent)' }}>{caught.length}</b><span>Caught</span>
          </div>
          <div className="col-stat"><b>{total}</b><span>Pokédex</span></div>
          <div className="col-stat"><b style={{ color: '#FFD84D' }}>{shinyCount}</b><span>Shiny</span></div>
          <div className="col-stat"><b style={{ color: 'var(--yellow)' }}>{legend}</b><span>Legendary</span></div>
        </div>
        <div className="col-filters" data-region={region}>
          {[['all', 'All'], ...order.map((id) => [id, regions[id].tag || id]), ['shiny', '✨ Shiny'], ['legend', '★ Legend']].map(([id, label]) => (
            <div key={id} className={'filter' + (filter === id ? ' on' : '')} onClick={() => setFilter(id)}>{label}</div>
          ))}
        </div>
        {visibleCount === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 34, lineHeight: 1, marginBottom: 10 }}>
              {isShinyTab ? '✨' : isLegendTab ? '★' : '🔎'}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 300 }}>
              {emptyText}
            </p>
          </div>
        )}
        {shownRegions.map((id) => {
          const r = regions[id];
          const mons = monsFor(id);
          if ((isShinyTab || isLegendTab) && mons.length === 0) return null;
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
                  const isCaught = has(m.dex);
                  const isShiny = hasShiny(m.dex);
                  const isLegend = m.rarity === 'legendary' && isCaught;
                  const frame = 'dex' + (isCaught ? '' : ' un')
                    + (isShiny ? ' shiny-frame' : '')
                    + (isLegend ? ' legend-frame' : '');
                  return (
                  <div key={m.dex} className={frame}
                    style={isCaught ? { borderColor: inTeam ? 'var(--yellow)' : 'var(--accent)', background: inTeam ? 'rgba(255,203,5,.08)' : 'var(--accent-soft)' } : {}}>
                    <span className="rar" style={{ background: RARITY[m.rarity].c }} />
                    <img src={isShiny ? SHINY_SPRITE(m.dex) : m.sprite} alt={isCaught ? m.name : '???'} crossOrigin="anonymous"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = m.sprite; }} />
                    <span className="no">#{String(m.dex).padStart(3, '0')}</span>
                    {isShiny && <span className="shiny-badge" title="Shiny">✨</span>}
                    {isLegend && (
                      <span title="Legendary" style={{ position: 'absolute', bottom: 2, left: 4, fontSize: 10, lineHeight: 1, color: '#FFD84D', textShadow: '0 0 6px rgba(255,203,5,.65)' }}>★</span>
                    )}
                    {inTeam && <span style={{ position: 'absolute', top: 2, right: 2, fontSize: 14, lineHeight: 1, filter: 'drop-shadow(0 0 3px rgba(255,203,5,.6))' }} title="In team">⭐</span>}
                    {isCaught && onTeamAdd && onTeamRemove && (
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
      SFX.play('correct');
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

// SlotAvatar comes from components.jsx (partner Pokémon + colour ring)

// Local fallback when the server rank payload is missing (older API / offline).
// Mirrors GET /api/player/:slot rank maths; awards stay server-authoritative.
function localRank(profile, caught, awards) {
  const level = (profile && profile.level) || 1;
  const points = level * 10 + (caught || []).length * 3;
  const base = rankForPoints(points);
  const next = base.next || null;
  const span = next ? next.points - base.points : 0;
  const progressPct = next && span > 0
    ? Math.max(0, Math.min(100, Math.round(((points - base.points) / span) * 100)))
    : 100;
  return {
    id: base.id,
    name: base.name,
    title: base.title,
    tier: base.tier,
    points,
    next: next ? { id: next.id, name: next.name, points: next.points } : null,
    progressPct,
    charm: base.tier >= 3 && (awards || []).includes('ace'),
    perks: base.perks || [],
    awards: [],
  };
}

function Profile({ caught = [], region, go, profile, playerName, activeSlot, allSlots = [], onSwitchSlot, team, badges, dailyMission, progress, onTeamRemove, rank = null, shiny = [], rankAwards = [], onRankClaim = null }) {
  const { regions } = useContent();
  const [claiming, setClaiming] = React.useState(null);
  const [claimErr, setClaimErr] = React.useState(null);

  // XP % for meter
  const xpPct = profile.xpToNext > 0
    ? Math.round((profile.xp / profile.xpToNext) * 100)
    : 100;

  // ── Trainer Rank (server-authoritative; local mirror as a safe fallback) ──
  const awards = Array.isArray(rankAwards) ? rankAwards : [];
  const rk = rank || localRank(profile, caught, awards);
  const rankMeta = TRAINER_RANKS.find(r => r.id === rk.id) || TRAINER_RANKS.find(r => r.tier === rk.tier) || TRAINER_RANKS[0];
  const rankName = rk.name || rankMeta.name;
  const rankTitle = rk.title || rankMeta.title;
  const rankEmoji = rankMeta.emoji || '🥚';
  const rankColor = rankMeta.color || '#FFCB05';
  const rankTier = rk.tier || rankMeta.tier || 1;
  const rankPoints = typeof rk.points === 'number' ? rk.points : 0;
  const nextRank = rk.next || null;
  const threshold = rankMeta.points || 0;
  const computedPct = nextRank
    ? Math.round(((rankPoints - threshold) / Math.max(1, nextRank.points - threshold)) * 100)
    : 100;
  const progressPct = Math.max(0, Math.min(100, Number.isFinite(rk.progressPct) ? rk.progressPct : computedPct));
  const pointsToNext = nextRank ? Math.max(0, nextRank.points - rankPoints) : 0;
  const shinyCount = (shiny || []).length;
  const charmOn = !!rk.charm;

  const claimRank = async (rankId) => {
    if (!onRankClaim || claiming) return;
    setClaiming(rankId);
    setClaimErr(null);
    try {
      const data = await onRankClaim(rankId);
      if (!data) setClaimErr({ id: rankId, msg: 'Gagal klaim hadiah. Coba lagi.' });
    } catch (e) {
      setClaimErr({ id: rankId, msg: (e && e.message) || 'Gagal klaim hadiah.' });
    } finally {
      setClaiming(null);
    }
  };

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

  // Legendary mons already caught (Profile gets caught as dex array)
  const legendaryCaught = React.useMemo(() => {
    if (!regions) return 0;
    const caughtSet = new Set(caught);
    const seen = new Set();
    for (const r of Object.values(regions)) {
      for (const z of (r.zones || [])) {
        for (const m of (z.mons || [])) {
          if (m.rarity === 'legendary' && caughtSet.has(m.dex)) seen.add(m.dex);
        }
      }
    }
    return seen.size;
  }, [regions, caught]);

  // ── Achievements badges ──

  return (
    <div className="body screen-anim" data-region={region}>
      <div className="pad">

        {/* ── Active player card — trainer identity colours + rank title ── */}
        {(() => { const idn = playerIdentity(playerName); return (
        <div className="prof-card" style={{ background: `linear-gradient(135deg, ${idn.color}22, var(--bg-card))` }}>
          <div style={{ width: 62, height: 62, borderRadius: '50%', overflow: 'hidden', border: `2.5px solid ${idn.color}`, flexShrink: 0, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={SPRITE(idn.dex)} alt={idn.mon} width={52} height={52} crossOrigin="anonymous"
              style={{ objectFit: 'contain' }} />
          </div>
          <div className="who" style={{ flex: 1, minWidth: 0 }}>
            <b>{playerName}</b>
            <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px 5px' }}>
              <span style={{ fontSize: 13, lineHeight: 1 }} title={rankTitle}>{rankEmoji}</span>
              <span style={{ color: rankColor, fontWeight: 700 }}>{rankTitle}</span>
              <span>· Level {profile.level} · {caught.length} caught · {(profile.coins ?? 0).toLocaleString()} coins</span>
            </span>
            <div className="meter" style={{ marginTop: 8 }}>
              <i style={{ width: xpPct + '%', background: `linear-gradient(90deg, ${idn.color}, #FF6B2B)` }} />
            </div>
            <small style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
              {profile.xp} / {profile.xpToNext} XP
            </small>
          </div>
        </div>
        ); })()}

        {/* ── Trainer Rank — header, progress, ladder & claims (SPEC v2 §3.3) ── */}
        <div className="sec-head"><h2>Rank {rankName}</h2><a style={{ whiteSpace: 'nowrap' }}>{rankPoints} pts</a></div>
        <div className="rank-mini" style={{ marginBottom: 10 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
            background: rankColor + '22', border: '1.5px solid ' + rankColor, fontSize: 23, lineHeight: 1 }}>
            {rankEmoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
              <b style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: rankColor }}>{rankTitle}</b>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{rankPoints} pts</span>
            </div>
            <div className="meter" style={{ margin: '6px 0 4px' }}>
              <i style={{ width: progressPct + '%', background: 'linear-gradient(90deg, #FFCB05, #FFD84D)' }} />
            </div>
            <small style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              {nextRank ? `Next: ${nextRank.name} · ${pointsToNext} pts lagi` : 'Rank tertinggi tercapai 🐉'}
            </small>
          </div>
        </div>

        <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '4px 0 7px' }}>
          Rank Ladder
        </div>
        {TRAINER_RANKS.map((r) => {
          const claimed = awards.includes(r.id);
          const isCurrent = r.id === rk.id || r.tier === rankTier;
          const done = r.tier < rankTier;
          const locked = r.tier > rankTier && !isCurrent;
          const claimable = (done || isCurrent) && !claimed && !!onRankClaim;
          const symbol = claimed ? '✓' : (isCurrent || done) ? '●' : '🔒';
          const statusLabel = claimed ? 'Hadiah sudah diklaim'
            : isCurrent ? 'Rank sekarang'
              : done ? 'Tercapai — hadiah belum diklaim'
                : 'Terkunci';
          const rowBusy = claiming === r.id;
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 12, marginBottom: 7,
              background: isCurrent ? 'rgba(255,203,5,.10)' : claimed ? 'var(--bg-card)' : 'transparent',
              border: isCurrent ? '1px solid rgba(255,203,5,.35)' : claimed ? '1px solid rgba(74,222,128,.22)' : '1px solid var(--border-subtle)',
              opacity: locked ? 0.55 : 1 }}>
              <span style={{ width: 24, textAlign: 'center', fontSize: 18, lineHeight: 1, flexShrink: 0,
                filter: locked ? 'grayscale(1)' : 'none' }}>
                {r.emoji}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                  color: isCurrent ? '#FFD84D' : locked ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>
                  {r.points} pts{r.perks && r.perks.length ? ' · ' + r.perks.join(' · ') : ''}
                </div>
                {claimErr && claimErr.id === r.id && (
                  <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 2 }}>{claimErr.msg}</div>
                )}
              </div>
              {claimable && (
                <button type="button" onClick={() => claimRank(r.id)} disabled={!!claiming}
                  style={{ flexShrink: 0, padding: '5px 9px', borderRadius: 8, border: 'none',
                    cursor: claiming ? 'wait' : 'pointer', background: '#FFCB05', color: '#0b0a16',
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 10,
                    opacity: rowBusy ? 0.6 : 1 }}>
                  {rowBusy ? '…' : 'Klaim'}
                </button>
              )}
              <span title={statusLabel} style={{ width: 16, flexShrink: 0, textAlign: 'center',
                fontSize: claimed ? 13 : 11, color: claimed ? '#4ADE80' : (isCurrent || done) ? '#FFCB05' : 'var(--text-tertiary)' }}>
                {symbol}
              </span>
            </div>
          );
        })}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '2px 0 12px' }}>
          <span style={{ fontSize: 11, padding: '5px 10px', borderRadius: 999,
            background: charmOn ? 'rgba(255,203,5,.14)' : 'var(--surface-2)',
            border: '1px solid ' + (charmOn ? 'rgba(255,203,5,.45)' : 'var(--border-subtle)'),
            color: charmOn ? '#FFD84D' : 'var(--text-tertiary)' }}>
            Shiny Charm: {charmOn ? 'aktif' : 'nonaktif'}
          </span>
          <span style={{ fontSize: 11, padding: '5px 10px', borderRadius: 999, background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            ✨ Shiny {shinyCount}
          </span>
        </div>

        {/* ── Slot selector ── */}
        <div className="sec-head"><h2>Switch player</h2></div>
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
                    <span style={{ marginLeft:'auto', fontSize:10, color:'var(--accent)', fontWeight:700 }}>ACTIVE</span>
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
            <div className="sec-head"><h2>Progress by world</h2></div>
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

        {/* ── Shiny / Legendary summary — sits next to Achievements ── */}
        <div className="col-stats" style={{ margin: '16px 0 2px' }}>
          <div className="col-stat">
            <b style={{ color: '#FFD84D' }}>{shinyCount}</b><span>✨ Shiny</span>
          </div>
          <div className="col-stat">
            <b style={{ color: 'var(--yellow)' }}>{legendaryCaught}</b><span>★ Legendary</span>
          </div>
        </div>

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
            <div className="sec-head"><h2>Region Medals</h2></div>
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

        {/* ── Sound toggle ── */}
        <div className="sec-head"><h2>Settings</h2></div>
        <SoundRow />

        {/* ── Links ── */}
        <div className="sec-head"><h2>For parents</h2></div>
        <div className="link-row" onClick={() => window.open('/parent','_blank')}>
          <div className="ic"><Icon name="chart" size={20} /></div>
          <div className="tx"><b>Parent dashboard</b><span>Play time · topics · accuracy</span></div>
          <Icon name="arrowR" size={18} color="var(--text-tertiary)" />
        </div>
        <div className="link-row archive">
          <div className="ic"><Icon name="archive" size={20} /></div>
          <div className="tx"><b>Legacy Modules</b><span>Math Arena, Word Search, Ramadhan…</span></div>
          <Icon name="arrowR" size={18} color="var(--text-tertiary)" />
        </div>

      </div>
    </div>
  );
}

// Sound effects on/off row (persisted via SFX)
function SoundRow() {
  const [on, setOn] = React.useState(SFX.isOn());
  const toggle = () => { const v = !on; SFX.setOn(v); setOn(v); if (v) SFX.play('click'); };
  return (
    <div className="link-row" onClick={toggle} style={{ cursor: 'pointer' }}>
      <div className="ic"><Icon name={on ? 'volume' : 'volumeOff'} size={20} /></div>
      <div className="tx"><b>Sound effects</b><span>{on ? 'On — sounds when you answer & catch' : 'Off'}</span></div>
      <div style={{ width: 40, height: 22, borderRadius: 999, flexShrink: 0, position: 'relative', transition: 'background .2s',
        background: on ? 'var(--accent)' : 'var(--bg-elevated)', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-medium)') }}>
        <i style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
      </div>
    </div>
  );
}

Object.assign(window, { Collection, Store, Profile, regionMons, SoundRow });
