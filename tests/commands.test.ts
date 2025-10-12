import { describe, expect, it } from 'vitest';
import { detectCommand } from '../lib/core/commands';

describe('command detection', () => {
  it('detects START', () => {
    expect(detectCommand('START')).toBe('START');
    expect(detectCommand('start')).toBe('START');
  });

  it('detects STOP', () => {
    expect(detectCommand('STOP')).toBe('STOP');
    expect(detectCommand(' stop ')).toBe('STOP');
  });

  it('detects HELP', () => {
    expect(detectCommand('help')).toBe('HELP');
  });

  it('ignores normal sentences', () => {
    expect(detectCommand('What is induction?')).toBeNull();
  });
});
