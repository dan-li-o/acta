/**
 * Central orchestration for Acta's conversational loop.
 * A verified inbound message flows through dedupe, student lookup,
 * scrubbing, command handling, LLM generation, and outbound dispatch.
 */
import {
  createStudent,
  getRecentTurns,
  getStudentByPhone,
  getWeeklySeed,
  insertInboundMessage,
  insertOutboundMessage,
  insertRedactionRows,
  markMessageWithError,
  setDeliveryStatusByCarrierId,
  updateMessageScrubbed,
  updateOutboundCarrierId
} from '../db/queries';
import type { InboundMessage, MessageRow } from '../db/types';
import { detectCommand, handleCommand } from './commands';
import { askLLM, type ConversationTurn, getModelName } from './llm';
import { buildSystemPrompt } from './promptBuilder';
import { checkRateLimit, setCooldown } from './rateLimit';
import { scrubText } from './scrub';
import { isDuplicateMessage } from '../util/idempotency';
import { logger } from '../util/logger';
import { sendTelnyxSms } from '../adapters/carrier-telnyx';

const FALLBACK_TEXT = 'Sorry, I did not catch that—could you share it a different way?';

function getCourse(env: Record<string, string | undefined>): string {
  return env.DEFAULT_COURSE ?? 'PHIL 101 F25';
}

function getInstructor(env: Record<string, string | undefined>): string {
  return env.DEFAULT_INSTRUCTOR ?? 'Acta Instructor';
}

export async function processInbound(
  inbound: InboundMessage,
  env: Record<string, string | undefined>
): Promise<void> {
  if ((process.env.DISABLE_PIPELINE ?? '').toLowerCase() === 'true') {
    logger.info('Inbound message ignored because DISABLE_PIPELINE=true', {
      carrierMessageId: inbound.carrierMessageId
    });
    return;
  }

  // Skip duplicate carrier IDs—Telnyx may retry the same payload.
  if (await isDuplicateMessage(inbound.carrierMessageId)) {
    logger.info('Duplicate message skipped', { carrierMessageId: inbound.carrierMessageId });
    return;
  }

  const course = getCourse(env);
  const instructor = getInstructor(env);
  let student = await getStudentByPhone(inbound.from);

  if (!student) {
    student = await createStudent({
      phone: inbound.from,
      course,
      instructor
    });
  }

  // Persist the raw inbound text and derive a scrubbed version for LLM use.
  const inboundRecord = await insertInboundMessage(student.id, inbound.text);
  const scrubResult = scrubText(inbound.text);
  await updateMessageScrubbed(inboundRecord.id, scrubResult.scrubbed);

  if (scrubResult.redactions.length > 0) {
    await insertRedactionRows(
      scrubResult.redactions.map((item) => ({
        message_id: inboundRecord.id,
        pii_type: item.pii_type,
        placeholder: item.placeholder,
        span_start: item.span_start,
        span_end: item.span_end
      }))
    );
  }

  const command = detectCommand(inbound.text);
  if (command) {
    const reply = await handleCommand(command, {
      fromNumber: inbound.from,
      course,
      instructor
    });
    await recordAndSendReply({
      studentPhone: inbound.from,
      studentId: student.id,
      text: reply,
      model: 'system-command'
    });
    return;
  }

  if (student.status === 'stopped') {
    await recordAndSendReply({
      studentPhone: inbound.from,
      studentId: student.id,
      text: "You're currently unsubscribed. Text START to resume our chats.",
      model: 'system-guard'
    });
    return;
  }

  const rate = await checkRateLimit(student.id);
  if (!rate.allowed) {
    await recordAndSendReply({
      studentPhone: inbound.from,
      studentId: student.id,
      text: rate.message ?? 'Let’s pick this up soon—try again in a bit.',
      model: 'rate-limit'
    });
    return;
  }

  // Assemble the LLM call using recent history plus weekly teaching guidance.
  const weeklySeed = await getWeeklySeed(student.course, new Date());
  const systemPrompt = buildSystemPrompt(weeklySeed);
  const history = await getRecentTurns(student.id, 6);

  const conversation: ConversationTurn[] = history
    .filter((message) => !!message.scrubbed_text)
    .map((message) => ({
      role: message.direction === 'in' ? 'user' : 'assistant',
      content: message.scrubbed_text
    }));

  let replyText = FALLBACK_TEXT;
  let tokensIn = 0;
  let tokensOut = 0;

  try {
    const result = await askLLM({
      systemPrompt,
      context: conversation,
      userMessage: scrubResult.scrubbed
    });
    replyText = result.text;
    tokensIn = result.tokenIn;
    tokensOut = result.tokenOut;
  } catch (error) {
    logger.error('LLM call failed', { error: String(error) });
    await markMessageWithError(inboundRecord.id, true);
  }

  await recordAndSendReply({
    studentPhone: inbound.from,
    studentId: student.id,
    text: replyText,
    model: getModelName(),
    tokenIn: tokensIn,
    tokenOut: tokensOut
  });

  await setCooldown(student.id);
}

interface RecordReplyInput {
  studentPhone: string;
  studentId: string;
  text: string;
  model: string | null;
  tokenIn?: number;
  tokenOut?: number;
}

async function recordAndSendReply(input: RecordReplyInput): Promise<void> {
  const outboundRow = await insertOutboundMessage({
    studentId: input.studentId,
    text: input.text,
    model: input.model,
    tokenIn: input.tokenIn ?? null,
    tokenOut: input.tokenOut ?? null
  });

  if ((process.env.DISABLE_SMS_SEND ?? '').toLowerCase() === 'true') {
    logger.warn('DISABLE_SMS_SEND=true; skipping Telnyx delivery', {
      studentId: input.studentId,
      outboundMessageId: outboundRow.id
    });
    return;
  }

  try {
    const carrierId = await sendTelnyxSms(input.studentPhone, input.text);
    if (carrierId) {
      await updateOutboundCarrierId(outboundRow.id, carrierId);
    }
  } catch (error) {
    logger.error('SMS delivery failed', { error: String(error) });
    await markMessageWithError(outboundRow.id, true);
  }
}

export async function handleDeliveryStatus(
  carrierMessageId: string,
  status: string
): Promise<void> {
  await setDeliveryStatusByCarrierId(carrierMessageId, status);
}
