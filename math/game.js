// Math Arena - Pokemon Battle Math Game with RPG Gamification
// PATCHED v20260222 — Game Juice: floating damage, screen flash, HP colors, catch drama

// Audio context for sound effects
var audioCtx;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(freq, duration, type) {
  if (type === undefined) type = 'square';
  try {
    var ctx = getAudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

function playCorrectSound() {
  playSound(523, 0.1); setTimeout(function() { playSound(659, 0.1); }, 100);
  setTimeout(function() { playSound(784, 0.2); }, 200);
}
function playWrongSound() {
  playSound(200, 0.2, 'sawtooth'); setTimeout(function() { playSound(150, 0.3, 'sawtooth'); }, 200);
}
function playAttackSound() {
  playSound(300, 0.05); setTimeout(function() { playSound(600, 0.05); }, 50);
  setTimeout(function() { playSound(900, 0.1); }, 100);
}
function playVictorySound() {
  [523,659,784,1047].forEach(function(f,i) { setTimeout(function() { playSound(f, 0.2, 'square'); }, i*150); });
}
function playDefeatSound() {
  [400,350,300,200].forEach(function(f,i) { setTimeout(function() { playSound(f, 0.3, 'sawtooth'); }, i*200); });
}
function playCatchSound() {
  [600, 700, 800].forEach(function(f,i) { setTimeout(function() { playSound(f, 0.1); }, i*80); });
}

// =============================================
// GAME JUICE HELPERS
// =============================================

// Screen flash: type = 'red' | 'yellow'
function screenFlash(type) {
  var el = document.getElementById('screenFlash');
  if (!el) return;
  el.className = 'screen-flash';
  // Force reflow so animation restarts
  void el.offsetWidth;
  el.className = 'screen-flash flash-' + type;
}

// Show floating damage number above a panel
// panelId = 'playerPanel' or 'enemyPanel'
// text = e.g. '-15 HP' or '+20 HP'
// cssClass = '' | 'heal' | 'big'
function showFloatingDamage(panelId, text, cssClass) {
  var panel = document.getElementById(panelId);
  if (!panel) return;
  var el = document.createElement('div');
  el.className = 'damage-float' + (cssClass ? ' ' + cssClass : '');
  el.textContent = text;
  panel.appendChild(el);
  setTimeout(function() {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 1100);
}

// Dependency check — pokemon.js must be loaded before game.js
if (typeof window.getRandomPokemonFromRoute !== 'function') {
  var s = document.createElement('script');
  s.src = '../js/pokemon.js?v=' + Date.now();
  s.onload = function() { console.log('[MathArena] pokemon.js force-loaded OK'); };
  s.onerror = function() { alert('Gagal load pokemon.js. Coba clear cache browser lalu refresh.'); };
  document.head.appendChild(s);
}

// Game state
var state = {
  difficulty: 'mudah',
  route: 1,
  topic: 'campuran',
  player: null,
  enemy: null,
  playerHP: 100,
  enemyHP: 100,
  playerMaxHP: 100,
  enemyMaxHP: 100,
  score: 0,
  streak: 0,
  bestStreak: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  currentAnswer: null,
  enemiesDefeated: 0,
  currentEnemy: null,
  totalXPEarned: 0,
  totalCoinsEarned: 0
};

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
function lcm(a, b) { return (a * b) / gcd(a, b); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
  }
  return arr;
}

function getRouteTopics(routeNum) {
  var routeTopics = {
    1: ['penjumlahan', 'pengurangan'],
    2: ['perkalian', 'pembagian'],
    3: ['fpb', 'kpk'],
    4: ['perkalian', 'pembagian', 'fpb', 'kpk']
  };
  return routeTopics[routeNum] || ['penjumlahan'];
}

function generateQuestion() {
  var diff = state.difficulty;
  var topics = state.topic === 'campuran' ? getRouteTopics(state.route) : [state.topic];
  var topic = topics[Math.floor(Math.random() * topics.length)];

  var a, b, answer, text;

  switch(topic) {
    case 'penjumlahan':
      if (diff === 'mudah') { a = rand(10,50); b = rand(10,50); }
      else if (diff === 'sedang') { a = rand(50,200); b = rand(50,200); }
      else { a = rand(100,999); b = rand(100,999); }
      answer = a + b; text = a + ' + ' + b + ' = ?'; break;
    case 'pengurangan':
      if (diff === 'mudah') { a = rand(20,80); b = rand(5, a-1); }
      else if (diff === 'sedang') { a = rand(100,500); b = rand(50, a-1); }
      else { a = rand(500,999); b = rand(100, a-1); }
      answer = a - b; text = a + ' - ' + b + ' = ?'; break;
    case 'perkalian':
      if (diff === 'mudah') { a = rand(2,9); b = rand(2,9); }
      else if (diff === 'sedang') { a = rand(5,12); b = rand(5,12); }
      else { a = rand(10,25); b = rand(5,15); }
      answer = a * b; text = a + ' × ' + b + ' = ?'; break;
    case 'pembagian':
      if (diff === 'mudah') { b = rand(2,9); answer = rand(2,9); a = b * answer; }
      else if (diff === 'sedang') { b = rand(3,12); answer = rand(5,15); a = b * answer; }
      else { b = rand(5,15); answer = rand(10,30); a = b * answer; }
      text = a + ' ÷ ' + b + ' = ?'; break;
    case 'fpb':
      if (diff === 'mudah') { var g = rand(2,6); a = g * rand(2,5); b = g * rand(2,5); while(a===b) { b = g * rand(2,5); } }
      else if (diff === 'sedang') { var g2 = rand(3,10); a = g2 * rand(2,6); b = g2 * rand(2,6); while(a===b) { b = g2 * rand(2,6); } }
      else { var g3 = rand(5,15); a = g3 * rand(2,8); b = g3 * rand(2,8); while(a===b) { b = g3 * rand(2,8); } }
      answer = gcd(a, b); text = 'FPB dari ' + a + ' dan ' + b + ' = ?'; break;
    case 'kpk':
      if (diff === 'mudah') { a = rand(2,8); b = rand(2,8); while(a===b) b = rand(2,8); }
      else if (diff === 'sedang') { a = rand(3,12); b = rand(3,12); while(a===b) b = rand(3,12); }
      else { a = rand(5,20); b = rand(5,20); while(a===b) b = rand(5,20); }
      answer = lcm(a, b); text = 'KPK dari ' + a + ' dan ' + b + ' = ?'; break;
  }

  return { text: text, answer: answer, topic: topic };
}

function topicLabel(t) {
  var labels = {
    penjumlahan: 'Penjumlahan', pengurangan: 'Pengurangan',
    perkalian: 'Perkalian', pembagian: 'Pembagian',
    fpb: 'FPB', kpk: 'KPK'
  };
  return labels[t] || t;
}

function generateOptions(answer) {
  if (answer === undefined || answer === null || isNaN(answer)) {
    console.warn('[MathArena] generateOptions received invalid answer:', answer);
    answer = 42;
  }
  var opts = new Set([answer]);
  var maxAttempts = 100;
  var attempts = 0;
  while (opts.size < 4 && attempts < maxAttempts) {
    attempts++;
    var offset = rand(1, Math.max(5, Math.floor(Math.abs(answer) * 0.3)));
    if (Math.random() > 0.5) offset = -offset;
    var opt = answer + offset;
    if (opt < 0) opt = Math.abs(opt);
    if (opt !== answer) opts.add(opt);
  }
  var fallback = 1;
  while (opts.size < 4) { opts.add(answer + fallback); fallback++; }
  var optsArray = [];
  opts.forEach(function(v) { optsArray.push(v); });
  return shuffle(optsArray);
}

// DOM elements
var menuScreen = document.getElementById('menuScreen');
var battleScreen = document.getElementById('battleScreen');
var catchScreen = document.getElementById('catchScreen');
var resultScreen = document.getElementById('resultScreen');

function startGame(difficulty) {
  state.difficulty = difficulty;
  state.topic = document.getElementById('topicSelect').value;

  var selectedRoute = parseInt(localStorage.getItem('druygon_selectedRoute')) || 1;
  state.route = selectedRoute;

  if (!window.druygonProfile.isRouteUnlocked(state.route)) {
    alert('Route ini masih terkunci! Naik level dulu ya!');
    return;
  }

  var team = window.druygonProfile.getTeam();
  if (team.length > 0) {
    state.player = { name: team[0].name, emoji: team[0].emoji, type: team[0].type, cp: team[0].cp, img: team[0].img };
  } else {
    state.player = { name: 'Pikadru', emoji: '⚡🐭', type: 'Listrik', img: 'pikachu.webp' };
  }

  state.enemyIndex = 0;
  state.score = 0; state.streak = 0; state.bestStreak = 0;
  state.questionsAnswered = 0; state.correctAnswers = 0;
  state.enemiesDefeated = 0; state.totalXPEarned = 0; state.totalCoinsEarned = 0;

  var hpMap = { mudah: 100, sedang: 80, susah: 60 };
  state.playerMaxHP = hpMap[difficulty];
  state.playerHP = state.playerMaxHP;

  spawnEnemy();
  menuScreen.style.display = 'none';
  battleScreen.style.display = 'block';
  catchScreen.style.display = 'none';
  resultScreen.style.display = 'none';

  updateUI();
  nextQuestion();
  playSound(440, 0.1);
}

function spawnEnemy() {
  var profile = window.druygonProfile.get();
  var pokemon = window.getRandomPokemonFromRoute(state.route, profile.level);

  if (!pokemon) {
    state.currentEnemy = {
      id: 'rattata', name: 'Rattata', emoji: '🐀', img: 'rattata.webp', type: 'Normal',
      rarity: 'common', baseHP: 40, attack: 25, catchRate: 0.7, route: 1, level: 1
    };
  } else {
    state.currentEnemy = pokemon;
  }

  state.enemy = state.currentEnemy;

  var baseHP = { mudah: 40, sedang: 60, susah: 80 };
  state.enemyMaxHP = baseHP[state.difficulty] + state.enemiesDefeated * 10;
  state.enemyHP = state.enemyMaxHP;
}

function updateUI() {
  // Player
  document.getElementById('playerName').textContent = state.player.name;
  document.getElementById('playerSprite').innerHTML = window.getPokemonImg(state.player);
  document.getElementById('playerHPBar').style.width = (state.playerHP / state.playerMaxHP * 100) + '%';
  updateHPBarColor('playerHPBar', state.playerHP, state.playerMaxHP);
  document.getElementById('playerHPText').textContent = 'HP: ' + state.playerHP + '/' + state.playerMaxHP;

  // Enemy
  document.getElementById('enemyName').textContent = state.enemy.name;
  document.getElementById('enemySprite').innerHTML = window.getPokemonImg(state.enemy);
  document.getElementById('enemyHPBar').style.width = (state.enemyHP / state.enemyMaxHP * 100) + '%';
  updateHPBarColor('enemyHPBar', state.enemyHP, state.enemyMaxHP);
  document.getElementById('enemyHPText').textContent = 'HP: ' + state.enemyHP + '/' + state.enemyMaxHP;

  // Stats
  document.getElementById('scoreValue').textContent = state.score;
  document.getElementById('streakValue').textContent = state.streak > 0 ? 'x' + state.streak : '0';
  document.getElementById('defeatedValue').textContent = state.enemiesDefeated;
}

function updateHPBarColor(id, hp, max) {
  var bar = document.getElementById(id);
  var pct = hp / max;
  bar.className = 'hp-bar' + (pct < 0.25 ? ' low' : pct < 0.5 ? ' medium' : '');
}

function nextQuestion() {
  var q = generateQuestion();
  state.currentAnswer = q.answer;

  document.getElementById('questionLabel').textContent = topicLabel(q.topic);
  document.getElementById('questionText').textContent = q.text;
  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className = 'feedback';

  var options = generateOptions(q.answer);
  var optionsContainer = document.getElementById('answerOptions');
  optionsContainer.innerHTML = '';
  options.forEach(function(opt) {
    var btn = document.createElement('button');
    btn.className = 'answer-option';
    btn.textContent = opt;
    (function(o, b) {
      btn.onclick = function() { checkAnswer(o, b); };
    })(opt, btn);
    optionsContainer.appendChild(btn);
  });
}

function checkAnswer(selected, btn) {
  // Disable all buttons
  document.querySelectorAll('.answer-option').forEach(function(b) {
    b.onclick = null; b.style.pointerEvents = 'none';
  });

  state.questionsAnswered++;
  var feedback = document.getElementById('feedback');

  if (selected === state.currentAnswer) {
    // ---- CORRECT ----
    state.correctAnswers++;
    state.streak++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;

    var streakBonus = Math.min(state.streak - 1, 5) * 5;
    var points = 10 + streakBonus;
    state.score += points;

    var xp = 10 + streakBonus;
    var coins = 5 + (state.streak > 2 ? 5 : 0);
    state.totalXPEarned += xp;
    state.totalCoinsEarned += coins;
    window.druygonProfile.addXP(xp);
    window.druygonProfile.addCoins(coins);

    var damage = { mudah: 15, sedang: 20, susah: 25 }[state.difficulty] + streakBonus;
    state.enemyHP = Math.max(0, state.enemyHP - damage);

    btn.classList.add('correct');

    // Build feedback with streak badge
    var feedbackHTML = 'Benar! +' + points + ' poin!';
    if (state.streak >= 2) {
      feedbackHTML += ' <span class="streak-badge">x' + state.streak + ' STREAK!</span>';
    }
    feedback.innerHTML = feedbackHTML;
    feedback.className = 'feedback correct';

    playCorrectSound();
    playAttackSound();
    screenFlash('yellow');

    // Player attack animation
    var playerSprite = document.getElementById('playerSprite');
    playerSprite.classList.remove('attacking');
    void playerSprite.offsetWidth;
    playerSprite.classList.add('attacking');
    setTimeout(function() { playerSprite.classList.remove('attacking'); }, 420);

    // Enemy hit + floating damage
    var enemyPanel = document.getElementById('enemyPanel');
    var enemySprite = document.getElementById('enemySprite');
    setTimeout(function() {
      enemySprite.classList.add('hit');
      // Floating damage on enemy
      var dmgText = '-' + damage + ' HP';
      var cls = streakBonus > 0 ? 'big' : '';
      showFloatingDamage('enemyPanel', dmgText, cls);
      setTimeout(function() { enemySprite.classList.remove('hit'); }, 500);
    }, 200);

  } else {
    // ---- WRONG ----
    state.streak = 0;
    var damage2 = { mudah: 10, sedang: 15, susah: 25 }[state.difficulty];
    state.playerHP = Math.max(0, state.playerHP - damage2);

    btn.classList.add('wrong');
    document.querySelectorAll('.answer-option').forEach(function(b) {
      if (parseInt(b.textContent) === state.currentAnswer) b.classList.add('correct');
    });

    feedback.textContent = 'Salah! Jawaban: ' + state.currentAnswer + '. HP -' + damage2;
    feedback.className = 'feedback wrong';

    playWrongSound();
    screenFlash('red');

    // Player shake + red flash + floating damage
    var playerSprite2 = document.getElementById('playerSprite');
    playerSprite2.classList.remove('damaged');
    void playerSprite2.offsetWidth;
    playerSprite2.classList.add('damaged');
    showFloatingDamage('playerPanel', '-' + damage2 + ' HP', '');
    setTimeout(function() { playerSprite2.classList.remove('damaged'); }, 450);
  }

  updateUI();

  setTimeout(function() {
    if (state.enemyHP <= 0) {
      enemyDefeated();
    } else if (state.playerHP <= 0) {
      gameOver(false);
    } else {
      nextQuestion();
    }
  }, 1200);
}

function enemyDefeated() {
  state.enemiesDefeated++;
  state.score += 50;
  playVictorySound();
  window.druygonProfile.addDefeated();
  showCatchScreen();
}

function showCatchScreen() {
  battleScreen.style.display = 'none';
  catchScreen.style.display = 'block';

  var pokemon = state.currentEnemy;

  // Pokemon weakened appearance
  var catchPokemonEl = document.getElementById('catchPokemon');
  catchPokemonEl.innerHTML = window.getPokemonImg(pokemon);
  catchPokemonEl.className = 'catch-pokemon weakened';

  document.getElementById('catchPokemonName').textContent = pokemon.name;
  document.getElementById('catchFeedback').innerHTML = '';
  document.getElementById('continueBattleBtn').style.display = 'none';

  renderPokeballSelect();
}

function renderPokeballSelect() {
  var container = document.getElementById('pokeballSelect');
  container.innerHTML = '';

  window.druygonProfile.load();
  var profile = window.druygonProfile.get();
  var pokeballs = profile.pokeballs;

  Object.keys(window.POKEBALL_TYPES).forEach(function(ballType) {
    var ball = window.POKEBALL_TYPES[ballType];
    var count = pokeballs[ballType] || 0;
    var catchChance = window.calculateCatchChance(state.currentEnemy, ballType);

    var btn = document.createElement('button');
    btn.className = 'pokeball-option poke-btn';

    if (count === 0) {
      btn.style.opacity = '0.3';
      btn.style.pointerEvents = 'none';
      btn.setAttribute('disabled', 'disabled');
    }

    btn.innerHTML =
      '<div style="font-size:2rem;margin-bottom:8px;">' + window.getPokeballImg(ballType) + '</div>' +
      '<div style="font-weight:900;">' + ball.name + '</div>' +
      '<div style="font-size:0.75rem;color:#aaa;">Punya: ' + count + '</div>' +
      '<div style="font-size:0.75rem;color:var(--poke-yellow);">Catch: ' + Math.round(catchChance * 100) + '%</div>';

    if (count > 0) {
      (function(bt) {
        function handleCatch(e) {
          e.preventDefault(); e.stopPropagation();
          btn.removeEventListener('click', handleCatch);
          btn.removeEventListener('touchend', handleCatch);
          attemptCatch(bt);
        }
        btn.addEventListener('click', handleCatch);
        btn.addEventListener('touchend', handleCatch);
      })(ballType);
    }
    container.appendChild(btn);
  });
}

function attemptCatch(ballType) {
  if (typeof ballType !== 'string') { ballType = 'pokeball'; }

  var profile = window.druygonProfile;
  profile.load();
  if (!profile.usePokeball(ballType)) {
    alert('Kamu tidak punya ' + ballType + '!');
    return;
  }

  // Disable buttons
  document.querySelectorAll('.pokeball-option').forEach(function(b) {
    b.style.pointerEvents = 'none'; b.style.opacity = '0.5';
  });

  var feedback = document.getElementById('catchFeedback');
  var catchPokemonEl = document.getElementById('catchPokemon');

  // --- CATCH DRAMA PHASE 1: throw animation ---
  feedback.innerHTML = '<div class="pokeball-throw-anim"><img src="../images/pokemon/pokeball-sm.png" alt="Pokeball" class="pokeball-sprite"></div>';
  playCatchSound();

  setTimeout(function() {
    // --- PHASE 2: Pokemon goes into ball, ball shakes ---
    catchPokemonEl.style.display = 'none'; // Pokemon "absorbed"
    feedback.innerHTML =
      '<div style="font-size:1rem;color:var(--poke-yellow);margin-bottom:8px;">...</div>' +
      '<div class="pokeball-shake-anim"><img src="../images/pokemon/pokeball-sm.png" alt="Pokeball" class="pokeball-sprite"></div>';

    playSound(400, 0.15, 'square');

    setTimeout(function() {
      playSound(350, 0.15, 'square');
    }, 550);

    setTimeout(function() {
      playSound(300, 0.15, 'square');
    }, 1100);

    setTimeout(function() {
      // --- PHASE 3: Result ---
      var success = window.attemptCatch(state.currentEnemy, ballType);

      if (success) {
        var caught = profile.catchPokemon(state.currentEnemy);
        playVictorySound();
        screenFlash('yellow');

        feedback.innerHTML =
          '<div style="animation:bounce 0.4s ease 3;">' + window.getPokemonImg(state.currentEnemy) + '</div>' +
          '<div style="font-family:\'Press Start 2P\',monospace;font-size:0.9rem;color:#FFD700;margin:8px 0;">' + state.currentEnemy.name + ' TERTANGKAP!</div>' +
          '<div style="font-size:0.85rem;color:#aaa;">CP ' + caught.cp + ' • Ditambahkan ke koleksi!</div>';

      } else {
        // Pokemon breaks free — show it again
        catchPokemonEl.style.display = '';
        catchPokemonEl.className = 'catch-pokemon';

        playWrongSound();
        feedback.innerHTML =
          '<div>' + window.getPokemonImg(state.currentEnemy) + '</div>' +
          '<div style="font-family:\'Press Start 2P\',monospace;font-size:0.8rem;color:#FF5722;margin:8px 0;">' + state.currentEnemy.name + ' KABUR!</div>' +
          '<div style="font-size:0.85rem;color:#aaa;">Coba lagi dengan Pokeball lebih kuat!</div>';
      }

      document.getElementById('continueBattleBtn').style.display = 'block';
    }, 1800);

  }, 650);
}

function continueBattle() {
  var profile = window.druygonProfile;
  state.totalXPEarned = 0;
  state.totalCoinsEarned = 0;
  state.playerHP = Math.min(state.playerMaxHP, state.playerHP + 20);

  // Show +heal float briefly before transitioning
  var catchFeedback = document.getElementById('catchFeedback');
  catchFeedback.innerHTML = '<div style="color:#8BC34A;font-weight:900;">+20 HP pulih!</div>';

  setTimeout(function() {
    catchScreen.style.display = 'none';
    if (state.enemiesDefeated >= 5) {
      gameOver(true);
    } else {
      spawnEnemy();
      battleScreen.style.display = 'block';
      updateUI();
      nextQuestion();
    }
  }, 700);
}

function gameOver(won) {
  if (state.totalXPEarned > 0 || state.totalCoinsEarned > 0) {
    setTimeout(function() { window.showRewardPopup(state.totalXPEarned, state.totalCoinsEarned, false); }, 500);
  }
  state.totalXPEarned = 0;
  state.totalCoinsEarned = 0;

  window.druygonProfile.recordGamePlay('mathArena', state.correctAnswers,
    state.questionsAnswered - state.correctAnswers, state.bestStreak);

  battleScreen.style.display = 'none';
  catchScreen.style.display = 'none';
  resultScreen.style.display = 'block';

  if (won) {
    playVictorySound();
    screenFlash('yellow');
    document.getElementById('resultTitle').textContent = 'KAMU MENANG!';
    document.getElementById('resultPokemon').innerHTML = '<img src="../images/pokemon/pikachu.webp" alt="Pikachu">';
    document.getElementById('resultMessage').textContent = 'Hebat! Kamu mengalahkan semua Pokemon liar!';
  } else {
    playDefeatSound();
    screenFlash('red');
    document.getElementById('resultTitle').textContent = 'KALAH...';
    document.getElementById('resultPokemon').innerHTML = '<img src="../images/pokemon/snorlax.png" alt="Snorlax">';
    document.getElementById('resultMessage').textContent = 'Jangan menyerah! Coba lagi ya!';
  }

  document.getElementById('resultScore').textContent = state.score;
  document.getElementById('resultCorrect').textContent = state.correctAnswers + '/' + state.questionsAnswered;
  document.getElementById('resultStreak').textContent = state.bestStreak;
  document.getElementById('resultDefeated').textContent = state.enemiesDefeated;
}

function backToMenu() {
  menuScreen.style.display = 'block';
  battleScreen.style.display = 'none';
  catchScreen.style.display = 'none';
  resultScreen.style.display = 'none';
}

window.continueBattle = continueBattle;

// Back button confirmation + gameplay flag
var isGameActive = false;

var _origStartGame = startGame;
var _origGameOver = gameOver;
var _origBackToMenu = backToMenu;

window.startGame = function(difficulty) {
  if (typeof window.getRandomPokemonFromRoute !== 'function' || typeof window.druygonProfile === 'undefined') {
    alert('Game masih loading... Tunggu 2 detik lalu coba lagi.');
    return;
  }
  try {
    isGameActive = true;
    _origStartGame(difficulty);
  } catch(e) {
    isGameActive = false;
    console.error('[MathArena] startGame error:', e);
    alert('Terjadi error: ' + e.message + '. Coba refresh halaman.');
  }
};

gameOver = function(won) {
  isGameActive = false;
  _origGameOver(won);
};

window.backToMenu = function() {
  if (isGameActive && battleScreen.style.display === 'block') {
    if (confirm('Yakin mau keluar? Progress battle akan hilang!')) {
      isGameActive = false;
      _origBackToMenu();
    }
  } else {
    _origBackToMenu();
  }
};

window.addEventListener('beforeunload', function(e) {
  if (isGameActive && battleScreen.style.display === 'block') {
    e.preventDefault(); e.returnValue = ''; return '';
  }
});
