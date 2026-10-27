/**
 * Mobile-First Multiple Choice Quiz Engine (手機載體極致優化版)
 * - Thumb-zone Ergonomics (底端大拇指快捷列)
 * - iOS-Style Bottom Sheet for Reading Passage (課文滑動底端抽屜)
 * - Quick Jump Grid Sheet (全題號九宮格跳題抽屜)
 * - Swipe Gestures (左右滑動切換題目)
 * - Mobile Haptic Feedback (震動反饋) & Synthetic Audio
 * - 120 Total Questions with Instant Detailed Chinese Explanations
 */

(function (window) {
  let allQuestions = [];
  let filteredQuestions = [];
  let currentIndex = 0;
  let userAnswers = {};
  let currentFilterCat = 'all';
  let currentFilterUnit = 'all';
  let isRetestMode = false;

  // Touch gesture state
  let touchStartX = 0;
  let touchStartY = 0;

  // Sound synthesis
  let audioCtx = null;
  function playSound(type) {
    if (!window.SOUND_ENABLED) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'click') {
        osc.frequency.setValueAtTime(450, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.setValueAtTime(190, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {}
  }

  // Haptic feedback for mobile
  function vibrate(pattern) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  function pronounce(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }

  const MCQQuiz = {
    init(containerId) {
      this.container = document.getElementById(containerId);
      allQuestions = window.QUIZ_DATA.mcq_questions || [];
      this.applyFilters();
      this.render();
      this.setupTouchGestures();
    },

    applyFilters() {
      if (isRetestMode) return;

      filteredQuestions = allQuestions.filter(q => {
        const matchCat = currentFilterCat === 'all' || 
          (currentFilterCat === 'reading' && q.category === 'reading') ||
          (currentFilterCat === 'vocab_red' && q.category === 'vocab_red') ||
          (currentFilterCat === 'vocab_book' && q.category === 'vocab_book');

        const matchUnit = currentFilterUnit === 'all' ||
          (currentFilterUnit === 'ch1' && q.chapter === 'Chapter 1') ||
          (currentFilterUnit === 'ch2' && q.chapter === 'Chapter 2') ||
          (q.unitId === currentFilterUnit);

        return matchCat && matchUnit;
      });

      currentIndex = 0;
      userAnswers = {};
    },

    setCategoryFilter(cat) {
      isRetestMode = false;
      currentFilterCat = cat;
      this.applyFilters();
      this.render();
    },

    setUnitFilter(unit) {
      isRetestMode = false;
      currentFilterUnit = unit;
      this.applyFilters();
      this.render();
    },

    shuffle() {
      filteredQuestions = [...filteredQuestions].sort(() => 0.5 - Math.random());
      currentIndex = 0;
      userAnswers = {};
      this.renderCurrentQuestion();
      vibrate(20);
    },

    startRetest(mistakeQuestions) {
      isRetestMode = true;
      filteredQuestions = mistakeQuestions;
      currentIndex = 0;
      userAnswers = {};
      this.render();
    },

    setupTouchGestures() {
      const el = document.getElementById('view-quiz');
      if (!el) return;

      el.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });

      el.addEventListener('touchend', (e) => {
        // If bottom sheets are open, do not trigger swipe
        if (document.getElementById('passage-sheet')?.classList.contains('open') ||
            document.getElementById('jump-sheet')?.classList.contains('open')) {
          return;
        }

        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;

        // Check if primarily horizontal swipe
        if (Math.abs(dx) > 60 && Math.abs(dy) < 50) {
          if (dx < 0) {
            // Swipe Left -> Next
            if (currentIndex < filteredQuestions.length - 1) {
              currentIndex++;
              this.renderCurrentQuestion();
              vibrate(15);
            }
          } else {
            // Swipe Right -> Prev
            if (currentIndex > 0) {
              currentIndex--;
              this.renderCurrentQuestion();
              vibrate(15);
            }
          }
        }
      }, { passive: true });
    },

    render() {
      if (!this.container) return;

      const currentQ = filteredQuestions[currentIndex];
      const unitObj = currentQ ? window.QUIZ_DATA.units.find(u => u.id === currentQ.unitId) : null;

      this.container.innerHTML = `
        <div class="space-y-4 pb-28">
          <!-- Mobile Horizontal Scrollable Category Pills -->
          <div class="scroll-pills -mx-2 px-2">
            <button data-cat="all" class="pill-btn ${currentFilterCat === 'all' && !isRetestMode ? 'active' : ''}">
              🌟 全部 (${allQuestions.length})
            </button>
            <button data-cat="reading" class="pill-btn ${currentFilterCat === 'reading' ? 'active' : ''}">
              📖 課文閱讀 (39)
            </button>
            <button data-cat="vocab_red" class="pill-btn ${currentFilterCat === 'vocab_red' ? 'active' : ''}">
              ⚡ 紅色單字 (40)
            </button>
            <button data-cat="vocab_book" class="pill-btn ${currentFilterCat === 'vocab_book' ? 'active' : ''}">
              📝 課本練習 (41)
            </button>
          </div>

          <!-- Mobile Horizontal Scrollable Unit Pills -->
          <div class="scroll-pills -mx-2 px-2">
            <button data-unit="all" class="pill-btn ${currentFilterUnit === 'all' ? 'active' : ''}">
              全書單元
            </button>
            <button data-unit="ch1" class="pill-btn ${currentFilterUnit === 'ch1' ? 'active' : ''}">
              Ch1 全章
            </button>
            <button data-unit="ch2" class="pill-btn ${currentFilterUnit === 'ch2' ? 'active' : ''}">
              Ch2 全章
            </button>
            <button data-unit="u1a" class="pill-btn ${currentFilterUnit === 'u1a' ? 'active' : ''}">
              1A 足球
            </button>
            <button data-unit="u1b" class="pill-btn ${currentFilterUnit === 'u1b' ? 'active' : ''}">
              1B 冠軍
            </button>
            <button data-unit="u2a" class="pill-btn ${currentFilterUnit === 'u2a' ? 'active' : ''}">
              2A 美感
            </button>
            <button data-unit="u2b" class="pill-btn ${currentFilterUnit === 'u2b' ? 'active' : ''}">
              2B 皮膚
            </button>
          </div>

          <!-- Retest Mode Indicator if active -->
          ${isRetestMode ? `
            <div class="card p-3 bg-danger-bg border border-danger/30 flex items-center justify-between text-xs text-danger font-bold">
              <span class="flex items-center gap-1.5">
                <i data-lucide="zap" class="w-4 h-4"></i>
                錯題集中消滅模式 (${filteredQuestions.length} 題)
              </span>
              <button id="btn-exit-retest" class="text-xs text-primary underline">返回全部</button>
            </div>
          ` : ''}

          <!-- Main Question Area -->
          <div id="mcq-card-container"></div>
        </div>

        <!-- Ergonomic Fixed Bottom Action Bar (大拇指底部操作列) -->
        <div class="bottom-bar glass-bottom border-t border-subtle px-4 py-2.5 flex items-center justify-between gap-2 max-w-lg mx-auto sm:max-w-xl md:max-w-2xl">
          <button id="bar-prev" class="btn btn-ghost p-2 rounded-full w-11 h-11 shrink-0" ${currentIndex === 0 ? 'disabled' : ''}>
            <i data-lucide="chevron-left" class="w-6 h-6"></i>
          </button>

          <!-- Middle Thumb Actions: Quick Jump & Reading Passage -->
          <div class="flex items-center gap-2">
            <button id="bar-open-jump" class="btn btn-secondary px-3 py-1.5 text-xs font-mono font-bold">
              <i data-lucide="grid" class="w-3.5 h-3.5"></i>
              <span id="bar-index-label">${currentIndex + 1} / ${filteredQuestions.length}</span>
            </button>

            <button id="bar-open-passage" class="btn btn-ghost border border-subtle px-3 py-1.5 text-xs font-bold text-primary">
              <i data-lucide="book-open" class="w-3.5 h-3.5 text-accent"></i>
              對照課文
            </button>
          </div>

          <button id="bar-next" class="btn btn-primary p-2 rounded-full w-11 h-11 shrink-0">
            <i data-lucide="chevron-right" class="w-6 h-6"></i>
          </button>
        </div>

        <!-- iOS Bottom Sheet: Reading Passage (課文底端抽屜) -->
        <div id="passage-overlay" class="sheet-overlay"></div>
        <div id="passage-sheet" class="bottom-sheet">
          <div class="sheet-drag-handle"></div>
          <div class="px-5 py-3 border-b border-subtle flex items-center justify-between shrink-0">
            <div>
              <span class="badge badge-blue text-[10px] mb-0.5">課文對照</span>
              <h4 id="sheet-passage-title" class="font-bold text-sm text-primary">
                ${unitObj ? `${unitObj.unit}: ${unitObj.title}` : '課文原文'}
              </h4>
            </div>
            <button id="sheet-passage-close" class="btn btn-ghost p-1.5 rounded-full text-secondary">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <div id="sheet-passage-body" class="p-5 overflow-y-auto space-y-4 text-sm leading-relaxed text-primary"></div>
        </div>

        <!-- iOS Bottom Sheet: Quick Jump Grid (題號導航抽屜) -->
        <div id="jump-overlay" class="sheet-overlay"></div>
        <div id="jump-sheet" class="bottom-sheet">
          <div class="sheet-drag-handle"></div>
          <div class="px-5 py-3 border-b border-subtle flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-base text-primary">題目快速跳轉</h4>
              <span class="text-xs text-secondary font-mono">共 ${filteredQuestions.length} 題</span>
            </div>
            <button id="sheet-jump-close" class="btn btn-ghost p-1.5 rounded-full text-secondary">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <div id="sheet-jump-grid" class="p-5 overflow-y-auto grid grid-cols-5 sm:grid-cols-6 gap-2.5 max-h-[60vh]"></div>
        </div>
      `;

      // Filter Pill Listeners
      this.container.querySelectorAll('[data-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          vibrate(10);
          this.setCategoryFilter(btn.getAttribute('data-cat'));
        });
      });

      this.container.querySelectorAll('[data-unit]').forEach(btn => {
        btn.addEventListener('click', () => {
          vibrate(10);
          this.setUnitFilter(btn.getAttribute('data-unit'));
        });
      });

      // Bottom Bar Navigation Listeners
      document.getElementById('bar-prev')?.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          this.renderCurrentQuestion();
          vibrate(15);
        }
      });

      document.getElementById('bar-next')?.addEventListener('click', () => {
        if (currentIndex < filteredQuestions.length - 1) {
          currentIndex++;
          this.renderCurrentQuestion();
          vibrate(15);
        } else {
          this.showSummaryModal();
        }
      });

      // Bottom Sheet Triggers
      const passageSheet = document.getElementById('passage-sheet');
      const passageOverlay = document.getElementById('passage-overlay');
      const jumpSheet = document.getElementById('jump-sheet');
      const jumpOverlay = document.getElementById('jump-overlay');

      const openPassage = () => {
        vibrate(15);
        this.renderPassageContent(unitObj);
        passageSheet?.classList.add('open');
        passageOverlay?.classList.add('open');
      };

      const closePassage = () => {
        passageSheet?.classList.remove('open');
        passageOverlay?.classList.remove('open');
      };

      const openJump = () => {
        vibrate(15);
        this.renderJumpGrid();
        jumpSheet?.classList.add('open');
        jumpOverlay?.classList.add('open');
      };

      const closeJump = () => {
        jumpSheet?.classList.remove('open');
        jumpOverlay?.classList.remove('open');
      };

      document.getElementById('bar-open-passage')?.addEventListener('click', openPassage);
      document.getElementById('sheet-passage-close')?.addEventListener('click', closePassage);
      passageOverlay?.addEventListener('click', closePassage);

      document.getElementById('bar-open-jump')?.addEventListener('click', openJump);
      document.getElementById('sheet-jump-close')?.addEventListener('click', closeJump);
      jumpOverlay?.addEventListener('click', closeJump);

      document.getElementById('btn-exit-retest')?.addEventListener('click', () => {
        isRetestMode = false;
        this.applyFilters();
        this.render();
      });

      this.renderCurrentQuestion();
      if (window.lucide) window.lucide.createIcons();
    },

    renderPassageContent(unitObj) {
      const container = document.getElementById('sheet-passage-body');
      if (!container) return;

      const targetUnit = unitObj || window.QUIZ_DATA.units[0];
      const titleEl = document.getElementById('sheet-passage-title');
      if (titleEl) titleEl.textContent = `${targetUnit.unit}: ${targetUnit.title}`;

      const parasHtml = targetUnit.passage.map(p => {
        let text = p.text;
        targetUnit.red_words.forEach(rw => {
          const reg = new RegExp(`\\b(${rw.word}|${rw.word}s|${rw.word}ed|${rw.word}ing)\\b`, 'gi');
          text = text.replace(reg, (match) => {
            return `<span class="red-word-tag">${match}</span>`;
          });
        });
        return `
          <div class="space-y-1">
            <span class="font-mono text-xs font-bold text-accent px-1.5 py-0.5 rounded bg-accent-light">[Paragraph ${p.para}]</span>
            <p class="text-sm text-secondary leading-relaxed">${text}</p>
          </div>
        `;
      }).join('');

      container.innerHTML = parasHtml;
    },

    renderJumpGrid() {
      const grid = document.getElementById('sheet-jump-grid');
      if (!grid) return;

      grid.innerHTML = filteredQuestions.map((item, idx) => {
        const userAns = userAnswers[item.id];
        let stateClass = 'bg-elevated border-subtle text-secondary';
        if (idx === currentIndex) {
          stateClass = 'ring-2 ring-accent font-bold text-accent bg-accent-light';
        } else if (userAns !== undefined) {
          stateClass = userAns === item.answer 
            ? 'bg-success-bg border-success text-success font-bold' 
            : 'bg-danger-bg border-danger text-danger font-bold';
        }

        return `
          <button data-jump="${idx}" class="p-3 rounded-xl border flex flex-col items-center justify-center text-xs ${stateClass} transition-all active:scale-95">
            <span class="font-bold text-sm">${idx + 1}</span>
            <span class="text-[10px] font-mono opacity-80">${item.category === 'vocab_red' ? '單字' : '閱讀'}</span>
          </button>
        `;
      }).join('');

      grid.querySelectorAll('[data-jump]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentIndex = parseInt(btn.getAttribute('data-jump'), 10);
          document.getElementById('jump-sheet')?.classList.remove('open');
          document.getElementById('jump-overlay')?.classList.remove('open');
          this.renderCurrentQuestion();
          vibrate(15);
        });
      });
    },

    renderCurrentQuestion() {
      const container = document.getElementById('mcq-card-container');
      const indexLabel = document.getElementById('bar-index-label');
      if (!container) return;

      if (filteredQuestions.length === 0) {
        container.innerHTML = `
          <div class="card p-8 text-center space-y-3">
            <i data-lucide="check-circle" class="w-10 h-10 mx-auto text-success"></i>
            <h3 class="text-base font-bold text-primary">目前篩選條件下無題目</h3>
            <p class="text-xs text-secondary">請點選上方標籤切換題型或單元。</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      const q = filteredQuestions[currentIndex];
      const total = filteredQuestions.length;
      const selectedKey = userAnswers[q.id];
      const isAnswered = selectedKey !== undefined;
      const isCorrect = selectedKey === q.answer;

      if (indexLabel) indexLabel.textContent = `${currentIndex + 1} / ${total}`;

      let catBadgeClass = 'badge-blue';
      if (q.category === 'vocab_red') catBadgeClass = 'badge-red';
      else if (q.category === 'vocab_book') catBadgeClass = 'badge-amber';

      container.innerHTML = `
        <div class="card p-5 sm:p-7 space-y-5 shadow-sm border border-subtle">
          <!-- Card Header -->
          <div class="flex items-center justify-between text-xs font-bold text-secondary">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="badge ${catBadgeClass}">${q.category_zh}</span>
              <span class="badge badge-blue font-mono">${q.unitTitle.split(':')[0]}</span>
            </div>
            <button id="btn-shuffle-quick" class="btn btn-ghost p-1.5 text-secondary" title="隨機洗牌">
              <i data-lucide="shuffle" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-border-subtle h-1.5 rounded-full overflow-hidden">
            <div class="bg-accent h-full transition-all duration-300" style="width: ${((currentIndex + 1) / total) * 100}%"></div>
          </div>

          <!-- Question Stem -->
          <div class="space-y-1.5">
            ${q.passage_ref ? `<span class="text-xs font-mono font-bold text-accent block">📍 課文定位：${q.passage_ref}</span>` : ''}
            <h3 class="text-base sm:text-lg font-bold text-primary leading-snug">
              ${q.question}
            </h3>
          </div>

          <!-- Touch Options (Tactile, min-height 54px for thumb tapping) -->
          <div class="space-y-2.5 pt-1">
            ${q.options.map(opt => {
              let stateClass = '';
              if (isAnswered) {
                if (opt.key === q.answer) stateClass = 'correct';
                else if (opt.key === selectedKey) stateClass = 'wrong';
              }

              return `
                <button 
                  data-key="${opt.key}" 
                  class="option-btn ${stateClass}" 
                  ${isAnswered ? 'disabled' : ''}>
                  <span class="w-7 h-7 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                    ${opt.key.toUpperCase()}
                  </span>
                  <span class="flex-1 text-sm sm:text-base">${opt.text}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Instant Feedback & Chinese Explanation -->
          ${isAnswered ? `
            <div class="p-4 rounded-xl ${isCorrect ? 'bg-success-bg border-success/30' : 'bg-danger-bg border-danger/30'} border space-y-2.5 animate-fade-in">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span class="badge ${isCorrect ? 'badge-green' : 'badge-red'} font-bold">
                    ${isCorrect ? '✓ 正確' : '✗ 錯誤'}
                  </span>
                  <span class="text-xs font-mono font-bold text-primary">正解：(${q.answer.toUpperCase()})</span>
                </div>

                <button id="btn-audio-speak" class="btn btn-ghost text-xs py-1 px-2 text-primary flex items-center gap-1">
                  <i data-lucide="volume-2" class="w-3.5 h-3.5"></i>
                  朗讀題目
                </button>
              </div>

              <div class="text-xs text-primary leading-relaxed whitespace-pre-line bg-elevated/70 p-3 rounded-lg border border-subtle">
                <strong class="text-accent block mb-0.5">💡 詳解剖析：</strong>
                ${q.explanation || '本題考查課文重點或單字之精確定義。'}
              </div>

              ${!isCorrect ? `
                <div class="text-[11px] text-danger flex items-center gap-1 font-semibold">
                  <i data-lucide="alert-circle" class="w-3.5 h-3.5"></i>
                  已自動加入錯題筆記本！
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `;

      // Option click events
      container.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          this.handleOptionSelect(q, key);
        });
      });

      document.getElementById('btn-shuffle-quick')?.addEventListener('click', () => {
        this.shuffle();
      });

      document.getElementById('btn-audio-speak')?.addEventListener('click', () => {
        pronounce(q.question);
      });

      // Update bottom bar prev/next state
      const barPrev = document.getElementById('bar-prev');
      const barNext = document.getElementById('bar-next');
      if (barPrev) barPrev.disabled = currentIndex === 0;
      if (barNext) {
        if (currentIndex === total - 1) {
          barNext.innerHTML = `<i data-lucide="award" class="w-6 h-6"></i>`;
        } else {
          barNext.innerHTML = `<i data-lucide="chevron-right" class="w-6 h-6"></i>`;
        }
      }

      if (window.lucide) window.lucide.createIcons();
    },

    handleOptionSelect(questionObj, chosenKey) {
      userAnswers[questionObj.id] = chosenKey;
      const isCorrect = chosenKey === questionObj.answer;

      if (isCorrect) {
        playSound('correct');
        vibrate(25);
      } else {
        playSound('wrong');
        vibrate([40, 60, 40]);
      }

      window.Auth.recordAnswer(questionObj.id, isCorrect, questionObj.unitId);

      if (!isCorrect) {
        window.Auth.addMistake(questionObj, chosenKey);
      } else if (isRetestMode) {
        window.Auth.toggleMistakeMastered(questionObj.id);
      }

      this.renderCurrentQuestion();
    },

    showSummaryModal() {
      const container = document.getElementById('mcq-card-container');
      if (!container) return;

      let correct = 0;
      let wrong = 0;
      const total = filteredQuestions.length;

      filteredQuestions.forEach(q => {
        const userA = userAnswers[q.id];
        if (userA === q.answer) correct++;
        else if (userA !== undefined) wrong++;
      });

      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      container.innerHTML = `
        <div class="card p-6 sm:p-8 text-center space-y-5 animate-fade-in shadow-xl">
          <div class="w-16 h-16 mx-auto rounded-full ${accuracy >= 80 ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'} flex items-center justify-center text-2xl font-extrabold">
            ${accuracy}%
          </div>

          <div>
            <h3 class="text-xl font-bold text-primary">🎉 刷題完成！成績結算</h3>
            <p class="text-xs text-secondary mt-1">
              總題數：${total} 題 · 答對：<span class="text-success font-bold">${correct} 題</span> · 答錯：<span class="text-danger font-bold">${wrong} 題</span>
            </p>
          </div>

          <div class="flex flex-col gap-2 pt-2">
            <button id="btn-restart-mcq" class="btn btn-primary w-full py-3">
              <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
              重新再刷一次
            </button>
            <button onclick="window.App.switchView('review')" class="btn btn-secondary w-full py-3">
              <i data-lucide="bookmark" class="w-4 h-4"></i>
              進入錯題本複習
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-restart-mcq')?.addEventListener('click', () => {
        this.applyFilters();
        this.render();
      });

      if (window.confetti && accuracy >= 80) {
        window.confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }

      if (window.lucide) window.lucide.createIcons();
    }
  };

  window.MCQQuiz = MCQQuiz;
})(window);
