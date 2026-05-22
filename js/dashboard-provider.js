let currentProvider = null;
let pollInterval    = null;

// Init
(async () => {
  await checkSession();
  loadPendingRequests();
  loadProviderJobs();
  loadStats();
  pollInterval = setInterval(() => {
    loadPendingRequests(true);
    loadProviderJobs(true);
  }, 7000);
})();

async function checkSession() {
  const res  = await fetch('php/auth.php?action=check_session');
  const data = await res.json();
  if (!data.logged_in || !data.is_provider) {
    window.location.href = 'index.html';
    return;
  }
  currentProvider = data;
  document.getElementById('nav_provider_name').textContent = '🔧 ' + data.user_name;
}

function showSection(name) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.querySelector(`.sidebar-item[data-section="${name}"]`).classList.add('active');
  if (name === 'pending')  loadPendingRequests();
  if (name === 'my-jobs')  loadProviderJobs();
  if (name === 'stats')    loadStats();
}

// Load pending requests
async function loadPendingRequests(silent = false) {
  if (!silent) {
    document.getElementById('pending_requests_container').innerHTML = '<div class="loading-state">Loading requests...</div>';
  }

  const res  = await fetch('php/requests.php?action=get_pending_requests');
  const data = await res.json();

  document.getElementById('pending_badge').textContent = data.requests?.length || 0;

  if (!data.requests || data.requests.length === 0) {
    document.getElementById('pending_requests_container').innerHTML = `
      <div class="empty-state">
        <div class="es-icon">🔔</div>
        <div class="es-title">No Pending Requests</div>
        <div class="es-desc">All clear! No users need help right now. Check back soon.</div>
      </div>`;
    return;
  }

  const html = `<div class="requests-list">${data.requests.map(r => renderPendingCard(r)).join('')}</div>`;
  document.getElementById('pending_requests_container').innerHTML = html;
}

function renderPendingCard(r) {
  const icons = { 'Flat Tyre':'🛞','Dead Battery':'🔋','Engine Failure':'⚙️','Out of Fuel':'⛽','Accident Damage':'💥','Other':'🔧' };
  const icon  = icons[r.issue_type] || '🔧';
  const ago   = timeAgo(r.created_at);

  return `
    <div class="request-card">
      <div class="rc-header">
        <div class="rc-issue">${icon} ${r.issue_type}</div>
        <span class="status-badge status-pending">Pending • ${ago}</span>
      </div>
      <div class="rc-body">
        <div class="user-info-row">
          <span class="ui-icon">👤</span>
          <span class="ui-name">${r.user_name}</span>
          <span class="ui-phone">📞 ${r.user_phone}</span>
        </div>
        <div class="rc-location">${r.location_address}</div>
        ${r.description ? `<div class="rc-desc">${r.description}</div>` : ''}
      </div>
      <div class="rc-footer">
        <div class="job-actions">
          <button class="btn-primary" onclick="acceptRequest(${r.id})">✅ Accept Request</button>
        </div>
        <span style="font-size:0.78rem;color:var(--text-dim)">ID #${r.id}</span>
      </div>
    </div>`;
}

// Accept request
async function acceptRequest(id) {
  if (!confirm('Accept this breakdown request?')) return;
  const fd = new FormData();
  fd.append('action', 'accept_request');
  fd.append('request_id', id);
  const res  = await fetch('php/requests.php', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.success) {
    showNotification('✅ Request accepted! User has been notified.');
    loadPendingRequests();
    loadProviderJobs();
    showSection('my-jobs');
  } else {
    alert('❌ ' + data.msg);
  }
}

// Load provider jobs
async function loadProviderJobs(silent = false) {
  if (!silent) {
    document.getElementById('my_jobs_container').innerHTML = '<div class="loading-state">Loading your jobs...</div>';
  }

  const res  = await fetch('php/requests.php?action=get_provider_jobs');
  const data = await res.json();

  if (!data.jobs || data.jobs.length === 0) {
    document.getElementById('my_jobs_container').innerHTML = `
      <div class="empty-state">
        <div class="es-icon">💼</div>
        <div class="es-title">No Jobs Yet</div>
        <div class="es-desc">Accept a pending request to start your first job.</div>
        <button class="btn-primary" onclick="showSection('pending')">View Pending Requests</button>
      </div>`;
    return;
  }

  const html = `<div class="requests-list">${data.jobs.map(j => renderJobCard(j)).join('')}</div>`;
  document.getElementById('my_jobs_container').innerHTML = html;
}

function renderJobCard(j) {
  const icons = { 'Flat Tyre':'🛞','Dead Battery':'🔋','Engine Failure':'⚙️','Out of Fuel':'⛽','Accident Damage':'💥','Other':'🔧' };
  const icon  = icons[j.issue_type] || '🔧';

  let actionBtns = '';
  if (j.status === 'accepted') {
    actionBtns = `
      <button class="btn-success" onclick="startJob(${j.id})">🔧 Mark Arrived</button>
      <button class="btn-outline small" onclick="openUpdateModal(${j.id})">💬 Send Update</button>`;
  } else if (j.status === 'in_progress') {
    actionBtns = `
      <button class="btn-primary" onclick="completeJob(${j.id})">✅ Mark Completed</button>
      <button class="btn-outline small" onclick="openUpdateModal(${j.id})">💬 Send Update</button>`;
  } else if (j.status === 'completed') {
    actionBtns = `<span style="color:var(--success);font-size:0.85rem;">✅ Completed on ${formatTime(j.completed_at)}</span>`;
  }

  return `
    <div class="request-card">
      <div class="rc-header">
        <div class="rc-issue">${icon} ${j.issue_type}</div>
        <span class="status-badge status-${j.status}">${j.status.replace('_',' ')}</span>
      </div>
      <div class="rc-body">
        <div class="user-info-row">
          <span class="ui-icon">👤</span>
          <span class="ui-name">${j.user_name}</span>
          <span class="ui-phone">📞 <a href="tel:${j.user_phone}" style="color:var(--accent)">${j.user_phone}</a></span>
        </div>
        <div class="rc-location">${j.location_address}</div>
        ${j.description ? `<div class="rc-desc">${j.description}</div>` : ''}
        <div class="rc-time">Accepted: ${formatTime(j.accepted_at)}</div>
      </div>
      <div class="rc-footer">
        <div class="job-actions">${actionBtns}</div>
        <span style="font-size:0.78rem;color:var(--text-dim)">Job #${j.id}</span>
      </div>
    </div>`;
}

// Job actions
async function startJob(id) {
  const fd = new FormData();
  fd.append('action', 'start_job');
  fd.append('request_id', id);
  await fetch('php/requests.php', { method: 'POST', body: fd });
  showNotification('🔧 Status updated: Arrived at location');
  loadProviderJobs();
}

async function completeJob(id) {
  if (!confirm('Mark this job as completed?')) return;
  const fd = new FormData();
  fd.append('action', 'complete_job');
  fd.append('request_id', id);
  const res  = await fetch('php/requests.php', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.success) {
    showNotification('🎉 Job completed! Great work!');
    loadProviderJobs();
    loadStats();
  }
}

// Update Modal
function openUpdateModal(req_id) {
  document.getElementById('update_request_id').value = req_id;
  document.getElementById('update_message').value    = '';
  document.getElementById('updateModal').classList.remove('hidden');
}

function setQuickMsg(msg) {
  document.getElementById('update_message').value = msg;
}

async function sendUpdate() {
  const msg = document.getElementById('update_message').value.trim();
  if (!msg) { alert('Message cannot be empty'); return; }
  const fd = new FormData();
  fd.append('action',     'send_update');
  fd.append('request_id', document.getElementById('update_request_id').value);
  fd.append('message',    msg);
  const res  = await fetch('php/requests.php', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.success) {
    showNotification('💬 Update sent to user!');
    closeModal();
  }
}

function closeModal() {
  document.getElementById('updateModal').classList.add('hidden');
}

// Stats
async function loadStats() {
  const res  = await fetch('php/requests.php?action=get_provider_stats');
  const data = await res.json();
  if (data.success) {
    document.getElementById('stat_completed').textContent = data.total_completed;
    document.getElementById('stat_rating').textContent    = data.avg_rating;
    document.getElementById('stat_active').textContent   = data.active_jobs;
  }
}

// Provider Status
async function setProviderStatus(status) {
  document.querySelectorAll('.st-btn').forEach(b => b.classList.remove('active', 'available', 'offline'));
  const btn = document.getElementById('st_' + status);
  btn.classList.add('active', status);
  // In a real app, hit an API endpoint to update provider_status
  showNotification('Status set to: ' + status);
}

// Switch to user dashboard
function switchToUser() {
  window.location.href = 'user-dashboard.html';
}

async function logout() {
  await fetch('php/auth.php?action=logout');
  clearInterval(pollInterval);
  window.location.href = 'index.html';
}

// Notification Toast
function showNotification(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:9999;
      background:var(--bg-card);border:1px solid var(--accent);
      color:var(--text);padding:12px 20px;border-radius:12px;
      font-size:0.9rem;box-shadow:0 4px 20px rgba(0,0,0,0.5);
      transform:translateY(100px);transition:transform 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.transform = 'translateY(0)';
  setTimeout(() => { toast.style.transform = 'translateY(100px)'; }, 3000);
}

// Utils
function formatTime(ts) {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)  return diff + 's ago';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  return Math.floor(diff/3600) + 'h ago';
}
