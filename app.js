import { ASSET_MANIFEST } from './assetManifest.js';
import {
  loginUser,
  registerStudentAccount,
  changeUserPassword,
  logoutUser,
  saveStudentProgress,
  fetchStudentProgress,
  fetchAllStudentsProgress,
  fetchAllStudents,
  fetchLearningMaterials,
  saveLearningMaterial,
  deleteLearningMaterial,
  resetStudentPassword,
  fetchAdminSettings,
  saveAdminSettings,
  fetchAdminOverview,
  uploadAdminAsset,
  onAuthStateChanged
} from './src/services/firebaseAuth.js';
import { AVATAR_PRESETS, renderAvatarSvg } from './src/utils/avatars.js';
import { HECTARE_KM2_LESSON_DATA } from './src/data/lessonsData.js';
import { DECIMAL_FRACTIONS_LESSON_DATA } from './src/data/decimalFractionsData.js';
import { renderLessonPlayerContainer } from './src/components/LessonPlayer.js';
import { VisualLayoutEditor, applySavedPageLayout } from './src/components/VisualLayoutEditor.js';
import { renderMixedNumbersEmbed } from './src/components/lessons/mixed-numbers/MixedNumbersEmbed.js';
import { renderDecimalNumberEmbed } from './src/components/lessons/decimal-number/DecimalNumberEmbed.js';
import { renderComparingDecimalNumbersEmbed } from './src/components/lessons/comparing-decimal-numbers/ComparingDecimalNumbersEmbed.js';
import { renderMixedNumberAdventureEmbed } from './src/components/math-lab/MixedNumberAdventureEmbed.js';
import { renderAntsFoodQuestEmbed } from './src/components/math-lab/AntsFoodQuestEmbed.js';
import { renderMysteryPiecesEmbed } from './src/components/math-lab/MysteryPiecesEmbed.js';
import { renderMathBuddyConversation } from './src/components/mathbuddy/MathBuddyPartner.js';
import { renderMyProgressView } from './src/components/MyProgressView.js';
import { recordLearningEvent, clearGuestSessionEvents } from './src/services/progressAnalytics.js';

(() => {
  const NAV = {
    home:    { left: 26.5, width: 10.5, en: 'Home', vi: 'Trang chủ' },
    topics:  { left: 37.0, width: 12.0, en: 'Topics Library', vi: 'Thư viện chủ đề' },
    mathlab: { left: 49.0, width: 10.5, en: 'Math Lab', vi: 'Vui học Toán' },
    buddy:   { left: 59.5, width: 11.0, en: 'MathBuddy AI', vi: 'Trợ lí Toán học' },
    progress:{ left: 70.5, width: 11.5, en: 'My Progress', vi: 'Hồ sơ tiến bộ' },
  };

  const HECTARE_PUBLISHED_LESSON_URL = 'https://mathlingua-ai-square-kilometre-hectare.ai.studio';
  const DECIMAL_FRACTIONS_PUBLISHED_LESSON_URL = 'https://math-lingua-ai-grade5-decimal-fract.vercel.app/';
  const GEOMETRY_3D_LAB_URL = '/assets/math-lab/3d_geometry_lab.html';

  // Global Audio Manager for Background Music (Home Page Only) & Button Sound Effects
  const AUDIO_SRC = '/assets/audio/The_Rocket_Playground.mp3';

  let bgAudio = null;
  let buttonAudioCtx = null;

  function initBgMusic() {
    if (bgAudio) return;
    bgAudio = new Audio(AUDIO_SRC);
    bgAudio.loop = true;
    bgAudio.volume = 0.5;

    if (currentRoute === 'home') {
      attemptPlayBgMusic();
    }

    const unlockAudio = () => {
      if (currentRoute === 'home' && bgAudio && bgAudio.paused) {
        attemptPlayBgMusic();
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
  }

  function attemptPlayBgMusic() {
    if (!bgAudio) return;
    bgAudio.volume = 0.5;
    const playPromise = bgAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Autoplay waiting for user interaction on Home:', err);
      });
    }
  }

  function handleRouteMusic(targetRoute) {
    if (!bgAudio) {
      initBgMusic();
      return;
    }
    if (targetRoute === 'home') {
      bgAudio.volume = 0.5;
      if (bgAudio.paused) {
        attemptPlayBgMusic();
      }
    } else {
      if (bgAudio && !bgAudio.paused) {
        bgAudio.pause();
      }
    }
  }

  // Global Pleasant Click Sound Effect Generator via Web Audio API
  function playButtonSound() {
    try {
      if (!buttonAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        buttonAudioCtx = new AudioContext();
      }
      if (buttonAudioCtx.state === 'suspended') {
        buttonAudioCtx.resume().catch(() => {});
      }
      const osc = buttonAudioCtx.createOscillator();
      const gain = buttonAudioCtx.createGain();

      // Soft, clear, kid-friendly click sound (approx 50ms)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, buttonAudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, buttonAudioCtx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.18, buttonAudioCtx.currentTime); // ~18-20% volume
      gain.gain.exponentialRampToValueAtTime(0.001, buttonAudioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(buttonAudioCtx.destination);

      osc.start(buttonAudioCtx.currentTime);
      osc.stop(buttonAudioCtx.currentTime + 0.05);
    } catch (e) {
      // Ignore Web Audio errors silently
    }
  }

  // Global delegated listener for interactive button clicks
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button, a, [role="button"], .hotspot, .nav-hotspot, input[type="submit"], input[type="button"], select, .choice-btn, .tab-btn, .game-card, .chapter-card, .unit-card, .menu-item-btn, .mobile-nav-item');
    if (target && !target.disabled && !target.hasAttribute('disabled')) {
      playButtonSound();
    }
  }, { capture: true, passive: true });

  const PAGE_META = {
    home: {
      src: ASSET_MANIFEST.home.background,
      fallbackSrc: ASSET_MANIFEST.home.fallbackSvg,
      alt: 'Trang chủ MathLingua AI Grade 5',
      className: 'home-board'
    },
    topics: {
      src: ASSET_MANIFEST.topicsLibrary.background,
      fallbackSrc: ASSET_MANIFEST.topicsLibrary.fallbackSvg,
      alt: 'Thư viện chủ đề với các hành tinh Fraction, Decimal Numbers, Ratio and Percentage, Geometry and Measurement',
      className: 'topics-board'
    },
    mathlab: {
      src: ASSET_MANIFEST.mathLab.background,
      fallbackSrc: ASSET_MANIFEST.mathLab.fallbackSvg,
      alt: 'Math Lab với các trò chơi Toán học tương tác',
      className: 'mathlab-board'
    },
    game_3d_shapes: {
      customRender: true,
      alt: '3D Shape Studio · Khám phá hình học 3D (3D Geometry Lab)'
    },
    game_mixed_numbers: {
      customRender: true,
      alt: 'Phiêu lưu cùng hỗn số / Mixed Number Adventure'
    },
    game_ants: {
      customRender: true,
      alt: 'Kiến tha mồi / Ants Food Quest'
    },
    game_mystery_pieces: {
      customRender: true,
      alt: 'Mảnh ghép bí ẩn / Mystery Pieces'
    },
    buddy: {
      customRender: true,
      alt: 'MathBuddy AI — Your Personal Math Conversation Partner'
    },
    progress: {
      customRender: true,
      src: ASSET_MANIFEST.myProgress.fallbackSvg,
      alt: 'Hồ sơ tiến bộ MathLingua AI'
    },
    admin: {
      customRender: true,
      alt: 'Bảng quản trị và Quản lý học liệu MathLingua AI'
    },
    lesson_ha_km2: {
      customRender: true,
      alt: 'Bài học song ngữ: Hectare and Square Kilometre / Héc-ta và Ki-lô-mét vuông'
    },
    lesson_decimal_fractions: {
      customRender: true,
      alt: 'Bài học song ngữ: Decimal Fractions / Phân số thập phân'
    },
    lesson_decimal_number: {
      customRender: true,
      alt: 'Bài học song ngữ: Decimal Numbers / Số thập phân'
    },
    lesson_comparing_decimals: {
      customRender: true,
      alt: 'Bài học song ngữ: Comparing Decimal Numbers / So sánh các số thập phân'
    },
    lesson_mixed_numbers: {
      customRender: true,
      alt: 'Bài học song ngữ: Mixed Numbers / Hỗn số'
    },
    chapter1: {
      src: ASSET_MANIFEST.chapters.fraction.background,
      fallbackSrc: ASSET_MANIFEST.chapters.fraction.fallbackSvg,
      alt: 'Chủ đề Fraction, gồm Mixed Numbers và Decimal Fractions',
      className: 'chapter-board fraction-board'
    },
    chapter2: {
      src: ASSET_MANIFEST.chapters.decimalNumbers.background,
      fallbackSrc: ASSET_MANIFEST.chapters.decimalNumbers.fallbackSvg,
      alt: 'Chủ đề Decimal Numbers với bảy bài học',
      className: 'chapter-board decimal-board'
    },
    chapter3: {
      src: ASSET_MANIFEST.chapters.ratioPercentage.background,
      fallbackSrc: ASSET_MANIFEST.chapters.ratioPercentage.fallbackSvg,
      alt: 'Chủ đề Ratio and Percentage với năm bài học',
      className: 'chapter-board ratio-board'
    },
    chapter4: {
      customRender: true,
      src: ASSET_MANIFEST.chapters.geometryMeasurement.background,
      fallbackSrc: ASSET_MANIFEST.chapters.geometryMeasurement.fallbackSvg,
      alt: 'Chủ đề Geometry and Measurement / Hình học và đo lường'
    },
  };

  // Centralized data for Geometry and Measurement (Chapter 4)
  const GEOMETRY_UNITS = [
    {
      id: 'ha-km2',
      number: 1,
      titleEn: 'Hectare and Square Kilometre',
      titleVi: 'Héc-ta và ki-lô-mét vuông',
      image: '/assets/topics-library/geometry-measurement/ha-km2-button.png',
      quiz: {
        question: 'How many square metres are in 1 hectare (ha)? / 1 héc-ta (ha) bằng bao nhiêu mét vuông?',
        choices: ['100 m²', '1,000 m²', '10,000 m²', '100,000 m²'],
        correct: 2,
        explanation: '1 ha = 10,000 m²; 1 km² = 100 ha = 1,000,000 m². / 1 héc-ta bằng 10 000 m².'
      },
      vocab: [
        { en: 'hectare (ha)', vi: 'héc-ta' },
        { en: 'square kilometre (km²)', vi: 'ki-lô-mét vuông' },
        { en: 'land area', vi: 'diện tích đất đai' }
      ],
      summary: 'Đơn vị đo diện tích lớn hơn mét vuông: 1 ha = 10 000 m², 1 km² = 100 ha = 1 000 000 m².'
    },
    {
      id: 'triangle',
      number: 2,
      titleEn: 'Area of Triangle',
      titleVi: 'Diện tích hình tam giác',
      image: '/assets/topics-library/geometry-measurement/triangle-button.png',
      quiz: {
        question: 'A triangle has a base of 6 cm and height of 4 cm. What is its area? / Hình tam giác có cạnh đáy 6 cm và chiều cao 4 cm. Diện tích là bao nhiêu?',
        choices: ['24 cm²', '12 cm²', '10 cm²', '20 cm²'],
        correct: 1,
        explanation: 'Area = (base × height) / 2 = (6 × 4) / 2 = 12 cm². / Diện tích = (đáy × chiều cao) : 2 = 12 cm².'
      },
      vocab: [
        { en: 'base', vi: 'cạnh đáy' },
        { en: 'height / altitude', vi: 'chiều cao' },
        { en: 'triangle area', vi: 'diện tích tam giác' }
      ],
      summary: 'Công thức diện tích hình tam giác: S = (a × h) : 2 (với a là độ dài đáy, h là chiều cao tương ứng cùng đơn vị đo).'
    },
    {
      id: 'trapezium',
      number: 3,
      titleEn: 'Trapezium and Area of Trapezium',
      titleVi: 'Hình thang và diện tích hình thang',
      image: '/assets/topics-library/geometry-measurement/Trapezium-button.png',
      quiz: {
        question: 'The parallel bases of a trapezium are 3 cm and 5 cm, and its height is 4 cm. What is its area? / Hình thang có hai đáy 3 cm và 5 cm, chiều cao 4 cm. Diện tích là bao nhiêu?',
        choices: ['16 cm²', '32 cm²', '15 cm²', '12 cm²'],
        correct: 0,
        explanation: 'Area = ((a + b) × h) / 2 = ((3 + 5) × 4) / 2 = 16 cm². / Diện tích = (tổng 2 đáy × chiều cao) : 2 = 16 cm².'
      },
      vocab: [
        { en: 'trapezium', vi: 'hình thang' },
        { en: 'parallel bases', vi: 'các cạnh đáy song song' },
        { en: 'height', vi: 'chiều cao' }
      ],
      summary: 'Diện tích hình thang bằng tổng độ dài hai đáy nhân với chiều cao (cùng đơn vị đo) rồi chia cho 2: S = (a + b) × h : 2.'
    },
    {
      id: 'circumference',
      number: 4,
      titleEn: 'Circumference and Area of a Circle',
      titleVi: 'Chu vi và diện tích hình tròn',
      image: '/assets/topics-library/geometry-measurement/circumference-button.png',
      quiz: {
        question: 'What is the circumference of a circle with radius r = 5 cm? / Chu vi hình tròn bán kính r = 5 cm là bao nhiêu?',
        choices: ['15.7 cm', '31.4 cm', '78.5 cm', '10 cm'],
        correct: 1,
        explanation: 'C = 2 × r × 3.14 = 2 × 5 × 3.14 = 31.4 cm. / Chu vi = 2 × bán kính × 3,14 = 31,4 cm.'
      },
      vocab: [
        { en: 'radius (r)', vi: 'bán kính' },
        { en: 'diameter (d)', vi: 'đường kính' },
        { en: 'circumference (C)', vi: 'chu vi' },
        { en: 'circle area (S)', vi: 'diện tích hình tròn' }
      ],
      summary: 'Chu vi hình tròn: C = d × 3,14 = r × 2 × 3,14. Diện tích hình tròn: S = r × r × 3,14.'
    },
    {
      id: 'net-of-solid',
      number: 5,
      titleEn: 'Nets of Solid',
      titleVi: 'Hình khai triển của hình khối',
      image: '/assets/topics-library/geometry-measurement/net-of-solid-button.png',
      quiz: {
        question: 'How many faces are in the net of a rectangular cuboid? / Hình khai triển của một hình hộp chữ nhật có bao nhiêu mặt?',
        choices: ['4', '6', '8', '12'],
        correct: 1,
        explanation: 'A cuboid has 6 rectangular faces, so its net has 6 faces. / Hình hộp chữ nhật có 6 mặt.'
      },
      vocab: [
        { en: 'net of solid', vi: 'hình khai triển' },
        { en: 'cuboid', vi: 'hình hộp chữ nhật' },
        { en: 'cube', vi: 'hình lập phương' }
      ],
      summary: 'Hình khai triển là hình phẳng thu được khi mở tất cả các mặt của một hình khối không gian.'
    },
    {
      id: 'lateral-surface-area',
      number: 6,
      titleEn: 'Lateral Area and Surface Area',
      titleVi: 'Diện tích xung quanh và diện tích toàn phần',
      image: '/assets/topics-library/geometry-measurement/lateral-surface-area-button.png',
      quiz: {
        question: 'What is the lateral area of a cube with edge length a = 3 cm? / Diện tích xung quanh hình lập phương cạnh 3 cm là bao nhiêu?',
        choices: ['9 cm²', '36 cm²', '54 cm²', '27 cm²'],
        correct: 1,
        explanation: 'Lateral Area = 4 × a × a = 4 × 3 × 3 = 36 cm². Total surface area = 6 × 3 × 3 = 54 cm².'
      },
      vocab: [
        { en: 'lateral area', vi: 'diện tích xung quanh' },
        { en: 'total surface area', vi: 'diện tích toàn phần' }
      ],
      summary: 'S_xq hình hộp chữ nhật = (a + b) × 2 × c. S_tp = S_xq + 2 × a × b. Với hình lập phương: S_xq = a × a × 4, S_tp = a × a × 6.'
    },
    {
      id: 'units-of-volume',
      number: 7,
      titleEn: 'Units of Volume',
      titleVi: 'Đơn vị đo thể tích',
      image: '/assets/topics-library/geometry-measurement/units-of-volume-button.png',
      quiz: {
        question: '1 cubic metre (m³) equals how many cubic decimetres (dm³)? / 1 mét khối bằng bao nhiêu đề-xi-mét khối?',
        choices: ['10 dm³', '100 dm³', '1,000 dm³', '10,000 dm³'],
        correct: 2,
        explanation: '1 m³ = 1,000 dm³ = 1,000,000 cm³. Mỗi đơn vị thể tích gấp 1 000 lần đơn vị bé hơn liền kề.'
      },
      vocab: [
        { en: 'cubic centimetre (cm³)', vi: 'xăng-ti-mét khối' },
        { en: 'cubic decimetre (dm³)', vi: 'đề-xi-mét khối' },
        { en: 'cubic metre (m³)', vi: 'mét khối' }
      ],
      summary: 'Bảng đơn vị thể tích: m³, dm³, cm³. Mỗi đơn vị lớn gấp 1 000 lần đơn vị bé hơn tiếp liền.'
    },
    {
      id: 'volume-of-cuboid-cube',
      number: 8,
      titleEn: 'Volume of Cuboid and Cube',
      titleVi: 'Thể tích hình hộp chữ nhật và hình lập phương',
      image: '/assets/topics-library/geometry-measurement/volume-of-cuboid-cube-button.png',
      quiz: {
        question: 'A cuboid has length 5 cm, width 3 cm, and height 2 cm. What is its volume? / Hình hộp chữ nhật dài 5 cm, rộng 3 cm, cao 2 cm. Thể tích là bao nhiêu?',
        choices: ['10 cm³', '30 cm³', '15 cm³', '25 cm³'],
        correct: 1,
        explanation: 'Volume = length × width × height = 5 × 3 × 2 = 30 cm³. / Thể tích = dài × rộng × cao = 30 cm³.'
      },
      vocab: [
        { en: 'volume (V)', vi: 'thể tích' },
        { en: 'length, width, height', vi: 'dài, rộng, cao' },
        { en: 'cube edge', vi: 'cạnh hình lập phương' }
      ],
      summary: 'Thể tích hình hộp chữ nhật: V = a × b × c. Thể tích hình lập phương: V = a × a × a.'
    },
    {
      id: 'add-sub-time',
      number: 9,
      titleEn: 'Adding and Subtracting Time',
      titleVi: 'Cộng và trừ số đo thời gian',
      image: '/assets/topics-library/geometry-measurement/add-sub-time-button.png',
      quiz: {
        question: 'Calculate: 3 hours 40 minutes + 2 hours 35 minutes = ? / Tính: 3 giờ 40 phút + 2 giờ 35 phút = ?',
        choices: ['5 hours 75 minutes', '6 hours 15 minutes', '6 hours 25 minutes', '5 hours 15 minutes'],
        correct: 1,
        explanation: '3h 40m + 2h 35m = 5h 75m = 6 hours 15 minutes. / 3 giờ 40 phút + 2 giờ 35 phút = 6 giờ 15 phút.'
      },
      vocab: [
        { en: 'hours, minutes, seconds', vi: 'giờ, phút, giây' },
        { en: 'addition of time', vi: 'phép cộng thời gian' },
        { en: 'subtraction of time', vi: 'phép trừ thời gian' }
      ],
      summary: 'Cộng hoặc trừ theo từng đơn vị đo thời gian; đổi sang đơn vị lớn hơn khi số phút hoặc giây ≥ 60.'
    },
    {
      id: 'multi-divide-time',
      number: 10,
      titleEn: 'Multiplying and Dividing Time',
      titleVi: 'Nhân và chia số đo thời gian',
      image: '/assets/topics-library/geometry-measurement/multi-divide-time-button.png',
      quiz: {
        question: 'Calculate: 1 hour 20 minutes × 3 = ? / Tính: 1 giờ 20 phút × 3 = ?',
        choices: ['3 hours 20 minutes', '4 hours', '3 hours 60 minutes', '4 hours 20 minutes'],
        correct: 1,
        explanation: '1h × 3 = 3h; 20m × 3 = 60m = 1h -> 3h + 1h = 4 hours. / 1 giờ 20 phút × 3 = 4 giờ.'
      },
      vocab: [
        { en: 'multiply time', vi: 'nhân số đo thời gian' },
        { en: 'divide time', vi: 'chia số đo thời gian' }
      ],
      summary: 'Nhân/chia từng loại đơn vị thời gian với số đó; nếu đơn vị bé có dư thì đổi sang đơn vị tiếp theo rồi chia tiếp.'
    },
    {
      id: 'speed',
      number: 11,
      titleEn: 'Speed',
      titleVi: 'Vận tốc',
      image: '/assets/topics-library/geometry-measurement/speed-button.png',
      quiz: {
        question: 'A car travels 150 km in 3 hours. What is its speed? / Một ô tô đi 150 km trong 3 giờ. Vận tốc là bao nhiêu?',
        choices: ['40 km/h', '45 km/h', '50 km/h', '60 km/h'],
        correct: 2,
        explanation: 'Speed = Distance / Time = 150 / 3 = 50 km/h. / Vận tốc = 150 : 3 = 50 km/h.'
      },
      vocab: [
        { en: 'speed (v)', vi: 'vận tốc' },
        { en: 'kilometres per hour (km/h)', vi: 'ki-lô-mét trên giờ' },
        { en: 'metres per second (m/s)', vi: 'mét trên giây' }
      ],
      summary: 'Muốn tính vận tốc ta lấy quãng đường chia cho thời gian: v = s : t.'
    },
    {
      id: 'svt',
      number: 12,
      titleEn: 'Speed, Time and Distance Formula',
      titleVi: 'Công thức liên hệ quãng đường, vận tốc và thời gian',
      image: '/assets/topics-library/geometry-measurement/svt-button.png',
      quiz: {
        question: 'How do you calculate distance (s) from speed (v) and time (t)? / Muốn tính quãng đường ta làm thế nào?',
        choices: ['s = v : t', 's = v × t', 's = t : v', 's = v + t'],
        correct: 1,
        explanation: 'Distance = Speed × Time (s = v × t). Time = Distance / Speed (t = s : v).'
      },
      vocab: [
        { en: 'distance (s)', vi: 'quãng đường' },
        { en: 'time (t)', vi: 'thời gian' },
        { en: 'speed (v)', vi: 'vận tốc' }
      ],
      summary: 'Bộ ba công thức chuyển động đều: s = v × t, v = s : t, t = s : v.'
    },
    {
      id: 'pie-chart',
      number: 13,
      titleEn: 'Pie Chart',
      titleVi: 'Biểu đồ hình quạt tròn',
      image: '/assets/topics-library/geometry-measurement/pie-chart-button.png',
      quiz: {
        question: 'In a class of 40 students, 50% love Math. How many students love Math? / Trong lớp 40 học sinh, 50% thích Toán. Có bao nhiêu bạn thích Toán?',
        choices: ['15', '20', '25', '30'],
        correct: 1,
        explanation: '50% of 40 = 40 × 50 / 100 = 20 students. / 50% của 40 là 20 học sinh.'
      },
      vocab: [
        { en: 'pie chart', vi: 'biểu đồ hình quạt tròn' },
        { en: 'sector', vi: 'hình quạt' },
        { en: 'percentage of total', vi: 'tỉ lệ phần trăm so với toàn phần' }
      ],
      summary: 'Biểu đồ hình quạt tròn biểu diễn tỉ lệ phần trăm của các đại lượng so với tổng thể 100%.'
    }
  ];

  const routeState = {
    home: 'home', topics: 'topics', mathlab: 'mathlab', buddy: 'buddy', progress: 'progress', admin: 'admin',
    chapter1: 'topics', chapter2: 'topics', chapter3: 'topics', chapter4: 'topics',
    lesson_ha_km2: 'topics', lesson_decimal_number: 'topics', game_3d_shapes: 'mathlab', game_mixed_numbers: 'mathlab'
  };

  const root = document.getElementById('app-content');
  const navVisual = document.getElementById('nav-visual-overlays');
  const navHotspots = document.getElementById('nav-hotspots');
  const modalRoot = document.getElementById('modal-root');

  let currentRoute = 'home';
  let previousRoute = 'chapter4';
  let currentUser = null;
  let currentUserProfile = null;
  let isUserMenuOpen = false;
  let isMobileMenuOpen = false;
  let activeAdminTab = 'overview';

  const lessonData = {
    chapter1: [
      { en: 'Mixed Numbers', vi: 'Hỗn số', x: 0.16, y: 0.62, w: 0.25, h: 0.15 },
      { en: 'Decimal Fractions', vi: 'Phân số thập phân', x: 0.42, y: 0.62, w: 0.27, h: 0.15 },
    ],
    chapter2: [
      ['Decimal Numbers', 'Số thập phân'],
      ['Comparing Decimal Numbers', 'So sánh các số thập phân'],
      ['Writing Length Measurements as Decimals', 'Viết số đo độ dài dưới dạng số thập phân'],
      ['Writing Mass Measurements as Decimals', 'Viết số đo khối lượng dưới dạng số thập phân'],
      ['Writing Area Measurements as Decimals', 'Viết số đo diện tích dưới dạng số thập phân'],
      ['Rounding Decimal Numbers', 'Làm tròn số thập phân'],
      ['Operations with Decimal Numbers', 'Các phép tính với số thập phân'],
    ].map((d, i) => ({ en: d[0], vi: d[1], x: 0.005 + i * 0.1427, y: 0.575, w: 0.137, h: 0.165 })),
    chapter3: [
      ['Ratio', 'Tỉ số'],
      ['Word Problems about Ratio', 'Bài toán về tỉ số'],
      ['Percentage', 'Tỉ số phần trăm'],
      ['Percentage of a Number', 'Tìm tỉ số phần trăm của một số'],
      ['Map Scale', 'Tỉ lệ bản đồ'],
    ].map((d, i) => ({ en: d[0], vi: d[1], x: i * 0.2 + 0.005, y: 0.56, w: 0.19, h: 0.19 })),
  };

  const ROUTE_ALIASES = {
    'topics/fraction': 'chapter1',
    'topics/decimal-numbers': 'chapter2',
    'topics/ratio-percentage': 'chapter3',
    'topics/geometry-measurement': 'chapter4',
    'topics/geometry-measurement/units/hectare-square-kilometre/lesson': 'lesson_ha_km2',
    'topics/geometry-measurement/units/hectare-square-kilometre': 'lesson_ha_km2',
    'topics/geometry-measurement/ha-km2': 'lesson_ha_km2',
    'lesson/ha-km2': 'lesson_ha_km2',
    'lesson-ha-km2': 'lesson_ha_km2',
    'square-kilometre-hectare': 'lesson_ha_km2',
    'hectare-square-kilometre': 'lesson_ha_km2',
    'hectare-and-square-kilometre': 'lesson_ha_km2',
    'lesson/square-kilometre-hectare': 'lesson_ha_km2',
    'chapter4/ha-km2': 'lesson_ha_km2',
    'chapter4/hectare': 'lesson_ha_km2',
    'chapter1/mixed-numbers': 'lesson_mixed_numbers',
    'topics/fraction/mixed-numbers': 'lesson_mixed_numbers',
    'fraction/mixed-numbers': 'lesson_mixed_numbers',
    'lesson/mixed-numbers': 'lesson_mixed_numbers',
    'lesson-mixed-numbers': 'lesson_mixed_numbers',
    'mixed-numbers': 'lesson_mixed_numbers',
    'chapter1/decimal-fractions': 'lesson_decimal_fractions',
    'topics/fraction/decimal-fractions': 'lesson_decimal_fractions',
    'fraction/decimal-fractions': 'lesson_decimal_fractions',
    'lesson/decimal-fractions': 'lesson_decimal_fractions',
    'lesson-decimal-fractions': 'lesson_decimal_fractions',
    'decimal-fractions': 'lesson_decimal_fractions',
    'topics/decimal-numbers/decimal-number': 'lesson_decimal_number',
    'chapter2/decimal-number': 'lesson_decimal_number',
    'chapter2/decimal-numbers': 'lesson_decimal_number',
    'lesson/decimal-number': 'lesson_decimal_number',
    'lesson/decimal-numbers': 'lesson_decimal_number',
    'lesson-decimal-number': 'lesson_decimal_number',
    'lesson-decimal-numbers': 'lesson_decimal_number',
    'lesson_decimal_number': 'lesson_decimal_number',
    'decimal-number': 'lesson_decimal_number',
    'topics/decimal-numbers/comparing-decimals': 'lesson_comparing_decimals',
    'topics/decimal-numbers/comparing-decimal-numbers': 'lesson_comparing_decimals',
    'chapter2/comparing-decimals': 'lesson_comparing_decimals',
    'chapter2/comparing-decimal-numbers': 'lesson_comparing_decimals',
    'lesson/comparing-decimals': 'lesson_comparing_decimals',
    'lesson/comparing-decimal-numbers': 'lesson_comparing_decimals',
    'lesson-comparing-decimals': 'lesson_comparing_decimals',
    'lesson-comparing-decimal-numbers': 'lesson_comparing_decimals',
    'lesson_comparing_decimals': 'lesson_comparing_decimals',
    'comparing-decimals': 'lesson_comparing_decimals',
    'comparing-decimal-numbers': 'lesson_comparing_decimals',
    'fraction': 'chapter1',
    'decimal-numbers': 'chapter2',
    'ratio-percentage': 'chapter3',
    'geometry-measurement': 'chapter4',
    'dashboard': 'admin',
    'management': 'admin',
    'admin/overview': 'admin',
    'admin/lessons': 'admin',
    'admin/questions': 'admin',
    'admin/resources': 'admin',
    'admin/students': 'admin',
    'admin/reports': 'admin',
    'admin/settings': 'admin',
    'mathlab/3d-shapes': 'game_3d_shapes',
    'mathlab/3d-shape-studio': 'game_3d_shapes',
    '3d-shapes': 'game_3d_shapes',
    '3d-shape-studio': 'game_3d_shapes',
    'mathlab/mixed-number-adventure': 'game_mixed_numbers',
    'mathlab/mixed-numbers-adventure': 'game_mixed_numbers',
    'mathlab/mixed-numbers': 'game_mixed_numbers',
    'mathlab/mixed': 'game_mixed_numbers',
    'mixed-number-adventure': 'game_mixed_numbers',
    'game-mixed-numbers': 'game_mixed_numbers',
    'game_mixed_numbers': 'game_mixed_numbers',
    'mathlab/ants-food-quest': 'game_ants',
    'mathlab/ants': 'game_ants',
    'ants-food-quest': 'game_ants',
    'ants': 'game_ants',
    'game-ants': 'game_ants',
    'game_ants': 'game_ants',
    'mathlab/mystery-pieces': 'game_mystery_pieces',
    'mathlab/mystery': 'game_mystery_pieces',
    'mathlab/pieces': 'game_mystery_pieces',
    'mystery-pieces': 'game_mystery_pieces',
    'mystery': 'game_mystery_pieces',
    'game-mystery-pieces': 'game_mystery_pieces',
    'game_mystery_pieces': 'game_mystery_pieces',
  };

  function currentHashRoute() {
    let raw = (location.hash || '').replace(/^#\/?/, '').trim().toLowerCase();
    if (!raw && location.pathname && location.pathname !== '/') {
      raw = location.pathname.replace(/^\//, '').trim().toLowerCase();
    }
    if (!raw) raw = 'home';

    if (raw.startsWith('admin/')) {
      const sub = raw.replace('admin/', '');
      if (['overview', 'lessons', 'questions', 'resources', 'students', 'reports', 'settings'].includes(sub)) {
        activeAdminTab = sub;
      }
      return 'admin';
    }
    if (ROUTE_ALIASES[raw]) return ROUTE_ALIASES[raw];
    const key = raw.split('/')[0];
    return PAGE_META[key] ? key : 'home';
  }

  // Set of routes that host full-screen embedded lesson / game iframes
  const EMBEDDED_LESSON_ROUTES = new Set([
    'lesson_ha_km2',
    'lesson_decimal_fractions',
    'lesson_decimal_number',
    'lesson_comparing_decimals',
    'lesson_mixed_numbers',
    'game_3d_shapes',
    'game_mixed_numbers',
    'game_ants',
    'game_mystery_pieces'
  ]);

  function isEmbeddedLessonRoute(route) {
    if (!route) return false;
    const normalized = ROUTE_ALIASES[route] || route;
    return EMBEDDED_LESSON_ROUTES.has(normalized);
  }

  function syncHeaderVisibility() {
    const isEmbed = isEmbeddedLessonRoute(currentRoute);
    document.body.classList.toggle('embedded-lesson-active', isEmbed);
    document.documentElement.classList.toggle('embedded-lesson-active', isEmbed);

    const navHeader = document.querySelector('header.nav-scroller');
    if (navHeader) {
      if (isEmbed) {
        navHeader.setAttribute('hidden', '');
        navHeader.setAttribute('aria-hidden', 'true');
      } else {
        navHeader.removeAttribute('hidden');
        navHeader.removeAttribute('aria-hidden');
      }
    }
  }

  function navigate(route, push = true) {
    const normalized = ROUTE_ALIASES[route] || route;
    const target = PAGE_META[normalized] ? normalized : 'home';
    if (currentRoute !== target && currentRoute !== 'lesson_ha_km2') {
      previousRoute = currentRoute;
    }
    if (push && location.hash !== `#${route}`) history.pushState({ route }, '', `#${route}`);
    currentRoute = target;
    isUserMenuOpen = false;
    isMobileMenuOpen = false;
    syncHeaderVisibility();
    handleRouteMusic(target);
    renderNav();
    renderPage();
    closeModal(false);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  window.mathlinguaNavigate = navigate;

  function openVisualLayoutEditor() {
    if (!currentUserProfile || (!currentUserProfile.isAdmin && !currentUserProfile.isTeacher)) {
      openLoginModal('login');
      const fb = modalRoot.querySelector('#auth-feedback');
      if (fb) {
        fb.style.display = 'block';
        fb.className = 'auth-msg';
        fb.textContent = 'Chức năng chỉnh sửa giao diện (Layout Editor) yêu cầu đăng nhập tài khoản Quản trị viên hoặc Giáo viên.';
      }
      return;
    }
    const stage = document.querySelector('.artboard') ||
                  document.querySelector('.geometry-stage') ||
                  document.querySelector('.lesson-player-stage') ||
                  document.getElementById('app-content');
    if (!stage) return;

    if (window.activeLayoutEditor) {
      window.activeLayoutEditor.destroy();
      window.activeLayoutEditor = null;
    }

    window.activeLayoutEditor = new VisualLayoutEditor({
      pageId: currentRoute,
      stageElement: stage,
      currentUser: currentUserProfile,
      onNavigate: (route) => navigate(route),
      onLayoutChange: (pageId, layers) => {
        console.log(`[Layout saved/published for ${pageId}]`, layers);
      },
      onClose: () => {
        window.activeLayoutEditor = null;
      }
    });
  }
  window.openVisualLayoutEditor = openVisualLayoutEditor;

  function navActiveRoute() { return routeState[currentRoute] || 'home'; }

  function renderNav() {
    syncHeaderVisibility();
    if (isEmbeddedLessonRoute(currentRoute)) {
      return;
    }

    const navImg = document.querySelector('.nav-image');
    if (navImg) {
      navImg.src = currentUserProfile
        ? (ASSET_MANIFEST.header.navBarClean || '/assets/common/thanh-dieu-huong-clean.png')
        : (ASSET_MANIFEST.header.navBar || '/assets/common/thanh-dieu-huong.png');
    }
    navVisual.innerHTML = '';
    navHotspots.innerHTML = '';
    const active = navActiveRoute();

    const isAdmin = Boolean(currentUserProfile && (currentUserProfile.isAdmin || currentUserProfile.role === 'admin' || currentUserProfile.isTeacher));

    const navItems = {
      home:    { left: 26.5, width: 10.5, en: 'Home', vi: 'Trang chủ', route: 'home', icon: '🏠' },
      topics:  { left: 37.0, width: 12.0, en: 'Topics Library', vi: 'Thư viện chủ đề', route: 'topics', icon: '📚' },
      mathlab: { left: 49.0, width: 10.5, en: 'Math Lab', vi: 'Vui học Toán', route: 'mathlab', icon: '🔬' },
      buddy:   { left: 59.5, width: 11.0, en: 'MathBuddy AI', vi: 'Trợ lí Toán học', route: 'buddy', icon: '🤖' },
    };

    if (isAdmin) {
      navItems.admin = { left: 70.5, width: 11.5, en: 'Admin Dashboard', vi: 'Bảng quản trị', route: 'admin', icon: '⚙️' };
    } else {
      navItems.progress = { left: 70.5, width: 11.5, en: 'My Progress', vi: 'Hồ sơ tiến bộ', route: 'progress', icon: '📊' };
    }

    // Luminous active plate indicator under active tab
    const n = navItems[active];
    if (n) {
      const plate = document.createElement('div');
      plate.className = 'nav-active-plate';
      plate.style.left = `${n.left}%`;
      plate.style.width = `${n.width}%`;
      navVisual.appendChild(plate);
    }

    addNavHotspot('brand-home', 0.5, 4, 25.5, 92, () => navigate('home'), 'MathLingua AI — Trang chủ / Home');
    Object.entries(navItems).forEach(([itemKey, tab]) => {
      addNavHotspot(`nav-${itemKey}`, tab.left, 8, tab.width, 84, () => navigate(tab.route), `${tab.en} / ${tab.vi}`);
    });

    // Mobile Hamburger Toggle Button
    const mobileToggle = document.createElement('button');
    mobileToggle.type = 'button';
    mobileToggle.className = 'nav-mobile-toggle';
    mobileToggle.setAttribute('aria-label', isMobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng');
    mobileToggle.setAttribute('aria-expanded', isMobileMenuOpen ? 'true' : 'false');
    mobileToggle.innerHTML = isMobileMenuOpen
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`;
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      isMobileMenuOpen = !isMobileMenuOpen;
      isUserMenuOpen = false;
      renderNav();
    });
    navHotspots.appendChild(mobileToggle);

    // Mobile Navigation Drawer (Bilingual dropdown when toggle is open)
    if (isMobileMenuOpen) {
      const drawer = document.createElement('div');
      drawer.className = 'nav-mobile-drawer';
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-label', 'Danh mục điều hướng di động');

      Object.entries(navItems).forEach(([itemKey, tab]) => {
        const itemBtn = document.createElement('button');
        itemBtn.type = 'button';
        itemBtn.className = `mobile-nav-item${active === itemKey ? ' active' : ''}`;
        itemBtn.innerHTML = `
          <span class="mobile-nav-icon">${tab.icon}</span>
          <span class="mobile-nav-label">
            <span class="mobile-nav-en">${tab.en}</span>
            <span class="mobile-nav-vi">${tab.vi}</span>
          </span>
        `;
        itemBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          isMobileMenuOpen = false;
          navigate(tab.route);
        });
        drawer.appendChild(itemBtn);
      });

      if (isAdmin) {
        const editLayoutBtn = document.createElement('button');
        editLayoutBtn.type = 'button';
        editLayoutBtn.className = 'mobile-nav-item';
        editLayoutBtn.style.borderColor = '#00e5ff';
        editLayoutBtn.innerHTML = `
          <span class="mobile-nav-icon">🎨</span>
          <span class="mobile-nav-label">
            <span class="mobile-nav-en" style="color:#00e5ff;">Edit Layout</span>
            <span class="mobile-nav-vi">Chỉnh sửa giao diện</span>
          </span>
        `;
        editLayoutBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          isMobileMenuOpen = false;
          renderNav();
          openVisualLayoutEditor();
        });
        drawer.appendChild(editLayoutBtn);
      }

      navHotspots.appendChild(drawer);
    }

    if (!currentUserProfile) {
      addNavHotspot('nav-login', 81.5, 8, 16.5, 84, () => openLoginModal('login'), 'Log in / Đăng nhập');
    } else {
      renderNavUserCluster();
    }
  }

  function renderNavUserCluster() {
    const cluster = document.createElement('div');
    cluster.className = `nav-user-cluster${isUserMenuOpen ? ' open' : ''}`;
    cluster.id = 'nav-user-cluster';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-user-btn';
    btn.setAttribute('aria-expanded', isUserMenuOpen ? 'true' : 'false');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-label', `Tài khoản: ${currentUserProfile.displayName}`);

    const roleName = currentUserProfile.isAdmin
      ? 'Quản trị'
      : (currentUserProfile.isTeacher ? 'Giáo viên' : (currentUserProfile.classId || 'Học sinh'));

    btn.innerHTML = `
      <div class="nav-user-avatar">
        ${renderAvatarSvg(currentUserProfile.avatarUrl, currentUserProfile.role)}
      </div>
      <div class="nav-user-meta">
        <span class="nav-user-name">${escapeAttr(currentUserProfile.displayName || currentUserProfile.username)}</span>
        <span class="nav-user-role">${roleName}</span>
      </div>
      <span class="nav-caret">▼</span>
    `;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      isUserMenuOpen = !isUserMenuOpen;
      isMobileMenuOpen = false;
      renderNav();
    });

    cluster.appendChild(btn);

    if (isUserMenuOpen) {
      const menu = document.createElement('div');
      menu.className = 'nav-user-menu';
      menu.setAttribute('role', 'menu');

      if (currentUserProfile.isAdmin || currentUserProfile.isTeacher) {
        menu.innerHTML = `
          <button type="button" class="menu-item-btn" data-menu="profile">👤 My Profile / Hồ sơ của tôi</button>
          <button type="button" class="menu-item-btn" data-menu="edit-layout" style="color:#00e5ff;font-weight:800;">🎨 Edit Layout / Chỉnh sửa giao diện</button>
          <button type="button" class="menu-item-btn" data-menu="admin-dash">📊 Overview / Tổng quan</button>
          <button type="button" class="menu-item-btn" data-menu="admin-lessons">📚 Lessons / Quản lý bài học</button>
          <button type="button" class="menu-item-btn" data-menu="admin-questions">❓ Question Bank / Ngân hàng câu hỏi</button>
          <button type="button" class="menu-item-btn" data-menu="admin-resources">🖼️ Resources / Kho tài nguyên</button>
          <button type="button" class="menu-item-btn" data-menu="admin-students">👥 Students / Quản lý học sinh</button>
          <button type="button" class="menu-item-btn" data-menu="admin-reports">📈 Reports / Báo cáo tiến độ</button>
          <button type="button" class="menu-item-btn" data-menu="admin-settings">⚙️ Settings / Cài đặt &amp; Bảo mật</button>
          <button type="button" class="menu-item-btn logout" data-menu="logout">🚪 Log out / Đăng xuất</button>
        `;
      } else {
        menu.innerHTML = `
          <button type="button" class="menu-item-btn" data-menu="profile">👤 My Profile / Hồ sơ của tôi</button>
          <button type="button" class="menu-item-btn" data-menu="progress">📊 My Progress / Hồ sơ tiến bộ</button>
          <button type="button" class="menu-item-btn logout" data-menu="logout">🚪 Log out / Đăng xuất</button>
        `;
      }

      menu.querySelector('[data-menu="profile"]')?.addEventListener('click', () => {
        isUserMenuOpen = false;
        renderNav();
        openProfileModal();
      });
      menu.querySelector('[data-menu="edit-layout"]')?.addEventListener('click', () => {
        isUserMenuOpen = false;
        renderNav();
        openVisualLayoutEditor();
      });
      menu.querySelector('[data-menu="progress"]')?.addEventListener('click', () => {
        isUserMenuOpen = false;
        renderNav();
        navigate('progress');
      });
      menu.querySelector('[data-menu="admin-dash"]')?.addEventListener('click', () => {
        isUserMenuOpen = false;
        activeAdminTab = 'overview';
        renderNav();
        navigate('admin');
      });
      menu.querySelector('[data-menu="admin-lessons"]')?.addEventListener('click', () => {
        isUserMenuOpen = false;
        activeAdminTab = 'lessons';
        renderNav();
        navigate('admin');
      });
      menu.querySelector('[data-menu="admin-questions"]')?.addEventListener('click', () => {
        isUserMenuOpen = false;
        activeAdminTab = 'questions';
        renderNav();
        navigate('admin');
      });
      menu.querySelector('[data-menu="admin-resources"]')?.addEventListener('click', () => {
        isUserMenuOpen = false;
        activeAdminTab = 'resources';
        renderNav();
        navigate('admin');
      });
      menu.querySelector('[data-menu="admin-students"]')?.addEventListener('click', () => {
        isUserMenuOpen = false;
        activeAdminTab = 'students';
        renderNav();
        navigate('admin');
      });
      menu.querySelector('[data-menu="admin-reports"]')?.addEventListener('click', () => {
        isUserMenuOpen = false;
        activeAdminTab = 'reports';
        renderNav();
        navigate('admin');
      });
      menu.querySelector('[data-menu="admin-settings"]')?.addEventListener('click', () => {
        isUserMenuOpen = false;
        activeAdminTab = 'settings';
        renderNav();
        navigate('admin');
      });
      menu.querySelector('[data-menu="logout"]')?.addEventListener('click', () => {
        isUserMenuOpen = false;
        renderNav();
        handleLogout();
      });

      cluster.appendChild(menu);
    }

    navHotspots.appendChild(cluster);
  }

  document.addEventListener('click', (e) => {
    if (isUserMenuOpen && !e.target.closest('#nav-user-cluster')) {
      isUserMenuOpen = false;
      renderNav();
    }
  });

  async function handleLogout() {
    try {
      await logoutUser();
      currentUser = null;
      currentUserProfile = null;
      isUserMenuOpen = false;
      clearGuestSessionEvents();
      renderNav();
      if (currentRoute === 'admin') {
        navigate('home');
      } else {
        renderPage();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  function addNavHotspot(id, left, top, width, height, action, label) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'nav-hotspot'; b.id = id;
    b.style.left = `${left}%`; b.style.top = `${top}%`; b.style.width = `${width}%`; b.style.height = `${height}%`;
    b.setAttribute('aria-label', label); b.title = label;
    b.addEventListener('click', action);
    navHotspots.appendChild(b);
  }

  function addHotspot(board, spec) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `hotspot${spec.buttonImg ? ' img-btn' : ''}${spec.className ? ' ' + spec.className : ''}`;
    b.style.left = `${spec.x * 100}%`;
    b.style.top = `${spec.y * 100}%`;
    b.style.width = `${spec.w * 100}%`;
    b.style.height = `${spec.h * 100}%`;
    b.setAttribute('aria-label', spec.label || spec.title || 'Mở nội dung');
    b.title = spec.label || spec.title || 'Mở nội dung';
    if (spec.layerId) {
      b.id = spec.layerId;
      b.setAttribute('data-layout-layer', spec.layerId);
      b.setAttribute('data-layer-title', spec.label || spec.title || spec.layerId);
      b.setAttribute('data-layer-type', 'button');
    }
    if (spec.route) {
      b.setAttribute('data-route', spec.route);
    }
    if (spec.buttonImg) {
      b.innerHTML = `<img src="${spec.buttonImg}" alt="${spec.label || spec.title || ''}" draggable="false" />`;
    } else if (spec.visibleText) {
      b.innerHTML = spec.visibleText;
    }
    b.addEventListener('click', () => {
      if (window.activeLayoutEditor && !window.activeLayoutEditor.isStudentPreview) return;
      runHotspot(spec);
    });
    board.appendChild(b);
  }

  function renderGeometryPage() {
    root.innerHTML = '';

    const scroll = document.createElement('div');
    scroll.className = 'stage-scroll';

    const stage = document.createElement('section');
    stage.className = 'geometry-stage';
    stage.setAttribute('aria-label', 'Chapter 4: Geometry and Measurement / Hình học và đo lường');

    // 1. Topic Background: Canva artwork
    const bgContainer = document.createElement('div');
    bgContainer.className = 'geometry-bg-container';
    bgContainer.setAttribute('data-layout-layer', 'geo-bg');
    bgContainer.setAttribute('data-layer-title', 'Nền Hình học (Chapter 4 Artwork)');
    bgContainer.setAttribute('data-layer-type', 'background');

    const bgImg = document.createElement('img');
    bgImg.className = 'geometry-topic-bg';
    bgImg.alt = 'Geometry and Measurement Canva Artwork';
    bgImg.draggable = false;
    bgImg.decoding = 'async';
    bgImg.src = '/assets/topics-library/geometry-measurement/geometry-measurement-bg.png';
    bgImg.onload = () => {
      bgContainer.classList.add('bg-ready');
    };
    bgImg.onerror = () => {
      if (!bgImg.dataset.triedChapter4) {
        bgImg.dataset.triedChapter4 = 'true';
        bgImg.src = '/assets/topics-library/geometry-measurement/Chapter-4-bg.png';
      }
    };
    bgContainer.appendChild(bgImg);
    stage.appendChild(bgContainer);

    // 2. Safe Top Bar with Back Button
    const topBar = document.createElement('div');
    topBar.className = 'geometry-safe-topbar';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'geometry-back-btn';
    backBtn.setAttribute('data-layout-layer', 'geo-back-btn');
    backBtn.setAttribute('data-layer-title', 'Nút Quay lại thư viện');
    backBtn.setAttribute('data-layer-type', 'button');
    backBtn.setAttribute('data-route', 'topics');
    backBtn.setAttribute('aria-label', 'Back to Topics Library / Quay lại thư viện chủ đề');
    backBtn.title = 'Back to Topics Library / Quay lại thư viện chủ đề';
    backBtn.innerHTML = `<img src="/assets/topics-library/geometry-measurement/Back-to-Button.png" alt="Back to Topics Library" draggable="false" />`;
    backBtn.addEventListener('click', () => {
      if (window.activeLayoutEditor && !window.activeLayoutEditor.isStudentPreview) return;
      navigate('topics');
    });

    topBar.appendChild(backBtn);
    stage.appendChild(topBar);

    // 3. Topic Identity Safe Area
    const identitySafeArea = document.createElement('div');
    identitySafeArea.className = 'geometry-identity-safe-area';
    identitySafeArea.setAttribute('aria-hidden', 'true');
    stage.appendChild(identitySafeArea);

    // 4. Interactive Unit Grid (13 Unit Buttons)
    const interactiveZone = document.createElement('div');
    interactiveZone.className = 'geometry-interactive-zone';
    interactiveZone.setAttribute('data-layout-layer', 'geo-grid');
    interactiveZone.setAttribute('data-layer-title', 'Lưới 13 bài học Hình học');
    interactiveZone.setAttribute('data-layer-type', 'container');

    const grid = document.createElement('div');
    grid.className = 'geometry-unit-grid';
    grid.setAttribute('role', 'list');

    GEOMETRY_UNITS.forEach(unit => {
      const item = document.createElement('div');
      item.className = 'geometry-unit-item';
      item.setAttribute('role', 'listitem');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'geometry-unit-btn';
      btn.setAttribute('data-unit-id', unit.id);
      btn.setAttribute('aria-label', `${unit.number}. ${unit.titleEn} / ${unit.titleVi}`);
      btn.title = `${unit.number}. ${unit.titleEn} / ${unit.titleVi}`;
      btn.innerHTML = `<img src="${unit.image}" alt="${unit.titleEn}" draggable="false" loading="eager" />`;
      btn.addEventListener('click', () => {
        if (window.activeLayoutEditor && !window.activeLayoutEditor.isStudentPreview) return;
        openGeometryUnit(unit);
      });

      item.appendChild(btn);
      grid.appendChild(item);
    });

    interactiveZone.appendChild(grid);
    stage.appendChild(interactiveZone);

    if (currentUserProfile && (currentUserProfile.isAdmin || currentUserProfile.isTeacher)) {
      const editLayoutBar = document.createElement('div');
      editLayoutBar.className = 'vle-floating-trigger';
      editLayoutBar.innerHTML = `
        <button type="button" class="vle-tool-btn" id="btn-in-situ-layout-editor" style="background:#09255e;border:1.5px solid #00e5ff;color:#00e5ff;box-shadow:0 4px 16px rgba(0,0,0,0.5);">
          🎨 Chỉnh sửa giao diện / Edit Layout
        </button>
      `;
      editLayoutBar.querySelector('#btn-in-situ-layout-editor')?.addEventListener('click', () => {
        openVisualLayoutEditor();
      });
      scroll.appendChild(editLayoutBar);
    }

    scroll.appendChild(stage);
    root.appendChild(scroll);

    applySavedPageLayout('chapter4', Boolean(currentUserProfile && (currentUserProfile.isAdmin || currentUserProfile.isTeacher)));
  }

  function openGeometryUnit(unit) {
    if (unit.id === 'ha-km2') {
      navigate('lesson_ha_km2');
      return;
    }
    openModal({
      title: unit.titleEn,
      subtitle: `${unit.number}. ${unit.titleVi}`,
      kicker: `Unit ${unit.number} · Geometry & Measurement`,
      content: `
        <div class="geometry-modal-summary">
          <p><strong>Khái niệm &amp; Công thức cốt lõi:</strong> ${unit.summary}</p>
        </div>
        <div class="geometry-vocab-chips">
          <span class="vocab-badge-title">Từ vựng then chốt:</span>
          ${unit.vocab.map(v => `<span class="vocab-badge" title="${v.vi}"><strong>${v.en}</strong>: ${v.vi}</span>`).join('')}
        </div>
        <div class="modal-note">
          <strong>${unit.quiz.question}</strong>
        </div>
        <div class="choice-grid">
          ${unit.quiz.choices.map((c, i) => `<button type="button" class="choice-btn" data-choice="${i}">${c}</button>`).join('')}
        </div>
        <div id="quiz-feedback" class="answer-feedback" aria-live="polite"></div>
      `,
      actions: `
        <button type="button" class="action-btn" data-speak="${unit.titleEn}. ${unit.vocab.map(v => v.en).join(', ')}">🔊 Luyện nghe / Speak</button>
        <button type="button" class="action-btn primary" data-close-modal>Đóng / Close</button>
      `
    });

    const speakBtn = modalRoot.querySelector('[data-speak]');
    if (speakBtn) speakBtn.addEventListener('click', () => speakText(speakBtn.dataset.speak));

    modalRoot.querySelectorAll('[data-choice]').forEach(btn => btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.choice);
      const isCorrect = idx === unit.quiz.correct;

      modalRoot.querySelectorAll('[data-choice]').forEach(b => {
        b.disabled = true;
        b.classList.remove('correct', 'incorrect');
      });
      btn.classList.add(isCorrect ? 'correct' : 'incorrect');
      const correctBtn = modalRoot.querySelector(`[data-choice="${unit.quiz.correct}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
      const feedback = modalRoot.querySelector('#quiz-feedback');
      if (feedback) {
        feedback.innerHTML = `${isCorrect ? '✅ Correct! · Chính xác!' : '💡 Not quite. · Chưa chính xác.'}<div class="modal-note">${unit.quiz.explanation}</div>`;
      }

      // Persist student learning progress to Firestore & Unified Analytics
      if (currentUser) {
        saveStudentProgress({
          topicId: 'chapter4',
          unitId: unit.id,
          titleEn: unit.titleEn,
          titleVi: unit.titleVi,
          score: isCorrect ? 100 : 0,
          isCorrect,
          lastChoice: idx,
          status: isCorrect ? 'completed' : 'in_progress',
          skills: ['Geometry and Measurement', unit.titleEn],
          vocabPracticed: unit.vocab.map(v => v.en)
        }).catch(err => console.warn('Could not save progress to Firestore:', err));
      }

      // Record standardized learning event
      recordLearningEvent({
        topicId: 'chapter4',
        activityId: unit.id,
        sourceModule: 'individual_lesson',
        learningObjectiveIds: [unit.id === 'ha-km2' ? 'area_units' : 'shape_properties'],
        skillEvidence: {
          reading: { score: isCorrect ? 100 : 40, method: 'quiz_reading' }
        },
        score: isCorrect ? 100 : 0,
        maxScore: 100,
        attempts: 1,
        completionStatus: isCorrect ? 'completed' : 'attempted',
        assessmentMethod: 'quiz_reading',
        confidence: 'high'
      }).catch(err => console.warn('Could not record learning event:', err));
    }));
  }

  async function renderProgressPage() {
    root.innerHTML = '';
    const scroll = document.createElement('div');
    scroll.className = 'stage-scroll min-h-screen py-6 bg-slate-900/90';

    const container = document.createElement('div');
    container.className = 'progress-live-container max-w-6xl mx-auto px-4';

    scroll.appendChild(container);
    root.appendChild(scroll);

    await renderMyProgressView(container, (hash) => {
      if (typeof hash === 'string') {
        const routeName = hash.replace('#', '');
        navigate(routeName || 'home');
      }
    });
  }

  async function renderAdminPage() {
    root.innerHTML = '';
    const scroll = document.createElement('div');
    scroll.className = 'stage-scroll';

    const stage = document.createElement('div');
    stage.className = 'admin-stage';

    if (!currentUserProfile || (!currentUserProfile.isAdmin && !currentUserProfile.isTeacher)) {
      const isStudent = currentUserProfile && !currentUserProfile.isAdmin && !currentUserProfile.isTeacher;
      stage.innerHTML = `
        <div class="admin-header-bar" style="flex-direction:column;align-items:flex-start;gap:12px;padding:24px;background:rgba(6,24,68,0.92);border-radius:16px;border:1.5px solid #ff6b6b;">
          <div>
            <h2 style="margin:0 0 6px;font-size:22px;color:#ffffff;display:flex;align-items:center;gap:8px;">
              <span>🛡️ Quyền truy cập hạn chế / Access Denied</span>
            </h2>
            <p style="margin:0;color:#ff9e9e;font-size:14px;line-height:1.5;">
              ${isStudent
                ? 'Tài khoản học sinh không có quyền truy cập vào Bảng điều khiển quản trị MathLingua AI.'
                : 'Bạn cần đăng nhập bằng tài khoản Quản trị viên (Admin) để truy cập vào phân hệ này.'}
            </p>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">
            ${!currentUserProfile ? `
              <button type="button" class="action-btn primary" id="btn-admin-login-now" style="background:linear-gradient(135deg, #00e5ff, #0077ff);color:#020b26;font-weight:900;">
                🔑 Đăng nhập Quản trị viên / Log in as Admin
              </button>
            ` : ''}
            <button type="button" class="action-btn" id="btn-admin-back-home">
              🏠 Về trang chủ / Back to Home
            </button>
          </div>
        </div>
      `;
      stage.querySelector('#btn-admin-login-now')?.addEventListener('click', () => openLoginModal('login'));
      stage.querySelector('#btn-admin-back-home')?.addEventListener('click', () => navigate('home'));
      scroll.appendChild(stage);
      root.appendChild(scroll);
      return;
    }

    // Canva Asset Catalog definition
    const CANVA_ASSET_INVENTORY = [
      {
        name: 'Navigation Header / Thanh điều hướng dùng chung',
        path: '/assets/common/thanh-dieu-huong.png',
        dimensions: '1920 × 80 (~24:1)',
        category: 'Header / Điều hướng',
        type: 'Artwork Canva hoàn chỉnh (Logo, menu, viền neon)',
        target: 'Header dùng chung toàn hệ thống',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Home Background / Nền Trang chủ',
        path: '/assets/home/home-bg.png',
        dimensions: '1440 × 900 (16:10)',
        category: 'Home / Trang chủ',
        type: 'Nền Canva không gian vũ trụ + phi thuyền',
        target: 'Trang chủ (#home)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Home Start Button / Nút Bắt đầu hành trình',
        path: '/assets/home/home-button.png',
        dimensions: '256 × 80 (~3.2:1)',
        category: 'Home / Trang chủ',
        type: 'Nút bấm thiết kế Canva gốc',
        target: 'Hotspot bắt đầu trên Trang chủ',
        status: 'Verified Canva Asset'
      },
      {
        name: 'MathLingua AI Logo / Biểu trưng nhận diện',
        path: '/assets/home/logo.png',
        dimensions: 'Vector / PNG chuẩn nét',
        category: 'Branding / Nhận diện',
        type: 'Logo robot MathLingua AI',
        target: 'Header, Hộp thoại đăng nhập & Admin',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Topics Library Background / Nền Thư viện chủ đề',
        path: '/assets/topics-library/thu-vien-chu-de-bg.png',
        dimensions: '1440 × 900 (16:10)',
        category: 'Topics / Chủ đề',
        type: 'Bản đồ 4 hành tinh kiến thức toán lớp 5',
        target: 'Thư viện chủ đề (#topics)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Fraction Planet Button / Nút Phân số',
        path: '/assets/topics-library/Fraction-button.png',
        dimensions: 'Nút tròn hành tinh',
        category: 'Topics / Chủ đề',
        type: 'Hành tinh Phân số (Chapter 1)',
        target: 'Topics Library -> Chapter 1',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Decimal Planet Button / Nút Số thập phân',
        path: '/assets/topics-library/Decimal-button.png',
        dimensions: 'Nút tròn hành tinh',
        category: 'Topics / Chủ đề',
        type: 'Hành tinh Số thập phân (Chapter 2)',
        target: 'Topics Library -> Chapter 2',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Ratio Planet Button / Nút Tỉ số & Phần trăm',
        path: '/assets/topics-library/Ratio-button.png',
        dimensions: 'Nút tròn hành tinh',
        category: 'Topics / Chủ đề',
        type: 'Hành tinh Tỉ số và tỉ số phần trăm (Chapter 3)',
        target: 'Topics Library -> Chapter 3',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Geometry Planet Button / Nút Hình học & Đo lường',
        path: '/assets/topics-library/Geometry-button.png',
        dimensions: 'Nút tròn hành tinh',
        category: 'Topics / Chủ đề',
        type: 'Hành tinh Hình học & Đo lường (Chapter 4)',
        target: 'Topics Library -> Chapter 4',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Fraction Topic Background / Nền Phân số Canva',
        path: '/assets/topics-library/fraction/Chapter-1-bg.png',
        dimensions: '2730 × 1536 (16:9)',
        category: 'Fraction / Phân số',
        type: 'Nền vũ trụ không gian + phi thuyền + đảo nổi phân số',
        target: 'Trang Chapter 1 (#chapter1)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Fraction Back Button / Nút Quay lại thư viện',
        path: '/assets/topics-library/fraction/Back-to-Button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Fraction / Phân số',
        type: 'Artwork nút bấm Canva gốc',
        target: 'Nút quay về Topics Library trên Chapter 1',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Mixed Numbers Button / Nút Hỗn số',
        path: '/assets/topics-library/fraction/Mixed-number-button.png',
        dimensions: '304 × 189 (~1.61:1)',
        category: 'Fraction / Phân số',
        type: 'Nút bài học Hỗn số Canva gốc',
        target: 'Bài 1: Mixed Numbers (Chapter 1)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Decimal Fractions Button / Nút Phân số thập phân',
        path: '/assets/topics-library/fraction/Decimal-fraction-button.png',
        dimensions: '304 × 173 (~1.76:1)',
        category: 'Fraction / Phân số',
        type: 'Nút bài học Phân số thập phân Canva gốc',
        target: 'Bài 2: Decimal Fractions (Chapter 1)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Decimal Numbers Background / Nền Số thập phân Canva',
        path: '/assets/topics-library/decimal-numbers/Chapter-2-bg.png',
        dimensions: '2730 × 1536 (16:9)',
        category: 'Decimal / Số thập phân',
        type: 'Nền vũ trụ không gian + phi thuyền + đảo nổi số thập phân',
        target: 'Trang Chapter 2 (#chapter2)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Decimal Numbers Back Button / Nút Quay lại thư viện',
        path: '/assets/topics-library/decimal-numbers/Back-to-Button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Decimal / Số thập phân',
        type: 'Artwork nút bấm Canva gốc',
        target: 'Nút quay về Topics Library trên Chapter 2',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Decimal Numbers Button / Nút Số thập phân',
        path: '/assets/topics-library/decimal-numbers/decimal-number-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Decimal / Số thập phân',
        type: 'Nút bài học Số thập phân Canva gốc',
        target: 'Bài 1: Decimal Numbers (Chapter 2)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Comparing Decimals Button / Nút So sánh số thập phân',
        path: '/assets/topics-library/decimal-numbers/Comparing-Decimal-Numbers-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Decimal / Số thập phân',
        type: 'Nút bài học So sánh số thập phân Canva gốc',
        target: 'Bài 2: Comparing Decimal Numbers (Chapter 2)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Writing Length Button / Nút Viết số đo độ dài dạng STP',
        path: '/assets/topics-library/decimal-numbers/writing-length-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Decimal / Số thập phân',
        type: 'Nút bài học Viết số đo độ dài dạng STP Canva gốc',
        target: 'Bài 3: Writing Length Measurements as Decimals (Chapter 2)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Writing Weight Button / Nút Viết số đo khối lượng dạng STP',
        path: '/assets/topics-library/decimal-numbers/writing-weight-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Decimal / Số thập phân',
        type: 'Nút bài học Viết số đo khối lượng dạng STP Canva gốc',
        target: 'Bài 4: Writing Mass Measurements as Decimals (Chapter 2)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Writing Area Button / Nút Viết số đo diện tích dạng STP',
        path: '/assets/topics-library/decimal-numbers/writing-area-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Decimal / Số thập phân',
        type: 'Nút bài học Viết số đo diện tích dạng STP Canva gốc',
        target: 'Bài 5: Writing Area Measurements as Decimals (Chapter 2)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Rounding Decimals Button / Nút Làm tròn số thập phân',
        path: '/assets/topics-library/decimal-numbers/rounding-Decimal-Numbers-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Decimal / Số thập phân',
        type: 'Nút bài học Làm tròn số thập phân Canva gốc',
        target: 'Bài 6: Rounding Decimal Numbers (Chapter 2)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Operations with Decimals Button / Nút Các phép tính số thập phân',
        path: '/assets/topics-library/decimal-numbers/operation-Decimal-Numbers-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Decimal / Số thập phân',
        type: 'Nút bài học Các phép tính với số thập phân Canva gốc',
        target: 'Bài 7: Operations with Decimal Numbers (Chapter 2)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Ratio & Percentage Background / Nền Tỉ số & Phần trăm Canva',
        path: '/assets/topics-library/ratio-percentage/Chapter-3-bg.png',
        dimensions: '2752 × 1536 (16:9)',
        category: 'Ratio / Tỉ số & Phần trăm',
        type: 'Nền không gian vũ trụ với tiêu đề Ratio and Percentage Canva gốc',
        target: 'Trang Chapter 3 (#chapter3)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Back Button / Nút Quay lại thư viện (Chapter 3)',
        path: '/assets/topics-library/ratio-percentage/Back-to-Button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Ratio / Tỉ số & Phần trăm',
        type: 'Nút bấm điều hướng quay lại Topics Library Canva gốc',
        target: 'Nút quay về Topics Library trên Chapter 3',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Ratio Button / Nút Bài học Tỉ số',
        path: '/assets/topics-library/ratio-percentage/ratio-button.png',
        dimensions: '6164 × 4983 (~1.24:1)',
        category: 'Ratio / Tỉ số & Phần trăm',
        type: 'Nút bài học Tỉ số Canva gốc',
        target: 'Bài 1: Ratio / Tỉ số (Chapter 3)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Word Problems about Ratio Button / Nút Bài toán về tỉ số',
        path: '/assets/topics-library/ratio-percentage/word-ratio-button.png',
        dimensions: '5684 × 4983 (~1.14:1)',
        category: 'Ratio / Tỉ số & Phần trăm',
        type: 'Nút bài học Bài toán về tỉ số Canva gốc',
        target: 'Bài 2: Word Problems about Ratio (Chapter 3)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Percentage Button / Nút Tỉ số phần trăm',
        path: '/assets/topics-library/ratio-percentage/percent-button.png',
        dimensions: '5684 × 4983 (~1.14:1)',
        category: 'Ratio / Tỉ số & Phần trăm',
        type: 'Nút bài học Tỉ số phần trăm Canva gốc',
        target: 'Bài 3: Percentage / Tỉ số phần trăm (Chapter 3)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Percentage of a Number Button / Nút Tìm giá trị phần trăm của một số',
        path: '/assets/topics-library/ratio-percentage/percent-number-button.png',
        dimensions: '5684 × 4983 (~1.14:1)',
        category: 'Ratio / Tỉ số & Phần trăm',
        type: 'Nút bài học Tìm giá trị phần trăm của một số Canva gốc',
        target: 'Bài 4: Percentage of a Number (Chapter 3)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Map Scale Button / Nút Tỉ lệ bản đồ',
        path: '/assets/topics-library/ratio-percentage/map-scale-button.png',
        dimensions: '5684 × 4983 (~1.14:1)',
        category: 'Ratio / Tỉ số & Phần trăm',
        type: 'Nút bài học Tỉ lệ bản đồ Canva gốc',
        target: 'Bài 5: Map Scale / Tỉ lệ bản đồ (Chapter 3)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Geometry Topic Background / Nền Hình học Canva',
        path: '/assets/topics-library/geometry-measurement/Chapter-4-bg.png',
        dimensions: '1440 × 900 (16:10)',
        category: 'Geometry / Hình học',
        type: 'Nền vũ trụ hình học với tiêu đề & robot AI',
        target: 'Trang Chapter 4 (#chapter4)',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Back Button / Nút Quay lại thư viện',
        path: '/assets/topics-library/geometry-measurement/Back-to-Button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Geometry / Hình học',
        type: 'Artwork nút bấm Canva gốc',
        target: 'Nút quay về Topics Library trên Chapter 4',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Triangle Area Button / Nút Diện tích hình tam giác',
        path: '/assets/topics-library/geometry-measurement/triangle-area-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Geometry / Hình học',
        type: 'Nút bài học Canva Bài 1',
        target: 'Bài 1: Area of Triangle',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Trapezoid Area Button / Nút Diện tích hình thang',
        path: '/assets/topics-library/geometry-measurement/trapezoid-area-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Geometry / Hình học',
        type: 'Nút bài học Canva Bài 2',
        target: 'Bài 2: Area of Trapezoid',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Circle Area Button / Nút Diện tích hình tròn',
        path: '/assets/topics-library/geometry-measurement/circle-area-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Geometry / Hình học',
        type: 'Nút bài học Canva Bài 3',
        target: 'Bài 3: Area of Circle',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Circumference Button / Nút Chu vi hình tròn',
        path: '/assets/topics-library/geometry-measurement/circle-circumference-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Geometry / Hình học',
        type: 'Nút bài học Canva Bài 4',
        target: 'Bài 4: Circumference of Circle',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Nets of Solid Button / Nút Khai triển hình khối',
        path: '/assets/topics-library/geometry-measurement/net-of-solid-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Geometry / Hình học',
        type: 'Nút bài học Canva Bài 5',
        target: 'Bài 5: Nets of Solid',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Lateral & Surface Area Button / Nút DT Xung quanh & Toàn phần',
        path: '/assets/topics-library/geometry-measurement/lateral-surface-area-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Geometry / Hình học',
        type: 'Nút bài học Canva Bài 6',
        target: 'Bài 6: Lateral and Surface Area',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Units of Volume Button / Nút Đơn vị đo thể tích',
        path: '/assets/topics-library/geometry-measurement/units-of-volume-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Geometry / Hình học',
        type: 'Nút bài học Canva Bài 7',
        target: 'Bài 7: Units of Volume',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Volume Cuboid & Cube Button / Nút Thể tích hình hộp & hình lập phương',
        path: '/assets/topics-library/geometry-measurement/volume-of-cuboid-cube-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Geometry / Hình học',
        type: 'Nút bài học Canva Bài 8',
        target: 'Bài 8: Volume of Cuboid and Cube',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Adding & Subtracting Time Button / Nút Cộng trừ số đo thời gian',
        path: '/assets/topics-library/geometry-measurement/add-sub-time-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Geometry / Hình học',
        type: 'Nút bài học Canva Bài 9',
        target: 'Bài 9: Adding and Subtracting Time',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Multiplying & Dividing Time Button / Nút Nhân chia số đo thời gian',
        path: '/assets/topics-library/geometry-measurement/mul-div-time-button.png',
        dimensions: '560 × 189 (~2.96:1)',
        category: 'Geometry / Hình học',
        type: 'Nút bài học Canva Bài 10',
        target: 'Bài 10: Multiplying and Dividing Time',
        status: 'Verified Canva Asset'
      },
      {
        name: 'Math Lab Background / Nền Vui học Toán',
        path: '/assets/math-lab/Math-Lab-bg.png',
        dimensions: '1440 × 900 (16:10)',
        category: 'Math Lab',
        type: 'Không gian phòng thí nghiệm toán học Canva',
        target: 'Phòng thực hành toán học (#mathlab)',
        status: 'Verified Canva Asset'
      }
    ];

    function renderAdminContent() {
      stage.innerHTML = `
        <div class="admin-header-bar">
          <div>
            <h2 style="margin:0 0 4px;font-size:24px;font-weight:900;color:#ffffff;">
              Bảng quản trị &amp; Học liệu · Admin Console
            </h2>
            <p style="margin:0;color:#ffd65e;font-size:13px;">
              MathLingua AI Grade 5 · Vai trò: <strong>${currentUserProfile.isAdmin ? 'Quản trị viên / Admin' : 'Giáo viên / Teacher'}</strong> (${escapeAttr(currentUserProfile.displayName)})
            </p>
          </div>
          <button type="button" class="action-btn" id="btn-admin-exit">Thoát quản trị / Exit</button>
        </div>

        <div class="admin-nav-tabs">
          <button type="button" class="admin-tab-btn ${activeAdminTab === 'overview' ? 'active' : ''}" data-atab="overview">
            📊 Tổng quan / Overview
          </button>
          <button type="button" class="admin-tab-btn ${activeAdminTab === 'lessons' ? 'active' : ''}" data-atab="lessons">
            📚 Quản lý bài học / Lessons
          </button>
          <button type="button" class="admin-tab-btn ${activeAdminTab === 'questions' ? 'active' : ''}" data-atab="questions">
            ❓ Ngân hàng câu hỏi / Questions
          </button>
          <button type="button" class="admin-tab-btn ${activeAdminTab === 'resources' ? 'active' : ''}" data-atab="resources">
            🖼️ Kho tài nguyên / Resources
          </button>
          <button type="button" class="admin-tab-btn ${activeAdminTab === 'students' ? 'active' : ''}" data-atab="students">
            👥 Quản lý học sinh / Students
          </button>
          <button type="button" class="admin-tab-btn ${activeAdminTab === 'reports' ? 'active' : ''}" data-atab="reports">
            📈 Báo cáo tiến độ / Reports
          </button>
          <button type="button" class="admin-tab-btn ${activeAdminTab === 'settings' ? 'active' : ''}" data-atab="settings">
            ⚙️ Cài đặt &amp; Bảo mật / Settings
          </button>
        </div>

        <div id="admin-tab-body"></div>
      `;

      stage.querySelector('#btn-admin-exit')?.addEventListener('click', () => navigate('home'));

      stage.querySelectorAll('[data-atab]').forEach(b => {
        b.addEventListener('click', () => {
          activeAdminTab = b.dataset.atab;
          renderAdminContent();
        });
      });

      const body = stage.querySelector('#admin-tab-body');
      if (activeAdminTab === 'overview') {
        loadAdminOverview(body);
      } else if (activeAdminTab === 'lessons') {
        loadAdminLessons(body);
      } else if (activeAdminTab === 'questions') {
        loadAdminQuestions(body);
      } else if (activeAdminTab === 'resources') {
        loadAdminResources(body);
      } else if (activeAdminTab === 'students') {
        loadAdminStudents(body);
      } else if (activeAdminTab === 'reports') {
        loadAdminReports(body);
      } else if (activeAdminTab === 'settings') {
        loadAdminSettings(body);
      }
    }

    // Tab 1: Overview
    async function loadAdminOverview(body) {
      body.innerHTML = '<div style="color:#8ab4f8;padding:24px;">Đang đồng bộ dữ liệu tổng quan từ hệ thống...</div>';
      try {
        const [overviewData, students, progressAll] = await Promise.all([
          fetchAdminOverview().catch(() => ({ totalStudents: 0, completedSessions: 0, averageScore: 0 })),
          fetchAllStudents().catch(() => []),
          fetchAllStudentsProgress().catch(() => [])
        ]);

        const completedCount = progressAll.filter(p => p.status === 'completed').length;
        const avgScore = completedCount > 0
          ? Math.round(progressAll.filter(p => p.status === 'completed').reduce((a, b) => a + (b.score || 0), 0) / completedCount)
          : (overviewData.averageScore || 0);

        body.innerHTML = `
          <div class="progress-kpi-grid">
            <div class="progress-kpi-card">
              <span class="progress-kpi-title">Học sinh đăng ký / Students</span>
              <span class="progress-kpi-val">${students.length}</span>
              <span class="progress-kpi-sub">Khối 5 các lớp</span>
            </div>
            <div class="progress-kpi-card">
              <span class="progress-kpi-title">Bài đã hoàn thành / Completed</span>
              <span class="progress-kpi-val">${completedCount}</span>
              <span class="progress-kpi-sub">Lượt học ghi nhận</span>
            </div>
            <div class="progress-kpi-card">
              <span class="progress-kpi-title">Điểm chuẩn trung bình / Mastery</span>
              <span class="progress-kpi-val">${avgScore}%</span>
              <span class="progress-kpi-sub">Toàn bộ các kỹ năng</span>
            </div>
            <div class="progress-kpi-card">
              <span class="progress-kpi-title">Cơ sở dữ liệu / Database</span>
              <span class="progress-kpi-val" style="font-size:18px;color:#38ef7d;">Active · Online</span>
              <span class="progress-kpi-sub">Cloud Firestore &amp; RBAC</span>
            </div>
          </div>

          <div class="progress-section-card" style="margin-top:16px;">
            <div class="progress-section-title">
              <span>🚀 Truy cập nhanh các phân hệ quản lý</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
              <button type="button" class="action-btn" data-goto="lessons" style="text-align:left;padding:14px;">
                <div style="color:#00e5ff;font-size:15px;font-weight:800;margin-bottom:2px;">📚 Quản lý bài học</div>
                <div style="font-size:12px;color:#a8cdfc;">Thêm, sửa lý thuyết &amp; trạng thái xuất bản</div>
              </button>
              <button type="button" class="action-btn" data-goto="questions" style="text-align:left;padding:14px;">
                <div style="color:#00e5ff;font-size:15px;font-weight:800;margin-bottom:2px;">❓ Ngân hàng câu hỏi</div>
                <div style="font-size:12px;color:#a8cdfc;">Soạn thảo câu hỏi &amp; xem trước tương tác</div>
              </button>
              <button type="button" class="action-btn" data-goto="resources" style="text-align:left;padding:14px;">
                <div style="color:#00e5ff;font-size:15px;font-weight:800;margin-bottom:2px;">🖼️ Kho tài nguyên Canva</div>
                <div style="font-size:12px;color:#a8cdfc;">Kiểm kê ảnh nền, nút bấm &amp; kích thước</div>
              </button>
              <button type="button" class="action-btn" data-goto="students" style="text-align:left;padding:14px;">
                <div style="color:#00e5ff;font-size:15px;font-weight:800;margin-bottom:2px;">👥 Quản lý học sinh</div>
                <div style="font-size:12px;color:#a8cdfc;">Danh sách lớp &amp; đặt lại mật khẩu</div>
              </button>
              <button type="button" class="action-btn" data-goto="reports" style="text-align:left;padding:14px;">
                <div style="color:#00e5ff;font-size:15px;font-weight:800;margin-bottom:2px;">📈 Báo cáo tiến độ</div>
                <div style="font-size:12px;color:#a8cdfc;">Phân tích kỹ năng vững &amp; cần luyện thêm</div>
              </button>
              <button type="button" class="action-btn" data-goto="settings" style="text-align:left;padding:14px;">
                <div style="color:#00e5ff;font-size:15px;font-weight:800;margin-bottom:2px;">⚙️ Cài đặt &amp; Bảo mật</div>
                <div style="font-size:12px;color:#a8cdfc;">Đổi mật khẩu admin &amp; tùy chọn hệ thống</div>
              </button>
            </div>
          </div>

          <div class="progress-section-card" style="margin-top:16px;">
            <div class="progress-section-title">
              <span>Hệ thống phân quyền &amp; Bảo mật người dùng (ABAC &amp; RBAC)</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;color:#d8e8ff;font-size:13px;line-height:1.6;">
              <div style="background:rgba(5,20,54,0.6);padding:14px;border-radius:12px;border:1px solid #14448e;">
                <h4 style="margin:0 0 6px;color:#ffd65e;font-size:14px;">👤 Học sinh (Student)</h4>
                Đăng nhập bằng tên người dùng và mật khẩu đơn giản, lưu hồ sơ cá nhân và kết quả thực hành trực tiếp vào tài khoản riêng. Không có quyền truy cập vào bảng quản trị hoặc dữ liệu học sinh khác.
              </div>
              <div style="background:rgba(5,20,54,0.6);padding:14px;border-radius:12px;border:1px solid #14448e;">
                <h4 style="margin:0 0 6px;color:#00e5ff;font-size:14px;">👩‍🏫 Giáo viên (Teacher)</h4>
                Xem danh sách lớp được phân công, giám sát tiến độ và điểm số trung bình, duyệt bài tập nháp và xuất bản học liệu mới lên thư viện chủ đề.
              </div>
              <div style="background:rgba(5,20,54,0.6);padding:14px;border-radius:12px;border:1px solid #14448e;">
                <h4 style="margin:0 0 6px;color:#38ef7d;font-size:14px;">🛡️ Quản trị viên (Admin)</h4>
                Toàn quyền quản trị hệ thống, đặt lại mật khẩu cho học sinh khi quên, đổi mật khẩu quản trị bảo mật trên máy chủ và quản lý kho tài nguyên thiết kế.
              </div>
            </div>
          </div>
        `;

        body.querySelectorAll('[data-goto]').forEach(btn => {
          btn.addEventListener('click', () => {
            activeAdminTab = btn.dataset.goto;
            renderAdminContent();
          });
        });
      } catch (err) {
        body.innerHTML = `<div class="auth-msg error">Không thể tải thông tin tổng quan: ${err.message}</div>`;
      }
    }

    // Tab 2: Lessons Management
    async function loadAdminLessons(body) {
      body.innerHTML = '<div style="color:#8ab4f8;padding:24px;">Đang tải danh sách bài học và học liệu...</div>';
      try {
        const customMaterials = await fetchLearningMaterials().catch(() => []);
        let filterTopic = 'all';
        let searchQuery = '';

        function previewLessonAsStudent(lesson) {
          openModal({
            title: lesson.titleEn || 'Math Lesson',
            subtitle: lesson.titleVi || 'Bài học Toán',
            kicker: `Student View Preview · ${lesson.topicId || 'Lesson'}`,
            content: `
              <div class="geometry-modal-summary" style="margin-bottom:12px;">
                <p><strong>Công thức &amp; Tóm tắt lý thuyết:</strong> ${escapeAttr(lesson.summary || 'Chưa có tóm tắt lý thuyết.')}</p>
              </div>
              ${lesson.imageUrl ? `
                <div style="text-align:center;margin:12px 0;">
                  <img src="${escapeAttr(lesson.imageUrl)}" alt="Minh họa bài học" style="max-width:100%;max-height:200px;border-radius:10px;border:1px solid #1852a8;" />
                </div>
              ` : ''}
              ${lesson.explore ? `
                <div style="background:rgba(5,20,54,0.6);padding:12px;border-radius:10px;margin-bottom:12px;border:1px solid #14448e;font-size:13px;line-height:1.5;color:#d8e8ff;">
                  <strong style="color:#00e5ff;">🔍 Khám phá (Explore):</strong><br>${escapeAttr(lesson.explore)}
                </div>
              ` : ''}
              ${lesson.vocab && lesson.vocab.length ? `
                <div class="geometry-vocab-chips" style="margin-bottom:12px;">
                  <span class="vocab-badge-title">Từ vựng (Vocab):</span>
                  ${lesson.vocab.map(v => `<span class="vocab-badge"><strong>${escapeAttr(v.en || v)}</strong>: ${escapeAttr(v.vi || '')}</span>`).join('')}
                </div>
              ` : ''}
              ${lesson.structure ? `
                <div style="background:rgba(5,20,54,0.6);padding:12px;border-radius:10px;margin-bottom:12px;border:1px solid #14448e;font-size:13px;color:#ffd65e;">
                  <strong>📐 Cấu trúc câu (Structure):</strong> ${escapeAttr(lesson.structure)}
                </div>
              ` : ''}
              ${lesson.question ? `
                <div class="modal-note">
                  <strong>Thực hành: ${escapeAttr(lesson.question)}</strong>
                </div>
                ${lesson.choices && lesson.choices.length ? `
                  <div class="choice-grid">
                    ${lesson.choices.map((c, i) => `<button type="button" class="choice-btn" data-pv-choice="${i}">${escapeAttr(c)}</button>`).join('')}
                  </div>
                  <div id="pv-lesson-feedback" class="answer-feedback" aria-live="polite"></div>
                ` : ''}
              ` : ''}
            `,
            actions: `
              <button type="button" class="action-btn primary" data-close-modal>Đóng xem trước / Close</button>
            `
          });

          if (lesson.question && lesson.choices) {
            modalRoot.querySelectorAll('[data-pv-choice]').forEach(btn => btn.addEventListener('click', () => {
              const choice = parseInt(btn.dataset.pvChoice, 10);
              const correct = typeof lesson.correctIndex === 'number' ? lesson.correctIndex : 0;
              const isCorrect = choice === correct;
              modalRoot.querySelectorAll('[data-pv-choice]').forEach((b, idx) => {
                b.classList.remove('correct', 'incorrect');
                if (idx === correct) b.classList.add('correct');
                else if (idx === choice) b.classList.add('incorrect');
              });
              const fb = modalRoot.querySelector('#pv-lesson-feedback');
              if (fb) {
                fb.innerHTML = isCorrect
                  ? `🎉 Chính xác! ${escapeAttr(lesson.explanation || '')}`
                  : `💡 Chưa đúng. Lời giải: ${escapeAttr(lesson.explanation || '')}`;
              }
            }));
          }
        }

        function renderLessonList() {
          // Combine base curriculum with custom materials
          const baseUnits = GEOMETRY_UNITS.map(u => ({
            id: u.id,
            topicId: 'chapter4',
            topicName: 'Chapter 4: Geometry & Measurement',
            titleEn: u.titleEn,
            titleVi: u.titleVi,
            summary: u.summary,
            vocab: u.vocab,
            question: u.quiz ? u.quiz.question : null,
            choices: u.quiz ? u.quiz.choices : null,
            correctIndex: u.quiz ? u.quiz.correct : 0,
            explanation: u.quiz ? u.quiz.explanation : '',
            status: 'published',
            isBase: true
          }));

          const allLessons = [...baseUnits, ...customMaterials.filter(m => m.type !== 'question')];
          const filtered = allLessons.filter(l => {
            const matchTopic = filterTopic === 'all' || l.topicId === filterTopic;
            const matchSearch = !searchQuery ||
              (l.titleEn && l.titleEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (l.titleVi && l.titleVi.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (l.id && l.id.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchTopic && matchSearch;
          });

          body.innerHTML = `
            <div class="progress-section-card">
              <div class="progress-section-title">
                <span>📚 Quản lý bài học &amp; Trạng thái xuất bản (${filtered.length} bài)</span>
                <button type="button" class="action-btn primary" id="btn-show-add-lesson" style="font-size:13px;padding:6px 14px;">+ Soạn bài học mới</button>
              </div>

              <div id="add-lesson-panel" style="display:none;margin-bottom:16px;background:rgba(4,18,50,0.85);padding:18px;border-radius:14px;border:1.5px solid #00e5ff;">
                <h3 style="margin:0 0 12px;color:#00e5ff;font-size:16px;">Tạo bài học mới &amp; Lưu trên Cloud Firestore</h3>
                <form id="admin-lesson-create-form" class="auth-form" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                  <div class="form-field">
                    <label class="form-label">
                      <span class="en-line">Topic / Chapter</span>
                      <span class="vi-line">Chủ đề bài học</span>
                    </label>
                    <select class="auth-input" id="nl-topic">
                      <option value="chapter4">Chapter 4: Geometry &amp; Measurement</option>
                      <option value="chapter1">Chapter 1: Fraction</option>
                      <option value="chapter2">Chapter 2: Decimal Numbers</option>
                      <option value="chapter3">Chapter 3: Ratio and Percentage</option>
                      <option value="mathlab">Math Lab Games</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label class="form-label">
                      <span class="en-line">Unit ID</span>
                      <span class="vi-line">Mã định danh duy nhất</span>
                    </label>
                    <input type="text" class="auth-input" id="nl-unit-id" placeholder="special-triangle" required />
                  </div>
                  <div class="form-field">
                    <label class="form-label">
                      <span class="en-line">Title (English)</span>
                      <span class="vi-line">Tiêu đề bài học (Tiếng Anh)</span>
                    </label>
                    <input type="text" class="auth-input" id="nl-title-en" placeholder="Area of Special Triangle" required />
                  </div>
                  <div class="form-field">
                    <label class="form-label">
                      <span class="en-line">Title (Vietnamese)</span>
                      <span class="vi-line">Tiêu đề bài học (Tiếng Việt)</span>
                    </label>
                    <input type="text" class="auth-input" id="nl-title-vi" placeholder="Diện tích tam giác đặc biệt" required />
                  </div>

                  <div class="form-field" style="grid-column:1 / -1;">
                    <label class="form-label">
                      <span class="en-line">Theoretical Summary &amp; Formula</span>
                      <span class="vi-line">Công thức &amp; Tóm tắt lý thuyết cốt lõi</span>
                    </label>
                    <textarea class="auth-input" id="nl-summary" rows="2" placeholder="Công thức S = (a × h) : 2. Quy tắc diện tích hình tam giác..."></textarea>
                  </div>

                  <div class="form-field">
                    <label class="form-label">
                      <span class="en-line">Illustration Image URL</span>
                      <span class="vi-line">Đường dẫn ảnh minh họa</span>
                    </label>
                    <input type="text" class="auth-input" id="nl-image-url" placeholder="/assets/topics-library/geometry-measurement/ha-km2-button.png" />
                  </div>

                  <div class="form-field">
                    <label class="form-label">
                      <span class="en-line">Upload Image / Audio File</span>
                      <span class="vi-line">Tải tệp phương tiện từ máy tính</span>
                    </label>
                    <input type="file" class="auth-input" id="nl-file-upload" accept="image/*,audio/*" style="padding:6px;font-size:12px;" />
                    <span id="nl-upload-status" style="font-size:12px;color:#ffd65e;display:block;margin-top:4px;"></span>
                  </div>

                  <div class="form-field">
                    <label class="form-label">
                      <span class="en-line">Vocabulary Pair List</span>
                      <span class="vi-line">Danh sách từ vựng (Định dạng: en: vi, en: vi)</span>
                    </label>
                    <input type="text" class="auth-input" id="nl-vocab" placeholder="base: cạnh đáy, height: chiều cao, altitude: đường cao" />
                  </div>

                  <div class="form-field" style="grid-column:1 / -1;">
                    <label class="form-label">
                      <span class="en-line">Explore Section (Interactive Context)</span>
                      <span class="vi-line">Nội dung Khám phá &amp; Tình huống thực tế</span>
                    </label>
                    <textarea class="auth-input" id="nl-explore" rows="2" placeholder="Cho tam giác ABC có độ dài đáy là a và chiều cao h..."></textarea>
                  </div>

                  <div class="form-field">
                    <label class="form-label">
                      <span class="en-line">Practice Question (English / Vietnamese)</span>
                      <span class="vi-line">Câu hỏi thực hành cuối bài</span>
                    </label>
                    <input type="text" class="auth-input" id="nl-practice-q" placeholder="Calculate area when b = 10 cm, h = 6 cm." />
                  </div>

                  <div class="form-field">
                    <label class="form-label">
                      <span class="en-line">Publishing Status</span>
                      <span class="vi-line">Trạng thái xuất bản</span>
                    </label>
                    <select class="auth-input" id="nl-status">
                      <option value="published">Xuất bản / Published</option>
                      <option value="draft">Bản nháp / Draft</option>
                    </select>
                  </div>

                  <div style="grid-column:1 / -1;display:flex;gap:10px;justify-content:flex-end;align-items:center;">
                    <button type="button" class="action-btn" id="btn-preview-form-lesson">👁️ Xem trước bài học</button>
                    <button type="button" class="btn-mini" id="btn-cancel-add-lesson">Hủy / Cancel</button>
                    <button type="submit" class="auth-submit-btn" style="width:auto;padding:8px 24px;margin:0;">💾 Lưu bài học</button>
                  </div>
                </form>
                <div id="add-lesson-msg" class="auth-msg" style="display:none;margin-top:10px;"></div>
              </div>

              <div class="admin-filter-bar">
                <div class="admin-filter-group">
                  <label style="font-size:12px;color:#8ab4f8;font-weight:700;">Lọc theo chủ đề:</label>
                  <select class="auth-input" id="filter-topic-select" style="width:auto;padding:6px 12px;font-size:13px;">
                    <option value="all" ${filterTopic === 'all' ? 'selected' : ''}>Tất cả chủ đề</option>
                    <option value="chapter4" ${filterTopic === 'chapter4' ? 'selected' : ''}>Chapter 4: Geometry</option>
                    <option value="chapter1" ${filterTopic === 'chapter1' ? 'selected' : ''}>Chapter 1: Fraction</option>
                    <option value="chapter2" ${filterTopic === 'chapter2' ? 'selected' : ''}>Chapter 2: Decimal Numbers</option>
                    <option value="chapter3" ${filterTopic === 'chapter3' ? 'selected' : ''}>Chapter 3: Ratio &amp; Percentage</option>
                    <option value="mathlab" ${filterTopic === 'mathlab' ? 'selected' : ''}>Math Lab Games</option>
                  </select>
                </div>
                <input type="text" class="admin-search-input" id="filter-search-input" placeholder="Tìm theo tên bài học..." value="${escapeAttr(searchQuery)}" />
              </div>

              <div class="admin-table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Chủ đề</th>
                      <th>Mã Unit</th>
                      <th>Tiêu đề tiếng Anh</th>
                      <th>Tiêu đề tiếng Việt</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filtered.length === 0 ? `
                      <tr><td colspan="6" style="text-align:center;color:#8ab4f8;padding:20px;">Không tìm thấy bài học nào phù hợp.</td></tr>
                    ` : filtered.map(l => `
                      <tr>
                        <td><span class="resource-pill">${escapeAttr(l.topicId)}</span></td>
                        <td><code>${escapeAttr(l.id || l.unitId)}</code></td>
                        <td><strong>${escapeAttr(l.titleEn)}</strong></td>
                        <td style="color:#d8e8ff;">${escapeAttr(l.titleVi)}</td>
                        <td>
                          <span class="status-badge ${l.status === 'published' ? 'completed' : 'in_progress'}">
                            ${l.status === 'published' ? 'Xuất bản / Published' : 'Bản nháp / Draft'}
                          </span>
                        </td>
                        <td>
                          <div style="display:flex;gap:6px;align-items:center;">
                            <button type="button" class="btn-mini" data-preview-lesson="${escapeAttr(l.id || l.unitId)}">👁️ Xem trước</button>
                            ${l.isBase ? `
                              <span style="font-size:11px;color:#ffd65e;">Canva Core Unit</span>
                            ` : `
                              <button type="button" class="btn-mini danger" data-del-mat="${escapeAttr(l.id)}">Xóa</button>
                            `}
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;

          // Event bindings
          const addPanel = body.querySelector('#add-lesson-panel');
          body.querySelector('#btn-show-add-lesson')?.addEventListener('click', () => {
            if (addPanel) addPanel.style.display = addPanel.style.display === 'none' ? 'block' : 'none';
          });
          body.querySelector('#btn-cancel-add-lesson')?.addEventListener('click', () => {
            if (addPanel) addPanel.style.display = 'none';
          });

          const fileInput = body.querySelector('#nl-file-upload');
          const uploadStatus = body.querySelector('#nl-upload-status');
          fileInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (uploadStatus) uploadStatus.textContent = '⏳ Đang tải tệp lên máy chủ...';
            try {
              const reader = new FileReader();
              reader.onload = async () => {
                const base64 = reader.result;
                const uploaded = await uploadAdminAsset({
                  filename: file.name,
                  fileData: base64,
                  mimeType: file.type
                });
                const imgInput = body.querySelector('#nl-image-url');
                if (imgInput) imgInput.value = uploaded.url;
                if (uploadStatus) uploadStatus.textContent = '✅ Đã tải tệp lên thành công: ' + uploaded.url;
              };
              reader.readAsDataURL(file);
            } catch (err) {
              if (uploadStatus) uploadStatus.textContent = '❌ Lỗi tải tệp: ' + err.message;
            }
          });

          body.querySelector('#filter-topic-select')?.addEventListener('change', (e) => {
            filterTopic = e.target.value;
            renderLessonList();
          });

          body.querySelector('#filter-search-input')?.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderLessonList();
          });

          // Preview button in table
          body.querySelectorAll('[data-preview-lesson]').forEach(btn => {
            btn.addEventListener('click', () => {
              const targetId = btn.dataset.previewLesson;
              const found = filtered.find(l => (l.id || l.unitId) === targetId);
              if (found) previewLessonAsStudent(found);
            });
          });

          // Preview button in form
          const createForm = body.querySelector('#admin-lesson-create-form');
          body.querySelector('#btn-preview-form-lesson')?.addEventListener('click', () => {
            if (!createForm) return;
            const rawVocab = createForm.querySelector('#nl-vocab').value.trim();
            const vocab = rawVocab.split(',').map(item => {
              const parts = item.split(':');
              return { en: (parts[0] || '').trim(), vi: (parts[1] || '').trim() };
            }).filter(v => v.en);

            previewLessonAsStudent({
              topicId: createForm.querySelector('#nl-topic').value,
              unitId: createForm.querySelector('#nl-unit-id').value.trim() || 'unit-preview',
              titleEn: createForm.querySelector('#nl-title-en').value.trim() || 'Lesson Title EN',
              titleVi: createForm.querySelector('#nl-title-vi').value.trim() || 'Tiêu đề bài học VI',
              summary: createForm.querySelector('#nl-summary').value.trim(),
              imageUrl: createForm.querySelector('#nl-image-url').value.trim(),
              vocab,
              explore: createForm.querySelector('#nl-explore').value.trim(),
              question: createForm.querySelector('#nl-practice-q').value.trim()
            });
          });

          // Add lesson submit
          createForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msg = body.querySelector('#add-lesson-msg');
            try {
              const unitId = createForm.querySelector('#nl-unit-id').value.trim();
              const rawVocab = createForm.querySelector('#nl-vocab').value.trim();
              const vocab = rawVocab.split(',').map(item => {
                const parts = item.split(':');
                return { en: (parts[0] || '').trim(), vi: (parts[1] || '').trim() };
              }).filter(v => v.en);

              const saved = await saveLearningMaterial({
                topicId: createForm.querySelector('#nl-topic').value,
                unitId,
                titleEn: createForm.querySelector('#nl-title-en').value.trim(),
                titleVi: createForm.querySelector('#nl-title-vi').value.trim(),
                summary: createForm.querySelector('#nl-summary').value.trim(),
                imageUrl: createForm.querySelector('#nl-image-url').value.trim(),
                vocab,
                explore: createForm.querySelector('#nl-explore').value.trim(),
                question: createForm.querySelector('#nl-practice-q').value.trim(),
                status: createForm.querySelector('#nl-status').value,
                type: 'lesson'
              });

              customMaterials.push(saved);
              if (msg) {
                msg.style.display = 'block';
                msg.className = 'auth-msg success';
                msg.textContent = '✅ Đã lưu bài học thành công vào Cloud Firestore!';
              }
              setTimeout(() => renderLessonList(), 800);
            } catch (err) {
              if (msg) {
                msg.style.display = 'block';
                msg.className = 'auth-msg error';
                msg.textContent = '❌ Lỗi: ' + err.message;
              }
            }
          });

          // Delete custom material
          body.querySelectorAll('[data-del-mat]').forEach(btn => {
            btn.addEventListener('click', async () => {
              const id = btn.dataset.delMat;
              if (confirm('Bạn có chắc chắn muốn xóa bài học này khỏi Firestore?')) {
                await deleteLearningMaterial(id);
                const idx = customMaterials.findIndex(m => m.id === id);
                if (idx !== -1) customMaterials.splice(idx, 1);
                renderLessonList();
              }
            });
          });
        }

        renderLessonList();
      } catch (err) {
        body.innerHTML = `<div class="auth-msg error">Không thể tải danh sách bài học: ${err.message}</div>`;
      }
    }

    // Tab 3: Question Bank & Live Interactive Preview
    async function loadAdminQuestions(body) {
      body.innerHTML = '<div style="color:#8ab4f8;padding:24px;">Đang tải ngân hàng câu hỏi...</div>';
      try {
        const materials = await fetchLearningMaterials().catch(() => []);
        const questionsList = materials.filter(m => m.type === 'question');

        body.innerHTML = `
          <div class="progress-section-card">
            <div class="progress-section-title">
              <span>❓ Ngân hàng câu hỏi trắc nghiệm &amp; Xem trước tương tác</span>
            </div>

            <div class="builder-split">
              <!-- Left: Question Builder Form -->
              <div class="builder-form-col">
                <form id="question-builder-form" class="auth-form">
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div class="form-field">
                      <label class="form-label">
                        <span class="en-line">Topic</span>
                        <span class="vi-line">Chủ đề</span>
                      </label>
                      <select class="auth-input" id="qb-topic">
                        <option value="chapter4">Chapter 4: Geometry &amp; Measurement</option>
                        <option value="chapter1">Chapter 1: Fraction</option>
                        <option value="chapter2">Chapter 2: Decimal Numbers</option>
                        <option value="chapter3">Chapter 3: Ratio and Percentage</option>
                        <option value="mathlab">Math Lab Games</option>
                      </select>
                    </div>
                    <div class="form-field">
                      <label class="form-label">
                        <span class="en-line">Unit ID</span>
                        <span class="vi-line">Mã bài học liên kết</span>
                      </label>
                      <input type="text" class="auth-input" id="qb-unit-id" value="triangle-area" placeholder="triangle-area" required />
                    </div>
                  </div>

                  <div class="form-field">
                    <label class="form-label">
                      <span class="en-line">Question Text (EN / VI)</span>
                      <span class="vi-line">Nội dung câu hỏi (Song ngữ Anh - Việt)</span>
                    </label>
                    <textarea class="auth-input" id="qb-question" rows="3" placeholder="What is the area of a triangle with base b = 8 cm and height h = 5 cm? / Diện tích hình tam giác có đáy 8 cm và chiều cao 5 cm là bao nhiêu?" required></textarea>
                  </div>

                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div class="form-field">
                      <label class="form-label">Lựa chọn A</label>
                      <input type="text" class="auth-input" id="qb-choice-0" value="20 cm²" placeholder="Phương án A" required />
                    </div>
                    <div class="form-field">
                      <label class="form-label">Lựa chọn B</label>
                      <input type="text" class="auth-input" id="qb-choice-1" value="40 cm²" placeholder="Phương án B" required />
                    </div>
                    <div class="form-field">
                      <label class="form-label">Lựa chọn C</label>
                      <input type="text" class="auth-input" id="qb-choice-2" value="13 cm²" placeholder="Phương án C" required />
                    </div>
                    <div class="form-field">
                      <label class="form-label">Lựa chọn D</label>
                      <input type="text" class="auth-input" id="qb-choice-3" value="26 cm²" placeholder="Phương án D" required />
                    </div>
                  </div>

                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div class="form-field">
                      <label class="form-label">
                        <span class="en-line">Correct Choice</span>
                        <span class="vi-line">Đáp án đúng</span>
                      </label>
                      <select class="auth-input" id="qb-correct">
                        <option value="0">Phương án A (Lựa chọn 1)</option>
                        <option value="1">Phương án B (Lựa chọn 2)</option>
                        <option value="2">Phương án C (Lựa chọn 3)</option>
                        <option value="3">Phương án D (Lựa chọn 4)</option>
                      </select>
                    </div>
                    <div class="form-field">
                      <label class="form-label">
                        <span class="en-line">Publishing Status</span>
                        <span class="vi-line">Trạng thái</span>
                      </label>
                      <select class="auth-input" id="qb-status">
                        <option value="published">Xuất bản / Published</option>
                        <option value="draft">Bản nháp / Draft</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-field">
                    <label class="form-label">
                      <span class="en-line">Explanation &amp; Solution</span>
                      <span class="vi-line">Lời giải chi tiết &amp; Công thức</span>
                    </label>
                    <textarea class="auth-input" id="qb-explanation" rows="2" placeholder="S = (b × h) : 2 = (8 × 5) : 2 = 20 cm². Diện tích tam giác bằng đáy nhân chiều cao chia 2."></textarea>
                  </div>

                  <button type="submit" class="auth-submit-btn" id="btn-save-question">
                    💾 Lưu câu hỏi vào Ngân hàng dữ liệu
                  </button>
                  <div id="qb-feedback" class="auth-msg" style="display:none;margin-top:6px;"></div>
                </form>
              </div>

              <!-- Right: Interactive Live Preview -->
              <div class="builder-preview-col">
                <div class="preview-box">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span class="preview-badge">✨ Live Interactive Preview</span>
                    <span style="font-size:12px;color:#ffd65e;" id="pv-unit-label">Unit: triangle-area</span>
                  </div>
                  <div class="preview-question-text" id="pv-question-text">
                    What is the area of a triangle with base b = 8 cm and height h = 5 cm? / Diện tích hình tam giác có đáy 8 cm và chiều cao 5 cm là bao nhiêu?
                  </div>
                  <div class="preview-choices-list" id="pv-choices-container"></div>
                  <div id="pv-feedback-area" style="font-size:13px;line-height:1.5;min-height:24px;"></div>
                </div>
              </div>
            </div>

            <!-- Existing Questions Bank List -->
            <div style="margin-top:24px;">
              <h3 style="font-size:16px;font-weight:900;color:#ffffff;margin-bottom:12px;">
                Danh sách câu hỏi trong Ngân hàng (${questionsList.length} câu)
              </h3>
              <div class="admin-table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Chủ đề / Unit</th>
                      <th>Câu hỏi</th>
                      <th>Đáp án đúng</th>
                      <th>Lời giải</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${questionsList.length === 0 ? `
                      <tr><td colspan="5" style="text-align:center;color:#8ab4f8;padding:18px;">Chưa có câu hỏi riêng nào được tạo. Hãy sử dụng form trên để thêm câu hỏi mới!</td></tr>
                    ` : questionsList.map(q => `
                      <tr>
                        <td>
                          <span class="resource-pill">${escapeAttr(q.topicId)}</span>
                          <div style="font-size:11px;color:#8ab4f8;margin-top:4px;">${escapeAttr(q.unitId)}</div>
                        </td>
                        <td style="max-width:320px;"><strong>${escapeAttr(q.question)}</strong></td>
                        <td><span class="status-badge completed">Đáp án ${(q.correctIndex !== null ? String.fromCharCode(65 + Number(q.correctIndex)) : 'A')}</span></td>
                        <td style="font-size:12px;color:#b5d4fc;">${escapeAttr(q.explanation || '—')}</td>
                        <td>
                          <button type="button" class="btn-mini danger" data-del-q="${escapeAttr(q.id)}">Xóa</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;

        // Interactive Live Preview Updater
        const form = body.querySelector('#question-builder-form');
        const pvQuestion = body.querySelector('#pv-question-text');
        const pvChoices = body.querySelector('#pv-choices-container');
        const pvFeedback = body.querySelector('#pv-feedback-area');
        const pvUnitLabel = body.querySelector('#pv-unit-label');

        function updatePreview() {
          const qText = form.querySelector('#qb-question').value || 'Nhập câu hỏi...';
          const unitId = form.querySelector('#qb-unit-id').value || 'unit';
          const choices = [
            form.querySelector('#qb-choice-0').value || 'Phương án A',
            form.querySelector('#qb-choice-1').value || 'Phương án B',
            form.querySelector('#qb-choice-2').value || 'Phương án C',
            form.querySelector('#qb-choice-3').value || 'Phương án D',
          ];
          const correctIdx = parseInt(form.querySelector('#qb-correct').value, 10);
          const explanation = form.querySelector('#qb-explanation').value || '';

          if (pvQuestion) pvQuestion.textContent = qText;
          if (pvUnitLabel) pvUnitLabel.textContent = `Unit: ${unitId}`;

          if (pvChoices) {
            pvChoices.innerHTML = choices.map((c, i) => `
              <div class="preview-choice-item" data-pv-choice="${i}" style="cursor:pointer;">
                <span class="preview-choice-badge">${String.fromCharCode(65 + i)}</span>
                <span>${escapeAttr(c)}</span>
              </div>
            `).join('');

            pvChoices.querySelectorAll('[data-pv-choice]').forEach(item => {
              item.addEventListener('click', () => {
                const chosen = parseInt(item.dataset.pvChoice, 10);
                const isCorrect = chosen === correctIdx;
                pvChoices.querySelectorAll('.preview-choice-item').forEach((el, idx) => {
                  el.classList.remove('correct', 'incorrect');
                  if (idx === correctIdx) el.classList.add('correct');
                  else if (idx === chosen) el.classList.add('incorrect');
                });
                if (pvFeedback) {
                  pvFeedback.innerHTML = isCorrect
                    ? `<span style="color:#38ef7d;font-weight:800;">🎉 Chính xác!</span> ${escapeAttr(explanation)}`
                    : `<span style="color:#ff6b6b;font-weight:800;">Chưa đúng.</span> Hãy thử lại hoặc xem lời giải: ${escapeAttr(explanation)}`;
                }
              });
            });
          }
        }

        form?.querySelectorAll('input, textarea, select').forEach(input => {
          input.addEventListener('input', updatePreview);
          input.addEventListener('change', updatePreview);
        });

        updatePreview();

        // Save question handler
        form?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fb = body.querySelector('#qb-feedback');
          const submitBtn = body.querySelector('#btn-save-question');
          if (submitBtn) submitBtn.disabled = true;

          try {
            const choices = [
              form.querySelector('#qb-choice-0').value.trim(),
              form.querySelector('#qb-choice-1').value.trim(),
              form.querySelector('#qb-choice-2').value.trim(),
              form.querySelector('#qb-choice-3').value.trim()
            ];
            const correctIndex = parseInt(form.querySelector('#qb-correct').value, 10);
            const question = form.querySelector('#qb-question').value.trim();
            const unitId = form.querySelector('#qb-unit-id').value.trim();
            const topicId = form.querySelector('#qb-topic').value;
            const status = form.querySelector('#qb-status').value;
            const explanation = form.querySelector('#qb-explanation').value.trim();

            await saveLearningMaterial({
              type: 'question',
              topicId,
              unitId,
              question,
              choices,
              correctIndex,
              explanation,
              status
            });

            if (fb) {
              fb.style.display = 'block';
              fb.className = 'auth-msg success';
              fb.textContent = '✅ Đã lưu câu hỏi thành công vào Ngân hàng dữ liệu!';
            }
            setTimeout(() => loadAdminQuestions(body), 800);
          } catch (err) {
            if (fb) {
              fb.style.display = 'block';
              fb.className = 'auth-msg error';
              fb.textContent = '❌ Lỗi: ' + (err.message || 'Không thể lưu câu hỏi.');
            }
            if (submitBtn) submitBtn.disabled = false;
          }
        });

        // Delete question handler
        body.querySelectorAll('[data-del-q]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.delQ;
            if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
              await deleteLearningMaterial(id);
              loadAdminQuestions(body);
            }
          });
        });
      } catch (err) {
        body.innerHTML = `<div class="auth-msg error">Không thể tải ngân hàng câu hỏi: ${err.message}</div>`;
      }
    }

    // Tab 4: Canva Resources Inventory
    async function loadAdminResources(body) {
      let filterCategory = 'all';
      let searchQuery = '';

      function renderResourcesTable() {
        const filtered = CANVA_ASSET_INVENTORY.filter(a => {
          const matchCat = filterCategory === 'all' || a.category.toLowerCase().includes(filterCategory.toLowerCase());
          const matchSearch = !searchQuery ||
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.target.toLowerCase().includes(searchQuery.toLowerCase());
          return matchCat && matchSearch;
        });

        body.innerHTML = `
          <div class="progress-section-card">
            <div class="progress-section-title">
              <span>🖼️ Kho tài nguyên Canva · Verified Asset Manifest (${filtered.length} tài nguyên)</span>
            </div>
            <p style="color:#b5d4fc;font-size:13px;margin:0 0 12px;line-height:1.5;">
              Tất cả các tài nguyên hình ảnh Canva đã được xác minh đường dẫn chuẩn xác trong thư mục <code>public/assets</code>. Hệ thống bảo đảm không thu nhỏ thumbnail, không kéo méo tỷ lệ và sử dụng đồng bộ trên toàn trang.
            </p>

            <div class="admin-filter-bar">
              <div class="admin-filter-group">
                <label style="font-size:12px;color:#8ab4f8;font-weight:700;">Nhóm tài nguyên:</label>
                <select class="auth-input" id="res-cat-filter" style="width:auto;padding:6px 12px;font-size:13px;">
                  <option value="all" ${filterCategory === 'all' ? 'selected' : ''}>Tất cả nhóm tài nguyên</option>
                  <option value="Header" ${filterCategory === 'Header' ? 'selected' : ''}>Header / Thanh điều hướng</option>
                  <option value="Home" ${filterCategory === 'Home' ? 'selected' : ''}>Home / Trang chủ</option>
                  <option value="Topics" ${filterCategory === 'Topics' ? 'selected' : ''}>Topics Library / Thư viện</option>
                  <option value="Geometry" ${filterCategory === 'Geometry' ? 'selected' : ''}>Geometry &amp; Measurement</option>
                  <option value="Math Lab" ${filterCategory === 'Math Lab' ? 'selected' : ''}>Math Lab</option>
                </select>
              </div>
              <input type="text" class="admin-search-input" id="res-search-input" placeholder="Tìm theo tên file hoặc đường dẫn..." value="${escapeAttr(searchQuery)}" />
            </div>

            <div class="admin-table-wrapper">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Xem trước</th>
                    <th>Tên tài nguyên &amp; Mô tả</th>
                    <th>Đường dẫn file</th>
                    <th>Tỷ lệ / Kích thước</th>
                    <th>Nhóm &amp; Mục đích sử dụng</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.length === 0 ? `
                    <tr><td colspan="6" style="text-align:center;color:#8ab4f8;padding:20px;">Không tìm thấy tài nguyên phù hợp.</td></tr>
                  ` : filtered.map(a => `
                    <tr>
                      <td style="width:80px;text-align:center;">
                        <img src="${a.path}" alt="${escapeAttr(a.name)}" class="resource-thumb" loading="lazy" />
                      </td>
                      <td>
                        <strong>${escapeAttr(a.name)}</strong>
                        <div style="font-size:11px;color:#9ebfe8;margin-top:2px;">${escapeAttr(a.type)}</div>
                      </td>
                      <td><code>${escapeAttr(a.path)}</code></td>
                      <td><span style="font-size:12px;color:#ffd65e;">${escapeAttr(a.dimensions)}</span></td>
                      <td>
                        <span class="resource-pill">${escapeAttr(a.category)}</span>
                        <div style="font-size:11px;color:#b5d4fc;margin-top:3px;">${escapeAttr(a.target)}</div>
                      </td>
                      <td>
                        <span class="resource-pill verified">✅ ${escapeAttr(a.status)}</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;

        body.querySelector('#res-cat-filter')?.addEventListener('change', (e) => {
          filterCategory = e.target.value;
          renderResourcesTable();
        });

        body.querySelector('#res-search-input')?.addEventListener('input', (e) => {
          searchQuery = e.target.value;
          renderResourcesTable();
        });
      }

      renderResourcesTable();
    }

    // Tab 5: Students Management & Password Reset
    async function loadAdminStudents(body) {
      body.innerHTML = '<div style="color:#8ab4f8;padding:24px;">Đang tải danh sách học sinh từ hệ thống...</div>';
      try {
        const students = await fetchAllStudents().catch(() => []);
        const progressAll = await fetchAllStudentsProgress().catch(() => []);
        let classFilter = 'all';
        let searchQuery = '';

        function renderStudentsTable() {
          const classes = Array.from(new Set(students.map(s => s.classId || '5A1')));
          const filtered = students.filter(s => {
            const matchClass = classFilter === 'all' || (s.classId || '5A1') === classFilter;
            const matchSearch = !searchQuery ||
              (s.displayName && s.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (s.username && s.username.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchClass && matchSearch;
          });

          body.innerHTML = `
            <div class="progress-section-card">
              <div class="progress-section-title">
                <span>👥 Quản lý tài khoản học sinh (${filtered.length} học sinh)</span>
              </div>
              <p style="color:#b5d4fc;font-size:13px;margin:0 0 12px;">
                Quản trị viên và giáo viên có thể theo dõi tiến độ, kiểm tra lần học gần nhất và hỗ trợ đặt lại mật khẩu cho học sinh tiểu học khi cần thiết.
              </p>

              <div class="admin-filter-bar">
                <div class="admin-filter-group">
                  <label style="font-size:12px;color:#8ab4f8;font-weight:700;">Lọc theo lớp:</label>
                  <select class="auth-input" id="student-class-filter" style="width:auto;padding:6px 12px;font-size:13px;">
                    <option value="all" ${classFilter === 'all' ? 'selected' : ''}>Tất cả các lớp</option>
                    ${classes.map(c => `
                      <option value="${escapeAttr(c)}" ${classFilter === c ? 'selected' : ''}>Lớp ${escapeAttr(c)}</option>
                    `).join('')}
                  </select>
                </div>
                <input type="text" class="admin-search-input" id="student-search-input" placeholder="Tìm theo tên hoặc username..." value="${escapeAttr(searchQuery)}" />
              </div>

              <div class="admin-table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Học sinh</th>
                      <th>Tên đăng nhập</th>
                      <th>Lớp &amp; Khối</th>
                      <th>Bài đã học</th>
                      <th>Điểm TB</th>
                      <th>Lần học gần nhất</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filtered.length === 0 ? `
                      <tr><td colspan="7" style="text-align:center;color:#8ab4f8;padding:20px;">Chưa có học sinh nào phù hợp.</td></tr>
                    ` : filtered.map(s => {
                      const sp = progressAll.filter(p => p.userId === (s.id || s.uid));
                      const completed = sp.filter(p => p.status === 'completed').length;
                      const avg = completed > 0 ? Math.round(sp.filter(p => p.status === 'completed').reduce((a, b) => a + (b.score || 0), 0) / completed) : 0;
                      const last = sp[0]?.lastStudiedAt ? new Date(sp[0].lastStudiedAt).toLocaleDateString() : 'Chưa học';
                      return `
                        <tr>
                          <td>
                            <div style="display:flex;align-items:center;gap:8px;">
                              <span class="nav-user-avatar" style="width:28px;height:28px;flex-shrink:0;">${renderAvatarSvg(s.avatarUrl || 'astronaut-1')}</span>
                              <strong>${escapeAttr(s.displayName || s.username)}</strong>
                            </div>
                          </td>
                          <td><code>${escapeAttr(s.username)}</code></td>
                          <td>${escapeAttr(s.classId || '5A1')} · ${escapeAttr(s.grade || 'Grade 5')}</td>
                          <td>${completed} bài</td>
                          <td><span class="status-badge ${avg >= 70 ? 'completed' : 'in_progress'}">${avg}%</span></td>
                          <td>${last}</td>
                          <td>
                            <button type="button" class="btn-mini" data-reset-pwd="${escapeAttr(s.id)}" data-name="${escapeAttr(s.displayName || s.username)}">
                              🔑 Đặt lại mật khẩu
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;

          body.querySelector('#student-class-filter')?.addEventListener('change', (e) => {
            classFilter = e.target.value;
            renderStudentsTable();
          });

          body.querySelector('#student-search-input')?.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderStudentsTable();
          });

          // Reset Password Modal Trigger
          body.querySelectorAll('[data-reset-pwd]').forEach(btn => {
            btn.addEventListener('click', () => {
              const studentId = btn.dataset.resetPwd;
              const studentName = btn.dataset.name;

              openModal({
                title: 'Đặt lại mật khẩu học sinh',
                subtitle: `Học sinh: ${studentName}`,
                kicker: 'Quản trị viên · Admin Password Reset',
                content: `
                  <form id="reset-pwd-modal-form" class="auth-form" style="margin-top:12px;">
                    <div class="form-field">
                      <label class="form-label">
                        <span class="en-line">New Password</span>
                        <span class="vi-line">Mật khẩu mới (Tối thiểu 6 ký tự)</span>
                      </label>
                      <input type="password" class="auth-input" id="rpm-new-password" placeholder="Nhập mật khẩu mới..." required />
                    </div>
                    <button type="submit" class="auth-submit-btn" id="btn-rpm-submit">
                      Cập nhật mật khẩu cho học sinh
                    </button>
                    <div id="rpm-msg" class="auth-msg" style="display:none;margin-top:10px;"></div>
                  </form>
                `,
                actions: '<button type="button" class="action-btn" data-close-modal>Đóng / Close</button>'
              });

              const modalForm = modalRoot.querySelector('#reset-pwd-modal-form');
              modalForm?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const msg = modalRoot.querySelector('#rpm-msg');
                const submitBtn = modalRoot.querySelector('#btn-rpm-submit');
                if (submitBtn) submitBtn.disabled = true;

                try {
                  const newPassword = modalForm.querySelector('#rpm-new-password').value;
                  await resetStudentPassword(studentId, newPassword);
                  if (msg) {
                    msg.style.display = 'block';
                    msg.className = 'auth-msg success';
                    msg.textContent = `✅ Đã đặt lại mật khẩu cho học sinh ${studentName} thành công!`;
                  }
                  setTimeout(() => closeModal(), 1200);
                } catch (err) {
                  if (msg) {
                    msg.style.display = 'block';
                    msg.className = 'auth-msg error';
                    msg.textContent = '❌ Lỗi: ' + (err.message || 'Không thể đặt lại mật khẩu.');
                  }
                  if (submitBtn) submitBtn.disabled = false;
                }
              });
            });
          });
        }

        renderStudentsTable();
      } catch (err) {
        body.innerHTML = `<div class="auth-msg error">Không thể tải danh sách học sinh: ${err.message}</div>`;
      }
    }

    // Tab 6: Progress Reports & Skill Analytics
    async function loadAdminReports(body) {
      body.innerHTML = '<div style="color:#8ab4f8;padding:24px;">Đang tổng hợp báo cáo tiến độ học tập...</div>';
      try {
        const [students, progressAll] = await Promise.all([
          fetchAllStudents().catch(() => []),
          fetchAllStudentsProgress().catch(() => [])
        ]);

        const totalAttempts = progressAll.length;
        const completedSessions = progressAll.filter(p => p.status === 'completed');
        const passSessions = progressAll.filter(p => (p.score || 0) >= 70);
        const passRate = totalAttempts > 0 ? Math.round((passSessions.length / totalAttempts) * 100) : 0;

        // Skill Breakdown from Geometry Units
        const skillStats = GEOMETRY_UNITS.map(u => {
          const matching = progressAll.filter(p => p.unitId === u.id);
          const comp = matching.filter(p => p.status === 'completed');
          const avg = comp.length > 0 ? Math.round(comp.reduce((a, b) => a + (b.score || 0), 0) / comp.length) : 0;
          return {
            unitId: u.id,
            titleEn: u.titleEn,
            titleVi: u.titleVi,
            attempts: matching.length,
            completed: comp.length,
            averageScore: avg,
            mastered: avg >= 80
          };
        });

        const masteredSkills = skillStats.filter(s => s.mastered);
        const practiceSkills = skillStats.filter(s => !s.mastered);

        body.innerHTML = `
          <div class="progress-section-card">
            <div class="progress-section-title">
              <span>📈 Báo cáo chi tiết &amp; Đánh giá năng lực toán học khối 5</span>
            </div>

            <div class="progress-kpi-grid">
              <div class="progress-kpi-card">
                <span class="progress-kpi-title">Tổng số lượt thực hành</span>
                <span class="progress-kpi-val">${totalAttempts}</span>
                <span class="progress-kpi-sub">Lượt làm bài trắc nghiệm</span>
              </div>
              <div class="progress-kpi-card">
                <span class="progress-kpi-title">Tỉ lệ đạt chuẩn (≥ 70%)</span>
                <span class="progress-kpi-val">${passRate}%</span>
                <span class="progress-kpi-sub">${passSessions.length} / ${totalAttempts} phiên đạt</span>
              </div>
              <div class="progress-kpi-card">
                <span class="progress-kpi-title">Kỹ năng đã làm chủ</span>
                <span class="progress-kpi-val" style="color:#38ef7d;">${masteredSkills.length}</span>
                <span class="progress-kpi-sub">Đạt điểm trung bình ≥ 80%</span>
              </div>
              <div class="progress-kpi-card">
                <span class="progress-kpi-title">Kỹ năng cần bổ trợ</span>
                <span class="progress-kpi-val" style="color:#ffd65e;">${practiceSkills.length}</span>
                <span class="progress-kpi-sub">Cần ôn luyện thêm</span>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;">
              <!-- Mastered Skills -->
              <div style="background:rgba(5,20,54,0.6);padding:18px;border-radius:14px;border:1px solid #1852a8;">
                <h4 style="margin:0 0 12px;color:#38ef7d;font-size:15px;display:flex;align-items:center;gap:6px;">
                  <span>🎯 Kỹ năng học sinh đã nắm vững (Mastered Skills)</span>
                </h4>
                ${masteredSkills.length === 0 ? `
                  <p style="color:#8ab4f8;font-size:13px;margin:0;">Chưa có kỹ năng nào đạt chuẩn ≥ 80%. Hãy khuyến khích học sinh luyện tập thêm!</p>
                ` : `
                  <div style="display:flex;flex-direction:column;gap:10px;">
                    ${masteredSkills.map(s => `
                      <div>
                        <div style="display:flex;justify-content:space-between;font-size:13px;">
                          <strong>${escapeAttr(s.titleEn)}</strong>
                          <span style="color:#38ef7d;font-weight:800;">${s.averageScore}%</span>
                        </div>
                        <div style="font-size:11px;color:#8ab4f8;">${escapeAttr(s.titleVi)} · ${s.completed} học sinh hoàn thành</div>
                        <div class="skill-bar-wrap">
                          <div class="skill-bar-fill" style="width:${s.averageScore}%;"></div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>

              <!-- Skills Needing Practice -->
              <div style="background:rgba(5,20,54,0.6);padding:18px;border-radius:14px;border:1px solid #1852a8;">
                <h4 style="margin:0 0 12px;color:#ffd65e;font-size:15px;display:flex;align-items:center;gap:6px;">
                  <span>💡 Kỹ năng cần luyện tập thêm (Focus Areas)</span>
                </h4>
                ${practiceSkills.length === 0 ? `
                  <p style="color:#38ef7d;font-size:13px;margin:0;">Tuyệt vời! Tất cả các kỹ năng đều đã đạt chuẩn xuất sắc.</p>
                ` : `
                  <div style="display:flex;flex-direction:column;gap:10px;">
                    ${practiceSkills.map(s => `
                      <div>
                        <div style="display:flex;justify-content:space-between;font-size:13px;">
                          <strong>${escapeAttr(s.titleEn)}</strong>
                          <span style="color:#ffd65e;font-weight:800;">${s.averageScore}%</span>
                        </div>
                        <div style="font-size:11px;color:#8ab4f8;">${escapeAttr(s.titleVi)} · ${s.attempts} lượt thử</div>
                        <div class="skill-bar-wrap">
                          <div class="skill-bar-fill" style="width:${Math.max(s.averageScore, 8)}%;background:linear-gradient(90deg, #ff9900, #ffd65e);"></div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>

            <!-- Recent Submissions Log -->
            <div style="margin-top:24px;">
              <h3 style="font-size:16px;font-weight:900;color:#ffffff;margin-bottom:12px;">
                Nhật ký luyện tập gần đây của học sinh
              </h3>
              <div class="admin-table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Học sinh</th>
                      <th>Bài học</th>
                      <th>Chủ đề</th>
                      <th>Điểm số</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${progressAll.slice(0, 15).map(p => {
                      const student = students.find(s => s.id === p.userId || s.uid === p.userId);
                      return `
                        <tr>
                          <td><strong>${escapeAttr(student ? student.displayName : p.userId)}</strong></td>
                          <td>${escapeAttr(p.titleEn || p.unitId)}</td>
                          <td><span class="resource-pill">${escapeAttr(p.topicId)}</span></td>
                          <td><span class="status-badge ${p.score >= 70 ? 'completed' : 'in_progress'}">${p.score}%</span></td>
                          <td>${p.status === 'completed' ? 'Hoàn thành' : 'Đang học'}</td>
                          <td style="font-size:12px;color:#8ab4f8;">${p.lastStudiedAt ? new Date(p.lastStudiedAt).toLocaleString() : 'Vừa xong'}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      } catch (err) {
        body.innerHTML = `<div class="auth-msg error">Không thể tổng hợp báo cáo: ${err.message}</div>`;
      }
    }

    // Tab 7: Settings & Admin Security
    async function loadAdminSettings(body) {
      body.innerHTML = '<div style="color:#8ab4f8;padding:24px;">Đang tải cài đặt hệ thống...</div>';
      try {
        const settings = await fetchAdminSettings().catch(() => ({
          allowRegistration: true,
          maintenanceMode: false,
          mathAudioEnabled: true,
          announcement: 'Chào mừng các em học sinh khối 5 đến với MathLingua AI!'
        }));

        body.innerHTML = `
          <div class="settings-card">
            <div class="progress-section-title">
              <span>🔒 Thay đổi mật khẩu Quản trị viên (Admin Security)</span>
            </div>
            <p style="color:#b5d4fc;font-size:13px;margin:0 0 10px;line-height:1.5;">
              Mật khẩu quản trị được bảo vệ bằng mã hóa muối PBKDF2 (10,000 vòng lặp) tại máy chủ và không bao giờ lưu trữ dạng văn bản thuần. Bạn có thể cập nhật mật khẩu mới tại đây:
            </p>
            <form id="admin-change-pwd-form" class="auth-form" style="max-width:480px;">
              <div class="form-field">
                <label class="form-label">
                  <span class="en-line">Administrator Username</span>
                  <span class="vi-line">Tài khoản quản trị</span>
                </label>
                <input type="text" class="auth-input" value="admin" disabled />
              </div>
              <div class="form-field">
                <label class="form-label" for="new-admin-password">
                  <span class="en-line">New Admin Password</span>
                  <span class="vi-line">Mật khẩu quản trị mới (Tối thiểu 6 ký tự bảo mật)</span>
                </label>
                <input type="password" class="auth-input" id="new-admin-password" placeholder="Nhập mật khẩu mới..." required />
              </div>
              <button type="submit" class="auth-submit-btn" style="width:auto;padding:12px 28px;">
                Cập nhật mật khẩu Admin
              </button>
              <div id="pwd-change-msg" class="auth-msg" style="display:none;margin-top:10px;"></div>
            </form>
          </div>

          <div class="settings-card" style="margin-top:20px;">
            <div class="progress-section-title">
              <span>⚙️ Cấu hình tùy chọn hệ thống (System Preferences)</span>
            </div>
            <form id="system-settings-form" class="auth-form">
              <div class="settings-row">
                <div class="settings-info">
                  <h4>Cho phép học sinh tự đăng ký tài khoản (Student Self-Registration)</h4>
                  <p>Khi bật, học sinh có thể tự mở tab "Student Register" trên hộp thoại để tạo tài khoản lớp 5.</p>
                </div>
                <label style="cursor:pointer;display:flex;align-items:center;gap:8px;">
                  <input type="checkbox" id="set-allow-reg" ${settings.allowRegistration !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:#00e5ff;" />
                  <span style="font-weight:700;color:#00e5ff;">Bật / Enabled</span>
                </label>
              </div>

              <div class="settings-row">
                <div class="settings-info">
                  <h4>Hỗ trợ phát âm từ vựng toán học (Math Audio Pronunciation)</h4>
                  <p>Tự động phát âm chuẩn thuật ngữ song ngữ trong Topics Library và MathBuddy AI.</p>
                </div>
                <label style="cursor:pointer;display:flex;align-items:center;gap:8px;">
                  <input type="checkbox" id="set-audio" ${settings.mathAudioEnabled !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:#00e5ff;" />
                  <span style="font-weight:700;color:#00e5ff;">Bật / Enabled</span>
                </label>
              </div>

              <div class="settings-row">
                <div class="settings-info">
                  <h4>Chế độ bảo trì hệ thống (Maintenance Mode)</h4>
                  <p>Chỉ cho phép tài khoản Admin/Teacher truy cập để bảo trì học liệu và máy chủ.</p>
                </div>
                <label style="cursor:pointer;display:flex;align-items:center;gap:8px;">
                  <input type="checkbox" id="set-maintenance" ${settings.maintenanceMode ? 'checked' : ''} style="width:20px;height:20px;accent-color:#ffd65e;" />
                  <span style="font-weight:700;color:#ffd65e;">Bật / Maintenance</span>
                </label>
              </div>

              <div class="form-field" style="margin-top:10px;">
                <label class="form-label">
                  <span class="en-line">School Announcement Banner</span>
                  <span class="vi-line">Thông báo chung cho toàn bộ học sinh</span>
                </label>
                <input type="text" class="auth-input" id="set-announcement" value="${escapeAttr(settings.announcement || '')}" placeholder="Ví dụ: Chào mừng các em đến với học kỳ mới!" />
              </div>

              <div style="display:flex;justify-content:flex-end;">
                <button type="submit" class="auth-submit-btn" style="width:auto;padding:12px 28px;">
                  💾 Lưu cấu hình hệ thống
                </button>
              </div>
              <div id="sys-settings-msg" class="auth-msg" style="display:none;margin-top:10px;"></div>
            </form>
          </div>
        `;

        // Change Admin Password Form handler
        const pwdForm = body.querySelector('#admin-change-pwd-form');
        pwdForm?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fb = body.querySelector('#pwd-change-msg');
          try {
            const newPwd = pwdForm.querySelector('#new-admin-password').value;
            await changeUserPassword(newPwd);
            if (fb) {
              fb.style.display = 'block';
              fb.className = 'auth-msg success';
              fb.textContent = '✅ Mật khẩu quản trị viên đã được cập nhật an toàn thành công!';
            }
            pwdForm.reset();
          } catch (err) {
            if (fb) {
              fb.style.display = 'block';
              fb.className = 'auth-msg error';
              fb.textContent = '❌ Lỗi: ' + (err.message || 'Không thể đổi mật khẩu.');
            }
          }
        });

        // System Settings Form handler
        const sysForm = body.querySelector('#system-settings-form');
        sysForm?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fb = body.querySelector('#sys-settings-msg');
          try {
            const updated = await saveAdminSettings({
              allowRegistration: sysForm.querySelector('#set-allow-reg').checked,
              mathAudioEnabled: sysForm.querySelector('#set-audio').checked,
              maintenanceMode: sysForm.querySelector('#set-maintenance').checked,
              announcement: sysForm.querySelector('#set-announcement').value.trim()
            });
            if (fb) {
              fb.style.display = 'block';
              fb.className = 'auth-msg success';
              fb.textContent = '✅ Đã lưu cấu hình hệ thống thành công!';
            }
          } catch (err) {
            if (fb) {
              fb.style.display = 'block';
              fb.className = 'auth-msg error';
              fb.textContent = '❌ Lỗi: ' + (err.message || 'Không thể lưu cài đặt.');
            }
          }
        });
      } catch (err) {
        body.innerHTML = `<div class="auth-msg error">Không thể tải cài đặt: ${err.message}</div>`;
      }
    }

    renderAdminContent();
    scroll.appendChild(stage);
    root.appendChild(scroll);
  }

  function renderSquareKilometreHectareLesson() {
    root.innerHTML = '';

    const scroll = document.createElement('div');
    scroll.className = 'stage-scroll lesson-embed-scroll';

    const container = document.createElement('div');
    container.className = 'lesson-embed-container';

    // 1. Navigation Toolbar with Back button (Outside of iframe)
    const backToolbar = document.createElement('div');
    backToolbar.className = 'lesson-back-toolbar-simple';
    backToolbar.innerHTML = `
      <button type="button" class="lesson-back-text-btn" id="btn-back-geometry" aria-label="Back" title="Back">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back</span>
      </button>
    `;

    // Clicking Back icon returns strictly to Geometry and Measurement page (chapter4)
    backToolbar.querySelector('#btn-back-geometry')?.addEventListener('click', () => {
      navigate('chapter4');
    });

    container.appendChild(backToolbar);

    // 2. Fallback / Error banner (hidden initially, shown on iframe load failure or timeout)
    const errorBanner = document.createElement('div');
    errorBanner.className = 'lesson-embed-error-banner';
    errorBanner.id = 'lesson-error-banner';
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
        <button type="button" class="action-btn" id="btn-retry-iframe">🔄 Thử lại / Retry</button>
        <a href="${HECTARE_PUBLISHED_LESSON_URL}" target="_blank" rel="noopener noreferrer" class="action-btn primary" style="text-decoration:none;">
          🚀 Open Lesson in New Tab / Mở bài học trong tab mới
        </a>
      </div>
    `;
    container.appendChild(errorBanner);

    // 3. Main Lesson Area: Responsive iframe displaying external lesson app
    const frameWrap = document.createElement('div');
    frameWrap.className = 'lesson-embed-frame-wrap';
    frameWrap.id = 'lesson-frame-wrap';

    // Loading State Overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'lesson-embed-loading';
    loadingOverlay.id = 'lesson-loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-planet-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-core">🚀</div>
      </div>
      <h3 style="margin:16px 0 6px;color:#ffffff;font-size:18px;font-weight:900;">
        Loading lesson... / Đang tải bài học...
      </h3>
      <p style="margin:0;color:#9bc3f8;font-size:14px;max-width:540px;line-height:1.5;">
        Đang kết nối ứng dụng học tập Hectare and Square Kilometre. Đầy đủ các phần Explore, Vocab, Structure và Practice.
      </p>
    `;
    frameWrap.appendChild(loadingOverlay);

    // Responsive Iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'external-hectare-iframe';
    iframe.className = 'lesson-embed-iframe';
    iframe.src = HECTARE_PUBLISHED_LESSON_URL;
    iframe.title = 'Hectare and Square Kilometre | MathLingua AI';
    iframe.setAttribute('allow', 'camera; microphone; autoplay; display-capture; clipboard-write; fullscreen');
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
    errorBanner.querySelector('#btn-retry-iframe')?.addEventListener('click', () => {
      isIframeLoaded = false;
      errorBanner.style.display = 'none';
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.classList.remove('fade-out');
      }
      iframe.src = HECTARE_PUBLISHED_LESSON_URL;
    });

    frameWrap.appendChild(iframe);
    container.appendChild(frameWrap);
    scroll.appendChild(container);
    root.appendChild(scroll);
  }

  function render3DShapeStudioGame() {
    root.innerHTML = '';

    const scroll = document.createElement('div');
    scroll.className = 'stage-scroll lesson-embed-scroll';

    const container = document.createElement('div');
    container.className = 'lesson-embed-container';

    // 1. Back to Math Lab Toolbar (Outside of iframe)
    const backToolbar = document.createElement('div');
    backToolbar.className = 'lesson-back-toolbar-simple';
    backToolbar.innerHTML = `
      <button type="button" class="lesson-back-text-btn" id="btn-back-mathlab" aria-label="Back" title="Back">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back</span>
      </button>
    `;

    backToolbar.querySelector('#btn-back-mathlab')?.addEventListener('click', () => {
      navigate('mathlab');
    });

    container.appendChild(backToolbar);

    // 2. Error / Fallback banner (hidden initially, shown on iframe load failure or timeout)
    const errorBanner = document.createElement('div');
    errorBanner.className = 'lesson-embed-error-banner';
    errorBanner.id = 'game-3d-error-banner';
    errorBanner.style.display = 'none';
    errorBanner.innerHTML = `
      <div class="error-banner-content">
        <span class="error-banner-icon">🎲</span>
        <div class="error-banner-text">
          <h4>Thông báo kết nối công cụ 3D Shape Studio</h4>
          <p>Nếu công cụ mô phỏng 3D tải chậm do chính sách bảo mật trình duyệt hoặc mạng, bạn có thể nhấn Thử lại hoặc Mở trong tab mới để trải nghiệm đầy đủ.</p>
        </div>
      </div>
      <div class="error-banner-actions">
        <button type="button" class="action-btn" id="btn-retry-3d-iframe">🔄 Thử lại / Retry</button>
        <a href="${GEOMETRY_3D_LAB_URL}" target="_blank" rel="noopener noreferrer" class="action-btn primary" style="text-decoration:none;">
          🚀 Open 3D Shape Studio in New Tab / Mở công cụ trong tab mới
        </a>
      </div>
    `;
    container.appendChild(errorBanner);

    // 3. Main Area: Responsive iframe displaying 3D Geometry Lab
    const frameWrap = document.createElement('div');
    frameWrap.className = 'lesson-embed-frame-wrap';
    frameWrap.id = 'game-3d-frame-wrap';

    // Loading State Overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'lesson-embed-loading';
    loadingOverlay.id = 'game-3d-loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-planet-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-core">🎲</div>
      </div>
      <h3 style="margin:16px 0 6px;color:#ffffff;font-size:18px;font-weight:900;">
        Loading 3D Shape Studio... / Đang tải xưởng hình khối 3D...
      </h3>
      <p style="margin:0;color:#9bc3f8;font-size:14px;max-width:540px;line-height:1.5;">
        Đang kết nối công cụ mô phỏng 3D Geometry Lab. Khám phá các hình khối không gian và hình khai triển tương tác.
      </p>
    `;
    frameWrap.appendChild(loadingOverlay);

    // Responsive Iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'external-3d-geometry-iframe';
    iframe.className = 'lesson-embed-iframe';
    iframe.src = GEOMETRY_3D_LAB_URL;
    iframe.title = '3D Shape Studio · 3D Geometry Lab | MathLingua AI';
    iframe.setAttribute('allow', 'fullscreen; autoplay; VR; xr-spatial-tracking; clipboard-write');
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
    errorBanner.querySelector('#btn-retry-3d-iframe')?.addEventListener('click', () => {
      isIframeLoaded = false;
      errorBanner.style.display = 'none';
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.classList.remove('fade-out');
      }
      iframe.src = GEOMETRY_3D_LAB_URL;
    });

    frameWrap.appendChild(iframe);
    container.appendChild(frameWrap);
    scroll.appendChild(container);
    root.appendChild(scroll);
  }

  function renderDecimalFractionsLesson() {
    root.innerHTML = '';

    const scroll = document.createElement('div');
    scroll.className = 'stage-scroll lesson-embed-scroll';

    const container = document.createElement('div');
    container.className = 'lesson-embed-container';

    // 1. Navigation Toolbar with Back button to Fraction (Chapter 1)
    const backToolbar = document.createElement('div');
    backToolbar.className = 'lesson-back-toolbar-simple';
    backToolbar.innerHTML = `
      <button type="button" class="lesson-back-text-btn" id="btn-back-fraction-df" aria-label="Back" title="Back">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back</span>
      </button>
    `;

    // Clicking Back button returns strictly to Fraction topic page (chapter1 / #chapter1)
    backToolbar.querySelector('#btn-back-fraction-df')?.addEventListener('click', () => {
      navigate('chapter1');
    });

    container.appendChild(backToolbar);

    // 2. Fallback / Error banner (hidden initially, shown on iframe load failure or timeout)
    const errorBanner = document.createElement('div');
    errorBanner.className = 'lesson-embed-error-banner';
    errorBanner.id = 'lesson-df-error-banner';
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
        <button type="button" class="action-btn" id="btn-retry-df-iframe">🔄 Thử lại / Retry</button>
        <a href="${DECIMAL_FRACTIONS_PUBLISHED_LESSON_URL}" target="_blank" rel="noopener noreferrer" class="action-btn primary" style="text-decoration:none;">
          🚀 Open Lesson in New Tab / Mở bài học trong tab mới
        </a>
      </div>
    `;
    container.appendChild(errorBanner);

    // 3. Main Lesson Area: Responsive iframe displaying external Vercel lesson app
    const frameWrap = document.createElement('div');
    frameWrap.className = 'lesson-embed-frame-wrap';
    frameWrap.id = 'lesson-df-frame-wrap';

    // Loading State Overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'lesson-embed-loading';
    loadingOverlay.id = 'lesson-df-loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-planet-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-core">🚀</div>
      </div>
      <h3 style="margin:16px 0 6px;color:#ffffff;font-size:18px;font-weight:900;">
        Loading lesson... / Đang tải bài học Phân số thập phân...
      </h3>
      <p style="margin:0;color:#9bc3f8;font-size:14px;max-width:540px;line-height:1.5;">
        Đang kết nối ứng dụng học tập Decimal Fractions. Đầy đủ các phần Explore, Vocab, Structure và Practice.
      </p>
    `;
    frameWrap.appendChild(loadingOverlay);

    // Responsive Iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'external-decimal-fractions-iframe';
    iframe.className = 'lesson-embed-iframe';
    iframe.src = DECIMAL_FRACTIONS_PUBLISHED_LESSON_URL;
    iframe.title = 'Decimal Fractions | MathLingua AI';
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
    errorBanner.querySelector('#btn-retry-df-iframe')?.addEventListener('click', () => {
      isIframeLoaded = false;
      errorBanner.style.display = 'none';
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.classList.remove('fade-out');
      }
      iframe.src = DECIMAL_FRACTIONS_PUBLISHED_LESSON_URL;
    });

    frameWrap.appendChild(iframe);
    container.appendChild(frameWrap);
    scroll.appendChild(container);
    root.appendChild(scroll);
  }

  function renderPage() {
    syncHeaderVisibility();
    document.body.classList.toggle('is-decimal-page', currentRoute === 'chapter2');
    if (currentRoute === 'lesson_ha_km2') {
      renderSquareKilometreHectareLesson();
      return;
    }
    if (currentRoute === 'lesson_decimal_fractions') {
      renderDecimalFractionsLesson();
      return;
    }
    if (currentRoute === 'lesson_decimal_number') {
      renderDecimalNumberEmbed(root, navigate);
      return;
    }
    if (currentRoute === 'lesson_comparing_decimals') {
      renderComparingDecimalNumbersEmbed(root, navigate);
      return;
    }
    if (currentRoute === 'lesson_mixed_numbers') {
      renderMixedNumbersEmbed(root, navigate);
      return;
    }
    if (currentRoute === 'game_3d_shapes') {
      render3DShapeStudioGame();
      return;
    }
    if (currentRoute === 'game_mixed_numbers') {
      renderMixedNumberAdventureEmbed(root, navigate);
      return;
    }
    if (currentRoute === 'game_ants') {
      renderAntsFoodQuestEmbed(root, navigate);
      return;
    }
    if (currentRoute === 'game_mystery_pieces') {
      renderMysteryPiecesEmbed(root, navigate);
      return;
    }
    if (currentRoute === 'buddy') {
      renderMathBuddyConversation(root, navigate);
      return;
    }
    if (currentRoute === 'chapter4') {
      renderGeometryPage();
      return;
    }
    if (currentRoute === 'progress') {
      renderProgressPage();
      return;
    }
    if (currentRoute === 'admin') {
      renderAdminPage();
      return;
    }

    const meta = PAGE_META[currentRoute];
    root.innerHTML = '';
    const scroll = document.createElement('div');
    scroll.className = 'stage-scroll';
    const board = document.createElement('section');
    board.className = `artboard ${meta.className || ''}`;
    board.setAttribute('aria-label', meta.alt);

    const img = document.createElement('img');
    img.className = 'artboard-bg';
    img.src = meta.src;
    img.alt = meta.alt;
    img.draggable = false;
    img.decoding = 'async';
    if (meta.fallbackSrc) {
      img.onerror = () => {
        img.onerror = null;
        img.src = meta.fallbackSrc;
      };
    }
    board.appendChild(img);
    scroll.appendChild(board);
    root.appendChild(scroll);

    if (currentRoute === 'home') {
      img.setAttribute('data-layout-layer', 'home-bg');
      img.setAttribute('data-layer-title', 'Nền Trang chủ (Canva Artwork)');
      img.setAttribute('data-layer-type', 'background');

      const logoImg = document.createElement('img');
      logoImg.className = 'home-main-logo';
      logoImg.src = ASSET_MANIFEST.home.logo || '/assets/home/logo.png';
      logoImg.alt = 'MathLingua AI Grade 5 Logo';
      logoImg.draggable = false;
      logoImg.setAttribute('data-layout-layer', 'home-logo');
      logoImg.setAttribute('data-layer-title', 'Biểu trưng MathLingua AI');
      logoImg.setAttribute('data-layer-type', 'image');
      board.appendChild(logoImg);

      addHotspot(board, {
        x: 0.422, y: 0.795, w: 0.355, h: 0.155,
        route: 'topics',
        label: 'Bắt đầu hành trình / Start your journey',
        buttonImg: ASSET_MANIFEST.home.button || '/assets/home/home-button.png',
        layerId: 'home-start-btn'
      });
    } else if (currentRoute === 'topics') {
      img.setAttribute('data-layout-layer', 'topics-bg');
      img.setAttribute('data-layer-title', 'Nền Thư viện chủ đề (Canva Artwork)');
      img.setAttribute('data-layer-type', 'background');

      // Four topic planet buttons using verified Canva assets
      const gridZone = document.createElement('div');
      gridZone.className = 'topics-grid-zone';
      gridZone.setAttribute('data-layout-layer', 'topics-grid-zone');
      gridZone.setAttribute('data-layer-title', 'Khu vực 4 chủ đề kiến thức');
      gridZone.setAttribute('data-layer-type', 'container');

      const grid = document.createElement('div');
      grid.className = 'topics-planets-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Bốn hành tinh chủ đề toán lớp 5');

      const topicButtons = [
        {
          id: 'btn-fraction',
          title: 'Fraction (Phân số)',
          route: 'chapter1',
          image: '/assets/topics-library/Fraction-button.png',
          alt: 'Chủ đề Phân số / Fraction'
        },
        {
          id: 'btn-decimals',
          title: 'Decimal Numbers (Số thập phân)',
          route: 'chapter2',
          image: '/assets/topics-library/Decimal-button.png',
          alt: 'Chủ đề Số thập phân / Decimal Numbers'
        },
        {
          id: 'btn-ratio',
          title: 'Ratio & Percentage (Tỉ số & Phần trăm)',
          route: 'chapter3',
          image: '/assets/topics-library/Ratio-button.png',
          alt: 'Chủ đề Tỉ số và tỉ số phần trăm / Ratio and Percentage'
        },
        {
          id: 'btn-geometry',
          title: 'Geometry & Measurement (Hình học & Đo lường)',
          route: 'chapter4',
          image: '/assets/topics-library/Geometry-button.png',
          alt: 'Chủ đề Hình học và đo lường / Geometry and Measurement'
        }
      ];

      topicButtons.forEach(btnSpec => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'topic-planet-btn';
        btn.setAttribute('data-layout-layer', btnSpec.id);
        btn.setAttribute('data-layer-title', btnSpec.title);
        btn.setAttribute('data-layer-type', 'button');
        btn.setAttribute('data-route', btnSpec.route);
        btn.setAttribute('aria-label', btnSpec.title);
        btn.title = btnSpec.title;

        const btnImg = document.createElement('img');
        btnImg.src = btnSpec.image;
        btnImg.alt = btnSpec.alt;
        btnImg.draggable = false;
        btnImg.loading = 'eager';
        btn.appendChild(btnImg);

        btn.addEventListener('click', (e) => {
          if (window.activeLayoutEditor && !window.activeLayoutEditor.isStudentPreview) return;
          navigate(btnSpec.route);
        });

        grid.appendChild(btn);
      });

      gridZone.appendChild(grid);
      board.appendChild(gridZone);
    } else if (currentRoute === 'mathlab') {
      img.setAttribute('data-layout-layer', 'mathlab-bg');
      img.setAttribute('data-layer-title', 'Nền Math Lab (Canva Space Artwork)');
      img.setAttribute('data-layer-type', 'background');

      const gridZone = document.createElement('div');
      gridZone.className = 'mathlab-grid-zone';
      gridZone.setAttribute('data-layout-layer', 'mathlab-grid-zone');
      gridZone.setAttribute('data-layer-title', 'Khu vực trò chơi Math Lab');
      gridZone.setAttribute('data-layer-type', 'container');

      const grid = document.createElement('div');
      grid.className = 'mathlab-games-grid';
      grid.setAttribute('role', 'list');
      grid.setAttribute('aria-label', 'Danh sách trò chơi tương tác Math Lab');

      const games = (ASSET_MANIFEST.mathLab && ASSET_MANIFEST.mathLab.games) ? ASSET_MANIFEST.mathLab.games : [
        { id: 'ml-game-shapes', gameKey: 'shapes', titleEn: '3D Shape Studio', titleVi: 'Xưởng hình khối 3D', image: '/assets/math-lab/3D-shape-game.png' },
        { id: 'ml-game-mixed', gameKey: 'mixed', titleEn: 'Mixed Number Adventure', titleVi: 'Phiêu lưu cùng hỗn số', image: '/assets/math-lab/mixed-number-game.png' },
        { id: 'ml-game-pieces', gameKey: 'mystery', titleEn: 'Mystery Pieces', titleVi: 'Mảnh ghép bí ẩn', image: '/assets/math-lab/pieces-game.png' },
        { id: 'ml-game-candy', gameKey: 'candy', titleEn: 'Candy Stacker', titleVi: 'Xếp kẹo khối lượng', image: '/assets/math-lab/candy-game.png' },
        { id: 'ml-game-dragdrop', gameKey: 'dragdrop', titleEn: 'Drag and Drop', titleVi: 'Kéo thả đúng chỗ', image: '/assets/math-lab/drag-drop-game.png' },
        { id: 'ml-game-ants', gameKey: 'ants', titleEn: 'Ants Food Quest', titleVi: 'Kiến tha mồi', image: '/assets/math-lab/ants-game.png' }
      ];

      games.forEach(g => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = g.id;
        btn.className = 'mathlab-game-card';
        btn.setAttribute('data-layout-layer', g.id);
        btn.setAttribute('data-layer-title', `${g.titleEn} (${g.titleVi})`);
        btn.setAttribute('data-layer-type', 'button');
        btn.setAttribute('aria-label', `Start ${g.titleEn} · ${g.titleVi}`);
        btn.title = `${g.titleEn} · ${g.titleVi} (Nhấn để Bắt đầu / Click to Start)`;

        const cardImg = document.createElement('img');
        cardImg.src = g.image;
        cardImg.alt = `${g.titleEn} · ${g.titleVi}`;
        cardImg.draggable = false;
        cardImg.loading = 'eager';
        btn.appendChild(cardImg);

        btn.addEventListener('click', () => {
          if (window.activeLayoutEditor && !window.activeLayoutEditor.isStudentPreview) return;
          if (g.gameKey === 'shapes') {
            navigate('game_3d_shapes');
          } else if (g.gameKey === 'mixed') {
            navigate('game_mixed_numbers');
          } else if (g.gameKey === 'ants') {
            navigate('game_ants');
          } else if (g.gameKey === 'mystery') {
            navigate('game_mystery_pieces');
          } else {
            openGame({ game: g.gameKey, title: g.titleEn, vi: g.titleVi });
          }
        });

        grid.appendChild(btn);
      });

      gridZone.appendChild(grid);
      board.appendChild(gridZone);
    } else if (currentRoute === 'buddy') {
      img.setAttribute('data-layout-layer', 'buddy-bg');
      img.setAttribute('data-layer-title', 'Nền MathBuddy AI');
      img.setAttribute('data-layer-type', 'background');

      const vocab = [
        { x: 0.245, y: 0.20, w: 0.115, h: 0.30, en: 'Geometry', vi: 'Hình học', layerId: 'bud-geo' },
        { x: 0.36, y: 0.20, w: 0.115, h: 0.30, en: 'Measurement', vi: 'Đo lường', layerId: 'bud-meas' },
        { x: 0.475, y: 0.20, w: 0.12, h: 0.30, en: 'Decimal Numbers', vi: 'Số thập phân', layerId: 'bud-dec' },
        { x: 0.245, y: 0.51, w: 0.12, h: 0.29, en: 'Mixed Numbers', vi: 'Hỗn số', layerId: 'bud-mix' },
        { x: 0.365, y: 0.51, w: 0.115, h: 0.29, en: 'Ratio', vi: 'Tỉ số', layerId: 'bud-ratio' },
        { x: 0.48, y: 0.51, w: 0.12, h: 0.29, en: 'Others', vi: 'Khác', layerId: 'bud-oth' },
      ];
      vocab.forEach(v => addHotspot(board, { ...v, title: v.en, label: `Math Vocabulary: ${v.en} / ${v.vi}`, action: 'vocab' }));
      addHotspot(board, { x: 0.64, y: 0.25, w: 0.34, h: 0.28, title: 'Practice with Model Sentences', vi: 'Luyện theo câu mẫu', action: 'sentences', label: 'Practice with Model Sentences / Luyện theo câu mẫu', layerId: 'bud-sentences' });
      addHotspot(board, { x: 0.64, y: 0.535, w: 0.34, h: 0.28, title: 'Math Dialogue', vi: 'Hội thoại Toán học', action: 'dialogue', label: 'Math Dialogue / Hội thoại Toán học', layerId: 'bud-dialogue' });
    } else if (currentRoute === 'chapter1') {
      img.setAttribute('data-layout-layer', 'chapter1-bg');
      img.setAttribute('data-layer-title', 'Nền Phân số (Chapter 1 Canva Artwork)');
      img.setAttribute('data-layer-type', 'background');

      // Back button using verified Canva asset Back-to-Button.png
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.id = 'chapter1-back-btn';
      backBtn.className = 'chapter-back-btn';
      backBtn.setAttribute('data-layout-layer', 'chapter1-back-btn');
      backBtn.setAttribute('data-layer-title', 'Nút Quay lại thư viện');
      backBtn.setAttribute('data-layer-type', 'button');
      backBtn.setAttribute('data-route', 'topics');
      backBtn.setAttribute('aria-label', 'Back to Topics Library / Quay lại thư viện chủ đề');
      backBtn.title = 'Back to Topics Library / Quay lại thư viện chủ đề';

      const backImg = document.createElement('img');
      backImg.src = (ASSET_MANIFEST.chapters && ASSET_MANIFEST.chapters.fraction && ASSET_MANIFEST.chapters.fraction.backButton)
        ? ASSET_MANIFEST.chapters.fraction.backButton
        : '/assets/topics-library/fraction/Back-to-Button.png';
      backImg.alt = 'Back to Topics Library';
      backImg.draggable = false;
      backImg.loading = 'eager';
      backBtn.appendChild(backImg);

      backBtn.addEventListener('click', () => {
        if (window.activeLayoutEditor && !window.activeLayoutEditor.isStudentPreview) return;
        navigate('topics');
      });
      board.appendChild(backBtn);

      // Lesson Units Zone with Mixed Numbers & Decimal Fractions
      const gridZone = document.createElement('div');
      gridZone.className = 'fraction-units-zone';
      gridZone.setAttribute('data-layout-layer', 'chapter1-units-zone');
      gridZone.setAttribute('data-layer-title', 'Khu vực bài học Phân số');
      gridZone.setAttribute('data-layer-type', 'container');

      const grid = document.createElement('div');
      grid.className = 'fraction-units-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Các bài học chủ đề Phân số');

      const fractionUnits = [
        {
          id: 'btn-mixed-numbers',
          unitKey: 'mixed-numbers',
          titleEn: 'Mixed Numbers',
          titleVi: 'Hỗn số',
          image: '/assets/topics-library/fraction/Mixed-number-button.png',
          alt: 'Bài học Hỗn số / Mixed Numbers'
        },
        {
          id: 'btn-decimal-fractions',
          unitKey: 'decimal-fractions',
          titleEn: 'Decimal Fractions',
          titleVi: 'Phân số thập phân',
          image: '/assets/topics-library/fraction/Decimal-fraction-button.png',
          alt: 'Bài học Phân số thập phân / Decimal Fractions'
        }
      ];

      fractionUnits.forEach(u => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = u.id;
        btn.className = 'fraction-unit-btn';
        btn.setAttribute('data-layout-layer', u.id);
        btn.setAttribute('data-layer-title', `${u.titleEn} (${u.titleVi})`);
        btn.setAttribute('data-layer-type', 'button');
        btn.setAttribute('aria-label', `${u.titleEn} · ${u.titleVi}`);
        btn.title = `${u.titleEn} · ${u.titleVi} (Nhấn để Học bài / Click to Learn)`;

        const btnImg = document.createElement('img');
        btnImg.src = u.image;
        btnImg.alt = u.alt;
        btnImg.draggable = false;
        btnImg.loading = 'eager';
        btn.appendChild(btnImg);

        btn.addEventListener('click', () => {
          if (window.activeLayoutEditor && !window.activeLayoutEditor.isStudentPreview) return;
          if (u.unitKey === 'decimal-fractions') {
            navigate('lesson_decimal_fractions');
          } else if (u.unitKey === 'mixed-numbers') {
            navigate('lesson_mixed_numbers');
          } else {
            openLesson({ en: u.titleEn, vi: u.titleVi, unitKey: u.unitKey });
          }
        });

        grid.appendChild(btn);
      });

      gridZone.appendChild(grid);
      board.appendChild(gridZone);
    } else if (currentRoute === 'chapter2') {
      img.setAttribute('data-layout-layer', 'chapter2-bg');
      img.setAttribute('data-layer-title', 'Nền Số thập phân (Chapter 2 Canva Artwork)');
      img.setAttribute('data-layer-type', 'background');

      // Back button using verified Canva asset Back-to-Button.png
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.id = 'chapter2-back-btn';
      backBtn.className = 'chapter-back-btn decimal-back-btn';
      backBtn.setAttribute('data-layout-layer', 'chapter2-back-btn');
      backBtn.setAttribute('data-layer-title', 'Nút Quay lại thư viện (Chapter 2)');
      backBtn.setAttribute('data-layer-type', 'button');
      backBtn.setAttribute('data-route', 'topics');
      backBtn.setAttribute('aria-label', 'Back to Topics Library / Quay lại thư viện chủ đề');
      backBtn.title = 'Back to Topics Library / Quay lại thư viện chủ đề';

      const backImg = document.createElement('img');
      backImg.src = (ASSET_MANIFEST.chapters && ASSET_MANIFEST.chapters.decimalNumbers && ASSET_MANIFEST.chapters.decimalNumbers.backButton)
        ? ASSET_MANIFEST.chapters.decimalNumbers.backButton
        : '/assets/topics-library/decimal-numbers/Back-to-Button.png';
      backImg.alt = 'Back to Topics Library';
      backImg.draggable = false;
      backImg.loading = 'eager';
      backBtn.appendChild(backImg);

      backBtn.addEventListener('click', () => {
        if (window.activeLayoutEditor && !window.activeLayoutEditor.isStudentPreview) return;
        navigate('topics');
      });
      board.appendChild(backBtn);

      // Lesson Units Zone with 7 verified Canva buttons
      const gridZone = document.createElement('div');
      gridZone.className = 'decimal-units-zone';
      gridZone.setAttribute('data-layout-layer', 'chapter2-units-zone');
      gridZone.setAttribute('data-layer-title', 'Khu vực bài học Số thập phân');
      gridZone.setAttribute('data-layer-type', 'container');

      const grid = document.createElement('div');
      grid.className = 'decimal-units-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Các bài học chủ đề Số thập phân / Decimal Numbers Units');

      const decimalUnits = [
        {
          id: 'btn-decimal-numbers',
          unitKey: 'decimal-number',
          titleEn: 'Decimal Numbers',
          titleVi: 'Số thập phân',
          image: '/assets/topics-library/decimal-numbers/decimal-number-button.png',
          alt: 'Bài 1: Số thập phân / Decimal Numbers'
        },
        {
          id: 'btn-comparing-decimals',
          unitKey: 'comparing-decimals',
          titleEn: 'Comparing Decimal Numbers',
          titleVi: 'So sánh các số thập phân',
          image: '/assets/topics-library/decimal-numbers/Comparing-Decimal-Numbers-button.png',
          alt: 'Bài 2: So sánh các số thập phân / Comparing Decimal Numbers'
        },
        {
          id: 'btn-writing-length',
          unitKey: 'writing-length',
          titleEn: 'Writing Length Measurements as Decimals',
          titleVi: 'Viết số đo độ dài dưới dạng số thập phân',
          image: '/assets/topics-library/decimal-numbers/writing-length-button.png',
          alt: 'Bài 3: Viết số đo độ dài dưới dạng số thập phân / Writing Length Measurements as Decimals'
        },
        {
          id: 'btn-writing-weight',
          unitKey: 'writing-weight',
          titleEn: 'Writing Mass Measurements as Decimals',
          titleVi: 'Viết số đo khối lượng dưới dạng số thập phân',
          image: '/assets/topics-library/decimal-numbers/writing-weight-button.png',
          alt: 'Bài 4: Viết số đo khối lượng dưới dạng số thập phân / Writing Mass Measurements as Decimals'
        },
        {
          id: 'btn-writing-area',
          unitKey: 'writing-area',
          titleEn: 'Writing Area Measurements as Decimals',
          titleVi: 'Viết số đo diện tích dưới dạng số thập phân',
          image: '/assets/topics-library/decimal-numbers/writing-area-button.png',
          alt: 'Bài 5: Viết số đo diện tích dưới dạng số thập phân / Writing Area Measurements as Decimals'
        },
        {
          id: 'btn-rounding-decimals',
          unitKey: 'rounding-decimals',
          titleEn: 'Rounding Decimal Numbers',
          titleVi: 'Làm tròn số thập phân',
          image: '/assets/topics-library/decimal-numbers/rounding-Decimal-Numbers-button.png',
          alt: 'Bài 6: Làm tròn số thập phân / Rounding Decimal Numbers'
        },
        {
          id: 'btn-operation-decimals',
          unitKey: 'operations-decimals',
          titleEn: 'Operations with Decimal Numbers',
          titleVi: 'Các phép tính với số thập phân',
          image: '/assets/topics-library/decimal-numbers/operation-Decimal-Numbers-button.png',
          alt: 'Bài 7: Các phép tính với số thập phân / Operations with Decimal Numbers'
        }
      ];

      decimalUnits.forEach(u => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = u.id;
        btn.className = 'decimal-unit-btn';
        btn.setAttribute('data-layout-layer', u.id);
        btn.setAttribute('data-layer-title', `${u.titleEn} (${u.titleVi})`);
        btn.setAttribute('data-layer-type', 'button');
        btn.setAttribute('aria-label', `${u.titleEn} · ${u.titleVi}`);
        btn.title = `${u.titleEn} · ${u.titleVi} (Nhấn để Học bài / Click to Learn)`;

        const btnImg = document.createElement('img');
        btnImg.className = 'lesson-button-image';
        btnImg.src = u.image;
        btnImg.alt = u.alt;
        btnImg.draggable = false;
        btnImg.loading = 'eager';
        btn.appendChild(btnImg);

        btn.addEventListener('click', () => {
          if (window.activeLayoutEditor && !window.activeLayoutEditor.isStudentPreview) return;
          if (u.unitKey === 'decimal-number') {
            navigate('lesson_decimal_number');
          } else if (u.unitKey === 'comparing-decimals' || u.unitKey === 'comparing-decimal-numbers') {
            navigate('lesson_comparing_decimals');
          } else {
            openLesson({ en: u.titleEn, vi: u.titleVi, unitKey: u.unitKey });
          }
        });

        grid.appendChild(btn);
      });

      gridZone.appendChild(grid);
      board.appendChild(gridZone);
    } else if (currentRoute === 'chapter3') {
      img.setAttribute('data-layout-layer', 'chapter3-bg');
      img.setAttribute('data-layer-title', 'Nền Tỉ số và Phần trăm (Chapter 3 Canva Artwork)');
      img.setAttribute('data-layer-type', 'background');

      // Back button using verified Canva asset Back-to-Button.png
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.id = 'chapter3-back-btn';
      backBtn.className = 'chapter-back-btn ratio-back-btn';
      backBtn.setAttribute('data-layout-layer', 'chapter3-back-btn');
      backBtn.setAttribute('data-layer-title', 'Nút Quay lại thư viện (Chapter 3)');
      backBtn.setAttribute('data-layer-type', 'button');
      backBtn.setAttribute('data-route', 'topics');
      backBtn.setAttribute('aria-label', 'Back to Topics Library / Quay lại thư viện chủ đề');
      backBtn.title = 'Back to Topics Library / Quay lại thư viện chủ đề';

      const backImg = document.createElement('img');
      backImg.src = (ASSET_MANIFEST.chapters && ASSET_MANIFEST.chapters.ratioPercentage && ASSET_MANIFEST.chapters.ratioPercentage.backButton)
        ? ASSET_MANIFEST.chapters.ratioPercentage.backButton
        : '/assets/topics-library/ratio-percentage/Back-to-Button.png';
      backImg.alt = 'Back to Topics Library';
      backImg.draggable = false;
      backImg.loading = 'eager';
      backBtn.appendChild(backImg);

      backBtn.addEventListener('click', () => {
        if (window.activeLayoutEditor && !window.activeLayoutEditor.isStudentPreview) return;
        navigate('topics');
      });
      board.appendChild(backBtn);

      // Lesson Units Zone with 5 verified Canva buttons
      const gridZone = document.createElement('div');
      gridZone.className = 'ratio-units-zone';
      gridZone.setAttribute('data-layout-layer', 'chapter3-units-zone');
      gridZone.setAttribute('data-layer-title', 'Khu vực bài học Tỉ số và Phần trăm');
      gridZone.setAttribute('data-layer-type', 'container');

      const grid = document.createElement('div');
      grid.className = 'ratio-units-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Các bài học chủ đề Tỉ số và Phần trăm / Ratio and Percentage Units');

      const ratioUnits = (ASSET_MANIFEST.chapters && ASSET_MANIFEST.chapters.ratioPercentage && ASSET_MANIFEST.chapters.ratioPercentage.units)
        ? ASSET_MANIFEST.chapters.ratioPercentage.units
        : [
          { id: 'btn-c3-ratio', unitKey: 'ratio', titleEn: 'Ratio', titleVi: 'Tỉ số', image: '/assets/topics-library/ratio-percentage/ratio-button.png', alt: 'Bài 1: Tỉ số / Ratio' },
          { id: 'btn-c3-word-ratio', unitKey: 'word-problems-ratio', titleEn: 'Word Problems about Ratio', titleVi: 'Bài toán về tỉ số', image: '/assets/topics-library/ratio-percentage/word-ratio-button.png', alt: 'Bài 2: Bài toán về tỉ số / Word Problems about Ratio' },
          { id: 'btn-c3-percentage', unitKey: 'percentage', titleEn: 'Percentage', titleVi: 'Tỉ số phần trăm', image: '/assets/topics-library/ratio-percentage/percent-button.png', alt: 'Bài 3: Tỉ số phần trăm / Percentage' },
          { id: 'btn-c3-percentage-of-number', unitKey: 'percentage-of-number', titleEn: 'Percentage of a Number', titleVi: 'Tìm giá trị phần trăm của một số', image: '/assets/topics-library/ratio-percentage/percent-number-button.png', alt: 'Bài 4: Tìm giá trị phần trăm của một số / Percentage of a Number' },
          { id: 'btn-c3-map-scale', unitKey: 'map-scale', titleEn: 'Map Scale', titleVi: 'Tỉ lệ bản đồ', image: '/assets/topics-library/ratio-percentage/map-scale-button.png', alt: 'Bài 5: Tỉ lệ bản đồ / Map Scale' }
        ];

      ratioUnits.forEach(u => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = u.id;
        btn.className = 'ratio-unit-btn';
        btn.setAttribute('data-layout-layer', u.id);
        btn.setAttribute('data-layer-title', `${u.titleEn} (${u.titleVi})`);
        btn.setAttribute('data-layer-type', 'button');
        btn.setAttribute('aria-label', `${u.titleEn} · ${u.titleVi}`);
        btn.title = `${u.titleEn} · ${u.titleVi} (Nhấn để Học bài / Click to Learn)`;

        const btnImg = document.createElement('img');
        btnImg.src = u.image;
        btnImg.alt = u.alt;
        btnImg.draggable = false;
        btnImg.loading = 'eager';
        btn.appendChild(btnImg);

        btn.addEventListener('click', () => {
          if (window.activeLayoutEditor && !window.activeLayoutEditor.isStudentPreview) return;
          openLesson({ en: u.titleEn, vi: u.titleVi, unitKey: u.unitKey });
        });

        grid.appendChild(btn);
      });

      gridZone.appendChild(grid);
      board.appendChild(gridZone);
    } else {
      // General Fallback
      img.setAttribute('data-layout-layer', `${currentRoute}-bg`);
      img.setAttribute('data-layer-title', `Nền ${PAGE_META[currentRoute]?.alt || currentRoute}`);
      img.setAttribute('data-layer-type', 'background');

      addHotspot(board, {
        x: 0.009, y: 0.112, w: 0.135, h: 0.062,
        route: 'topics',
        className: 'back-visible',
        visibleText: '<span class="back-arrow">‹</span><span>Back to<br>Topics Library</span>',
        label: 'Back to Topics Library / Quay lại thư viện chủ đề',
        layerId: `${currentRoute}-back-btn`
      });

      (lessonData[currentRoute] || []).forEach((l, idx) => {
        addHotspot(board, {
          ...l,
          label: `${l.en} / ${l.vi}`,
          action: 'lesson',
          layerId: `${currentRoute}-unit-${idx + 1}`
        });
      });
    }

    // In-situ layout editor floating trigger for Admin and Teacher
    if (currentUserProfile && (currentUserProfile.isAdmin || currentUserProfile.isTeacher) && currentRoute !== 'admin') {
      const editLayoutBar = document.createElement('div');
      editLayoutBar.className = 'vle-floating-trigger';
      editLayoutBar.innerHTML = `
        <button type="button" class="vle-tool-btn" id="btn-in-situ-layout-editor" style="background:#09255e;border:1.5px solid #00e5ff;color:#00e5ff;box-shadow:0 4px 16px rgba(0,0,0,0.5);">
          🎨 Chỉnh sửa giao diện / Edit Layout
        </button>
      `;
      editLayoutBar.querySelector('#btn-in-situ-layout-editor')?.addEventListener('click', () => {
        openVisualLayoutEditor();
      });
      scroll.appendChild(editLayoutBar);
    }

    applySavedPageLayout(currentRoute, Boolean(currentUserProfile && (currentUserProfile.isAdmin || currentUserProfile.isTeacher)));
  }

  function runHotspot(spec) {
    if (spec.route) {
      navigate(spec.route);
      return;
    }
    if (spec.game) {
      openGame(spec);
      return;
    }
    if (spec.action === 'vocab') {
      openVocabulary(spec);
      return;
    }
    if (spec.action === 'sentences') {
      openSentencePractice();
      return;
    }
    if (spec.action === 'dialogue') {
      openDialogue();
      return;
    }
    if (spec.action === 'lesson') {
      openLesson(spec);
    }
  }

  function openModal({ title, subtitle, kicker, content, actions }) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-close-modal></div>
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button type="button" class="modal-close" data-close-modal aria-label="Close">✕</button>
        <div class="modal-emblem-header">
          <img src="/assets/home/logo.png" alt="MathLingua AI" class="modal-logo-img" />
          <div style="display:flex;flex-direction:column;">
            <div class="modal-kicker">${escapeAttr(kicker || 'MathLingua AI · Grade 5')}</div>
            <h2 id="modal-title" class="modal-title">${escapeAttr(title || '')}</h2>
          </div>
        </div>
        ${subtitle ? `<div class="modal-subtitle">${escapeAttr(subtitle)}</div>` : ''}
        <div class="modal-content">${content || ''}</div>
        <div class="modal-actions">${actions || ''}</div>
      </div>
    `;
    modalRoot.hidden = false;
    modalRoot.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', () => closeModal()));
    modalRoot.querySelector('.modal-dialog')?.focus();
  }

  function closeModal(restoreFocus = true) {
    modalRoot.hidden = true;
    modalRoot.innerHTML = '';
  }

  // Real Authentication Modal (Tabs: Log In vs Student Register)
  function openLoginModal(defaultTab = 'login') {
    let currentTab = defaultTab;
    let showPassword = false;

    function buildModalHtml() {
      return `
        <div class="auth-box">
          <div class="auth-tabs">
            <button type="button" class="auth-tab-btn ${currentTab === 'login' ? 'active' : ''}" data-tab="login">
              Log in / Đăng nhập
            </button>
            <button type="button" class="auth-tab-btn ${currentTab === 'register' ? 'active' : ''}" data-tab="register">
              Student Register / Đăng ký học sinh
            </button>
          </div>

          <div id="auth-form-wrap">
            ${currentTab === 'login' ? getLoginFormHtml() : getRegisterFormHtml()}
          </div>
          <div id="auth-feedback" class="auth-msg" style="display:none;" aria-live="polite"></div>
        </div>
      `;
    }

    function getLoginFormHtml() {
      return `
        <form id="login-form" class="auth-form">
          <div class="form-field">
            <label class="form-label" for="login-username">
              <span class="en-line">Username</span>
              <span class="vi-line">Tên đăng nhập (Học sinh hoặc Quản trị viên)</span>
            </label>
            <input type="text" class="auth-input" id="login-username" placeholder="Ví dụ: student1 hoặc admin" autocomplete="username" required />
          </div>

          <div class="form-field">
            <label class="form-label" for="login-password">
              <span class="en-line">Password</span>
              <span class="vi-line">Mật khẩu</span>
            </label>
            <div class="input-with-action">
              <input type="${showPassword ? 'text' : 'password'}" class="auth-input" id="login-password" placeholder="Nhập mật khẩu..." autocomplete="current-password" required />
              <button type="button" class="pwd-toggle-btn" id="btn-toggle-pwd" aria-label="Hiện hoặc ẩn mật khẩu">${showPassword ? 'Hide / Ẩn' : 'Show / Hiện'}</button>
            </div>
          </div>

          <button type="submit" class="auth-submit-btn" id="btn-login-submit">
            <span style="display:block;font-size:14px;font-weight:900;letter-spacing:0.04em;">LOG IN</span>
            <span style="display:block;font-size:12px;font-weight:700;opacity:0.9;">Đăng nhập</span>
          </button>

          <p class="auth-help-note">
            💡 Học sinh đăng nhập bằng tài khoản trường cấp hoặc tự tạo ở tab Đăng ký. Quản trị viên đăng nhập bằng tài khoản admin bảo mật.
          </p>
        </form>
      `;
    }

    function getRegisterFormHtml() {
      return `
        <form id="register-form" class="auth-form">
          <div class="form-field">
            <label class="form-label" for="reg-username">
              <span class="en-line">New Username</span>
              <span class="vi-line">Tên đăng nhập mới (chữ cái, số hoặc gạch dưới, 3-30 ký tự)</span>
            </label>
            <input type="text" class="auth-input" id="reg-username" placeholder="Ví dụ: an_lop5" pattern="^[a-zA-Z0-9_]{3,30}$" required />
          </div>

          <div class="form-field">
            <label class="form-label" for="reg-name">
              <span class="en-line">Student Full Name</span>
              <span class="vi-line">Họ và tên học sinh</span>
            </label>
            <input type="text" class="auth-input" id="reg-name" placeholder="Ví dụ: Nguyễn Văn An" required />
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="form-field">
              <label class="form-label" for="reg-class">
                <span class="en-line">Class</span>
                <span class="vi-line">Lớp học</span>
              </label>
              <input type="text" class="auth-input" id="reg-class" placeholder="Ví dụ: 5A1" required />
            </div>
            <div class="form-field">
              <label class="form-label" for="reg-grade">
                <span class="en-line">Grade</span>
                <span class="vi-line">Khối lớp</span>
              </label>
              <input type="text" class="auth-input" id="reg-grade" value="Grade 5" readonly />
            </div>
          </div>

          <div class="form-field">
            <label class="form-label">
              <span class="en-line">Choose Avatar</span>
              <span class="vi-line">Chọn hình đại diện phi hành gia</span>
            </label>
            <div style="display:flex;gap:12px;margin-top:4px;">
              <label style="cursor:pointer;display:flex;align-items:center;gap:6px;">
                <input type="radio" name="reg-avatar" value="astronaut-1" checked />
                <span class="nav-user-avatar" style="width:36px;height:36px;">${renderAvatarSvg('astronaut-1')}</span>
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:6px;">
                <input type="radio" name="reg-avatar" value="astronaut-2" />
                <span class="nav-user-avatar" style="width:36px;height:36px;">${renderAvatarSvg('astronaut-2')}</span>
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:6px;">
                <input type="radio" name="reg-avatar" value="astronaut-3" />
                <span class="nav-user-avatar" style="width:36px;height:36px;">${renderAvatarSvg('astronaut-3')}</span>
              </label>
            </div>
          </div>

          <div class="form-field">
            <label class="form-label" for="reg-password">
              <span class="en-line">Password</span>
              <span class="vi-line">Mật khẩu (Tối thiểu 6 ký tự)</span>
            </label>
            <div class="input-with-action">
              <input type="${showPassword ? 'text' : 'password'}" class="auth-input" id="reg-password" placeholder="Nhập mật khẩu mới..." required />
              <button type="button" class="pwd-toggle-btn" id="btn-toggle-pwd-reg" aria-label="Hiện hoặc ẩn mật khẩu">${showPassword ? 'Hide / Ẩn' : 'Show / Hiện'}</button>
            </div>
          </div>

          <button type="submit" class="auth-submit-btn" id="btn-reg-submit">
            <span style="display:block;font-size:14px;font-weight:900;letter-spacing:0.04em;">CREATE STUDENT ACCOUNT</span>
            <span style="display:block;font-size:12px;font-weight:700;opacity:0.9;">Tạo tài khoản học sinh</span>
          </button>
        </form>
      `;
    }

    openModal({
      title: 'Log In / Đăng nhập',
      subtitle: 'Chào mừng bạn đến với hệ thống MathLingua AI Grade 5',
      kicker: 'Hệ thống tài khoản & Lưu tiến độ',
      content: buildModalHtml(),
      actions: '<button type="button" class="action-btn" data-close-modal>Đóng / Close</button>'
    });

    function bindAuthEvents() {
      modalRoot.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentTab = btn.dataset.tab;
          const wrap = modalRoot.querySelector('#auth-form-wrap');
          if (wrap) wrap.innerHTML = currentTab === 'login' ? getLoginFormHtml() : getRegisterFormHtml();
          modalRoot.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === currentTab));
          bindFormHandlers();
        });
      });
      bindFormHandlers();
    }

    function bindFormHandlers() {
      const fb = modalRoot.querySelector('#auth-feedback');

      // Toggle show/hide password
      modalRoot.querySelector('#btn-toggle-pwd')?.addEventListener('click', () => {
        showPassword = !showPassword;
        const input = modalRoot.querySelector('#login-password');
        const btn = modalRoot.querySelector('#btn-toggle-pwd');
        if (input) input.type = showPassword ? 'text' : 'password';
        if (btn) btn.textContent = showPassword ? 'Ẩn' : 'Hiện';
      });

      modalRoot.querySelector('#btn-toggle-pwd-reg')?.addEventListener('click', () => {
        showPassword = !showPassword;
        const input = modalRoot.querySelector('#reg-password');
        const btn = modalRoot.querySelector('#btn-toggle-pwd-reg');
        if (input) input.type = showPassword ? 'text' : 'password';
        if (btn) btn.textContent = showPassword ? 'Ẩn' : 'Hiện';
      });

      // Login handler
      const loginForm = modalRoot.querySelector('#login-form');
      loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = modalRoot.querySelector('#btn-login-submit');
        if (submitBtn) submitBtn.disabled = true;

        if (fb) {
          fb.style.display = 'block';
          fb.className = 'auth-msg';
          fb.textContent = 'Đang xác thực thông tin...';
        }

        const username = modalRoot.querySelector('#login-username').value.trim();
        const password = modalRoot.querySelector('#login-password').value;

        try {
          const { user, profile } = await loginUser(username, password);
          currentUser = user;
          currentUserProfile = profile;
          if (fb) {
            fb.className = 'auth-msg success';
            fb.textContent = `✅ Đăng nhập thành công! Chào mừng ${profile.displayName}.`;
          }
          setTimeout(() => {
            closeModal();
            renderNav();
            if (profile.isAdmin) {
              navigate('admin');
            } else if (currentRoute === 'progress' || currentRoute === 'admin') {
              renderPage();
            }
          }, 600);
        } catch (err) {
          if (fb) {
            fb.className = 'auth-msg error';
            fb.textContent = '❌ ' + (err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tên đăng nhập hoặc mật khẩu.');
          }
          if (submitBtn) submitBtn.disabled = false;
        }
      });

      // Register handler
      const regForm = modalRoot.querySelector('#register-form');
      regForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = modalRoot.querySelector('#btn-reg-submit');
        if (submitBtn) submitBtn.disabled = true;

        if (fb) {
          fb.style.display = 'block';
          fb.className = 'auth-msg';
          fb.textContent = 'Đang khởi tạo tài khoản học sinh trên hệ thống...';
        }

        const username = modalRoot.querySelector('#reg-username').value.trim();
        const displayName = modalRoot.querySelector('#reg-name').value.trim();
        const classId = modalRoot.querySelector('#reg-class').value.trim();
        const grade = modalRoot.querySelector('#reg-grade').value.trim();
        const password = modalRoot.querySelector('#reg-password').value;
        const avatarRadio = modalRoot.querySelector('input[name="reg-avatar"]:checked');
        const avatarUrl = avatarRadio ? avatarRadio.value : 'astronaut-1';

        try {
          const { user, profile } = await registerStudentAccount({
            username,
            password,
            displayName,
            classId,
            grade,
            avatarUrl
          });
          currentUser = user;
          currentUserProfile = profile;
          if (fb) {
            fb.className = 'auth-msg success';
            fb.textContent = `🎉 Chúc mừng ${profile.displayName}! Tài khoản đã được tạo thành công.`;
          }
          setTimeout(() => {
            closeModal();
            renderNav();
            if (currentRoute === 'progress') {
              renderPage();
            }
          }, 700);
        } catch (err) {
          if (fb) {
            fb.className = 'auth-msg error';
            fb.textContent = '❌ ' + (err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.');
          }
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }

    bindAuthEvents();
  }
  window.openLoginModal = openLoginModal;

  function openProfileModal() {
    if (!currentUserProfile) return;

    openModal({
      title: currentUserProfile.displayName || currentUserProfile.username,
      subtitle: `Tài khoản: ${currentUserProfile.username} · ${currentUserProfile.role.toUpperCase()}`,
      kicker: 'My Profile · Hồ sơ cá nhân',
      content: `
        <div style="display:flex;align-items:center;gap:18px;margin-bottom:18px;">
          <div class="nav-user-avatar" style="width:60px;height:60px;border-width:3px;">
            ${renderAvatarSvg(currentUserProfile.avatarUrl, currentUserProfile.role)}
          </div>
          <div>
            <div style="font-size:18px;font-weight:900;color:#ffffff;">
              ${escapeAttr(currentUserProfile.displayName)}
            </div>
            <div style="font-size:13px;color:#9ec2f5;">
              Lớp: ${escapeAttr(currentUserProfile.classId || '5A1')} · ${escapeAttr(currentUserProfile.grade || 'Grade 5')}
            </div>
            <span class="status-badge ${currentUserProfile.isAdmin ? 'completed' : 'in_progress'}" style="margin-top:4px;display:inline-block;">
              ${currentUserProfile.isAdmin ? 'Quản trị viên' : (currentUserProfile.isTeacher ? 'Giáo viên' : 'Học sinh')}
            </span>
          </div>
        </div>

        <div class="modal-note">
          <strong>Thông tin hệ thống:</strong><br>
          UID: <code>${currentUser.uid.slice(0, 14)}...</code><br>
          Cơ sở dữ liệu: Cloud Firestore (wise-howl-jsmzh)<br>
          Trạng thái xác thực: Đã đồng bộ an toàn
        </div>
      `,
      actions: `
        <button type="button" class="action-btn" data-btn-change-pwd>Đổi mật khẩu / Password</button>
        <button type="button" class="action-btn primary" data-close-modal>Đóng / Close</button>
      `
    });

    modalRoot.querySelector('[data-btn-change-pwd]')?.addEventListener('click', () => {
      openChangePasswordModal();
    });
  }

  function openChangePasswordModal() {
    openModal({
      title: 'Đổi mật khẩu · Change Password',
      subtitle: 'Cập nhật mật khẩu mới an toàn trên Firebase Auth',
      kicker: 'Security · Bảo mật',
      content: `
        <form id="change-pwd-modal-form" class="auth-form">
          <div class="form-field">
            <label class="form-label">Mật khẩu mới (New Password)
              <span class="sub">Tối thiểu 6 ký tự</span>
            </label>
            <input type="password" class="auth-input" id="new-user-pwd" placeholder="Nhập mật khẩu mới..." required />
          </div>
          <button type="submit" class="auth-submit-btn">Xác nhận đổi mật khẩu / Update</button>
          <div id="modal-pwd-fb" class="auth-msg" style="display:none;margin-top:8px;"></div>
        </form>
      `,
      actions: '<button type="button" class="action-btn" data-close-modal>Hủy / Cancel</button>'
    });

    const form = modalRoot.querySelector('#change-pwd-modal-form');
    const fb = modalRoot.querySelector('#modal-pwd-fb');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const val = form.querySelector('#new-user-pwd').value;
        await changeUserPassword(val);
        if (fb) {
          fb.style.display = 'block';
          fb.className = 'auth-msg success';
          fb.textContent = '✅ Đổi mật khẩu thành công!';
        }
        setTimeout(() => closeModal(), 1000);
      } catch (err) {
        if (fb) {
          fb.style.display = 'block';
          fb.className = 'auth-msg error';
          fb.textContent = '❌ ' + (err.message || 'Không thể đổi mật khẩu.');
        }
      }
    });
  }

  function openVocabulary(spec) {
    const wordMap = {
      Geometry: ['cube', 'Hình lập phương', 'A cube has 6 faces.', 'Hình lập phương có 6 mặt.'],
      Measurement: ['length', 'Độ dài', 'Measure the length in centimetres.', 'Đo độ dài bằng xăng-ti-mét.'],
      'Decimal Numbers': ['decimal', 'Số thập phân', '3.5 is greater than 3.2.', '3,5 lớn hơn 3,2.'],
      'Mixed Numbers': ['mixed number', 'Hỗn số', 'One and three quarters.', 'Một và ba phần tư.'],
      Ratio: ['ratio', 'Tỉ số', 'The ratio is three to five.', 'Tỉ số là ba trên năm.'],
      Others: ['vertex', 'Đỉnh', 'A vertex is a corner of a shape.', 'Đỉnh là một góc của hình.'],
    };
    const w = wordMap[spec.en] || wordMap.Geometry;
    openModal({
      title: spec.en,
      subtitle: spec.vi,
      kicker: 'Math Vocabulary · Từ vựng Toán học',
      content: `
        <div class="modal-note">
          <strong>${w[0]}</strong> — ${w[1]}<br><br>
          <strong>${w[2]}</strong><br>${w[3]}
        </div>
        <p>Thẻ từ vựng song ngữ Anh - Việt giúp học sinh lớp 5 tiếp cận thuật ngữ Toán học tự nhiên và chính xác.</p>`,
      actions: `
        <button type="button" class="action-btn" data-speak="${w[0]}. ${w[2]}">🔊 Listen · Nghe từ & câu</button>
        <button type="button" class="action-btn primary" data-close-modal>Đã hiểu / Got it</button>`
    });
    const speak = modalRoot.querySelector('[data-speak]');
    if (speak) speak.addEventListener('click', () => speakText(speak.dataset.speak));
  }

  function openSentencePractice() {
    openModal({
      title: 'Practice with Model Sentences',
      subtitle: 'Luyện theo câu mẫu',
      kicker: 'Speak & Pronounce · Luyện phát âm',
      content: `
        <div class="modal-note">
          <strong>Model sentence · Câu mẫu</strong><br>
          <span style="font-size:22px;font-weight:900">This is a cube.</span><br>
          Đây là hình lập phương.
        </div>
        <p>1. Listen · Nghe câu mẫu<br>2. Repeat · Nhắc lại câu<br>3. Practice · Luyện tập theo ngữ cảnh toán học</p>`,
      actions: `
        <button type="button" class="action-btn" data-speak="This is a cube.">🔊 Listen · Nghe mẫu</button>
        <button type="button" class="action-btn primary" data-close-modal>Start · Bắt đầu</button>`
    });
    const speak = modalRoot.querySelector('[data-speak]');
    if (speak) speak.addEventListener('click', () => speakText(speak.dataset.speak));
  }

  function openDialogue() {
    openModal({
      title: 'Math Dialogue',
      subtitle: 'Hội thoại Toán học',
      kicker: 'English Practice · Luyện tiếng Anh',
      content: `
        <div class="modal-note">
          <strong>MathBuddy:</strong> What shape is this?<br>
          <span>Đây là hình gì?</span><br><br>
          <strong>You:</strong> It’s a pyramid.<br>
          <span>Đây là hình chóp.</span>
        </div>
        <p>Học sinh nghe câu hỏi, chọn hoặc nói câu trả lời rồi nhận gợi ý về từ vựng và mẫu câu.</p>`,
      actions: `
        <button type="button" class="action-btn" data-speak="What shape is this? It is a pyramid.">🔊 Listen · Nghe câu hỏi</button>
        <button type="button" class="action-btn primary" data-close-modal>Start · Bắt đầu</button>`
    });
    const speak = modalRoot.querySelector('[data-speak]');
    if (speak) speak.addEventListener('click', () => speakText(speak.dataset.speak));
  }

  function openGame(spec) {
    if (spec.game === 'shapes') {
      navigate('game_3d_shapes');
      return;
    }
    if (spec.game === 'mixed') {
      navigate('game_mixed_numbers');
      return;
    }
    if (spec.game === 'mystery') {
      navigate('game_mystery_pieces');
      return;
    }
    if (spec.game === 'dragdrop') {
      openQuiz({
        topicId: 'mathlab',
        unitId: 'drag-and-drop',
        title: spec.title || 'Drag and Drop',
        subtitle: spec.vi || 'Kéo thả đúng chỗ',
        kicker: 'Math Lab · Shape & Vocabulary Match',
        question: 'Match the geometric term: Which 3D shape has 6 identical square faces? / Hình khối 3D nào có 6 mặt hình vuông bằng nhau?',
        choices: ['Cube (Hình lập phương)', 'Cylinder (Hình trụ)', 'Cone (Hình nón)', 'Sphere (Hình cầu)'],
        correct: 0,
        explanation: 'A cube has 6 identical square faces, 12 equal edges, and 8 vertices. / Hình lập phương có đúng 6 mặt hình vuông bằng nhau, 12 cạnh và 8 đỉnh.'
      });
      return;
    }
    if (spec.game === 'challenge' || spec.game === 'ants') {
      navigate('game_ants');
      return;
    }
    if (spec.game === 'candy') {
      openQuiz({
        topicId: 'mathlab',
        unitId: 'candy-stacker',
        title: spec.title || 'Candy Stacker',
        subtitle: spec.vi || 'Xếp kẹo khối lượng',
        kicker: 'Math Lab · Decimal & Mass Challenge',
        question: 'Which candy jar is heavier? / Hũ kẹo nào nặng hơn?',
        choices: ['Jar A: 0.8 kg (800g)', 'Jar B: 0.75 kg (750g)', 'Both are equal / Bằng nhau', 'Cannot compare / Chưa đủ thông tin'],
        correct: 0,
        explanation: '0.8 kg = 0.80 kg = 800g, which is greater than 0.75 kg (750g). / 0,8 kg = 800g lớn hơn 0,75 kg = 750g.'
      });
      return;
    }
    openQuiz({
      topicId: 'mathlab',
      unitId: 'general',
      title: spec.title,
      subtitle: spec.vi,
      kicker: 'Math Lab · Trò chơi mẫu',
      question: 'A cube has how many faces? / Hình lập phương có bao nhiêu mặt?',
      choices: ['4', '6', '8', '12'],
      correct: 1,
      explanation: 'A cube has 6 faces, 12 edges and 8 vertices. / Hình lập phương có 6 mặt, 12 cạnh và 8 đỉnh.'
    });
  }

  function openLesson(spec) {
    let quiz;
    const str = (spec.en + ' ' + spec.vi).toLowerCase();
    const key = spec.unitKey || '';
    if (key === 'decimal-fractions' || str.includes('decimal fraction') || str.includes('phân số thập phân')) {
      navigate('lesson_decimal_fractions');
      return;
    } else if (key === 'mixed-numbers' || str.includes('mixed') || str.includes('hỗn số')) {
      navigate('lesson_mixed_numbers');
      return;
    } else if (key === 'comparing-decimals' || key === 'comparing-decimal-numbers' || str.includes('comparing') || str.includes('so sánh')) {
      navigate('lesson_comparing_decimals');
      return;
    } else if (key === 'decimal-number' || str.includes('decimal numbers') || str.includes('số thập phân')) {
      quiz = {
        title: spec.en || 'Decimal Numbers',
        subtitle: spec.vi || 'Số thập phân',
        kicker: 'Chapter 2: Decimal Numbers · Số thập phân',
        question: 'In the decimal 35.84, which digit is in the tenths place? / Trong số thập phân 35,84, chữ số nào ở hàng phần mười?',
        choices: [
          '8 (Chữ số 8 - hàng phần mười)',
          '4 (Chữ số 4 - hàng phần trăm)',
          '5 (Chữ số 5 - hàng đơn vị)',
          '3 (Chữ số 3 - hàng chục)'
        ],
        correct: 0,
        explanation: 'In 35.84, the whole part is 35 and the fractional part is .84. The tenths digit is 8 (8/10 = 0.8). / Trong số 35,84, phần nguyên là 35 và phần thập phân gồm 8 phần mười, 4 phần trăm. Chữ số hàng phần mười là 8.'
      };
    } else if (key === 'comparing-decimals' || str.includes('comparing decimal') || str.includes('so sánh các số thập phân')) {
      quiz = {
        title: spec.en || 'Comparing Decimal Numbers',
        subtitle: spec.vi || 'So sánh các số thập phân',
        kicker: 'Chapter 2: Decimal Numbers · Số thập phân',
        question: 'Which comparison between decimals is correct? / Phép so sánh nào dưới đây là đúng?',
        choices: [
          '7.65 > 7.59 (Vì 6 phần mười > 5 phần mười)',
          '7.65 < 7.59 (Bé hơn)',
          '3.8 = 3.08 (Bằng nhau)',
          '0.4 < 0.04 (Bé hơn)'
        ],
        correct: 0,
        explanation: 'Both whole parts equal 7; compare tenths place: 6 tenths > 5 tenths, so 7.65 > 7.59. / Phần nguyên bằng 7; so sánh chữ số ở hàng phần mười: 6 > 5 nên 7,65 > 7,59.'
      };
    } else if (key === 'writing-length' || str.includes('length') || str.includes('độ dài')) {
      quiz = {
        title: spec.en || 'Writing Length Measurements as Decimals',
        subtitle: spec.vi || 'Viết số đo độ dài dưới dạng số thập phân',
        kicker: 'Chapter 2: Decimal Numbers · Số thập phân',
        question: 'Write 4 m 25 cm as a decimal in metres: / Viết số đo 4 m 25 cm dưới dạng số thập phân có đơn vị mét:',
        choices: [
          '4.25 m (Bốn phẩy hai mươi lăm mét)',
          '42.5 m (Bốn mươi hai phẩy năm mét)',
          '4.025 m (Bốn phẩy không hai lăm mét)',
          '425 m (Bốn trăm hai mươi lăm mét)'
        ],
        correct: 0,
        explanation: '1 m = 100 cm -> 25 cm = 25/100 m = 0.25 m. Therefore 4 m 25 cm = 4.25 m. / 1 m = 100 cm nên 25 cm = 25/100 m = 0,25 m. Vậy 4 m 25 cm = 4,25 m.'
      };
    } else if (key === 'writing-weight' || key === 'writing-mass' || str.includes('mass') || str.includes('weight') || str.includes('khối lượng')) {
      quiz = {
        title: spec.en || 'Writing Mass Measurements as Decimals',
        subtitle: spec.vi || 'Viết số đo khối lượng dưới dạng số thập phân',
        kicker: 'Chapter 2: Decimal Numbers · Số thập phân',
        question: 'Write 3 kg 75 g as a decimal in kilograms: / Viết số đo 3 kg 75 g dưới dạng số thập phân có đơn vị ki-lô-gam:',
        choices: [
          '3.075 kg (Ba phẩy không bảy mươi lăm kg)',
          '3.75 kg (Ba phẩy bảy mươi lăm kg)',
          '37.5 kg (Ba mươi bảy phẩy năm kg)',
          '0.375 kg (Không phẩy ba trăm bảy lăm kg)'
        ],
        correct: 0,
        explanation: '1 kg = 1,000 g -> 75 g = 75/1,000 kg = 0.075 kg. Therefore 3 kg 75 g = 3.075 kg. / 1 kg = 1 000 g nên 75 g = 75/1 000 kg = 0,075 kg. Vậy 3 kg 75 g = 3,075 kg.'
      };
    } else if (key === 'writing-area' || str.includes('area') || str.includes('diện tích')) {
      quiz = {
        title: spec.en || 'Writing Area Measurements as Decimals',
        subtitle: spec.vi || 'Viết số đo diện tích dưới dạng số thập phân',
        kicker: 'Chapter 2: Decimal Numbers · Số thập phân',
        question: 'Write 6 m² 8 dm² as a decimal in square metres: / Viết 6 m² 8 dm² dưới dạng số thập phân có đơn vị mét vuông:',
        choices: [
          '6.08 m² (Sáu phẩy không tám mét vuông)',
          '6.8 m² (Sáu phẩy tám mét vuông)',
          '68 m² (Sáu mươi tám mét vuông)',
          '0.68 m² (Không phẩy sáu mươi tám mét vuông)'
        ],
        correct: 0,
        explanation: '1 m² = 100 dm² -> 8 dm² = 8/100 m² = 0.08 m². Therefore 6 m² 8 dm² = 6.08 m². / 1 m² = 100 dm² nên 8 dm² = 8/100 m² = 0,08 m². Vậy 6 m² 8 dm² = 6,08 m².'
      };
    } else if (key === 'rounding-decimals' || str.includes('rounding') || str.includes('làm tròn')) {
      quiz = {
        title: spec.en || 'Rounding Decimal Numbers',
        subtitle: spec.vi || 'Làm tròn số thập phân',
        kicker: 'Chapter 2: Decimal Numbers · Số thập phân',
        question: 'Round 18.36 to the nearest tenth: / Làm tròn số 18,36 đến hàng phần mười (chữ số thập phân thứ nhất):',
        choices: [
          '18.4 (Làm tròn lên vì hàng phần trăm là 6 ≥ 5)',
          '18.3 (Giữ nguyên hàng phần mười)',
          '18.0 (Làm tròn đến hàng đơn vị)',
          '19.0 (Làm tròn lên số nguyên)'
        ],
        correct: 0,
        explanation: 'The hundredths digit is 6 (6 >= 5), so increase tenths digit 3 by 1: 18.36 rounds to 18.4. / Chữ số sau hàng phần mười là chữ số 6 (6 ≥ 5) nên ta cộng thêm 1 vào chữ số 3: 18,36 làm tròn thành 18,4.'
      };
    } else if (key === 'operations-decimals' || str.includes('operation') || str.includes('phép tính')) {
      quiz = {
        title: spec.en || 'Operations with Decimal Numbers',
        subtitle: spec.vi || 'Các phép tính với số thập phân',
        kicker: 'Chapter 2: Decimal Numbers · Số thập phân',
        question: 'Calculate: 15.6 + 4.28 = ? / Tính: 15,6 + 4,28 = ?',
        choices: [
          '19.88 (Mười chín phẩy tám mươi tám)',
          '19.68 (Mười chín phẩy sáu mươi tám)',
          '19.84 (Mười chín phẩy tám mươi tư)',
          '20.88 (Hai mươi phẩy tám mươi tám)'
        ],
        correct: 0,
        explanation: 'Align decimal points: 15.60 + 4.28 = 19.88. / Đặt tính thẳng cột dấu phẩy: 15,60 + 4,28 = 19,88.'
      };
    } else if (str.includes('fraction') || str.includes('phân số')) {
      quiz = {
        title: spec.en,
        subtitle: spec.vi,
        kicker: 'Lesson Preview · Xem trước bài học',
        question: 'Which mixed number is equal to 7/4? / Hỗn số nào bằng 7/4?',
        choices: ['1 1/4', '1 3/4', '2 1/4', '3/4'],
        correct: 1,
        explanation: '7/4 = 4/4 + 3/4 = 1 3/4. / Bảy phần tư bằng một và ba phần tư.'
      };
    } else if (str.includes('decimal') || str.includes('thập phân')) {
      quiz = {
        title: spec.en,
        subtitle: spec.vi,
        kicker: 'Lesson Preview · Xem trước bài học',
        question: 'Which number is greater? 4.35 or 4.28? / Số nào lớn hơn?',
        choices: ['4.35', '4.28', 'They are equal / Bằng nhau', 'Cannot compare / Không thể so sánh'],
        correct: 0,
        explanation: 'Both whole parts are 4; in the tenths place, 3 > 2. / Hai phần nguyên bằng 4; chữ số hàng phần mười có 3 > 2.'
      };
    } else if (key === 'ratio' || (str.includes('ratio') && !str.includes('word') && !str.includes('bài toán') && !str.includes('percent'))) {
      quiz = {
        title: spec.en || 'Ratio',
        subtitle: spec.vi || 'Tỉ số',
        kicker: 'Chapter 3: Ratio and Percentage · Tỉ số và tỉ số phần trăm',
        question: 'In a class, there are 15 boys and 20 girls. What is the simplified ratio of boys to girls? / Trong một lớp học có 15 bạn nam và 20 bạn nữ. Tỉ số rút gọn giữa số bạn nam và số bạn nữ là:',
        choices: [
          '3 : 4 (3 phần 4)',
          '4 : 3 (4 phần 3)',
          '3 : 7 (3 phần 7)',
          '15 : 35 (15 phần 35)'
        ],
        correct: 0,
        explanation: 'The ratio of boys to girls is 15 : 20 = 15/20 = 3/4. Therefore the ratio is 3 : 4. / Tỉ số giữa số bạn nam và số bạn nữ là 15 : 20 = 3/4 (rút gọn bằng cách chia cả tử và mẫu cho 5).'
      };
    } else if (key === 'word-problems-ratio' || str.includes('word') || str.includes('bài toán')) {
      quiz = {
        title: spec.en || 'Word Problems about Ratio',
        subtitle: spec.vi || 'Bài toán về tỉ số',
        kicker: 'Chapter 3: Ratio and Percentage · Tỉ số và tỉ số phần trăm',
        question: 'The sum of two numbers is 45. Their ratio is 2 : 3. What is the smaller number? / Tổng của hai số là 45. Tỉ số của hai số là 2 : 3. Số bé là:',
        choices: [
          '18 (Số bé là 18)',
          '27 (Số lớn là 27)',
          '15 (Mười lăm)',
          '20 (Hai mươi)'
        ],
        correct: 0,
        explanation: 'Total parts: 2 + 3 = 5 parts. Value of 1 part: 45 ÷ 5 = 9. Smaller number: 9 × 2 = 18. / Tổng số phần bằng nhau: 2 + 3 = 5 (phần). Giá trị 1 phần: 45 : 5 = 9. Số bé là: 9 × 2 = 18.'
      };
    } else if (key === 'percentage' || (str.includes('percentage') && !str.includes('number') && !str.includes('giá trị')) || str === 'percent') {
      quiz = {
        title: spec.en || 'Percentage',
        subtitle: spec.vi || 'Tỉ số phần trăm',
        kicker: 'Chapter 3: Ratio and Percentage · Tỉ số và tỉ số phần trăm',
        question: 'Convert the fraction 3/4 into a percentage: / Viết phân số 3/4 dưới dạng tỉ số phần trăm:',
        choices: [
          '75% (Bảy mươi lăm phần trăm)',
          '7.5% (Bảy phẩy năm phần trăm)',
          '34% (Ba mươi tư phần trăm)',
          '80% (Tám mươi phần trăm)'
        ],
        correct: 0,
        explanation: '3/4 = (3 × 25) / (4 × 25) = 75/100 = 75% (or 3 ÷ 4 = 0.75 = 75%). / 3/4 = 75/100 = 75% (hoặc 3 : 4 = 0,75 = 75%).'
      };
    } else if (key === 'percentage-of-number' || str.includes('percentage of a number') || str.includes('giá trị phần trăm') || str.includes('phần trăm của')) {
      quiz = {
        title: spec.en || 'Percentage of a Number',
        subtitle: spec.vi || 'Tìm giá trị phần trăm của một số',
        kicker: 'Chapter 3: Ratio and Percentage · Tỉ số và tỉ số phần trăm',
        question: 'Find 25% of 160: / Tìm 25% của 160:',
        choices: [
          '40 (Bốn mươi)',
          '35 (Ba mươi lăm)',
          '45 (Bốn mươi lăm)',
          '32 (Ba mươi hai)'
        ],
        correct: 0,
        explanation: '25% of 160 = 160 × 25 ÷ 100 = 40 (or 160 ÷ 4 = 40). / 25% của 160 là: 160 × 25 : 100 = 40 (hoặc 160 : 4 = 40).'
      };
    } else if (key === 'map-scale' || str.includes('map scale') || str.includes('tỉ lệ bản đồ')) {
      quiz = {
        title: spec.en || 'Map Scale',
        subtitle: spec.vi || 'Tỉ lệ bản đồ',
        kicker: 'Chapter 3: Ratio and Percentage · Tỉ số và tỉ số phần trăm',
        question: 'On a map with a scale of 1 : 100,000, the distance between two towns is 3 cm. What is the actual distance in kilometres? / Trên bản đồ tỉ lệ 1 : 100 000, khoảng cách giữa hai thị trấn là 3 cm. Khoảng cách thực tế là bao nhiêu ki-lô-mét?',
        choices: [
          '3 km (Ba ki-lô-mét)',
          '30 km (Ba mươi km)',
          '0.3 km (Không phẩy ba km)',
          '300 km (Ba trăm km)'
        ],
        correct: 0,
        explanation: 'Actual distance = 3 cm × 100,000 = 300,000 cm = 3,000 m = 3 km. / Khoảng cách thực tế là: 3 × 100 000 = 300 000 cm = 3 000 m = 3 km.'
      };
    } else {
      quiz = {
        title: spec.en,
        subtitle: spec.vi,
        kicker: 'Lesson Preview · Xem trước bài học',
        question: 'A cube has how many faces? / Hình lập phương có bao nhiêu mặt?',
        choices: ['4', '6', '8', '12'],
        correct: 1,
        explanation: 'A cube has 6 faces. / Hình lập phương có 6 mặt.'
      };
    }
    openQuiz({
      ...quiz,
      topicId: currentRoute,
      unitId: spec.en.toLowerCase().replace(/[^a-z0-9]/g, '-')
    });
  }

  function openQuiz(q) {
    openModal({
      title: q.title,
      subtitle: q.subtitle,
      kicker: q.kicker,
      content: `
        <div class="modal-note"><strong>${q.question}</strong></div>
        <div class="choice-grid">
          ${q.choices.map((c, i) => `<button type="button" class="choice-btn" data-choice="${i}">${c}</button>`).join('')}
        </div>
        <div id="quiz-feedback" class="answer-feedback" aria-live="polite"></div>`,
      actions: q.actions || (q.topicId === 'mathlab'
        ? '<button type="button" class="action-btn primary" data-close-modal>🔙 Quay lại Math Lab / Back to Math Lab</button>'
        : (q.topicId === 'chapter1'
          ? '<button type="button" class="action-btn primary" data-close-modal>🔙 Quay lại Phân số / Back to Fraction</button>'
          : (q.topicId === 'chapter2'
            ? '<button type="button" class="action-btn primary" data-close-modal>🔙 Quay lại Số thập phân / Back to Decimal Numbers</button>'
            : (q.topicId === 'chapter3'
              ? '<button type="button" class="action-btn primary" data-close-modal>🔙 Quay lại Tỉ số & Phần trăm / Back to Ratio & Percentage</button>'
              : '<button type="button" class="action-btn" data-close-modal>Close · Đóng</button>'))))
    });

    modalRoot.querySelectorAll('[data-choice]').forEach(btn => btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.choice);
      const isCorrect = idx === q.correct;

      modalRoot.querySelectorAll('[data-choice]').forEach(b => {
        b.disabled = true;
        b.classList.remove('correct', 'incorrect');
      });
      btn.classList.add(isCorrect ? 'correct' : 'incorrect');
      const correctBtn = modalRoot.querySelector(`[data-choice="${q.correct}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
      const feedback = modalRoot.querySelector('#quiz-feedback');
      if (feedback) {
        feedback.innerHTML = `${isCorrect ? '✅ Correct! · Chính xác!' : '💡 Not quite. · Chưa chính xác.'}<div class="modal-note">${q.explanation}</div>`;
      }

      // Record learning event (in-memory transient for guest, server API for authenticated)
      recordLearningEvent({
        topicId: q.topicId || currentRoute,
        activityId: q.unitId || (q.title || 'quiz').toLowerCase().replace(/[^a-z0-9]/g, '-'),
        sourceModule: 'topics_library',
        score: isCorrect ? 100 : 0,
        maxScore: 100,
        completionStatus: isCorrect ? 'completed' : 'in_progress',
        assessmentMethod: 'quiz_reading'
      }).catch(err => console.warn('Could not record quiz event:', err));

      // Save student progress to backend/Firestore ONLY if logged in
      if (currentUser && getToken()) {
        saveStudentProgress({
          topicId: q.topicId || currentRoute,
          unitId: q.unitId || (q.title || 'quiz').toLowerCase().replace(/[^a-z0-9]/g, '-'),
          titleEn: q.title || 'Math Lesson',
          titleVi: q.subtitle || 'Bài học Toán',
          score: isCorrect ? 100 : 0,
          isCorrect,
          lastChoice: idx,
          status: isCorrect ? 'completed' : 'in_progress',
          skills: [q.title || 'Math']
        }).catch(err => console.warn('Could not save progress:', err));
      }
    }));
  }

  function speakText(text) {
    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch {
        /* Speech error handled gracefully */
      }
    } else {
      const fb = modalRoot.querySelector('.modal-content');
      if (fb) fb.insertAdjacentHTML('beforeend', '<p class="modal-note">Phát âm thanh chưa được hỗ trợ trong trình duyệt này. / Audio is not supported in this browser.</p>');
    }
  }

  function escapeAttr(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  window.addEventListener('popstate', () => navigate(currentHashRoute(), false));
  window.addEventListener('hashchange', () => {
    const route = currentHashRoute();
    if (route !== currentRoute) navigate(route, false);
  });

  function initDebugMode() {
    const debugBtn = document.getElementById('debug-toggle');
    const debugStatus = document.getElementById('debug-status');

    function toggleDebug(forceState) {
      const isEnabled = typeof forceState === 'boolean'
        ? document.body.classList.toggle('debug-hotspots', forceState)
        : document.body.classList.toggle('debug-hotspots');

      if (debugStatus) {
        debugStatus.textContent = isEnabled ? 'ON' : 'OFF';
      }
      if (debugBtn) {
        debugBtn.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
      }
    }

    if (debugBtn) {
      debugBtn.addEventListener('click', () => toggleDebug());
    }

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        toggleDebug();
      }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === '1' || params.get('debug') === 'true') {
      toggleDebug(true);
    }
  }

  // Session recovery and Auth Listener
  onAuthStateChanged((user) => {
    currentUser = user;
    currentUserProfile = user;
    clearGuestSessionEvents();
    renderNav();
    if (currentRoute === 'progress' || currentRoute === 'admin') {
      renderPage();
    }
  });

  // Dismiss menus on outside click
  window.addEventListener('click', (e) => {
    let needsRender = false;
    if (isUserMenuOpen && !e.target.closest('#nav-user-cluster')) {
      isUserMenuOpen = false;
      needsRender = true;
    }
    if (isMobileMenuOpen && !e.target.closest('.nav-mobile-toggle') && !e.target.closest('.nav-mobile-drawer')) {
      isMobileMenuOpen = false;
      needsRender = true;
    }
    if (needsRender) renderNav();
  });

  // Automatically close mobile menu when expanding to tablet/desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && isMobileMenuOpen) {
      isMobileMenuOpen = false;
      renderNav();
    }
  });

  // Initialize
  currentRoute = currentHashRoute();
  syncHeaderVisibility();
  initBgMusic();
  renderNav();
  renderPage();
  initDebugMode();
  if (!location.hash) history.replaceState({ route: 'home' }, '', '#home');
})();
