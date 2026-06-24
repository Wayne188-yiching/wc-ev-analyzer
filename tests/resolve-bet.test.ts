import { resolveBet } from '../src/lib/resolve-bet';
import type { Bet } from '../src/types';

const makeBet = (market: string, selection: string): Bet => ({
  id: 't',
  matchId: 'm',
  market,
  selection,
  odds: 2.0,
  impliedProb: 50,
  stakePct: 1,
  stakeNT: 100,
  aiEstimatedProb: { min: 50, max: 55 },
  aiVerdict: 'FAIR',
  aiEdge: 0,
  result: null,
  pnl: null,
  createdAt: '2026-06-19T00:00:00',
  resolvedAt: null,
});

const A = '德國';
const B = '法國';

describe('1X2 / 不讓分', () => {
  it('1. teamA wins 2-1, 主 → win', () => {
    expect(resolveBet(makeBet('不讓分', '主'), [2, 1], null, A, B)).toBe('win');
  });
  it('2. teamA wins 2-1, 客 → lose', () => {
    expect(resolveBet(makeBet('不讓分', '客'), [2, 1], null, A, B)).toBe('lose');
  });
  it('3. teamB wins 1-2, 客 → win', () => {
    expect(resolveBet(makeBet('不讓分', '客'), [1, 2], null, A, B)).toBe('win');
  });
  it('4. draw 1-1, 和 → win', () => {
    expect(resolveBet(makeBet('不讓分', '和'), [1, 1], null, A, B)).toBe('win');
  });
  it('5. lowercase 1x2 market + teamA name → win', () => {
    expect(resolveBet(makeBet('1x2', A), [2, 1], null, A, B)).toBe('win');
  });
  it('33. draw 0-0, 和 → win', () => {
    expect(resolveBet(makeBet('不讓分', '和'), [0, 0], null, A, B)).toBe('win');
  });
  it('34. teamA wins 2-1, sel=teamA name → win', () => {
    expect(resolveBet(makeBet('不讓分', A), [2, 1], null, A, B)).toBe('win');
  });
  it('35. draw 1-1, 主 → lose', () => {
    expect(resolveBet(makeBet('不讓分', '主'), [1, 1], null, A, B)).toBe('lose');
  });
});

describe('讓分', () => {
  it('6. 讓分 0:1 on 3-1, 主 → win (adjA=3 > adjB=0)', () => {
    expect(resolveBet(makeBet('讓分 0:1', '主'), [3, 1], null, A, B)).toBe('win');
  });
  it('7. 讓分 2:0 on 1-0, 主 → lose (adjA=-1 < adjB=0)', () => {
    expect(resolveBet(makeBet('讓分 2:0', '主'), [1, 0], null, A, B)).toBe('lose');
  });
  it('8. 讓分 2:0 on 2-0, 主 → void (adjA=adjB=0)', () => {
    expect(resolveBet(makeBet('讓分 2:0', '主'), [2, 0], null, A, B)).toBe('void');
  });
  it('9. 讓分 1:1 on 1-1, 和 → win (adjA=adjB=0)', () => {
    expect(resolveBet(makeBet('讓分 1:1', '和'), [1, 1], null, A, B)).toBe('win');
  });
  it('10. 讓分 0:1 on 0-2, 客 → win (adjB=1 > adjA=0)', () => {
    expect(resolveBet(makeBet('讓分 0:1', '客'), [0, 2], null, A, B)).toBe('win');
  });
  it('36. full-width colon 讓分 3：0 on 4-0, 主 → win', () => {
    expect(resolveBet(makeBet('讓分 3：0', '主'), [4, 0], null, A, B)).toBe('win');
  });
  it('37. 讓 (no 分) 2:0 on 3-0, 主 → win', () => {
    expect(resolveBet(makeBet('讓 2:0', '主'), [3, 0], null, A, B)).toBe('win');
  });
  it('38. 讓分 0:0 on 1-1, 和 → win (push as draw)', () => {
    expect(resolveBet(makeBet('讓分 0:0', '和'), [1, 1], null, A, B)).toBe('win');
  });
});

describe('大小 (full total)', () => {
  it('11. 大小 2.5 on 3-0, 大 → win', () => {
    expect(resolveBet(makeBet('大小 2.5', '大'), [3, 0], null, A, B)).toBe('win');
  });
  it('12. 大小 2.5 on 1-0, 小 → win', () => {
    expect(resolveBet(makeBet('大小 2.5', '小'), [1, 0], null, A, B)).toBe('win');
  });
  it('13. 大小 4.5 on 2-2, 大 → lose', () => {
    expect(resolveBet(makeBet('大小 4.5', '大'), [2, 2], null, A, B)).toBe('lose');
  });
  it('14. 總分 大小 3.5 on 2-2, 大 → win', () => {
    expect(resolveBet(makeBet('總分 大小 3.5', '大'), [2, 2], null, A, B)).toBe('win');
  });
  it('39. 大小 4 on 1-3 (integer line, exact-match = lose, no push)', () => {
    expect(resolveBet(makeBet('大小 4', '大'), [1, 3], null, A, B)).toBe('lose');
  });
  it('40. 大小 0.5 on 0-0, 小 → win', () => {
    expect(resolveBet(makeBet('大小 0.5', '小'), [0, 0], null, A, B)).toBe('win');
  });
  it('41. 大小 4.5 on 0-0, 小 → win', () => {
    expect(resolveBet(makeBet('大小 4.5', '小'), [0, 0], null, A, B)).toBe('win');
  });
});

describe('隊伍大小 (per-team total)', () => {
  it('15. 德國 大小 3.5 teamA scored 4, 大 → win', () => {
    expect(resolveBet(makeBet('德國 大小 3.5', '大'), [4, 0], null, A, B)).toBe('win');
  });
  it('16. 日本 大小 1.5 teamB scored 1, 小 → win', () => {
    expect(resolveBet(makeBet('日本 大小 1.5', '小'), [0, 1], null, A, '日本')).toBe('win');
  });
  it('17. 德國 大小 2.5 teamA scored 2, 大 → lose', () => {
    expect(resolveBet(makeBet('德國 大小 2.5', '大'), [2, 0], null, A, B)).toBe('lose');
  });
  it('42. 法國 大小 1.5 teamB scored 2, 大 → win', () => {
    expect(resolveBet(makeBet('法國 大小 1.5', '大'), [0, 2], null, A, B)).toBe('win');
  });
  it('43. substring collision: 中國 大小 2.5 with teamA=中國, teamB=中國香港 → teamA wins match (Q1=C documented)', () => {
    expect(resolveBet(makeBet('中國 大小 2.5', '大'), [3, 0], null, '中國', '中國香港')).toBe('win');
  });
});

describe('兩隊都進球 (BTTS)', () => {
  it('18. 2-1 BTTS, 是 → win', () => {
    expect(resolveBet(makeBet('兩隊都進球', '是'), [2, 1], null, A, B)).toBe('win');
  });
  it('19. 3-0 BTTS, 否 → win', () => {
    expect(resolveBet(makeBet('兩隊都進球', '否'), [3, 0], null, A, B)).toBe('win');
  });
  it('20. 2-1 BTTS, 否 → lose', () => {
    expect(resolveBet(makeBet('兩隊都進球', '否'), [2, 1], null, A, B)).toBe('lose');
  });
  it('44. 2-1 BTTS, lowercase yes → win', () => {
    expect(resolveBet(makeBet('兩隊都進球', 'yes'), [2, 1], null, A, B)).toBe('win');
  });
  it('45. 2-1 BTTS, 是的 (not exact 是) → unknown', () => {
    expect(resolveBet(makeBet('兩隊都進球', '是的'), [2, 1], null, A, B)).toBe('unknown');
  });
});

describe('半全場 (HT/FT)', () => {
  it('21. HT 1-0 FT 2-1, 德國/德國 → win', () => {
    expect(resolveBet(makeBet('半全場', '德國/德國'), [2, 1], [1, 0], A, B)).toBe('win');
  });
  it('22. HT 0-0 FT 1-1, 和/和 → win', () => {
    expect(resolveBet(makeBet('半全場', '和/和'), [1, 1], [0, 0], A, B)).toBe('win');
  });
  it('23. HT 1-0 FT 1-2, 德國/法國 → win', () => {
    expect(resolveBet(makeBet('半全場', '德國/法國'), [1, 2], [1, 0], A, B)).toBe('win');
  });
  it('46. HT 0-0 FT 2-2, 和/和 → win', () => {
    expect(resolveBet(makeBet('半全場', '和/和'), [2, 2], [0, 0], A, B)).toBe('win');
  });
});

describe('半場大小', () => {
  it('24. HT 1-1 大小 1.5, 大 → win (HT total 2 > 1.5)', () => {
    expect(resolveBet(makeBet('半場大小 1.5', '大'), [3, 3], [1, 1], A, B)).toBe('win');
  });
  it('25. HT 0-1 大小 1.5, 小 → win (HT total 1 < 1.5)', () => {
    expect(resolveBet(makeBet('半場大小 1.5', '小'), [1, 2], [0, 1], A, B)).toBe('win');
  });
  it('26. HT 2-0 大小 0.5, 大 → win', () => {
    expect(resolveBet(makeBet('半場大小 0.5', '大'), [3, 0], [2, 0], A, B)).toBe('win');
  });
});

describe('edge cases', () => {
  it('27. fullScore null → unknown', () => {
    expect(resolveBet(makeBet('不讓分', '主'), null, null, A, B)).toBe('unknown');
  });
  it('28. fullScore [NaN, 1] → unknown', () => {
    expect(resolveBet(makeBet('不讓分', '主'), [NaN, 1], null, A, B)).toBe('unknown');
  });
  it('29. unsupported market 角球數 → unknown', () => {
    expect(resolveBet(makeBet('角球數', '主'), [3, 1], null, A, B)).toBe('unknown');
  });
  it('30. selection with U+3000 full-width space trims correctly', () => {
    expect(resolveBet(makeBet('不讓分', '德國　'), [2, 1], null, A, B)).toBe('win');
  });
  it('31. 半全場 with halfScore=null → unknown', () => {
    expect(resolveBet(makeBet('半全場', '德國/德國'), [2, 1], null, A, B)).toBe('unknown');
  });
  it('32. 不讓分 draw 1-1 with 主 → lose', () => {
    expect(resolveBet(makeBet('不讓分', '主'), [1, 1], null, A, B)).toBe('lose');
  });
});

describe('robustness', () => {
  it('47. empty market → unknown', () => {
    expect(resolveBet(makeBet('', '主'), [1, 0], null, A, B)).toBe('unknown');
  });
});

describe('priority ordering', () => {
  it('48. 半場大小 1.5 uses HT total (0) not FT total (3) — HT 0-0 FT 3-0 大 → lose', () => {
    expect(resolveBet(makeBet('半場大小 1.5', '大'), [3, 0], [0, 0], A, B)).toBe('lose');
  });
});

describe('cross-language team matching (Chinese selection vs English match name)', () => {
  it('56. 讓分 2:0 · 哥倫比亞 selection, teams English, Colombia covers → win', () => {
    // Congo DR 0 : Colombia 1; home -2 → adjA=-2, adjB=1; away(哥倫比亞) covers
    expect(resolveBet(makeBet('讓分 2:0', '哥倫比亞 2:0'), [0, 1], null, 'Congo DR', 'Colombia')).toBe('win');
  });
  it('57. 不讓分 主 keyword still works with English teams', () => {
    expect(resolveBet(makeBet('不讓分', '主'), [2, 1], null, 'Congo DR', 'Colombia')).toBe('win');
  });
  it('58. 不讓分 Chinese team name vs English match name → win', () => {
    expect(resolveBet(makeBet('不讓分', '哥倫比亞'), [0, 2], null, 'Congo DR', 'Colombia')).toBe('win');
  });
  it('59. 隊伍大小 Chinese prefix vs English match name picks right team', () => {
    // Colombia scored 3, line 2.5 大 → win (only Colombia goals counted)
    expect(resolveBet(makeBet('哥倫比亞 大小 2.5', '大'), [0, 3], null, 'Congo DR', 'Colombia')).toBe('win');
  });
  it('60. unrelated Chinese team does not false-match → lose side', () => {
    // selection 法國 is neither Congo DR nor Colombia → no home/away match → unknown
    expect(resolveBet(makeBet('不讓分', '法國'), [2, 1], null, 'Congo DR', 'Colombia')).toBe('unknown');
  });
});

describe('正確比數 (exact score)', () => {
  it('49. 正確比數 sel 2:1 actual 2-1 → win', () => {
    expect(resolveBet(makeBet('正確比數', '2:1'), [2, 1], null, A, B)).toBe('win');
  });
  it('50. 正確比數 sel 2:1 actual 1-1 → lose', () => {
    expect(resolveBet(makeBet('正確比數', '2:1'), [1, 1], null, A, B)).toBe('lose');
  });
  it('51. 正確比數 full-width colon sel 0：0 actual 0-0 → win', () => {
    expect(resolveBet(makeBet('正確比數', '0：0'), [0, 0], null, A, B)).toBe('win');
  });
  it('52. 上半場正確比數 sel 0:2 halfScore 0-2 → win', () => {
    expect(resolveBet(makeBet('上半場正確比數', '0:2'), [1, 3], [0, 2], A, B)).toBe('win');
  });
  it('53. 上半場正確比數 sel 0:2 halfScore 0-0 → lose', () => {
    expect(resolveBet(makeBet('上半場正確比數', '0:2'), [0, 1], [0, 0], A, B)).toBe('lose');
  });
  it('54. 半場正確比數 with halfScore=null → unknown', () => {
    expect(resolveBet(makeBet('半場正確比數', '1:0'), [2, 1], null, A, B)).toBe('unknown');
  });
  it('55. 正確比數 其他 → unknown (cannot resolve without full option list)', () => {
    expect(resolveBet(makeBet('正確比數', '其他'), [4, 3], null, A, B)).toBe('unknown');
  });
});
