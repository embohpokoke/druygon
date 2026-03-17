(function(window, document) {
  var LEADERBOARD_API_URL = '/api/druygon/profile/all';
  var LEADERBOARD_SPRITES = {
    dru: 'assets/sprites/pikachu.png',
    oming: 'assets/sprites/charizard.png',
    reymar: 'assets/sprites/alakazam.png',
    illy: 'assets/sprites/jolteon.png',
    extra: 'images/pokemon/mewtwo.webp'
  };
  var currentRank = null;
  var appStarted = false;

  function bySelector(selector) {
    return document.querySelector(selector);
  }

  function getProfileData() {
    if (!window.druygonProfile || !window.druygonProfile.data) return null;
    return window.druygonProfile.data;
  }

  function hasProgress(profile) {
    if (!profile) return false;
    return profile.level > 1 ||
      profile.xp > 0 ||
      profile.coins > 0 ||
      (profile.collection && profile.collection.length > 0) ||
      (profile.badges && profile.badges.length > 0) ||
      (profile.stats && (profile.stats.gamesPlayed > 0 || profile.stats.totalCorrect > 0));
  }

  function getStars(profile) {
    var stats = profile && profile.stats ? profile.stats : {};
    return Math.floor((stats.totalCorrect || 0) / 10);
  }

  function ensureChangeUserButton() {
    var actions = bySelector('.header-actions');
    var button;
    if (!actions || document.getElementById('changeUserBtn')) return;
    button = document.createElement('button');
    button.id = 'changeUserBtn';
    button.className = 'icon-btn';
    button.type = 'button';
    button.textContent = 'Ganti User';
    button.style.width = 'auto';
    button.style.padding = '0 14px';
    button.style.fontSize = '12px';
    button.style.fontWeight = '700';
    button.style.borderRadius = '999px';
    button.onclick = function() {
      if (window.showSwitchPlayer) window.showSwitchPlayer();
    };
    actions.insertBefore(button, actions.firstChild);
  }

  function updateHero() {
    var profile = getProfileData();
    var greeting = bySelector('.player-greeting span');
    var levelBadge = bySelector('.player-level-badge');
    if (!profile) return;
    if (greeting) greeting.textContent = profile.name;
    if (levelBadge) levelBadge.textContent = 'LVL ' + profile.level;
  }

  function updateXP() {
    var profile = getProfileData();
    var label = bySelector('.player-xp-label');
    var bar = bySelector('.xp-bar-fill');
    var pct;
    if (!profile) return;
    if (label) label.textContent = profile.xp + ' / ' + profile.xpToNext + ' XP';
    if (bar) {
      pct = profile.xpToNext > 0 ? Math.round((profile.xp / profile.xpToNext) * 100) : 0;
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;
      bar.style.width = pct + '%';
    }
  }

  function updateStats() {
    var profile = getProfileData();
    var statEls = document.querySelectorAll('.player-stat-val');
    var stats;
    if (!profile || !statEls || statEls.length < 4) return;
    stats = profile.stats || {};
    statEls[0].textContent = (stats.bestStreak || 0) + '🔥';
    statEls[1].textContent = getStars(profile) + '⭐';
    statEls[2].textContent = (profile.badges ? profile.badges.length : 0) + '🏆';
    statEls[3].textContent = currentRank ? '#' + currentRank : '-';
  }

  function updateGameLocks() {
    var profile = getProfileData();
    var card = bySelector('.game-card-compact[href="routes/"]') || bySelector('.game-card-compact.is-locked');
    var lockOverlay;
    var playBtn;
    if (!profile || !card) return;

    lockOverlay = card.querySelector('.lock-overlay');
    playBtn = card.querySelector('.compact-play-btn');

    if (profile.level >= 15) {
      card.classList.remove('is-locked');
      if (lockOverlay) lockOverlay.style.display = 'none';
      if (playBtn) {
        playBtn.textContent = '▶';
        playBtn.style.background = 'var(--yellow)';
        playBtn.style.color = 'var(--text-inverse)';
        playBtn.style.boxShadow = '0 2px 8px rgba(255,203,5,0.4)';
      }
    } else {
      card.classList.add('is-locked');
      if (lockOverlay) lockOverlay.style.display = '';
      if (playBtn) {
        playBtn.textContent = '🔒';
        playBtn.style.background = 'var(--bg-elevated)';
        playBtn.style.color = 'var(--text-tertiary)';
        playBtn.style.boxShadow = 'none';
      }
    }
  }

  function refreshHome() {
    if (!window.druygonProfile) return;
    window.druygonProfile.load();
    updateHero();
    updateXP();
    updateStats();
    updateGameLocks();
  }

  function renderLeaderboardState(state) {
    var leaderboard = bySelector('.leaderboard');
    if (!leaderboard) return;
    if (state === 'loading') {
      leaderboard.innerHTML = '<div class="leaderboard-row"><div class="leaderboard-name"><div class="leaderboard-username">Memuat leaderboard...</div><div class="leaderboard-sub">Mengambil data pemain dari server</div></div></div>';
      return;
    }
    leaderboard.innerHTML = '<div class="leaderboard-row"><div class="leaderboard-name"><div class="leaderboard-username">Belum ada data leaderboard</div><div class="leaderboard-sub">Mainkan game dulu untuk mengisi ranking</div></div></div>';
  }

  function normalizeLeaderboardProfile(player) {
    var profile = player && player.profile ? player.profile : player;
    var stats = profile && profile.stats ? profile.stats : {};
    var collectionCount = profile && profile.collection && profile.collection.length ? profile.collection.length : (profile && profile.caughtCount ? profile.caughtCount : 0);
    var slot = player && player.slot ? player.slot : null;
    return {
      slot: slot,
      name: (profile && profile.name) || (player && player.name) || 'Player',
      level: profile && profile.level ? profile.level : 1,
      xp: profile && profile.xp ? profile.xp : 0,
      points: ((profile && profile.level ? profile.level : 1) * 1000) + (profile && profile.xp ? profile.xp : 0) + (collectionCount * 50) + (stats.totalCorrect || 0),
      isCurrentPlayer: !!slot && window.druygonUsers && window.druygonUsers.getActiveSlot && window.druygonUsers.getActiveSlot() === slot
    };
  }

  function getLeaderboardSprite(name) {
    var key = String(name || '').toLowerCase();
    return LEADERBOARD_SPRITES[key] || 'images/pokemon/pikachu.webp';
  }

  function updateLeaderboard(players) {
    var leaderboard = bySelector('.leaderboard');
    var i;
    var row;
    var player;
    var rank;
    var currentSlot = window.druygonUsers && window.druygonUsers.getActiveSlot ? window.druygonUsers.getActiveSlot() : null;
    if (!leaderboard) return;
    leaderboard.innerHTML = '';

    currentRank = null;
    for (i = 0; i < players.length; i++) {
      player = players[i];
      rank = i + 1;
      if (currentSlot && player.slot === currentSlot) {
        currentRank = rank;
      }
      row = document.createElement('div');
      row.className = 'leaderboard-row';
      if (player.slot === currentSlot) {
        row.style.background = 'rgba(255,203,5,0.05)';
        row.style.borderColor = 'rgba(255,203,5,0.15)';
      }
      row.innerHTML =
        '<div class="leaderboard-rank">' + (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank) + '</div>' +
        '<div class="leaderboard-avatar"><img src="' + getLeaderboardSprite(player.name) + '" alt="' + player.name + '" class="leaderboard-avatar-img"></div>' +
        '<div class="leaderboard-name">' +
          '<div class="leaderboard-username">' + player.name + (player.slot === currentSlot ? ' <span style="font-size:10px;color:var(--yellow);background:var(--yellow-dim);padding:1px 6px;border-radius:99px;">YOU</span>' : '') + '</div>' +
          '<div class="leaderboard-sub">Level ' + player.level + ' • ' + player.xp + ' XP • ' + player.points + ' Poin</div>' +
        '</div>' +
        '<div class="leaderboard-score"><div class="score-val">' + player.points + '</div><div class="score-label">Poin</div></div>';
      leaderboard.appendChild(row);
    }

    updateStats();
  }

  function getLocalLeaderboard() {
    var ranked;
    var players = [];
    var i;
    if (!window.getAllPlayersRanked) return players;
    ranked = window.getAllPlayersRanked();
    for (i = 0; i < ranked.length; i++) {
      players.push({
        slot: ranked[i].slot,
        name: ranked[i].name,
        level: ranked[i].level,
        xp: ranked[i].xp,
        points: ranked[i].score,
        isCurrentPlayer: ranked[i].isActive
      });
    }
    return players;
  }

  function sortPlayers(players) {
    players.sort(function(a, b) {
      if (b.points !== a.points) return b.points - a.points;
      return (a.slot || 999) - (b.slot || 999);
    });
  }

  function loadLeaderboard() {
    var xhr = new XMLHttpRequest();
    renderLeaderboardState('loading');
    try {
      xhr.onreadystatechange = function() {
        var response;
        var source;
        var players = [];
        var i;
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            response = JSON.parse(xhr.responseText);
          } catch (error) {
            response = null;
          }
          if (response && response.success && response.players && response.players.length) {
            source = response.players;
            for (i = 0; i < source.length; i++) {
              if (!source[i] || !source[i].profile) continue;
              if (!hasProgress(source[i].profile)) continue;
              players.push(normalizeLeaderboardProfile(source[i]));
            }
          }
        }

        if (!players.length) {
          players = getLocalLeaderboard();
        }

        if (!players.length) {
          currentRank = null;
          updateStats();
          renderLeaderboardState('empty');
          return;
        }

        sortPlayers(players);
        updateLeaderboard(players.slice(0, 10));
      };
      xhr.open('GET', LEADERBOARD_API_URL, true);
      xhr.send();
    } catch (error) {
      var fallback = getLocalLeaderboard();
      if (!fallback.length) {
        currentRank = null;
        updateStats();
        renderLeaderboardState('empty');
        return;
      }
      sortPlayers(fallback);
      updateLeaderboard(fallback.slice(0, 10));
    }
  }

  function startAutoSave() {
    window.setInterval(function() {
      if (!window.druygonProfile) return;
      window.druygonProfile.load();
      window.druygonProfile.syncToServer('auto-save');
      refreshHome();
    }, 60000);
  }

  function bindRefreshEvents() {
    window.addEventListener('focus', function() {
      refreshHome();
      loadLeaderboard();
    });
    window.addEventListener('pageshow', function() {
      refreshHome();
      loadLeaderboard();
    });
    window.addEventListener('storage', function() {
      refreshHome();
      loadLeaderboard();
    });
    window.addEventListener('druygon:slot-changed', function() {
      refreshHome();
      loadLeaderboard();
    });
    window.addEventListener('druygon:profile-updated', function() {
      refreshHome();
    });
  }

  function startApp() {
    if (appStarted) return;
    appStarted = true;
    ensureChangeUserButton();
    refreshHome();
    loadLeaderboard();
    startAutoSave();
    bindRefreshEvents();
  }

  function waitForActiveSlot() {
    var timer = window.setInterval(function() {
      var slot = window.druygonUsers && window.druygonUsers.getActiveSlot ? window.druygonUsers.getActiveSlot() : null;
      if (!slot || !window.druygonProfile) return;
      window.clearInterval(timer);
      startApp();
    }, 100);
  }

  function boot() {
    waitForActiveSlot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);
