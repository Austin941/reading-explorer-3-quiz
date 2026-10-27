/**
 * Mistake Notebook & Re-test Engine (手機載體優化版)
 * - Mobile thumb-friendly mistake review cards
 * - Launch mistake re-test mode
 * - Cloud & LocalStorage sync
 */

(function (window) {
  let activeFilter = 'all';

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
        <div class="space-y-4 pb-20">
          <!-- Mobile Header Card -->
          <div class="card p-5 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="badge badge-red font-bold">錯題強化</span>
                <h2 class="text-lg font-bold tracking-tight text-primary">錯題筆記本</h2>
              </div>
              <span class="text-xs text-secondary font-mono">
                待消滅：<strong class="text-danger">${unmastered.length}</strong> / ${allMistakes.length} 題
              </span>
            </div>

            <!-- Action buttons for thumb operation -->
            <div class="flex flex-col sm:flex-row gap-2 pt-1">
              ${unmastered.length > 0 ? `
                <button id="btn-start-retest" class="btn btn-primary w-full py-2.5 text-xs shadow-md">
                  <i data-lucide="zap" class="w-4 h-4"></i>
                  啟動錯題消滅重刷 (${unmastered.length} 題)
                </button>
              ` : ''}

              <div class="flex items-center gap-2">
                <button id="btn-export-progress" class="btn btn-ghost border border-subtle flex-1 text-xs py-2">
                  <i data-lucide="download" class="w-3.5 h-3.5"></i>
                  備份匯出
                </button>
                <button id="btn-import-progress" class="btn btn-ghost border border-subtle flex-1 text-xs py-2">
                  <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                  進度匯入
                </button>
                <input type="file" id="import-file-input" class="hidden" accept=".json" />
              </div>
            </div>
          </div>

          <!-- Mobile Filter Pills -->
          <div class="scroll-pills -mx-2 px-2">
            <button data-filter="all" class="pill-btn ${activeFilter === 'all' ? 'active' : ''}">
              全部錯題 (${allMistakes.length})
            </button>
            <button data-filter="unmastered" class="pill-btn ${activeFilter === 'unmastered' ? 'active' : ''}">
              待掌握 (${unmastered.length})
            </button>
            <button data-filter="mastered" class="pill-btn ${activeFilter === 'mastered' ? 'active' : ''}">
              已熟練 (${allMistakes.length - unmastered.length})
            </button>
          </div>

          <!-- Mistakes List View -->
          <div id="mistakes-list" class="space-y-3">
            ${filtered.length === 0 ? `
              <div class="card p-10 text-center space-y-2">
                <div class="w-10 h-10 mx-auto rounded-full bg-success-bg text-success flex items-center justify-center">
                  <i data-lucide="check" class="w-5 h-5"></i>
                </div>
                <h3 class="font-bold text-base text-primary">目前無待複習錯題</h3>
                <p class="text-xs text-secondary">在刷題中答錯的題目會自動記錄在此處。</p>
              </div>
            ` : filtered.map(m => {
              const q = m.question;
              return `
                <div class="card p-4 sm:p-5 space-y-3 border ${m.mastered ? 'border-success/30' : 'border-subtle'}">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="badge ${m.mastered ? 'badge-green' : 'badge-red'} font-bold">
                        ${m.mastered ? '✓ 已搞懂' : '● 待加強'}
                      </span>
                      <span class="badge badge-blue font-mono text-[10px]">${q.category_zh || '選擇題'}</span>
                    </div>

                    <div class="flex items-center gap-1">
                      <button data-id="${m.id}" class="btn-toggle-mastered btn btn-ghost text-xs py-1 px-2.5">
                        ${m.mastered ? '標記未掌握' : '標記已搞懂'}
                      </button>
                      <button data-id="${m.id}" class="btn-delete-mistake p-1.5 text-secondary hover:text-danger rounded-full" title="刪除">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Question Stem -->
                  <div>
                    <h4 class="text-sm font-bold text-primary leading-snug">${q.question || q.title}</h4>
                  </div>

                  <!-- Comparison Badges -->
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="p-2.5 rounded-xl bg-danger-bg text-danger font-medium">
                      <span class="text-[10px] font-bold block opacity-80">當時選：</span>
                      (${m.wrongAnswer.toUpperCase()})
                    </div>
                    <div class="p-2.5 rounded-xl bg-success-bg text-success font-medium">
                      <span class="text-[10px] font-bold block opacity-80">標準答案：</span>
                      (${q.answer ? q.answer.toUpperCase() : '正解'})
                    </div>
                  </div>

                  <!-- Explanation -->
                  <div class="p-3 rounded-xl bg-elevated border border-subtle text-xs text-primary leading-relaxed whitespace-pre-line">
                    <strong class="text-accent block mb-0.5">💡 詳解：</strong>
                    ${q.explanation || '本題考查課文重點或單字之精確定義。'}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // Listeners
      this.container.querySelectorAll('[data-filter]').forEach(btn => {
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
