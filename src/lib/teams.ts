/**
 * World Cup 2026 team name aliases (Traditional Chinese ↔ English ↔ variants).
 *
 * Resolves the cross-language matching gap: the AI may store match.teamA/teamB
 * in English (e.g. "Colombia") while a bet's selection keeps the Chinese name
 * from the 台灣運彩 screenshot (e.g. "哥倫比亞 2:0"). Plain substring matching
 * then fails. sameTeam() normalises both sides and checks shared alias groups.
 */
const TEAM_ALIASES: string[][] = [
  ['西班牙', 'spain'],
  ['法國', 'france'],
  ['阿根廷', 'argentina'],
  ['英格蘭', 'england'],
  ['巴西', 'brazil'],
  ['德國', 'germany'],
  ['葡萄牙', 'portugal'],
  ['荷蘭', 'netherlands', 'holland'],
  ['義大利', '意大利', 'italy'],
  ['比利時', 'belgium'],
  ['烏拉圭', 'uruguay'],
  ['克羅埃西亞', '克羅地亞', 'croatia'],
  ['摩洛哥', 'morocco'],
  ['墨西哥', 'mexico'],
  ['美國', 'usa', 'unitedstates'],
  ['瑞士', 'switzerland'],
  ['塞內加爾', 'senegal'],
  ['丹麥', 'denmark'],
  ['日本', 'japan'],
  ['南韓', '韓國', 'southkorea', 'korearepublic'],
  ['哥倫比亞', '哥伦比亚', 'colombia'],
  ['厄瓜多', '厄瓜多爾', 'ecuador'],
  ['奈及利亞', '尼日利亞', 'nigeria'],
  ['伊朗', 'iran'],
  ['加拿大', 'canada'],
  ['波蘭', 'poland'],
  ['突尼西亞', '突尼斯', 'tunisia'],
  ['捷克', 'czech', 'czechia'],
  ['土耳其', 'turkey', 'türkiye', 'turkiye'],
  ['澳洲', '澳大利亞', 'australia'],
  ['奧地利', 'austria'],
  ['塞爾維亞', '塞尔维亚', 'serbia'],
  ['蘇格蘭', 'scotland'],
  ['沙烏地', '沙特', '沙烏地阿拉伯', 'saudiarabia', 'saudi'],
  ['卡達', '卡塔爾', 'qatar'],
  ['南非', 'southafrica'],
  ['巴拿馬', 'panama'],
  ['巴拉圭', 'paraguay'],
  ['烏茲別克', 'uzbekistan'],
  ['紐西蘭', '新西蘭', 'newzealand'],
  ['佛得角', '維德角', 'capeverde'],
  ['海地', 'haiti'],
  ['玻利維亞', 'bolivia'],
  ['剛果', '剛果民主共和國', 'congo', 'congodr', 'drcongo'],
  ['約旦', 'jordan'],
  ['古拉索', 'curacao', 'curaçao'],
];

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '').trim();
}

/**
 * True if two team-name strings refer to the same team. Order-independent.
 * Falls back to substring matching when no alias group is shared, preserving
 * the original simple behaviour for names not in the table.
 */
export function sameTeam(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  for (const group of TEAM_ALIASES) {
    const inA = group.some((alias) => na.includes(norm(alias)));
    const inB = group.some((alias) => nb.includes(norm(alias)));
    if (inA && inB) return true;
  }
  return false;
}
