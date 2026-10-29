import { HECTARE_KM2_LESSON_DATA } from '../data/lessonsData.js';
import {
  analyzeExerciseImage,
  saveLearningMaterial,
  uploadAdminAsset,
  fetchLessonMaterialByUnit,
  generateVocabWithAi,
  generateStructureWithAi
} from '../services/firebaseAuth.js';

export function renderLessonPlayerContainer(targetOrOptions, options = {}) {
  let container = null;
  let opts = {};

  if (targetOrOptions && targetOrOptions instanceof HTMLElement) {
    container = targetOrOptions;
    opts = options || {};
  } else {
    opts = targetOrOptions || {};
    container = document.createElement('div');
    container.className = 'stage-scroll lesson-stage-wrapper';
  }

  // Deep clone initial lesson data to allow live editing in memory
  let lesson = JSON.parse(JSON.stringify(opts.lesson || opts.lessonData || HECTARE_KM2_LESSON_DATA));
  const currentUserProfile = opts.currentUserProfile || null;
  const onBack = opts.onBack || (() => {});
  const onSaveProgress = opts.onSaveProgress || opts.saveStudentProgress;

  // Check Admin / Teacher authorization
  const isTeacher = Boolean(
    currentUserProfile && (
      currentUserProfile.isAdmin ||
      currentUserProfile.isTeacher ||
      currentUserProfile.role === 'admin' ||
      currentUserProfile.role === 'teacher'
    )
  );

  let isEditMode = false; // Admin/Teacher edit mode toggle
  let activeTab = 'explore';
  let visitedTabs = new Set(['explore']);
  let practiceScores = {}; // questionId => { isCorrect, attempts, userChoice }
  let selectedAccent = 'UK'; // UK vs US accent toggle
  let vocabRecordedScores = {}; // vocabId => { score, feedback, status, audioUrl, transcript }

  // Student voice recording state
  let mediaRecorder = null;
  let audioChunks = [];
  let recordingVocabId = null;
  let speechRecognizer = null;

  // AI Vocabulary Drawer / Modal state
  let isAiVocabModalOpen = false;
  let aiVocabPrompt = 'hectare, square kilometre, square metre, land area, convert';
  let aiVocabInstruction = 'Dành cho học sinh tiểu học lớp 5, ví dụ gắn với các danh thắng Việt Nam, giải thích ngắn gọn, phiên âm IPA chuẩn UK/US.';
  let aiVocabLoading = false;
  let aiVocabResults = null;
  let selectedAiVocabIds = new Set();

  // AI Structure Drawer / Modal state
  let isAiStructureModalOpen = false;
  let aiStructurePrompt = 'Mẫu câu diễn đạt diện tích khu đất bằng héc-ta và ki-lô-mét vuông, kèm câu hỏi diện tích';
  let aiStructureLoading = false;
  let aiStructureResults = null;
  let selectedAiStructureIds = new Set();

  // Interactive Task state management
  let matchingSelectedLeft = {}; // qIdx => leftPairIndex
  let matchingUserPairs = {}; // qIdx => { leftIndex: rightIndex }
  let matchingChecked = {}; // qIdx => boolean
  let fillAnswers = {}; // qIdx => { itemId: value }
  let fillChecked = {}; // qIdx => boolean
  let areaSelectedLand = {}; // qIdx => landId
  let areaChecked = {}; // qIdx => boolean

  // Interactive Sentence Constructor state (Structure Tab)
  let sentenceConstructorState = {
    objectEn: 'Cuc Phuong Forest',
    objectVi: 'Khu rừng Cúc Phương',
    number: '950',
    unitEn: 'square kilometres',
    unitVi: 'ki-lô-mét vuông'
  };

  // AI Exercise Studio state (Practice Tab for Admin/Teacher)
  let studioState = {
    isOpen: false,
    currentStep: 1, // 1: Upload, 2: Analyze, 3: Review & Edit, 4: Preview, 5: Save
    uploadedImages: [],
    analysisProgressStep: 0,
    analysisProgressMsg: '',
    extractedResult: null,
    teacherPromptInstruction: ''
  };

  // Hydrate lesson data from server on startup
  let hasHydrated = false;
  async function hydrateLessonFromServer() {
    if (hasHydrated) return;
    try {
      const serverMaterial = await fetchLessonMaterialByUnit(lesson.unitId || 'ha-km2');
      if (serverMaterial) {
        if (serverMaterial.titleEn) lesson.titleEn = serverMaterial.titleEn;
        if (serverMaterial.titleVi) lesson.titleVi = serverMaterial.titleVi;
        if (serverMaterial.explore) lesson.explore = serverMaterial.explore;
        if (Array.isArray(serverMaterial.vocab) && serverMaterial.vocab.length > 0) {
          lesson.vocab = serverMaterial.vocab;
        }
        if (Array.isArray(serverMaterial.structures) && serverMaterial.structures.length > 0) {
          lesson.structures = serverMaterial.structures;
        } else if (serverMaterial.structure) {
          lesson.structures = Array.isArray(serverMaterial.structure) ? serverMaterial.structure : [serverMaterial.structure];
        }
        if (Array.isArray(serverMaterial.practice) && serverMaterial.practice.length > 0) {
          lesson.practice = serverMaterial.practice;
        }
        lesson.status = serverMaterial.status || 'published';
        hasHydrated = true;
        render();
      }
    } catch (err) {
      console.warn('Could not hydrate lesson from server:', err);
    }
  }

  function speakText(text, accent = selectedAccent) {
    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = accent === 'US' ? 'en-US' : 'en-GB';
        u.rate = 0.88;

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const matchedVoice = voices.find(v => {
            if (accent === 'US') {
              return v.lang === 'en-US' || v.name.includes('United States') || v.name.includes('US');
            } else {
              return v.lang === 'en-GB' || v.name.includes('United Kingdom') || v.name.includes('UK') || v.name.includes('British');
            }
          }) || voices.find(v => v.lang.startsWith('en'));
          if (matchedVoice) u.voice = matchedVoice;
        }

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (e) {
        console.warn('SpeechSynthesis error:', e);
      }
    }
  }

  function playAudio(audioUrl, fallbackText) {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => speakText(fallbackText));
    } else if (fallbackText) {
      speakText(fallbackText);
    }
  }

  async function handleSaveLesson(publishStatus = 'published') {
    try {
      const payload = {
        ...lesson,
        topicId: lesson.topicId || 'geometry-measurement',
        unitId: lesson.unitId || 'ha-km2',
        status: publishStatus,
        updatedAt: new Date().toISOString()
      };
      await saveLearningMaterial(payload);
      lesson.status = publishStatus;
      const msg = publishStatus === 'published' ? 'xuất bản bài học' : 'lưu bản nháp';
      alert(`🎉 Đã ${msg} thành công! Dữ liệu bài học đã được lưu vào hệ thống.`);
      render();
    } catch (err) {
      alert(`Lỗi lưu bài học: ${err.message}`);
    }
  }

  async function handleRevertLesson() {
    if (confirm('Bạn có chắc chắn muốn hủy các thay đổi chưa lưu và tải lại bài học từ hệ thống?')) {
      hasHydrated = false;
      await hydrateLessonFromServer();
      alert('🔄 Đã khôi phục dữ liệu bài học gốc!');
      render();
    }
  }

  function renderHeader() {
    const progressPercent = Math.round((visitedTabs.size / 4) * 100);
    const isDraft = lesson.status === 'draft';

    return `
      ${isTeacher ? `
        <!-- Admin / Teacher Edit Toolbar -->
        <div class="admin-edit-toolbar" style="display:flex;justify-content:space-between;align-items:center;padding:12px 18px;background:#051b44;border:1.5px solid #ffcc00;border-radius:16px;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:24px;">👑</span>
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-weight:900;color:#ffd65e;font-size:14px;">Chế độ Quản trị &amp; Giáo viên (Teacher Studio)</span>
                <span style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:6px;background:${isDraft ? '#fef3c7' : '#dcfce7'};color:${isDraft ? '#92400e' : '#15803d'};">
                  ${isDraft ? '📝 BẢN NHÁP (DRAFT)' : '🚀 ĐÃ XUẤT BẢN (PUBLISHED)'}
                </span>
              </div>
              <div style="font-size:12px;color:#a3c7f7;margin-top:2px;">
                ${isEditMode ? '✏️ Đang bật công cụ chỉnh sửa trực tiếp nội dung 4 tab' : '👁️ Đang hiển thị bản xem trước của học sinh'}
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <button type="button" class="action-btn ${isEditMode ? '' : 'primary'}" id="btn-toggle-edit-mode" style="font-size:13px;padding:8px 16px;">
              ${isEditMode ? '👁️ Student Preview / Xem như học sinh' : '✏️ Edit Lesson / Chỉnh sửa bài học'}
            </button>

            ${isEditMode ? `
              <button type="button" class="action-btn" id="btn-save-draft" style="font-size:13px;padding:8px 14px;background:#06235d;border-color:#3b82f6;color:#ffffff;">
                💾 Save Draft
              </button>
              <button type="button" class="action-btn primary" id="btn-publish-lesson" style="font-size:13px;padding:8px 14px;background:linear-gradient(135deg,#10b981,#059669);border-color:#10b981;color:#ffffff;">
                🚀 Publish
              </button>
              <button type="button" class="action-btn" id="btn-revert-changes" style="font-size:13px;padding:8px 14px;background:#1e293b;border-color:#475569;color:#cbd5e1;">
                🔄 Revert
              </button>
            ` : ''}
          </div>
        </div>
      ` : ''}

      ${(!opts.compactHeader && !opts.hideIdentityBanner) ? `
      <!-- Lesson Identity Banner -->
      <div class="lesson-identity-banner">
        <div class="banner-left">
          <button type="button" class="action-btn" id="btn-lesson-back-topic" aria-label="Quay lại thư viện chủ đề">
            ⬅️ Back to Topic / Quay lại chủ đề
          </button>
          <div style="margin-top:12px;">
            <div class="banner-kicker-row">
              <span class="banner-kicker-text">🚀 Math Adventure · Grade 5</span>
              <span class="banner-mission-badge">Area Mission · Đo lường diện tích</span>
            </div>
            <h1 class="banner-title-en">${escapeAttr(lesson.titleEn || 'Hectare. Kilometre.')}</h1>
            <div class="banner-title-vi">${escapeAttr(lesson.titleVi || 'Héc-ta. Ki-lô-mét vuông.')}</div>
          </div>
        </div>

        <div class="banner-right">
          <div class="banner-space-art">
            <span class="banner-planet-icon">🪐</span>
            <span class="banner-rocket-icon">🚀</span>
          </div>
          <div class="banner-progress-box">
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:800;color:#17365E;margin-bottom:6px;">
              <span>Tiến trình bài học</span>
              <span>${visitedTabs.size}/4 tab (${progressPercent}%)</span>
            </div>
            <div class="skill-bar-wrap" aria-label="Tiến trình hoàn thành bài học ${progressPercent}%">
              <div class="skill-bar-fill" style="width:${progressPercent}%;"></div>
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Four Lesson Tabs -->
      <div class="lesson-nav-tabs" role="tablist">
        <button type="button" class="lesson-tab-btn ${activeTab === 'explore' ? 'active' : ''}" data-tab="explore" role="tab" aria-selected="${activeTab === 'explore'}">
          🌎 Explore / Khám phá
        </button>
        <button type="button" class="lesson-tab-btn ${activeTab === 'vocab' ? 'active' : ''}" data-tab="vocab" role="tab" aria-selected="${activeTab === 'vocab'}">
          📚 Vocab / Từ vựng (${(lesson.vocab || []).length})
        </button>
        <button type="button" class="lesson-tab-btn ${activeTab === 'structure' ? 'active' : ''}" data-tab="structure" role="tab" aria-selected="${activeTab === 'structure'}">
          💬 Structure / Mẫu câu (${(lesson.structures || []).length})
        </button>
        <button type="button" class="lesson-tab-btn ${activeTab === 'practice' ? 'active' : ''}" data-tab="practice" role="tab" aria-selected="${activeTab === 'practice'}">
          🎮 Practice / Luyện tập (${(lesson.practice || []).length})
        </button>
      </div>
    `;
  }

  // --- EXPLORE TAB RENDERERS ---
  function renderExploreTab() {
    if (isEditMode && isTeacher) {
      return renderExploreEditor();
    }

    const exp = lesson.explore || {};
    const dialogues = exp.dialogues || [];
    const remember = exp.remember || {};
    const qq = exp.quickQuestion || null;

    const isDecimalFractions = lesson.unitId === 'decimal-fractions' || lesson.id === 'decimal-fractions-lesson';

    if (isDecimalFractions) {
      return `
        <div class="lesson-tab-content decimal-fractions-explore-wrapper">
          <div class="discovery-scene-card" style="background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%); border: 2px solid #7dd3fc; border-radius: 20px; padding: 24px; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(14, 165, 233, 0.15);">
            <div class="scene-header" style="text-align: center; margin-bottom: 20px;">
              <h2 class="scene-title" style="color: #0369a1; font-size: 26px; font-weight: 900; margin: 0 0 6px 0;">
                ${escapeAttr(exp.sceneTitle || 'Decimal Fractions Discovery! 🚀')}
              </h2>
              <div class="scene-subtitle" style="color: #0284c7; font-size: 16px; font-weight: 700;">
                ${escapeAttr(exp.sceneSubtitle || 'Khám phá các phân số thập phân và vị trí tô màu!')}
              </div>
            </div>

            <!-- Single Full-Width Illustration Container -->
            <div class="df-illustration-container" style="position: relative; width: 100%; border-radius: 16px; overflow: hidden; background: #ffffff; border: 2px solid #bae6fd; box-shadow: 0 8px 20px rgba(0,0,0,0.06); margin-bottom: 24px;">
              <img src="${escapeAttr(exp.mainImage || '/assets/decimal-fractions/decimal-fractions-explore.png')}"
                   alt="Decimal Fractions Explore Illustration"
                   style="width: 100%; height: auto; display: block; object-fit: contain;"
                   draggable="false" />
              ${exp.mainImageCaption ? `
                <div style="padding: 10px 16px; background: #f0f9ff; color: #0369a1; font-size: 13px; font-weight: 700; text-align: center; border-top: 1px solid #e0f2fe;">
                  ${escapeAttr(exp.mainImageCaption)}
                </div>
              ` : ''}
            </div>

            <!-- Interactive Dialogue Speaker Cards directly below the illustration -->
            <div class="df-dialogues-container" style="margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
                <h3 style="margin: 0; font-size: 18px; color: #0369a1; font-weight: 900; display: flex; align-items: center; gap: 8px;">
                  <span>🗣️</span> <span>Hội thoại khám phá bài học · Interactive Speaker Dialogues</span>
                </h3>
                <button type="button" class="action-btn" id="btn-listen-all-dialogue" style="font-size: 13px; padding: 8px 16px; background: #0284c7; color: #ffffff; border: none; border-radius: 10px; cursor: pointer; font-weight: 800; display: flex; align-items: center; gap: 6px;">
                  🔊 Nghe tất cả hội thoại (Play All)
                </button>
              </div>

              <div class="df-dialogues-grid" style="display: flex; flex-direction: column; gap: 14px;">
                ${dialogues.map((d, i) => `
                  <div class="speech-bubble-card" style="display: flex; align-items: center; gap: 16px; background: #ffffff; border: 2px solid #93c5fd; border-radius: 16px; padding: 16px 20px; box-shadow: 0 4px 12px rgba(147, 197, 253, 0.2); transition: transform 0.2s ease, box-shadow 0.2s ease;">
                    <div class="bubble-avatar" style="font-size: 32px; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #eff6ff; border-radius: 50%; border: 2px solid #60a5fa; flex-shrink: 0;">
                      ${d.avatar === 'robot' ? '🦊' : (i === 0 ? '🧑‍🚀' : '🎙️')}
                    </div>
                    <div class="bubble-content" style="flex: 1; min-width: 0;">
                      <div class="bubble-speaker" style="font-size: 13px; font-weight: 900; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                        ${escapeAttr(d.speaker || 'MathBuddy AI')}
                      </div>
                      <div class="bubble-text-en" style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 4px; line-height: 1.4;">
                        "${escapeAttr(d.en)}"
                      </div>
                      <div class="bubble-text-vi" style="font-size: 14px; font-weight: 600; color: #475569;">
                        ${escapeAttr(d.vi)}
                      </div>
                    </div>
                    <button type="button" class="action-btn primary" data-speak-dialogue="${i}" aria-label="Nghe lượt thoại ${i + 1}" style="flex-shrink: 0; padding: 10px 18px; font-size: 14px; font-weight: 800; border-radius: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                      🔊 Listen
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Quick Understanding Check Section directly below image and dialogues -->
            ${qq ? `
              <div class="quick-question-card" style="background: #ffffff; border: 2px solid #38bdf8; border-radius: 16px; padding: 20px; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.15);">
                <div class="qq-badge" style="display: inline-block; background: #e0f2fe; color: #0369a1; font-weight: 900; font-size: 13px; padding: 4px 12px; border-radius: 8px; margin-bottom: 12px;">
                  ❓ Câu hỏi kiểm tra nhanh · Quick Check
                </div>
                <div class="qq-question-en" style="font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 4px;">
                  ${escapeAttr(qq.questionEn)}
                </div>
                <div class="qq-question-vi" style="font-size: 14px; color: #475569; margin-bottom: 16px; font-weight: 600;">
                  ${escapeAttr(qq.questionVi)}
                </div>
                <div class="choice-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-top: 12px;">
                  ${(qq.choices || []).map((c, i) => `
                    <button type="button" class="choice-btn" data-qq-choice="${i}" style="padding: 12px 16px; font-size: 16px; font-weight: 900; border-radius: 12px; border: 2px solid #bae6fd; background: #f0f9ff; color: #0369a1; cursor: pointer; transition: all 0.15s ease;">
                      ${escapeAttr(c)}
                    </button>
                  `).join('')}
                </div>
                <div id="qq-feedback" class="answer-feedback" aria-live="polite"></div>
              </div>
            ` : ''}
          </div>

          <div class="mission-progress-strip">
            <div class="strip-info">
              <span class="strip-rocket">🚀</span>
              <div>
                <div class="strip-title">Nhiệm vụ 1: Khám phá khái niệm Phân số thập phân</div>
                <div class="strip-desc">Bạn đã khám phá xong khái niệm! Hãy nhấn để tiếp tục sang phần Từ vựng.</div>
              </div>
            </div>

            <button type="button" class="action-btn primary" id="btn-continue-journey" style="padding:12px 24px;font-size:15px;font-weight:900;">
              Tiếp tục hành trình ➔
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="lesson-tab-content">
        <div class="discovery-scene-card">
          <div class="scene-header">
            <h2 class="scene-title">${escapeAttr(exp.sceneTitle || 'Discover the area of Vietnam! 🚀')}</h2>
            <div class="scene-subtitle">${escapeAttr(exp.sceneSubtitle || 'Khám phá diện tích Việt Nam và các địa danh nổi tiếng!')}</div>
          </div>

          <div class="explore-split-layout">
            <div class="explore-main-col">
              ${exp.mainImage ? `
                <div class="explore-image-card">
                  <img src="${escapeAttr(exp.mainImage)}" alt="Chủ đề đo lường diện tích thực tế" draggable="false" />
                  <div class="explore-image-caption">
                    ${escapeAttr(exp.mainImageCaption || '📍 Real-World Context: Cuc Phuong Forest (224 km²), Moc Chau Tea Farm (15 ha) & Vietnam Land Area (331,212 km²)')}
                  </div>
                </div>
              ` : ''}

              <div class="explore-dialogue-list">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
                  <h3 style="margin:0;font-size:18px;color:#17365E;font-weight:900;">
                    🗣️ Tình huống khám phá bài học · Exploration Dialogue
                  </h3>
                  <button type="button" class="action-btn" id="btn-listen-all-dialogue" style="font-size:12px;padding:6px 14px;">
                    🔊 Nghe toàn bộ hội thoại
                  </button>
                </div>

                ${dialogues.map((d, i) => `
                  <div class="speech-bubble-card">
                    <div class="bubble-avatar">
                      ${d.avatar === 'robot' ? '🤖' : '👩‍🚀'}
                    </div>
                    <div class="bubble-content">
                      <div class="bubble-speaker">${escapeAttr(d.speaker || 'MathBuddy AI')}</div>
                      <div class="bubble-text-en">${escapeAttr(d.en)}</div>
                      <div class="bubble-text-vi">${escapeAttr(d.vi)}</div>
                    </div>
                    <button type="button" class="btn-mini" data-speak-dialogue="${i}" aria-label="Nghe lượt thoại ${i + 1}">
                      🔊 Listen
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="explore-side-col">
              ${remember.items ? `
                <div class="remember-card">
                  <h3 class="remember-title">${escapeAttr(remember.title || '💡 Core Formulas & Facts / Ghi nhớ trọng tâm')}</h3>
                  <ul class="remember-list">
                    ${remember.items.map(item => `
                      <li>
                        <strong class="rem-title-badge ${escapeAttr(item.badgeClass || 'km2')}">${escapeAttr(item.title)}</strong>
                        <span class="rem-en">${escapeAttr(item.en)}</span>
                        <span class="rem-vi">${escapeAttr(item.vi)}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}

              ${qq ? `
                <div class="quick-question-card">
                  <div class="qq-badge">❓ Câu hỏi khám phá nhanh · Quick Check</div>
                  <div class="qq-question-en">${escapeAttr(qq.questionEn)}</div>
                  <div class="qq-question-vi">${escapeAttr(qq.questionVi)}</div>
                  <div class="choice-grid" style="margin-top:12px;">
                    ${(qq.choices || []).map((c, i) => `
                      <button type="button" class="choice-btn" data-qq-choice="${i}">${escapeAttr(c)}</button>
                    `).join('')}
                  </div>
                  <div id="qq-feedback" class="answer-feedback" aria-live="polite"></div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="mission-progress-strip">
          <div class="strip-info">
            <span class="strip-rocket">🚀</span>
            <div>
              <div class="strip-title">Nhiệm vụ 1: Khám phá đơn vị đo Hectare và Square Kilometre</div>
              <div class="strip-desc">Bạn đã khám phá xong khái niệm! Hãy nhấn để tiếp tục sang phần Từ vựng.</div>
            </div>
          </div>

          <button type="button" class="action-btn primary" id="btn-continue-journey" style="padding:12px 24px;font-size:15px;font-weight:900;">
            Tiếp tục hành trình ➔
          </button>
        </div>
      </div>
    `;
  }

  function renderExploreEditor() {
    const exp = lesson.explore || {};
    const dialogues = exp.dialogues || [];
    const remember = exp.remember || { items: [] };
    const qq = exp.quickQuestion || { choices: ['', '', '', ''] };

    return `
      <div class="lesson-tab-content" style="background:#F4F8FF;border:2px solid #3b82f6;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #D0E2FF;">
          <div>
            <h3 style="margin:0;color:#1D6ED8;font-size:20px;font-weight:900;">
              🛠️ Chỉnh sửa tab Khám phá (Explore Editor)
            </h3>
            <div style="font-size:13px;color:#526985;margin-top:2px;">
              Quản lý ảnh minh họa chính, danh sách hội thoại nhân vật, bảng ghi nhớ và câu hỏi tương tác nhanh.
            </div>
          </div>
          <button type="button" class="action-btn primary" id="btn-exp-save-quick">💾 Lưu thay đổi Explore</button>
        </div>

        <div style="background:#FFFFFF;padding:18px;border-radius:16px;border:1.5px solid #C2DCFF;margin-bottom:20px;">
          <h4 style="margin:0 0 12px;color:#17365E;font-size:16px;font-weight:900;">1. 📸 Quản lý ảnh minh họa chính (Main Scenario Image)</h4>
          <div style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap;">
            <div style="width:200px;height:140px;background:#EBF5FF;border-radius:12px;overflow:hidden;border:1.5px solid #94A3B8;display:flex;align-items:center;justify-content:center;">
              ${exp.mainImage ? `<img src="${escapeAttr(exp.mainImage)}" style="width:100%;height:100%;object-fit:cover;" alt="Scenario Image" />` : `<span style="color:#64748B;font-size:12px;">Chưa có ảnh</span>`}
            </div>
            <div style="flex:1;min-width:280px;display:flex;flex-direction:column;gap:10px;">
              <div>
                <label style="font-size:12px;font-weight:800;color:#17365E;">Tải ảnh mới từ máy tính (Upload Asset):</label>
                <input type="file" id="exp-file-main-img" accept="image/*" class="auth-input" style="font-size:12px;padding:6px;" />
              </div>
              <div>
                <label style="font-size:12px;font-weight:800;color:#17365E;">Hoặc nhập URL hình ảnh:</label>
                <input type="text" class="auth-input" id="exp-input-main-img" value="${escapeAttr(exp.mainImage || '')}" placeholder="https://..." />
              </div>
              <div>
                <label style="font-size:12px;font-weight:800;color:#17365E;">Chú thích ảnh (Caption):</label>
                <input type="text" class="auth-input" id="exp-input-main-caption" value="${escapeAttr(exp.mainImageCaption || '')}" placeholder="Chú thích ngữ cảnh..." />
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:2px;">
                <span style="font-size:11px;font-weight:700;color:#526985;">Gợi ý ảnh chuẩn:</span>
                <button type="button" class="btn-mini" data-exp-preset-img="/assets/topics-library/geometry-measurement/geometry-measurement-bg.png">🌲 Rừng Cúc Phương (224 km²)</button>
                <button type="button" class="btn-mini" data-exp-preset-img="/assets/topics-library/geometry-measurement/ha-km2-button.png">🍵 Đồi chè Mộc Châu (15 ha)</button>
                <button type="button" class="btn-mini" id="btn-exp-reset-img">🔄 Reset ảnh gốc Canva</button>
              </div>
            </div>
          </div>
        </div>

        <div style="background:#FFFFFF;padding:18px;border-radius:16px;border:1.5px solid #C2DCFF;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h4 style="margin:0;color:#17365E;font-size:16px;font-weight:900;">2. 🗣️ Lời thoại nhân vật khám phá (${dialogues.length} câu)</h4>
            <button type="button" class="btn-mini primary" id="btn-add-dialogue-line">➕ Thêm lượt thoại</button>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px;">
            ${dialogues.map((d, i) => `
              <div style="background:#F8FAFE;padding:14px;border-radius:12px;border:1px solid #D5E5FC;display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-weight:800;color:#7054D8;font-size:13px;">Lượt thoại ${i + 1}</span>
                    <select class="auth-input" data-exp-d-avatar="${i}" style="padding:4px 8px;font-size:12px;width:auto;">
                      <option value="astronaut" ${d.avatar === 'astronaut' ? 'selected' : ''}>👩‍🚀 Astronaut (Phi hành gia)</option>
                      <option value="robot" ${d.avatar === 'robot' ? 'selected' : ''}>🤖 Robot (MathBuddy AI)</option>
                      <option value="teacher" ${d.avatar === 'teacher' ? 'selected' : ''}>👩‍🏫 Teacher (Giáo viên)</option>
                      <option value="student" ${d.avatar === 'student' ? 'selected' : ''}>🧑‍🎓 Student (Học sinh)</option>
                    </select>
                    <input type="text" class="auth-input" data-exp-d-speaker="${i}" value="${escapeAttr(d.speaker || '')}" placeholder="Tên nhân vật..." style="padding:4px 8px;font-size:12px;width:140px;" />
                  </div>

                  <div style="display:flex;gap:6px;">
                    <button type="button" class="btn-mini" data-exp-d-listen="${i}">🔊 Nghe thử</button>
                    <button type="button" class="btn-mini" data-exp-d-up="${i}">⬆️ Up</button>
                    <button type="button" class="btn-mini" data-exp-d-down="${i}">⬇️ Down</button>
                    <button type="button" class="btn-mini danger" data-exp-d-del="${i}">🗑️ Xóa</button>
                  </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                  <div>
                    <label style="font-size:11px;color:#526985;font-weight:700;">Lời thoại Tiếng Anh:</label>
                    <input type="text" class="auth-input" data-exp-d-en="${i}" value="${escapeAttr(d.en)}" placeholder="English dialogue..." />
                  </div>
                  <div>
                    <label style="font-size:11px;color:#526985;font-weight:700;">Dịch nghĩa Tiếng Việt:</label>
                    <input type="text" class="auth-input" data-exp-d-vi="${i}" value="${escapeAttr(d.vi)}" placeholder="Lời dịch tiếng Việt..." />
                  </div>
                </div>

                <div>
                  <label style="font-size:11px;color:#526985;font-weight:700;">File âm thanh lượt thoại (URL / Tùy chọn):</label>
                  <input type="text" class="auth-input" data-exp-d-audio="${i}" value="${escapeAttr(d.audioUrl || '')}" placeholder="Mặc định dùng tổng hợp giọng AI..." style="font-size:11px;padding:4px 8px;" />
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="background:#FFFFFF;padding:18px;border-radius:16px;border:1.5px solid #C2DCFF;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h4 style="margin:0;color:#17365E;font-size:16px;font-weight:900;">3. 💡 Khung ghi nhớ trọng tâm (Remember Box)</h4>
            <button type="button" class="btn-mini primary" id="btn-add-remember-item">➕ Thêm mục ghi nhớ</button>
          </div>

          <div style="margin-bottom:10px;">
            <label style="font-size:12px;font-weight:800;color:#17365E;">Tiêu đề hộp ghi nhớ:</label>
            <input type="text" class="auth-input" id="exp-remember-title" value="${escapeAttr(remember.title || '💡 Core Formulas & Facts / Ghi nhớ trọng tâm')}" />
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;">
            ${(remember.items || []).map((item, idx) => `
              <div style="background:#F0FDF4;padding:12px;border-radius:10px;border:1px solid #38C882;display:grid;grid-template-columns:120px 1fr 1fr 40px;gap:8px;align-items:center;">
                <input type="text" class="auth-input" data-exp-rem-title="${idx}" value="${escapeAttr(item.title)}" placeholder="Tên thẻ..." style="font-size:12px;padding:6px;" />
                <input type="text" class="auth-input" data-exp-rem-en="${idx}" value="${escapeAttr(item.en)}" placeholder="Công thức EN..." style="font-size:12px;padding:6px;" />
                <input type="text" class="auth-input" data-exp-rem-vi="${idx}" value="${escapeAttr(item.vi)}" placeholder="Diễn giải VI..." style="font-size:12px;padding:6px;" />
                <button type="button" class="btn-mini danger" data-exp-rem-del="${idx}" style="padding:4px 8px;">✕</button>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="background:#FFFFFF;padding:18px;border-radius:16px;border:1.5px solid #C2DCFF;">
          <h4 style="margin:0 0 12px;color:#17365E;font-size:16px;font-weight:900;">4. ❓ Câu hỏi kiểm tra nhanh (Quick Check Question)</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:#526985;">Câu hỏi (English):</label>
              <input type="text" class="auth-input" id="exp-qq-en" value="${escapeAttr(qq.questionEn || '')}" />
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#526985;">Câu hỏi (Tiếng Việt):</label>
              <input type="text" class="auth-input" id="exp-qq-vi" value="${escapeAttr(qq.questionVi || '')}" />
            </div>
          </div>

          <div style="margin-bottom:10px;">
            <label style="font-size:11px;font-weight:700;color:#526985;">4 Lựa chọn đáp án (Đánh dấu đáp án đúng):</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
              ${(qq.choices || ['', '', '', '']).map((c, ci) => `
                <div style="display:flex;align-items:center;gap:6px;">
                  <input type="radio" name="exp-qq-correct" value="${ci}" ${qq.correctIndex === ci ? 'checked' : ''} />
                  <input type="text" class="auth-input" data-exp-qq-choice="${ci}" value="${escapeAttr(c)}" placeholder="Đáp án ${ci + 1}..." style="font-size:12px;padding:6px;" />
                </div>
              `).join('')}
            </div>
          </div>

          <div>
            <label style="font-size:11px;font-weight:700;color:#526985;">Lời giải chi tiết:</label>
            <input type="text" class="auth-input" id="exp-qq-exp" value="${escapeAttr(qq.explanationVi || qq.explanationEn || '')}" placeholder="Giải thích cho học sinh..." />
          </div>
        </div>
      </div>
    `;
  }

  // --- VOCAB TAB RENDERERS ---
  function renderVocabTab() {
    if (isEditMode && isTeacher) {
      return renderVocabEditor();
    }

    const vocabList = lesson.vocab || [];
    const masteredCount = Object.keys(vocabRecordedScores).filter(k => vocabRecordedScores[k]?.audioUrl).length;

    return `
      <div class="lesson-tab-content">
        <div class="vocab-header-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div>
              <div class="vocab-kicker">Vocab · Từ vựng</div>
              <h2 class="vocab-main-heading">Listen, record and practise! 🎧</h2>
              <p style="margin:4px 0 0;color:#526985;font-size:14px;font-weight:600;">
                IPA UK/US · Nghĩa tiếng Việt · Ghi âm trực tiếp và nghe lại giọng nói của bạn.
              </p>
            </div>

            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
              <div class="accent-toggle-bar">
                <span style="font-size:12px;color:#17365E;font-weight:800;">Giọng đọc:</span>
                <button type="button" class="btn-mini ${selectedAccent === 'UK' ? 'primary' : ''}" id="btn-accent-uk">
                  🇬🇧 UK Accent
                </button>
                <button type="button" class="btn-mini ${selectedAccent === 'US' ? 'primary' : ''}" id="btn-accent-us">
                  🇺🇸 US Accent
                </button>
              </div>

              <div class="vocab-proficiency-badge">
                🎯 Đã ghi âm: <strong>${masteredCount}/${vocabList.length} từ</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="vocab-grid-3col" style="margin-top:20px;">
          ${vocabList.map((v, i) => {
            const aiScoreData = vocabRecordedScores[v.id] || { status: 'ready' };
            const isRecording = recordingVocabId === v.id;
            const currentIpa = selectedAccent === 'US' && v.ipaUs ? v.ipaUs : (v.ipa || v.ipaUk || '');
            const cardAccentClass = i % 3 === 0 ? 'accent-blue' : (i % 3 === 1 ? 'accent-mint' : 'accent-yellow');

            return `
              <div class="vocab-card ${cardAccentClass}" id="vocab-card-${v.id}">
                ${v.imageUrl ? `
                  <div class="vocab-card-img">
                    <img src="${escapeAttr(v.imageUrl)}" alt="${escapeAttr(v.en)}" draggable="false" />
                  </div>
                ` : `
                  <div class="vocab-card-img placeholder-img">
                    <span style="font-size:36px;">📐</span>
                  </div>
                `}

                <div class="vocab-card-body">
                  <div>
                    <h3 class="vocab-en">${escapeAttr(v.en)}</h3>
                    <div class="vocab-ipa-badge">
                      <span style="font-size:10px;opacity:0.75;margin-right:3px;">${selectedAccent}:</span>
                      ${escapeAttr(currentIpa)}
                    </div>
                    <div class="vocab-vi">${escapeAttr(v.vi)}</div>
                  </div>

                  ${v.exampleEn ? `
                    <div class="vocab-example-box">
                      <div class="vocab-example-en">"${escapeAttr(v.exampleEn)}"</div>
                      <div class="vocab-example-vi">${escapeAttr(v.exampleVi || '')}</div>
                    </div>
                  ` : ''}

                  <div class="vocab-card-actions">
                    <button type="button" class="action-btn" data-listen-vocab="${i}">
                      🔊 Listen (${selectedAccent})
                    </button>
                    ${isRecording ? `
                      <button type="button" class="action-btn danger" id="btn-stop-record-vocab" style="background:#dc2626;border-color:#b91c1c;color:#ffffff;animation:pulse 1.5s infinite;">
                        ⏹️ Dừng ghi âm (Stop)
                      </button>
                    ` : `
                      <button type="button" class="action-btn primary" data-record-vocab="${i}">
                        🎙️ Record &amp; Speak
                      </button>
                    `}
                  </div>

                  <div class="vocab-ai-score-row" id="ai-score-row-${v.id}">
                    ${isRecording ? `
                      <div style="background:#fee2e2;color:#991b1b;border:1px solid #f87171;padding:8px 12px;border-radius:10px;font-size:12px;display:flex;align-items:center;gap:6px;">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;animation:pulse 1s infinite;"></span>
                        <span>Đang ghi âm giọng đọc của bạn... Nhấn "Dừng ghi âm" khi nói xong!</span>
                      </div>
                    ` : aiScoreData.status === 'recorded' ? `
                      <div class="ai-score-result-box" style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px;padding:10px 14px;margin-top:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                          <span style="font-size:12px;font-weight:800;color:#1e293b;">🎧 Bản ghi âm của bạn:</span>
                          <span style="font-size:11px;color:#15803d;background:#dcfce7;padding:2px 8px;border-radius:6px;font-weight:700;">Đã lưu</span>
                        </div>
                        <audio controls src="${escapeAttr(aiScoreData.audioUrl)}" style="width:100%;height:32px;margin-bottom:6px;"></audio>
                        ${aiScoreData.transcript ? `
                          <div style="font-size:12px;color:#1e3a8a;background:#eff6ff;padding:4px 8px;border-radius:6px;margin-bottom:4px;">
                            🗣️ Bạn đã đọc: <strong>"${escapeAttr(aiScoreData.transcript)}"</strong>
                          </div>
                        ` : ''}
                        <div style="font-size:11px;color:#6b7280;background:#f1f5f9;padding:6px 8px;border-radius:6px;display:flex;align-items:center;gap:6px;">
                          <span>ℹ️</span>
                          <span>Pronunciation assessment is not configured yet / Chưa cấu hình dịch vụ đánh giá phát âm.</span>
                        </div>
                      </div>
                    ` : `
                      <span class="ai-status-badge ready">✨ Sẵn sàng ghi âm luyện đọc</span>
                    `}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderVocabEditor() {
    const vocabList = lesson.vocab || [];

    return `
      <div class="lesson-tab-content" style="background:#F4F8FF;border:2px solid #3b82f6;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #D0E2FF;flex-wrap:wrap;gap:12px;">
          <div>
            <h3 style="margin:0;color:#1D6ED8;font-size:20px;font-weight:900;">
              📚 Chỉnh sửa từ vựng (Vocab Editor — ${vocabList.length} từ)
            </h3>
            <div style="font-size:13px;color:#526985;margin-top:2px;">
              Quản lý thẻ từ vựng, tự động sinh từ vựng bằng AI Gemini, phiên âm UK/US, và file âm thanh.
            </div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="action-btn primary" id="btn-open-ai-vocab-builder" style="background:linear-gradient(135deg,#7054D8,#4F46E5);border-color:#7054D8;color:#ffffff;font-size:13px;padding:8px 16px;">
              ✨ AI Sinh từ vựng (AI Vocab Builder)
            </button>
            <button type="button" class="btn-mini primary" id="btn-add-vocab-item" style="padding:8px 16px;font-size:13px;">
              ➕ Thêm từ vựng mới
            </button>
            <button type="button" class="action-btn primary" id="btn-vocab-save-quick">
              💾 Lưu Vocab
            </button>
          </div>
        </div>

        ${isAiVocabModalOpen ? `
          <!-- AI Vocabulary Builder Drawer / Panel -->
          <div class="ai-builder-drawer" style="background:#FFFFFF;border:2px solid #7054D8;border-radius:18px;padding:20px;margin-bottom:24px;box-shadow:0 8px 24px rgba(112,84,216,0.15);">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #E0E7FF;padding-bottom:12px;margin-bottom:16px;">
              <div>
                <h4 style="margin:0;color:#4338CA;font-size:17px;font-weight:900;">
                  ✨ AI Vocabulary Builder — Sinh thẻ từ vựng thông minh cho học sinh lớp 5
                </h4>
                <div style="font-size:12px;color:#6B7280;margin-top:2px;">
                  Nhập danh sách từ hoặc chủ đề, AI sẽ tạo phiên âm chuẩn UK/US, nghĩa tiếng Việt, câu ví dụ và gợi ý tranh.
                </div>
              </div>
              <button type="button" class="btn-mini danger" id="btn-close-ai-vocab">✕ Đóng</button>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
              <div>
                <label style="font-size:12px;font-weight:800;color:#17365E;">Nhập danh sách từ hoặc chủ đề cần sinh:</label>
                <textarea class="auth-input" id="ai-vocab-input-prompt" rows="3" style="font-size:13px;resize:vertical;" placeholder="Ví dụ: hectare, square kilometre, square metre, land area, convert...">${escapeAttr(aiVocabPrompt)}</textarea>
              </div>
              <div>
                <label style="font-size:12px;font-weight:800;color:#17365E;">Yêu cầu sư phạm bổ sung (Instruction):</label>
                <textarea class="auth-input" id="ai-vocab-input-instr" rows="3" style="font-size:13px;resize:vertical;" placeholder="Ví dụ: Dành cho học sinh lớp 5, ví dụ gắn với các địa danh Việt Nam...">${escapeAttr(aiVocabInstruction)}</textarea>
              </div>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:16px;">
              <button type="button" class="action-btn primary" id="btn-run-ai-vocab" style="background:linear-gradient(135deg,#6366F1,#4F46E5);color:#fff;" ${aiVocabLoading ? 'disabled' : ''}>
                ${aiVocabLoading ? '⏳ AI đang xử lý...' : '🚀 Tạo thẻ từ vựng với Gemini AI'}
              </button>
            </div>

            ${aiVocabLoading ? `
              <div style="padding:24px;text-align:center;background:#F5F3FF;border-radius:12px;border:1px dashed #A5B4FC;">
                <div style="font-size:28px;margin-bottom:8px;animation:spin 2s linear infinite;">🪐</div>
                <div style="font-weight:800;color:#4338CA;font-size:14px;">Gemini AI đang thiết kế các thẻ từ vựng chuẩn tiểu học...</div>
                <div style="font-size:12px;color:#6B7280;margin-top:4px;">Đang tạo phiên âm IPA UK/US, dịch nghĩa và câu ví dụ ngữ cảnh.</div>
              </div>
            ` : ''}

            ${aiVocabResults && Array.isArray(aiVocabResults) ? `
              <div style="margin-top:16px;border-top:1.5px solid #E0E7FF;padding-top:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                  <span style="font-weight:900;color:#1E1B4B;font-size:14px;">
                    🎉 Kết quả AI đề xuất (${aiVocabResults.length} từ vựng):
                  </span>
                  <button type="button" class="action-btn primary" id="btn-insert-selected-ai-vocab" style="background:#10B981;border-color:#10B981;color:#fff;font-size:13px;padding:6px 16px;">
                    📥 Chèn các từ đã chọn vào bài học (${selectedAiVocabIds.size} từ)
                  </button>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px;">
                  ${aiVocabResults.map((w, wIdx) => `
                    <div style="background:#F5F3FF;border:1.5px solid #C7D2FE;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:6px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;">
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                          <input type="checkbox" data-ai-vocab-check="${w.id}" ${selectedAiVocabIds.has(w.id) ? 'checked' : ''} />
                          <strong style="font-size:15px;color:#1E1B4B;">${escapeAttr(w.en)}</strong>
                        </label>
                        <span style="font-size:12px;color:#4F46E5;font-weight:700;">${escapeAttr(w.ipaUk || w.ipa)}</span>
                      </div>
                      <div style="font-size:13px;color:#059669;font-weight:800;">${escapeAttr(w.vi)}</div>
                      <div style="font-size:12px;color:#4B5563;background:#FFFFFF;padding:6px 8px;border-radius:6px;border:1px solid #E5E7EB;">
                        <em>"${escapeAttr(w.exampleEn)}"</em>
                        <div style="color:#6B7280;margin-top:2px;">${escapeAttr(w.exampleVi || '')}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div style="display:flex;flex-direction:column;gap:16px;">
          ${vocabList.map((v, i) => `
            <div style="background:#FFFFFF;padding:18px;border-radius:16px;border:1.5px solid #C2DCFF;display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;border-bottom:1px solid #EBF5FF;padding-bottom:10px;">
                <span style="font-weight:900;color:#17365E;font-size:15px;">#${i + 1}. Từ vựng: "${escapeAttr(v.en)}"</span>

                <div style="display:flex;gap:6px;align-items:center;">
                  <button type="button" class="btn-mini" data-vocab-listen-test="${i}">🔊 Nghe thử</button>
                  <button type="button" class="btn-mini" data-vocab-up="${i}">⬆️ Up</button>
                  <button type="button" class="btn-mini" data-vocab-down="${i}">⬇️ Down</button>
                  <button type="button" class="btn-mini danger" data-vocab-del="${i}">🗑️ Xóa từ</button>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;">
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Từ tiếng Anh (Word EN):</label>
                  <input type="text" class="auth-input" data-v-en="${i}" value="${escapeAttr(v.en)}" placeholder="Ví dụ: Hectare" />
                </div>
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Phiên âm UK (IPA):</label>
                  <input type="text" class="auth-input" data-v-ipauk="${i}" value="${escapeAttr(v.ipaUk || v.ipa || '')}" placeholder="/ˈhek.teər/" />
                </div>
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Phiên âm US (IPA):</label>
                  <input type="text" class="auth-input" data-v-ipaus="${i}" value="${escapeAttr(v.ipaUs || v.ipa || '')}" placeholder="/ˈhek.ter/" />
                </div>
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Nghĩa Tiếng Việt:</label>
                  <input type="text" class="auth-input" data-v-vi="${i}" value="${escapeAttr(v.vi)}" placeholder="Ví dụ: Héc-ta" />
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Câu ví dụ Tiếng Anh (Example EN):</label>
                  <input type="text" class="auth-input" data-v-exen="${i}" value="${escapeAttr(v.exampleEn || '')}" placeholder="The tea farm in Moc Chau covers 15 hectares..." />
                </div>
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Dịch nghĩa ví dụ (Example VI):</label>
                  <input type="text" class="auth-input" data-v-exvi="${i}" value="${escapeAttr(v.exampleVi || '')}" placeholder="Đồi chè ở Mộc Châu rộng 15 héc-ta..." />
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start;">
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Ảnh minh họa từ vựng (Upload hoặc URL):</label>
                  <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
                    <input type="file" data-v-file-img="${i}" accept="image/*" class="auth-input" style="font-size:11px;padding:4px;flex:1;" />
                    <input type="text" class="auth-input" data-v-url-img="${i}" value="${escapeAttr(v.imageUrl || '')}" placeholder="URL ảnh..." style="font-size:12px;flex:1;" />
                  </div>
                  <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;">
                    <button type="button" class="btn-mini" data-v-preset-img="${i}" data-preset-url="/assets/topics-library/geometry-measurement/ha-km2-button.png">🍵 Đồi chè</button>
                    <button type="button" class="btn-mini" data-v-preset-img="${i}" data-preset-url="/assets/topics-library/geometry-measurement/geometry-measurement-bg.png">🌲 Rừng Cúc Phương</button>
                  </div>
                </div>

                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Tệp âm thanh giáo viên (Audio URL / Tùy chọn):</label>
                  <input type="text" class="auth-input" data-v-audio="${i}" value="${escapeAttr(v.audioUrl || '')}" placeholder="Mặc định dùng tổng hợp giọng AI..." style="font-size:12px;margin-top:4px;" />
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- STRUCTURE TAB RENDERERS ---
  function renderStructureTab() {
    if (isEditMode && isTeacher) {
      return renderStructureEditor();
    }

    const structList = lesson.structures || [];

    return `
      <div class="lesson-tab-content">
        <div class="structure-section-header">
          <div class="struct-kicker">STRUCTURE · MẪU CÂU</div>
          <h2 class="struct-main-heading">Talk about area 🌎</h2>
          <div class="struct-sub-heading">Diễn đạt diện tích và quy đổi đơn vị đo lường bằng câu tiếng Anh chuẩn</div>
        </div>

        <div class="structure-pattern-box">
          <div class="pattern-header">
            <span style="font-size:16px;font-weight:900;color:#17365E;">Sentence Pattern · Mẫu câu</span>
            <span style="font-size:12px;color:#7054D8;font-weight:700;">Chạm để thay đổi đối tượng &amp; số liệu</span>
          </div>

          <div class="pattern-template-display">
            The area of
            <span class="slot-badge object" id="slot-object-display">${escapeAttr(sentenceConstructorState.objectEn)}</span>
            is
            <span class="slot-badge number" id="slot-number-display">${escapeAttr(sentenceConstructorState.number)}</span>
            <span class="slot-badge unit" id="slot-unit-display">${escapeAttr(sentenceConstructorState.unitEn)}</span>.
          </div>

          <div class="pattern-vi-translation" id="pattern-vi-display">
            Nghĩa: Diện tích của ${escapeAttr(sentenceConstructorState.objectVi)} là ${escapeAttr(sentenceConstructorState.number)} ${escapeAttr(sentenceConstructorState.unitVi)}.
          </div>

          <div class="pattern-controls-grid">
            <div class="control-group">
              <label style="color:#17365E;font-weight:800;font-size:12px;">1. Chọn đối tượng (Object):</label>
              <select class="auth-input" id="sc-select-object">
                <option value="Cuc Phuong Forest|Khu rừng Cúc Phương" ${sentenceConstructorState.objectEn === 'Cuc Phuong Forest' ? 'selected' : ''}>Cuc Phuong Forest (Rừng Cúc Phương)</option>
                <option value="Moc Chau Tea Farm|Nông trường trà Mộc Châu" ${sentenceConstructorState.objectEn === 'Moc Chau Tea Farm' ? 'selected' : ''}>Moc Chau Tea Farm (Nông trường trà)</option>
                <option value="Cat Tien National Park|Vườn quốc gia Cát Tiên" ${sentenceConstructorState.objectEn === 'Cat Tien National Park' ? 'selected' : ''}>Cat Tien Park (Vườn quốc gia)</option>
                <option value="Moon Exploration Base|Căn cứ thám hiểm Mặt Trăng" ${sentenceConstructorState.objectEn === 'Moon Exploration Base' ? 'selected' : ''}>Moon Exploration Base (Căn cứ vũ trụ)</option>
              </select>
            </div>

            <div class="control-group">
              <label style="color:#17365E;font-weight:800;font-size:12px;">2. Chọn số liệu (Number):</label>
              <select class="auth-input" id="sc-select-number">
                <option value="950" ${sentenceConstructorState.number === '950' ? 'selected' : ''}>950</option>
                <option value="224" ${sentenceConstructorState.number === '224' ? 'selected' : ''}>224</option>
                <option value="15" ${sentenceConstructorState.number === '15' ? 'selected' : ''}>15</option>
                <option value="2.5" ${sentenceConstructorState.number === '2.5' ? 'selected' : ''}>2.5</option>
              </select>
            </div>

            <div class="control-group">
              <label style="color:#17365E;font-weight:800;font-size:12px;">3. Chọn đơn vị (Unit):</label>
              <select class="auth-input" id="sc-select-unit">
                <option value="square kilometres|ki-lô-mét vuông" ${sentenceConstructorState.unitEn === 'square kilometres' ? 'selected' : ''}>square kilometres (km²)</option>
                <option value="hectares|héc-ta" ${sentenceConstructorState.unitEn === 'hectares' ? 'selected' : ''}>hectares (ha)</option>
                <option value="square metres|mét vuông" ${sentenceConstructorState.unitEn === 'square metres' ? 'selected' : ''}>square metres (m²)</option>
              </select>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;margin-top:14px;">
            <button type="button" class="action-btn primary" id="btn-speak-constructed-sentence">
              🔊 Listen · Nghe câu mẫu vừa tạo
            </button>
          </div>
        </div>

        <div class="contextual-example-card" style="margin-top:24px;">
          <div class="example-card-header">
            <span class="ex-kicker">EXAMPLE · CÂU MẪU</span>
          </div>

          <div class="example-card-split">
            <div class="example-card-left">
              <div class="example-text-en">"The area of the forest is 950 square kilometres."</div>
              <div class="example-text-vi">"Diện tích khu rừng là 950 ki-lô-mét vuông."</div>
              <button type="button" class="action-btn primary" id="btn-listen-example-forest" style="margin-top:14px;display:inline-flex;align-items:center;gap:6px;">
                🔊 Listen · Nghe phát âm
              </button>
            </div>

            <div class="example-card-right">
              <div class="example-forest-img-wrap">
                <img src="/assets/topics-library/geometry-measurement/geometry-measurement-bg.png" alt="Rừng Cúc Phương" draggable="false" />
                <div class="example-forest-caption">🌲 Cuc Phuong Forest (224 km²)</div>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:16px;margin-top:24px;">
          <h4 style="margin:0;font-size:16px;color:#17365E;font-weight:900;">
            📖 Ví dụ khác trong ngữ cảnh (Contextual Examples)
          </h4>

          ${structList.map((s, i) => `
            <div class="structure-card">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                <div>
                  <div class="struct-en" style="color:#17365E;font-size:16px;font-weight:800;">${escapeAttr(s.en)}</div>
                  <div class="struct-vi" style="color:#526985;font-size:14px;margin-top:2px;">${escapeAttr(s.vi)}</div>
                </div>
                <button type="button" class="btn-mini" data-speak-struct="${i}">
                  🔊 Listen
                </button>
              </div>

              ${s.noteVi ? `
                <div class="struct-note">
                  <strong>💡 Công thức &amp; Quy tắc:</strong> ${escapeAttr(s.noteVi)} (${escapeAttr(s.noteEn || '')})
                </div>
              ` : ''}

              ${s.exercise ? `
                <div class="struct-exercise-box" style="margin-top:12px;padding:12px;background:#F8FAFE;border-radius:12px;border:1px solid #D5E5FC;">
                  <div style="font-weight:800;color:#7054D8;font-size:13px;margin-bottom:6px;">✍️ Hoạt động thực hành nhanh mẫu câu:</div>
                  <div style="color:#17365E;font-size:14px;margin-bottom:8px;font-weight:700;">${escapeAttr(s.exercise.promptVi)}</div>
                  <div class="choice-grid">
                    ${(s.exercise.choices || []).map((c, ci) => `
                      <button type="button" class="choice-btn" data-struct-ex="${i}" data-choice="${c}">${escapeAttr(c)}</button>
                    `).join('')}
                  </div>
                  <div id="struct-ex-fb-${i}" class="answer-feedback" aria-live="polite"></div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-top:24px;">
          <div class="conversion-card km2-card">
            <h4 style="margin:0 0 8px;color:#17365E;font-size:16px;font-weight:900;">📐 Square Kilometre / Ki-lô-mét vuông</h4>
            <div style="font-size:22px;font-weight:900;color:#1D6ED8;margin-bottom:6px;">1 km² = 1,000,000 m²</div>
            <div style="font-size:13px;color:#526985;line-height:1.4;">Lấy số km² nhân với 1 000 000 để quy đổi sang mét vuông (m²).</div>
          </div>

          <div class="conversion-card ha-card">
            <h4 style="margin:0 0 8px;color:#0E6237;font-size:16px;font-weight:900;">🌱 Hectare / Héc-ta</h4>
            <div style="font-size:22px;font-weight:900;color:#059669;margin-bottom:6px;">1 ha = 10,000 m²</div>
            <div style="font-size:13px;color:#3B5844;line-height:1.4;">Lấy số héc-ta (ha) nhân với 10 000 để quy đổi sang mét vuông (m²).</div>
          </div>
        </div>

        <div class="conversion-relationship-banner" style="margin-top:16px;">
          <div style="font-size:18px;font-weight:900;color:#78350F;">🔄 Core Unit Relationship: 1 km² = 100 ha</div>
          <div style="font-size:13px;color:#92400E;margin-top:4px;font-weight:600;">
            1 ki-lô-mét vuông gấp 100 lần 1 héc-ta. Để đổi từ km² sang ha, ta nhân số km² với 100.
          </div>
        </div>
      </div>
    `;
  }

  function renderStructureEditor() {
    const structList = lesson.structures || [];

    return `
      <div class="lesson-tab-content" style="background:#F4F8FF;border:2px solid #3b82f6;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #D0E2FF;flex-wrap:wrap;gap:12px;">
          <div>
            <h3 style="margin:0;color:#1D6ED8;font-size:20px;font-weight:900;">
              💬 Chỉnh sửa Mẫu câu (Structure Editor — ${structList.length} thẻ)
            </h3>
            <div style="font-size:13px;color:#526985;margin-top:2px;">
              Quản lý danh sách mẫu câu, mẫu khung câu với thẻ slot, sinh mẫu câu bằng AI Gemini và âm thanh.
            </div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="action-btn primary" id="btn-open-ai-structure-builder" style="background:linear-gradient(135deg,#7054D8,#4F46E5);border-color:#7054D8;color:#ffffff;font-size:13px;padding:8px 16px;">
              ✨ AI Gợi ý mẫu câu (AI Sentence Assist)
            </button>
            <button type="button" class="btn-mini primary" id="btn-add-struct-item" style="padding:8px 16px;font-size:13px;">
              ➕ Thêm mẫu câu mới
            </button>
            <button type="button" class="action-btn primary" id="btn-struct-save-quick">
              💾 Lưu Structure
            </button>
          </div>
        </div>

        ${isAiStructureModalOpen ? `
          <!-- AI Structure Assistant Drawer / Panel -->
          <div class="ai-builder-drawer" style="background:#FFFFFF;border:2px solid #7054D8;border-radius:18px;padding:20px;margin-bottom:24px;box-shadow:0 8px 24px rgba(112,84,216,0.15);">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #E0E7FF;padding-bottom:12px;margin-bottom:16px;">
              <div>
                <h4 style="margin:0;color:#4338CA;font-size:17px;font-weight:900;">
                  ✨ AI Sentence Assist — Gợi ý mẫu câu tiếng Anh Toán học lớp 5
                </h4>
                <div style="font-size:12px;color:#6B7280;margin-top:2px;">
                  Nhập yêu cầu để AI đề xuất mẫu câu đo lường diện tích kèm quy tắc ngữ pháp và ví dụ thực tế.
                </div>
              </div>
              <button type="button" class="btn-mini danger" id="btn-close-ai-structure">✕ Đóng</button>
            </div>

            <div style="margin-bottom:14px;">
              <label style="font-size:12px;font-weight:800;color:#17365E;">Chủ đề hoặc cấu trúc câu cần AI gợi ý:</label>
              <textarea class="auth-input" id="ai-struct-input-prompt" rows="2" style="font-size:13px;resize:vertical;" placeholder="Ví dụ: Mẫu câu hỏi và trả lời về diện tích khu đất bằng héc-ta và ki-lô-mét vuông...">${escapeAttr(aiStructurePrompt)}</textarea>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:16px;">
              <button type="button" class="action-btn primary" id="btn-run-ai-structure" style="background:linear-gradient(135deg,#6366F1,#4F46E5);color:#fff;" ${aiStructureLoading ? 'disabled' : ''}>
                ${aiStructureLoading ? '⏳ AI đang soạn mẫu câu...' : '🚀 Tạo mẫu câu với Gemini AI'}
              </button>
            </div>

            ${aiStructureLoading ? `
              <div style="padding:24px;text-align:center;background:#F5F3FF;border-radius:12px;border:1px dashed #A5B4FC;">
                <div style="font-size:28px;margin-bottom:8px;animation:spin 2s linear infinite;">🪐</div>
                <div style="font-weight:800;color:#4338CA;font-size:14px;">AI đang tổng hợp các mẫu câu và quy tắc ngữ pháp chuẩn...</div>
              </div>
            ` : ''}

            ${aiStructureResults && Array.isArray(aiStructureResults) ? `
              <div style="margin-top:16px;border-top:1.5px solid #E0E7FF;padding-top:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                  <span style="font-weight:900;color:#1E1B4B;font-size:14px;">
                    🎉 Kết quả AI gợi ý (${aiStructureResults.length} mẫu câu):
                  </span>
                  <button type="button" class="action-btn primary" id="btn-insert-selected-ai-structure" style="background:#10B981;border-color:#10B981;color:#fff;font-size:13px;padding:6px 16px;">
                    📥 Chèn các mẫu câu đã chọn vào bài học (${selectedAiStructureIds.size} mẫu)
                  </button>
                </div>

                <div style="display:flex;flex-direction:column;gap:10px;">
                  ${aiStructureResults.map((s, sIdx) => `
                    <div style="background:#F5F3FF;border:1.5px solid #C7D2FE;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:6px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;">
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                          <input type="checkbox" data-ai-struct-check="${s.id}" ${selectedAiStructureIds.has(s.id) ? 'checked' : ''} />
                          <strong style="font-size:14px;color:#1E1B4B;">${escapeAttr(s.patternEn || s.en)}</strong>
                        </label>
                      </div>
                      <div style="font-size:13px;color:#059669;font-weight:800;">${escapeAttr(s.patternVi || s.vi)}</div>
                      <div style="font-size:12px;color:#4B5563;background:#FFFFFF;padding:6px 8px;border-radius:6px;border:1px solid #E5E7EB;">
                        <em>Ví dụ: "${escapeAttr(s.en)}"</em> — ${escapeAttr(s.vi)}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div style="display:flex;flex-direction:column;gap:16px;">
          ${structList.map((s, i) => `
            <div style="background:#FFFFFF;padding:18px;border-radius:16px;border:1.5px solid #C2DCFF;display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;border-bottom:1px solid #EBF5FF;padding-bottom:10px;">
                <span style="font-weight:900;color:#17365E;font-size:15px;">#${i + 1}. Mẫu câu: "${escapeAttr(s.en)}"</span>

                <div style="display:flex;gap:6px;align-items:center;">
                  <button type="button" class="btn-mini" data-struct-listen-test="${i}">🔊 Nghe thử</button>
                  <button type="button" class="btn-mini" data-struct-up="${i}">⬆️ Up</button>
                  <button type="button" class="btn-mini" data-struct-down="${i}">⬇️ Down</button>
                  <button type="button" class="btn-mini danger" data-struct-del="${i}">🗑️ Xóa mẫu câu</button>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Khung mẫu câu EN (Pattern with Slots):</label>
                  <input type="text" class="auth-input" data-s-patten="${i}" value="${escapeAttr(s.patternEn || '')}" placeholder="The area of [Object] is [Number] [Unit]." />
                </div>
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Khung mẫu câu VI:</label>
                  <input type="text" class="auth-input" data-s-pattvi="${i}" value="${escapeAttr(s.patternVi || '')}" placeholder="Diện tích của [Đối tượng] là [Số] [Đơn vị]." />
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Câu ví dụ Tiếng Anh (Sentence EN):</label>
                  <input type="text" class="auth-input" data-s-en="${i}" value="${escapeAttr(s.en)}" placeholder="Câu mẫu tiếng Anh..." />
                </div>
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Dịch nghĩa Tiếng Việt (Sentence VI):</label>
                  <input type="text" class="auth-input" data-s-vi="${i}" value="${escapeAttr(s.vi)}" placeholder="Dịch nghĩa tiếng Việt..." />
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Ghi chú ngữ pháp / Công thức (Note VI):</label>
                  <input type="text" class="auth-input" data-s-notevi="${i}" value="${escapeAttr(s.noteVi || '')}" placeholder="Ghi chú tiếng Việt..." />
                </div>
                <div>
                  <label style="font-size:11px;font-weight:700;color:#526985;">Ghi chú ngữ pháp (Note EN):</label>
                  <input type="text" class="auth-input" data-s-noteen="${i}" value="${escapeAttr(s.noteEn || '')}" placeholder="English grammar note..." />
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- PRACTICE TAB RENDERERS ---
  function renderPracticeTab() {
    const questions = lesson.practice || [];

    return `
      <div class="lesson-tab-content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
          <div>
            <h3 style="margin:0;color:#17365E;font-size:20px;font-weight:900;">
              ✍️ Space Mission Practice Engine · Nhiệm vụ thực hành tương tác
            </h3>
            <p style="margin:2px 0 0;color:#526985;font-size:13px;">
              Vận dụng kiến thức bài học qua các thử thách trắc nghiệm, điền từ, nối cặp và so sánh diện tích.
            </p>
          </div>

          ${isTeacher ? `
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button type="button" class="action-btn primary" id="btn-toggle-ai-studio" style="background:linear-gradient(135deg,#00e5ff,#0077ff);color:#020b26;font-weight:900;">
                ⚡ AI Exercise Studio (OCR Analysis)
              </button>
              <button type="button" class="action-btn" id="btn-toggle-manual-practice-editor">
                ${isEditMode ? '👁️ Student View' : '✏️ Manual Practice Editor'}
              </button>
            </div>
          ` : `
            <button type="button" class="btn-mini" id="btn-toggle-ai-studio-demo" style="color:#1D6ED8;border-color:#3289F5;">
              ⚡ AI Studio Demo (Xem thử tính năng giáo viên)
            </button>
          `}
        </div>

        <div id="ai-exercise-studio-wrap" style="display:${studioState.isOpen ? 'block' : 'none'};margin-bottom:24px;">
          ${renderAiStudioPanel()}
        </div>

        ${isEditMode && isTeacher ? renderPracticeEditor() : renderInteractiveStudentPractice(questions)}
      </div>
    `;
  }

  function renderInteractiveStudentPractice(questions) {
    const sourceQuestions = questions.filter(q => !q.isExtraPractice);
    const extraQuestions = questions.filter(q => q.isExtraPractice);

    return `
      <div class="practice-questions-list">
        <!-- 1. Source Textbook Exercises Section -->
        <div style="margin-bottom:28px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #EBF5FF;">
            <span style="font-size:18px;">📌</span>
            <h4 style="margin:0;font-size:17px;color:#17365E;font-weight:900;">
              Bài tập gốc từ ảnh sách giáo khoa (Source Exercises — ${sourceQuestions.length} Tasks)
            </h4>
          </div>

          <div style="display:flex;flex-direction:column;gap:20px;">
            ${sourceQuestions.map((q, i) => renderSingleQuestionInteractive(q, i)).join('')}
          </div>
        </div>

        <!-- 2. AI Extra Practice Section -->
        ${extraQuestions.length > 0 ? `
          <div style="margin-top:32px;padding-top:20px;border-top:2px dashed #93C5FD;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
              <span style="font-size:18px;">✨</span>
              <h4 style="margin:0;font-size:17px;color:#7054D8;font-weight:900;">
                Bài luyện tập mở rộng do AI đề xuất (AI-generated Extra Practice)
              </h4>
            </div>

            <div style="display:flex;flex-direction:column;gap:20px;">
              ${extraQuestions.map((q, i) => renderSingleQuestionInteractive(q, sourceQuestions.length + i)).join('')}
            </div>
          </div>
        ` : ''}

        <div id="practice-summary-container" style="margin-top:20px;"></div>
      </div>
    `;
  }

  function renderSingleQuestionInteractive(q, i) {
    if (q.type === 'matching') {
      return renderMatchingTaskInteractive(q, i);
    }
    if (q.type === 'fill_blank' && q.fillItems && q.fillItems.length > 0) {
      return renderFillBlankTaskInteractive(q, i);
    }
    if (q.type === 'area_comparison' && q.lands && q.lands.length > 0) {
      return renderAreaComparisonTaskInteractive(q, i);
    }
    return renderGenericQuestionInteractive(q, i);
  }

  // --- TASK 1: MATCHING INTERACTIVE COMPONENT ---
  function renderMatchingTaskInteractive(q, i) {
    const pairs = q.pairs || [];
    const isChecked = Boolean(matchingChecked[i]);
    const userMap = matchingUserPairs[i] || {};
    const selectedLeft = matchingSelectedLeft[i];

    return `
      <div class="practice-q-card" id="pq-card-${i}" style="border:2px solid #3b82f6;background:#FFFFFF;">
        <div class="pq-header">
          <span class="pq-number">${q.sourceTaskId || `Nhiệm vụ ${i + 1}`}</span>
          <span class="pq-type" style="background:#E0F2FE;color:#0369A1;padding:2px 8px;border-radius:6px;font-weight:800;">
            🧩 Ghép cặp thẻ từ ↔ thẻ số (Matching Cards)
          </span>
        </div>

        <div class="pq-text-en" style="font-size:17px;font-weight:900;color:#17365E;margin-bottom:2px;">${escapeAttr(q.questionEn)}</div>
        <div class="pq-text-vi" style="font-size:14px;color:#526985;margin-bottom:16px;">${escapeAttr(q.questionVi)}</div>

        <div style="font-size:12px;color:#1D6ED8;font-weight:800;margin-bottom:10px;">
          👇 Hướng dẫn: Nhấn vào 1 Thẻ Từ bên trái, sau đó nhấn 1 Thẻ Số bên phải để nối cặp.
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;">
          <!-- Left Column: Word Cards -->
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="font-size:12px;font-weight:900;color:#7054D8;text-transform:uppercase;">🔤 Thẻ Từ Tiếng Anh (Word Cards)</div>
            ${pairs.map((p, pIdx) => {
              const isSelected = selectedLeft === pIdx;
              const isPaired = userMap[pIdx] !== undefined;
              const pairedRightIdx = userMap[pIdx];
              let statusClass = '';
              if (isChecked && isPaired) {
                statusClass = pairedRightIdx === pIdx ? 'correct-match' : 'incorrect-match';
              }

              return `
                <button type="button" class="matching-card-btn left ${isSelected ? 'selected' : ''} ${isPaired ? 'paired' : ''} ${statusClass}"
                        data-match-left="${i}" data-left-idx="${pIdx}"
                        style="padding:14px 16px;border-radius:14px;border:2px solid ${isSelected ? '#3289F5' : (isPaired ? '#38C882' : '#C2DCFF')};background:${isSelected ? '#EBF5FF' : (isPaired ? '#F0FDF4' : '#F8FAFE')};text-align:left;font-weight:800;color:#17365E;cursor:pointer;transition:all 0.15s ease;display:flex;justify-content:space-between;align-items:center;">
                  <span>${escapeAttr(p.left)}</span>
                  ${isPaired ? `<span style="font-size:11px;background:#38C882;color:#FFF;padding:2px 8px;border-radius:999px;">Linked ➔ #${pairedRightIdx + 1}</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <!-- Right Column: Number Cards -->
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="font-size:12px;font-weight:900;color:#0E6237;text-transform:uppercase;">🔢 Thẻ Số KM² (Number Cards)</div>
            ${pairs.map((p, pIdx) => {
              // Check if paired with any left item
              const pairedLeftIdx = Object.keys(userMap).find(k => userMap[k] === pIdx);
              const isPaired = pairedLeftIdx !== undefined;

              return `
                <button type="button" class="matching-card-btn right ${isPaired ? 'paired' : ''}"
                        data-match-right="${i}" data-right-idx="${pIdx}"
                        style="padding:14px 16px;border-radius:14px;border:2px solid ${isPaired ? '#059669' : '#82E2B1'};background:${isPaired ? '#ECFDF5' : '#F0FDF4'};text-align:center;font-weight:900;font-size:18px;color:#0E6237;cursor:pointer;transition:all 0.15s ease;">
                  ${pIdx + 1}. ${escapeAttr(p.right)}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;flex-wrap:wrap;gap:10px;">
          <button type="button" class="btn-mini" data-match-reset="${i}">🔄 Xóa chọn lại</button>
          <button type="button" class="action-btn primary" data-match-check="${i}">✨ Kiểm tra ghép cặp (Check Matching)</button>
        </div>

        <div id="pq-fb-${i}" class="answer-feedback" aria-live="polite">
          ${isChecked ? renderMatchingFeedback(q, userMap) : ''}
        </div>
      </div>
    `;
  }

  function renderMatchingFeedback(q, userMap) {
    const pairs = q.pairs || [];
    let correctCount = 0;
    pairs.forEach((p, idx) => {
      if (userMap[idx] === idx) correctCount++;
    });

    const isAllCorrect = correctCount === pairs.length;
    return `
      <div style="padding:14px;border-radius:12px;background:${isAllCorrect ? '#ECFDF5' : '#FFFBEB'};border:1.5px solid ${isAllCorrect ? '#10B981' : '#F59E0B'};margin-top:10px;">
        <div style="font-weight:900;color:${isAllCorrect ? '#065F46' : '#92400E'};font-size:15px;">
          ${isAllCorrect ? '🎉 Hoàn hảo! Bạn đã ghép đúng toàn bộ 4 cặp thẻ từ với thẻ số!' : `💡 Kết quả: Bạn ghép đúng ${correctCount}/${pairs.length} cặp.`}
        </div>
        <div style="font-size:13px;color:#374151;margin-top:4px;line-height:1.4;">
          <strong>Lời giải chi tiết:</strong> ${escapeAttr(q.explanationVi || q.explanationEn)}
        </div>
      </div>
    `;
  }

  // --- TASK 2: FILL IN THE BLANK INTERACTIVE COMPONENT ---
  function renderFillBlankTaskInteractive(q, i) {
    const items = q.fillItems || [];
    const userAns = fillAnswers[i] || {};
    const isChecked = Boolean(fillChecked[i]);

    return `
      <div class="practice-q-card" id="pq-card-${i}" style="border:2px solid #10b981;background:#FFFFFF;">
        <div class="pq-header">
          <span class="pq-number">${q.sourceTaskId || `Nhiệm vụ ${i + 1}`}</span>
          <span class="pq-type" style="background:#D1FAE5;color:#047857;padding:2px 8px;border-radius:6px;font-weight:800;">
            ✏️ Điền số đổi đơn vị (Fill in the missing numbers)
          </span>
        </div>

        <div class="pq-text-en" style="font-size:17px;font-weight:900;color:#17365E;margin-bottom:2px;">${escapeAttr(q.questionEn)}</div>
        <div class="pq-text-vi" style="font-size:14px;color:#526985;margin-bottom:16px;">${escapeAttr(q.questionVi)}</div>

        <div style="display:flex;flex-direction:column;gap:12px;">
          ${items.map((item, itemIdx) => {
            const val = userAns[item.id] || '';
            const cleanVal = String(val).trim().replace(/,/g, '').replace(/\s/g, '');
            const cleanTarget = String(item.correctAnswer).trim().replace(/,/g, '').replace(/\s/g, '');
            const isCorrect = isChecked && cleanVal === cleanTarget;
            const isIncorrect = isChecked && cleanVal !== '' && cleanVal !== cleanTarget;

            return `
              <div style="background:#F0FDF4;padding:14px;border-radius:12px;border:1.5px solid ${isCorrect ? '#10B981' : (isIncorrect ? '#EF4444' : '#A7F3D0')};display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div style="font-size:16px;font-weight:900;color:#065F46;display:flex;align-items:center;gap:8px;">
                  <span>${escapeAttr(item.prefix || item.promptEn)}</span>
                  <input type="text" class="auth-input" data-fill-item="${i}" data-item-id="${item.id}" value="${escapeAttr(val)}" placeholder="Nhập số..." style="width:140px;font-weight:900;color:#1D6ED8;text-align:center;font-size:16px;" />
                  <span>${escapeAttr(item.suffix || '')}</span>
                </div>

                ${isChecked ? `
                  <div style="font-size:13px;font-weight:800;color:${isCorrect ? '#059669' : '#DC2626'};">
                    ${isCorrect ? '✅ Đúng!' : `❌ Chưa đúng (Đáp án: ${escapeAttr(item.correctAnswer)})`}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:16px;">
          <button type="button" class="action-btn primary" data-fill-check="${i}">Check Answers / Kiểm tra kết quả</button>
        </div>

        <div id="pq-fb-${i}" class="answer-feedback" aria-live="polite">
          ${isChecked ? `
            <div style="padding:12px;background:#ECFDF5;border:1px solid #10B981;border-radius:10px;margin-top:10px;color:#065F46;font-size:13px;line-height:1.4;">
              <strong>Lời giải chi tiết:</strong> ${escapeAttr(q.explanationVi || q.explanationEn)}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // --- TASK 3: AREA COMPARISON INTERACTIVE COMPONENT ---
  function renderAreaComparisonTaskInteractive(q, i) {
    const lands = q.lands || [];
    const selected = areaSelectedLand[i];
    const isChecked = Boolean(areaChecked[i]);

    return `
      <div class="practice-q-card" id="pq-card-${i}" style="border:2px solid #F59E0B;background:#FFFFFF;">
        <div class="pq-header">
          <span class="pq-number">${q.sourceTaskId || `Nhiệm vụ ${i + 1}`}</span>
          <span class="pq-type" style="background:#FEF3C7;color:#B45309;padding:2px 8px;border-radius:6px;font-weight:800;">
            ☀️ So sánh diện tích (Area Comparison)
          </span>
        </div>

        <div class="pq-text-en" style="font-size:18px;font-weight:900;color:#17365E;margin-bottom:2px;">${escapeAttr(q.questionEn)}</div>
        <div class="pq-text-vi" style="font-size:14px;color:#526985;margin-bottom:16px;">${escapeAttr(q.questionVi)}</div>

        <!-- 3 Land Visual Cards Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:16px;">
          ${lands.map(land => {
            const isSelected = selected === land.id;
            const isTarget = land.id === q.correctLandId;
            let statusStyle = 'border:2px solid #FCD34D;background:#FFFBEB;';

            if (isSelected) {
              statusStyle = 'border:3.5px solid #F59E0B;background:#FEF3C7;box-shadow:0 0 16px rgba(245,158,11,0.3);';
            }
            if (isChecked) {
              if (isTarget) statusStyle = 'border:3px solid #10B981;background:#ECFDF5;';
              else if (isSelected) statusStyle = 'border:3px solid #EF4444;background:#FEF2F2;';
            }

            return `
              <div class="area-land-card" data-area-land-select="${i}" data-land-id="${land.id}"
                   style="${statusStyle}border-radius:16px;padding:16px;cursor:pointer;transition:all 0.18s ease;display:flex;flex-direction:column;align-items:center;text-align:center;">
                <div style="font-size:18px;font-weight:900;color:#78350F;margin-bottom:6px;">🏞️ ${escapeAttr(land.name)}</div>

                <!-- Visual Rectangular Diagram -->
                <div style="width:140px;height:90px;border:2px dashed #D97706;background:#FEF3C7;border-radius:10px;display:flex;align-items:center;justify-content:center;margin:8px 0;position:relative;">
                  <span style="font-size:12px;font-weight:800;color:#B45309;">${land.length} km × ${land.width} km</span>
                </div>

                <div style="font-size:16px;font-weight:900;color:#1D6ED8;margin-top:4px;">
                  = ${land.area} km²
                </div>

                <button type="button" class="btn-mini ${isSelected ? 'primary' : ''}" style="margin-top:10px;width:100%;">
                  ${isSelected ? '✔ Đã chọn mảnh đất này' : 'Chọn mảnh đất này'}
                </button>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:14px;">
          <button type="button" class="action-btn primary" data-area-check="${i}">✨ Kiểm tra đáp án (Check Selection)</button>
        </div>

        <div id="pq-fb-${i}" class="answer-feedback" aria-live="polite">
          ${isChecked ? `
            <div style="padding:14px;border-radius:12px;background:${selected === q.correctLandId ? '#ECFDF5' : '#FEF2F2'};border:1.5px solid ${selected === q.correctLandId ? '#10B981' : '#EF4444'};margin-top:10px;">
              <div style="font-weight:900;color:${selected === q.correctLandId ? '#065F46' : '#991B1B'};font-size:15px;">
                ${selected === q.correctLandId ? '🎉 Chính xác! Mảnh đất B có diện tích rộng nhất (25 km²)!' : '💡 Chưa chính xác. Lời giải chi tiết bên dưới:'}
              </div>
              <div style="font-size:13px;color:#374151;margin-top:4px;line-height:1.4;">
                ${escapeAttr(q.explanationVi || q.explanationEn)}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderGenericQuestionInteractive(q, i) {
    return `
      <div class="practice-q-card" id="pq-card-${i}">
        <div class="pq-header">
          <span class="pq-number">Nhiệm vụ ${i + 1}</span>
          <span class="pq-type">${q.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Thực hành'}</span>
        </div>

        <div class="pq-text-en">${escapeAttr(q.questionEn)}</div>
        <div class="pq-text-vi">${escapeAttr(q.questionVi)}</div>

        ${q.choices ? `
          <div class="choice-grid" style="margin-top:12px;">
            ${q.choices.map((c, ci) => `
              <button type="button" class="choice-btn" data-pq-idx="${i}" data-choice-idx="${ci}">${escapeAttr(c)}</button>
            `).join('')}
          </div>
        ` : ''}

        <div id="pq-fb-${i}" class="answer-feedback" aria-live="polite"></div>
      </div>
    `;
  }

  // --- PRACTICE EDITOR FOR ADMIN / TEACHER ---
  function renderPracticeEditor() {
    const questions = lesson.practice || [];
    const sourceQuestions = questions.filter(q => !q.isExtraPractice);
    const extraQuestions = questions.filter(q => q.isExtraPractice);

    return `
      <div style="background:#F4F8FF;padding:18px;border-radius:18px;border:2px solid #3b82f6;margin-top:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <h4 style="margin:0;color:#1D6ED8;font-size:18px;font-weight:900;">
              🛠️ Trình biên tập câu hỏi thực hành (${questions.length} câu)
            </h4>
            <div style="font-size:12px;color:#526985;">Phân loại theo cấu trúc bài tập gốc từ ảnh và bài tập mở rộng AI.</div>
          </div>

          <div style="display:flex;gap:8px;">
            <button type="button" class="btn-mini primary" id="btn-add-practice-question">➕ Thêm câu hỏi mới</button>
            <button type="button" class="action-btn primary" id="btn-practice-save-quick">💾 Lưu Practice</button>
          </div>
        </div>

        <!-- 1. Source Exercises Editors -->
        <div style="margin-bottom:24px;">
          <h5 style="color:#17365E;font-size:15px;font-weight:900;margin:0 0 12px;padding-bottom:6px;border-bottom:2px solid #C2DCFF;">
            📌 1. Bài tập gốc từ ảnh sách giáo khoa (${sourceQuestions.length} câu)
          </h5>

          <div style="display:flex;flex-direction:column;gap:16px;">
            ${sourceQuestions.map((q, idx) => renderSingleQuestionEditorForm(q, idx)).join('')}
          </div>
        </div>

        <!-- 2. Extra AI Practice Editors -->
        ${extraQuestions.length > 0 ? `
          <div>
            <h5 style="color:#7054D8;font-size:15px;font-weight:900;margin:0 0 12px;padding-bottom:6px;border-bottom:2px solid #DDD6FE;">
              ✨ 2. Bài tập mở rộng do AI gợi ý (${extraQuestions.length} câu)
            </h5>

            <div style="display:flex;flex-direction:column;gap:16px;">
              ${extraQuestions.map((q, idx) => renderSingleQuestionEditorForm(q, sourceQuestions.length + idx)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderSingleQuestionEditorForm(q, qidx) {
    if (q.type === 'matching') {
      return renderMatchingEditorForm(q, qidx);
    }
    if (q.type === 'fill_blank') {
      return renderFillBlankEditorForm(q, qidx);
    }
    if (q.type === 'area_comparison') {
      return renderAreaComparisonEditorForm(q, qidx);
    }
    return renderGenericEditorForm(q, qidx);
  }

  function renderMatchingEditorForm(q, qidx) {
    const pairs = q.pairs || [];
    return `
      <div style="background:#FFFFFF;padding:16px;border-radius:14px;border:1.5px solid #3B82F6;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-bottom:1px solid #EBF5FF;padding-bottom:8px;">
          <span style="font-weight:900;color:#1D6ED8;font-size:14px;">
            Task 1 — Matching Editor: "${escapeAttr(q.sourceTitle || q.questionEn)}"
          </span>
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn-mini" data-q-up="${qidx}">⬆️ Up</button>
            <button type="button" class="btn-mini" data-q-down="${qidx}">⬇️ Down</button>
            <button type="button" class="btn-mini danger" data-q-del="${qidx}">🗑️ Xóa</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:#526985;">Tiêu đề EN:</label>
            <input type="text" class="auth-input" data-q-en="${qidx}" value="${escapeAttr(q.questionEn)}" />
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#526985;">Tiêu đề VI:</label>
            <input type="text" class="auth-input" data-q-vi="${qidx}" value="${escapeAttr(q.questionVi)}" />
          </div>
        </div>

        <div style="font-weight:800;font-size:12px;color:#17365E;margin-top:6px;">
          Danh sách 4 cặp ghép (Cột trái Thẻ từ EN ↔ Cột phải Thẻ số KM²):
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          ${pairs.map((p, pidx) => `
            <div style="display:grid;grid-template-columns:1fr 1fr 40px;gap:8px;align-items:center;">
              <input type="text" class="auth-input" data-match-pair-left="${qidx}-${pidx}" value="${escapeAttr(p.left)}" placeholder="Thẻ từ tiếng Anh..." style="font-size:12px;padding:6px;" />
              <input type="text" class="auth-input" data-match-pair-right="${qidx}-${pidx}" value="${escapeAttr(p.right)}" placeholder="Thẻ giá trị số..." style="font-size:12px;padding:6px;" />
              <button type="button" class="btn-mini danger" data-match-pair-del="${qidx}-${pidx}" style="padding:4px 8px;">✕</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderFillBlankEditorForm(q, qidx) {
    const items = q.fillItems || [];
    return `
      <div style="background:#FFFFFF;padding:16px;border-radius:14px;border:1.5px solid #10B981;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-bottom:1px solid #EBF5FF;padding-bottom:8px;">
          <span style="font-weight:900;color:#0E6237;font-size:14px;">
            Task 2 — Fill-in-the-Blank Editor: "${escapeAttr(q.sourceTitle || q.questionEn)}"
          </span>
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn-mini" data-q-up="${qidx}">⬆️ Up</button>
            <button type="button" class="btn-mini" data-q-down="${qidx}">⬇️ Down</button>
            <button type="button" class="btn-mini danger" data-q-del="${qidx}">🗑️ Xóa</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:#526985;">Tiêu đề EN:</label>
            <input type="text" class="auth-input" data-q-en="${qidx}" value="${escapeAttr(q.questionEn)}" />
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#526985;">Tiêu đề VI:</label>
            <input type="text" class="auth-input" data-q-vi="${qidx}" value="${escapeAttr(q.questionVi)}" />
          </div>
        </div>

        <div style="font-weight:800;font-size:12px;color:#17365E;margin-top:6px;">
          Danh sách 4 phép đổi đơn vị:
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          ${items.map((item, itemIdx) => `
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;align-items:center;">
              <input type="text" class="auth-input" data-fill-prefix="${qidx}-${itemIdx}" value="${escapeAttr(item.prefix || item.promptEn)}" style="font-size:12px;padding:6px;" />
              <input type="text" class="auth-input" data-fill-ans="${qidx}-${itemIdx}" value="${escapeAttr(item.correctAnswer)}" placeholder="Đáp án..." style="font-size:12px;padding:6px;font-weight:800;" />
              <input type="text" class="auth-input" data-fill-suffix="${qidx}-${itemIdx}" value="${escapeAttr(item.suffix || '')}" placeholder="Đơn vị..." style="font-size:12px;padding:6px;" />
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderAreaComparisonEditorForm(q, qidx) {
    const lands = q.lands || [];
    return `
      <div style="background:#FFFFFF;padding:16px;border-radius:14px;border:1.5px solid #F59E0B;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-bottom:1px solid #EBF5FF;padding-bottom:8px;">
          <span style="font-weight:900;color:#B45309;font-size:14px;">
            Task 3 — Area Comparison Editor: "${escapeAttr(q.sourceTitle || q.questionEn)}"
          </span>
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn-mini" data-q-up="${qidx}">⬆️ Up</button>
            <button type="button" class="btn-mini" data-q-down="${qidx}">⬇️ Down</button>
            <button type="button" class="btn-mini danger" data-q-del="${qidx}">🗑️ Xóa</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:#526985;">Câu hỏi EN:</label>
            <input type="text" class="auth-input" data-q-en="${qidx}" value="${escapeAttr(q.questionEn)}" />
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#526985;">Câu hỏi VI:</label>
            <input type="text" class="auth-input" data-q-vi="${qidx}" value="${escapeAttr(q.questionVi)}" />
          </div>
        </div>

        <div style="font-weight:800;font-size:12px;color:#17365E;margin-top:6px;">
          Danh sách 3 mảnh đất (Chọn 1 mảnh đất đúng):
        </div>

        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;">
          ${lands.map((land, lidx) => `
            <div style="background:#FEF3C7;padding:10px;border-radius:10px;border:1px solid #FCD34D;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <input type="radio" name="area-correct-${qidx}" value="${land.id}" ${q.correctLandId === land.id ? 'checked' : ''} />
                <input type="text" class="auth-input" data-land-name="${qidx}-${lidx}" value="${escapeAttr(land.name)}" style="font-size:12px;padding:4px;" />
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                <input type="number" class="auth-input" data-land-len="${qidx}-${lidx}" value="${land.length}" placeholder="Dài" style="font-size:11px;padding:4px;" />
                <input type="number" class="auth-input" data-land-wid="${qidx}-${lidx}" value="${land.width}" placeholder="Rộng" style="font-size:11px;padding:4px;" />
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderGenericEditorForm(q, qidx) {
    return `
      <div style="background:#FFFFFF;padding:16px;border-radius:14px;border:1.5px solid #C2DCFF;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-bottom:1px solid #EBF5FF;padding-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:900;color:#17365E;">Câu hỏi #${qidx + 1}</span>
            <span style="font-size:11px;background:#EBF5FF;color:#1D6ED8;padding:2px 8px;border-radius:6px;font-weight:800;">
              ${q.isExtraPractice ? '✨ AI Extra Practice' : '📌 Source Exercise'}
            </span>
          </div>

          <div style="display:flex;gap:6px;">
            <button type="button" class="btn-mini" data-q-up="${qidx}">⬆️ Up</button>
            <button type="button" class="btn-mini" data-q-down="${qidx}">⬇️ Down</button>
            <button type="button" class="btn-mini danger" data-q-del="${qidx}">🗑️ Xóa</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:#526985;">Câu hỏi Tiếng Anh:</label>
            <input type="text" class="auth-input" data-q-en="${qidx}" value="${escapeAttr(q.questionEn)}" />
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#526985;">Câu hỏi Tiếng Việt:</label>
            <input type="text" class="auth-input" data-q-vi="${qidx}" value="${escapeAttr(q.questionVi)}" />
          </div>
        </div>

        ${q.choices ? `
          <div>
            <label style="font-size:11px;font-weight:700;color:#526985;">Lựa chọn đáp án:</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
              ${q.choices.map((c, ci) => `
                <div style="display:flex;align-items:center;gap:6px;">
                  <input type="radio" name="q-correct-${qidx}" value="${ci}" ${q.correctIndex === ci ? 'checked' : ''} />
                  <input type="text" class="auth-input" data-q-choice="${qidx}-${ci}" value="${escapeAttr(c)}" style="font-size:12px;padding:6px;" />
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderAiStudioPanel() {
    return `
      <div class="ai-studio-panel">
        <div class="ai-studio-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1.5px solid #EBF5FF;padding-bottom:10px;">
          <div>
            <h4 style="margin:0;font-size:18px;color:#1D6ED8;font-weight:900;">
              📷 AI Exercise Studio — Image-to-Interactive Exercises
            </h4>
            <p style="margin:2px 0 0;color:#526985;font-size:12px;">
              Chuyển đổi ảnh chụp sách giáo khoa thành 3 dạng bài gốc (Matching, Fill Blank, Area Comparison).
            </p>
          </div>
          <button type="button" class="btn-mini danger" id="btn-close-ai-studio">✕ Đóng Studio</button>
        </div>

        <div class="studio-steps-bar">
          <div class="studio-step-item ${studioState.currentStep >= 1 ? 'active' : ''}">
            <span class="step-num">1</span>
            <span>Upload Image</span>
          </div>
          <div class="studio-step-item ${studioState.currentStep >= 2 ? 'active' : ''}">
            <span class="step-num">2</span>
            <span>AI Analyze</span>
          </div>
          <div class="studio-step-item ${studioState.currentStep >= 3 ? 'active' : ''}">
            <span class="step-num">3</span>
            <span>Review &amp; Edit</span>
          </div>
          <div class="studio-step-item ${studioState.currentStep >= 4 ? 'active' : ''}">
            <span class="step-num">4</span>
            <span>Student Preview</span>
          </div>
          <div class="studio-step-item ${studioState.currentStep >= 5 ? 'active' : ''}">
            <span class="step-num">5</span>
            <span>Publish</span>
          </div>
        </div>

        ${studioState.currentStep === 1 ? `
          <div class="studio-step-box">
            <h5 style="margin:0 0 8px;color:#17365E;font-size:15px;font-weight:800;">Bước 1: Tải ảnh bài tập (Sách giáo khoa / Phiếu bài tập)</h5>
            <div class="upload-dropzone" id="studio-dropzone">
              <div style="font-size:36px;margin-bottom:8px;">📸</div>
              <div style="font-size:15px;font-weight:800;color:#17365E;">Kéo thả ảnh bài tập vào đây hoặc nhấn để chọn ảnh</div>
              <input type="file" id="studio-file-input" accept="image/*" style="display:none;" />
              <button type="button" class="action-btn primary" id="btn-trigger-studio-file" style="margin-top:14px;">
                📂 Chọn ảnh từ máy tính / Chọn tệp
              </button>
            </div>

            ${studioState.uploadedImages.length > 0 ? `
              <div style="margin-top:16px;">
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                  ${studioState.uploadedImages.map((img, idx) => `
                    <div style="position:relative;width:120px;height:100px;border-radius:10px;overflow:hidden;border:1px solid #3289F5;">
                      <img src="${img.data}" alt="Exercise page" style="width:100%;height:100%;object-fit:cover;" />
                      <button type="button" class="btn-mini danger" data-remove-img="${idx}" style="position:absolute;top:2px;right:2px;padding:2px 6px;">✕</button>
                    </div>
                  `).join('')}
                </div>

                <div style="display:flex;justify-content:flex-end;margin-top:14px;">
                  <button type="button" class="action-btn primary" id="btn-start-ai-analyze">
                    ✨ Bắt đầu phân tích AI (Start Analyze) ➔
                  </button>
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${studioState.currentStep === 2 ? `
          <div class="studio-step-box" style="text-align:center;padding:32px 20px;">
            <div class="ai-processing-spinner" style="font-size:36px;margin-bottom:12px;">⚡</div>
            <h5 style="color:#1D6ED8;font-size:18px;margin:12px 0 6px;font-weight:900;">
              AI đang nhận diện &amp; bảo toàn 3 nhiệm vụ bài gốc (Task 1 Matching, Task 2 Fill Blank, Task 3 Area Comparison)...
            </h5>
          </div>
        ` : ''}

        ${studioState.currentStep === 3 && studioState.extractedResult ? `
          <div class="studio-step-box">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h5 style="margin:0;color:#0E6237;font-size:16px;font-weight:900;">Bước 3: Kiểm duyệt &amp; Chỉnh sửa nội dung 3 Task bài gốc</h5>
              <button type="button" class="action-btn primary" id="btn-goto-student-preview">
                👁️ Xem trước dạng bài học sinh (Student Preview) ➔
              </button>
            </div>

            <div class="builder-split">
              <div style="flex:1;max-width:300px;background:#F0F6FF;padding:12px;border-radius:12px;border:1px solid #C2DCFF;">
                <strong style="color:#17365E;font-size:12px;">📷 Ảnh gốc đối chiếu:</strong>
                ${studioState.uploadedImages[0] ? `
                  <img src="${studioState.uploadedImages[0].data}" alt="Original" style="width:100%;margin-top:8px;border-radius:8px;border:1px solid #A4CDFF;" />
                ` : ''}
              </div>

              <div style="flex:2;display:flex;flex-direction:column;gap:14px;">
                ${(studioState.extractedResult.questions || []).map((q, qidx) => renderSingleQuestionEditorForm(q, qidx)).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        ${studioState.currentStep === 4 && studioState.extractedResult ? `
          <div class="studio-step-box">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h5 style="margin:0;color:#0E6237;font-size:16px;font-weight:900;">Bước 4 &amp; 5: Trải nghiệm bài tập tương tác &amp; Xuất bản</h5>
              <div style="display:flex;gap:8px;">
                <button type="button" class="action-btn" id="btn-back-to-edit">✏️ Chỉnh sửa lại</button>
                <button type="button" class="action-btn primary" id="btn-publish-ai-exercises" style="background:linear-gradient(135deg,#38ef7d,#00b0ff);color:#020b26;font-weight:900;">
                  🚀 Xuất bản vào bài học (Publish to Practice)
                </button>
              </div>
            </div>

            <div class="preview-box">
              ${renderInteractiveStudentPractice(studioState.extractedResult.questions || [])}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function render() {
    container.innerHTML = `
      <div class="lesson-stage">
        ${renderHeader()}
        <div id="lesson-tab-body"></div>
      </div>
    `;

    // Bind Header Toolbar & Back button
    container.querySelector('#btn-lesson-back-topic')?.addEventListener('click', () => {
      if (onBack) onBack();
    });

    container.querySelector('#btn-toggle-edit-mode')?.addEventListener('click', () => {
      isEditMode = !isEditMode;
      render();
    });

    container.querySelector('#btn-save-draft')?.addEventListener('click', () => {
      handleSaveLesson('draft');
    });

    container.querySelector('#btn-publish-lesson')?.addEventListener('click', () => {
      handleSaveLesson('published');
    });

    container.querySelector('#btn-revert-changes')?.addEventListener('click', () => {
      handleRevertLesson();
    });

    // Bind Tab Switching
    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        visitedTabs.add(activeTab);
        render();
      });
    });

    const body = container.querySelector('#lesson-tab-body');

    if (activeTab === 'explore') {
      body.innerHTML = renderExploreTab();
      bindExploreEvents(body);
    } else if (activeTab === 'vocab') {
      body.innerHTML = renderVocabTab();
      bindVocabEvents(body);
    } else if (activeTab === 'structure') {
      body.innerHTML = renderStructureTab();
      bindStructureEvents(body);
    } else if (activeTab === 'practice') {
      body.innerHTML = renderPracticeTab();
      bindPracticeEvents(body);
    }
  }

  // --- EVENT BINDINGS FOR ALL TABS ---
  function bindExploreEvents(body) {
    if (isEditMode && isTeacher) {
      body.querySelector('#btn-exp-save-quick')?.addEventListener('click', () => {
        saveExploreEditorState(body);
        alert('🎉 Đã cập nhật nội dung Explore trong bộ nhớ!');
      });

      // Upload local image for main explore illustration
      body.querySelector('#exp-file-main-img')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const res = await uploadAdminAsset({ filename: file.name, fileData: reader.result, mimeType: file.type });
            if (res && res.url) {
              saveExploreEditorState(body);
              if (!lesson.explore) lesson.explore = {};
              lesson.explore.mainImage = res.url;
              render();
            }
          } catch (err) {
            alert('Lỗi tải ảnh: ' + err.message);
          }
        };
        reader.readAsDataURL(file);
      });

      // Preset images for explore
      body.querySelectorAll('[data-exp-preset-img]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveExploreEditorState(body);
          if (!lesson.explore) lesson.explore = {};
          lesson.explore.mainImage = btn.dataset.expPresetImg;
          render();
        });
      });

      // Reset to default Canva image
      body.querySelector('#btn-exp-reset-img')?.addEventListener('click', () => {
        saveExploreEditorState(body);
        if (!lesson.explore) lesson.explore = {};
        lesson.explore.mainImage = '/assets/topics-library/geometry-measurement/geometry-measurement-bg.png';
        render();
      });

      body.querySelector('#btn-add-dialogue-line')?.addEventListener('click', () => {
        saveExploreEditorState(body);
        if (!lesson.explore.dialogues) lesson.explore.dialogues = [];
        lesson.explore.dialogues.push({
          speaker: 'MathBuddy AI',
          avatar: 'robot',
          en: 'New dialogue line in English...',
          vi: 'Lời thoại mới bằng tiếng Việt...',
          audioUrl: ''
        });
        render();
      });

      body.querySelectorAll('[data-exp-d-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveExploreEditorState(body);
          const idx = parseInt(btn.dataset.expDDel, 10);
          lesson.explore.dialogues.splice(idx, 1);
          render();
        });
      });

      body.querySelectorAll('[data-exp-d-up]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveExploreEditorState(body);
          const idx = parseInt(btn.dataset.expDUp, 10);
          if (idx > 0 && lesson.explore.dialogues) {
            const temp = lesson.explore.dialogues[idx];
            lesson.explore.dialogues[idx] = lesson.explore.dialogues[idx - 1];
            lesson.explore.dialogues[idx - 1] = temp;
            render();
          }
        });
      });

      body.querySelectorAll('[data-exp-d-down]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveExploreEditorState(body);
          const idx = parseInt(btn.dataset.expDDown, 10);
          if (lesson.explore.dialogues && idx < lesson.explore.dialogues.length - 1) {
            const temp = lesson.explore.dialogues[idx];
            lesson.explore.dialogues[idx] = lesson.explore.dialogues[idx + 1];
            lesson.explore.dialogues[idx + 1] = temp;
            render();
          }
        });
      });

      body.querySelectorAll('[data-exp-d-listen]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.expDListen, 10);
          const d = lesson.explore?.dialogues?.[idx];
          const inputEn = body.querySelector(`[data-exp-d-en="${idx}"]`);
          const text = inputEn ? inputEn.value : (d?.en || '');
          if (d?.audioUrl) playAudio(d.audioUrl, text);
          else if (text) speakText(text, selectedAccent);
        });
      });

      body.querySelector('#btn-add-remember-item')?.addEventListener('click', () => {
        saveExploreEditorState(body);
        if (!lesson.explore.remember) lesson.explore.remember = { items: [] };
        if (!lesson.explore.remember.items) lesson.explore.remember.items = [];
        lesson.explore.remember.items.push({
          title: 'New Fact',
          en: '1 km² = 100 ha',
          vi: '1 ki-lô-mét vuông bằng 100 héc-ta'
        });
        render();
      });

      body.querySelectorAll('[data-exp-rem-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveExploreEditorState(body);
          const idx = parseInt(btn.dataset.expRemDel, 10);
          lesson.explore.remember.items.splice(idx, 1);
          render();
        });
      });

      return;
    }

    const exp = lesson.explore || {};
    const dialogues = exp.dialogues || [];

    body.querySelectorAll('[data-speak-dialogue]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.speakDialogue, 10);
        const d = dialogues[idx];
        if (d) playAudio(d.audioUrl, d.en);
      });
    });

    body.querySelector('#btn-listen-all-dialogue')?.addEventListener('click', () => {
      dialogues.forEach((d, idx) => {
        setTimeout(() => playAudio(d.audioUrl, d.en), idx * 3500);
      });
    });

    body.querySelectorAll('[data-qq-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const choiceIdx = parseInt(btn.dataset.qqChoice, 10);
        const qq = exp.quickQuestion;
        const fbEl = body.querySelector('#qq-feedback');
        if (!qq || !fbEl) return;
        const isCorrect = choiceIdx === qq.correctIndex;

        body.querySelectorAll('[data-qq-choice]').forEach(b => {
          b.style.borderColor = '#bae6fd';
          b.style.background = '#f0f9ff';
          b.style.color = '#0369a1';
        });

        if (isCorrect) {
          btn.style.borderColor = '#10b981';
          btn.style.background = '#ecfdf5';
          btn.style.color = '#047857';
        } else {
          btn.style.borderColor = '#ef4444';
          btn.style.background = '#fef2f2';
          btn.style.color = '#b91c1c';
        }

        fbEl.innerHTML = `
          <div style="padding:12px 16px;border-radius:12px;margin-top:14px;background:${isCorrect ? '#ecfdf5' : '#fef2f2'};border:1.5px solid ${isCorrect ? '#10b981' : '#ef4444'};color:${isCorrect ? '#047857' : '#b91c1c'};font-weight:800;font-size:14px;">
            ${isCorrect ? '🎉 Chính xác! ' : '💡 Chưa đúng! '}${escapeAttr(isCorrect ? (qq.explanationVi || qq.explanationEn) : ('3/10 có mẫu số là 10 nên là phân số thập phân.'))}
          </div>
        `;
      });
    });

    body.querySelector('#btn-continue-journey')?.addEventListener('click', () => {
      activeTab = 'vocab';
      visitedTabs.add('vocab');
      render();
    });
  }

  function saveExploreEditorState(body) {
    if (!lesson.explore) lesson.explore = {};
    const exp = lesson.explore;

    const mainImgInput = body.querySelector('#exp-input-main-img');
    const mainCapInput = body.querySelector('#exp-input-main-caption');
    if (mainImgInput) exp.mainImage = mainImgInput.value;
    if (mainCapInput) exp.mainImageCaption = mainCapInput.value;

    if (!exp.dialogues) exp.dialogues = [];
    exp.dialogues.forEach((d, idx) => {
      const spk = body.querySelector(`[data-exp-d-speaker="${idx}"]`);
      const avt = body.querySelector(`[data-exp-d-avatar="${idx}"]`);
      const en = body.querySelector(`[data-exp-d-en="${idx}"]`);
      const vi = body.querySelector(`[data-exp-d-vi="${idx}"]`);
      const aud = body.querySelector(`[data-exp-d-audio="${idx}"]`);
      if (spk) d.speaker = spk.value;
      if (avt) d.avatar = avt.value;
      if (en) d.en = en.value;
      if (vi) d.vi = vi.value;
      if (aud) d.audioUrl = aud.value;
    });

    if (exp.remember && exp.remember.items) {
      exp.remember.items.forEach((item, idx) => {
        const t = body.querySelector(`[data-exp-rem-title="${idx}"]`);
        const en = body.querySelector(`[data-exp-rem-en="${idx}"]`);
        const vi = body.querySelector(`[data-exp-rem-vi="${idx}"]`);
        if (t) item.title = t.value;
        if (en) item.en = en.value;
        if (vi) item.vi = vi.value;
      });
    }

    if (exp.quickQuestion) {
      const qEn = body.querySelector('#exp-qq-en');
      const qVi = body.querySelector('#exp-qq-vi');
      const qExp = body.querySelector('#exp-qq-exp');
      if (qEn) exp.quickQuestion.questionEn = qEn.value;
      if (qVi) exp.quickQuestion.questionVi = qVi.value;
      if (qExp) exp.quickQuestion.explanationVi = qExp.value;

      if (!exp.quickQuestion.choices) exp.quickQuestion.choices = ['', '', '', ''];
      exp.quickQuestion.choices.forEach((c, ci) => {
        const cInp = body.querySelector(`[data-exp-qq-choice="${ci}"]`);
        if (cInp) exp.quickQuestion.choices[ci] = cInp.value;
      });

      const checkedRad = body.querySelector('input[name="exp-qq-correct"]:checked');
      if (checkedRad) exp.quickQuestion.correctIndex = parseInt(checkedRad.value, 10);
    }
  }

  async function startRecordingVocab(v) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Trình duyệt chưa hỗ trợ ghi âm trực tiếp qua microphone.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      recordingVocabId = v.id;

      // Start optional speech recognition if available
      let recognizedTranscript = '';
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          speechRecognizer = new SpeechRec();
          speechRecognizer.lang = selectedAccent === 'US' ? 'en-US' : 'en-GB';
          speechRecognizer.interimResults = false;
          speechRecognizer.maxAlternatives = 1;
          speechRecognizer.onresult = (evt) => {
            if (evt.results && evt.results[0] && evt.results[0][0]) {
              recognizedTranscript = evt.results[0][0].transcript;
            }
          };
          speechRecognizer.start();
        } catch (e) {
          console.warn('SpeechRec start error:', e);
        }
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Strict constraint: Only real assessment service. When unconfigured, NO mock random score.
        vocabRecordedScores[v.id] = {
          status: 'recorded',
          audioUrl,
          score: null,
          transcript: recognizedTranscript || '',
          feedback: 'Pronunciation assessment is not configured yet / Chưa cấu hình dịch vụ đánh giá phát âm'
        };
        recordingVocabId = null;
        render();
      };

      mediaRecorder.start();
      render();
    } catch (err) {
      alert('Không thể truy cập microphone: ' + err.message);
      recordingVocabId = null;
      render();
    }
  }

  function stopRecordingVocab() {
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch {}
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }

  function bindVocabEvents(body) {
    if (isEditMode && isTeacher) {
      body.querySelector('#btn-vocab-save-quick')?.addEventListener('click', () => {
        saveVocabEditorState(body);
        alert('🎉 Đã lưu danh sách từ vựng vào bộ nhớ!');
      });

      // Open AI Builder Drawer
      body.querySelector('#btn-open-ai-vocab-builder')?.addEventListener('click', () => {
        saveVocabEditorState(body);
        isAiVocabModalOpen = true;
        render();
      });

      // Close AI Builder Drawer
      body.querySelector('#btn-close-ai-vocab')?.addEventListener('click', () => {
        isAiVocabModalOpen = false;
        render();
      });

      // Run AI Vocab Generation
      body.querySelector('#btn-run-ai-vocab')?.addEventListener('click', async () => {
        const promptEl = body.querySelector('#ai-vocab-input-prompt');
        const instrEl = body.querySelector('#ai-vocab-input-instr');
        if (promptEl) aiVocabPrompt = promptEl.value;
        if (instrEl) aiVocabInstruction = instrEl.value;

        if (!aiVocabPrompt.trim()) {
          alert('Vui lòng nhập từ hoặc chủ đề cần sinh.');
          return;
        }

        aiVocabLoading = true;
        render();

        try {
          const res = await generateVocabWithAi({ input: aiVocabPrompt, instruction: aiVocabInstruction });
          aiVocabResults = res.words || [];
          selectedAiVocabIds = new Set(aiVocabResults.map(w => w.id));
        } catch (err) {
          alert('Lỗi tạo từ vựng: ' + err.message);
        } finally {
          aiVocabLoading = false;
          render();
        }
      });

      // Toggle AI card selection
      body.querySelectorAll('[data-ai-vocab-check]').forEach(chk => {
        chk.addEventListener('change', () => {
          const id = chk.dataset.aiVocabCheck;
          if (chk.checked) selectedAiVocabIds.add(id);
          else selectedAiVocabIds.delete(id);
          const insertBtn = body.querySelector('#btn-insert-selected-ai-vocab');
          if (insertBtn) {
            insertBtn.textContent = `📥 Chèn các từ đã chọn vào bài học (${selectedAiVocabIds.size} từ)`;
          }
        });
      });

      // Insert Selected AI Vocab into Lesson
      body.querySelector('#btn-insert-selected-ai-vocab')?.addEventListener('click', () => {
        saveVocabEditorState(body);
        if (!lesson.vocab) lesson.vocab = [];
        if (aiVocabResults) {
          const toAdd = aiVocabResults.filter(w => selectedAiVocabIds.has(w.id));
          toAdd.forEach(w => {
            lesson.vocab.push({
              id: w.id || 'v_' + Date.now() + Math.random(),
              en: w.en,
              ipa: w.ipaUk || w.ipa,
              ipaUk: w.ipaUk || w.ipa,
              ipaUs: w.ipaUs || w.ipa,
              vi: w.vi,
              exampleEn: w.exampleEn,
              exampleVi: w.exampleVi,
              imageUrl: '',
              audioUrl: ''
            });
          });
        }
        isAiVocabModalOpen = false;
        aiVocabResults = null;
        alert(`🎉 Đã thêm thành công các từ vựng vào bài học!`);
        render();
      });

      // Add manual vocab
      body.querySelector('#btn-add-vocab-item')?.addEventListener('click', () => {
        saveVocabEditorState(body);
        if (!lesson.vocab) lesson.vocab = [];
        lesson.vocab.push({
          id: 'v_' + Date.now(),
          en: 'New Word',
          ipa: '/.../',
          ipaUk: '/.../',
          ipaUs: '/.../',
          vi: 'Từ mới',
          exampleEn: 'Example sentence in English...',
          exampleVi: 'Ví dụ bằng tiếng Việt...'
        });
        render();
      });

      // Upload image for vocab card
      body.querySelectorAll('[data-v-file-img]').forEach(input => {
        input.addEventListener('change', async (e) => {
          const idx = parseInt(input.dataset.vFileImg, 10);
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const res = await uploadAdminAsset({ filename: file.name, fileData: reader.result, mimeType: file.type });
              if (res && res.url && lesson.vocab[idx]) {
                saveVocabEditorState(body);
                lesson.vocab[idx].imageUrl = res.url;
                render();
              }
            } catch (err) {
              alert('Lỗi tải ảnh: ' + err.message);
            }
          };
          reader.readAsDataURL(file);
        });
      });

      // Preset image for vocab card
      body.querySelectorAll('[data-v-preset-img]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveVocabEditorState(body);
          const idx = parseInt(btn.dataset.vPresetImg, 10);
          const url = btn.dataset.presetUrl;
          if (lesson.vocab[idx]) {
            lesson.vocab[idx].imageUrl = url;
            render();
          }
        });
      });

      // Move vocab up
      body.querySelectorAll('[data-vocab-up]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveVocabEditorState(body);
          const idx = parseInt(btn.dataset.vocabUp, 10);
          if (idx > 0 && lesson.vocab) {
            const temp = lesson.vocab[idx];
            lesson.vocab[idx] = lesson.vocab[idx - 1];
            lesson.vocab[idx - 1] = temp;
            render();
          }
        });
      });

      // Move vocab down
      body.querySelectorAll('[data-vocab-down]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveVocabEditorState(body);
          const idx = parseInt(btn.dataset.vocabDown, 10);
          if (lesson.vocab && idx < lesson.vocab.length - 1) {
            const temp = lesson.vocab[idx];
            lesson.vocab[idx] = lesson.vocab[idx + 1];
            lesson.vocab[idx + 1] = temp;
            render();
          }
        });
      });

      // Test listen
      body.querySelectorAll('[data-vocab-listen-test]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.vocabListenTest, 10);
          const v = lesson.vocab[idx];
          if (v) playAudio(v.audioUrl, v.en);
        });
      });

      // Delete vocab
      body.querySelectorAll('[data-vocab-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveVocabEditorState(body);
          const idx = parseInt(btn.dataset.vocabDel, 10);
          lesson.vocab.splice(idx, 1);
          render();
        });
      });

      return;
    }

    // Student View events
    const vocabList = lesson.vocab || [];

    body.querySelector('#btn-accent-uk')?.addEventListener('click', () => {
      selectedAccent = 'UK';
      render();
    });
    body.querySelector('#btn-accent-us')?.addEventListener('click', () => {
      selectedAccent = 'US';
      render();
    });

    body.querySelectorAll('[data-listen-vocab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.listenVocab, 10);
        const v = vocabList[idx];
        if (v) {
          if (v.audioUrl) {
            playAudio(v.audioUrl, v.en);
          } else {
            speakText(`${v.en}. ${v.exampleEn || ''}`, selectedAccent);
          }
        }
      });
    });

    body.querySelectorAll('[data-record-vocab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.recordVocab, 10);
        const v = vocabList[idx];
        if (v) startRecordingVocab(v);
      });
    });

    body.querySelector('#btn-stop-record-vocab')?.addEventListener('click', () => {
      stopRecordingVocab();
    });
  }

  function saveVocabEditorState(body) {
    if (!lesson.vocab) lesson.vocab = [];
    lesson.vocab.forEach((v, idx) => {
      const en = body.querySelector(`[data-v-en="${idx}"]`);
      const ipauk = body.querySelector(`[data-v-ipauk="${idx}"]`);
      const ipaus = body.querySelector(`[data-v-ipaus="${idx}"]`);
      const vi = body.querySelector(`[data-v-vi="${idx}"]`);
      const exen = body.querySelector(`[data-v-exen="${idx}"]`);
      const exvi = body.querySelector(`[data-v-exvi="${idx}"]`);
      const urlImg = body.querySelector(`[data-v-url-img="${idx}"]`);
      const audio = body.querySelector(`[data-v-audio="${idx}"]`);
      if (en) v.en = en.value;
      if (ipauk) v.ipaUk = ipauk.value;
      if (ipaus) v.ipaUs = ipaus.value;
      if (ipauk || ipaus) v.ipa = ipauk ? ipauk.value : ipaus.value;
      if (vi) v.vi = vi.value;
      if (exen) v.exampleEn = exen.value;
      if (exvi) v.exampleVi = exvi.value;
      if (urlImg) v.imageUrl = urlImg.value;
      if (audio) v.audioUrl = audio.value;
    });
  }

  function bindStructureEvents(body) {
    if (isEditMode && isTeacher) {
      body.querySelector('#btn-struct-save-quick')?.addEventListener('click', () => {
        saveStructureEditorState(body);
        alert('🎉 Đã lưu danh sách Mẫu câu vào bộ nhớ!');
      });

      body.querySelector('#btn-open-ai-structure-builder')?.addEventListener('click', () => {
        saveStructureEditorState(body);
        isAiStructureModalOpen = true;
        render();
      });

      body.querySelector('#btn-close-ai-structure')?.addEventListener('click', () => {
        isAiStructureModalOpen = false;
        render();
      });

      body.querySelector('#btn-run-ai-structure')?.addEventListener('click', async () => {
        const promptEl = body.querySelector('#ai-struct-input-prompt');
        if (promptEl) aiStructurePrompt = promptEl.value;

        aiStructureLoading = true;
        render();

        try {
          const res = await generateStructureWithAi({ prompt: aiStructurePrompt, unitId: lesson.unitId || 'ha-km2' });
          aiStructureResults = res.structures || [];
          selectedAiStructureIds = new Set(aiStructureResults.map(s => s.id));
        } catch (err) {
          alert('Lỗi tạo mẫu câu: ' + err.message);
        } finally {
          aiStructureLoading = false;
          render();
        }
      });

      body.querySelectorAll('[data-ai-struct-check]').forEach(chk => {
        chk.addEventListener('change', () => {
          const id = chk.dataset.aiStructCheck;
          if (chk.checked) selectedAiStructureIds.add(id);
          else selectedAiStructureIds.delete(id);
          const insertBtn = body.querySelector('#btn-insert-selected-ai-structure');
          if (insertBtn) {
            insertBtn.textContent = `📥 Chèn các mẫu câu đã chọn vào bài học (${selectedAiStructureIds.size} mẫu)`;
          }
        });
      });

      body.querySelector('#btn-insert-selected-ai-structure')?.addEventListener('click', () => {
        saveStructureEditorState(body);
        if (!lesson.structures) lesson.structures = [];
        if (aiStructureResults) {
          const toAdd = aiStructureResults.filter(s => selectedAiStructureIds.has(s.id));
          toAdd.forEach(s => {
            lesson.structures.push({
              patternEn: s.patternEn,
              patternVi: s.patternVi,
              en: s.en,
              vi: s.vi,
              noteVi: s.noteVi
            });
          });
        }
        isAiStructureModalOpen = false;
        aiStructureResults = null;
        alert('🎉 Đã thêm thành công các mẫu câu vào bài học!');
        render();
      });

      body.querySelector('#btn-add-struct-item')?.addEventListener('click', () => {
        saveStructureEditorState(body);
        if (!lesson.structures) lesson.structures = [];
        lesson.structures.push({
          patternEn: 'The area of [Object] is [Number] [Unit].',
          patternVi: 'Diện tích của [Đối tượng] là [Số] [Đơn vị].',
          en: 'New sentence pattern in English...',
          vi: 'Mẫu câu mới bằng tiếng Việt...',
          noteVi: 'Ghi chú ngữ pháp...'
        });
        render();
      });

      body.querySelectorAll('[data-struct-up]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveStructureEditorState(body);
          const idx = parseInt(btn.dataset.structUp, 10);
          if (idx > 0 && lesson.structures) {
            const temp = lesson.structures[idx];
            lesson.structures[idx] = lesson.structures[idx - 1];
            lesson.structures[idx - 1] = temp;
            render();
          }
        });
      });

      body.querySelectorAll('[data-struct-down]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveStructureEditorState(body);
          const idx = parseInt(btn.dataset.structDown, 10);
          if (lesson.structures && idx < lesson.structures.length - 1) {
            const temp = lesson.structures[idx];
            lesson.structures[idx] = lesson.structures[idx + 1];
            lesson.structures[idx + 1] = temp;
            render();
          }
        });
      });

      body.querySelectorAll('[data-struct-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveStructureEditorState(body);
          const idx = parseInt(btn.dataset.structDel, 10);
          lesson.structures.splice(idx, 1);
          render();
        });
      });

      body.querySelectorAll('[data-struct-listen-test]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.structListenTest, 10);
          const s = lesson.structures[idx];
          if (s) speakText(s.en);
        });
      });

      return;
    }

    // Student view
    const structList = lesson.structures || [];
    const objSel = body.querySelector('#sc-select-object');
    const numSel = body.querySelector('#sc-select-number');
    const unitSel = body.querySelector('#sc-select-unit');

    function updateSentenceConstructor() {
      if (objSel) {
        const parts = objSel.value.split('|');
        sentenceConstructorState.objectEn = parts[0];
        sentenceConstructorState.objectVi = parts[1];
      }
      if (numSel) sentenceConstructorState.number = numSel.value;
      if (unitSel) {
        const parts = unitSel.value.split('|');
        sentenceConstructorState.unitEn = parts[0];
        sentenceConstructorState.unitVi = parts[1];
      }

      const dispObj = body.querySelector('#slot-object-display');
      const dispNum = body.querySelector('#slot-number-display');
      const dispUnit = body.querySelector('#slot-unit-display');
      const dispVi = body.querySelector('#pattern-vi-display');

      if (dispObj) dispObj.textContent = sentenceConstructorState.objectEn;
      if (dispNum) dispNum.textContent = sentenceConstructorState.number;
      if (dispUnit) dispUnit.textContent = sentenceConstructorState.unitEn;
      if (dispVi) {
        dispVi.textContent = `Nghĩa: Diện tích của ${sentenceConstructorState.objectVi} là ${sentenceConstructorState.number} ${sentenceConstructorState.unitVi}.`;
      }
    }

    [objSel, numSel, unitSel].forEach(sel => {
      sel?.addEventListener('change', updateSentenceConstructor);
    });

    body.querySelector('#btn-speak-constructed-sentence')?.addEventListener('click', () => {
      const sentence = `The area of ${sentenceConstructorState.objectEn} is ${sentenceConstructorState.number} ${sentenceConstructorState.unitEn}.`;
      speakText(sentence, selectedAccent);
    });

    body.querySelector('#btn-listen-example-forest')?.addEventListener('click', () => {
      speakText('The area of the forest is 950 square kilometres.', selectedAccent);
    });

    body.querySelectorAll('[data-speak-struct]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.speakStruct, 10);
        const s = structList[idx];
        if (s) speakText(s.en, selectedAccent);
      });
    });
  }

  function saveStructureEditorState(body) {
    if (!lesson.structures) lesson.structures = [];
    lesson.structures.forEach((s, idx) => {
      const patten = body.querySelector(`[data-s-patten="${idx}"]`);
      const pattvi = body.querySelector(`[data-s-pattvi="${idx}"]`);
      const en = body.querySelector(`[data-s-en="${idx}"]`);
      const vi = body.querySelector(`[data-s-vi="${idx}"]`);
      const notevi = body.querySelector(`[data-s-notevi="${idx}"]`);
      const noteen = body.querySelector(`[data-s-noteen="${idx}"]`);
      if (patten) s.patternEn = patten.value;
      if (pattvi) s.patternVi = pattvi.value;
      if (en) s.en = en.value;
      if (vi) s.vi = vi.value;
      if (notevi) s.noteVi = notevi.value;
      if (noteen) s.noteEn = noteen.value;
    });
  }

  function bindPracticeEvents(body) {
    const questions = lesson.practice || [];

    // Toggle AI Studio
    body.querySelector('#btn-toggle-ai-studio')?.addEventListener('click', () => {
      studioState.isOpen = !studioState.isOpen;
      render();
    });
    body.querySelector('#btn-toggle-ai-studio-demo')?.addEventListener('click', () => {
      studioState.isOpen = !studioState.isOpen;
      render();
    });
    body.querySelector('#btn-close-ai-studio')?.addEventListener('click', () => {
      studioState.isOpen = false;
      render();
    });

    body.querySelector('#btn-toggle-manual-practice-editor')?.addEventListener('click', () => {
      isEditMode = !isEditMode;
      render();
    });

    // --- INTERACTIVE TASK 1 MATCHING EVENT HANDLERS ---
    body.querySelectorAll('[data-match-left]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = parseInt(btn.dataset.matchLeft, 10);
        const leftIdx = parseInt(btn.dataset.leftIdx, 10);
        matchingSelectedLeft[qIdx] = leftIdx;
        render();
      });
    });

    body.querySelectorAll('[data-match-right]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = parseInt(btn.dataset.matchRight, 10);
        const rightIdx = parseInt(btn.dataset.rightIdx, 10);
        const leftSelected = matchingSelectedLeft[qIdx];
        if (leftSelected !== undefined) {
          if (!matchingUserPairs[qIdx]) matchingUserPairs[qIdx] = {};
          matchingUserPairs[qIdx][leftSelected] = rightIdx;
          matchingSelectedLeft[qIdx] = null;
          render();
        }
      });
    });

    body.querySelectorAll('[data-match-reset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = parseInt(btn.dataset.matchReset, 10);
        matchingUserPairs[qIdx] = {};
        matchingSelectedLeft[qIdx] = null;
        matchingChecked[qIdx] = false;
        render();
      });
    });

    body.querySelectorAll('[data-match-check]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = parseInt(btn.dataset.matchCheck, 10);
        matchingChecked[qIdx] = true;
        render();
      });
    });

    // --- INTERACTIVE TASK 2 FILL BLANK EVENT HANDLERS ---
    body.querySelectorAll('[data-fill-item]').forEach(input => {
      input.addEventListener('input', (e) => {
        const qIdx = parseInt(input.dataset.fillItem, 10);
        const itemId = input.dataset.itemId;
        if (!fillAnswers[qIdx]) fillAnswers[qIdx] = {};
        fillAnswers[qIdx][itemId] = e.target.value;
      });
    });

    body.querySelectorAll('[data-fill-check]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = parseInt(btn.dataset.fillCheck, 10);
        fillChecked[qIdx] = true;
        render();
      });
    });

    // --- INTERACTIVE TASK 3 AREA COMPARISON EVENT HANDLERS ---
    body.querySelectorAll('[data-area-land-select]').forEach(card => {
      card.addEventListener('click', () => {
        const qIdx = parseInt(card.dataset.areaLandSelect, 10);
        const landId = card.dataset.landId;
        areaSelectedLand[qIdx] = landId;
        render();
      });
    });

    body.querySelectorAll('[data-area-check]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = parseInt(btn.dataset.areaCheck, 10);
        areaChecked[qIdx] = true;
        render();
      });
    });

    // AI Studio File Upload & Analyze
    const fileTrigger = body.querySelector('#btn-trigger-studio-file');
    const fileInput = body.querySelector('#studio-file-input');

    fileTrigger?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        studioState.uploadedImages.push({ name: file.name, data: reader.result, mime: file.type });
        render();
      };
      reader.readAsDataURL(file);
    });

    body.querySelector('#btn-start-ai-analyze')?.addEventListener('click', async () => {
      if (studioState.uploadedImages.length === 0) return;
      studioState.currentStep = 2;
      render();

      try {
        const imgObj = studioState.uploadedImages[0];
        const teacherPrompt = body.querySelector('#studio-teacher-prompt')?.value || '';

        const res = await analyzeExerciseImage({
          imageData: imgObj.data,
          mimeType: imgObj.mime,
          filename: imgObj.name,
          promptInstruction: teacherPrompt
        }).catch(() => null);

        studioState.extractedResult = res && res.result ? res.result : null;

        setTimeout(() => {
          studioState.currentStep = 3;
          render();
        }, 1200);
      } catch (err) {
        alert('Lỗi phân tích AI: ' + err.message);
      }
    });

    body.querySelector('#btn-goto-student-preview')?.addEventListener('click', () => {
      studioState.currentStep = 4;
      render();
    });

    body.querySelector('#btn-back-to-edit')?.addEventListener('click', () => {
      studioState.currentStep = 3;
      render();
    });

    body.querySelector('#btn-publish-ai-exercises')?.addEventListener('click', async () => {
      if (!studioState.extractedResult) return;
      try {
        const newQuestions = studioState.extractedResult.questions || [];
        lesson.practice = newQuestions;

        await saveLearningMaterial({
          topicId: 'chapter4',
          unitId: 'ha-km2',
          titleEn: studioState.extractedResult.titleEn || 'Hectare & Square Kilometre AI Exercises',
          titleVi: studioState.extractedResult.titleVi || 'Bài tập AI Héc-ta & Ki-lô-mét vuông',
          type: 'ai_exercise_set',
          questions: newQuestions,
          status: 'published'
        });
        alert('🎉 Đã xuất bản thành công bộ 3 Task bài gốc vào hệ thống!');
        studioState.isOpen = false;
        render();
      } catch (err) {
        alert('Lỗi xuất bản: ' + err.message);
      }
    });

    // Generic MCQ checks
    body.querySelectorAll('[data-pq-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = parseInt(btn.dataset.pqIdx, 10);
        const choiceIdx = parseInt(btn.dataset.choiceIdx, 10);
        const q = questions[qIdx];
        if (!q) return;

        const isCorrect = choiceIdx === q.correctIndex;
        const fb = body.querySelector(`#pq-fb-${qIdx}`);
        if (fb) {
          fb.innerHTML = `
            <div style="padding:10px;border-radius:10px;margin-top:8px;background:${isCorrect ? '#ECFDF5' : '#FEF2F2'};color:${isCorrect ? '#065F46' : '#991B1B'};font-weight:800;">
              ${isCorrect ? '🎉 Chính xác!' : '💡 Chưa chính xác.'} ${escapeAttr(q.explanationVi || q.explanationEn)}
            </div>
          `;
        }
      });
    });
  }

  function escapeAttr(val) {
    return String(val || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  hydrateLessonFromServer();
  render();
  return container;
}

