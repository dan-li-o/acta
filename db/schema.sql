-- Enable UUID generation
create extension if not exists "pgcrypto";

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text unique not null,
  course text not null,
  instructor text not null,
  consented_at timestamptz,
  status text not null check (status in ('active', 'stopped')) default 'active',
  created_at timestamptz not null default now()
);

-- Message log for inbound/outbound SMS
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  raw_text text,
  scrubbed_text text not null default '',
  created_at timestamptz not null default now(),
  model text,
  token_in int,
  token_out int,
  cost_cents int,
  carrier_msg_id text,
  delivery_status text,
  llm_error boolean default false
);

-- PII redaction audit trail
create table if not exists redactions (
  message_id uuid not null references messages(id) on delete cascade,
  pii_type text not null,
  placeholder text not null,
  span_start int not null,
  span_end int not null
);

-- Weekly topic guidance
create table if not exists weekly_topics (
  id uuid primary key default gen_random_uuid(),
  course text not null,
  start_date date not null,
  end_date date not null,
  topic text not null,
  reading_list_json jsonb,
  socratic_seed text
);

create index if not exists idx_students_phone on students(phone);
create index if not exists idx_messages_student_created on messages(student_id, created_at desc);
create index if not exists idx_redactions_message on redactions(message_id);
create index if not exists idx_weekly_topics_course_dates on weekly_topics(course, start_date, end_date);
