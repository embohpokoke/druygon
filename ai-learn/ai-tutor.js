(function(window, document) {
  var messages = [];
  var session = window.druygonAI.getSession();
  var activeQuestion = session.activeQuestion || null;

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderMessages() {
    var log = byId('chatLog');
    var html = '';
    var i;
    if (!messages.length) {
      log.innerHTML = '<div class="ai-empty">Draco siap bantu. Coba tanya konsep, minta hint, atau minta contoh soal.</div>';
      return;
    }
    for (i = 0; i < messages.length; i++) {
      html += '<div class="ai-bubble ' + messages[i].role + '">' + escapeHtml(messages[i].text) + '</div>';
    }
    log.innerHTML = html;
    log.scrollTop = log.scrollHeight;
  }

  function pushMessage(role, text) {
    messages.push({ role: role, text: text });
    renderMessages();
  }

  function renderContext() {
    var box = byId('questionContext');
    if (!activeQuestion) return;
    box.style.display = 'block';
    box.innerHTML =
      '<strong>Konteks soal aktif</strong>' +
      '<div class="ai-copy" style="margin-top:8px;">' + activeQuestion.text + '</div>' +
      '<div class="ai-helper" style="margin-top:8px;">Draco akan pakai konteks ini saat kasih hint atau penjelasan.</div>';
  }

  function setTyping(visible) {
    byId('chatModePill').textContent = visible ? 'Draco sedang mengetik...' : 'Tutor aktif';
  }

  function sendPrompt(text, mode) {
    var prompt = String(text || '').replace(/^\s+|\s+$/g, '');
    if (!prompt) return;
    pushMessage('user', prompt);
    byId('chatInput').value = '';
    setTyping(true);
    window.druygonAI.chat({
      mode: mode || 'chat',
      prompt: prompt,
      topic: session.topic,
      subject: session.subject || 'matematika',
      question: activeQuestion,
      history: messages.slice(-6)
    }, function(error, response) {
      setTyping(false);
      pushMessage('draco', response && response.message ? response.message : 'Aku belum dapat jawabannya. Coba tanya lagi dengan kalimat yang lebih spesifik ya.');
    });
  }

  function bindQuickActions() {
    var buttons = document.querySelectorAll('[data-quick]');
    var i;
    for (i = 0; i < buttons.length; i++) {
      buttons[i].onclick = function() {
        var label = this.getAttribute('data-quick');
        if (label === 'Kasih hint') sendPrompt('Kasih hint', 'hint');
        else sendPrompt(label, 'chat');
      };
    }
  }

  byId('sendBtn').onclick = function() {
    sendPrompt(byId('chatInput').value, 'chat');
  };

  byId('chatInput').onkeydown = function(event) {
    var key = event.which || event.keyCode;
    if (key === 13) {
      sendPrompt(byId('chatInput').value, 'chat');
      return false;
    }
  };

  renderContext();
  bindQuickActions();
  pushMessage('draco', activeQuestion
    ? 'Hai! Aku lihat kamu lagi ngerjain soal tadi. Mau bahas langkahnya, minta hint, atau latihan contoh yang mirip?'
    : 'Hai! Mau tanya topik apa hari ini? Aku siap bantu matematika pelan-pelan ya.');
})(window, document);
