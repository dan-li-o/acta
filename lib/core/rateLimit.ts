/**
 * MVP placeholder for rate limiting—wired so the pipeline can plug in
 * Supabase RPCs or edge KV later without refactoring call sites.
 */
export interface RateLimitResult {
  allowed: boolean;
  message?: string;
}

export async function checkRateLimit(studentId: string): Promise<RateLimitResult> {
  // KV-backed rate limiting is deferred until the next phase.
  // For MVP we always allow the message through.
  return { allowed: true };
}

export async function setCooldown(studentId: string): Promise<void> {
  void studentId;
  // No-op until distributed storage is configured.
}
