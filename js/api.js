/**
 * Druygon API Client
 * Handles all communication with backend Express API
 */

const API_BASE = window.location.origin + '/api';
const DRUYGON_API = API_BASE + '/druygon';

// Default player slot (can be changed via profile selector)
let currentSlot = 1;

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
      return data.profile;
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
    const response = await fetch(`${DRUYGON_API}/profile/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, profile, event })
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
      return data.players || [];
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
      return data.history || [];
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
      return data.profile;
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
      body: JSON.stringify({ mode, answers, profile })
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
    return data ? JSON.parse(data) : null;
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
    localStorage.setItem(STORAGE_KEY + slot, JSON.stringify(profile));
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
  return {
    name: name,
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
  };
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
  profile.xp += amount;

  // Check for level up
  while (profile.xp >= profile.xpRequired) {
    profile.xp -= profile.xpRequired;
    profile.level++;
    profile.xpRequired = xpForLevel(profile.level);

    // Level up rewards
    profile.inventory.pokeballs += 5;
    if (profile.level % 5 === 0) {
      profile.inventory.great_balls += 3;
    }
    if (profile.level % 10 === 0) {
      profile.inventory.ultra_balls += 2;
    }

    console.log(`🎉 LEVEL UP! Now level ${profile.level}`);
  }

  return profile;
}

/**
 * Add achievement to player
 */
function unlockAchievement(profile, achievementId) {
  if (!profile.achievements.includes(achievementId)) {
    profile.achievements.push(achievementId);
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
  if (!profile.stats[gameType]) {
    profile.stats[gameType] = { played: 0, wins: 0 };
  }

  profile.stats[gameType].played++;
  profile.gamesPlayed++;

  if (stats.won) {
    profile.stats[gameType].wins++;
    profile.stars += 1;
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
      const success = await saveProfile(profile, currentSlot, 'auto-save');
      saveProfileLocal(profile, currentSlot); // Also save to localStorage

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
