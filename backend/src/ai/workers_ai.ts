/**
 * 💎 SALARIA BACKEND — UNIVERSAL WORKERS AI ADAPTER & CATEGORIZER
 */

import { Category } from '../types';
import { logToD1 } from '../db';
import { buildAIPrompt } from '../services/parser';

export interface AIAdapterRunOptions {
  aiBinding: any;
  candidateModels: string | string[];
  systemPrompt?: string;
  userPrompt: string;
  taskType?: 'fast_extraction' | 'deep_reasoning';
  db?: any;
}

export interface AIAdapterRunResult {
  text: string;
  parsed?: any;
  model_used: string;
  raw?: any;
}

export const WorkersAIAdapter = {
  // 1. Chuẩn hoá messages: Đóng gói systemPrompt vào user message đầu tiên
  normalizeMessages(systemPrompt?: string, userPrompt?: string) {
    if (!systemPrompt) {
      return [{ role: 'user', content: userPrompt || '' }];
    }
    return [{ role: 'user', content: `${systemPrompt}\n\n---\n${userPrompt || ''}` }];
  },

  // 2. Bóc tách nội dung vạn năng (Universal Content Extractor)
  extractContent(rawRes: any, db: any = null): string | null {
    if (typeof rawRes?.response === 'string' && rawRes.response.trim()) {
      return rawRes.response.trim();
    }
    const msg = rawRes?.choices?.[0]?.message;
    if (msg?.content && msg.content.trim()) {
      return msg.content.trim();
    }
    if (msg?.reasoning_content && msg.reasoning_content.trim()) {
      return msg.reasoning_content.trim();
    }
    if (msg?.reasoning && msg.reasoning.trim()) {
      return msg.reasoning.trim();
    }

    console.warn('[WorkersAIAdapter] Unrecognized response shape:', JSON.stringify(rawRes));
    if (db) {
      logToD1(db, 'WARN', 'AI_ADAPTER', 'Unrecognized AI response shape', { rawRes });
    }
    return null;
  },

  // 3. Hàm gọi AI đa tầng với cấu hình linh hoạt theo taskType
  async run({
    aiBinding,
    candidateModels,
    systemPrompt,
    userPrompt,
    taskType = 'fast_extraction',
    db = null
  }: AIAdapterRunOptions): Promise<AIAdapterRunResult | null> {
    if (!aiBinding || !userPrompt || !candidateModels) return null;

    const isDeepReasoning = taskType === 'deep_reasoning';
    const messages = this.normalizeMessages(systemPrompt, userPrompt);
    const runOptions = {
      messages,
      temperature: isDeepReasoning ? 0.5 : 0.1,
      max_tokens: isDeepReasoning ? 3000 : 512,
      chat_template_kwargs: isDeepReasoning
        ? { enable_thinking: true, thinking: true }
        : { enable_thinking: false, thinking: false }
    };

    const models = (Array.isArray(candidateModels) ? candidateModels : [candidateModels])
      .filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

    for (const model of models) {
      try {
        const rawRes = await aiBinding.run(model, runOptions);

        if (rawRes?.response && typeof rawRes.response === 'object' && rawRes.response.category_id !== undefined) {
          return { text: JSON.stringify(rawRes.response), parsed: rawRes.response, model_used: model };
        }

        const text = this.extractContent(rawRes, db);
        if (text) {
          return { text, model_used: model, raw: rawRes };
        }
      } catch (err: any) {
        console.warn(`[WorkersAIAdapter] Model ${model} failed:`, err.message);
        if (db) {
          logToD1(db, 'WARN', 'AI_FALLBACK', `Model ${model} failed: ${err.message}`, { model, taskType });
        }
      }
    }
    return null;
  }
};

// Layer 2: Cloudflare Workers AI with Universal Adapter
export async function categorizeWithWorkersAI(
  aiBinding: any,
  text: string,
  categories: Category[],
  preferredModel: string = '@cf/google/gemma-4-26b-a4b-it',
  db: any = null
): Promise<any | null> {
  if (!aiBinding || !text || !categories || categories.length === 0) return null;

  const systemPrompt = buildAIPrompt(text, categories);
  const userPrompt = `Nội dung cần phân loại: "${text}"`;

  const candidateModels = [
    preferredModel,
    '@cf/google/gemma-4-26b-a4b-it',
    '@cf/meta/llama-3.2-3b-instruct',
    '@cf/meta/llama-3.2-1b-instruct'
  ];

  const result = await WorkersAIAdapter.run({
    aiBinding,
    candidateModels,
    systemPrompt,
    userPrompt,
    taskType: 'fast_extraction',
    db
  });

  if (!result || !result.text) return null;

  if (result.parsed) {
    return { ...result.parsed, model_used: result.model_used };
  }

  const match = result.text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      return { ...parsed, model_used: result.model_used };
    } catch (e: any) {
      console.warn('[categorizeWithWorkersAI] JSON parse failed on text:', result.text);
      if (db) logToD1(db, 'WARN', 'AI_PARSE_ERROR', `JSON parse failed: ${e.message}`, { text: result.text });
    }
  } else {
    if (db) logToD1(db, 'WARN', 'AI_NO_JSON_MATCH', 'No JSON found in AI text', { text: result.text });
  }

  return null;
}

export interface DailyInsightParams {
  date: string;
  todayExpense: number;
  safeToSpend: number;
  daysRemaining: number;
  topExpenses?: string[];
}

// Layer 3: Sinh lời nhắc và nhận xét tài chính cuối ngày bằng Workers AI
export async function generateDailyInsightWithAI(
  aiBinding: any,
  data: DailyInsightParams,
  preferredModel: string = '@cf/google/gemma-4-26b-a4b-it',
  db: any = null
): Promise<string | null> {
  if (!aiBinding) return null;

  const candidateModels = [
    preferredModel,
    '@cf/google/gemma-4-26b-a4b-it',
    '@cf/meta/llama-3.2-3b-instruct'
  ];

  const formattedToday = new Intl.NumberFormat('vi-VN').format(Math.round(data.todayExpense));
  const formattedSafe = new Intl.NumberFormat('vi-VN').format(Math.round(data.safeToSpend));
  const expenseList = (data.topExpenses && data.topExpenses.length > 0)
    ? data.topExpenses.join(', ')
    : 'Không phát sinh chi tiêu đáng kể';

  const isOverBudget = data.todayExpense > data.safeToSpend;

  const systemPrompt = `Bạn là Salaria Copilot - trợ lý tài chính thông minh, hóm hỉnh và tâm lý.
Nhiệm vụ của bạn là viết đúng 1 hoặc 2 câu ngắn (tối đa 30 từ, có kèm 1-2 emoji sinh động) nhận xét về tình hình chi tiêu hôm nay và đưa ra lời khuyên ngày mai cho người dùng lúc 22:30.
Yêu cầu bắt buộc:
- Viết bằng tiếng Việt tự nhiên, thân mật, dí dỏm.
- Nếu chi tiêu an toàn (<= hạn mức): động viên, khen ngợi việc giữ kỷ luật tài chính.
- Nếu chi tiêu vượt hạn mức (> hạn mức): nhắc nhở hóm hỉnh, liên hệ tới các món đã chi (ví dụ đồ ăn, cafe, mua sắm...), khuyên ngày mai bù lại nhẹ nhàng.
- Tuyệt đối KHÔNG chào hỏi (không "Chào bạn", "Hôm nay bạn..."), hãy viết thẳng vào nội dung nhận xét.`;

  const userPrompt = `Dữ liệu chi tiêu ngày ${data.date}:
- Đã chi hôm nay: ${formattedToday} ₫
- Hạn mức an toàn ngày mai: ${formattedSafe} ₫/ngày
- Còn ${data.daysRemaining} ngày nữa tới kỳ lương
- Các khoản chi tiêu hôm nay: ${expenseList}
- Trạng thái: ${isOverBudget ? 'Vượt hạn mức chi tiêu hôm nay' : 'Chi tiêu an toàn trong hạn mức'}`;

  try {
    const result = await WorkersAIAdapter.run({
      aiBinding,
      candidateModels,
      systemPrompt,
      userPrompt,
      taskType: 'fast_extraction',
      db
    });

    if (result && result.text) {
      let cleanText = result.text.trim().replace(/^["']|["']$/g, '');
      if (cleanText.length > 0 && cleanText.length < 250) {
        return cleanText;
      }
    }
  } catch (err: any) {
    console.warn('[generateDailyInsightWithAI] Error:', err.message);
    if (db) logToD1(db, 'WARN', 'DAILY_INSIGHT_AI_ERROR', err.message, { data });
  }

  return null;
}
