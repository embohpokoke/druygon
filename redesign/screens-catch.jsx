// screens-catch.jsx — the core Zone/Catch loop (3 interactive variants) +
// Catch celebration (2 variants). The catch interaction is the exploration
// focus, so all three are genuinely playable: answer → HP → throw → result.

const { useState, useRef, useEffect } = React;

const QBANK = [
  { q: 'What number comes next?', expr: '2, 4, 6, 8, ?', opts: ['9', '10', '11', '12'], a: 1 },
  { q: 'Finish the pattern', expr: '🔺 🔵 🔺 🔵 🔺 ?', opts: ['🔺', '🔵', '🟢', '⬛'], a: 1 },
  { q: 'Logic gate result', expr: 'TRUE  AND  FALSE  =', opts: ['TRUE', 'FALSE'], a: 1 },
  { q: 'Order: smallest first', expr: 'loop · step · start', opts: ['start · step · loop', 'loop · start · step'], a: 0 },
];

const BALLS = [
  { id: 'pokeball', name: 'Poké', rate: '40%', c: '#d24a3d' },
  { id: 'greatball', name: 'Great', rate: '60%', c: '#3a7fd0' },
  { id: 'ultraball', name: 'Ultra', rate: '80%', c: '#E0A800' },
  { id: 'masterball', name: 'Master', rate: '100%', c: '#7c4ddb' },
];

// shared interactive engine
function useCatch() {
  const [hp, setHp] = useState(100);
  const [qIdx, setQIdx] = useState(0);
  const [phase, setPhase] = useState('quiz');   // quiz | ready | wobble | result | fled
  const [fb, setFb] = useState(null);            // {ok, pick}
  const [ball, setBall] = useState(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const q = QBANK[qIdx % QBANK.length];

  function answer(i) {
    if (phase !== 'quiz' || fb) return;
    const ok = i === q.a;
    setFb({ ok, pick: i });
    setTimeout(() => {
      setFb(null);
      if (ok) {
        const nh = Math.max(0, hp - 34);
        setHp(nh); setXp((x) => x + 5); setStreak((s) => s + 1);
        if (nh <= 10) setPhase('ready'); else setQIdx((v) => v + 1);
      } else { setStreak(0); setQIdx((v) => v + 1); }
    }, 720);
  }
  function chooseBall(b) {
    setBall(b); setPhase('wobble');
    setTimeout(() => setPhase('result'), 1500);
  }
  function reset() { setHp(100); setQIdx(0); setPhase('quiz'); setFb(null); setBall(null); setXp(0); setStreak(0); }
  return { hp, q, qIdx, phase, setPhase, fb, answer, chooseBall, ball, xp, streak, reset };
}

// answer button shared
function AnswerBtn({ children, state, onClick, hotkey, big }) {
  const map = {
    ok: { bd: WF.teal, bg: hexA(WF.teal, .14) },
    no: { bd: '#d24a3d', bg: hexA('#d24a3d', .12) },
    idle: { bd: WF.line, bg: WF.paper },
  };
  const s = map[state] || map.idle;
  return (
    <div className="wf-tap" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 9, border: `2px solid ${s.bd}`, background: s.bg, borderRadius: 12, padding: big ? '12px 14px' : '10px 12px', fontWeight: 700, fontSize: big ? 17 : 14, boxShadow: state === 'idle' || !state ? `2px 2px 0 ${WF.line}` : 'none' }}>
      {hotkey && <span style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${WF.faint}`, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WF.ink2, flexShrink: 0 }}>{hotkey}</span>}
      <span style={{ flex: 1 }}>{children}</span>
      {state === 'ok' && <Glyph n="check" s={16} c={WF.teal} sw={2.4} />}
    </div>
  );
}

// wild mon avatar (placeholder sprite) + HP
function WildMon({ hp, size = 90, wobble, caught }) {
  const big = size >= 70;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', animation: wobble ? 'wf-shake .4s ease-in-out infinite' : 'none' }}>
        <ImgBox path={big ? 'images/pokemon/0906.webp' : ''} label={big ? 'Sprigatito' : ''} accent={WF.purple} h={size} w={size} r={20} corner>
          <span style={{ fontSize: size * .42 }}>🌿</span>
        </ImgBox>
        {caught && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * .5 }}>⛓️</div>}
      </div>
    </div>
  );
}

function HpRow({ hp }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: hp <= 10 ? '#d24a3d' : WF.ink2 }}>HP</span>
      <div style={{ flex: 1 }}><Meter pct={hp} c={hp <= 10 ? '#d24a3d' : hp < 40 ? '#E0A800' : WF.teal} h={8} /></div>
    </div>
  );
}

// ball thrown overlay
function ThrowFx({ c }) {
  return <div style={{ position: 'absolute', left: '50%', bottom: 30, transform: 'translateX(-50%)', animation: 'wf-throw 1.4s ease-out forwards', zIndex: 8 }}>
    <div style={{ width: 30, height: 30, borderRadius: 99, border: `2.5px solid ${WF.line}`, background: c, animation: 'wf-shake .3s ease-in-out 1s 2' }} />
  </div>;
}

function XpToast({ xp }) {
  return <div className="wf-marker" style={{ position: 'absolute', top: 8, right: 12, fontSize: 13, fontWeight: 700, color: WF.teal, animation: 'wf-pop .3s ease', zIndex: 9 }}>+{xp} XP</div>;
}

// Ball selector (grid) — variant B style
function BallSelector({ onPick, compact }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {BALLS.map((b) => (
        <div key={b.id} className="wf-tap" onClick={() => onPick(b)} style={{ display: 'flex', alignItems: 'center', gap: 8, border: `2px solid ${WF.line}`, borderRadius: 12, padding: '8px 10px', background: WF.paper, boxShadow: `2px 2px 0 ${hexA(b.c, .5)}` }}>
          <div style={{ width: 24, height: 24, borderRadius: 99, border: `2px solid ${WF.line}`, background: b.c, flexShrink: 0 }} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{b.name}</div>
            <div style={{ fontSize: 9, color: WF.ink2 }}>×{b.id === 'pokeball' ? 5 : b.id === 'greatball' ? 2 : 1} · {b.rate}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultPanel({ onCelebrate, ball }) {
  return (
    <div style={{ textAlign: 'center', padding: '4px 0' }}>
      <div className="wf-marker" style={{ fontSize: 16, fontWeight: 700, color: WF.teal }}>Gotcha! Sprigatito was caught!</div>
      <div style={{ fontSize: 11, color: WF.ink2, margin: '4px 0 10px' }}>{ball ? ball.name + ' Ball' : ''} · +15 XP · +10 coins</div>
      <div className="wf-anno" style={{ fontSize: 10, color: WF.ink2, marginBottom: 8 }}>→ then the Catch celebration screen (next section)</div>
      <Btn accent={WF.teal} full onClick={onCelebrate}><Glyph n="play" s={12} c="#fff" /> Replay catch</Btn>
    </div>
  );
}

// ════════ CATCH · Variant A — Quiz-first (question is the hero) ════════
function CatchA({ onCelebrate }) {
  const e = useCatch();
  return (
    <PhoneFrame nav={null} noNav region="compsci" header={<AppHeader region="compsci" title="Gerbang Logika" back />}>
      <div style={{ position: 'relative', padding: '12px 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {e.xp > 0 && e.phase === 'quiz' && <XpToast xp={5} />}
        {/* small wild companion strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `2px dashed ${WF.faint}`, borderRadius: 12, padding: 8, marginBottom: 12 }}>
          <WildMon hp={e.hp} size={44} wobble={e.phase === 'wobble'} caught={e.phase === 'result'} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}><span>Wild Sprigatito</span><Pill small accent={WF.purple}>LV 5</Pill></div>
            <div style={{ marginTop: 4 }}><HpRow hp={e.hp} /></div>
          </div>
        </div>

        {e.phase === 'quiz' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: WF.ink2, letterSpacing: 1 }} className="wf-marker">QUESTION {e.qIdx + 1}</div>
              <div className="wf-marker" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{e.q.q}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: WF.purple, marginTop: 10, letterSpacing: 1 }}>{e.q.expr}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 'auto' }}>
              {e.q.opts.map((o, i) => (
                <AnswerBtn key={i} hotkey={i + 1} big
                  state={e.fb ? (i === e.q.a ? 'ok' : i === e.fb.pick ? 'no' : 'idle') : 'idle'}
                  onClick={() => e.answer(i)}>{o}</AnswerBtn>
              ))}
            </div>
            <div className="wf-tap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, color: WF.ink2, fontSize: 12, whiteSpace: 'nowrap' }}>
              <Glyph n="hint" s={16} c={WF.ink2} /> Ask Draco for a hint
            </div>
          </div>
        )}

        {e.phase === 'ready' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', gap: 12 }}>
            <WildMon hp={e.hp} size={96} />
            <div className="wf-marker" style={{ fontSize: 17, fontWeight: 700, color: WF.purple }}>It’s weak — throw a ball!</div>
            <div style={{ fontSize: 11, color: WF.ink2 }}>Tap a ball to throw</div>
            <BallSelector onPick={e.chooseBall} />
          </div>
        )}

        {e.phase === 'wobble' && (
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <WildMon hp={0} size={96} wobble />
            <ThrowFx c={e.ball?.c} />
            <div className="wf-marker" style={{ marginTop: 20, color: WF.ink2 }}>…wobble… wobble…</div>
          </div>
        )}

        {e.phase === 'result' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
            <WildMon hp={0} size={96} caught />
            <ResultPanel onCelebrate={e.reset} ball={e.ball} />
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}

// ════════ CATCH · Variant B — Battle stage (mon on top, quiz below) ════════
function CatchB({ onCelebrate }) {
  const e = useCatch();
  return (
    <PhoneFrame nav={null} noNav region="compsci" header={<AppHeader region="compsci" title="Gerbang Logika" back />}>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* stage */}
        <div style={{ position: 'relative', height: 200, background: hexA(WF.purple, .08), borderBottom: `2px solid ${WF.line}`, padding: 12, flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .4 }}><ImgBox path="maps/compsci-bg.jpg" h="100%" r={0} accent={WF.purple} label="" corner /></div>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 150, border: `2px solid ${WF.line}`, borderRadius: 12, padding: '6px 9px', background: WF.paper }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}><span>Sprigatito</span><span style={{ color: WF.ink2 }}>LV5</span></div>
              <div style={{ marginTop: 4 }}><HpRow hp={e.hp} /></div>
            </div>
          </div>
          <div style={{ position: 'absolute', left: '50%', top: 64, transform: 'translateX(-50%)' }}>
            <WildMon hp={e.hp} size={96} wobble={e.phase === 'wobble'} caught={e.phase === 'result'} />
          </div>
          {e.phase === 'wobble' && <ThrowFx c={e.ball?.c} />}
          {e.xp > 0 && e.phase === 'quiz' && <XpToast xp={5} />}
        </div>

        {/* command panel */}
        <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
          {e.phase === 'quiz' && (<>
            <div className="wf-marker" style={{ fontSize: 14, fontWeight: 700 }}>{e.q.q}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: WF.purple, margin: '6px 0 12px' }}>{e.q.expr}</div>
            <div style={{ display: 'grid', gridTemplateColumns: e.q.opts.length > 2 ? '1fr 1fr' : '1fr', gap: 8 }}>
              {e.q.opts.map((o, i) => (
                <AnswerBtn key={i} state={e.fb ? (i === e.q.a ? 'ok' : i === e.fb.pick ? 'no' : 'idle') : 'idle'} onClick={() => e.answer(i)}>{o}</AnswerBtn>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12 }}>
              <Btn ghost small><Glyph n="hint" s={14} c={WF.ink} /> Draco</Btn>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: WF.ink2, alignSelf: 'center' }}>Answer right → attack ↓ HP</span>
            </div>
          </>)}

          {e.phase === 'ready' && (<>
            <div className="wf-marker" style={{ fontSize: 14, fontWeight: 700, color: WF.purple, marginBottom: 8 }}>Choose a Poké Ball</div>
            <BallSelector onPick={e.chooseBall} />
            <Note c={WF.purple}>B lets the player pick a ball <b>tier strategically</b> — higher tiers = better odds but scarcer.</Note>
          </>)}

          {e.phase === 'wobble' && <div className="wf-marker" style={{ textAlign: 'center', color: WF.ink2, marginTop: 'auto', marginBottom: 'auto' }}>…wobble… wobble…</div>}
          {e.phase === 'result' && <div style={{ marginTop: 'auto', marginBottom: 'auto' }}><ResultPanel onCelebrate={e.reset} ball={e.ball} /></div>}
        </div>
      </div>
    </PhoneFrame>
  );
}

// ════════ CATCH · Variant C — Combo + tap-hold power throw ════════
function CatchC({ onCelebrate }) {
  const e = useCatch();
  const [power, setPower] = useState(0);
  const holdRef = useRef(null);
  const startHold = () => {
    if (e.phase !== 'ready') return;
    holdRef.current = setInterval(() => setPower((p) => (p >= 100 ? 0 : p + 7)), 40);
  };
  const endHold = () => {
    clearInterval(holdRef.current);
    if (e.phase !== 'ready') return;
    const perfect = power > 70 && power < 95;
    e.chooseBall(perfect ? BALLS[2] : BALLS[0]);
  };
  useEffect(() => () => clearInterval(holdRef.current), []);

  return (
    <PhoneFrame nav={null} noNav region="compsci" header={<AppHeader region="compsci" title="Gerbang Logika" back />}>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 16px' }}>
        {/* mon + combo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <WildMon hp={e.hp} size={84} wobble={e.phase === 'wobble'} caught={e.phase === 'result'} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>Sprigatito</span>
            {e.streak > 0 && <Pill small accent={WF.teal} style={{ animation: 'wf-pop .3s' }}>🔥 {e.streak}x combo</Pill>}
          </div>
          <div style={{ width: '70%' }}><HpRow hp={e.hp} /></div>
        </div>
        {e.phase === 'wobble' && <ThrowFx c={e.ball?.c} />}

        {e.phase === 'quiz' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: hexA(WF.purple, .07), border: `2px solid ${WF.line}`, borderRadius: 14, padding: 12, textAlign: 'center', marginBottom: 10 }}>
              <div className="wf-marker" style={{ fontSize: 13, fontWeight: 700 }}>{e.q.q}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: WF.purple, marginTop: 6 }}>{e.q.expr}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
              {e.q.opts.map((o, i) => (
                <AnswerBtn key={i} state={e.fb ? (i === e.q.a ? 'ok' : i === e.fb.pick ? 'no' : 'idle') : 'idle'} onClick={() => e.answer(i)}>{o}</AnswerBtn>
              ))}
            </div>
            <Note c={WF.teal}>C: each correct answer builds a <b>combo</b>; the catch itself is a skill moment.</Note>
          </div>
        )}

        {e.phase === 'ready' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
            <div className="wf-marker" style={{ fontSize: 16, fontWeight: 700, color: WF.purple }}>Hold to charge your throw!</div>
            {/* power meter */}
            <div style={{ width: '80%' }}>
              <div style={{ position: 'relative', height: 16, borderRadius: 99, border: `2px solid ${WF.line}`, overflow: 'hidden', background: WF.paper2 }}>
                <div style={{ width: power + '%', height: '100%', background: power > 70 && power < 95 ? WF.teal : WF.purple }} />
                {/* sweet spot */}
                <div style={{ position: 'absolute', left: '70%', width: '25%', top: 0, bottom: 0, border: `2px dashed ${WF.teal}`, borderTop: 0, borderBottom: 0 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: WF.ink2, marginTop: 3 }}><span>weak</span><span style={{ color: WF.teal }}>sweet spot</span><span>over</span></div>
            </div>
            <div className="wf-tap" onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold}
              style={{ width: 88, height: 88, borderRadius: 99, border: `3px solid ${WF.line}`, background: WF.purple, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `3px 3px 0 ${WF.line}`, userSelect: 'none' }}>
              <Glyph n="ball" s={28} c="#fff" /><span style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>HOLD</span>
            </div>
          </div>
        )}

        {e.phase === 'wobble' && <div className="wf-marker" style={{ textAlign: 'center', color: WF.ink2, marginTop: 'auto', marginBottom: 'auto' }}>…wobble…</div>}
        {e.phase === 'result' && <div style={{ marginTop: 'auto', marginBottom: 'auto' }}><ResultPanel onCelebrate={e.reset} ball={e.ball} /></div>}
      </div>
    </PhoneFrame>
  );
}

// ════════ CELEBRATION · Variant A — full-screen burst modal ════════
function CelebA() {
  return (
    <PhoneFrame nav={null} noNav region="compsci" dark header={null}>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center', color: '#f0eeff' }}>
        {/* rays */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .35 }} viewBox="0 0 200 400">
          {Array.from({ length: 16 }).map((_, i) => <line key={i} x1="100" y1="150" x2={100 + 200 * Math.cos(i / 16 * 6.28)} y2={150 + 200 * Math.sin(i / 16 * 6.28)} stroke={WF.purple} strokeWidth="3" />)}
        </svg>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: WF.purple }} className="wf-marker">★ LEGENDARY CATCH ★</div>
          <div style={{ animation: 'wf-pop .5s ease', margin: '14px 0' }}>
            <ImgBox path="images/pokemon/0906.webp" label="caught sprite" accent={WF.purple} h={130} w={130} r={28}>
              <span style={{ fontSize: 56 }}>🌿</span>
            </ImgBox>
          </div>
          <div className="wf-marker" style={{ fontSize: 22, fontWeight: 700 }}>Sprigatito</div>
          <div style={{ fontSize: 11, color: 'rgba(240,238,255,.6)', marginBottom: 14 }}>Grass · CP 240 · added to Koleksi</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 18 }}>
            {[['+50', 'XP', WF.teal], ['+50', 'COINS', WF.yellow], ['New', 'POKÉDEX', WF.purple]].map(([v, l, c]) => (
              <div key={l} style={{ border: `2px solid ${c}`, borderRadius: 12, padding: '8px 12px', minWidth: 56 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div><div style={{ fontSize: 8, letterSpacing: 1, color: 'rgba(240,238,255,.5)' }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 220, margin: '0 auto' }}>
            <Btn accent={WF.purple} full style={{ color: '#fff' }}><Glyph n="plus" s={13} c="#fff" /> Add to team</Btn>
            <div className="wf-tap" style={{ fontSize: 12, color: 'rgba(240,238,255,.6)' }}>Continue →</div>
          </div>
        </div>
        <Note c={WF.purple}>A: full-screen interrupt — maximal payoff for a rare/legendary catch.</Note>
      </div>
    </PhoneFrame>
  );
}

// ════════ CELEBRATION · Variant B — bottom slide-up sheet ════════
function CelebB() {
  return (
    <PhoneFrame nav={null} noNav region="compsci" header={<AppHeader region="compsci" title="Gerbang Logika" back />}>
      <div style={{ position: 'relative', height: '100%' }}>
        {/* dimmed zone behind */}
        <div style={{ position: 'absolute', inset: 0, opacity: .25, filter: 'grayscale(.4)' }}>
          <ImgBox path="maps/compsci-bg.jpg" h="100%" r={0} accent={WF.purple} label="" corner />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(40,36,30,.18)' }} />
        {/* sheet */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: WF.paper, borderTop: `2.5px solid ${WF.line}`, borderRadius: '20px 20px 0 0', padding: '10px 16px 18px', animation: 'wf-rise .4s cubic-bezier(.2,.8,.3,1)' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: WF.faint, margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ animation: 'wf-pop .4s ease' }}>
              <ImgBox path="images/pokemon/0906.webp" accent={WF.purple} h={72} w={72} r={18}><span style={{ fontSize: 34 }}>🌿</span></ImgBox>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: WF.teal, fontWeight: 700 }} className="wf-marker">CAUGHT!</div>
              <div className="wf-marker" style={{ fontSize: 18, fontWeight: 700 }}>Sprigatito</div>
              <div style={{ fontSize: 10, color: WF.ink2 }}>Grass · CP 240</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <Pill small accent={WF.teal}>+25 XP</Pill><Pill small accent={WF.yellow}>+20</Pill>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Btn ghost full><Glyph n="plus" s={13} c={WF.ink} /> Team</Btn>
            <Btn accent={WF.purple} full style={{ color: '#fff' }}>Keep playing</Btn>
          </div>
          <Note c={WF.teal}>B: non-blocking sheet — for common catches, keeps the catch loop fast. Save the full-screen burst (A) for rare/legendary.</Note>
        </div>
      </div>
    </PhoneFrame>
  );
}

Object.assign(window, { useCatch, CatchA, CatchB, CatchC, CelebA, CelebB, BallSelector, WildMon, HpRow, AnswerBtn });
