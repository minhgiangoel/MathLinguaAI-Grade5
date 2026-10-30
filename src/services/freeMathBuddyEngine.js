/**
 * freeMathBuddyEngine.js
 * High-Speed, Free, Offline-Ready MathBuddy AI Conversation & Problem-Solving Engine
 * Designed specifically for Grade 5 Bilingual Math (English & Vietnamese)
 */

// 1. Grade 5 Math Knowledge Base
export const GRADE5_KNOWLEDGE_BASE = {
  'Decimal Numbers': {
    titleEn: 'Decimal Numbers',
    titleVi: 'Số thập phân',
    conceptEn: 'A decimal number has a whole number part and a fractional part separated by a decimal point. Position values right of the point are tenths (1/10), hundredths (1/100), and thousandths (1/1000).',
    conceptVi: 'Số thập phân gồm phần nguyên và phần thập phân phân cách bởi dấu phẩy. Các hàng bên phải dấu phẩy là hàng phần mười (0,1), hàng phần trăm (0,01) và hàng phần nghìn (0,001).',
    vocab: [
      { en: 'decimal point', vi: 'dấu phẩy thập phân' },
      { en: 'whole number part', vi: 'phần nguyên' },
      { en: 'decimal part', vi: 'phần thập phân' },
      { en: 'tenths place', vi: 'hàng phần mười' },
      { en: 'hundredths place', vi: 'hàng phần trăm' },
      { en: 'thousandths place', vi: 'hàng phần nghìn' },
      { en: 'compare decimals', vi: 'so sánh số thập phân' },
      { en: 'rounding decimals', vi: 'làm tròn số thập phân' }
    ],
    rules: [
      'To compare two decimals: Compare whole parts first. If equal, compare the tenths place, then hundredths place, then thousandths place.',
      'Adding/Subtracting decimals: Align the decimal points vertically, add trailing zeros if needed, then calculate normally.'
    ]
  },
  'Mixed Numbers': {
    titleEn: 'Mixed Numbers',
    titleVi: 'Hỗn số',
    conceptEn: 'A mixed number consists of a whole number and a proper fraction (e.g. 2 1/2). It is greater than 1.',
    conceptVi: 'Hỗn số gồm phần nguyên và phần phân số (ví dụ 2 1/2). Giá trị của hỗn số luôn lớn hơn 1.',
    vocab: [
      { en: 'mixed number', vi: 'hỗn số' },
      { en: 'whole part', vi: 'phần nguyên' },
      { en: 'fractional part', vi: 'phần phân số' },
      { en: 'improper fraction', vi: 'phân số lớn hơn 1 / phân số bất đúp' },
      { en: 'convert to improper fraction', vi: 'chuyển hỗn số thành phân số' }
    ],
    rules: [
      'To convert a mixed number a b/c to improper fraction: numerator = (a × c) + b, denominator = c.',
      'To convert improper fraction N/D to mixed number: whole part = N ÷ D (integer quotient), remainder becomes new numerator over D.'
    ]
  },
  'Fraction': {
    titleEn: 'Fraction & Decimal Fractions',
    titleVi: 'Phân số & Phân số thập phân',
    conceptEn: 'A fraction represents part of a whole (numerator / denominator). A Decimal Fraction is a fraction with denominator 10, 100, 1000...',
    conceptVi: 'Phân số biểu diễn một phần của tổng thể (tử số / mẫu số). Phân số thập phân là phân số có mẫu số là 10, 100, 1000...',
    vocab: [
      { en: 'numerator', vi: 'tử số' },
      { en: 'denominator', vi: 'mẫu số' },
      { en: 'decimal fraction', vi: 'phân số thập phân' },
      { en: 'equivalent fraction', vi: 'phân số bằng nhau' },
      { en: 'simplify fraction', vi: 'rút gọn phân số' }
    ],
    rules: [
      'Decimal fractions: 3/10 = 0.3, 25/100 = 0.25, 125/1000 = 0.125.',
      'Simplifying: Divide numerator and denominator by their greatest common factor.'
    ]
  },
  'Measurement': {
    titleEn: 'Measurement (Hectare & Square Kilometre)',
    titleVi: 'Đo lường (Héc-ta & km²)',
    conceptEn: 'Hectare (ha) and Square Kilometre (km²) are units used to measure large land areas like farms, national parks, and cities.',
    conceptVi: 'Héc-ta (ha) và Ki-lô-mét vuông (km²) là các đơn vị đo diện tích lớn như trang trại, khu bảo tồn thiên nhiên và thành phố.',
    vocab: [
      { en: 'hectare (ha)', vi: 'héc-ta (ha)' },
      { en: 'square metre (m²)', vi: 'mét vuông (m²)' },
      { en: 'square kilometre (km²)', vi: 'ki-lô-mét vuông (km²)' },
      { en: 'land area', vi: 'diện tích đất đai' },
      { en: 'unit conversion', vi: 'quy đổi đơn vị' }
    ],
    rules: [
      '1 ha = 10,000 m²',
      '1 km² = 100 ha = 1,000,000 m²',
      '1 m² = 100 dm² = 10,000 cm²'
    ]
  },
  'Geometry': {
    titleEn: 'Geometry (2D & 3D Shapes)',
    titleVi: 'Hình học 2D & 3D',
    conceptEn: 'Geometry covers calculating perimeter, area of 2D shapes (triangles, trapeziums, circles) and surface area & volume of 3D solids (cuboids, cubes).',
    conceptVi: 'Hình học bao gồm tính chu vi, diện tích hình phẳng (tam giác, hình thang, hình tròn) và diện tích xung quanh, toàn phần, thể tích hình khối 3D (hình hộp chữ nhật, hình lập phương).',
    vocab: [
      { en: 'base', vi: 'cạnh đáy' },
      { en: 'height / altitude', vi: 'chiều cao' },
      { en: 'trapezium / trapezoid', vi: 'hình thang' },
      { en: 'radius (r)', vi: 'bán kính' },
      { en: 'diameter (d)', vi: 'đường kính' },
      { en: 'circumference (C)', vi: 'chu vi hình tròn' },
      { en: 'cuboid', vi: 'hình hộp chữ nhật' },
      { en: 'cube', vi: 'hình lập phương' },
      { en: 'volume (V)', vi: 'thể tích' }
    ],
    rules: [
      'Triangle Area: S = (base × height) / 2',
      'Trapezium Area: S = ((a + b) × height) / 2',
      'Circle Circumference: C = 2 × r × 3.14 = d × 3.14',
      'Circle Area: S = r × r × 3.14',
      'Cuboid Volume: V = length × width × height',
      'Cube Volume: V = a × a × a'
    ]
  },
  'Ratio and Percentage': {
    titleEn: 'Ratio and Percentage',
    titleVi: 'Tỉ số & Phần trăm',
    conceptEn: 'A ratio compares two quantities (a:b). A percentage is a ratio that compares a number to 100 (x%).',
    conceptVi: 'Tỉ số so sánh hai đại lượng (a:b). Tỉ số phần trăm biểu diễn tỉ lệ so với 100 (x%).',
    vocab: [
      { en: 'ratio', vi: 'tỉ số' },
      { en: 'percentage (%)', vi: 'tỉ số phần trăm' },
      { en: 'map scale', vi: 'tỉ lệ bản đồ' },
      { en: 'percentage of a number', vi: 'tìm giá trị phần trăm của một số' }
    ],
    rules: [
      'Percentage of a number: x% of N = N × x / 100.',
      'Convert fraction to percentage: multiply fraction by 100 and add % symbol.',
      'Ratio problem (Sum & Ratio): Total parts = a + b. 1 part = Sum / Total parts. Number = 1 part × parts.'
    ]
  }
};

// 2. Safe Expression Evaluator (Without eval)
function safeEvaluateArithmetic(expr) {
  try {
    // Sanitize expression
    let clean = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/:/g, '/').replace(/,/g, '.').trim();
    if (!/^[0-9+\-*/().\s]+$/.test(clean)) return null;

    // Tokenizer
    const tokens = [];
    let numberBuffer = '';

    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (/[0-9.]/.test(ch)) {
        numberBuffer += ch;
      } else if (['+', '-', '*', '/', '(', ')'].includes(ch)) {
        if (numberBuffer !== '') {
          tokens.push(parseFloat(numberBuffer));
          numberBuffer = '';
        }
        tokens.push(ch);
      }
    }
    if (numberBuffer !== '') {
      tokens.push(parseFloat(numberBuffer));
    }

    if (tokens.length === 0) return null;

    // Shunting-yard algorithm
    const outputQueue = [];
    const operatorStack = [];
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };

    tokens.forEach(token => {
      if (typeof token === 'number') {
        outputQueue.push(token);
      } else if (token in precedence) {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] in precedence &&
          precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
        ) {
          outputQueue.push(operatorStack.pop());
        }
        operatorStack.push(token);
      } else if (token === '(') {
        operatorStack.push(token);
      } else if (token === ')') {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
          outputQueue.push(operatorStack.pop());
        }
        operatorStack.pop(); // Pop '('
      }
    });

    while (operatorStack.length > 0) {
      outputQueue.push(operatorStack.pop());
    }

    // Evaluate RPN
    const stack = [];
    outputQueue.forEach(token => {
      if (typeof token === 'number') {
        stack.push(token);
      } else {
        const b = stack.pop();
        const a = stack.pop();
        if (a === undefined || b === undefined) throw new Error('Invalid expression');
        switch (token) {
          case '+': stack.push(a + b); break;
          case '-': stack.push(a - b); break;
          case '*': stack.push(a * b); break;
          case '/':
            if (b === 0) throw new Error('Division by zero');
            stack.push(a / b);
            break;
        }
      }
    });

    if (stack.length !== 1 || isNaN(stack[0])) return null;
    return Math.round(stack[0] * 10000) / 10000;
  } catch (err) {
    return null;
  }
}

// 3. Special Purpose Math Engine Resolvers
export function solveMathBuddyProblem(userMsg, topic = 'Decimal Numbers') {
  const msgLower = userMsg.toLowerCase().replace(/,/g, '.').trim();

  // A. Decimal Comparison Handler
  const compMatch = msgLower.match(/(?:compare|so sánh|which is (?:greater|larger|bigger|smaller|less)|số nào lớn hơn|số nào bé hơn)\s*([0-9.]+)\s*(?:and|or|vs|với|hoặc|\?|,)\s*([0-9.]+)/i) ||
                    msgLower.match(/([0-9.]+)\s*(?:or|vs|and|và|hoặc)\s*([0-9.]+)/);
  if (compMatch && compMatch[1] && compMatch[2]) {
    const num1 = parseFloat(compMatch[1]);
    const num2 = parseFloat(compMatch[2]);
    if (!isNaN(num1) && !isNaN(num2)) {
      const str1 = compMatch[1];
      const str2 = compMatch[2];

      let explanationEn = '';
      let explanationVi = '';
      let resultSym = '=';

      if (num1 === num2) {
        resultSym = '=';
        explanationEn = `${str1} is equal to ${str2} (${str1} = ${str2})! Both numbers have identical whole and decimal place values.`;
        explanationVi = `${str1} bằng ${str2} (${str1} = ${str2})! Cả hai số có giá trị phần nguyên và phần thập phân hoàn toàn giống nhau.`;
      } else if (num1 > num2) {
        resultSym = '>';
        explanationEn = `${str1} is greater than ${str2} (${str1} > ${str2})!`;
        explanationVi = `${str1} lớn hơn ${str2} (${str1} > ${str2})!`;

        // Detailed place value step-by-step
        const w1 = Math.floor(num1);
        const w2 = Math.floor(num2);
        if (w1 !== w2) {
          explanationEn += ` Whole part ${w1} is bigger than ${w2}.`;
          explanationVi += ` Phần nguyên ${w1} lớn hơn ${w2}.`;
        } else {
          // Compare tenths
          const t1 = Math.floor((num1 * 10) % 10);
          const t2 = Math.floor((num2 * 10) % 10);
          if (t1 !== t2) {
            explanationEn += ` In the tenths place, ${t1} tenths is greater than ${t2} tenths.`;
            explanationVi += ` Ở hàng phần mười, ${t1} phần mười lớn hơn ${t2} phần mười.`;
          } else {
            explanationEn += ` Compare hundredths place next!`;
            explanationVi += ` So sánh tiếp hàng phần trăm!`;
          }
        }
      } else {
        resultSym = '<';
        explanationEn = `${str1} is smaller than ${str2} (${str1} < ${str2}, so ${str2} is greater)!`;
        explanationVi = `${str1} bé hơn ${str2} (${str1} < ${str2}, nên ${str2} lớn hơn)!`;

        const w1 = Math.floor(num1);
        const w2 = Math.floor(num2);
        if (w1 !== w2) {
          explanationEn += ` Whole part ${w1} is smaller than ${w2}.`;
          explanationVi += ` Phần nguyên ${w1} bé hơn ${w2}.`;
        } else {
          const t1 = Math.floor((num1 * 10) % 10);
          const t2 = Math.floor((num2 * 10) % 10);
          if (t1 !== t2) {
            explanationEn += ` In the tenths place, ${t1} tenths is smaller than ${t2} tenths.`;
            explanationVi += ` Ở hàng phần mười, ${t1} phần mười bé hơn ${t2} phần mười.`;
          }
        }
      }

      return {
        matched: true,
        text: `Great question! Comparing ${str1} and ${str2}: ${explanationEn}`,
        translationVi: `Câu hỏi rất hay! So sánh ${str1} và ${str2}: ${explanationVi}`,
        quickReplies: [`Give me another decimal comparison! 🔢`, `How do we round ${str1}?`, `Ask me a question!`],
        sentenceStarters: [`I compared the tenths place...`, `Because ${str1} has...`, `Can you show another example?`],
        feedback: { praise: 'Excellent place-value comparing skill! 🌟', conceptNote: 'Comparing Decimals' }
      };
    }
  }

  // B. Unit Conversion Handler (Area: ha, km2, m2)
  if (msgLower.includes('ha') || msgLower.includes('hectare') || msgLower.includes('km2') || msgLower.includes('m2') || msgLower.includes('diện tích')) {
    const haToM2 = msgLower.match(/([0-9.]+)\s*(?:ha|hectare)\s*=?\s*(?:m2|m²|\?)/i) || msgLower.match(/(?:convert|đổi)\s*([0-9.]+)\s*(?:ha|hectare)\b/i);
    if (haToM2) {
      const val = parseFloat(haToM2[1]);
      if (!isNaN(val)) {
        const resultM2 = val * 10000;
        return {
          matched: true,
          text: `Conversion result: ${val} ha = ${resultM2.toLocaleString('en-US')} m²! Remember that 1 hectare (ha) is equal to 10,000 square metres (m²).`,
          translationVi: `Kết quả quy đổi: ${val} ha = ${resultM2.toLocaleString('vi-VN')} m²! Ghi nhớ rằng 1 héc-ta (ha) bằng 10 000 mét vuông (m²).`,
          quickReplies: [`How many hectares in ${resultM2 * 10} m²?`, `What about km² to ha?`, `Give me a word problem!`],
          sentenceStarters: [`To convert ha to m², we multiply by...`, `1 hectare is...`],
          feedback: { praise: 'Superb unit conversion accuracy! 🌟', conceptNote: 'Land Area Units' }
        };
      }
    }

    const m2ToHa = msgLower.match(/([0-9.]+)\s*(?:m2|m²)\s*=?\s*(?:ha|hectare|\?)/i);
    if (m2ToHa) {
      const val = parseFloat(m2ToHa[1]);
      if (!isNaN(val)) {
        const resultHa = val / 10000;
        return {
          matched: true,
          text: `Conversion result: ${val.toLocaleString('en-US')} m² = ${resultHa} ha! Divided by 10,000 because 1 ha = 10,000 m².`,
          translationVi: `Kết quả quy đổi: ${val.toLocaleString('vi-VN')} m² = ${resultHa} ha! Chia cho 10 000 vì 1 ha = 10 000 m².`,
          quickReplies: [`Try another conversion! 🗺️`, `What is 1 km² in ha?`],
          sentenceStarters: [`We divide m² by 10,000 to get...`],
          feedback: { praise: 'Great job converting area units! 🌟' }
        };
      }
    }

    const km2ToHa = msgLower.match(/([0-9.]+)\s*(?:km2|km²)\s*=?\s*(?:ha|hectare|\?)/i);
    if (km2ToHa) {
      const val = parseFloat(km2ToHa[1]);
      if (!isNaN(val)) {
        const resultHa = val * 100;
        return {
          matched: true,
          text: `Conversion result: ${val} km² = ${resultHa} ha! Multiply by 100 because 1 km² = 100 hectares.`,
          translationVi: `Kết quả quy đổi: ${val} km² = ${resultHa} ha! Nhân với 100 vì 1 km² = 100 héc-ta.`,
          quickReplies: [`1 km² in m²?`, `Give me another problem!`],
          sentenceStarters: [`1 square kilometre equals 100...`],
          feedback: { praise: 'Area unit master! 🌟' }
        };
      }
    }
  }

  // C. Percentage Calculator Handler ("x% of N" or "x% của N")
  const percMatch = msgLower.match(/([0-9.]+)\s*%\s*(?:of|của|x|\*)\s*([0-9.]+)/i) ||
                     msgLower.match(/(?:find|tính|tìm)\s*([0-9.]+)\s*%\s*(?:of|của)\s*([0-9.]+)/i);
  if (percMatch && percMatch[1] && percMatch[2]) {
    const pct = parseFloat(percMatch[1]);
    const num = parseFloat(percMatch[2]);
    if (!isNaN(pct) && !isNaN(num)) {
      const ans = (num * pct) / 100;
      return {
        matched: true,
        text: `Calculation: ${pct}% of ${num} = ${ans}! Step by step: (${num} × ${pct}) ÷ 100 = ${ans}.`,
        translationVi: `Phép tính: ${pct}% của ${num} = ${ans}! Các bước: (${num} × ${pct}) : 100 = ${ans}.`,
        quickReplies: [`What is 50% of ${num}?`, `How to convert fractions to %?`, `Give me a ratio problem!`],
        sentenceStarters: [`To find percentage of a number, we multiply...`],
        feedback: { praise: 'Spot on percentage calculation! 🌟' }
      };
    }
  }

  // D. Geometry Problem Solvers
  // Triangle Area: base & height
  const triMatch = msgLower.match(/(?:triangle|tam giác).*(?:base|đáy)\s*=?\s*([0-9.]+).*(?:height|chiều cao)\s*=?\s*([0-9.]+)/i) ||
                   msgLower.match(/(?:base|đáy)\s*=?\s*([0-9.]+).*(?:height|chiều cao)\s*=?\s*([0-9.]+).*(?:triangle|tam giác)/i);
  if (triMatch && triMatch[1] && triMatch[2]) {
    const b = parseFloat(triMatch[1]);
    const h = parseFloat(triMatch[2]);
    if (!isNaN(b) && !isNaN(h)) {
      const area = (b * h) / 2;
      return {
        matched: true,
        text: `Triangle Area: S = (base × height) / 2 = (${b} × ${h}) / 2 = ${area}!`,
        translationVi: `Diện tích tam giác: S = (đáy × chiều cao) : 2 = (${b} × ${h}) : 2 = ${area}!`,
        quickReplies: [`Area of a trapezium?`, `Volume of a cuboid?`, `Give me a quiz!`],
        sentenceStarters: [`The formula for triangle area is...`],
        feedback: { praise: 'Geometry master! 🌟' }
      };
    }
  }

  // Cuboid Volume: length, width, height
  const volMatch = msgLower.match(/(?:cuboid|hình hộp chữ nhật).*(?:length|dài)\s*=?\s*([0-9.]+).*(?:width|rộng)\s*=?\s*([0-9.]+).*(?:height|cao)\s*=?\s*([0-9.]+)/i);
  if (volMatch && volMatch[1] && volMatch[2] && volMatch[3]) {
    const l = parseFloat(volMatch[1]);
    const w = parseFloat(volMatch[2]);
    const h = parseFloat(volMatch[3]);
    if (!isNaN(l) && !isNaN(w) && !isNaN(h)) {
      const vol = l * w * h;
      return {
        matched: true,
        text: `Cuboid Volume: V = length × width × height = ${l} × ${w} × ${h} = ${vol}!`,
        translationVi: `Thể tích hình hộp chữ nhật: V = dài × rộng × cao = ${l} × ${w} × ${h} = ${vol}!`,
        quickReplies: [`Volume of a cube?`, `Try time addition!`],
        sentenceStarters: [`To calculate volume, we multiply length...`],
        feedback: { praise: 'Spatial reasoning ace! 🌟' }
      };
    }
  }

  // E. Generic Safe Arithmetic Expression Evaluator
  const arithmeticResult = safeEvaluateArithmetic(userMsg);
  if (arithmeticResult !== null) {
    let cleanExpr = userMsg.replace(/,/g, '.').replace(/x/gi, '*').replace(/:/g, '/').replace(/÷/g, '/').trim();
    return {
      matched: true,
      text: `Let's calculate ${cleanExpr}! Step-by-step result: ${cleanExpr} = ${arithmeticResult}.`,
      translationVi: `Cùng tính ${cleanExpr}! Kết quả từng bước: ${cleanExpr} = ${arithmeticResult}.`,
      quickReplies: [`Can you check another calculation?`, `Ask me a question on ${topic}!`, `Give me a hint!`],
      sentenceStarters: [`First, I calculated...`, `The answer is...`],
      feedback: { praise: 'Accurate arithmetic step! 🌟' }
    };
  }

  return { matched: false };
}

// 4. Conversational Engine Intent Classifier & Knowledge Retriever
export function generateFreeMathBuddyResponse({ topic = 'Decimal Numbers', mode = 'talk', message = '', history = [] }) {
  const msgText = String(message || '').trim();
  const msgLower = msgText.toLowerCase();

  // 1. First, check if input contains a direct Math Problem to solve
  const solved = solveMathBuddyProblem(msgText, topic);
  if (solved.matched) {
    return applyModeTone(solved, mode, topic);
  }

  // 2. Greetings & Initiations
  if (!msgText || /\b(hello|hi|xin chào|let's start|bắt đầu)\b/i.test(msgText)) {
    const kb = GRADE5_KNOWLEDGE_BASE[topic] || GRADE5_KNOWLEDGE_BASE['Decimal Numbers'];
    return {
      text: `Hello there! I am MathBuddy 🤖, your Grade 5 Math partner! We are exploring "${kb.titleEn}". How can I help you today?`,
      translationVi: `Xin chào! Tớ là MathBuddy 🤖, người bạn học Toán lớp 5 của bạn! Chúng ta đang khám phá chủ đề "${kb.titleVi}". Tớ có thể giúp gì cho bạn hôm nay?`,
      quickReplies: [
        `Explain the concept of ${topic}!`,
        `Ask me a practice question!`,
        `Show me English vocabulary!`
      ],
      sentenceStarters: [
        `Can you explain how to ...?`,
        `What is the formula for ...?`,
        `I want to try a problem on ...`
      ],
      feedback: { praise: `Welcome to ${topic} on MathBuddy! 🚀` }
    };
  }

  // 3. Requesting Concept Explanation or Definition
  if (msgLower.includes('concept') || msgLower.includes('khái niệm') || msgLower.includes('là gì') || msgLower.includes('what is') || msgLower.includes('explain') || msgLower.includes('giải thích')) {
    const kbKey = Object.keys(GRADE5_KNOWLEDGE_BASE).find(k => msgLower.includes(k.toLowerCase()) || topic.toLowerCase().includes(k.toLowerCase())) || topic;
    const kb = GRADE5_KNOWLEDGE_BASE[kbKey] || GRADE5_KNOWLEDGE_BASE['Decimal Numbers'];

    return {
      text: `Here is the key concept for ${kb.titleEn}: ${kb.conceptEn} Key rule: ${kb.rules[0] || ''}`,
      translationVi: `Đây là khái niệm cốt lõi của ${kb.titleVi}: ${kb.conceptVi} Quy tắc quan trọng: ${kb.rules[0] || ''}`,
      quickReplies: [
        `Give me a practice problem! 📝`,
        `Show English vocabulary! 📖`,
        `What is another rule?`
      ],
      sentenceStarters: [
        `In this topic, we learn that...`,
        `The main rule is...`,
        `Can you give an example?`
      ],
      feedback: { praise: `Great initiative learning math concepts! 🌟` }
    };
  }

  // 4. Requesting Vocabulary
  if (msgLower.includes('vocab') || msgLower.includes('từ vựng') || msgLower.includes('english') || msgLower.includes('tiếng anh')) {
    const kbKey = Object.keys(GRADE5_KNOWLEDGE_BASE).find(k => msgLower.includes(k.toLowerCase()) || topic.toLowerCase().includes(k.toLowerCase())) || topic;
    const kb = GRADE5_KNOWLEDGE_BASE[kbKey] || GRADE5_KNOWLEDGE_BASE['Decimal Numbers'];
    const vocabListStr = kb.vocab.map(v => `• ${v.en} (${v.vi})`).slice(0, 4).join(' ');

    return {
      text: `Key Grade 5 Math English Vocabulary for ${kb.titleEn}: ${vocabListStr}`,
      translationVi: `Từ vựng Tiếng Anh Toán học lớp 5 cho ${kb.titleVi}: ${vocabListStr}`,
      quickReplies: [
        `Use one of these in a sentence!`,
        `Ask me a question!`,
        `Explain another topic!`
      ],
      sentenceStarters: [
        `The English term for... is...`,
        `I know that... means...`
      ],
      feedback: { praise: `Fantastic bilingual vocabulary building! 🌟` }
    };
  }

  // 5. Follow-ups: "Why", "Hint", "Explain more", "Give me a problem"
  if (msgLower.includes('hint') || msgLower.includes('gợi ý') || msgLower.includes('help') || msgLower.includes('giúp')) {
    return {
      text: `Here is a helpful hint for ${topic}: Break down the problem step-by-step. Align your numbers or units carefully before calculating!`,
      translationVi: `Gợi ý dành cho bạn với chủ đề ${topic}: Hãy chia nhỏ bài toán theo từng bước. Đặt thẳng cột các chữ số hoặc đổi cùng đơn vị đo trước khi tính!`,
      quickReplies: [`Let me try now!`, `Give me an example!`, `Explain step 1!`],
      sentenceStarters: [`First, I will...`, `Next, I calculate...`],
      feedback: { praise: `Thinking through hints builds great math stamina! 💡` }
    };
  }

  if (msgLower.includes('question') || msgLower.includes('quiz') || msgLower.includes('bài tập') || msgLower.includes('câu hỏi') || msgLower.includes('test me')) {
    return generatePracticeQuizForTopic(topic, mode);
  }

  // 6. Out-of-Scope Detection (non-math queries)
  if (isOutOfScopeQuery(msgLower)) {
    return {
      text: `I am MathBuddy 🤖, your Grade 5 Math partner! I specialize in Grade 5 Math (Decimals, Fractions, Geometry, Area & Percentages). Let's solve a fun Grade 5 math problem together!`,
      translationVi: `Tớ là MathBuddy 🤖, người bạn học Toán lớp 5 của bạn! Tớ chuyên về Toán lớp 5 (Số thập phân, Phân số, Hình học, Diện tích & Tỉ số phần trăm). Hãy cùng giải một bài toán lớp 5 thật vui nhé!`,
      quickReplies: [
        `Ask me a Grade 5 Math question! 🚀`,
        `Compare 4.5 and 4.35!`,
        `How to convert hectares to m²?`
      ],
      sentenceStarters: [
        `Let's focus on Grade 5 Math...`,
        `Can you test me on...`
      ],
      feedback: { praise: `Let's stay focused on our Grade 5 Math adventure! 🌟` }
    };
  }

  // 7. General Friendly Conversational Fallback
  const kb = GRADE5_KNOWLEDGE_BASE[topic] || GRADE5_KNOWLEDGE_BASE['Decimal Numbers'];
  return applyModeTone({
    text: `That is an interesting math thought! In ${kb.titleEn}, we can explore calculations, unit conversions, or bilingual vocabulary. What step would you like to try next?`,
    translationVi: `Đó là một ý tưởng toán học rất thú vị! Ở chủ đề ${kb.titleVi}, chúng ta có thể thực hành tính toán, đổi đơn vị đo hoặc học từ vựng song ngữ. Bạn muốn thử bước tiếp theo nào?`,
    quickReplies: [
      `Which is greater: 7.65 or 7.59?`,
      `How many m² in 3.5 hectares?`,
      `Explain ${topic} rules!`
    ],
    sentenceStarters: [
      `I think we should calculate...`,
      `Can you give me a problem about...`
    ],
    feedback: { praise: `Great math curiosity! Keep exploring! 🌟` }
  }, mode, topic);
}

// Out of Scope Detector
function isOutOfScopeQuery(str) {
  const nonMathKeywords = [
    'history', 'napoleon', 'python', 'javascript', 'coding', 'geography',
    'president', 'weather', 'recipe', 'movie', 'football', 'soccer',
    'lịch sử', 'lập trình', 'thời tiết', 'nấu ăn', 'bóng đá', 'ca sĩ'
  ];
  return nonMathKeywords.some(kw => str.includes(kw));
}

// Practice Quiz Generator per Topic
function generatePracticeQuizForTopic(topic, mode) {
  const QUIZZES = {
    'Decimal Numbers': {
      text: `Here is a practice question on Decimal Numbers: Which number is greater: 4.5 or 4.35? Explain why in English! 🔢`,
      translationVi: `Đây là câu hỏi thực hành về Số thập phân: Số nào lớn hơn: 4,5 hay 4,35? Giải thích vì sao bằng tiếng Anh!`,
      quickReplies: [`4.5 is greater!`, `4.35 is greater!`, `They are equal!`],
      sentenceStarters: [`4.5 is greater because the tenths digit is...`, `Writing 4.5 as 4.50 shows that...`]
    },
    'Measurement': {
      text: `Here is a Land Area question: A national park area is 5.2 hectares (ha). How many square metres (m²) is that? 🗺️`,
      translationVi: `Câu hỏi về Diện tích đất đai: Khu bảo tồn thiên nhiên rộng 5,2 héc-ta (ha). Diện tích đó bằng bao nhiêu mét vuông (m²)?`,
      quickReplies: [`52,000 m²!`, `5,200 m²!`, `520,000 m²!`],
      sentenceStarters: [`1 hectare equals 10,000 m², so 5.2 ha equals...`]
    },
    'Geometry': {
      text: `Here is a Geometry question: A triangle has a base of 8 cm and height of 5 cm. What is its area? 📐`,
      translationVi: `Câu hỏi Hình học: Một hình tam giác có cạnh đáy 8 cm và chiều cao 5 cm. Diện tích tam giác đó là bao nhiêu?`,
      quickReplies: [`20 cm²!`, `40 cm²!`, `13 cm²!`],
      sentenceStarters: [`Area = (base × height) / 2 = ...`]
    },
    'Ratio and Percentage': {
      text: `Here is a Percentage question: What is 25% of 160 students? 📊`,
      translationVi: `Câu hỏi Phần trăm: 25% của 160 học sinh là bao nhiêu?`,
      quickReplies: [`40 students!`, `35 students!`, `80 students!`],
      sentenceStarters: [`25% of 160 = 160 × 25 / 100 = ...`]
    },
    'Mixed Numbers': {
      text: `Here is a Mixed Number question: Convert 7/4 into a mixed number! 🍕`,
      translationVi: `Câu hỏi Hỗn số: Hãy đổi phân số 7/4 thành hỗn số!`,
      quickReplies: [`1 3/4`, `1 1/4`, `2 1/4`],
      sentenceStarters: [`7/4 equals 1 whole and...`]
    },
    'Fraction': {
      text: `Here is a Decimal Fraction question: Write 25/100 as a decimal number! 🧩`,
      translationVi: `Câu hỏi Phân số thập phân: Viết phân số thập phân 25/100 dưới dạng số thập phân!`,
      quickReplies: [`0.25`, `2.5`, `0.025`],
      sentenceStarters: [`25/100 equals zero point...`]
    }
  };

  const q = QUIZZES[topic] || QUIZZES['Decimal Numbers'];
  return applyModeTone({
    text: q.text,
    translationVi: q.translationVi,
    quickReplies: q.quickReplies,
    sentenceStarters: q.sentenceStarters,
    feedback: { praise: `Challenge time! Try your best! 🌟` }
  }, mode, topic);
}

// Mode Tone Adaptation
function applyModeTone(resObj, mode, topic) {
  let text = resObj.text;
  let translationVi = resObj.translationVi;

  if (mode === 'role-play') {
    text = `🚀 [Space Base Commander]: "${text}"`;
    translationVi = `🚀 [Chỉ huy Trạm Vũ trụ]: "${translationVi}"`;
  } else if (mode === 'discover') {
    text = `🔍 [Math Detective Mystery]: "${text}"`;
    translationVi = `🔍 [Thám tử Toán học]: "${translationVi}"`;
  } else if (mode === 'play-together') {
    text = `🎮 [Space Teammate]: "Let's team up! ${text}"`;
    translationVi = `🎮 [Đồng đội Vũ trụ]: "Cùng phối hợp nhé! ${translationVi}"`;
  }

  return {
    ...resObj,
    text,
    translationVi
  };
}
