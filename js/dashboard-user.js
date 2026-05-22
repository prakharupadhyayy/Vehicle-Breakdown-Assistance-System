let currentUser = null;
let pollInterval = null;

// Init
(async () => {
  await checkSession();
  loadMyRequests();
  pollInterval = setInterval(() => {
    loadMyRequests(true);
    checkLiveStatus();
  }, 8000);
})();

async function checkSession() {
  const res  = await fetch('php/auth.php?action=check_session');
  const data = await res.json();
  if (!data.logged_in) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = data;
  document.getElementById('nav_user_name').textContent = '👤 ' + data.user_name;
}

// Section Navigation
function showSection(name) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.querySelector(`.sidebar-item[data-section="${name}"]`).classList.add('active');
  if (name === 'my-requests') loadMyRequests();
  if (name === 'request-status') checkLiveStatus();
}

// Request Form
document.getElementById('requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const issue = document.querySelector('input[name="issue_type"]:checked');
  if (!issue) {
    showReqMsg('Please select an issue type', 'error');
    return;
  }

  const btn = document.getElementById('submitReqBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Sending request...';

  const fd = new FormData();
  fd.append('action',           'create_request');
  fd.append('issue_type',       issue.value);
  fd.append('description',      document.getElementById('req_description').value);
  fd.append('location_address', document.getElementById('req_location').value);
  fd.append('latitude',         document.getElementById('req_lat').value);
  fd.append('longitude',        document.getElementById('req_lng').value);

  const res  = await fetch('php/requests.php', { method: 'POST', body: fd });
  const data = await res.json();

  if (data.success) {
    showReqMsg('✅ Request raised! Providers are being notified...', 'success');
    document.getElementById('requestForm').reset();
    setTimeout(() => showSection('my-requests'), 1500);
  } else {
    showReqMsg('❌ ' + data.msg, 'error');
  }

  btn.disabled = false;
  btn.textContent = '🆘 Raise Emergency Request';
});

function showReqMsg(msg, type) {
  const el = document.getElementById('req_msg');
  el.textContent = msg;
  el.className = 'form-msg ' + type;
}

// Detect location
function detectLocation() {
  const btn = document.querySelector('.btn-locate');
  btn.innerHTML = '<span>⏳ Detecting...</span>';
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    document.getElementById('req_lat').value = lat;
    document.getElementById('req_lng').value = lng;
    // Reverse geocode using nominatim (free)
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      document.getElementById('req_location').value = data.display_name || `${lat}, ${lng}`;
    } catch(e) {
      document.getElementById('req_location').value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
    btn.innerHTML = '<span>📍 Detected ✅</span>';
  }, () => {
    btn.innerHTML = '<span>📍 Detect</span>';
    alert('Location access denied. Please enter manually.');
  });
}

// Load my requests
async function loadMyRequests(silent = false) {
  if (!silent) {
    document.getElementById('my_requests_container').innerHTML = '<div class="loading-state">Loading your requests...</div>';
  }
  const res  = await fetch('php/requests.php?action=get_my_requests');
  const data = await res.json();

  if (!data.success) return;

  const requests = data.requests;
  const active = requests.filter(r => ['pending','accepted','in_progress'].includes(r.status));
  const badge  = document.getElementById('active_badge');
  badge.textContent = active.length || '';

  if (requests.length === 0) {
    document.getElementById('my_requests_container').innerHTML = `
      <div class="empty-state">
        <div class="es-icon">📋</div>
        <div class="es-title">No Requests Yet</div>
        <div class="es-desc">Raise your first breakdown request when you need help.</div>
        <button class="btn-primary" onclick="showSection('new-request')">🆘 Raise Request</button>
      </div>`;
    return;
  }

  const html = `<div class="requests-list">${requests.map(r => renderRequestCard(r)).join('')}</div>`;
  document.getElementById('my_requests_container').innerHTML = html;
}

function renderRequestCard(r) {
  const statusIcons = { pending: '⏳', accepted: '✅', in_progress: '🔧', completed: '🎉', cancelled: '❌' };
  const icon = statusIcons[r.status] || '📋';

  let providerBlock = '';
  if (r.accepted_by && r.provider_name) {
    providerBlock = `
      <div class="provider-info">
        <div class="pi-avatar">${r.provider_name.charAt(0)}</div>
        <div>
          <div class="pi-name">🔧 ${r.provider_name}</div>
          <div class="pi-detail">${r.provider_service || ''} • ${r.provider_vehicle || ''} • 📞 ${r.provider_phone || ''}</div>
        </div>
      </div>`;
  }

  let actionBtns = '';
  if (r.status === 'pending') {
    actionBtns = `<button class="btn-danger" onclick="cancelRequest(${r.id})">Cancel</button>`;
  }
  if (r.status === 'completed' && r.accepted_by && !r.rated) {
    actionBtns += `<button class="btn-primary small" onclick="openRating(${r.id}, ${r.accepted_by}, '${r.provider_name}')">⭐ Rate Provider</button>`;
  }
  if (['accepted','in_progress'].includes(r.status)) {
    actionBtns += `<button class="btn-outline small" onclick="showLive(${r.id})">📡 Live Updates</button>`;
  }

  return `
    <div class="request-card" id="req_${r.id}">
      <div class="rc-header">
        <div class="rc-issue">${icon} ${r.issue_type}</div>
        <div class="rc-meta">
          <span class="status-badge status-${r.status}">${r.status.replace('_',' ')}</span>
          <span class="rc-time">${formatTime(r.created_at)}</span>
        </div>
      </div>
      <div class="rc-body">
        <div class="rc-location">${r.location_address}</div>
        ${r.description ? `<div class="rc-desc">${r.description}</div>` : ''}
      </div>
      ${providerBlock}
      <div class="rc-footer">
        <div class="job-actions">${actionBtns}</div>
      </div>
    </div>`;
}

async function cancelRequest(id) {
  if (!confirm('Cancel this request?')) return;
  const fd = new FormData();
  fd.append('action', 'cancel_request');
  fd.append('request_id', id);
  const res  = await fetch('php/requests.php', { method: 'POST', body: fd });
  const data = await res.json();
  alert(data.msg);
  loadMyRequests();
}

// Live Status
async function checkLiveStatus() {
  const res  = await fetch('php/requests.php?action=get_my_requests');
  const data = await res.json();
  const active = data.requests?.find(r => ['accepted','in_progress'].includes(r.status));
  if (active) renderLiveStatus(active);
}

async function showLive(req_id) {
  showSection('request-status');
}

async function renderLiveStatus(r) {
  const updRes  = await fetch(`php/requests.php?action=get_request_updates&request_id=${r.id}`);
  const updData = await updRes.json();
  const updates = updData.updates || [];

  const updatesHtml = updates.length > 0
    ? updates.map(u => `
        <div class="update-item">
          <div class="update-dot"></div>
          <div>
            <div class="update-msg">${u.message}</div>
            <div class="update-time">${formatTime(u.created_at)} by ${u.provider_name}</div>
          </div>
        </div>`).join('')
    : '<div class="update-item"><div class="update-dot"></div><div class="update-msg" style="color:var(--text-muted)">Waiting for provider updates...</div></div>';

  document.getElementById('live_status_container').innerHTML = `
    <div class="live-card">
      <div class="live-header">
        <div>
          <div class="live-title">🔧 ${r.issue_type}</div>
          <div style="font-size:0.82rem;color:var(--text-muted);margin-top:3px">📍 ${r.location_address}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="status-badge status-${r.status}">${r.status.replace('_',' ')}</span>
          <div class="live-ping"></div>
        </div>
      </div>
      <div class="live-body">
        ${r.provider_name ? `
          <div class="provider-info">
            <div class="pi-avatar">${r.provider_name.charAt(0)}</div>
            <div>
              <div class="pi-name">🔧 ${r.provider_name}</div>
              <div class="pi-detail">${r.provider_service || ''} • 📞 ${r.provider_phone}</div>
            </div>
          </div>` : ''}
        <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:12px">Live Updates</div>
        <div class="live-updates updates-timeline">${updatesHtml}</div>
      </div>
    </div>`;
}

// Check live on section load
const origShowSection = showSection;

// Rating
function openRating(req_id, provider_id, provider_name) {
  document.getElementById('rating_request_id').value  = req_id;
  document.getElementById('rating_provider_id').value = provider_id;
  document.getElementById('rating_provider_name').textContent = 'Rate ' + provider_name;
  document.getElementById('ratingModal').classList.remove('hidden');
}

let selectedRating = 0;
document.querySelectorAll('.star').forEach(s => {
  s.addEventListener('click', () => {
    selectedRating = parseInt(s.dataset.val);
    document.querySelectorAll('.star').forEach((st, i) => {
      st.classList.toggle('active', i < selectedRating);
    });
  });
});

async function submitRating() {
  if (!selectedRating) { alert('Please select a rating'); return; }
  const fd = new FormData();
  fd.append('action',      'rate_provider');
  fd.append('request_id',  document.getElementById('rating_request_id').value);
  fd.append('provider_id', document.getElementById('rating_provider_id').value);
  fd.append('rating',      selectedRating);
  fd.append('review',      document.getElementById('rating_review').value);
  const res  = await fetch('php/requests.php', { method: 'POST', body: fd });
  const data = await res.json();
  alert(data.msg);
  closeModal();
  loadMyRequests();
}

function closeModal() {
  document.getElementById('ratingModal').classList.add('hidden');
  const m = document.getElementById('updateModal');
  if (m) m.classList.add('hidden');
}

// Switch to provider dashboard
function switchToProvider() {
  if (currentUser && currentUser.is_provider) {
    window.location.href = 'provider-dashboard.html';
  } else {
    const ok = confirm('You are not registered as a provider. Do you want to register as one?');
    if (ok) window.location.href = 'index.html';
  }
}

async function logout() {
  await fetch('php/auth.php?action=logout');
  clearInterval(pollInterval);
  window.location.href = 'index.html';
}

// Utils
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}
