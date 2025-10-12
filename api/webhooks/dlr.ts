import { handleDeliveryStatus } from '../../lib/core/pipeline';
import { jsonResponse, textResponse } from '../../lib/util/http';

export const config = {
  runtime: 'edge'
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return textResponse('Method not allowed', 405);
  }

  const body = await req.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return textResponse('Invalid payload', 400);
  }

  const carrierMessageId = (body as any).carrier_msg_id ?? (body as any).id;
  const status = (body as any).status ?? (body as any).delivery_status;

  if (!carrierMessageId || !status) {
    return textResponse('Missing required fields', 400);
  }

  await handleDeliveryStatus(String(carrierMessageId), String(status));
  return jsonResponse({ status: 'ok' });
}
