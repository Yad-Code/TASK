
const COLUMNS = [
  { id: 'todo', label: 'To Do', icon: 'fa-circle-dot', color: '#888' },
  { id: 'progress', label: 'In Progress', icon: 'fa-spinner', color: '#38BDF8' },
  { id: 'review', label: 'Review', icon: 'fa-eye', color: '#EAB308' },
  { id: 'done', label: 'Done', icon: 'fa-circle-check', color: '#22C55E' }
];

const TEAM_MEMBERS = ['Alex Chen', 'Maya Patel', 'Liam Foster', 'Sofia Reyes', 'Noah Kim'];
const FAKE_ACTIONS = [
  { type: 'moved', template: (t, f, to) => `moved "${t}" from ${f} to ${to}` },
  { type: 'commented', template: (t) => `commented on "${t}"` },
  { type: 'created', template: (t) => `created a new task "${t}"` },
  { type: 'completed', template: (t) => `completed "${t}"` },
  { type: 'priority', template: (t, f) => `changed priority of "${t}" to ${f}` }
];

let currentUser = null;
let tasks = [];
let activities = [];
let currentFilter = 'all';
let searchQuery = '';
let draggedTaskId = null;

function switchAuthTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tab-login').classList.toggle('bg-card', tab === 'login');
  document.getElementById('tab-login').classList.toggle('text-txt', tab === 'login');
  document.getElementById('tab-login').classList.toggle('text-txtSec', tab !== 'login');
  document.getElementById('tab-register').classList.toggle('bg-card', tab === 'register');
  document.getElementById('tab-register').classList.toggle('text-txt', tab === 'register');
  document.getElementById('tab-register').classList.toggle('text-txtSec', tab !== 'register');
  hideErrors();
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg; el.classList.remove('hidden');
}
function hideErrors() {
  document.querySelectorAll('[id$="-error"]').forEach(e => e.classList.add('hidden'));
}

function getUsers() { return JSON.parse(localStorage.getItem('tf_users') || '[]'); }
function saveUsers(users) { localStorage.setItem('tf_users', JSON.stringify(users)); }

function handleRegister(e) {
  e.preventDefault();
  hideErrors();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = document.getElementById('reg-password').value;
  const users = getUsers();
  if (users.find(u => u.email === email)) {
    showError('register-error', 'An account with this email already exists.');
    return;
  }
  const user = { id: crypto.randomUUID(), name, email, password, createdAt: Date.now() };
  users.push(user);
  saveUsers(users);
  showToast('success', 'Account created successfully! Please sign in.');
  switchAuthTab('login');
  document.getElementById('login-email').value = email;
}

function handleLogin(e) {
  e.preventDefault();
  hideErrors();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    showError('login-error', 'Invalid email or password. Please try again.');
    return;
  }
  currentUser = user;
  localStorage.setItem('tf_session', JSON.stringify(user));
  initApp();
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem('tf_session');
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  if (realtimeInterval) clearInterval(realtimeInterval);
}

function checkSession() {
  const session = localStorage.getItem('tf_session');
  if (session) {
    currentUser = JSON.parse(session);
    const users = getUsers();
    const fresh = users.find(u => u.id === currentUser.id);
    if (fresh) { currentUser = fresh; initApp(); }
    else { localStorage.removeItem('tf_session'); }
  }
}

//tasks
function getTasks() { return JSON.parse(localStorage.getItem('tf_tasks') || '[]'); }
function saveTasks(t) { localStorage.setItem('tf_tasks', JSON.stringify(t)); }

function generateId() { return crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2,8); }

function getSampleTasks(userId) {
  const now = Date.now();
  const day = 86400000;
  return [
    { id: generateId(), title: 'Design system audit', description: 'Review all design tokens, components, and patterns for consistency across the product.', status: 'todo', priority: 'high', dueDate: new Date(now + 2*day).toISOString().split('T')[0], tags: ['design','audit'], createdBy: userId, createdAt: now - day },
    { id: generateId(), title: 'API endpoint refactor', description: 'Migrate legacy REST endpoints to the new GraphQL schema. Update documentation.', status: 'todo', priority: 'medium', dueDate: new Date(now + 5*day).toISOString().split('T')[0], tags: ['backend','api'], createdBy: userId, createdAt: now - 2*day },
    { id: generateId(), title: 'User onboarding flow', description: 'Build the step-by-step onboarding experience with progress tracking and skip options.', status: 'progress', priority: 'urgent', dueDate: new Date(now + 1*day).toISOString().split('T')[0], tags: ['frontend','ux'], createdBy: userId, createdAt: now - 3*day },
    { id: generateId(), title: 'Performance benchmarks', description: 'Run Lighthouse and Web Vitals benchmarks on all key pages. Document results.', status: 'progress', priority: 'low', dueDate: new Date(now + 7*day).toISOString().split('T')[0], tags: ['performance'], createdBy: userId, createdAt: now - day },
    { id: generateId(), title: 'Payment integration testing', description: 'End-to-end testing of Stripe payment flows including edge cases and error handling.', status: 'review', priority: 'high', dueDate: new Date(now + 3*day).toISOString().split('T')[0], tags: ['testing','payments'], createdBy: userId, createdAt: now - 4*day },
    { id: generateId(), title: 'Database migration script', description: 'Write and test the migration script for the new schema changes.', status: 'done', priority: 'medium', dueDate: new Date(now - 1*day).toISOString().split('T')[0], tags: ['backend','database'], createdBy: userId, createdAt: now - 6*day },
    { id: generateId(), title: 'Accessibility compliance', description: 'Ensure WCAG 2.1 AA compliance across all public-facing pages. Fix contrast and ARIA issues.', status: 'done', priority: 'high', dueDate: new Date(now - 2*day).toISOString().split('T')[0], tags: ['a11y','frontend'], createdBy: userId, createdAt: now - 8*day },
  ];
}

function initApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');

  // Set user info in header
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-email').textContent = currentUser.email;

  // Load tasks  if none for this user, seed sample data
  tasks = getTasks().filter(t => t.createdBy === currentUser.id);
  if (tasks.length === 0) {
    tasks = getSampleTasks(currentUser.id);
    const allTasks = getTasks();
    allTasks.push(...tasks);
    saveTasks(allTasks);
  }

  // Load activities
  activities = JSON.parse(localStorage.getItem('tf_activities_' + currentUser.id) || '[]');
  if (activities.length === 0) seedActivities();

  renderBoard();
  renderActivityFeed();
  startRealtimeSimulation();
}

// Render
function renderBoard() {
  const board = document.getElementById('kanban-board');
  const filtered = getFilteredTasks();
  const allUserTasks = getTasks().filter(t => t.createdBy === currentUser.id);

  // Stats
  document.getElementById('task-stats').textContent = `${allUserTasks.length} tasks total · ${allUserTasks.filter(t=>t.status==='done').length} completed`;

  board.innerHTML = COLUMNS.map(col => {
    const colTasks = filtered.filter(t => t.status === col.id);
    return `
      <div class="kanban-col" data-status="${col.id}"
           ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event, '${col.id}')">
        <div class="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-2">
            <i class="fa-solid ${col.icon} text-xs" style="color:${col.color}"></i>
            <span class="font-display text-sm font-semibold text-txt">${col.label}</span>
            <span class="text-[11px] text-txtMuted bg-surface px-2 py-0.5 rounded-full">${colTasks.length}</span>
          </div>
          <button onclick="openTaskModal('${col.id}')" class="text-txtMuted hover:text-accent transition-colors">
            <i class="fa-solid fa-plus text-xs"></i>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-3 space-y-2.5" data-column="${col.id}">
          ${colTasks.map(t => renderTaskCard(t)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderTaskCard(task) {
  const priorityColors = { low: 'success', medium: 'warning', high: 'accent', urgent: 'danger' };
  const priorityLabels = { low: 'Low', medium: 'Med', high: 'High', urgent: 'Urgent' };
  const pc = priorityColors[task.priority];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const dueStr = task.dueDate ? formatDueDate(task.dueDate) : '';

  return `
    <div class="task-card" draggable="true" data-task-id="${task.id}"
         ondragstart="handleDragStart(event, '${task.id}')" ondragend="handleDragEnd(event)"
         ondblclick="openDetailModal('${task.id}')">
      <div class="priority-bar priority-${task.priority}"></div>
      <div class="pl-2">
        <div class="flex items-start justify-between gap-2 mb-2">
          <h3 class="text-sm font-medium text-txt leading-snug ${task.status==='done'?'line-through text-txtMuted':''}">${escapeHtml(task.title)}</h3>
          <div class="flex gap-1 flex-shrink-0">
            <button onclick="event.stopPropagation();openTaskModalForEdit('${task.id}')" class="w-6 h-6 rounded flex items-center justify-center text-txtMuted hover:text-txt hover:bg-surface transition-all" title="Edit">
              <i class="fa-solid fa-pen text-[9px]"></i>
            </button>
            <button onclick="event.stopPropagation();deleteTask('${task.id}')" class="w-6 h-6 rounded flex items-center justify-center text-txtMuted hover:text-danger hover:bg-danger/10 transition-all" title="Delete">
              <i class="fa-regular fa-trash-can text-[9px]"></i>
            </button>
          </div>
        </div>
        ${task.description ? `<p class="text-xs text-txtSec mb-2.5 line-clamp-2 leading-relaxed">${escapeHtml(task.description)}</p>` : ''}
        <div class="flex flex-wrap gap-1.5 mb-2.5">
          ${task.tags && task.tags.length ? task.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('') : ''}
        </div>
        <div class="flex items-center justify-between">
          <span class="badge bg-${pc}Muted text-${pc}">${priorityLabels[task.priority]}</span>
          ${dueStr ? `<span class="text-[11px] ${isOverdue ? 'text-danger font-medium' : 'text-txtMuted'} flex items-center gap-1">
            <i class="fa-regular fa-calendar text-[9px]"></i> ${dueStr}
          </span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function getFilteredTasks() {
  return tasks.filter(t => {
    if (currentFilter !== 'all' && t.priority !== currentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)) || (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)));
    }
    return true;
  });
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('#filter-buttons button').forEach(btn => {
    const isActive = btn.dataset.filter === f;
    btn.classList.toggle('active-filter', isActive);
    if (isActive) {
      btn.style.background = 'rgba(255,107,53,0.12)'; btn.style.color = '#FF6B35'; btn.style.borderColor = 'rgba(255,107,53,0.3)';
    } else {
      btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = '';
    }
  });
  renderBoard();
}

function filterTasks() {
  searchQuery = document.getElementById('search-input').value.trim();
  renderBoard();
}

// Drag n Drop
function handleDragStart(e, taskId) {
  draggedTaskId = taskId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', taskId);
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-task-id="${taskId}"]`);
    if (el) el.classList.add('dragging');
  });
}

function handleDragEnd(e) {
  document.querySelectorAll('.task-card.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.kanban-col.drag-over').forEach(el => el.classList.remove('drag-over'));
  document.querySelectorAll('.drop-placeholder').forEach(el => el.remove());
  draggedTaskId = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const col = e.currentTarget;
  col.classList.add('drag-over');

  // Add placeholder if not exists
  const columnBody = col.querySelector('[data-column]');
  if (!columnBody.querySelector('.drop-placeholder')) {
    const placeholder = document.createElement('div');
    placeholder.className = 'drop-placeholder';
    columnBody.appendChild(placeholder);
  }
}

function handleDragLeave(e) {
  const col = e.currentTarget;
  if (!col.contains(e.relatedTarget)) {
    col.classList.remove('drag-over');
    col.querySelectorAll('.drop-placeholder').forEach(el => el.remove());
  }
}

function handleDrop(e, newStatus) {
  e.preventDefault();
  const col = e.currentTarget;
  col.classList.remove('drag-over');
  col.querySelectorAll('.drop-placeholder').forEach(el => el.remove());

  const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
  if (!taskId) return;

  const task = tasks.find(t => t.id === taskId);
  if (!task || task.status === newStatus) return;

  const oldStatus = task.status;
  const oldLabel = COLUMNS.find(c => c.id === oldStatus)?.label || oldStatus;
  const newLabel = COLUMNS.find(c => c.id === newStatus)?.label || newStatus;

  task.status = newStatus;
  persistTasks();


  col.classList.add('column-flash');
  setTimeout(() => col.classList.remove('column-flash'), 600);

  addActivity(currentUser.name, 'moved', task.title, oldLabel, newLabel);
  showToast('info', `"${task.title}" moved to ${newLabel}`);
  renderBoard();
}

// Modal
function openTaskModal(defaultStatus) {
  document.getElementById('modal-title').textContent = 'New Task';
  document.getElementById('task-id').value = '';
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-status').value = defaultStatus || 'todo';
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-due').value = '';
  document.getElementById('task-tags').value = '';
  document.getElementById('delete-task-btn').classList.add('hidden');
  document.getElementById('task-modal').classList.add('active');
  setTimeout(() => document.getElementById('task-title').focus(), 200);
}

function openTaskModalForEdit(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  document.getElementById('modal-title').textContent = 'Edit Task';
  document.getElementById('task-id').value = task.id;
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-desc').value = task.description || '';
  document.getElementById('task-status').value = task.status;
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-due').value = task.dueDate || '';
  document.getElementById('task-tags').value = (task.tags || []).join(', ');
  document.getElementById('delete-task-btn').classList.remove('hidden');
  document.getElementById('task-modal').classList.add('active');
  setTimeout(() => document.getElementById('task-title').focus(), 200);
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.remove('active');
}

function handleTaskSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('task-id').value;
  const title = document.getElementById('task-title').value.trim();
  const desc = document.getElementById('task-desc').value.trim();
  const status = document.getElementById('task-status').value;
  const priority = document.getElementById('task-priority').value;
  const dueDate = document.getElementById('task-due').value;
  const tagsStr = document.getElementById('task-tags').value.trim();
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (id) {
    // Edit
    const task = tasks.find(t => t.id === id);
    if (task) {
      const oldPriority = task.priority;
      task.title = title; task.description = desc; task.status = status;
      task.priority = priority; task.dueDate = dueDate; task.tags = tags;
      persistTasks();
      if (oldPriority !== priority) {
        const pLabels = { low:'Low', medium:'Medium', high:'High', urgent:'Urgent' };
        addActivity(currentUser.name, 'priority', title, pLabels[priority]);
      }
      showToast('success', 'Task updated successfully');
    }
  } else {
    // Create
    const task = {
      id: generateId(), title, description: desc, status, priority,
      dueDate, tags, createdBy: currentUser.id, createdAt: Date.now()
    };
    tasks.push(task);
    persistTasks();
    addActivity(currentUser.name, 'created', title);
    showToast('success', 'Task created successfully');
  }
  closeTaskModal();
  renderBoard();
}

function deleteCurrentTask() {
  const id = document.getElementById('task-id').value;
  if (!id) return;
  deleteTask(id);
  closeTaskModal();
}

function deleteTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  tasks = tasks.filter(t => t.id !== taskId);
  persistTasks();
  addActivity(currentUser.name, 'completed', task.title); // shows as removed
  showToast('danger', `"${task.title}" deleted`);
  renderBoard();
}

// ==================== DETAIL MODAL ====================
function openDetailModal(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const priorityColors = { low: '#22C55E', medium: '#EAB308', high: '#FF6B35', urgent: '#EF4444' };
  const priorityLabels = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
  const statusLabel = COLUMNS.find(c => c.id === task.status)?.label || task.status;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  document.getElementById('detail-content').innerHTML = `
    <div class="flex items-start justify-between mb-5">
      <div class="flex items-center gap-3">
        <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${priorityColors[task.priority]}"></div>
        <h2 class="font-display text-xl font-bold text-txt ${task.status==='done'?'line-through text-txtSec':''}">${escapeHtml(task.title)}</h2>
      </div>
      <button onclick="closeDetailModal()" class="text-txtMuted hover:text-txt transition-colors flex-shrink-0">
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>
    </div>
    ${task.description ? `<p class="text-sm text-txtSec leading-relaxed mb-5 pl-6">${escapeHtml(task.description)}</p>` : '<div class="mb-5"></div>'}
    <div class="grid grid-cols-2 gap-3 mb-5">
      <div class="bg-surface rounded-lg p-3 border border-border">
        <p class="text-[10px] text-txtMuted uppercase tracking-wider mb-1">Status</p>
        <p class="text-sm font-medium text-txt">${statusLabel}</p>
      </div>
      <div class="bg-surface rounded-lg p-3 border border-border">
        <p class="text-[10px] text-txtMuted uppercase tracking-wider mb-1">Priority</p>
        <p class="text-sm font-medium" style="color:${priorityColors[task.priority]}">${priorityLabels[task.priority]}</p>
      </div>
      <div class="bg-surface rounded-lg p-3 border border-border">
        <p class="text-[10px] text-txtMuted uppercase tracking-wider mb-1">Due Date</p>
        <p class="text-sm font-medium ${isOverdue ? 'text-danger' : 'text-txt'}">${task.dueDate ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) : 'Not set'}</p>
      </div>
      <div class="bg-surface rounded-lg p-3 border border-border">
        <p class="text-[10px] text-txtMuted uppercase tracking-wider mb-1">Created</p>
        <p class="text-sm font-medium text-txt">${new Date(task.createdAt).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</p>
      </div>
    </div>
    ${task.tags && task.tags.length ? `
      <div class="mb-5">
        <p class="text-[10px] text-txtMuted uppercase tracking-wider mb-2">Tags</p>
        <div class="flex flex-wrap gap-1.5">${task.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      </div>
    ` : ''}
    <div class="flex gap-3 pt-3 border-t border-border">
      <button onclick="closeDetailModal();openTaskModalForEdit('${task.id}')" class="btn-primary flex-1 flex items-center justify-center gap-2">
        <i class="fa-solid fa-pen text-xs"></i> Edit Task
      </button>
      <button onclick="closeDetailModal();deleteTask('${task.id}')" class="btn-ghost text-danger border-danger/30 hover:bg-danger/10 px-4">
        <i class="fa-regular fa-trash-can"></i>
      </button>
    </div>
  `;
  document.getElementById('detail-modal').classList.add('active');
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.remove('active');
}

// ==================== ACTIVITY FEED ====================
function addActivity(userName, type, taskTitle, extra1, extra2) {
  const activity = {
    id: generateId(), user: userName, type, taskTitle,
    extra1, extra2, timestamp: Date.now()
  };
  activities.unshift(activity);
  if (activities.length > 50) activities = activities.slice(0, 50);
  localStorage.setItem('tf_activities_' + currentUser.id, JSON.stringify(activities));
  renderActivityFeed(true);
}

function seedActivities() {
  const now = Date.now();
  const sampleActivities = [
    { user: 'Alex Chen', type: 'created', taskTitle: 'Design system audit', timestamp: now - 3600000 },
    { user: 'Maya Patel', type: 'moved', taskTitle: 'User onboarding flow', extra1: 'To Do', extra2: 'In Progress', timestamp: now - 7200000 },
    { user: 'Liam Foster', type: 'commented', taskTitle: 'API endpoint refactor', timestamp: now - 10800000 },
    { user: 'Sofia Reyes', type: 'completed', taskTitle: 'Database migration script', timestamp: now - 14400000 },
    { user: 'Noah Kim', type: 'priority', taskTitle: 'Payment integration testing', extra1: 'High', timestamp: now - 18000000 },
  ];
  activities = sampleActivities;
  localStorage.setItem('tf_activities_' + currentUser.id, JSON.stringify(activities));
}

function renderActivityFeed(isNew) {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;
  feed.innerHTML = activities.map((a, i) => {
    const iconMap = { moved: 'fa-arrows-left-right text-info', commented: 'fa-comment text-warning', created: 'fa-plus text-success', completed: 'fa-check text-success', priority: 'fa-flag text-accent' };
    const icon = iconMap[a.type] || 'fa-circle text-txtMuted';
    let text = '';
    if (a.type === 'moved') text = `moved "${a.taskTitle}" from ${a.extra1} to ${a.extra2}`;
    else if (a.type === 'commented') text = `commented on "${a.taskTitle}"`;
    else if (a.type === 'created') text = `created "${a.taskTitle}"`;
    else if (a.type === 'completed') text = `completed "${a.taskTitle}"`;
    else if (a.type === 'priority') text = `set "${a.taskTitle}" priority to ${a.extra1}`;

    return `
      <div class="activity-item ${i === 0 && isNew ? '' : ''}">
        <div class="flex gap-2.5">
          <div class="w-6 h-6 rounded-full bg-surface flex items-center justify-center flex-shrink-0 mt-0.5">
            <i class="fa-solid ${icon} text-[9px]"></i>
          </div>
          <div class="min-w-0">
            <p class="text-xs text-txtSec leading-relaxed"><span class="font-medium text-txt">${escapeHtml(a.user)}</span> ${escapeHtml(text)}</p>
            <p class="text-[10px] text-txtMuted mt-0.5">${timeAgo(a.timestamp)}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Simulation
let realtimeInterval = null;

function startRealtimeSimulation() {
  if (realtimeInterval) clearInterval(realtimeInterval);
  // Simulate team activity every 8-15 seconds
  function scheduleNext() {
    const delay = 8000 + Math.random() * 7000;
    realtimeInterval = setTimeout(() => {
      simulateTeamActivity();
      scheduleNext();
    }, delay);
  }
  scheduleNext();
}

function simulateTeamActivity() {
  if (!currentUser) return;
  const member = TEAM_MEMBERS[Math.floor(Math.random() * TEAM_MEMBERS.length)];
  const actionType = FAKE_ACTIONS[Math.floor(Math.random() * FAKE_ACTIONS.length)];

  // Pick a random existing task or make one up
  const existingTasks = tasks.length > 0 ? tasks : [{ title: 'Sprint planning' }, { title: 'Code review' }, { title: 'Deploy to staging' }];
  const task = existingTasks[Math.floor(Math.random() * existingTasks.length)];

  let extra1, extra2;
  if (actionType.type === 'moved') {
    const col1 = COLUMNS[Math.floor(Math.random() * COLUMNS.length)];
    let col2 = COLUMNS[Math.floor(Math.random() * COLUMNS.length)];
    while (col2.id === col1.id) col2 = COLUMNS[Math.floor(Math.random() * COLUMNS.length)];
    extra1 = col1.label; extra2 = col2.label;
  } else if (actionType.type === 'priority') {
    const priorities = ['Low', 'Medium', 'High', 'Urgent'];
    extra1 = priorities[Math.floor(Math.random() * priorities.length)];
  }

  addActivity(member, actionType.type, task.title, extra1, extra2);
}

// Util
function persistTasks() {
  const allTasks = getTasks();
  // Remove old versions of our tasks, add current
  const otherTasks = allTasks.filter(t => t.createdBy !== currentUser.id);
  saveTasks([...otherTasks, ...tasks]);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDueDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((target - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < -1) return `${Math.abs(diff)}d overdue`;
  if (diff <= 7) return `${diff}d left`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function showToast(type, message) {
  const container = document.getElementById('toast-container');
  const iconMap = {
    success: 'fa-circle-check text-success',
    danger: 'fa-circle-xmark text-danger',
    info: 'fa-circle-info text-info',
    warning: 'fa-triangle-exclamation text-warning'
  };
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid ${iconMap[type] || iconMap.info}"></i><span class="text-txtSec">${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Key short cuts
document.addEventListener('keydown', (e) => {
  if (!currentUser) return;
  // Escape closes modals
  if (e.key === 'Escape') {
    if (document.getElementById('detail-modal').classList.contains('active')) closeDetailModal();
    else if (document.getElementById('task-modal').classList.contains('active')) closeTaskModal();
  }
  // Ctrl+N new task (only when no modal is open and not in input)
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    if (!document.getElementById('task-modal').classList.contains('active') &&
        !document.getElementById('detail-modal').classList.contains('active') &&
        document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      openTaskModal();
    }
  }
  // / to focus search
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    document.getElementById('search-input')?.focus();
  }
});

// init
checkSession();
// Set initial filter style
setFilter('all');
