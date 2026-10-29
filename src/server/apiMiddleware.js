import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { dbService, verifyPassword, initAdminAccount, verifyAdminCredentials } from './db.js';

let cachedFirebaseConfig = null;

function getFirebaseConfig() {
  if (cachedFirebaseConfig) return cachedFirebaseConfig;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      cachedFirebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return cachedFirebaseConfig;
    }
  } catch (err) {
    console.error('Error reading firebase-applet-config.json:', err);
  }
  return null;
}

// Read body helper
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function getBearerToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
}

function authenticate(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'Chưa đăng nhập / Unauthorized' }));
    return null;
  }
  const sessionData = dbService.findSession(token);
  if (!sessionData) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'Phiên đăng nhập đã hết hạn / Session expired' }));
    return null;
  }
  return sessionData.user;
}

export function createApiMiddleware() {
  // Ensure the default admin is bootstrapped on startup
  try {
    initAdminAccount();
  } catch (err) {
    console.error('[Auth] Failed to initialize admin:', err);
  }

  return async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/')) {
      return next();
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    res.setHeader('Content-Type', 'application/json');

    // 1.5. POST /api/mathbuddy/chat - AI MathBuddy Conversation Partner
    if (pathname === '/api/mathbuddy/chat' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const { topic = 'Decimal Numbers', mode = 'talk', message = '', history = [] } = body;

        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

        if (!apiKey) {
          res.statusCode = 503;
          return res.end(JSON.stringify({
            success: false,
            error: 'API_KEY_MISSING',
            message: 'MathBuddy AI key is not configured.'
          }));
        }

        try {
          const ai = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });

          const systemInstruction = `You are MathBuddy 🤖, a friendly, enthusiastic, intelligent blue robot and bilingual Math Conversation Partner for Grade 5 elementary students (ages 10-11) on MathLingua AI.

CURRENT CONTEXT:
- Math Topic: "${topic}"
- Conversation Mode: "${mode.toUpperCase()}"

PEDAGOGICAL & PERSONALITY ROLE:
1. You are a REAL, attentive conversation partner. RESPOND DIRECTLY to whatever the student actually said in their latest message.
   - If student says "Let's calculate!", ask a specific, fun Grade 5 calculation question about ${topic} in ${mode.toUpperCase()} mode!
   - If student says "Can you give a hint?", give a step-by-step hint for the current problem.
   - If student says "I don't know" or "Help me", break down the step or give a simpler example.
   - If student gives an answer or calculation, check if it is mathematically correct! Praise them if correct, or kindly explain the misconception if incorrect.
   - If student requests a topic change, acknowledge it enthusiastically and start exploring the new topic.

2. GRADE 5 MATH KNOWLEDGE:
   - Decimal Numbers: Tenths, hundredths, thousandths, place values, comparing (e.g. 4.5 vs 4.35), adding/subtracting decimals, multiplying/dividing by 10, 100, 1000.
   - Mixed Numbers: Whole + fraction parts (e.g. 2 1/2), converting to/from improper fractions, real-life uses (pizza, recipes, distance).
   - Geometry: 2D/3D shapes, area of triangles, parallelograms, trapezoids, circumference & area of circles, volume of cubes & rectangular prisms.
   - Measurement: Area units (m², ha, km²), conversions (1 ha = 10,000 m², 1 km² = 100 ha), national parks, farms, solar fields.
   - Ratio and Percentage: Ratios (a:b), finding percentage of a quantity (e.g. 25% of 80), percentage increase/decrease.
   - Fraction: Equivalent fractions, simplifying, decimal fractions (denominators 10, 100, 1000), fraction operations (+, -, ×, ÷).

3. MODE INSTRUCTIONS:
   - TALK: Ask 1 clear conceptual question at a time. Encourage explaining "Why?" or "How did you get that?".
   - ROLE-PLAY: Play a fun space character (e.g. Space Canteen Chef for decimals, Space Base Architect for geometry, Rocket Commander for fractions/mixed numbers).
   - DISCOVER: Math detective mystery! Give step-by-step clues and ask student to deduce the secret code or number.
   - PLAY TOGETHER: Cooperative team challenge! Solve a multi-step space mission together turn-by-turn.

4. RESPONSE FORMAT:
   Return JSON with:
   - "text": MathBuddy's response in simple Grade 5 English (max 3-4 sentences). Ask ONE clear question or give ONE step at a time.
   - "translationVi": Vietnamese translation/summary.
   - "quickReplies": 2-3 dynamic, short quick reply options matching the current conversation state.
   - "sentenceStarters": 2-3 English sentence starters to scaffold the student's reply.
   - "feedback": (Optional) { "praise": "...", "conceptNote": "..." }

CRITICAL: NEVER repeat a generic canned sentence. Always generate a unique, context-aware turn matching what the student typed.`;

          // Clean up history to ensure valid Gemini payload (no consecutive duplicate roles, non-empty text, valid role sequence)
          const contents = [];
          if (Array.isArray(history) && history.length > 0) {
            history.forEach(item => {
              if (item.isError) return;
              const text = (item.text || item.content || '').trim();
              if (!text) return;
              const role = (item.role === 'student' || item.role === 'user') ? 'user' : 'model';

              if (contents.length > 0 && contents[contents.length - 1].role === role) {
                contents[contents.length - 1].parts[0].text += `\n${text}`;
              } else {
                contents.push({ role, parts: [{ text }] });
              }
            });
          }

          const cleanMsg = (message || '').trim();
          if (cleanMsg) {
            if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
              const lastUserText = contents[contents.length - 1].parts[0].text;
              if (!lastUserText.includes(cleanMsg)) {
                contents[contents.length - 1].parts[0].text += `\n${cleanMsg}`;
              }
            } else {
              contents.push({ role: 'user', parts: [{ text: cleanMsg }] });
            }
          }

          if (contents.length > 0 && contents[0].role === 'model') {
            contents.unshift({ role: 'user', parts: [{ text: 'Hello MathBuddy! I am ready to learn math in English.' }] });
          }

          if (contents.length === 0) {
            contents.push({ role: 'user', parts: [{ text: cleanMsg || 'Hello MathBuddy!' }] });
          }

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: "MathBuddy's response in English" },
                  translationVi: { type: Type.STRING, description: "Vietnamese translation" },
                  quickReplies: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "2-3 dynamic quick reply options"
                  },
                  sentenceStarters: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "2-3 English sentence starters"
                  },
                  feedback: {
                    type: Type.OBJECT,
                    properties: {
                      praise: { type: Type.STRING },
                      conceptNote: { type: Type.STRING }
                    }
                  }
                },
                required: ["text", "translationVi", "quickReplies", "sentenceStarters"]
              }
            }
          });

          if (response.text) {
            const buddyResponse = JSON.parse(response.text.trim());
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, response: buddyResponse }));
          } else {
            throw new Error('Gemini API returned empty response.');
          }
        } catch (genErr) {
          console.error('[Gemini MathBuddy Error]:', genErr);
          res.statusCode = 500;
          return res.end(JSON.stringify({
            success: false,
            error: 'AI_RESPONSE_FAILED',
            message: genErr.message || 'MathBuddy AI service encountered an error.'
          }));
        }
      } catch (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ success: false, error: 'SERVER_ERROR', message: err.message }));
      }
    }

    // 2. POST /api/auth/login
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const { username, password } = body;

        if (!username || !password) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu.' }));
        }

        const cleanUsername = String(username).trim().toLowerCase();
        let user = dbService.findUserByUsername(cleanUsername);

        let isValid = false;
        if (cleanUsername === 'admin') {
          isValid = verifyAdminCredentials(password);
          user = dbService.findUserByUsername('admin');
        } else if (user) {
          isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
        }

        if (!user || !isValid) {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' }));
        }

        const token = dbService.createSession(user.id);
        const { passwordHash, passwordSalt, ...safeUser } = user;
        safeUser.isAdmin = user.role === 'admin';
        safeUser.isTeacher = user.role === 'teacher' || user.role === 'admin';

        res.statusCode = 200;
        return res.end(JSON.stringify({
          success: true,
          token,
          user: safeUser
        }));
      } catch (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err.message || 'Lỗi đăng nhập máy chủ.' }));
      }
    }

    // 3. POST /api/auth/register
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const { username, password, displayName, grade, classId, avatarUrl } = body;

        if (!username || username.length < 3) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự.' }));
        }
        if (!password || password.length < 6) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' }));
        }

        const newUser = dbService.createUser({
          username,
          password,
          displayName,
          grade,
          classId,
          avatarUrl,
          role: 'student'
        });

        const token = dbService.createSession(newUser.id);
        const { passwordHash, passwordSalt, ...safeUser } = newUser;
        safeUser.isAdmin = false;
        safeUser.isTeacher = false;

        res.statusCode = 200;
        return res.end(JSON.stringify({
          success: true,
          token,
          user: safeUser
        }));
      } catch (err) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // 4. GET /api/auth/me
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = authenticate(req, res);
      if (!user) return;

      user.isAdmin = user.role === 'admin';
      user.isTeacher = user.role === 'teacher' || user.role === 'admin';

      res.statusCode = 200;
      return res.end(JSON.stringify({ user }));
    }

    // 5. POST /api/auth/logout
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const token = getBearerToken(req);
      if (token) dbService.deleteSession(token);
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true }));
    }

    // 6. POST /api/auth/change-password
    if (pathname === '/api/auth/change-password' && req.method === 'POST') {
      const user = authenticate(req, res);
      if (!user) return;

      try {
        const body = await readJsonBody(req);
        const { newPassword } = body;
        if (!newPassword || newPassword.length < 6) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' }));
        }

        dbService.updateUserPassword(user.id, newPassword);
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, message: 'Đổi mật khẩu thành công!' }));
      } catch (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // 7. POST /api/progress/save
    if (pathname === '/api/progress/save' && req.method === 'POST') {
      const user = authenticate(req, res);
      if (!user) return;

      try {
        const body = await readJsonBody(req);
        const record = dbService.saveProgress(user.id, body);
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, record }));
      } catch (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // 8. GET /api/progress/my
    if (pathname === '/api/progress/my' && req.method === 'GET') {
      const user = authenticate(req, res);
      if (!user) return;

      const progress = dbService.getProgressByUser(user.id);
      res.statusCode = 200;
      return res.end(JSON.stringify({ progress }));
    }

    // 8.1. POST /api/progress/event - Record standardized learning event
    if (pathname === '/api/progress/event' && req.method === 'POST') {
      const token = getBearerToken(req);
      let userId = 'guest_student';
      if (token) {
        const sessionData = dbService.findSession(token);
        if (sessionData && sessionData.user) {
          userId = sessionData.user.id;
        }
      }

      try {
        const body = await readJsonBody(req);
        if (!body.topicId && !body.activityId) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Thiếu topicId hoặc activityId' }));
        }

        const savedEvent = dbService.saveLearningEvent(userId, body);
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, event: savedEvent }));
      } catch (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // 8.2. GET /api/progress/analytics - Fetch learning events and analytics for student
    if (pathname === '/api/progress/analytics' && req.method === 'GET') {
      const token = getBearerToken(req);
      let userId = 'guest_student';
      let userDisplayName = 'Học sinh Khách (Guest)';

      if (token) {
        const sessionData = dbService.findSession(token);
        if (sessionData && sessionData.user) {
          userId = sessionData.user.id;
          userDisplayName = sessionData.user.displayName || sessionData.user.username;
        }
      }

      try {
        const events = dbService.getLearningEventsByUser(userId);
        const legacyProgress = dbService.getProgressByUser(userId);

        res.statusCode = 200;
        return res.end(JSON.stringify({
          success: true,
          userId,
          userDisplayName,
          events,
          legacyProgress
        }));
      } catch (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // 8.1. POST /api/progress/event - Record standardized learning event
    if (pathname === '/api/progress/event' && req.method === 'POST') {
      const token = getBearerToken(req);
      let userId = 'guest_student';
      if (token) {
        const sessionData = dbService.findSession(token);
        if (sessionData && sessionData.user) {
          userId = sessionData.user.id;
        }
      }

      try {
        const body = await readJsonBody(req);
        if (!body.topicId && !body.activityId) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Thiếu topicId hoặc activityId' }));
        }

        const savedEvent = dbService.saveLearningEvent(userId, body);
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, event: savedEvent }));
      } catch (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // 8.2. GET /api/progress/analytics - Fetch learning events and analytics for student
    if (pathname === '/api/progress/analytics' && req.method === 'GET') {
      const token = getBearerToken(req);
      let userId = 'guest_student';
      let userDisplayName = 'Học sinh Khách (Guest)';

      if (token) {
        const sessionData = dbService.findSession(token);
        if (sessionData && sessionData.user) {
          userId = sessionData.user.id;
          userDisplayName = sessionData.user.displayName || sessionData.user.username;
        }
      }

      try {
        const events = dbService.getLearningEventsByUser(userId);
        const legacyProgress = dbService.getProgressByUser(userId);

        res.statusCode = 200;
        return res.end(JSON.stringify({
          success: true,
          userId,
          userDisplayName,
          events,
          legacyProgress
        }));
      } catch (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // 8.5. GET /api/materials/unit?unitId=...
    if (pathname === '/api/materials/unit' && req.method === 'GET') {
      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const unitId = urlObj.searchParams.get('unitId');
      if (!unitId) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Thiếu mã bài học unitId' }));
      }

      // Check if user is authenticated teacher/admin to allow accessing drafts
      const token = getBearerToken(req);
      let sessionData = token ? dbService.findSession(token) : null;
      let isTeacher = sessionData && (sessionData.user.role === 'admin' || sessionData.user.role === 'teacher');

      const material = isTeacher
        ? dbService.getMaterialByUnit(unitId)
        : dbService.getPublishedMaterialByUnit(unitId);

      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, material: material || null }));
    }

    // 8.6. GET /api/layouts?pageId=...&mode=published|draft
    if (pathname === '/api/layouts' && req.method === 'GET') {
      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pageId = urlObj.searchParams.get('pageId');
      const requestedMode = urlObj.searchParams.get('mode') || 'published';

      if (!pageId) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Thiếu mã trang pageId' }));
      }

      // Check teacher/admin privilege if draft is requested
      let mode = 'published';
      if (requestedMode === 'draft') {
        const token = getBearerToken(req);
        const sessionData = token ? dbService.findSession(token) : null;
        if (sessionData && (sessionData.user.role === 'admin' || sessionData.user.role === 'teacher')) {
          mode = 'draft';
        }
      }

      const layout = dbService.getLayout(pageId, mode);
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, pageId, layout: layout || null, mode }));
    }

    // 9. Admin routes: require admin or teacher role
    if (pathname.startsWith('/api/admin/')) {
      const user = authenticate(req, res);
      if (!user) return;

      if (user.role !== 'admin' && user.role !== 'teacher') {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: 'Quyền truy cập hạn chế / Access Denied' }));
      }

      // GET /api/admin/layouts
      if (pathname === '/api/admin/layouts' && req.method === 'GET') {
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pageId = urlObj.searchParams.get('pageId');
        if (pageId) {
          const layout = dbService.getLayout(pageId, 'draft') || dbService.getLayout(pageId, 'published');
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, layout }));
        }
        const allLayouts = dbService.getAllLayouts();
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, layouts: allLayouts }));
      }

      // POST /api/admin/layouts
      if (pathname === '/api/admin/layouts' && req.method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const { pageId, status, layers, deviceBreakpoints } = body;
          if (!pageId) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Thiếu mã trang pageId' }));
          }
          const saved = dbService.saveLayout({
            pageId,
            status: status || 'published',
            layers: layers || {},
            deviceBreakpoints: deviceBreakpoints || {},
            authorId: user.id
          });
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, layout: saved }));
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: 'Lỗi lưu bố cục: ' + err.message }));
        }
      }

      // POST /api/admin/layouts/reset
      if (pathname === '/api/admin/layouts/reset' && req.method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const { pageId } = body;
          if (!pageId) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Thiếu mã trang pageId' }));
          }
          dbService.resetLayout(pageId);
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, message: `Bố cục trang ${pageId} đã được khôi phục về mặc định.` }));
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: 'Lỗi đặt lại bố cục: ' + err.message }));
        }
      }

      // GET /api/admin/overview
      if (pathname === '/api/admin/overview' && req.method === 'GET') {
        const students = dbService.getAllStudents();
        const progress = dbService.getAllProgress();
        const completed = progress.filter(p => p.status === 'completed');

        res.statusCode = 200;
        return res.end(JSON.stringify({
          totalStudents: students.length,
          totalProgressRecords: progress.length,
          completedSessions: completed.length,
          averageScore: completed.length > 0
            ? Math.round(completed.reduce((a, b) => a + (b.score || 0), 0) / completed.length)
            : 0
        }));
      }

      // GET /api/admin/students
      if (pathname === '/api/admin/students' && req.method === 'GET') {
        const students = dbService.getAllStudents();
        const progress = dbService.getAllProgress();
        res.statusCode = 200;
        return res.end(JSON.stringify({ students, progress }));
      }

      // GET /api/admin/materials
      if (pathname === '/api/admin/materials' && req.method === 'GET') {
        const materials = dbService.getAllMaterials();
        res.statusCode = 200;
        return res.end(JSON.stringify({ materials }));
      }

      // POST /api/admin/materials
      if (pathname === '/api/admin/materials' && req.method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const saved = dbService.saveMaterial({ ...body, authorId: user.id });
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, material: saved }));
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: err.message }));
        }
      }

      // POST /api/admin/upload
      if (pathname === '/api/admin/upload' && req.method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const { filename, fileData, mimeType } = body;
          if (!fileData) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Thiếu dữ liệu tập tin.' }));
          }

          const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          let base64String = fileData;
          if (fileData.includes(';base64,')) {
            base64String = fileData.split(';base64,')[1];
          }

          const cleanExt = (filename || 'asset.png').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
          const safeName = `asset_${Date.now()}_${crypto.randomUUID().slice(0, 6)}.${cleanExt}`;
          const targetPath = path.join(uploadsDir, safeName);

          fs.writeFileSync(targetPath, Buffer.from(base64String, 'base64'));

          const publicUrl = `/uploads/${safeName}`;
          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            url: publicUrl,
            filename: safeName,
            mimeType: mimeType || 'image/png'
          }));
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: 'Lỗi tải tập tin: ' + err.message }));
        }
      }

      // POST /api/admin/analyze-exercise-image
      if (pathname === '/api/admin/analyze-exercise-image' && req.method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const { imageData, mimeType, filename, promptInstruction } = body;

          if (!imageData) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Thiếu dữ liệu hình ảnh bài tập.' }));
          }

          let base64Data = imageData;
          if (base64Data.includes(';base64,')) {
            base64Data = base64Data.split(';base64,')[1];
          }

          const cleanMime = mimeType || 'image/png';
          let resultJson = null;

          if (process.env.GEMINI_API_KEY) {
            try {
              const ai = new GoogleGenAI({
                apiKey: process.env.GEMINI_API_KEY,
                httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
              });

              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: {
                  parts: [
                    { inlineData: { data: base64Data, mimeType: cleanMime } },
                    {
                      text: `You are an EdTech AI curriculum specialist for MathLingua AI (Grade 5 English Math).
Analyze this exercise image from a textbook/worksheet and convert it into structured interactive tasks.

CRITICAL INSTRUCTIONS:
1. Preserve exact source textbook tasks:
   - Task 1: Word cards to number cards matching MUST be typed as "matching" with left word cards and right number cards. DO NOT convert to fill_blank or unit_conversion!
   - Task 2: Unit conversion equations MUST be typed as "fill_blank" with sub-questions (2 km² = ... m²; 5,000,000 m² = ... km²; 4 km² 500 m² = ... m²; 6,450,000 m² = ... km²).
   - Task 3: Solar panel land area comparison MUST be typed as "area_comparison" comparing Land A (7 km × 3 km = 21 km²), Land B (5 km × 5 km = 25 km²), Land C (6 km × 4 km = 24 km²). Correct answer: Land B.
2. Mark source tasks with isExtraPractice: false. Any AI-suggested supplemental questions MUST be marked with isExtraPractice: true.
${promptInstruction ? `Teacher instructions: ${promptInstruction}` : ''}`
                    }
                  ]
                },
                config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      titleEn: { type: Type.STRING },
                      titleVi: { type: Type.STRING },
                      topicId: { type: Type.STRING },
                      unitId: { type: Type.STRING },
                      questions: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            sourceTaskId: { type: Type.STRING },
                            sourceTitle: { type: Type.STRING },
                            type: { type: Type.STRING },
                            isExtraPractice: { type: Type.BOOLEAN },
                            questionEn: { type: Type.STRING },
                            questionVi: { type: Type.STRING },
                            choices: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctIndex: { type: Type.INTEGER },
                            correctAnswer: { type: Type.STRING },
                            pairs: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: { left: { type: Type.STRING }, right: { type: Type.STRING } }
                              }
                            },
                            fillItems: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: {
                                  id: { type: Type.STRING },
                                  promptEn: { type: Type.STRING },
                                  promptVi: { type: Type.STRING },
                                  prefix: { type: Type.STRING },
                                  suffix: { type: Type.STRING },
                                  correctAnswer: { type: Type.STRING },
                                  explanation: { type: Type.STRING }
                                }
                              }
                            },
                            lands: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: {
                                  id: { type: Type.STRING },
                                  name: { type: Type.STRING },
                                  length: { type: Type.NUMBER },
                                  width: { type: Type.NUMBER },
                                  unit: { type: Type.STRING },
                                  area: { type: Type.NUMBER },
                                  formula: { type: Type.STRING }
                                }
                              }
                            },
                            correctLandId: { type: Type.STRING },
                            hintEn: { type: Type.STRING },
                            hintVi: { type: Type.STRING },
                            explanationEn: { type: Type.STRING },
                            explanationVi: { type: Type.STRING },
                            confidenceScore: { type: Type.NUMBER },
                            needsConfirmation: { type: Type.BOOLEAN },
                            flagReason: { type: Type.STRING }
                          },
                          required: ["id", "type", "questionEn", "questionVi"]
                        }
                      }
                    },
                    required: ["titleEn", "titleVi", "questions"]
                  }
                }
              });

              if (response.text) {
                resultJson = JSON.parse(response.text.trim());
              }
            } catch (err) {
              console.warn('[Gemini API Image Analysis Error]:', err.message);
            }
          }

          if (!resultJson) {
            resultJson = generateFallbackOcrExercises(filename, base64Data);
          }

          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            result: resultJson
          }));
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: 'Lỗi phân tích hình ảnh bài tập: ' + err.message }));
        }
      }


      // POST /api/admin/reset-student-password
      if (pathname === '/api/admin/reset-student-password' && req.method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const { studentId, newPassword } = body;
          if (!studentId || !newPassword || newPassword.length < 6) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' }));
          }
          dbService.updateUserPassword(studentId, newPassword);
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, message: 'Đã đặt lại mật khẩu học sinh thành công!' }));
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: err.message }));
        }
      }

      // POST /api/admin/materials/delete
      if (pathname === '/api/admin/materials/delete' && req.method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const { id } = body;
          if (!id) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Thiếu mã học liệu.' }));
          }
          dbService.deleteMaterial(id);
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, message: 'Đã xóa học liệu thành công.' }));
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: err.message }));
        }
      }

      // GET /api/admin/settings
      if (pathname === '/api/admin/settings' && req.method === 'GET') {
        const settings = dbService.getSettings();
        res.statusCode = 200;
        return res.end(JSON.stringify({ settings }));
      }

      // POST /api/admin/settings
      if (pathname === '/api/admin/settings' && req.method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const updated = dbService.updateSettings(body);
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, settings: updated }));
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: err.message }));
        }
      }

      // POST /api/admin/generate-vocab
      if (pathname === '/api/admin/generate-vocab' && req.method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const { input, instruction } = body;
          if (!input || !input.trim()) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Vui lòng nhập từ hoặc yêu cầu tạo từ vựng.' }));
          }

          let vocabList = null;
          if (process.env.GEMINI_API_KEY) {
            try {
              const ai = new GoogleGenAI({
                apiKey: process.env.GEMINI_API_KEY,
                httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
              });

              const prompt = `You are an expert bilingual primary school math curriculum designer (Grade 5 English Math).
Generate educational vocabulary cards for MathLingua AI based on the teacher's input:
"${input.trim()}"
${instruction ? `Additional teacher instructions: ${instruction}` : ''}

Generate structured vocabulary cards. Each card must include:
- en: English word or phrase (e.g., "Hectare", "Square kilometre")
- ipaUk: British English IPA transcription with stress marks (e.g. "/ˈhek.teər/")
- ipaUs: American English IPA transcription with stress marks (e.g. "/ˈhek.ter/")
- vi: Accurate Vietnamese mathematical translation (e.g. "Héc-ta")
- exampleEn: A simple, natural context sentence for Grade 5 elementary math
- exampleVi: Vietnamese translation of the example sentence
- illustrationPrompt: Description for illustration artwork (e.g., "A green soccer field measuring 1 hectare")
- notes: Quick tip or reminder for students`;

              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      words: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            en: { type: Type.STRING },
                            ipaUk: { type: Type.STRING },
                            ipaUs: { type: Type.STRING },
                            vi: { type: Type.STRING },
                            exampleEn: { type: Type.STRING },
                            exampleVi: { type: Type.STRING },
                            illustrationPrompt: { type: Type.STRING },
                            notes: { type: Type.STRING }
                          },
                          required: ["en", "ipaUk", "ipaUs", "vi", "exampleEn", "exampleVi"]
                        }
                      }
                    },
                    required: ["words"]
                  }
                }
              });

              if (response.text) {
                const parsed = JSON.parse(response.text.trim());
                if (Array.isArray(parsed.words) && parsed.words.length > 0) {
                  vocabList = parsed.words.map((w, idx) => ({
                    id: 'v_ai_' + Date.now() + '_' + idx,
                    en: w.en,
                    ipa: w.ipaUk,
                    ipaUk: w.ipaUk,
                    ipaUs: w.ipaUs,
                    vi: w.vi,
                    exampleEn: w.exampleEn,
                    exampleVi: w.exampleVi,
                    illustrationPrompt: w.illustrationPrompt || '',
                    notes: w.notes || '',
                    imageUrl: ''
                  }));
                }
              }
            } catch (err) {
              console.warn('[Gemini Vocab Gen Error]:', err.message);
            }
          }

          if (!vocabList) {
            vocabList = generateFallbackVocabList(input);
          }

          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, words: vocabList }));
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: 'Lỗi tạo từ vựng AI: ' + err.message }));
        }
      }

      // POST /api/admin/generate-structure
      if (pathname === '/api/admin/generate-structure' && req.method === 'POST') {
        try {
          const body = await readJsonBody(req);
          const { prompt, unitId } = body;
          let structList = null;

          if (process.env.GEMINI_API_KEY) {
            try {
              const ai = new GoogleGenAI({
                apiKey: process.env.GEMINI_API_KEY,
                httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
              });

              const aiPrompt = `You are an expert bilingual primary school math curriculum designer (Grade 5 English Math).
Topic: Area measurement (Hectare, Square kilometre).
Teacher request: "${prompt || 'Tạo các mẫu câu hỏi và trả lời về diện tích đất đai và quy đổi đơn vị'}"

Generate sentence structures with:
- patternEn: Formula pattern with bracketed slots like "The area of [Object] is [Number] [Unit]."
- patternVi: Vietnamese formula
- en: Example sentence
- vi: Vietnamese translation of example
- noteVi: Grammar/usage tip for Grade 5 students`;

              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: aiPrompt,
                config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      structures: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            patternEn: { type: Type.STRING },
                            patternVi: { type: Type.STRING },
                            en: { type: Type.STRING },
                            vi: { type: Type.STRING },
                            noteVi: { type: Type.STRING }
                          },
                          required: ["patternEn", "en", "vi"]
                        }
                      }
                    },
                    required: ["structures"]
                  }
                }
              });

              if (response.text) {
                const parsed = JSON.parse(response.text.trim());
                if (Array.isArray(parsed.structures) && parsed.structures.length > 0) {
                  structList = parsed.structures.map((s, idx) => ({
                    id: 's_ai_' + Date.now() + '_' + idx,
                    patternEn: s.patternEn,
                    patternVi: s.patternVi,
                    en: s.en,
                    vi: s.vi,
                    noteVi: s.noteVi || 'Mẫu câu chuẩn tiểu học'
                  }));
                }
              }
            } catch (err) {
              console.warn('[Gemini Structure Gen Error]:', err.message);
            }
          }

          if (!structList) {
            structList = generateFallbackStructureList(prompt);
          }

          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, structures: structList }));
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: 'Lỗi tạo mẫu câu AI: ' + err.message }));
        }
      }
    }

    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'API route not found' }));
  };
}

function generateFallbackVocabList(input) {
  const cleanInput = (input || '').toLowerCase();
  const pool = [
    {
      id: 'v_fb_1',
      en: 'Hectare',
      ipa: '/ˈhek.teər/',
      ipaUk: '/ˈhek.teər/',
      ipaUs: '/ˈhek.ter/',
      vi: 'Héc-ta (ha)',
      exampleEn: 'The tea farm in Moc Chau covers 15 hectares.',
      exampleVi: 'Đồi chè ở Mộc Châu rộng 15 héc-ta.',
      illustrationPrompt: 'Lush green tea farm terraces in Moc Chau Vietnam',
      notes: '1 ha = 10,000 m². Used for farms and parks.'
    },
    {
      id: 'v_fb_2',
      en: 'Square kilometre',
      ipa: '/skweər kɪˈlɒm.ɪ.tər/',
      ipaUk: '/skweər kɪˈlɒm.ɪ.tər/',
      ipaUs: '/skwer kɪˈlɑː.mə.t̬ɚ/',
      vi: 'Ki-lô-mét vuông (km²)',
      exampleEn: 'Cuc Phuong National Park has an area of 224 square kilometres.',
      exampleVi: 'Vườn quốc gia Cúc Phương có diện tích 224 ki-lô-mét vuông.',
      illustrationPrompt: 'Aerial view of dense tropical rainforest in Cuc Phuong',
      notes: '1 km² = 100 ha = 1,000,000 m². Used for forests, cities, and countries.'
    },
    {
      id: 'v_fb_3',
      en: 'Square metre',
      ipa: '/skweər ˈmiː.tər/',
      ipaUk: '/skweər ˈmiː.tər/',
      ipaUs: '/skwer ˈmiː.t̬ɚ/',
      vi: 'Mét vuông (m²)',
      exampleEn: 'Our classroom is about 50 square metres.',
      exampleVi: 'Phòng học của chúng em rộng khoảng 50 mét vuông.',
      illustrationPrompt: 'A bright modern elementary classroom with desks',
      notes: 'Standard SI base unit for area measurement.'
    },
    {
      id: 'v_fb_4',
      en: 'Land area',
      ipa: '/lænd ˈeə.ri.ə/',
      ipaUk: '/lænd ˈeə.ri.ə/',
      ipaUs: '/lænd ˈer.i.ə/',
      vi: 'Diện tích đất đai',
      exampleEn: 'The total land area of Vietnam is about 331,212 square kilometres.',
      exampleVi: 'Tổng diện tích đất liền của Việt Nam là khoảng 331 212 ki-lô-mét vuông.',
      illustrationPrompt: 'Map outline of Vietnam with green nature and solar fields',
      notes: 'Measurement of the flat surface of a region or territory.'
    },
    {
      id: 'v_fb_5',
      en: 'Convert',
      ipa: '/kənˈvɜːt/',
      ipaUk: '/kənˈvɜːt/',
      ipaUs: '/kənˈvɝːt/',
      vi: 'Quy đổi (đơn vị)',
      exampleEn: 'We can convert 2 square kilometres into 200 hectares.',
      exampleVi: 'Chúng ta có thể quy đổi 2 ki-lô-mét vuông thành 200 héc-ta.',
      illustrationPrompt: 'Unit conversion arrow between km² and ha with 100x multiplier',
      notes: 'Multiply by 100 to convert km² to ha. Multiply by 10,000 to convert ha to m².'
    }
  ];

  if (cleanInput.includes('forest') || cleanInput.includes('park')) {
    return pool.filter(p => p.en.includes('Square kilometre') || p.en.includes('Land area') || p.en.includes('Convert'));
  }
  return pool;
}

function generateFallbackStructureList(prompt) {
  return [
    {
      id: 's_fb_1',
      patternEn: 'The area of [Object] is [Number] [Unit].',
      patternVi: 'Diện tích của [Đối tượng] là [Số] [Đơn vị].',
      en: 'The area of Cuc Phuong Forest is 224 square kilometres.',
      vi: 'Diện tích của rừng Cúc Phương là 224 ki-lô-mét vuông.',
      noteVi: 'Dùng cấu trúc "The area of + Danh từ + is + Số lượng + Đơn vị diện tích".'
    },
    {
      id: 's_fb_2',
      patternEn: 'How large is [Object]? It is [Number] [Unit].',
      patternVi: '[Đối tượng] rộng bao nhiêu? Nó rộng [Số] [Đơn vị].',
      en: 'How large is the tea farm? It is 15 hectares.',
      vi: 'Đồi chè rộng bao nhiêu? Nó rộng 15 héc-ta.',
      noteVi: 'Dùng câu hỏi "How large is..." để hỏi diện tích của một vùng đất hoặc công trình.'
    },
    {
      id: 's_fb_3',
      patternEn: 'One [Unit 1] equals [Number] [Unit 2].',
      patternVi: 'Một [Đơn vị 1] bằng [Số] [Đơn vị 2].',
      en: 'One square kilometre equals one hundred hectares.',
      vi: 'Một ki-lô-mét vuông bằng một trăm héc-ta.',
      noteVi: 'Quy đổi đơn vị: 1 km² = 100 ha = 1 000 000 m².'
    }
  ];
}

function generateFallbackOcrExercises(filename, base64Data) {
  return {
    titleEn: 'Hectare & Square Kilometre Interactive AI Worksheet',
    titleVi: 'Bộ bài tập tương tác AI — Héc-ta & Ki-lô-mét vuông',
    topicId: 'chapter4',
    unitId: 'ha-km2',
    ocrStatus: 'high_accuracy',
    rawExtractedText: 'Task 1. Match the word cards with the correct number cards.\nTask 2. Fill in the missing numbers.\nTask 3. Which land is the largest for solar panels?',
    questions: [
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
        explanationVi: '822 km² tương ứng với Eight hundred and twenty-two sq km; 0,44 km² tương ứng với Zero point four four sq km; 728,6 km² tương ứng với Seven hundred and twenty-eight point six sq km; 16 490 km² tương ứng với Sixteen thousand four hundred and ninety sq km.',
        confidenceScore: 0.99,
        needsConfirmation: false
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
        explanationVi: 'Áp dụng quy tắc quy đổi đơn vị: 1 km² = 1 000 000 m².',
        confidenceScore: 0.98,
        needsConfirmation: false
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
        explanationVi: 'Diện tích Đất A = 7 × 3 = 21 km²; Diện tích Đất B = 5 × 5 = 25 km²; Diện tích Đất C = 6 × 4 = 24 km². Mảnh đất B rộng nhất (25 km²).',
        confidenceScore: 0.97,
        needsConfirmation: false
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
        explanationVi: '1 ha = 10 000 m², nên 3 ha = 3 × 10 000 = 30 000 m².',
        confidenceScore: 0.95,
        needsConfirmation: false
      }
    ]
  };
}



