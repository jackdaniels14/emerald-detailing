'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { collection, getDocs, query, where, Timestamp, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useTwilio } from '@/lib/twilio-context';
import {
  SalesLead,
  LeadType,
  PipelineStage,
  CallScript,
  CallLog,
  LEAD_TYPE_CONFIG,
  PIPELINE_STAGE_CONFIG,
  TIER_CONFIG,
} from '@/lib/sales-types';
import EmailComposer from '@/components/sales/EmailComposer';
import InteractionOutcomeModal, { InteractionOutcome } from '@/components/sales/InteractionOutcomeModal';

// Default scripts - used as fallback when no custom scripts are configured
const DEFAULT_CALL_SCRIPTS: Record<LeadType, string> = {
  auto_shop: `Hi, may I speak with the owner or manager?

My name is [YOUR NAME] from Emerald Detailing. We partner with auto shops to provide professional detailing services for your customers' vehicles.

We can help you:
• Offer detailing as an add-on service to your customers
• Detail vehicles after repairs or maintenance
• Provide volume pricing for regular business

Would you have 10 minutes to discuss a potential partnership?`,

  body_shop: `Hi, may I speak with the shop manager?

My name is [YOUR NAME] from Emerald Detailing. We work with body shops to provide final detail services after repairs.

We help body shops like yours:
• Final detail before customer pickup
• Paint correction and polishing
• Interior deep cleaning after repairs

Do you currently have an in-house detailer or would you be open to discussing a partnership?`,

  turo_host: `Hi, is this [CONTACT NAME]?

Great! My name is [YOUR NAME] from Emerald Detailing. I noticed you're a Turo host and wanted to reach out because we specialize in keeping rental vehicles in top condition.

We work with several Turo hosts in the area and help them:
• Keep their vehicles spotless between rentals
• Maintain that 5-star cleanliness rating
• Quick turnaround times

Do you currently have a detailing service you work with?

[IF YES] How's that working out for you?
[IF NO] Would you be open to a quick 10-minute call to see if we might be a good fit?`,

  dealership: `Hi, may I speak with the Service Manager or someone who handles your detailing services?

My name is [YOUR NAME] from Emerald Detailing. We partner with dealerships to provide professional detailing services for their inventory and customer vehicles.

We currently work with [X] dealerships in the area and can help with:
• New vehicle prep and delivery details
• Used car reconditioning
• Customer detail services

Would you have 15 minutes this week to discuss how we might support your dealership?`,

  fleet: `Hi, is this [CONTACT NAME]?

My name is [YOUR NAME] from Emerald Detailing. I'm reaching out to fleet managers in the area because we offer volume detailing services specifically designed for commercial fleets.

We help companies like yours:
• Maintain professional vehicle appearance
• Flexible scheduling around your operations
• Volume pricing for regular service

How many vehicles are in your fleet currently?`,

  affiliate: `Hi [CONTACT NAME],

My name is [YOUR NAME] from Emerald Detailing. I wanted to reach out about a potential partnership opportunity.

We're looking for referral partners who work with vehicle owners and could benefit from offering detailing services to their clients.

Our affiliate program offers [X]% commission on referred business. Would you be interested in learning more?`,

  sales_rep: `Hi [CONTACT NAME],

My name is [YOUR NAME] from Emerald Detailing. I saw your profile and wanted to reach out about a sales opportunity.

We're expanding our team and looking for motivated sales professionals. Would you be open to a conversation about what we offer?`,

  cold_call: `Hi, is this [CONTACT NAME]?

My name is [YOUR NAME] from Emerald Detailing. We're a professional auto detailing service in your area.

I'm reaching out to introduce ourselves and see if you might be interested in our services. We offer everything from basic washes to full interior/exterior details.

Do you currently have a regular detailing service?`,

  custom: `Hi, is this [CONTACT NAME]?

My name is [YOUR NAME] from Emerald Detailing.

[CUSTOMIZE YOUR PITCH BASED ON THE LEAD TYPE]

Would you have a few minutes to chat?`,
};

export default function PowerDialerPage() {
  const { userProfile } = useAuth();
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get('phone');
  const nameParam = searchParams.get('name');

  const {
    isReady: twilioReady,
    isConnecting,
    isOnCall,
    isMuted,
    callDuration: twilioCallDuration,
    error: twilioError,
    makeCall,
    endCall: twilioEndCall,
    toggleMute,
    sendDigits
  } = useTwilio();
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOutcomePanel, setShowOutcomePanel] = useState(false);
  const [lastCallDuration, setLastCallDuration] = useState(0);
  const [filterType, setFilterType] = useState<LeadType | 'all'>('all');
  const [filterStage, setFilterStage] = useState<PipelineStage>('new');
  const [dialerStats, setDialerStats] = useState({ calls: 0, contacted: 0, booked: 0 });
  const [showScript, setShowScript] = useState(true);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showEmailOutcome, setShowEmailOutcome] = useState(false);
  const [showManualOutcome, setShowManualOutcome] = useState(false);
  const [manualInteractionType, setManualInteractionType] = useState<'call' | 'email' | 'meeting' | 'other'>('call');
  const [showDialpad, setShowDialpad] = useState(false);
  const [dialpadInput, setDialpadInput] = useState('');

  // Direct dial mode (when phone param is provided)
  const [directDialMode, setDirectDialMode] = useState(false);
  const [directDialPhone, setDirectDialPhone] = useState('');
  const [directDialName, setDirectDialName] = useState('');

  // Custom scripts from Firestore
  const [customScripts, setCustomScripts] = useState<CallScript[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);

  // Call tracking
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);

  // Claim timeout in milliseconds (5 minutes)
  const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

  // Load custom scripts from Firestore
  useEffect(() => {
    fetchCustomScripts();
  }, []);

  async function fetchCustomScripts() {
    try {
      const scriptsRef = collection(db, 'callScripts');
      const snapshot = await getDocs(scriptsRef);
      const scriptsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as CallScript[];
      setCustomScripts(scriptsData);
    } catch (error) {
      console.error('Error fetching custom scripts:', error);
    }
  }

  // Check if a lead's claim has expired
  function isClaimExpired(lead: SalesLead): boolean {
    if (!lead.dialerClaimedAt) return true;
    const claimedAt = lead.dialerClaimedAt instanceof Date
      ? lead.dialerClaimedAt
      : new Date((lead.dialerClaimedAt as any)?.seconds * 1000 || 0);
    return Date.now() - claimedAt.getTime() > CLAIM_TIMEOUT_MS;
  }

  // Check if a lead is available (not claimed by someone else)
  function isLeadAvailable(lead: SalesLead): boolean {
    if (!lead.dialerClaimedBy) return true;
    if (lead.dialerClaimedBy === userProfile?.uid) return true;
    return isClaimExpired(lead);
  }

  // Claim a lead for the current user
  async function claimLead(leadId: string) {
    if (!userProfile?.uid) return;
    try {
      await updateDoc(doc(db, 'salesLeads', leadId), {
        dialerClaimedBy: userProfile.uid,
        dialerClaimedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error claiming lead:', error);
    }
  }

  // Release a lead claim
  async function releaseLead(leadId: string) {
    try {
      await updateDoc(doc(db, 'salesLeads', leadId), {
        dialerClaimedBy: null,
        dialerClaimedAt: null
      });
    } catch (error) {
      console.error('Error releasing lead:', error);
    }
  }

  // Handle direct dial from phone param
  useEffect(() => {
    if (phoneParam) {
      setDirectDialMode(true);
      setDirectDialPhone(phoneParam);
      setDirectDialName(nameParam || 'Unknown');
      setLoading(false);
    } else {
      setDirectDialMode(false);
    }
  }, [phoneParam, nameParam]);

  // Real-time listener for leads
  useEffect(() => {
    if (phoneParam) return; // Skip if in direct dial mode

    setLoading(true);
    const leadsRef = collection(db, 'salesLeads');

    const unsubscribe = onSnapshot(leadsRef, (snapshot) => {
      let leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SalesLead[];

      // Filter by stage, type, and availability
      leadsData = leadsData.filter(lead => {
        if (!lead.isActive) return false;
        if (lead.stage !== filterStage) return false;
        if (filterType !== 'all' && lead.leadType !== filterType) return false;
        // Only show leads that are available (not claimed by others)
        if (!isLeadAvailable(lead)) return false;
        return true;
      });

      // Sort by tier (tier1 first) then by created date
      leadsData.sort((a, b) => {
        const tierOrder = { tier1: 0, tier2: 1, tier3: 2 };
        if (tierOrder[a.tier] !== tierOrder[b.tier]) {
          return tierOrder[a.tier] - tierOrder[b.tier];
        }
        const aDate = a.createdAt instanceof Date ? a.createdAt : new Date((a.createdAt as any)?.seconds * 1000 || 0);
        const bDate = b.createdAt instanceof Date ? b.createdAt : new Date((b.createdAt as any)?.seconds * 1000 || 0);
        return aDate.getTime() - bDate.getTime();
      });

      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to leads:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filterType, filterStage, phoneParam, userProfile?.uid]);

  // Claim the current lead when it changes
  useEffect(() => {
    const lead = leads[currentIndex];
    if (lead && userProfile?.uid) {
      claimLead(lead.id);
    }
  }, [currentIndex, leads, userProfile?.uid]);

  // Release claim when leaving the page
  useEffect(() => {
    return () => {
      const lead = leads[currentIndex];
      if (lead) {
        releaseLead(lead.id);
      }
    };
  }, []);

  // Refresh claim every 2 minutes to keep it active
  useEffect(() => {
    const lead = leads[currentIndex];
    if (!lead || !userProfile?.uid) return;

    const interval = setInterval(() => {
      claimLead(lead.id);
    }, 2 * 60 * 1000); // Refresh every 2 minutes

    return () => clearInterval(interval);
  }, [currentIndex, leads, userProfile?.uid]);

  // Reset selected script when lead changes
  useEffect(() => {
    setSelectedScriptId(null);
  }, [currentIndex]);

  // Show outcome panel when call ends
  useEffect(() => {
    if (!isOnCall && !isConnecting && lastCallDuration === 0 && twilioCallDuration > 0) {
      // Call just ended
      setLastCallDuration(twilioCallDuration);
      setShowOutcomePanel(true);
      setDialerStats(prev => ({ ...prev, calls: prev.calls + 1 }));
    }
  }, [isOnCall, isConnecting, twilioCallDuration, lastCallDuration]);

  const currentLead = leads[currentIndex];

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startCall = async () => {
    if (!currentLead?.phone) return;
    setLastCallDuration(0);
    setCallStartTime(new Date());
    await makeCall(currentLead.phone);
  };

  const startDirectCall = async () => {
    if (!directDialPhone) return;
    setLastCallDuration(0);
    setCallStartTime(new Date());
    await makeCall(directDialPhone);
  };

  // Log a call to the callLogs collection
  function logCall(lead: SalesLead, outcome: string, duration: number, startTime: Date | null, newStage?: PipelineStage) {
    if (!lead || !userProfile) return;

    const now = new Date();
    // Fire and forget - don't await
    addDoc(collection(db, 'callLogs'), {
      leadId: lead.id,
      leadName: lead.companyName || lead.contactName,
      phoneNumber: lead.phone || '',
      callerId: userProfile.uid,
      callerName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.email || 'Unknown',
      duration: duration,
      outcome: outcome,
      leadType: lead.leadType,
      leadStage: lead.stage,
      newStage: newStage || null,
      startedAt: startTime || now,
      endedAt: now,
      createdAt: serverTimestamp()
    }).catch(error => {
      console.error('Error logging call:', error);
    });
  }

  const endCall = () => {
    twilioEndCall();
  };

  const handleOutcomeComplete = (outcome: InteractionOutcome, newStage?: PipelineStage) => {
    // Capture current state before any changes
    const leadToLog = currentLead;
    const durationToLog = lastCallDuration;
    const startTimeToLog = callStartTime;

    // Update stats based on outcome
    const positiveOutcomes = ['interested', 'meeting_booked', 'proposal_sent', 'sale_made', 'email_replied'];
    const bookedOutcomes = ['meeting_booked', 'sale_made'];

    if (positiveOutcomes.includes(outcome)) {
      setDialerStats(prev => ({ ...prev, contacted: prev.contacted + 1 }));
    }
    if (bookedOutcomes.includes(outcome)) {
      setDialerStats(prev => ({ ...prev, booked: prev.booked + 1 }));
    }

    // Log the call with captured data
    if (leadToLog) {
      logCall(leadToLog, outcome, durationToLog, startTimeToLog, newStage);
      // Release the lead claim (non-blocking)
      releaseLead(leadToLog.id);
    }

    // Reset state
    setShowOutcomePanel(false);
    setLastCallDuration(0);
    setCallStartTime(null);

    // Move to next lead (real-time listener will handle removal if stage changed)
    setCurrentIndex(prev => Math.min(prev + 1, leads.length - 1));
  };

  const handleEmailOutcomeComplete = (outcome: InteractionOutcome, newStage?: PipelineStage) => {
    setShowEmailOutcome(false);
    setDialerStats(prev => ({ ...prev, contacted: prev.contacted + 1 }));

    // Release the lead claim (non-blocking)
    if (currentLead) {
      releaseLead(currentLead.id);
    }
  };

  const handleManualOutcomeComplete = (outcome: InteractionOutcome, newStage?: PipelineStage) => {
    // Capture current lead before any changes
    const leadToLog = currentLead;

    // Update stats based on outcome
    const positiveOutcomes = ['interested', 'meeting_booked', 'proposal_sent', 'sale_made', 'email_replied'];
    const bookedOutcomes = ['meeting_booked', 'sale_made'];

    setDialerStats(prev => ({ ...prev, calls: prev.calls + 1 }));

    if (positiveOutcomes.includes(outcome)) {
      setDialerStats(prev => ({ ...prev, contacted: prev.contacted + 1 }));
    }
    if (bookedOutcomes.includes(outcome)) {
      setDialerStats(prev => ({ ...prev, booked: prev.booked + 1 }));
    }

    // Log the manual call with captured data (duration 0 for manual logs)
    if (leadToLog) {
      logCall(leadToLog, outcome, 0, null, newStage);
      // Release the lead claim (non-blocking)
      releaseLead(leadToLog.id);
    }

    setShowManualOutcome(false);

    // Move to next lead (real-time listener will handle removal if stage changed)
    setCurrentIndex(prev => Math.min(prev + 1, leads.length - 1));
  };

  const skipLead = () => {
    // Release current lead (non-blocking) before moving to next
    if (currentLead) {
      releaseLead(currentLead.id);
    }
    setCurrentIndex(prev => Math.min(prev + 1, leads.length - 1));
  };

  const previousLead = () => {
    // Release current lead (non-blocking) before moving to previous
    if (currentLead) {
      releaseLead(currentLead.id);
    }
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  // Get available scripts for current lead type
  const getAvailableScripts = () => {
    if (!currentLead) return [];
    return customScripts.filter(s => s.leadType === currentLead.leadType);
  };

  const getScript = () => {
    if (!currentLead) return '';

    let script = '';

    // Check if a specific script is selected
    if (selectedScriptId) {
      const selectedScript = customScripts.find(s => s.id === selectedScriptId);
      if (selectedScript) {
        script = selectedScript.content;
      }
    }

    // If no script selected, try to find a default custom script for this lead type
    if (!script) {
      const defaultScript = customScripts.find(
        s => s.leadType === currentLead.leadType && s.isDefault
      );
      if (defaultScript) {
        script = defaultScript.content;
      }
    }

    // Fall back to built-in default scripts
    if (!script) {
      script = DEFAULT_CALL_SCRIPTS[currentLead.leadType] || DEFAULT_CALL_SCRIPTS.cold_call;
    }

    // Replace placeholders
    script = script.replace(/\[CONTACT NAME\]/g, currentLead.contactName);
    script = script.replace(/\[YOUR NAME\]/g, userProfile?.firstName || 'there');
    return script;
  };

  const handleDialpadPress = (digit: string) => {
    sendDigits(digit);
    setDialpadInput(prev => prev + digit);
  };

  const clearDialpadInput = () => {
    setDialpadInput('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/admin/sales" className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold">Power Dialer</h1>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value as PipelineStage)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="new">New Leads</option>
              <option value="contacted">Contacted</option>
              <option value="meeting">Meeting Set</option>
              <option value="proposal">Proposal</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as LeadType | 'all')}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              {Object.entries(LEAD_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{dialerStats.calls}</p>
              <p className="text-xs text-gray-400">Calls</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">{dialerStats.contacted}</p>
              <p className="text-xs text-gray-400">Contacted</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{dialerStats.booked}</p>
              <p className="text-xs text-gray-400">Booked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Dial Mode */}
      {directDialMode ? (
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-gray-800 rounded-2xl p-8 text-center">
            <div className="mb-6">
              <Link href="/admin/sales/dialer" className="text-gray-400 hover:text-white text-sm flex items-center justify-center gap-1 mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Power Dialer
              </Link>
              <h2 className="text-2xl font-bold mb-2">Direct Call</h2>
              <p className="text-gray-400">{directDialName}</p>
              <p className="text-3xl font-mono mt-2">{directDialPhone}</p>
            </div>

            {/* Twilio Status */}
            {twilioError && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm">
                {twilioError}
              </div>
            )}

            {!twilioReady && !twilioError && (
              <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-500 rounded-lg text-yellow-300 text-sm flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-300 border-t-transparent"></div>
                Connecting to phone system...
              </div>
            )}

            {/* Call Button */}
            {!isOnCall && !isConnecting && (
              <button
                onClick={startDirectCall}
                disabled={!twilioReady}
                className="w-full py-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-2xl text-2xl font-bold flex items-center justify-center gap-3 transition-all"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {twilioReady ? 'Call Now' : 'Connecting...'}
              </button>
            )}

            {/* Connecting UI */}
            {isConnecting && (
              <div className="text-center py-8">
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600/20 border border-yellow-500 rounded-full">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
                    <span className="text-yellow-400 font-medium">Connecting...</span>
                  </div>
                </div>
                <p className="text-gray-400">Dialing {directDialPhone}</p>
              </div>
            )}

            {/* Active Call UI */}
            {isOnCall && (
              <div className="text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500 rounded-full">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-green-400 font-medium">Call in progress</span>
                  </div>
                </div>
                <p className="text-5xl font-mono font-bold mb-6">{formatDuration(twilioCallDuration)}</p>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition-all ${isMuted ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => setShowDialpad(!showDialpad)}
                    className={`p-4 rounded-full transition-all ${showDialpad ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title="Dial Pad (for extensions)"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 18h.01M16 18h.01M12 14h.01M8 14h.01M16 14h.01M12 10h.01M8 10h.01M16 10h.01M12 6h.01" />
                    </svg>
                  </button>
                  <button
                    onClick={endCall}
                    className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.28 3H5z" />
                    </svg>
                    End Call
                  </button>
                </div>

                {/* Dial Pad for direct dial */}
                {showDialpad && (
                  <div className="mt-4 bg-gray-700/50 rounded-2xl p-4 max-w-xs mx-auto">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Dial Pad</p>
                      {dialpadInput && (
                        <button onClick={clearDialpadInput} className="text-xs text-gray-400 hover:text-white">Clear</button>
                      )}
                    </div>
                    {dialpadInput && (
                      <div className="bg-gray-800 rounded-lg px-3 py-2 mb-3 font-mono text-lg text-center">{dialpadInput}</div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                        <button
                          key={digit}
                          onClick={() => handleDialpadPress(digit)}
                          className="p-4 bg-gray-600 hover:bg-gray-500 rounded-xl text-xl font-bold transition-all active:scale-95"
                        >
                          {digit}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center">Press numbers to send tones</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
          <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-400 mb-2">No leads to call</h2>
          <p className="text-gray-500 mb-4">All caught up! Try changing your filters or import more leads.</p>
          <Link
            href="/admin/sales/leads/import"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Import Leads
          </Link>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto p-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Lead {currentIndex + 1} of {leads.length}</span>
              <span>{Math.round(((currentIndex + 1) / leads.length) * 100)}% complete</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${((currentIndex + 1) / leads.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lead Info Card */}
            <div className="lg:col-span-2">
              {currentLead && (
                <div className="bg-gray-800 rounded-2xl p-6">
                  {/* Lead Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold">{currentLead.companyName}</h2>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${TIER_CONFIG[currentLead.tier].bgColor} ${TIER_CONFIG[currentLead.tier].color}`}>
                          {TIER_CONFIG[currentLead.tier].label}
                        </span>
                      </div>
                      <p className="text-gray-400">{currentLead.contactName}</p>
                      <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${LEAD_TYPE_CONFIG[currentLead.leadType].bgColor} ${LEAD_TYPE_CONFIG[currentLead.leadType].color}`}>
                        {currentLead.leadType === 'custom' && currentLead.customLeadType ? currentLead.customLeadType : LEAD_TYPE_CONFIG[currentLead.leadType].label}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={previousLead}
                        disabled={currentIndex === 0}
                        className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={skipLead}
                        disabled={currentIndex === leads.length - 1}
                        className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Phone</p>
                      <p className="text-xl font-semibold">{currentLead.phone || 'No phone'}</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4 relative">
                      <p className="text-sm text-gray-400 mb-1">Email</p>
                      {currentLead.email && (
                        <button
                          onClick={() => setShowEmailComposer(true)}
                          className="absolute top-3 right-3 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          title="Send Email"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                      <p className="text-lg truncate">{currentLead.email || 'No email'}</p>
                    </div>
                    {currentLead.city && (
                      <div className="bg-gray-700/50 rounded-xl p-4">
                        <p className="text-sm text-gray-400 mb-1">Location</p>
                        <p className="text-lg">{currentLead.city}, {currentLead.state}</p>
                      </div>
                    )}
                    {currentLead.vehicleCount && currentLead.vehicleCount > 0 && (
                      <div className="bg-gray-700/50 rounded-xl p-4">
                        <p className="text-sm text-gray-400 mb-1">Vehicles</p>
                        <p className="text-lg">{currentLead.vehicleCount}</p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {currentLead.notes && (
                    <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
                      <p className="text-sm text-gray-400 mb-1">Notes</p>
                      <p className="text-gray-300">{currentLead.notes}</p>
                    </div>
                  )}

                  {/* Twilio Status */}
                  {twilioError && (
                    <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm">
                      {twilioError}
                    </div>
                  )}

                  {!twilioReady && !twilioError && (
                    <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-500 rounded-lg text-yellow-300 text-sm flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-300 border-t-transparent"></div>
                      Connecting to phone system...
                    </div>
                  )}

                  {/* Call Button and Log Interaction */}
                  {!isOnCall && !isConnecting && !showOutcomePanel && (
                    <div className="space-y-3">
                      <button
                        onClick={startCall}
                        disabled={!currentLead.phone || !twilioReady}
                        className="w-full py-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-2xl text-2xl font-bold flex items-center justify-center gap-3 transition-all"
                      >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {twilioReady ? 'Start Call' : 'Connecting...'}
                      </button>

                      {/* Log Interaction Button */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setManualInteractionType('call'); setShowManualOutcome(true); }}
                          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                        >
                          <span>📞</span> Log Call
                        </button>
                        <button
                          onClick={() => { setManualInteractionType('email'); setShowManualOutcome(true); }}
                          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                        >
                          <span>✉️</span> Log Email
                        </button>
                        <button
                          onClick={() => { setManualInteractionType('meeting'); setShowManualOutcome(true); }}
                          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                        >
                          <span>🤝</span> Log Meeting
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Connecting UI */}
                  {isConnecting && (
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600/20 border border-yellow-500 rounded-full">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
                          <span className="text-yellow-400 font-medium">Connecting...</span>
                        </div>
                      </div>
                      <p className="text-gray-400">Dialing {currentLead.phone}</p>
                    </div>
                  )}

                  {/* Active Call UI */}
                  {isOnCall && (
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500 rounded-full">
                          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                          <span className="text-green-400 font-medium">Call in progress</span>
                        </div>
                      </div>
                      <p className="text-5xl font-mono font-bold mb-6">{formatDuration(twilioCallDuration)}</p>

                      {/* Dial Pad Toggle and Controls */}
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <button
                          onClick={toggleMute}
                          className={`p-4 rounded-full transition-all ${isMuted ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                          title={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => setShowDialpad(!showDialpad)}
                          className={`p-4 rounded-full transition-all ${showDialpad ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                          title="Dial Pad (for extensions)"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 18h.01M16 18h.01M12 14h.01M8 14h.01M16 14h.01M12 10h.01M8 10h.01M16 10h.01M12 6h.01" />
                          </svg>
                        </button>
                        <button
                          onClick={endCall}
                          className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 transition-all"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.28 3H5z" />
                          </svg>
                          End Call
                        </button>
                      </div>

                      {/* Dial Pad */}
                      {showDialpad && (
                        <div className="mt-4 bg-gray-700/50 rounded-2xl p-4 max-w-xs mx-auto">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Dial Pad</p>
                            {dialpadInput && (
                              <button
                                onClick={clearDialpadInput}
                                className="text-xs text-gray-400 hover:text-white"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          {dialpadInput && (
                            <div className="bg-gray-800 rounded-lg px-3 py-2 mb-3 font-mono text-lg text-center">
                              {dialpadInput}
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-2">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                              <button
                                key={digit}
                                onClick={() => handleDialpadPress(digit)}
                                className="p-4 bg-gray-600 hover:bg-gray-500 rounded-xl text-xl font-bold transition-all active:scale-95"
                              >
                                {digit}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-3 text-center">
                            Press numbers to send tones
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Outcome Panel - Now shows a prompt to open modal */}
                  {showOutcomePanel && (
                    <div className="text-center py-4">
                      <p className="text-lg text-gray-300 mb-2">Call ended after {formatDuration(lastCallDuration)}</p>
                      <p className="text-gray-400 text-sm">Select an outcome to organize this lead</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Call Script Panel */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-2xl p-6 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Call Script</h3>
                  <button
                    onClick={() => setShowScript(!showScript)}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    {showScript ? 'Hide' : 'Show'}
                  </button>
                </div>

                {/* Script Selector */}
                {showScript && getAvailableScripts().length > 0 && (
                  <div className="mb-4">
                    <select
                      value={selectedScriptId || ''}
                      onChange={(e) => setSelectedScriptId(e.target.value || null)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">
                        {customScripts.find(s => s.leadType === currentLead?.leadType && s.isDefault)
                          ? 'Default Script'
                          : 'Built-in Script'}
                      </option>
                      {getAvailableScripts().map(script => (
                        <option key={script.id} value={script.id}>
                          {script.name} {script.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {showScript && (
                  <pre className="text-sm text-gray-300 leading-relaxed max-h-[60vh] overflow-y-auto font-sans whitespace-pre-wrap break-words">
                    {getScript()}
                  </pre>
                )}

                {/* Link to manage scripts */}
                {showScript && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <Link
                      href="/admin/sales/settings"
                      className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Manage Scripts
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Composer */}
      {currentLead && (
        <EmailComposer
          lead={currentLead}
          isOpen={showEmailComposer}
          onClose={() => setShowEmailComposer(false)}
          onEmailSent={() => {
            setShowEmailComposer(false);
            setShowEmailOutcome(true);
          }}
        />
      )}

      {/* Call Outcome Modal */}
      {currentLead && (
        <InteractionOutcomeModal
          isOpen={showOutcomePanel}
          onClose={() => {
            setShowOutcomePanel(false);
            setLastCallDuration(0);
            setCurrentIndex(prev => Math.min(prev + 1, leads.length - 1));
          }}
          lead={currentLead}
          interactionType="call"
          duration={lastCallDuration}
          userId={userProfile?.uid || 'unknown'}
          onComplete={handleOutcomeComplete}
        />
      )}

      {/* Email Outcome Modal */}
      {currentLead && (
        <InteractionOutcomeModal
          isOpen={showEmailOutcome}
          onClose={() => setShowEmailOutcome(false)}
          lead={currentLead}
          interactionType="email"
          userId={userProfile?.uid || 'unknown'}
          onComplete={handleEmailOutcomeComplete}
        />
      )}

      {/* Manual Interaction Outcome Modal */}
      {currentLead && (
        <InteractionOutcomeModal
          isOpen={showManualOutcome}
          onClose={() => setShowManualOutcome(false)}
          lead={currentLead}
          interactionType={manualInteractionType}
          userId={userProfile?.uid || 'unknown'}
          onComplete={handleManualOutcomeComplete}
        />
      )}
    </div>
  );
}
