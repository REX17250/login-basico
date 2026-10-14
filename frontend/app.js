(function () {
  'use strict';

  var TOKEN_KEY = 'token';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var authView = document.getElementById('auth-view');
  var welcomeView = document.getElementById('welcome-view');
  var form = document.getElementById('auth-form');
  var title = document.getElementById('form-title');
  var emailInput = document.getElementById('email');
  var passInput = document.getElementById('password');
  var hint = document.getElementById('pw-hint');
  var submitBtn = document.getElementById('submit-btn');
  var toggleBtn = document.getElementById('toggle-btn');
  var switchText = document.getElementById('switch-text');
  var welcomeEmail = document.getElementById('welcome-email');
  var logoutBtn = document.getElementById('logout-btn');
  var message = document.getElementById('message');

  var mode = 'login';

  function showMessage(text, type) {
    message.textContent = text || '';
    message.className = 'message' + (text ? ' ' + type : '');
  }

  function setMode(newMode) {
    mode = newMode;
    var isLogin = mode === 'login';
    title.textContent = isLogin ? 'Iniciar sesión' : 'Crear cuenta';
    submitBtn.textContent = isLogin ? 'Iniciar sesión' : 'Crear cuenta';
    switchText.textContent = isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
    toggleBtn.textContent = isLogin ? 'Crear cuenta' : 'Iniciar sesión';
    passInput.setAttribute('autocomplete', isLogin ? 'current-password' : 'new-password');
    hint.hidden = isLogin;
    showMessage('');
  }

  function showAuth() {
    welcomeView.hidden = true;
    authView.hidden = false;
  }

  function showWelcome(email) {
    welcomeEmail.textContent = email;
    authView.hidden = true;
    welcomeView.hidden = false;
    logoutBtn.focus();
  }

  async function api(path, options) {
    var res = await fetch(path, options);
    var data = {};
    try { data = await res.json(); } catch (e) { /* respuesta sin JSON */ }
    return { ok: res.ok, status: res.status, data: data };
  }

  async function loadSession() {
    var token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    try {
      var r = await api('/api/me', { headers: { Authorization: 'Bearer ' + token } });
      if (r.ok && r.data.email) {
        showWelcome(r.data.email);
        return true;
      }
      if (r.status === 401) sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      showMessage('No se pudo conectar con el servidor.', 'error');
    }
    return false;
  }

  function validate(email, password) {
    if (!EMAIL_RE.test(email)) return 'Ingresa un correo válido.';
    if (password.length < 8 || password.length > 72) {
      return 'La contraseña debe tener entre 8 y 72 caracteres.';
    }
    return '';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (submitBtn.disabled) return;
    var email = emailInput.value.trim();
    var password = passInput.value;

    var err = validate(email, password);
    if (err) { showMessage(err, 'error'); return; }

    submitBtn.disabled = true;
    showMessage('');
    var headers = { 'Content-Type': 'application/json' };
    var body = JSON.stringify({ email: email, password: password });

    try {
      if (mode === 'register') {
        var r = await api('/api/register', { method: 'POST', headers: headers, body: body });
        if (r.ok) {
          passInput.value = '';
          setMode('login');
          showMessage(r.data.message || 'Cuenta creada. Ya puedes iniciar sesión.', 'ok');
        } else {
          showMessage(r.data.error || 'Error inesperado.', 'error');
        }
      } else {
        var l = await api('/api/login', { method: 'POST', headers: headers, body: body });
        if (l.ok && l.data.token) {
          sessionStorage.setItem(TOKEN_KEY, l.data.token);
          passInput.value = '';
          if (!(await loadSession())) {
            showMessage('No se pudo iniciar la sesión.', 'error');
          }
        } else {
          showMessage(l.data.error || 'Error inesperado.', 'error');
        }
      }
    } catch (ex) {
      showMessage('No se pudo conectar con el servidor.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  toggleBtn.addEventListener('click', function () {
    setMode(mode === 'login' ? 'register' : 'login');
  });

  logoutBtn.addEventListener('click', function () {
    sessionStorage.removeItem(TOKEN_KEY);
    welcomeEmail.textContent = '';
    emailInput.value = '';
    passInput.value = '';
    setMode('login');
    showAuth();
    emailInput.focus();
  });

  setMode('login');
  loadSession();
})();
