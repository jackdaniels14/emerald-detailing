"use strict";
/**
 * Twilio Integration for Sales CRM
 *
 * Provides browser-based calling via Twilio Voice SDK:
 * - Access token generation for authenticated users
 * - TwiML webhooks for call handling
 * - Call recording and status tracking
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCallRecordings = exports.getForwardingSettings = exports.setForwardingNumber = exports.twilioIncomingFallback = exports.twilioIncomingVoice = exports.twilioRecordingStatus = exports.twilioCallStatus = exports.twilioVoiceWebhook = exports.getTwilioToken = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Generate a Twilio access token for browser-based calling.
 * Each authenticated user gets a unique token with their identity.
 */
exports.getTwilioToken = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    // Verify user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }
    try {
        // Get Twilio config
        const accountSid = (_a = functions.config().twilio) === null || _a === void 0 ? void 0 : _a.account_sid;
        const twimlAppSid = (_b = functions.config().twilio) === null || _b === void 0 ? void 0 : _b.twiml_app_sid;
        const apiKey = (_c = functions.config().twilio) === null || _c === void 0 ? void 0 : _c.api_key;
        const apiSecret = (_d = functions.config().twilio) === null || _d === void 0 ? void 0 : _d.api_secret;
        if (!accountSid || !twimlAppSid || !apiKey || !apiSecret) {
            console.error('Missing Twilio config:', {
                hasAccountSid: !!accountSid,
                hasTwimlAppSid: !!twimlAppSid,
                hasApiKey: !!apiKey,
                hasApiSecret: !!apiSecret,
            });
            throw new functions.https.HttpsError('failed-precondition', 'Twilio not configured properly');
        }
        // Load Twilio SDK
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const twilio = require('twilio');
        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;
        // Create identity from user ID (sanitized for Twilio)
        const identity = context.auth.uid.replace(/[^a-zA-Z0-9_-]/g, '_');
        // Create access token
        const token = new AccessToken(accountSid, apiKey, apiSecret, { identity: identity, ttl: 3600 });
        // Create Voice grant
        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: twimlAppSid,
            incomingAllow: true,
        });
        // Add grant to token
        token.addGrant(voiceGrant);
        console.log('Token generated successfully for identity:', identity);
        return {
            token: token.toJwt(),
            identity: identity,
        };
    }
    catch (error) {
        console.error('Error generating Twilio token:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to generate token');
    }
});
/**
 * TwiML webhook for outbound calls
 * This tells Twilio how to handle the call when it connects
 */
exports.twilioVoiceWebhook = functions.https.onRequest(async (req, res) => {
    var _a;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require('twilio');
    const twiml = new twilio.twiml.VoiceResponse();
    // Get the phone number to call from the request
    const to = req.body.To || req.query.To;
    const callerId = (_a = functions.config().twilio) === null || _a === void 0 ? void 0 : _a.phone_number;
    if (!to) {
        twiml.say('No phone number provided.');
        res.type('text/xml');
        res.send(twiml.toString());
        return;
    }
    // Clean the phone number
    const cleanNumber = to.replace(/[^\d+]/g, '');
    // Dial the number
    const dial = twiml.dial({
        callerId: callerId,
        record: 'record-from-answer-dual', // Record the call
        recordingStatusCallback: `https://${req.hostname}/twilioRecordingStatus`,
    });
    dial.number(cleanNumber);
    res.type('text/xml');
    res.send(twiml.toString());
});
/**
 * Webhook for call status updates
 */
exports.twilioCallStatus = functions.https.onRequest(async (req, res) => {
    const { CallSid, CallStatus, CallDuration, From, To, } = req.body;
    // Log call status
    await admin.firestore().collection('twilioLogs').add({
        type: 'call_status',
        callSid: CallSid,
        status: CallStatus,
        duration: CallDuration,
        from: From,
        to: To,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    // If call completed, update any related lead activity
    if (CallStatus === 'completed' && CallDuration) {
        // You could update lead records here based on the call
    }
    res.sendStatus(200);
});
/**
 * Webhook for recording status
 */
exports.twilioRecordingStatus = functions.https.onRequest(async (req, res) => {
    const { RecordingSid, RecordingUrl, RecordingStatus, RecordingDuration, CallSid, } = req.body;
    if (RecordingStatus === 'completed') {
        // Store recording info
        await admin.firestore().collection('callRecordings').add({
            recordingSid: RecordingSid,
            recordingUrl: RecordingUrl,
            duration: RecordingDuration,
            callSid: CallSid,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    res.sendStatus(200);
});
/**
 * TwiML webhook for incoming calls
 * Rings browser first, then forwards to phone if not answered
 */
exports.twilioIncomingVoice = functions.https.onRequest(async (req, res) => {
    var _a;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require('twilio');
    const twiml = new twilio.twiml.VoiceResponse();
    const from = req.body.From || 'Unknown';
    // Try to get the forwarding phone number from settings
    let forwardingNumber = null;
    try {
        const settingsDoc = await admin.firestore().collection('settings').doc('twilio').get();
        if (settingsDoc.exists) {
            forwardingNumber = ((_a = settingsDoc.data()) === null || _a === void 0 ? void 0 : _a.forwardingNumber) || null;
        }
    }
    catch (e) {
        console.error('Error getting forwarding number:', e);
    }
    // First, try to connect to browser clients
    // We'll dial all connected browser clients for 20 seconds
    const dial = twiml.dial({
        timeout: 20,
        action: forwardingNumber
            ? `https://${req.hostname}/twilioIncomingFallback?forwardTo=${encodeURIComponent(forwardingNumber)}&from=${encodeURIComponent(from)}`
            : undefined,
        callerId: from,
    });
    // Dial all authenticated browser clients
    // In practice, you might want to dial specific users based on availability
    dial.client('browser_client');
    // Log incoming call
    await admin.firestore().collection('twilioLogs').add({
        type: 'incoming_call',
        from: from,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.type('text/xml');
    res.send(twiml.toString());
});
/**
 * Fallback webhook when browser doesn't answer
 * Forwards the call to the configured phone number
 */
exports.twilioIncomingFallback = functions.https.onRequest(async (req, res) => {
    var _a;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require('twilio');
    const twiml = new twilio.twiml.VoiceResponse();
    const dialStatus = req.body.DialCallStatus;
    const forwardTo = req.query.forwardTo;
    const from = req.query.from || 'Unknown';
    const callerId = (_a = functions.config().twilio) === null || _a === void 0 ? void 0 : _a.phone_number;
    // If browser didn't answer or was busy, forward to phone
    if (dialStatus !== 'completed' && forwardTo) {
        twiml.say({ voice: 'alice' }, 'Please hold while we connect you.');
        const dial = twiml.dial({
            callerId: callerId,
        });
        dial.number(forwardTo);
        // Log the forwarding
        await admin.firestore().collection('twilioLogs').add({
            type: 'call_forwarded',
            from: from,
            forwardedTo: forwardTo,
            reason: dialStatus,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    else {
        // Call was handled or no forwarding number
        twiml.hangup();
    }
    res.type('text/xml');
    res.send(twiml.toString());
});
/**
 * Set the forwarding phone number
 */
exports.setForwardingNumber = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }
    // Check if user is admin
    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can set forwarding number');
    }
    const { phoneNumber } = data;
    if (!phoneNumber) {
        throw new functions.https.HttpsError('invalid-argument', 'Phone number required');
    }
    // Clean and validate the phone number
    let cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    if (!cleanNumber.startsWith('+')) {
        if (cleanNumber.length === 10) {
            cleanNumber = '+1' + cleanNumber;
        }
        else if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
            cleanNumber = '+' + cleanNumber;
        }
    }
    await admin.firestore().collection('settings').doc('twilio').set({
        forwardingNumber: cleanNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid,
    }, { merge: true });
    return { success: true, forwardingNumber: cleanNumber };
});
/**
 * Get the current forwarding settings
 */
exports.getForwardingSettings = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }
    const settingsDoc = await admin.firestore().collection('settings').doc('twilio').get();
    if (!settingsDoc.exists) {
        return { forwardingNumber: null };
    }
    return {
        forwardingNumber: ((_a = settingsDoc.data()) === null || _a === void 0 ? void 0 : _a.forwardingNumber) || null,
    };
});
/**
 * Get call recordings for a specific lead
 */
exports.getCallRecordings = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { leadId } = data;
    if (!leadId) {
        throw new functions.https.HttpsError('invalid-argument', 'Lead ID required');
    }
    // Get recordings associated with this lead's phone number
    const leadDoc = await admin.firestore().collection('salesLeads').doc(leadId).get();
    if (!leadDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Lead not found');
    }
    const lead = leadDoc.data();
    const phone = lead === null || lead === void 0 ? void 0 : lead.phone;
    if (!phone) {
        return { recordings: [] };
    }
    // Get recordings where the To number matches this lead's phone
    const recordings = await admin.firestore()
        .collection('callRecordings')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
    return {
        recordings: recordings.docs.map(doc => (Object.assign({ id: doc.id }, doc.data()))),
    };
});
//# sourceMappingURL=twilio.js.map