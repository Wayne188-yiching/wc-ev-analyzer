# Claude Code 接續任務 · WC EV Analyzer Migration

> 把這份提示詞**完整貼到 Claude Code 對話框**作為第一則訊息。
> 提示詞已包含：環境驗證、角色分工、開發流程、Karpathy 守則、硬規則。
> 不需要再額外解釋。

---

## ⬇️ 從這行開始貼

---

# 任務：WC EV Analyzer 從 MVP 單檔 HTML 遷移到 Vite + React + TS 專案

## 環境驗證（先做這個，不要跳過）

1. 確認當前資料夾根目錄有 `HANDOFF.md` 與 `_reference/wc_ev_app_v1_mvp.html`
2. 確認 **Codex plugin** 已安裝並可呼叫（用一個極簡 prompt 測試，例如「回我一個 Hello」）
3. 確認你能執行 git、pnpm、檔案讀寫
4. 任何一項失敗 → **立刻停下來告訴我**，不要硬幹

## 角色分工（這是雙 AI 協作專案）

我們有兩個 AI 工具。明確分工，**不要跨界**。

### 你（Claude Code）= 系統工程師

| 負責範圍 | 具體職責 |
|---|---|
| 架構 | TypeScript types、interfaces、模組邊界 |
| 業務邏輯 | resolve-bet、storage、format、API client |
| State | reducer、hooks、persistence |
| 整合 | View 組裝、callback wiring、props 傳遞 |
| 測試 | 特別是 resolve-bet 的單元測試（TDD） |
| 工程 | Vite 設定、Tailwind PostCSS、build pipeline、git |

### Codex（透過 plugin）= UI/UX 視覺設計師

| 負責範圍 | 具體職責 |
|---|---|
| 視覺元件 | EvBar、Card、Button、KpiCard、Tag、Modal、StrengthBar 的 CSS / JSX |
| 視覺佈局 | View 內部的 grid、spacing、響應式 |
| 互動細節 | hover、focus、loading state |
| 動效 | 克制的 fade、subtle transitions |
| a11y | aria、鍵盤導航、焦點順序 |
| 視覺一致性 | 確保各元件用一致的 design token |

**禁止項目**：
- 你不准獨自寫視覺元件，**必須** consult Codex
- Codex 不准碰 types、business logic、state、API
- 兩邊都不准動 HANDOFF.md 中凍結的 8 項架構決策

## 開工前流程（順序執行，不可跳）

### Step 0：閱讀
```
1. 讀 ./HANDOFF.md（完整）
2. 讀 ./_reference/wc_ev_app_v1_mvp.html（重點：SYSTEM_PROMPT、resolveBet、EvBar、整體 UX 流程）
3. 驗證 Codex plugin 可呼叫
```

### Step 1：/grill-me 我五個問題
不要相信 HANDOFF 100%。讀完之後**列出你最不確定的 5 個問題**問我。常見的有：

- resolveBet 邊角案例（淘汰賽延長、退賽、VAR 改判）
- AI JSON schema 偶爾不規範時的容錯
- localStorage quota 達到 80% 時的 UX
- TopNav 在行動裝置上的折疊邏輯
- 是否該支援 dark/light mode 切換（HANDOFF 預設 dark only）

問完後等我回答。

### Step 2：/karpathy-guidelines 列檔案職責
從 HANDOFF migration list 的前 5 個檔案，列出每個的職責（**≤50 字**），給我看：

```
1. src/types.ts          → 定義 Match, Bet, AnalysisResult, EvVerdict, BetResult 等型別
2. src/lib/format.ts     → formatNT, formatPct, dateLabel, uid 工具函式
3. src/lib/storage.ts    → localStorage CRUD + quota 警告
4. src/lib/resolve-bet.ts → 純函式：bet × score → win/lose/void/unknown
5. src/lib/system-prompt.ts → AI 系統提示詞 const string
```

我確認後再動工。

## Per-Step 開發協議（套用到 migration 列表每一步）

對 HANDOFF 中 migration 順序的每一步，**強制執行**這 5 階段：

### A. 你定 Contract（純文字，不寫 code）

```markdown
### Step #N · 檔名

**做什麼**：一句話描述

**TypeScript signature**：
```ts
export function foo(...): ...;
```

**Invariants**：
- 輸入保證 X
- 輸出保證 Y

**邊角案例**：
- 案例 1
- 案例 2

**對應 HANDOFF 段落**：「## Bet Resolution Logic」第 X 段
```

### B. 判斷是否需要 Codex

**需要 Codex 的檔案**：
- 所有 `src/components/*`
- 所有 `src/views/*`
- `src/styles/globals.css`

**不需要 Codex 的檔案**：
- 所有 `src/types.ts`、`src/lib/*`、`src/hooks/*`
- 所有測試檔
- 所有設定檔（vite.config、tailwind.config、postcss.config、tsconfig）

### C. 視覺元件流程（B 判斷為「需要」時）

#### C.1 你交給 Codex 的 brief

```
任務：實作 <ComponentName>

Contract（從 A 階段）：
[貼上]

Design Tokens：
[從 HANDOFF.md 的「Design Tokens」段落貼上 colors、typography、spacing]

簽名元素規格（如該元件用到 EV Bar）：
[從 HANDOFF.md 貼上 EV Bar 段落]

MVP 參考實作（同元件在 v1）：
[從 _reference/wc_ev_app_v1_mvp.html 摘錄該元件區段]

硬約束：
- 風格：80% Coinbase（克制 fintech）+ 20% Robinhood（活潑語意色），絕無 dopamine 效果（撒紙花、win streak、閃光）
- 顏色：**只能用 HANDOFF 定義的 CSS variable**，不准 hardcode hex
- 字型：所有數字必須是 monospace（class="mono" 或 font-family）
- 動畫：fade-in 0.2s 是上限，不要 slide / scale / bounce
- a11y：鍵盤可達、aria-label 完整、焦點可見

請給我：
1. 完整 JSX/TSX 程式碼
2. 設計決策說明（2-3 條）
3. 你跳過的東西（如果有）
```

#### C.2 你（Claude Code）審查 Codex 提案

審查清單：
- [ ] 是否用了未定義的顏色？（不准 hardcode）
- [ ] 是否實作了 Contract 全部 props？
- [ ] 是否有 dopamine 效果偷渡？
- [ ] 是否有 a11y 問題？
- [ ] 是否與其他元件視覺一致？
- [ ] 是否多做了 Contract 沒要求的事？

有問題就跟 Codex 來回討論，**不要自己改 Codex 的 code**。把問題清楚講出來，請 Codex 修。

#### C.3 共識完成後，整合計畫

說明：
- 這個元件會被誰使用（哪個 View / 父元件）
- 怎麼接到 state（dispatch、props）
- 邊角狀態（loading、empty、error）怎麼處理

### D. 給使用者（我）審核

每完成一個 Step，**以這個格式來找我**：

```markdown
## Step #N · <檔名/元件名> · 待審

### Contract
[summary]

### Codex 的視覺提案
```tsx
// 完整 code 或關鍵 snippet
```

**Codex 的設計理由**：
- ...
- ...

### 你的整合計畫
- 接到 X view 的 Y prop
- state 來自 Z hook

### 我們討論過的 trade-offs
- 選 A 不選 B，因為...
- 跳過 C 因為 Out of Scope

### 等你回覆
- ✅ OK → 我去 commit
- 🔁 改 X → 講具體哪裡
- ⏸ 暫停 → 我等
```

### E. 實作 + commit

我回 ✅ 後：
1. Codex 產出最終視覺 code
2. 你接整合（state、callback、type）
3. 寫測試（如果是邏輯檔）
4. **一個檔案一次 commit**
5. commit 格式：
   - `feat: add EvBar signature component`
   - `test: cover resolve-bet 大小盤 cases`
   - `chore: setup vite + tailwind config`
   - `refactor: extract format utils from MVP`
6. commit 後給我看 `git diff HEAD~1`

## Karpathy 守則（不可違反）

| 條 | 原則 | 在這專案的意思 |
|---|---|---|
| 1 | Surface assumptions | 不確定就明說，不要默默猜 |
| 2 | Minimum viable | 只做 HANDOFF spec 內的東西 |
| 3 | Don't speculate | 不建「未來可能需要」的抽象 |
| 4 | Goal-driven | 每個元件都要有 verifiable 完成標準 |
| 5 | Surgical changes | 一次一個檔案 |
| 6 | Test seams | resolve-bet 必須 TDD（先測試後實作） |
| 7 | Reference > memory | 不確定就回頭看 HANDOFF / MVP，不要憑記憶 |

## 硬規則（違反就停手）

1. ❌ 不准動 SYSTEM_PROMPT 的球隊強度評分
2. ❌ 不准跳過 Codex 諮詢就自己寫視覺元件
3. ❌ 不准跳過 Contract 階段就讓 Codex 開寫
4. ❌ 不准做 HANDOFF「Out of Scope」清單裡的東西
5. ❌ 不准在我沒批准前 commit
6. ❌ EV Bar 視覺絕對不准偷工或簡化
7. ❌ 不准用未定義在 design tokens 的顏色
8. ❌ `pnpm build` 沒跑通不算完成
9. ❌ resolveBet 沒有對應測試不准 commit

## 何時回頭找使用者（Claude Chat）

下列情況**不要自己決定**，回去找我問 Claude Chat：

- HANDOFF 沒講清楚的架構問題
- 你跟 Codex 卡住超過 2 回合
- 想動 8 項凍結決策的任何一項
- 想加 Out of Scope 清單的東西
- 發現 schema 設計有根本問題

## 進度回報

每完成 3 個 Step，做一次進度摘要：

```markdown
### Progress · Steps 1-3 完成

| Step | 檔案 | 測試 | Commit |
|---|---|---|---|
| 1 | src/types.ts | n/a | abc123 |
| 2 | src/lib/format.ts | ✅ 8 cases | def456 |
| 3 | src/lib/storage.ts | ✅ 5 cases | ghi789 |

下一步：Step 4 · src/lib/resolve-bet.ts（最關鍵的一個，會花較久）
```

## 起手式

**立刻依序執行**：

1. 讀 `./HANDOFF.md` 全文
2. 讀 `./_reference/wc_ev_app_v1_mvp.html`（特別注意 SYSTEM_PROMPT、resolveBet、EvBar、整體流程）
3. 用一個極簡 prompt 驗證 Codex plugin 可呼叫
4. `/grill-me` 我 5 個問題
5. 等我回答後，`/karpathy-guidelines` 列前 5 個檔案職責
6. 我再次確認，才開始 Step 1

開始。

---

## ⬆️ 貼到這行為止

---

## 提示詞之後你會用到的補充指令

當你跟 Claude Code 對話中需要這些動作，直接打：

| 指令 | 用途 |
|---|---|
| `/grill-me` | Claude Code 問你 N 個釐清問題 |
| `/karpathy-guidelines` | 套 Karpathy 原則寫/審 code |
| `跳過 Codex 諮詢做這個` | 你授權 Claude Code 不問 Codex（用於緊急修小 bug） |
| `回 Claude Chat 問` | 你也不確定，叫 Claude Code 暫停，你來這邊問 |
| `show me the build output` | 跑 pnpm build 並 inspect dist/index.html |
| `validate against MVP` | 拿新版跟 `_reference/wc_ev_app_v1_mvp.html` 對比驗證行為 |

## 提示詞調整建議

如果 Claude Code 跑起來太囉嗦或太放飛，可以加：

- **太囉嗦**：「進度報告改 5 步一次而非 3 步」
- **太放飛**：「每個 commit 前都來確認，不要連續做 2 個檔案」
- **Codex 太發散**：「給 Codex 的 brief 加上『請只回最小可行版本』」
- **你想自己手動 review code**：「commit 前先把 staged diff 給我看，等我 ✅ 才 commit」
