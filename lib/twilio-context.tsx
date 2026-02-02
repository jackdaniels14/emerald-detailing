'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from './auth-context';

// Twilio Device type (loaded dynamically)
type TwilioDevice = any;
type TwilioCall = any;

interface TwilioContextType {
  isReady: boolean;
  isConnecting: boolean;
  isOnCall: boolean;
  isMuted: boolean;
  callDuration: number;
  currentCallTo: string | null;
  error: string | null;
  // Incoming call support
  hasIncomingCall: boolean;
  incomingCallFrom: string | null;
  makeCall: (phoneNumber: string) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  sendDigits: (digits: string) => void;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
}

const TwilioContext = createContext<TwilioContextType | null>(null);

export function TwilioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [device, setDevice] = useState<TwilioDevice | null>(null);
  const [currentCall, setCurrentCall] = useState<TwilioCall | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOnCall, setIsOnCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentCallTo, setCurrentCallTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  // Incoming call state
  const [incomingCall, setIncomingCall] = useState<TwilioCall | null>(null);
  const [hasIncomingCall, setHasIncomingCall] = useState(false);
  const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);

  // Duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOnCall && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((new Date().getTime() - callStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOnCall, callStartTime]);

  // Initialize Twilio Device when user is logged in
  useEffect(() => {
    if (!user) {
      setDevice(null);
      setIsReady(false);
      return;
    }

    initializeTwilio();
  }, [user]);

  const initializeTwilio = async () => {
    try {
      setError(null);

      // Dynamically import Twilio SDK
      const { Device } = await import('@twilio/voice-sdk');

      // Get token from Cloud Function
      const functions = getFunctions();
      const getTwilioToken = httpsCallable(functions, 'getTwilioToken');
      const result = await getTwilioToken();
      const { token } = result.data as { token: string; identity: string };

      // Create device
      const twilioDevice = new Device(token, {
        logLevel: 1,
      });

      // Set up event handlers
      twilioDevice.on('registered', () => {
        console.log('Twilio Device registered');
        setIsReady(true);
      });

      twilioDevice.on('error', (err: any) => {
        console.error('Twilio Device error:', err);
        setError(err.message || 'Twilio error occurred');
      });

      twilioDevice.on('incoming', (call: TwilioCall) => {
        console.log('Incoming call from:', call.parameters.From);

        // Store the incoming call
        setIncomingCall(call);
        setHasIncomingCall(true);
        setIncomingCallFrom(call.parameters.From || 'Unknown');

        // Play ringtone notification
        try {
          const audio = new Audio('/sounds/ringtone.mp3');
          audio.loop = true;
          audio.play().catch(() => {});
          (call as any)._ringtoneAudio = audio;
        } catch (e) {
          console.log('Could not play ringtone');
        }

        // Set up call event handlers
        call.on('cancel', () => {
          console.log('Incoming call cancelled');
          stopRingtone(call);
          setIncomingCall(null);
          setHasIncomingCall(false);
          setIncomingCallFrom(null);
        });

        call.on('disconnect', () => {
          console.log('Call disconnected');
          stopRingtone(call);
          setIsOnCall(false);
          setIncomingCall(null);
          setHasIncomingCall(false);
          setIncomingCallFrom(null);
          setCurrentCall(null);
          setCallStartTime(null);
          setCallDuration(0);
          setIsMuted(false);
        });

        call.on('error', (err: any) => {
          console.error('Incoming call error:', err);
          stopRingtone(call);
          setError(err.message || 'Call failed');
          setIncomingCall(null);
          setHasIncomingCall(false);
        });
      });

      const stopRingtone = (call: TwilioCall) => {
        try {
          const audio = (call as any)._ringtoneAudio;
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
          }
        } catch (e) {}
      };

      // Register the device
      await twilioDevice.register();
      setDevice(twilioDevice);

    } catch (err: any) {
      console.error('Failed to initialize Twilio:', err);
      setError(err.message || 'Failed to initialize calling');
      setIsReady(false);
    }
  };

  const makeCall = useCallback(async (phoneNumber: string) => {
    if (!device || !isReady) {
      setError('Calling not available. Please refresh the page.');
      return;
    }

    try {
      setError(null);
      setIsConnecting(true);
      setCurrentCallTo(phoneNumber);

      // Clean the phone number
      let cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      if (!cleanNumber.startsWith('+')) {
        // Assume US number if no country code
        if (cleanNumber.length === 10) {
          cleanNumber = '+1' + cleanNumber;
        } else if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
          cleanNumber = '+' + cleanNumber;
        }
      }

      // Make the call
      const call = await device.connect({
        params: {
          To: cleanNumber,
        },
      });

      setCurrentCall(call);

      // Set up call event handlers
      call.on('accept', () => {
        console.log('Call accepted');
        setIsConnecting(false);
        setIsOnCall(true);
        setCallStartTime(new Date());
      });

      call.on('disconnect', () => {
        console.log('Call disconnected');
        setIsOnCall(false);
        setIsConnecting(false);
        setCurrentCall(null);
        setCurrentCallTo(null);
        setCallStartTime(null);
        setCallDuration(0);
        setIsMuted(false);
      });

      call.on('cancel', () => {
        console.log('Call cancelled');
        setIsOnCall(false);
        setIsConnecting(false);
        setCurrentCall(null);
        setCurrentCallTo(null);
      });

      call.on('error', (err: any) => {
        console.error('Call error:', err);
        setError(err.message || 'Call failed');
        setIsOnCall(false);
        setIsConnecting(false);
        setCurrentCall(null);
      });

    } catch (err: any) {
      console.error('Failed to make call:', err);
      setError(err.message || 'Failed to make call');
      setIsConnecting(false);
    }
  }, [device, isReady]);

  const endCall = useCallback(() => {
    if (currentCall) {
      currentCall.disconnect();
    }
  }, [currentCall]);

  const toggleMute = useCallback(() => {
    if (currentCall) {
      if (isMuted) {
        currentCall.mute(false);
      } else {
        currentCall.mute(true);
      }
      setIsMuted(!isMuted);
    }
  }, [currentCall, isMuted]);

  const sendDigits = useCallback((digits: string) => {
    if (currentCall && isOnCall) {
      currentCall.sendDigits(digits);
    }
  }, [currentCall, isOnCall]);

  const acceptIncomingCall = useCallback(() => {
    if (incomingCall) {
      // Stop ringtone
      try {
        const audio = (incomingCall as any)._ringtoneAudio;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      } catch (e) {}

      incomingCall.accept();
      setCurrentCall(incomingCall);
      setIsOnCall(true);
      setHasIncomingCall(false);
      setCallStartTime(new Date());
      setCurrentCallTo(incomingCallFrom);
    }
  }, [incomingCall, incomingCallFrom]);

  const rejectIncomingCall = useCallback(() => {
    if (incomingCall) {
      // Stop ringtone
      try {
        const audio = (incomingCall as any)._ringtoneAudio;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      } catch (e) {}

      incomingCall.reject();
      setIncomingCall(null);
      setHasIncomingCall(false);
      setIncomingCallFrom(null);
    }
  }, [incomingCall]);

  return (
    <TwilioContext.Provider
      value={{
        isReady,
        isConnecting,
        isOnCall,
        isMuted,
        callDuration,
        currentCallTo,
        error,
        hasIncomingCall,
        incomingCallFrom,
        makeCall,
        endCall,
        toggleMute,
        sendDigits,
        acceptIncomingCall,
        rejectIncomingCall,
      }}
    >
      {children}
    </TwilioContext.Provider>
  );
}

export function useTwilio() {
  const context = useContext(TwilioContext);
  if (!context) {
    throw new Error('useTwilio must be used within a TwilioProvider');
  }
  return context;
}
