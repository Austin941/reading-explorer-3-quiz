/**
 * Dedicated Multiple Choice Quiz Engine (手機載體與極速跳轉重構版)
 * - Redesigned Question Navigator: Grouped by Unit, Quick Filters, Status Grid
 * - Root-level Bottom Sheet Architecture (100% reliable positioning)
 * - Automatic Paragraph Highlighting in Reading Passage
 * - Ergonomic Single-Hand Thumb Bar & Swipe Gestures
 */

(function (window) {
  let allQuestions = [];
  let filteredQuestions = [];
  let currentIndex = 0;
  let userAnswers = {};
  let currentFilterCat = 'all';
  let currentFilterUnit = 'all';
  let isRetestMode = false;
  let jumpInnerFilter = 'all'; // 'all', 'unanswered', 'wrong', 'grouped'

  // Touch gesture tracking
  let touchStartX = 0;
  let touchStartY = 0;

  // Sound synthesis via Web Audio API
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

  // Haptic feedback
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
      this.bindGlobalControls();
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
      this.updateBottomBar();
    },

    setUnitFilter(unit) {
      isRetestMode = false;
      currentFilterUnit = unit;
      this.applyFilters();
      this.render();
      this.updateBottomBar();
    },

    shuffle() {
      filteredQuestions = [...filteredQuestions].sort(() => 0.5 - Math.random());
      currentIndex = 0;
      userAnswers = {};
      this.renderCurrentQuestion();
      this.updateBottomBar();
      vibrate(20);
    },

    startRetest(mistakeQuestions) {
      isRetestMode = true;
      filteredQuestions = mistakeQuestions;
      currentIndex = 0;
      userAnswers = {};
      this.render();
      this.updateBottomBar();
    },

    // Bind Root-Level Bottom Sheets & Global Bottom Bar
    bindGlobalControls() {
      const barPrev = document.getElementById('bar-prev');
      const barNext = document.getElementById('bar-next');
      const barJump = document.getElementById('bar-open-jump');
      const barPassage = document.getElementById('bar-open-passage');

      const jumpSheet = document.getElementById('jump-sheet');
      const jumpOverlay = document.getElementById('jump-overlay');
      const jumpClose = document.getElementById('sheet-jump-close');

      const passageClose = document.getElementById('sheet-passage-close');
      const passageOverlay = document.getElementById('passage-overlay');

      // Prev / Next
      barPrev?.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          this.renderCurrentQuestion();
          this.updateBottomBar();
          vibrate(15);
        }
      });

      barNext?.addEventListener('click', () => {
        if (currentIndex < filteredQuestions.length - 1) {
          currentIndex++;
          this.renderCurrentQuestion();
          this.updateBottomBar();
          vibrate(15);
        } else {
          this.showSummaryModal();
        }
      });

      // Quick Jump Sheet Triggers
      const openJump = () => {
        vibrate(15);
        this.renderJumpSheetContent();
        jumpSheet?.classList.add('open');
        jumpOverlay?.classList.add('open');
      };

      const closeJump = () => {
        jumpSheet?.classList.remove('open');
        jumpOverlay?.classList.remove('open');
      };

      barJump?.addEventListener('click', openJump);
      jumpClose?.addEventListener('click', closeJump);
      jumpOverlay?.addEventListener('click', closeJump);

      // Quick Jump Filter Listeners
      const filterBtns = ['all', 'unanswered', 'wrong', 'grouped'];
      filterBtns.forEach(f => {
        document.getElementById(`jump-filter-${f}`)?.addEventListener('click', (e) => {
          jumpInnerFilter = f;
          filterBtns.forEach(other => {
            const btn = document.getElementById(`jump-filter-${other}`);
            if (other === f) btn?.classList.add('active');
            else btn?.classList.remove('active');
          });
          vibrate(10);
          this.renderJumpSheetContent();
        });
      });

      // Reading Passage Sheet Triggers (Global or fallback)
      barPassage?.addEventListener('click', () => this.openPassage());
      passageClose?.addEventListener('click', () => this.closePassage());
      passageOverlay?.addEventListener('click', () => this.closePassage());
    },

    openPassage() {
      vibrate(15);
      this.renderPassageContent();
      const passageSheet = document.getElementById('passage-sheet');
      const passageOverlay = document.getElementById('passage-overlay');
      passageSheet?.classList.add('open');
      passageOverlay?.classList.add('open');
    },

    closePassage() {
      const passageSheet = document.getElementById('passage-sheet');
      const passageOverlay = document.getElementById('passage-overlay');
      passageSheet?.classList.remove('open');
      passageOverlay?.classList.remove('open');
    },

    setupTouchGestures() {
      const el = document.getElementById('view-quiz');
      if (!el) return;

      el.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });

      el.addEventListener('touchend', (e) => {
        // Ignore swipe if sheets are open
        if (document.getElementById('passage-sheet')?.classList.contains('open') ||
            document.getElementById('jump-sheet')?.classList.contains('open')) {
          return;
        }

        const dx = e.changedTouches[0].screenX - touchStartX;
        const dy = e.changedTouches[0].screenY - touchStartY;

        if (Math.abs(dx) > 65 && Math.abs(dy) < 55) {
          if (dx < 0) {
            // Swipe Left -> Next
            if (currentIndex < filteredQuestions.length - 1) {
              currentIndex++;
              this.renderCurrentQuestion();
              this.updateBottomBar();
              vibrate(15);
            }
          } else {
            // Swipe Right -> Prev
            if (currentIndex > 0) {
              currentIndex--;
              this.renderCurrentQuestion();
              this.updateBottomBar();
              vibrate(15);
            }
          }
        }
      }, { passive: true });
    },

    updateBottomBar() {
      const barPrev = document.getElementById('bar-prev');
      const barNext = document.getElementById('bar-next');
      const barLabel = document.getElementById('bar-index-label');
      const nextText = document.getElementById('bar-next-text');
      const nextIcon = document.getElementById('bar-next-icon');
      const total = filteredQuestions.length;

      if (barLabel) barLabel.textContent = `第 ${currentIndex + 1} / ${total} 題`;
      if (barPrev) barPrev.disabled = currentIndex === 0;
      if (barNext) {
        if (currentIndex === total - 1) {
          if (nextText) nextText.textContent = '看結算';
          if (nextIcon) nextIcon.setAttribute('data-lucide', 'award');
        } else {
          if (nextText) nextText.textContent = '下一題';
          if (nextIcon) nextIcon.setAttribute('data-lucide', 'chevron-right');
        }
      }
      if (window.lucide) window.lucide.createIcons();
    },

    // Redesigned Quick Jump Sheet Content
    renderJumpSheetContent() {
      const container = document.getElementById('sheet-jump-content');
      const countBadge = document.getElementById('jump-sheet-count');
      const statCorrect = document.getElementById('stat-correct-count');
      const statWrong = document.getElementById('stat-wrong-count');
      const statUnanswered = document.getElementById('stat-unanswered-count');
      const statAccuracy = document.getElementById('stat-accuracy-label');
      if (!container) return;

      const total = filteredQuestions.length;
      if (countBadge) countBadge.textContent = `${total} 題`;

      // Calculate Stats
      let correct = 0;
      let wrong = 0;
      let unanswered = 0;

      filteredQuestions.forEach(q => {
        const uAns = userAnswers[q.id];
        if (uAns === undefined) unanswered++;
        else if (uAns === q.answer) correct++;
        else wrong++;
      });

      const answeredTotal = correct + wrong;
      const accRate = answeredTotal > 0 ? Math.round((correct / answeredTotal) * 100) : 0;

      if (statCorrect) statCorrect.textContent = correct;
      if (statWrong) statWrong.textContent = wrong;
      if (statUnanswered) statUnanswered.textContent = unanswered;
      if (statAccuracy) statAccuracy.textContent = `正確率: ${accRate}%`;

      // Filter questions based on jumpInnerFilter
      let displayQuestions = filteredQuestions.map((q, idx) => ({ ...q, originalIndex: idx }));

      if (jumpInnerFilter === 'unanswered') {
        displayQuestions = displayQuestions.filter(q => userAnswers[q.id] === undefined);
      } else if (jumpInnerFilter === 'wrong') {
        displayQuestions = displayQuestions.filter(q => userAnswers[q.id] !== undefined && userAnswers[q.id] !== q.answer);
      }

      if (displayQuestions.length === 0) {
        container.innerHTML = `
          <div class="card p-8 text-center space-y-2">
            <i data-lucide="check" class="w-8 h-8 mx-auto text-success"></i>
            <h4 class="font-bold text-sm text-primary">目前無符合條件的題目</h4>
            <p class="text-xs text-secondary">請點選上方「全部題號」檢視所有題目。</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      // Mode: Grouped by Unit
      if (jumpInnerFilter === 'grouped') {
        // Group by unitTitle
        const groups = {};
        displayQuestions.forEach(q => {
          const key = q.unitTitle || '其他題目';
          if (!groups[key]) groups[key] = [];
          groups[key].push(q);
        });

        let groupedHtml = '';
        for (const [title, items] of Object.entries(groups)) {
          groupedHtml += `
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs font-bold text-primary px-1">
                <span>📘 ${title}</span>
                <span class="text-secondary font-mono">${items.length} 題</span>
              </div>
              <div class="grid grid-cols-5 sm:grid-cols-6 gap-2">
                ${items.map(item => this.buildJumpCell(item)).join('')}
              </div>
            </div>
          `;
        }
        container.innerHTML = groupedHtml;
      } else {
        // Compact Grid Mode
        container.innerHTML = `
          <div class="grid grid-cols-5 sm:grid-cols-6 gap-2">
            ${displayQuestions.map(item => this.buildJumpCell(item)).join('')}
          </div>
        `;
      }

      // Bind cell click to jump immediately
      container.querySelectorAll('[data-jump-index]').forEach(cell => {
        cell.addEventListener('click', () => {
          const targetIdx = parseInt(cell.getAttribute('data-jump-index'), 10);
          currentIndex = targetIdx;

          // Close sheet
          document.getElementById('jump-sheet')?.classList.remove('open');
          document.getElementById('jump-overlay')?.classList.remove('open');

          this.renderCurrentQuestion();
          this.updateBottomBar();
          vibrate(20);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });

      if (window.lucide) window.lucide.createIcons();
    },

    buildJumpCell(item) {
      const idx = item.originalIndex;
      const userAns = userAnswers[item.id];
      const isCurrent = idx === currentIndex;

      let stateClass = '';
      let statusIndicator = `<span class="text-[9px] text-tertiary">未答</span>`;

      if (isCurrent) {
        stateClass = 'active-q';
        statusIndicator = `<span class="text-[9px] font-bold text-accent">目前</span>`;
      } else if (userAns !== undefined) {
        if (userAns === item.answer) {
          stateClass = 'is-correct';
          statusIndicator = `<span class="text-[9px] font-bold text-success">✓ 對</span>`;
        } else {
          stateClass = 'is-wrong';
          statusIndicator = `<span class="text-[9px] font-bold text-danger">✗ 錯</span>`;
        }
      }

      return `
        <div data-jump-index="${idx}" class="jump-cell ${stateClass}">
          <span class="font-bold text-sm font-mono leading-none">${idx + 1}</span>
          <div class="mt-1">${statusIndicator}</div>
        </div>
      `;
    },

    // Reading Passage Content with Paragraph Highlighting
    renderPassageContent() {
      const container = document.getElementById('sheet-passage-body');
      const titleEl = document.getElementById('sheet-passage-title');
      if (!container) return;

      const currentQ = filteredQuestions[currentIndex];
      const targetUnit = currentQ ? window.QUIZ_DATA.units.find(u => u.id === currentQ.unitId) : window.QUIZ_DATA.units[0];

      if (titleEl && targetUnit) titleEl.textContent = `${targetUnit.unit}: ${targetUnit.title}`;

      // Check if current question references a specific paragraph
      let targetPara = '';
      if (currentQ?.passage_ref) {
        const match = currentQ.passage_ref.match(/Paragraph\s+([A-G])/i);
        if (match) targetPara = match[1].toUpperCase();
      }

      const parasHtml = targetUnit.passage.map(p => {
        let text = p.text;
        targetUnit.red_words.forEach(rw => {
          const reg = new RegExp(`\\b(${rw.word}|${rw.word}s|${rw.word}ed|${rw.word}ing)\\b`, 'gi');
          text = text.replace(reg, (match) => {
            return `<span class="red-word-tag">${match}</span>`;
          });
        });

        const isRef = p.para.toUpperCase() === targetPara;

        return `
          <div id="para-${p.para}" class="space-y-1.5 ${isRef ? 'highlight-para' : ''}">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-bold text-accent px-1.5 py-0.5 rounded bg-accent-light">[Paragraph ${p.para}]</span>
              ${isRef ? '<span class="badge badge-amber text-[10px]">📍 本題出處段落</span>' : ''}
            </div>
            <p class="text-sm text-secondary leading-relaxed">${text}</p>
          </div>
        `;
      }).join('');

      container.innerHTML = parasHtml;

      // Auto-scroll to highlighted paragraph
      if (targetPara) {
        setTimeout(() => {
          const paraEl = document.getElementById(`para-${targetPara}`);
          if (paraEl) paraEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    },

    render() {
      if (!this.container) return;

      this.container.innerHTML = `
        <div class="space-y-4">
          <!-- Mobile Horizontal Scrollable Category Pills -->
          <div class="scroll-pills -mx-2 px-2">
            <button data-cat="all" class="pill-btn ${currentFilterCat === 'all' && !isRetestMode ? 'active' : ''}">
              🌟 全部題目 (${allQuestions.length})
            </button>
            <button data-cat="reading" class="pill-btn ${currentFilterCat === 'reading' ? 'active' : ''}">
              📖 課文閱讀理解 (39)
            </button>
            <button data-cat="vocab_red" class="pill-btn ${currentFilterCat === 'vocab_red' ? 'active' : ''}">
              ⚡ 紅色核心單字 (40)
            </button>
            <button data-cat="vocab_book" class="pill-btn ${currentFilterCat === 'vocab_book' ? 'active' : ''}">
              📝 課本練習題 (41)
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

          <!-- Retest Notice -->
          ${isRetestMode ? `
            <div class="card p-3 bg-danger-bg border border-danger/30 flex items-center justify-between text-xs text-danger font-bold">
              <span class="flex items-center gap-1.5">
                <i data-lucide="zap" class="w-4 h-4"></i>
                錯題消滅模式 (${filteredQuestions.length} 題)
              </span>
              <button id="btn-exit-retest" class="text-xs text-primary underline">退出重測</button>
            </div>
          ` : ''}

          <!-- Question View Card Container -->
          <div id="mcq-card-container"></div>
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

      document.getElementById('btn-exit-retest')?.addEventListener('click', () => {
        isRetestMode = false;
        this.applyFilters();
        this.render();
        this.updateBottomBar();
      });

      this.renderCurrentQuestion();
      this.updateBottomBar();
      if (window.lucide) window.lucide.createIcons();
    },

    renderCurrentQuestion() {
      const container = document.getElementById('mcq-card-container');
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

      let catBadgeClass = 'badge-blue';
      if (q.category === 'vocab_red') catBadgeClass = 'badge-red';
      else if (q.category === 'vocab_book') catBadgeClass = 'badge-amber';

      container.innerHTML = `
        <div class="card p-5 sm:p-7 space-y-5 shadow-sm border border-subtle animate-fade-in">
          <!-- Card Top Bar -->
          <div class="flex items-center justify-between text-xs font-bold text-secondary">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="badge ${catBadgeClass}">${q.category_zh}</span>
              <span class="badge badge-blue font-mono">${q.unitTitle.split(':')[0]}</span>
            </div>
            
            <div class="flex items-center gap-1.5">
              <!-- 對照課文按鈕 -->
              <button id="btn-card-passage" class="btn btn-secondary text-xs px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold text-primary border border-subtle hover:border-accent hover:text-accent shadow-sm active:scale-95 transition-all" title="展開課文對照">
                <i data-lucide="book-open" class="w-3.5 h-3.5 text-accent"></i>
                <span>對照課文</span>
              </button>

              <button id="btn-shuffle-quick" class="btn btn-ghost p-1.5 text-secondary" title="隨機洗牌題目">
                <i data-lucide="shuffle" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-border-subtle h-1.5 rounded-full overflow-hidden">
            <div class="bg-accent h-full transition-all duration-300" style="width: ${((currentIndex + 1) / total) * 100}%"></div>
          </div>

          <!-- Question Stem -->
          <div>
            <h3 class="text-base sm:text-lg font-bold text-primary leading-snug">
              ${q.question}
            </h3>
          </div>

          <!-- 4-Choice Options -->
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
                  <span class="flex-1 text-sm sm:text-base leading-snug">${opt.text}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Instant Detailed Explanation -->
          ${isAnswered ? `
            <div class="p-4 rounded-xl ${isCorrect ? 'bg-success-bg border-success/30' : 'bg-danger-bg border-danger/30'} border space-y-2.5 animate-fade-in">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span class="badge ${isCorrect ? 'badge-green' : 'badge-red'} font-bold">
                    ${isCorrect ? '✓ 作答正確！' : '✗ 答錯了'}
                  </span>
                  <span class="text-xs font-mono font-bold text-primary">正解：(${q.answer.toUpperCase()})</span>
                </div>

                <button id="btn-audio-speak" class="btn btn-ghost text-xs py-1 px-2 text-primary flex items-center gap-1">
                  <i data-lucide="volume-2" class="w-3.5 h-3.5"></i>
                  朗讀題目
                </button>
              </div>

              <div class="text-xs text-primary leading-relaxed whitespace-pre-line bg-elevated/80 p-3 rounded-lg border border-subtle">
                <strong class="text-accent block mb-0.5">💡 繁體中文詳解剖析：</strong>
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

      // Card Passage Trigger
      document.getElementById('btn-card-passage')?.addEventListener('click', () => {
        this.openPassage();
      });

      document.getElementById('btn-shuffle-quick')?.addEventListener('click', () => {
        this.shuffle();
      });

      document.getElementById('btn-audio-speak')?.addEventListener('click', () => {
        pronounce(q.question);
      });

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
      this.updateBottomBar();
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
            <h3 class="text-xl font-bold text-primary">🎉 刷題完成！成績結算報告</h3>
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
