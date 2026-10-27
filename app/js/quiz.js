/**
 * Dedicated Multiple Choice Quiz Engine (課本選擇題刷題引擎)
 * - 120 Total Multiple Choice Questions across Ch1 & Ch2
 * - Categories: 課文閱讀理解選擇題、紅色核心單字配對選擇題、課本單字練習選擇題
 * - Instant feedback with Detailed Chinese Explanations & Passage References
 * - Split / Drawer Reading Passage View
 * - Auto-Mistake Recording & Re-take Mode
 */

(function (window) {
  let allQuestions = [];
  let filteredQuestions = [];
  let currentIndex = 0;
  let userAnswers = {}; // questionId -> selectedKey
  let currentFilterCat = 'all'; // 'all', 'reading', 'vocab_red', 'vocab_book'
  let currentFilterUnit = 'all'; // 'all', 'u1a', 'u1b', 'u2a', 'u2b', 'ch1', 'ch2'
  let isPassageOpen = false;
  let isRetestMode = false;

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
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
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
    },

    startRetest(mistakeQuestions) {
      isRetestMode = true;
      filteredQuestions = mistakeQuestions;
      currentIndex = 0;
      userAnswers = {};
      this.render();
    },

    render() {
      if (!this.container) return;

      const currentQ = filteredQuestions[currentIndex];
      const unitObj = currentQ ? window.QUIZ_DATA.units.find(u => u.id === currentQ.unitId) : null;

      this.container.innerHTML = `
        <div class="space-y-6">
          <!-- Top Control Header -->
          <div class="card p-5 flex flex-wrap items-center justify-between gap-4">
            <!-- Filter selectors -->
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="text-xs font-bold text-secondary uppercase tracking-wider">刷題範圍：</span>
              
              <!-- Category Filter -->
              <select id="mcq-filter-cat" class="px-3.5 py-1.5 text-xs font-bold rounded-full border border-subtle bg-elevated text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="all" ${currentFilterCat === 'all' && !isRetestMode ? 'selected' : ''}>🌟 全部選擇題 (120 題)</option>
                <option value="reading" ${currentFilterCat === 'reading' ? 'selected' : ''}>📖 課文閱讀理解選擇題 (39 題)</option>
                <option value="vocab_red" ${currentFilterCat === 'vocab_red' ? 'selected' : ''}>⚡ 紅色核心單字配對選擇題 (40 題)</option>
                <option value="vocab_book" ${currentFilterCat === 'vocab_book' ? 'selected' : ''}>📝 課本單字練習選擇題 (41 題)</option>
              </select>

              <!-- Unit Filter -->
              <select id="mcq-filter-unit" class="px-3.5 py-1.5 text-xs font-bold rounded-full border border-subtle bg-elevated text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="all" ${currentFilterUnit === 'all' ? 'selected' : ''}>全書 Ch1 + Ch2</option>
                <option value="ch1" ${currentFilterUnit === 'ch1' ? 'selected' : ''}>Chapter 1 全章</option>
                <option value="ch2" ${currentFilterUnit === 'ch2' ? 'selected' : ''}>Chapter 2 全章</option>
                <option value="u1a" ${currentFilterUnit === 'u1a' ? 'selected' : ''}>Unit 1A: A Love for Soccer</option>
                <option value="u1b" ${currentFilterUnit === 'u1b' ? 'selected' : ''}>Unit 1B: Olympic Champions</option>
                <option value="u2a" ${currentFilterUnit === 'u2a' ? 'selected' : ''}>Unit 2A: What is Beauty?</option>
                <option value="u2b" ${currentFilterUnit === 'u2b' ? 'selected' : ''}>Unit 2B: Skin: Body's Canvas</option>
              </select>

              ${isRetestMode ? `
                <span class="badge badge-red font-bold text-xs py-1 px-3">
                  🔥 錯題消滅模式中 (${filteredQuestions.length} 題)
                </span>
              ` : ''}
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-2">
              <button id="btn-shuffle-q" class="btn btn-ghost text-xs py-1.5 px-3" title="隨機打亂題目順序">
                <i data-lucide="shuffle" class="w-3.5 h-3.5"></i>
                隨機抽題
              </button>

              <button id="btn-toggle-passage" class="btn btn-secondary text-xs py-1.5 px-3.5">
                <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
                ${isPassageOpen ? '隱藏課文' : '對照課文原文'}
              </button>
            </div>
          </div>

          <!-- Main Layout: Question + Collapsible Passage -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <!-- Left: Question Card (8 or 12 cols) -->
            <div class="${isPassageOpen ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-6">
              <div id="mcq-card-container"></div>
            </div>

            <!-- Right: Reading Passage Drawer (5 cols) -->
            <div id="passage-drawer" class="${isPassageOpen ? 'lg:col-span-5 block' : 'hidden'} space-y-4">
              <div class="card p-6 max-h-[820px] overflow-y-auto sticky top-20 shadow-lg border border-subtle">
                <div class="flex items-center justify-between pb-3 border-b border-subtle mb-4">
                  <div class="flex items-center gap-2">
                    <span class="badge badge-blue">課文對照</span>
                    <h4 class="font-bold text-sm text-primary" id="passage-unit-title">
                      ${unitObj ? `${unitObj.unit}: ${unitObj.title}` : '課文原文'}
                    </h4>
                  </div>
                  <span class="text-xs text-secondary font-mono">紅字為考試必背單字</span>
                </div>
                <div id="passage-body" class="text-sm leading-relaxed space-y-4 text-primary"></div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Event listeners
      document.getElementById('mcq-filter-cat')?.addEventListener('change', (e) => {
        this.setCategoryFilter(e.target.value);
      });

      document.getElementById('mcq-filter-unit')?.addEventListener('change', (e) => {
        this.setUnitFilter(e.target.value);
      });

      document.getElementById('btn-shuffle-q')?.addEventListener('click', () => {
        this.shuffle();
      });

      document.getElementById('btn-toggle-passage')?.addEventListener('click', () => {
        isPassageOpen = !isPassageOpen;
        this.render();
      });

      this.renderCurrentQuestion();
      this.renderPassage(unitObj);
      if (window.lucide) window.lucide.createIcons();
    },

    renderPassage(unitObj) {
      const container = document.getElementById('passage-body');
      if (!container) return;

      const targetUnit = unitObj || window.QUIZ_DATA.units[0];
      const parasHtml = targetUnit.passage.map(p => {
        let text = p.text;
        targetUnit.red_words.forEach(rw => {
          const reg = new RegExp(`\\b(${rw.word}|${rw.word}s|${rw.word}ed|${rw.word}ing)\\b`, 'gi');
          text = text.replace(reg, (match) => {
            return `<span class="red-word-tag" onclick="window.speechSynthesis ? window.speechSynthesis.speak(new SpeechSynthesisUtterance('${rw.word}')) : null" title="${rw.zh} (${rw.pos})">${match}</span>`;
          });
        });
        return `
          <div class="space-y-1">
            <span class="font-mono text-xs font-bold text-accent px-1.5 py-0.5 rounded bg-accent-light">[Paragraph ${p.para}]</span>
            <p class="text-sm text-secondary">${text}</p>
          </div>
        `;
      }).join('');

      container.innerHTML = parasHtml;
    },

    renderCurrentQuestion() {
      const container = document.getElementById('mcq-card-container');
      if (!container) return;

      if (filteredQuestions.length === 0) {
        container.innerHTML = `
          <div class="card p-12 text-center space-y-4">
            <i data-lucide="check-circle" class="w-12 h-12 mx-auto text-success"></i>
            <h3 class="text-lg font-bold text-primary">目前篩選條件下無題目！</h3>
            <p class="text-sm text-secondary">請調整上方篩選條件或切換單元開始刷題。</p>
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
        <div class="card p-6 sm:p-8 space-y-6 shadow-sm border border-subtle">
          <!-- Header Status -->
          <div class="flex items-center justify-between text-xs font-bold text-secondary">
            <div class="flex items-center gap-2">
              <span class="badge ${catBadgeClass}">${q.category_zh}</span>
              <span class="badge badge-blue font-mono">${q.chapter}</span>
              <span class="text-primary font-medium hidden sm:inline">${q.unitTitle}</span>
            </div>
            <div class="font-mono">
              第 <span class="text-primary font-bold text-sm">${currentIndex + 1}</span> / ${total} 題
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-border-subtle h-2 rounded-full overflow-hidden">
            <div class="bg-accent h-full transition-all duration-300" style="width: ${((currentIndex + 1) / total) * 100}%"></div>
          </div>

          <!-- Question Stem -->
          <div class="space-y-2">
            ${q.passage_ref ? `<span class="text-xs font-mono font-bold text-accent block">📍 課文定位：${q.passage_ref}</span>` : ''}
            <h3 class="text-lg sm:text-xl font-bold text-primary leading-snug">
              ${q.question}
            </h3>
          </div>

          <!-- Options List (a, b, c, d) -->
          <div class="space-y-3 pt-2">
            ${q.options.map(opt => {
              let stateClass = '';
              if (isAnswered) {
                if (opt.key === q.answer) {
                  stateClass = 'correct';
                } else if (opt.key === selectedKey) {
                  stateClass = 'wrong';
                }
              }

              return `
                <button 
                  data-key="${opt.key}" 
                  class="option-btn ${stateClass}" 
                  ${isAnswered ? 'disabled' : ''}>
                  <span class="w-7 h-7 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                    ${opt.key.toUpperCase()}
                  </span>
                  <span class="flex-1">${opt.text}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Instant Feedback & Detailed Chinese Explanation -->
          ${isAnswered ? `
            <div class="p-5 rounded-2xl ${isCorrect ? 'bg-success-bg border-success/30' : 'bg-danger-bg border-danger/30'} border space-y-3 animate-fade-in">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="badge ${isCorrect ? 'badge-green' : 'badge-red'} font-bold">
                    ${isCorrect ? '✓ 作答正確！' : '✗ 作答錯誤'}
                  </span>
                  <span class="text-xs font-mono font-bold text-primary">正解為：(${q.answer.toUpperCase()})</span>
                </div>

                <button id="btn-audio-speak" class="btn btn-ghost text-xs py-1 px-2.5 flex items-center gap-1 text-primary">
                  <i data-lucide="volume-2" class="w-3.5 h-3.5"></i>
                  朗讀題目
                </button>
              </div>

              <!-- Explanation -->
              <div class="text-xs sm:text-sm text-primary leading-relaxed whitespace-pre-line bg-elevated/70 p-3.5 rounded-xl border border-subtle">
                <strong class="text-accent block mb-1">💡 繁體中文詳解剖析：</strong>
                ${q.explanation || '本題考查對課文主旨與細節之精確掌握。'}
              </div>

              ${!isCorrect ? `
                <div class="text-xs text-danger flex items-center gap-1.5 font-medium">
                  <i data-lucide="alert-circle" class="w-3.5 h-3.5"></i>
                  本題已自動同步收錄至「錯題筆記本」，隨時可進入錯題專區集中重刷！
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Pagination & Controls -->
          <div class="flex items-center justify-between pt-4 border-t border-subtle">
            <button id="btn-prev" class="btn btn-ghost text-xs px-4" ${currentIndex === 0 ? 'disabled' : ''}>
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
              上一題
            </button>

            <!-- Quick Number Jump -->
            <div class="hidden sm:flex items-center gap-1.5 max-w-[320px] overflow-x-auto py-1">
              ${filteredQuestions.map((item, i) => {
                const ans = userAnswers[item.id];
                let dotClass = 'bg-border-subtle text-secondary';
                if (i === currentIndex) dotClass = 'ring-2 ring-accent font-bold text-accent';
                if (ans !== undefined) {
                  dotClass += ans === item.answer ? ' bg-success-bg text-success' : ' bg-danger-bg text-danger';
                }
                return `
                  <button data-index="${i}" class="jump-btn w-6 h-6 rounded-full text-xs flex items-center justify-center shrink-0 ${dotClass}">
                    ${i + 1}
                  </button>
                `;
              }).join('')}
            </div>

            ${currentIndex < total - 1 ? `
              <button id="btn-next" class="btn btn-primary text-xs px-5">
                下一題
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
              </button>
            ` : `
              <button id="btn-view-summary" class="btn btn-success text-xs px-5">
                <i data-lucide="award" class="w-4 h-4"></i>
                完成結算報告
              </button>
            `}
          </div>
        </div>
      `;

      // Option click events
      container.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          this.handleOptionSelect(q, key);
        });
      });

      // Jump button click events
      container.querySelectorAll('.jump-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentIndex = parseInt(btn.getAttribute('data-index'), 10);
          this.renderCurrentQuestion();
        });
      });

      // Navigation
      document.getElementById('btn-prev')?.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          this.renderCurrentQuestion();
        }
      });

      document.getElementById('btn-next')?.addEventListener('click', () => {
        if (currentIndex < filteredQuestions.length - 1) {
          currentIndex++;
          this.renderCurrentQuestion();
        }
      });

      document.getElementById('btn-view-summary')?.addEventListener('click', () => {
        this.showSummaryModal();
      });

      document.getElementById('btn-audio-speak')?.addEventListener('click', () => {
        pronounce(q.question);
      });

      if (window.lucide) window.lucide.createIcons();
    },

    handleOptionSelect(questionObj, chosenKey) {
      userAnswers[questionObj.id] = chosenKey;
      const isCorrect = chosenKey === questionObj.answer;

      if (isCorrect) playSound('correct');
      else playSound('wrong');

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
        <div class="card p-8 sm:p-10 text-center space-y-6 animate-fade-in shadow-xl">
          <div class="w-20 h-20 mx-auto rounded-full ${accuracy >= 80 ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'} flex items-center justify-center text-3xl font-extrabold">
            ${accuracy}%
          </div>

          <div class="space-y-1">
            <h3 class="text-2xl font-bold text-primary">🎉 選擇題刷題完成！</h3>
            <p class="text-sm text-secondary">
              本輪作答：${total} 題 · 答對：<span class="text-success font-bold">${correct} 題</span> · 答錯：<span class="text-danger font-bold">${wrong} 題</span>
            </p>
          </div>

          <div class="p-4 rounded-xl bg-elevated border border-subtle text-left max-h-80 overflow-y-auto space-y-2 text-xs">
            <h4 class="font-bold text-sm text-primary mb-2">作答清單與解析對照：</h4>
            ${filteredQuestions.map((q, idx) => {
              const uAns = userAnswers[q.id];
              const isOk = uAns === q.answer;
              return `
                <div class="p-3 rounded-xl border border-subtle flex items-start justify-between gap-3">
                  <div>
                    <span class="font-bold text-primary">${idx + 1}. ${q.question}</span>
                    <div class="text-secondary mt-1">
                      你的選擇：<span class="${isOk ? 'text-success' : 'text-danger'} font-bold">(${uAns ? uAns.toUpperCase() : '未答'})</span> · 正解：<span class="text-success font-bold">(${q.answer.toUpperCase()})</span>
                    </div>
                  </div>
                  <span class="badge ${isOk ? 'badge-green' : 'badge-red'} shrink-0">${isOk ? '正確' : '錯題'}</span>
                </div>
              `;
            }).join('')}
          </div>

          <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button id="btn-restart-mcq" class="btn btn-primary px-6 py-2.5">
              <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
              重新再刷一次
            </button>
            <button onclick="window.App.switchView('review')" class="btn btn-secondary px-6 py-2.5">
              <i data-lucide="bookmark" class="w-4 h-4"></i>
              進入錯題筆記本複習
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-restart-mcq')?.addEventListener('click', () => {
        this.applyFilters();
        this.render();
      });

      if (window.confetti && accuracy >= 80) {
        window.confetti({ particleCount: 100, spread: 80 });
      }

      if (window.lucide) window.lucide.createIcons();
    }
  };

  window.MCQQuiz = MCQQuiz;
})(window);
