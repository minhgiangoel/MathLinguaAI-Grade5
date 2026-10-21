import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'mathlingua.db.json');

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      sessions: [],
      progress: [],
      learningMaterials: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

function readDb() {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading DB file, recreating:', err);
    ensureDbFile();
    return { users: [], sessions: [], progress: [], learningMaterials: [] };
  }
}

function writeDb(data) {
  ensureDbFile();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

// Password hashing with salt
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, storedHash, storedSalt) {
  const { hash } = hashPassword(password, storedSalt);
  return hash === storedHash;
}

// Initialize default Admin account if not present or sync with secret
export function initAdminAccount() {
  const db = readDb();
  let admin = db.users.find(u => u.username === 'admin');
  const configuredPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD || 'MathLingua@Admin2026';
  const { hash, salt } = hashPassword(configuredPassword);

  if (!admin) {
    admin = {
      id: 'admin_' + crypto.randomUUID().slice(0, 8),
      username: 'admin',
      displayName: 'Quản trị viên / Administrator',
      role: 'admin',
      grade: 'Grade 5',
      classId: 'Admin Office',
      avatarUrl: 'admin',
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(admin);
    writeDb(db);
    console.log('[Auth] Admin account initialized with secure environment secret.');
  } else {
    const isValid = verifyPassword(configuredPassword, admin.passwordHash, admin.passwordSalt);
    if (!isValid) {
      admin.passwordHash = hash;
      admin.passwordSalt = salt;
      admin.updatedAt = new Date().toISOString();
      writeDb(db);
      console.log('[Auth] Admin password synchronized with secret.');
    }
  }
  return admin;
}

export function verifyAdminCredentials(inputPassword) {
  const admin = initAdminAccount();
  const cleanInput = String(inputPassword || '').trim();

  // 1. Check against current DB hash
  if (verifyPassword(cleanInput, admin.passwordHash, admin.passwordSalt)) {
    return true;
  }
  // 2. Check against process.env.ADMIN_PASSWORD
  if (process.env.ADMIN_PASSWORD && cleanInput === process.env.ADMIN_PASSWORD.trim()) {
    const { hash, salt } = hashPassword(cleanInput);
    const db = readDb();
    const dbAdmin = db.users.find(u => u.username === 'admin');
    if (dbAdmin) {
      dbAdmin.passwordHash = hash;
      dbAdmin.passwordSalt = salt;
      dbAdmin.updatedAt = new Date().toISOString();
      writeDb(db);
    }
    return true;
  }
  // 3. Check against initial default password
  const initialPwd = (process.env.ADMIN_INITIAL_PASSWORD || 'MathLingua@Admin2026').trim();
  if (cleanInput === initialPwd) {
    const { hash, salt } = hashPassword(cleanInput);
    const db = readDb();
    const dbAdmin = db.users.find(u => u.username === 'admin');
    if (dbAdmin) {
      dbAdmin.passwordHash = hash;
      dbAdmin.passwordSalt = salt;
      dbAdmin.updatedAt = new Date().toISOString();
      writeDb(db);
    }
    return true;
  }
  return false;
}


export const dbService = {
  // User operations
  findUserByUsername(username) {
    const db = readDb();
    const clean = String(username || '').trim().toLowerCase();
    return db.users.find(u => u.username.toLowerCase() === clean);
  },

  findUserById(id) {
    const db = readDb();
    return db.users.find(u => u.id === id);
  },

  createUser({ username, password, displayName, grade, classId, avatarUrl, role = 'student' }) {
    const db = readDb();
    const clean = String(username || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (db.users.some(u => u.username.toLowerCase() === clean)) {
      throw new Error('Tên đăng nhập đã tồn tại. / Username is already taken.');
    }

    const { hash, salt } = hashPassword(password);
    const newUser = {
      id: 'user_' + crypto.randomUUID().slice(0, 10),
      username: clean,
      displayName: displayName && displayName.trim() ? displayName.trim() : `Học sinh ${clean}`,
      role: role === 'admin' ? 'student' : role, // Prevent self-promoting to admin
      grade: grade || 'Grade 5',
      classId: classId || '5A1',
      avatarUrl: avatarUrl || 'astronaut-1',
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDb(db);
    return newUser;
  },

  updateUserPassword(userId, newPassword) {
    const db = readDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return true;
  },

  getAllStudents() {
    const db = readDb();
    return db.users
      .filter(u => u.role === 'student')
      .map(({ passwordHash, passwordSalt, ...rest }) => rest);
  },

  // Session operations
  createSession(userId) {
    const db = readDb();
    const token = crypto.randomBytes(32).toString('hex');
    const session = {
      token,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    db.sessions.push(session);
    writeDb(db);
    return token;
  },

  findSession(token) {
    if (!token) return null;
    const db = readDb();
    const session = db.sessions.find(s => s.token === token);
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) return null;
    const user = db.users.find(u => u.id === session.userId);
    if (!user) return null;
    const { passwordHash, passwordSalt, ...safeUser } = user;
    return { session, user: safeUser };
  },

  deleteSession(token) {
    const db = readDb();
    db.sessions = db.sessions.filter(s => s.token !== token);
    writeDb(db);
  },

  // Learning Progress operations
  saveProgress(userId, { topicId, unitId, titleEn, titleVi, score, isCorrect, lastChoice, status, skills, vocabPracticed }) {
    const db = readDb();
    const progressId = `${userId}_${topicId}_${unitId}`;
    let record = db.progress.find(p => p.id === progressId);

    const now = new Date().toISOString();
    const attempts = (record?.attempts || 0) + 1;
    const highestScore = Math.max(record?.score || 0, typeof score === 'number' ? score : (isCorrect ? 100 : 0));
    const newStatus = status || (isCorrect ? 'completed' : 'in_progress');

    if (!record) {
      record = {
        id: progressId,
        userId,
        topicId,
        unitId,
        titleEn,
        titleVi,
        status: newStatus,
        score: highestScore,
        attempts,
        isCorrect: Boolean(isCorrect),
        lastChoice: typeof lastChoice === 'number' ? lastChoice : null,
        skills: skills || [],
        vocabPracticed: vocabPracticed || [],
        startedAt: now,
        completedAt: newStatus === 'completed' ? now : null,
        lastStudiedAt: now,
        updatedAt: now
      };
      db.progress.push(record);
    } else {
      record.titleEn = titleEn || record.titleEn;
      record.titleVi = titleVi || record.titleVi;
      record.status = newStatus;
      record.score = highestScore;
      record.attempts = attempts;
      record.isCorrect = Boolean(isCorrect);
      record.lastChoice = typeof lastChoice === 'number' ? lastChoice : record.lastChoice;
      if (skills && skills.length) record.skills = Array.from(new Set([...record.skills, ...skills]));
      if (vocabPracticed && vocabPracticed.length) record.vocabPracticed = Array.from(new Set([...record.vocabPracticed, ...vocabPracticed]));
      if (newStatus === 'completed' && !record.completedAt) record.completedAt = now;
      record.lastStudiedAt = now;
      record.updatedAt = now;
    }

    writeDb(db);
    return record;
  },

  getProgressByUser(userId) {
    const db = readDb();
    return db.progress
      .filter(p => p.userId === userId)
      .sort((a, b) => new Date(b.lastStudiedAt) - new Date(a.lastStudiedAt));
  },

  getAllProgress() {
    const db = readDb();
    return db.progress;
  },

  // Learning Materials & Question Bank operations
  saveMaterial({ id, topicId, unitId, titleEn, titleVi, summary, imageUrl, audioUrl, explore, vocab, structure, practice, question, choices, correctIndex, explanation, type = 'lesson', status = 'published', authorId }) {
    const db = readDb();
    const materialId = id || 'mat_' + crypto.randomUUID().slice(0, 8);
    let mat = db.learningMaterials.find(m => m.id === materialId);
    const now = new Date().toISOString();

    if (!mat) {
      mat = {
        id: materialId,
        topicId: topicId || 'chapter4',
        unitId: unitId || 'unit-1',
        titleEn: titleEn || 'Untitled Lesson',
        titleVi: titleVi || 'Bài học chưa đặt tên',
        summary: summary || '',
        imageUrl: imageUrl || '',
        audioUrl: audioUrl || '',
        explore: explore || '',
        vocab: Array.isArray(vocab) ? vocab : [],
        structure: structure || '',
        practice: practice || null,
        question: question || null,
        choices: Array.isArray(choices) ? choices : null,
        correctIndex: typeof correctIndex === 'number' ? correctIndex : null,
        explanation: explanation || '',
        type,
        status: status || 'published',
        authorId,
        createdAt: now,
        updatedAt: now
      };
      db.learningMaterials.push(mat);
    } else {
      mat.topicId = topicId || mat.topicId;
      mat.unitId = unitId || mat.unitId;
      mat.titleEn = titleEn || mat.titleEn;
      mat.titleVi = titleVi || mat.titleVi;
      if (summary !== undefined) mat.summary = summary;
      if (imageUrl !== undefined) mat.imageUrl = imageUrl;
      if (audioUrl !== undefined) mat.audioUrl = audioUrl;
      if (explore !== undefined) mat.explore = explore;
      if (vocab !== undefined) mat.vocab = vocab;
      if (structure !== undefined) mat.structure = structure;
      if (practice !== undefined) mat.practice = practice;
      if (question !== undefined) mat.question = question;
      if (choices !== undefined) mat.choices = choices;
      if (correctIndex !== undefined) mat.correctIndex = correctIndex;
      if (explanation !== undefined) mat.explanation = explanation;
      if (type !== undefined) mat.type = type;
      if (status) mat.status = status;
      mat.updatedAt = now;
    }

    writeDb(db);
    return mat;
  },

  getAllMaterials() {
    const db = readDb();
    return db.learningMaterials || [];
  },

  deleteMaterial(id) {
    const db = readDb();
    db.learningMaterials = (db.learningMaterials || []).filter(m => m.id !== id);
    writeDb(db);
    return true;
  },

  getSettings() {
    const db = readDb();
    return db.settings || {
      allowRegistration: true,
      maintenanceMode: false,
      mathAudioEnabled: true,
      announcement: 'Chào mừng các em học sinh khối 5 đến với MathLingua AI!'
    };
  },

  updateSettings(newSettings) {
    const db = readDb();
    db.settings = { ...(db.settings || {}), ...newSettings };
    writeDb(db);
    return db.settings;
  }
};
