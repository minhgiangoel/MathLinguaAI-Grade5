/**
 * MyProgressView.js - Clean, Compact, Student-Friendly Learning Analytics Dashboard
 * Bright Galaxy Pop Space Theme for Grade 5 MathLingua AI Students.
 */

import { fetchAnalyticsData, processAnalytics } from '../services/progressAnalytics.js';

/**
 * Skill Palette Mapping
 */
const SKILL_CONFIG = {
  listening: {
    key: 'listening',
    nameEn: 'Listening',
    nameVi: 'Nghe hiểu',
    icon: '🎧',
    color: '#38BDF8', // Sky Blue
    bgAlpha: 'rgba(56, 189, 248, 0.15)',
    borderAlpha: 'rgba(56, 189, 248, 0.4)'
  },
  speaking: {
    key: 'speaking',
    nameEn: 'Speaking',
    nameVi: 'Nói & Phát âm',
    icon: '🎙️',
    color: '#A78BFA', // Violet/Purple
    bgAlpha: 'rgba(167, 139, 250, 0.15)',
    borderAlpha: 'rgba(167, 139, 250, 0.4)'
  },
  reading: {
    key: 'reading',
    nameEn: 'Reading',
    nameVi: 'Đọc hiểu',
    icon: '📖',
    color: '#5EEAD4', // Mint/Teal
    bgAlpha: 'rgba(94, 234, 212, 0.15)',
    borderAlpha: 'rgba(94, 234, 212, 0.4)'
  },
  writing: {
    key: 'writing',
    nameEn: 'Writing',
    nameVi: 'Viết & Diễn đạt',
    icon: '✍️',
    color: '#FDBA74', // Warm Orange
    bgAlpha: 'rgba(253, 186, 116, 0.15)',
    borderAlpha: 'rgba(253, 186, 116, 0.4)'
  }
};

/**
 * Format timestamp into friendly Vietnamese relative format
 */
function formatDateVi(dateStr) {
  if (!dateStr) return 'Chưa có lượt học';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Chưa có lượt học';

  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 2) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Get Activity Module Type Badge HTML
 */
function getActivityTypeBadge(evt) {
  const mod = evt.sourceModule || '';
  if (mod === 'mathbuddy_ai') {
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>🤖 AI Buddy</span>`;
  }
  if (mod === 'math_lab' || mod === 'mathlab') {
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>🎮 Math Lab</span>`;
  }
  return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>📖 Bài học</span>`;
}

/**
 * Get Readable Activity Title
 */
function getActivityTitle(evt) {
  if (evt.activityTitle) return evt.activityTitle;
  const act = evt.activityId || '';
  if (act.includes('mixed_numbers') || act.includes('raci')) return 'Hỗn số & Thám hiểm RACI Adventure';
  if (act.includes('hectare') || act.includes('area')) return 'Héc-ta & Km² (Đơn vị diện tích)';
  if (act.includes('decimal')) return 'Số thập phân & Phân số thập phân';
  if (act.includes('geometry') || act.includes('3d')) return 'Xưởng Hình học 3D Spatial Studio';
  if (act.includes('mathbuddy') || evt.sourceModule === 'mathbuddy_ai') return 'Hội thoại Tiếng Anh Toán học cùng MathBuddy AI';
  return 'Luyện tập Toán Tiếng Anh Grade 5';
}

/**
 * Get Topic Display Name
 */
function getTopicNameVi(topicId) {
  const map = {
    chapter1: 'Phân số & Hỗn số',
    chapter2: 'Số thập phân',
    chapter3: 'Tỉ số & Phần trăm',
    chapter4: 'Hình học & Diện tích',
    mathlab: 'Math Lab Tương tác'
  };
  return map[topicId] || 'Chủ đề Grade 5';
}

/**
 * Render Compact 4-Axis SVG Radar Chart (~220-240px height)
 * Safely handles unassessed skills without forcing 0%
 */
function renderRadarChartSVG(processedSkills = []) {
  const cx = 130;
  const cy = 115;
  const R = 75; // Outer radius

  const skillDict = {};
  processedSkills.forEach(s => {
    skillDict[s.key] = s;
  });

  // 4 Axes: Top (-90°), Right (0°), Bottom (90°), Left (180°)
  const axesDef = [
    { key: 'listening', angle: -Math.PI / 2, labelX: 130, labelY: 20, align: 'middle' },
    { key: 'speaking', angle: 0, labelX: 228, labelY: 119, align: 'start' },
    { key: 'reading', angle: Math.PI / 2, labelX: 130, labelY: 215, align: 'middle' },
    { key: 'writing', angle: Math.PI, labelX: 32, labelY: 119, align: 'end' }
  ];

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const gridPolygonsHtml = gridLevels.map(level => {
    const points = axesDef.map(ax => {
      const r = R * level;
      const x = cx + r * Math.cos(ax.angle);
      const y = cy + r * Math.sin(ax.angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${points}" fill="none" stroke="#2A3F68" stroke-width="${level === 1.0 ? '1.5' : '1'}" stroke-dasharray="${level === 1.0 ? '0' : '3,3'}" />`;
  }).join('');

  const axisLinesHtml = axesDef.map(ax => {
    const x = cx + R * Math.cos(ax.angle);
    const y = cy + R * Math.sin(ax.angle);
    const cfg = SKILL_CONFIG[ax.key] || {};
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${cfg.color || '#334155'}" stroke-width="1.5" stroke-opacity="0.35" />`;
  }).join('');

  const assessedNodes = [];
  axesDef.forEach(ax => {
    const skData = skillDict[ax.key];
    const cfg = SKILL_CONFIG[ax.key] || {};
    const isAssessed = skData && skData.isAssessed && typeof skData.scorePercent === 'number';
    const score = isAssessed ? skData.scorePercent : null;

    if (isAssessed) {
      const r = R * (score / 100);
      const x = cx + r * Math.cos(ax.angle);
      const y = cy + r * Math.sin(ax.angle);
      assessedNodes.push({ key: ax.key, score, x, y, color: cfg.color });
    }
  });

  let dataPolygonHtml = '';
  if (assessedNodes.length >= 2) {
    const pointsStr = assessedNodes.map(n => `${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(' ');
    dataPolygonHtml = `
      <polygon points="${pointsStr}" fill="url(#radarGradient)" fill-opacity="0.35" stroke="#38BDF8" stroke-width="2" stroke-linejoin="round" />
    `;
  }

  const nodeMarkersHtml = axesDef.map(ax => {
    const skData = skillDict[ax.key];
    const cfg = SKILL_CONFIG[ax.key] || {};
    const isAssessed = skData && skData.isAssessed && typeof skData.scorePercent === 'number';
    const score = isAssessed ? skData.scorePercent : null;

    if (isAssessed) {
      const r = R * (score / 100);
      const nodeX = cx + r * Math.cos(ax.angle);
      const nodeY = cy + r * Math.sin(ax.angle);

      return `
        <circle cx="${nodeX.toFixed(1)}" cy="${nodeY.toFixed(1)}" r="5" fill="${cfg.color}" stroke="#0F172A" stroke-width="1.5" />
        <g transform="translate(${nodeX.toFixed(1)}, ${nodeY.toFixed(1)})">
          <rect x="-14" y="-16" width="28" height="12" rx="6" fill="#0F224A" stroke="${cfg.color}" stroke-width="1" />
          <text x="0" y="-7" fill="#F8FAFC" font-size="8" font-weight="800" text-anchor="middle">${score}%</text>
        </g>
      `;
    } else {
      const rUnassessed = R * 0.45;
      const unX = cx + rUnassessed * Math.cos(ax.angle);
      const unY = cy + rUnassessed * Math.sin(ax.angle);

      return `
        <circle cx="${unX.toFixed(1)}" cy="${unY.toFixed(1)}" r="4" fill="#172F59" stroke="#64748B" stroke-width="1" stroke-dasharray="2,2" />
      `;
    }
  }).join('');

  const axisTitlesHtml = axesDef.map(ax => {
    const cfg = SKILL_CONFIG[ax.key] || {};
    return `
      <text x="${ax.labelX}" y="${ax.labelY}" fill="${cfg.color}" font-size="10" font-weight="800" text-anchor="${ax.align}">
        ${cfg.icon} ${cfg.nameVi}
      </text>
    `;
  }).join('');

  let centerBadgeHtml = '';
  if (assessedNodes.length < 2) {
    centerBadgeHtml = `
      <rect x="50" y="102" width="160" height="26" rx="8" fill="#0F172A" stroke="#38BDF8" stroke-width="1" stroke-dasharray="3,3" opacity="0.9" />
      <text x="130" y="118" fill="#CBD5E1" font-size="9" font-weight="700" text-anchor="middle">Cần làm bài để kích hoạt Radar</text>
    `;
  }

  return `
    <div class="relative flex flex-col items-center justify-center">
      <svg viewBox="0 0 260 230" class="w-full max-w-[240px] h-[210px] sm:h-[230px] overflow-visible">
        <defs>
          <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.6" />
            <stop offset="100%" stop-color="#A78BFA" stop-opacity="0.1" />
          </radialGradient>
        </defs>
        ${gridPolygonsHtml}
        ${axisLinesHtml}
        ${dataPolygonHtml}
        ${nodeMarkersHtml}
        ${axisTitlesHtml}
        ${centerBadgeHtml}
      </svg>
    </div>
  `;
}

/**
 * Render Single Personalized Next-Step Recommendation Card
 */
function renderSingleRecommendation(processed) {
  const recs = processed.recommendations || [];
  const primaryRec = recs.length > 0 ? recs[0] : {
    badge: 'Ưu tiên học tập',
    titleVi: 'Hỗn Số & Phân Số Thập Phân',
    titleEn: 'Mixed Numbers & Decimal Fractions',
    descVi: 'Bắt đầu bài học cơ bản thuộc Chương 1 để ghi nhận bằng chứng học tập và kích hoạt đánh giá kỹ năng.',
    actionTextVi: 'Tiếp tục học ngay',
    actionHash: '#lesson_mixed_numbers'
  };

  return `
    <div class="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 rounded-2xl p-4 sm:p-5 border border-cyan-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1.5 max-w-2xl">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            🎯 ${primaryRec.badge || 'Nhiệm vụ tiếp theo'}
          </span>
          <span class="text-xs text-slate-400 font-medium">${primaryRec.titleEn || ''}</span>
        </div>
        <h3 class="font-extrabold text-white text-base sm:text-lg flex items-center gap-2">
          <span>${primaryRec.titleVi}</span>
        </h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          ${primaryRec.descVi}
        </p>
      </div>

      <button class="btn-rec-action self-start sm:self-center shrink-0 py-2.5 px-5 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center space-x-2 border border-cyan-400/30 cursor-pointer" data-hash="${primaryRec.actionHash}">
        <span>${primaryRec.actionTextVi || 'Bắt đầu ngay'}</span>
        <span>➔</span>
      </button>
    </div>
  `;
}

export async function renderMyProgressView(containerEl, onNavigate) {
  if (!containerEl) return;

  // Render Compact Skeleton Shell
  containerEl.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-6 text-slate-100 animate-fadeIn">
      
      <!-- SKELETON LOADING STATE -->
      <div id="progress-loading" class="space-y-6 py-2">
        <div class="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 animate-pulse flex justify-between items-center">
          <div class="space-y-2 w-2/3">
            <div class="h-6 w-1/2 bg-slate-800 rounded"></div>
            <div class="h-3 w-1/3 bg-slate-800/60 rounded"></div>
          </div>
          <div class="h-9 w-32 bg-slate-800 rounded-xl"></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          ${[1, 2, 3].map(() => `
            <div class="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 animate-pulse space-y-2">
              <div class="h-3 w-20 bg-slate-800 rounded"></div>
              <div class="h-7 w-16 bg-slate-800 rounded"></div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- MAIN DASHBOARD CONTENT -->
      <div id="progress-dashboard" class="hidden space-y-6">
        
        <!-- 1. COMPACT LEARNING JOURNEY HEADER -->
        <div class="relative bg-gradient-to-r from-slate-950 via-indigo-950/90 to-slate-950 rounded-2xl p-4 sm:p-5 border border-cyan-500/30 shadow-xl overflow-hidden">
          <div class="absolute -top-10 -right-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1">
              <h1 class="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Hành Trình Học Tập Của Bạn</span>
                <span class="text-lg">🚀</span>
              </h1>
              <div class="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span id="student-name-display" class="font-bold text-cyan-200">Học sinh Khách</span>
                <span class="text-slate-600">•</span>
                <span class="text-slate-400">Lần học gần nhất: <span id="student-last-active" class="text-amber-300 font-medium">Chưa có</span></span>
              </div>
            </div>

            <button id="btn-continue-learning" class="py-2.5 px-4 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 border border-cyan-400/30 shrink-0 cursor-pointer">
              <span>Tiếp tục học ngay</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        <!-- 2. THREE SUMMARY KPI CARDS -->
        <section id="section-kpis" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <!-- KPI 1: Topics Studied -->
          <div class="bg-slate-900/90 rounded-2xl p-4 border border-cyan-500/30 shadow-lg relative overflow-hidden">
            <div class="flex justify-between items-start">
              <div class="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Chủ đề đã học</div>
              <span class="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-sm">📚</span>
            </div>
            <div id="kpi-topics-studied" class="text-2xl sm:text-3xl font-black text-cyan-300 mt-2">0 / 5</div>
            <div class="text-slate-400 text-[11px] mt-0.5">Khung chương trình Grade 5</div>
          </div>

          <!-- KPI 2: Learning Activities -->
          <div class="bg-slate-900/90 rounded-2xl p-4 border border-purple-500/30 shadow-lg relative overflow-hidden">
            <div class="flex justify-between items-start">
              <div class="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Hoạt động hoàn thành</div>
              <span class="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-sm">🎯</span>
            </div>
            <div id="kpi-total-evidence" class="text-2xl sm:text-3xl font-black text-purple-300 mt-2">0</div>
            <div class="text-slate-400 text-[11px] mt-0.5">Bài tập, Game & AI Chat</div>
          </div>

          <!-- KPI 3: Topic Proficiency -->
          <div class="bg-slate-900/90 rounded-2xl p-4 border border-emerald-500/30 shadow-lg relative overflow-hidden">
            <div class="flex justify-between items-start">
              <div class="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Mức độ thành thạo</div>
              <span class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm">🏆</span>
            </div>
            <div id="kpi-overall-mastery" class="text-2xl sm:text-3xl font-black text-emerald-300 mt-2">0%</div>
            <div class="text-slate-400 text-[11px] mt-0.5">Mức độ thành thạo trung bình</div>
          </div>
        </section>

        <!-- 3. TOPIC MASTERY GRID -->
        <section class="space-y-3">
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <h2 class="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <span>🎯</span>
              <span>Mức Độ Thành Thạo Theo Chủ Đề</span>
            </h2>
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">5 Chủ đề chính</span>
          </div>

          <div id="topic-mastery-cards" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Dynamic Topic Cards Rendered Here -->
          </div>
        </section>

        <!-- 4. ENGLISH SKILLS COMPARISON -->
        <section class="space-y-3">
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <h2 class="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <span>🗣️</span>
              <span>Bảng Phân Tích 4 Kỹ Năng Tiếng Anh Toán Học</span>
            </h2>
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-slate-700">Đánh giá AI</span>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            <!-- LEFT: Compact Radar Chart (~220-240px height) + Legend -->
            <div class="lg:col-span-5 bg-slate-900/90 rounded-2xl p-4 border border-indigo-500/30 shadow-xl flex flex-col justify-between space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="font-extrabold text-white text-sm flex items-center gap-1.5">
                  <span>🕸️</span>
                  <span>Biểu Đồ Radar 4 Kỹ Năng</span>
                </h3>
              </div>

              <!-- SVG Radar Chart Container -->
              <div id="radar-chart-wrapper" class="w-full flex items-center justify-center">
                <!-- SVG Rendered Dynamically -->
              </div>

              <!-- Skill Color Legend -->
              <div class="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800 text-[10px]">
                <div class="flex items-center space-x-1.5 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#38BDF8]"></span>
                  <span class="text-slate-200 font-bold">Nghe hiểu</span>
                </div>
                <div class="flex items-center space-x-1.5 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#A78BFA]"></span>
                  <span class="text-slate-200 font-bold">Nói & Phát âm</span>
                </div>
                <div class="flex items-center space-x-1.5 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#5EEAD4]"></span>
                  <span class="text-slate-200 font-bold">Đọc hiểu</span>
                </div>
                <div class="flex items-center space-x-1.5 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#FDBA74]"></span>
                  <span class="text-slate-200 font-bold">Viết & Diễn đạt</span>
                </div>
              </div>
            </div>

            <!-- RIGHT: 4 Horizontal Skill Rows -->
            <div class="lg:col-span-7 space-y-3 flex flex-col justify-between">
              <div id="english-skill-rows" class="space-y-2.5">
                <!-- Rendered dynamically -->
              </div>
            </div>
          </div>
        </section>

        <!-- 5. SINGLE PERSONALIZED NEXT-STEP RECOMMENDATION CARD -->
        <section class="space-y-2">
          <div class="flex items-center justify-between pb-1 border-b border-slate-800">
            <h2 class="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <span>💡</span>
              <span>Gợi Ý Học Tập Cá Nhân Hóa</span>
            </h2>
          </div>

          <div id="recommendation-single-container">
            <!-- Rendered dynamically -->
          </div>
        </section>

        <!-- 6. RECENT LEARNING ACTIVITY LOG (Collapsible) -->
        <section class="space-y-2">
          <details class="group bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden" open>
            <summary class="p-4 cursor-pointer font-extrabold text-white text-sm sm:text-base flex items-center justify-between select-none hover:bg-slate-800/40 transition-colors">
              <span class="flex items-center gap-2">
                <span>📋</span>
                <span>Nhật Ký Hoạt Động Học Tập Gần Đây</span>
              </span>
              <span class="transform group-open:rotate-180 transition-transform text-slate-400 text-xs">▼</span>
            </summary>

            <div id="recent-activity-container" class="border-t border-slate-800">
              <!-- Rendered dynamically -->
            </div>
          </details>
        </section>

      </div>
    </div>
  `;

  // Fetch Real Analytics Data
  const rawData = await fetchAnalyticsData();
  const processed = processAnalytics(rawData.events || [], rawData.legacyProgress || []);

  // Hide Skeleton, Reveal Dashboard
  const loadingEl = containerEl.querySelector('#progress-loading');
  const dashboardEl = containerEl.querySelector('#progress-dashboard');
  if (loadingEl) loadingEl.classList.add('hidden');
  if (dashboardEl) dashboardEl.classList.remove('hidden');

  // Update Student Display & Last Active Metadata
  const nameDisplay = containerEl.querySelector('#student-name-display');
  const lastActiveEl = containerEl.querySelector('#student-last-active');
  if (nameDisplay) {
    nameDisplay.textContent = rawData.userDisplayName || 'Học sinh Khách';
  }

  const eventsList = rawData.events || [];
  if (eventsList.length > 0) {
    const sortedEvts = [...eventsList].sort((a, b) => new Date(b.assessedAt || 0) - new Date(a.assessedAt || 0));
    const lastEvt = sortedEvts[0];
    if (lastActiveEl) lastActiveEl.textContent = formatDateVi(lastEvt.assessedAt);
  } else {
    if (lastActiveEl) lastActiveEl.textContent = 'Chưa có';
  }

  // Update KPI Summary Values
  const kpiTopics = containerEl.querySelector('#kpi-topics-studied');
  const kpiTotal = containerEl.querySelector('#kpi-total-evidence');
  const kpiMastery = containerEl.querySelector('#kpi-overall-mastery');

  if (kpiTopics) kpiTopics.textContent = `${processed.overall.topicsStudied} / 5`;
  if (kpiTotal) kpiTotal.textContent = `${processed.overall.totalEvidenceItems}`;
  
  const hasEvidence = processed.overall.totalEvidenceItems > 0;
  if (kpiMastery) {
    kpiMastery.textContent = hasEvidence 
      ? `${processed.overall.overallProficiencyPercent || processed.overall.overallMasteryPercent || 0}%` 
      : 'Chưa đánh giá';
  }

  // Attach Continue Learning CTA
  const continueBtn = containerEl.querySelector('#btn-continue-learning');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      if (typeof onNavigate === 'function') {
        onNavigate('#lesson_mixed_numbers');
      } else {
        window.location.hash = '#lesson_mixed_numbers';
      }
    });
  }

  // 3. RENDER TOPIC MASTERY CARDS
  const topicCardsContainer = containerEl.querySelector('#topic-mastery-cards');
  if (topicCardsContainer) {
    topicCardsContainer.innerHTML = processed.topicMasteryList.map(tm => {
      const isUnassessed = tm.masteryLevel === 'unassessed' || tm.eventCount === 0;
      const scorePercent = tm.avgScorePercent !== null ? tm.avgScorePercent : 0;

      return `
        <div class="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all">
          <div>
            <!-- Topic Header -->
            <div class="flex items-start justify-between gap-2.5 mb-2.5">
              <div class="flex items-center space-x-2.5">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold shrink-0" style="background-color: ${tm.definition.color}20; color: ${tm.definition.color}">
                  ${tm.definition.icon}
                </div>
                <div>
                  <h3 class="font-extrabold text-slate-100 text-sm leading-tight">${tm.definition.titleVi}</h3>
                  <p class="text-[11px] text-slate-400 font-medium">${tm.definition.titleEn}</p>
                </div>
              </div>
            </div>

            <!-- Status & Progress -->
            <div class="my-3 space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400 font-medium">Trạng thái:</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${tm.badgeClass}">
                  ${tm.masteryLabelVi}
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="space-y-1">
                <div class="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Tiến độ thành thạo</span>
                  <span class="font-bold text-slate-200">${isUnassessed ? 'Chưa đánh giá' : `${scorePercent}%`}</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div class="h-2 rounded-full transition-all duration-500" style="width: ${isUnassessed ? 0 : scorePercent}%; background-color: ${tm.definition.color}"></div>
                </div>
              </div>

              <div class="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                <span>Số lượt: <strong class="text-slate-200">${tm.eventCount}</strong></span>
                <span>${isUnassessed ? 'Chưa có điểm' : `Thành thạo: <strong class="text-cyan-300">${scorePercent}%</strong>`}</span>
              </div>
            </div>

            <!-- Objectives Accordion -->
            <details class="group border-t border-slate-800 pt-2 text-xs text-slate-300">
              <summary class="cursor-pointer font-semibold text-slate-400 hover:text-white flex items-center justify-between py-0.5 select-none text-[11px]">
                <span class="flex items-center gap-1">
                  <span class="text-cyan-400">📋</span>
                  <span>Mục tiêu chi tiết (${tm.objectives.length})</span>
                </span>
                <span class="transform group-open:rotate-180 transition-transform text-slate-500">▼</span>
              </summary>
              <div class="mt-2 space-y-1.5 pl-1">
                ${tm.objectives.map(obj => `
                  <div class="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 flex justify-between items-center text-[11px]">
                    <div>
                      <div class="font-semibold text-slate-200">${obj.titleVi}</div>
                      <div class="text-[10px] text-slate-400">${obj.titleEn}</div>
                    </div>
                    <span class="${obj.scorePercent !== null ? 'text-cyan-300 font-bold' : 'text-slate-500 font-medium'} shrink-0 ml-2">
                      ${obj.scorePercent !== null ? `${obj.scorePercent}%` : 'Chưa đánh giá'}
                    </span>
                  </div>
                `).join('')}
              </div>
            </details>
          </div>

          <!-- Action Button -->
          <button class="btn-practice-topic mt-4 w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition-all border border-slate-700/80 flex items-center justify-center space-x-1 shadow cursor-pointer" data-topic="${tm.topicId}">
            <span>Luyện tập chủ đề này</span>
            <span>➔</span>
          </button>
        </div>
      `;
    }).join('');

    topicCardsContainer.querySelectorAll('.btn-practice-topic').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const topicId = e.currentTarget.getAttribute('data-topic');
        let targetHash = '#topics';
        if (topicId === 'chapter1') targetHash = '#lesson_mixed_numbers';
        else if (topicId === 'mathlab') targetHash = '#mathlab';

        if (typeof onNavigate === 'function') {
          onNavigate(targetHash);
        } else {
          window.location.hash = targetHash;
        }
      });
    });
  }

  // 4. RENDER ENGLISH SKILLS COMPARISON
  const radarWrapper = containerEl.querySelector('#radar-chart-wrapper');
  if (radarWrapper) {
    radarWrapper.innerHTML = renderRadarChartSVG(processed.processedSkills);
  }

  const skillRowsContainer = containerEl.querySelector('#english-skill-rows');
  if (skillRowsContainer) {
    skillRowsContainer.innerHTML = processed.processedSkills.map(sk => {
      const cfg = SKILL_CONFIG[sk.key] || SKILL_CONFIG.listening;
      const isAssessed = sk.isAssessed && typeof sk.scorePercent === 'number';
      const scoreVal = isAssessed ? sk.scorePercent : 0;

      return `
        <div class="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 shadow-md space-y-2 hover:border-slate-700 transition-all">
          <div class="flex items-center justify-between gap-2">
            
            <div class="flex items-center space-x-2.5">
              <span class="text-lg p-1.5 rounded-lg bg-slate-950 border border-slate-800" style="color: ${cfg.color}">${cfg.icon}</span>
              <div>
                <div class="flex items-center space-x-1.5">
                  <h4 class="font-extrabold text-white text-xs sm:text-sm">${sk.nameVi}</h4>
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-bold" style="background-color: ${cfg.bgAlpha}; color: ${cfg.color}">
                    ${sk.nameEn}
                  </span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">
                  Bằng chứng: <strong class="text-slate-200">${sk.evidenceCount} lượt</strong>
                </div>
              </div>
            </div>

            <div class="flex items-center space-x-3">
              <div class="text-right">
                <div class="text-[10px] text-slate-400">Kết quả</div>
                <div class="text-sm sm:text-base font-black" style="color: ${isAssessed ? cfg.color : '#94A3B8'}">
                  ${isAssessed ? `${scoreVal}%` : 'Chưa đánh giá'}
                </div>
              </div>

              <button class="btn-skill-action py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-lg border border-slate-700/80 transition-all flex items-center space-x-1 shadow cursor-pointer" data-skill="${sk.key}">
                <span>Luyện tập</span>
                <span class="text-xs">➔</span>
              </button>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-slate-950 rounded-full h-2 p-0.5 border border-slate-800/80 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500" style="width: ${isAssessed ? scoreVal : 0}%; background-color: ${cfg.color}"></div>
          </div>
        </div>
      `;
    }).join('');

    skillRowsContainer.querySelectorAll('.btn-skill-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const skillKey = e.currentTarget.getAttribute('data-skill');
        let hash = '#mathbuddy';
        if (skillKey === 'reading') hash = '#topics';
        if (skillKey === 'writing') hash = '#mathlab';

        if (typeof onNavigate === 'function') {
          onNavigate(hash);
        } else {
          window.location.hash = hash;
        }
      });
    });
  }

  // 5. RENDER SINGLE RECOMMENDATION CARD
  const recContainer = containerEl.querySelector('#recommendation-single-container');
  if (recContainer) {
    recContainer.innerHTML = renderSingleRecommendation(processed);

    recContainer.querySelectorAll('.btn-rec-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetHash = e.currentTarget.getAttribute('data-hash');
        if (typeof onNavigate === 'function') {
          onNavigate(targetHash);
        } else {
          window.location.hash = targetHash;
        }
      });
    });
  }

  // 6. RENDER RECENT ACTIVITY LOG
  const activityContainer = containerEl.querySelector('#recent-activity-container');
  if (activityContainer) {
    if (eventsList.length === 0) {
      activityContainer.innerHTML = `
        <div class="p-6 text-center space-y-3">
          <div class="text-3xl">🌟</div>
          <div class="space-y-1">
            <h3 class="text-xs sm:text-sm font-bold text-white">Chưa có lượt học nào được ghi nhận</h3>
            <p class="text-[11px] text-slate-400 max-w-md mx-auto">Hãy bắt đầu bài học đầu tiên trong Thư viện chủ đề hoặc tham gia trò chơi trong Math Lab!</p>
          </div>
          <div class="pt-1 flex flex-wrap justify-center gap-2">
            <button class="btn-start-now py-2 px-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer" data-hash="#lesson_mixed_numbers">
              Học Bài Hỗn Số
            </button>
            <button class="btn-start-now py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer" data-hash="#mathlab">
              Vào Math Lab Game
            </button>
          </div>
        </div>
      `;

      activityContainer.querySelectorAll('.btn-start-now').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const targetHash = e.currentTarget.getAttribute('data-hash');
          if (typeof onNavigate === 'function') {
            onNavigate(targetHash);
          } else {
            window.location.hash = targetHash;
          }
        });
      });
    } else {
      const sortedEvents = [...eventsList]
        .sort((a, b) => new Date(b.assessedAt || 0) - new Date(a.assessedAt || 0))
        .slice(0, 8);

      activityContainer.innerHTML = `
        <!-- Desktop Table View -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-800/80 text-slate-300 font-bold border-b border-slate-800">
                <th class="p-3 pl-4">Tên hoạt động</th>
                <th class="p-3">Chủ đề</th>
                <th class="p-3">Loại hình</th>
                <th class="p-3 text-center">Mức thành thạo</th>
                <th class="p-3">Thời gian</th>
                <th class="p-3 pr-4 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-slate-300">
              ${sortedEvents.map(evt => {
                const title = getActivityTitle(evt);
                const topicName = getTopicNameVi(evt.topicId);
                const badgeHtml = getActivityTypeBadge(evt);
                const score = typeof evt.score === 'number' ? evt.score : null;
                const scoreStr = score !== null ? `${score}%` : 'Đã thực hiện';
                const dateStr = formatDateVi(evt.assessedAt);

                return `
                  <tr class="hover:bg-slate-800/40 transition-colors">
                    <td class="p-3 pl-4 font-bold text-slate-100 flex items-center gap-2">
                      <span>✨</span>
                      <span>${title}</span>
                    </td>
                    <td class="p-3 font-medium text-slate-400">${topicName}</td>
                    <td class="p-3">${badgeHtml}</td>
                    <td class="p-3 text-center font-extrabold ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-cyan-300' : 'text-amber-300'}">
                      ${scoreStr}
                    </td>
                    <td class="p-3 text-slate-400">${dateStr}</td>
                    <td class="p-3 pr-4 text-right">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Hoàn thành
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Mobile Stacked Card View -->
        <div class="block md:hidden divide-y divide-slate-800/80">
          ${sortedEvents.map(evt => {
            const title = getActivityTitle(evt);
            const topicName = getTopicNameVi(evt.topicId);
            const badgeHtml = getActivityTypeBadge(evt);
            const score = typeof evt.score === 'number' ? evt.score : null;
            const scoreStr = score !== null ? `${score}%` : 'Đã thực hiện';
            const dateStr = formatDateVi(evt.assessedAt);

            return `
              <div class="p-3 space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <h4 class="font-bold text-xs text-slate-100 leading-snug">${title}</h4>
                  <span class="font-extrabold text-xs shrink-0 ${score >= 80 ? 'text-emerald-400' : 'text-cyan-300'}">
                    ${scoreStr}
                  </span>
                </div>
                <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span>${topicName}</span>
                  <span>•</span>
                  <span>${dateStr}</span>
                </div>
                <div class="pt-0.5 flex items-center justify-between">
                  ${badgeHtml}
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Hoàn thành
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }
}
