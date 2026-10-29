/**
 * MathLingua AI Grade 5 — Central Asset Manifest
 * All paths verified against public/assets filesystem.
 */

export const ASSET_MANIFEST = {
  header: {
    navBar: '/assets/common/thanh-dieu-huong.png',
    navBarClean: '/assets/common/thanh-dieu-huong-clean.png',
    navBarSvgFallback: '/assets/svg/nav-bar.svg'
  },
  home: {
    background: '/assets/home/home-bg.png',
    button: '/assets/home/home-button.png',
    logo: '/assets/home/logo.png',
    fallbackSvg: '/assets/svg/home.svg'
  },
  topicsLibrary: {
    background: '/assets/topics-library/thu-vien-chu-de-bg.png',
    fallbackSvg: '/assets/svg/topics.svg',
    buttons: {
      fraction: '/assets/topics-library/Fraction-button.png',
      decimals: '/assets/topics-library/Decimal-button.png',
      ratio: '/assets/topics-library/Ratio-button.png',
      geometry: '/assets/topics-library/Geometry-button.png'
    }
  },
  chapters: {
    fraction: {
      id: 'chapter1',
      route: 'chapter1',
      aliasRoute: 'topics/fraction',
      titleEn: 'Fraction',
      titleVi: 'Phân số',
      background: '/assets/topics-library/fraction/Chapter-1-bg.png',
      fallbackSvg: '/assets/svg/chapter-1-fraction.svg',
      backButton: '/assets/topics-library/fraction/Back-to-Button.png',
      units: [
        {
          id: 'mixed-numbers',
          titleEn: 'Mixed Numbers',
          titleVi: 'Hỗn số',
          image: '/assets/topics-library/fraction/Mixed-number-button.png'
        },
        {
          id: 'decimal-fractions',
          titleEn: 'Decimal Fractions',
          titleVi: 'Phân số thập phân',
          image: '/assets/topics-library/fraction/Decimal-fraction-button.png'
        }
      ]
    },
    decimalNumbers: {
      id: 'chapter2',
      route: 'chapter2',
      aliasRoute: 'topics/decimal-numbers',
      titleEn: 'Decimal Numbers',
      titleVi: 'Số thập phân',
      background: '/assets/topics-library/decimal-numbers/Chapter-2-bg.png',
      fallbackSvg: '/assets/svg/chapter-2-decimals.svg',
      backButton: '/assets/topics-library/decimal-numbers/Back-to-Button.png',
      units: [
        { id: 'decimal-number', titleEn: 'Decimal Numbers', titleVi: 'Số thập phân', image: '/assets/topics-library/decimal-numbers/decimal-number-button.png' },
        { id: 'comparing-decimals', titleEn: 'Comparing Decimal Numbers', titleVi: 'So sánh các số thập phân', image: '/assets/topics-library/decimal-numbers/Comparing-Decimal-Numbers-button.png' },
        { id: 'writing-length', titleEn: 'Writing Length Measurements as Decimals', titleVi: 'Viết số đo độ dài dưới dạng số thập phân', image: '/assets/topics-library/decimal-numbers/writing-length-button.png' },
        { id: 'writing-mass', titleEn: 'Writing Mass Measurements as Decimals', titleVi: 'Viết số đo khối lượng dưới dạng số thập phân', image: '/assets/topics-library/decimal-numbers/writing-weight-button.png' },
        { id: 'writing-area', titleEn: 'Writing Area Measurements as Decimals', titleVi: 'Viết số đo diện tích dưới dạng số thập phân', image: '/assets/topics-library/decimal-numbers/writing-area-button.png' },
        { id: 'rounding-decimals', titleEn: 'Rounding Decimal Numbers', titleVi: 'Làm tròn số thập phân', image: '/assets/topics-library/decimal-numbers/rounding-Decimal-Numbers-button.png' },
        { id: 'operations-decimals', titleEn: 'Operations with Decimal Numbers', titleVi: 'Các phép tính với số thập phân', image: '/assets/topics-library/decimal-numbers/operation-Decimal-Numbers-button.png' }
      ]
    },
    ratioPercentage: {
      id: 'chapter3',
      route: 'chapter3',
      aliasRoute: 'topics/ratio-percentage',
      titleEn: 'Ratio and Percentage',
      titleVi: 'Tỉ số và tỉ số phần trăm',
      background: '/assets/topics-library/ratio-percentage/Chapter-3-bg.png',
      fallbackSvg: '/assets/svg/chapter-3-ratio.svg',
      backButton: '/assets/topics-library/ratio-percentage/Back-to-Button.png',
      units: [
        { id: 'btn-c3-ratio', unitKey: 'ratio', titleEn: 'Ratio', titleVi: 'Tỉ số', image: '/assets/topics-library/ratio-percentage/ratio-button.png', alt: 'Bài 1: Tỉ số / Ratio' },
        { id: 'btn-c3-word-ratio', unitKey: 'word-problems-ratio', titleEn: 'Word Problems about Ratio', titleVi: 'Bài toán về tỉ số', image: '/assets/topics-library/ratio-percentage/word-ratio-button.png', alt: 'Bài 2: Bài toán về tỉ số / Word Problems about Ratio' },
        { id: 'btn-c3-percentage', unitKey: 'percentage', titleEn: 'Percentage', titleVi: 'Tỉ số phần trăm', image: '/assets/topics-library/ratio-percentage/percent-button.png', alt: 'Bài 3: Tỉ số phần trăm / Percentage' },
        { id: 'btn-c3-percentage-of-number', unitKey: 'percentage-of-number', titleEn: 'Percentage of a Number', titleVi: 'Tìm giá trị phần trăm của một số', image: '/assets/topics-library/ratio-percentage/percent-number-button.png', alt: 'Bài 4: Tìm giá trị phần trăm của một số / Percentage of a Number' },
        { id: 'btn-c3-map-scale', unitKey: 'map-scale', titleEn: 'Map Scale', titleVi: 'Tỉ lệ bản đồ', image: '/assets/topics-library/ratio-percentage/map-scale-button.png', alt: 'Bài 5: Tỉ lệ bản đồ / Map Scale' }
      ]
    },
    geometryMeasurement: {
      id: 'chapter4',
      route: 'chapter4',
      aliasRoute: 'topics/geometry-measurement',
      titleEn: 'Geometry and Measurement',
      titleVi: 'Hình học và đo lường',
      background: '/assets/topics-library/geometry-measurement/geometry-measurement-bg.png',
      fallbackSvg: '/assets/svg/chapter-4-geometry.svg',
      backButton: '/assets/topics-library/geometry-measurement/Back-to-Button.png',
      units: [
        { id: 'ha-km2', number: 1, titleEn: 'Hectare and Square Kilometre', titleVi: 'Héc-ta và ki-lô-mét vuông', image: '/assets/topics-library/geometry-measurement/ha-km2-button.png' },
        { id: 'triangle', number: 2, titleEn: 'Area of Triangle', titleVi: 'Diện tích hình tam giác', image: '/assets/topics-library/geometry-measurement/triangle-button.png' },
        { id: 'trapezium', number: 3, titleEn: 'Trapezium and Area of Trapezium', titleVi: 'Hình thang và diện tích hình thang', image: '/assets/topics-library/geometry-measurement/Trapezium-button.png' },
        { id: 'circumference', number: 4, titleEn: 'Circumference and Area of a Circle', titleVi: 'Chu vi và diện tích hình tròn', image: '/assets/topics-library/geometry-measurement/circumference-button.png' },
        { id: 'net-of-solid', number: 5, titleEn: 'Nets of Solid', titleVi: 'Hình khai triển của hình khối', image: '/assets/topics-library/geometry-measurement/net-of-solid-button.png' },
        { id: 'lateral-surface-area', number: 6, titleEn: 'Lateral Area and Surface Area', titleVi: 'Diện tích xung quanh và diện tích toàn phần', image: '/assets/topics-library/geometry-measurement/lateral-surface-area-button.png' },
        { id: 'units-of-volume', number: 7, titleEn: 'Units of Volume', titleVi: 'Đơn vị đo thể tích', image: '/assets/topics-library/geometry-measurement/units-of-volume-button.png' },
        { id: 'volume-of-cuboid-cube', number: 8, titleEn: 'Volume of Cuboid and Cube', titleVi: 'Thể tích hình hộp chữ nhật và hình lập phương', image: '/assets/topics-library/geometry-measurement/volume-of-cuboid-cube-button.png' },
        { id: 'add-sub-time', number: 9, titleEn: 'Adding and Subtracting Time', titleVi: 'Cộng và trừ số đo thời gian', image: '/assets/topics-library/geometry-measurement/add-sub-time-button.png' },
        { id: 'multi-divide-time', number: 10, titleEn: 'Multiplying and Dividing Time', titleVi: 'Nhân và chia số đo thời gian', image: '/assets/topics-library/geometry-measurement/multi-divide-time-button.png' },
        { id: 'speed', number: 11, titleEn: 'Speed', titleVi: 'Vận tốc', image: '/assets/topics-library/geometry-measurement/speed-button.png' },
        { id: 'svt', number: 12, titleEn: 'Speed, Time and Distance Formula', titleVi: 'Công thức liên hệ quãng đường, vận tốc và thời gian', image: '/assets/topics-library/geometry-measurement/svt-button.png' },
        { id: 'pie-chart', number: 13, titleEn: 'Pie Chart', titleVi: 'Biểu đồ hình quạt tròn', image: '/assets/topics-library/geometry-measurement/pie-chart-button.png' }
      ]
    }
  },
  mathLab: {
    background: '/assets/math-lab/Math-Lab-bg.png',
    fallbackSvg: '/assets/svg/math-lab.svg',
    games: [
      {
        id: 'ml-game-shapes',
        gameKey: 'shapes',
        titleEn: '3D Shape Studio',
        titleVi: 'Xưởng hình khối 3D',
        image: '/assets/math-lab/3D-shape-game.png'
      },
      {
        id: 'ml-game-mixed',
        gameKey: 'mixed',
        titleEn: 'Mixed Number Adventure',
        titleVi: 'Phiêu lưu cùng hỗn số',
        image: '/assets/math-lab/mixed-number-game.png'
      },
      {
        id: 'ml-game-pieces',
        gameKey: 'mystery',
        titleEn: 'Mystery Pieces',
        titleVi: 'Mảnh ghép bí ẩn',
        image: '/assets/math-lab/pieces-game.png'
      },
      {
        id: 'ml-game-candy',
        gameKey: 'candy',
        titleEn: 'Candy Stacker',
        titleVi: 'Xếp kẹo khối lượng',
        image: '/assets/math-lab/candy-game.png'
      },
      {
        id: 'ml-game-dragdrop',
        gameKey: 'dragdrop',
        titleEn: 'Drag and Drop',
        titleVi: 'Kéo thả đúng chỗ',
        image: '/assets/math-lab/drag-drop-game.png'
      },
      {
        id: 'ml-game-ants',
        gameKey: 'ants',
        titleEn: 'Ants Food Quest',
        titleVi: 'Kiến tha mồi',
        image: '/assets/math-lab/ants-game.png'
      }
    ]
  },
  mathBuddy: {
    fallbackSvg: '/assets/svg/mathbuddy-ai.svg'
  },
  myProgress: {
    fallbackSvg: '/assets/svg/my-progress.svg'
  }
};
