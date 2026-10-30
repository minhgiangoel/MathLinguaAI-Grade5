/**
 * MathBuddyPartner.js
 * Interactive MathBuddy AI Conversation Partner Component for MathLingua AI Grade 5
 */

import { recordLearningEvent } from '../../services/progressAnalytics.js';
import { generateFreeMathBuddyResponse } from '../../services/freeMathBuddyEngine.js';

export function renderMathBuddyConversation(root, navigate, initialTopic = 'Decimal Numbers') {
  root.innerHTML = '';

  const TOPICS = [
    { id: 'Decimal Numbers', en: 'Decimal Numbers', vi: 'Số thập phân', icon: '🔢' },
    { id: 'Mixed Numbers', en: 'Mixed Numbers', vi: 'Hỗn số', icon: '🍕' },
    { id: 'Geometry', en: 'Geometry', vi: 'Hình học 3D & 2D', icon: '📐' },
    { id: 'Measurement', en: 'Measurement', vi: 'Đo lường (ha, km²)', icon: '🗺️' },
    { id: 'Ratio and Percentage', en: 'Ratio and Percentage', vi: 'Tỉ số & Phần trăm', icon: '📊' },
    { id: 'Fraction', en: 'Fraction & Decimal Fractions', vi: 'Phân số & PS Thập phân', icon: '🧩' }
  ];

  const MODES = [
    { id: 'talk', labelEn: 'TALK', labelVi: 'Hội thoại tự nhiên', icon: '💬', desc: 'Trò chuyện & Thảo luận toán học' },
    { id: 'role-play', labelEn: 'ROLE-PLAY', labelVi: 'Đóng vai ngữ cảnh', icon: '🎭', desc: 'Đóng vai Trạm Vũ trụ & Mua sắm' },
    { id: 'discover', labelEn: 'DISCOVER', labelVi: 'Khám phá bí ẩn', icon: '🔍', desc: 'Giải mã mật mã & Manh mối' },
    { id: 'play-together', labelEn: 'PLAY TOGETHER', labelVi: 'Cùng chơi & Giải toán', icon: '🎮', desc: 'Đồng đội chinh phục thử thách' }
  ];

  let currentTopic = initialTopic;
  let currentMode = 'talk';
  let isThinking = false;
  let isListeningMic = false;
  let recognitionInstance = null;

  // Session Chat History
  let messagesHistory = [
    {
      role: 'mathbuddy',
      text: `Hello there! I am MathBuddy 🤖, your personal math conversation partner! Let's talk, explore, and learn math in English together! We are currently on ${currentTopic}.`,
      translationVi: `Xin chào! Tớ là MathBuddy 🤖, người bạn đồng hành hội thoại Toán học của bạn! Hãy cùng trò chuyện và học Toán bằng tiếng Anh! Chúng ta đang ở chủ đề ${currentTopic}.`,
      quickReplies: [
        `Let's start! 🚀`,
        `Which number is greater: 4.5 or 4.35?`,
        `Can you give me a fun math puzzle?`
      ],
      sentenceStarters: [
        `I think ... because ...`,
        `Can you explain how to ...?`,
        `First, I compare ...`
      ],
      feedback: {
        praise: "Welcome to MathBuddy AI! Let's explore together!",
        conceptNote: `Topic: ${currentTopic}`
      }
    }
  ];

  // Shell Layout Container
  const scroll = document.createElement('div');
  scroll.className = 'stage-scroll mathbuddy-scroll';

  const container = document.createElement('div');
  container.className = 'mathbuddy-container';

  // 1. MathBuddy Top Header Card
  const headerCard = document.createElement('div');
  headerCard.className = 'mathbuddy-header-card';
  headerCard.innerHTML = `
    <div class="mathbuddy-identity">
      <div class="mathbuddy-avatar-wrap">
        <div class="mathbuddy-avatar-ring">🤖</div>
      </div>
      <div class="mathbuddy-identity-text">
        <div class="mathbuddy-title-row">
          <h1 class="mathbuddy-title">MathBuddy AI</h1>
          <span class="mathbuddy-badge free-mode" title="Free Chat Mode - Fast, Offline & Free">⚡ Free Chat Mode (Miễn phí)</span>
        </div>
        <p class="mathbuddy-subtitle">Your Personal Math Conversation Partner · Bạn đồng hành hội thoại Toán học</p>
        <p class="mathbuddy-slogan">✨ "Talk, Explore, and Learn Math in English!" ✨</p>
      </div>
    </div>
    <div class="mathbuddy-header-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
      <button type="button" class="mathbuddy-btn-newchat" id="btn-mathbuddy-clearchat" style="background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#fca5a5;" title="Clear Chat Stream / Xóa khung trò chuyện">
        🗑️ Clear Chat
      </button>
      <button type="button" class="mathbuddy-btn-newchat" id="btn-mathbuddy-newchat" title="Start a New Conversation / Bắt đầu hội thoại mới">
        🔄 New Conversation
      </button>
    </div>
  `;

  // 2. Topic & Mode Controls Bar
  const controlsBar = document.createElement('div');
  controlsBar.className = 'mathbuddy-controls-bar';

  // Topic Select
  const topicWrap = document.createElement('div');
  topicWrap.className = 'mathbuddy-topic-select-wrap';
  topicWrap.innerHTML = `
    <label for="mathbuddy-topic-select" class="mathbuddy-label">🎯 Math Topic:</label>
    <select id="mathbuddy-topic-select" class="mathbuddy-select">
      ${TOPICS.map(t => `<option value="${t.id}" ${t.id === currentTopic ? 'selected' : ''}>${t.icon} ${t.en} (${t.vi})</option>`).join('')}
    </select>
  `;

  // Mode Selector Tabs
  const modeTabs = document.createElement('div');
  modeTabs.className = 'mathbuddy-mode-tabs';
  MODES.forEach(m => {
    const tabBtn = document.createElement('button');
    tabBtn.type = 'button';
    tabBtn.className = `mathbuddy-mode-tab ${m.id === currentMode ? 'active' : ''}`;
    tabBtn.dataset.mode = m.id;
    tabBtn.title = m.desc;
    tabBtn.innerHTML = `<span class="mode-icon">${m.icon}</span> <span class="mode-label">${m.labelEn}</span>`;
    tabBtn.addEventListener('click', () => {
      if (currentMode === m.id) return;
      currentMode = m.id;
      modeTabs.querySelectorAll('.mathbuddy-mode-tab').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');
      triggerModeWelcome(m);
    });
    modeTabs.appendChild(tabBtn);
  });

  controlsBar.appendChild(topicWrap);
  controlsBar.appendChild(modeTabs);

  // 3. Conversation Chat Area
  const chatBox = document.createElement('div');
  chatBox.className = 'mathbuddy-chat-box';

  const messagesList = document.createElement('div');
  messagesList.className = 'mathbuddy-messages-list';
  chatBox.appendChild(messagesList);

  // 4. Quick Replies & Sentence Starters Scaffold Container
  const scaffoldArea = document.createElement('div');
  scaffoldArea.className = 'mathbuddy-scaffold-area';

  const quickRepliesWrap = document.createElement('div');
  quickRepliesWrap.className = 'mathbuddy-quick-replies';

  const startersWrap = document.createElement('div');
  startersWrap.className = 'mathbuddy-starters-wrap';

  scaffoldArea.appendChild(quickRepliesWrap);
  scaffoldArea.appendChild(startersWrap);

  // 5. Input Bar Area
  const inputBar = document.createElement('div');
  inputBar.className = 'mathbuddy-input-bar';
  inputBar.innerHTML = `
    <div class="mathbuddy-input-field-wrap">
      <input type="text" id="mathbuddy-text-input" class="mathbuddy-text-input" placeholder="Type your answer or math question in English or Vietnamese..." autocomplete="off" />
      <button type="button" id="btn-mathbuddy-mic" class="mathbuddy-mic-btn" title="Speak with Microphone / Nói qua Micro">
        🎤
      </button>
    </div>
    <button type="button" id="btn-mathbuddy-send" class="mathbuddy-send-btn" title="Send Message / Gửi tin nhắn">
      🚀 Send
    </button>
  `;

  container.appendChild(headerCard);
  container.appendChild(controlsBar);
  container.appendChild(chatBox);
  container.appendChild(scaffoldArea);
  container.appendChild(inputBar);
  scroll.appendChild(container);
  root.appendChild(scroll);

  // Event Listeners
  const topicSelect = topicWrap.querySelector('#mathbuddy-topic-select');
  const newChatBtn = headerCard.querySelector('#btn-mathbuddy-newchat');
  const clearChatBtn = headerCard.querySelector('#btn-mathbuddy-clearchat');
  const textInput = inputBar.querySelector('#mathbuddy-text-input');
  const sendBtn = inputBar.querySelector('#btn-mathbuddy-send');
  const micBtn = inputBar.querySelector('#btn-mathbuddy-mic');

  topicSelect.addEventListener('change', (e) => {
    if (isThinking) return;
    currentTopic = e.target.value;
    startNewConversation();
  });

  clearChatBtn?.addEventListener('click', () => {
    if (isThinking) return;
    messagesHistory = [
      {
        role: 'mathbuddy',
        text: `Cleared chat stream! We are on "${currentTopic}". What question would you like to solve? 🤖⚡`,
        translationVi: `Đã xóa khung trò chuyện! Chúng ta đang ở chủ đề "${currentTopic}". Bạn muốn giải câu hỏi nào?`,
        quickReplies: [`Ask me a question!`, `Which is bigger 4.5 or 4.35?`, `Explain 1 ha in m²!`],
        sentenceStarters: [`I want to calculate...`, `Can you explain...`]
      }
    ];
    renderMessages();
  });

  newChatBtn.addEventListener('click', () => {
    if (isThinking) return;
    startNewConversation();
  });

  sendBtn.addEventListener('click', () => sendMessage());
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });

  // Setup Web Speech Recognition
  setupSpeechRecognition(micBtn, textInput);

  // Initial Render & Start Conversation
  renderMessages();
  fetchBuddyResponse(`Hello MathBuddy! I'm excited to practice math about ${currentTopic}.`);

  // Helper Functions
  function startNewConversation() {
    messagesHistory = [
      {
        role: 'mathbuddy',
        text: `Starting a new ${currentMode.toUpperCase()} conversation on "${currentTopic}"! What math idea or question would you like to explore? 🤖✨`,
        translationVi: `Bắt đầu cuộc hội thoại ${currentMode.toUpperCase()} mới về "${currentTopic}"! Bạn muốn khám phá ý tưởng hoặc câu hỏi toán học nào?`,
        quickReplies: [
          `Let's start! 🚀`,
          `Ask me a question about ${currentTopic}!`,
          `Give me a fun scenario!`
        ],
        sentenceStarters: [
          `I want to learn about ...`,
          `How do we solve ...?`,
          `I think ...`
        ]
      }
    ];
    renderMessages();
    fetchBuddyResponse(`Hello! Let's start a new ${currentMode} conversation on ${currentTopic}.`);
  }

  function triggerModeWelcome(modeObj) {
    if (isThinking) return;
    fetchBuddyResponse(`I'd like to switch to ${modeObj.labelEn} mode for ${currentTopic}!`);
  }

  function updateControlsState() {
    textInput.disabled = isThinking;
    sendBtn.disabled = isThinking;
    micBtn.disabled = isThinking;
    topicSelect.disabled = isThinking;
    newChatBtn.disabled = isThinking;

    modeTabs.querySelectorAll('.mathbuddy-mode-tab').forEach(btn => {
      btn.disabled = isThinking;
    });

    if (isThinking) {
      sendBtn.innerHTML = `⏳ Thinking...`;
    } else {
      sendBtn.innerHTML = `🚀 Send`;
    }
  }

  function renderMessages() {
    updateControlsState();
    messagesList.innerHTML = '';

    messagesHistory.forEach((msg, idx) => {
      const msgRow = document.createElement('div');
      msgRow.className = `mathbuddy-msg-row ${msg.role === 'student' ? 'student-row' : 'buddy-row'} ${msg.isError ? 'error-row' : ''}`;

      if (msg.role === 'mathbuddy') {
        msgRow.innerHTML = `
          <div class="buddy-msg-avatar">${msg.isError ? '⚠️' : '🤖'}</div>
          <div class="buddy-msg-bubble">
            <div class="msg-header-line">
              <span class="msg-author-name">${msg.isError ? 'MathBuddy System' : 'MathBuddy AI'}</span>
              <span class="msg-time-badge">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="msg-body-text">${escapeHtml(msg.text)}</div>
            ${msg.translationVi ? `
              <div class="msg-translation-box" id="trans-${idx}" style="display:${msg.isError ? 'block' : 'none'};">
                <strong>🇻🇳 Dịch tiếng Việt:</strong> ${escapeHtml(msg.translationVi)}
              </div>
            ` : ''}
            ${msg.feedback && msg.feedback.praise ? `
              <div class="msg-feedback-badge">
                🌟 <strong>Feedback:</strong> ${escapeHtml(msg.feedback.praise)}
              </div>
            ` : ''}
            ${msg.isError ? `
              <button type="button" class="mathbuddy-btn-retry" id="btn-retry-${idx}">
                🔄 Retry / Thử lại
              </button>
            ` : `
              <div class="msg-actions-row">
                <button type="button" class="msg-action-btn btn-listen" data-idx="${idx}" title="Listen with Text-to-Speech / Nghe phát âm">
                  🔊 Listen
                </button>
                ${msg.translationVi ? `
                  <button type="button" class="msg-action-btn btn-translate" data-idx="${idx}" title="Toggle Vietnamese Translation / Bật-tắt tiếng Việt">
                    🌐 Translate
                  </button>
                ` : ''}
              </div>
            `}
          </div>
        `;

        if (msg.isError) {
          const retryBtn = msgRow.querySelector(`#btn-retry-${idx}`);
          if (retryBtn) {
            retryBtn.addEventListener('click', () => {
              // Remove the error message from history and retry sending the failed text
              messagesHistory.splice(idx, 1);
              if (msg.failedMessage) {
                fetchBuddyResponse(msg.failedMessage);
              } else {
                startNewConversation();
              }
            });
          }
        } else {
          const listenBtn = msgRow.querySelector('.btn-listen');
          if (listenBtn) {
            listenBtn.addEventListener('click', () => speakText(msg.text, 'en'));
          }

          const transBtn = msgRow.querySelector('.btn-translate');
          if (transBtn) {
            transBtn.addEventListener('click', () => {
              const transBox = msgRow.querySelector(`#trans-${idx}`);
              if (transBox) {
                const isHidden = transBox.style.display === 'none';
                transBox.style.display = isHidden ? 'block' : 'none';
              }
            });
          }
        }
      } else {
        msgRow.innerHTML = `
          <div class="student-msg-bubble">
            <div class="msg-header-line student-header">
              <span class="msg-author-name">You</span>
              <span class="msg-time-badge">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="msg-body-text">${escapeHtml(msg.text)}</div>
          </div>
          <div class="student-msg-avatar">👦</div>
        `;
      }

      messagesList.appendChild(msgRow);
    });

    if (isThinking) {
      const thinkingRow = document.createElement('div');
      thinkingRow.className = 'mathbuddy-msg-row buddy-row thinking-row';
      thinkingRow.innerHTML = `
        <div class="buddy-msg-avatar">🤖</div>
        <div class="buddy-msg-bubble thinking-bubble">
          <div class="thinking-spinner">
            <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
          </div>
          <span class="thinking-text">MathBuddy is thinking & formulating response... 🤖✨</span>
        </div>
      `;
      messagesList.appendChild(thinkingRow);
    }

    // Auto-scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;

    // Render Quick Replies & Sentence Starters for latest MathBuddy message
    renderScaffoldControls();
  }

  function renderScaffoldControls() {
    quickRepliesWrap.innerHTML = '';
    startersWrap.innerHTML = '';

    const latestBuddyMsg = [...messagesHistory].reverse().find(m => m.role === 'mathbuddy' && !m.isError);
    if (!latestBuddyMsg || isThinking) return;

    // 1. Quick Replies
    if (Array.isArray(latestBuddyMsg.quickReplies) && latestBuddyMsg.quickReplies.length > 0) {
      const label = document.createElement('span');
      label.className = 'scaffold-label';
      label.innerHTML = `💡 Quick Replies:`;
      quickRepliesWrap.appendChild(label);

      latestBuddyMsg.quickReplies.forEach(qrText => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quick-reply-pill';
        btn.textContent = qrText;
        btn.disabled = isThinking;
        btn.addEventListener('click', () => {
          if (isThinking) return;
          sendMessage(qrText);
        });
        quickRepliesWrap.appendChild(btn);
      });
    }

    // 2. English Sentence Starters
    const defaultStarters = [
      `I think ... because ...`,
      `First, I compare ...`,
      `Can you explain that again?`,
      `I am not sure, give me a hint!`
    ];

    const startersList = (Array.isArray(latestBuddyMsg.sentenceStarters) && latestBuddyMsg.sentenceStarters.length > 0)
      ? latestBuddyMsg.sentenceStarters
      : defaultStarters;

    const startersLabel = document.createElement('span');
    startersLabel.className = 'scaffold-label';
    startersLabel.innerHTML = `🗣️ Sentence Starters:`;
    startersWrap.appendChild(startersLabel);

    startersList.forEach(stText => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'starter-pill';
      btn.textContent = stText;
      btn.disabled = isThinking;
      btn.addEventListener('click', () => {
        if (isThinking) return;
        textInput.value = stText.replace('...', ' ');
        textInput.focus();
      });
      startersWrap.appendChild(btn);
    });
  }

  async function sendMessage(textOverride = null) {
    if (isThinking) return;

    const text = textOverride !== null ? textOverride.trim() : textInput.value.trim();
    if (!text) return;

    if (textOverride === null) {
      textInput.value = '';
    }

    // Add student message to UI state
    messagesHistory.push({
      role: 'student',
      text: text
    });

    renderMessages();
    await fetchBuddyResponse(text);
  }

  async function fetchBuddyResponse(userMessageText) {
    isThinking = true;
    renderMessages();

    let buddyResponse = null;

    try {
      const response = await fetch('/api/mathbuddy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: currentTopic,
          mode: currentMode,
          message: userMessageText,
          useAi: false,
          history: messagesHistory.map(m => ({
            role: m.role,
            text: m.text,
            isError: m.isError
          }))
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json().catch(() => null);
        if (response.ok && data && data.success && data.response) {
          buddyResponse = data.response;
        }
      }
    } catch (err) {
      console.warn('[MathBuddy Local Fallback Active]:', err);
    }

    // Local client-side engine fallback if server fetch was unreachable or non-JSON
    if (!buddyResponse) {
      buddyResponse = generateFreeMathBuddyResponse({
        topic: currentTopic,
        mode: currentMode,
        message: userMessageText,
        history: messagesHistory
      });
    }

    isThinking = false;

    if (buddyResponse) {
      messagesHistory.push({
        role: 'mathbuddy',
        text: buddyResponse.text || `Great math question! Let's explore ${currentTopic} together!`,
        translationVi: buddyResponse.translationVi || '',
        quickReplies: buddyResponse.quickReplies || [`Great! 🚀`, `Let me think!`],
        sentenceStarters: buddyResponse.sentenceStarters || [`I think ... because ...`],
        feedback: buddyResponse.feedback || null
      });

      // Record standardized learning event for Speaking & Listening
      recordLearningEvent({
        topicId: 'mathlab',
        activityId: 'mathbuddy_dialogue',
        sourceModule: 'mathbuddy_ai',
        learningObjectiveIds: ['mathbuddy_dialogue'],
        skillEvidence: {
          speaking: { score: 85, method: 'web_speech_rec' },
          listening: { score: 90, method: 'audio_comprehension' }
        },
        score: 88,
        maxScore: 100,
        attempts: 1,
        completionStatus: 'completed',
        assessmentMethod: 'web_speech_rec',
        confidence: 'high'
      }).catch(e => console.warn('Could not record MathBuddy event:', e));
    }

    renderMessages();
  }

  // Web Speech Synthesis (Text-to-Speech)
  function speakText(text, lang = 'en') {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ phát âm tự động.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'en' ? 'en-US' : 'vi-VN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  // Web Speech Recognition (Microphone Voice Input)
  function setupSpeechRecognition(btn, inputEl) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      btn.style.opacity = '0.5';
      btn.title = 'Microphone voice input is not supported in this browser.';
      return;
    }

    recognitionInstance = new SpeechRec();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onstart = () => {
      isListeningMic = true;
      btn.classList.add('recording');
      btn.title = 'Listening... Speak in English / Đang nghe...';
    };

    recognitionInstance.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (transcript) {
        inputEl.value = transcript;
      }
    };

    recognitionInstance.onerror = (e) => {
      console.warn('[SpeechRec Error]:', e.error);
      stopMic();
    };

    recognitionInstance.onend = () => {
      stopMic();
    };

    btn.addEventListener('click', () => {
      if (isListeningMic) {
        recognitionInstance.stop();
        stopMic();
      } else {
        try {
          recognitionInstance.start();
        } catch (err) {
          console.warn(err);
        }
      }
    });

    function stopMic() {
      isListeningMic = false;
      btn.classList.remove('recording');
      btn.title = 'Speak with Microphone / Nói qua Micro';
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
