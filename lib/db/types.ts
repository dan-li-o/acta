/**
 * Shared TypeScript shapes mirroring Supabase table rows and DTOs.
 */
export type StudentStatus = 'active' | 'stopped';

export interface StudentRow {
  id: string;
  name: string | null;
  phone: string;
  course: string;
  instructor: string;
  consented_at: string | null;
  status: StudentStatus;
  created_at: string;
}

export type MessageDirection = 'in' | 'out';

export interface MessageRow {
  id: string;
  student_id: string;
  direction: MessageDirection;
  raw_text: string | null;
  scrubbed_text: string;
  created_at: string;
  model: string | null;
  token_in: number | null;
  token_out: number | null;
  cost_cents: number | null;
  carrier_msg_id: string | null;
  delivery_status: string | null;
  llm_error: boolean | null;
}

export interface RedactionRow {
  message_id: string;
  pii_type: string;
  placeholder: string;
  span_start: number;
  span_end: number;
}

export interface WeeklyTopicRow {
  id: string;
  course: string;
  start_date: string;
  end_date: string;
  topic: string;
  reading_list_json: Array<{ title: string; author?: string; pages?: string }> | null;
  socratic_seed: string | null;
}

export interface InboundMessage {
  carrierMessageId: string;
  from: string;
  to: string;
  text: string;
  receivedAt: string;
}
