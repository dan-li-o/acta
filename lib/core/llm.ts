export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmResponse {
  text: string;
  tokenIn: number;
  tokenOut: number;
}

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const MAX_CHAR_COUNT = 240;
const DEFAULT_OPENAI_BASE = 'https://api.openai.com/v1';

function trimToCharacterLimit(reply: string): string {
  if (reply.length <= MAX_CHAR_COUNT) {
    return reply;
  }

  const sentences = reply.match(/[^.!?]+[.!?]?/g);
  if (!sentences) {
    return reply.slice(0, MAX_CHAR_COUNT - 1) + '?';
  }

  let accumulator = '';
  for (const sentence of sentences) {
    const tentative = (accumulator + sentence).trim();
    if (tentative.length > MAX_CHAR_COUNT) {
      break;
    }
    accumulator = tentative.endsWith(' ') ? tentative : `${tentative} `;
  }

  const fallback = accumulator.trim() || reply.slice(0, MAX_CHAR_COUNT - 1);
  const sanitized = fallback.replace(/[?!.,;:\s]+$/, '').trim();
  return `${sanitized}?`;
}

function ensureQuestionMark(reply: string): string {
  if (reply.trim().endsWith('?')) {
    return reply.trim();
  }

  if (reply.length > MAX_CHAR_COUNT - 2) {
    return `${reply.slice(0, MAX_CHAR_COUNT - 1)}?`;
  }

  return `${reply.trim()} What do you think?`.slice(0, MAX_CHAR_COUNT - 1) + '?';
}

export async function askLLM(options: {
  systemPrompt: string;
  context: ConversationTurn[];
  userMessage: string;
}): Promise<LlmResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const messages = [
    { role: 'system' as const, content: options.systemPrompt },
    ...options.context,
    { role: 'user' as const, content: options.userMessage }
  ];

  const baseUrl = process.env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 120,
      presence_penalty: 0.2
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as {
    choices: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = payload.choices[0]?.message?.content ?? '';
  const normalized = ensureQuestionMark(trimToCharacterLimit(text));

  return {
    text: normalized,
    tokenIn: payload.usage?.prompt_tokens ?? 0,
    tokenOut: payload.usage?.completion_tokens ?? 0
  };
}

export function getModelName(): string {
  return MODEL;
}
