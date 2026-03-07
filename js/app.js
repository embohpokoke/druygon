/**
 * Druygon App Main
 * Initializes app and connects UI with backend API
 */

// Global player profile
let playerProfile = null;

/**
 * Convert old profile structure (profile.js) to new structure
 */
function convertOldProfile(oldProfile, name) {
  return {
    name: name || oldProfile.name || 'Player',
    level: oldProfile.level || 1,
    xp: oldProfile.xp || 0,
    xpRequired: oldProfile.xpToNext || 100,
    gamesPlayed: oldProfile.stats?.gamesPlayed || 0,
    achievements: oldProfile.badges || [],
    stats: {
      math_arena: {
        played: oldProfile.stats?.mathArenaPlays || 0,
        wins: Math.floor((oldProfile.stats?.mathArenaPlays || 0) * 0.7), // estimate
        best_score: oldProfile.stats?.bestStreak || 0
      },
      word_search: {
        played: oldProfile.stats?.wordSearchPlays || 0,
        wins: Math.floor((oldProfile.stats?.wordSearchPlays || 0) * 0.8),
        best_time: 0
      },
      speed_math: {
        played: oldProfile.stats?.fiveMinutePlays || 0,
        wins: Math.floor((oldProfile.stats?.fiveMinutePlays || 0) * 0.6),
        perfect_scores: 0
      },
      pokemon_rpg: {
        played: 0,
        pokemon_caught: oldProfile.caughtCount || 0,
        badges: oldProfile.badges?.length || 0
      }
    },
    inventory: {
      pokeballs: oldProfile.pokeballs?.pokeball || 5,
      great_balls: oldProfile.pokeballs?.greatball || 0,
      ultra_balls: oldProfile.pokeballs?.ultraball || 0,
      coins: oldProfile.coins || 0
    },
    streak: 0,
    stars: (oldProfile.stats?.totalCorrect || 0) / 10, // 10 correct = 1 star
    rank: 0,
    lastPlayed: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎮 Druygon Portal v2.0 - Initializing...');

  // Wait for user selection
  const checkUserSelection = setInterval(async () => {
    const activeSlot = window.UserSelection ? window.UserSelection.getActiveSlot() : null;

    if (!activeSlot) {
      console.log('Waiting for user selection...');
      return;
    }

    clearInterval(checkUserSelection);

    // Get slot info
    const slotConfig = window.UserSelection.SLOT_CONFIG[activeSlot - 1];
    console.log(`Loading profile for: ${slotConfig.name} (Slot ${activeSlot})`);

    // Load from original profile.js first (localStorage)
    if (typeof DruygonProfile !== 'undefined') {
      const localProfile = new DruygonProfile(activeSlot);
      if (localProfile.data) {
        // Convert old profile structure to new
        playerProfile = convertOldProfile(localProfile.data, slotConfig.name);
        console.log('✅ Loaded from profile.js (localStorage)');
      }
    }

    // Try API if localStorage failed
    if (!playerProfile) {
      playerProfile = await DruygonAPI.loadProfile(activeSlot);
      if (playerProfile) {
        console.log('✅ Loaded from API');
      }
    }

    // Create new if nothing found
    if (!playerProfile) {
      playerProfile = DruygonAPI.createDefaultProfile(slotConfig.name);
      await DruygonAPI.saveProfile(playerProfile, activeSlot, 'new-profile');
      console.log(`✨ New profile created for ${slotConfig.name}`);
    }

    // Update API current slot
    DruygonAPI.setCurrentSlot(activeSlot);

    // Update UI with loaded profile
    updateUI();

    // Start auto-save
    DruygonAPI.startAutoSave(() => playerProfile);

    // Load leaderboard
    loadLeaderboard();

    console.log('✅ App initialized successfully');
  }, 100);
});

// ============================================
// UI UPDATES
// ============================================

/**
 * Update all UI elements with current player data
 */
function updateUI() {
  if (!playerProfile) return;

  // Player Hero Section
  updatePlayerHero();

  // XP Progress
  updateXPProgress();

  // Stats Row
  updateStats();

  // Featured Game (unlock logic)
  updateGameLocks();
}

/**
 * Update player hero section
 */
function updatePlayerHero() {
  const nameEl = document.querySelector('.player-greeting span');
  const levelBadge = document.querySelector('.player-level-badge');

  if (nameEl) nameEl.textContent = playerProfile.name;
  if (levelBadge) levelBadge.textContent = `LVL ${playerProfile.level}`;
}

/**
 * Update XP bar
 */
function updateXPProgress() {
  const xpLabel = document.querySelector('.player-xp-label');
  const xpBar = document.querySelector('.xp-bar-fill');

  if (xpLabel) {
    xpLabel.textContent = `${playerProfile.xp} / ${playerProfile.xpRequired} XP`;
  }

  if (xpBar) {
    const percentage = (playerProfile.xp / playerProfile.xpRequired) * 100;
    xpBar.style.width = `${Math.min(percentage, 100)}%`;
  }
}

/**
 * Update stats row
 */
function updateStats() {
  const statsRow = document.querySelector('.player-stats-row');
  if (!statsRow) return;

  const stats = [
    { selector: '.player-stat:nth-child(1) .player-stat-val', value: `${playerProfile.streak}🔥` },
    { selector: '.player-stat:nth-child(2) .player-stat-val', value: `${playerProfile.stars}⭐` },
    { selector: '.player-stat:nth-child(3) .player-stat-val', value: `${playerProfile.achievements.length}🏆` },
    { selector: '.player-stat:nth-child(4) .player-stat-val', value: `#${playerProfile.rank || '?'}` }
  ];

  stats.forEach(stat => {
    const el = document.querySelector(stat.selector);
    if (el) el.textContent = stat.value;
  });
}

/**
 * Update game lock status based on level
 */
function updateGameLocks() {
  // Pokemon RPG requires level 15
  const rpgCard = document.querySelector('.game-card-compact.is-locked');

  if (rpgCard && playerProfile.level >= 15) {
    rpgCard.classList.remove('is-locked');
    rpgCard.style.opacity = '1';

    const playBtn = rpgCard.querySelector('.compact-play-btn');
    if (playBtn) {
      playBtn.textContent = '▶';
      playBtn.style.background = 'var(--yellow)';
      playBtn.style.color = 'var(--text-inverse)';
      playBtn.style.boxShadow = '0 2px 8px rgba(255,203,5,0.4)';
    }

    // Show unlock notification
    showNotification('🌟 Pokemon RPG Unlocked!', 'You can now play Pokemon RPG!');
  }
}

// ============================================
// LEADERBOARD
// ============================================

/**
 * Load and display leaderboard
 */
async function loadLeaderboard() {
  const apiPlayers = await DruygonAPI.getAllPlayers();
  if (apiPlayers.length === 0) return;

  const players = apiPlayers.map(normalizeLeaderboardPlayer);

  // Sort by points from DB profile
  players.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (a.slot || 999) - (b.slot || 999);
  });

  // Assign ranks
  players.forEach((p, index) => {
    p.rank = index + 1;
  });

  // Update current player's rank (prefer active slot match)
  const activeSlot = window.UserSelection ? window.UserSelection.getActiveSlot() : null;
  const currentPlayer = players.find((p) =>
    (activeSlot && p.slot === activeSlot) ||
    (!activeSlot && p.name === playerProfile.name)
  );
  if (currentPlayer) {
    playerProfile.rank = currentPlayer.rank;
    updateStats();
  }

  // Update leaderboard UI
  updateLeaderboardUI(players.slice(0, 10)); // Top 10
}

/**
 * Update leaderboard UI
 */
function updateLeaderboardUI(players) {
  const leaderboard = document.querySelector('.leaderboard');
  if (!leaderboard) return;

  // Clear existing rows
  leaderboard.innerHTML = '';

  players.forEach((player, index) => {
    const isCurrentPlayer = player.isCurrentPlayer;

    const rank = index + 1;
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '';

    const row = document.createElement('div');
    row.className = 'leaderboard-row';

    if (isCurrentPlayer) {
      row.style.background = 'rgba(255,203,5,0.05)';
      row.style.borderColor = 'rgba(255,203,5,0.15)';
    }

    row.innerHTML = `
      <div class="leaderboard-rank" style="color: ${rankColor || 'inherit'};">${rankEmoji}</div>
      <div class="leaderboard-avatar">${isCurrentPlayer ? '👤' : '🎮'}</div>
      <div class="leaderboard-name">
        <div class="leaderboard-username">
          ${player.name}
          ${isCurrentPlayer ? '<span style="font-size:10px; color: var(--yellow); background: var(--yellow-dim); padding: 1px 6px; border-radius: 99px;">YOU</span>' : ''}
        </div>
        <div class="leaderboard-sub">Level ${player.level} • ${player.xp} XP • ${player.points} Poin</div>
      </div>
      <div class="leaderboard-score">
        <div class="score-val" style="color: ${rankColor || 'var(--yellow)'};">${player.points}</div>
        <div class="score-label">Poin</div>
      </div>
    `;

    leaderboard.appendChild(row);
  });
}

function normalizeLeaderboardPlayer(player) {
  const profile = player?.profile || {};
  const activeSlot = window.UserSelection ? window.UserSelection.getActiveSlot() : null;
  const level = profile.level || 1;
  const xp = profile.xp || 0;
  const totalCorrect = profile.stats?.totalCorrect || 0;
  const collectionCount = Array.isArray(profile.collection)
    ? profile.collection.length
    : (profile.caughtCount || profile.stats?.pokemon_rpg?.pokemon_caught || 0);
  const fallbackStars = Math.floor(profile.stars || 0);

  // Keep score formula aligned with legacy profile leaderboard logic.
  const points = (level * 1000) + xp + (collectionCount * 50) + (totalCorrect || fallbackStars);

  return {
    slot: player.slot,
    name: profile.name || player.name || `Player ${player.slot || ''}`.trim(),
    level: level,
    xp: xp,
    points: points,
    isCurrentPlayer: (activeSlot && player.slot === activeSlot) || (!activeSlot && (profile.name === playerProfile?.name))
  };
}

// ============================================
// GAME COMPLETION
// ============================================

/**
 * Handle game completion
 * Call this when a game finishes
 */
function completeGame(gameType, stats) {
  if (!playerProfile) return;

  // Add XP
  const xpReward = stats.xpReward || 50;
  DruygonAPI.addXP(playerProfile, xpReward);

  // Update game stats
  DruygonAPI.updateGameStats(playerProfile, gameType, stats);

  // Check for achievements
  checkAchievements(gameType, stats);

  // Update UI
  updateUI();

  // Save profile
  DruygonAPI.saveProfile(playerProfile, DruygonAPI.getCurrentSlot(), 'game-complete');
  DruygonAPI.saveProfileLocal(playerProfile);

  // Show completion notification
  showNotification(
    `🎮 Game Complete!`,
    `+${xpReward} XP | Level ${playerProfile.level}`
  );

  // Reload leaderboard
  setTimeout(loadLeaderboard, 1000);
}

/**
 * Check and unlock achievements
 */
function checkAchievements(gameType, stats) {
  const achievements = {
    math_master: () =>
      gameType === 'math_arena' &&
      playerProfile.stats.math_arena.wins >= 100,

    speed_demon: () =>
      gameType === 'speed_math' &&
      playerProfile.stats.speed_math.perfect_scores >= 10,

    streak_7: () => playerProfile.streak >= 7,

    explorer: () =>
      playerProfile.stats.math_arena.played > 0 &&
      playerProfile.stats.word_search.played > 0 &&
      playerProfile.stats.speed_math.played > 0,

    perfectionist: () =>
      playerProfile.stats.math_arena.wins / Math.max(playerProfile.stats.math_arena.played, 1) === 1 &&
      playerProfile.stats.math_arena.played >= 10
  };

  Object.entries(achievements).forEach(([id, checkFn]) => {
    if (checkFn()) {
      const unlocked = DruygonAPI.unlockAchievement(playerProfile, id);
      if (unlocked) {
        showNotification('🏆 Achievement Unlocked!', id.replace('_', ' ').toUpperCase());
      }
    }
  });
}

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Show notification toast
 */
function showNotification(title, message) {
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 4px;">${title}</div>
    <div style="font-size: 13px; opacity: 0.8;">${message}</div>
  `;

  document.body.appendChild(toast);

  // Add CSS if not exists
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification-toast {
        position: fixed;
        top: calc(var(--header-h) + var(--safe-top) + 16px);
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: rgba(37, 37, 66, 0.95);
        backdrop-filter: blur(12px);
        color: white;
        padding: 16px 20px;
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        z-index: 1000;
        min-width: 280px;
        max-width: 90%;
        text-align: center;
        animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                   slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 2.5s forwards;
      }

      @keyframes slideDown {
        to { transform: translateX(-50%) translateY(0); }
      }

      @keyframes slideUp {
        to { transform: translateX(-50%) translateY(-100px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => toast.remove(), 3000);
}

// ============================================
// GAME BUTTONS
// ============================================

// Keep locked game card from opening before required level.
document.addEventListener('DOMContentLoaded', () => {
  const lockedCards = document.querySelectorAll('.game-card-compact.is-locked');
  lockedCards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (!playerProfile || playerProfile.level < 15) {
        e.preventDefault();
        e.stopPropagation();
        showNotification('🔒 Locked', 'Reach level 15 to unlock this game');
      }
    });
  });
});

// ============================================
// EXPORTS
// ============================================

window.DruygonApp = {
  getProfile: () => playerProfile,
  updateUI,
  completeGame,
  loadLeaderboard,
  showNotification
};

console.log('✅ Druygon App loaded');
