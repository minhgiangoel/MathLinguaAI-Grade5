/**
 * MathLingua AI — Decimal Fractions Interactive Lesson Curriculum Data
 * Module: Chapter 1 (Fraction) -> Lesson 2: Decimal Fractions
 */

export const DECIMAL_FRACTIONS_LESSON_DATA = {
  id: 'decimal-fractions-lesson',
  topicId: 'chapter1',
  unitId: 'decimal-fractions',
  titleEn: 'Decimal Fractions',
  titleVi: 'Phân số thập phân',
  grade: 'Grade 5',
  status: 'published',
  imageUrl: '/assets/topics-library/fraction/Decimal-fraction-button.png',

  // Tab 1: Explore / Khám phá
  explore: {
    sceneTitle: 'Decimal Fractions Discovery! 🚀',
    sceneSubtitle: 'Khám phá các phân số thập phân và vị trí tô màu!',
    mainImage: '/assets/decimal-fractions/decimal-fractions-explore.png',
    mainImageCaption: '📍 Real-World Context: Decimal Fractions (3/10, 8/10, 57/100, 9/1000)',
    dialogues: [
      {
        id: 'd1',
        speaker: 'Phi hành gia Nam',
        avatar: 'astronaut-1',
        en: 'A decimal fraction is a fraction whose denominator is 10, 100, 1000, and so on.',
        vi: 'Phân số thập phân là phân số có mẫu số là 10, 100, 1000, ...',
        audioUrl: '/assets/decimal-fractions/audio/boy-decimal-fraction.wav',
        audioText: 'A decimal fraction is a fraction whose denominator is 10, 100, 1000, and so on.'
      },
      {
        id: 'd2',
        speaker: 'Cáo Toán Học MathFox',
        avatar: 'robot',
        en: 'For example, 3/10 means 3 of 10 equal parts are coloured.',
        vi: 'Ví dụ, 3/10 nghĩa là 3 trong 10 phần bằng nhau được tô màu.',
        audioUrl: '/assets/decimal-fractions/audio/fox-decimal-fractions.wav',
        audioText: 'For example, 3/10 means 3 of 10 equal parts are coloured.'
      },
      {
        id: 'd3',
        speaker: 'Người dẫn chuyện',
        avatar: 'astronaut-1',
        en: 'Fifty-seven hundredths (57/100) means 57 of 100 equal parts are coloured.',
        vi: 'Năm mươi bảy phần trăm (57/100) nghĩa là 57 trong 100 phần bằng nhau được tô màu.',
        audioUrl: '/assets/decimal-fractions/audio/tellers-decimal-fractions.wav',
        audioText: 'Fifty-seven hundredths (57/100) means 57 of 100 equal parts are coloured.'
      }
    ],
    remember: {
      titleEn: 'Core Facts to Remember / Ghi nhớ trọng tâm',
      titleVi: 'Ghi nhớ trọng tâm về phân số thập phân',
      items: [
        { en: '1/10 = 0.1 (One tenth / Một phần mười)', vi: '1/10 = 0,1 (Một phần mười)' },
        { en: '1/100 = 0.01 (One hundredth / Một phần trăm)', vi: '1/100 = 0,01 (Một phần trăm)' },
        { en: '1/1000 = 0.001 (One thousandth / Một phần nghìn)', vi: '1/1000 = 0,001 (Một phần nghìn)' }
      ]
    },
    quickQuestion: {
      questionEn: 'Which fraction is a decimal fraction?',
      questionVi: 'Phân số nào dưới đây là phân số thập phân?',
      choices: ['3/10', '2/5', '7/8', '4/9'],
      correctIndex: 0,
      explanationEn: '3/10 has denominator 10, so it is a decimal fraction.',
      explanationVi: '3/10 có mẫu số là 10 nên là phân số thập phân.'
    }
  },

  // Tab 2: Vocab / Từ vựng
  vocab: [
    {
      id: 'v1',
      en: 'Decimal fraction',
      ipa: '/ˈdes.ɪ.məl ˈfræk.ʃən/',
      vi: 'Phân số thập phân',
      exampleEn: '3/10 and 57/100 are decimal fractions.',
      exampleVi: '3/10 và 57/100 là các phân số thập phân.',
      imageUrl: '/assets/decimal-fractions/decimal-fractions-explore.png'
    },
    {
      id: 'v2',
      en: 'Denominator',
      ipa: '/dɪˈnɒm.ɪ.neɪ.tər/',
      vi: 'Mẫu số',
      exampleEn: 'The denominator of a decimal fraction is 10, 100, 1000...',
      exampleVi: 'Mẫu số của phân số thập phân là 10, 100, 1000...',
      imageUrl: '/assets/decimal-fractions/decimal-fractions-tenths.png'
    },
    {
      id: 'v3',
      en: 'Numerator',
      ipa: '/ˈnjuː.mə.reɪ.tər/',
      vi: 'Tử số',
      exampleEn: 'In 3/10, 3 is the numerator.',
      exampleVi: 'Trong phân số 3/10, 3 là tử số.',
      imageUrl: '/assets/decimal-fractions/decimal-fractions-hundredths.png'
    },
    {
      id: 'v4',
      en: 'Tenths',
      ipa: '/tenθs/',
      vi: 'Phần mười',
      exampleEn: 'Three tenths equals 3/10.',
      exampleVi: 'Ba phần mười bằng 3/10.',
      imageUrl: '/assets/decimal-fractions/decimal-fractions-tenths.png'
    },
    {
      id: 'v5',
      en: 'Hundredths',
      ipa: '/ˈhʌn.drətθs/',
      vi: 'Phần trăm',
      exampleEn: 'Fifty-seven hundredths equals 57/100.',
      exampleVi: 'Năm mươi bảy phần trăm bằng 57/100.',
      imageUrl: '/assets/decimal-fractions/decimal-fractions-hundredths.png'
    }
  ],

  // Tab 3: Structure / Mẫu câu (4 Sentence Patterns A, B, C, D)
  structures: [
    {
      id: 'pattern-a',
      code: 'A',
      patternEn: '… is a decimal fraction.',
      patternVi: '… là một phân số thập phân.',
      exampleEn: '3/10 is a decimal fraction.',
      exampleVi: '3/10 là một phân số thập phân.',
      noteEn: 'Pattern A: Identifying a fraction as a decimal fraction',
      noteVi: 'Mẫu câu A: Khẳng định phân số có mẫu số 10, 100, 1000... là phân số thập phân',
      options: [
        { num: '3', den: '10', mathStr: '3/10', textEn: '3/10 is a decimal fraction.', textVi: '3/10 là một phân số thập phân.' },
        { num: '8', den: '10', mathStr: '8/10', textEn: '8/10 is a decimal fraction.', textVi: '8/10 là một phân số thập phân.' },
        { num: '57', den: '100', mathStr: '57/100', textEn: '57/100 is a decimal fraction.', textVi: '57/100 là một phân số thập phân.' },
        { num: '9', den: '1000', mathStr: '9/1000', textEn: '9/1000 is a decimal fraction.', textVi: '9/1000 là một phân số thập phân.' }
      ]
    },
    {
      id: 'pattern-b',
      code: 'B',
      patternEn: '… is not a decimal fraction.',
      patternVi: '… không phải là phân số thập phân.',
      exampleEn: '2/5 is not a decimal fraction.',
      exampleVi: '2/5 không phải là phân số thập phân.',
      noteEn: 'Pattern B: Stating that a fraction is not a decimal fraction',
      noteVi: 'Mẫu câu B: Khẳng định phân số không có mẫu số 10, 100, 1000... không phải phân số thập phân',
      options: [
        { num: '2', den: '5', mathStr: '2/5', textEn: '2/5 is not a decimal fraction.', textVi: '2/5 không phải là phân số thập phân.' },
        { num: '3', den: '4', mathStr: '3/4', textEn: '3/4 is not a decimal fraction.', textVi: '3/4 không phải là phân số thập phân.' },
        { num: '7', den: '20', mathStr: '7/20', textEn: '7/20 is not a decimal fraction.', textVi: '7/20 không phải là phân số thập phân.' },
        { num: '4', den: '15', mathStr: '4/15', textEn: '4/15 is not a decimal fraction.', textVi: '4/15 không phải là phân số thập phân.' }
      ]
    },
    {
      id: 'pattern-c',
      code: 'C',
      patternEn: '… is equivalent to the decimal fraction …',
      patternVi: '… bằng phân số thập phân …',
      exampleEn: '2/5 is equivalent to the decimal fraction 4/10.',
      exampleVi: '2/5 bằng phân số thập phân 4/10.',
      noteEn: 'Pattern C: Expressing equivalence to a decimal fraction',
      noteVi: 'Mẫu câu C: Diễn đạt sự bằng nhau giữa một phân số thường và một phân số thập phân',
      options: [
        { origNum: '2', origDen: '5', targetNum: '4', targetDen: '10', mathStr: '2/5 = 4/10', textEn: '2/5 is equivalent to the decimal fraction 4/10.', textVi: '2/5 bằng phân số thập phân 4/10.' },
        { origNum: '3', origDen: '25', targetNum: '12', targetDen: '100', mathStr: '3/25 = 12/100', textEn: '3/25 is equivalent to the decimal fraction 12/100.', textVi: '3/25 bằng phân số thập phân 12/100.' },
        { origNum: '21', origDen: '30', targetNum: '7', targetDen: '10', mathStr: '21/30 = 7/10', textEn: '21/30 is equivalent to the decimal fraction 7/10.', textVi: '21/30 bằng phân số thập phân 7/10.' }
      ]
    },
    {
      id: 'pattern-d',
      code: 'D',
      patternEn: 'I can expand … to …',
      patternVi: 'Tôi có thể mở rộng … thành …',
      exampleEn: 'I can expand 3/5 to 6/10.',
      exampleVi: 'Tôi có thể mở rộng 3/5 thành 6/10.',
      noteEn: 'Pattern D: Expanding a fraction to a decimal fraction',
      noteVi: 'Mẫu câu D: Diễn đạt thao tác quy đồng nhân cả tử và mẫu để tạo phân số thập phân',
      options: [
        { origNum: '3', origDen: '5', targetNum: '6', targetDen: '10', mathStr: '3/5 -> 6/10', textEn: 'I can expand 3/5 to 6/10.', textVi: 'Tôi có thể mở rộng 3/5 thành 6/10.' },
        { origNum: '1', origDen: '4', targetNum: '25', targetDen: '100', mathStr: '1/4 -> 25/100', textEn: 'I can expand 1/4 to 25/100.', textVi: 'Tôi có thể mở rộng 1/4 thành 25/100.' },
        { origNum: '7', origDen: '20', targetNum: '35', targetDen: '100', mathStr: '7/20 -> 35/100', textEn: 'I can expand 7/20 to 35/100.', textVi: 'Tôi có thể mở rộng 7/20 thành 35/100.' }
      ]
    }
  ],

  // Tab 4: Practice Tasks (Tasks 1, 2, 3A, 3B, 4)
  practiceTasks: {
    task1: {
      id: 'task-1',
      titleEn: 'Task 1: Identify Decimal Fractions',
      titleVi: 'Bài 1: Chọn các phân số thập phân',
      promptEn: 'Which of the following fractions are decimal fractions? Click to select them.',
      promptVi: 'Phân số nào dưới đây là phân số thập phân? Nhấn để chọn.',
      fractions: [
        { id: 'f1', num: 3, den: 10, isDecimal: true },
        { id: 'f2', num: 2, den: 5, isDecimal: false },
        { id: 'f3', num: 8, den: 10, isDecimal: true },
        { id: 'f4', num: 4, den: 9, isDecimal: false },
        { id: 'f5', num: 57, den: 100, isDecimal: true },
        { id: 'f6', num: 7, den: 20, isDecimal: false },
        { id: 'f7', num: 9, den: 1000, isDecimal: true },
        { id: 'f8', num: 12, den: 35, isDecimal: false }
      ],
      explanationEn: 'Decimal fractions have denominators equal to 10, 100, 1000, etc. (3/10, 8/10, 57/100, 9/1000).',
      explanationVi: 'Phân số thập phân có mẫu số là 10, 100, 1000... (gồm 3/10, 8/10, 57/100, 9/1000).'
    },
    task2: {
      id: 'task-2',
      titleEn: 'Task 2: Convert to Equivalent Decimal Fractions',
      titleVi: 'Bài 2: Chuyển thành phân số thập phân tương đương',
      promptEn: 'Fill in the missing numbers to complete the equivalent decimal fractions.',
      promptVi: 'Điền số thích hợp vào ô trống để hoàn thành phân số thập phân.',
      items: [
        {
          id: 'q1',
          type: 'multiply',
          origNum: 2, origDen: 5,
          multNum: 2, multDen: 2,
          targetNum: 4, targetDen: 10,
          userBlankTarget: 'targetNum',
          hint: 'Multiply both numerator and denominator by 2: (2 × 2) / (5 × 2) = ? / 10'
        },
        {
          id: 'q2',
          type: 'multiply',
          origNum: 3, origDen: 25,
          multNum: 4, multDen: 4,
          targetNum: 12, targetDen: 100,
          userBlankTarget: 'multDen',
          hint: 'Multiply both numerator and denominator by 4: (3 × 4) / (25 × ?) = 12 / 100'
        },
        {
          id: 'q3',
          type: 'divide',
          origNum: 21, origDen: 30,
          divNum: 3, divDen: 3,
          targetNum: 7, targetDen: 10,
          userBlankTarget: 'targetNum',
          hint: 'Divide both numerator and denominator by 3: (21 ÷ 3) / (30 ÷ 3) = ? / 10'
        },
        {
          id: 'q4',
          type: 'divide',
          origNum: 18, origDen: 200,
          divNum: 2, divDen: 2,
          targetNum: 9, targetDen: 100,
          userBlankTarget: 'targetNum',
          hint: 'Divide both numerator and denominator by 2: (18 ÷ 2) / (200 ÷ 2) = ? / 100'
        }
      ],
      explanationEn: 'Multiply or divide numerator and denominator by the same non-zero number to make denominators 10, 100, 1000.',
      explanationVi: 'Nhân hoặc chia cả tử số và mẫu số với cùng một số tự nhiên khác 0 để được phân số có mẫu số là 10, 100, 1000.'
    },
    task3a: {
      id: 'task-3a',
      titleEn: 'Task 3A: Complete the Tenths Number Line',
      titleVi: 'Bài 3A: Điền phân số thập phân trên tia số (Phần mười)',
      promptEn: 'Fill in the missing decimal fractions on the number line.',
      promptVi: 'Điền các phân số thập phân thích hợp vào ô trống trên tia số.',
      points: [
        { pos: 0, label: '0', isInput: false },
        { pos: 1, targetNum: '1', targetDen: '10', isInput: true },
        { pos: 2, label: '2/10', num: '2', den: '10', isInput: false },
        { pos: 3, targetNum: '3', targetDen: '10', isInput: true },
        { pos: 4, label: '4/10', num: '4', den: '10', isInput: false },
        { pos: 5, label: '5/10', num: '5', den: '10', isInput: false },
        { pos: 6, targetNum: '6', targetDen: '10', isInput: true },
        { pos: 7, label: '7/10', num: '7', den: '10', isInput: false },
        { pos: 8, label: '8/10', num: '8', den: '10', isInput: false },
        { pos: 9, targetNum: '9', targetDen: '10', isInput: true },
        { pos: 10, label: '1', isInput: false }
      ],
      explanationEn: 'The interval between 0 and 1 is divided into 10 equal parts. Each mark represents a tenth (1/10, 3/10, 6/10, 9/10).',
      explanationVi: 'Đoạn thẳng từ 0 đến 1 được chia thành 10 phần bằng nhau. Mỗi phần ứng với 1/10 (điền: 1/10, 3/10, 6/10, 9/10).'
    },
    task3b: {
      id: 'task-3b',
      titleEn: 'Task 3B: Complete the Hundredths Number Line',
      titleVi: 'Bài 3B: Điền phân số thập phân trên tia số (Phần trăm)',
      promptEn: 'Fill in the missing hundredths fractions on the number line.',
      promptVi: 'Điền các phân số thập phân có mẫu số 100 vào ô trống trên tia số.',
      points: [
        { pos: 0, label: '0', isInput: false },
        { pos: 2, targetNum: '2', targetDen: '100', isInput: true },
        { pos: 5, targetNum: '5', targetDen: '100', isInput: true },
        { pos: 8, targetNum: '8', targetDen: '100', isInput: true },
        { pos: 10, label: '10/100', num: '10', den: '100', isInput: false }
      ],
      explanationEn: 'The interval from 0 to 10/100 is divided into 10 hundredths parts: 2/100, 5/100, 8/100.',
      explanationVi: 'Các vị trí tương ứng trên tia số phần trăm là: 2/100, 5/100, 8/100.'
    },
    task4: {
      id: 'task-4',
      titleEn: 'Task 4: Listen and Tick the Correct Fraction',
      titleVi: 'Bài 4: Nghe và chọn phân số thập phân đúng',
      promptEn: 'Listen to the audio and select the matching decimal fraction.',
      promptVi: 'Lắng nghe phát âm và chọn phân số thập phân tương ứng.',
      items: [
        {
          id: 'audio-q1',
          readText: 'Three tenths',
          readTextVi: 'Ba phần mười',
          audioUrl: '/assets/decimal-fractions/audio/boy-decimal-fraction.wav',
          choices: [
            { num: 3, den: 10, isCorrect: true },
            { num: 3, den: 100, isCorrect: false },
            { num: 10, den: 3, isCorrect: false },
            { num: 3, den: 5, isCorrect: false }
          ]
        },
        {
          id: 'audio-q2',
          readText: 'Fifty-seven hundredths',
          readTextVi: 'Năm mươi bảy phần trăm',
          audioUrl: '/assets/decimal-fractions/audio/tellers-decimal-fractions.wav',
          choices: [
            { num: 57, den: 10, isCorrect: false },
            { num: 57, den: 100, isCorrect: true },
            { num: 57, den: 1000, isCorrect: false },
            { num: 5, den: 70, isCorrect: false }
          ]
        },
        {
          id: 'audio-q3',
          readText: 'Nine thousandths',
          readTextVi: 'Chín phần nghìn',
          audioUrl: '/assets/decimal-fractions/audio/fox-decimal-fractions.wav',
          choices: [
            { num: 9, den: 100, isCorrect: false },
            { num: 9, den: 1000, isCorrect: true },
            { num: 9, den: 10, isCorrect: false },
            { num: 90, den: 1000, isCorrect: false }
          ]
        }
      ],
      explanationEn: 'Match spoken English fraction terms with vertical decimal fraction notation.',
      explanationVi: 'Nối cách đọc tiếng Anh "Three tenths" (3/10), "Fifty-seven hundredths" (57/100), "Nine thousandths" (9/1000).'
    }
  }
};
