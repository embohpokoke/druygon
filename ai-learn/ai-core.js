(function(window, document) {
  var API = {
    generate: '/api/ai/generate',
    chat: '/api/ai/chat',
    assess: '/api/ai/assess',
    status: '/api/ai/status',
    config: '/api/ai/config'
  };

  var KEYS = {
    profile: 'druygon_ai_profile',
    cache: 'druygon_ai_cache',
    session: 'druygon_ai_session',
    stats: 'druygon_ai_stats',
    config: 'druygon_ai_config'
  };

  var TOPICS = [
    { id: 'operasi_hitung', label: 'Operasi Hitung', emoji: '➕', description: 'Tambah, kurang, kali, dan bagi campuran.' },
    { id: 'fpb_kpk', label: 'FPB & KPK', emoji: '🔁', description: 'Cari faktor dan kelipatan persekutuan.' },
    { id: 'pecahan', label: 'Pecahan', emoji: '🍰', description: 'Tambah, kurang, dan sederhanakan pecahan.' },
    { id: 'desimal_persen', label: 'Desimal & Persen', emoji: '💯', description: 'Ubah bentuk angka dan hitung persen.' },
    { id: 'geometri', label: 'Geometri Dasar', emoji: '📐', description: 'Luas dan keliling bangun datar.' },
    { id: 'pengukuran', label: 'Pengukuran', emoji: '📏', description: 'Konversi panjang, berat, dan waktu.' }
  ];

  var TOPIC_MAP = {};
  var LEVEL_LABELS = {
    mahir: 'Mahir',
    sedang: 'Sedang',
    lemah: 'Perlu Latihan',
    belum_diuji: 'Belum Diuji'
  };

  var AI_BADGES = [
    { id: 'AI Rookie', minCorrect: 25 },
    { id: 'AI Tutor Badge 50', minCorrect: 50 },
    { id: 'AI Tutor Badge 100', minCorrect: 100 }
  ];

  var LOCAL_PROVIDER_STATUS = {
    success: true,
    provider: 'local-fallback',
    mode: 'local',
    message: 'Backend AI belum tersedia di repo ini, jadi modul memakai tutor lokal yang siap dipakai.'
  };

  var i;
  for (i = 0; i < TOPICS.length; i++) {
    TOPIC_MAP[TOPICS[i].id] = TOPICS[i];
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeParse(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }

  function toInt(value, fallback) {
    var number = parseInt(value, 10);
    return isNaN(number) ? fallback : number;
  }

  function toFixedNumber(value, fallback) {
    var number = Number(value);
    return isNaN(number) ? fallback : number;
  }

  function pad(num) {
    return num < 10 ? '0' + num : String(num);
  }

  function todayString() {
    var now = new Date();
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  }

  function daysBetween(fromDate, toDate) {
    if (!fromDate || !toDate) return 9999;
    var start = new Date(fromDate + 'T00:00:00');
    var end = new Date(toDate + 'T00:00:00');
    return Math.round((end.getTime() - start.getTime()) / 86400000);
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(list) {
    var copy = list.slice();
    var index;
    var swap;
    var temp;
    for (index = copy.length - 1; index > 0; index--) {
      swap = Math.floor(Math.random() * (index + 1));
      temp = copy[index];
      copy[index] = copy[swap];
      copy[swap] = temp;
    }
    return copy;
  }

  function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
  }

  function lcm(a, b) {
    return (a * b) / gcd(a, b);
  }

  function getJSON(key, fallback) {
    var raw;
    try {
      raw = localStorage.getItem(key);
    } catch (error) {
      raw = null;
    }
    return safeParse(raw) || clone(fallback);
  }

  function setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {}
  }

  function getDefaultTopicState() {
    return {
      level: 'belum_diuji',
      score: null,
      questionsAnswered: 0
    };
  }

  function buildDefaultTopics() {
    var result = {};
    var index;
    for (index = 0; index < TOPICS.length; index++) {
      result[TOPICS[index].id] = getDefaultTopicState();
    }
    return result;
  }

  function getDefaultConfig() {
    return {
      providerPreference: 'auto',
      fallbackOrder: ['gemini', 'openai', 'anthropic'],
      grade: 5,
      reassessmentInterval: 7,
      dailyGoal: 5,
      aiChatEnabled: true
    };
  }

  function getDefaultProfile() {
    return {
      assessmentDate: null,
      lastReassessment: null,
      reassessmentInterval: 7,
      grade: 5,
      subjects: {
        matematika: {
          topics: buildDefaultTopics(),
          overallLevel: 'belum_diuji',
          lastActive: null
        },
        ipa: {
          topics: {},
          overallLevel: 'belum_diuji',
          lastActive: null
        },
        english: {
          topics: {},
          overallLevel: 'belum_diuji',
          lastActive: null
        }
      },
      totalQuestionsAnswered: 0,
      currentStreak: 0,
      longestStreak: 0
    };
  }

  function getDefaultStats() {
    return {
      totalAnswered: 0,
      totalCorrect: 0,
      currentStreak: 0,
      longestStreak: 0,
      assessmentsCompleted: 0,
      subjectTotals: {
        matematika: 0,
        ipa: 0,
        english: 0
      },
      dailyMission: {
        date: todayString(),
        topicId: 'pecahan',
        progress: 0,
        target: 5
      }
    };
  }

  function getDefaultSession() {
    return {
      subject: 'matematika',
      topic: 'pecahan',
      difficulty: 'sedang',
      activeQuestion: null,
      recentQuestionHashes: []
    };
  }

  function ensureTopicState(topicState) {
    var state = topicState && typeof topicState === 'object' ? topicState : getDefaultTopicState();
    if (state.level !== 'mahir' && state.level !== 'sedang' && state.level !== 'lemah' && state.level !== 'belum_diuji') {
      state.level = 'belum_diuji';
    }
    if (state.score === undefined) state.score = null;
    state.questionsAnswered = Math.max(0, toInt(state.questionsAnswered, 0));
    return state;
  }

  function ensureProfile(profile) {
    var data = profile && typeof profile === 'object' ? profile : getDefaultProfile();
    var defaults = getDefaultProfile();
    var subject = data.subjects || {};
    var math = subject.matematika || defaults.subjects.matematika;
    var topicId;
    data.reassessmentInterval = Math.max(1, toInt(data.reassessmentInterval, defaults.reassessmentInterval));
    data.grade = Math.max(4, Math.min(6, toInt(data.grade, defaults.grade)));
    data.subjects = data.subjects || defaults.subjects;
    data.subjects.matematika = {
      topics: math.topics || buildDefaultTopics(),
      overallLevel: math.overallLevel || 'belum_diuji',
      lastActive: math.lastActive || null
    };
    for (topicId in buildDefaultTopics()) {
      if (Object.prototype.hasOwnProperty.call(buildDefaultTopics(), topicId)) {
        data.subjects.matematika.topics[topicId] = ensureTopicState(data.subjects.matematika.topics[topicId]);
      }
    }
    if (!data.subjects.ipa) data.subjects.ipa = clone(defaults.subjects.ipa);
    if (!data.subjects.english) data.subjects.english = clone(defaults.subjects.english);
    data.totalQuestionsAnswered = Math.max(0, toInt(data.totalQuestionsAnswered, 0));
    data.currentStreak = Math.max(0, toInt(data.currentStreak, 0));
    data.longestStreak = Math.max(0, toInt(data.longestStreak, 0));
    return data;
  }

  function ensureStats(stats) {
    var data = stats && typeof stats === 'object' ? stats : getDefaultStats();
    var defaults = getDefaultStats();
    if (!data.subjectTotals) data.subjectTotals = clone(defaults.subjectTotals);
    if (!data.dailyMission) data.dailyMission = clone(defaults.dailyMission);
    data.totalAnswered = Math.max(0, toInt(data.totalAnswered, 0));
    data.totalCorrect = Math.max(0, toInt(data.totalCorrect, 0));
    data.currentStreak = Math.max(0, toInt(data.currentStreak, 0));
    data.longestStreak = Math.max(0, toInt(data.longestStreak, 0));
    data.assessmentsCompleted = Math.max(0, toInt(data.assessmentsCompleted, 0));
    data.subjectTotals.matematika = Math.max(0, toInt(data.subjectTotals.matematika, 0));
    data.subjectTotals.ipa = Math.max(0, toInt(data.subjectTotals.ipa, 0));
    data.subjectTotals.english = Math.max(0, toInt(data.subjectTotals.english, 0));
    data.dailyMission.date = data.dailyMission.date || todayString();
    data.dailyMission.topicId = data.dailyMission.topicId || 'pecahan';
    data.dailyMission.progress = Math.max(0, toInt(data.dailyMission.progress, 0));
    data.dailyMission.target = Math.max(1, toInt(data.dailyMission.target, 5));
    return data;
  }

  function ensureSession(session) {
    var data = session && typeof session === 'object' ? session : getDefaultSession();
    if (!TOPIC_MAP[data.topic]) data.topic = 'pecahan';
    if (data.difficulty !== 'mudah' && data.difficulty !== 'sedang' && data.difficulty !== 'sulit') data.difficulty = 'sedang';
    if (!data.recentQuestionHashes || Object.prototype.toString.call(data.recentQuestionHashes) !== '[object Array]') {
      data.recentQuestionHashes = [];
    }
    return data;
  }

  function getConfig() {
    var config = getJSON(KEYS.config, getDefaultConfig());
    var defaults = getDefaultConfig();
    config.providerPreference = config.providerPreference || defaults.providerPreference;
    config.fallbackOrder = config.fallbackOrder || defaults.fallbackOrder;
    config.grade = Math.max(4, Math.min(6, toInt(config.grade, defaults.grade)));
    config.reassessmentInterval = Math.max(1, toInt(config.reassessmentInterval, defaults.reassessmentInterval));
    config.dailyGoal = Math.max(1, toInt(config.dailyGoal, defaults.dailyGoal));
    config.aiChatEnabled = config.aiChatEnabled !== false;
    return config;
  }

  function saveConfig(config) {
    setJSON(KEYS.config, config);
  }

  function getProfile() {
    return ensureProfile(getJSON(KEYS.profile, getDefaultProfile()));
  }

  function saveProfile(profile) {
    setJSON(KEYS.profile, ensureProfile(profile));
  }

  function getStats() {
    return ensureStats(getJSON(KEYS.stats, getDefaultStats()));
  }

  function saveStats(stats) {
    setJSON(KEYS.stats, ensureStats(stats));
  }

  function getSession() {
    return ensureSession(getJSON(KEYS.session, getDefaultSession()));
  }

  function saveSession(session) {
    setJSON(KEYS.session, ensureSession(session));
  }

  function getQuestionCache() {
    var cache = getJSON(KEYS.cache, []);
    return Object.prototype.toString.call(cache) === '[object Array]' ? cache : [];
  }

  function saveQuestionCache(questions) {
    var cache = getQuestionCache();
    var incoming = questions && questions.length ? questions : [];
    var index;
    for (index = 0; index < incoming.length; index++) {
      cache.push(incoming[index]);
    }
    while (cache.length > 50) cache.shift();
    setJSON(KEYS.cache, cache);
  }

  function getTopicMeta(topicId) {
    return TOPIC_MAP[topicId] || TOPIC_MAP.pecahan;
  }

  function getTopics() {
    return clone(TOPICS);
  }

  function scoreToLevel(score, questionsAnswered) {
    if (!questionsAnswered) return 'belum_diuji';
    if (score >= 85) return 'mahir';
    if (score >= 60) return 'sedang';
    return 'lemah';
  }

  function computeOverallLevel(subjectProfile) {
    var topics = subjectProfile.topics || {};
    var key;
    var scoredCount = 0;
    var total = 0;
    for (key in topics) {
      if (!Object.prototype.hasOwnProperty.call(topics, key)) continue;
      if (topics[key].score === null) continue;
      scoredCount += 1;
      total += topics[key].score;
    }
    if (!scoredCount) return 'belum_diuji';
    return scoreToLevel(Math.round(total / scoredCount), scoredCount);
  }

  function getWeakestTopic(profile) {
    var data = ensureProfile(profile || getProfile());
    var topics = data.subjects.matematika.topics;
    var weakest = null;
    var key;
    for (key in topics) {
      if (!Object.prototype.hasOwnProperty.call(topics, key)) continue;
      if (!weakest) {
        weakest = key;
        continue;
      }
      if (topics[key].score === null && topics[weakest].score !== null) {
        weakest = key;
        continue;
      }
      if (topics[key].score !== null && topics[weakest].score !== null && topics[key].score < topics[weakest].score) {
        weakest = key;
      }
    }
    return weakest || 'pecahan';
  }

  function ensureDailyMission(profile, stats, config) {
    var profileData = ensureProfile(profile || getProfile());
    var statsData = ensureStats(stats || getStats());
    var cfg = config || getConfig();
    if (statsData.dailyMission.date !== todayString()) {
      statsData.dailyMission.date = todayString();
      statsData.dailyMission.topicId = getWeakestTopic(profileData);
      statsData.dailyMission.progress = 0;
      statsData.dailyMission.target = cfg.dailyGoal;
      saveStats(statsData);
    }
    return statsData.dailyMission;
  }

  function isReassessmentDue(profile, config) {
    var data = ensureProfile(profile || getProfile());
    var cfg = config || getConfig();
    var interval = data.reassessmentInterval || cfg.reassessmentInterval;
    if (!data.lastReassessment) return true;
    return daysBetween(data.lastReassessment, todayString()) >= interval;
  }

  function getSubjectProgress(profile, subject) {
    var data = ensureProfile(profile || getProfile());
    var subjectProfile = data.subjects[subject || 'matematika'];
    var topics = subjectProfile && subjectProfile.topics ? subjectProfile.topics : {};
    var key;
    var total = 0;
    var count = 0;
    for (key in topics) {
      if (!Object.prototype.hasOwnProperty.call(topics, key)) continue;
      if (topics[key].score === null) continue;
      total += topics[key].score;
      count += 1;
    }
    return {
      score: count ? Math.round(total / count) : null,
      level: subjectProfile ? subjectProfile.overallLevel : 'belum_diuji',
      assessedTopics: count,
      totalTopics: TOPICS.length
    };
  }

  function updateTopicPerformance(topicState, isCorrect) {
    var state = ensureTopicState(topicState);
    var attempts = state.questionsAnswered;
    var previousScore = state.score === null ? null : state.score;
    var nextScore;
    state.questionsAnswered = attempts + 1;
    if (previousScore === null) {
      nextScore = isCorrect ? 100 : 0;
    } else {
      nextScore = Math.round(((previousScore * attempts) + (isCorrect ? 100 : 0)) / state.questionsAnswered);
    }
    state.score = nextScore;
    state.level = scoreToLevel(nextScore, state.questionsAnswered);
    return state;
  }

  function syncBadges(stats) {
    var index;
    var awarded = [];
    if (!window.druygonProfile || typeof window.druygonProfile.addBadge !== 'function') return awarded;
    for (index = 0; index < AI_BADGES.length; index++) {
      if (stats.totalCorrect >= AI_BADGES[index].minCorrect && window.druygonProfile.addBadge(AI_BADGES[index].id)) {
        awarded.push(AI_BADGES[index].id);
      }
    }
    return awarded;
  }

  function allMathTopicsMahir(profile) {
    var data = ensureProfile(profile || getProfile());
    var topics = data.subjects.matematika.topics;
    var key;
    for (key in topics) {
      if (!Object.prototype.hasOwnProperty.call(topics, key)) continue;
      if (topics[key].level !== 'mahir') return false;
    }
    return true;
  }

  function getScholarPokemonMilestones(profile, stats) {
    var profileData = ensureProfile(profile || getProfile());
    var statsData = ensureStats(stats || getStats());
    return [
      {
        id: 'scholario',
        unlocked: !!profileData.assessmentDate
      },
      {
        id: 'matheon',
        unlocked: statsData.subjectTotals.matematika >= 100
      },
      {
        id: 'sciendra',
        unlocked: statsData.subjectTotals.ipa >= 50
      },
      {
        id: 'wisdomoth',
        unlocked: allMathTopicsMahir(profileData)
      }
    ];
  }

  function getAvailableScholarPokemon(summary, profile, stats) {
    var list = getScholarPokemonMilestones(profile, stats);
    var index;
    var pokemon;
    var available = [];
    if (summary && summary.accuracy < 0.6) return available;
    for (index = 0; index < list.length; index++) {
      if (!list[index].unlocked) continue;
      if (window.druygonProfile && typeof window.druygonProfile.hasPokemon === 'function' && window.druygonProfile.hasPokemon(list[index].id)) continue;
      pokemon = window.getPokemonById ? window.getPokemonById(list[index].id) : null;
      if (pokemon) available.push(pokemon);
    }
    return available;
  }

  function claimScholarPokemon(pokemonId) {
    var pokemon = window.getPokemonById ? window.getPokemonById(pokemonId) : null;
    if (!pokemon || !window.druygonProfile || typeof window.druygonProfile.catchPokemon !== 'function') return null;
    if (window.druygonProfile.hasPokemon && window.druygonProfile.hasPokemon(pokemon.id)) return pokemon;
    return window.druygonProfile.catchPokemon(pokemon);
  }

  function recordAnswer(input) {
    var answer = input || {};
    var profile = getProfile();
    var stats = getStats();
    var subjectId = answer.subject || 'matematika';
    var topicId = TOPIC_MAP[answer.topic] ? answer.topic : getWeakestTopic(profile);
    var subjectProfile = profile.subjects[subjectId] || { topics: {} };
    var mission;
    if (!subjectProfile.topics) subjectProfile.topics = {};
    if (!subjectProfile.topics[topicId]) subjectProfile.topics[topicId] = getDefaultTopicState();

    stats.totalAnswered += 1;
    profile.totalQuestionsAnswered += 1;

    if (answer.isCorrect) {
      stats.totalCorrect += 1;
      stats.currentStreak += 1;
      if (!stats.subjectTotals[subjectId]) stats.subjectTotals[subjectId] = 0;
      stats.subjectTotals[subjectId] += 1;
    } else {
      stats.currentStreak = 0;
    }

    if (stats.currentStreak > stats.longestStreak) stats.longestStreak = stats.currentStreak;
    profile.currentStreak = stats.currentStreak;
    profile.longestStreak = stats.longestStreak;

    subjectProfile.topics[topicId] = updateTopicPerformance(subjectProfile.topics[topicId], !!answer.isCorrect);
    subjectProfile.lastActive = todayString();
    subjectProfile.overallLevel = computeOverallLevel(subjectProfile);
    profile.subjects[subjectId] = subjectProfile;

    mission = ensureDailyMission(profile, stats);
    if (subjectId === 'matematika' && answer.isCorrect && mission.topicId === topicId && mission.progress < mission.target) {
      mission.progress += 1;
      stats.dailyMission = mission;
    }

    saveProfile(profile);
    saveStats(stats);
    syncBadges(stats);

    return {
      profile: profile,
      stats: stats,
      topic: subjectProfile.topics[topicId]
    };
  }

  function finalizeAssessment(results) {
    var profile = getProfile();
    var stats = getStats();
    var grouped = {};
    var index;
    var result;
    var topicId;
    var subjectProfile = profile.subjects.matematika;
    var total;
    for (index = 0; index < results.length; index++) {
      result = results[index];
      if (!TOPIC_MAP[result.topic]) continue;
      if (!grouped[result.topic]) grouped[result.topic] = { total: 0, correct: 0 };
      grouped[result.topic].total += 1;
      if (result.isCorrect) grouped[result.topic].correct += 1;
    }
    for (topicId in subjectProfile.topics) {
      if (!Object.prototype.hasOwnProperty.call(subjectProfile.topics, topicId)) continue;
      if (!grouped[topicId]) continue;
      total = grouped[topicId].total;
      subjectProfile.topics[topicId].questionsAnswered += total;
      subjectProfile.topics[topicId].score = Math.round((grouped[topicId].correct / total) * 100);
      subjectProfile.topics[topicId].level = scoreToLevel(subjectProfile.topics[topicId].score, subjectProfile.topics[topicId].questionsAnswered);
    }
    subjectProfile.lastActive = todayString();
    subjectProfile.overallLevel = computeOverallLevel(subjectProfile);
    if (!profile.assessmentDate) profile.assessmentDate = todayString();
    profile.lastReassessment = todayString();
    profile.reassessmentInterval = getConfig().reassessmentInterval;
    profile.grade = getConfig().grade;
    stats.assessmentsCompleted += 1;
    saveProfile(profile);
    saveStats(stats);
    return {
      profile: profile,
      stats: stats,
      weakestTopic: getWeakestTopic(profile)
    };
  }

  function normalizeDifficulty(difficulty) {
    if (difficulty === 'mudah' || difficulty === 'sedang' || difficulty === 'sulit') return difficulty;
    return 'sedang';
  }

  function hashQuestion(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\w/%+\-:. ]/g, '').slice(0, 120);
  }

  function rememberQuestion(question) {
    var session = getSession();
    session.recentQuestionHashes.push(hashQuestion(question.text));
    while (session.recentQuestionHashes.length > 30) session.recentQuestionHashes.shift();
    saveSession(session);
  }

  function questionSeen(question) {
    var session = getSession();
    return session.recentQuestionHashes.indexOf(hashQuestion(question.text)) !== -1;
  }

  function uniqueOptions(correctOption, distractors) {
    var list = [String(correctOption)];
    var index;
    for (index = 0; index < distractors.length; index++) {
      if (list.indexOf(String(distractors[index])) === -1) list.push(String(distractors[index]));
    }
    while (list.length < 4) {
      list.push(String(correctOption) + ' ');
    }
    return shuffle(list.slice(0, 4));
  }

  function simplifyFraction(numerator, denominator) {
    var divisor = gcd(Math.abs(numerator), Math.abs(denominator));
    return {
      numerator: numerator / divisor,
      denominator: denominator / divisor
    };
  }

  function formatFraction(numerator, denominator) {
    var simplified = simplifyFraction(numerator, denominator);
    if (simplified.denominator === 1) return String(simplified.numerator);
    return simplified.numerator + '/' + simplified.denominator;
  }

  function operationQuestion(difficulty) {
    var diff = normalizeDifficulty(difficulty);
    var mode = ['+', '-', 'x', '÷'][rand(0, 3)];
    var a;
    var b;
    var answer;
    var text;
    var distractors;
    if (mode === '+') {
      a = diff === 'mudah' ? rand(12, 60) : diff === 'sedang' ? rand(80, 240) : rand(250, 950);
      b = diff === 'mudah' ? rand(8, 40) : diff === 'sedang' ? rand(50, 180) : rand(120, 650);
      answer = a + b;
      text = 'Berapakah hasil dari ' + a + ' + ' + b + '?';
      distractors = [answer + rand(2, 12), answer - rand(2, 12), a + (b - rand(1, 5))];
    } else if (mode === '-') {
      a = diff === 'mudah' ? rand(30, 90) : diff === 'sedang' ? rand(150, 450) : rand(500, 1200);
      b = diff === 'mudah' ? rand(8, 25) : diff === 'sedang' ? rand(40, 140) : rand(80, 350);
      if (b > a) {
        a += b;
      }
      answer = a - b;
      text = 'Berapakah hasil dari ' + a + ' - ' + b + '?';
      distractors = [answer + rand(3, 15), answer - rand(3, 15), a - (b + rand(1, 5))];
    } else if (mode === 'x') {
      a = diff === 'mudah' ? rand(2, 9) : diff === 'sedang' ? rand(6, 15) : rand(12, 25);
      b = diff === 'mudah' ? rand(2, 9) : diff === 'sedang' ? rand(5, 12) : rand(8, 18);
      answer = a * b;
      text = 'Berapakah hasil dari ' + a + ' × ' + b + '?';
      distractors = [answer + a, answer - b, (a + 1) * b];
    } else {
      b = diff === 'mudah' ? rand(2, 9) : diff === 'sedang' ? rand(3, 12) : rand(5, 18);
      answer = diff === 'mudah' ? rand(2, 10) : diff === 'sedang' ? rand(4, 16) : rand(8, 24);
      a = answer * b;
      text = 'Berapakah hasil dari ' + a + ' ÷ ' + b + '?';
      distractors = [answer + rand(1, 4), answer - rand(1, 3), b];
    }
    return {
      text: text,
      correctValue: String(answer),
      explanation: 'Kerjakan langkah demi langkah lalu periksa lagi operasi hitungnya. Hasil yang benar adalah ' + answer + '.',
      distractors: distractors
    };
  }

  function fpbKpkQuestion(difficulty) {
    var diff = normalizeDifficulty(difficulty);
    var type = Math.random() > 0.5 ? 'FPB' : 'KPK';
    var a = diff === 'mudah' ? rand(6, 24) : diff === 'sedang' ? rand(12, 48) : rand(24, 96);
    var b = diff === 'mudah' ? rand(6, 24) : diff === 'sedang' ? rand(12, 48) : rand(24, 96);
    var answer = type === 'FPB' ? gcd(a, b) : lcm(a, b);
    return {
      text: type + ' dari ' + a + ' dan ' + b + ' adalah ...',
      correctValue: String(answer),
      explanation: 'Kalau mencari ' + type + ', tulis faktor atau kelipatan kedua bilangan lalu cari yang sesuai. Jawabannya ' + answer + '.',
      distractors: [String(type === 'FPB' ? lcm(a, b) : gcd(a, b)), String(answer + rand(1, 6)), String(Math.max(1, answer - rand(1, 4)))]
    };
  }

  function fractionQuestion(difficulty) {
    var diff = normalizeDifficulty(difficulty);
    var denominators = diff === 'mudah' ? [2, 3, 4, 5] : diff === 'sedang' ? [3, 4, 5, 6, 8] : [4, 5, 6, 8, 10, 12];
    var d1 = denominators[rand(0, denominators.length - 1)];
    var d2 = denominators[rand(0, denominators.length - 1)];
    var n1 = rand(1, d1 - 1);
    var n2 = rand(1, d2 - 1);
    var operation = Math.random() > 0.45 ? '+' : '-';
    var common = lcm(d1, d2);
    var left = n1 * (common / d1);
    var right = n2 * (common / d2);
    var numerator = operation === '+' ? left + right : left - right;
    if (operation === '-' && numerator <= 0) {
      numerator = left + right;
      operation = '+';
    }
    return {
      text: 'Berapakah hasil dari ' + n1 + '/' + d1 + ' ' + operation + ' ' + n2 + '/' + d2 + '?',
      correctValue: formatFraction(numerator, common),
      explanation: 'Samakan penyebut menjadi ' + common + ', lalu hitung pembilangnya. Setelah itu sederhanakan hasilnya.',
      distractors: [formatFraction(n1 + n2, d1 + d2), formatFraction(left + right, common), formatFraction(Math.max(1, numerator + rand(1, 3)), common)]
    };
  }

  function decimalPercentQuestion(difficulty) {
    var diff = normalizeDifficulty(difficulty);
    var mode = rand(0, 2);
    var number;
    var answer;
    var text;
    var distractors;
    if (mode === 0) {
      number = diff === 'mudah' ? (rand(1, 9) / 10) : (rand(5, 85) / 100);
      answer = String(Math.round(number * 100)) + '%';
      text = 'Ubah ' + String(number).replace('.', ',') + ' menjadi persen.';
      distractors = [String(number) + '%', String(Math.round(number * 10)) + '%', String(Math.round(number * 1000)) + '%'];
    } else if (mode === 1) {
      number = diff === 'mudah' ? rand(10, 90) : rand(5, 95);
      answer = String(number / 100).replace('.', ',');
      text = 'Ubah ' + number + '% menjadi desimal.';
      distractors = [String(number).replace('.', ','), String((number / 10)).replace('.', ','), String((number / 1000)).replace('.', ',')];
    } else {
      number = diff === 'mudah' ? rand(10, 40) : diff === 'sedang' ? rand(25, 60) : rand(20, 75);
      var base = diff === 'mudah' ? rand(20, 120) : diff === 'sedang' ? rand(80, 240) : rand(150, 500);
      answer = String((number * base) / 100);
      text = number + '% dari ' + base + ' adalah ...';
      distractors = [String(base - toInt(answer, 0)), String(number + base), String(Math.round(base / Math.max(1, number / 10)))];
    }
    return {
      text: text,
      correctValue: answer,
      explanation: 'Perhatikan hubungan persen dengan per seratus. Setelah diubah ke bentuk yang sama, hasilnya jadi lebih mudah dihitung.',
      distractors: distractors
    };
  }

  function geometryQuestion(difficulty) {
    var diff = normalizeDifficulty(difficulty);
    var square = Math.random() > 0.5;
    var mode = Math.random() > 0.5 ? 'keliling' : 'luas';
    var length = diff === 'mudah' ? rand(4, 12) : diff === 'sedang' ? rand(8, 18) : rand(12, 30);
    var width = square ? length : (diff === 'mudah' ? rand(3, 10) : diff === 'sedang' ? rand(6, 14) : rand(10, 24));
    var answer = mode === 'keliling' ? ((length + width) * 2) : (length * width);
    return {
      text: square
        ? 'Sebuah persegi punya sisi ' + length + ' cm. ' + (mode === 'keliling' ? 'Kelilingnya' : 'Luasnya') + ' adalah ...'
        : 'Sebuah persegi panjang panjangnya ' + length + ' cm dan lebarnya ' + width + ' cm. ' + (mode === 'keliling' ? 'Kelilingnya' : 'Luasnya') + ' adalah ...',
      correctValue: String(answer),
      explanation: mode === 'keliling'
        ? 'Keliling berarti menjumlah semua sisi bangun datar.'
        : 'Luas berarti panjang × lebar untuk persegi panjang dan sisi × sisi untuk persegi.',
      distractors: [String(answer + length), String(Math.max(1, answer - width)), String(length + width)]
    };
  }

  function measurementQuestion(difficulty) {
    var diff = normalizeDifficulty(difficulty);
    var cases = [
      { from: 'm', to: 'cm', factor: 100 },
      { from: 'kg', to: 'g', factor: 1000 },
      { from: 'jam', to: 'menit', factor: 60 },
      { from: 'liter', to: 'ml', factor: 1000 }
    ];
    var choice = cases[rand(0, cases.length - 1)];
    var value = diff === 'mudah' ? rand(2, 12) : diff === 'sedang' ? rand(5, 25) : rand(10, 50);
    var answer = value * choice.factor;
    return {
      text: value + ' ' + choice.from + ' = ... ' + choice.to,
      correctValue: String(answer),
      explanation: 'Perhatikan satuan asal dan satuan tujuan. Gunakan faktor konversi yang tepat, lalu kalikan nilainya.',
      distractors: [String(answer / 10), String(answer + choice.factor), String(value + choice.factor)]
    };
  }

  function makeQuestion(topicId, difficulty) {
    var generated;
    var options;
    var question;
    if (topicId === 'operasi_hitung') generated = operationQuestion(difficulty);
    else if (topicId === 'fpb_kpk') generated = fpbKpkQuestion(difficulty);
    else if (topicId === 'pecahan') generated = fractionQuestion(difficulty);
    else if (topicId === 'desimal_persen') generated = decimalPercentQuestion(difficulty);
    else if (topicId === 'geometri') generated = geometryQuestion(difficulty);
    else generated = measurementQuestion(difficulty);

    options = uniqueOptions(generated.correctValue, generated.distractors);
    question = {
      id: 'local_' + topicId + '_' + Date.now() + '_' + rand(100, 999),
      text: generated.text,
      options: options,
      correct: options.indexOf(String(generated.correctValue)),
      explanation: generated.explanation,
      topic: topicId,
      difficulty: normalizeDifficulty(difficulty),
      subject: 'matematika'
    };
    return question;
  }

  function validateQuestion(question) {
    if (!question || typeof question !== 'object') return false;
    if (!question.text || Object.prototype.toString.call(question.options) !== '[object Array]') return false;
    if (question.options.length !== 4) return false;
    if (toInt(question.correct, -1) < 0 || toInt(question.correct, -1) > 3) return false;
    return true;
  }

  function normalizeQuestions(questions) {
    var result = [];
    var index;
    for (index = 0; index < questions.length; index++) {
      if (!validateQuestion(questions[index])) continue;
      result.push(questions[index]);
    }
    return result;
  }

  function localQuestions(options) {
    var opts = options || {};
    var count = Math.max(1, toInt(opts.count, 5));
    var list = [];
    var attempts = 0;
    var topicId = opts.topic && opts.topic !== 'adaptive' ? opts.topic : getWeakestTopic(getProfile());
    var topics = opts.topic === 'adaptive' ? TOPICS.map(function(topic) { return topic.id; }) : [topicId];
    var question;
    while (list.length < count && attempts < count * 12) {
      attempts += 1;
      question = makeQuestion(topics[list.length % topics.length], opts.difficulty || 'sedang');
      if (questionSeen(question)) continue;
      rememberQuestion(question);
      list.push(question);
    }
    saveQuestionCache(list);
    return list;
  }

  function localAssessmentQuestions(options) {
    var opts = options || {};
    var count = Math.max(6, toInt(opts.count, 10));
    var list = [];
    var index;
    var topic;
    for (index = 0; index < count; index++) {
      topic = TOPICS[index % TOPICS.length].id;
      list.push(makeQuestion(topic, index < 3 ? 'mudah' : index < 7 ? 'sedang' : 'sulit'));
    }
    saveQuestionCache(list);
    return list;
  }

  function buildHint(question, level) {
    var hintLevel = Math.max(1, Math.min(3, toInt(level, 1)));
    var topicMeta = getTopicMeta(question.topic);
    if (hintLevel === 1) {
      return 'Petunjuk 1: fokus dulu ke konsep ' + topicMeta.label.toLowerCase() + '. Coba pecah soalnya jadi langkah kecil.';
    }
    if (hintLevel === 2) {
      return 'Petunjuk 2: ' + question.explanation;
    }
    return 'Petunjuk 3: cocokan hasil hitunganmu dengan opsi yang paling masuk akal, lalu cek lagi langkah terakhirmu.';
  }

  function isAcademicPrompt(prompt) {
    var text = String(prompt || '').toLowerCase();
    if (!text) return false;
    return /(matematika|math|pecahan|fpb|kpk|desimal|persen|geometri|pengukuran|soal|hint|jelas|bantu|belajar|answer|jawab|english|ipa|sains|luas|keliling|kali|bagi)/.test(text);
  }

  function localTutorReply(payload) {
    var input = payload || {};
    var question = input.question || null;
    var prompt = String(input.prompt || '').toLowerCase();
    var topicMeta = getTopicMeta(input.topic || (question ? question.topic : 'pecahan'));
    if (!question && !isAcademicPrompt(prompt)) {
      return {
        success: true,
        provider: 'local-fallback',
        message: 'Aku bantu topik pelajaran dulu ya. Coba tanya soal matematika, IPA, atau English supaya kita fokus belajar bareng.'
      };
    }
    if (input.mode === 'hint' && question) {
      return {
        success: true,
        provider: 'local-fallback',
        message: buildHint(question, input.hintLevel || 1)
      };
    }
    if (question && /(jawab|answer)/.test(prompt)) {
      return {
        success: true,
        provider: 'local-fallback',
        message: 'Aku nggak langsung kasih jawabannya ya. Coba mulai dari langkah pertama ini: ' + buildHint(question, 1)
      };
    }
    if (question) {
      return {
        success: true,
        provider: 'local-fallback',
        message: 'Oke, kita bahas pelan-pelan. ' + question.explanation + ' Kalau masih bingung, tekan tombol hint supaya aku pecah lagi jadi langkah yang lebih kecil.'
      };
    }
    return {
      success: true,
      provider: 'local-fallback',
      message: 'Topik ' + topicMeta.label + ' itu paling enak dipelajari dengan contoh kecil dulu. Mau aku bantu jelaskan konsepnya atau langsung kasih latihan singkat?'
    };
  }

  function xhrJSON(method, url, payload, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.onreadystatechange = function() {
      var response = null;
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        response = safeParse(xhr.responseText);
        callback(null, response || {});
        return;
      }
      callback(new Error('Request failed: ' + xhr.status));
    };
    xhr.onerror = function() {
      callback(new Error('Network error'));
    };
    xhr.send(payload ? JSON.stringify(payload) : null);
  }

  function generateQuestions(options, callback) {
    var opts = options || {};
    xhrJSON('POST', API.generate, opts, function(error, response) {
      var questions;
      if (error || !response || !response.questions) {
        callback(null, {
          success: true,
          provider: 'local-fallback',
          source: 'local',
          questions: localQuestions(opts)
        });
        return;
      }
      questions = normalizeQuestions(response.questions);
      if (!questions.length) {
        callback(null, {
          success: true,
          provider: 'local-fallback',
          source: 'local',
          questions: localQuestions(opts)
        });
        return;
      }
      saveQuestionCache(questions);
      callback(null, {
        success: true,
        provider: response.provider || 'remote',
        source: 'api',
        questions: questions
      });
    });
  }

  function generateAssessment(options, callback) {
    var opts = options || {};
    xhrJSON('POST', API.assess, opts, function(error, response) {
      var questions;
      if (error || !response || !response.questions) {
        callback(null, {
          success: true,
          provider: 'local-fallback',
          source: 'local',
          questions: localAssessmentQuestions(opts)
        });
        return;
      }
      questions = normalizeQuestions(response.questions);
      if (!questions.length) {
        callback(null, {
          success: true,
          provider: 'local-fallback',
          source: 'local',
          questions: localAssessmentQuestions(opts)
        });
        return;
      }
      saveQuestionCache(questions);
      callback(null, {
        success: true,
        provider: response.provider || 'remote',
        source: 'api',
        questions: questions
      });
    });
  }

  function chat(payload, callback) {
    var input = payload || {};
    var config = getConfig();
    if (config.aiChatEnabled === false) {
      callback(null, {
        success: true,
        provider: 'disabled',
        message: 'Chat Draco sedang dimatikan dari config. Kamu masih bisa pakai quiz dan assessment.'
      });
      return;
    }
    xhrJSON('POST', API.chat, input, function(error, response) {
      if (error || !response || (!response.message && !response.reply)) {
        callback(null, localTutorReply(input));
        return;
      }
      callback(null, {
        success: true,
        provider: response.provider || 'remote',
        message: response.message || response.reply
      });
    });
  }

  function getStatus(callback) {
    xhrJSON('GET', API.status, null, function(error, response) {
      if (error || !response) {
        callback(null, clone(LOCAL_PROVIDER_STATUS));
        return;
      }
      callback(null, response);
    });
  }

  function grantRewards(isCorrect, streak) {
    var currentStreak = Math.max(0, toInt(streak, 0));
    var xp = 0;
    var coins = 0;
    var leveledUp = false;
    if (isCorrect) {
      xp = 10;
      coins = currentStreak >= 3 ? 10 : 5;
    }
    if (window.druygonProfile && isCorrect) {
      leveledUp = window.druygonProfile.addXP(xp);
      window.druygonProfile.addCoins(coins);
    }
    return {
      xp: xp,
      coins: coins,
      leveledUp: leveledUp
    };
  }

  function setActiveQuestion(question) {
    var session = getSession();
    session.activeQuestion = question || null;
    saveSession(session);
  }

  function updateSession(partial) {
    var session = getSession();
    var key;
    for (key in partial) {
      if (Object.prototype.hasOwnProperty.call(partial, key)) session[key] = partial[key];
    }
    saveSession(session);
    return session;
  }

  function getLevelLabel(level) {
    return LEVEL_LABELS[level] || LEVEL_LABELS.belum_diuji;
  }

  window.druygonAI = {
    API: API,
    KEYS: KEYS,
    TOPICS: TOPICS,
    getTopics: getTopics,
    getTopicMeta: getTopicMeta,
    getLevelLabel: getLevelLabel,
    getConfig: getConfig,
    saveConfig: saveConfig,
    getProfile: getProfile,
    saveProfile: saveProfile,
    getStats: getStats,
    saveStats: saveStats,
    getSession: getSession,
    saveSession: saveSession,
    updateSession: updateSession,
    getQuestionCache: getQuestionCache,
    ensureDailyMission: ensureDailyMission,
    isReassessmentDue: isReassessmentDue,
    getWeakestTopic: getWeakestTopic,
    getSubjectProgress: getSubjectProgress,
    recordAnswer: recordAnswer,
    finalizeAssessment: finalizeAssessment,
    generateQuestions: generateQuestions,
    generateAssessment: generateAssessment,
    chat: chat,
    getStatus: getStatus,
    grantRewards: grantRewards,
    getAvailableScholarPokemon: getAvailableScholarPokemon,
    claimScholarPokemon: claimScholarPokemon,
    setActiveQuestion: setActiveQuestion
  };
})(window, document);
