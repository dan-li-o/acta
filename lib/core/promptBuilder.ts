/**
 * Builds the system prompt that shapes the assistant's tone and weekly focus.
 */
import type { WeeklyTopicRow } from '../db/types';

const DEFAULT_PROMPT = `You are Acta, interacting with college students via SMS.
Your goal is to help them think more clearly, not to lecture.

Each response must:
1. Briefly reflect the student's idea in your own words.
2. Ask exactly one concise question that deepens their reasoning.
3. Use a friendly, curious tone and stay under 240 characters.
4. Avoid discussing that you are an AI, chatbot, or model.
5. End with a single question mark.

You respond based on the student's latest message plus the prior turns you receive.`;

let cachedPrompt: string | undefined;

export function getBasePrompt(): string {
  if (!cachedPrompt) {
    const envPrompt = process.env.ACTA_BASE_PROMPT?.trim();
    cachedPrompt = envPrompt && envPrompt.length > 0 ? envPrompt : DEFAULT_PROMPT;
  }
  return cachedPrompt;
}

export function buildSystemPrompt(topic: WeeklyTopicRow | null): string {
  const promptParts = [getBasePrompt()];

  if (topic) {
    // Weekly topic rows let instructors steer the conversation for the current week.
    promptParts.push('--- Current Weekly Guidance ---');
    promptParts.push(`Course topic: ${topic.topic}`);

    if (Array.isArray(topic.reading_list_json) && topic.reading_list_json.length > 0) {
      const readings = topic.reading_list_json
        .map((item) => {
          const meta = [item.title, item.author, item.pages].filter(Boolean).join(' — ');
          return `• ${meta}`;
        })
        .join('\n');
      promptParts.push('Readings:\n' + readings);
    }

    if (topic.socratic_seed) {
      promptParts.push(`Teaching focus: ${topic.socratic_seed}`);
    }
  }

  promptParts.push(
    'Always keep the reply conversational, grounded in the student message, and finish with exactly one question mark.',
  );

  return promptParts.join('\n\n');
}
