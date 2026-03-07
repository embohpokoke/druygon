/**
 * Druygon API Client
 * Handles all communication with backend Express API
 */

const API_BASE = window.location.origin + '/api';
const DRUYGON_API = API_BASE + '/druygon';

// Default player slot (can be changed via profile selector)
let currentSlot = 1;

function normalizeProfile(profile = {}, fallbackName = 'Player') {
  const p = profile || {};

  const level = Number.isFinite(p.level) ? p.level : 1;
  const xp = Number.isFinite(p.xp) ? p.xp : 0;
  const xpToNext = Number.isFinite(p.xpToNext)
    ? p.xpToNext
    : (Number.isFinite(p.xpRequired) ? p.xpRequired : 100);

  const achievements = Array.isArray(p.achievements)
    ? [...p.achievements]
    : (Array.isArray(p.badges) ? [...p.badges] : []);
  const badges = Array.isArray(p.badges)
    ? [...p.badges]
    : [...achievements];

  const statsInput = (p.stats && typeof p.stats === 'object') ? p.stats : {};
  const legacyStatsDefaults = {
    totalCorrect: 0,
    totalWrong: 0,
    gamesPlayed: 0,
    bestStreak: 0,
    mathArenaPlays: 0,
    wordSearchPlays: 0,
    fiveMinutePlays: 0
  };

  const collection = Array.isArray(p.collection) ? p.collection : [];
  const caughtCount = Number.isFinite(p.caughtCount)
    ? p.caughtCount
    : (Number.isFinite(statsInput?.pokemon_rpg?.pokemon_caught)
      ? statsInput.pokemon_rpg.pokemon_caught
      : collection.length);

  const stats = {
    ...legacyStatsDefaults,
    ...statsInput,
    math_arena: {
      played: statsInput.math_arena?.played ?? statsInput.mathArenaPlays ?? 0,
      wins: statsInput.math_arena?.wins ?? 0,
      best_score: statsInput.math_arena?.best_score ?? statsInput.bestStreak ?? 0
    },
    word_search: {
      played: statsInput.word_search?.played ?? statsInput.wordSearchPlays ?? 0,
      wins: statsInput.word_search?.wins ?? 0,
      best_time: statsInput.word_search?.best_time ?? 0
    },
    speed_math: {
      played: statsInput.speed_math?.played ?? statsInput.fiveMinutePlays ?? 0,
      wins: statsInput.speed_math?.wins ?? 0,
      perfect_scores: statsInput.speed_math?.perfect_scores ?? 0
    },
    pokemon_rpg: {
      played: statsInput.pokemon_rpg?.played ?? 0,
      pokemon_caught: statsInput.pokemon_rpg?.pokemon_caught ?? caughtCount,
      badges: statsInput.pokemon_rpg?.badges ?? badges.length
    }
  };

  const gamesPlayed = Number.isFinite(p.gamesPlayed) ? p.gamesPlayed : (stats.gamesPlayed || 0);
  stats.gamesPlayed = gamesPlayed;
  stats.mathArenaPlays = stats.math_arena.played;
  stats.wordSearchPlays = stats.word_search.played;
  stats.fiveMinutePlays = stats.speed_math.played;

  const inventoryInput = (p.inventory && typeof p.inventory === 'object') ? p.inventory : {};
  const pokeballsInput = (p.pokeballs && typeof p.pokeballs === 'object') ? p.pokeballs : {};

  const pokeball = Number.isFinite(pokeballsInput.pokeball)
    ? pokeballsInput.pokeball
    : (Number.isFinite(inventoryInput.pokeballs) ? inventoryInput.pokeballs : 5);
  const greatball = Number.isFinite(pokeballsInput.greatball)
    ? pokeballsInput.greatball
    : (Number.isFinite(inventoryInput.great_balls) ? inventoryInput.great_balls : 0);
  const ultraball = Number.isFinite(pokeballsInput.ultraball)
    ? pokeballsInput.ultraball
    : (Number.isFinite(inventoryInput.ultra_balls) ? inventoryInput.ultra_balls : 0);
  const masterball = Number.isFinite(pokeballsInput.masterball) ? pokeballsInput.masterball : 0;

  const coins = Number.isFinite(p.coins)
    ? p.coins
    : (Number.isFinite(inventoryInput.coins) ? inventoryInput.coins : 0);

  const stars = Number.isFinite(p.stars) ? p.stars : Math.floor((stats.totalCorrect || 0) / 10);

  return {
    ...p,
    name: p.name || fallbackName || 'Player',
    level,
    xp,
    xpRequired: xpToNext,
    xpToNext,
    gamesPlayed,
    achievements,
    badges,
    stats,
    coins,
    pokeballs: { pokeball, greatball, ultraball, masterball },
    inventory: {
      pokeballs: pokeball,
      great_balls: greatball,
      ultra_balls: ultraball,
      coins
    },
    team: Array.isArray(p.team) ? p.team : [],
    collection,
    defeatedCount: Number.isFinite(p.defeatedCount) ? p.defeatedCount : 0,
    caughtCount,
    currentRoute: Number.isFinite(p.currentRoute) ? p.currentRoute : 1,
    streak: Number.isFinite(p.streak) ? p.streak : 0,
    stars,
    rank: Number.isFinite(p.rank) ? p.rank : 0,
    lastPlayed: p.lastPlayed || new Date().toISOString(),
    createdAt: p.createdAt || new Date().toISOString()
  };
}

// ============================================
// PLAYER PROFILE API
// ============================================

/**
 * Load player profile from server
 * @param {number} slot - Profile slot (1-5)
 * @returns {Promise<Object|null>} Player profile or null if not found
 */
async function loadProfile(slot = currentSlot) {
  try {
    const response = await fetch(`${DRUYGON_API}/profile/load/${slot}`);
    const data = await response.json();

    if (data.success && data.profile) {
      currentSlot = slot;
      return normalizeProfile(data.profile, data.name || 'Player');
    }
    return null;
  } catch (error) {
    console.error('[API] Load profile error:', error);
    return null;
  }
}

/**
 * Save player profile to server
 * @param {Object} profile - Player profile object
 * @param {number} slot - Profile slot (1-5)
 * @param {string} event - Event name (e.g., 'manual-save', 'auto-save', 'level-up')
 * @returns {Promise<boolean>} Success status
 */
async function saveProfile(profile, slot = currentSlot, event = 'auto-save') {
  try {
    const normalized = normalizeProfile(profile);
    const response = await fetch(`${DRUYGON_API}/profile/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, profile: normalized, event })
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('[API] Save profile error:', error);
    return false;
  }
}

/**
 * Get all players (for leaderboard)
 * @returns {Promise<Array>} Array of player objects
 */
async function getAllPlayers() {
  try {
    const response = await fetch(`${DRUYGON_API}/profile/all`);
    const data = await response.json();

    if (data.success) {
      return (data.players || []).map((p) => ({
        ...p,
        profile: normalizeProfile(p.profile, p.name)
      }));
    }
    return [];
  } catch (error) {
    console.error('[API] Get all players error:', error);
    return [];
  }
}

/**
 * Get profile history for recovery
 * @param {number} slot - Profile slot
 * @param {number} limit - Max number of history entries
 * @returns {Promise<Array>} Array of history entries
 */
async function getProfileHistory(slot = currentSlot, limit = 20) {
  try {
    const response = await fetch(`${DRUYGON_API}/profile/history/${slot}?limit=${limit}`);
    const data = await response.json();

    if (data.success) {
      return (data.history || []).map((h) => ({
        ...h,
        profile: normalizeProfile(h.profile)
      }));
    }
    return [];
  } catch (error) {
    console.error('[API] Get history error:', error);
    return [];
  }
}

/**
 * Restore profile from history
 * @param {number} historyId - History entry ID
 * @param {number} slot - Profile slot
 * @returns {Promise<Object|null>} Restored profile or null
 */
async function restoreFromHistory(historyId, slot = currentSlot) {
  try {
    const response = await fetch(`${DRUYGON_API}/profile/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, historyId })
    });

    const data = await response.json();

    if (data.success) {
      return normalizeProfile(data.profile);
    }
    return null;
  } catch (error) {
    console.error('[API] Restore profile error:', error);
    return null;
  }
}

// ============================================
// FEEDBACK & AI API
// ============================================

/**
 * Submit feedback or game idea to Claude AI
 * @param {string} mode - 'feedback' or 'planning'
 * @param {Object} answers - User responses
 * @param {Object} profile - Current player profile
 * @returns {Promise<string|null>} AI response or null
 */
async function submitFeedback(mode, answers, profile) {
  try {
    const response = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, answers, profile: normalizeProfile(profile) })
    });

    const data = await response.json();

    if (data.success) {
      return data.response;
    }
    return null;
  } catch (error) {
    console.error('[API] Submit feedback error:', error);
    return null;
  }
}

// ============================================
// LOCAL STORAGE (Fallback)
// ============================================

const STORAGE_KEY = 'druygon_profile_slot_';

/**
 * Load profile from localStorage (fallback/cache)
 */
function loadProfileLocal(slot = currentSlot) {
  try {
    const data = localStorage.getItem(STORAGE_KEY + slot);
    return data ? normalizeProfile(JSON.parse(data)) : null;
  } catch (error) {
    console.error('[Storage] Load error:', error);
    return null;
  }
}

/**
 * Save profile to localStorage (fallback/cache)
 */
function saveProfileLocal(profile, slot = currentSlot) {
  try {
    localStorage.setItem(STORAGE_KEY + slot, JSON.stringify(normalizeProfile(profile)));
    return true;
  } catch (error) {
    console.error('[Storage] Save error:', error);
    return false;
  }
}

// ============================================
// PLAYER OBJECT
// ============================================

/**
 * Create default player profile
 */
function createDefaultProfile(name = 'Player') {
  return normalizeProfile({
    name,
    level: 1,
    xp: 0,
    xpRequired: 100,
    gamesPlayed: 0,
    achievements: [],
    stats: {
      math_arena: { played: 0, wins: 0, best_score: 0 },
      word_search: { played: 0, wins: 0, best_time: 0 },
      speed_math: { played: 0, wins: 0, perfect_scores: 0 },
      pokemon_rpg: { played: 0, pokemon_caught: 0, badges: 0 }
    },
    inventory: {
      pokeballs: 5,
      great_balls: 0,
      ultra_balls: 0,
      coins: 0
    },
    streak: 0,
    stars: 0,
    rank: 0,
    lastPlayed: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }, name);
}

/**
 * Calculate XP required for next level
 */
function xpForLevel(level) {
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

/**
 * Add XP to player and handle level up
 */
function addXP(profile, amount) {
  profile = normalizeProfile(profile);
  profile.xp += amount;

  // Check for level up
  while (profile.xp >= profile.xpRequired) {
    profile.xp -= profile.xpRequired;
    profile.level++;
    profile.xpRequired = xpForLevel(profile.level);
    profile.xpToNext = profile.xpRequired;

    // Level up rewards
    profile.inventory.pokeballs += 5;
    profile.pokeballs.pokeball += 5;
    if (profile.level % 5 === 0) {
      profile.inventory.great_balls += 3;
      profile.pokeballs.greatball += 3;
    }
    if (profile.level % 10 === 0) {
      profile.inventory.ultra_balls += 2;
      profile.pokeballs.ultraball += 2;
    }

    console.log(`🎉 LEVEL UP! Now level ${profile.level}`);
  }

  return profile;
}

/**
 * Add achievement to player
 */
function unlockAchievement(profile, achievementId) {
  profile = normalizeProfile(profile);
  if (!profile.achievements.includes(achievementId)) {
    profile.achievements.push(achievementId);
    if (!profile.badges.includes(achievementId)) {
      profile.badges.push(achievementId);
    }
    profile.stats.pokemon_rpg.badges = profile.badges.length;
    profile.stars += 1; // Each achievement = 1 star
    console.log(`⭐ Achievement unlocked: ${achievementId}`);
    return true;
  }
  return false;
}

/**
 * Update game stats after game completion
 */
function updateGameStats(profile, gameType, stats) {
  profile = normalizeProfile(profile);

  if (!profile.stats[gameType]) {
    profile.stats[gameType] = { played: 0, wins: 0 };
  }

  profile.stats[gameType].played++;
  profile.gamesPlayed++;

  if (stats.won) {
    profile.stats[gameType].wins++;
    profile.stars += 1;
  }

  if (typeof stats.correct === 'number') {
    profile.stats.totalCorrect += stats.correct;
  }
  if (typeof stats.wrong === 'number') {
    profile.stats.totalWrong += stats.wrong;
  }

  // Update best scores
  if (stats.score && stats.score > (profile.stats[gameType].best_score || 0)) {
    profile.stats[gameType].best_score = stats.score;
  }
  if (stats.time && (!profile.stats[gameType].best_time || stats.time < profile.stats[gameType].best_time)) {
    profile.stats[gameType].best_time = stats.time;
  }
  if (stats.perfect) {
    profile.stats[gameType].perfect_scores = (profile.stats[gameType].perfect_scores || 0) + 1;
  }

  profile.stats.gamesPlayed = profile.gamesPlayed;
  profile.stats.mathArenaPlays = profile.stats.math_arena?.played ?? profile.stats.mathArenaPlays;
  profile.stats.wordSearchPlays = profile.stats.word_search?.played ?? profile.stats.wordSearchPlays;
  profile.stats.fiveMinutePlays = profile.stats.speed_math?.played ?? profile.stats.fiveMinutePlays;

  profile.lastPlayed = new Date().toISOString();
  return profile;
}

// ============================================
// AUTO-SAVE
// ============================================

let autoSaveTimer = null;

/**
 * Start auto-save timer (saves every 30 seconds)
 */
function startAutoSave(getProfileFn) {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }

  autoSaveTimer = setInterval(async () => {
    const profile = getProfileFn();
    if (profile) {
      const normalized = normalizeProfile(profile);
      const success = await saveProfile(normalized, currentSlot, 'auto-save');
      saveProfileLocal(normalized, currentSlot); // Also save to localStorage

      if (success) {
        console.log('[Auto-save] Profile saved to server');
      } else {
        console.warn('[Auto-save] Failed to save to server (localStorage OK)');
      }
    }
  }, 30000); // 30 seconds

  console.log('[Auto-save] Started (every 30 seconds)');
}

/**
 * Stop auto-save timer
 */
function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
    console.log('[Auto-save] Stopped');
  }
}

// ============================================
// EXPORTS
// ============================================

window.DruygonAPI = {
  // Profile management
  loadProfile,
  saveProfile,
  getAllPlayers,
  getProfileHistory,
  restoreFromHistory,

  // Local storage
  loadProfileLocal,
  saveProfileLocal,

  // Feedback
  submitFeedback,

  // Player utilities
  createDefaultProfile,
  normalizeProfile,
  xpForLevel,
  addXP,
  unlockAchievement,
  updateGameStats,

  // Auto-save
  startAutoSave,
  stopAutoSave,

  // State
  getCurrentSlot: () => currentSlot,
  setCurrentSlot: (slot) => { currentSlot = slot; }
};

console.log('✅ Druygon API Client loaded');
