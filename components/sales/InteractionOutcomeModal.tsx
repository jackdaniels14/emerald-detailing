'use client';

import { useState } from 'react';
import { doc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SalesLead, PipelineStage, ActivityType } from '@/lib/sales-types';

export type InteractionType = 'call' | 'email' | 'meeting' | 'other';

export type InteractionOutcome =
  | 'no_answer'
  | 'voicemail'
  | 'callback'
  | 'interested'
  | 'not_interested'
  | 'meeting_booked'
  | 'proposal_sent'
  | 'sale_made'
  | 'wrong_number'
  | 'do_not_contact'
  | 'follow_up_needed'
  | 'email_sent'
  | 'email_opened'
  | 'email_replied';

interface OutcomeConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  nextStage?: PipelineStage;
  description: string;
  showForTypes: InteractionType[];
}

const OUTCOME_CONFIG: Record<InteractionOutcome, OutcomeConfig> = {
  // Call outcomes
  no_answer: {
    label: 'No Answer',
    icon: '📵',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    nextStage: 'contacted',
    description: 'No one picked up',
    showForTypes: ['call'],
  },
  voicemail: {
    label: 'Left Voicemail',
    icon: '📝',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    nextStage: 'contacted',
    description: 'Left a message',
    showForTypes: ['call'],
  },
  callback: {
    label: 'Call Back Later',
    icon: '🔄',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    nextStage: 'contacted',
    description: 'They asked to call back',
    showForTypes: ['call'],
  },
  wrong_number: {
    label: 'Wrong Number',
    icon: '❌',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    nextStage: 'contacted',
    description: 'Invalid contact info',
    showForTypes: ['call'],
  },

  // Positive outcomes (all types)
  interested: {
    label: 'Interested!',
    icon: '🔥',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    nextStage: 'contacted',
    description: 'Showed interest, follow up needed',
    showForTypes: ['call', 'email', 'meeting', 'other'],
  },
  meeting_booked: {
    label: 'Meeting Booked!',
    icon: '📅',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    nextStage: 'meeting',
    description: 'Scheduled a meeting/demo',
    showForTypes: ['call', 'email', 'meeting', 'other'],
  },
  proposal_sent: {
    label: 'Proposal Sent',
    icon: '📋',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    nextStage: 'proposal',
    description: 'Sent pricing/proposal',
    showForTypes: ['call', 'email', 'meeting', 'other'],
  },
  sale_made: {
    label: 'Sale Made!',
    icon: '🎉',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    nextStage: 'won',
    description: 'Closed the deal!',
    showForTypes: ['call', 'email', 'meeting', 'other'],
  },

  // Negative outcomes (all types)
  not_interested: {
    label: 'Not Interested',
    icon: '👎',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    nextStage: 'lost',
    description: 'Not interested at this time',
    showForTypes: ['call', 'email', 'meeting', 'other'],
  },
  do_not_contact: {
    label: 'Do Not Contact',
    icon: '🚫',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    nextStage: 'lost',
    description: 'Asked not to be contacted',
    showForTypes: ['call', 'email', 'meeting', 'other'],
  },

  // Neutral / Follow-up
  follow_up_needed: {
    label: 'Follow Up Needed',
    icon: '📌',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    nextStage: 'contacted',
    description: 'Need to follow up later',
    showForTypes: ['call', 'email', 'meeting', 'other'],
  },

  // Email specific
  email_sent: {
    label: 'Email Sent',
    icon: '✉️',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    nextStage: 'contacted',
    description: 'Email was sent successfully',
    showForTypes: ['email'],
  },
  email_opened: {
    label: 'Email Opened',
    icon: '👀',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
    nextStage: 'contacted',
    description: 'They opened the email',
    showForTypes: ['email'],
  },
  email_replied: {
    label: 'Email Replied',
    icon: '💬',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    nextStage: 'contacted',
    description: 'Got a reply',
    showForTypes: ['email'],
  },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: SalesLead;
  interactionType: InteractionType;
  duration?: number; // For calls, in seconds
  userId: string;
  onComplete?: (outcome: InteractionOutcome, newStage?: PipelineStage) => void;
}

export default function InteractionOutcomeModal({
  isOpen,
  onClose,
  lead,
  interactionType,
  duration,
  userId,
  onComplete,
}: Props) {
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<InteractionOutcome | null>(null);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const availableOutcomes = Object.entries(OUTCOME_CONFIG).filter(
    ([_, config]) => config.showForTypes.includes(interactionType)
  );

  // Group outcomes for better UX
  const positiveOutcomes = availableOutcomes.filter(([key]) =>
    ['interested', 'meeting_booked', 'proposal_sent', 'sale_made', 'email_replied', 'email_opened'].includes(key)
  );
  const neutralOutcomes = availableOutcomes.filter(([key]) =>
    ['no_answer', 'voicemail', 'callback', 'follow_up_needed', 'email_sent'].includes(key)
  );
  const negativeOutcomes = availableOutcomes.filter(([key]) =>
    ['not_interested', 'do_not_contact', 'wrong_number'].includes(key)
  );

  const handleOutcome = async (outcome: InteractionOutcome) => {
    setSaving(true);
    setSelectedOutcome(outcome);

    try {
      const outcomeConfig = OUTCOME_CONFIG[outcome];
      const updates: Record<string, any> = {
        lastContactedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Update stage if outcome specifies one
      if (outcomeConfig.nextStage) {
        updates.stage = outcomeConfig.nextStage;
      }

      // Set follow-up if provided
      if (followUpDate) {
        updates.nextFollowUpAt = Timestamp.fromDate(new Date(followUpDate));
      }

      // Update the lead
      await updateDoc(doc(db, 'salesLeads', lead.id), updates);

      // Log the activity
      const activityType: ActivityType = interactionType === 'call' ? 'call' : interactionType === 'email' ? 'email' : interactionType === 'meeting' ? 'meeting' : 'note';

      await addDoc(collection(db, 'leadActivities'), {
        leadId: lead.id,
        type: activityType,
        description: `${interactionType.charAt(0).toUpperCase() + interactionType.slice(1)}: ${outcomeConfig.label}${notes ? ` - ${notes}` : ''}`,
        outcome: outcome,
        duration: duration || null,
        createdBy: userId,
        createdAt: Timestamp.now(),
        scheduledFor: followUpDate ? Timestamp.fromDate(new Date(followUpDate)) : null,
      });

      // Callback to parent
      if (onComplete) {
        onComplete(outcome, outcomeConfig.nextStage);
      }

      // Reset and close
      setNotes('');
      setFollowUpDate('');
      setSelectedOutcome(null);
      onClose();

    } catch (error) {
      console.error('Error saving outcome:', error);
    } finally {
      setSaving(false);
    }
  };

  const getInteractionTitle = () => {
    switch (interactionType) {
      case 'call': return 'How did the call go?';
      case 'email': return 'What happened with the email?';
      case 'meeting': return 'How did the meeting go?';
      default: return 'What was the outcome?';
    }
  };

  const getInteractionIcon = () => {
    switch (interactionType) {
      case 'call': return '📞';
      case 'email': return '✉️';
      case 'meeting': return '🤝';
      default: return '📋';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-black bg-opacity-60 transition-opacity" />

        <div className="relative bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-auto p-6 text-white">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-4xl mb-2 block">{getInteractionIcon()}</span>
            <h2 className="text-2xl font-bold">{getInteractionTitle()}</h2>
            <p className="text-gray-400 mt-1">
              {lead.companyName} - {lead.contactName}
            </p>
            {duration !== undefined && duration > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Call duration: {formatDuration(duration)}
              </p>
            )}
          </div>

          {/* Positive Outcomes */}
          {positiveOutcomes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-green-400 font-semibold mb-2 uppercase tracking-wide">Positive Outcomes</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {positiveOutcomes.map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleOutcome(key as InteractionOutcome)}
                    disabled={saving}
                    className={`p-3 rounded-xl ${config.bgColor} ${config.color} hover:opacity-90 hover:scale-105 transition-all disabled:opacity-50 text-center ${
                      selectedOutcome === key ? 'ring-2 ring-white' : ''
                    }`}
                  >
                    <span className="text-xl block mb-1">{config.icon}</span>
                    <span className="text-xs font-medium block">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Neutral Outcomes */}
          {neutralOutcomes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">Neutral / Follow-up</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {neutralOutcomes.map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleOutcome(key as InteractionOutcome)}
                    disabled={saving}
                    className={`p-3 rounded-xl ${config.bgColor} ${config.color} hover:opacity-90 hover:scale-105 transition-all disabled:opacity-50 text-center ${
                      selectedOutcome === key ? 'ring-2 ring-white' : ''
                    }`}
                  >
                    <span className="text-xl block mb-1">{config.icon}</span>
                    <span className="text-xs font-medium block">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Negative Outcomes */}
          {negativeOutcomes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-red-400 font-semibold mb-2 uppercase tracking-wide">Negative Outcomes</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {negativeOutcomes.map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleOutcome(key as InteractionOutcome)}
                    disabled={saving}
                    className={`p-3 rounded-xl ${config.bgColor} ${config.color} hover:opacity-90 hover:scale-105 transition-all disabled:opacity-50 text-center ${
                      selectedOutcome === key ? 'ring-2 ring-white' : ''
                    }`}
                  >
                    <span className="text-xl block mb-1">{config.icon}</span>
                    <span className="text-xs font-medium block">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Additional Options */}
          <div className="border-t border-gray-700 pt-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Schedule Follow-up</label>
                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Quick note..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Auto-organization Info */}
          <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400">
              <span className="text-yellow-400">Auto-organize:</span> Selecting an outcome will automatically move this lead to the appropriate pipeline stage and log the activity.
            </p>
          </div>

          {/* Skip Button */}
          <div className="mt-4 text-center">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-sm"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
