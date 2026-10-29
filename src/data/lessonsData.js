// MathLingua AI — Comprehensive Bilingual Lesson Curriculum Data
// Built for Grade 5 Math: Geometry & Measurement (Hectare and Square Kilometre)

export const HECTARE_KM2_LESSON_DATA = {
  id: 'ha-km2-lesson',
  topicId: 'chapter4',
  unitId: 'ha-km2',
  titleEn: 'Hectare and Square Kilometre',
  titleVi: 'Héc-ta và Ki-lô-mét vuông',
  grade: 'Grade 5',
  status: 'published',
  imageUrl: '/assets/topics-library/geometry-measurement/ha-km2-button.png',

  // Tab 1: Explore / Khám phá
  explore: {
    mainImage: '/assets/topics-library/geometry-measurement/geometry-measurement-bg.png',
    dialogues: [
      {
        id: 'd1',
        speaker: 'Robot MathBuddy',
        avatar: 'robot',
        en: 'What is the relationship between hectares and square kilometres?',
        vi: 'Mối quan hệ giữa héc-ta và ki-lô-mét vuông là gì?',
        audioText: 'What is the relationship between hectares and square kilometres?'
      },
      {
        id: 'd2',
        speaker: 'Robot MathBuddy',
        avatar: 'robot',
        en: 'One square kilometre is equal to 100 hectares.',
        vi: 'Một ki-lô-mét vuông bằng 100 héc-ta.',
        audioText: 'One square kilometre is equal to 100 hectares.'
      },
      {
        id: 'd3',
        speaker: 'Phi hành gia Linh',
        avatar: 'astronaut-1',
        en: 'Hectare (ha) is used for measuring large land areas like farms, forests or national parks.',
        vi: 'Héc-ta (ha) được dùng để đo diện tích đất đai rộng lớn như trang trại, khu rừng hay vườn quốc gia.',
        audioText: 'Hectare is used for measuring large land areas like farms, forests or national parks.'
      }
    ],
    remember: {
      titleEn: 'Core Formulas & Facts to Remember',
      titleVi: 'Công thức & Ghi nhớ trọng tâm',
      items: [
        { en: '1 km² = 1,000,000 m²', vi: '1 ki-lô-mét vuông = 1 000 000 mét vuông' },
        { en: '1 ha = 10,000 m²', vi: '1 héc-ta = 10 000 mét vuông' },
        { en: '1 km² = 100 ha', vi: '1 ki-lô-mét vuông = 100 héc-ta' }
      ]
    },
    quickQuestion: {
      questionEn: 'How many hectares are there in 2.5 square kilometres?',
      questionVi: 'Có bao nhiêu héc-ta trong 2,5 ki-lô-mét vuông?',
      choices: ['25 ha', '250 ha', '2,500 ha', '25,000 ha'],
      correctIndex: 1, // 2.5 * 100 = 250 ha
      explanationEn: '2.5 km² = 2.5 × 100 = 250 hectares.',
      explanationVi: '2,5 km² = 2,5 × 100 = 250 héc-ta.'
    }
  },

  // Tab 2: Vocab / Từ vựng
  vocab: [
    {
      id: 'v1',
      en: 'Square kilometre',
      ipa: '/skweər kɪˈlɒm.iː.tər/',
      vi: 'Ki-lô-mét vuông',
      exampleEn: 'Cuc Phuong National Park has an area of 224 square kilometres.',
      exampleVi: 'Vườn quốc gia Cúc Phương có diện tích 224 ki-lô-mét vuông.',
      imageUrl: '/assets/topics-library/geometry-measurement/geometry-measurement-bg.png'
    },
    {
      id: 'v2',
      en: 'Hectare',
      ipa: '/ˈhek.teər/',
      vi: 'Héc-ta',
      exampleEn: 'The tea farm covers an area of 15 hectares.',
      exampleVi: 'Nông trường trà có diện tích rộng 15 héc-ta.',
      imageUrl: '/assets/topics-library/geometry-measurement/ha-km2-button.png'
    },
    {
      id: 'v3',
      en: 'Square metre',
      ipa: '/skweər ˈmiː.tər/',
      vi: 'Mét vuông',
      exampleEn: 'One hectare is equal to ten thousand square metres.',
      exampleVi: 'Một héc-ta bằng mười nghìn mét vuông.'
    },
    {
      id: 'v4',
      en: 'Area',
      ipa: '/ˈeə.ri.ə/',
      vi: 'Diện tích',
      exampleEn: 'We measure land area in hectares or square kilometres.',
      exampleVi: 'Chúng ta đo diện tích đất đai bằng héc-ta hoặc ki-lô-mét vuông.'
    }
  ],

  // Tab 3: Structure / Mẫu câu
  structures: [
    {
      id: 's1',
      en: 'One hectare is equal to ten thousand square metres.',
      vi: 'Một héc-ta bằng mười nghìn mét vuông.',
      noteEn: 'Conversion formula: [Quantity in ha] × 10,000 = [Quantity in m²]',
      noteVi: 'Cấu trúc quy đổi từ héc-ta sang mét vuông (nhân với 10 000)',
      exercise: {
        promptEn: 'Complete: 3 ha = ... m²',
        promptVi: 'Hoàn thành câu quy đổi: 3 ha = ... m²',
        answer: '30,000',
        choices: ['3,000', '30,000', '300,000', '300']
      }
    },
    {
      id: 's2',
      en: 'One square kilometre is equal to one hundred hectares.',
      vi: 'Một ki-lô-mét vuông bằng một trăm héc-ta.',
      noteEn: 'Conversion formula: [Quantity in km²] × 100 = [Quantity in ha]',
      noteVi: 'Cấu trúc quy đổi từ ki-lô-mét vuông sang héc-ta (nhân với 100)',
      exercise: {
        promptEn: 'Complete: 5 km² = ... ha',
        promptVi: 'Hoàn thành câu quy đổi: 5 km² = ... ha',
        answer: '500',
        choices: ['50', '500', '5,000', '50,000']
      }
    }
  ],

  // Tab 4: Practice / Luyện tập
  practice: [
    {
      id: 'task_1',
      sourceTaskId: 'Task 1',
      sourceTitle: 'Match the word cards with the correct number cards',
      type: 'matching',
      isExtraPractice: false,
      questionEn: 'Task 1: Match the word cards with the correct number cards.',
      questionVi: 'Bài 1: Ghép các thẻ từ với các thẻ số tương ứng.',
      pairs: [
        { id: 'p1', left: 'Eight hundred and twenty-two square kilometres', right: '822 km²' },
        { id: 'p2', left: 'Zero point four four square kilometres', right: '0.44 km²' },
        { id: 'p3', left: 'Seven hundred and twenty-eight point six square kilometres', right: '728.6 km²' },
        { id: 'p4', left: 'Sixteen thousand four hundred and ninety square kilometres', right: '16,490 km²' }
      ],
      explanationEn: '822 km² = Eight hundred and twenty-two sq km; 0.44 km² = Zero point four four sq km; 728.6 km² = Seven hundred and twenty-eight point six sq km; 16,490 km² = Sixteen thousand four hundred and ninety sq km.',
      explanationVi: '822 km² tương ứng với Eight hundred and twenty-two sq km; 0,44 km² tương ứng với Zero point four four sq km; 728,6 km² tương ứng với Seven hundred and twenty-eight point six sq km; 16 490 km² tương ứng với Sixteen thousand four hundred and ninety sq km.'
    },
    {
      id: 'task_2',
      sourceTaskId: 'Task 2',
      sourceTitle: 'Fill in the missing numbers',
      type: 'fill_blank',
      isExtraPractice: false,
      questionEn: 'Task 2: Fill in the missing numbers:',
      questionVi: 'Bài 2: Điền số thích hợp vào chỗ trống:',
      fillItems: [
        { id: 'fb1', promptEn: 'a) 2 km² = ... m²', promptVi: 'a) 2 km² = ... m²', prefix: 'a) 2 km² = ', suffix: 'm²', correctAnswer: '2,000,000', explanation: '2 km² = 2 × 1,000,000 = 2,000,000 m²' },
        { id: 'fb2', promptEn: 'b) 5,000,000 m² = ... km²', promptVi: 'b) 5,000,000 m² = ... km²', prefix: 'b) 5,000,000 m² = ', suffix: 'km²', correctAnswer: '5', explanation: '5,000,000 m² ÷ 1,000,000 = 5 km²' },
        { id: 'fb3', promptEn: 'c) 4 km² 500 m² = ... m²', promptVi: 'c) 4 km² 500 m² = ... m²', prefix: 'c) 4 km² 500 m² = ', suffix: 'm²', correctAnswer: '4,000,500', explanation: '4 km² = 4,000,000 m², so 4 km² 500 m² = 4,000,500 m²' },
        { id: 'fb4', promptEn: 'd) 6,450,000 m² = ... km²', promptVi: 'd) 6,450,000 m² = ... km²', prefix: 'd) 6,450,000 m² = ', suffix: 'km²', correctAnswer: '6.45', explanation: '6,450,000 ÷ 1,000,000 = 6.45 km²' }
      ],
      explanationEn: 'Apply unit conversion rules: 1 km² = 1,000,000 m².',
      explanationVi: 'Áp dụng quy tắc quy đổi đơn vị: 1 km² = 1 000 000 m².'
    },
    {
      id: 'task_3',
      sourceTaskId: 'Task 3',
      sourceTitle: 'Which land is the largest for solar panels?',
      type: 'area_comparison',
      isExtraPractice: false,
      questionEn: 'Task 3: Which land is the largest for solar panels?',
      questionVi: 'Bài 3: Mảnh đất nào rộng nhất để lắp đặt pin mặt trời?',
      lands: [
        { id: 'A', name: 'Land A', length: 7, width: 3, unit: 'km', area: 21, formula: '7 km × 3 km = 21 km²' },
        { id: 'B', name: 'Land B', length: 5, width: 5, unit: 'km', area: 25, formula: '5 km × 5 km = 25 km²' },
        { id: 'C', name: 'Land C', length: 6, width: 4, unit: 'km', area: 24, formula: '6 km × 4 km = 24 km²' }
      ],
      correctLandId: 'B',
      explanationEn: 'Land A = 7 × 3 = 21 km²; Land B = 5 × 5 = 25 km²; Land C = 6 × 4 = 24 km². Land B is the largest (25 km²).',
      explanationVi: 'Diện tích Đất A = 7 × 3 = 21 km²; Diện tích Đất B = 5 × 5 = 25 km²; Diện tích Đất C = 6 × 4 = 24 km². Mảnh đất B rộng nhất (25 km²).'
    },
    {
      id: 'extra_1',
      sourceTaskId: 'AI Extra',
      sourceTitle: 'AI-generated Extra Practice',
      type: 'multiple_choice',
      isExtraPractice: true,
      questionEn: 'AI Extra Practice: Convert 3 ha into square metres.',
      questionVi: 'Bài luyện tập mở rộng AI: Đổi 3 ha thành mét vuông.',
      choices: ['3,000 m²', '30,000 m²', '300,000 m²', '300 m²'],
      correctIndex: 1,
      hintEn: '1 ha = 10,000 m². Multiply 3 by 10,000.',
      hintVi: '1 ha = 10 000 m². Lấy 3 nhân với 10 000.',
      explanationEn: '1 ha = 10,000 m², so 3 ha = 3 × 10,000 = 30,000 m².',
      explanationVi: '1 ha = 10 000 m², nên 3 ha = 3 × 10 000 = 30 000 m².'
    }
  ]
};
