// MathLingua AI — Client Authentication & Progress Service
// Communicates with secure backend server API with session persistence and RBAC.

const TOKEN_KEY = 'mathlingua_session_token';

let authStateListeners = [];
let cachedUser = null;

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.warn('Storage error:', err);
  }
}

export function removeToken() {
  setToken(null);
}

function notifyAuthChange(user) {
  cachedUser = user;
  authStateListeners.forEach(listener => {
    try {
      listener(user);
    } catch (e) {
      console.error('Auth listener error:', e);
    }
  });
}

// Subscribes to auth state changes
export function onAuthStateChanged(callback) {
  authStateListeners.push(callback);
  // Initial check
  checkSession().then(user => callback(user));
  return () => {
    authStateListeners = authStateListeners.filter(l => l !== callback);
  };
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && endpoint !== '/api/auth/login' && endpoint !== '/api/auth/register') {
      removeToken();
      notifyAuthChange(null);
    }
    throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
  }

  return data;
}

// Check existing session on boot
export async function checkSession() {
  const token = getToken();
  if (!token) {
    cachedUser = null;
    return null;
  }

  try {
    const data = await apiFetch('/api/auth/me');
    cachedUser = data.user;
    return data.user;
  } catch {
    removeToken();
    cachedUser = null;
    return null;
  }
}

// Login
export async function loginUser(username, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  setToken(data.token);
  notifyAuthChange(data.user);
  return { user: data.user, profile: data.user };
}

// Register student account
export async function registerStudentAccount({ username, password, displayName, grade, classId, avatarUrl }) {
  const data = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      password,
      displayName,
      grade,
      classId,
      avatarUrl
    })
  });

  setToken(data.token);
  notifyAuthChange(data.user);
  return { user: data.user, profile: data.user };
}

// Logout
export async function logoutUser() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore error on logout
  } finally {
    removeToken();
    notifyAuthChange(null);
  }
}

// Change current user's password
export async function changeUserPassword(newPassword) {
  return apiFetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword })
  });
}

// Learning Progress
export async function saveStudentProgress(payload) {
  if (!getToken()) return null; // Guest: ignore save
  const data = await apiFetch('/api/progress/save', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.record;
}

export async function fetchStudentProgress() {
  if (!getToken()) return [];
  try {
    const data = await apiFetch('/api/progress/my');
    return data.progress || [];
  } catch (err) {
    console.warn('Could not fetch student progress:', err);
    return [];
  }
}

// Admin / Teacher APIs
export async function fetchAdminOverview() {
  return apiFetch('/api/admin/overview');
}

export async function fetchAllStudentsAndProgress() {
  return apiFetch('/api/admin/students');
}

export async function fetchAllStudents() {
  const data = await fetchAllStudentsAndProgress();
  return data.students || [];
}

export async function fetchAllStudentsProgress() {
  const data = await fetchAllStudentsAndProgress();
  return data.progress || [];
}

export async function fetchLearningMaterials() {
  const data = await apiFetch('/api/admin/materials');
  return data.materials || [];
}

export async function saveLearningMaterial(material) {
  const data = await apiFetch('/api/admin/materials', {
    method: 'POST',
    body: JSON.stringify(material)
  });
  return data.material;
}

export async function deleteLearningMaterial(id) {
  return apiFetch('/api/admin/materials/delete', {
    method: 'POST',
    body: JSON.stringify({ id })
  });
}

export async function resetStudentPassword(studentId, newPassword) {
  return apiFetch('/api/admin/reset-student-password', {
    method: 'POST',
    body: JSON.stringify({ studentId, newPassword })
  });
}

export async function fetchAdminSettings() {
  const data = await apiFetch('/api/admin/settings');
  return data.settings || {};
}

export async function saveAdminSettings(settings) {
  const data = await apiFetch('/api/admin/settings', {
    method: 'POST',
    body: JSON.stringify(settings)
  });
  return data.settings;
}

export async function uploadAdminAsset({ filename, fileData, mimeType }) {
  return apiFetch('/api/admin/upload', {
    method: 'POST',
    body: JSON.stringify({ filename, fileData, mimeType })
  });
}

export async function analyzeExerciseImage({ imageData, mimeType, filename, promptInstruction }) {
  return apiFetch('/api/admin/analyze-exercise-image', {
    method: 'POST',
    body: JSON.stringify({ imageData, mimeType, filename, promptInstruction })
  });
}

export async function fetchLessonMaterialByUnit(unitId) {
  try {
    const data = await apiFetch(`/api/materials/unit?unitId=${encodeURIComponent(unitId)}`);
    return data.material || null;
  } catch (err) {
    console.warn('[FetchLessonMaterialByUnit Error]:', err.message);
    return null;
  }
}

export async function generateVocabWithAi({ input, instruction }) {
  return apiFetch('/api/admin/generate-vocab', {
    method: 'POST',
    body: JSON.stringify({ input, instruction })
  });
}

export async function generateStructureWithAi({ prompt, unitId }) {
  return apiFetch('/api/admin/generate-structure', {
    method: 'POST',
    body: JSON.stringify({ prompt, unitId })
  });
}

export async function fetchPageLayout(pageId, mode = 'published') {
  try {
    const data = await apiFetch(`/api/layouts?pageId=${encodeURIComponent(pageId)}&mode=${encodeURIComponent(mode)}`);
    return data.layout || null;
  } catch (err) {
    console.warn('[FetchPageLayout Error]:', err.message);
    return null;
  }
}

export async function savePageLayout({ pageId, status = 'published', layers = {}, deviceBreakpoints = {} }) {
  return apiFetch('/api/admin/layouts', {
    method: 'POST',
    body: JSON.stringify({ pageId, status, layers, deviceBreakpoints })
  });
}

export async function resetPageLayout(pageId) {
  return apiFetch('/api/admin/layouts/reset', {
    method: 'POST',
    body: JSON.stringify({ pageId })
  });
}

