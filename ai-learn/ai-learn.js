(function(window, document) {
  function byId(id) {
    return document.getElementById(id);
  }

  function createProgressRow(label, progress, metaText) {
    var wrapper = document.createElement('div');
    var pct = progress === null ? 0 : progress;
    wrapper.className = 'ai-progress-item';
    wrapper.innerHTML =
      '<div class="ai-progress-head">' +
        '<strong>' + label + '</strong>' +
        '<span class="ai-meta">' + metaText + '</span>' +
      '</div>' +
      '<div class="ai-progress-bar"><div class="ai-progress-fill" style="width:' + pct + '%"></div></div>';
    return wrapper;
  }

  function renderProgress() {
    var progressList = byId('progressList');
    var profile = window.druygonAI.getProfile();
    var mathProgress = window.druygonAI.getSubjectProgress(profile, 'matematika');
    var weakest = window.druygonAI.getTopicMeta(window.druygonAI.getWeakestTopic(profile));

    progressList.innerHTML = '';
    progressList.appendChild(createProgressRow('Matematika', mathProgress.score, mathProgress.score === null ? 'Belum diuji' : mathProgress.score + '%'));
    progressList.appendChild(createProgressRow('IPA', 0, 'Segera hadir'));
    progressList.appendChild(createProgressRow('English', 0, 'Segera hadir'));

    byId('heroSubtitle').textContent = mathProgress.score === null
      ? 'Mulai assessment dulu supaya Draco bisa tahu titik kuat dan lemahmu.'
      : 'Topik yang paling perlu diperkuat sekarang: ' + weakest.label + '.';
    byId('assessmentPill').textContent = profile.lastReassessment
      ? 'Assessment: ' + profile.lastReassessment
      : 'Belum assessment';
  }

  function renderMission() {
    var profile = window.druygonAI.getProfile();
    var stats = window.druygonAI.getStats();
    var config = window.druygonAI.getConfig();
    var mission = window.druygonAI.ensureDailyMission(profile, stats, config);
    var topic = window.druygonAI.getTopicMeta(mission.topicId);
    var pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
    var reassessmentDue = window.druygonAI.isReassessmentDue(profile, config);
    byId('missionTitle').textContent = 'Selesaikan ' + mission.target + ' soal ' + topic.label;
    byId('missionPill').textContent = mission.progress + '/' + mission.target;
    byId('missionFill').style.width = pct + '%';
    byId('missionCopy').textContent = reassessmentDue
      ? 'Reassessment mingguan sudah waktunya. Setelah itu, misi harian akan makin akurat.'
      : 'Misi dipilih dari area terlemahmu supaya progress terasa lebih cepat.';
  }

  function renderSummary() {
    var stats = window.druygonAI.getStats();
    var profile = window.druygonAI.getProfile();
    var summary = byId('summaryStats');
    var weakest = window.druygonAI.getTopicMeta(window.druygonAI.getWeakestTopic(profile));
    summary.innerHTML =
      '<div class="ai-stat"><div class="ai-stat-label">Benar</div><div class="ai-stat-value">' + stats.totalCorrect + '</div></div>' +
      '<div class="ai-stat"><div class="ai-stat-label">Streak</div><div class="ai-stat-value">' + stats.longestStreak + '🔥</div></div>' +
      '<div class="ai-stat"><div class="ai-stat-label">Topik Fokus</div><div class="ai-stat-value">' + weakest.emoji + '</div></div>';
  }

  function renderScholarPokemon() {
    var container = byId('scholarList');
    var milestones = window.druygonAI.getAvailableScholarPokemon({ accuracy: 1 });
    var scholarPool = window.getPokemonBySource ? window.getPokemonBySource('ai_module') : [];
    var html = '';
    var i;
    var locked = {};
    for (i = 0; i < milestones.length; i++) {
      locked[milestones[i].id] = true;
    }
    for (i = 0; i < scholarPool.length; i++) {
      html += '<div class="ai-summary-card" style="margin-bottom:10px;">' +
        '<strong>' + scholarPool[i].emoji + ' ' + scholarPool[i].name + '</strong>' +
        '<div class="ai-copy" style="margin-top:6px;">' + scholarPool[i].unlockCondition + '</div>' +
        '<div class="ai-helper" style="margin-top:8px;">' + (locked[scholarPool[i].id] ? 'Siap diklaim saat milestone terpenuhi.' : 'Belum terbuka.') + '</div>' +
      '</div>';
    }
    container.innerHTML = html;
  }

  function loadProviderStatus() {
    window.druygonAI.getStatus(function(error, status) {
      var badge = byId('providerBadge');
      if (error || !status) {
        badge.textContent = 'Mode lokal';
        return;
      }
      badge.textContent = status.provider === 'local-fallback'
        ? 'Mode lokal aktif'
        : 'Provider: ' + (status.provider || 'auto');
    });
  }

  renderProgress();
  renderMission();
  renderSummary();
  renderScholarPokemon();
  loadProviderStatus();
})(window, document);
