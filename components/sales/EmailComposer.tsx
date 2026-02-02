'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { SalesLead } from '@/lib/sales-types';
import {
  EmailTemplate,
  DEFAULT_TEMPLATES,
  populateTemplate,
  generateMailtoLink,
} from '@/lib/email-templates';

interface EmailComposerProps {
  lead: SalesLead;
  isOpen: boolean;
  onClose: () => void;
  onEmailSent?: () => void;
}

export default function EmailComposer({ lead, isOpen, onClose, onEmailSent }: EmailComposerProps) {
  const { userProfile } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [to, setTo] = useState(lead.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Template variables
  const templateVariables: Record<string, string> = {
    contactName: lead.contactName,
    companyName: lead.companyName,
    senderName: userProfile?.firstName || 'Your Name',
    senderPhone: userProfile?.phone || '',
    meetingDate: '[DATE]',
    meetingTime: '[TIME]',
    meetingLocation: '[LOCATION]',
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setTo(lead.email || '');
    }
  }, [isOpen, lead.email]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const templatesRef = collection(db, 'emailTemplates');
      const snapshot = await getDocs(templatesRef);

      if (snapshot.empty) {
        // Use default templates if none exist
        const defaultWithIds = DEFAULT_TEMPLATES.map((t, i) => ({
          ...t,
          id: `default-${i}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as EmailTemplate[];
        setTemplates(defaultWithIds);
      } else {
        const templatesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as EmailTemplate[];
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Fallback to defaults
      const defaultWithIds = DEFAULT_TEMPLATES.map((t, i) => ({
        ...t,
        id: `default-${i}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as EmailTemplate[];
      setTemplates(defaultWithIds);
    } finally {
      setLoading(false);
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSubject(populateTemplate(template.subject, templateVariables));
      setBody(populateTemplate(template.body, templateVariables));
    }
  };

  const handleSend = async () => {
    if (!to || !subject) return;
    setSending(true);

    try {
      // Log the email activity
      await addDoc(collection(db, 'leadActivities'), {
        leadId: lead.id,
        type: 'email',
        description: `Email sent: "${subject}"`,
        createdBy: userProfile?.uid || 'unknown',
        createdAt: Timestamp.now(),
      });

      // Open email client with pre-filled content
      const mailtoLink = generateMailtoLink(to, subject, body);
      window.open(mailtoLink, '_blank');

      onEmailSent?.();
      onClose();
    } catch (error) {
      console.error('Error logging email:', error);
    } finally {
      setSending(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(body);
      alert('Email body copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Filter templates relevant to this lead type
  const relevantTemplates = templates.filter(t =>
    t.isActive && (!t.leadTypes || t.leadTypes.length === 0 || t.leadTypes.includes(lead.leadType))
  );

  const otherTemplates = templates.filter(t =>
    t.isActive && t.leadTypes && t.leadTypes.length > 0 && !t.leadTypes.includes(lead.leadType)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full mx-auto text-left overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Compose Email</h2>
                <p className="text-blue-100 text-sm">to {lead.contactName} at {lead.companyName}</p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Template Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose a Template</label>
              <div className="flex flex-wrap gap-2">
                {loading ? (
                  <div className="text-gray-500 text-sm">Loading templates...</div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedTemplateId('');
                        setSubject('');
                        setBody('');
                      }}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                        !selectedTemplateId
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      Blank
                    </button>
                    {relevantTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template.id)}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                          selectedTemplateId === template.id
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {template.name}
                      </button>
                    ))}
                    {otherTemplates.length > 0 && (
                      <div className="w-full mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Other templates:</p>
                        <div className="flex flex-wrap gap-2">
                          {otherTemplates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => handleTemplateSelect(template.id)}
                              className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                                selectedTemplateId === template.id
                                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {template.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Email Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email subject..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <button
                    onClick={handleCopyToClipboard}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Copy to clipboard
                  </button>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Write your email..."
                />
              </div>

              {/* Variable hints */}
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                <p className="font-medium mb-1">Available variables:</p>
                <p>{'{{contactName}}'} • {'{{companyName}}'} • {'{{senderName}}'} • {'{{senderPhone}}'} • {'{{meetingDate}}'} • {'{{meetingTime}}'}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleCopyToClipboard}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Copy Body
                </button>
                <button
                  onClick={handleSend}
                  disabled={!to || !subject || sending}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {sending ? 'Opening...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
