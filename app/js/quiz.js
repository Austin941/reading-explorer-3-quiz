/**
 * Reading Comprehension & Textbook Practice Quiz Engine
 * - Instant Practice Mode & Timed Mock Exam Mode
 * - Original Reading Passage Side-by-Side Drawer with Red Word Highlights
 * - Section A MCQs, Section B Matching/Classification, and Textbook Vocab Cloze
 * - Full Chinese Explanations & Auto-Mistake Capture
 */

(function (window) {
  let currentUnitId = 'u1a';
  let currentMode = 'practice'; // 'practice' or 'exam'
  let currentQuestions = [];
  let currentIndex = 0;
  let userAnswers = {}; // questionId -> selectedKey
  let examTimer = null;
  let examTimeRemaining = 1200; // 20 minutes in seconds
  let isPassageOpen = false;

  const QuizEngine = {
    init(containerId) {
      this.container = document.getElementById(containerId);
      this.render();
    },

    setUnit(unitId) {
      currentUnitId = unitId;
      this.loadQuestions();
      this.render();
    },

    loadQuestions() {
      userAnswers = {};
      currentIndex = 0;
      const allUnits = window.QUIZ_DATA.units;

      if (currentUnitId === 'mock_exam') {
        // Mock Exam combines Reading Comprehension from all 4 units (Ch1 & Ch2)
        currentQuestions = allUnits.flatMap(u => 
          u.reading_comprehension.map(q => ({ ...q, unitTitle: `${u.unit}: ${u.title}`, unitId: u.id }))
        );
      } else if (currentUnitId === 'ch1_all') {
        currentQuestions = allUnits
          .filter(u => u.chapter === 'Chapter 1')
          .flatMap(u => u.reading_comprehension.map(q => ({ ...q, unitTitle: `${u.unit}: ${u.title}`, unitId: u.id })));
      } else if (currentUnitId === 'ch2_all') {
        currentQuestions = allUnits
          .filter(u => u.chapter === 'Chapter 2')
          .flatMap(u => u.reading_comprehension.map(q => ({ ...q, unitTitle: `${u.unit}: ${u.title}`, unitId: u.id })));
      } else {
        const u = allUnits.find(unit => unit.id === currentUnitId) || allUnits[0];
        // Combine Reading Comprehension and Vocabulary Practice for the unit
        const rc = u.reading_comprehension.map(q => ({ ...q, unitTitle: `${u.unit}: ${u.title}`, unitId: u.id, cat: '閱讀測驗' }));
        const vp = u.vocabulary_practice.map(q => ({ ...q, unitTitle: `${u.unit}: 課本單字練習`, unitId: u.id, cat: '單字實戰' }));
        currentQuestions = [...rc, ...vp];
      }
    },

    render() {
      if (!this.container) return;
      if (currentQuestions.length === 0) this.loadQuestions();

      const unitObj = window.QUIZ_DATA.units.find(u => u.id === currentUnitId);

      this.container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Main Quiz Column -->
          <div class="lg:col-span-8 space-y-6">
            <!-- Quiz Control Bar -->
            <div class="card p-5 flex flex-wrap items-center justify-between gap-4">
              <div class="flex flex-wrap items-center gap-3">
                <select id="quiz-unit-select" class="px-3.5 py-2 text-sm font-semibold rounded-full border border-subtle bg-elevated text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                  <optgroup label="單元專屬練習">
                    <option value="u1a" ${currentUnitId === 'u1a' ? 'selected' : ''}>Unit 1A: A Love for Soccer</option>
                    <option value="u1b" ${currentUnitId === 'u1b' ? 'selected' : ''}>Unit 1B: Olympic Champions</option>
                    <option value="u2a" ${currentUnitId === 'u2a' ? 'selected' : ''}>Unit 2A: What is Beauty?</option>
                    <option value="u2b" ${currentUnitId === 'u2b' ? 'selected' : ''}>Unit 2B: Skin: Body's Canvas</option>
                  </optgroup>
                  <optgroup label="章節與全真模擬">
                    <option value="ch1_all" ${currentUnitId === 'ch1_all' ? 'selected' : ''}>Chapter 1 全章大會考 (1A+1B)</option>
                    <option value="ch2_all" ${currentUnitId === 'ch2_all' ? 'selected' : ''}>Chapter 2 全章大會考 (2A+2B)</option>
                    <option value="mock_exam" ${currentUnitId === 'mock_exam' ? 'selected' : ''}>🔥 期中全真模擬大測驗 (Ch1+Ch2)</option>
                  </optgroup>
                </select>

                <div class="inline-flex rounded-full border border-subtle p-1 bg-elevated text-xs font-bold">
                  <button id="btn-mode-practice" class="px-3 py-1 rounded-full ${currentMode === 'practice' ? 'bg-accent text-white' : 'text-secondary'}">即時解析刷題</button>
                  <button id="btn-mode-exam" class="px-3 py-1 rounded-full ${currentMode === 'exam' ? 'bg-accent text-white' : 'text-secondary'}">模擬計時考</button>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button id="btn-toggle-passage" class="btn btn-secondary text-xs py-2 px-3.5">
                  <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
                  ${isPassageOpen ? '收起課文' : '對照課文原文'}
                </button>

                <button id="btn-reset-quiz" class="btn btn-ghost text-xs py-2 px-3" title="重置本單元題目">
                  <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

            <!-- Question Progress & Card -->
            <div id="quiz-question-container"></div>
          </div>

          <!-- Side Passage Column / Drawer -->
          <div id="passage-column" class="lg:col-span-4 ${isPassageOpen ? 'block' : 'hidden lg:block'} space-y-4">
            <div class="card p-6 max-h-[820px] overflow-y-auto sticky top-24">
              <div class="flex items-center justify-between pb-3 border-b border-subtle mb-4">
                <div class="flex items-center gap-2">
                  <span class="badge badge-blue">課文對照</span>
                  <h3 class="font-bold text-sm tracking-tight text-primary">${unitObj ? unitObj.title : '課文原文'}</h3>
                </div>
                <span class="text-xs text-secondary font-mono">紅字為考點單字</span>
              </div>
              <div id="passage-content" class="text-sm leading-relaxed space-y-4 text-primary"></div>
            </div>
          </div>
        </div>
      `;

      // Render passage content
      this.renderPassageContent(unitObj);

      // Render Current Question
      this.renderCurrentQuestion();

      // Setup Event Listeners
      document.getElementById('quiz-unit-select')?.addEventListener('change', (e) => {
        this.setUnit(e.target.value);
      });

      document.getElementById('btn-mode-practice')?.addEventListener('click', () => {
        currentMode = 'practice';
        this.render();
      });

      document.getElementById('btn-mode-exam')?.addEventListener('click', () => {
        currentMode = 'exam';
        this.render();
      });

      document.getElementById('btn-toggle-passage')?.addEventListener('click', () => {
        isPassageOpen = !isPassageOpen;
        const col = document.getElementById('passage-column');
        if (col) col.classList.toggle('hidden');
        document.getElementById('btn-toggle-passage').innerHTML = `
          <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
          ${isPassageOpen ? '收起課文' : '對照課文原文'}
        `;
        if (window.lucide) window.lucide.createIcons();
      });

      document.getElementById('btn-reset-quiz')?.addEventListener('click', () => {
        if (confirm('確定要重新開始本單元的題目嗎？')) {
          this.loadQuestions();
          this.render();
        }
      });

      if (window.lucide) window.lucide.createIcons();
    },

    renderPassageContent(unitObj) {
      const container = document.getElementById('passage-content');
      if (!container) return;

      const targetUnit = unitObj || window.QUIZ_DATA.units[0];
      const redWordsSet = new Set(targetUnit.red_words.map(w => w.word.toLowerCase()));

      const parasHtml = targetUnit.passage.map(p => {
        // Highlight red target words
        let processedText = p.text;
        targetUnit.red_words.forEach(rw => {
          const regex = new RegExp(`\\b(${rw.word}|${rw.word}s|${rw.word}ed|${rw.word}ing)\\b`, 'gi');
          processedText = processedText.replace(regex, (match) => {
            return `<span class="red-word-tag" onclick="window.MatchingGame ? window.MatchingGame.pronounce('${rw.word}') : null" title="${rw.zh} (${rw.pos})">${match}</span>`;
          });
        });

        return `
          <div class="space-y-1">
            <span class="font-mono text-xs font-bold text-accent px-1.5 py-0.5 rounded bg-accent-light">[Paragraph ${p.para}]</span>
            <p class="text-sm text-secondary">${processedText}</p>
          </div>
        `;
      }).join('');

      container.innerHTML = parasHtml;
    },

    renderCurrentQuestion() {
      const qc = document.getElementById('quiz-question-container');
      if (!qc) return;

      if (currentQuestions.length === 0) {
        qc.innerHTML = `<div class="card p-8 text-center text-secondary">查無此單元題目</div>`;
        return;
      }

      const q = currentQuestions[currentIndex];
      const total = currentQuestions.length;
      const answeredCount = Object.keys(userAnswers).length;
      const selectedKey = userAnswers[q.id];
      const isAnswered = selectedKey !== undefined;

      qc.innerHTML = `
        <div class="card p-6 sm:p-8 space-y-6">
          <!-- Top Progress Tracker -->
          <div class="flex items-center justify-between text-xs font-bold text-secondary">
            <div class="flex items-center gap-2">
              <span class="badge ${q.cat === '單字實戰' ? 'badge-amber' : 'badge-blue'}">${q.cat || '閱讀測驗'}</span>
              <span class="badge badge-red font-mono">${q.type || 'MCQ'}</span>
              <span>${q.unitTitle || ''}</span>
            </div>
            <div class="font-mono">
              第 <span class="text-primary font-bold">${currentIndex + 1}</span> / ${total} 題
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-border-subtle h-2 rounded-full overflow-hidden">
            <div class="bg-accent h-full transition-all duration-300" style="width: ${((currentIndex + 1) / total) * 100}%"></div>
          </div>

          <!-- Question Stem -->
          <div class="space-y-2">
            ${q.passage_ref ? `<div class="text-xs text-accent font-semibold font-mono">課文段落定位：${q.passage_ref}</div>` : ''}
            <h3 class="text-lg sm:text-xl font-bold text-primary leading-snug">
              ${q.num ? `${q.num}. ` : ''}${q.question}
            </h3>
          </div>

          <!-- Option Buttons -->
          <div class="space-y-3 pt-2">
            ${q.options.map(opt => {
              let stateClass = '';
              if (currentMode === 'practice' && isAnswered) {
                if (opt.key === q.answer) {
                  stateClass = 'correct';
                } else if (opt.key === selectedKey) {
                  stateClass = 'wrong';
                }
              } else if (selectedKey === opt.key) {
                stateClass = 'selected';
              }

              return `
                <button 
                  data-key="${opt.key}" 
                  class="option-btn ${stateClass}" 
                  ${currentMode === 'practice' && isAnswered ? 'disabled' : ''}>
                  <span class="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                    ${opt.key.toUpperCase()}
                  </span>
                  <span class="flex-1">${opt.text}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Detailed Chinese Explanation (Instant in Practice mode) -->
          ${currentMode === 'practice' && isAnswered ? `
            <div class="p-5 rounded-xl bg-elevated border border-subtle space-y-3 animate-fade-in">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="badge ${selectedKey === q.answer ? 'badge-green' : 'badge-red'} font-bold">
                    ${selectedKey === q.answer ? '✓ 正確解答' : '✗ 作答錯誤'}
                  </span>
                  <span class="text-xs font-mono font-bold text-secondary">正解為：${q.answer.toUpperCase()}</span>
                </div>
                <button id="btn-toggle-fav" class="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
                  <i data-lucide="bookmark" class="w-3.5 h-3.5"></i>
                  ${selectedKey === q.answer ? '加入錯題本加強' : '已自動加入錯題本'}
                </button>
              </div>
              <p class="text-sm text-secondary leading-relaxed">${q.explanation || '本題考查對課文主旨與細節之精確理解。'}</p>
            </div>
          ` : ''}

          <!-- Pagination Controls -->
          <div class="flex items-center justify-between pt-4 border-t border-subtle">
            <button id="btn-prev-q" class="btn btn-ghost text-xs px-4" ${currentIndex === 0 ? 'disabled' : ''}>
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
              上一題
            </button>

            <!-- Number Quick Jump Strip -->
            <div class="hidden sm:flex items-center gap-1.5 max-w-[280px] overflow-x-auto py-1">
              ${currentQuestions.map((_, i) => {
                const ans = userAnswers[currentQuestions[i].id];
                let dotClass = 'bg-border-subtle text-secondary';
                if (i === currentIndex) dotClass = 'ring-2 ring-accent font-bold text-accent';
                if (ans) dotClass += ans === currentQuestions[i].answer ? ' bg-success-bg text-success' : ' bg-danger-bg text-danger';
                return `
                  <button data-index="${i}" class="jump-btn w-6 h-6 rounded-full text-xs flex items-center justify-center shrink-0 ${dotClass}">
                    ${i + 1}
                  </button>
                `;
              }).join('')}
            </div>

            ${currentIndex < total - 1 ? `
              <button id="btn-next-q" class="btn btn-primary text-xs px-5">
                下一題
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
              </button>
            ` : `
              <button id="btn-finish-quiz" class="btn btn-success text-xs px-5">
                <i data-lucide="check" class="w-4 h-4"></i>
                交卷 / 查看總結
              </button>
            `}
          </div>
        </div>
      `;

      // Option click events
      qc.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          this.handleAnswer(q, key);
        });
      });

      // Navigation click events
      document.getElementById('btn-prev-q')?.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          this.renderCurrentQuestion();
        }
      });

      document.getElementById('btn-next-q')?.addEventListener('click', () => {
        if (currentIndex < currentQuestions.length - 1) {
          currentIndex++;
          this.renderCurrentQuestion();
        }
      });

      document.getElementById('btn-finish-quiz')?.addEventListener('click', () => {
        this.showQuizSummary();
      });

      qc.querySelectorAll('.jump-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentIndex = parseInt(btn.getAttribute('data-index'), 10);
          this.renderCurrentQuestion();
        });
      });

      document.getElementById('btn-toggle-fav')?.addEventListener('click', () => {
        window.Auth.addMistake(q, selectedKey || '無作答');
        alert('已成功收錄至您的錯題筆記本！');
      });

      if (window.lucide) window.lucide.createIcons();
    },

    handleAnswer(questionObj, chosenKey) {
      userAnswers[questionObj.id] = chosenKey;
      const isCorrect = chosenKey === questionObj.answer;

      // Record in Auth
      window.Auth.recordAnswer(questionObj.id, isCorrect, questionObj.unitId);

      // If wrong, immediately register to Mistake Notebook
      if (!isCorrect) {
        window.Auth.addMistake(questionObj, chosenKey);
      }

      this.renderCurrentQuestion();
    },

    showQuizSummary() {
      const qc = document.getElementById('quiz-question-container');
      if (!qc) return;

      let correctCount = 0;
      let wrongCount = 0;
      const total = currentQuestions.length;

      currentQuestions.forEach(q => {
        if (userAnswers[q.id] === q.answer) {
          correctCount++;
        } else if (userAnswers[q.id]) {
          wrongCount++;
        }
      });

      const scorePercent = Math.round((correctCount / total) * 100);

      qc.innerHTML = `
        <div class="card p-8 text-center space-y-6 animate-fade-in">
          <div class="w-20 h-20 mx-auto rounded-full ${scorePercent >= 80 ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'} flex items-center justify-center text-3xl font-extrabold">
            ${scorePercent}%
          </div>

          <div class="space-y-1">
            <h3 class="text-2xl font-bold text-primary">測驗完成！成績結算報告</h3>
            <p class="text-sm text-secondary">
              總題數：${total} 題 · 答對：<span class="text-success font-bold">${correctCount} 題</span> · 答錯：<span class="text-danger font-bold">${wrongCount} 題</span>
            </p>
          </div>

          <div class="p-4 rounded-xl bg-elevated border border-subtle text-left max-h-72 overflow-y-auto space-y-3">
            <h4 class="font-bold text-sm text-primary mb-2">題目作答清單與解析：</h4>
            ${currentQuestions.map((q, idx) => {
              const userAns = userAnswers[q.id];
              const ok = userAns === q.answer;
              return `
                <div class="p-3 rounded-lg border border-subtle flex items-start justify-between gap-3 text-xs">
                  <div>
                    <span class="font-bold text-primary">${idx + 1}. ${q.question}</span>
                    <div class="text-secondary mt-1">你的選擇：${userAns ? userAns.toUpperCase() : '未作答'} | 正解：<span class="text-success font-bold">${q.answer.toUpperCase()}</span></div>
                  </div>
                  <span class="badge ${ok ? 'badge-green' : 'badge-red'} shrink-0">${ok ? '正確' : '需複習'}</span>
                </div>
              `;
            }).join('')}
          </div>

          <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button id="btn-re-quiz" class="btn btn-primary px-6 py-2.5">
              <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
              重新測驗本單元
            </button>
            <button onclick="window.App.switchTab('review')" class="btn btn-secondary px-6 py-2.5">
              <i data-lucide="book-marked" class="w-4 h-4"></i>
              前往錯題本複習
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-re-quiz')?.addEventListener('click', () => {
        this.loadQuestions();
        this.render();
      });

      if (window.confetti && scorePercent >= 80) {
        window.confetti({ particleCount: 100, spread: 80 });
      }

      if (window.lucide) window.lucide.createIcons();
    }
  };

  window.QuizEngine = QuizEngine;
})(window);
