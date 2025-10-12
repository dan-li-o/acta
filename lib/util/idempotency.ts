export async function isDuplicateMessage(_messageId: string): Promise<boolean> {
  // TODO: add distributed idempotency guard (Supabase or KV) in the next phase.
  return false;
}
