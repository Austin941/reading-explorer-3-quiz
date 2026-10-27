# Reading Explorer 3 (3rd ed.) · Ch1 & Ch2 互動刷題與紅色單字配對系統

專為《Reading Explorer 3》第三版 Chapter 1 與 Chapter 2 考試設計的高效互動刷題網站。嚴格擷取課本真實題庫，包含**課文閱讀測驗**與**紅色標記核心單字配對**，並支援 Google 帳號登入、進度雲端同步、本機離線保存與錯題消滅筆記本。

---

## 🌟 核心特色功能

### 1. ⚡ 紅色單字配對挑戰 (Red Vocabulary Matching Game)
- **40 組核心紅字完全收錄**：涵蓋 Unit 1A、Unit 1B、Unit 2A、Unit 2B 每單元 10 個課文紅字。
- **雙模式配對**：支援「英中雙語配對」與「英英字典定義配對」。
- **即時回饋**：內建 Web Audio API 音效、連擊 Combo 計數、秒數計時器與全通關彩帶慶祝（Confetti）。
- **自然發音**：支援 Web Speech API 語音合成，點擊即可聆聽純正美式真人發音。
- **失誤自動收錄**：配對選錯時自動記錄至錯題本，無須手動整理。

### 2. 📖 課文閱讀測驗 (Reading Comprehension)
- **真題完全還原**：收錄課本第 12、18、28、34 頁 Section A 選擇題與 Section B 配對/分類/簡答題，以及課本單字實戰題。
- **雙刷題模式**：
  - **即時解析模式**：點擊選項立即揭曉正解，提供完整繁體中文解析與段落定位（Paragraph A~G）。
  - **模擬計時考模式**：模擬考場倒數計時與成績結算單。
- **側欄課文即時對照**：隨時展開課文原文，紅字考點醒目標記，點擊紅字可即時查看字義與發音。

### 3. 🗂️ 3D 核心單字記憶卡 (Flashcards)
- 仿 Apple 質感 3D 翻轉卡片。
- 正面：英文單字、國際音標 (IPA)、詞性、發音按鈕。
- 背面：精準繁體中文釋義、英文權威解釋、課文原句精讀、常見搭配詞 (Collocations)。
- 支援鍵盤快捷操作（空白鍵翻面、左右方向鍵切換）。

### 4. 🎯 錯題筆記本與錯題消滅戰 (Mistake Notebook & Re-test)
- 自動累積並分類所有在閱讀測驗與單字配對中失誤的題目。
- 支援狀態管理：「待掌握」與「已熟練」。
- **🔥 錯題消滅挑戰**：一鍵抽出所有未掌握錯題進行重測，全對即刻標記熟練。
- **資料備份與匯出**：支援 JSON 格式一鍵匯出與跨裝置匯入。

### 5. ☁️ Google 登入與雙軌同步 (Google Sign-In & Persistence)
- **離線優先 (Offline-First)**：即使未登入，所有刷題進度、錯題本與成績皆以 LocalStorage 永續保存於瀏覽器中。
- **Google / Firebase 雲端同步**：支援 Firebase Auth 登入 Google 帳號，並將進度同步至 Cloud Firestore。
- 內建視覺化 Firebase 設定面板，免改程式碼即可快速綁定自訂 Firebase 專案。

---

## 📚 題庫收錄範圍

| 單元編號 | 課文主題 (Title) | 閱讀測驗題數 | 課本單字練習題數 | 核心紅字數 |
| :--- | :--- | :---: | :---: | :---: |
| **Unit 1A** | A Love for Soccer (The World's Game) | 9 題 (5 MCQ + 4 配對) | 10 題 (選詞/定義) | 10 字 |
| **Unit 1B** | What Makes an Olympic Champion? | 11 題 (5 MCQ + 6 分類) | 11 題 (選詞/配對) | 10 字 |
| **Unit 2A** | What is Beauty? (The Enigma of Beauty) | 11 題 (5 MCQ + 6 資訊) | 10 題 (選詞填空) | 10 字 |
| **Unit 2B** | Skin: The Body's Canvas (Unmasking Skin) | 8 題 (5 MCQ + 3 簡答) | 10 題 (選詞/定義) | 10 字 |
| **全真模擬** | **Chapter 1 & 2 總複習** | **39 題** | **41 題** | **40 字** |

---

## 🚀 如何在 GitHub 上部署為互動網站 (GitHub Pages)

1. **建立私有儲存庫並推動程式碼**：
   ```bash
   git init
   git add .
   git commit -m "feat: complete Reading Explorer 3 Ch1 & Ch2 quiz web app"
   gh repo create rex3-quiz-app --private --source=. --push
   ```
2. **啟用 GitHub Pages**：
   - 進入 GitHub Repository 的 **Settings** -> **Pages**。
   - 在 **Build and deployment** 下方的 **Source** 選擇 `Deploy from a branch`。
   - Branch 選擇 `main` / `(root)`，點擊 **Save**。
   - 稍候 1~2 分鐘，即可獲得公開的互動刷題網址！
