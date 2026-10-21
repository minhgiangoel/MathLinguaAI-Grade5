import fs from 'node:fs';
import path from 'node:path';
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

    // 1. GET /api/system/status
    if (pathname === '/api/system/status' && req.method === 'GET') {
      const config = getFirebaseConfig();
      res.statusCode = 200;
      return res.end(JSON.stringify({
        status: 'online',
        projectId: config ? config.projectId : 'wise-howl-jsmzh',
        databaseId: config ? config.firestoreDatabaseId : null,
        authService: 'Server RBAC + Cloud Firestore'
      }));
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

    // 9. Admin routes: require admin or teacher role
    if (pathname.startsWith('/api/admin/')) {
      const user = authenticate(req, res);
      if (!user) return;

      if (user.role !== 'admin' && user.role !== 'teacher') {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: 'Quyền truy cập hạn chế / Access Denied' }));
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
    }

    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'API route not found' }));
  };
}
