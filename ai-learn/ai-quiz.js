(function(window, document) {
  var state = {
    questions: [],
    index: 0,
    correct: 0,
    wrong: 0,
    bestStreak: 0,
    currentStreak: 0,
    answered: false,
    hints: {},
    provider: 'local-fallback',
    difficulty: 'sedang',
    topic: 'pecahan'
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function setupTopicOptions() {
    var select = byId('topicSelect');
    var topics = window.druygonAI.getTopics();
    var session = window.druygonAI.getSession();
    var i;
    for (i = 0; i < topics.length; i++) {
      select.innerHTML += '<option value="' + topics[i].id + '">' + topics[i].emoji + ' ' + topics[i].label + '</option>';
    }
    select.value = session.topic || 'pecahan';
    byId('difficultySelect').value = session.difficulty || 'sedang';
  }

  function renderQuestion() {
    var question = state.questions[state.index];
    var options = byId('answerOptions');
    var i;
    if (!question) return;
    state.answered = false;
    window.druygonAI.setActiveQuestion(question);
    byId('questionCounter').textContent = (state.index + 1) + '/' + state.questions.length;
    byId('streakCounter').textContent = state.currentStreak + '🔥';
    byId('rewardPreview').textContent = state.currentStreak >= 2 ? '+10🪙 +10XP' : '+5🪙 +10XP';
    byId('topicPill').textContent = window.druygonAI.getTopicMeta(question.topic).label;
    byId('difficultyPill').textContent = question.difficulty;
    byId('questionText').textContent = question.text;
    byId('feedbackBox').className = 'ai-feedback';
    byId('feedbackBox').innerHTML = 'Pilih jawaban yang paling tepat, lalu Draco akan bantu jelaskan.';
    byId('nextBtn').style.display = 'none';
    options.innerHTML = '';
    for (i = 0; i < question.options.length; i++) {
      options.innerHTML += '<button class="ai-option-btn" data-index="' + i + '">' +
        String.fromCharCode(65 + i) + '. ' + question.options[i] +
      '</button>';
    }
    bindOptionButtons();
  }

  function bindOptionButtons() {
    var buttons = byId('answerOptions').querySelectorAll('[data-index]');
    var i;
    for (i = 0; i < buttons.length; i++) {
      buttons[i].onclick = function() {
        answerQuestion(parseInt(this.getAttribute('data-index'), 10));
      };
    }
  }

  function answerQuestion(selectedIndex) {
    var question = state.questions[state.index];
    var buttons = byId('answerOptions').querySelectorAll('[data-index]');
    var result;
    var reward;
    var i;
    var isCorrect;
    if (state.answered || !question) return;
    state.answered = true;
    isCorrect = selectedIndex === question.correct;
    if (isCorrect) {
      state.correct += 1;
      state.currentStreak += 1;
    } else {
      state.wrong += 1;
      state.currentStreak = 0;
    }
    if (state.currentStreak > state.bestStreak) state.bestStreak = state.currentStreak;

    result = window.druygonAI.recordAnswer({
      subject: 'matematika',
      topic: question.topic,
      isCorrect: isCorrect
    });
    reward = window.druygonAI.grantRewards(isCorrect, result.stats.currentStreak);
    byId('streakCounter').textContent = result.stats.currentStreak + '🔥';

    for (i = 0; i < buttons.length; i++) {
      if (i === question.correct) buttons[i].className = 'ai-option-btn is-correct';
      else if (i === selectedIndex && !isCorrect) buttons[i].className = 'ai-option-btn is-wrong';
      buttons[i].disabled = true;
    }

    if (isCorrect) {
      byId('feedbackBox').className = 'ai-feedback is-success';
      byId('feedbackBox').innerHTML = '<strong>Benar!</strong> ' + question.explanation + ' Kamu dapat +' + reward.coins + ' coins dan +' + reward.xp + ' XP.';
    } else {
      byId('feedbackBox').className = 'ai-feedback is-error';
      byId('feedbackBox').innerHTML = '<strong>Belum tepat.</strong> ' + question.explanation + ' Jawaban yang benar: <strong>' + question.options[question.correct] + '</strong>.';
    }

    byId('nextBtn').textContent = state.index === state.questions.length - 1 ? 'Lihat Ringkasan' : 'Soal Berikutnya';
    byId('nextBtn').style.display = 'inline-flex';
  }

  function requestHint() {
    var question = state.questions[state.index];
    var count;
    if (!question) return;
    count = (state.hints[question.id] || 0) + 1;
    if (count > 3) {
      byId('feedbackBox').className = 'ai-feedback';
      byId('feedbackBox').innerHTML = 'Hint untuk soal ini sudah habis. Sekarang coba pilih jawaban yang paling masuk akal ya.';
      return;
    }
    state.hints[question.id] = count;
    window.druygonAI.chat({
      mode: 'hint',
      prompt: 'Kasih hint',
      topic: question.topic,
      question: question,
      hintLevel: count
    }, function(error, response) {
      byId('feedbackBox').className = 'ai-feedback';
      byId('feedbackBox').innerHTML = response && response.message ? response.message : 'Draco lagi tarik napas, coba lagi sebentar ya.';
    });
  }

  function openTutor() {
    var question = state.questions[state.index];
    window.druygonAI.updateSession({
      topic: state.topic,
      difficulty: state.difficulty,
      activeQuestion: question
    });
    window.location.href = 'tutor.html';
  }

  function renderSummary() {
    var panel = byId('summaryPanel');
    var accuracy = state.questions.length ? Math.round((state.correct / state.questions.length) * 100) : 0;
    var scholars = window.druygonAI.getAvailableScholarPokemon({ accuracy: accuracy / 100 });
    var html = '';
    var i;
    window.druygonAI.setActiveQuestion(null);
    if (window.druygonProfile && typeof window.druygonProfile.recordGamePlay === 'function') {
      window.druygonProfile.recordGamePlay('aiLearning', state.correct, state.wrong, state.bestStreak);
    }
    html += '<div class="ai-panel">' +
      '<div class="ai-mini-label">Batch Selesai</div>' +
      '<h2>Kerja bagus!</h2>' +
      '<div class="ai-summary-grid" style="margin-top:14px;">' +
        '<div class="ai-summary-card"><div class="ai-stat-label">Benar</div><div class="ai-stat-value">' + state.correct + '</div></div>' +
        '<div class="ai-summary-card"><div class="ai-stat-label">Akurasi</div><div class="ai-stat-value">' + accuracy + '%</div></div>' +
        '<div class="ai-summary-card"><div class="ai-stat-label">Streak Terbaik</div><div class="ai-stat-value">' + state.bestStreak + '🔥</div></div>' +
        '<div class="ai-summary-card"><div class="ai-stat-label">Provider</div><div class="ai-stat-value" style="font-size:0.95rem;">' + state.provider + '</div></div>' +
      '</div>';

    if (scholars.length) {
      for (i = 0; i < scholars.length; i++) {
        html += '<div class="ai-summary-card" style="margin-top:14px;">' +
          '<div class="ai-encounter">' +
            '<div class="ai-encounter-art">' + window.getPokemonImg(scholars[i]) + '</div>' +
            '<div>' +
              '<strong>' + scholars[i].emoji + ' ' + scholars[i].name + ' muncul!</strong>' +
              '<div class="ai-copy" style="margin-top:6px;">' + scholars[i].unlockCondition + '</div>' +
              '<button class="ai-btn" style="margin-top:10px;" data-claim="' + scholars[i].id + '">Tangkap Scholar Pokemon</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
    } else {
      html += '<div class="ai-summary-card" style="margin-top:14px;">Belum ada Scholar Pokemon baru di batch ini. Naikkan akurasi atau selesaikan assessment untuk membuka milestone berikutnya.</div>';
    }

    html += '<div class="ai-footer-actions">' +
      '<button class="ai-btn" id="restartBtn">Main Lagi</button>' +
      '<a class="ai-btn is-secondary" href="index.html">Kembali ke Lab</a>' +
      '<a class="ai-btn is-ghost" href="../collection/index.html">Lihat Koleksi</a>' +
    '</div></div>';

    panel.innerHTML = html;
    bindSummaryButtons();
  }

  function bindSummaryButtons() {
    var claims = byId('summaryPanel').querySelectorAll('[data-claim]');
    var i;
    for (i = 0; i < claims.length; i++) {
      claims[i].onclick = function() {
        var pokemonId = this.getAttribute('data-claim');
        var claimed = window.druygonAI.claimScholarPokemon(pokemonId);
        if (claimed) {
          this.disabled = true;
          this.textContent = 'Sudah Ditangkap';
        }
      };
    }
    byId('restartBtn').onclick = function() {
      byId('summaryPanel').style.display = 'none';
      byId('setupPanel').style.display = 'block';
    };
  }

  function nextStep() {
    if (state.index >= state.questions.length - 1) {
      byId('quizPanel').style.display = 'none';
      byId('summaryPanel').style.display = 'block';
      renderSummary();
      return;
    }
    state.index += 1;
    renderQuestion();
  }

  function startBatch() {
    var topic = byId('topicSelect').value;
    var difficulty = byId('difficultySelect').value;
    byId('quizProvider').textContent = 'Memuat soal...';
    byId('startQuizBtn').disabled = true;
    window.druygonAI.updateSession({
      topic: topic,
      difficulty: difficulty
    });
    window.druygonAI.generateQuestions({
      subject: 'matematika',
      topic: topic,
      difficulty: difficulty,
      count: 5
    }, function(error, response) {
      state.questions = response.questions || [];
      state.provider = response.provider || 'local-fallback';
      state.index = 0;
      state.correct = 0;
      state.wrong = 0;
      state.bestStreak = 0;
      state.currentStreak = 0;
      state.hints = {};
      state.topic = topic;
      state.difficulty = difficulty;
      byId('quizProvider').textContent = state.provider;
      byId('startQuizBtn').disabled = false;
      byId('setupPanel').style.display = 'none';
      byId('summaryPanel').style.display = 'none';
      byId('quizPanel').style.display = 'block';
      renderQuestion();
    });
  }

  byId('startQuizBtn').onclick = startBatch;
  byId('hintBtn').onclick = requestHint;
  byId('openTutorBtn').onclick = openTutor;
  byId('nextBtn').onclick = nextStep;

  setupTopicOptions();
})(window, document);
