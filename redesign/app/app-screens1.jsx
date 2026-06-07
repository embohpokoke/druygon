// app-screens1.jsx — Home (A), Region map (B), Catch/battle (B), Celebration (A).

const { useState: uS1, useRef: uR1, useEffect: uE1 } = React;
const PLAYER = { name: 'Dru', level: 7, xpPct: 62 };
const RANK = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
const rarest = (mons) => mons.reduce((a, b) => (RANK[b.rarity] > RANK[a.rarity] ? b : a), mons[0]);
const zoneState = (z) => (z.zone === 1 ? 'cleared' : PLAYER.level >= z.minLevel ? 'open' : 'locked');

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
function Home({ go, caught, coins, profile, playerName }) {
  const { regions, ready } = useContent();
  if (!ready || !regions) return <ContentLoading />;
  const order = ['curriculum', 'science', 'compsci'].filter((id) => regions[id]);
  const level  = profile?.level  ?? PLAYER.level;
  const xpPct  = profile && profile.xpToNext > 0
    ? Math.round((profile.xp / profile.xpToNext) * 100)
    : PLAYER.xpPct;
  const name   = playerName || 'Trainer';
  // Cleared zone count per region (from progress prop if available)
  const prog   = Object.fromEntries(order.map(id => [id, 0]));
  return (
    <div className="body screen-anim">
      <div className="pad">
        {/* player hero */}
        <div className="hero" data-region="compsci">
          <div className="hero-bg" style={{ background: 'radial-gradient(130% 130% at 88% -20%, rgba(139,92,246,.5), transparent 55%), radial-gradient(90% 120% at 0% 120%, rgba(74,158,255,.28), transparent 60%), linear-gradient(160deg, #1b1540, #0c0a1e 72%)' }} />
          <div className="hero-glow" />
          <div className="hero-top">
            <div>
              <div className="hero-greet">Hi, <b>{name}</b> 👋</div>
              <div className="hero-sub">Trainer · {caught.length} caught · keep the streak!</div>
            </div>
            <div className="hero-lvl">LVL {level}</div>
          </div>
          <div className="hero-xp">
            <small>XP</small><div className="meter" style={{ flex: 1 }}><i style={{ width: xpPct + '%' }} /></div>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><b>{level}</b><span>Level</span></div>
            <div className="hero-stat"><b>{coins}</b><span>Coins</span></div>
            <div className="hero-stat"><b>{caught.length}</b><span>Caught</span></div>
          </div>
        </div>

        {/* 3 region cards */}
        <div className="sec-head"><h2>Choose a world</h2></div>
        <div className="regions">
          {order.map((id) => {
            const r = regions[id];
            const next = r.zones.find((z) => zoneState(z) !== 'cleared') || r.zones[2];
            return (
              <div key={id} className="region-card" data-region={id} style={{ '--rc': r.accent, '--rc-soft': 'var(--accent-soft)' }} onClick={() => go('map', id)}>
                <div className="region-glow" />
                <div className="region-emblem"><Icon name={r.icon} size={30} /></div>
                <div className="region-main">
                  <div>
                    <div className="region-name">{r.name}</div>
                    <div className="region-tag">{r.blurb} · next: {next.name}</div>
                  </div>
                  <div className="region-foot">
                    <b>{prog[id]}/3 zones</b>
                    <div className="region-mons">
                      {r.zones[0].mons.slice(0, 3).map((m) => <img key={m.dex} src={m.sprite} alt="" crossOrigin="anonymous" />)}
                    </div>
                  </div>
                  <div className="meter"><i style={{ width: (prog[id] / 3 * 100) + '%' }} /></div>
                </div>
                <div className="region-arrow"><Icon name="arrowR" size={20} color={r.accent} /></div>
              </div>
            );
          })}
        </div>

        {/* daily mission */}
        <div className="sec-head"><h2>Daily mission</h2><a>Refresh</a></div>
        <div className="mission" data-region="compsci">
          <div className="mission-ico"><Icon name="flame" size={22} /></div>
          <div className="mission-main">
            <b>Catch 3 in Sirkuit Digital</b>
            <p>1 of 3 done · streak ×10 bonus active</p>
            <div className="meter"><i style={{ width: '33%' }} /></div>
          </div>
          <div className="pill" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>+50</div>
        </div>

        {/* achievements */}
        <div className="sec-head"><h2>Achievements</h2><a>All</a></div>
        <div className="chips-row" data-region="compsci">
          {[['zap', 'Logika Master', 'Cleared zone 1'], ['flame', 'Streak ×10', 'Today'], ['star', 'First Catch', 'Unlocked']].map(([ic, n, d]) => (
            <div key={n} className="ach"><div className="ach-ico"><Icon name={ic} size={16} /></div><div><b>{n}</b><span>{d}</span></div></div>
          ))}
        </div>

        {/* leaderboard */}
        <div className="sec-head"><h2>Leaderboard</h2><a>Class 4B</a></div>
        <div className="lb" data-region="compsci">
          {[['1', 'Nadia', '24 caught', '4,820'], ['2', 'Dru', 'you · 12 caught', '3,140', true], ['3', 'Bima', '9 caught', '2,510']].map(([rk, nm, sub, sc, me]) => (
            <div key={rk} className={'lb-row' + (me ? ' me' : '')}>
              <div className="lb-rank">{rk}</div>
              <div className="lb-av">{me ? <img src={AVATAR} alt="" /> : '🧑'}</div>
              <div className="lb-name"><b>{nm}</b><span>{sub}</span></div>
              <div className="lb-score"><b>{sc}</b></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── REGION MAP (variant B) ─────────────────────────
function RegionMap({ region, go, caught }) {
  const { regions, ready } = useContent();
  if (!ready || !regions) return <ContentLoading />;
  const r = regions[region];
  if (!r) return <ContentLoading />;
  const feat = rarest(r.zones[r.zones.length - 1].mons);
  const clearedCount = r.zones.filter((z) => zoneState(z) === 'cleared').length;
  return (
    <div className="body screen-anim">
      <div className="pad">
        <div className="map-banner">
          <div className="hero-bg" style={{ background: `radial-gradient(120% 120% at 80% 10%, ${r.accent}44, transparent 60%), linear-gradient(135deg, #16122c, #0b0a18)` }} />
          <img className="map-banner-mon" src={feat.sprite} alt="" crossOrigin="anonymous" />
          <div>
            <div className="eyebrow" style={{ color: r.accent }}>Region · {r.tag}</div>
            <div className="region-name" style={{ fontSize: 22, color: r.accent }}>{r.name}</div>
          </div>
        </div>
        <div className="map-meta">
          <div className="pill" style={{ color: r.accent, borderColor: r.accent }}>LVL {PLAYER.level}</div>
          <span className="eyebrow">{clearedCount} / {r.zones.length} zones cleared</span>
        </div>
        {r.zones.map((z) => {
          const st = zoneState(z);
          const locked = st === 'locked', cleared = st === 'cleared';
          return (
            <div key={z.zone} className={'zone ' + st} onClick={() => !locked && go('catch', region, z.zone)}>
              <div className="zone-no">{cleared ? <Icon name="check" size={18} color="var(--green)" sw={2.4} /> : locked ? <Icon name="lock" size={15} /> : z.zone}</div>
              <div className="zone-main">
                <b>{z.name}</b>
                <code>{z.topic}{locked ? ` · unlocks LVL ${z.minLevel}` : ''}</code>
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
function Catch({ region, zone, go, onCaught, pokeballs: pokeballsProp }) {
  const { regions, questions, ready } = useContent();
  if (!ready || !regions) return <ContentLoading />;
  const r = regions[region];
  if (!r) return <ContentLoading />;
  const z = r.zones.find((x) => x.zone === zone) || r.zones[0];
  const wild = uR1(rarest(z.mons)).current;
  const firstFallback = Object.values(questions)[0] || [];
  const bank = questions[z.topic] || firstFallback;

  const [hp, setHp] = uS1(100);
  const [qi, setQi] = uS1(0);
  const [phase, setPhase] = uS1('quiz');   // quiz | ready | wobble
  const [fb, setFb] = uS1(null);
  const [hit, setHit] = uS1(false);
  const [ball, setBall] = uS1(null);
  const q = bank[qi % bank.length];

  const answer = (i) => {
    if (phase !== 'quiz' || fb) return;
    const ok = i === q.a;
    setFb({ ok, pick: i });
    if (ok) { setHit(true); setTimeout(() => setHit(false), 400); }
    setTimeout(() => {
      setFb(null);
      if (ok) {
        const nh = Math.max(0, hp - 34);
        setHp(nh);
        if (nh <= 8) setPhase('ready'); else setQi((v) => v + 1);
      } else setQi((v) => v + 1);
    }, 700);
  };
  const throwBall = (b) => {
    setBall(b); setPhase('wobble');
    setTimeout(() => onCaught(wild, b), 1500);
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
        {phase === 'wobble' && <div className="thrown"><Pokeball size={34} top={ball?.top} /></div>}
      </div>

      {/* command panel */}
      <div className="cmd">
        {phase === 'quiz' && (
          <React.Fragment>
            <div className="q-prompt">
              <div className="eyebrow">Question {qi + 1} · {z.topic}</div>
              <h3>{q.q}</h3>
              <div className="expr">{q.expr}</div>
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
              <div className="draco wf-tap" onClick={() => openTutor(z.topic)}><Icon name="hint" size={15} /> Ask Draco</div>
              <span className="cmd-hint">Correct answer → attack ↓ HP</span>
            </div>
          </React.Fragment>
        )}
        {phase === 'ready' && (
          <React.Fragment>
            <div className="ball-prompt">It’s weak — choose a Poké Ball!</div>
            <div className="balls">
              {(pokeballsProp || POKEBALLS).map((b) => (
                <div key={b.id} className={'ball-opt' + (b.own === 0 ? ' dim' : '')} onClick={() => b.own > 0 && throwBall(b)}>
                  <Pokeball size={34} id={b.id} top={b.top} />
                  <div><b>{b.name}</b><span>×{b.own} · {Math.round(b.rate * 100)}%</span></div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 14 }}>Higher tiers catch better but are scarcer.</p>
          </React.Fragment>
        )}
        {phase === 'wobble' && (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>…wobble… wobble…</div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── CELEBRATION (variant A) ─────────────────────────
function Celebration({ mon, region, onDone, onTeam }) {
  const { regions } = useContent();
  const r   = (regions && regions[region]) || { accent: '#8B5CF6' };
  const rar = RARITY[mon.rarity] || RARITY.common;
  return (
    <div className="celeb" data-region={region}>
      <svg className="celeb-rays" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
        {Array.from({ length: 22 }).map((_, i) => {
          const a = (i / 22) * Math.PI * 2;
          return <line key={i} x1="200" y1="200" x2={200 + 360 * Math.cos(a)} y2={200 + 360 * Math.sin(a)} stroke={r.accent} strokeWidth={i % 2 ? 6 : 14} opacity={i % 2 ? .25 : .12} />;
        })}
      </svg>
      <div className="celeb-eyebrow" style={{ color: rar.c }}>{mon.rarity === 'legendary' ? '★ LEGENDARY CATCH ★' : 'GOTCHA!'}</div>
      <img className="celeb-sprite" src={mon.sprite} alt={mon.name} crossOrigin="anonymous" />
      <h2>{mon.name}</h2>
      <div className="meta">
        <span className="type-chip" style={{ background: TYPE_COLOR[mon.type], verticalAlign: 'middle' }}>{mon.type}</span>
        <span style={{ color: rar.c, marginLeft: 8, fontWeight: 700 }}>{rar.label}</span> · added to Koleksi
      </div>
      <div className="celeb-rewards">
        {[['+50', 'XP'], ['+50', 'Coins'], ['New', 'Pokédex']].map(([v, l]) => (
          <div key={l} className="reward"><b style={{ color: l === 'Coins' ? 'var(--yellow)' : 'var(--accent)' }}>{v}</b><span>{l}</span></div>
        ))}
      </div>
      <div className="celeb-actions">
        <button className="btn btn-primary btn-block" onClick={onTeam}><Icon name="plus" size={16} color="#0b0a16" /> Add to team</button>
        <div className="celeb-skip" onClick={onDone}>Continue →</div>
      </div>
    </div>
  );
}

Object.assign(window, { Home, RegionMap, Catch, Celebration, PLAYER, zoneState, rarest, RANK });
