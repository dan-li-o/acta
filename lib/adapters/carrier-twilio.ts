/**
 * Placeholder Twilio adapter for future carrier support.
 * The MVP only wires Telnyx, so these throw to make misuse obvious.
 */
import type { InboundMessage } from '../db/types';

export function verifyTwilioSignature(): boolean {
  throw new Error('Twilio is not configured for this project yet.');
}

export function normalizeTwilioInbound(): InboundMessage {
  throw new Error('Twilio adapter is not implemented. Switch CARRIER=telnyx.');
}
