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

  // All slots summary (for selector in Profile)
  const [allSlots, setAllSlots] = React.useState([]);

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
        setPlayerReady(true);
      })
      .catch(err => {
        console.warn('[App] player load failed:', err.message);
        setPlayerReady(true);
        setPlayerErr(err.message);
      });
  }, []);

  // On mount: load active player + snapshot all 4 slots for selector
  React.useEffect(() => {
    loadActivePlayer(activeSlot);
    // Load all slots for the profile selector (lightweight)
    Promise.all(VALID_SLOTS.map(s => fetchPlayer(s))).then(results => {
      setAllSlots(results.map((d, i) => d
        ? { slot: VALID_SLOTS[i], name: d.name, level: d.profile?.level ?? 1, coins: d.profile?.coins ?? 0, caughtCount: (d.caught || []).length }
        : null
      ).filter(Boolean));
    });
  }, []);  // eslint-disable-line

  // Switch to a different player slot
  const switchSlot = (slot) => {
    if (slot === activeSlot) return;
    saveSlot(slot);
    setActiveSlot(slot);
    // Reset nav to home for the new player
    const newNav = { screen: 'home', region: 'science', zone: 1 };
    setScreen(newNav.screen); setRegion(newNav.region); setZone(newNav.zone);
    saveNav(newNav.screen, newNav.region, newNav.zone);
    loadActivePlayer(slot);
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
    setCeleb({ mon, region });

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

  if (screen === 'home') {
    header  = <Header region={region} coins={profile.coins} playerName={playerName} />;
    content = <Home go={go} caught={caughtDex} coins={profile.coins} profile={profile} playerName={playerName} allSlots={allSlots} activeSlot={activeSlot} />;
  } else if (screen === 'map') {
    header  = <Header region={region} title={r ? r.name : '…'} sub="Region map" coins={profile.coins} onBack={() => go('home')} />;
    content = <RegionMap region={region} go={go} caught={caughtDex} />;
  } else if (screen === 'catch') {
    const z = r && r.zones.find(x => x.zone === zone);
    header  = <Header region={region} title={z ? z.name : '…'} sub={r ? r.name : '…'} coins={profile.coins} onBack={() => go('map', region)} />;
    content = <Catch region={region} zone={zone} go={go} onCaught={onCaught} pokeballs={pokeballs} />;
    showNav = false;
  } else if (screen === 'collection') {
    header  = <Header region={region} title="Koleksi" sub="Your Pokédex" coins={profile.coins} />;
    content = <Collection caught={caughtDex} region={region} go={go} />;
  } else if (screen === 'store') {
    header  = <Header region={region} title="Toko" sub="Balls & items" coins={profile.coins} />;
    content = <Store coins={profile.coins} region={region} pokeballs={pokeballs} />;
  } else if (screen === 'profile') {
    header  = <Header region={region} title="Profil" sub="Trainer & parent" coins={profile.coins} />;
    content = <Profile caught={caughtDex} region={region} go={go} profile={profile}
                playerName={playerName} activeSlot={activeSlot} allSlots={allSlots}
                onSwitchSlot={switchSlot} />;
  }

  const navActive = screen === 'catch' ? 'map' : screen;

  return (
    <React.Fragment>
      <div className="device" data-region={region}>
        {header}
        {content}
        {showNav && <BottomNav active={navActive} go={(s) => go(s)} />}
        {celeb && <Celebration mon={celeb.mon} region={celeb.region} onDone={closeCeleb} onTeam={closeCeleb} />}
      </div>
      {playerErr && (
        <div style={{ position:'fixed', bottom:8, left:'50%', transform:'translateX(-50%)', background:'#2a1a1a', color:'#f87171', padding:'6px 14px', borderRadius:8, fontSize:11, zIndex:9999, maxWidth:300, textAlign:'center' }}>
          Offline mode — progress may not save.
        </div>
      )}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
