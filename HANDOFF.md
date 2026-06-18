# WC EV Analyzer — Handoff for Claude Code

> 從 Claude Chat 的 MVP 單檔 HTML 過渡到正式 Vite 專案的交接文件。
> **先讀這份，再讀 `_reference/wc_ev_app_v1_mvp.html`。**

---

## TL;DR

- **產品**：個人運彩 EV 分析工具（2026 世界盃為起點，可延伸到其他賽事）
- **目前狀態**：MVP 單檔 HTML 已建好，端到端流程跑通
- **下一步**：拆成 Vite + React + TS + Tailwind 專案，產出單一可分享 HTML
- **規格已凍結**：8 項架構決策跑完 grill-me，不要再翻案
- **施工原則**：套 `/karpathy-guidelines`，迭代式交付，不要一次寫完整個專案

---

## 開發前必做

**用 `/grill-me` 跟使用者確認 spec 理解**。不要相信這份文件 100%，提 5 個你不確定的問題再動工。常見要釐清的：

1. resolveBet 的邊角案例（淘汰賽延長/點球、退賽、VAR 改判）
2. JSON schema 跟 MVP 的差異點（如果有）
3. 設計 token 的 hover/focus 狀態
4. localStorage 的 quota 處理（10MB 警告）
5. 多裝置同步是否真的不做

確認後再進實作。

---

## 8 項架構決策（凍結，不再翻案）

| # | 決策點 | 結論 | 為什麼 |
|---|---|---|---|
| 1 | 工具範圍 | 每日工作流 + 紀錄追蹤 | 單場分析無法驗證系統有沒有 edge |
| 2 | 儲存 | localStorage + JSON 匯出匯入 | 100 場規模 JSON 完全夠用，不引入外部依賴 |
| 3 | 入口畫面 | 每日 Dashboard（不預載 fixtures） | 顯示「你的紀錄」而非「賽事日曆」 |
| 4 | Bet schema 深度 | 含 AI estimated probability | 為了 calibration 分析（系統有 edge 嗎？） |
| 5 | 下注錄入 UX | 全表格 checkbox + 可編輯 stake | 允許押 FAIR/AVOID（人有直覺），但保持 AI estimate 對齊 |
| 6 | 結果錄入 | 填比分，自動判定 | 一場 4-6 字搞定，比逐 bet 標 win/lose 快 |
| 7 | Stats | KPI + P/L 曲線 + Calibration | 玩法分析 / Edge bucket 等樣本 30+ 再做 |
| 8 | UI 風格 | 80% Coinbase + 20% Robinhood，桌面優先響應式 | 紀律工具，不要 dopamine engine |

---

## Tech Stack（目標）

```
- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS 3（PostCSS，非 CDN）
- vite-plugin-singlefile（產出單一可分享 HTML）
- vitest（單元測試，重點測 resolveBet）
- Inter + JetBrains Mono（@fontsource 套件，本地載入）
```

**為什麼選 vite-plugin-singlefile**：使用者要求「可分享、可離線」。Vite build 後產出單一 `dist/index.html`，內含所有 JS/CSS/字型，雙擊就跑，可丟給朋友、放 GitHub Pages、Cloudflare Pages。

---

## 目標目錄結構

```
wc-ev-analyzer/
├── HANDOFF.md
├── README.md
├── _reference/
│   └── wc_ev_app_v1_mvp.html   ← 目前的 MVP 參考實作
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types.ts                ← Match, Bet, AnalysisResult, EvVerdict 等
│   ├── lib/
│   │   ├── storage.ts          ← localStorage 包裝
│   │   ├── api.ts              ← Anthropic API client
│   │   ├── resolve-bet.ts      ← 純函式，重點單元測
│   │   ├── format.ts           ← formatNT, formatPct, dateLabel
│   │   └── system-prompt.ts    ← AI system prompt（const string）
│   ├── components/
│   │   ├── EvBar.tsx           ← ★ 簽名元素
│   │   ├── StrengthBar.tsx
│   │   ├── KpiCard.tsx
│   │   ├── Card.tsx
│   │   ├── Button.tsx
│   │   ├── Tag.tsx
│   │   └── Modal.tsx
│   ├── views/
│   │   ├── TopNav.tsx
│   │   ├── DashboardView.tsx
│   │   ├── HistoryView.tsx
│   │   ├── StatsView.tsx
│   │   ├── AnalysisDetailModal.tsx
│   │   ├── ResultEntryModal.tsx
│   │   └── SettingsModal.tsx
│   ├── hooks/
│   │   └── useAppState.ts      ← reducer + persistence
│   └── styles/
│       └── globals.css         ← Tailwind + CSS variables
├── tests/
│   ├── resolve-bet.test.ts     ← ★ 各種玩法 + edge case
│   └── format.test.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
└── vitest.config.ts
```

---

## 資料 Schema（TypeScript）

```typescript
// src/types.ts

export type EvVerdict = 'VALUE' | 'FAIR' | 'AVOID';
export type BetResult = 'win' | 'lose' | 'void' | null;

export interface ProbRange {
  min: number;  // 0-100
  max: number;  // 0-100
}

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  datetime: string;          // 比賽時間
  stage: string;             // 例：'小組賽 第1輪 Group E'
  venue: string | null;
  teamRatings: {
    teamA: number;           // 0-100
    teamB: number;
    gap: number;
    favorite: string;
  };
  aiSummary: string;
  aiResult: AnalysisResult;  // 完整 AI 分析快照
  dateGroup: string;         // YYYY-MM-DD（用於分組）
  createdAt: string;         // ISO timestamp
  fullScore: [number, number] | null;
  halfScore: [number, number] | null;
  isVoid: boolean;
  resultEnteredAt: string | null;
}

export interface Bet {
  id: string;
  matchId: string;
  market: string;            // 例：'大小 4.5'
  selection: string;         // 例：'大'
  odds: number;
  impliedProb: number;       // 0-100
  stakePct: number;          // 1-5
  stakeNT: number;           // 計算時的本金 × pct
  aiEstimatedProb: ProbRange;
  aiVerdict: EvVerdict;
  aiEdge: number;            // 正/負百分點
  result: BetResult;
  pnl: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AnalysisResult {
  match: {
    teamA: string;
    teamB: string;
    datetime: string;
    stage: string;
    venue: string;
  };
  teamRatings: {
    teamA: number;
    teamB: number;
    gap: number;
    favorite: string;
  };
  marketVig: Array<{ market: string; vig: string }>;
  analysis: Array<{
    market: string;
    selection: string;
    odds: number;
    impliedProb: number;
    estimatedProb: ProbRange;
    edge: number;
    verdict: EvVerdict;
    reasoning: string;
  }>;
  recommendations: Array<{
    bet: string;
    market: string;
    selection: string;
    odds: number;
    stakePct: number;
    expectedEdge: string;
    estimatedProb: ProbRange;
    edge: number;
    reasoning: string;
  }>;
  totalExposurePct: number;
  avoid: Array<{ bet: string; reason: string }>;
  preMatchChecks: string[];
  summary: string;
}

export interface AppState {
  apiKey: string;
  bankroll: number;
  matches: Match[];
  bets: Bet[];
  lastExport: string | null;
}
```

---

## Design Tokens

### 顏色

```css
:root {
  /* 背景 */
  --bg-base: #0b0c10;
  --bg-surface: #15171c;
  --bg-elevated: #1c1f27;
  
  /* 邊框 */
  --border-default: #26292f;
  --border-focus: #3f444f;
  
  /* 文字 */
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
  --text-tertiary: #6b7280;
  --text-numeric: #ffffff;
  
  /* 語意（刻意避開 Robinhood 螢光） */
  --positive: #34d399;       /* mint - VALUE / 勝 */
  --positive-soft: rgba(52, 211, 153, 0.12);
  --fair: #fbbf24;           /* amber - FAIR */
  --fair-soft: rgba(251, 191, 36, 0.12);
  --negative: #fb7185;       /* warm rose - AVOID / 負 */
  --negative-soft: rgba(251, 113, 133, 0.12);
  --brand: #5eead4;          /* teal - 識別色 */
  --brand-soft: rgba(94, 234, 212, 0.10);
}
```

### 排版

- **Display**：Inter 600（hero、KPI 大數字、頁面標題）
- **Body**：Inter 400-500（正文）
- **Mono**：JetBrains Mono 500（**所有**賠率、金額、機率、日期）
  - 設 `font-feature-settings: 'tnum' 1, 'zero' 1;` 對齊數字
  - 字間距 `letter-spacing: -0.01em;`

### 尺寸

- 卡片 padding：20px 桌面、16px 行動
- 卡片圓角：12px
- 按鈕圓角：8px
- 標籤圓角：9999px
- 容器最大寬：1280px
- Section spacing：24-32px

### 動畫（克制）

- 卡片 hover：opacity 0.85（不要 lift / scale）
- 模態彈出：fade-in 0.2s（不要 slide）
- 數字變化：無動畫（避免閃爍）
- **絕對禁止**：撒紙花、win streak 徽章、超過 +$XXX 的閃光特效

---

## 簽名元素：EV Bar

這個 app 視覺識別的核心。每筆 bet 都顯示一個視覺化的 EV 條：

```
0% ────────────●═══════│════════════ 100%
                       ↑
              隱含機率 53%（白色垂直線）
        ═══ AI 估計 58-62%（綠色實心段 = VALUE）
```

實作：

```tsx
// src/components/EvBar.tsx
interface Props {
  impliedProb: number;     // 0-100
  estimatedProb: ProbRange;
  verdict: EvVerdict;
  compact?: boolean;       // 在小卡片用 compact = true（高度 5px）
}

export function EvBar({ impliedProb, estimatedProb, verdict, compact }: Props) {
  const color = {
    VALUE: 'var(--positive)',
    FAIR: 'var(--fair)',
    AVOID: 'var(--negative)',
  }[verdict];
  const h = compact ? 5 : 8;
  
  return (
    <div 
      className="relative w-full" 
      style={{ height: h, background: 'var(--bg-elevated)', borderRadius: h / 2 }}
    >
      {/* AI 估計範圍（有色實心段） */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: `${estimatedProb.min}%`,
          width: `${Math.max(estimatedProb.max - estimatedProb.min, 0.5)}%`,
          background: color,
          borderRadius: h / 2,
          opacity: 0.95,
        }}
      />
      {/* 隱含機率 tick（白色垂直線） */}
      <div
        className="absolute"
        style={{
          left: `${impliedProb}%`,
          top: -2,
          bottom: -2,
          width: 2,
          background: 'var(--text-primary)',
          marginLeft: -1,
        }}
      />
    </div>
  );
}
```

**為什麼這是核心**：把 `EV = 真實機率 > 隱含機率` 變成空間關係。使用者掃描表格 0.5 秒就知道哪些 bet 值得下，不用心算百分比。

---

## AI System Prompt

複製到 `src/lib/system-prompt.ts`，做成 const string export。**不要修改球隊強度評分**，這些是有意校準過的，動了就要重新跑 calibration 驗證。

```typescript
export const SYSTEM_PROMPT = `你是 2026 FIFA 世界盃台灣運彩專業分析師，使用價值投注 (Value Betting) 方法論。

# 核心數學
- 隱含機率 = (1 / 賠率) × 100%
- 同盤抽水率 = 該玩法所有選項的隱含機率總和 - 100%
- 期望值 EV = (真實機率 × 賠率) - 1
- Value Bet 條件：edge ≥ +3%（其中 edge = 真實機率下界 - 隱含機率）

# 紀律規則（絕對不違反）
1. 單注 1-3%，最高 5%（僅限 edge ≥ +8% 的超強 value）
2. 單場最大總曝險：8%
3. 嚴禁推薦串關/過關
4. 嚴禁推薦正確比數（抽水 30%+）
5. 賠率 < 1.30 強烈警告
6. 「半全場」中強隊/強隊 < 1.20 列為 AVOID
7. 必須提醒賽前 1 小時確認首發名單

# 2026 世界盃球隊強度評分（100 = 世界頂級）
頂級 (90-98)：西班牙 96、法國 94、阿根廷 93、英格蘭 92、巴西 91
強權 (84-89)：德國 88、葡萄牙 87、荷蘭 86、義大利 85
次強 (78-83)：比利時 82、烏拉圭 81、克羅埃西亞 80、摩洛哥 79、墨西哥 78
中游 (72-77)：美國 76、瑞士 75、塞內加爾 74、丹麥 73、日本 73、南韓 72、哥倫比亞 72
中下 (65-71)：厄瓜多 71、奈及利亞 70、伊朗 69、加拿大 69、波蘭 68、突尼西亞 67、捷克 67、土耳其 67、澳洲 66、奧地利 66、塞爾維亞 65、蘇格蘭 65
弱旅 (58-64)：沙烏地 63、卡達 62、南非 61、巴拿馬 60、巴拉圭 60、烏茲別克 59、紐西蘭 58
小國 (45-57)：佛得角 55、海地 52、玻利維亞 51、剛果 51、約旦 50、古拉索 48

# 真實機率估計指引
- 差距 30+：強隊勝 80-92%、平 6-12%、弱隊勝 2-8%；大 3.5 機率 60-72%
- 差距 20-29：強隊勝 65-78%、平 13-20%、弱隊勝 5-15%
- 差距 10-19：強隊勝 48-60%、平 22-28%、弱隊勝 15-25%
- 差距 5-9：強隊勝 38-48%、平 26-32%、弱隊勝 22-30%
- 差距 <5：三方接近，平局可達 28-35%

# 結構性修正
- 小組賽第一輪：球隊謹慎，平局率 +5%
- 小組賽第三輪：已晉級可能輪換，弱隊勝率 +8-12%
- 美國夏季高溫主辦城市通常壓低進球數

# 輸出格式（必須是純 JSON，不可包 markdown）
{
  "match": { "teamA": "...", "teamB": "...", "datetime": "...", "stage": "...", "venue": "..." },
  "teamRatings": { "teamA": 數字, "teamB": 數字, "gap": 差距, "favorite": "..." },
  "marketVig": [{ "market": "...", "vig": "X.X%" }],
  "analysis": [
    {
      "market": "玩法",
      "selection": "選項",
      "odds": 1.88,
      "impliedProb": 53.2,
      "estimatedProb": { "min": 58, "max": 62 },
      "edge": 4.8,
      "verdict": "VALUE | FAIR | AVOID",
      "reasoning": "1-2 句"
    }
  ],
  "recommendations": [
    { "bet": "...", "market": "...", "selection": "...", "odds": X, "stakePct": X, "expectedEdge": "+X.X%", "estimatedProb": { "min": X, "max": X }, "edge": X, "reasoning": "..." }
  ],
  "totalExposurePct": X,
  "avoid": [{ "bet": "...", "reason": "..." }],
  "preMatchChecks": ["..."],
  "summary": "2-3 句"
}

若無法判讀，回 { "error": "原因" }`;
```

API 呼叫端關鍵 header：

```typescript
fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',  // ★ 必要
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  }),
});
```

---

## Bet Resolution Logic

`src/lib/resolve-bet.ts`，**這是純函式，必須單元測試**。

### Signature

```typescript
export function resolveBet(
  bet: Bet,
  fullScore: [number, number],
  halfScore: [number, number] | null,
  teamA: string,
  teamB: string
): 'win' | 'lose' | 'void' | 'unknown'
```

### 支援的玩法

| 玩法 | Market 範例 | Selection 範例 | 判定邏輯 |
|---|---|---|---|
| 不讓分 (1X2) | `'不讓分'` | `'主'` / `'客'` / `'和'` / 隊名 | 直接比 a vs b |
| 讓分 | `'讓分 3:0'` | `'主'` / `'客'` / `'和'` / 隊名 | 比分加減讓子後比，相等為 void |
| 大小（全場） | `'大小 4.5'` 或 `'總分 大小 4.5'` | `'大'` / `'小'` | total vs line |
| 隊伍大小 | `'德國 大小 3.5'` | `'大'` / `'小'` | 該隊進球 vs line |
| 兩隊都進球 | `'兩隊都進球'` | `'是'` / `'否'` | a>0 && b>0 |
| 半全場 | `'半全場'` | `'德國/德國'` | 需 halfScore，半場勝者+全場勝者組合 |
| 半場大小 | `'半場大小 1.5'` | `'大'` / `'小'` | 半場 total vs line |

### Edge cases（必須測試）

- 讓分剛好打平 → `'void'`
- halfScore 為 null 但 market 是半全場 → `'unknown'`
- selection 用全形空白或多餘字元 → trim 處理
- selection 用隊名而非「主/客」 → 比對 teamA/teamB
- 不支援的 market → `'unknown'`（不要崩潰）
- fullScore 含 NaN → `'unknown'`

### 不支援（暫定）

- 淘汰賽延長 / 點球（運彩盤口時段不同，需 user 自行注意）
- VAR 改判（user 用「修正比分」重判）
- 角球 / 黃牌 / 罰球數等次要玩法

---

## P/L 計算

```typescript
function computePnL(stake: number, odds: number, result: BetResult): number | null {
  if (result === 'win') return stake * (odds - 1);
  if (result === 'lose') return -stake;
  if (result === 'void') return 0;
  return null;
}
```

---

## Setup Commands

```bash
# 建立專案
pnpm create vite wc-ev-analyzer --template react-ts
cd wc-ev-analyzer

# 安裝依賴
pnpm add -D vite-plugin-singlefile vitest @vitest/ui
pnpm add -D tailwindcss postcss autoprefixer
pnpm add -D @fontsource/inter @fontsource/jetbrains-mono

# Tailwind init
pnpm dlx tailwindcss init -p

# 把 _reference/ 建好
mkdir _reference
# 把目前的 wc_ev_app.html 複製進去，重新命名 wc_ev_app_v1_mvp.html
```

`vite.config.ts` 關鍵設定：

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
```

---

## Migration 順序（迭代式，不要一次寫完）

每完成一步，先 commit + 給使用者看 diff，確認後再下一步。

1. **`src/types.ts`** — 把上面的 types 全部建好
2. **`src/lib/format.ts`** + `tests/format.test.ts` — formatNT, formatPct, dateLabel, uid
3. **`src/lib/storage.ts`** — localStorage 包裝、quota 警告
4. **`src/lib/resolve-bet.ts`** + `tests/resolve-bet.test.ts` — **重點**，每個玩法至少 3 個案例
5. **`src/lib/system-prompt.ts`** — 從 MVP 複製過來
6. **`src/lib/api.ts`** — Anthropic 呼叫，含 error handling
7. **`src/styles/globals.css`** — Tailwind base + CSS variables
8. **`src/components/*`** — EvBar 先做（簽名元素），再做 Card / Button / KpiCard / Tag / Modal
9. **`src/hooks/useAppState.ts`** — reducer + persistence
10. **`src/views/TopNav.tsx`** + `App.tsx` 骨架
11. **`src/views/DashboardView.tsx`** — 把 MVP 的 Dashboard 邏輯遷過來
12. **`src/views/AnalysisDetailModal.tsx`** — 最複雜的一個
13. **`src/views/ResultEntryModal.tsx`**
14. **`src/views/StatsView.tsx`** + PnlChart / CalibrationChart
15. **`src/views/HistoryView.tsx`**
16. **`src/views/SettingsModal.tsx`** + 匯入匯出
17. **完整功能測試** vs MVP（每個 checkpoint 跑一遍）
18. **`pnpm build`** 確認單檔 HTML 產出
19. **打開 dist/index.html 確認跑得起來**

---

## Out of Scope（這次不做）

- 玩法分類分析（Q7 中的 D 選項）
- Edge bucket 分析（Q7 中的 E 選項）
- 自動抓取比賽結果 API（Q6 中的 D 選項）
- Notion / ClickUp 同步（Q2 中的 C/D 選項）
- 賽程預載 fixtures（Q3 中的 B 選項）
- Telegram / Hermes Bot 串接
- 多裝置同步
- 賭博成癮自動檢測（只放 footer 撥打電話資訊）

**為什麼明確列出**：避免 Claude Code 看到漂亮的架構就想多做。**Karpathy 第 2 條：minimum viable**。

---

## 與 MVP 的差異（要實作的）

MVP 已有：所有核心功能 ✓
要新增：
- TypeScript types（取代 JS）
- 單元測試（特別是 resolveBet）
- Tailwind PostCSS（取代 CDN）
- 本地字型（取代 Google Fonts CDN）
- localStorage quota 警告（>80% 時提示匯出）
- vite-plugin-singlefile build pipeline

要改善：
- `resolveBet` 的 `selection` 解析（MVP 用一堆 includes，TS 版要明確的解析器 + types）
- BetMiniRow 的 PnL 顯示格式（MVP 有 `+NT$-300` 的怪格式）
- AnalysisDetailModal 的 view mode（檢視已存的分析時，stake 改不了的處理）

---

## 給 Claude Code 的開場白建議

直接複製貼上：

```
讀 ./HANDOFF.md 跟 ./_reference/wc_ev_app_v1_mvp.html

讀完後：

1. 用 /grill-me 問我 5 個關於 spec 你不確定的問題
2. 用 /karpathy-guidelines 列出 migration 順序中前 5 個檔案的 50 字以內職責
3. 我確認後，從 src/types.ts 開始
4. 每完成一個檔案 commit + 給我看 diff
5. 不要一次寫多個檔案
6. resolveBet 必須先寫測試再寫實作（TDD）

特別注意：
- 不要動 SYSTEM_PROMPT 的球隊評分數字
- 不要做 Out of Scope 清單裡的東西
- EV Bar 是簽名元素，視覺別偷工
```

---

## 聯絡訊號

如果碰到模糊地帶（spec 沒講清楚的），記下來，回到 Claude Chat 問我。**不要自己猜**。

驗證時的 bug 回報請貼：

```
場景：哪個 view
操作：做了什麼
預期：應該怎樣
實際：實際怎樣
重現步驟：1, 2, 3
附件：screenshot / 從 Settings 匯出的 JSON
```
