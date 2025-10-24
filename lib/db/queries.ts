/**
 * Typed Supabase query helpers that encapsulate the storage schema.
 * Keeps the pipeline readable and centralises error handling.
 */
import { getClient } from './client';
import type {
  MessageDirection,
  MessageRow,
  RedactionRow,
  StudentRow,
  StudentStatus,
  WeeklyTopicRow
} from './types';

export async function getStudentByPhone(
  phone: string
): Promise<StudentRow | null> {
  const client = getClient();
  const { data, error } = await client
    .from('students')
    .select('*')
    .eq('phone', phone)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

interface CreateStudentInput {
  phone: string;
  name?: string | null;
  course: string;
  instructor: string;
}

export async function createStudent(input: CreateStudentInput): Promise<StudentRow> {
  const client = getClient();
  const { data, error } = await client
    .from('students')
    .insert({
      phone: input.phone,
      name: input.name ?? null,
      course: input.course,
      instructor: input.instructor,
      status: 'active',
      consented_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateStudentStatus(
  studentId: string,
  status: StudentStatus
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('students')
    .update({ status })
    .eq('id', studentId);

  if (error) {
    throw error;
  }
}

export async function insertInboundMessage(
  studentId: string,
  rawText: string
): Promise<MessageRow> {
  const client = getClient();

  const { data, error } = await client
    .from('messages')
    .insert({
      student_id: studentId,
      direction: 'in',
      raw_text: rawText,
      scrubbed_text: '',
      model: null,
      llm_error: false
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateMessageScrubbed(
  messageId: string,
  scrubbedText: string
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('messages')
    .update({ scrubbed_text: scrubbedText })
    .eq('id', messageId);

  if (error) {
    throw error;
  }
}

type RedactionInsert = {
  message_id: string;
  pii_type: string;
  placeholder: string;
  span_start: number;
  span_end: number;
};

export async function insertRedactionRows(rows: RedactionInsert[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const client = getClient();
  const payload = rows.map((row) => ({
    message_id: row.message_id,
    pii_type: row.pii_type,
    placeholder: row.placeholder,
    span_start: row.span_start,
    span_end: row.span_end
  }));

  const { error } = await client.from('redactions').insert(payload);

  if (error) {
    throw error;
  }
}

interface InsertOutboundOptions {
  studentId: string;
  text: string;
  model: string | null;
  tokenIn?: number | null;
  tokenOut?: number | null;
  costCents?: number | null;
}

export async function insertOutboundMessage(
  options: InsertOutboundOptions
): Promise<MessageRow> {
  const client = getClient();
  const { data, error } = await client
    .from('messages')
    .insert({
      student_id: options.studentId,
      direction: 'out',
      raw_text: options.text,
      scrubbed_text: options.text,
      model: options.model,
      token_in: options.tokenIn ?? null,
      token_out: options.tokenOut ?? null,
      cost_cents: options.costCents ?? null,
      llm_error: false
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function markMessageWithError(
  messageId: string,
  errorFlag: boolean
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('messages')
    .update({ llm_error: errorFlag })
    .eq('id', messageId);

  if (error) {
    throw error;
  }
}

export async function updateOutboundCarrierId(
  messageId: string,
  carrierMessageId: string
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('messages')
    .update({ carrier_msg_id: carrierMessageId })
    .eq('id', messageId);

  if (error) {
    throw error;
  }
}

export async function setDeliveryStatusByCarrierId(
  carrierMessageId: string,
  deliveryStatus: string
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('messages')
    .update({ delivery_status: deliveryStatus })
    .eq('carrier_msg_id', carrierMessageId);

  if (error) {
    throw error;
  }
}

export async function getWeeklySeed(
  course: string,
  currentDate: Date
): Promise<WeeklyTopicRow | null> {
  const client = getClient();
  const date = currentDate.toISOString().slice(0, 10);

  const { data, error } = await client
    .from('weekly_topics')
    .select('*')
    .eq('course', course)
    .lte('start_date', date)
    .gte('end_date', date)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    reading_list_json: Array.isArray(data.reading_list_json)
      ? data.reading_list_json
      : null
  } as WeeklyTopicRow;
}

export async function getRecentTurns(
  studentId: string,
  limit = 6
): Promise<MessageRow[]> {
  const client = getClient();
  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).reverse();
}

export async function insertMessageWithDirection(
  studentId: string,
  direction: MessageDirection,
  text: string,
  scrubbedText: string
): Promise<MessageRow> {
  const client = getClient();

  const { data, error } = await client
    .from('messages')
    .insert({
      student_id: studentId,
      direction,
      raw_text: direction === 'in' ? text : null,
      scrubbed_text: scrubbedText,
      model: null
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}
