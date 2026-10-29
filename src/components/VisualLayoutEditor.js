/**
 * MathLingua AI — Visual Layout Editor (In-Situ Admin/Teacher Layout Engine)
 * Features:
 * - In-situ visual editing on current page (Home, Topics, Chapter pages, Lessons)
 * - True Canvas Rendering: Renders exact background artwork and real page layers crisply (no blur, no dark overlay)
 * - 8-point transform handles (drag, resize, shift for aspect-ratio)
 * - Responsive device breakpoint switcher (Desktop 1440px, Tablet 768px, Mobile 390px)
 * - Real-time sync between visual layer and click target
 * - Layer panel with z-index reordering, lock, hide/show, duplicate, delete
 * - Inspector panel with precise numerical X, Y, W, H, opacity, z-index, route target, asset picker
 * - Undo / Redo history stack (25 steps)
 * - Full Toolbar Controls: Save Draft, Apply Changes (Publish), Close Editor, Reset, Add Layer, Student Preview
 * - Save Status Indicator: Saved, Unsaved Changes, Saving..., Save Failed
 * - Exit flow with unsaved changes confirmation dialog (Save & Exit, Discard, Cancel)
 * - Non-destructive layout persistence via backend API
 */

import { fetchPageLayout, savePageLayout, resetPageLayout } from '../services/firebaseAuth.js';

export class VisualLayoutEditor {
  constructor({
    pageId,
    stageElement,
    currentUser,
    onNavigate,
    onLayoutChange,
    onClose
  }) {
    this.pageId = pageId;
    this.stage = stageElement;
    this.currentUser = currentUser;
    this.onNavigate = onNavigate;
    this.onLayoutChange = onLayoutChange;
    this.onClose = onClose;

    this.stageOriginalParent = null;
    this.stageNextSibling = null;
    this.initialLayersSnapshot = null;
    this.hasUnsavedChanges = false;
    this.saveStatus = 'saved'; // 'saved' | 'unsaved' | 'saving' | 'failed'

    this.selectedLayerId = null;
    this.layers = {}; // id -> layer config
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 25;
    this.isStudentPreview = false;
    this.deviceMode = 'desktop'; // 'desktop' | 'tablet' | 'mobile'
    this.aspectRatioLocked = false;
    this.activeInteraction = null; // 'drag' | 'resize'
    this.activeHandle = null;

    this.root = null;
    this.overlay = null;
    this.selectionBox = null;
    this.layerListEl = null;
    this.inspectorEl = null;
    this.statusPillEl = null;

    this.init();
  }

  async init() {
    this.buildEditorUI();
    this.scanPageLayers();
    await this.loadPersistedLayout();
    this.initialLayersSnapshot = JSON.stringify(this.layers);
    this.bindEvents();
    this.recordState('Trạng thái ban đầu');
    this.setSaveStatus('saved');
  }

  // Scan all elements in the current stage that are marked with data-layout-layer or suitable interactive elements
  scanPageLayers() {
    const layerElements = this.stage.querySelectorAll('[data-layout-layer]');
    layerElements.forEach(el => {
      const id = el.getAttribute('data-layout-layer');
      if (!id) return;

      const title = el.getAttribute('data-layer-title') || this.humanizeLayerId(id);
      const type = el.getAttribute('data-layer-type') || (el.tagName === 'BUTTON' ? 'button' : (el.tagName === 'IMG' ? 'image' : 'container'));
      const route = el.getAttribute('data-route') || '';
      const img = el.querySelector('img') || (el.tagName === 'IMG' ? el : null);
      const assetUrl = img ? img.getAttribute('src') || '' : '';

      // Force eager loading for crisp canvas rendering
      if (img) img.loading = 'eager';

      // Read computed/inline positioning relative to offset parent or stage
      const rect = el.getBoundingClientRect();
      const parent = el.offsetParent || this.stage;
      const parentRect = parent.getBoundingClientRect();
      const widthPct = parentRect.width > 0 ? (rect.width / parentRect.width) * 100 : 20;
      const heightPct = parentRect.height > 0 ? (rect.height / parentRect.height) * 100 : 15;
      const leftPct = parentRect.width > 0 ? ((rect.left - parentRect.left) / parentRect.width) * 100 : 0;
      const topPct = parentRect.height > 0 ? ((rect.top - parentRect.top) / parentRect.height) * 100 : 0;

      const computed = window.getComputedStyle(el);
      const zIndex = parseInt(computed.zIndex, 10) || (type === 'background' ? 1 : 10);
      const opacity = Math.round(parseFloat(computed.opacity || 1) * 100);
      const visible = computed.display !== 'none' && computed.visibility !== 'hidden';

      if (!this.layers[id]) {
        this.layers[id] = {
          id,
          title,
          type,
          x: Math.round(leftPct * 10) / 10,
          y: Math.round(topPct * 10) / 10,
          width: Math.round(widthPct * 10) / 10,
          height: Math.round(heightPct * 10) / 10,
          unit: '%',
          zIndex,
          opacity,
          visible,
          locked: type === 'background',
          route,
          assetUrl,
          objectFit: 'contain',
          isCustom: false
        };
      }
    });

    this.renderLayerList();
  }

  humanizeLayerId(id) {
    const map = {
      'topics-bg': 'Nền Thư viện chủ đề (Canva Artwork)',
      'topics-grid-zone': 'Khu vực 4 chủ đề kiến thức',
      'btn-fraction': 'Nút Phân số (Fraction Planet)',
      'btn-decimals': 'Nút Số thập phân (Decimal Planet)',
      'btn-ratio': 'Nút Tỉ số & Phần trăm (Ratio Planet)',
      'btn-geometry': 'Nút Hình học & Đo lường (Geometry Planet)',
      'home-bg': 'Nền Trang chủ (Home Artwork)',
      'home-logo': 'Biểu trưng MathLingua AI',
      'home-start-btn': 'Nút Bắt đầu hành trình',
      'chapter1-bg': 'Nền Phân số (Chapter 1 Canva Artwork)',
      'chapter1-back-btn': 'Nút Quay lại thư viện',
      'chapter1-units-zone': 'Khu vực bài học Phân số',
      'btn-mixed-numbers': 'Bài học Hỗn số (Mixed Numbers)',
      'btn-decimal-fractions': 'Bài học Phân số thập phân (Decimal Fractions)',
      'chapter2-bg': 'Nền Số thập phân (Chapter 2 Canva Artwork)',
      'chapter2-back-btn': 'Nút Quay lại thư viện (Chapter 2)',
      'chapter2-units-zone': 'Khu vực bài học Số thập phân',
      'btn-decimal-numbers': 'Bài 1: Số thập phân (Decimal Numbers)',
      'btn-comparing-decimals': 'Bài 2: So sánh số thập phân (Comparing Decimals)',
      'btn-writing-length': 'Bài 3: Viết số đo độ dài dạng STP (Writing Length)',
      'btn-writing-weight': 'Bài 4: Viết số đo khối lượng dạng STP (Writing Weight)',
      'btn-writing-area': 'Bài 5: Viết số đo diện tích dạng STP (Writing Area)',
      'btn-rounding-decimals': 'Bài 6: Làm tròn số thập phân (Rounding Decimals)',
      'btn-operation-decimals': 'Bài 7: Phép tính số thập phân (Operations)',
      'chapter3-bg': 'Nền Tỉ số & Phần trăm (Chapter 3 Canva Artwork)',
      'chapter3-back-btn': 'Nút Quay lại thư viện (Chapter 3)',
      'chapter3-units-zone': 'Khu vực bài học Tỉ số và Phần trăm',
      'btn-c3-ratio': 'Bài 1: Tỉ số (Ratio)',
      'btn-c3-word-ratio': 'Bài 2: Bài toán về tỉ số (Word Problems)',
      'btn-c3-percentage': 'Bài 3: Tỉ số phần trăm (Percentage)',
      'btn-c3-percentage-of-number': 'Bài 4: Tìm giá trị phần trăm của một số (Percentage of a Number)',
      'btn-c3-map-scale': 'Bài 5: Tỉ lệ bản đồ (Map Scale)',
      'geo-bg': 'Nền Hình học (Chapter 4 Artwork)',
      'geo-back-btn': 'Nút Quay lại thư viện',
      'geo-grid': 'Lưới 13 bài học Hình học',
      'mathlab-bg': 'Nền Math Lab (Canva Space Artwork)',
      'mathlab-grid-zone': 'Khu vực trò chơi Math Lab',
      'ml-game-shapes': 'Trò chơi 3D Shape Studio',
      'ml-game-candy': 'Trò chơi Candy Stacker',
      'ml-game-dragdrop': 'Trò chơi Drag and Drop',
      'ml-game-ants': 'Trò chơi Ants Food Quest',
      'ml-game-mixed': 'Trò chơi Mixed Number Adventure',
      'ml-game-pieces': 'Trò chơi Mystery Pieces'
    };
    return map[id] || id.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  async loadPersistedLayout() {
    try {
      const data = await fetchPageLayout(this.pageId, 'draft');
      if (data && data.layers) {
        Object.entries(data.layers).forEach(([id, layerConfig]) => {
          if (this.layers[id]) {
            this.layers[id] = { ...this.layers[id], ...layerConfig };
          } else {
            // Custom added layer
            this.layers[id] = layerConfig;
            this.mountCustomLayerElement(layerConfig);
          }
          this.applyLayerStyles(id);
        });
        this.renderLayerList();
        this.showToast('✅ Đã tải bố cục đã lưu từ máy chủ.', 'info');
      }
    } catch (err) {
      console.warn('Could not load layout:', err);
    }
  }

  buildEditorUI() {
    // Preserve original DOM placement of this.stage
    this.stageOriginalParent = this.stage.parentNode;
    this.stageNextSibling = this.stage.nextSibling;

    this.root = document.createElement('div');
    this.root.className = 'visual-layout-editor-root';
    this.root.id = 'visual-layout-editor';

    this.root.innerHTML = `
      <!-- Top Control Toolbar -->
      <header class="vle-toolbar" role="toolbar" aria-label="Layout Editor Toolbar">
        <div class="vle-toolbar-left">
          <div class="vle-brand-badge">🎨 LAYOUT EDITOR</div>
          <div class="vle-page-pill" title="Mã trang đang chỉnh sửa">
            Trang: <strong>${this.pageId}</strong>
          </div>
          <div class="vle-device-toggle" role="group" aria-label="Chế độ kích thước màn hình">
            <button type="button" class="vle-tool-btn active" data-vle-device="desktop" title="Chế độ Máy tính / Desktop (1440px)">
              🖥️ <span class="vle-btn-label">Desktop</span>
            </button>
            <button type="button" class="vle-tool-btn" data-vle-device="tablet" title="Chế độ Máy tính bảng / Tablet (768px)">
              📱 <span class="vle-btn-label">Tablet</span>
            </button>
            <button type="button" class="vle-tool-btn" data-vle-device="mobile" title="Chế độ Điện thoại / Mobile (390px)">
              📲 <span class="vle-btn-label">Mobile</span>
            </button>
          </div>
        </div>

        <div class="vle-toolbar-center">
          <!-- Save Status Indicator -->
          <div class="vle-save-status-pill saved" id="vle-save-status" title="Trạng thái lưu trữ của bố cục hiện tại">
            <span class="vle-status-dot"></span>
            <span class="vle-status-text">Đã lưu / Saved</span>
          </div>

          <div class="vle-history-controls">
            <button type="button" class="vle-tool-btn" id="vle-btn-undo" title="Hoàn tác (Ctrl+Z)" disabled>
              ↩️ Hoàn tác (<span id="vle-undo-count">0</span>)
            </button>
            <button type="button" class="vle-tool-btn" id="vle-btn-redo" title="Làm lại (Ctrl+Y)" disabled>
              ↪️ Làm lại
            </button>
          </div>

          <button type="button" class="vle-tool-btn danger-subtle" id="vle-btn-reset" title="Khôi phục bố cục mặc định ban đầu của trang">
            🔄 Đặt lại mặc định
          </button>
        </div>

        <div class="vle-toolbar-right">
          <button type="button" class="vle-tool-btn" id="vle-btn-preview-student" title="Xem trước giao diện như học sinh (ẩn khung chọn)">
            👁️ Xem trước
          </button>
          
          <button type="button" class="vle-tool-btn vle-btn-save-draft" id="vle-btn-save-draft" title="Lưu bản nháp bố cục (giữ trên hệ thống để tiếp tục chỉnh sửa)">
            💾 Lưu bản nháp
          </button>

          <button type="button" class="vle-tool-btn primary vle-btn-apply-changes" id="vle-btn-publish" title="Áp dụng và xuất bản bố cục mới cho toàn bộ học sinh">
            🚀 Áp dụng bố cục
          </button>

          <button type="button" class="vle-tool-btn close-btn vle-btn-close-editor" id="vle-btn-exit" title="Đóng chế độ chỉnh sửa và quay về website bình thường">
            ✕ Đóng chỉnh sửa
          </button>
        </div>
      </header>

      <!-- Main Editor Canvas Area -->
      <div class="vle-main-viewport">
        <!-- Left Panel: Layers -->
        <aside class="vle-drawer vle-drawer-left" id="vle-drawer-layers" aria-label="Layers Panel">
          <div class="vle-drawer-header">
            <h3>📑 Danh sách lớp (Layers)</h3>
            <button type="button" class="vle-mini-btn" id="vle-btn-add-layer" title="Thêm phần tử nút, ảnh hoặc nhãn">+ Thêm</button>
          </div>
          <div class="vle-layer-list" id="vle-layer-items" role="list"></div>
        </aside>

        <!-- Center In-Situ Canvas Viewport -->
        <main class="vle-canvas-container" id="vle-canvas-container">
          <div class="vle-canvas-scaler" id="vle-canvas-scaler">
            <!-- Stage element will be cleanly inserted here before overlay -->
            <div class="vle-overlay-surface" id="vle-overlay-surface">
              <div class="vle-selection-box" id="vle-selection-box" style="display:none;">
                <div class="vle-box-title" id="vle-box-title">Layer Name</div>
                <div class="vle-box-metrics" id="vle-box-metrics">X: 0% · Y: 0% · W: 0% · H: 0%</div>
                <!-- 8 Transform Handles -->
                <div class="vle-handle nw" data-handle="nw" title="Kéo góc trên-trái"></div>
                <div class="vle-handle n"  data-handle="n"  title="Kéo cạnh trên"></div>
                <div class="vle-handle ne" data-handle="ne" title="Kéo góc trên-phải"></div>
                <div class="vle-handle e"  data-handle="e"  title="Kéo cạnh phải"></div>
                <div class="vle-handle se" data-handle="se" title="Kéo góc dưới-phải"></div>
                <div class="vle-handle s"  data-handle="s"  title="Kéo cạnh dưới"></div>
                <div class="vle-handle sw" data-handle="sw" title="Kéo góc dưới-trái"></div>
                <div class="vle-handle w"  data-handle="w"  title="Kéo cạnh trái"></div>
              </div>
            </div>
          </div>
        </main>

        <!-- Right Panel: Inspector -->
        <aside class="vle-drawer vle-drawer-right" id="vle-drawer-inspector" aria-label="Inspector Panel">
          <div class="vle-drawer-header">
            <h3>⚙️ Thuộc tính (Inspector)</h3>
          </div>
          <div class="vle-inspector-content" id="vle-inspector-body">
            <div class="vle-empty-hint">Chọn một phần tử trên giao diện hoặc danh sách bên trái để tinh chỉnh vị trí, kích thước và liên kết.</div>
          </div>
        </aside>
      </div>

      <!-- Add Element Modal -->
      <div class="vle-modal-backdrop" id="vle-add-modal" style="display:none;" role="dialog" aria-modal="true">
        <div class="vle-modal-card">
          <div class="vle-modal-header">
            <h4>➕ Thêm phần tử mới vào trang</h4>
            <button type="button" class="vle-modal-close" id="vle-close-add-modal">✕</button>
          </div>
          <div class="vle-modal-body">
            <div class="vle-field">
              <label>Loại phần tử:</label>
              <select id="vle-new-type" class="vle-input">
                <option value="button">Nút bấm tương tác (Button)</option>
                <option value="image">Hình ảnh / Nhãn dán (Image)</option>
                <option value="text">Khối văn bản / Banner (Text)</option>
              </select>
            </div>
            <div class="vle-field">
              <label>Tên định danh (Layer Title):</label>
              <input type="text" id="vle-new-title" class="vle-input" placeholder="Ví dụ: Nút Học Thử Thách Mới" />
            </div>
            <div class="vle-field" id="vle-new-route-row">
              <label>Đích đến khi nhấn (Target Route):</label>
              <select id="vle-new-route" class="vle-input">
                <option value="chapter1">Chapter 1: Fraction (Phân số)</option>
                <option value="chapter2">Chapter 2: Decimal Numbers (Số thập phân)</option>
                <option value="chapter3">Chapter 3: Ratio &amp; Percentage</option>
                <option value="chapter4">Chapter 4: Geometry &amp; Measurement</option>
                <option value="lesson_ha_km2">Bài học: Hectare &amp; Square Kilometre</option>
                <option value="mathlab">Math Lab (Vui học Toán)</option>
                <option value="buddy">MathBuddy AI</option>
                <option value="home">Trang chủ (Home)</option>
                <option value="topics">Thư viện chủ đề (Topics)</option>
              </select>
            </div>
            <div class="vle-field">
              <label>Đường dẫn hình ảnh (Asset URL):</label>
              <div style="display:flex;gap:8px;">
                <input type="text" id="vle-new-asset" class="vle-input" placeholder="/assets/topics-library/Fraction-button.png" />
                <button type="button" class="vle-tool-btn" id="vle-btn-pick-asset">🖼️ Chọn</button>
              </div>
            </div>
            <div class="vle-field" id="vle-new-text-row" style="display:none;">
              <label>Nội dung văn bản:</label>
              <input type="text" id="vle-new-text" class="vle-input" placeholder="Nhập chữ hiển thị..." />
            </div>
          </div>
          <div class="vle-modal-footer">
            <button type="button" class="vle-tool-btn" id="vle-btn-cancel-add">Hủy</button>
            <button type="button" class="vle-tool-btn primary" id="vle-btn-confirm-add">Tạo phần tử</button>
          </div>
        </div>
      </div>

      <!-- Asset Library Quick Picker Modal -->
      <div class="vle-modal-backdrop" id="vle-asset-modal" style="display:none;" role="dialog" aria-modal="true">
        <div class="vle-modal-card wide">
          <div class="vle-modal-header">
            <h4>🖼️ Chọn tài nguyên từ Kho Canva</h4>
            <button type="button" class="vle-modal-close" id="vle-close-asset-modal">✕</button>
          </div>
          <div class="vle-asset-grid" id="vle-asset-grid"></div>
        </div>
      </div>

      <!-- Unsaved Changes Confirmation Modal -->
      <div class="vle-modal-backdrop" id="vle-exit-modal" style="display:none;" role="dialog" aria-modal="true">
        <div class="vle-modal-card" style="max-width: 480px;">
          <div class="vle-modal-header" style="background:#091533;border-bottom:1px solid #1e3a8a;">
            <h4 style="color:#ffd65e;display:flex;align-items:center;gap:8px;">
              <span>⚠️</span> <span>Xác nhận thoát chỉnh sửa</span>
            </h4>
            <button type="button" class="vle-modal-close" id="vle-close-exit-modal">✕</button>
          </div>
          <div class="vle-modal-body" style="padding:20px;font-size:14px;line-height:1.6;color:#e2e8f0;">
            <p style="margin:0 0 10px;font-weight:700;color:#ffffff;">
              Bạn có thay đổi trên giao diện trang chưa được lưu lên hệ thống.
            </p>
            <p style="margin:0;color:#94a3b8;font-size:13px;">
              Bạn có muốn lưu bản nháp trước khi thoát về giao diện website bình thường không?
            </p>
          </div>
          <div class="vle-modal-footer" style="padding:14px 18px;background:#050c20;display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;">
            <button type="button" class="vle-tool-btn" id="vle-exit-btn-cancel" style="background:#1e293b;border-color:#475569;color:#e2e8f0;">
              ↩️ Tiếp tục chỉnh sửa
            </button>
            <button type="button" class="vle-tool-btn danger" id="vle-exit-btn-discard" style="background:#7f1d1d;border-color:#b91c1c;color:#fecaca;">
              🗑️ Hủy thay đổi
            </button>
            <button type="button" class="vle-tool-btn primary" id="vle-exit-btn-save" style="background:linear-gradient(135deg, #0284c7, #0369a1);border-color:#38bdf8;color:#ffffff;font-weight:800;">
              💾 Lưu và thoát
            </button>
          </div>
        </div>
      </div>

      <!-- Live Toast Message -->
      <div class="vle-toast" id="vle-toast" style="display:none;" role="status"></div>
    `;

    document.body.appendChild(this.root);

    // Reparent stage into canvas scaler right before overlay surface
    const scaler = this.root.querySelector('#vle-canvas-scaler');
    const overlay = this.root.querySelector('#vle-overlay-surface');
    if (scaler && this.stage) {
      scaler.insertBefore(this.stage, overlay);
    }

    this.overlay = overlay;
    this.selectionBox = this.root.querySelector('#vle-selection-box');
    this.layerListEl = this.root.querySelector('#vle-layer-items');
    this.inspectorEl = this.root.querySelector('#vle-inspector-body');
    this.statusPillEl = this.root.querySelector('#vle-save-status');
  }

  setSaveStatus(status) {
    this.saveStatus = status;
    if (!this.statusPillEl) return;

    this.statusPillEl.className = `vle-save-status-pill ${status}`;
    const textEl = this.statusPillEl.querySelector('.vle-status-text');

    if (status === 'saved') {
      this.hasUnsavedChanges = false;
      if (textEl) textEl.textContent = '✓ Đã lưu / Saved';
    } else if (status === 'unsaved') {
      this.hasUnsavedChanges = true;
      if (textEl) textEl.textContent = '● Có thay đổi chưa lưu';
    } else if (status === 'saving') {
      if (textEl) textEl.textContent = '⏳ Đang lưu...';
    } else if (status === 'failed') {
      if (textEl) textEl.textContent = '⚠️ Lưu thất bại';
    }
  }

  bindEvents() {
    // Toolbar device modes
    this.root.querySelectorAll('[data-vle-device]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.deviceMode = btn.dataset.vleDevice;
        this.root.querySelectorAll('[data-vle-device]').forEach(b => b.classList.toggle('active', b === btn));
        this.applyDeviceMode();
      });
    });

    // Undo / Redo
    this.root.querySelector('#vle-btn-undo')?.addEventListener('click', () => this.undo());
    this.root.querySelector('#vle-btn-redo')?.addEventListener('click', () => this.redo());

    // Reset to Default
    this.root.querySelector('#vle-btn-reset')?.addEventListener('click', () => this.promptResetLayout());

    // Preview as student
    this.root.querySelector('#vle-btn-preview-student')?.addEventListener('click', () => this.toggleStudentPreview());

    // Save Draft
    this.root.querySelector('#vle-btn-save-draft')?.addEventListener('click', () => this.saveLayoutToServer('draft'));

    // Apply Changes / Publish Layout
    this.root.querySelector('#vle-btn-publish')?.addEventListener('click', () => this.saveLayoutToServer('published'));

    // Close Editor / Exit
    this.root.querySelector('#vle-btn-exit')?.addEventListener('click', () => this.requestClose());

    // Exit confirmation modal buttons
    this.root.querySelector('#vle-close-exit-modal')?.addEventListener('click', () => this.closeExitModal());
    this.root.querySelector('#vle-exit-btn-cancel')?.addEventListener('click', () => this.closeExitModal());
    this.root.querySelector('#vle-exit-btn-discard')?.addEventListener('click', () => this.discardChangesAndExit());
    this.root.querySelector('#vle-exit-btn-save')?.addEventListener('click', async () => {
      await this.saveLayoutToServer('draft');
      this.closeExitModal();
      this.destroy();
    });

    // Add layer modal
    this.root.querySelector('#vle-btn-add-layer')?.addEventListener('click', () => this.openAddLayerModal());
    this.root.querySelector('#vle-close-add-modal')?.addEventListener('click', () => this.closeAddLayerModal());
    this.root.querySelector('#vle-btn-cancel-add')?.addEventListener('click', () => this.closeAddLayerModal());
    this.root.querySelector('#vle-btn-confirm-add')?.addEventListener('click', () => this.confirmAddLayer());

    this.root.querySelector('#vle-new-type')?.addEventListener('change', (e) => {
      const type = e.target.value;
      const routeRow = this.root.querySelector('#vle-new-route-row');
      const textRow = this.root.querySelector('#vle-new-text-row');
      if (routeRow) routeRow.style.display = type === 'button' ? 'block' : 'none';
      if (textRow) textRow.style.display = type === 'text' ? 'block' : 'none';
    });

    this.root.querySelector('#vle-btn-pick-asset')?.addEventListener('click', () => this.openAssetPicker('vle-new-asset'));
    this.root.querySelector('#vle-close-asset-modal')?.addEventListener('click', () => {
      const m = this.root.querySelector('#vle-asset-modal');
      if (m) m.style.display = 'none';
    });

    // In-situ Stage Interaction (Click selection and dragging)
    this.stageMouseDownHandler = (e) => {
      if (this.isStudentPreview) return;
      if (e.target.closest('#vle-selection-box') || e.target.closest('[data-handle]')) return;

      const layerEl = e.target.closest('[data-layout-layer]');
      if (layerEl) {
        e.preventDefault();
        e.stopPropagation();
        const layerId = layerEl.getAttribute('data-layout-layer');
        this.selectLayer(layerId);

        const layer = this.layers[layerId];
        if (layer && !layer.locked) {
          this.activeInteraction = 'drag';
          this.dragStartX = e.clientX;
          this.dragStartY = e.clientY;
          this.initialLayerState = { ...layer };
          this.initialStageRect = this.stage.getBoundingClientRect();
        }
      } else {
        // Clicked outside any layer
        if (!e.target.closest('.vle-drawer') && !e.target.closest('.vle-toolbar')) {
          this.selectLayer(null);
        }
      }
    };
    this.stage.addEventListener('mousedown', this.stageMouseDownHandler);

    // Prevent button link clicks in editor mode
    this.stageClickHandler = (e) => {
      if (!this.isStudentPreview) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    this.stage.addEventListener('click', this.stageClickHandler, true);

    // Overlay surface selection box mouse interaction
    this.selectionBox.addEventListener('mousedown', (e) => {
      if (this.isStudentPreview) return;
      const handleEl = e.target.closest('[data-handle]');
      if (handleEl && this.selectedLayerId) {
        const layer = this.layers[this.selectedLayerId];
        if (layer && !layer.locked) {
          e.preventDefault();
          e.stopPropagation();
          this.activeInteraction = 'resize';
          this.activeHandle = handleEl.dataset.handle;
          this.dragStartX = e.clientX;
          this.dragStartY = e.clientY;
          this.initialLayerState = { ...layer };
          this.initialStageRect = this.stage.getBoundingClientRect();
          return;
        }
      }

      if (this.selectedLayerId) {
        const layer = this.layers[this.selectedLayerId];
        if (layer && !layer.locked) {
          e.preventDefault();
          e.stopPropagation();
          this.activeInteraction = 'drag';
          this.dragStartX = e.clientX;
          this.dragStartY = e.clientY;
          this.initialLayerState = { ...layer };
          this.initialStageRect = this.stage.getBoundingClientRect();
        }
      }
    });

    window.addEventListener('mousemove', (e) => this.handleWindowMouseMove(e));
    window.addEventListener('mouseup', () => this.handleWindowMouseUp());

    // Keyboard shortcuts
    this.keyHandler = (e) => {
      if (!this.root || this.root.style.display === 'none') return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        this.redo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        this.saveLayoutToServer('draft');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (this.selectedLayerId) this.duplicateLayer(this.selectedLayerId);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedLayerId && this.layers[this.selectedLayerId]?.isCustom) {
          e.preventDefault();
          this.deleteLayer(this.selectedLayerId);
        }
      } else if (e.key === 'Escape') {
        if (this.selectedLayerId) this.selectLayer(null);
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    // Resize observer to keep bounding box in sync with stage scale
    this.resizeObserver = new ResizeObserver(() => {
      if (this.selectedLayerId) this.updateSelectionBoxPosition();
    });
    this.resizeObserver.observe(this.stage);
  }

  requestClose() {
    if (!this.hasUnsavedChanges) {
      this.destroy();
      return;
    }
    // Show confirmation modal
    const modal = this.root.querySelector('#vle-exit-modal');
    if (modal) modal.style.display = 'flex';
  }

  closeExitModal() {
    const modal = this.root.querySelector('#vle-exit-modal');
    if (modal) modal.style.display = 'none';
  }

  discardChangesAndExit() {
    this.closeExitModal();
    if (this.initialLayersSnapshot) {
      try {
        const initialLayers = JSON.parse(this.initialLayersSnapshot);
        // Remove any custom layers that were added
        Object.keys(this.layers).forEach(id => {
          if (!initialLayers[id]) {
            const el = this.getLayerElement(id);
            if (el) el.remove();
          }
        });
        this.layers = initialLayers;
        Object.keys(this.layers).forEach(id => this.applyLayerStyles(id));
      } catch (err) {
        console.warn('Could not revert layers:', err);
      }
    }
    this.destroy();
  }

  applyDeviceMode() {
    const scaler = this.root.querySelector('#vle-canvas-scaler');
    if (!scaler) return;
    scaler.classList.remove('vle-device-desktop', 'vle-device-tablet', 'vle-device-mobile');
    scaler.classList.add(`vle-device-${this.deviceMode}`);
    setTimeout(() => {
      if (this.selectedLayerId) this.updateSelectionBoxPosition();
    }, 150);
  }

  toggleStudentPreview() {
    this.isStudentPreview = !this.isStudentPreview;
    const btn = this.root.querySelector('#vle-btn-preview-student');
    const drawers = this.root.querySelectorAll('.vle-drawer');

    if (this.isStudentPreview) {
      if (btn) btn.innerHTML = '✏️ Tiếp tục sửa';
      drawers.forEach(d => d.style.display = 'none');
      if (this.selectionBox) this.selectionBox.style.display = 'none';
      this.overlay.style.pointerEvents = 'none';
      this.showToast('👁️ Chế độ xem trước học sinh: Tất cả công cụ chỉnh sửa đã được ẩn.', 'info');
    } else {
      if (btn) btn.innerHTML = '👁️ Xem trước';
      drawers.forEach(d => d.style.display = 'flex');
      this.overlay.style.pointerEvents = 'auto';
      if (this.selectedLayerId) {
        this.selectLayer(this.selectedLayerId);
      }
    }
  }

  // Layer list rendering in Left Drawer
  renderLayerList() {
    if (!this.layerListEl) return;
    const sorted = Object.values(this.layers).sort((a, b) => b.zIndex - a.zIndex);

    this.layerListEl.innerHTML = sorted.map(l => {
      const isSelected = l.id === this.selectedLayerId;
      const typeIcon = l.type === 'button' ? '🔘' : (l.type === 'background' ? '🖼️' : (l.type === 'image' ? '🎨' : '🔤'));
      return `
        <div class="vle-layer-item ${isSelected ? 'active' : ''} ${l.locked ? 'locked' : ''} ${!l.visible ? 'hidden-layer' : ''}" data-layer-select="${l.id}">
          <div class="vle-layer-drag-handle" title="Thứ tự lớp z-index: ${l.zIndex}">${l.zIndex}</div>
          <span class="vle-layer-icon">${typeIcon}</span>
          <span class="vle-layer-name" title="${l.title}">${l.title}</span>
          <div class="vle-layer-actions">
            <button type="button" class="vle-layer-btn" data-act="toggle-vis" data-lid="${l.id}" title="${l.visible ? 'Ẩn lớp' : 'Hiện lớp'}">
              ${l.visible ? '👁️' : '🕶️'}
            </button>
            <button type="button" class="vle-layer-btn" data-act="toggle-lock" data-lid="${l.id}" title="${l.locked ? 'Mở khóa' : 'Khóa lớp'}">
              ${l.locked ? '🔒' : '🔓'}
            </button>
            <button type="button" class="vle-layer-btn" data-act="up" data-lid="${l.id}" title="Lên một lớp">▲</button>
            <button type="button" class="vle-layer-btn" data-act="down" data-lid="${l.id}" title="Xuống một lớp">▼</button>
            ${l.isCustom ? `<button type="button" class="vle-layer-btn danger" data-act="delete" data-lid="${l.id}" title="Xóa phần tử">🗑️</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Bind list clicks
    this.layerListEl.querySelectorAll('[data-layer-select]').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-act]')) return;
        const id = item.dataset.layerSelect;
        this.selectLayer(id);
      });
    });

    this.layerListEl.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = btn.dataset.act;
        const lid = btn.dataset.lid;
        this.handleLayerAction(act, lid);
      });
    });
  }

  handleLayerAction(action, layerId) {
    const layer = this.layers[layerId];
    if (!layer) return;

    if (action === 'toggle-vis') {
      layer.visible = !layer.visible;
      this.applyLayerStyles(layerId);
      this.renderLayerList();
      if (this.selectedLayerId === layerId) this.renderInspector();
      this.setSaveStatus('unsaved');
      this.recordState(`Ẩn/Hiện: ${layer.title}`);
    } else if (action === 'toggle-lock') {
      layer.locked = !layer.locked;
      this.renderLayerList();
      if (this.selectedLayerId === layerId) {
        this.renderInspector();
        this.updateSelectionBoxPosition();
      }
      this.setSaveStatus('unsaved');
      this.recordState(`Khóa: ${layer.title}`);
    } else if (action === 'up') {
      layer.zIndex += 1;
      this.applyLayerStyles(layerId);
      this.renderLayerList();
      if (this.selectedLayerId === layerId) this.renderInspector();
      this.setSaveStatus('unsaved');
      this.recordState(`Tăng z-index: ${layer.title}`);
    } else if (action === 'down') {
      layer.zIndex = Math.max(1, layer.zIndex - 1);
      this.applyLayerStyles(layerId);
      this.renderLayerList();
      if (this.selectedLayerId === layerId) this.renderInspector();
      this.setSaveStatus('unsaved');
      this.recordState(`Giảm z-index: ${layer.title}`);
    } else if (action === 'delete') {
      this.deleteLayer(layerId);
    }
  }

  selectLayer(layerId) {
    if (this.selectedLayerId === layerId && this.selectionBox && this.selectionBox.style.display !== 'none') {
      return;
    }
    this.selectedLayerId = layerId;
    this.renderLayerList();
    this.renderInspector();

    if (!layerId) {
      if (this.selectionBox) this.selectionBox.style.display = 'none';
      return;
    }

    const layer = this.layers[layerId];
    if (!layer || !layer.visible) {
      if (this.selectionBox) this.selectionBox.style.display = 'none';
      return;
    }

    this.updateSelectionBoxPosition();
  }

  updateSelectionBoxPosition() {
    if (!this.selectedLayerId || !this.selectionBox) return;
    const layer = this.layers[this.selectedLayerId];
    const el = this.getLayerElement(this.selectedLayerId);
    if (!layer || !el) {
      this.selectionBox.style.display = 'none';
      return;
    }

    const stageRect = this.stage.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    if (stageRect.width === 0 || stageRect.height === 0) return;

    const left = elRect.left - stageRect.left;
    const top = elRect.top - stageRect.top;
    const width = elRect.width;
    const height = elRect.height;

    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = `${left}px`;
    this.selectionBox.style.top = `${top}px`;
    this.selectionBox.style.width = `${width}px`;
    this.selectionBox.style.height = `${height}px`;

    const titleEl = this.root.querySelector('#vle-box-title');
    if (titleEl) titleEl.textContent = `${layer.title} ${layer.locked ? '(Đã khóa)' : ''}`;

    const metricsEl = this.root.querySelector('#vle-box-metrics');
    if (metricsEl) metricsEl.textContent = `X: ${layer.x}% · Y: ${layer.y}% · W: ${layer.width}% · H: ${layer.height}%`;

    this.selectionBox.classList.toggle('locked-box', Boolean(layer.locked));
  }

  getLayerElement(layerId) {
    return this.stage.querySelector(`[data-layout-layer="${layerId}"]`);
  }

  applyLayerStyles(layerId) {
    const layer = this.layers[layerId];
    const el = this.getLayerElement(layerId);
    if (!layer || !el) return;

    // Background layers must preserve natural layout flow to maintain aspect ratio and prevent stage height collapse
    if (layer.type === 'background') {
      if (layer.opacity !== undefined) el.style.opacity = (layer.opacity / 100).toString();
      if (layer.zIndex !== undefined) el.style.zIndex = layer.zIndex;
      el.style.display = layer.visible ? '' : 'none';
      return;
    }

    el.style.position = 'absolute';
    el.style.left = `${layer.x}%`;
    el.style.top = `${layer.y}%`;
    el.style.width = `${layer.width}%`;
    el.style.height = `${layer.height}%`;
    el.style.zIndex = layer.zIndex;
    el.style.opacity = (layer.opacity / 100).toString();
    el.style.display = layer.visible ? '' : 'none';

    const img = el.querySelector('img') || (el.tagName === 'IMG' ? el : null);
    if (img && layer.assetUrl && img.src !== layer.assetUrl) {
      img.src = layer.assetUrl;
    }
    if (img && layer.objectFit) {
      img.style.objectFit = layer.objectFit;
    }
    if (layer.route) {
      el.setAttribute('data-route', layer.route);
    }
  }

  // Inspector Panel in Right Drawer
  renderInspector() {
    if (!this.inspectorEl) return;
    if (!this.selectedLayerId) {
      this.inspectorEl.innerHTML = `<div class="vle-empty-hint">Chọn một phần tử để chỉnh sửa thông số vị trí, kích thước, hiệu ứng và liên kết.</div>`;
      return;
    }

    const layer = this.layers[this.selectedLayerId];
    if (!layer) return;

    this.inspectorEl.innerHTML = `
      <div class="vle-inspector-section">
        <h4 style="margin:0 0 10px;color:#00e5ff;font-size:14px;font-weight:800;">${layer.title}</h4>
        <div style="font-size:12px;color:#8ab4f8;margin-bottom:12px;">ID: <code>${layer.id}</code> · Loại: <strong>${layer.type}</strong></div>

        <!-- Position & Dimensions Form -->
        <div class="vle-grid-2">
          <div class="vle-field">
            <label>Vị trí X (%):</label>
            <input type="number" step="0.5" class="vle-input" id="vle-prop-x" value="${layer.x}" ${layer.locked ? 'disabled' : ''} />
          </div>
          <div class="vle-field">
            <label>Vị trí Y (%):</label>
            <input type="number" step="0.5" class="vle-input" id="vle-prop-y" value="${layer.y}" ${layer.locked ? 'disabled' : ''} />
          </div>
          <div class="vle-field">
            <label>Chiều rộng (%):</label>
            <input type="number" step="0.5" class="vle-input" id="vle-prop-w" value="${layer.width}" ${layer.locked ? 'disabled' : ''} />
          </div>
          <div class="vle-field">
            <label>Chiều cao (%):</label>
            <input type="number" step="0.5" class="vle-input" id="vle-prop-h" value="${layer.height}" ${layer.locked ? 'disabled' : ''} />
          </div>
        </div>

        <div class="vle-field" style="margin-top:8px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="vle-prop-lock-aspect" ${this.aspectRatioLocked ? 'checked' : ''} />
            <span>🔒 Giữ nguyên tỷ lệ khung hình (Lock Aspect Ratio)</span>
          </label>
        </div>
      </div>

      <div class="vle-inspector-section">
        <h4 style="margin:0 0 8px;color:#ffd65e;font-size:13px;font-weight:800;">Hiển thị &amp; Thứ tự lớp</h4>
        <div class="vle-grid-2">
          <div class="vle-field">
            <label>Z-Index (Thứ tự lớp):</label>
            <input type="number" step="1" class="vle-input" id="vle-prop-z" value="${layer.zIndex}" />
          </div>
          <div class="vle-field">
            <label>Độ trong suốt (%):</label>
            <input type="number" min="0" max="100" class="vle-input" id="vle-prop-opacity" value="${layer.opacity}" />
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-top:10px;">
          <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:13px;">
            <input type="checkbox" id="vle-prop-visible" ${layer.visible ? 'checked' : ''} />
            <span>Hiển thị (Visible)</span>
          </label>
          <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:13px;">
            <input type="checkbox" id="vle-prop-locked" ${layer.locked ? 'checked' : ''} />
            <span>Khóa vị trí (Locked)</span>
          </label>
        </div>
      </div>

      <!-- Route & Image Properties -->
      <div class="vle-inspector-section">
        <h4 style="margin:0 0 8px;color:#38ef7d;font-size:13px;font-weight:800;">Liên kết &amp; Hình ảnh</h4>
        ${layer.type === 'button' ? `
          <div class="vle-field">
            <label>Đích đến khi nhấn (Target Route):</label>
            <select class="vle-input" id="vle-prop-route">
              <option value="">-- Không có hành động --</option>
              <option value="chapter1" ${layer.route === 'chapter1' ? 'selected' : ''}>Chapter 1: Fraction</option>
              <option value="chapter2" ${layer.route === 'chapter2' ? 'selected' : ''}>Chapter 2: Decimal Numbers</option>
              <option value="chapter3" ${layer.route === 'chapter3' ? 'selected' : ''}>Chapter 3: Ratio &amp; Percentage</option>
              <option value="chapter4" ${layer.route === 'chapter4' ? 'selected' : ''}>Chapter 4: Geometry &amp; Measurement</option>
              <option value="lesson_ha_km2" ${layer.route === 'lesson_ha_km2' ? 'selected' : ''}>Bài học: Hectare &amp; Square Kilometre</option>
              <option value="topics" ${layer.route === 'topics' ? 'selected' : ''}>Topics Library (Thư viện chủ đề)</option>
              <option value="home" ${layer.route === 'home' ? 'selected' : ''}>Trang chủ (Home)</option>
              <option value="mathlab" ${layer.route === 'mathlab' ? 'selected' : ''}>Math Lab Games</option>
              <option value="buddy" ${layer.route === 'buddy' ? 'selected' : ''}>MathBuddy AI</option>
              <option value="progress" ${layer.route === 'progress' ? 'selected' : ''}>Hồ sơ tiến bộ (My Progress)</option>
              <option value="admin" ${layer.route === 'admin' ? 'selected' : ''}>Bảng quản trị (Admin Console)</option>
            </select>
          </div>
        ` : ''}

        <div class="vle-field">
          <label>Đường dẫn tệp hình ảnh (Asset URL):</label>
          <div style="display:flex;gap:6px;">
            <input type="text" class="vle-input" id="vle-prop-asset" value="${layer.assetUrl || ''}" placeholder="/assets/topics-library/..." />
            <button type="button" class="vle-tool-btn" id="vle-btn-prop-pick-asset">🖼️</button>
          </div>
        </div>

        <div class="vle-field">
          <label>Tỷ lệ hiển thị (Object Fit):</label>
          <select class="vle-input" id="vle-prop-fit">
            <option value="contain" ${layer.objectFit === 'contain' ? 'selected' : ''}>Contain (Giữ nguyên tỉ lệ hình)</option>
            <option value="cover" ${layer.objectFit === 'cover' ? 'selected' : ''}>Cover (Lấp đầy không gian)</option>
            <option value="fill" ${layer.objectFit === 'fill' ? 'selected' : ''}>Fill (Kéo dãn vừa khung)</option>
          </select>
        </div>
      </div>

      <!-- Quick Layer Actions -->
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button type="button" class="vle-tool-btn" id="vle-btn-duplicate-layer" style="flex:1;">
          📋 Nhân bản (Duplicate)
        </button>
        ${layer.isCustom ? `
          <button type="button" class="vle-tool-btn danger" id="vle-btn-delete-layer" style="flex:1;">
            🗑️ Xóa lớp
          </button>
        ` : ''}
      </div>
    `;

    // Bind inputs
    const xInput = this.inspectorEl.querySelector('#vle-prop-x');
    const yInput = this.inspectorEl.querySelector('#vle-prop-y');
    const wInput = this.inspectorEl.querySelector('#vle-prop-w');
    const hInput = this.inspectorEl.querySelector('#vle-prop-h');
    const zInput = this.inspectorEl.querySelector('#vle-prop-z');
    const opInput = this.inspectorEl.querySelector('#vle-prop-opacity');
    const visInput = this.inspectorEl.querySelector('#vle-prop-visible');
    const lockInput = this.inspectorEl.querySelector('#vle-prop-locked');
    const routeSelect = this.inspectorEl.querySelector('#vle-prop-route');
    const assetInput = this.inspectorEl.querySelector('#vle-prop-asset');
    const fitSelect = this.inspectorEl.querySelector('#vle-prop-fit');
    const aspectCheck = this.inspectorEl.querySelector('#vle-prop-lock-aspect');

    aspectCheck?.addEventListener('change', (e) => {
      this.aspectRatioLocked = e.target.checked;
    });

    const updateFromInputs = () => {
      if (layer.locked) return;
      layer.x = parseFloat(xInput.value) || 0;
      layer.y = parseFloat(yInput.value) || 0;
      layer.width = parseFloat(wInput.value) || 10;
      layer.height = parseFloat(hInput.value) || 10;
      layer.zIndex = parseInt(zInput.value, 10) || 10;
      layer.opacity = parseInt(opInput.value, 10) || 100;
      layer.visible = visInput.checked;
      layer.locked = lockInput.checked;
      if (routeSelect) layer.route = routeSelect.value;
      if (assetInput) layer.assetUrl = assetInput.value.trim();
      if (fitSelect) layer.objectFit = fitSelect.value;

      this.applyLayerStyles(this.selectedLayerId);
      this.updateSelectionBoxPosition();
      this.renderLayerList();
      this.setSaveStatus('unsaved');
      this.recordState(`Sửa thuộc tính: ${layer.title}`);
    };

    [xInput, yInput, wInput, hInput, zInput, opInput].forEach(inp => {
      inp?.addEventListener('change', updateFromInputs);
    });

    [visInput, lockInput, routeSelect, fitSelect].forEach(inp => {
      inp?.addEventListener('change', updateFromInputs);
    });

    assetInput?.addEventListener('change', updateFromInputs);

    this.inspectorEl.querySelector('#vle-btn-prop-pick-asset')?.addEventListener('click', () => {
      this.openAssetPicker('vle-prop-asset', (chosenUrl) => {
        layer.assetUrl = chosenUrl;
        if (assetInput) assetInput.value = chosenUrl;
        updateFromInputs();
      });
    });

    this.inspectorEl.querySelector('#vle-btn-duplicate-layer')?.addEventListener('click', () => {
      this.duplicateLayer(this.selectedLayerId);
    });

    this.inspectorEl.querySelector('#vle-btn-delete-layer')?.addEventListener('click', () => {
      this.deleteLayer(this.selectedLayerId);
    });
  }

  handleWindowMouseMove(e) {
    if (!this.activeInteraction || !this.selectedLayerId) return;
    const layer = this.layers[this.selectedLayerId];
    const el = this.getLayerElement(this.selectedLayerId);
    if (!layer || layer.locked || !el) return;

    const deltaPixelX = e.clientX - this.dragStartX;
    const deltaPixelY = e.clientY - this.dragStartY;
    
    // Calculate relative to the element's positioning parent
    const parent = el.offsetParent || this.stage;
    const parentRect = parent.getBoundingClientRect();
    const parentWidth = parentRect.width;
    const parentHeight = parentRect.height;

    if (parentWidth <= 0 || parentHeight <= 0) return;

    const deltaPctX = (deltaPixelX / parentWidth) * 100;
    const deltaPctY = (deltaPixelY / parentHeight) * 100;

    if (this.activeInteraction === 'drag') {
      const newX = Math.round((this.initialLayerState.x + deltaPctX) * 10) / 10;
      const newY = Math.round((this.initialLayerState.y + deltaPctY) * 10) / 10;
      layer.x = Math.max(0, Math.min(100 - layer.width, newX));
      layer.y = Math.max(0, Math.min(100 - layer.height, newY));
      this.applyLayerStyles(this.selectedLayerId);
      this.updateSelectionBoxPosition();
      this.syncInspectorPosition();
      this.setSaveStatus('unsaved');
    } else if (this.activeInteraction === 'resize') {
      let { x, y, width, height } = this.initialLayerState;
      const keepRatio = this.aspectRatioLocked || e.shiftKey;
      const initialRatio = width / (height || 1);

      if (this.activeHandle.includes('e')) {
        width = Math.max(3, this.initialLayerState.width + deltaPctX);
      }
      if (this.activeHandle.includes('s')) {
        height = Math.max(3, this.initialLayerState.height + deltaPctY);
      }
      if (this.activeHandle.includes('w')) {
        const potentialW = this.initialLayerState.width - deltaPctX;
        if (potentialW >= 3) {
          width = potentialW;
          x = this.initialLayerState.x + deltaPctX;
        }
      }
      if (this.activeHandle.includes('n')) {
        const potentialH = this.initialLayerState.height - deltaPctY;
        if (potentialH >= 3) {
          height = potentialH;
          y = this.initialLayerState.y + deltaPctY;
        }
      }

      if (keepRatio) {
        if (this.activeHandle === 'e' || this.activeHandle === 'w') {
          height = width / initialRatio;
        } else {
          width = height * initialRatio;
        }
      }

      layer.x = Math.round(x * 10) / 10;
      layer.y = Math.round(y * 10) / 10;
      layer.width = Math.round(width * 10) / 10;
      layer.height = Math.round(height * 10) / 10;

      this.applyLayerStyles(this.selectedLayerId);
      this.updateSelectionBoxPosition();
      this.syncInspectorPosition();
      this.setSaveStatus('unsaved');
    }
  }

  handleWindowMouseUp() {
    if (this.activeInteraction) {
      this.recordState(`Di chuyển/Đổi kích thước: ${this.layers[this.selectedLayerId]?.title}`);
      this.activeInteraction = null;
      this.activeHandle = null;
    }
  }

  syncInspectorPosition() {
    const layer = this.layers[this.selectedLayerId];
    if (!layer || !this.inspectorEl) return;
    const xInp = this.inspectorEl.querySelector('#vle-prop-x');
    const yInp = this.inspectorEl.querySelector('#vle-prop-y');
    const wInp = this.inspectorEl.querySelector('#vle-prop-w');
    const hInp = this.inspectorEl.querySelector('#vle-prop-h');
    if (xInp) xInp.value = layer.x;
    if (yInp) yInp.value = layer.y;
    if (wInp) wInp.value = layer.width;
    if (hInp) hInp.value = layer.height;
  }

  // History & Undo/Redo Engine
  recordState(actionName = 'Edit') {
    const snapshot = JSON.stringify(this.layers);
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === snapshot) {
      return;
    }
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateUndoRedoButtons();
  }

  undo() {
    if (this.undoStack.length <= 1) return;
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.layers = JSON.parse(prev);
    this.syncAllLayersAfterHistory();
    this.updateUndoRedoButtons();
    this.setSaveStatus('unsaved');
    this.showToast('↩️ Đã hoàn tác thao tác gần nhất.', 'info');
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop();
    this.undoStack.push(next);
    this.layers = JSON.parse(next);
    this.syncAllLayersAfterHistory();
    this.updateUndoRedoButtons();
    this.setSaveStatus('unsaved');
    this.showToast('↪️ Đã làm lại thao tác.', 'info');
  }

  syncAllLayersAfterHistory() {
    Object.keys(this.layers).forEach(id => this.applyLayerStyles(id));
    this.renderLayerList();
    if (this.selectedLayerId) {
      this.selectLayer(this.selectedLayerId);
    }
  }

  updateUndoRedoButtons() {
    const undoBtn = this.root.querySelector('#vle-btn-undo');
    const redoBtn = this.root.querySelector('#vle-btn-redo');
    const countEl = this.root.querySelector('#vle-undo-count');
    if (undoBtn) undoBtn.disabled = this.undoStack.length <= 1;
    if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
    if (countEl) countEl.textContent = Math.max(0, this.undoStack.length - 1);
  }

  // Duplicate Layer
  duplicateLayer(layerId) {
    const orig = this.layers[layerId];
    if (!orig) return;

    const newId = `custom_layer_${Date.now().toString(36)}`;
    const newLayer = {
      ...orig,
      id: newId,
      title: `${orig.title} (Bản sao)`,
      x: Math.min(80, orig.x + 3),
      y: Math.min(80, orig.y + 3),
      zIndex: orig.zIndex + 1,
      locked: false,
      isCustom: true
    };

    this.layers[newId] = newLayer;
    this.mountCustomLayerElement(newLayer);
    this.applyLayerStyles(newId);
    this.renderLayerList();
    this.selectLayer(newId);
    this.setSaveStatus('unsaved');
    this.recordState(`Nhân bản: ${orig.title}`);
    this.showToast(`📋 Đã nhân bản phần tử: ${newLayer.title}`, 'success');
  }

  // Delete Layer
  deleteLayer(layerId) {
    const layer = this.layers[layerId];
    if (!layer) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa phần tử "${layer.title}" khỏi giao diện?`)) {
      return;
    }

    const el = this.getLayerElement(layerId);
    if (el) el.remove();

    delete this.layers[layerId];
    this.selectLayer(null);
    this.renderLayerList();
    this.setSaveStatus('unsaved');
    this.recordState(`Xóa: ${layer.title}`);
    this.showToast(`🗑️ Đã xóa phần tử: ${layer.title}`, 'info');
  }

  // Add Layer Modal
  openAddLayerModal() {
    const m = this.root.querySelector('#vle-add-modal');
    if (m) m.style.display = 'flex';
  }

  closeAddLayerModal() {
    const m = this.root.querySelector('#vle-add-modal');
    if (m) m.style.display = 'none';
  }

  confirmAddLayer() {
    const type = this.root.querySelector('#vle-new-type').value;
    const title = this.root.querySelector('#vle-new-title').value.trim() || 'Phần tử mới';
    const route = this.root.querySelector('#vle-new-route').value;
    const assetUrl = this.root.querySelector('#vle-new-asset').value.trim() || '/assets/topics-library/Fraction-button.png';
    const textVal = this.root.querySelector('#vle-new-text')?.value.trim() || '';

    const id = `custom_${Date.now().toString(36)}`;
    const newLayer = {
      id,
      title,
      type,
      x: 35,
      y: 35,
      width: type === 'button' ? 24 : 30,
      height: type === 'button' ? 18 : 20,
      unit: '%',
      zIndex: 25,
      opacity: 100,
      visible: true,
      locked: false,
      route: type === 'button' ? route : '',
      assetUrl,
      text: textVal,
      objectFit: 'contain',
      isCustom: true
    };

    this.layers[id] = newLayer;
    this.mountCustomLayerElement(newLayer);
    this.applyLayerStyles(id);
    this.renderLayerList();
    this.selectLayer(id);
    this.closeAddLayerModal();
    this.setSaveStatus('unsaved');
    this.recordState(`Thêm lớp: ${title}`);
    this.showToast(`✅ Đã thêm phần tử "${title}" vào giao diện!`, 'success');
  }

  mountCustomLayerElement(layerConfig) {
    let existing = this.getLayerElement(layerConfig.id);
    if (existing) return existing;

    const el = document.createElement(layerConfig.type === 'button' ? 'button' : 'div');
    el.setAttribute('data-layout-layer', layerConfig.id);
    el.setAttribute('data-layer-type', layerConfig.type);
    el.setAttribute('data-layer-title', layerConfig.title);
    if (layerConfig.route) el.setAttribute('data-route', layerConfig.route);

    el.className = `vle-custom-element ${layerConfig.type === 'button' ? 'vle-custom-btn' : ''}`;

    if (layerConfig.type === 'button') {
      el.type = 'button';
      el.innerHTML = `<img src="${layerConfig.assetUrl}" alt="${layerConfig.title}" draggable="false" />`;
      el.addEventListener('click', () => {
        if (!this.root || this.root.style.display === 'none' || this.isStudentPreview) {
          if (layerConfig.route && this.onNavigate) this.onNavigate(layerConfig.route);
        }
      });
    } else if (layerConfig.type === 'image') {
      el.innerHTML = `<img src="${layerConfig.assetUrl}" alt="${layerConfig.title}" draggable="false" style="width:100%;height:100%;object-fit:${layerConfig.objectFit || 'contain'};" />`;
    } else if (layerConfig.type === 'text') {
      el.className += ' vle-custom-text-banner';
      el.textContent = layerConfig.text || layerConfig.title;
    }

    this.stage.appendChild(el);
    return el;
  }

  // Asset Picker Modal
  openAssetPicker(targetInputId, onSelectCallback) {
    const modal = this.root.querySelector('#vle-asset-modal');
    const grid = this.root.querySelector('#vle-asset-grid');
    if (!modal || !grid) return;

    // Verified Canva manifest list
    const assets = [
      { name: 'Nút Phân số (Fraction)', path: '/assets/topics-library/Fraction-button.png' },
      { name: 'Nút Số thập phân (Decimals)', path: '/assets/topics-library/Decimal-button.png' },
      { name: 'Nút Tỉ số & Phần trăm (Ratio)', path: '/assets/topics-library/Ratio-button.png' },
      { name: 'Nút Hình học & Đo lường (Geometry)', path: '/assets/topics-library/Geometry-button.png' },
      { name: 'Nút Bắt đầu hành trình (Home)', path: '/assets/home/home-button.png' },
      { name: 'Logo MathLingua AI', path: '/assets/home/logo.png' },
      { name: 'Nút Quay lại (Back to Button)', path: '/assets/topics-library/geometry-measurement/Back-to-Button.png' },
      { name: 'Nút Hectare & Square Km', path: '/assets/topics-library/geometry-measurement/ha-km2-button.png' },
      { name: 'Nút Diện tích Tam giác', path: '/assets/topics-library/geometry-measurement/triangle-area-button.png' },
      { name: 'Nút Diện tích Hình thang', path: '/assets/topics-library/geometry-measurement/trapezoid-area-button.png' },
      { name: 'Nút Diện tích Hình tròn', path: '/assets/topics-library/geometry-measurement/circle-area-button.png' },
      { name: 'Nút Chu vi Hình tròn', path: '/assets/topics-library/geometry-measurement/circle-circumference-button.png' },
      { name: 'Nút Đơn vị đo thể tích', path: '/assets/topics-library/geometry-measurement/units-of-volume-button.png' },
      { name: 'Nút Thể tích hình hộp & lập phương', path: '/assets/topics-library/geometry-measurement/volume-of-cuboid-cube-button.png' },
      { name: 'Nút Vận tốc (Speed)', path: '/assets/topics-library/geometry-measurement/speed-button.png' },
      { name: 'Nút Biểu đồ hình quạt (Pie Chart)', path: '/assets/topics-library/geometry-measurement/pie-chart-button.png' }
    ];

    grid.innerHTML = assets.map(a => `
      <div class="vle-asset-card" data-pick-path="${a.path}">
        <div class="vle-asset-thumb"><img src="${a.path}" alt="${a.name}" loading="lazy" /></div>
        <div class="vle-asset-title">${a.name}</div>
        <div class="vle-asset-path">${a.path}</div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-pick-path]').forEach(card => {
      card.addEventListener('click', () => {
        const path = card.dataset.pickPath;
        const targetInput = this.root.querySelector(`#${targetInputId}`);
        if (targetInput) targetInput.value = path;
        if (onSelectCallback) onSelectCallback(path);
        modal.style.display = 'none';
      });
    });

    modal.style.display = 'flex';
  }

  // Save Layout to Server
  async saveLayoutToServer(status = 'published') {
    const isPublish = status === 'published';
    this.setSaveStatus('saving');
    this.showToast(`⏳ Đang ${isPublish ? 'xuất bản' : 'lưu nháp'} bố cục trang ${this.pageId}...`, 'info');

    try {
      await savePageLayout({
        pageId: this.pageId,
        status,
        layers: this.layers,
        deviceBreakpoints: {
          activeDevice: this.deviceMode
        }
      });

      this.setSaveStatus('saved');
      this.initialLayersSnapshot = JSON.stringify(this.layers);

      if (isPublish) {
        this.showToast(`🎉 Bố cục trang ${this.pageId} đã được XUẤT BẢN thành công cho toàn bộ học sinh!`, 'success');
        if (this.onLayoutChange) this.onLayoutChange(this.pageId, this.layers);
      } else {
        this.showToast(`✅ Đã lưu bản nháp bố cục trang ${this.pageId} an toàn vào cơ sở dữ liệu.`, 'success');
      }
    } catch (err) {
      this.setSaveStatus('failed');
      this.showToast(`❌ Không thể lưu bố cục: ${err.message}`, 'error');
    }
  }

  // Prompt reset to default
  async promptResetLayout() {
    if (!confirm(`Bạn có chắc chắn muốn khôi phục bố cục mặc định cho trang "${this.pageId}"? Mọi thay đổi tùy chỉnh sẽ được đặt lại theo thiết kế Canva chuẩn.`)) {
      return;
    }

    try {
      await resetPageLayout(this.pageId);
      this.setSaveStatus('saved');
      this.showToast('✅ Đã khôi phục bố cục mặc định thành công!', 'success');
      setTimeout(() => {
        this.destroy();
        if (this.onNavigate) this.onNavigate(this.pageId);
      }, 700);
    } catch (err) {
      this.showToast(`❌ Lỗi đặt lại: ${err.message}`, 'error');
    }
  }

  showToast(message, type = 'info') {
    const toast = this.root?.querySelector('#vle-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `vle-toast ${type}`;
    toast.style.display = 'block';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, 4000);
  }

  destroy() {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    if (this.resizeObserver) this.resizeObserver.disconnect();

    // Cleanly detach stage listeners
    if (this.stage) {
      if (this.stageMouseDownHandler) this.stage.removeEventListener('mousedown', this.stageMouseDownHandler);
      if (this.stageClickHandler) this.stage.removeEventListener('click', this.stageClickHandler, true);
    }

    // Cleanly restore this.stage back to its original parent and sibling in regular page flow
    if (this.stage && this.stageOriginalParent) {
      if (this.stageNextSibling && this.stageNextSibling.parentNode === this.stageOriginalParent) {
        this.stageOriginalParent.insertBefore(this.stage, this.stageNextSibling);
      } else {
        this.stageOriginalParent.appendChild(this.stage);
      }
    }

    // Remove editor UI
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
    this.root = null;

    if (this.onClose) this.onClose();
  }
}

/**
 * Apply saved page layout to existing DOM elements seamlessly on page render
 */
export async function applySavedPageLayout(pageId, isTeacher = false) {
  try {
    const mode = isTeacher ? 'draft' : 'published';
    const data = await fetchPageLayout(pageId, mode);
    if (!data || !data.layers) return;

    const layers = data.layers;
    Object.entries(layers).forEach(([layerId, config]) => {
      let el = document.querySelector(`[data-layout-layer="${layerId}"]`);
      if (!el && config.isCustom) {
        // Mount custom layer if missing
        el = document.createElement(config.type === 'button' ? 'button' : 'div');
        el.setAttribute('data-layout-layer', config.id);
        el.setAttribute('data-layer-type', config.type);
        el.setAttribute('data-layer-title', config.title);
        if (config.route) el.setAttribute('data-route', config.route);
        el.className = `vle-custom-element ${config.type === 'button' ? 'vle-custom-btn' : ''}`;

        if (config.type === 'button') {
          el.type = 'button';
          el.innerHTML = `<img src="${config.assetUrl}" alt="${config.title}" draggable="false" />`;
          el.addEventListener('click', () => {
            if (config.route && window.mathlinguaNavigate) {
              window.mathlinguaNavigate(config.route);
            }
          });
        } else if (config.type === 'image') {
          el.innerHTML = `<img src="${config.assetUrl}" alt="${config.title}" draggable="false" style="width:100%;height:100%;object-fit:${config.objectFit || 'contain'};" />`;
        } else if (config.type === 'text') {
          el.className += ' vle-custom-text-banner';
          el.textContent = config.text || config.title;
        }

        const stage = document.querySelector('.artboard') || document.querySelector('.geometry-stage') || document.querySelector('#app-content');
        if (stage) stage.appendChild(el);
      }

      if (el) {
        // Background elements preserve natural flow
        if (config.type === 'background') {
          if (config.zIndex) el.style.zIndex = config.zIndex;
          if (config.opacity !== undefined) el.style.opacity = (config.opacity / 100).toString();
          if (config.visible === false) el.style.display = 'none';
          return;
        }

        el.style.position = 'absolute';
        el.style.left = `${config.x}%`;
        el.style.top = `${config.y}%`;
        el.style.width = `${config.width}%`;
        el.style.height = `${config.height}%`;
        if (config.zIndex) el.style.zIndex = config.zIndex;
        if (config.opacity !== undefined) el.style.opacity = (config.opacity / 100).toString();
        if (config.visible === false) el.style.display = 'none';

        const img = el.querySelector('img') || (el.tagName === 'IMG' ? el : null);
        if (img && config.assetUrl && img.src !== config.assetUrl) {
          img.src = config.assetUrl;
        }
        if (img && config.objectFit) {
          img.style.objectFit = config.objectFit;
        }
      }
    });
  } catch (err) {
    console.warn(`[ApplySavedLayout ${pageId}]:`, err.message);
  }
}
