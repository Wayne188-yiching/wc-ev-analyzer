import { z } from 'zod';
import type { AnalysisResult, EvVerdict, ParlayAnalysisResult, ProbRange } from '../types';
import { SYSTEM_PROMPT, PARLAY_SYSTEM_PROMPT } from './system-prompt';

export interface AnalyzeImage {
  type: string;
  data: string;
}

const ProbRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
});

const VerdictSchema = z.enum(['VALUE', 'FAIR', 'AVOID']);

const AnalysisRowSchema = z.object({
  market: z.string(),
  selection: z.string(),
  odds: z.number(),
  impliedProb: z.number(),
  estimatedProb: ProbRangeSchema,
  edge: z.number(),
  verdict: VerdictSchema,
  reasoning: z.string(),
});

const RecommendationSchema = z.object({
  bet: z.string(),
  market: z.string(),
  selection: z.string(),
  odds: z.number(),
  stakePct: z.number(),
  expectedEdge: z.string(),
  estimatedProb: ProbRangeSchema,
  edge: z.number(),
  reasoning: z.string(),
});

const AnalysisResultSchema = z.object({
  match: z.object({
    teamA: z.string(),
    teamB: z.string(),
    datetime: z.string(),
    stage: z.string(),
    venue: z.string(),
  }),
  teamRatings: z.object({
    teamA: z.number(),
    teamB: z.number(),
    gap: z.number(),
    favorite: z.string(),
  }),
  marketVig: z.array(z.object({ market: z.string(), vig: z.string() })),
  analysis: z.array(AnalysisRowSchema),
  recommendations: z.array(RecommendationSchema),
  totalExposurePct: z.number(),
  marketCount: z.number(),
  avoid: z.array(z.object({ bet: z.string(), reason: z.string() })),
  preMatchChecks: z.array(z.string()),
  summary: z.string(),
});

const ParlayLegOutputSchema = z.object({
  market: z.string(),
  selection: z.string(),
  odds: z.number(),
  impliedProb: z.number(),
  estimatedProb: ProbRangeSchema,
  edge: z.number(),
  verdict: VerdictSchema,
});

const ParlayCorrelationSchema = z.object({
  legs: z.tuple([z.number(), z.number()]),
  type: z.enum(['positive', 'negative', 'none']),
  magnitude: z.enum(['strong', 'moderate', 'weak']),
  reason: z.string(),
});

const ParlayAnalysisResultSchema = z.object({
  legs: z.array(ParlayLegOutputSchema),
  combined: z.object({
    odds: z.number(),
    impliedProb: z.number(),
    estimatedProb: ProbRangeSchema,
    edge: z.number(),
    vigPct: z.number(),
  }),
  correlations: z.array(ParlayCorrelationSchema),
  verdict: VerdictSchema,
  warnings: z.array(z.string()),
  summary: z.string(),
});

type _ParlaySchemaMatches =
  z.infer<typeof ParlayAnalysisResultSchema> extends ParlayAnalysisResult
    ? ParlayAnalysisResult extends z.infer<typeof ParlayAnalysisResultSchema>
      ? true
      : false
    : false;
const _parlay_drift_check: _ParlaySchemaMatches = true;
void _parlay_drift_check;

const AiErrorSchema = z.object({ error: z.string() });

// Compile-time drift check: AnalysisResultSchema must be bidirectionally
// equivalent to AnalysisResult. tsc errors here if either side adds/removes/renames fields.
type _SchemaMatchesType =
  z.infer<typeof AnalysisResultSchema> extends AnalysisResult
    ? AnalysisResult extends z.infer<typeof AnalysisResultSchema>
      ? true
      : false
    : false;
const _drift_check: _SchemaMatchesType = true;
void _drift_check;

export async function analyzeMatch(
  apiKey: string,
  images: AnalyzeImage[],
  contextText: string,
  expectedMarketCount?: number,
): Promise<AnalysisResult> {
  if (!apiKey) throw new Error('請先在 Settings 設定 API Key');
  if (images.length === 0) throw new Error('沒有可分析的圖片');

  const content: unknown[] = images.map((img) => ({
    type: 'image',
    source: { type: 'base64', media_type: img.type, data: img.data },
  }));
  const countHint =
    expectedMarketCount && expectedMarketCount > 0
      ? `\n\n使用者指出這張截圖共有約 ${expectedMarketCount} 個玩法，請務必全部列出，不可省略。`
      : '';
  content.push({
    type: 'text',
    text: `請分析以上台灣運彩賠率截圖（${images.length} 張）。${
      contextText ? '\n\n額外情報：' + contextText : ''
    }${countHint}\n\n依系統指示回傳純 JSON，analysis 陣列必須涵蓋截圖中每一個玩法的每一個選項。`,
  });

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 16384,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });
  } catch {
    throw new Error('網路錯誤或 CORS 被擋，請確認連線');
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error('API Key 無效，請至 Settings 重新設定');
    if (response.status === 429) throw new Error('API 額度用完或限流，請至 console.anthropic.com 查看');
    if (response.status === 529) throw new Error('Anthropic 伺服器忙碌中（過載），請稍等 10-30 秒後再按一次分析');
    if (response.status >= 500) throw new Error(`Anthropic 伺服器錯誤（${response.status}），稍後重試`);
    let msg = `API ${response.status}`;
    try {
      const j = (await response.json()) as { error?: { message?: string } };
      if (j?.error?.message) msg += ': ' + j.error.message;
    } catch {
      // non-JSON body; status code is enough
    }
    throw new Error(msg);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
    stop_reason?: string;
  };
  const text = data.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('\n');

  let cleaned = text.replace(/```json|```/g, '').trim();
  const fi = cleaned.indexOf('{');
  const li = cleaned.lastIndexOf('}');
  if (fi >= 0 && li > fi) cleaned = cleaned.substring(fi, li + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    if (data.stop_reason === 'max_tokens') {
      throw new Error('玩法太多導致 AI 回應被截斷。請減少截圖張數（建議一次 1-2 張）或分批分析。');
    }
    throw new Error('AI 回應無法解析為 JSON，請重新分析（若連續失敗，可能 Anthropic 服務不穩，稍後再試）');
  }

  const aiErr = AiErrorSchema.safeParse(parsed);
  if (aiErr.success) {
    throw new Error(`AI 拒絕分析：${aiErr.data.error}`);
  }

  const result = AnalysisResultSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.map(String).join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`AI 回應格式不符：${issues}`);
  }
  return result.data;
}

export interface ParlayLegInput {
  matchTeamA: string;
  matchTeamB: string;
  market: string;
  selection: string;
  odds: number;
  impliedProb: number;
  aiEstimatedProb: ProbRange;
  aiVerdict: EvVerdict;
  aiEdge: number;
}

export async function analyzeParlay(
  apiKey: string,
  legs: ParlayLegInput[],
): Promise<ParlayAnalysisResult> {
  if (!apiKey) throw new Error('請先在 Settings 設定 API Key');
  if (legs.length < 2) throw new Error('串關至少需要 2 個 legs');

  const userText = `分析以下串關，共 ${legs.length} legs：

${legs
  .map(
    (l, i) => `Leg ${i + 1}: ${l.matchTeamA} vs ${l.matchTeamB}
- 玩法: ${l.market} · ${l.selection}
- 賠率: ${l.odds.toFixed(2)}
- 隱含勝率: ${l.impliedProb.toFixed(1)}%
- AI 估計勝率: ${l.aiEstimatedProb.min}-${l.aiEstimatedProb.max}%
- 單關 verdict: ${l.aiVerdict} (edge ${l.aiEdge.toFixed(1)}%)`,
  )
  .join('\n\n')}

請依系統指示分析這個串關組合，回純 JSON。`;

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        temperature: 0.3,
        system: PARLAY_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userText }],
      }),
    });
  } catch {
    throw new Error('網路錯誤或 CORS 被擋，請確認連線');
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error('API Key 無效，請至 Settings 重新設定');
    if (response.status === 429) throw new Error('API 額度用完或限流');
    if (response.status === 529) throw new Error('Anthropic 伺服器忙碌中（過載），請稍等 10-30 秒後再試');
    if (response.status >= 500) throw new Error(`Anthropic 伺服器錯誤（${response.status}），稍後重試`);
    let msg = `API ${response.status}`;
    try {
      const j = (await response.json()) as { error?: { message?: string } };
      if (j?.error?.message) msg += ': ' + j.error.message;
    } catch { /* non-JSON body */ }
    throw new Error(msg);
  }

  const data = (await response.json()) as { content: Array<{ type: string; text?: string }> };
  const text = data.content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n');
  let cleaned = text.replace(/```json|```/g, '').trim();
  const fi = cleaned.indexOf('{');
  const li = cleaned.lastIndexOf('}');
  if (fi >= 0 && li > fi) cleaned = cleaned.substring(fi, li + 1);

  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch {
    throw new Error('AI 回應無法解析為 JSON，請重新分析');
  }

  const aiErr = AiErrorSchema.safeParse(parsed);
  if (aiErr.success) throw new Error(`AI 拒絕分析：${aiErr.data.error}`);

  const result = ParlayAnalysisResultSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.slice(0, 3).map((i) => `${i.path.map(String).join('.')}: ${i.message}`).join('; ');
    throw new Error(`AI 回應格式不符：${issues}`);
  }
  return result.data;
}
