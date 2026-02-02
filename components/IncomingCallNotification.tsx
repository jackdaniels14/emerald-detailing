'use client';

import { useTwilio } from '@/lib/twilio-context';
import { useRouter } from 'next/navigation';

export default function IncomingCallNotification() {
  const {
    hasIncomingCall,
    incomingCallFrom,
    acceptIncomingCall,
    rejectIncomingCall,
  } = useTwilio();
  const router = useRouter();

  if (!hasIncomingCall) return null;

  const handleAccept = () => {
    acceptIncomingCall();
    // Navigate to dialer if not already there
    router.push('/admin/sales/dialer');
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return 'Unknown';
    // Basic formatting for US numbers
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
      <div className="bg-gray-800 rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-pulse-slow">
        {/* Incoming call animation */}
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center animate-ping-slow">
            <div className="w-16 h-16 bg-green-500/40 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
        </div>

        <p className="text-gray-400 text-sm uppercase tracking-wide mb-2">Incoming Call</p>
        <p className="text-white text-2xl font-bold mb-1">{formatPhoneNumber(incomingCallFrom)}</p>
        <p className="text-gray-500 text-sm mb-8">Callback from lead</p>

        {/* Action buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={rejectIncomingCall}
            className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all shadow-lg"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.28 3H5z" />
            </svg>
          </button>
          <button
            onClick={handleAccept}
            className="w-16 h-16 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition-all shadow-lg animate-bounce"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        </div>

        <p className="text-gray-500 text-xs mt-6">
          Will forward to your phone if not answered
        </p>
      </div>

      <style jsx>{`
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.9;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
