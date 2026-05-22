let loginRole = 'user';
let regRole   = 'user';

// Check if already logged in
(async () => {
  try {
    const res  = await fetch('php/auth.php?action=check_session');
    const data = await res.json();
    if (data.logged_in) {
      redirect(data.role, data.is_provider);
    }
  } catch(e) {}
})();

// Tab switching
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
}
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Login role
document.querySelectorAll('#tab-login .role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#tab-login .role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loginRole = btn.dataset.role;
  });
});

// Register role
function setRegRole(role) {
  regRole = role;
  document.getElementById('reg_is_provider').value = role === 'provider' ? '1' : '0';
  document.getElementById('provider_fields').classList.toggle('hidden', role !== 'provider');
  document.querySelectorAll('.reg-role .role-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('reg_role_' + (role === 'provider' ? 'prov' : 'user')).classList.add('active');
}

// Password toggle
function togglePass(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

// Show message
function showMsg(elId, msg, type) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.className = 'form-msg ' + type;
}

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.querySelector('span').textContent = 'Signing in...';
  btn.disabled = true;

  const fd = new FormData();
  fd.append('action', 'login');
  fd.append('email', document.getElementById('login_email').value);
  fd.append('password', document.getElementById('login_pass').value);
  fd.append('role', loginRole);

  try {
    const res  = await fetch('php/auth.php', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      showMsg('login_msg', '✅ ' + data.msg, 'success');
      setTimeout(() => redirect(data.role, data.is_provider), 600);
    } else {
      showMsg('login_msg', '❌ ' + data.msg, 'error');
    }
  } catch(err) {
    showMsg('login_msg', '❌ Server error. Check PHP is running.', 'error');
  }

  btn.querySelector('span').textContent = 'Sign In';
  btn.disabled = false;
});

// Register form
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('regBtn');
  btn.querySelector('span').textContent = 'Creating...';
  btn.disabled = true;

  const fd = new FormData();
  fd.append('action', 'register');
  fd.append('full_name',   document.getElementById('reg_name').value);
  fd.append('email',       document.getElementById('reg_email').value);
  fd.append('phone',       document.getElementById('reg_phone').value);
  fd.append('password',    document.getElementById('reg_pass').value);
  fd.append('is_provider', document.getElementById('reg_is_provider').value);
  if (regRole === 'provider') {
    fd.append('provider_service', document.getElementById('reg_service').value);
    fd.append('provider_vehicle', document.getElementById('reg_vehicle').value);
  }

  try {
    const res  = await fetch('php/auth.php', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      showMsg('reg_msg', '✅ Account created! Redirecting...', 'success');
      setTimeout(() => redirect(regRole, data.is_provider), 800);
    } else {
      showMsg('reg_msg', '❌ ' + data.msg, 'error');
    }
  } catch(err) {
    showMsg('reg_msg', '❌ Server error. Make sure PHP is running.', 'error');
  }

  btn.querySelector('span').textContent = 'Create Account';
  btn.disabled = false;
});

function redirect(role, is_provider) {
  if (role === 'provider' && is_provider) {
    window.location.href = 'provider-dashboard.html';
  } else {
    window.location.href = 'user-dashboard.html';
  }
}
