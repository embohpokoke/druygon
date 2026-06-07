// app-screens2.jsx — Collection, Store, Profile / Parent.

const regionMons = (id) => {
  const seen = {}; const out = [];
  REGIONS[id].zones.forEach((z) => z.mons.forEach((m) => { if (!seen[m.dex]) { seen[m.dex] = 1; out.push(m); } }));
  return out;
};

function Collection({ caught, region, go }) {
  const order = ['curriculum', 'science', 'compsci'];
  const [filter, setFilter] = React.useState('all');
  const has = (dex) => caught.includes(dex);
  const all = order.flatMap(regionMons);
  const total = all.length;
  const legend = all.filter((m) => has(m.dex) && m.rarity === 'legendary').length;
  return (
    <div className="body screen-anim">
      <div className="pad">
        <div className="col-stats">
          <div className="col-stat" style={{ '--accent': REGIONS[region].accent }}><b style={{ color: 'var(--accent)' }}>{caught.length}</b><span>Caught</span></div>
          <div className="col-stat"><b>{total}</b><span>Pokédex</span></div>
          <div className="col-stat"><b style={{ color: 'var(--yellow)' }}>{legend}</b><span>Legendary</span></div>
        </div>
        <div className="col-filters" data-region={region}>
          {[['all', 'All'], ...order.map((id) => [id, REGIONS[id].tag])].map(([id, label]) => (
            <div key={id} className={'filter' + (filter === id ? ' on' : '')} onClick={() => setFilter(id)}>{label}</div>
          ))}
        </div>
        {order.filter((id) => filter === 'all' || filter === id).map((id) => {
          const r = REGIONS[id]; const mons = regionMons(id);
          const c = mons.filter((m) => has(m.dex)).length;
          return (
            <div key={id} data-region={id}>
              <div className="sec-head"><h2 style={{ color: 'var(--accent)', fontSize: 15 }}>{r.name}</h2><a>{c}/{mons.length}</a></div>
              <div className="col-grid">
                {mons.map((m) => (
                  <div key={m.dex} className={'dex' + (has(m.dex) ? '' : ' un')} style={has(m.dex) ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}}>
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

function Profile({ caught, region, go }) {
  const prog = { curriculum: 66, science: 33, compsci: 12 };
  return (
    <div className="body screen-anim" data-region={region}>
      <div className="pad">
        <div className="prof-card">
          <div className="prof-av"><img src={AVATAR} alt="Dru" /></div>
          <div className="who">
            <b>Dru</b>
            <span>Trainer · Level {PLAYER.level} · {caught.length} caught</span>
            <div className="meter" style={{ marginTop: 8 }}><i style={{ width: PLAYER.xpPct + '%' }} /></div>
          </div>
        </div>

        <div className="sec-head"><h2>Player slots</h2></div>
        <div className="slots">
          <div className="slot on">
            <div className="slot-av"><img src={AVATAR} alt="Dru" /></div><b>Dru</b>
          </div>
          <div className="slot add"><Icon name="plus" size={26} /><b>Add</b></div>
        </div>

        <div className="sec-head"><h2>Progress by world</h2></div>
        {['curriculum', 'science', 'compsci'].map((id) => {
          const r = REGIONS[id];
          return (
            <div key={id} className="prog-row" data-region={id}>
              <b style={{ color: 'var(--accent)' }}>{r.name}</b>
              <div className="meter"><i style={{ width: prog[id] + '%' }} /></div>
              <span>{prog[id]}%</span>
            </div>
          );
        })}

        <div className="sec-head"><h2>For grown-ups</h2></div>
        <div className="link-row">
          <div className="ic"><Icon name="chart" size={20} /></div>
          <div className="tx"><b>Parent dashboard</b><span>Time played · topics · accuracy · /parent</span></div>
          <Icon name="arrowR" size={18} color="var(--text-tertiary)" />
        </div>
        <div className="link-row archive">
          <div className="ic"><Icon name="archive" size={20} /></div>
          <div className="tx"><b>Modul Lama</b><span>Math Arena, Word Search, Ramadhan… · /archive</span></div>
          <Icon name="arrowR" size={18} color="var(--text-tertiary)" />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Collection, Store, Profile, regionMons });
