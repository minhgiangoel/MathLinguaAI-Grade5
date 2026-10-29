/**
 * AntsFoodQuestEmbed.js
 * Embedded Vercel Iframe Component for Ants Food Quest Game in Math Lab (MathLingua AI)
 */

export const ANTS_FOOD_QUEST_URL = 'https://math-lingua-ai-grade5-ant-game-one.vercel.app/';

export function renderAntsFoodQuestEmbed(root, navigate) {
  root.innerHTML = '';

  const scroll = document.createElement('div');
  scroll.className = 'stage-scroll lesson-embed-scroll';

  const container = document.createElement('div');
  container.className = 'lesson-embed-container';

  // 1. Navigation Toolbar with Back button returning strictly to Math Lab (#mathlab)
  const backToolbar = document.createElement('div');
  backToolbar.className = 'lesson-back-toolbar-simple';
  backToolbar.innerHTML = `
    <button type="button" class="lesson-back-text-btn" id="btn-back-mathlab-afq" aria-label="Back" title="Back">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      <span>Back</span>
    </button>
  `;

  // Clicking Back button returns strictly to Math Lab page (mathlab / #mathlab)
  backToolbar.querySelector('#btn-back-mathlab-afq')?.addEventListener('click', () => {
    if (typeof navigate === 'function') {
      navigate('mathlab');
    } else {
      window.location.hash = '#mathlab';
    }
  });

  container.appendChild(backToolbar);

  // 2. Fallback / Error banner (hidden initially, shown on iframe load failure or timeout)
  const errorBanner = document.createElement('div');
  errorBanner.className = 'lesson-embed-error-banner';
  errorBanner.id = 'game-afq-error-banner';
  errorBanner.style.display = 'none';
  errorBanner.innerHTML = `
    <div class="error-banner-content">
      <span class="error-banner-icon">💡</span>
      <div class="error-banner-text">
        <h4>Thông báo kết nối trò chơi trực tiếp</h4>
        <p>Nếu trò chơi tải chậm do chính sách bảo mật trình duyệt hoặc kết nối mạng, bạn có thể nhấn Thử lại hoặc Mở trò chơi trong tab mới để trải nghiệm đầy đủ.</p>
      </div>
    </div>
    <div class="error-banner-actions">
      <button type="button" class="action-btn" id="btn-retry-afq-iframe">🔄 Thử lại / Retry</button>
      <a href="${ANTS_FOOD_QUEST_URL}" target="_blank" rel="noopener noreferrer" class="action-btn primary" style="text-decoration:none;">
        🚀 Open Game in New Tab / Mở trò chơi trong tab mới
      </a>
    </div>
  `;
  container.appendChild(errorBanner);

  // 3. Main Game Area: Responsive iframe displaying external Vercel game app
  const frameWrap = document.createElement('div');
  frameWrap.className = 'lesson-embed-frame-wrap';
  frameWrap.id = 'game-afq-frame-wrap';

  // Loading State Overlay
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'lesson-embed-loading';
  loadingOverlay.id = 'game-afq-loading-overlay';
  loadingOverlay.innerHTML = `
    <div class="loading-planet-spinner">
      <div class="spinner-ring"></div>
      <div class="spinner-core">🐜</div>
    </div>
    <h3 style="margin:16px 0 6px;color:#ffffff;font-size:18px;font-weight:900;">
      Loading game... / Đang tải trò chơi Ants Food Quest...
    </h3>
    <p style="margin:0;color:#9bc3f8;font-size:14px;max-width:540px;line-height:1.5;">
      Đang kết nối trò chơi Ants Food Quest – Kiến tha mồi từ Math Lab.
    </p>
  `;
  frameWrap.appendChild(loadingOverlay);

  // Responsive Iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'external-ants-food-quest-iframe';
  iframe.className = 'lesson-embed-iframe';
  iframe.src = ANTS_FOOD_QUEST_URL;
  iframe.title = 'Ants Food Quest | MathLab';
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
  errorBanner.querySelector('#btn-retry-afq-iframe')?.addEventListener('click', () => {
    isIframeLoaded = false;
    errorBanner.style.display = 'none';
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
      loadingOverlay.classList.remove('fade-out');
    }
    iframe.src = ANTS_FOOD_QUEST_URL;
  });

  frameWrap.appendChild(iframe);
  container.appendChild(frameWrap);
  scroll.appendChild(container);
  root.appendChild(scroll);
}
