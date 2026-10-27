/**
 * Mistake Notebook & Re-test Engine (錯題複習專區)
 * - Directly integrated with MCQ Quiz Engine
 * - One-click launch Re-take Mistake Quiz (🔥 啟動錯題重刷)
 */

(function (window) {
  let activeFilter = 'all'; // 'all', 'unmastered', 'mastered'

  const ReviewSystem = {
    init(containerId) {
      this.container = document.getElementById(containerId);
      this.render();

      window.addEventListener('mistakes-updated', () => {
        this.render();
      });
    },

    setFilter(filter) {
      activeFilter = filter;
      this.render();
    },

    getFilteredMistakes() {
      const allMistakes = Object.values(window.Auth.getMistakes());
      if (activeFilter === 'unmastered') {
        return allMistakes.filter(m => !m.mastered);
      } else if (activeFilter === 'mastered') {
        return allMistakes.filter(m => m.mastered);
      }
      return allMistakes;
    },

    render() {
      if (!this.container) return;
      const allMistakes = Object.values(window.Auth.getMistakes());
      const filtered = this.getFilteredMistakes();
      const unmastered = allMistakes.filter(m => !m.mastered);

      this.container.innerHTML = `
        <div class="space-y-6">
          <!-- Top Dashboard -->
          <div class="card p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="badge badge-red font-bold">錯題強化</span>
                <h2 class="text-xl font-bold tracking-tight">錯題筆記本與消滅專區</h2>
              </div>
              <p class="text-sm text-secondary mt-1">
                目前累積 <span class="text-primary font-bold">${allMistakes.length} 題錯題</span> · 
                尚有 <span class="text-danger font-bold">${unmastered.length} 題待消滅</span>
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              ${unmastered.length > 0 ? `
                <button id="btn-start-retest" class="btn btn-primary text-xs py-2 px-4 shadow-md">
                  <i data-lucide="zap" class="w-4 h-4"></i>
                  啟動錯題消滅重刷 (${unmastered.length} 題)
                </button>
              ` : ''}

              <button id="btn-export-progress" class="btn btn-secondary text-xs py-2 px-3.5">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                匯出備份
              </button>

              <button id="btn-import-progress" class="btn btn-ghost text-xs py-2 px-3.5">
                <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                匯入進度
              </button>
              <input type="file" id="import-file-input" class="hidden" accept=".json" />
            </div>
          </div>

          <!-- Filter Pills -->
          <div class="flex items-center gap-2 px-1">
            <button data-filter="all" class="filter-pill nav-tab text-xs ${activeFilter === 'all' ? 'active' : ''}">
              全部錯題 (${allMistakes.length})
            </button>
            <button data-filter="unmastered" class="filter-pill nav-tab text-xs ${activeFilter === 'unmastered' ? 'active' : ''}">
              待掌握 (${unmastered.length})
            </button>
            <button data-filter="mastered" class="filter-pill nav-tab text-xs ${activeFilter === 'mastered' ? 'active' : ''}">
              已熟練 (${allMistakes.length - unmastered.length})
            </button>
          </div>

          <!-- Mistakes List View -->
          <div id="mistakes-list" class="space-y-4">
            ${filtered.length === 0 ? `
              <div class="card p-12 text-center space-y-3">
                <div class="w-12 h-12 mx-auto rounded-full bg-success-bg text-success flex items-center justify-center">
                  <i data-lucide="check" class="w-6 h-6"></i>
                </div>
                <h3 class="font-bold text-lg text-primary">目前無待複習的錯題！</h3>
                <p class="text-sm text-secondary">在刷題中若有答錯的題目，系統會自動收集至此處供您反覆演練。</p>
              </div>
            ` : filtered.map(m => {
              const q = m.question;
              return `
                <div class="card p-6 space-y-4 border ${m.mastered ? 'border-success/30' : 'border-subtle'}">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="badge ${m.mastered ? 'badge-green' : 'badge-red'} font-bold">
                        ${m.mastered ? '✓ 已搞懂' : '● 待加強'}
                      </span>
                      <span class="badge badge-blue font-mono text-xs">${q.category_zh || '選擇題'}</span>
                      <span class="text-xs text-secondary">${new Date(m.addedAt).toLocaleDateString()} 收錄</span>
                    </div>

                    <div class="flex items-center gap-2">
                      <button data-id="${m.id}" class="btn-toggle-mastered btn btn-ghost text-xs py-1 px-3">
                        ${m.mastered ? '標記為未掌握' : '標記為已搞懂'}
                      </button>
                      <button data-id="${m.id}" class="btn-delete-mistake btn btn-ghost text-danger text-xs p-1.5" title="從錯題本刪除">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Question Text -->
                  <div>
                    <h4 class="text-base font-bold text-primary">${q.question || q.title}</h4>
                    ${q.passage_ref ? `<span class="text-xs text-accent font-mono block mt-1">定位：${q.passage_ref}</span>` : ''}
                  </div>

                  <!-- Options list if available -->
                  ${q.options ? `
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      ${q.options.map(opt => `
                        <div class="p-2 rounded-lg border border-subtle flex items-center gap-2 ${opt.key === q.answer ? 'bg-success-bg border-success text-success font-bold' : ''}">
                          <span class="w-5 h-5 rounded-full border border-current flex items-center justify-center shrink-0">
                            ${opt.key.toUpperCase()}
                          </span>
                          <span>${opt.text}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}

                  <!-- Comparison: Wrong vs Correct -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div class="p-3 rounded-xl bg-danger-bg text-danger font-medium">
                      <span class="font-bold block mb-0.5">當時錯誤選擇：</span>
                      (${m.wrongAnswer.toUpperCase()})
                    </div>
                    <div class="p-3 rounded-xl bg-success-bg text-success font-medium">
                      <span class="font-bold block mb-0.5">正確標準解答：</span>
                      (${q.answer ? q.answer.toUpperCase() : '正解'})
                    </div>
                  </div>

                  <!-- Detailed Explanation -->
                  <div class="p-4 rounded-xl bg-elevated border border-subtle text-xs text-secondary leading-relaxed whitespace-pre-line">
                    <span class="font-bold text-primary block mb-1">💡 詳解分析：</span>
                    ${q.explanation || '本題考查課文重點或單字之精確定義。'}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // Listeners
      this.container.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          this.setFilter(btn.getAttribute('data-filter'));
        });
      });

      this.container.querySelectorAll('.btn-toggle-mastered').forEach(btn => {
        btn.addEventListener('click', () => {
          window.Auth.toggleMistakeMastered(btn.getAttribute('data-id'));
        });
      });

      this.container.querySelectorAll('.btn-delete-mistake').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('確定要從錯題本中移除此題嗎？')) {
            window.Auth.removeMistake(btn.getAttribute('data-id'));
          }
        });
      });

      document.getElementById('btn-start-retest')?.addEventListener('click', () => {
        const retestQuestions = unmastered.map(m => m.question);
        if (retestQuestions.length === 0) return;
        window.MCQQuiz.startRetest(retestQuestions);
        window.App.switchView('quiz');
      });

      document.getElementById('btn-export-progress')?.addEventListener('click', () => {
        window.Auth.exportAllData();
      });

      const importInput = document.getElementById('import-file-input');
      document.getElementById('btn-import-progress')?.addEventListener('click', () => {
        importInput?.click();
      });

      importInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            window.Auth.importAllData(event.target.result);
          };
          reader.readAsText(file);
        }
      });

      if (window.lucide) window.lucide.createIcons();
    }
  };

  window.ReviewSystem = ReviewSystem;
})(window);
