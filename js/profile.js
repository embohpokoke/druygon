(function(window, document) {
  var SLOT_CONFIG = [
    { id: 1, name: 'Dru', emoji: '🐉', color: '#FFCB05' },
    { id: 2, name: 'Oming', emoji: '🦖', color: '#FF6B35' },
    { id: 3, name: 'Reymar', emoji: '🐺', color: '#00BCD4' },
    { id: 4, name: 'Illy', emoji: '🦈', color: '#4FC3F7' },
    { id: 5, name: 'Extra', emoji: '🦅', color: '#9C27B0' }
  ];
  var ACTIVE_SLOT_KEY = 'druygon_active_slot';
  var SLOT_PREFIX = 'druygon_slot_';
  var LEGACY_SLOT_PREFIX = 'druygon_profile_slot_';
  var SYNC_SAVE_URL = '/api/druygon/profile/save';
  var SYNC_LOAD_URL = '/api/druygon/profile/load/';
  var MAX_SLOTS = 5;
  var ROUTE_LEVELS = { 1: 1, 2: 6, 3: 11, 4: 16 };
  var activeSlot = null;

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

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isArray(value) {
    return Object.prototype.toString.call(value) === '[object Array]';
  }

  function safeParse(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }

  function isNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function toNumber(value, fallback) {
    var num = Number(value);
    return isNaN(num) ? fallback : num;
  }

  function toInt(value, fallback) {
    var num = parseInt(value, 10);
    return isNaN(num) ? fallback : num;
  }

  function isValidSlot(slotNum) {
    var slot = toInt(slotNum, 0);
    return slot >= 1 && slot <= MAX_SLOTS;
  }

  function getSlotKey(slotNum) {
    return SLOT_PREFIX + slotNum;
  }

  function getSlotConfig(slotNum) {
    return SLOT_CONFIG[slotNum - 1] || SLOT_CONFIG[0];
  }

  function setCookie(name, value, days) {
    var expires = '';
    var date;
    if (days) {
      date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
  }

  function getCookie(name) {
    var prefix = name + '=';
    var parts = document.cookie ? document.cookie.split(';') : [];
    var i;
    var part;
    for (i = 0; i < parts.length; i++) {
      part = parts[i].replace(/^\s+/, '');
      if (part.indexOf(prefix) === 0) {
        return decodeURIComponent(part.substring(prefix.length));
      }
    }
    return '';
  }

  function setStoredActiveSlot(slotNum) {
    if (!isValidSlot(slotNum)) return;
    try {
      localStorage.setItem(ACTIVE_SLOT_KEY, String(slotNum));
    } catch (error) {}
    setCookie(ACTIVE_SLOT_KEY, String(slotNum), 365);
  }

  function clearStoredActiveSlot() {
    try {
      localStorage.removeItem(ACTIVE_SLOT_KEY);
    } catch (error) {}
    setCookie(ACTIVE_SLOT_KEY, '', -1);
  }

  function mapLegacyActiveSlot(value) {
    var slot = toInt(value, 0);
    var text;
    var i;
    if (isValidSlot(slot)) return slot;
    if (typeof value !== 'string') return null;
    text = value.toLowerCase();
    for (i = 0; i < SLOT_CONFIG.length; i++) {
      if (text === SLOT_CONFIG[i].name.toLowerCase() || text === SLOT_CONFIG[i].name.toLowerCase() + SLOT_CONFIG[i].emoji.toLowerCase()) {
        return SLOT_CONFIG[i].id;
      }
    }
    if (text === 'dru') return 1;
    if (text === 'oming') return 2;
    if (text === 'reymar') return 3;
    if (text === 'illy') return 4;
    if (text === 'extra') return 5;
    return null;
  }

  function getStoredActiveSlot() {
    var localValue;
    var cookieValue;
    var legacyValue;
    try {
      localValue = localStorage.getItem(ACTIVE_SLOT_KEY);
    } catch (error) {
      localValue = null;
    }
    if (isValidSlot(localValue)) return toInt(localValue, null);

    cookieValue = getCookie(ACTIVE_SLOT_KEY);
    if (isValidSlot(cookieValue)) return toInt(cookieValue, null);

    try {
      legacyValue = localStorage.getItem('druygon_active_user');
    } catch (error2) {
      legacyValue = null;
    }
    return mapLegacyActiveSlot(legacyValue);
  }

  function createDefaultProfile(slotNum) {
    var profile = clone(DEFAULT_PROFILE);
    profile.name = getSlotConfig(slotNum).name;
    return profile;
  }

  function normalizePokemonEntry(entry) {
    var source = entry && typeof entry === 'object' ? entry : {};
    var id = source.id;
    if (id === undefined || id === null || id === '') return null;
    return {
      id: id,
      name: source.name || String(id),
      emoji: source.emoji || '⚡',
      type: source.type || '',
      rarity: source.rarity || 'common',
      cp: Math.max(0, toInt(source.cp, 0)),
      level: Math.max(1, toInt(source.level, 1)),
      caughtAt: source.caughtAt || '',
      route: Math.max(1, toInt(source.route, 1))
    };
  }

  function mergePokemonEntry(left, right) {
    var a = normalizePokemonEntry(left);
    var b = normalizePokemonEntry(right);
    if (!a) return b;
    if (!b) return a;
    if (b.cp > a.cp) a.cp = b.cp;
    if (b.level > a.level) a.level = b.level;
    if (!a.emoji && b.emoji) a.emoji = b.emoji;
    if (!a.type && b.type) a.type = b.type;
    if (!a.rarity && b.rarity) a.rarity = b.rarity;
    if (!a.caughtAt || (b.caughtAt && b.caughtAt > a.caughtAt)) a.caughtAt = b.caughtAt;
    if (b.route > a.route) a.route = b.route;
    if (!a.name && b.name) a.name = b.name;
    return a;
  }

  function normalizeCollection(list) {
    var collection = isArray(list) ? list : [];
    var unique = [];
    var indexById = {};
    var i;
    var normalized;
    var key;
    for (i = 0; i < collection.length; i++) {
      normalized = normalizePokemonEntry(collection[i]);
      if (!normalized) continue;
      key = String(normalized.id);
      if (indexById[key] === undefined) {
        indexById[key] = unique.length;
        unique.push(normalized);
      } else {
        unique[indexById[key]] = mergePokemonEntry(unique[indexById[key]], normalized);
      }
    }
    return unique;
  }

  function mergeCollections(primary, secondary) {
    var merged = normalizeCollection(primary);
    var additions = normalizeCollection(secondary);
    var i;
    var j;
    var existing;
    for (i = 0; i < additions.length; i++) {
      existing = -1;
      for (j = 0; j < merged.length; j++) {
        if (String(merged[j].id) === String(additions[i].id)) {
          existing = j;
          break;
        }
      }
      if (existing === -1) {
        merged.push(additions[i]);
      } else {
        merged[existing] = mergePokemonEntry(merged[existing], additions[i]);
      }
    }
    return merged;
  }

  function mergeUniqueStrings(primary, secondary) {
    var result = [];
    var seen = {};
    var lists = [isArray(primary) ? primary : [], isArray(secondary) ? secondary : []];
    var i;
    var j;
    var value;
    for (i = 0; i < lists.length; i++) {
      for (j = 0; j < lists[i].length; j++) {
        value = lists[i][j];
        if (value === undefined || value === null || value === '') continue;
        value = String(value);
        if (!seen[value]) {
          seen[value] = true;
          result.push(value);
        }
      }
    }
    return result;
  }

  function clampTeam(team, collection) {
    var list = isArray(team) ? team : [];
    var available = normalizeCollection(collection);
    var result = [];
    var seen = {};
    var i;
    var j;
    var id;
    var found;
    for (i = 0; i < list.length && result.length < 3; i++) {
      id = list[i];
      found = false;
      for (j = 0; j < available.length; j++) {
        if (String(available[j].id) === String(id)) {
          found = true;
          id = available[j].id;
          break;
        }
      }
      if (found && !seen[String(id)]) {
        seen[String(id)] = true;
        result.push(id);
      }
    }
    return result;
  }

  function normalizeProfileData(input, slotNum) {
    var source = input && typeof input === 'object' ? input : {};
    var profile = createDefaultProfile(slotNum);
    var stats = source.stats && typeof source.stats === 'object' ? source.stats : {};
    var pokeballs = source.pokeballs && typeof source.pokeballs === 'object' ? source.pokeballs : {};
    var collection;

    if (typeof source.name === 'string' && source.name) {
      profile.name = source.name;
    }

    profile.level = Math.max(1, toInt(source.level, 1));
    profile.xp = Math.max(0, toInt(source.xp, 0));
    profile.xpToNext = Math.max(profile.level * 100, toInt(source.xpToNext || source.xpRequired, profile.level * 100));
    if (profile.xp >= profile.xpToNext) {
      profile.xp = profile.xpToNext - 1;
      if (profile.xp < 0) profile.xp = 0;
    }

    profile.coins = Math.max(0, toInt(source.coins, 0));
    profile.pokeballs.pokeball = Math.max(0, toInt(pokeballs.pokeball, profile.pokeballs.pokeball));
    profile.pokeballs.greatball = Math.max(0, toInt(pokeballs.greatball, profile.pokeballs.greatball));
    profile.pokeballs.ultraball = Math.max(0, toInt(pokeballs.ultraball, profile.pokeballs.ultraball));
    profile.pokeballs.masterball = Math.max(0, toInt(pokeballs.masterball, profile.pokeballs.masterball));

    collection = normalizeCollection(source.collection);
    profile.collection = collection;
    profile.team = clampTeam(source.team, collection);
    profile.defeatedCount = Math.max(0, toInt(source.defeatedCount, 0));
    profile.caughtCount = Math.max(collection.length, toInt(source.caughtCount, collection.length));
    profile.currentRoute = Math.max(1, toInt(source.currentRoute, 1));
    profile.badges = mergeUniqueStrings(source.badges, []);

    profile.stats.totalCorrect = Math.max(0, toInt(stats.totalCorrect, 0));
    profile.stats.totalWrong = Math.max(0, toInt(stats.totalWrong, 0));
    profile.stats.gamesPlayed = Math.max(0, toInt(stats.gamesPlayed, 0));
    profile.stats.bestStreak = Math.max(0, toInt(stats.bestStreak, 0));
    profile.stats.mathArenaPlays = Math.max(0, toInt(stats.mathArenaPlays, 0));
    profile.stats.wordSearchPlays = Math.max(0, toInt(stats.wordSearchPlays, 0));
    profile.stats.fiveMinutePlays = Math.max(0, toInt(stats.fiveMinutePlays, 0));

    return profile;
  }

  function mergeProfiles(localData, serverData, slotNum) {
    var localProfile = normalizeProfileData(localData, slotNum);
    var serverProfile = normalizeProfileData(serverData, slotNum);
    var merged = createDefaultProfile(slotNum);
    var localCollection = localProfile.collection || [];
    var serverCollection = serverProfile.collection || [];
    var localCollectionCount = localCollection.length;
    var serverCollectionCount = serverCollection.length;
    var preferredTeamSource;
    var preferredXpSource;

    merged.name = localProfile.name || serverProfile.name || merged.name;
    merged.level = Math.max(localProfile.level, serverProfile.level);
    preferredXpSource = localProfile.level > serverProfile.level ? localProfile : serverProfile.level > localProfile.level ? serverProfile : null;
    merged.xp = preferredXpSource ? preferredXpSource.xp : Math.max(localProfile.xp, serverProfile.xp);
    merged.xpToNext = Math.max(merged.level * 100, localProfile.xpToNext, serverProfile.xpToNext);
    if (merged.xp >= merged.xpToNext) {
      merged.xp = merged.xpToNext - 1;
      if (merged.xp < 0) merged.xp = 0;
    }

    merged.coins = Math.max(localProfile.coins, serverProfile.coins);
    merged.pokeballs.pokeball = Math.max(localProfile.pokeballs.pokeball, serverProfile.pokeballs.pokeball);
    merged.pokeballs.greatball = Math.max(localProfile.pokeballs.greatball, serverProfile.pokeballs.greatball);
    merged.pokeballs.ultraball = Math.max(localProfile.pokeballs.ultraball, serverProfile.pokeballs.ultraball);
    merged.pokeballs.masterball = Math.max(localProfile.pokeballs.masterball, serverProfile.pokeballs.masterball);

    if (localCollectionCount >= serverCollectionCount) {
      merged.collection = mergeCollections(localCollection, serverCollection);
      preferredTeamSource = localProfile;
    } else {
      merged.collection = mergeCollections(serverCollection, localCollection);
      preferredTeamSource = serverProfile;
    }
    merged.caughtCount = Math.max(merged.collection.length, localProfile.caughtCount, serverProfile.caughtCount);
    merged.team = clampTeam(preferredTeamSource.team, merged.collection);
    if (merged.team.length === 0) {
      merged.team = clampTeam(localProfile.team.length >= serverProfile.team.length ? localProfile.team : serverProfile.team, merged.collection);
    }

    merged.defeatedCount = Math.max(localProfile.defeatedCount, serverProfile.defeatedCount);
    merged.currentRoute = Math.max(localProfile.currentRoute, serverProfile.currentRoute);
    merged.badges = mergeUniqueStrings(localProfile.badges, serverProfile.badges);

    merged.stats.totalCorrect = Math.max(localProfile.stats.totalCorrect, serverProfile.stats.totalCorrect);
    merged.stats.totalWrong = Math.max(localProfile.stats.totalWrong, serverProfile.stats.totalWrong);
    merged.stats.gamesPlayed = Math.max(localProfile.stats.gamesPlayed, serverProfile.stats.gamesPlayed);
    merged.stats.bestStreak = Math.max(localProfile.stats.bestStreak, serverProfile.stats.bestStreak);
    merged.stats.mathArenaPlays = Math.max(localProfile.stats.mathArenaPlays, serverProfile.stats.mathArenaPlays);
    merged.stats.wordSearchPlays = Math.max(localProfile.stats.wordSearchPlays, serverProfile.stats.wordSearchPlays);
    merged.stats.fiveMinutePlays = Math.max(localProfile.stats.fiveMinutePlays, serverProfile.stats.fiveMinutePlays);

    return normalizeProfileData(merged, slotNum);
  }

  function hasProgress(profile) {
    var data = normalizeProfileData(profile, 1);
    return data.level > 1 ||
      data.xp > 0 ||
      data.coins > 0 ||
      data.collection.length > 0 ||
      data.badges.length > 0 ||
      data.stats.gamesPlayed > 0 ||
      data.stats.totalCorrect > 0 ||
      data.stats.mathArenaPlays > 0 ||
      data.stats.wordSearchPlays > 0 ||
      data.stats.fiveMinutePlays > 0;
  }

  function getProfileScore(profile) {
    var data = normalizeProfileData(profile, 1);
    return (data.level * 1000) + data.xp + (data.collection.length * 50) + data.stats.totalCorrect;
  }

  function getLegacyUsersProfile(slotNum) {
    var raw;
    var parsed;
    var key = getSlotConfig(slotNum).name.toLowerCase();
    try {
      raw = localStorage.getItem('druygon_users');
    } catch (error) {
      raw = null;
    }
    parsed = safeParse(raw);
    if (!parsed) return null;

    if (isArray(parsed)) {
      if (parsed[slotNum - 1]) return parsed[slotNum - 1].profile || parsed[slotNum - 1];
      return null;
    }

    if (parsed[key]) return parsed[key].profile || parsed[key];
    if (parsed[String(slotNum)]) return parsed[String(slotNum)].profile || parsed[String(slotNum)];
    if (parsed.slots && parsed.slots[slotNum - 1]) return parsed.slots[slotNum - 1].profile || parsed.slots[slotNum - 1];
    return null;
  }

  function migrateLegacyStorage() {
    var i;
    var currentRaw;
    var legacyRaw;
    var singleRaw;
    var usersRaw;
    var currentProfile;
    var legacyProfile;
    var activeFromLegacy = getStoredActiveSlot();

    for (i = 1; i <= MAX_SLOTS; i++) {
      currentRaw = null;
      legacyRaw = null;
      singleRaw = null;
      usersRaw = null;

      try {
        currentRaw = localStorage.getItem(getSlotKey(i));
      } catch (error1) {}
      try {
        legacyRaw = localStorage.getItem(LEGACY_SLOT_PREFIX + i);
      } catch (error2) {}
      if (i === 1) {
        try {
          singleRaw = localStorage.getItem('druygon_profile') || localStorage.getItem('druygon_profile_dru');
        } catch (error3) {}
      }
      usersRaw = getLegacyUsersProfile(i);

      currentProfile = safeParse(currentRaw);
      legacyProfile = null;

      if (legacyRaw) legacyProfile = mergeProfiles(legacyProfile || createDefaultProfile(i), safeParse(legacyRaw), i);
      if (singleRaw) legacyProfile = mergeProfiles(legacyProfile || createDefaultProfile(i), safeParse(singleRaw), i);
      if (usersRaw) legacyProfile = mergeProfiles(legacyProfile || createDefaultProfile(i), usersRaw, i);

      if (legacyProfile) {
        if (currentProfile) {
          currentProfile = mergeProfiles(currentProfile, legacyProfile, i);
        } else {
          currentProfile = legacyProfile;
        }
        try {
          localStorage.setItem(getSlotKey(i), JSON.stringify(currentProfile));
        } catch (error4) {}
      }

      try {
        localStorage.removeItem(LEGACY_SLOT_PREFIX + i);
      } catch (error5) {}
    }

    try {
      localStorage.removeItem('druygon_profile');
      localStorage.removeItem('druygon_profile_dru');
      localStorage.removeItem('druygon_users');
      localStorage.removeItem('druygon_active_user');
    } catch (error6) {}

    if (isValidSlot(activeFromLegacy)) {
      setStoredActiveSlot(activeFromLegacy);
    }
  }

  function dispatchProfileEvent(eventName) {
    var evt;
    try {
      evt = document.createEvent('Event');
      evt.initEvent(eventName, true, true);
      evt.slot = activeSlot;
      window.dispatchEvent(evt);
    } catch (error) {}
  }

  function DruygonProfile(slotNum) {
    this.slotNum = isValidSlot(slotNum) ? toInt(slotNum, 1) : 1;
    this.slotKey = getSlotKey(this.slotNum);
    this.data = createDefaultProfile(this.slotNum);
    this._syncTimer = null;
    this.load();
  }

  DruygonProfile.prototype.load = function() {
    var saved;
    var parsed;
    try {
      saved = localStorage.getItem(this.slotKey);
    } catch (error) {
      saved = null;
    }
    parsed = safeParse(saved);
    this.data = normalizeProfileData(parsed || createDefaultProfile(this.slotNum), this.slotNum);
    return this.data;
  };

  DruygonProfile.prototype.save = function() {
    this.data = normalizeProfileData(this.data, this.slotNum);
    try {
      localStorage.setItem(this.slotKey, JSON.stringify(this.data));
      return true;
    } catch (error) {
      return false;
    }
  };

  DruygonProfile.prototype.syncNow = function(event) {
    var self = this;
    var payload;
    var xhr;
    this.save();
    payload = JSON.stringify({
      slot: self.slotNum,
      profile: self.data,
      event: event || 'manual-save'
    });
    try {
      xhr = new XMLHttpRequest();
      xhr.open('POST', SYNC_SAVE_URL, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(payload);
    } catch (error) {}
  };

  DruygonProfile.prototype.syncToServer = function(event) {
    var self = this;
    if (this._syncTimer) {
      clearTimeout(this._syncTimer);
    }
    this._syncTimer = setTimeout(function() {
      self._syncTimer = null;
      self.syncNow(event || 'auto-save');
    }, 2000);
  };

  DruygonProfile.prototype.loadFromServer = function(callback) {
    var xhr;
    var self = this;
    var done = typeof callback === 'function' ? callback : function() {};

    try {
      xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        var response;
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          response = safeParse(xhr.responseText);
          if (response && response.success && response.profile) {
            done(normalizeProfileData(response.profile, self.slotNum));
            return;
          }
          if (response && response.profile) {
            done(normalizeProfileData(response.profile, self.slotNum));
            return;
          }
        }
        done(null);
      };
      xhr.open('GET', SYNC_LOAD_URL + self.slotNum, true);
      xhr.send();
    } catch (error) {
      done(null);
    }
  };

  DruygonProfile.prototype.mergeFromServer = function(callback) {
    var self = this;
    var done = typeof callback === 'function' ? callback : function() {};
    this.loadFromServer(function(serverProfile) {
      var merged;
      if (!serverProfile) {
        done(self.data);
        return;
      }
      merged = mergeProfiles(self.data, serverProfile, self.slotNum);
      self.data = merged;
      self.save();
      if (activeSlot === self.slotNum) {
        window.druygonProfile = self;
      }
      dispatchProfileEvent('druygon:profile-updated');
      done(self.data);
    });
  };

  DruygonProfile.prototype.reset = function() {
    this.data = createDefaultProfile(this.slotNum);
    this.save();
    this.syncToServer('reset-profile');
  };

  DruygonProfile.prototype.get = function() {
    return this.data;
  };

  DruygonProfile.prototype.getLevel = function() {
    return this.data.level;
  };

  DruygonProfile.prototype.getXP = function() {
    return this.data.xp;
  };

  DruygonProfile.prototype.getXPToNext = function() {
    return this.data.xpToNext;
  };

  DruygonProfile.prototype.getCoins = function() {
    return this.data.coins;
  };

  DruygonProfile.prototype.getPokeballs = function() {
    return this.data.pokeballs;
  };

  DruygonProfile.prototype.getCollection = function() {
    return this.data.collection;
  };

  DruygonProfile.prototype.addXP = function(amount) {
    var gained = Math.max(0, toInt(amount, 0));
    var leveledUp = false;
    this.data.xp += gained;
    while (this.data.xp >= this.data.xpToNext) {
      this.data.xp -= this.data.xpToNext;
      this.data.level += 1;
      this.data.xpToNext = this.data.level * 100;
      leveledUp = true;
    }
    this.save();
    this.syncToServer(leveledUp ? 'level-up' : 'gain-xp');
    dispatchProfileEvent('druygon:profile-updated');
    return leveledUp;
  };

  DruygonProfile.prototype.addCoins = function(amount) {
    var gained = Math.max(0, toInt(amount, 0));
    this.data.coins += gained;
    this.save();
    this.syncToServer('gain-coins');
    dispatchProfileEvent('druygon:profile-updated');
  };

  DruygonProfile.prototype.spendCoins = function(amount) {
    var spent = Math.max(0, toInt(amount, 0));
    if (this.data.coins < spent) return false;
    this.data.coins -= spent;
    this.save();
    this.syncToServer('spend-coins');
    dispatchProfileEvent('druygon:profile-updated');
    return true;
  };

  DruygonProfile.prototype.addPokeball = function(type, count) {
    var amount = Math.max(1, toInt(count, 1));
    if (!this.data.pokeballs[type]) this.data.pokeballs[type] = 0;
    this.data.pokeballs[type] += amount;
    this.save();
    this.syncToServer('add-pokeball');
    dispatchProfileEvent('druygon:profile-updated');
  };

  DruygonProfile.prototype.usePokeball = function(type) {
    if (!this.data.pokeballs[type] || this.data.pokeballs[type] <= 0) return false;
    this.data.pokeballs[type] -= 1;
    this.save();
    this.syncToServer('use-pokeball');
    dispatchProfileEvent('druygon:profile-updated');
    return true;
  };

  DruygonProfile.prototype.hasPokemon = function(pokemonId) {
    var i;
    for (i = 0; i < this.data.collection.length; i++) {
      if (String(this.data.collection[i].id) === String(pokemonId)) return true;
    }
    return false;
  };

  DruygonProfile.prototype.getPokemon = function(pokemonId) {
    var i;
    for (i = 0; i < this.data.collection.length; i++) {
      if (String(this.data.collection[i].id) === String(pokemonId)) return this.data.collection[i];
    }
    return null;
  };

  DruygonProfile.prototype.setTeam = function(pokemonIds) {
    this.data.team = clampTeam(pokemonIds, this.data.collection);
    this.save();
    this.syncToServer('set-team');
    dispatchProfileEvent('druygon:profile-updated');
  };

  DruygonProfile.prototype.getTeam = function() {
    var team = [];
    var i;
    var pokemon;
    for (i = 0; i < this.data.team.length; i++) {
      pokemon = this.getPokemon(this.data.team[i]);
      if (pokemon) team.push(pokemon);
    }
    return team;
  };

  DruygonProfile.prototype.catchPokemon = function(pokemon) {
    var normalized = normalizePokemonEntry({
      id: pokemon.id,
      name: pokemon.name,
      emoji: pokemon.emoji,
      type: pokemon.type,
      rarity: pokemon.rarity,
      cp: Math.floor((toNumber(pokemon.baseHP, 0) * 0.8) + (toNumber(pokemon.attack, 0) * 0.3) + (toNumber(pokemon.level, 1) * 5)),
      level: Math.max(1, toInt(pokemon.level, 1)),
      caughtAt: new Date().toISOString(),
      route: Math.max(1, toInt(pokemon.route, this.data.currentRoute))
    });
    var existingIndex = -1;
    var i;

    for (i = 0; i < this.data.collection.length; i++) {
      if (String(this.data.collection[i].id) === String(normalized.id)) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex === -1) {
      this.data.collection.push(normalized);
    } else {
      this.data.collection[existingIndex] = mergePokemonEntry(this.data.collection[existingIndex], normalized);
      normalized = this.data.collection[existingIndex];
    }

    this.data.caughtCount = this.data.collection.length;
    if (this.data.team.length < 3 && !this.hasPokemonInTeam(normalized.id)) {
      this.data.team.push(normalized.id);
    }

    this.save();
    this.syncNow('catch-pokemon');
    dispatchProfileEvent('druygon:profile-updated');
    return normalized;
  };

  DruygonProfile.prototype.hasPokemonInTeam = function(pokemonId) {
    var i;
    for (i = 0; i < this.data.team.length; i++) {
      if (String(this.data.team[i]) === String(pokemonId)) return true;
    }
    return false;
  };

  DruygonProfile.prototype.recordGamePlay = function(gameName, correct, wrong, streak) {
    this.data.stats.gamesPlayed += 1;
    this.data.stats.totalCorrect += Math.max(0, toInt(correct, 0));
    this.data.stats.totalWrong += Math.max(0, toInt(wrong, 0));
    if (toInt(streak, 0) > this.data.stats.bestStreak) {
      this.data.stats.bestStreak = Math.max(0, toInt(streak, 0));
    }
    if (gameName === 'mathArena') this.data.stats.mathArenaPlays += 1;
    if (gameName === 'wordSearch') this.data.stats.wordSearchPlays += 1;
    if (gameName === 'fiveMinute') this.data.stats.fiveMinutePlays += 1;
    this.save();
    this.syncNow('game-complete-' + gameName);
    dispatchProfileEvent('druygon:profile-updated');
  };

  DruygonProfile.prototype.addDefeated = function() {
    this.data.defeatedCount += 1;
    this.save();
    this.syncToServer('defeat-pokemon');
    dispatchProfileEvent('druygon:profile-updated');
  };

  DruygonProfile.prototype.unlockRoute = function(routeNum) {
    var route = Math.max(1, toInt(routeNum, 1));
    if (route > this.data.currentRoute) {
      this.data.currentRoute = route;
      this.save();
      this.syncToServer('unlock-route');
      dispatchProfileEvent('druygon:profile-updated');
    }
  };

  DruygonProfile.prototype.isRouteUnlocked = function(routeNum) {
    var route = Math.max(1, toInt(routeNum, 1));
    return this.data.level >= (ROUTE_LEVELS[route] || 1);
  };

  function createProfileInstance(slotNum) {
    var slot = isValidSlot(slotNum) ? toInt(slotNum, 1) : 1;
    return new DruygonProfile(slot);
  }

  function activateSlot(slotNum) {
    var slot = toInt(slotNum, 0);
    if (!isValidSlot(slot)) return null;
    activeSlot = slot;
    setStoredActiveSlot(slot);
    window.druygonProfile = createProfileInstance(slot);
    dispatchProfileEvent('druygon:slot-changed');
    window.druygonProfile.mergeFromServer(function() {
      dispatchProfileEvent('druygon:profile-ready');
    });
    return window.druygonProfile;
  }

  function getSlotSummary(slotNum) {
    var raw;
    var parsed;
    var profile;
    try {
      raw = localStorage.getItem(getSlotKey(slotNum));
    } catch (error) {
      raw = null;
    }
    parsed = safeParse(raw);
    if (!parsed) {
      return 'Belum pernah main';
    }
    profile = normalizeProfileData(parsed, slotNum);
    return 'Lv.' + profile.level + ' | ' + profile.coins + ' Koin | ' + profile.collection.length + ' Pokemon';
  }

  function removePicker() {
    var existing = document.getElementById('druygon-profile-picker');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  }

  function buildPickerHtml(options) {
    var html = '';
    var i;
    var slot;
    var isCurrent;
    html += '<div style="position:absolute;inset:0;background:rgba(8,7,20,0.92);backdrop-filter:blur(8px);"></div>';
    html += '<div style="position:relative;z-index:1;background:linear-gradient(145deg,#1f1c39,#0f0c22);border:2px solid #FFCB05;border-radius:22px;padding:24px;max-width:680px;width:92%;box-shadow:0 20px 60px rgba(0,0,0,0.45);">';
    html += '<div style="text-align:center;margin-bottom:18px;">';
    html += '<div style="font-size:30px;margin-bottom:8px;">🐉</div>';
    html += '<div style="font-family:inherit;font-weight:800;font-size:22px;color:#FFCB05;">' + options.title + '</div>';
    html += '<div style="color:rgba(255,255,255,0.72);font-size:14px;margin-top:6px;">' + options.subtitle + '</div>';
    html += '</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">';
    for (i = 0; i < SLOT_CONFIG.length; i++) {
      slot = SLOT_CONFIG[i];
      isCurrent = activeSlot === slot.id;
      html += '<button type="button" data-slot="' + slot.id + '" style="background:linear-gradient(145deg,#25223f,#16142a);border:2px solid ' + (isCurrent ? slot.color : 'rgba(255,255,255,0.12)') + ';border-radius:16px;color:#fff;padding:16px;text-align:left;cursor:pointer;">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;">';
      html += '<div style="font-size:26px;">' + slot.emoji + '</div>';
      html += isCurrent && options.allowCancel ? '<div style="font-size:11px;background:' + slot.color + ';color:#111;padding:3px 8px;border-radius:999px;font-weight:700;">ACTIVE</div>' : '';
      html += '</div>';
      html += '<div style="font-weight:800;color:' + slot.color + ';font-size:16px;">' + slot.name + '</div>';
      html += '<div style="font-size:12px;color:rgba(255,255,255,0.72);margin-top:6px;line-height:1.5;">' + getSlotSummary(slot.id) + '</div>';
      html += '</button>';
    }
    html += '</div>';
    if (options.allowCancel) {
      html += '<div style="text-align:center;margin-top:16px;">';
      html += '<button type="button" data-close-picker="1" style="background:transparent;border:1px solid rgba(255,255,255,0.18);color:rgba(255,255,255,0.72);padding:10px 18px;border-radius:999px;cursor:pointer;">Batal</button>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderPicker(options) {
    var overlay;
    var buttons;
    var closeButton;
    var i;
    removePicker();
    if (!document.body) return false;
    overlay = document.createElement('div');
    overlay.id = 'druygon-profile-picker';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,sans-serif;';
    overlay.innerHTML = buildPickerHtml(options);
    document.body.appendChild(overlay);

    buttons = overlay.querySelectorAll('[data-slot]');
    for (i = 0; i < buttons.length; i++) {
      buttons[i].onclick = function() {
        var slot = toInt(this.getAttribute('data-slot'), 0);
        var profile = activateSlot(slot);
        removePicker();
        if (typeof options.onReady === 'function') {
          if (profile) {
            profile.mergeFromServer(function() {
              options.onReady(window.druygonProfile);
            });
          } else {
            options.onReady(window.druygonProfile);
          }
        } else {
          window.location.reload();
        }
      };
    }

    closeButton = overlay.querySelector('[data-close-picker]');
    if (closeButton) {
      closeButton.onclick = function() {
        removePicker();
      };
    }

    return true;
  }

  function showProfilePicker(onReady) {
    var stored = getStoredActiveSlot();
    if (isValidSlot(stored)) {
      activeSlot = toInt(stored, null);
      setStoredActiveSlot(activeSlot);
      if (typeof onReady === 'function') onReady(window.druygonProfile);
      return false;
    }
    clearStoredActiveSlot();
    activeSlot = null;
    return renderPicker({
      title: 'Pilih Pemain',
      subtitle: 'Siapa yang mau main hari ini?',
      allowCancel: false,
      onReady: onReady
    });
  }

  function showSwitchPlayer() {
    return renderPicker({
      title: 'Ganti Pemain',
      subtitle: 'Pilih slot lain untuk lanjut petualangan.',
      allowCancel: true
    });
  }

  function getRankTitle(level) {
    if (level >= 20) return { title: 'Pokemon Master', badge: '🏆' };
    if (level >= 15) return { title: 'Pokemon Champion', badge: '👑' };
    if (level >= 10) return { title: 'Trainer Pro', badge: '🥇' };
    if (level >= 5) return { title: 'Trainer Hebat', badge: '🏅' };
    if (level >= 3) return { title: 'Trainer Muda', badge: '🎒' };
    return { title: 'Pemula', badge: '🥚' };
  }

  function getAllPlayersRanked() {
    var players = [];
    var i;
    var raw;
    var parsed;
    var profile;
    var rank;
    for (i = 1; i <= MAX_SLOTS; i++) {
      try {
        raw = localStorage.getItem(getSlotKey(i));
      } catch (error) {
        raw = null;
      }
      parsed = safeParse(raw);
      if (!parsed || !hasProgress(parsed)) continue;
      profile = normalizeProfileData(parsed, i);
      rank = getRankTitle(profile.level);
      players.push({
        slot: i,
        name: profile.name || getSlotConfig(i).name,
        emoji: getSlotConfig(i).emoji,
        color: getSlotConfig(i).color,
        level: profile.level,
        xp: profile.xp,
        coins: profile.coins,
        pokemon: profile.collection.length,
        gamesPlayed: profile.stats.gamesPlayed,
        totalCorrect: profile.stats.totalCorrect,
        bestStreak: profile.stats.bestStreak,
        score: getProfileScore(profile),
        rankTitle: rank.title,
        rankBadge: rank.badge,
        isActive: activeSlot === i
      });
    }
    players.sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.slot - b.slot;
    });
    return players;
  }

  function showRewardPopup(xp, coins, leveledUp) {
    var popup = document.createElement('div');
    var style = document.createElement('style');
    popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(145deg,#2a2a4a,#1e1e3a);border:3px solid #FFCB05;border-radius:20px;padding:28px;z-index:10000;text-align:center;min-width:280px;box-shadow:0 12px 40px rgba(0,0,0,0.8);animation:druygonRewardPop 0.25s ease;';
    if (leveledUp) {
      popup.innerHTML = '<div style="font-size:18px;font-weight:800;color:#FFCB05;">LEVEL UP!</div>' +
        '<div style="font-size:38px;margin:14px 0;">⭐✨⭐</div>' +
        '<div style="font-size:24px;font-weight:900;color:#fff;">Level ' + window.druygonProfile.getLevel() + '</div>' +
        '<div style="color:#8BC34A;font-size:18px;margin-top:12px;">+' + xp + ' XP<br>+' + coins + ' Koin</div>';
    } else {
      popup.innerHTML = '<div style="font-size:34px;margin-bottom:10px;">🎁</div>' +
        '<div style="color:#8BC34A;font-size:20px;font-weight:900;">' +
        (xp > 0 ? '+' + xp + ' XP' : '') +
        (xp > 0 && coins > 0 ? '<br>' : '') +
        (coins > 0 ? '+' + coins + ' Koin' : '') +
        '</div>';
    }

    style.textContent = '@keyframes druygonRewardPop{0%{transform:translate(-50%,-50%) scale(0.8);opacity:0}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}';
    document.head.appendChild(style);
    document.body.appendChild(popup);

    setTimeout(function() {
      popup.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      popup.style.opacity = '0';
      popup.style.transform = 'translate(-50%,-50%) scale(0.92)';
      setTimeout(function() {
        if (popup.parentNode) popup.parentNode.removeChild(popup);
        if (style.parentNode) style.parentNode.removeChild(style);
      }, 250);
    }, leveledUp ? 3000 : 2000);
  }

  function initProfileSystem() {
    var stored = getStoredActiveSlot();
    if (isValidSlot(stored)) {
      activeSlot = toInt(stored, null);
      setStoredActiveSlot(activeSlot);
      if (!window.druygonProfile || window.druygonProfile.slotNum !== activeSlot) {
        window.druygonProfile = createProfileInstance(activeSlot);
      }
      dispatchProfileEvent('druygon:profile-ready');
      window.druygonProfile.mergeFromServer(function() {
        dispatchProfileEvent('druygon:profile-ready');
      });
    } else {
      clearStoredActiveSlot();
      activeSlot = null;
      showProfilePicker();
    }
  }

  migrateLegacyStorage();

  window.DruygonProfile = DruygonProfile;
  window.SLOT_CONFIG = SLOT_CONFIG;
  window.druygonProfile = createProfileInstance(getStoredActiveSlot() || 1);
  window.druygonUsers = {
    getActive: function() {
      return window.druygonProfile;
    },
    getActiveSlot: function() {
      return activeSlot;
    },
    switchSlot: function(slotNum) {
      return activateSlot(slotNum);
    }
  };
  window.showProfilePicker = showProfilePicker;
  window.showSwitchPlayer = showSwitchPlayer;
  window.showRewardPopup = showRewardPopup;
  window.getAllPlayersRanked = getAllPlayersRanked;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileSystem);
  } else {
    initProfileSystem();
  }
})(window, document);
