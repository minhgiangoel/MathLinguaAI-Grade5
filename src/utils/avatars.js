export const AVATAR_PRESETS = {
  'astronaut-1': {
    id: 'astronaut-1',
    label: 'Phi hành gia Xanh / Blue Astronaut',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="18" fill="#154294"/><circle cx="20" cy="18" r="10" fill="#ffffff"/><ellipse cx="20" cy="18" rx="8" ry="6" fill="#00d4ff"/><circle cx="16" cy="16" r="2" fill="#ffffff" opacity="0.8"/><path d="M12 32c2-4 6-6 8-6s6 2 8 6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="6" r="2" fill="#ffcc00"/></svg>`
  },
  'astronaut-2': {
    id: 'astronaut-2',
    label: 'Phi hành gia Tím / Purple Astronaut',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="18" fill="#7a22b0"/><circle cx="20" cy="18" r="10" fill="#ffffff"/><ellipse cx="20" cy="18" rx="8" ry="6" fill="#ffd65e"/><circle cx="17" cy="16" r="2" fill="#ffffff" opacity="0.9"/><path d="M12 32c2-4 6-6 8-6s6 2 8 6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/><polygon points="20,4 21,7 24,7 21.5,9 22.5,12 20,10 17.5,12 18.5,9 16,7 19,7" fill="#ffd65e"/></svg>`
  },
  'astronaut-3': {
    id: 'astronaut-3',
    label: 'Phi hành gia Ngọc / Teal Astronaut',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="18" fill="#0b7a75"/><circle cx="20" cy="18" r="10" fill="#ffffff"/><ellipse cx="20" cy="18" rx="8" ry="6" fill="#38ef7d"/><circle cx="17" cy="16" r="2" fill="#ffffff" opacity="0.9"/><path d="M12 32c2-4 6-6 8-6s6 2 8 6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="4" x2="20" y2="8" stroke="#38ef7d" stroke-width="2"/></svg>`
  },
  'teacher': {
    id: 'teacher',
    label: 'Giáo viên Toán / Math Teacher',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="18" fill="#2d1b69"/><circle cx="20" cy="20" r="16" stroke="#ff8c00" stroke-width="1.5"/><path d="M10 16l10-5 10 5-10 5-10-5z" fill="#ffd65e"/><path d="M14 19v6c0 3 3 5 6 5s6-2 6-5v-6" stroke="#ffd65e" stroke-width="1.5"/><line x1="27" y1="17" x2="27" y2="25" stroke="#ff8c00" stroke-width="2"/></svg>`
  },
  'admin': {
    id: 'admin',
    label: 'Quản trị viên / Space Admin',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="18" fill="#0a1d47"/><circle cx="20" cy="20" r="16" stroke="#ffd65e" stroke-width="1.5"/><path d="M20 9l8 4v8c0 5-4 9-8 10-4-1-8-5-8-10v-8l8-4z" fill="#1b4fb8" stroke="#ffd65e" stroke-width="1.5"/><polygon points="20,13 22,17 26,17.5 23,20 24,24 20,21.5 16,24 17,20 14,17.5 18,17" fill="#ffd65e"/></svg>`
  }
};

export function renderAvatarSvg(avatarId, role = 'student') {
  if (avatarId && AVATAR_PRESETS[avatarId]) {
    return AVATAR_PRESETS[avatarId].svg;
  }
  if (role === 'admin') return AVATAR_PRESETS.admin.svg;
  if (role === 'teacher') return AVATAR_PRESETS.teacher.svg;
  return AVATAR_PRESETS['astronaut-1'].svg;
}
