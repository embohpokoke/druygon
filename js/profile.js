// Druygon Profile System — 5 Named Player Slots
// Each player has their own localStorage key: druygon_slot_1 through druygon_slot_5

var SLOT_NAMES = ['Dru', 'Oming', 'Ily', 'Reymar', 'Extra'];
var SLOT_EMOJIS = ['🐉', '🦖', '🦈', '🐺', '🦅'];
var SLOT_COLORS = ['#FFCB05', '#FF6B35', '#4FC3F7', '#00BCD4', '#9C27B0'];
var ACTIVE_SLOT_KEY = 'druygon_active_slot';
var MAX_SLOTS = 5;

function getSlotKey(slotNum) {
  return 'druygon_slot_' + slotNum;
}

var DEFAULT_PROFILE = {
  name: '',
  level: 1,
  xp: 0,
  xpToNext: 100,
  coins: 0,
  pokeballs: { pokeball: 5, greatball: 0, ultraball: 0, masterball: 0 },
  team: [],
  collection: [],
  defeatedCount: 0,
  caughtCount: 0,
  currentRoute: 1,
  badges: [],
  stats: {
    totalCorrect: 0,
    totalWrong: 0,
    gamesPlayed: 0,
    bestStreak: 0,
    mathArenaPlays: 0,
    wordSearchPlays: 0,
    fiveMinutePlays: 0
  }
};

// Migrate ALL existing data into Slot 1 (Dru)
(function migrateAll() {
  try {
    var slot1 = localStorage.getItem(getSlotKey(1));
    if (slot1) return; // Already migrated

    // Gather all possible old data sources
    var sources = [
      localStorage.getItem('druygon_profile'),
      localStorage.getItem('druygon_profile_dru')
    ];

    var best = null;
    var bestScore = -1;
    for (var i = 0; i < sources.length; i++) {
      if (!sources[i]) continue;
      try {
        var d = JSON.parse(sources[i]);
        var score = (d.level || 1) * 100 + (d.xp || 0) + (d.coins || 0) + ((d.collection || []).length * 50);
        if (score > bestScore) {
          bestScore = score;
          best = d;
        }
      } catch(e) {}
    }

    if (best) {
      best.name = 'Dru';
      localStorage.setItem(getSlotKey(1), JSON.stringify(best));
    }

    // Clean up old keys
    localStorage.removeItem('druygon_profile');
    localStorage.removeItem('druygon_profile_dru');
    localStorage.removeItem('druygon_active_user');
    localStorage.removeItem('druygon_users');
  } catch(e) {}
})();

// Profile class
function DruygonProfile(slotNum) {
  this.slotNum = slotNum || 1;
  this.slotKey = getSlotKey(this.slotNum);
  this.data = null;
  this.load();
}

DruygonProfile.prototype.load = function() {
  try {
    var saved = localStorage.getItem(this.slotKey);
    if (saved) {
      var parsed = JSON.parse(saved);
      this.data = {};
      var key;
      for (key in DEFAULT_PROFILE) {
        if (DEFAULT_PROFILE.hasOwnProperty(key)) {
          this.data[key] = (parsed[key] !== undefined) ? parsed[key] : JSON.parse(JSON.stringify(DEFAULT_PROFILE[key]));
        }
      }
      // Deep merge sub-objects
      if (!this.data.pokeballs || typeof this.data.pokeballs !== 'object') {
        this.data.pokeballs = JSON.parse(JSON.stringify(DEFAULT_PROFILE.pokeballs));
      } else {
        var pb;
        for (pb in DEFAULT_PROFILE.pokeballs) {
          if (this.data.pokeballs[pb] === undefined) this.data.pokeballs[pb] = DEFAULT_PROFILE.pokeballs[pb];
        }
      }
      if (!this.data.stats || typeof this.data.stats !== 'object') {
        this.data.stats = JSON.parse(JSON.stringify(DEFAULT_PROFILE.stats));
      } else {
        var st;
        for (st in DEFAULT_PROFILE.stats) {
          if (this.data.stats[st] === undefined) this.data.stats[st] = DEFAULT_PROFILE.stats[st];
        }
      }
      if (!Array.isArray(this.data.collection)) this.data.collection = [];
      if (!Array.isArray(this.data.team)) this.data.team = [];
      if (!Array.isArray(this.data.badges)) this.data.badges = [];
      // Ensure name matches slot
      if (!this.data.name) this.data.name = SLOT_NAMES[this.slotNum - 1] || 'Player';
    } else {
      this.data = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
      this.data.name = SLOT_NAMES[this.slotNum - 1] || 'Player';
    }
  } catch (e) {
    this.data = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    this.data.name = SLOT_NAMES[this.slotNum - 1] || 'Player';
  }
  this.save();
};

DruygonProfile.prototype.save = function() {
  try {
    localStorage.setItem(this.slotKey, JSON.stringify(this.data));
  } catch (e) {}
};

// ---- Server Sync (fire-and-forget, non-blocking) ----
var SYNC_API = '/api/druygon/profile';
var _syncTimer = null;
var _syncQueue = {};

function _syncToServer(slotNum, data, event) {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', SYNC_API + '/save', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ slot: slotNum, profile: data, event: event || 'auto-save' }));
  } catch(e) {}
}

// Debounced sync: waits 2s after last save before syncing
DruygonProfile.prototype.syncToServer = function(event) {
  var self = this;
  var slot = this.slotNum;
  _syncQueue[slot] = { data: JSON.parse(JSON.stringify(this.data)), event: event };
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(function() {
    for (var s in _syncQueue) {
      if (_syncQueue.hasOwnProperty(s)) {
        _syncToServer(parseInt(s), _syncQueue[s].data, _syncQueue[s].event);
      }
    }
    _syncQueue = {};
    _syncTimer = null;
  }, 2000);
};

// Immediate sync for critical events
DruygonProfile.prototype.syncNow = function(event) {
  _syncToServer(this.slotNum, this.data, event);
};

// Load from server (for recovery when localStorage is empty)
DruygonProfile.prototype.loadFromServer = function(callback) {
  var self = this;
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', SYNC_API + '/load/' + self.slotNum, true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var resp = JSON.parse(xhr.responseText);
          if (resp.success && resp.profile) {
            callback(resp.profile);
          } else {
            callback(null);
          }
        } catch(e) { callback(null); }
      } else { callback(null); }
    };
    xhr.onerror = function() { callback(null); };
    xhr.send();
  } catch(e) { callback(null); }
};

DruygonProfile.prototype.reset = function() {
  this.data = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  this.data.name = SLOT_NAMES[this.slotNum - 1] || 'Player';
  this.save();
};

// XP & Leveling
DruygonProfile.prototype.addXP = function(amount) {
  this.data.xp += amount;
  var leveledUp = false;
  while (this.data.xp >= this.data.xpToNext) {
    this.data.xp -= this.data.xpToNext;
    this.data.level++;
    this.data.xpToNext = 100 * this.data.level;
    leveledUp = true;
  }
  this.save();
  if (leveledUp) this.syncNow('level-up-' + this.data.level);
  return leveledUp;
};

// Coins
DruygonProfile.prototype.addCoins = function(amount) {
  this.data.coins += amount;
  this.save();
};

DruygonProfile.prototype.spendCoins = function(amount) {
  if (this.data.coins >= amount) {
    this.data.coins -= amount;
    this.save();
    this.syncToServer('spend-coins');
    return true;
  }
  return false;
};

// Pokeballs
DruygonProfile.prototype.addPokeball = function(type, count) {
  if (!count) count = 1;
  if (!this.data.pokeballs[type]) this.data.pokeballs[type] = 0;
  this.data.pokeballs[type] += count;
  this.save();
};

DruygonProfile.prototype.usePokeball = function(type) {
  if (this.data.pokeballs[type] && this.data.pokeballs[type] > 0) {
    this.data.pokeballs[type]--;
    this.save();
    return true;
  }
  return false;
};

// Pokemon Collection
DruygonProfile.prototype.catchPokemon = function(pokemon) {
  var cp = Math.floor(pokemon.baseHP * 0.8 + pokemon.attack * 0.3 + (pokemon.level || 1) * 5);
  var caught = {
    id: pokemon.id,
    name: pokemon.name,
    emoji: pokemon.emoji,
    type: pokemon.type,
    rarity: pokemon.rarity,
    cp: cp,
    level: pokemon.level || 1,
    caughtAt: new Date().toISOString(),
    route: pokemon.route
  };
  this.data.collection.push(caught);
  this.data.caughtCount++;
  if (this.data.team.length < 3) {
    this.data.team.push(caught.id);
  }
  this.save();
  this.syncNow('catch-pokemon-' + pokemon.name);
  return caught;
};

DruygonProfile.prototype.hasPokemon = function(pokemonId) {
  return this.data.collection.some(function(p) { return p.id === pokemonId; });
};

DruygonProfile.prototype.getPokemon = function(pokemonId) {
  return this.data.collection.find(function(p) { return p.id === pokemonId; });
};

DruygonProfile.prototype.setTeam = function(pokemonIds) {
  this.data.team = pokemonIds.slice(0, 3);
  this.save();
};

DruygonProfile.prototype.getTeam = function() {
  var self = this;
  return this.data.team.map(function(id) { return self.getPokemon(id); }).filter(function(p) { return p; });
};

// Stats
DruygonProfile.prototype.recordGamePlay = function(gameName, correct, wrong, streak) {
  this.data.stats.gamesPlayed++;
  this.data.stats.totalCorrect += correct;
  this.data.stats.totalWrong += wrong;
  if (streak > this.data.stats.bestStreak) this.data.stats.bestStreak = streak;
  if (gameName === 'mathArena') this.data.stats.mathArenaPlays++;
  if (gameName === 'wordSearch') this.data.stats.wordSearchPlays++;
  if (gameName === 'fiveMinute') this.data.stats.fiveMinutePlays++;
  this.save();
  this.syncNow('game-complete-' + gameName);
};

DruygonProfile.prototype.addDefeated = function() {
  this.data.defeatedCount++;
  this.save();
};

DruygonProfile.prototype.unlockRoute = function(routeNum) {
  if (routeNum > this.data.currentRoute) {
    this.data.currentRoute = routeNum;
    this.save();
  }
};

DruygonProfile.prototype.isRouteUnlocked = function(routeNum) {
  var requiredLevels = { 1: 1, 2: 6, 3: 11, 4: 16 };
  return this.data.level >= requiredLevels[routeNum];
};

// Getters
DruygonProfile.prototype.get = function() { return this.data; };
DruygonProfile.prototype.getLevel = function() { return this.data.level; };
DruygonProfile.prototype.getXP = function() { return this.data.xp; };
DruygonProfile.prototype.getXPToNext = function() { return this.data.xpToNext; };
DruygonProfile.prototype.getCoins = function() { return this.data.coins; };
DruygonProfile.prototype.getPokeballs = function() { return this.data.pokeballs; };
DruygonProfile.prototype.getCollection = function() { return this.data.collection; };

// ---- Global state ----

// Load active slot (default Slot 1 = Dru)
var activeSlot = parseInt(localStorage.getItem(ACTIVE_SLOT_KEY)) || 1;
if (activeSlot < 1 || activeSlot > MAX_SLOTS) activeSlot = 1;

window.druygonProfile = new DruygonProfile(activeSlot);

// Auto-recovery: if localStorage is empty but server has data, restore it
(function autoRecover() {
  for (var s = 1; s <= MAX_SLOTS; s++) {
    (function(slot) {
      var local = localStorage.getItem(getSlotKey(slot));
      if (!local) {
        // No local data — try to load from server
        var p = new DruygonProfile(slot);
        p.loadFromServer(function(serverProfile) {
          if (serverProfile) {
            localStorage.setItem(getSlotKey(slot), JSON.stringify(serverProfile));
            console.log('[RECOVERY] Slot ' + slot + ' restored from server');
            if (slot === activeSlot) {
              window.druygonProfile = new DruygonProfile(slot);
            }
          }
        });
      }
    })(s);
  }
})();

// Initial sync: save current profile to server on page load
if (window.druygonProfile && window.druygonProfile.data && window.druygonProfile.data.level > 1) {
  window.druygonProfile.syncToServer('page-load');
}

// Slot switching
window.druygonUsers = {
  getActive: function() { return window.druygonProfile.data.name; },
  getActiveSlot: function() { return activeSlot; },
  switchSlot: function(slotNum) {
    if (slotNum < 1 || slotNum > MAX_SLOTS) return;
    localStorage.setItem(ACTIVE_SLOT_KEY, slotNum);
    activeSlot = slotNum;
    window.druygonProfile = new DruygonProfile(slotNum);
  }
};

// ---- Profile Picker ----
function showProfilePicker(onReady) {
  // If slot already chosen, skip
  if (localStorage.getItem(ACTIVE_SLOT_KEY)) {
    if (onReady) onReady();
    return;
  }

  var overlay = document.createElement('div');
  overlay.id = 'profilePicker';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(10,10,30,0.97);display:flex;align-items:center;justify-content:center;font-family:"Press Start 2P",monospace;';

  function render() {
    var html = '<div style="text-align:center;padding:20px;max-width:420px;width:90%;">' +
      '<div style="font-size:2.5rem;margin-bottom:10px;">🐉</div>' +
      '<div style="color:#FFCB05;font-size:clamp(1rem,4vw,1.3rem);margin-bottom:8px;">DRUYGON</div>' +
      '<div style="color:#aaa;font-size:0.75rem;margin-bottom:24px;font-family:sans-serif;">Siapa yang mau main?</div>';

    for (var i = 1; i <= MAX_SLOTS; i++) {
      var saved = localStorage.getItem(getSlotKey(i));
      var info = '';
      var nameLabel = SLOT_NAMES[i - 1];
      var emoji = SLOT_EMOJIS[i - 1];
      var color = SLOT_COLORS[i - 1];
      if (saved) {
        try {
          var d = JSON.parse(saved);
          nameLabel = d.name || SLOT_NAMES[i - 1];
          info = 'Lv.' + (d.level || 1) + ' | ' + (d.coins || 0) + ' Koin | ' + ((d.collection || []).length) + ' Pokemon';
        } catch(e) {}
      } else {
        info = 'Belum pernah main';
      }
      html += '<button onclick="window._pickSlot(' + i + ')" style="display:block;width:100%;padding:14px;margin-bottom:10px;font-family:\'Press Start 2P\',monospace;font-size:0.8rem;' +
        'background:linear-gradient(145deg,#2a2a4a,#1e1e3a);color:#fff;border:2px solid ' + color + ';border-radius:12px;cursor:pointer;text-align:left;' +
        'transition:transform 0.15s,box-shadow 0.15s;" ' +
        'onmouseenter="this.style.transform=\'scale(1.03)\';this.style.boxShadow=\'0 4px 20px ' + color + '40\'" ' +
        'onmouseleave="this.style.transform=\'scale(1)\';this.style.boxShadow=\'none\'">' +
        '<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:1.3rem;">' + emoji + '</span>' +
        '<div><div style="color:' + color + ';">' + nameLabel + '</div>' +
        '<div style="font-family:sans-serif;font-size:0.7rem;color:#888;margin-top:4px;">' + info + '</div></div></div></button>';
    }

    html += '</div>';
    overlay.innerHTML = html;
  }

  window._pickSlot = function(num) {
    window.druygonUsers.switchSlot(num);
    overlay.remove();
    if (onReady) onReady();
    else location.reload();
  };

  render();
  document.body.appendChild(overlay);
}
window.showProfilePicker = showProfilePicker;

// ---- Switch Player Button (for all pages) ----
window.showSwitchPlayer = function() {
  var overlay = document.createElement('div');
  overlay.id = 'switchPicker';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(10,10,30,0.95);display:flex;align-items:center;justify-content:center;font-family:"Press Start 2P",monospace;';

  var html = '<div style="text-align:center;padding:20px;max-width:400px;width:90%;">' +
    '<div style="color:#FFCB05;font-size:1rem;margin-bottom:20px;">🔄 Ganti Pemain</div>';

  for (var i = 1; i <= MAX_SLOTS; i++) {
    var saved = localStorage.getItem(getSlotKey(i));
    var nameLabel = SLOT_NAMES[i - 1];
    var emoji = SLOT_EMOJIS[i - 1];
    var color = SLOT_COLORS[i - 1];
    var info = 'Belum pernah main';
    if (saved) {
      try {
        var d = JSON.parse(saved);
        nameLabel = d.name || SLOT_NAMES[i - 1];
        info = 'Lv.' + (d.level || 1) + ' | ' + (d.coins || 0) + ' Koin';
      } catch(e) {}
    }
    var isActive = (i === activeSlot);
    html += '<button onclick="window.druygonUsers.switchSlot(' + i + ');document.getElementById(\'switchPicker\').remove();location.reload();" ' +
      'style="display:block;width:100%;padding:14px;margin-bottom:10px;font-family:\'Press Start 2P\',monospace;font-size:0.8rem;' +
      'background:' + (isActive ? 'linear-gradient(145deg,#3a3a1a,#2a2a0a)' : 'linear-gradient(145deg,#2a2a4a,#1e1e3a)') + ';' +
      'color:#fff;border:2px solid ' + (isActive ? color : '#444') + ';border-radius:10px;cursor:pointer;text-align:left;' +
      'transition:transform 0.15s;" ' +
      'onmouseenter="this.style.transform=\'scale(1.03)\'" onmouseleave="this.style.transform=\'scale(1)\'">' +
      '<span style="font-size:1.1rem;">' + (isActive ? '✅' : emoji) + '</span> ' + nameLabel +
      '<span style="font-family:sans-serif;font-size:0.65rem;color:#888;margin-left:8px;">' + info + '</span></button>';
  }

  html += '<button onclick="document.getElementById(\'switchPicker\').remove();" ' +
    'style="margin-top:12px;padding:10px 24px;background:transparent;color:#888;border:1px solid #444;border-radius:20px;font-size:0.7rem;cursor:pointer;">Batal</button>';

  html += '</div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
};

// ---- Rank / Leaderboard System ----
var RANK_TITLES = [
  { min: 0, title: 'Pemula', badge: '🥚' },
  { min: 3, title: 'Trainer Muda', badge: '🎒' },
  { min: 5, title: 'Trainer Hebat', badge: '🏅' },
  { min: 10, title: 'Trainer Pro', badge: '🥇' },
  { min: 15, title: 'Pokemon Champion', badge: '👑' },
  { min: 20, title: 'Pokemon Master', badge: '🏆' }
];

function getRankTitle(level) {
  var result = RANK_TITLES[0];
  for (var i = 0; i < RANK_TITLES.length; i++) {
    if (level >= RANK_TITLES[i].min) result = RANK_TITLES[i];
  }
  return result;
}

function getPlayerScore(data) {
  return (data.level || 1) * 1000 + (data.xp || 0) + ((data.collection || []).length * 50) + (data.stats ? (data.stats.totalCorrect || 0) : 0);
}

window.getAllPlayersRanked = function() {
  var players = [];
  for (var i = 1; i <= MAX_SLOTS; i++) {
    var saved = localStorage.getItem(getSlotKey(i));
    var data = null;
    if (saved) {
      try { data = JSON.parse(saved); } catch(e) {}
    }
    if (!data) {
      data = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
      data.name = SLOT_NAMES[i - 1];
    }
    var rank = getRankTitle(data.level || 1);
    players.push({
      slot: i,
      name: data.name || SLOT_NAMES[i - 1],
      emoji: SLOT_EMOJIS[i - 1],
      color: SLOT_COLORS[i - 1],
      level: data.level || 1,
      xp: data.xp || 0,
      coins: data.coins || 0,
      pokemon: (data.collection || []).length,
      gamesPlayed: data.stats ? (data.stats.gamesPlayed || 0) : 0,
      totalCorrect: data.stats ? (data.stats.totalCorrect || 0) : 0,
      bestStreak: data.stats ? (data.stats.bestStreak || 0) : 0,
      score: getPlayerScore(data),
      rankTitle: rank.title,
      rankBadge: rank.badge,
      isActive: (i === activeSlot)
    });
  }
  players.sort(function(a, b) { return b.score - a.score; });
  return players;
};

// ---- Reward Popup ----
function showRewardPopup(xp, coins, leveledUp) {
  var popup = document.createElement('div');
  popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
    'background:linear-gradient(145deg,#2a2a4a,#1e1e3a);border:3px solid #FFCB05;border-radius:20px;' +
    'padding:30px;z-index:1000;text-align:center;min-width:280px;box-shadow:0 10px 40px rgba(0,0,0,0.8);' +
    'animation:popIn 0.3s ease;';

  if (leveledUp) {
    popup.innerHTML = '<div style="font-family:\'Press Start 2P\',monospace;font-size:1.2rem;color:#FFCB05;margin-bottom:15px;">🎊 LEVEL UP! 🎊</div>' +
      '<div style="font-size:2.5rem;margin:15px 0;">⭐✨⭐</div>' +
      '<div style="font-size:1.5rem;font-weight:900;color:#fff;margin-bottom:10px;">Level ' + window.druygonProfile.getLevel() + '</div>' +
      '<div style="color:#8BC34A;font-size:1.1rem;margin-top:10px;">+' + xp + ' XP<br>+' + coins + ' Koin</div>';
  } else {
    popup.innerHTML = '<div style="font-size:1.8rem;margin-bottom:10px;">🎁</div>' +
      '<div style="color:#8BC34A;font-size:1.3rem;font-weight:900;">' +
      (xp > 0 ? '+' + xp + ' XP<br>' : '') +
      (coins > 0 ? '+' + coins + ' Koin' : '') +
      '</div>';
  }

  var style = document.createElement('style');
  style.textContent = '@keyframes popIn{0%{transform:translate(-50%,-50%) scale(0);opacity:0}50%{transform:translate(-50%,-50%) scale(1.1)}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}';
  document.head.appendChild(style);
  document.body.appendChild(popup);

  setTimeout(function() {
    popup.style.transition = 'all 0.3s';
    popup.style.opacity = '0';
    popup.style.transform = 'translate(-50%,-50%) scale(0.8)';
    setTimeout(function() { popup.remove(); }, 300);
  }, leveledUp ? 3000 : 2000);
}
window.showRewardPopup = showRewardPopup;
