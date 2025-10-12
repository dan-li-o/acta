import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, getBasePrompt } from '../lib/core/promptBuilder';

describe('prompt builder', () => {
  it('returns base prompt when no topic', () => {
    const base = getBasePrompt();
    expect(base).toContain('You are Acta');
  });

  it('includes topic context when provided', () => {
    const prompt = buildSystemPrompt({
      id: '1',
      course: 'PHIL 101 F25',
      start_date: '2025-10-06',
      end_date: '2025-10-12',
      topic: 'Induction & Hume',
      reading_list_json: [{ title: 'Hume, Enquiry §IV' }],
      socratic_seed: 'Use everyday examples.'
    });

    expect(prompt).toContain('Induction & Hume');
    expect(prompt).toContain('Hume, Enquiry §IV');
    expect(prompt).toContain('Use everyday examples.');
  });
});
