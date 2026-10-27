/**
 * Main Application Controller
 * - Navigation & Tab Switching
 * - Theme Switcher (Dark / Light)
 * - Sound Effects Toggle
 * - Google Sign-in / User Profile UI
 * - Firebase Config Modal
 */

(function (window) {
  window.SOUND_ENABLED = true;

  const App = {
    currentTab: 'matching', // default to matching since it's the signature interactive feature!

    init() {
      this.initTheme();
      this.initSound();
      this.initAuthUI();
      this.setupNavigation();
      this.setupFirebaseModal();

      // Initialize Sub-engines
      if (window.MatchingGame) window.MatchingGame.init('tab-matching');
      if (window.QuizEngine) window.QuizEngine.init('tab-quiz');
      if (window.Flashcards) window.Flashcards.init('tab-flashcards');
      if (window.ReviewSystem) window.ReviewSystem.init('tab-review');

      // Initialize Auth
      if (window.Auth) window.Auth.init();

      this.switchTab('matching');
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
          btnLogin.classList.add('hidden');
          userBox.classList.remove('hidden');
          document.getElementById('user-avatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0071e3&color=fff`;
          document.getElementById('user-name').textContent = user.name;
        } else {
          btnLogin.classList.remove('hidden');
          userBox.classList.add('hidden');
        }
      });

      // User dropdown logout
      document.getElementById('btn-user-logout')?.addEventListener('click', () => {
        if (confirm('確定要登出 Google 帳號嗎？')) {
          window.Auth.logout();
        }
      });

      const initialUser = window.Auth.getCurrentUser();
      if (initialUser) {
        btnLogin?.classList.add('hidden');
        userBox?.classList.remove('hidden');
        const av = document.getElementById('user-avatar');
        if (av) av.src = initialUser.photoURL;
        const nm = document.getElementById('user-name');
        if (nm) nm.textContent = initialUser.name;
      }
    },

    setupNavigation() {
      document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-tab');
          this.switchTab(tab);
        });
      });
    },

    switchTab(tabName) {
      this.currentTab = tabName;

      // Update Nav Buttons
      document.querySelectorAll('[data-tab]').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Toggle Containers
      const tabs = ['matching', 'quiz', 'flashcards', 'review'];
      tabs.forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if (el) {
          if (t === tabName) {
            el.classList.remove('hidden');
            el.classList.add('animate-fade-in');
          } else {
            el.classList.add('hidden');
            el.classList.remove('animate-fade-in');
          }
        }
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    updateStatsDisplay() {
      const progress = window.Auth.getProgress();
      const mistakes = window.Auth.getMistakes();

      const totalMistakes = Object.values(mistakes).filter(m => !m.mastered).length;
      const accuracy = progress.totalAnswered > 0 
        ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) 
        : 100;

      const badgeMistakes = document.getElementById('nav-mistake-badge');
      if (badgeMistakes) {
        badgeMistakes.textContent = totalMistakes;
        badgeMistakes.className = totalMistakes > 0 ? 'badge badge-red font-mono' : 'hidden';
      }

      const accBadge = document.getElementById('header-accuracy-badge');
      if (accBadge) {
        accBadge.textContent = `${accuracy}% 正確率`;
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
