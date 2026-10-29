/**
 * progressAnalytics.js - Client-Side Unified Learning Analytics & Progress Service
 */

const AUTH_TOKEN_KEY = 'mathlingua_auth_token';

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

/**
 * Standardized Learning Event Recorder
 */
export async function recordLearningEvent(event) {
  const eventId = event.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  const payload = {
    eventId,
    topicId: event.topicId || 'chapter1',
    activityId: event.activityId || 'general_activity',
    sourceModule: event.sourceModule || 'topics_library',
    learningObjectiveIds: event.learningObjectiveIds || [event.topicId || 'general'],
    skillEvidence: event.skillEvidence || {}, // { listening: { score: 80, method: 'audio_comprehension' }, speaking: ... }
    score: typeof event.score === 'number' ? event.score : 0,
    maxScore: typeof event.maxScore === 'number' ? event.maxScore : 100,
    attempts: event.attempts || 1,
    completionStatus: event.completionStatus || 'completed',
    assessedAt: event.assessedAt || new Date().toISOString(),
    assessmentMethod: event.assessmentMethod || 'quiz_reading',
    confidence: event.confidence || 'medium'
  };

  try {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/progress/event', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[ProgressAnalytics] Event recording offline or failed:', err);
    // Store in local storage queue if needed
    try {
      const localEvents = JSON.parse(localStorage.getItem('mathlingua_pending_events') || '[]');
      localEvents.push(payload);
      localStorage.setItem('mathlingua_pending_events', JSON.stringify(localEvents));
    } catch (e) {
      // Ignore
    }
    return { success: false, event: payload };
  }
}

/**
 * Fetch All Analytics Data
 */
export async function fetchAnalyticsData() {
  try {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/progress/analytics', { headers });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[ProgressAnalytics] Failed to fetch server analytics:', err);
    return {
      success: false,
      userId: 'guest_student',
      userDisplayName: 'Học sinh Khách (Guest)',
      events: JSON.parse(localStorage.getItem('mathlingua_pending_events') || '[]'),
      legacyProgress: []
    };
  }
}

/**
 * Curriculum Topics Definition
 */
export const TOPIC_DEFINITIONS = {
  chapter1: {
    id: 'chapter1',
    titleEn: 'Fraction & Mixed Numbers',
    titleVi: 'Phân số & Hỗn số',
    icon: '📊',
    color: '#3B82F6',
    objectives: [
      { id: 'frac_concept', titleEn: 'Equivalent Fractions & Simplifying', titleVi: 'Phân số bằng nhau & Rút gọn' },
      { id: 'mixed_num_concept', titleEn: 'Mixed Number Concept & Visual Representation', titleVi: 'Khái niệm & Biểu diễn Hỗn số' },
      { id: 'mixed_num_conversion', titleEn: 'Converting Between Improper Fractions & Mixed Numbers', titleVi: 'Chuyển đổi Phân số & Hỗn số' },
      { id: 'decimal_frac', titleEn: 'Decimal Fractions (Denominators 10, 100, 1000)', titleVi: 'Phân số thập phân' }
    ]
  },
  chapter2: {
    id: 'chapter2',
    titleEn: 'Decimal Numbers',
    titleVi: 'Số thập phân',
    icon: '🔢',
    color: '#8B5CF6',
    objectives: [
      { id: 'dec_place_value', titleEn: 'Place Value: Tenths, Hundredths, Thousandths', titleVi: 'Hàng của số thập phân' },
      { id: 'dec_comparison', titleEn: 'Comparing & Ordering Decimals', titleVi: 'So sánh & Sắp xếp số thập phân' },
      { id: 'dec_operations', titleEn: 'Addition, Subtraction & Multiplication of Decimals', titleVi: 'Cộng, Trừ, Nhân số thập phân' }
    ]
  },
  chapter3: {
    id: 'chapter3',
    titleEn: 'Ratio & Percentage',
    titleVi: 'Tỉ số & Tỉ số phần trăm',
    icon: '📈',
    color: '#EC4899',
    objectives: [
      { id: 'ratio_concept', titleEn: 'Understanding Ratios & Proportions', titleVi: 'Khái niệm Tỉ số & Tỉ lệ' },
      { id: 'percentage_calc', titleEn: 'Calculating Percentages of Quantities', titleVi: 'Tính Tỉ số phần trăm' },
      { id: 'percentage_apps', titleEn: 'Real-life Percentage Applications', titleVi: 'Ứng dụng Phần trăm thực tế' }
    ]
  },
  chapter4: {
    id: 'chapter4',
    titleEn: 'Geometry & Area Measurement',
    titleVi: 'Hình học & Đo diện tích',
    icon: '📐',
    color: '#10B981',
    objectives: [
      { id: 'area_units', titleEn: 'Area Units: Hectare (ha) & Square Kilometre (km²)', titleVi: 'Đơn vị đo: Héc-ta & km²' },
      { id: 'unit_conversion', titleEn: 'Converting Between m², ha, and km²', titleVi: 'Quy đổi đơn vị m², ha, km²' },
      { id: 'shape_properties', titleEn: '2D & 3D Shapes: Area & Volume Calculations', titleVi: 'Tính diện tích & thể tích hình học' }
    ]
  },
  mathlab: {
    id: 'mathlab',
    titleEn: 'Math Lab Interactive Games',
    titleVi: 'Phòng thí nghiệm Toán tương tác',
    icon: '🚀',
    color: '#F59E0B',
    objectives: [
      { id: 'raci_adventure', titleEn: 'RACI Mixed Number Adventure Game', titleVi: 'Trò chơi Thám hiểm Hỗn số RACI' },
      { id: 'shape_3d_studio', titleEn: '3D Spatial Geometry & Unit Conversion Studio', titleVi: 'Xưởng Hình học 3D & Quy đổi' },
      { id: 'mathbuddy_dialogue', titleEn: 'MathBuddy AI Math Dialogue', titleVi: 'Hội thoại Toán học cùng MathBuddy AI' }
    ]
  }
};

/**
 * Compute Topic Mastery & Analytics
 */
export function processAnalytics(events = [], legacyProgress = []) {
  // Topic mastery accumulation
  const topicMap = {};
  Object.keys(TOPIC_DEFINITIONS).forEach(tKey => {
    topicMap[tKey] = {
      definition: TOPIC_DEFINITIONS[tKey],
      totalScore: 0,
      totalMaxScore: 0,
      eventCount: 0,
      completedCount: 0,
      objectivesEvidence: {},
      activities: []
    };
    TOPIC_DEFINITIONS[tKey].objectives.forEach(obj => {
      topicMap[tKey].objectivesEvidence[obj.id] = {
        objective: obj,
        evidenceCount: 0,
        totalScore: 0,
        totalMaxScore: 0,
        lastAssessed: null
      };
    });
  });

  // Language skills accumulation
  const languageSkills = {
    listening: { nameEn: 'Listening', nameVi: 'Nghe hiểu', icon: '🎧', events: [], method: 'audio_comprehension' },
    speaking: { nameEn: 'Speaking', nameVi: 'Nói & Phát âm', icon: '🎙️', events: [], method: 'web_speech_rec' },
    reading: { nameEn: 'Reading', nameVi: 'Đọc hiểu & Từ vựng', icon: '📖', events: [], method: 'quiz_reading' },
    writing: { nameEn: 'Writing', nameVi: 'Viết & Diễn đạt', icon: '✍️', events: [], method: 'math_explanation_eval' }
  };

  // Combine legacy progress into events if applicable
  const allEvents = [...events];
  legacyProgress.forEach(lp => {
    if (lp.topicId && !allEvents.some(e => e.activityId === lp.topicId && e.assessedAt === lp.completedAt)) {
      allEvents.push({
        eventId: 'legacy_' + (lp.id || Math.random()),
        topicId: lp.topicId,
        activityId: lp.topicId,
        sourceModule: 'topics_library',
        learningObjectiveIds: [lp.topicId],
        score: lp.score || 0,
        maxScore: 100,
        attempts: 1,
        completionStatus: lp.status || 'completed',
        assessedAt: lp.completedAt || new Date().toISOString(),
        assessmentMethod: 'quiz_reading',
        confidence: 'medium'
      });
    }
  });

  // Process all events
  allEvents.forEach(evt => {
    const tKey = evt.topicId && topicMap[evt.topicId] ? evt.topicId : 'chapter1';
    const topic = topicMap[tKey];

    topic.eventCount++;
    topic.totalScore += (evt.score || 0);
    topic.totalMaxScore += (evt.maxScore || 100);
    if (evt.completionStatus === 'completed') {
      topic.completedCount++;
    }
    topic.activities.push(evt);

    // Objective mapping
    const objIds = Array.isArray(evt.learningObjectiveIds) ? evt.learningObjectiveIds : [];
    objIds.forEach(objId => {
      if (topic.objectivesEvidence[objId]) {
        const oe = topic.objectivesEvidence[objId];
        oe.evidenceCount++;
        oe.totalScore += (evt.score || 0);
        oe.totalMaxScore += (evt.maxScore || 100);
        oe.lastAssessed = evt.assessedAt;
      }
    });

    // Language skills evidence
    if (evt.skillEvidence) {
      Object.keys(evt.skillEvidence).forEach(sKey => {
        if (languageSkills[sKey]) {
          languageSkills[sKey].events.push({
            ...evt.skillEvidence[sKey],
            assessedAt: evt.assessedAt,
            activityId: evt.activityId
          });
        }
      });
    }

    // Default skill mapping based on activity type
    if (evt.sourceModule === 'mathbuddy_ai') {
      languageSkills.speaking.events.push({ score: evt.score || 85, assessedAt: evt.assessedAt, method: 'web_speech_rec' });
      languageSkills.listening.events.push({ score: evt.score || 90, assessedAt: evt.assessedAt, method: 'audio_comprehension' });
    } else if (evt.assessmentMethod === 'quiz_reading' || evt.sourceModule === 'topics_library') {
      languageSkills.reading.events.push({ score: evt.score || 80, assessedAt: evt.assessedAt, method: 'quiz_reading' });
    }
  });

  // Calculate Topic Mastery
  const topicMasteryList = Object.keys(topicMap).map(tKey => {
    const topic = topicMap[tKey];
    let avgScorePercent = topic.totalMaxScore > 0 ? Math.round((topic.totalScore / topic.totalMaxScore) * 100) : null;
    
    let masteryLevel = 'unassessed';
    let masteryLabelEn = 'Not Enough Evidence';
    let masteryLabelVi = 'Chưa đủ dữ liệu';
    let badgeClass = 'badge-unassessed';

    if (topic.eventCount === 0 || avgScorePercent === null) {
      masteryLevel = 'unassessed';
      masteryLabelEn = 'Not Enough Evidence';
      masteryLabelVi = 'Chưa đủ dữ liệu đánh giá';
      badgeClass = 'bg-slate-700/80 text-slate-300 border-slate-600';
    } else if (avgScorePercent < 50) {
      masteryLevel = 'beginning';
      masteryLabelEn = 'Beginning';
      masteryLabelVi = 'Mới bắt đầu';
      badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    } else if (avgScorePercent < 75) {
      masteryLevel = 'developing';
      masteryLabelEn = 'Developing';
      masteryLabelVi = 'Đang phát triển';
      badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    } else if (avgScorePercent < 90) {
      masteryLevel = 'proficient';
      masteryLabelEn = 'Proficient';
      masteryLabelVi = 'Thành thạo';
      badgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    } else {
      masteryLevel = 'mastered';
      masteryLabelEn = 'Highly Proficient 🌟';
      masteryLabelVi = 'Thành thạo xuất sắc 🌟';
      badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }

    // Process objective details
    const processedObjectives = Object.keys(topic.objectivesEvidence).map(objId => {
      const oe = topic.objectivesEvidence[objId];
      const objScorePercent = oe.totalMaxScore > 0 ? Math.round((oe.totalScore / oe.totalMaxScore) * 100) : null;
      return {
        id: objId,
        titleEn: oe.objective.titleEn,
        titleVi: oe.objective.titleVi,
        evidenceCount: oe.evidenceCount,
        scorePercent: objScorePercent,
        lastAssessed: oe.lastAssessed
      };
    });

    return {
      topicId: tKey,
      definition: topic.definition,
      avgScorePercent,
      eventCount: topic.eventCount,
      completedCount: topic.completedCount,
      masteryLevel,
      masteryLabelEn,
      masteryLabelVi,
      badgeClass,
      objectives: processedObjectives,
      recentActivity: topic.activities[topic.activities.length - 1] || null
    };
  });

  // Calculate 4 English Skills
  const processedSkills = Object.keys(languageSkills).map(sKey => {
    const skill = languageSkills[sKey];
    const evts = skill.events;

    if (evts.length === 0) {
      return {
        key: sKey,
        nameEn: skill.nameEn,
        nameVi: skill.nameVi,
        icon: skill.icon,
        isAssessed: false,
        scorePercent: null,
        evidenceCount: 0,
        statusEn: 'Not Assessed Yet',
        statusVi: 'Chưa được đánh giá',
        reliability: 'N/A',
        assessmentMethod: skill.method,
        suggestedNextEn: `Try a ${skill.nameEn} activity or MathBuddy AI to earn evidence!`,
        suggestedNextVi: `Thử hoạt động ${skill.nameVi} hoặc trò chuyện với MathBuddy AI để nhận đánh giá!`
      };
    }

    const totalScore = evts.reduce((sum, e) => sum + (e.score || 0), 0);
    const avgScore = Math.round(totalScore / evts.length);
    const reliability = evts.length >= 5 ? 'High' : evts.length >= 2 ? 'Medium' : 'Low';

    let suggestedNextEn = `Practice more ${skill.nameEn} to boost fluency.`;
    let suggestedNextVi = `Luyện tập thêm kỹ năng ${skill.nameVi} để tăng sự tự tin.`;

    if (sKey === 'speaking') {
      suggestedNextEn = 'Talk with MathBuddy AI about Mixed Numbers or Geometry!';
      suggestedNextVi = 'Trò chuyện cùng MathBuddy AI về Hỗn số hoặc Hình học!';
    } else if (sKey === 'reading') {
      suggestedNextEn = 'Explore the Topics Library word cards and reading quizzes.';
      suggestedNextVi = 'Khám phá Thư viện Chủ đề và thực hiện bài tập đọc hiểu.';
    } else if (sKey === 'writing') {
      suggestedNextEn = 'Solve fill-in-the-blank unit conversion problems in Math Lab.';
      suggestedNextVi = 'Giải các bài tập điền từ quy đổi đơn vị trong Math Lab.';
    } else if (sKey === 'listening') {
      suggestedNextEn = 'Listen to MathBuddy voice prompts and practice pronunciation.';
      suggestedNextVi = 'Lắng nghe giọng nói MathBuddy AI và phát âm theo.';
    }

    return {
      key: sKey,
      nameEn: skill.nameEn,
      nameVi: skill.nameVi,
      icon: skill.icon,
      isAssessed: true,
      scorePercent: avgScore,
      evidenceCount: evts.length,
      statusEn: `${avgScore}% Proficiency`,
      statusVi: `Đạt ${avgScore}% Mức độ thành thạo`,
      reliability,
      assessmentMethod: skill.method,
      suggestedNextEn,
      suggestedNextVi
    };
  });

  // Generate Smart Recommendations
  const recommendations = [];

  // Find unmastered or unassessed topics
  topicMasteryList.forEach(tm => {
    if (tm.masteryLevel === 'unassessed' || tm.masteryLevel === 'beginning' || tm.masteryLevel === 'developing') {
      if (tm.topicId === 'chapter1') {
        recommendations.push({
          id: 'rec_mixed_num',
          titleEn: 'Explore Mixed Numbers Lesson & RACI Adventure Game',
          titleVi: 'Khám phá Bài học Hỗn số & Trò chơi RACI Adventure',
          descEn: 'Master mixed number concepts and improper fraction conversions with visual models.',
          descVi: 'Nắm vững khái niệm hỗn số và quy đổi phân số với mô hình trực quan.',
          actionHash: '#lesson_mixed_numbers',
          actionTextEn: 'Start Mixed Numbers Lesson',
          actionTextVi: 'Bắt đầu bài học Hỗn số',
          badge: 'High Priority'
        });
      } else if (tm.topicId === 'chapter4') {
        recommendations.push({
          id: 'rec_geometry',
          titleEn: 'Interactive 3D Geometry & Unit Conversion Studio',
          titleVi: 'Xưởng Hình học 3D & Quy đổi đơn vị m², ha, km²',
          descEn: 'Build spatial 3D shapes and calculate land areas in hectares and square kilometres.',
          descVi: 'Thao tác hình 3D và tính diện tích đất đai theo héc-ta, km².',
          actionHash: '#mathlab',
          actionTextEn: 'Open 3D Shape Studio',
          actionTextVi: 'Mở Xưởng Hình học 3D',
          badge: 'Recommended'
        });
      }
    }
  });

  // Always offer MathBuddy recommendation
  recommendations.push({
    id: 'rec_mathbuddy',
    titleEn: 'Practice Math English Speaking with MathBuddy AI',
    titleVi: 'Luyện nói Tiếng Anh Toán học cùng MathBuddy AI',
    descEn: 'Chat about fractions, decimals, or geometry in interactive TALK or ROLE-PLAY modes.',
    descVi: 'Trò chuyện bằng tiếng Anh về phân số, số thập phân hoặc hình học.',
    actionHash: '#mathbuddy',
    actionTextEn: 'Chat with MathBuddy AI',
    actionTextVi: 'Nói chuyện với MathBuddy',
    badge: 'Interactive AI'
  });

  // Calculate Overall Progress Overview
  const assessedTopics = topicMasteryList.filter(t => t.masteryLevel !== 'unassessed');
  const overallMasteryPercent = assessedTopics.length > 0
    ? Math.round(assessedTopics.reduce((s, t) => s + (t.avgScorePercent || 0), 0) / assessedTopics.length)
    : 0;

  return {
    overall: {
      totalEvents: allEvents.length,
      topicsStudied: assessedTopics.length,
      overallMasteryPercent,
      totalEvidenceItems: allEvents.length
    },
    topicMasteryList,
    processedSkills,
    recommendations
  };
}
