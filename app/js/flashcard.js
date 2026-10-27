/**
 * 3D Apple-Style Vocabulary Flashcard Engine
 * - Interactive Flip Cards with Pronunciation, Collocations, and Example Sentences
 * - Mastered / Review sorting
 */

(function (window) {
  let words = [];
  let currentIndex = 0;
  let isFlipped = false;
  let currentUnitId = 'all';

  function pronounce(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }

  const Flashcards = {
    init(containerId) {
      this.container = document.getElementById(containerId);
      this.loadWords();
      this.render();
      this.setupKeyboard();
    },

    setUnit(unitId) {
      currentUnitId = unitId;
      currentIndex = 0;
      isFlipped = false;
      this.loadWords();
      this.render();
    },

    loadWords() {
      const allUnits = window.QUIZ_DATA.units;
      if (currentUnitId === 'all') {
        words = allUnits.flatMap(u => u.red_words);
      } else if (currentUnitId === 'ch1') {
        words = allUnits.filter(u => u.chapter === 'Chapter 1').flatMap(u => u.red_words);
      } else if (currentUnitId === 'ch2') {
        words = allUnits.filter(u => u.chapter === 'Chapter 2').flatMap(u => u.red_words);
      } else {
        const u = allUnits.find(unit => unit.id === currentUnitId);
        words = u ? u.red_words : allUnits[0].red_words;
      }
    },

    setupKeyboard() {
      window.addEventListener('keydown', (e) => {
        // Only active if flashcard tab is visible
        const tab = document.getElementById('tab-flashcards');
        if (!tab || tab.classList.contains('hidden')) return;

        if (e.code === 'Space') {
          e.preventDefault();
          this.toggleFlip();
        } else if (e.code === 'ArrowRight') {
          this.next();
        } else if (e.code === 'ArrowLeft') {
          this.prev();
        }
      });
    },

    toggleFlip() {
      isFlipped = !isFlipped;
      const card = document.getElementById('main-flashcard');
      if (card) {
        if (isFlipped) card.classList.add('flipped');
        else card.classList.remove('flipped');
      }
    },

    next() {
      if (currentIndex < words.length - 1) {
        currentIndex++;
        isFlipped = false;
        this.renderCard();
      }
    },

    prev() {
      if (currentIndex > 0) {
        currentIndex--;
        isFlipped = false;
        this.renderCard();
      }
    },

    render() {
      if (!this.container) return;

      this.container.innerHTML = `
        <div class="max-w-2xl mx-auto space-y-6">
          <!-- Flashcard Controls -->
          <div class="card p-5 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <span class="badge badge-red font-bold">40 核心單字</span>
              <h3 class="font-bold text-sm text-primary">單字記憶卡模式</h3>
            </div>

            <div class="flex items-center gap-2">
              <select id="fc-unit-select" class="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-subtle bg-elevated text-primary focus:outline-none">
                <option value="all" ${currentUnitId === 'all' ? 'selected' : ''}>全書 Ch1+Ch2 (40 字)</option>
                <option value="ch1" ${currentUnitId === 'ch1' ? 'selected' : ''}>Chapter 1 全章 (20 字)</option>
                <option value="ch2" ${currentUnitId === 'ch2' ? 'selected' : ''}>Chapter 2 全章 (20 字)</option>
                <option value="u1a" ${currentUnitId === 'u1a' ? 'selected' : ''}>Unit 1A (10 字)</option>
                <option value="u1b" ${currentUnitId === 'u1b' ? 'selected' : ''}>Unit 1B (10 字)</option>
                <option value="u2a" ${currentUnitId === 'u2a' ? 'selected' : ''}>Unit 2A (10 字)</option>
                <option value="u2b" ${currentUnitId === 'u2b' ? 'selected' : ''}>Unit 2B (10 字)</option>
              </select>

              <button id="fc-btn-shuffle" class="btn btn-ghost text-xs py-1.5 px-3" title="隨機洗牌">
                <i data-lucide="shuffle" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- Card Flip Viewport -->
          <div id="flashcard-viewport"></div>

          <!-- Bottom Action Buttons -->
          <div class="flex items-center justify-between px-4">
            <button id="fc-prev" class="btn btn-ghost text-xs px-4" ${currentIndex === 0 ? 'disabled' : ''}>
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
              上一個
            </button>

            <span class="text-xs font-mono font-bold text-secondary">
              <span id="fc-index" class="text-primary font-bold">${currentIndex + 1}</span> / ${words.length}
            </span>

            <button id="fc-next" class="btn btn-ghost text-xs px-4" ${currentIndex === words.length - 1 ? 'disabled' : ''}>
              下一個
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
          </div>

          <p class="text-center text-xs text-tertiary">
            提示：可點擊卡片翻轉，或使用鍵盤【空白鍵】翻面、【左右方向鍵】切換單字
          </p>
        </div>
      `;

      document.getElementById('fc-unit-select')?.addEventListener('change', (e) => {
        this.setUnit(e.target.value);
      });

      document.getElementById('fc-btn-shuffle')?.addEventListener('click', () => {
        words = [...words].sort(() => 0.5 - Math.random());
        currentIndex = 0;
        isFlipped = false;
        this.renderCard();
      });

      document.getElementById('fc-prev')?.addEventListener('click', () => this.prev());
      document.getElementById('fc-next')?.addEventListener('click', () => this.next());

      this.renderCard();
    },

    renderCard() {
      const vp = document.getElementById('flashcard-viewport');
      const idxEl = document.getElementById('fc-index');
      if (!vp || words.length === 0) return;

      if (idxEl) idxEl.textContent = currentIndex + 1;
      const w = words[currentIndex];

      vp.innerHTML = `
        <div id="main-flashcard" class="flip-card ${isFlipped ? 'flipped' : ''}">
          <div class="flip-card-inner">
            <!-- Front of Card -->
            <div class="flip-card-front space-y-4">
              <div class="flex items-center justify-between w-full">
                <span class="badge badge-red font-mono">${w.pos}</span>
                <button id="fc-btn-speak" class="p-2 rounded-full hover:bg-border-subtle text-accent" title="發音">
                  <i data-lucide="volume-2" class="w-5 h-5"></i>
                </button>
              </div>

              <div class="my-auto py-8">
                <h2 class="text-4xl font-extrabold text-primary tracking-tight">${w.word}</h2>
                <p class="font-mono text-sm text-tertiary mt-2">${w.ipa}</p>
              </div>

              <div class="text-xs text-tertiary flex items-center gap-1.5">
                <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
                點擊翻轉查看詳細釋義與例句
              </div>
            </div>

            <!-- Back of Card -->
            <div class="flip-card-back space-y-4 text-left">
              <div class="flex items-center justify-between w-full border-b border-subtle pb-2">
                <span class="text-lg font-bold text-accent">${w.word}</span>
                <span class="text-sm font-bold text-primary">${w.zh}</span>
              </div>

              <div class="space-y-3 py-2 text-sm">
                <div>
                  <span class="text-xs font-bold text-tertiary uppercase tracking-wider block">英文釋義</span>
                  <p class="text-primary font-medium mt-0.5">${w.en_def}</p>
                </div>

                <div>
                  <span class="text-xs font-bold text-tertiary uppercase tracking-wider block">課文原句</span>
                  <p class="text-secondary italic mt-0.5 leading-relaxed bg-elevated p-2.5 rounded-lg border border-subtle">
                    "${w.example}"
                  </p>
                </div>

                ${w.collocations && w.collocations.length > 0 ? `
                  <div>
                    <span class="text-xs font-bold text-tertiary uppercase tracking-wider block">常見搭配 (Collocations)</span>
                    <div class="flex flex-wrap gap-1.5 mt-1">
                      ${w.collocations.map(c => `<span class="badge badge-blue font-mono">${c}</span>`).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>

              <div class="pt-2 flex items-center justify-end gap-2 w-full">
                <button id="fc-add-mistake" class="btn btn-secondary text-xs py-1.5 px-3">
                  <i data-lucide="bookmark" class="w-3.5 h-3.5"></i>
                  收錄至錯題加強
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Flip click
      const cardEl = document.getElementById('main-flashcard');
      cardEl.addEventListener('click', (e) => {
        // Prevent flipping if clicked on button
        if (e.target.closest('button')) return;
        this.toggleFlip();
      });

      document.getElementById('fc-btn-speak')?.addEventListener('click', (e) => {
        e.stopPropagation();
        pronounce(w.word);
      });

      document.getElementById('fc-add-mistake')?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.Auth.addMistake({
          id: 'vocab_' + w.id,
          unitId: currentUnitId,
          type: 'RED_VOCAB_FLASHCARD',
          title: `核心單字複習：${w.word}`,
          word: w.word,
          pos: w.pos,
          ipa: w.ipa,
          zh: w.zh,
          en_def: w.en_def,
          example: w.example,
          question: `單字「${w.word}」(${w.pos}) 的釋義與例句`,
          explanation: `【${w.word}】${w.zh}\n英文釋義：${w.en_def}\n課文原句：${w.example}`
        }, '手動收錄');
        alert(`已將「${w.word}」收錄至您的錯題本！`);
      });

      if (window.lucide) window.lucide.createIcons();
    }
  };

  window.Flashcards = Flashcards;
})(window);
