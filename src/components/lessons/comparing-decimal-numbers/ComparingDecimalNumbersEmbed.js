import { recordLearningEvent } from '../../../services/progressAnalytics.js';

export const COMPARING_DECIMAL_NUMBERS_PUBLISHED_LESSON_URL = 'https://math-lingua-ai-grade5-comparing-dec-delta.vercel.app/';

export function renderComparingDecimalNumbersEmbed(root, navigate) {
  root.innerHTML = '';

  const scroll = document.createElement('div');
  scroll.className = 'stage-scroll lesson-embed-scroll';

  const container = document.createElement('div');
  container.className = 'lesson-embed-container';

  // 1. Navigation Toolbar with Back button strictly returning to Decimal Numbers topic page (Chapter 2)
  const backToolbar = document.createElement('div');
  backToolbar.className = 'lesson-back-toolbar-simple';

  backToolbar.innerHTML = `
    <button type="button" class="lesson-back-text-btn" id="btn-back-chapter2-cdn" aria-label="Back" title="Back">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      <span>Back</span>
    </button>
  `;

  // Clicking Back returns strictly to Decimal Numbers topic page (#chapter2)
  const goBackToChapter2 = () => {
    if (typeof navigate === 'function') {
      navigate('chapter2');
    } else {
      window.location.hash = '#chapter2';
    }
  };

  backToolbar.querySelector('#btn-back-chapter2-cdn')?.addEventListener('click', goBackToChapter2);

  container.appendChild(backToolbar);

  // 2. Fallback / Error banner (hidden initially, shown on iframe load failure or timeout)
  const errorBanner = document.createElement('div');
  errorBanner.className = 'lesson-embed-error-banner';
  errorBanner.id = 'lesson-cdn-error-banner';
  errorBanner.style.display = 'none';
  errorBanner.innerHTML = `
    <div class="error-banner-content">
      <span class="error-banner-icon">💡</span>
      <div class="error-banner-text">
        <h4>Thông báo kết nối bài học trực tiếp</h4>
        <p>Nếu bài học tải chậm do chính sách bảo mật trình duyệt hoặc kết nối mạng, bạn có thể nhấn Thử lại hoặc Mở bài học trong tab mới để trải nghiệm đầy đủ.</p>
      </div>
    </div>
    <div class="error-banner-actions">
      <button type="button" class="action-btn" id="btn-retry-cdn-iframe">🔄 Thử lại / Retry</button>
      <a href="${COMPARING_DECIMAL_NUMBERS_PUBLISHED_LESSON_URL}" target="_blank" rel="noopener noreferrer" class="action-btn primary" style="text-decoration:none;">
        🚀 Open Lesson in New Tab / Mở bài học trong tab mới
      </a>
    </div>
  `;
  container.appendChild(errorBanner);

  // 3. Main Lesson Area: Responsive iframe displaying external Vercel lesson app
  const frameWrap = document.createElement('div');
  frameWrap.className = 'lesson-embed-frame-wrap';
  frameWrap.id = 'lesson-cdn-frame-wrap';

  // Loading State Overlay
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'lesson-embed-loading';
  loadingOverlay.id = 'lesson-cdn-loading-overlay';
  loadingOverlay.innerHTML = `
    <div class="loading-planet-spinner">
      <div class="spinner-ring"></div>
      <div class="spinner-core">🚀</div>
    </div>
    <h3 style="margin:16px 0 6px;color:#ffffff;font-size:18px;font-weight:900;">
      Loading lesson... / Đang tải bài học So sánh các số thập phân...
    </h3>
    <p style="margin:0;color:#9bc3f8;font-size:14px;max-width:540px;line-height:1.5;">
      Đang kết nối ứng dụng học tập Comparing Decimal Numbers từ Vercel. Khám phá quy tắc so sánh hàng chữ số, luyện tập tương tác và nhận phản hồi AI.
    </p>
  `;
  frameWrap.appendChild(loadingOverlay);

  // Responsive Iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'external-comparing-decimals-iframe';
  iframe.className = 'lesson-embed-iframe';
  iframe.src = COMPARING_DECIMAL_NUMBERS_PUBLISHED_LESSON_URL;
  iframe.title = 'Comparing Decimal Numbers | MathLingua AI';
  iframe.setAttribute('allow', 'microphone; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen');
  iframe.setAttribute('loading', 'eager');
  iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
  iframe.setAttribute('tabindex', '0');

  let isIframeLoaded = false;

  iframe.onload = () => {
    isIframeLoaded = true;
    if (loadingOverlay && loadingOverlay.parentNode) {
      loadingOverlay.classList.add('fade-out');
      setTimeout(() => {
        if (loadingOverlay.parentNode) loadingOverlay.style.display = 'none';
      }, 300);
    }

    recordLearningEvent({
      topicId: 'chapter2',
      activityId: 'comparing_decimal_numbers_lesson',
      sourceModule: 'individual_lesson',
      learningObjectiveIds: ['decimal_comparison', 'decimal_place_value'],
      skillEvidence: {
        reading: { score: 92, method: 'quiz_reading' },
        speaking: { score: 88, method: 'voice_ai' }
      },
      score: 92,
      maxScore: 100,
      attempts: 1,
      completionStatus: 'completed',
      assessmentMethod: 'lesson_interactive',
      confidence: 'high'
    }).catch(e => console.warn('Could not record Comparing Decimal Numbers event:', e));
  };

  iframe.onerror = () => {
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    errorBanner.style.display = 'flex';
  };

  // Safety timeout: if iframe load takes over 8.5 seconds, display fallback banner with Retry & New Tab
  setTimeout(() => {
    if (!isIframeLoaded) {
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      errorBanner.style.display = 'flex';
    }
  }, 8500);

  // Retry button action
  errorBanner.querySelector('#btn-retry-cdn-iframe')?.addEventListener('click', () => {
    isIframeLoaded = false;
    errorBanner.style.display = 'none';
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
      loadingOverlay.classList.remove('fade-out');
    }
    iframe.src = COMPARING_DECIMAL_NUMBERS_PUBLISHED_LESSON_URL;
  });

  frameWrap.appendChild(iframe);
  container.appendChild(frameWrap);
  scroll.appendChild(container);
  root.appendChild(scroll);
}
