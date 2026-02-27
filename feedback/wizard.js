/**
 * Druygon Feedback & Planning Wizard
 * ES5 Compatible - No let/const/arrow functions/template literals
 */

(function(window) {
  'use strict';

  // Questionnaire definitions
  var QUESTIONNAIRES = {
    feedback: {
      title: 'Portal Feedback',
      steps: [
        {
          id: 'favorite_game',
          question: 'Game mana yang paling sering kamu main?',
          type: 'select',
          options: ['Math Arena', 'Word Search', '5 Menit Matematika', 'Pokemon RPG', 'Lainnya']
        },
        {
          id: 'fun_part',
          question: 'Apa yang paling seru dari game itu?',
          type: 'textarea',
          placeholder: 'Ceritain apa yang bikin game itu seru...'
        },
        {
          id: 'problems',
          question: 'Ada yang bikin kesel atau susah? Bug atau masalah?',
          type: 'textarea',
          placeholder: 'Kalau ada bug atau hal yang bikin frustasi, tulis di sini...'
        },
        {
          id: 'rating',
          question: 'Rating keseluruhan portal',
          type: 'stars',
          max: 5
        },
        {
          id: 'change_one_thing',
          question: 'Kalau boleh ubah satu hal, apa yang kamu ubah?',
          type: 'textarea',
          placeholder: 'Apa yang mau kamu perbaiki atau tambahkan?'
        },
        {
          id: 'message',
          question: 'Pesan buat developer 😄',
          type: 'textarea',
          placeholder: 'Ada pesan atau saran untuk developer?'
        }
      ]
    },
    planning: {
      title: "What's Next",
      steps: [
        {
          id: 'game_idea',
          question: 'Game atau fitur baru apa yang kamu mau?',
          type: 'text',
          placeholder: 'Contoh: Pokemon Battle Multiplayer, Quest System...'
        },
        {
          id: 'how_to_play',
          question: 'Gimana cara mainnya? Jelasin idenya!',
          type: 'textarea',
          placeholder: 'Ceritain detail cara mainnya, aturannya, dll...'
        },
        {
          id: 'why_fun',
          question: 'Kenapa game itu bakal seru?',
          type: 'textarea',
          placeholder: 'Apa yang bikin game ini menarik dan fun?'
        },
        {
          id: 'difficulty',
          question: 'Seberapa susah harusnya?',
          type: 'select',
          options: ['Gampang', 'Sedang', 'Susah', 'Extreme']
        },
        {
          id: 'reference',
          question: 'Ada referensi game yang mirip? (opsional)',
          type: 'text',
          placeholder: 'Game atau fitur dari game lain yang mirip...',
          optional: true
        },
        {
          id: 'priority',
          question: 'Prioritas: kapan mau ini jadi?',
          type: 'select',
          options: ['Sekarang!', 'Minggu depan', 'Bulan depan', 'Nanti aja']
        }
      ]
    }
  };

  // Wizard state
  var currentMode = 'feedback';
  var currentStep = 0;
  var answers = {};

  // Initialize
  function init() {
    resetWizard();
    showCurrentStep();
  }

  // Switch mode
  window.switchMode = function(mode) {
    currentMode = mode;
    
    // Update tabs
    document.getElementById('tabFeedback').classList.remove('active');
    document.getElementById('tabPlanning').classList.remove('active');
    
    if (mode === 'feedback') {
      document.getElementById('tabFeedback').classList.add('active');
    } else {
      document.getElementById('tabPlanning').classList.add('active');
    }
    
    resetWizard();
    showCurrentStep();
  };

  function resetWizard() {
    currentStep = 0;
    answers = {};
  }

  function getCurrentQuestionnaire() {
    return QUESTIONNAIRES[currentMode];
  }

  function getCurrentStep() {
    var questionnaire = getCurrentQuestionnaire();
    return questionnaire.steps[currentStep];
  }

  function getTotalSteps() {
    var questionnaire = getCurrentQuestionnaire();
    return questionnaire.steps.length;
  }

  function getProgress() {
    return ((currentStep + 1) / getTotalSteps()) * 100;
  }

  function showCurrentStep() {
    var step = getCurrentStep();
    var stepNum = currentStep + 1;
    var total = getTotalSteps();
    
    // Update progress
    document.getElementById('stepProgress').textContent = 'Langkah ' + stepNum + ' dari ' + total;
    document.getElementById('progressBar').style.width = getProgress() + '%';
    
    // Update question
    document.getElementById('questionTitle').textContent = step.question;
    
    // Create input
    var inputContainer = document.getElementById('inputContainer');
    inputContainer.innerHTML = '';
    
    var savedAnswer = answers[step.id] || '';
    
    if (step.type === 'text') {
      var input = document.createElement('input');
      input.type = 'text';
      input.id = 'currentInput';
      input.placeholder = step.placeholder || '';
      input.value = savedAnswer;
      input.oninput = checkCanProceed;
      inputContainer.appendChild(input);
      setTimeout(function() { input.focus(); }, 100);
      
    } else if (step.type === 'textarea') {
      var textarea = document.createElement('textarea');
      textarea.id = 'currentInput';
      textarea.placeholder = step.placeholder || '';
      textarea.value = savedAnswer;
      textarea.oninput = checkCanProceed;
      inputContainer.appendChild(textarea);
      setTimeout(function() { textarea.focus(); }, 100);
      
    } else if (step.type === 'select') {
      var select = document.createElement('select');
      select.id = 'currentInput';
      select.onchange = checkCanProceed;
      
      var defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = '-- Pilih --';
      select.appendChild(defaultOption);
      
      for (var i = 0; i < step.options.length; i++) {
        var option = document.createElement('option');
        option.value = step.options[i];
        option.textContent = step.options[i];
        if (savedAnswer === step.options[i]) {
          option.selected = true;
        }
        select.appendChild(option);
      }
      inputContainer.appendChild(select);
      
    } else if (step.type === 'stars') {
      var starsDiv = document.createElement('div');
      starsDiv.className = 'stars-container';
      starsDiv.id = 'currentInput';
      
      for (var i = 1; i <= step.max; i++) {
        var star = document.createElement('span');
        star.className = 'star';
        star.textContent = '⭐';
        star.setAttribute('data-value', i);
        if (savedAnswer >= i) {
          star.classList.add('active');
        }
        star.onclick = function() {
          var value = parseInt(this.getAttribute('data-value'));
          var stars = document.querySelectorAll('.star');
          for (var j = 0; j < stars.length; j++) {
            if (j < value) {
              stars[j].classList.add('active');
            } else {
              stars[j].classList.remove('active');
            }
          }
          answers[step.id] = value;
          checkCanProceed();
        };
        starsDiv.appendChild(star);
      }
      inputContainer.appendChild(starsDiv);
    }
    
    // Update buttons
    document.getElementById('prevBtn').style.display = currentStep === 0 ? 'none' : 'inline-block';
    
    // Update next button text
    var nextBtn = document.getElementById('nextBtn');
    if (currentStep === getTotalSteps() - 1) {
      nextBtn.textContent = 'Submit 🚀';
    } else {
      nextBtn.textContent = 'Lanjut ➡️';
    }
    
    checkCanProceed();
  }

  function checkCanProceed() {
    var step = getCurrentStep();
    var value = '';
    
    if (step.type === 'stars') {
      var activeStars = document.querySelectorAll('.star.active');
      value = activeStars.length > 0 ? activeStars.length.toString() : '';
    } else {
      var input = document.getElementById('currentInput');
      value = input ? input.value.trim() : '';
    }
    
    answers[step.id] = value;
    
    // Allow proceeding if optional or has value
    var canProceed = step.optional || value.length > 0;
    document.getElementById('nextBtn').disabled = !canProceed;
  }

  window.nextStep = function() {
    saveCurrentAnswer();
    
    if (currentStep < getTotalSteps() - 1) {
      currentStep = currentStep + 1;
      showCurrentStep();
    } else {
      submitToAPI();
    }
  };

  window.previousStep = function() {
    saveCurrentAnswer();
    if (currentStep > 0) {
      currentStep = currentStep - 1;
      showCurrentStep();
    }
  };

  function saveCurrentAnswer() {
    var step = getCurrentStep();
    if (step.type === 'stars') {
      var activeStars = document.querySelectorAll('.star.active');
      answers[step.id] = activeStars.length;
    } else {
      var input = document.getElementById('currentInput');
      if (input) {
        answers[step.id] = input.value;
      }
    }
  }

  function submitToAPI() {
    // Hide wizard, show loading
    document.getElementById('wizardScreen').classList.add('hide');
    document.getElementById('loadingScreen').classList.remove('hide');
    
    // Get profile info
    var profile = window.druygonProfile ? window.druygonProfile.get() : { name: 'Dru', level: 1 };
    
    // Prepare payload
    var payload = {
      mode: currentMode,
      answers: answers,
      profile: {
        name: profile.name || 'Dru',
        level: profile.level || 1,
        gamesPlayed: profile.stats ? profile.stats.gamesPlayed : 0
      }
    };
    
    // Call API using XMLHttpRequest (ES5 compatible)
    var apiUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3847/api/feedback'
      : 'https://druygon.my.id/api/feedback';
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var data = JSON.parse(xhr.responseText);
          showResult(data.response);
        } else {
          showResult('⚠️ Waduh, ada masalah nih!\n\n' + 
            'Pastikan server API sudah jalan ya!\n\n' +
            'Cara jalankan:\n' +
            'cd /Users/erikmahendra/clawd/druygon/api\n' +
            'node server.js\n\n' +
            'Error: ' + xhr.status);
        }
      }
    };
    xhr.send(JSON.stringify(payload));
  }

  function showResult(content) {
    document.getElementById('loadingScreen').classList.add('hide');
    document.getElementById('resultScreen').classList.remove('hide');
    
    // Format content with basic markdown-like rendering
    var formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    formatted = '<p>' + formatted + '</p>';
    
    document.getElementById('resultContent').innerHTML = formatted;
  }

  window.saveResult = function() {
    var content = document.getElementById('resultContent').textContent;
    var blob = new Blob([content], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'druygon-' + currentMode + '-' + Date.now() + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ Hasil disimpan!');
  };

  window.resetForm = function() {
    document.getElementById('resultScreen').classList.add('hide');
    document.getElementById('wizardScreen').classList.remove('hide');
    resetWizard();
    showCurrentStep();
  };

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
