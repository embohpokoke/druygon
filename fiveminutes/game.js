// ES5 compatible for iPhone 7 Plus Safari
// 5 Menit Matematika — Druygon
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
  } catch(e) {}
}
function sfxCorrect() { playSound(523,.08); setTimeout(function(){playSound(659,.08);},80); setTimeout(function(){playSound(784,.15);},160); }
function sfxWrong() { playSound(200,.15,'sawtooth'); setTimeout(function(){playSound(150,.2,'sawtooth');},150); }
function sfxTick() { playSound(800,.03); }
function sfxEnd() { var freqs = [523,659,784,1047]; for (var i = 0; i < freqs.length; i++) { (function(f, idx) { setTimeout(function(){playSound(f,.2);}, idx*150); })(freqs[i], i); } }

// State
var difficulty = 'kelas4';
var ops = [];
var timer = null;
var timeLeft = 300; // 5 min in seconds
var TOTAL_TIME = 300;
var score = 0, correct = 0, wrong = 0, streak = 0, bestStreak = 0;
var currentAnswer = null;
var gameActive = false;

function setDifficulty(d, btn) {
  difficulty = d;
  var buttons = document.querySelectorAll('.diff-btn');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('active');
  }
  btn.classList.add('active');
}

function getOps() {
  var o = [];
  if (document.getElementById('opAdd').checked) o.push('add');
  if (document.getElementById('opSub').checked) o.push('sub');
  if (document.getElementById('opMul').checked) o.push('mul');
  if (document.getElementById('opDiv').checked) o.push('div');
  return o.length ? o : ['add','sub','mul','div'];
}

function rand(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }

function generateQuestion() {
  ops = getOps();
  var op = ops[Math.floor(Math.random()*ops.length)];
  var k4 = difficulty === 'kelas4';
  var a, b, answer, text, label;

  switch(op) {
    case 'add':
      a = k4 ? rand(5,50) : rand(50,500);
      b = k4 ? rand(5,50) : rand(50,500);
      answer = a + b;
      text = a + ' + ' + b + ' = ?';
      label = 'Penjumlahan';
      break;
    case 'sub':
      a = k4 ? rand(20,99) : rand(100,999);
      b = k4 ? rand(1, a-1) : rand(1, a-1);
      answer = a - b;
      text = a + ' − ' + b + ' = ?';
      label = 'Pengurangan';
      break;
    case 'mul':
      if (k4) { a = rand(2,12); b = rand(2,12); }
      else { a = rand(5,25); b = rand(3,15); }
      answer = a * b;
      text = a + ' × ' + b + ' = ?';
      label = 'Perkalian';
      break;
    case 'div':
      if (k4) { b = rand(2,10); answer = rand(2,10); }
      else { b = rand(3,15); answer = rand(5,30); }
      a = b * answer;
      text = a + ' ÷ ' + b + ' = ?';
      label = 'Pembagian';
      break;
  }
  return { text: text, answer: answer, label: label };
}

function showQuestion() {
  var q = generateQuestion();
  currentAnswer = q.answer;
  document.getElementById('questionText').textContent = q.text;
  document.getElementById('questionLabel').textContent = q.label;
  document.getElementById('answerInput').value = '';
  document.getElementById('answerInput').focus();
}

function submitAnswer() {
  if (!gameActive) return;
  var input = document.getElementById('answerInput');
  var val = parseInt(input.value);
  if (isNaN(val)) { input.focus(); return; }

  var fb = document.getElementById('feedback');
  var sd = document.getElementById('streakDisplay');

  if (val === currentAnswer) {
    correct++;
    streak++;
    if (streak > bestStreak) bestStreak = streak;
    var bonus = Math.min(streak - 1, 10) * 2;
    score += 10 + bonus;
    fb.textContent = streak > 2 ? 'Super Effective! +' + (10+bonus) : 'Benar! +' + (10+bonus);
    fb.className = 'feedback correct';
    if (streak >= 3) sd.textContent = 'Streak x' + streak + '!';
    else sd.textContent = '';
    sfxCorrect();
  } else {
    wrong++;
    streak = 0;
    fb.textContent = 'Not very effective... Jawaban: ' + currentAnswer;
    fb.className = 'feedback wrong';
    sd.textContent = '';
    sfxWrong();
  }

  updateStats();
  showQuestion();
}

function updateStats() {
  document.getElementById('scoreVal').textContent = score;
  document.getElementById('correctVal').textContent = correct;
  document.getElementById('wrongVal').textContent = wrong;
  document.getElementById('streakVal').textContent = streak > 0 ? 'x' + streak : '0';
}

function updateTimer() {
  timeLeft--;
  if (timeLeft <= 0) { endGame(); return; }
  var m = Math.floor(timeLeft/60);
  var s = timeLeft % 60;
  var display = document.getElementById('timerDisplay');
  var sStr = s < 10 ? '0' + s : s;
  display.textContent = m + ':' + sStr;

  var pct = (timeLeft / TOTAL_TIME) * 100;
  var bar = document.getElementById('timerProgress');
  bar.style.width = pct + '%';

  if (pct < 20) { bar.className = 'timer-progress low'; display.classList.add('urgent'); }
  else if (pct < 50) { bar.className = 'timer-progress medium'; display.classList.remove('urgent'); }
  else { bar.className = 'timer-progress'; display.classList.remove('urgent'); }

  if (timeLeft <= 10) sfxTick();
}

function startGame() {
  ops = getOps();
  score = 0; correct = 0; wrong = 0; streak = 0; bestStreak = 0;
  timeLeft = TOTAL_TIME;
  gameActive = true;

  document.getElementById('menuScreen').style.display = 'none';
  document.getElementById('battleScreen').style.display = 'block';
  document.getElementById('resultScreen').style.display = 'none';
  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className = 'feedback';
  document.getElementById('streakDisplay').textContent = '';
  document.getElementById('timerDisplay').textContent = '5:00';
  document.getElementById('timerDisplay').classList.remove('urgent');
  document.getElementById('timerProgress').style.width = '100%';
  document.getElementById('timerProgress').className = 'timer-progress';

  updateStats();
  showQuestion();

  if (timer) clearInterval(timer);
  timer = setInterval(updateTimer, 1000);

  // Init audio context on user gesture
  getAudioCtx();
}

function endGame() {
  gameActive = false;
  if (timer) { clearInterval(timer); timer = null; }
  sfxEnd();

  var total = correct + wrong;
  var accuracy = total > 0 ? Math.round((correct/total)*100) : 0;

  // Calculate XP and coins
  var xp = correct * 10; // 10 XP per correct
  var streakBonus = bestStreak > 2 ? bestStreak * 5 : 0;
  var totalXP = xp + streakBonus;
  var coins = correct * 5 + (bestStreak > 2 ? bestStreak * 3 : 0);

  // Award to profile
  var leveledUp = window.druygonProfile.addXP(totalXP);
  window.druygonProfile.addCoins(coins);
  window.druygonProfile.recordGamePlay('fiveMinute', correct, wrong, bestStreak);

  // Show reward popup
  setTimeout(function() {
    window.showRewardPopup(totalXP, coins, leveledUp);
  }, 500);

  // Stars: ⭐ = played, ⭐⭐ = 60%+, ⭐⭐⭐ = 80%+
  var stars = '⭐';
  var msg = 'Terus berlatih ya!';
  if (accuracy >= 80) { stars = 'RANK A'; msg = 'LUAR BIASA! Kamu Pokemon Master!'; }
  else if (accuracy >= 60) { stars = 'RANK B'; msg = 'Bagus sekali! Hampir sempurna!'; }
  else { stars = 'RANK C'; }

  document.getElementById('resultScreen').style.display = 'block';
  document.getElementById('battleScreen').style.display = 'none';
  document.getElementById('starsDisplay').textContent = stars;
  document.getElementById('resultEmoji').innerHTML = accuracy >= 80
    ? '<img src="../images/pokemon/dragonite.png" alt="Dragonite" class="result-sprite">'
    : accuracy >= 60
      ? '<img src="../images/pokemon/pikachu.webp" alt="Pikachu" class="result-sprite">'
      : '<img src="../images/pokemon/squirtle.webp" alt="Squirtle" class="result-sprite">';
  document.getElementById('resultTitle').textContent = 'WAKTU HABIS!';
  document.getElementById('resultMessage').textContent = msg;
  document.getElementById('rScore').textContent = score;
  document.getElementById('rCorrect').textContent = correct;
  document.getElementById('rWrong').textContent = wrong;
  document.getElementById('rTotal').textContent = total;
  document.getElementById('rAccuracy').textContent = accuracy + '%';
  document.getElementById('rStreak').textContent = bestStreak;
}

function backToMenu() {
  gameActive = false;
  if (timer) { clearInterval(timer); timer = null; }
  document.getElementById('menuScreen').style.display = 'block';
  document.getElementById('battleScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'none';
}

// Enter key to submit
document.getElementById('answerInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') submitAnswer();
});
