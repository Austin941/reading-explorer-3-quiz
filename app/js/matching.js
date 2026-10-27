/**
 * Red Vocabulary Interactive Matching Game Engine (紅色的單字配對挑戰)
 * - Tap / Click pairing between Red Words and Chinese / English definitions
 * - Native Web Speech API pronunciation
 * - Timer, Combos, Confetti celebration, and automatic mistake capturing
 */

(function (window) {
  let currentWords = [];
  let currentCards = []; // shuffled cards: { id, wordId, text, type, matched }
  let selectedFirst = null;
  let timerInterval = null;
  let startTime = 0;
  let elapsedSeconds = 0;
  let matchesFound = 0;
  let totalPairs = 0;
  let comboStreak = 0;
  let mistakesInRound = [];
  let currentMode = 'zh'; // 'zh' or 'en'
  let currentUnitId = 'all';

  // Sound synthesis via Web Audio API
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!window.SOUND_ENABLED) return;
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'click') {
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'match') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'win') {
        // celebratory chime
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.setValueAtTime(freq, now + i * 0.1);
          g.gain.setValueAtTime(0.1, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + 0.4);
        });
      }
    } catch (e) {
      console.warn('Audio playback not supported:', e);
    }
  }

  // Pronounce word
  function pronounce(wordText) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordText);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }

  const MatchingGame = {
    init(containerId) {
      this.container = document.getElementById(containerId);
      this.renderSetup();
    },

    setScope(unitId, mode = 'zh') {
      currentUnitId = unitId;
      currentMode = mode;
      this.startRound();
    },

    getFilteredWords() {
      const allUnits = window.QUIZ_DATA.units;
      if (currentUnitId === 'all') {
        return allUnits.flatMap(u => u.red_words);
      } else if (currentUnitId === 'ch1') {
        return allUnits.filter(u => u.chapter === 'Chapter 1').flatMap(u => u.red_words);
      } else if (currentUnitId === 'ch2') {
        return allUnits.filter(u => u.chapter === 'Chapter 2').flatMap(u => u.red_words);
      } else {
        const u = allUnits.find(u => u.id === currentUnitId);
        return u ? u.red_words : allUnits[0].red_words;
      }
    },

    startRound() {
      clearInterval(timerInterval);
      const wordsPool = this.getFilteredWords();
      // Shuffle and pick 6 pairs per screen for responsive and engaging experience
      const shuffledWords = [...wordsPool].sort(() => 0.5 - Math.random());
      currentWords = shuffledWords.slice(0, Math.min(6, shuffledWords.length));
      totalPairs = currentWords.length;
      matchesFound = 0;
      comboStreak = 0;
      mistakesInRound = [];
      selectedFirst = null;
      elapsedSeconds = 0;

      // Build cards
      const wordCards = currentWords.map(w => ({
        id: 'w_' + w.id,
        wordId: w.id,
        wordObj: w,
        text: w.word,
        pos: w.pos,
        ipa: w.ipa,
        type: 'word'
      }));

      const defCards = currentWords.map(w => ({
        id: 'd_' + w.id,
        wordId: w.id,
        wordObj: w,
        text: currentMode === 'zh' ? w.zh : w.en_def,
        type: 'def'
      }));

      // Shuffle cards independently
      currentCards = [...wordCards, ...defCards].sort(() => 0.5 - Math.random());

      startTime = Date.now();
      timerInterval = setInterval(() => {
        elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const timerEl = document.getElementById('match-timer');
        if (timerEl) {
          const m = Math.floor(elapsedSeconds / 60);
          const s = elapsedSeconds % 60;
          timerEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
      }, 500);

      this.renderBoard();
    },

    renderSetup() {
      if (!this.container) return;
      this.container.innerHTML = `
        <div class="space-y-6">
          <!-- Game Header / Controls -->
          <div class="card p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="badge badge-red font-bold">考題必背</span>
                <h2 class="text-xl font-bold tracking-tight">紅色單字配對連連看</h2>
              </div>
              <p class="text-sm text-secondary mt-1">選取單字與其正確釋義完成配對，考驗反應力與字彙熟悉度！</p>
            </div>

            <!-- Unit Selector -->
            <div class="flex flex-wrap items-center gap-2">
              <select id="match-unit-select" class="px-3 py-2 text-sm font-semibold rounded-full border border-subtle bg-elevated text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="all">全書 Ch1 + Ch2 (共 40 題)</option>
                <option value="ch1">Chapter 1 全部 (20 題)</option>
                <option value="ch2">Chapter 2 全部 (20 題)</option>
                <option value="u1a">Unit 1A: A Love for Soccer (10 題)</option>
                <option value="u1b">Unit 1B: Olympic Champions (10 題)</option>
                <option value="u2a">Unit 2A: What is Beauty? (10 題)</option>
                <option value="u2b">Unit 2B: Skin: Body's Canvas (10 題)</option>
              </select>

              <!-- Mode Toggle -->
              <div class="inline-flex rounded-full border border-subtle p-1 bg-elevated">
                <button id="btn-mode-zh" class="px-3 py-1 text-xs font-bold rounded-full ${currentMode === 'zh' ? 'bg-accent text-white' : 'text-secondary'}">英中配對</button>
                <button id="btn-mode-en" class="px-3 py-1 text-xs font-bold rounded-full ${currentMode === 'en' ? 'bg-accent text-white' : 'text-secondary'}">英英配對</button>
              </div>

              <button id="btn-restart-matching" class="btn btn-primary text-xs py-2 px-4">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                重新洗牌
              </button>
            </div>
          </div>

          <!-- Stats Bar -->
          <div class="flex items-center justify-between px-2 text-sm font-semibold text-secondary">
            <div class="flex items-center gap-4">
              <div>配對進度：<span id="match-progress" class="text-primary font-bold">0 / 0</span></div>
              <div>連擊 Combo：<span id="match-combo" class="text-accent font-bold">0🔥</span></div>
            </div>
            <div class="flex items-center gap-2">
              <i data-lucide="timer" class="w-4 h-4 text-secondary"></i>
              <span id="match-timer" class="font-mono text-primary font-bold">00:00</span>
            </div>
          </div>

          <!-- Game Board Container -->
          <div id="match-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5"></div>
        </div>
      `;

      // Event listeners
      document.getElementById('match-unit-select').addEventListener('change', (e) => {
        currentUnitId = e.target.value;
        this.startRound();
      });

      document.getElementById('btn-mode-zh').addEventListener('click', () => {
        currentMode = 'zh';
        document.getElementById('btn-mode-zh').className = 'px-3 py-1 text-xs font-bold rounded-full bg-accent text-white';
        document.getElementById('btn-mode-en').className = 'px-3 py-1 text-xs font-bold rounded-full text-secondary';
        this.startRound();
      });

      document.getElementById('btn-mode-en').addEventListener('click', () => {
        currentMode = 'en';
        document.getElementById('btn-mode-en').className = 'px-3 py-1 text-xs font-bold rounded-full bg-accent text-white';
        document.getElementById('btn-mode-zh').className = 'px-3 py-1 text-xs font-bold rounded-full text-secondary';
        this.startRound();
      });

      document.getElementById('btn-restart-matching').addEventListener('click', () => {
        this.startRound();
      });

      if (window.lucide) window.lucide.createIcons();
      this.startRound();
    },

    renderBoard() {
      const grid = document.getElementById('match-grid');
      const progressEl = document.getElementById('match-progress');
      const comboEl = document.getElementById('match-combo');
      if (!grid) return;

      if (progressEl) progressEl.textContent = `${matchesFound} / ${totalPairs}`;
      if (comboEl) comboEl.textContent = `${comboStreak} 🔥`;

      grid.innerHTML = currentCards.map(card => {
        let contentHtml = '';
        if (card.type === 'word') {
          contentHtml = `
            <div class="flex flex-col items-center">
              <span class="text-lg font-bold text-primary tracking-wide">${card.text}</span>
              <span class="text-xs text-tertiary font-mono">${card.ipa || ''} · ${card.pos || ''}</span>
            </div>
          `;
        } else {
          contentHtml = `
            <div class="text-center text-sm font-medium leading-snug px-2 text-primary">
              ${card.text}
            </div>
          `;
        }

        return `
          <div id="${card.id}" 
               data-id="${card.id}" 
               class="match-card ${card.matched ? 'matched pointer-events-none' : ''}">
            ${contentHtml}
          </div>
        `;
      }).join('');

      // Add click listeners to cards
      grid.querySelectorAll('.match-card').forEach(el => {
        el.addEventListener('click', () => {
          const cardId = el.getAttribute('data-id');
          this.handleCardClick(cardId);
        });
      });
    },

    handleCardClick(cardId) {
      const card = currentCards.find(c => c.id === cardId);
      if (!card || card.matched) return;

      playSound('click');
      if (card.type === 'word') pronounce(card.text);

      const cardEl = document.getElementById(cardId);

      // If no card is currently selected
      if (!selectedFirst) {
        selectedFirst = card;
        cardEl.classList.add('selected');
        return;
      }

      // If clicked the exact same card, deselect
      if (selectedFirst.id === card.id) {
        selectedFirst = null;
        cardEl.classList.remove('selected');
        return;
      }

      // If clicked another card of the SAME type (e.g. word + word), switch selection
      if (selectedFirst.type === card.type) {
        const prevEl = document.getElementById(selectedFirst.id);
        if (prevEl) prevEl.classList.remove('selected');
        selectedFirst = card;
        cardEl.classList.add('selected');
        return;
      }

      // Compare pairs
      const firstEl = document.getElementById(selectedFirst.id);
      const isMatch = selectedFirst.wordId === card.wordId;

      if (isMatch) {
        // Correct match!
        playSound('match');
        comboStreak++;
        matchesFound++;

        card.matched = true;
        selectedFirst.matched = true;

        firstEl.classList.remove('selected');
        firstEl.classList.add('matched');
        cardEl.classList.add('matched');

        // Record progress in Auth
        window.Auth.recordAnswer(card.wordId, true, currentUnitId);

        selectedFirst = null;

        // Update indicators
        const progressEl = document.getElementById('match-progress');
        const comboEl = document.getElementById('match-combo');
        if (progressEl) progressEl.textContent = `${matchesFound} / ${totalPairs}`;
        if (comboEl) comboEl.textContent = `${comboStreak} 🔥`;

        // Check if round finished
        if (matchesFound >= totalPairs) {
          this.handleRoundComplete();
        }
      } else {
        // Wrong match
        playSound('wrong');
        comboStreak = 0;
        const comboEl = document.getElementById('match-combo');
        if (comboEl) comboEl.textContent = `0 🔥`;

        firstEl.classList.add('wrong-shake');
        cardEl.classList.add('wrong-shake');

        // Capture mistake automatically
        const wrongWord = selectedFirst.type === 'word' ? selectedFirst.wordObj : card.wordObj;
        const chosenDef = selectedFirst.type === 'def' ? selectedFirst.text : card.text;
        
        mistakesInRound.push(wrongWord);
        window.Auth.addMistake({
          id: 'vocab_' + wrongWord.id,
          unitId: currentUnitId,
          type: 'RED_VOCAB_MATCHING',
          title: `單字配對錯題：${wrongWord.word}`,
          word: wrongWord.word,
          pos: wrongWord.pos,
          ipa: wrongWord.ipa,
          zh: wrongWord.zh,
          en_def: wrongWord.en_def,
          example: wrongWord.example,
          question: `單字「${wrongWord.word}」的正確釋義是什麼？`,
          explanation: `【${wrongWord.word}】(${wrongWord.pos}) ${wrongWord.ipa}\n中文：${wrongWord.zh}\n英文釋義：${wrongWord.en_def}\n課文例句：${wrongWord.example}`
        }, chosenDef);

        window.Auth.recordAnswer(wrongWord.id, false, currentUnitId);

        setTimeout(() => {
          firstEl.classList.remove('selected', 'wrong-shake');
          cardEl.classList.remove('wrong-shake');
          selectedFirst = null;
        }, 500);
      }
    },

    handleRoundComplete() {
      clearInterval(timerInterval);
      playSound('win');
      window.Auth.recordMatchingScore(currentUnitId, elapsedSeconds, totalPairs);

      // Trigger Confetti if available
      if (window.confetti) {
        window.confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      setTimeout(() => {
        const grid = document.getElementById('match-grid');
        if (!grid) return;

        grid.innerHTML = `
          <div class="col-span-full card p-8 text-center space-y-6 animate-fade-in">
            <div class="w-16 h-16 mx-auto rounded-full bg-success-bg text-success flex items-center justify-center">
              <i data-lucide="award" class="w-8 h-8"></i>
            </div>
            
            <div>
              <h3 class="text-2xl font-bold">🎉 太棒了！配對全數通關！</h3>
              <p class="text-secondary mt-1">耗時 <span class="font-bold text-primary">${elapsedSeconds} 秒</span> · 本輪共配對 <span class="font-bold text-primary">${totalPairs} 組單字</span></p>
            </div>

            ${mistakesInRound.length > 0 ? `
              <div class="p-4 rounded-xl bg-danger-bg text-danger text-sm inline-flex items-center gap-2">
                <i data-lucide="alert-circle" class="w-4 h-4"></i>
                本輪有 ${mistakesInRound.length} 個單字曾配對失誤，已自動加入「錯題筆記本」供複習！
              </div>
            ` : `
              <div class="p-4 rounded-xl bg-success-bg text-success text-sm inline-flex items-center gap-2">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                完美的零失誤表現！單字掌握度 100%！
              </div>
            `}

            <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button id="btn-next-round" class="btn btn-primary px-6 py-2.5">
                <i data-lucide="play" class="w-4 h-4"></i>
                再來一輪 (換新一組單字)
              </button>
              <button onclick="window.App.switchTab('review')" class="btn btn-secondary px-6 py-2.5">
                <i data-lucide="book-open" class="w-4 h-4"></i>
                前往錯題本查看
              </button>
            </div>
          </div>
        `;

        document.getElementById('btn-next-round')?.addEventListener('click', () => {
          this.startRound();
        });

        if (window.lucide) window.lucide.createIcons();
      }, 400);
    }
  };

  window.MatchingGame = MatchingGame;
})(window);
