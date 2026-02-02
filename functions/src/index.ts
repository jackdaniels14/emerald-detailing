/**
 * Emerald Detailing - Cloud Functions
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export Twilio functions
export {
  getTwilioToken,
  twilioVoiceWebhook,
  twilioCallStatus,
  twilioRecordingStatus,
  twilioIncomingVoice,
  twilioIncomingFallback,
  setForwardingNumber,
  getForwardingSettings,
  getCallRecordings,
} from './twilio';
