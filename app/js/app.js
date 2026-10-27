/**
 * Main Application Controller (手機載體與極速跳轉版)
 * - View Switching between MCQ Quiz & Mistake Review
 * - Dynamic Global Bottom Bar Display Control
 * - Theme Switcher & Sound Toggle
 * - Google Sign-In & Firebase Sync
 */

(function (window) {
  window.SOUND_ENABLED = true;

  const App = {
    currentView: 'quiz',

    init() {
      this.initTheme();
      this.initSound();
      this.initAuthUI();
      this.setupNavigation();
      this.setupFirebaseModal();

      // Initialize Engines
      if (window.MCQQuiz) window.MCQQuiz.init('view-quiz');
      if (window.ReviewSystem) window.ReviewSystem.init('view-review');

      // Initialize Auth
      if (window.Auth) window.Auth.init();

      this.switchView('quiz');
      this.updateStatsDisplay();

      window.addEventListener('progress-updated', () => this.updateStatsDisplay());
      window.addEventListener('mistakes-updated', () => this.updateStatsDisplay());
    },

    initTheme() {
      const savedTheme = localStorage.getItem('rex3_theme') || 
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', savedTheme);

      const btn = document.getElementById('btn-toggle-theme');
      if (btn) {
        btn.addEventListener('click', () => {
          const current = document.documentElement.getAttribute('data-theme');
          const next = current === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          localStorage.setItem('rex3_theme', next);
          this.updateThemeIcon(next);
        });
      }
      this.updateThemeIcon(savedTheme);
    },

    updateThemeIcon(theme) {
      const icon = document.querySelector('#btn-toggle-theme i');
      if (icon) {
        icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
        if (window.lucide) window.lucide.createIcons();
      }
    },

    initSound() {
      const saved = localStorage.getItem('rex3_sound');
      if (saved !== null) window.SOUND_ENABLED = saved === 'true';

      const btn = document.getElementById('btn-toggle-sound');
      if (btn) {
        btn.addEventListener('click', () => {
          window.SOUND_ENABLED = !window.SOUND_ENABLED;
          localStorage.setItem('rex3_sound', window.SOUND_ENABLED ? 'true' : 'false');
          this.updateSoundIcon();
        });
      }
      this.updateSoundIcon();
    },

    updateSoundIcon() {
      const icon = document.querySelector('#btn-toggle-sound i');
      if (icon) {
        icon.setAttribute('data-lucide', window.SOUND_ENABLED ? 'volume-2' : 'volume-x');
        if (window.lucide) window.lucide.createIcons();
      }
    },

    initAuthUI() {
      const btnLogin = document.getElementById('btn-login-google');
      const userBox = document.getElementById('user-profile-box');

      if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
          await window.Auth.loginWithGoogle();
        });
      }

      window.addEventListener('auth-changed', (e) => {
        const user = e.detail;
        if (user) {
          btnLogin?.classList.add('hidden');
          userBox?.classList.remove('hidden');
          const av = document.getElementById('user-avatar');
          if (av) av.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0071e3&color=fff`;
        } else {
          btnLogin?.classList.remove('hidden');
          userBox?.classList.add('hidden');
        }
      });

      document.getElementById('btn-user-logout')?.addEventListener('click', () => {
        if (confirm('確定要登出帳號嗎？')) {
          window.Auth.logout();
        }
      });

      const initialUser = window.Auth.getCurrentUser();
      if (initialUser) {
        btnLogin?.classList.add('hidden');
        userBox?.classList.remove('hidden');
        const av = document.getElementById('user-avatar');
        if (av) av.src = initialUser.photoURL;
      }
    },

    setupNavigation() {
      document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
          const v = btn.getAttribute('data-view');
          this.switchView(v);
        });
      });
    },

    switchView(viewName) {
      this.currentView = viewName;

      // Update Nav Buttons
      document.querySelectorAll('[data-view]').forEach(btn => {
        if (btn.getAttribute('data-view') === viewName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Toggle View Divs
      const views = ['quiz', 'review'];
      views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) {
          if (v === viewName) {
            el.classList.remove('hidden');
          } else {
            el.classList.add('hidden');
          }
        }
      });

      // Bottom bar is only visible in quiz view
      const bottomBar = document.getElementById('global-bottom-bar');
      if (bottomBar) {
        if (viewName === 'quiz') {
          bottomBar.classList.remove('hidden');
          bottomBar.style.display = 'flex';
        } else {
          bottomBar.classList.add('hidden');
          bottomBar.style.display = 'none';
        }
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    updateStatsDisplay() {
      const mistakes = window.Auth.getMistakes();
      const unmastered = Object.values(mistakes).filter(m => !m.mastered).length;

      const badgeMistakes = document.getElementById('nav-mistake-badge');
      if (badgeMistakes) {
        badgeMistakes.textContent = unmastered;
        badgeMistakes.className = unmastered > 0 ? 'badge badge-red font-mono' : 'hidden';
      }
    },

    setupFirebaseModal() {
      const modal = document.getElementById('firebase-modal');
      const btnOpen = document.getElementById('btn-open-firebase-cfg');
      const btnClose = document.getElementById('btn-close-firebase-modal');
      const btnSave = document.getElementById('btn-save-firebase-cfg');
      const textarea = document.getElementById('firebase-cfg-input');

      if (btnOpen && modal) {
        btnOpen.addEventListener('click', () => {
          const existing = window.Auth.getFirebaseConfig();
          if (existing && textarea) textarea.value = JSON.stringify(existing, null, 2);
          modal.classList.remove('hidden');
        });
      }

      btnClose?.addEventListener('click', () => {
        modal?.classList.add('hidden');
      });

      btnSave?.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(textarea.value.trim());
          window.Auth.setFirebaseConfig(parsed);
          modal?.classList.add('hidden');
        } catch (err) {
          alert('JSON 設定格式不正確，請檢查內容！');
        }
      });
    }
  };

  window.App = App;

  document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
    if (window.lucide) window.lucide.createIcons();
  });
})(window);
