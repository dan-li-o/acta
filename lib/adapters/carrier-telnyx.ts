/**
 * Telnyx adapter: signature verification, inbound payload normalization,
 * and outbound SMS API wrapper.
 */
import type { InboundMessage } from '../db/types';
import { logger } from '../util/logger';

interface VerifySignatureOptions {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  secret: string | undefined;
}

const encoder = new TextEncoder();

// Telnyx signs `${timestamp}|${rawBody}` using HMAC-SHA256 with the webhook secret.
async function createHmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const bytes = new Uint8Array(signatureBuffer);
  return bytes.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
}

export async function verifyTelnyxSignature(options: VerifySignatureOptions): Promise<boolean> {
  if (!options.secret) {
    // Allow local development without the secret but warn loudly.
    logger.warn('TELNYX_WEBHOOK_SECRET missing; skipping signature verification');
    return true;
  }

  if (!options.signature || !options.timestamp) {
    return false;
  }

  const payload = `${options.timestamp}|${options.rawBody}`;
  const expected = await createHmac(options.secret, payload);
  const provided = options.signature.replace(/^v1=/, '').toLowerCase();
  return expected === provided;
}

export function normalizeTelnyxInbound(body: unknown): InboundMessage {
  if (
    !body ||
    typeof body !== 'object' ||
    !('data' in body) ||
    !body.data ||
    typeof body.data !== 'object'
  ) {
    throw new Error('Malformed Telnyx payload');
  }

  const payload: any = (body as any).data.payload;

  if (!payload) {
    throw new Error('Missing payload in Telnyx webhook');
  }

  const from = payload.from?.phone_number;
  const to = Array.isArray(payload.to) ? payload.to[0]?.phone_number : payload.to?.phone_number;
  const text = payload.text ?? '';
  const messageId = payload.id ?? payload.message_id;

  if (!from || !to || !messageId) {
    throw new Error('Missing required message fields');
  }

  return {
    carrierMessageId: String(messageId),
    from: String(from),
    to: String(to),
    text: String(text),
    receivedAt: payload.received_at ?? new Date().toISOString()
  };
}

export async function sendTelnyxSms(to: string, text: string): Promise<string> {
  const apiKey = process.env.TELNYX_API_KEY;
  const from = process.env.TELNYX_NUMBER;
  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID;

  if (!apiKey) {
    throw new Error('TELNYX_API_KEY is not configured');
  }

  if (!from && !profileId) {
    throw new Error('Configure either TELNYX_NUMBER or TELNYX_MESSAGING_PROFILE_ID');
  }

  const payload: Record<string, unknown> = {
    to,
    text
  };

  if (from) {
    payload.from = from;
  }
  if (profileId) {
    payload.messaging_profile_id = profileId;
  }

  const response = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error('Telnyx send error', { status: response.status, body: errorBody });
    throw new Error(`Failed to send SMS via Telnyx: ${response.status}`);
  }

  const json = (await response.json()) as any;
  return json?.data?.id ?? json?.data?.carrier_message_id ?? '';
}
