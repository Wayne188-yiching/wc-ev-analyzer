# E2E Test Screenshots

Captured 2026-06-21 via Playwright MCP after Step 19 ship + GSAP integration + ResultEntryModal `currentTarget` fix.

| # | File | View / State |
|---|---|---|
| 01 | `01-dashboard-empty.png` | Dashboard · empty state, no API key |
| 02 | `02-dashboard-with-data.png` | Dashboard · 2 matches + 3 bets (today: 待開賽; yesterday: 已結算 +NT$315) |
| 03 | `03-analysis-modal-view.png` | AnalysisDetailModal · view mode (locked checkboxes, "已儲存" disabled) |
| 04 | `04-result-entry-empty.png` | ResultEntryModal · scores blank |
| 05 | `05-result-entry-filled.png` | ResultEntryModal · 德國 2 : 1 法國 → 預覽算出 負 -NT$200 / 負 -NT$100 / 本場 -NT$300 |
| 06 | `06-history.png` | HistoryView · grouped by `dateGroup` with per-day P/L |
| 07 | `07-stats.png` | StatsView · 4 KPI cards + sample warning + P/L curve + calibration chart |
| 08 | `08-settings.png` | SettingsModal · API Key form + data management |
| 09 | `09-mobile-dashboard.png` | Mobile 390×844 · KPI cards stack vertically (auto-fit grid works) |
| 10 | `10-mobile-analysis-modal.png` | Mobile 390×844 · EV table horizontal scrolls (minWidth 700, by design) |
