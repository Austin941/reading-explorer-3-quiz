/**
 * Authentication & Progress Persistence Module
 * - Google Sign-In via Firebase Auth & Google Identity Services
 * - LocalStorage Offline-First Dual Synchronization
 * - Mistake Notebook & Progress Manager
 */

(function (window) {
  const STORAGE_KEY_PROGRESS = 'rex3_progress_data';
  const STORAGE_KEY_MISTAKES = 'rex3_mistakes_data';
  const STORAGE_KEY_USER = 'rex3_user_profile';
  const STORAGE_KEY_FIREBASE = 'rex3_firebase_config';

  // Default initial state
  let currentUser = null;
  let progressData = {
    totalAnswered: 0,
    totalCorrect: 0,
    unitProgress: {},
    vocabMastery: {},
    matchingBestTime: {},
    lastActive: Date.now()
  };
  let mistakesData = {}; // key: questionId -> { item, wrongAnswer, timestamp, mastered }

  // Load local data immediately
  function loadLocalData() {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) currentUser = JSON.parse(savedUser);

      const savedProgress = localStorage.getItem(STORAGE_KEY_PROGRESS);
      if (savedProgress) progressData = { ...progressData, ...JSON.parse(savedProgress) };

      const savedMistakes = localStorage.getItem(STORAGE_KEY_MISTAKES);
      if (savedMistakes) mistakesData = JSON.parse(savedMistakes);
    } catch (e) {
      console.warn('Failed to load local storage data:', e);
    }
  }

  loadLocalData();

  // Save to LocalStorage
  function persistLocal() {
    try {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progressData));
      localStorage.setItem(STORAGE_KEY_MISTAKES, JSON.stringify(mistakesData));
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  // Firebase initialization helper
  let firebaseApp = null;
  let firebaseAuth = null;
  let firestoreDb = null;

  function initFirebase() {
    const customConfigStr = localStorage.getItem(STORAGE_KEY_FIREBASE);
    let config = null;
    if (customConfigStr) {
      try {
        config = JSON.parse(customConfigStr);
      } catch (e) {}
    }

    if (config && window.firebase && !firebaseApp) {
      try {
        firebaseApp = firebase.initializeApp(config);
        firebaseAuth = firebase.auth();
        firestoreDb = firebase.firestore ? firebase.firestore() : null;

        firebaseAuth.onAuthStateChanged((user) => {
          if (user) {
            currentUser = {
              uid: user.uid,
              name: user.displayName || 'Google 學習者',
              email: user.email || '',
              photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'G')}&background=0071e3&color=fff`
            };
            persistLocal();
            syncFromCloud();
            window.dispatchEvent(new CustomEvent('auth-changed', { detail: currentUser }));
          }
        });
      } catch (err) {
        console.warn('Firebase init error:', err);
      }
    }
  }

  // Cloud sync functions
  async function syncToCloud() {
    if (!currentUser || !firestoreDb) return;
    try {
      await firestoreDb.collection('user_data').doc(currentUser.uid).set({
        progress: progressData,
        mistakes: mistakesData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Cloud sync error:', err);
    }
  }

  async function syncFromCloud() {
    if (!currentUser || !firestoreDb) return;
    try {
      const doc = await firestoreDb.collection('user_data').doc(currentUser.uid).get();
      if (doc.exists) {
        const cloudData = doc.data();
        if (cloudData.progress) progressData = { ...progressData, ...cloudData.progress };
        if (cloudData.mistakes) mistakesData = { ...mistakesData, ...cloudData.mistakes };
        persistLocal();
        window.dispatchEvent(new CustomEvent('progress-updated'));
      }
    } catch (err) {
      console.warn('Cloud pull error:', err);
    }
  }

  // Public Auth API
  const Auth = {
    init() {
      initFirebase();
      return currentUser;
    },

    getCurrentUser() {
      return currentUser;
    },

    async loginWithGoogle() {
      if (firebaseAuth) {
        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          const result = await firebaseAuth.signInWithPopup(provider);
          currentUser = {
            uid: result.user.uid,
            name: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL
          };
          persistLocal();
          window.dispatchEvent(new CustomEvent('auth-changed', { detail: currentUser }));
          return currentUser;
        } catch (err) {
          console.error('Firebase Auth popup error:', err);
          alert('Google 登入連線失敗：' + err.message + '\n\n您可以使用本機訪客模式，所有刷題進度與錯題將自動保存在瀏覽器中。');
        }
      }

      // Fallback guest / local Google simulation if Firebase config not yet provided
      const userName = prompt('請輸入您的學習暱稱以保存刷題進度：', currentUser?.name || '士鈞同學');
      if (userName) {
        currentUser = {
          uid: 'local_' + Math.random().toString(36).substring(2, 9),
          name: userName,
          email: `${userName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0071e3&color=fff`
        };
        persistLocal();
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: currentUser }));
      }
      return currentUser;
    },

    async logout() {
      if (firebaseAuth && firebaseAuth.currentUser) {
        await firebaseAuth.signOut();
      }
      currentUser = null;
      persistLocal();
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
    },

    setFirebaseConfig(config) {
      try {
        localStorage.setItem(STORAGE_KEY_FIREBASE, JSON.stringify(config));
        location.reload();
      } catch (e) {
        alert('設定儲存失敗：' + e.message);
      }
    },

    getFirebaseConfig() {
      const cfg = localStorage.getItem(STORAGE_KEY_FIREBASE);
      return cfg ? JSON.parse(cfg) : null;
    },

    // Progress Tracking
    getProgress() {
      return progressData;
    },

    recordAnswer(questionId, isCorrect, unitId) {
      progressData.totalAnswered++;
      if (isCorrect) progressData.totalCorrect++;

      if (unitId) {
        if (!progressData.unitProgress[unitId]) {
          progressData.unitProgress[unitId] = { answered: 0, correct: 0 };
        }
        progressData.unitProgress[unitId].answered++;
        if (isCorrect) progressData.unitProgress[unitId].correct++;
      }

      progressData.lastActive = Date.now();
      persistLocal();
      syncToCloud();
      window.dispatchEvent(new CustomEvent('progress-updated'));
    },

    recordMatchingScore(unitId, timeSeconds, pairsCount) {
      if (!progressData.matchingBestTime[unitId] || timeSeconds < progressData.matchingBestTime[unitId]) {
        progressData.matchingBestTime[unitId] = timeSeconds;
      }
      progressData.lastActive = Date.now();
      persistLocal();
      syncToCloud();
    },

    // Mistakes Notebook Management
    getMistakes() {
      return mistakesData;
    },

    addMistake(questionObj, userAnswer) {
      mistakesData[questionObj.id] = {
        id: questionObj.id,
        question: questionObj,
        wrongAnswer: userAnswer,
        addedAt: Date.now(),
        mastered: false,
        reviewCount: (mistakesData[questionObj.id]?.reviewCount || 0) + 1
      };
      persistLocal();
      syncToCloud();
      window.dispatchEvent(new CustomEvent('mistakes-updated'));
    },

    removeMistake(questionId) {
      delete mistakesData[questionId];
      persistLocal();
      syncToCloud();
      window.dispatchEvent(new CustomEvent('mistakes-updated'));
    },

    toggleMistakeMastered(questionId) {
      if (mistakesData[questionId]) {
        mistakesData[questionId].mastered = !mistakesData[questionId].mastered;
        persistLocal();
        syncToCloud();
        window.dispatchEvent(new CustomEvent('mistakes-updated'));
      }
    },

    // Export & Import
    exportAllData() {
      const exportPayload = {
        user: currentUser,
        progress: progressData,
        mistakes: mistakesData,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ReadingExplorer3_Progress_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    importAllData(jsonStr) {
      try {
        const payload = JSON.parse(jsonStr);
        if (payload.progress) progressData = payload.progress;
        if (payload.mistakes) mistakesData = payload.mistakes;
        persistLocal();
        syncToCloud();
        window.dispatchEvent(new CustomEvent('progress-updated'));
        window.dispatchEvent(new CustomEvent('mistakes-updated'));
        alert('學習進度與錯題本已成功匯入！');
        return true;
      } catch (err) {
        alert('匯入失敗：檔案格式不正確。');
        return false;
      }
    }
  };

  window.Auth = Auth;
})(window);
