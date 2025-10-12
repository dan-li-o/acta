insert into weekly_topics (course, start_date, end_date, topic, reading_list_json, socratic_seed)
values (
  'PHIL 101 F25',
  '2025-10-06',
  '2025-10-12',
  'Induction & Hume',
  '[{"title":"Hume, Enquiry §IV"}]'::jsonb,
  'Prefer everyday prediction examples; invite counterexamples after two turns.'
)
on conflict do nothing;
