/**
 * Telnyx can retry the same webhook; this hook verifies whether we've
 * seen the carrier message ID. MVP returns false until backing storage lands.
 */
export async function isDuplicateMessage(_messageId: string): Promise<boolean> {
  // TODO: add distributed idempotency guard (Supabase or KV) in the next phase.
  return false;
}
