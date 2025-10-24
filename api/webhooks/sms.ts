/**
 * Vercel Edge handler that receives inbound SMS webhooks from Telnyx.
 * Every POST request runs signature verification before handing the payload
 * to the conversational pipeline.
 */
import { normalizeTelnyxInbound, verifyTelnyxSignature } from '../../lib/adapters/carrier-telnyx';
import { processInbound } from '../../lib/core/pipeline';
import { jsonResponse, textResponse } from '../../lib/util/http';
import { logger } from '../../lib/util/logger';

// Tell Vercel to run this as an Edge Function (fast, low-latency, good for SMS)
export const config = {
  runtime: 'edge'
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    // Telnyx only sends POST when someone texts; fail fast for anything else.
    return textResponse('Method not allowed', 405);
  }

  // rawBody is the exact JSON that Telnyx sent (assuming carrier is Telnyx)
  const rawBody = await req.text();
  const carrier = (process.env.CARRIER ?? 'telnyx').toLowerCase();

  if (carrier !== 'telnyx') {
    return textResponse('Carrier not supported in this deployment', 501);
  }

  //Telnyx signs every webhook request with a secret. Pull the signature, timestamp, and secret for verification, copy of the scret from env var.
  const signature =
    req.headers.get('telnyx-signature-ed25519') ??
    req.headers.get('telnyx-signature-sha256') ??
    req.headers.get('telnyx-signature') ??
    null;
  const timestamp = req.headers.get('telnyx-timestamp');
  const secret = process.env.TELNYX_WEBHOOK_SECRET;

  // Prove this came from Telnyx.
  const verified = await verifyTelnyxSignature({
    rawBody,
    signature,
    timestamp,
    secret
  });

  if (!verified) {
    // Logging the signature metadata helps debug local curl attempts.
    logger.warn('Failed webhook verification', { signature, timestamp });
    return textResponse('Unauthorized', 401);
  }

  // If the webhook is verified, parse and process it.
  try {
    const payload = JSON.parse(rawBody);
    // Convert Telnyx's raw payload into our normalized inbound format.
    const inbound = normalizeTelnyxInbound(payload);
    // Hand off to the main inbound processing pipeline, including (1) looking up student; (2) logging incoming message; (3) scrubbing PII; (4) buidling prompt; (5) calling LLM; (6) logging response; (7) sending SMS reply.
    await processInbound(inbound, process.env);
    return jsonResponse({ status: 'ok' });
  } catch (error) {
    logger.error('Inbound processing failed', { error: String(error) });
    return textResponse('Internal Server Error', 500);
  }
}
