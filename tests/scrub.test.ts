import { describe, expect, it } from 'vitest';
import { scrubText } from '../lib/core/scrub';

describe('scrubText', () => {
  it('redacts phone numbers', () => {
    const result = scrubText('Call me at 646-555-1234');
    expect(result.scrubbed).toBe('Call me at [PHONE]');
    expect(result.redactions).toHaveLength(1);
    expect(result.redactions[0].pii_type).toBe('phone');
  });

  it('redacts emails', () => {
    const result = scrubText('Send to jane@example.com now');
    expect(result.scrubbed).toBe('Send to [EMAIL] now');
    expect(result.redactions[0].placeholder).toBe('[EMAIL]');
  });

  it('handles text without PII', () => {
    const result = scrubText('What is induction?');
    expect(result.scrubbed).toBe('What is induction?');
    expect(result.redactions).toHaveLength(0);
  });
});
