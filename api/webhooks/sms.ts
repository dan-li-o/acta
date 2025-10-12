import { normalizeTelnyxInbound, verifyTelnyxSignature } from '../../lib/adapters/carrier-telnyx';
import { processInbound } from '../../lib/core/pipeline';
import { jsonResponse, textResponse } from '../../lib/util/http';
import { logger } from '../../lib/util/logger';

export const config = {
  runtime: 'edge'
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return textResponse('Method not allowed', 405);
  }

  const rawBody = await req.text();
  const carrier = (process.env.CARRIER ?? 'telnyx').toLowerCase();

  if (carrier !== 'telnyx') {
    return textResponse('Carrier not supported in this deployment', 501);
  }

  const signature =
    req.headers.get('telnyx-signature-ed25519') ??
    req.headers.get('telnyx-signature-sha256') ??
    req.headers.get('telnyx-signature') ??
    null;
  const timestamp = req.headers.get('telnyx-timestamp');
  const secret = process.env.TELNYX_WEBHOOK_SECRET;

  const verified = await verifyTelnyxSignature({
    rawBody,
    signature,
    timestamp,
    secret
  });

  if (!verified) {
    logger.warn('Failed webhook verification', { signature, timestamp });
    return textResponse('Unauthorized', 401);
  }

  try {
    const payload = JSON.parse(rawBody);
    const inbound = normalizeTelnyxInbound(payload);
    await processInbound(inbound, process.env);
    return jsonResponse({ status: 'ok' });
  } catch (error) {
    logger.error('Inbound processing failed', { error: String(error) });
    return textResponse('Internal Server Error', 500);
  }
}
