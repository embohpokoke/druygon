// index-src.jsx — App entry (compiled into bundle.js by build.sh)
// Edit this file + run build.sh to update bundle.js

// ── Constants ──────────────────────────────────────────────────────────────
const NAV_LS   = 'druygon-nav-v2';
const SLOT_LS  = 'druygon-slot-v1';   // persists active slot across sessions
const VALID_SLOTS = [1, 2, 3, 4];     // slot 5 is disabled (design-only removed)

const NAV_DEFAULT = { screen: 'home', region: 'science', zone: 1 };

function loadNav() {
  try { return { ...NAV_DEFAULT, ...JSON.parse(localStorage.getItem(NAV_LS) || '{}') }; }
  catch { return NAV_DEFAULT; }
}
function saveNav(screen, region, zone) {
  try { localStorage.setItem(NAV_LS, JSON.stringify({ screen, region, zone })); } catch {}
}
function loadSlot() {
  try {
    const n = parseInt(localStorage.getItem(SLOT_LS) || '1', 10);
    return VALID_SLOTS.includes(n) ? n : 1;
  } catch { return 1; }
}
function saveSlot(slot) {
  try { localStorage.setItem(SLOT_LS, String(slot)); } catch {}
}

// ── Server API helpers ─────────────────────────────────────────────────────
async function apiGet(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}
async function apiPost(path, body) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok || !data.success) throw new Error(data.error || `${path} → ${r.status}`);
  return data;
}

// Fetch one player slot — returns null if slot is disabled/empty
async function fetchPlayer(slot) {
  try {
    const d = await apiGet(`/api/player/${slot}`);
    // slot 5 disabled = name '' and disabled:true in profile_json
    if (!d.name || d.profile?.disabled) return null;
    return d;
  } catch { return null; }
}

// ── App ───────────────────────────────────────────────────────────────────
function App() {
  const nav = loadNav();

  // Active slot — persisted
  const [activeSlot, setActiveSlot] = React.useState(loadSlot);

  // Navigation state (localStorage-cached, cheap to lose)
  const [screen, setScreen] = React.useState(nav.screen);
  const [region, setRegion] = React.useState(nav.region);
  const [zone,   setZone]   = React.useState(nav.zone);

  // Server-authoritative game state for active slot
  const [playerReady, setPlayerReady] = React.useState(false);
  const [playerErr,   setPlayerErr]   = React.useState(null);
  const [playerName,  setPlayerName]  = React.useState('');
  const [profile,   setProfile]   = React.useState({ level: 1, xp: 0, xpToNext: 100, coins: 0, stats: {}, pokeballs: { pokeball: 5, greatball: 0, ultraball: 0, masterball: 0 } });
  const [caught,    setCaught]    = React.useState([]);
  const [progress,  setProgress]  = React.useState([]);
  const [team,         setTeam]         = React.useState([]);
  const [badges,       setBadges]       = React.useState([]);
  const [dailyMission, setDailyMission] = React.useState({ progress: 0, target: 3, completed: false, claimed: false, streak: 0 });

  // All slots summary (for selector in Profile + PlayerPicker)
  const [allSlots, setAllSlots] = React.useState([]);

  // Player picker overlay
  const [pickerOpen,    setPickerOpen]    = React.useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = React.useState(false); // set true after slots load if never chosen

  // Splash after picking a trainer + Draco hint sheet
  const [splashName, setSplashName] = React.useState(null);
  const [draco, setDraco] = React.useState(null);          // null | { ctx }
  const openDraco  = React.useCallback((ctx) => { SFX.play('click'); setDraco({ ctx: ctx || null }); }, []);
  const closeDraco = React.useCallback(() => setDraco(null), []);

  // Celebration overlay
  const [celeb, setCeleb] = React.useState(null);

  // Load active player + all slot previews
  const loadActivePlayer = React.useCallback((slot) => {
    setPlayerReady(false);
    setPlayerErr(null);
    apiGet(`/api/player/${slot}`)
      .then(data => {
        setPlayerName(data.name || 'Trainer');
        setProfile(data.profile);
        setCaught(data.caught   || []);
        setProgress(data.progress || []);
        setTeam(data.team || []);
        setBadges(data.badges || []);
        setDailyMission(data.dailyMission || { progress: 0, target: 3, completed: false, claimed: false, streak: 0 });
        setPlayerReady(true);
      })
      .catch(err => {
        console.warn('[App] player load failed:', err.message);
        setPlayerReady(true);
        setPlayerErr(err.message);
      });
  }, []);

  // On mount: load active player + snapshot all 4 slots + check first launch
  React.useEffect(() => {
    // First launch = SLOT_LS key never been set by user
    const neverChosen = !localStorage.getItem(SLOT_LS);
    if (neverChosen) setIsFirstLaunch(true);

    loadActivePlayer(activeSlot);
    Promise.all(VALID_SLOTS.map(s => fetchPlayer(s))).then(results => {
      const slots = results.map((d, i) => d
        ? { slot: VALID_SLOTS[i], name: d.name, level: d.profile ? d.profile.level : 1, coins: d.profile ? d.profile.coins : 0, caughtCount: (d.caught || []).length }
        : null
      ).filter(Boolean);
      setAllSlots(slots);
      // Show picker on first launch once slots are loaded
      if (neverChosen) setPickerOpen(true);
    });
  }, []);  // eslint-disable-line

  // Switch to a different player slot
  const switchSlot = (slot) => {
    setPickerOpen(false);
    setIsFirstLaunch(false);
    saveSlot(slot);
    // Splash with the picked trainer (also on re-pick of the same slot)
    const picked = allSlots.find(s => s.slot === slot);
    if (picked) {
      setSplashName(picked.name);
      setTimeout(() => setSplashName(null), 1500);
    }
    if (slot === activeSlot) return;
    setActiveSlot(slot);
    const newNav = { screen: 'home', region: 'science', zone: 1 };
    setScreen(newNav.screen); setRegion(newNav.region); setZone(newNav.zone);
    saveNav(newNav.screen, newNav.region, newNav.zone);
    loadActivePlayer(slot);
  };

  // ── Team management ───────────────────────────────────────────────────
  const onTeamAdd = async (dex) => {
    try {
      const data = await apiPost(`/api/player/${activeSlot}/team`, { action: 'add', dex });
      setTeam(data.team || []);
    } catch (err) { console.error('[App] team add failed:', err.message); }
  };

  const onTeamRemove = async (dex) => {
    try {
      const data = await apiPost(`/api/player/${activeSlot}/team`, { action: 'remove', dex });
      setTeam(data.team || []);
    } catch (err) { console.error('[App] team remove failed:', err.message); }
  };

  // ── Daily mission claim (idempotent) ──────────────────────────────────
  const onClaimMission = async () => {
    const idem = 'mission_' + activeSlot + '_' + new Date().toISOString().slice(0, 10) + '_' + Date.now();
    try {
      const data = await apiPost(`/api/player/${activeSlot}/mission/claim`, { idempotencyKey: idem });
      setProfile(prev => ({
        ...prev,
        coins: data.coinsNow   ?? prev.coins,
        xp:    data.xpNow      ?? prev.xp,
        level: data.levelNow   ?? prev.level,
        pokeballs: data.pokeballs ?? prev.pokeballs,
      }));
      setDailyMission(prev => ({ ...prev, claimed: true, completed: true }));
    } catch (err) { console.error('[App] mission claim failed:', err.message); }
  };

  // ── Answer reward — +1 coin +5 XP per correct answer (T12) ───────────
  const onAnswer = async (correct, zoneId) => {
    if (!correct) return;
    try {
      const data = await apiPost(`/api/player/${activeSlot}/answer`, { correct: true, zoneId });
      setProfile(prev => ({
        ...prev,
        coins: data.coinsNow ?? prev.coins,
        xp:    data.xpNow    ?? prev.xp,
        level: data.levelNow ?? prev.level,
      }));
    } catch (err) { console.error('[App] answer reward failed:', err.message); }
  };

  // Navigation helper
  const go = (toScreen, toRegion, toZone) => {
    const s = toScreen;
    const r = toRegion || region;
    const z = toZone != null ? toZone : zone;
    setScreen(s); setRegion(r); setZone(z);
    saveNav(s, r, z);
    requestAnimationFrame(() => { const b = document.querySelector('.body'); if (b) b.scrollTop = 0; });
  };

  // Catch handler
  const onCaught = async (mon, ball) => {
    setCaught(prev => prev.some(c => c.dex === mon.dex)
      ? prev
      : [...prev, { dex: mon.dex, zoneId: ball._zoneId || '', caughtAt: new Date().toISOString() }]
    );
    setProfile(prev => ({
      ...prev,
      coins: prev.coins + (ball._coinAward ?? 50),
      pokeballs: { ...prev.pokeballs, [ball.id]: Math.max(0, (prev.pokeballs[ball.id] ?? 0) - 1) },
    }));
    setCeleb({ mon, region, coins: ball._coinAward ?? 50, fact: funFactForTopic(ball._topic) });

    try {
      const data = await apiPost(`/api/player/${activeSlot}/catch`, {
        dex: mon.dex, zoneId: ball._zoneId || '', ballType: ball.id,
      });
      setProfile(prev => ({
        ...prev,
        coins:     data.coinsNow    ?? prev.coins,
        level:     data.levelNow    ?? prev.level,
        xp:        data.xpNow       ?? prev.xp,
        pokeballs: data.pokeballs   ?? prev.pokeballs,
      }));
      // Update celeb with level-up info if applicable
      if (data.levelUp) {
        setCeleb(prev => prev ? { ...prev, newLevel: data.levelNow, rewardBalls: data.rewardBalls, levelUp: true } : prev);
      }
      // Optimistically advance daily mission (will reconcile on next full load)
      setDailyMission(prev => ({
        ...prev,
        progress: Math.min(prev.target, prev.progress + 1),
        completed: prev.progress + 1 >= prev.target,
      }));
    } catch (err) {
      console.error('[App] catch persist failed:', err.message);
    }
  };

  const closeCeleb = () => { setCeleb(null); go('map', region); };
  const caughtDex  = caught.map(c => c.dex);

  const currentZoneId = (() => {
    if (!window.REGIONS || !window.REGIONS[region]) return '';
    const z = window.REGIONS[region].zones.find(x => x.zone === zone);
    return z ? z.id : '';
  })();

  const pokeballs = POKEBALLS.map(b => ({
    ...b,
    own: profile.pokeballs[b.id] ?? 0,
    _zoneId: currentZoneId,
    _coinAward: b.id === 'pokeball' ? 50 : b.id === 'greatball' ? 80 : b.id === 'ultraball' ? 120 : 300,
  }));

  if (!playerReady) {
    return (
      <div className="device">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:12, color:'var(--text-secondary)' }}>
          <div style={{ fontSize:32 }}>⚡</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:13 }}>Loading…</div>
        </div>
      </div>
    );
  }

  const r = window.REGIONS && window.REGIONS[region];
  let header, content, showNav = true;

  const openPicker = () => setPickerOpen(true);
  const closePicker = () => { setPickerOpen(false); setIsFirstLaunch(false); };

  // All headers share the same avatar tap handler + Draco sheet opener
  const hProps = { playerName, onAvatarTap: openPicker, onOpenDraco: openDraco };

  if (screen === 'home') {
    header  = <Header region={region} coins={profile.coins} {...hProps} />;
    content = <Home go={go} caught={caught} coins={profile.coins} profile={profile} playerName={playerName} allSlots={allSlots} activeSlot={activeSlot} progress={progress} dailyMission={dailyMission} badges={badges} onClaimMission={onClaimMission} onOpenDraco={openDraco} />;
  } else if (screen === 'map') {
    header  = <Header region={region} title={r ? r.name : '…'} sub="Region map" coins={profile.coins} onBack={() => go('home')} {...hProps} />;
    content = <RegionMap region={region} go={go} caught={caught} profile={profile} progress={progress} />;
  } else if (screen === 'catch') {
    const z = r && r.zones.find(x => x.zone === zone);
    header  = <Header region={region} title={z ? z.name : '…'} sub={r ? r.name : '…'} coins={profile.coins} onBack={() => go('map', region)} {...hProps} />;
    content = <Catch region={region} zone={zone} go={go} onCaught={onCaught} pokeballs={pokeballs} caught={caught} onAnswer={onAnswer} onOpenDraco={openDraco} />;
    showNav = false;
  } else if (screen === 'collection') {
    header  = <Header region={region} title="Collection" sub="Your Pokédex" coins={profile.coins} {...hProps} />;
    content = <Collection caught={caughtDex} region={region} go={go} team={team} onTeamAdd={onTeamAdd} onTeamRemove={onTeamRemove} />;
  } else if (screen === 'store') {
    header  = <Header region={region} title="Shop" sub="Balls & items" coins={profile.coins} {...hProps} />;
    content = <Store coins={profile.coins} region={region} pokeballs={pokeballs} activeSlot={activeSlot} onPurchase={(data) => setProfile(prev => ({ ...prev, coins: data.coinsNow ?? prev.coins, pokeballs: data.pokeballs ?? prev.pokeballs }))} />;
  } else if (screen === 'profile') {
    header  = <Header region={region} title="Profile" sub="Trainer & parent" coins={profile.coins} {...hProps} />;
    content = <Profile caught={caughtDex} region={region} go={go} profile={profile}
                playerName={playerName} activeSlot={activeSlot} allSlots={allSlots}
                onSwitchSlot={switchSlot} team={team} badges={badges} dailyMission={dailyMission} progress={progress} onTeamRemove={onTeamRemove} />;
  } else if (screen === 'mathblitz') {
    header  = <Header region="curriculum" title="5-Minute Math" sub="Timed practice" coins={profile.coins} onBack={() => go('home')} {...hProps} />;
    content = <MathBlitz activeSlot={activeSlot} onReward={(data) => setProfile(prev => ({ ...prev, coins: data.coinsNow ?? prev.coins, xp: data.xpNow ?? prev.xp, level: data.levelNow ?? prev.level }))} go={go} />;
    showNav = false;
  }

  const navActive = screen === 'catch' || screen === 'mathblitz' ? 'map' : screen;

  return (
    <React.Fragment>
      <div className="device" data-region={region}>
        {header}
        {content}
        {showNav && <BottomNav active={navActive} go={(s) => go(s)} />}
        {celeb && <Celebration mon={celeb.mon} region={celeb.region} coins={celeb.coins} fact={celeb.fact} onDone={closeCeleb} onTeam={closeCeleb} activeSlot={activeSlot} onTeamAdd={onTeamAdd} newLevel={celeb.newLevel} rewardBalls={celeb.rewardBalls} levelUp={celeb.levelUp} />}
      </div>

      {/* Player picker — first launch splash + header avatar tap */}
      {pickerOpen && (
        <PlayerPicker
          allSlots={allSlots}
          activeSlot={activeSlot}
          onSelect={switchSlot}
          onClose={closePicker}
          isFirstLaunch={isFirstLaunch}
        />
      )}

      {/* Trainer splash after pick */}
      {splashName && <PickSplash name={splashName} />}

      {/* Draco hint sheet */}
      <DracoSheet open={!!draco} onClose={closeDraco} ctx={draco ? draco.ctx : null} playerName={playerName} />

      {playerErr && (
        <div style={{ position:'fixed', bottom:8, left:'50%', transform:'translateX(-50%)', background:'#2a1a1a', color:'#f87171', padding:'6px 14px', borderRadius:8, fontSize:11, zIndex:9999, maxWidth:300, textAlign:'center' }}>
          Offline mode — progress may not save.
        </div>
      )}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
