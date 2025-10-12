import { getClient } from '../../lib/db/client';
import { buildSystemPrompt } from '../../lib/core/promptBuilder';
import { askLLM } from '../../lib/core/llm';
import type { ConversationTurn } from '../../lib/core/llm';
import { jsonResponse, textResponse } from '../../lib/util/http';

export const config = {
  runtime: 'edge'
};

export default async function handler(_req: Request): Promise<Response> {
  if ((process.env.DIGEST_TOGGLE ?? 'false').toLowerCase() !== 'true') {
    return textResponse('Digest disabled', 200);
  }

  const course = process.env.DEFAULT_COURSE ?? 'PHIL 101 F25';
  const client = getClient();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await client
    .from('messages')
    .select('direction, scrubbed_text, created_at')
    .eq('direction', 'in')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  const entries = data ?? [];

  if (entries.length === 0) {
    return jsonResponse({ status: 'ok', summary: 'No student conversations in the past day.' });
  }

  const conversation: ConversationTurn[] = entries.map((message) => ({
    role: 'user' as const,
    content: message.scrubbed_text ?? ''
  }));

  const summaryPrompt =
    'You are preparing a short instructor digest based on anonymized student reflections. Write 3 bullet points summarizing key themes and end with a respectful suggestion that the instructor can text back to everyone.';

  const llmResult = await askLLM({
    systemPrompt: `${buildSystemPrompt(null)}\n\n${summaryPrompt}`,
    context: conversation.slice(-6),
    userMessage:
      'Summarize the key themes from the last 24 hours of student inbound messages. Keep it concise.',
  });

  return jsonResponse({
    status: 'ok',
    course,
    summary: llmResult.text,
    totalMessages: entries.length
  });
}
