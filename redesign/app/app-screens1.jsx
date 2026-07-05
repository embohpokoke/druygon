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

// Pure zone state based on real player state
const zoneState = (z, profile = PLAYER, caught = [], progress = [], allZones = []) => {
  if (!z) return 'locked';
  // Explicit cleared in progress table
  const prog = progress.find(p => p.zoneId === z.id);
  if (prog?.status === 'cleared') return 'cleared';

  // Zone cleared when 2 distinct Pokémon caught in that zone
  const zoneCaught = caught.filter(c => c.zoneId === z.id);
  if (new Set(zoneCaught.map(c => c.dex)).size >= 2) return 'cleared';

  // Open if previous zone is cleared (or zone 1) — level is NOT a gate (GAME-RULES)
  const prevZone = (allZones || []).find(x => x.zone === z.zone - 1);
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
function Home({ go, caught, coins, profile, playerName, allSlots, activeSlot, progress, dailyMission, badges, onClaimMission, onOpenDraco }) {
  const { regions, ready } = useContent();
  if (!ready || !regions) return <ContentLoading />;
  const order = ['curriculum', 'science', 'compsci'].filter((id) => regions[id]);
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
              <div className="hero-sub">{idn.title} · {caught.length} caught · keep the streak!</div>
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
function RegionMap({ region, go, caught, profile, progress }) {
  const { regions, ready } = useContent();
  if (!ready || !regions) return <ContentLoading />;
  const r = regions[region];
  if (!r) return <ContentLoading />;
  const feat = rarest(r.zones[r.zones.length - 1].mons);
  const clearedCount = r.zones.filter((z) => zoneState(z, profile, caught, progress, r.zones) === 'cleared').length;
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
          <span className="eyebrow">{clearedCount} / {r.zones.length} zones cleared</span>
        </div>
        {r.zones.map((z) => {
          const st = zoneState(z, profile, caught, progress, r.zones);
          const locked = st === 'locked', cleared = st === 'cleared';
          return (
            <div key={z.zone} className={'zone ' + st} onClick={() => !locked && go('catch', region, z.zone)}>
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

function Catch({ region, zone, go, onCaught, pokeballs: pokeballsProp, caught, onAnswer, onOpenDraco }) {
  const { regions, questions, ready } = useContent();
  if (!ready || !regions) return <ContentLoading />;
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

  const pickWild = (excludeDex) => {
    const uncaught = (z.mons || []).filter(m => !caughtDex.includes(m.dex) && m.dex !== excludeDex);
    let pool = uncaught.length > 0 ? uncaught : (z.mons || []).filter(m => m.dex !== excludeDex);
    if (pool.length === 0) pool = z.mons || [];
    return weightedPick(pool) || pool[0];
  };
  const [wild, setWild] = uS1(() => pickWild(null));

  // P1c — flee/skip: re-roll wild without spending a pokéball
  const rerollWild = () => {
    setWild(pickWild(wild ? wild.dex : null));
    setBank(shuffleDeck(srcBank)); setHp(100); setQi(0); setPhase('quiz'); setFb(null); setBall(null); setAnswerReward(false);
  };

  const [hp, setHp] = uS1(100);
  const [qi, setQi] = uS1(0);
  const [phase, setPhase] = uS1('quiz');   // quiz | ready | wobble
  const [fb, setFb] = uS1(null);
  const [hit, setHit] = uS1(false);
  const [ball, setBall] = uS1(null);
  const [answerReward, setAnswerReward] = uS1(false);
  const [combo, setCombo] = uS1(0);        // consecutive correct answers
  const [cheer, setCheer] = uS1(null);     // encouragement line after a wrong answer
  const q = bank.length ? bank[qi % bank.length] : (srcBank[0] || {});
  const nextQ = () => { const nv = qi + 1; if (bank.length > 1 && nv % bank.length === 0) setBank(shuffleDeck(srcBank, q)); setQi(nv); };

  const answer = (i) => {
    if (phase !== 'quiz' || fb) return;
    const ok = i === q.a;
    setFb({ ok, pick: i });
    if (ok) {
      const nc = combo + 1;
      setCombo(nc); setCheer(null);
      SFX.play(nc >= 2 ? 'combo' : 'correct');
      setHit(true); setTimeout(() => setHit(false), 400);
      if (onAnswer) onAnswer(true, z.id);
      setAnswerReward(true); setTimeout(() => setAnswerReward(false), 1600);
    } else {
      setCombo(0);
      SFX.play('wrong');
      setCheer(CHEER_WRONG[Math.floor(Math.random() * CHEER_WRONG.length)]);
      setTimeout(() => setCheer(null), 2000);
    }
    setTimeout(() => {
      setFb(null);
      if (ok) {
        // Combo hits harder: 34 base + up to +18 bonus
        const dmg = 34 + Math.min(combo, 3) * 6;
        const nh = Math.max(0, hp - dmg);
        setHp(nh);
        if (nh <= 8) setPhase('ready'); else nextQ();
      } else nextQ();
    }, 700);
  };
  // Suspense: ball flies + wobbles ~1.7s BEFORE the celebration fires
  const throwBall = (b) => {
    setBall(b);
    setPhase('wobble');
    SFX.play('throw');
    setTimeout(() => {
      SFX.play('catch');
      onCaught(wild, { ...b, _zoneId: z.id, _topic: z.topic });
    }, 1700);
  };

  return (
    <div className="catch screen-anim">
      {/* stage */}
      <div className="stage">
        <div className="hero-bg" style={{ background: `radial-gradient(120% 90% at 50% 0%, ${r.accent}3a, transparent 55%), linear-gradient(180deg, #15122b, #0a0818)` }} />
        <div className="stage-field" />
        <div className="wild-card">
          <div className="nm"><b>{wild.name}</b><span>Lv {3 + zone * 2}</span></div>
          <div className="hp"><small>HP</small><div className="meter"><i style={{ width: hp + '%', background: hp <= 8 ? 'var(--red)' : hp < 40 ? 'linear-gradient(90deg,#FF6B2B,#FFCB05)' : 'linear-gradient(90deg,#4ADE80,#00D9B8)' }} /></div></div>
          <div className="type-chip" style={{ marginTop: 7, background: TYPE_COLOR[wild.type] }}>{wild.type}</div>
        </div>
        <img className={'wild-sprite' + (hit ? ' hit' : '') + (phase === 'wobble' ? ' wobble' : '')} src={wild.sprite} alt={wild.name} crossOrigin="anonymous" />
        {phase === 'wobble' && <div className="thrown"><Pokeball size={34} id={ball?.id} top={ball?.top} /></div>}
        {combo >= 2 && phase === 'quiz' && (
          <div key={combo} className="combo-badge">Combo ×{combo} 🔥</div>
        )}
        {answerReward && <div className="float-reward">+5 🪙 +5 XP</div>}
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
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span onClick={rerollWild} style={{ fontSize: 11, color: 'var(--text-tertiary)', cursor: 'pointer', userSelect: 'none' }}>🔄 Find another Pokémon</span>
            </div>
          </React.Fragment>
        )}
        {phase === 'ready' && (
          <React.Fragment>
            <div className="ball-prompt">It is weak now — pick a Poké Ball! 🎯</div>
            <div className="balls">
              {(pokeballsProp || POKEBALLS).map((b) => (
                <div key={b.id} className={'ball-opt' + (b.own === 0 ? ' dim' : '')} onClick={() => b.own > 0 && throwBall(b)}>
                  <Pokeball size={34} id={b.id} top={b.top} />
                  <div><b>{b.name}</b><span>×{b.own} · {Math.round(b.rate * 100)}%</span></div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 14 }}>Higher tiers catch better but are scarcer.</p>
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <span onClick={rerollWild} style={{ fontSize: 11, color: 'var(--text-tertiary)', cursor: 'pointer', userSelect: 'none' }}>🔄 Find another Pokémon</span>
            </div>
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
function Celebration({ mon, region, coins, fact, onDone, onTeam, activeSlot, onTeamAdd, newLevel, rewardBalls, levelUp }) {
  const { regions } = useContent();
  const r   = (regions && regions[region]) || { accent: '#8B5CF6' };
  const rar = RARITY[mon.rarity] || RARITY.common;
  // Confetti burst (one-time per mount) + level-up fanfare
  const confetti = React.useMemo(() => Array.from({ length: 26 }).map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * .7,
    dur: 2 + Math.random() * 1.6,
    size: 6 + Math.random() * 6,
    color: [r.accent, '#FFCB05', '#4ADE80', '#4A9EFF', '#F472B6'][i % 5],
    rot: Math.random() * 360,
  })), []);  // eslint-disable-line
  React.useEffect(() => { if (levelUp) SFX.play('levelup'); }, [levelUp]);
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
      <div className="celeb-eyebrow" style={{ color: rar.c }}>{mon.rarity === 'legendary' ? '★ LEGENDARY CATCH ★' : 'GOTCHA!'}</div>
      <img src="assets/dru/dru-cheer.png" alt="Dru cheering" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: -18, zIndex: 1, position: 'relative', filter: 'drop-shadow(0 0 12px rgba(255,203,5,.25))' }} />
      <img className="celeb-sprite" src={mon.sprite} alt={mon.name} crossOrigin="anonymous" />
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
      <div className="celeb-actions">
        <button className="btn btn-primary btn-block" onClick={() => { if (activeSlot && onTeamAdd) onTeamAdd(mon.dex); onTeam(); }}>
          <Icon name="plus" size={16} color="#0b0a16" /> Add to team
        </button>
        <div className="celeb-skip" onClick={onDone}>Continue →</div>
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

Object.assign(window, { Home, RegionMap, Catch, Celebration, MathBlitz, PLAYER, zoneState, rarest, RANK });
