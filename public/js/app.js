

const API_BASE = '/api';

const state = {
  token: localStorage.getItem('academia_token') || null,
  user: null,
  tasks: [],
  courses: [],
  activeView: 'dashboard',
  currentTaskDetailId: null,
  searchQuery: '',
  filters: {
    courseId: '',
    priority: '',
    type: ''
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (state.token) {
    fetchProfile();
  } else {
    showAuthOverlay(true);
  }

  setInterval(() => {
    if (state.activeView === 'dashboard' || state.activeView === 'kanban') {
      renderCurrentView();
    }
  }, 60000);
});

async function apiRequest(endpoint, method = 'GET', data = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  const isAuthEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register');

  if (state.token && !isAuthEndpoint) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const config = {
    method,
    headers
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(data);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      if ((res.status === 401 || res.status === 403) && !isAuthEndpoint) {
        
        handleLogout(false); 
        showToast('Sesi login telah kadaluarsa. Silakan login kembali.', 'error');
        throw new Error('Unauthorized');
      }

      throw new Error(responseData.error || 'Terjadi kesalahan pada server.');
    }

    return responseData;
  } catch (err) {
    console.error(`API Error (${endpoint}):`, err);
    throw err;
  }
}

function showAuthOverlay(show) {
  const overlay = document.getElementById('auth-overlay');
  if (show) {
    overlay.style.display = 'flex';
  } else {
    overlay.style.display = 'none';
  }
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('form-login');
  const regForm = document.getElementById('form-register');
  const loginTab = document.getElementById('tab-login');
  const regTab = document.getElementById('tab-register');

  if (tab === 'login') {
    loginForm.style.display = 'block';
    regForm.style.display = 'none';
    loginTab.classList.add('active');
    regTab.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    regForm.style.display = 'block';
    regTab.classList.add('active');
    loginTab.classList.remove('active');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!email) {
    showToast('Peringatan: Email wajib diisi.', 'error');
    return;
  }
  if (!password) {
    showToast('Peringatan: Password wajib diisi.', 'error');
    return;
  }

  try {
    const res = await apiRequest('/auth/login', 'POST', { email, password });
    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('academia_token', res.token);

    showAuthOverlay(false);
    showToast(`Selamat datang kembali, ${res.user.name}!`, 'success');
    loadInitialAppData();
  } catch (err) {
    showToast(err.message || 'Gagal login. Silakan periksa email dan password Anda.', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const university = document.getElementById('reg-univ').value.trim();
  const major = document.getElementById('reg-major').value.trim();
  const password = document.getElementById('reg-password').value.trim();

  if (!name) {
    showToast('Peringatan: Nama Lengkap wajib diisi.', 'error');
    return;
  }
  if (!validateInputSymbol(name, 'Nama Lengkap')) {
    return;
  }
  if (!email) {
    showToast('Peringatan: Email wajib diisi.', 'error');
    return;
  }
  if (!email.includes('@') || !email.includes('.')) {
    showToast('Peringatan: Format email tidak valid (contoh: user@domain.com).', 'error');
    return;
  }
  if (!password) {
    showToast('Peringatan: Password wajib diisi.', 'error');
    return;
  }
  if (password.length < 6) {
    showToast('Peringatan: Password minimal harus 6 karakter.', 'error');
    return;
  }

  try {
    const res = await apiRequest('/auth/register', 'POST', { name, email, university, major, password });
    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('academia_token', res.token);

    showAuthOverlay(false);
    showToast(`Registrasi berhasil! Selamat datang, ${res.user.name}!`, 'success');
    loadInitialAppData();
  } catch (err) {
    showToast(err.message || 'Gagal mendaftar. Silakan coba lagi.', 'error');
  }
}

async function fetchProfile() {
  try {
    const res = await apiRequest('/auth/me');
    state.user = res.user;
    showAuthOverlay(false);
    loadInitialAppData();
  } catch (err) {
    showAuthOverlay(true);
  }
}

function handleLogout(showToastMsg = true) {
  state.token = null;
  state.user = null;
  localStorage.removeItem('academia_token');
  showAuthOverlay(true);
  if (showToastMsg) {
    showToast('Anda telah berhasil keluar.', 'success');
  }
}

async function loadInitialAppData() {
  updateUserProfileUI();
  await Promise.all([
    fetchCourses(),
    fetchTasks()
  ]);
  renderCurrentView();
}

function updateUserProfileUI() {
  if (!state.user) return;
  document.getElementById('user-display-name').textContent = state.user.name;
  document.getElementById('user-display-univ').textContent = state.user.university || state.user.major || 'Mahasiswa';
  document.getElementById('user-avatar-img').src = state.user.avatar;

  document.getElementById('settings-name').textContent = state.user.name;
  document.getElementById('settings-email').textContent = state.user.email;
  document.getElementById('settings-univ').textContent = `${state.user.university} - ${state.user.major}`;
  document.getElementById('settings-avatar').src = state.user.avatar;

  const hour = new Date().getHours();
  let greetingText = 'Selamat Pagi';
  let emoji = '☀️';
  if (hour >= 12 && hour < 15) { greetingText = 'Selamat Siang'; emoji = '🌤️'; }
  else if (hour >= 15 && hour < 18) { greetingText = 'Selamat Sore'; emoji = '🌇'; }
  else if (hour >= 18 || hour < 4) { greetingText = 'Selamat Malam'; emoji = '🌙'; }

  const firstName = state.user.name.split(' ')[0];
  const heading = document.getElementById('dashboard-welcome-heading');
  if (heading) heading.innerHTML = `${greetingText}, ${escapeHTML(firstName)}! ${emoji}`;

  const dateSpan = document.getElementById('current-date-text');
  if (dateSpan) {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dateSpan.textContent = new Date().toLocaleDateString('id-ID', options);
  }
}

async function fetchCourses() {
  try {
    state.courses = await apiRequest('/courses');
    populateCourseDropdowns();
  } catch (err) {
    console.error('Fetch courses error:', err);
  }
}

async function fetchTasks() {
  try {
    state.tasks = await apiRequest('/tasks');
  } catch (err) {
    console.error('Fetch tasks error:', err);
  }
}

function switchView(viewName) {
  state.activeView = viewName;

  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  const targetNav = document.getElementById(`nav-${viewName}`);
  if (targetNav) targetNav.classList.add('active');

  renderCurrentView();
}

function renderCurrentView() {
  updateHeaderBadge();

  switch (state.activeView) {
    case 'dashboard':
      renderDashboardView();
      break;
    case 'kanban':
      renderKanbanView();
      break;
    case 'tasks-list':
      renderTaskTableView();
      break;
    case 'courses':
      renderCoursesView();
      break;
    case 'schedule':
      renderScheduleView();
      break;
    case 'gpa':
      renderGpaView();
      break;
  }
}

function updateHeaderBadge() {
  const pendingTasks = state.tasks.filter(t => t.status !== 'Selesai');
  document.getElementById('badge-pending-count').textContent = pendingTasks.length;
}

function renderDashboardView() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.status === 'Selesai').length;

  const now = new Date();
  const urgent = state.tasks.filter(t => {
    if (t.status === 'Selesai') return false;
    const diffHours = (new Date(t.deadline) - now) / (1000 * 60 * 60);
    return diffHours <= 72; 
  });

  document.getElementById('stat-total-tasks').textContent = total;
  document.getElementById('stat-urgent-tasks').textContent = urgent.length;
  document.getElementById('stat-completed-tasks').textContent = completed;
  document.getElementById('stat-total-courses').textContent = state.courses.length;

  const urgentContainer = document.getElementById('urgent-tasks-container');
  if (urgent.length === 0) {
    urgentContainer.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">
        <i class="fa-solid fa-circle-check" style="font-size: 32px; color: var(--accent-success); margin-bottom: 10px;"></i>
        <p>Tidak ada deadline tugas mendesak dalam 3 hari ke depan!</p>
      </div>
    `;
  } else {
    
    const sortedUrgent = [...urgent].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    urgentContainer.innerHTML = sortedUrgent.map(task => {
      const countdown = getCountdownBadgeText(task.deadline);
      return `
        <div class="urgent-item" onclick="openTaskDetailModal('${task.id}')">
          <div class="urgent-info">
            <span class="task-course-badge" style="background: ${task.courseColor}25; color: ${task.courseColor};">
              ${task.courseName}
            </span>
            <h4>${escapeHTML(task.title)}</h4>
            <div class="urgent-meta">
              <span><i class="fa-regular fa-clock"></i> ${formatDateTime(task.deadline)}</span>
              <span><i class="fa-solid fa-tag"></i> ${task.type}</span>
            </div>
          </div>
          <div class="countdown-badge">
            <i class="fa-solid fa-hourglass-half"></i> ${countdown}
          </div>
        </div>
      `;
    }).join('');
  }

  const courseProgressContainer = document.getElementById('course-progress-list');
  if (state.courses.length === 0) {
    courseProgressContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center;">Belum ada mata kuliah yang terdaftar.</p>`;
  } else {
    courseProgressContainer.innerHTML = state.courses.map(course => {
      const courseTasks = state.tasks.filter(t => t.courseId === course.id);
      const courseDone = courseTasks.filter(t => t.status === 'Selesai').length;
      const percent = courseTasks.length > 0 ? Math.round((courseDone / courseTasks.length) * 100) : 0;

      return `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 6px;">
            <span><i class="fa-solid fa-circle" style="color: ${course.color}; font-size: 8px; vertical-align: middle;"></i> ${escapeHTML(course.name)}</span>
            <span>${courseDone}/${courseTasks.length} Tugas (${percent}%)</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${percent}%; background: ${course.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function renderKanbanView() {
  const filteredTasks = getFilteredTasks();

  const todoTasks = filteredTasks.filter(t => t.status === 'Belum Dikerjakan');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'Sedang Dikerjakan');
  const doneTasks = filteredTasks.filter(t => t.status === 'Selesai');

  document.getElementById('count-todo').textContent = todoTasks.length;
  document.getElementById('count-inprogress').textContent = inProgressTasks.length;
  document.getElementById('count-done').textContent = doneTasks.length;

  renderTaskCardColumn('col-todo', todoTasks);
  renderTaskCardColumn('col-inprogress', inProgressTasks);
  renderTaskCardColumn('col-done', doneTasks);
}

function renderTaskCardColumn(columnId, tasks) {
  const col = document.getElementById(columnId);

  if (tasks.length === 0) {
    col.innerHTML = `
      <div style="border: 2px dashed var(--border-color); border-radius: var(--radius-md); padding: 30px; text-align: center; color: var(--text-muted); font-size: 13px;">
        Kosong
      </div>
    `;
    return;
  }

  col.innerHTML = tasks.map(task => {
    const subtaskDone = (task.subtasks || []).filter(s => s.completed).length;
    const totalSubtasks = (task.subtasks || []).length;
    const subtaskPercent = totalSubtasks > 0 ? Math.round((subtaskDone / totalSubtasks) * 100) : 0;
    const priorityClass = `priority-${(task.priority || 'sedang').toLowerCase()}`;

    let nextStatusBtn = '';
    if (task.status === 'Belum Dikerjakan') {
      nextStatusBtn = `<button class="btn-icon" style="width: 28px; height: 28px; font-size: 11px;" onclick="event.stopPropagation(); quickMoveTaskStatus('${task.id}', 'Sedang Dikerjakan')" title="Mulai Kerjakan"><i class="fa-solid fa-arrow-right"></i></button>`;
    } else if (task.status === 'Sedang Dikerjakan') {
      nextStatusBtn = `<button class="btn-icon" style="width: 28px; height: 28px; font-size: 11px; background: var(--accent-success); color: #fff;" onclick="event.stopPropagation(); quickMoveTaskStatus('${task.id}', 'Selesai')" title="Tandai Selesai"><i class="fa-solid fa-check"></i></button>`;
    } else {
      nextStatusBtn = `<button class="btn-icon" style="width: 28px; height: 28px; font-size: 11px;" onclick="event.stopPropagation(); quickMoveTaskStatus('${task.id}', 'Belum Dikerjakan')" title="Kembalikan ke Belum Dikerjakan"><i class="fa-solid fa-rotate-left"></i></button>`;
    }

    return `
      <div class="task-card" onclick="openTaskDetailModal('${task.id}')">
        <span class="task-course-badge" style="background: ${task.courseColor}20; color: ${task.courseColor};">
          ${escapeHTML(task.courseName)}
        </span>
        <h4 class="task-title">${escapeHTML(task.title)}</h4>
        ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}

        ${totalSubtasks > 0 ? `
          <div class="task-subtasks-progress">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary);">
              <span><i class="fa-solid fa-list-check"></i> Subtask</span>
              <span>${subtaskDone}/${totalSubtasks}</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${subtaskPercent}%;"></div>
            </div>
          </div>
        ` : ''}

        <div class="task-card-footer">
          <span class="priority-tag ${priorityClass}">${task.priority}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span><i class="fa-regular fa-clock"></i> ${formatShortDate(task.deadline)}</span>
            ${nextStatusBtn}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function quickMoveTaskStatus(taskId, newStatus) {
  try {
    await apiRequest(`/tasks/${taskId}/status`, 'PATCH', { status: newStatus });
    await fetchTasks();
    renderCurrentView();
    showToast(`Status tugas diperbarui ke: ${newStatus}`, 'success');
  } catch (err) {
    showToast(err.message || 'Gagal mengubah status', 'error');
  }
}

function renderTaskTableView() {
  const filteredTasks = getFilteredTasks();
  const tbody = document.getElementById('task-table-body');

  if (filteredTasks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">Tidak ada data tugas yang cocok.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredTasks.map(task => {
    const priorityClass = `priority-${(task.priority || 'sedang').toLowerCase()}`;
    return `
      <tr>
        <td style="font-weight: 700;">
          <a href="javascript:void(0)" onclick="openTaskDetailModal('${task.id}')" style="color: var(--text-primary);">
            ${escapeHTML(task.title)}
          </a>
        </td>
        <td>
          <span class="task-course-badge" style="background: ${task.courseColor}20; color: ${task.courseColor}; margin: 0;">
            ${escapeHTML(task.courseName)}
          </span>
        </td>
        <td>${task.type}</td>
        <td><span class="priority-tag ${priorityClass}">${task.priority}</span></td>
        <td><i class="fa-regular fa-clock"></i> ${formatDateTime(task.deadline)}</td>
        <td>
          <select class="select-input" style="padding: 4px 8px; font-size: 12px;" onchange="quickMoveTaskStatus('${task.id}', this.value)">
            <option value="Belum Dikerjakan" ${task.status === 'Belum Dikerjakan' ? 'selected' : ''}>Belum Dikerjakan</option>
            <option value="Sedang Dikerjakan" ${task.status === 'Sedang Dikerjakan' ? 'selected' : ''}>Sedang Dikerjakan</option>
            <option value="Selesai" ${task.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
          </select>
        </td>
        <td>
          <button class="btn-icon" style="width: 32px; height: 32px;" onclick="openTaskModal('${task.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderCoursesView() {
  const container = document.getElementById('courses-grid-container');

  if (state.courses.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <i class="fa-solid fa-book-open" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
        <h3>Belum Ada Mata Kuliah</h3>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">Klik tombol di bawah untuk menambahkan mata kuliah pertama Anda.</p>
        <button class="btn-primary" style="margin: 0 auto;" onclick="openCourseModal()">
          <i class="fa-solid fa-plus"></i> Tambah Mata Kuliah Baru
        </button>
      </div>
    `;
    return;
  }

  let coursesToRender = state.courses;
  if (state.searchQuery) {
    const q = state.searchQuery;
    coursesToRender = state.courses.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.lecturer || '').toLowerCase().includes(q) ||
      (c.room || '').toLowerCase().includes(q)
    );
  }

  if (coursesToRender.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <p>Tidak ada mata kuliah yang cocok dengan kata kunci "<strong>${escapeHTML(state.searchQuery)}</strong>".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = coursesToRender.map(course => {
    const courseTasks = state.tasks.filter(t => t.courseId === course.id);
    const activeTasksCount = courseTasks.filter(t => t.status !== 'Selesai').length;

    return `
      <div class="course-card">
        <div class="course-color-stripe" style="background: ${course.color};"></div>
        <div class="course-code">${escapeHTML(course.code)} • ${course.credits} SKS</div>
        <h3 class="course-title">${escapeHTML(course.name)}</h3>

        <div class="course-detail-list">
          <div><i class="fa-solid fa-user-tie"></i> ${escapeHTML(course.lecturer || 'Dosen Pengampu')}</div>
          <div><i class="fa-solid fa-calendar-day"></i> ${course.day}, ${course.time}</div>
          <div><i class="fa-solid fa-location-dot"></i> ${escapeHTML(course.room || 'Ruangan')}</div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-color); margin-top: 16px; padding-top: 14px;">
          <span style="font-size: 12px; font-weight: 700; color: var(--accent-primary);">
            <i class="fa-solid fa-tasks"></i> ${activeTasksCount} Tugas Aktif
          </span>
          <div style="display: flex; gap: 8px;">
            <button class="btn-icon" style="width: 32px; height: 32px;" onclick="openCourseModal('${course.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon" style="width: 32px; height: 32px; color: var(--accent-danger);" onclick="deleteCourse('${course.id}')" title="Hapus"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderScheduleView() {
  const container = document.getElementById('timetable-container');
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  container.innerHTML = days.map(day => {
    const dayCourses = state.courses.filter(c => (c.day || '').toLowerCase() === day.toLowerCase());

    const courseSlotsHTML = dayCourses.length === 0
      ? `<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px 0;">Libur / Tidak ada jadwal</div>`
      : dayCourses.map(course => `
          <div class="timetable-slot" style="border-left: 3px solid ${course.color};">
            <h5>${escapeHTML(course.name)}</h5>
            <span><i class="fa-regular fa-clock"></i> ${course.time}</span><br>
            <span><i class="fa-solid fa-location-dot"></i> ${escapeHTML(course.room)}</span>
          </div>
        `).join('');

    return `
      <div class="timetable-column">
        <div class="timetable-day-header">${day}</div>
        ${courseSlotsHTML}
      </div>
    `;
  }).join('');
}

function populateCourseDropdowns() {
  const filterSelect = document.getElementById('filter-course');
  const taskCourseSelect = document.getElementById('task-course-select');

  if (!filterSelect || !taskCourseSelect) return;

  if (state.courses.length === 0) {
    filterSelect.innerHTML = `<option value="">Semua Mata Kuliah (0)</option>`;
    taskCourseSelect.innerHTML = `<option value="">-- Belum Ada Matkul (Klik + Tambah Matkul) --</option>`;
    return;
  }

  const optionsHTML = state.courses.map(c => `
    <option value="${c.id}">${escapeHTML(c.name)} ${c.code ? `(${escapeHTML(c.code)})` : ''}</option>
  `).join('');

  filterSelect.innerHTML = `<option value="">Semua Mata Kuliah (${state.courses.length})</option>` + optionsHTML;
  taskCourseSelect.innerHTML = `<option value="">-- Pilih Mata Kuliah --</option>` + optionsHTML;
}

function handleGlobalSearch(val) {
  state.searchQuery = val.toLowerCase().trim();

  if (state.searchQuery && state.activeView !== 'kanban' && state.activeView !== 'tasks-list' && state.activeView !== 'courses') {
    switchView('kanban');
  } else {
    renderCurrentView();
  }
}

function applyFilters() {
  state.filters.courseId = document.getElementById('filter-course').value;
  state.filters.priority = document.getElementById('filter-priority').value;
  state.filters.type = document.getElementById('filter-type').value;

  renderCurrentView();
}

function getFilteredTasks() {
  return state.tasks.filter(task => {
    if (state.filters.courseId && task.courseId !== state.filters.courseId) return false;
    if (state.filters.priority && task.priority !== state.filters.priority) return false;
    if (state.filters.type && task.type !== state.filters.type) return false;

    if (state.searchQuery) {
      const q = state.searchQuery;
      const titleMatch = (task.title || '').toLowerCase().includes(q);
      const descMatch = (task.description || '').toLowerCase().includes(q);
      const courseMatch = (task.courseName || '').toLowerCase().includes(q);
      const codeMatch = (task.courseCode || '').toLowerCase().includes(q);
      const typeMatch = (task.type || '').toLowerCase().includes(q);
      const priorityMatch = (task.priority || '').toLowerCase().includes(q);
      const statusMatch = (task.status || '').toLowerCase().includes(q);

      if (!titleMatch && !descMatch && !courseMatch && !codeMatch && !typeMatch && !priorityMatch && !statusMatch) return false;
    }
    return true;
  });
}

function openTaskModal(taskId = null) {
  const modal = document.getElementById('modal-task');
  const form = document.getElementById('form-task');
  form.reset();

  populateCourseDropdowns();

  if (taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('modal-task-title').textContent = 'Edit Tugas Perkuliahan';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title-input').value = task.title;
    document.getElementById('task-course-select').value = task.courseId;
    document.getElementById('task-type-select').value = task.type || 'Individu';
    document.getElementById('task-priority-select').value = task.priority || 'Sedang';
    document.getElementById('task-status-select').value = task.status || 'Belum Dikerjakan';

    if (task.deadline) {
      const d = new Date(task.deadline);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      document.getElementById('task-deadline-input').value = d.toISOString().slice(0, 16);
    }
    document.getElementById('task-link-input').value = task.link || '';
    document.getElementById('task-desc-input').value = task.description || '';
  } else {
    document.getElementById('modal-task-title').textContent = 'Tambah Tugas Baru';
    document.getElementById('task-id').value = '';

    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    document.getElementById('task-deadline-input').value = d.toISOString().slice(0, 16);
  }

  const deadlineInput = document.getElementById('task-deadline-input');
  const updateLivePriority = () => {
    if (deadlineInput.value) {
      document.getElementById('task-priority-select').value = calculatePriorityFromDeadline(deadlineInput.value);
    }
  };

  deadlineInput.onchange = updateLivePriority;
  deadlineInput.oninput = updateLivePriority;
  updateLivePriority();

  modal.classList.add('active');
}

function calculatePriorityFromDeadline(deadlineStr) {
  if (!deadlineStr) return 'Rendah';
  const now = new Date().getTime();
  const due = new Date(deadlineStr).getTime();
  const diffHours = (due - now) / (1000 * 60 * 60);

  if (diffHours <= 24) return 'Tinggi';
  if (diffHours <= 72) return 'Sedang';
  return 'Rendah';
}

function closeTaskModal() {
  document.getElementById('modal-task').classList.remove('active');
}

function validateInputSymbol(text, fieldName = 'Judul') {
  if (!text || typeof text !== 'string' || text.trim().length < 2) {
    showToast(`${fieldName} minimal 2 karakter.`, 'error');
    return false;
  }
  const forbiddenRegex = /[<>{}\[\]$%^*~#\\@]/;
  if (forbiddenRegex.test(text.trim())) {
    showToast(`${fieldName} tidak boleh mengandung simbol khusus (<, >, {, }, $, %, ^, *, #, @, ~).`, 'error');
    return false;
  }
  return true;
}

async function saveTask(e) {
  e.preventDefault();
  const taskId = document.getElementById('task-id').value;

  const title = document.getElementById('task-title-input').value.trim();
  if (!validateInputSymbol(title, 'Judul Tugas')) return;

  const courseId = document.getElementById('task-course-select').value;
  if (!courseId) {
    showToast('Peringatan: Silakan pilih Mata Kuliah terlebih dahulu. Klik "+ Tambah Matkul" jika belum ada.', 'error');
    return;
  }

  const deadlineValue = document.getElementById('task-deadline-input').value;
  if (!deadlineValue) {
    showToast('Peringatan: Tanggal & jam deadline wajib diisi.', 'error');
    return;
  }

  const link = document.getElementById('task-link-input').value.trim();
  if (link && !link.startsWith('http://') && !link.startsWith('https://')) {
    showToast('Peringatan: Link referensi/attachment harus diawali dengan http:// atau https://', 'error');
    return;
  }

  const payload = {
    title,
    courseId,
    type: document.getElementById('task-type-select').value,
    priority: document.getElementById('task-priority-select').value,
    status: document.getElementById('task-status-select').value,
    deadline: new Date(deadlineValue).toISOString(),
    link,
    description: document.getElementById('task-desc-input').value.trim()
  };

  try {
    if (taskId) {
      await apiRequest(`/tasks/${taskId}`, 'PUT', payload);
      showToast('Tugas berhasil diperbarui!', 'success');
    } else {
      await apiRequest('/tasks', 'POST', payload);
      showToast('Tugas baru berhasil ditambahkan!', 'success');
    }

    closeTaskModal();
    await fetchTasks();
    renderCurrentView();
  } catch (err) {
    showToast(err.message || 'Gagal menyimpan tugas. Periksa data input Anda.', 'error');
  }
}

function openCourseModal(courseId = null) {
  const modal = document.getElementById('modal-course');
  const form = document.getElementById('form-course');
  form.reset();

  if (courseId) {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return;

    document.getElementById('modal-course-title').textContent = 'Edit Mata Kuliah';
    document.getElementById('course-id').value = course.id;
    document.getElementById('course-name-input').value = course.name;
    document.getElementById('course-code-input').value = course.code || '';
    document.getElementById('course-lecturer-input').value = course.lecturer || '';
    document.getElementById('course-credits-input').value = course.credits || 3;
    document.getElementById('course-day-select').value = course.day || 'Senin';
    document.getElementById('course-time-input').value = course.time || '08:00 - 10:30';
    document.getElementById('course-room-input').value = course.room || '';
    document.getElementById('course-color-input').value = course.color || '#6366f1';
  } else {
    document.getElementById('modal-course-title').textContent = 'Tambah Mata Kuliah';
    document.getElementById('course-id').value = '';
  }

  modal.classList.add('active');
}

function closeCourseModal() {
  document.getElementById('modal-course').classList.remove('active');
}

async function saveCourse(e) {
  e.preventDefault();
  const courseId = document.getElementById('course-id').value;

  const name = document.getElementById('course-name-input').value.trim();
  if (!validateInputSymbol(name, 'Nama Mata Kuliah')) return;

  const code = document.getElementById('course-code-input').value.trim();
  if (code && !validateInputSymbol(code, 'Kode Mata Kuliah')) return;

  const lecturer = document.getElementById('course-lecturer-input').value.trim();
  if (lecturer && lecturer !== '-' && !validateInputSymbol(lecturer, 'Dosen Pengampu')) return;

  const room = document.getElementById('course-room-input').value.trim();
  if (room && room !== '-' && !validateInputSymbol(room, 'Ruangan Kelas')) return;

  const creditsInput = document.getElementById('course-credits-input'); 
  const credits = creditsInput.value.trim(); if (!/^\d+$/.test(credits)) 
  { alert('SKS harus berupa angka 1-6.'); creditsInput.focus(); return; } 
  const creditsNumber = Number(credits); if (creditsNumber < 1 || creditsNumber > 6) 
  { alert('SKS harus berada dalam rentang 1-6.'); creditsInput.focus(); return; }

  const payload = {
    name,
    code,
    lecturer,
    room,
    time: document.getElementById('course-time-input').value.trim(),
    color: document.getElementById('course-color-input').value,
    credits: document.getElementById('course-credits-input').value,
    day: document.getElementById('course-day-select').value,
  };

  try {
    if (courseId) {
      await apiRequest(`/courses/${courseId}`, 'PUT', payload);
      showToast('Mata kuliah berhasil diperbarui!', 'success');
    } else {
      await apiRequest('/courses', 'POST', payload);
      showToast('Mata kuliah baru berhasil ditambahkan!', 'success');
    }

    closeCourseModal();
    await fetchCourses();
    await fetchTasks();
    renderCurrentView();
  } catch (err) {
    showToast(err.message || 'Gagal menyimpan mata kuliah.', 'error');
  }
}

async function deleteCourse(courseId) {
  if (!confirm('Apakah Anda yakin ingin menghapus mata kuliah ini? Seluruh tugas terkait juga akan terhapus.')) return;
  try {
    await apiRequest(`/courses/${courseId}`, 'DELETE');
    showToast('Mata kuliah berhasil dihapus.', 'success');
    await fetchCourses();
    await fetchTasks();
    renderCurrentView();
  } catch (err) {
    showToast(err.message || 'Gagal menghapus mata kuliah', 'error');
  }
}

function openTaskDetailModal(taskId) {
  state.currentTaskDetailId = taskId;
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const modal = document.getElementById('modal-task-detail');

  document.getElementById('detail-title').textContent = task.title;
  document.getElementById('detail-desc').textContent = task.description || 'Tidak ada deskripsi rincian.';

  const badge = document.getElementById('detail-course-badge');
  badge.textContent = task.courseName;
  badge.style.background = `${task.courseColor}25`;
  badge.style.color = task.courseColor;

  const pTag = document.getElementById('detail-priority-tag');
  pTag.textContent = `Prioritas ${task.priority}`;
  pTag.className = `priority-tag priority-${(task.priority || 'sedang').toLowerCase()}`;

  document.getElementById('detail-deadline').textContent = formatDateTime(task.deadline);
  
  const linkContainer = document.getElementById('detail-link');
  if (task.link) {
    linkContainer.innerHTML = `<a href="${escapeHTML(task.link)}" target="_blank" style="color: var(--accent-primary);"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Link Referensi</a>`;
  } else {
    linkContainer.textContent = `${task.type} (Tanpa Link Attachment)`;
  }

  renderTaskSubtasksList(task);
  modal.classList.add('active');
}

function closeTaskDetailModal() {
  document.getElementById('modal-task-detail').classList.remove('active');
  state.currentTaskDetailId = null;
}

function renderTaskSubtasksList(task) {
  const subtasks = task.subtasks || [];
  const completedCount = subtasks.filter(s => s.completed).length;
  document.getElementById('detail-subtask-ratio').textContent = `${completedCount}/${subtasks.length}`;

  const container = document.getElementById('detail-subtasks-list');
  if (subtasks.length === 0) {
    container.innerHTML = `<p style="font-size: 12px; color: var(--text-muted);">Belum ada checklist sub-tugas.</p>`;
    return;
  }

  container.innerHTML = subtasks.map(st => `
    <div style="display: flex; align-items: center; gap: 10px; background: var(--bg-card); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
      <input type="checkbox" ${st.completed ? 'checked' : ''} onchange="toggleSubtaskCheck('${task.id}', '${st.id}')" style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--accent-primary);">
      <span style="${st.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'font-weight: 500;'} font-size: 13px; flex: 1;">${escapeHTML(st.title)}</span>
    </div>
  `).join('');
}

async function toggleSubtaskCheck(taskId, subtaskId) {
  try {
    const updatedTask = await apiRequest(`/tasks/${taskId}/subtask/${subtaskId}`, 'PATCH');
    await fetchTasks();
    openTaskDetailModal(taskId);
    renderCurrentView();
  } catch (err) {
    showToast(err.message || 'Gagal mengubah checklist sub-tugas', 'error');
  }
}

async function handleAddSubtask(e) {
  e.preventDefault();
  const input = document.getElementById('new-subtask-input');
  const subtaskTitle = input.value.trim();

  if (!subtaskTitle) {
    showToast('Peringatan: Judul sub-tugas tidak boleh kosong.', 'error');
    return;
  }
  if (!validateInputSymbol(subtaskTitle, 'Sub-tugas')) return;
  if (!state.currentTaskDetailId) {
    showToast('Peringatan: Tidak ada tugas yang terpilih.', 'error');
    return;
  }

  const task = state.tasks.find(t => t.id === state.currentTaskDetailId);
  if (!task) return;

  const updatedSubtasks = [...(task.subtasks || []), { title: subtaskTitle, completed: false }];

  try {
    await apiRequest(`/tasks/${task.id}`, 'PUT', { subtasks: updatedSubtasks });
    input.value = '';
    await fetchTasks();
    openTaskDetailModal(task.id);
    renderCurrentView();
  } catch (err) {
    showToast(err.message || 'Gagal menambah subtask', 'error');
  }
}

async function deleteCurrentTask() {
  if (!state.currentTaskDetailId) return;
  if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;

  try {
    await apiRequest(`/tasks/${state.currentTaskDetailId}`, 'DELETE');
    closeTaskDetailModal();
    showToast('Tugas berhasil dihapus.', 'success');
    await fetchTasks();
    renderCurrentView();
  } catch (err) {
    showToast(err.message || 'Gagal menghapus tugas.', 'error');
  }
}

function editCurrentTaskFromDetail() {
  const id = state.currentTaskDetailId;
  closeTaskDetailModal();
  openTaskModal(id);
}

async function resetDemoData() {
  if (!confirm('Tindakan ini akan mengosongkan tugas & matkul saat ini dan memuat ulang data contoh baru. Lanjutkan?')) return;
  try {
    await apiRequest('/auth/reset-demo', 'POST');
    showToast('Data contoh berhasil dimuat ulang!', 'success');
    await loadInitialAppData();
  } catch (err) {
    showToast(err.message || 'Gagal mereset demo data', 'error');
  }
}

function exportDataJSON() {
  const data = {
    user: state.user,
    courses: state.courses,
    tasks: state.tasks,
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `acadamiatask_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data berhasil diekspor ke file JSON.', 'success');
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);

  const themeIcon = document.getElementById('theme-icon');
  if (next === 'light') {
    themeIcon.className = 'fa-solid fa-sun';
  } else {
    themeIcon.className = 'fa-solid fa-moon';
  }
}

function toggleMobileSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="${type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}"></i>
    <span>${escapeHTML(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function formatDateTime(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatShortDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short'
  });
}

function getCountdownBadgeText(isoString) {
  if (!isoString) return '-';
  const now = new Date();
  const deadline = new Date(isoString);
  const diffMs = deadline - now;

  if (diffMs <= 0) return 'LEWAT DEADLINE!';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 1) {
    return `H-${diffDays} (Sisa ${diffHours % 24} Jam)`;
  } else {
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `Sisa ${diffHours} J ${mins} M`;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
