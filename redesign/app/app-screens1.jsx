// app-screens1.jsx — Home (A), Region map (B), Catch/battle (B), Celebration (A).

const { useState: uS1, useRef: uR1, useEffect: uE1 } = React;
const PLAYER = { name: 'Dru', level: 7, xpPct: 62 };
const RANK = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

// Weighted rarity helper
function weightedPick(mons) {
  if (!mons || mons.length === 0) return null;
  const weights = mons.map(m => {
    switch (m.rarity) {
      case 'legendary': return 2;
      case 'rare': return 8;
      case 'uncommon': return 20;
      default: return 70;
    }
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < mons.length; i++) {
    r -= weights[i];
    if (r <= 0) return mons[i];
  }
  return mons[mons.length - 1];
}

const rarest = (mons) => mons.reduce((a, b) => (RANK[b.rarity] > RANK[a.rarity] ? b : a), mons[0]);

// Local dex → mon lookup (trophies, gates). Deliberately self-contained instead
// of depending on a helper from another screen file. Returns null when missing.
const findMon = (dex, regions) => {
  if (!regions || dex == null) return null;
  for (const rid of Object.keys(regions)) {
    const region = regions[rid];
    for (const z of (region && region.zones) || []) {
      const mon = (z.mons || []).find((m) => m.dex === dex);
      if (mon) return { ...mon, regionId: rid, zoneId: z.id };
    }
  }
  return null;
};

// Mapel group key: 'matpel_pai_2' → 'matpel_pai'. Zones in the same group form
// one basic→advanced journey; different groups (school subjects) never gate
// each other. Single-group regions (science, curriculum) behave exactly as before.
const zoneGroup = (id) => String(id).replace(/_\d+$/, '');

// "Cleared" for a regular zone (SPEC §5): explicit row or 2 distinct dex caught there.
const zoneHasTwoCaught = (z, caught) =>
  new Set(caught.filter((c) => c.zoneId === z.id).map((c) => c.dex)).size >= 2;

// Pure zone state based on real player state
const zoneState = (z, profile = PLAYER, caught = [], progress = [], allZones = []) => {
  if (!z) return 'locked';

  // Legendary gate (SPEC §3.2): cleared once its legendary dex is caught;
  // open only after every non-legendary zone in the region is cleared.
  if (z.legendary) {
    const gateDex = (z.mons || []).map((m) => m.dex);
    if (caught.some((c) => c.zoneId === z.id || gateDex.includes(c.dex))) return 'cleared';
    const regular = (allZones || []).filter((x) => !x.legendary);
    const allClear = regular.every((x) => {
      const p = progress.find((q) => q.zoneId === x.id);
      return p?.status === 'cleared' || zoneHasTwoCaught(x, caught);
    });
    return allClear ? 'open' : 'locked';
  }

  // Explicit cleared in progress table
  const prog = progress.find(p => p.zoneId === z.id);
  if (prog?.status === 'cleared') return 'cleared';

  // Zone cleared when 2 distinct Pokémon caught in that zone
  const zoneCaught = caught.filter(c => c.zoneId === z.id);
  if (new Set(zoneCaught.map(c => c.dex)).size >= 2) return 'cleared';

  // Open if the previous zone IN THE SAME GROUP is cleared (or first in group).
  // Level is NOT a gate (GAME-RULES).
  const prevZone = (allZones || [])
    .filter(x => zoneGroup(x.id) === zoneGroup(z.id) && x.zone < z.zone)
    .sort((a, b) => b.zone - a.zone)[0];
  let prevCleared = !prevZone;
  if (prevZone) {
    const prevProg = progress.find(p => p.zoneId === prevZone.id);
    if (prevProg?.status === 'cleared') prevCleared = true;
    else {
      const prevCaught = caught.filter(c => c.zoneId === prevZone.id);
      if (new Set(prevCaught.map(c => c.dex)).size >= 2) prevCleared = true;
    }
  }

  if (prevCleared) return 'open';
  return 'locked';
};

// Loading skeleton shown while API content is fetched
function ContentLoading() {
  return (
    <div className="body screen-anim">
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: 32 }}>⚡</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Loading world data…</div>
      </div>
    </div>
  );
}

// ───────────────────────── HOME (variant A) ─────────────────────────
function Home({ go, caught, coins, profile, playerName, allSlots, activeSlot, progress, dailyMission, badges, onClaimMission, onOpenDraco, rank, shiny, legendaryCount }) {
  const { regions, ready } = useContent();
  if (!ready || !regions) return <ContentLoading />;
  const order = ['curriculum', 'science', 'matpel'].filter((id) => regions[id]);
  const level  = profile?.level  ?? PLAYER.level;
  const xpPct  = profile && profile.xpToNext > 0
    ? Math.round((profile.xp / profile.xpToNext) * 100)
    : PLAYER.xpPct;
  const name   = playerName || 'Trainer';
  const idn    = playerIdentity(playerName);
  // Real cleared zone count per region
  const prog   = Object.fromEntries(order.map(id => {
    const r = regions[id];
    const cleared = r.zones.filter(z => zoneState(z, profile, caught, progress, r.zones) === 'cleared').length;
    return [id, cleared];
  }));

  // v2 — trainer rank. Server object is authoritative; client mirror when absent.
  const shinyCount = (shiny || []).length;
  const legendCount = legendaryCount ?? 0;
  const computedPoints = (level * 10) + ((caught || []).length * 3);
  const rankObj = rank || rankForPoints(computedPoints);
  const rankPoints = rank ? (rank.points ?? computedPoints) : computedPoints;
  const rankMeta = TRAINER_RANKS.find((t) => t.id === rankObj.id) || {};
  const rankEmoji = rankObj.emoji || rankMeta.emoji || '🥚';
  const rankColor = rankObj.color || rankMeta.color || '#FFCB05';
  const rankPct = rank && rank.progressPct != null
    ? rank.progressPct
    : (rankObj.next
        ? Math.max(0, Math.min(100, Math.round(((rankPoints - rankObj.points) / (rankObj.next.points - rankObj.points)) * 100)))
        : 100);
  const rankGap = rankObj.next ? Math.max(0, rankObj.next.points - rankPoints) : 0;
  // Hero title: server rank title, else the trainer's personal title.
  const rankTitle = (rank && rank.title) || idn.title;
  const heroChip = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 800, color: '#FFCB05', background: 'rgba(255,203,5,.1)', border: '1px solid rgba(255,203,5,.3)' };

  // Trophy Case — newest 6 shiny/legendary catches, merged per dex.
  const trophyMap = new Map();
  (shiny || []).forEach((s) => {
    const mon = findMon(s.dex, regions) || { dex: s.dex, name: '#' + s.dex, sprite: SPRITE(s.dex) };
    const key = 'd' + s.dex;
    const prev = trophyMap.get(key) || {};
    trophyMap.set(key, { dex: s.dex, mon, caughtAt: s.caughtAt || prev.caughtAt, shiny: true, legendary: !!prev.legendary });
  });
  (caught || []).forEach((c) => {
    const mon = findMon(c.dex, regions);
    if (!mon || mon.rarity !== 'legendary') return;
    const key = 'd' + c.dex;
    const prev = trophyMap.get(key) || {};
    trophyMap.set(key, { dex: c.dex, mon, caughtAt: c.caughtAt || prev.caughtAt, legendary: true, shiny: !!prev.shiny });
  });
  const trophies = [...trophyMap.values()]
    .sort((a, b) => (new Date(b.caughtAt || 0).getTime() || 0) - (new Date(a.caughtAt || 0).getTime() || 0))
    .slice(0, 6);

  return (
    <div className="body screen-anim">
      <div className="pad">
        {/* player hero — tinted with the trainer's personal colour */}
        <div className="hero" data-region="compsci">
          <div className="hero-bg" style={{ background: `radial-gradient(130% 130% at 88% -20%, ${idn.color}55, transparent 55%), radial-gradient(90% 120% at 0% 120%, rgba(74,158,255,.28), transparent 60%), linear-gradient(160deg, #1b1540, #0c0a1e 72%)` }} />
          <div className="hero-glow" style={{ background: `radial-gradient(circle, ${idn.color}66, transparent 65%)` }} />
          <img src={SPRITE(idn.dex)} alt={idn.mon} width={92} height={92} crossOrigin="anonymous"
            style={{ position: 'absolute', right: 6, top: 4, objectFit: 'contain', opacity: .9, zIndex: -1, animation: 'floaty 3.5s ease-in-out infinite', filter: 'drop-shadow(0 8px 14px rgba(0,0,0,.5))' }} />
          <div className="hero-top">
            <div>
              <div className="hero-greet">Hi, <b style={{ color: idn.color }}>{name}</b> 👋</div>
              <div className="hero-sub">{rankTitle} · {caught.length} caught</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={heroChip} title="Shiny collected">✨ {shinyCount}</span>
                <span style={heroChip} title="Legendary caught">★ {legendCount}</span>
              </div>
            </div>
            <div className="hero-lvl" style={{ background: idn.color }}>LVL {level}</div>
          </div>
          <div className="hero-xp">
            <small>XP</small><div className="meter" style={{ flex: 1 }}><i style={{ width: xpPct + '%', background: `linear-gradient(90deg, ${idn.color}, #FF6B2B)` }} /></div>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><b style={{ color: idn.color }}>{level}</b><span>Level</span></div>
            <div className="hero-stat"><b style={{ color: idn.color }}>{(coins ?? 0).toLocaleString()}</b><span>Coins</span></div>
            <div className="hero-stat"><b style={{ color: idn.color }}>{caught.length}</b><span>Caught</span></div>
          </div>
        </div>

        {/* Trainer Rank — progress toward the next tier (v2) */}
        <div className="rank-mini" style={{ marginTop: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 24, background: rankColor + '22', border: '1px solid ' + rankColor + '66' }}>{rankEmoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{rankObj.name || rankTitle}</b>
              <span style={{ fontSize: 11, fontWeight: 700, color: rankColor, whiteSpace: 'nowrap' }}>{rankPoints} pts</span>
            </div>
            <div className="meter" style={{ marginTop: 7 }}><i className="xp-grow" style={{ width: rankPct + '%', background: `linear-gradient(90deg, ${rankColor}, #FFCB05)` }} /></div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 5 }}>
              {rankObj.next ? `next: ${rankObj.next.name} · ${rankGap} pts lagi` : 'Rank tertinggi tercapai'}
            </div>
          </div>
        </div>

        {/* DruCode module — carries the active Druygon player slot into the coding experience */}
        <button
          type="button"
          onClick={() => { window.location.href = 'https://cody.druygon.my.id/?slot=' + activeSlot; }}
          style={{
            width: '100%', marginTop: 14, borderRadius: 20, overflow: 'hidden', padding: 0,
            display: 'grid', gridTemplateColumns: '78px 1fr 34px', alignItems: 'center', gap: 14,
            cursor: 'pointer', textAlign: 'left', color: '#F7F5FF', position: 'relative',
            background: 'linear-gradient(120deg, #23204F 0%, #34266E 58%, #4A35A8 100%)',
            border: '1px solid rgba(46,201,192,.34)', boxShadow: 'var(--card-shadow)',
          }}
          aria-label="Buka DruCode, modul belajar coding"
        >
          <div style={{ height: 92, display: 'grid', placeItems: 'center', background: 'rgba(46,201,192,.12)' }}>
            <Icon name="cpu" size={34} color="#64E0D8" />
          </div>
          <div style={{ padding: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <b style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>DruCode</b>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: '#1A4744', background: '#65E4DC', padding: '3px 8px', borderRadius: 999 }}>MODUL BARU</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(247,245,255,.7)', marginTop: 5, lineHeight: 1.45 }}>
              Belajar blok visual, Python, dan web bersama Robo.
            </div>
          </div>
          <Icon name="arrowR" size={18} color="#F7F5FF" />
        </button>

        {/* Draco tutor card */}
        <div onClick={() => onOpenDraco && onOpenDraco(null)} style={{ position: 'relative', marginTop: 14, borderRadius: 20, overflow: 'hidden', padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', isolation: 'isolate', background: 'linear-gradient(120deg, #241a4d 0%, #16123a 55%, #101030 100%)', border: '1px solid rgba(139,92,246,.35)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', right: -40, top: -50, background: 'radial-gradient(circle, rgba(139,92,246,.4), transparent 68%)', zIndex: -1 }} />
          <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #8B5CF6, #4A9EFF)', boxShadow: '0 0 20px rgba(139,92,246,.45)', animation: 'floaty 3.5s ease-in-out infinite' }}>
            <Icon name="sparkles" size={28} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <b style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>Draco</b>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: 'var(--green)', background: 'rgba(74,222,128,.12)', padding: '2px 7px', borderRadius: 999 }}>
                <i style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />AI TUTOR
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(240,238,255,.65)', marginTop: 3, lineHeight: 1.4 }}>Stuck on a question? Ask me — science, code, or homework.</div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,.2)', border: '1px solid rgba(139,92,246,.5)', color: '#B79BFF' }}>
            <Icon name="arrowR" size={17} />
          </div>
        </div>

        {/* 3 region cards */}
        <div className="sec-head"><h2>Choose a world</h2></div>
        <div className="regions">
          {order.map((id) => {
            const r = regions[id];
            const next = r.zones.find((z) => zoneState(z, profile, caught, progress, r.zones) !== 'cleared') || r.zones[r.zones.length - 1];
            return (
              <div key={id} className="region-card" data-region={id} style={{ '--rc': r.accent, '--rc-soft': 'var(--accent-soft)' }} onClick={() => go('map', id)}>
                <div className="region-glow" />
                <div style={{ position: 'absolute', inset: 0, zIndex: -1, background: `linear-gradient(90deg, rgba(10,8,24,.88) 0%, rgba(10,8,24,.35) 60%, rgba(10,8,24,.12) 100%), url(assets/regions/${id}-hero.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                <div className="region-emblem" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={r.icon} size={30} />
                  <img src={'assets/regions/' + id + '-icon.png'} alt="" width={42} height={42}
                    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', objectFit: 'contain' }}
                    onError={function(e) { e.target.remove(); }} />
                </div>
                <div className="region-main">
                  <div>
                    <div className="region-name">{r.name}</div>
                    <div className="region-tag">{r.blurb} · next: {next.name}</div>
                  </div>
                  <div className="region-foot">
                    <b>{prog[id]}/{r.zones.length} zones</b>
                    <div className="region-mons">
                      {r.zones[0].mons.slice(0, 3).map((m) => <img key={m.dex} src={m.sprite} alt="" crossOrigin="anonymous" />)}
                    </div>
                  </div>
                  <div className="meter"><i style={{ width: (prog[id] / r.zones.length * 100) + '%' }} /></div>
                  {id === 'curriculum' && (
                    <div onClick={(e) => { e.stopPropagation(); go('mathblitz', 'curriculum'); }} style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,203,5,.08)', border: '1px solid rgba(255,203,5,.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background .15s' }}>
                      <span style={{ fontSize: 16 }}>⏱️</span>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#FFCB05' }}>5-Minute Math</div>
                      <Icon name="arrowR" size={16} color="#FFCB05" />
                    </div>
                  )}
                </div>
                <div className="region-arrow"><Icon name="arrowR" size={20} color={r.accent} /></div>
              </div>
            );
          })}
        </div>

        {/* Trophy Case — latest shinies & legendaries (v2 §3.6) */}
        <div className="sec-head"><h2>Trophy Case</h2><span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{trophies.length ? trophies.length + '/6' : ''}</span></div>
        {trophies.length === 0 ? (
          <div style={{ padding: '18px 12px', borderRadius: 16, border: '1px dashed rgba(255,203,5,.28)', color: 'var(--text-tertiary)', fontSize: 12, textAlign: 'center', marginBottom: 4 }}>
            Belum ada trofi — cari shiny pertamamu!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {trophies.map((t) => (
              <div key={'trophy-' + t.dex} className={'trophy-card' + (t.shiny ? ' shiny-frame' : '') + (t.legendary ? ' legend-frame' : '')}
                style={{ background: 'var(--bg-card)', padding: '10px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ position: 'relative', width: 62, height: 62, display: 'grid', placeItems: 'center' }}>
                  <span className="shiny-badge">{(t.shiny ? '✨' : '') + (t.legendary ? '★' : '')}</span>
                  <img src={t.shiny ? SHINY_SPRITE(t.dex) : (t.mon.sprite || SPRITE(t.dex))} alt={t.mon.name || ''} width={62} height={62} crossOrigin="anonymous"
                    style={{ objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = (t.mon.sprite || SPRITE(t.dex)); }} />
                </div>
                <b style={{ fontSize: 11, fontFamily: 'var(--font-display)', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.mon.name || ('#' + t.dex)}</b>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: t.legendary ? '#FFCB05' : '#FFD84D' }}>
                  {t.shiny && t.legendary ? 'Shiny Legendary' : t.shiny ? 'Shiny' : 'Legendary'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* daily mission — driven by real player activity */}
        <div className="sec-head"><h2>Daily mission</h2>{dailyMission && !dailyMission.claimed && dailyMission.completed && <a onClick={onClaimMission} style={{ cursor: 'pointer' }}>Claim</a>}</div>
        <div className="mission" data-region="compsci">
          <div className="mission-ico"><Icon name="flame" size={22} /></div>
          <div className="mission-main">
            <b>Catch 3 Pokémon today</b>
            <p>{dailyMission ? dailyMission.progress : 0} of {dailyMission ? dailyMission.target : 3} done · streak ×{dailyMission ? dailyMission.streak : 0} active</p>
            <div className="meter"><i style={{ width: (dailyMission ? (dailyMission.progress / dailyMission.target * 100) : 0) + '%' }} /></div>
          </div>
          {dailyMission ? (
            dailyMission.claimed
              ? <div className="pill" style={{ color: 'var(--green)', borderColor: 'var(--green)' }}>Done</div>
              : dailyMission.completed
                ? <div className="pill" style={{ color: 'var(--accent)', borderColor: 'var(--accent)', cursor: 'pointer' }} onClick={onClaimMission}>+50</div>
                : null
          ) : null}
        </div>

        {/* achievements — derived from real player state */}
        <div className="sec-head"><h2>Achievements</h2></div>
        <div className="chips-row" data-region="compsci">
          {badges && badges.length > 0
            ? badges.map(b => (
                <div key={b.id} className="ach"><div className="ach-ico"><Icon name={b.icon} size={16} /></div><div><b>{b.name}</b><span>{b.description}</span></div></div>
              ))
            : <div style={{ padding: '16px 0', color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', width: '100%' }}>
                Catch Pokémon and clear zones to earn badges!
              </div>
          }
        </div>

        {/* region progress medals */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 18, marginTop: 2 }}>
          {order.map((id) => {
            const c = prog[id] || 0;
            const t = (regions[id]?.zones || []).length;
            const earned = c > 0;
            return (
              <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: earned ? 1 : .35, filter: earned ? 'none' : 'grayscale(1)' }}>
                <img src={`assets/ui/medal-${id}.svg`} alt={regions[id]?.name || id} width={52} height={52} style={{ objectFit: 'contain' }} />
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700 }}>{c}/{t}</span>
              </div>
            );
          })}
        </div>

        {/* leaderboard — real players from /api/player */}
        <div className="sec-head"><h2>Leaderboard</h2></div>
        <div className="lb" data-region="compsci">
          {(allSlots && allSlots.length > 0
            ? [...allSlots]
                .sort((a, b) => (b.coins - a.coins) || (b.caughtCount - a.caughtCount))
                .map((s, i) => {
                  const isMe = s.slot === activeSlot;
                  const sIdn = playerIdentity(s.name);
                  return (
                    <div key={s.slot} className={'lb-row' + (isMe ? ' me' : '')} style={isMe ? { background: sIdn.color + '1c' } : undefined}>
                      <div className="lb-rank">{i === 0 ? '🏆' : i + 1}</div>
                      <div className="lb-av" style={{ border: `1.5px solid ${sIdn.color}66`, background: 'var(--bg-elevated)' }}>
                        <img src={SPRITE(sIdn.dex)} alt="" crossOrigin="anonymous" style={{ objectFit: 'contain', padding: 3 }} />
                      </div>
                      <div className="lb-name">
                        <b>{s.name}</b>
                        <span>{isMe ? 'you · ' : ''}{s.caughtCount} caught</span>
                      </div>
                      <div className="lb-score"><b style={{ color: '#FFCB05' }}>{s.coins.toLocaleString()}</b></div>
                    </div>
                  );
                })
            : /* loading skeleton */
              [1, 2, 3].map(i => (
                <div key={i} className="lb-row" style={{ opacity: 0.3 }}>
                  <div className="lb-rank">{i}</div>
                  <div className="lb-av">🧑</div>
                  <div className="lb-name"><b>—</b><span>loading…</span></div>
                  <div className="lb-score"><b>—</b></div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── REGION MAP (variant B) ─────────────────────────
// School-subject group labels (MATPEL): zones are grouped per mata pelajaran;
// every subject is open from the start, progression journeys within a subject.
const MAPEL_LABELS = {
  matpel_bindo: 'Bahasa Indonesia',
  matpel_ipas: 'IPAS',
  matpel_ppkn: 'PPKn',
  matpel_pai: 'Pendidikan Agama Islam',
  matpel_eng: 'Bahasa Inggris',
  matpel_seni: 'Seni Budaya',
};

function RegionMap({ region, go, caught, profile, progress }) {
  const { regions, ready } = useContent();
  if (!ready || !regions) return <ContentLoading />;
  const r = regions[region];
  if (!r) return <ContentLoading />;
  const feat = rarest(r.zones[r.zones.length - 1].mons);
  const legendaryZones = r.zones.filter((z) => z.legendary);
  const regularZones = r.zones.filter((z) => !z.legendary);
  const clearedCount = regularZones.filter((z) => zoneState(z, profile, caught, progress, r.zones) === 'cleared').length;
  const legendaryCleared = legendaryZones.filter((z) => zoneState(z, profile, caught, progress, r.zones) === 'cleared').length;
  return (
    <div className="body screen-anim">
      <div className="pad">
        <div className="map-banner">
          <div className="hero-bg" style={{ background: `url(assets/maps/${region}-bg.jpg) center/cover no-repeat, radial-gradient(120% 120% at 80% 10%, ${r.accent}44, transparent 60%), linear-gradient(135deg, #16122c, #0b0a18)` }} />
          <img className="map-banner-mon" src={feat.sprite} alt="" crossOrigin="anonymous" />
          <div>
            <div className="eyebrow" style={{ color: r.accent }}>Region · {r.tag}</div>
            <div className="region-name" style={{ fontSize: 22, color: r.accent }}>{r.name}</div>
          </div>
        </div>
        <div className="map-meta">
          <div className="pill" style={{ color: r.accent, borderColor: r.accent }}>LVL {profile?.level ?? PLAYER.level}</div>
          <span className="eyebrow">{clearedCount} / {regularZones.length} zones cleared</span>
          {legendaryZones.length > 0 && (
            <span className="pill" style={{ color: '#FFCB05', borderColor: 'rgba(255,203,5,.55)', background: 'rgba(255,203,5,.1)' }}>★ {legendaryCleared}/{legendaryZones.length}</span>
          )}
        </div>
        {regularZones.map((z) => {
          const st = zoneState(z, profile, caught, progress, r.zones);
          const locked = st === 'locked', cleared = st === 'cleared';
          const groupLabel = MAPEL_LABELS[zoneGroup(z.id)];
          const showHeader = groupLabel && zoneGroup(z.id) !== zoneGroup((r.zones[r.zones.indexOf(z) - 1] || {}).id || '');
          return (
            <React.Fragment key={z.zone}>
            {showHeader && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 2px 8px' }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: r.accent, textTransform: 'uppercase' }}>{groupLabel}</span>
                <span style={{ flex: 1, height: 1, background: `${r.accent}33` }} />
              </div>
            )}
            <div className={'zone ' + st} onClick={() => !locked && go('catch', region, z.zone)}>
              <div className="zone-no" style={{ border: 'none', background: 'transparent', borderRadius: 0, width: 52, height: 52 }}>
                <img src={`assets/maps/node-${st}.svg`} alt={st} width={52} height={52} style={{ objectFit: 'contain' }} />
              </div>
              <div className="zone-main">
                <b>{z.name}</b>
                <code>{z.topic}{locked ? ` · selesaikan zona sebelumnya` : ''}</code>
              </div>
              <div className="zone-mons">
                {z.mons.slice(0, 3).map((m, i) => (locked || (!cleared && i > 0))
                  ? <div key={i} className="silh">?</div>
                  : <img key={i} src={m.sprite} alt="" crossOrigin="anonymous" />)}
              </div>
              {locked ? <Icon name="lock" size={16} color="var(--text-tertiary)" /> : <Icon name="arrowR" size={18} color={r.accent} />}
            </div>
            </React.Fragment>
          );
        })}

        {/* Legendary Gate — one per region, gold card at the end of the map (SPEC §3.2) */}
        {legendaryZones.map((z) => {
          const st = zoneState(z, profile, caught, progress, r.zones);
          const open = st === 'open', cleared = st === 'cleared';
          const mon = (z.mons || []).find((m) => m.rarity === 'legendary') || (z.mons || [])[0] || {};
          return (
            <div key={'gate-' + z.id} className="legend-gate" onClick={() => open && go('catch', region, z.zone)}
              role={open ? 'button' : undefined} aria-label={open ? 'Tantang legendary ' + (mon.name || z.name) : undefined}
              style={{ marginTop: 18, borderRadius: 18, padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden', cursor: open ? 'pointer' : 'default', opacity: st === 'locked' ? .78 : 1 }}>
              <div style={{ position: 'relative', width: 92, height: 92, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                <div className="aura-gold" style={{ inset: -10 }} />
                <img src={mon.sprite} alt={mon.name || z.name} width={92} height={92} crossOrigin="anonymous"
                  style={{ objectFit: 'contain', position: 'relative', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,.5))' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="eyebrow" style={{ color: '#FFCB05' }}>★ Legendary Gate</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginTop: 3 }}>{z.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{mon.name || 'Legendary Pokémon'}</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 7, color: cleared ? 'var(--green)' : open ? '#FFCB05' : 'var(--text-tertiary)' }}>
                  {cleared ? '✓ Tertangkap' : open ? 'Tantang Legendary!' : 'Selesaikan semua zona dulu'}
                </div>
              </div>
              {cleared
                ? <span style={{ fontSize: 20, color: 'var(--green)' }}>✓</span>
                : open ? <Icon name="arrowR" size={20} color="#FFCB05" /> : <Icon name="lock" size={18} color="var(--text-tertiary)" />}
            </div>
          );
        })}

        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 6 }}>
          Tap an open zone to enter the catch loop.
        </p>
      </div>
    </div>
  );
}

// ───────────────────────── CATCH / BATTLE (variant B) ─────────────────────────
// Motivational lines on a wrong answer (no facts — just encouragement)
const CHEER_WRONG = [
  'So close! Read the question one more time 👀',
  "It's okay — even great trainers get some wrong 💪",
  'Try again — you can totally do this! 🔥',
  'Hmm, almost there! Take it slow and think it through 🧠',
  'Ask Draco if you need a hint 🐉',
];

// Wrapper keeps the hook order stable: content loading must not happen after
// Catch has already mounted its useState/useMemo hooks (React #310).
function Catch(props) {
  const { regions, questions, ready } = useContent();
  if (!ready || !regions) return <ContentLoading />;
  return <CatchScreen {...props} regions={regions} questions={questions} />;
}

function CatchScreen({ region, zone, go, onCaught, pokeballs: pokeballsProp, caught, shiny, shinyCharm, onAnswer, onOpenDraco, regions, questions }) {
  const r = regions[region];
  if (!r) return <ContentLoading />;
  const z = r.zones.find((x) => x.zone === zone) || r.zones[0];

  // Weighted wild selection — useState for re-roll (P1b+P1c)
  const caughtDex = React.useMemo(() => (caught || []).map(c => c.dex), [caught]);
  const firstFallback = Object.values(questions)[0] || [];

  // Randomized deck: re-shuffles every time it's exhausted so questions never repeat in a fixed order
  const shuffleDeck = (raw, avoidQ) => {
    const copy = [...(raw || [])];
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    if (avoidQ && copy.length > 1 && copy[0].q === avoidQ.q) { [copy[0], copy[1]] = [copy[1], copy[0]]; }
    return copy;
  };
  const srcBank = questions[z.topic] || firstFallback;
  const [bank, setBank] = uS1(() => (srcBank && srcBank.length ? shuffleDeck(srcBank) : []));

  // Legendary gate: guaranteed legendary, no weighted pick, no re-roll.
  const legendary = !!z.legendary;
  const legendMon = legendary ? ((z.mons || []).find((m) => m.rarity === 'legendary') || (z.mons || [])[0]) : null;

  // Shiny is rolled once when the encounter state is created (never on re-render).
  const withShiny = (mon) => (mon ? { ...mon, shiny: rollShiny(mon.rarity, shinyCharm) } : mon);
  const pickWild = (excludeDex) => {
    if (legendary) return legendMon;
    const uncaught = (z.mons || []).filter(m => !caughtDex.includes(m.dex) && m.dex !== excludeDex);
    let pool = uncaught.length > 0 ? uncaught : (z.mons || []).filter(m => m.dex !== excludeDex);
    if (pool.length === 0) pool = z.mons || [];
    return weightedPick(pool) || pool[0];
  };
  const [wild, setWild] = uS1(() => withShiny(pickWild(null)));

  const [hp, setHp] = uS1(legendary ? 200 : 100);
  const hpMax = legendary ? 200 : 100;
  const [qi, setQi] = uS1(0);
  const [phase, setPhase] = uS1('quiz');   // quiz | ready | wobble
  const [fb, setFb] = uS1(null);
  const [hit, setHit] = uS1(false);
  const [ball, setBall] = uS1(null);
  const [answerReward, setAnswerReward] = uS1(false);
  const [combo, setCombo] = uS1(0);        // consecutive correct answers
  const [cheer, setCheer] = uS1(null);     // encouragement line after a wrong answer
  const [notice, setNotice] = uS1(null);   // legendary ball-rejection message
  const [sfxOn, setSfxOn] = uS1(() => SFX.isOn());
  const [ballAnim, setBallAnim] = uS1(null); // 'throw' → 'wobble'
  const [burst, setBurst] = uS1(false);
  const [dmgPop, setDmgPop] = uS1(null);
  const q = bank.length ? bank[qi % bank.length] : (srcBank[0] || {});
  const nextQ = () => { const nv = qi + 1; if (bank.length > 1 && nv % bank.length === 0) setBank(shuffleDeck(srcBank, q)); setQi(nv); };

  // 8 sparkle positions, rolled once per encounter (never on every render).
  const sparkles = React.useMemo(
    () => Array.from({ length: 8 }).map(() => ({ left: 6 + Math.random() * 88, top: 4 + Math.random() * 82, delay: Math.random() * .45 })),
    [wild && wild.dex, wild && wild.shiny]  // eslint-disable-line
  );
  const ownedShiny = (shiny || []).some((s) => s.dex === (wild && wild.dex));

  // Entrance sound: legendary gong / normal blip, plus shiny arpeggio.
  uE1(() => {
    if (!wild) return;
    if (legendary) SFX.play('legendary'); else SFX.play('encounter');
    if (wild.shiny) SFX.play('shiny');
  }, [wild]);  // eslint-disable-line

  // P1c — flee/skip: re-roll wild without spending a pokéball (not for legendary)
  const rerollWild = () => {
    if (legendary) return;
    setWild(withShiny(pickWild(wild ? wild.dex : null)));
    setBank(shuffleDeck(srcBank)); setHp(100); setQi(0); setPhase('quiz'); setFb(null); setBall(null);
    setAnswerReward(false); setNotice(null); setDmgPop(null); setBallAnim(null); setBurst(false);
  };

  const answer = (i) => {
    if (phase !== 'quiz' || fb) return;
    const ok = i === q.a;
    setFb({ ok, pick: i });
    let damage = 0;
    let nh = hp;
    if (ok) {
      const nc = combo + 1;
      setCombo(nc); setCheer(null);
      SFX.play(nc >= 2 ? 'combo' : 'correct');
      setHit(true); setTimeout(() => setHit(false), 400);
      if (onAnswer) onAnswer(true, z.id);
      setAnswerReward(true); setTimeout(() => setAnswerReward(false), 1600);
      // Combo hits harder: 34 base + up to +18 bonus
      damage = 34 + Math.min(combo, 3) * 6;
      nh = Math.max(0, hp - damage);
      setHp(nh);
      const popId = Date.now();
      setDmgPop({ v: damage, id: popId });
      setTimeout(() => setDmgPop((cur) => (cur && cur.id === popId ? null : cur)), 600);
      if (nh <= 8) setPhase('ready');
    } else {
      setCombo(0);
      SFX.play('wrong');
      setCheer(CHEER_WRONG[Math.floor(Math.random() * CHEER_WRONG.length)]);
      setTimeout(() => setCheer(null), 2000);
    }
    // Short beat so the damage float / answer flash lands, then next question.
    setTimeout(() => {
      setFb(null);
      if (!ok || nh > 8) nextQ();
    }, 380);
  };

  // Ball flight: throw → 3 wobbles → burst → onCaught (~1.4s, SPEC §3.4)
  const throwBall = (b) => {
    if (legendary && b.id !== 'ultraball' && b.id !== 'masterball') {
      setNotice('Terlalu kuat! Pakai Ultra Ball atau Master Ball.');
      SFX.play('flee');
      return; // ball is not consumed, no catch call
    }
    setNotice(null);
    setBall(b);
    setPhase('wobble');
    setBallAnim('throw');
    setBurst(false);
    SFX.play('throw');
    setTimeout(() => { SFX.play('wobble'); setBallAnim('wobble'); }, 700);
    setTimeout(() => {
      SFX.play('burst');
      setBurst(true);
      setTimeout(() => setBurst(false), 500);
      onCaught(wild, {
        ...b, _zoneId: z.id, _topic: z.topic,
        _shiny: wild.shiny === true, _legendary: legendary,
      });
    }, 1400);
  };

  return (
    <div className="catch screen-anim">
      {/* stage */}
      <div className="stage">
        <div className="hero-bg" style={{ background: `radial-gradient(120% 90% at 50% 0%, ${r.accent}3a, transparent 55%), linear-gradient(180deg, #15122b, #0a0818)` }} />
        <div className="stage-field" />
        <div className="wild-card">
          <div className="nm"><b>{wild.name}</b><span>{legendary ? '★ Legendary' : 'Lv ' + (3 + zone * 2)}</span></div>
          <div className="hp"><small>HP</small><div className="meter"><i style={{ width: '100%', transform: `scaleX(${Math.max(0, Math.min(1, hp / hpMax))})`, transformOrigin: 'left center', transition: 'transform .3s ease', background: hp <= 8 ? 'var(--red)' : hp < 40 ? 'linear-gradient(90deg,#FF6B2B,#FFCB05)' : 'linear-gradient(90deg,#4ADE80,#00D9B8)' }} /></div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
            <div className="type-chip" style={{ background: TYPE_COLOR[wild.type] }}>{wild.type}</div>
            {wild.shiny && (
              <span title={ownedShiny ? 'Already in your shiny collection' : 'New shiny!'} style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: '#FFD84D', background: 'rgba(255,203,5,.12)', border: '1px solid rgba(255,216,77,.4)', borderRadius: 999, padding: '2px 7px' }}>✨ SHINY</span>
            )}
            {legendary && (
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: '#FFCB05', background: 'rgba(255,203,5,.12)', border: '1px solid rgba(255,203,5,.4)', borderRadius: 999, padding: '2px 7px' }}>★ LEGENDARY</span>
            )}
          </div>
        </div>
        <div className={legendary ? 'wild-legendary' : 'wild-enter'} style={{ position: 'absolute', left: 0, right: 0, bottom: 18, width: 170, height: 150, marginLeft: 'auto', marginRight: 'auto', zIndex: 2, borderRadius: '50%' }}>
          {legendary && <div className="aura-gold" style={{ inset: 'auto', left: '50%', top: '50%', width: 210, height: 210, transform: 'translate(-50%,-50%)' }} />}
          {wild.shiny && sparkles.map((s, i) => (
            <i key={i} className="sparkle" style={{ left: s.left + '%', top: s.top + '%', animationDelay: s.delay + 's' }} />
          ))}
          <img className={'wild-sprite' + (hit ? ' hit' : '') + (phase === 'wobble' ? ' wobble' : '')}
            style={{ bottom: 0 }}
            src={wild.shiny ? SHINY_SPRITE(wild.dex) : wild.sprite}
            alt={wild.name} crossOrigin="anonymous"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = wild.sprite; }} />
        </div>
        {dmgPop && (
          <div key={dmgPop.id} className="damage-float" style={{ left: '50%', top: '38%', marginLeft: -14, zIndex: 5, fontSize: 28, color: '#FFCB05', textShadow: '0 2px 10px rgba(0,0,0,.75)' }}>-{dmgPop.v}</div>
        )}
        {phase === 'wobble' && ball && (
          <div className="thrown" style={{ animation: 'none' }}>
            <div className={ballAnim === 'wobble' ? 'ball-wobble' : 'ball-throw'} style={ballAnim === 'wobble' ? { animationDelay: '0s' } : undefined}>
              <Pokeball size={34} id={ball.id} top={ball.top} />
            </div>
            {burst && <div className="burst-ring" style={{ left: '50%', top: '50%', marginLeft: -60, marginTop: -60 }} />}
          </div>
        )}
        {combo >= 2 && phase === 'quiz' && (
          <div key={combo} className="combo-badge combo-pop">Combo ×{combo} 🔥</div>
        )}
        {answerReward && <div className="float-reward">+5 🪙 +5 XP</div>}
        <button type="button" className="sfx-toggle" aria-label={sfxOn ? 'Mute sound' : 'Unmute sound'}
          onClick={() => { const next = !SFX.isOn(); SFX.setOn(next); setSfxOn(next); SFX.play('click'); }}
          style={{ position: 'absolute', right: 10, bottom: 10, zIndex: 6 }}>
          <Icon name={sfxOn ? 'volume' : 'volumeOff'} size={16} />
        </button>
      </div>

      {/* command panel */}
      <div className="cmd">
        {phase === 'quiz' && (
          <React.Fragment>
            <div className="q-prompt">
              <div className="eyebrow">Question {qi + 1} · {z.name}</div>
              <h3>{q.q}</h3>
              <div className="expr">{q.expr}</div>
              {cheer && <div style={{ fontSize: 12, color: 'var(--yellow)', marginTop: 6, animation: 'riseIn .3s both' }}>{cheer}</div>}
            </div>
            <div className={'answers' + (q.opts.length > 2 ? ' two' : '')}>
              {q.opts.map((o, i) => (
                <div key={i} className={'ans' + (fb ? (i === q.a ? ' ok' : i === fb.pick ? ' no' : '') : '')} onClick={() => answer(i)}>
                  {q.opts.length <= 2 && <kbd>{i + 1}</kbd>}<span className="grow">{o}</span>
                  {fb && i === q.a && <Icon name="check" size={18} color="var(--green)" sw={2.4} />}
                </div>
              ))}
            </div>
            <div className="cmd-foot">
              <img src="assets/dru/dru-think.png" alt="Ask Draco" style={{ width: 36, height: 36, objectFit: 'contain', marginRight: 4, flexShrink: 0 }} />
              <div className="draco wf-tap" style={{ borderColor: 'rgba(139,92,246,.5)', color: '#B79BFF' }}
                onClick={() => (onOpenDraco ? onOpenDraco({ zoneName: z.name, question: q.q, hint: q.hint, topic: z.topic }) : openTutor(z.topic))}>
                <Icon name="hint" size={15} /> Ask Draco
              </div>
              <span className="cmd-hint">Correct answer → attack, HP drops</span>
            </div>
            {!legendary && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <span onClick={rerollWild} style={{ fontSize: 11, color: 'var(--text-tertiary)', cursor: 'pointer', userSelect: 'none' }}>🔄 Find another Pokémon</span>
              </div>
            )}
          </React.Fragment>
        )}
        {phase === 'ready' && (
          <React.Fragment>
            {notice && (
              <div role="alert" style={{ background: 'rgba(255,107,43,.12)', border: '1px solid rgba(255,107,43,.45)', color: '#FF9A6B', borderRadius: 12, padding: '9px 12px', fontSize: 12, fontWeight: 600, textAlign: 'center', marginBottom: 10 }}>
                {notice}
              </div>
            )}
            <div className="ball-prompt">{legendary ? 'Legendary is weak — use an Ultra Ball or Master Ball! 🎯' : 'It is weak now — pick a Poké Ball! 🎯'}</div>
            <div className="balls">
              {(pokeballsProp || POKEBALLS).map((b) => (
                <div key={b.id} className={'ball-opt' + (b.own === 0 ? ' dim' : '')} onClick={() => b.own > 0 && throwBall(b)}>
                  <Pokeball size={34} id={b.id} top={b.top} />
                  <div><b>{b.name}</b><span>×{b.own} · {Math.round(b.rate * 100)}%</span></div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 14 }}>
              {legendary ? 'Poké Ball & Great Ball bounce off legendaries — no ball is wasted if refused.' : 'Higher tiers catch better but are scarcer.'}
            </p>
            {!legendary && (
              <div style={{ textAlign: 'center', marginTop: 6 }}>
                <span onClick={rerollWild} style={{ fontSize: 11, color: 'var(--text-tertiary)', cursor: 'pointer', userSelect: 'none' }}>🔄 Find another Pokémon</span>
              </div>
            )}
          </React.Fragment>
        )}
        {phase === 'wobble' && (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            <div style={{ fontSize: 15 }}>…wobble… wobble…</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, animation: 'fadeIn .4s .8s both' }}>Will it catch? 🤞</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── CELEBRATION (variant A) ─────────────────────────
function Celebration({ mon, region, coins, fact, onDone, onTeam, activeSlot, onTeamAdd, newLevel, rewardBalls, levelUp, shiny, legendary, rankUp, newRank }) {
  const { regions } = useContent();
  const r   = (regions && regions[region]) || { accent: '#8B5CF6' };
  const rar = RARITY[mon.rarity] || RARITY.common;
  const gold = !!(shiny || legendary);
  const eyebrow = legendary && shiny ? '★✨ MYTHIC CATCH ✨★'
    : legendary ? '★ LEGENDARY CATCH ★'
    : shiny ? '✨ SHINY CATCH ✨'
    : 'GOTCHA!';
  const eyebrowColor = gold ? '#FFCB05' : rar.c;
  // Confetti burst (one-time per mount) — gold palette for shiny/legendary
  const confetti = React.useMemo(() => Array.from({ length: 26 }).map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * .7,
    dur: 2 + Math.random() * 1.6,
    size: 6 + Math.random() * 6,
    color: (gold
      ? ['#FFCB05', '#FFE98A', '#FFF3B0', '#FFD84D', '#FFB300']
      : [r.accent, '#FFCB05', '#4ADE80', '#4A9EFF', '#F472B6'])[i % 5],
    rot: Math.random() * 360,
  })), [gold]);  // eslint-disable-line
  // 10 sparkles around the shiny sprite (positions rolled once per mount)
  const sparkles = React.useMemo(() => Array.from({ length: 10 }).map(() => ({
    left: 30 + Math.random() * 40,
    top: 24 + Math.random() * 42,
    delay: Math.random() * .5,
    size: 6 + Math.random() * 7,
  })), [shiny]);
  React.useEffect(() => {
    if (legendary) SFX.play('legendary');
    else if (shiny) SFX.play('shiny');
    else SFX.play('catch');
  }, []);  // eslint-disable-line
  React.useEffect(() => { if (levelUp) SFX.play('levelup'); }, [levelUp]);
  React.useEffect(() => { if (rankUp) SFX.play('rankup'); }, [rankUp]);
  const rankMeta = (rankUp && newRank) ? (TRAINER_RANKS.find((t) => t.id === newRank.id) || {}) : {};
  const rankEmblem = (rankUp && newRank) ? (newRank.emoji || rankMeta.emoji || '🏅') : '🏅';
  const rankPerks = (rankUp && newRank) ? (Array.isArray(newRank.perks) ? newRank.perks : (rankMeta.perks || [])) : [];
  return (
    <div className="celeb" data-region={region}>
      {confetti.map((c, i) => (
        <i key={i} className="confetti" style={{ left: c.left + '%', width: c.size, height: c.size * .45,
          background: c.color, animationDelay: c.delay + 's', animationDuration: c.dur + 's', transform: `rotate(${c.rot}deg)` }} />
      ))}
      <svg className="celeb-rays" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
        {Array.from({ length: 22 }).map((_, i) => {
          const a = (i / 22) * Math.PI * 2;
          return <line key={i} x1="200" y1="200" x2={200 + 360 * Math.cos(a)} y2={200 + 360 * Math.sin(a)} stroke={r.accent} strokeWidth={i % 2 ? 6 : 14} opacity={i % 2 ? .25 : .12} />;
        })}
      </svg>
      <div className="celeb-eyebrow" style={{ color: eyebrowColor }}>{eyebrow}</div>
      <img src="assets/dru/dru-cheer.png" alt="Dru cheering" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: -18, zIndex: 1, position: 'relative', filter: 'drop-shadow(0 0 12px rgba(255,203,5,.25))' }} />
      <div style={{ position: 'relative', display: 'grid', placeItems: 'center', margin: '14px 0' }}>
        {shiny && sparkles.map((s, i) => (
          <i key={i} className="sparkle" style={{ left: s.left + '%', top: s.top + '%', width: s.size, height: s.size, animationDelay: s.delay + 's' }} />
        ))}
        <img className="celeb-sprite catch-pop" style={{ margin: 0 }} src={shiny ? SHINY_SPRITE(mon.dex) : mon.sprite} alt={mon.name} crossOrigin="anonymous"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = mon.sprite; }} />
      </div>
      <h2>{mon.name}</h2>
      <div className="meta">
        <span className="type-chip" style={{ background: TYPE_COLOR[mon.type], verticalAlign: 'middle' }}>{mon.type}</span>
        <span style={{ color: rar.c, marginLeft: 8, fontWeight: 700 }}>{rar.label}</span> · added to Collection
      </div>
      <div className="celeb-rewards">
        {[['+50', 'XP'], ['+' + (coins ?? 50), 'Coins'], ['New', 'Pokédex']].map(([v, l]) => (
          <div key={l} className="reward"><b style={{ color: l === 'Coins' ? 'var(--yellow)' : 'var(--accent)' }}>{v}</b><span>{l}</span></div>
        ))}
      </div>
      {fact && (
        <div style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.3)', borderRadius: 12, padding: '10px 14px', margin: '2px 0 4px', maxWidth: 300, position: 'relative', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 16, lineHeight: 1.2 }}>💡</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, textAlign: 'left' }}>{fact}</span>
        </div>
      )}
      {levelUp && rewardBalls && (
        <div style={{ background: 'rgba(255,203,5,.1)', border: '1px solid rgba(255,203,5,.3)', borderRadius: 12, padding: '10px 16px', marginTop: 4, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#FFCB05', fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            🎉 Level Up! Level {newLevel}!
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {rewardBalls.pokeball > 0 && <span>+{rewardBalls.pokeball} Poké Ball{rewardBalls.pokeball > 1 ? 's' : ''} </span>}
            {rewardBalls.greatball > 0 && <span>+{rewardBalls.greatball} Great Ball{rewardBalls.greatball > 1 ? 's' : ''} </span>}
            {rewardBalls.ultraball > 0 && <span>+{rewardBalls.ultraball} Ultra Ball{rewardBalls.ultraball > 1 ? 's' : ''} </span>}
          </div>
        </div>
      )}
      {rankUp && newRank && (
        <div style={{ background: 'linear-gradient(120deg, rgba(255,203,5,.18), rgba(255,107,43,.12))', border: '1px solid rgba(255,203,5,.55)', borderRadius: 14, padding: '11px 14px', marginTop: 4, marginBottom: 10, maxWidth: 320, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>{rankEmblem}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: '#FFCB05' }}>RANK UP — {newRank.title || newRank.name || 'Trainer'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{newRank.points ?? 0} pts</div>
            </div>
          </div>
          {rankPerks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {rankPerks.map((p, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#FFE98A', background: 'rgba(255,203,5,.12)', border: '1px solid rgba(255,203,5,.3)', borderRadius: 999, padding: '2px 8px' }}>{p}</span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="celeb-actions">
        <button className="btn btn-primary btn-block" onClick={() => { if (activeSlot && onTeamAdd) onTeamAdd(mon.dex); onTeam(); }}>
          <Icon name="plus" size={16} color="#0b0a16" /> Add to team
        </button>
        <div className="celeb-skip" onClick={onDone}>Continue →</div>
      </div>
    </div>
  );
}

// ───────────────────────── RANK UP OVERLAY (v2) ─────────────────────────
// Full-screen rank-up moment for rank changes outside a catch (mission/answer).
function RankUpOverlay({ rank, onDone }) {
  React.useEffect(() => { SFX.play('rankup'); }, []);  // eslint-disable-line
  if (!rank) return null;
  const meta = TRAINER_RANKS.find((t) => t.id === rank.id) || {};
  const emblem = rank.emoji || meta.emoji || '🏅';
  const title = rank.title || rank.name || 'Trainer';
  const perks = Array.isArray(rank.perks) ? rank.perks : (meta.perks || []);
  return (
    <div className="rank-overlay" onClick={onDone} role="dialog" aria-modal="true" aria-label="Rank up">
      <svg className="rank-rays" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => {
          const a = (i / 20) * Math.PI * 2;
          return <line key={i} x1="200" y1="200" x2={200 + 360 * Math.cos(a)} y2={200 + 360 * Math.sin(a)}
            stroke="#FFCB05" strokeWidth={i % 2 ? 5 : 12} opacity={i % 2 ? .22 : .12} />;
        })}
      </svg>
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 1, width: 'min(100% - 32px, 330px)', textAlign: 'center', padding: '24px 20px', borderRadius: 22, background: 'linear-gradient(160deg, #241a4d, #12102a)', border: '1px solid rgba(255,203,5,.5)', boxShadow: '0 24px 60px rgba(0,0,0,.6), 0 0 40px rgba(255,203,5,.18)' }}>
        <div className="eyebrow" style={{ color: '#FFCB05' }}>Trainer Rank</div>
        <div className="rank-emblem" style={{ fontSize: 64, lineHeight: 1.1, margin: '10px 0 4px' }}>{emblem}</div>
        <div style={{ fontFamily: 'var(--font-game)', fontSize: 12, letterSpacing: '.18em', color: '#FFCB05' }}>RANK UP</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: '4px 0 2px' }}>{title}</h2>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>{rank.points ?? 0} pts</div>
        {perks.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
            {perks.map((p, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#FFE98A', background: 'rgba(255,203,5,.12)', border: '1px solid rgba(255,203,5,.3)', borderRadius: 999, padding: '2px 8px' }}>{p}</span>
            ))}
          </div>
        )}
        <button type="button" className="btn btn-primary" onClick={onDone} style={{ width: '100%' }}>Lanjut</button>
      </div>
    </div>
  );
}

// ───────────────────────── MATH BLITZ (5 Menit Matematika) ─────────────────────────
function MathBlitz({ activeSlot, onReward, go }) {
  const [phase, setPhase] = React.useState('loading');
  const [timeLeft, setTimeLeft] = React.useState(300);
  const [score, setScore] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [questions, setQuestions] = React.useState([]);
  const [qIndex, setQIndex] = React.useState(0);
  const [feedback, setFeedback] = React.useState(null);
  const [pickIdx, setPickIdx] = React.useState(null);
  const [reward, setReward] = React.useState(null);
  const [retryKey, setRetryKey] = React.useState(0);
  const postedRef = React.useRef(false);

  // Fetch questions from all 6 math topics (re-fetches on retry)
  React.useEffect(() => {
    const topics = ['penjumlahan','pengurangan','perkalian','pembagian','pecahan','desimal'];
    Promise.all(topics.map(async (t) => {
      try {
        const r = await fetch(`/api/content/questions?topic=${encodeURIComponent(t)}`);
        const d = await r.json();
        return d.success ? d.questions : [];
      } catch { return []; }
    })).then(results => {
      const all = results.flat();
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      setQuestions(all);
      setPhase('ready');
    }).catch(() => setPhase('ready'));
  }, [retryKey]);

  // Timer countdown
  React.useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { setPhase('end'); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Post results (once, idempotent via sessionKey)
  React.useEffect(() => {
    if (phase !== 'end' || postedRef.current || !activeSlot) return;
    postedRef.current = true;
    const sessionKey = 'mb_' + activeSlot + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    fetch(`/api/player/${activeSlot}/mathblitz`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correct: score, total, sessionKey }),
    }).then(r => r.json()).then(data => {
      if (data.success) { setReward(data); if (onReward) onReward(data); }
    }).catch(e => console.error('[MathBlitz] post failed:', e));
  }, [phase]);

  const start = () => { setPhase('active'); setTimeLeft(300); setScore(0); setTotal(0); setQIndex(0); setFeedback(null); postedRef.current = false; setReward(null); };
  const retry = () => setRetryKey(k => k + 1);

  const answer = (idx) => {
    if (feedback || phase !== 'active' || qIndex >= questions.length) return;
    const q = questions[qIndex];
    const ok = idx === q.a;
    setPickIdx(idx);
    setFeedback(ok ? 'correct' : 'wrong');
    SFX.play(ok ? 'correct' : 'wrong');
    if (ok) setScore(s => s + 1);
    setTotal(t => t + 1);
    setTimeout(() => {
      setFeedback(null); setPickIdx(null);
      setQIndex(i => {
        if (i + 1 >= questions.length) {
          const copy = [...questions];
          for (let k = copy.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [copy[k], copy[j]] = [copy[j], copy[k]]; }
          setQuestions(copy);
          return 0;
        }
        return i + 1;
      });
    }, 550);
  };

  const mmss = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const pct  = (timeLeft / 300) * 100;

  if (phase === 'loading') return <ContentLoading />;

  if (phase === 'ready') return (
    <div className="body screen-anim" data-region="curriculum">
      <div className="pad" style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:340,gap:16,textAlign:'center' }}>
        <img src="assets/dru/dru-point.png" alt="Dru" style={{ width:80,height:80,objectFit:'contain' }} />
        <h2 style={{ fontFamily:'var(--font-display)',fontSize:22,color:'#FFCB05',margin:0 }}>⏱️ 5-Minute Math</h2>
        <p style={{ color:'var(--text-secondary)',fontSize:14,margin:0,maxWidth:260,lineHeight:1.6 }}>
          Answer as many math questions as you can in 5 minutes. Earn coins and XP!
        </p>
        <button className="btn btn-primary" onClick={start} style={{ marginTop:8 }}>Start ⚡</button>
      </div>
    </div>
  );

  if (phase === 'active') {
    const q = questions[qIndex];
    if (!q) return <ContentLoading />;
    return (
      <div className="body screen-anim" data-region="curriculum">
        <div className="pad">
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:18 }}>
            <div className="meter" style={{ flex:1 }}>
              <i style={{ width:pct+'%',background:timeLeft<60?'var(--red)':timeLeft<120?'linear-gradient(90deg,#FFCB05,#FF6B2B)':'linear-gradient(90deg,#4ADE80,#00D9B8)' }} />
            </div>
            <span style={{ fontFamily:'var(--font-mono)',fontSize:16,fontWeight:700,color:timeLeft<60?'var(--red)':'var(--text-primary)',minWidth:56,textAlign:'right' }}>{mmss(timeLeft)}</span>
          </div>
          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:20 }}>
            <span style={{ fontSize:12,color:'var(--text-tertiary)' }}>Correct: <b style={{ color:'var(--green)' }}>{score}</b></span>
            <span style={{ fontSize:12,color:'var(--text-tertiary)' }}>Question {total + 1}</span>
          </div>
          <div className="q-prompt" style={{ marginBottom:16 }}>
            <div className="eyebrow">Math · {q.difficulty || 'easy'}</div>
            <h3>{q.q}</h3>
            <div className="expr" style={{ fontSize:22 }}>{q.expr}</div>
          </div>
          <div className={'answers' + (q.opts.length <= 2 ? ' one' : ' two')}>
            {q.opts.map((o, i) => {
              let cls = 'ans';
              if (feedback && i === q.a) cls += ' ok';
              if (feedback && i === pickIdx && i !== q.a) cls += ' no';
              return (
                <div key={i} className={cls} onClick={() => answer(i)}>
                  {q.opts.length <= 2 && <kbd>{i + 1}</kbd>}
                  <span className="grow">{o}</span>
                  {feedback && i === q.a && <Icon name="check" size={18} color="var(--green)" sw={2.4} />}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize:11,color:'var(--text-tertiary)',textAlign:'center',marginTop:14 }}>
            Answer fast — each correct +2 coins, +5 XP
          </p>
        </div>
      </div>
    );
  }

  // ── End screen ──
  const acc = total > 0 ? Math.round((score / total) * 100) : 0;
  const good = acc >= 70 || score >= 10;
  const coinsEarned = Math.min(score * 2, 200);
  const xpEarned = Math.min(score * 5, 500);
  return (
    <div className="body screen-anim" data-region="curriculum">
      <div className="pad" style={{ display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',minHeight:340,gap:12 }}>
        <img src={good ? 'assets/dru/dru-cheer.png' : 'assets/dru/dru-idle.png'} alt="Dru" style={{ width:80,height:80,objectFit:'contain',marginBottom:4 }} />
        <div className="eyebrow" style={{ color:good?'var(--green)':'var(--text-tertiary)' }}>{good ? 'Awesome!' : "Time's up!"}</div>
        <h2 style={{ fontFamily:'var(--font-display)',fontSize:20,color:'var(--text-primary)',margin:0 }}>{score} / {total} correct</h2>
        <span style={{ fontSize:14,color:'var(--text-secondary)' }}>Accuracy {acc}%</span>
        <div className="celeb-rewards" style={{ justifyContent:'center' }}>
          <div className="reward"><b style={{ color:'var(--accent)' }}>+{xpEarned}</b><span>XP</span></div>
          <div className="reward"><b style={{ color:'var(--yellow)' }}>+{coinsEarned}</b><span>Coins</span></div>
          {reward && reward.best > 0 && <div className="reward"><b style={{ color:'#FFCB05' }}>{reward.best}</b><span>Best</span></div>}
        </div>
        <div style={{ display:'flex',gap:10,marginTop:12 }}>
          <button className="btn btn-primary" onClick={retry} style={{ minWidth:120 }}>Play again</button>
          <button className="btn btn-ghost" onClick={() => go('home')} style={{ minWidth:100 }}>Done</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Home, RegionMap, Catch, Celebration, RankUpOverlay, MathBlitz, PLAYER, zoneState, rarest, RANK });
