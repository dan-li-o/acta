/**
 * Lightweight PII scrubber. Masks sensitive spans before they reach the LLM
 * while recording the redactions for audit/storage.
 */
interface ScrubPattern {
  piiType: string;
  regex: RegExp;
  placeholder: string;
}

export interface Redaction {
  pii_type: string;
  placeholder: string;
  span_start: number;
  span_end: number;
}

export interface ScrubResult {
  scrubbed: string;
  redactions: Redaction[];
}

// Patterns focus on the most common identifiers students might text.
const PATTERNS: ScrubPattern[] = [
  {
    piiType: 'email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    placeholder: '[EMAIL]'
  },
  {
    piiType: 'phone',
    regex: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    placeholder: '[PHONE]'
  },
  {
    piiType: 'student_id',
    regex: /\b[ABCEGHJKLMNPRSTVWXYZ]{2}\d{6,8}\b/gi,
    placeholder: '[ID]'
  },
  {
    piiType: 'ssn',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    placeholder: '[SSN]'
  },
  {
    piiType: 'credit_card',
    regex: /\b(?:\d[ -]*?){13,16}\b/g,
    placeholder: '[CARD]'
  },
  {
    piiType: 'address',
    regex: /\b\d{1,5}\s+[A-Za-z0-9]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi,
    placeholder: '[ADDRESS]'
  },
  {
    piiType: 'human_name',
    regex: /\b(Mr\.|Ms\.|Mrs\.|Dr\.)?\s?[A-Z][a-z]+\s[A-Z][a-z]+\b/g,
    placeholder: '[NAME]'
  }
];

export function scrubText(input: string): ScrubResult {
  const findings: Redaction[] = [];

  for (const pattern of PATTERNS) {
    const matches = input.matchAll(pattern.regex);
    for (const match of matches) {
      if (!match[0] || match.index === undefined) {
        continue;
      }

      const start = match.index;
      const end = start + match[0].length;

      findings.push({
        pii_type: pattern.piiType,
        placeholder: pattern.placeholder,
        span_start: start,
        span_end: end
      });
    }
  }

  if (findings.length === 0) {
    return { scrubbed: input, redactions: [] };
  }

  const sorted = findings
    .sort((a, b) => a.span_start - b.span_start)
    .reduce<Redaction[]>((acc, current) => {
      const prev = acc[acc.length - 1];
      if (!prev || current.span_start >= prev.span_end) {
        acc.push(current);
      }
      return acc;
    }, []);

  let result = '';
  let cursor = 0;
  for (const item of sorted) {
    result += input.slice(cursor, item.span_start);
    result += item.placeholder;
    cursor = item.span_end;
  }
  result += input.slice(cursor);

  return {
    scrubbed: result,
    redactions: sorted
  };
}
