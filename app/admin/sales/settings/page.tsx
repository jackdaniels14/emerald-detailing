'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { useAuth, isAdmin } from '@/lib/auth-context';
import { CallScript, LeadType, LEAD_TYPE_CONFIG } from '@/lib/sales-types';

export default function SalesSettingsPage() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [twilioConfigured, setTwilioConfigured] = useState(false);
  const [forwardingNumber, setForwardingNumber] = useState('');
  const [forwardingNumberInput, setForwardingNumberInput] = useState('');

  // Script management state
  const [scripts, setScripts] = useState<CallScript[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [editingScript, setEditingScript] = useState<CallScript | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptForm, setScriptForm] = useState({
    name: '',
    leadType: 'cold_call' as LeadType,
    content: '',
    isDefault: false
  });
  const [scriptSaving, setScriptSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is admin
  const canAccessSettings = userProfile?.role && isAdmin(userProfile.role);

  useEffect(() => {
    checkTwilioStatus();
    loadForwardingSettings();
    loadScripts();
  }, []);

  async function checkTwilioStatus() {
    try {
      const configDoc = await getDoc(doc(db, 'settings', 'twilio'));
      setTwilioConfigured(configDoc.exists() && configDoc.data()?.isConfigured === true);
    } catch (error) {
      console.error('Error checking Twilio status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadForwardingSettings() {
    try {
      const functions = getFunctions();
      const getSettings = httpsCallable(functions, 'getForwardingSettings');
      const result = await getSettings();
      const data = result.data as { forwardingNumber: string | null };
      if (data.forwardingNumber) {
        setForwardingNumber(data.forwardingNumber);
        setForwardingNumberInput(data.forwardingNumber);
      }
    } catch (err) {
      console.error('Error loading forwarding settings:', err);
    }
  }

  async function saveForwardingNumber() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const functions = getFunctions();
      const setForwarding = httpsCallable(functions, 'setForwardingNumber');
      const result = await setForwarding({ phoneNumber: forwardingNumberInput });
      const data = result.data as { forwardingNumber: string };
      setForwardingNumber(data.forwardingNumber);
      setSuccess('Forwarding number saved successfully!');
    } catch (err: any) {
      console.error('Error saving forwarding number:', err);
      setError(err.message || 'Failed to save forwarding number');
    } finally {
      setSaving(false);
    }
  }

  // Script management functions
  async function loadScripts() {
    setScriptsLoading(true);
    try {
      const scriptsRef = collection(db, 'callScripts');
      const snapshot = await getDocs(scriptsRef);
      const scriptsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as CallScript[];
      setScripts(scriptsData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading scripts:', error);
    } finally {
      setScriptsLoading(false);
    }
  }

  function openNewScriptModal() {
    setEditingScript(null);
    setScriptForm({
      name: '',
      leadType: 'cold_call',
      content: '',
      isDefault: false
    });
    setShowScriptModal(true);
  }

  function openEditScriptModal(script: CallScript) {
    setEditingScript(script);
    setScriptForm({
      name: script.name,
      leadType: script.leadType,
      content: script.content,
      isDefault: script.isDefault
    });
    setShowScriptModal(true);
  }

  async function saveScript() {
    if (!scriptForm.name.trim() || !scriptForm.content.trim()) {
      setError('Script name and content are required');
      return;
    }

    setScriptSaving(true);
    setError('');

    try {
      const now = Timestamp.now();

      // If setting as default, unset other defaults for this lead type
      if (scriptForm.isDefault) {
        const existingDefaults = scripts.filter(
          s => s.leadType === scriptForm.leadType && s.isDefault && s.id !== editingScript?.id
        );
        for (const s of existingDefaults) {
          await updateDoc(doc(db, 'callScripts', s.id), { isDefault: false });
        }
      }

      if (editingScript) {
        // Update existing script
        await updateDoc(doc(db, 'callScripts', editingScript.id), {
          name: scriptForm.name.trim(),
          leadType: scriptForm.leadType,
          content: scriptForm.content,
          isDefault: scriptForm.isDefault,
          updatedAt: now
        });
        setSuccess('Script updated successfully!');
      } else {
        // Create new script
        await addDoc(collection(db, 'callScripts'), {
          name: scriptForm.name.trim(),
          leadType: scriptForm.leadType,
          content: scriptForm.content,
          isDefault: scriptForm.isDefault,
          createdAt: now,
          updatedAt: now,
          createdBy: userProfile?.uid || 'unknown'
        });
        setSuccess('Script created successfully!');
      }

      setShowScriptModal(false);
      loadScripts();
    } catch (err: any) {
      console.error('Error saving script:', err);
      setError(err.message || 'Failed to save script');
    } finally {
      setScriptSaving(false);
    }
  }

  async function deleteScript(scriptId: string) {
    if (!confirm('Are you sure you want to delete this script?')) return;

    try {
      await deleteDoc(doc(db, 'callScripts', scriptId));
      setSuccess('Script deleted successfully!');
      loadScripts();
    } catch (err: any) {
      console.error('Error deleting script:', err);
      setError(err.message || 'Failed to delete script');
    }
  }

  function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setScriptForm(prev => ({ ...prev, content }));

      // Auto-set name from filename if empty
      if (!scriptForm.name) {
        const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        setScriptForm(prev => ({ ...prev, name: fileName }));
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canAccessSettings) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <p className="text-yellow-800 font-medium">Admin access required to view settings</p>
          <Link href="/admin/sales" className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-700">
            Back to Sales Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/sales" className="text-gray-500 hover:text-gray-700 text-sm flex items-center mb-2">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sales
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Sales CRM Settings</h1>
        <p className="text-gray-500 mt-1">Configure integrations and preferences</p>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Call Forwarding Settings */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Call Forwarding</h2>
              <p className="text-sm text-gray-500">Forward unanswered calls to your phone</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            When someone calls back and you don't answer in the browser within 20 seconds,
            the call will be forwarded to this phone number.
          </p>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forwarding Phone Number
              </label>
              <input
                type="tel"
                value={forwardingNumberInput}
                onChange={(e) => setForwardingNumberInput(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={saveForwardingNumber}
                disabled={saving || !forwardingNumberInput}
                className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {forwardingNumber && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-medium">Currently forwarding to:</span> {forwardingNumber}
              </p>
            </div>
          )}

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">How it works:</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>When a lead calls you back, you'll see a notification in your browser</li>
              <li>If you don't answer within 20 seconds, the call forwards to this number</li>
              <li>This ensures you never miss a callback from a potential customer</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Call Scripts Management */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Call Scripts</h2>
                <p className="text-sm text-gray-500">Manage scripts for the power dialer</p>
              </div>
            </div>
            <button
              onClick={openNewScriptModal}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Script
            </button>
          </div>
        </div>

        <div className="p-6">
          {scriptsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            </div>
          ) : scripts.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 mb-4">No call scripts yet</p>
              <button
                onClick={openNewScriptModal}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Create your first script
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {scripts.map((script) => (
                <div
                  key={script.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{script.name}</h3>
                        {script.isDefault && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_TYPE_CONFIG[script.leadType].bgColor} ${LEAD_TYPE_CONFIG[script.leadType].color}`}>
                          {LEAD_TYPE_CONFIG[script.leadType].label}
                        </span>
                        <span>{script.content.length} characters</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditScriptModal(script)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteScript(script.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Tips:</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Use <code className="bg-gray-200 px-1 rounded">[CONTACT NAME]</code> to auto-fill the lead's name</li>
              <li>Use <code className="bg-gray-200 px-1 rounded">[YOUR NAME]</code> to auto-fill your name</li>
              <li>Set a script as "Default" to use it automatically for that lead type</li>
              <li>You can import scripts from .txt files</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingScript ? 'Edit Script' : 'New Script'}
                </h2>
                <button
                  onClick={() => setShowScriptModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Script Name</label>
                <input
                  type="text"
                  value={scriptForm.name}
                  onChange={(e) => setScriptForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Auto Shop Introduction"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Type</label>
                <select
                  value={scriptForm.leadType}
                  onChange={(e) => setScriptForm(prev => ({ ...prev, leadType: e.target.value as LeadType }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {Object.entries(LEAD_TYPE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Script Content</label>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileImport}
                      accept=".txt,.md"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import from file
                    </button>
                  </div>
                </div>
                <textarea
                  value={scriptForm.content}
                  onChange={(e) => setScriptForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter your call script here...

Hi, may I speak with [CONTACT NAME]?

My name is [YOUR NAME] from Emerald Detailing..."
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={scriptForm.isDefault}
                  onChange={(e) => setScriptForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">
                  Set as default script for {LEAD_TYPE_CONFIG[scriptForm.leadType].label} leads
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowScriptModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveScript}
                disabled={scriptSaving || !scriptForm.name.trim() || !scriptForm.content.trim()}
                className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {scriptSaving ? 'Saving...' : (editingScript ? 'Update Script' : 'Create Script')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Twilio Setup */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Twilio Voice</h2>
                <p className="text-sm text-gray-500">Make and receive calls from your browser</p>
              </div>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              twilioConfigured
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {twilioConfigured ? 'Connected' : 'Not Configured'}
            </span>
          </div>
        </div>

        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Setup Instructions</h3>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Create a Twilio Account</p>
                <p className="text-sm text-gray-500 mt-1">
                  Sign up at{' '}
                  <a
                    href="https://www.twilio.com/try-twilio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    twilio.com/try-twilio
                  </a>
                  {' '}(includes $15 free credit)
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Get Your Credentials</p>
                <p className="text-sm text-gray-500 mt-1">From the Twilio Console, copy your:</p>
                <ul className="text-sm text-gray-500 mt-2 list-disc list-inside">
                  <li>Account SID</li>
                  <li>Auth Token</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Buy a Phone Number</p>
                <p className="text-sm text-gray-500 mt-1">
                  Purchase a phone number (~$1/month) from{' '}
                  <a
                    href="https://console.twilio.com/us1/develop/phone-numbers/manage/search"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Phone Numbers → Buy a Number
                  </a>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">4</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Create API Key</p>
                <p className="text-sm text-gray-500 mt-1">
                  Go to{' '}
                  <a
                    href="https://console.twilio.com/us1/account/keys-credentials/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Account → API Keys
                  </a>
                  {' '}and create a new Standard API Key. Save the SID and Secret.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">5</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Create TwiML App</p>
                <p className="text-sm text-gray-500 mt-1">
                  Go to{' '}
                  <a
                    href="https://console.twilio.com/us1/develop/voice/manage/twiml-apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Voice → TwiML Apps
                  </a>
                  {' '}and create a new app with these settings:
                </p>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm font-mono">
                  <p><span className="text-gray-500">Voice Request URL:</span></p>
                  <p className="text-blue-600">https://us-central1-emerald-7a45f.cloudfunctions.net/twilioVoiceWebhook</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">6</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Configure Your Phone Number</p>
                <p className="text-sm text-gray-500 mt-1">
                  Go to{' '}
                  <a
                    href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Phone Numbers → Manage → Active Numbers
                  </a>
                  {' '}and configure the Voice webhook:
                </p>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm font-mono">
                  <p><span className="text-gray-500">Voice Configuration → A Call Comes In:</span></p>
                  <p className="text-blue-600">https://us-central1-emerald-7a45f.cloudfunctions.net/twilioIncomingVoice</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">7</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Configure Firebase Functions</p>
                <p className="text-sm text-gray-500 mt-1">Run these commands in your terminal:</p>
                <div className="mt-2 p-3 bg-gray-900 rounded-lg text-sm font-mono text-green-400 overflow-x-auto">
                  <p>cd functions && npm install</p>
                  <p className="mt-1">firebase functions:config:set twilio.account_sid="YOUR_ACCOUNT_SID"</p>
                  <p>firebase functions:config:set twilio.auth_token="YOUR_AUTH_TOKEN"</p>
                  <p>firebase functions:config:set twilio.api_key="YOUR_API_KEY_SID"</p>
                  <p>firebase functions:config:set twilio.api_secret="YOUR_API_SECRET"</p>
                  <p>firebase functions:config:set twilio.twiml_app_sid="YOUR_TWIML_APP_SID"</p>
                  <p>firebase functions:config:set twilio.phone_number="+1XXXXXXXXXX"</p>
                  <p className="mt-1">firebase deploy --only functions</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Pricing</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Phone number: ~$1/month</li>
              <li>• Outbound calls: ~$0.014/minute (US)</li>
              <li>• Call recording: ~$0.0025/minute</li>
              <li>• Free trial includes $15 credit</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SendGrid Setup (placeholder) */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden opacity-75">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">SendGrid Email</h2>
                <p className="text-sm text-gray-500">Send emails directly from the CRM</p>
              </div>
            </div>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-500">
              Coming Soon
            </span>
          </div>
        </div>
        <div className="p-6 text-center text-gray-500">
          <p>SendGrid integration will allow you to send emails without leaving the app and track opens/clicks.</p>
        </div>
      </div>
    </div>
  );
}
