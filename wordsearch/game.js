// ES5 compatible for iPhone 7 Plus Safari
// Word Search Indonesia - Pokemon Theme
var CATEGORIES = {
  hewan: {
    label: '🐾 Hewan', words: [
      'KUCING','ANJING','KELINCI','KUDA','SAPI','KAMBING','AYAM','BEBEK',
      'IKAN','BURUNG','ULAR','GAJAH','HARIMAU','SINGA','MONYET',
      'RUSA','DOMBA','KERBAU','TIKUS','RUBAH','ELANG','PAUS','LUMBA'
    ]
  },
  buah: {
    label: '🍎 Buah', words: [
      'APEL','JERUK','MANGGA','PISANG','ANGGUR','SEMANGKA','PEPAYA',
      'NANAS','DURIAN','SALAK','MELON','JAMBU','KELAPA','RAMBUTAN',
      'LEMON','ALPUKAT','SIRSAK','KURMA','CERI','NANGKA','DELIMA','MARKISA'
    ]
  },
  warna: {
    label: '🎨 Warna', words: [
      'MERAH','BIRU','HIJAU','KUNING','PUTIH','HITAM','COKLAT',
      'UNGU','PINK','EMAS','PERAK','JINGGA','KREM','VIOLET',
      'NILA','CYAN','TEAL','MAGENTA','MAROON','CORAL'
    ]
  },
  katakerja: {
    label: '🏃 Kata Kerja', words: [
      'BERLARI','MAKAN','MINUM','TIDUR','DUDUK','BERDIRI','MENULIS',
      'MEMBACA','BERMAIN','BERENANG','TERBANG','MELOMPAT','MENARI',
      'BERNYANYI','MEMASAK','MENCUCI','BELAJAR','MEMBANTU','TERTAWA',
      'MENGGAMBAR','BERBICARA','MENDENGAR'
    ]
  },
  alam: {
    label: '🌿 Alam', words: [
      'GUNUNG','SUNGAI','LAUT','DANAU','HUTAN','PANTAI','BUKIT',
      'PADANG','PULAU','LANGIT','AWAN','HUJAN','ANGIN','PETIR',
      'BINTANG','MATAHARI','BULAN','TANAH','BATU','PASIR','POHON','RUMPUT'
    ]
  },
  tubuh: {
    label: '🦶 Tubuh', words: [
      'KEPALA','MATA','HIDUNG','MULUT','TELINGA','TANGAN','KAKI',
      'JARI','LUTUT','BAHU','PERUT','DADA','LEHER','SIKU',
      'TUMIT','BIBIR','GIGI','LIDAH','PIPI','DAHI','ALIS','RAMBUT'
    ]
  }
};

var DIRECTIONS = [
  [0,1],[1,0],[1,1],[0,-1],[-1,0],[-1,-1],[1,-1],[-1,1]
];

var state = {
  grid: [], gridSize: 0, words: [], foundWords: [],
  placedWords: [], category: 'hewan', difficulty: 'mudah',
  selecting: false, selectedCells: [], startCell: null,
  timer: 0, timerInterval: null, score: 0, hintsUsed: 0, maxHints: 3
};

function selectCategory(cat) {
  state.category = cat;
  var buttons = document.querySelectorAll('.cat-btn');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('selected');
  }
  document.querySelector('[data-cat="' + cat + '"]').classList.add('selected');
}

function startGame(difficulty) {
  state.difficulty = difficulty;
  var sizeMap = { mudah: 8, sedang: 10, susah: 12 };
  state.gridSize = sizeMap[difficulty];
  state.foundWords = [];
  state.score = 0; state.timer = 0; state.hintsUsed = 0;
  state.maxHints = { mudah: 5, sedang: 3, susah: 2 }[difficulty];

  // Pick words that fit in grid
  var allWords = CATEGORIES[state.category].words.filter(function(w) { return w.length <= state.gridSize; });
  var wordCount = { mudah: 6, sedang: 8, susah: 10 }[difficulty];
  state.words = shuffle(allWords.slice()).slice(0, wordCount);

  generateGrid();

  document.getElementById('menuScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  document.getElementById('resultScreen').style.display = 'none';

  renderGrid();
  renderWordList();
  updateStats();
  startTimer();
}

function generateGrid() {
  var size = state.gridSize;
  var newGrid = [];
  for (var i = 0; i < size; i++) {
    var row = [];
    for (var j = 0; j < size; j++) {
      row.push('');
    }
    newGrid.push(row);
  }
  state.grid = newGrid;
  state.placedWords = [];

  for (var w = 0; w < state.words.length; w++) {
    var word = state.words[w];
    var placed = false;
    for (var attempt = 0; attempt < 200; attempt++) {
      var dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      var row = Math.floor(Math.random() * size);
      var col = Math.floor(Math.random() * size);

      if (canPlace(word, row, col, dir)) {
        placeWord(word, row, col, dir);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Try only horizontal/vertical
      for (var attempt2 = 0; attempt2 < 100; attempt2++) {
        var dir2 = DIRECTIONS[Math.floor(Math.random() * 2)];
        var row2 = Math.floor(Math.random() * size);
        var col2 = Math.floor(Math.random() * size);
        if (canPlace(word, row2, col2, dir2)) {
          placeWord(word, row2, col2, dir2);
          placed = true;
          break;
        }
      }
    }
    if (!placed) {
      // Remove word from list if can't place
      var newWords = [];
      for (var x = 0; x < state.words.length; x++) {
        if (state.words[x] !== word) {
          newWords.push(state.words[x]);
        }
      }
      state.words = newWords;
    }
  }

  // Fill empty cells
  var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (var r = 0; r < size; r++) {
    for (var c = 0; c < size; c++) {
      if (!state.grid[r][c]) {
        state.grid[r][c] = letters[Math.floor(Math.random() * 26)];
      }
    }
  }
}

function canPlace(word, row, col, dir) {
  var size = state.gridSize;
  for (var i = 0; i < word.length; i++) {
    var r = row + dir[0] * i;
    var c = col + dir[1] * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (state.grid[r][c] && state.grid[r][c] !== word[i]) return false;
  }
  return true;
}

function placeWord(word, row, col, dir) {
  var cells = [];
  for (var i = 0; i < word.length; i++) {
    var r = row + dir[0] * i;
    var c = col + dir[1] * i;
    state.grid[r][c] = word[i];
    cells.push(r + '-' + c);
  }
  state.placedWords.push({ word: word, cells: cells });
}

function renderGrid() {
  var container = document.getElementById('grid');
  container.style.gridTemplateColumns = 'repeat(' + state.gridSize + ', 1fr)';
  container.innerHTML = '';
  container.style.touchAction = 'none';

  for (var r = 0; r < state.gridSize; r++) {
    for (var c = 0; c < state.gridSize; c++) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = state.grid[r][c];
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.id = 'cell-' + r + '-' + c;
      container.appendChild(cell);
    }
  }

  // Pointer events (modern browsers)
  container.addEventListener('pointerdown', function(e) {
    e.preventDefault();
    var cell = getCellFromPoint(e.clientX, e.clientY);
    if (cell) startSelect(cell.r, cell.c, e);
  });
  container.addEventListener('pointermove', function(e) {
    e.preventDefault();
    if (!state.selecting) return;
    var cell = getCellFromPoint(e.clientX, e.clientY);
    if (cell) continueSelect(cell.r, cell.c, e);
  });
  container.addEventListener('pointerup', function(e) { endSelect(e); });
  container.addEventListener('pointerleave', function(e) { endSelect(e); });
  document.addEventListener('pointerup', endSelect);

  // Touch event fallback (older iOS Safari)
  container.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.touches[0];
    var cell = getCellFromPoint(t.clientX, t.clientY);
    if (cell) startSelect(cell.r, cell.c, e);
  }, { passive: false });
  container.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (!state.selecting) return;
    var t = e.touches[0];
    var cell = getCellFromPoint(t.clientX, t.clientY);
    if (cell) continueSelect(cell.r, cell.c, e);
  }, { passive: false });
  container.addEventListener('touchend', function(e) { endSelect(e); });
  document.addEventListener('touchend', endSelect);
}

function getCellFromPoint(x, y) {
  var el = document.elementFromPoint(x, y);
  if (el && el.classList.contains('cell')) {
    return { r: parseInt(el.dataset.row), c: parseInt(el.dataset.col) };
  }
  return null;
}

function startSelect(r, c, e) {
  e.preventDefault();
  state.selecting = true;
  state.startCell = { r: r, c: c };
  state.selectedCells = [r + '-' + c];
  highlightSelected();
}

function continueSelect(r, c, e) {
  if (!state.selecting) return;
  e.preventDefault();

  var sr = state.startCell.r;
  var sc = state.startCell.c;
  var dr = (r > sr ? 1 : (r < sr ? -1 : 0));
  var dc = (c > sc ? 1 : (c < sc ? -1 : 0));

  // Must be in a valid direction (straight line)
  if (r !== sr && c !== sc && Math.abs(r - sr) !== Math.abs(c - sc)) return;

  state.selectedCells = [];
  var cr = sr;
  var cc = sc;
  while (true) {
    state.selectedCells.push(cr + '-' + cc);
    if (cr === r && cc === c) break;
    cr += dr; cc += dc;
    if (cr < 0 || cr >= state.gridSize || cc < 0 || cc >= state.gridSize) break;
  }
  highlightSelected();
}

function endSelect(e) {
  if (!state.selecting) return;
  state.selecting = false;

  // Check if selection matches a word
  var selectedStr = '';
  for (var i = 0; i < state.selectedCells.length; i++) {
    var parts = state.selectedCells[i].split('-');
    var r = parseInt(parts[0]);
    var c = parseInt(parts[1]);
    selectedStr += state.grid[r][c];
  }

  var reversedStr = '';
  for (var i = selectedStr.length - 1; i >= 0; i--) {
    reversedStr += selectedStr[i];
  }

  var match = null;
  for (var i = 0; i < state.placedWords.length; i++) {
    var pw = state.placedWords[i];
    if (state.foundWords.indexOf(pw.word) === -1 &&
        (pw.word === selectedStr || pw.word === reversedStr)) {
      match = pw;
      break;
    }
  }

  if (match) {
    state.foundWords.push(match.word);
    state.score += match.word.length * 10;

    // Mark cells as found
    for (var i = 0; i < match.cells.length; i++) {
      var id = match.cells[i];
      document.getElementById('cell-' + id).classList.add('found');
    }

    renderWordList();
    updateStats();
    showFeedback('✅ "' + match.word + '" ditemukan! +' + (match.word.length * 10) + ' poin!', true);
    playCorrectSound();

    if (state.foundWords.length === state.words.length) {
      setTimeout(function() { gameOver(); }, 800);
    }
  } else {
    clearSelected();
  }

  // Clear non-found selection highlights
  var selectingCells = document.querySelectorAll('.cell.selecting');
  for (var i = 0; i < selectingCells.length; i++) {
    selectingCells[i].classList.remove('selecting');
  }
}

function highlightSelected() {
  var selectingCells = document.querySelectorAll('.cell.selecting');
  for (var i = 0; i < selectingCells.length; i++) {
    selectingCells[i].classList.remove('selecting');
  }
  for (var i = 0; i < state.selectedCells.length; i++) {
    var id = state.selectedCells[i];
    var el = document.getElementById('cell-' + id);
    if (el && !el.classList.contains('found')) el.classList.add('selecting');
  }
}

function clearSelected() {
  state.selectedCells = [];
  var selectingCells = document.querySelectorAll('.cell.selecting');
  for (var i = 0; i < selectingCells.length; i++) {
    selectingCells[i].classList.remove('selecting');
  }
}

function renderWordList() {
  var container = document.getElementById('wordList');
  var html = '';
  for (var i = 0; i < state.words.length; i++) {
    var w = state.words[i];
    var foundClass = state.foundWords.indexOf(w) !== -1 ? 'found' : '';
    html += '<span class="word-tag ' + foundClass + '">' + w + '</span>';
  }
  container.innerHTML = html;
}

function updateStats() {
  document.getElementById('foundCount').textContent = state.foundWords.length + '/' + state.words.length;
  document.getElementById('scoreValue').textContent = state.score;
  document.getElementById('hintCount').textContent = (state.maxHints - state.hintsUsed);
}

function startTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(function() {
    state.timer++;
    var min = Math.floor(state.timer / 60);
    var sec = state.timer % 60;
    var minStr = min < 10 ? '0' + min : min;
    var secStr = sec < 10 ? '0' + sec : sec;
    document.getElementById('timerValue').textContent = minStr + ':' + secStr;
  }, 1000);
}

function useHint() {
  if (state.hintsUsed >= state.maxHints) {
    showFeedback('❌ Hint sudah habis!', false);
    return;
  }

  var remaining = [];
  for (var i = 0; i < state.words.length; i++) {
    if (state.foundWords.indexOf(state.words[i]) === -1) {
      remaining.push(state.words[i]);
    }
  }
  if (remaining.length === 0) return;

  var word = remaining[Math.floor(Math.random() * remaining.length)];
  var placed = null;
  for (var i = 0; i < state.placedWords.length; i++) {
    if (state.placedWords[i].word === word) {
      placed = state.placedWords[i];
      break;
    }
  }
  if (placed) {
    state.hintsUsed++;
    // Highlight first letter
    var cellId = placed.cells[0];
    var el = document.getElementById('cell-' + cellId);
    el.classList.add('hint');
    setTimeout(function() { el.classList.remove('hint'); }, 3000);
    showFeedback('💡 Cari kata "' + word + '" — huruf pertama ditandai!', true);
    updateStats();
  }
}

function showFeedback(msg, positive) {
  var el = document.getElementById('feedback');
  el.textContent = msg;
  el.style.color = positive ? '#8BC34A' : '#FF5722';
  setTimeout(function() { el.textContent = ''; }, 2500);
}

function gameOver() {
  clearInterval(state.timerInterval);

  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'block';

  // Time bonus
  var timeBonus = Math.max(0, 300 - state.timer) * 2;
  state.score += timeBonus;

  // Calculate XP and coins
  var wordsFound = state.foundWords.length;
  var xp = wordsFound * 15; // 15 XP per word
  var coins = wordsFound * 8; // 8 coins per word

  // Award to profile
  var leveledUp = window.druygonProfile.addXP(xp);
  window.druygonProfile.addCoins(coins);
  window.druygonProfile.recordGamePlay('wordSearch', wordsFound,
    state.words.length - wordsFound, 0);

  // Show reward popup
  setTimeout(function() {
    window.showRewardPopup(xp, coins, leveledUp);
  }, 500);

  document.getElementById('resultScore').textContent = state.score;
  var minStr = Math.floor(state.timer/60) < 10 ? '0' + Math.floor(state.timer/60) : Math.floor(state.timer/60);
  var secStr = (state.timer%60) < 10 ? '0' + (state.timer%60) : (state.timer%60);
  document.getElementById('resultTime').textContent = minStr + ':' + secStr;
  document.getElementById('resultWords').textContent = state.foundWords.length + '/' + state.words.length;
  document.getElementById('resultHints').textContent = state.hintsUsed;

  playVictorySound();
}

function backToMenu() {
  clearInterval(state.timerInterval);
  document.getElementById('menuScreen').style.display = 'block';
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'none';
}

// Sound effects
var audioCtx;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playSound(freq, dur, type) {
  if (type === undefined) type = 'square';
  try {
    var ctx = getAudioCtx();
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = 0.12; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch(e){}
}
function playCorrectSound() {
  playSound(523,0.1); setTimeout(function(){playSound(659,0.1);},100); setTimeout(function(){playSound(784,0.15);},200);
}
function playVictorySound() {
  var freqs = [523,659,784,1047];
  for (var i = 0; i < freqs.length; i++) {
    (function(f, idx) {
      setTimeout(function(){playSound(f,0.2);}, idx*150);
    })(freqs[i], i);
  }
}

function shuffle(arr) {
  for (var i = arr.length-1; i > 0; i--) {
    var j = Math.floor(Math.random()*(i+1));
    var temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

// Expose
window.selectCategory = selectCategory;
window.startGame = startGame;
window.useHint = useHint;
window.backToMenu = backToMenu;
