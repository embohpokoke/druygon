(function(window, document) {
  var state = {
    questions: [],
    index: 0,
    correct: 0,
    answers: [],
    answered: false
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function renderQuestion() {
    var question = state.questions[state.index];
    var options = byId('assessmentOptions');
    var i;
    if (!question) return;
    state.answered = false;
    byId('assessmentCounter').textContent = (state.index + 1) + '/' + state.questions.length;
    byId('assessmentCorrect').textContent = String(state.correct);
    byId('assessmentTopic').textContent = window.druygonAI.getTopicMeta(question.topic).label;
    byId('assessmentQuestion').textContent = question.text;
    byId('assessmentFeedback').className = 'ai-feedback';
    byId('assessmentFeedback').innerHTML = 'Jawab dengan tenang. Draco sedang mengukur topik mana yang paling kuat buatmu.';
    byId('assessmentNext').style.display = 'none';
    options.innerHTML = '';
    for (i = 0; i < question.options.length; i++) {
      options.innerHTML += '<button class="ai-option-btn" data-index="' + i + '">' +
        String.fromCharCode(65 + i) + '. ' + question.options[i] +
      '</button>';
    }
    bindOptionButtons();
  }

  function bindOptionButtons() {
    var buttons = byId('assessmentOptions').querySelectorAll('[data-index]');
    var i;
    for (i = 0; i < buttons.length; i++) {
      buttons[i].onclick = function() {
        answerQuestion(parseInt(this.getAttribute('data-index'), 10));
      };
    }
  }

  function answerQuestion(index) {
    var question = state.questions[state.index];
    var buttons = byId('assessmentOptions').querySelectorAll('[data-index]');
    var correct = index === question.correct;
    var i;
    if (state.answered) return;
    state.answered = true;
    state.answers.push({
      topic: question.topic,
      isCorrect: correct
    });
    if (correct) state.correct += 1;
    for (i = 0; i < buttons.length; i++) {
      if (i === question.correct) buttons[i].className = 'ai-option-btn is-correct';
      else if (i === index && !correct) buttons[i].className = 'ai-option-btn is-wrong';
      buttons[i].disabled = true;
    }
    byId('assessmentCorrect').textContent = String(state.correct);
    byId('assessmentFeedback').className = correct ? 'ai-feedback is-success' : 'ai-feedback is-error';
    byId('assessmentFeedback').innerHTML = correct
      ? '<strong>Benar.</strong> ' + question.explanation
      : '<strong>Belum tepat.</strong> ' + question.explanation;
    byId('assessmentNext').textContent = state.index === state.questions.length - 1 ? 'Lihat Hasil' : 'Soal Berikutnya';
    byId('assessmentNext').style.display = 'inline-flex';
  }

  function renderSummary() {
    var summary = window.druygonAI.finalizeAssessment(state.answers);
    var weakest = window.druygonAI.getTopicMeta(summary.weakestTopic);
    var accuracy = Math.round((state.correct / state.questions.length) * 100);
    var scholar = window.druygonAI.claimScholarPokemon('scholario');
    var rewardText = '';
    if (window.druygonProfile) {
      window.druygonProfile.addXP(30);
      window.druygonProfile.addCoins(20);
      window.druygonProfile.addBadge('AI Assessment Clear');
      if (typeof window.druygonProfile.recordGamePlay === 'function') {
        window.druygonProfile.recordGamePlay('aiLearning', state.correct, state.questions.length - state.correct, 0);
      }
    }
    rewardText = scholar ? 'Scholario berhasil masuk koleksimu.' : 'Kalau milestone assessment belum pernah diambil, Scholar Pokemon akan muncul di sini.';
    byId('assessmentSummary').innerHTML =
      '<div class="ai-panel">' +
        '<div class="ai-mini-label">Hasil Assessment</div>' +
        '<h2>Akurasi ' + accuracy + '%</h2>' +
        '<div class="ai-summary-grid" style="margin-top:14px;">' +
          '<div class="ai-summary-card"><div class="ai-stat-label">Benar</div><div class="ai-stat-value">' + state.correct + '</div></div>' +
          '<div class="ai-summary-card"><div class="ai-stat-label">Topik Fokus</div><div class="ai-stat-value" style="font-size:1rem;">' + weakest.label + '</div></div>' +
          '<div class="ai-summary-card"><div class="ai-stat-label">Reward</div><div class="ai-stat-value">+30XP</div></div>' +
          '<div class="ai-summary-card"><div class="ai-stat-label">Coins</div><div class="ai-stat-value">+20🪙</div></div>' +
        '</div>' +
        '<div class="ai-summary-card" style="margin-top:14px;">' +
          '<strong>Rekomendasi Draco</strong>' +
          '<div class="ai-copy" style="margin-top:8px;">Mulai dari ' + weakest.label + ' dulu selama beberapa batch. Setelah itu cek lagi progress bar di Learning Lab.</div>' +
        '</div>' +
        '<div class="ai-summary-card" style="margin-top:14px;">' +
          '<strong>Scholar Reward</strong>' +
          '<div class="ai-copy" style="margin-top:8px;">' + rewardText + '</div>' +
        '</div>' +
        '<div class="ai-footer-actions">' +
          '<a class="ai-btn" href="quiz.html">Latihan Topik Fokus</a>' +
          '<a class="ai-btn is-secondary" href="index.html">Kembali ke Lab</a>' +
          '<a class="ai-btn is-ghost" href="../collection/index.html">Lihat Koleksi</a>' +
        '</div>' +
      '</div>';
  }

  function nextQuestion() {
    if (state.index >= state.questions.length - 1) {
      byId('assessmentQuiz').style.display = 'none';
      byId('assessmentSummary').style.display = 'block';
      renderSummary();
      return;
    }
    state.index += 1;
    renderQuestion();
  }

  function startAssessment() {
    byId('assessmentStatus').textContent = 'Membuat soal...';
    window.druygonAI.generateAssessment({
      subject: 'matematika',
      count: 10
    }, function(error, response) {
      state.questions = response.questions || [];
      state.index = 0;
      state.correct = 0;
      state.answers = [];
      byId('assessmentStatus').textContent = response.provider || 'local-fallback';
      byId('assessmentStart').style.display = 'none';
      byId('assessmentQuiz').style.display = 'block';
      renderQuestion();
    });
  }

  byId('startAssessmentBtn').onclick = startAssessment;
  byId('assessmentNext').onclick = nextQuestion;

  (function init() {
    var profile = window.druygonAI.getProfile();
    var config = window.druygonAI.getConfig();
    if (profile.lastReassessment) {
      byId('assessmentIntro').textContent = window.druygonAI.isReassessmentDue(profile, config)
        ? 'Reassessment minggu ini sudah waktunya. Draco akan cek lagi topik mana yang paling perlu dikuatkan.'
        : 'Assessment terakhir: ' + profile.lastReassessment + '. Kamu tetap boleh ulang kapan saja untuk update profil.';
    }
  })();
})(window, document);
