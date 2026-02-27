// Quiz Logic for Al-'Ashr Material
// ES5 JavaScript only - no const/let, no arrow functions, no template literals

var quizQuestions = [
  {
    question: 'Apa nama kucing peliharaan Tareq?',
    options: ['Garfield', 'Simba', 'Tom', 'Felix'],
    correct: 1 // index 1 = Simba
  },
  {
    question: 'Surat Al-\'Ashr artinya?',
    options: ['Demi Malam', 'Demi Masa/Waktu', 'Demi Fajar', 'Demi Siang'],
    correct: 1 // Demi Masa/Waktu
  },
  {
    question: 'Berapa ayat Surat Al-\'Ashr?',
    options: ['2 ayat', '3 ayat', '4 ayat', '5 ayat'],
    correct: 1 // 3 ayat
  },
  {
    question: 'Menurut Surat Al-\'Ashr, manusia berada dalam...?',
    options: ['Kebahagiaan', 'Kerugian', 'Kesedihan', 'Kemenangan'],
    correct: 1 // Kerugian
  },
  {
    question: 'Siapa yang TIDAK rugi menurut Al-\'Ashr?',
    options: [
      'Yang kaya raya',
      'Yang terkenal',
      'Yang beriman & beramal saleh & saling menasihati',
      'Yang pintar'
    ],
    correct: 2 // Yang beriman & beramal saleh & saling menasihati
  },
  {
    question: 'Apa yang dilupakan Tareq saat menonton TV?',
    options: ['Shalat', 'Memberi makan Simba', 'Mengaji', 'Belajar'],
    correct: 1 // Memberi makan Simba
  },
  {
    question: 'Siapa yang mengejek Arya di masjid?',
    options: ['Tareq', 'Bagas', 'Pak Ustadz', 'Simba'],
    correct: 1 // Bagas
  },
  {
    question: 'Apa yang dilakukan Tareq saat Bagas mengejek Arya?',
    options: [
      'Ikut mengejek',
      'Diam saja',
      'Mengingatkan Bagas dengan baik',
      'Lapor ke guru'
    ],
    correct: 2 // Mengingatkan Bagas dengan baik
  },
  {
    question: 'Mengapa waktu penting menurut Al-\'Ashr?',
    options: [
      'Karena waktu adalah uang',
      'Karena waktu tidak bisa diulang',
      'Karena waktu cepat berlalu',
      'Karena waktu berharga'
    ],
    correct: 1 // Karena waktu tidak bisa diulang
  },
  {
    question: 'Saling menasihati untuk kebenaran termasuk bagian dari...?',
    options: ['Surat Al-Fatihah', 'Surat Al-\'Ashr', 'Surat Al-Ikhlas', 'Surat An-Nas'],
    correct: 1 // Surat Al-'Ashr
  }
];

var currentQuestionIndex = 0;
var userAnswers = [];
var sectionsRead = {
  '1': false,
  '2': false,
  '3': false,
  '4': false
};

// Toggle story card open/close
function toggleStory(header) {
  var card = header.parentElement;
  card.classList.toggle('open');
  
  // Mark section as read
  var sectionId = card.id.replace('section-', '');
  if (!sectionsRead[sectionId]) {
    sectionsRead[sectionId] = true;
    updateQuizLock();
  }
}

// Update quiz lock status
function updateQuizLock() {
  var allRead = sectionsRead['1'] && sectionsRead['2'] && sectionsRead['3'] && sectionsRead['4'];
  
  // Update badges
  for (var i = 1; i <= 4; i++) {
    var badge = document.getElementById('badge-' + i);
    if (sectionsRead[i.toString()]) {
      badge.textContent = '✅ Bagian ' + i;
      badge.classList.add('read');
    }
  }
  
  // Unlock quiz if all sections read
  if (allRead) {
    document.getElementById('quizLocked').style.display = 'none';
    document.getElementById('quizContent').style.display = 'block';
    loadQuestion(0);
  }
}

// Load question
function loadQuestion(index) {
  currentQuestionIndex = index;
  var q = quizQuestions[index];
  
  var html = '<div class="question-card">' +
    '<div class="question-number">Soal ' + (index + 1) + ' dari ' + quizQuestions.length + '</div>' +
    '<div class="question-text">' + q.question + '</div>';
  
  for (var i = 0; i < q.options.length; i++) {
    var selectedClass = userAnswers[index] === i ? ' selected' : '';
    html += '<button class="option-btn' + selectedClass + '" onclick="selectAnswer(' + i + ')">' +
      '<strong>' + String.fromCharCode(65 + i) + '.</strong> ' + q.options[i] +
      '</button>';
  }
  
  html += '</div>';
  document.getElementById('questionContainer').innerHTML = html;
  
  // Update navigation buttons
  document.getElementById('prevBtn').style.display = index > 0 ? 'inline-block' : 'none';
  document.getElementById('nextBtn').style.display = index < quizQuestions.length - 1 ? 'inline-block' : 'none';
  document.getElementById('submitBtn').style.display = index === quizQuestions.length - 1 ? 'inline-block' : 'none';
}

// Select answer
function selectAnswer(optionIndex) {
  userAnswers[currentQuestionIndex] = optionIndex;
  loadQuestion(currentQuestionIndex); // Reload to show selection
}

// Navigation
function nextQuestion() {
  if (currentQuestionIndex < quizQuestions.length - 1) {
    loadQuestion(currentQuestionIndex + 1);
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    loadQuestion(currentQuestionIndex - 1);
  }
}

// Submit quiz
function submitQuiz() {
  // Check if all questions answered
  if (userAnswers.length < quizQuestions.length) {
    alert('Jawab semua soal dulu ya! 📝');
    return;
  }
  
  // Calculate score
  var correctCount = 0;
  for (var i = 0; i < quizQuestions.length; i++) {
    if (userAnswers[i] === quizQuestions[i].correct) {
      correctCount++;
    }
  }
  
  var score = correctCount;
  var percentage = (correctCount / quizQuestions.length) * 100;
  var passed = percentage >= 80;
  
  // Award XP & Coins
  var xpPerCorrect = 15;
  var coinsPerCorrect = 8;
  var totalXP = correctCount * xpPerCorrect;
  var totalCoins = correctCount * coinsPerCorrect;
  
  // Bonus if passed
  var bonusXP = 0;
  var bonusCoins = 0;
  if (passed) {
    bonusXP = 50;
    bonusCoins = 25;
    totalXP += bonusXP;
    totalCoins += bonusCoins;
  }
  
  // Add to profile
  var leveledUp = window.druygonProfile.addXP(totalXP);
  window.druygonProfile.addCoins(totalCoins);
  window.druygonProfile.save();
  
  // Save progress
  saveProgress(score, passed);
  
  // Show result
  showResult(score, percentage, passed, totalXP, totalCoins, bonusXP, bonusCoins, leveledUp);
}

// Save progress to localStorage
function saveProgress(score, completed) {
  var progress = localStorage.getItem('druygon_ramadhan_progress');
  var data = {};
  
  if (progress) {
    try {
      data = JSON.parse(progress);
    } catch(e) {
      data = {};
    }
  }
  
  if (!data.materials) {
    data.materials = {};
  }
  
  if (!data.materials['al-ashr']) {
    data.materials['al-ashr'] = {};
  }
  
  // Update best score
  var currentBest = data.materials['al-ashr'].bestScore || 0;
  if (score > currentBest) {
    data.materials['al-ashr'].bestScore = score;
  }
  
  // Mark as completed if passed
  if (completed) {
    data.materials['al-ashr'].completed = true;
  }
  
  localStorage.setItem('druygon_ramadhan_progress', JSON.stringify(data));
}

// Show result
function showResult(score, percentage, passed, totalXP, totalCoins, bonusXP, bonusCoins, leveledUp) {
  document.getElementById('quizContent').style.display = 'none';
  document.getElementById('quizResult').style.display = 'block';
  
  var resultIcon = document.getElementById('resultIcon');
  var resultTitle = document.getElementById('resultTitle');
  var resultScoreEl = document.getElementById('resultScore');
  var resultMessage = document.getElementById('resultMessage');
  var resultReward = document.getElementById('resultReward');
  
  if (passed) {
    resultIcon.textContent = '🎉✨';
    resultTitle.textContent = 'Selamat! Kamu Lulus! 🏆';
    resultTitle.style.color = 'var(--poke-green)';
    resultScoreEl.textContent = score + ' / 10';
    resultScoreEl.style.color = 'var(--poke-green)';
    resultMessage.textContent = 'Nilai kamu ' + percentage.toFixed(0) + '%! Kamu sudah memahami pelajaran dari Al-\'Ashr dengan baik! 🌟';
    
    var rewardHTML = '<div style="font-weight:bold;color:var(--poke-yellow);margin-bottom:10px;">🎁 Hadiah:</div>';
    rewardHTML += '<div style="color:var(--poke-green);font-size:1.2rem;font-weight:900;">';
    rewardHTML += '+' + totalXP + ' XP (' + (score * 15) + ' + bonus ' + bonusXP + ')';
    rewardHTML += '<br>+' + totalCoins + ' Koin (' + (score * 8) + ' + bonus ' + bonusCoins + ')';
    rewardHTML += '</div>';
    
    if (leveledUp) {
      rewardHTML += '<div style="margin-top:10px;color:var(--poke-yellow);font-weight:bold;font-size:1.1rem;">⭐ LEVEL UP! ⭐</div>';
    }
    
    resultReward.innerHTML = rewardHTML;
    
    // Show popup
    setTimeout(function() {
      window.showRewardPopup(totalXP, totalCoins, leveledUp);
    }, 500);
    
  } else {
    resultIcon.textContent = '😔';
    resultTitle.textContent = 'Belum Lulus';
    resultTitle.style.color = '#FF9800';
    resultScoreEl.textContent = score + ' / 10';
    resultScoreEl.style.color = '#FF9800';
    resultMessage.textContent = 'Nilai kamu ' + percentage.toFixed(0) + '%. Butuh minimal 80% untuk lulus. Baca lagi materinya dan coba lagi ya! 📖';
    
    var rewardHTML = '<div style="font-weight:bold;color:#aaa;margin-bottom:10px;">Hadiah XP & Koin:</div>';
    rewardHTML += '<div style="color:#ccc;font-size:1.1rem;font-weight:700;">';
    rewardHTML += '+' + totalXP + ' XP | +' + totalCoins + ' Koin';
    rewardHTML += '</div>';
    rewardHTML += '<div style="margin-top:8px;font-size:0.85rem;color:#888;">(Tetap dapat XP & koin untuk jawaban benar!)</div>';
    resultReward.innerHTML = rewardHTML;
  }
}

// Retry quiz
function retryQuiz() {
  currentQuestionIndex = 0;
  userAnswers = [];
  document.getElementById('quizResult').style.display = 'none';
  document.getElementById('quizContent').style.display = 'block';
  loadQuestion(0);
  
  // Scroll to quiz section
  document.getElementById('quizSection').scrollIntoView({ behavior: 'smooth' });
}

// Initialize on load
window.addEventListener('load', function() {
  // Check if quiz should be unlocked (if user has read before)
  updateQuizLock();
});
