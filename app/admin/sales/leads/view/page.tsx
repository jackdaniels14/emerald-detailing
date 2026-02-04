'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where, orderBy, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import {
  SalesLead,
  LeadActivity,
  LeadType,
  PipelineStage,
  ActivityType,
  LEAD_TYPE_CONFIG,
  PIPELINE_STAGE_CONFIG,
  TIER_CONFIG,
  ACTIVITY_TYPE_CONFIG,
  calculateTier,
} from '@/lib/sales-types';
import EmailComposer from '@/components/sales/EmailComposer';

export default function LeadDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const leadId = searchParams.get('id');

  const [lead, setLead] = useState<SalesLead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Activity form
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>('call');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityOutcome, setActivityOutcome] = useState('');

  // Edit form
  const [formData, setFormData] = useState<Partial<SalesLead>>({});

  // Email composer
  const [showEmailComposer, setShowEmailComposer] = useState(false);

  useEffect(() => {
    if (leadId) {
      fetchLead();
      fetchActivities();
    } else {
      setError('No lead ID provided');
      setLoading(false);
    }
  }, [leadId]);

  async function fetchLead() {
    if (!leadId) return;
    try {
      const leadDoc = await getDoc(doc(db, 'salesLeads', leadId));
      if (leadDoc.exists()) {
        const data = { id: leadDoc.id, ...leadDoc.data() } as SalesLead;
        setLead(data);
        setFormData(data);
      } else {
        setError('Lead not found');
      }
    } catch (err) {
      console.error('Error fetching lead:', err);
      setError('Failed to load lead');
    } finally {
      setLoading(false);
    }
  }

  async function fetchActivities() {
    if (!leadId) return;
    try {
      const activitiesRef = collection(db, 'leadActivities');
      const q = query(
        activitiesRef,
        where('leadId', '==', leadId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeadActivity[];
      setActivities(activitiesData);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  }

  const handleSave = async () => {
    if (!lead || !leadId) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const vehicleCount = formData.vehicleCount || 0;
      const updates = {
        ...formData,
        tier: calculateTier(formData.leadType as LeadType, vehicleCount),
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, 'salesLeads', leadId), updates);
      setLead({ ...lead, ...formData, tier: updates.tier, updatedAt: new Date() } as SalesLead);
      setIsEditing(false);
      setSuccess('Lead updated successfully');
    } catch (err: any) {
      console.error('Error updating lead:', err);
      setError(err.message || 'Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (newStage: PipelineStage) => {
    if (!lead || !leadId) return;
    setSaving(true);

    try {
      await updateDoc(doc(db, 'salesLeads', leadId), {
        stage: newStage,
        updatedAt: Timestamp.now(),
      });

      setLead({ ...lead, stage: newStage });

      // Add activity log
      await addDoc(collection(db, 'leadActivities'), {
        leadId,
        type: 'note',
        description: `Stage changed to ${PIPELINE_STAGE_CONFIG[newStage].label}`,
        createdBy: userProfile?.uid || 'unknown',
        createdAt: Timestamp.now(),
      });

      fetchActivities();
      setSuccess(`Moved to ${PIPELINE_STAGE_CONFIG[newStage].label}`);
    } catch (err: any) {
      console.error('Error updating stage:', err);
      setError('Failed to update stage');
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) return;
    setSaving(true);

    try {
      await addDoc(collection(db, 'leadActivities'), {
        leadId,
        type: activityType,
        description: activityDescription,
        outcome: activityOutcome || null,
        createdBy: userProfile?.uid || 'unknown',
        createdAt: Timestamp.now(),
      });

      // Update last contacted date
      await updateDoc(doc(db, 'salesLeads', leadId), {
        lastContactedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setShowActivityForm(false);
      setActivityDescription('');
      setActivityOutcome('');
      fetchActivities();
      setSuccess('Activity logged');
    } catch (err: any) {
      console.error('Error adding activity:', err);
      setError('Failed to log activity');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!leadId || !confirm('Are you sure you want to delete this lead? This cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'salesLeads', leadId));
      router.push('/admin/sales/leads');
    } catch (err: any) {
      console.error('Error deleting lead:', err);
      setError('Failed to delete lead');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Never';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-800 font-medium">{error || 'Lead not found'}</p>
          <Link href="/admin/sales/leads" className="inline-flex items-center mt-4 text-emerald-600 hover:text-emerald-700">
            Back to Leads
          </Link>
        </div>
      </div>
    );
  }

  const typeConfig = LEAD_TYPE_CONFIG[lead.leadType];
  const stageConfig = PIPELINE_STAGE_CONFIG[lead.stage];
  const tierConfig = TIER_CONFIG[lead.tier];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/sales/leads" className="text-gray-500 hover:text-gray-700 text-sm flex items-center mb-2">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Leads
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{lead.companyName}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
              {lead.leadType === 'custom' && lead.customLeadType ? lead.customLeadType : typeConfig.label}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${tierConfig.bgColor} ${tierConfig.color}`}>
              {tierConfig.label} - {tierConfig.description}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {lead.phone && (
            <Link
              href={`/admin/sales/dialer?phone=${encodeURIComponent(lead.phone)}&name=${encodeURIComponent(lead.companyName + ' - ' + lead.contactName)}`}
              className="px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call
            </Link>
          )}
          {lead.email && (
            <button
              onClick={() => setShowEmailComposer(true)}
              className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </button>
          )}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
      {success && <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}

      {/* Pipeline Stage */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Pipeline Stage</h2>
        <div className="flex flex-wrap gap-2">
          {(['new', 'contacted', 'meeting', 'proposal', 'won', 'lost'] as PipelineStage[]).map((stage) => {
            const config = PIPELINE_STAGE_CONFIG[stage];
            const isActive = lead.stage === stage;
            return (
              <button
                key={stage}
                onClick={() => handleStageChange(stage)}
                disabled={saving}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isActive
                    ? `${config.bgColor} ${config.color} ring-2 ring-offset-2 ring-current`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Details */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Lead Details</h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setIsEditing(false); setFormData(lead); }}
                  className="px-3 py-1 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={formData.contactName || ''}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Type</label>
                <select
                  value={formData.leadType || 'turo_host'}
                  onChange={(e) => setFormData({ ...formData, leadType: e.target.value as LeadType, customLeadType: e.target.value === 'custom' ? formData.customLeadType : '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  {Object.entries(LEAD_TYPE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              {formData.leadType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Type Name</label>
                  <input
                    type="text"
                    value={formData.customLeadType || ''}
                    onChange={(e) => setFormData({ ...formData, customLeadType: e.target.value })}
                    placeholder="e.g., Car Wash, Body Shop"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Count</label>
                <input
                  type="number"
                  value={formData.vehicleCount || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleCount: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Est. Monthly Revenue</label>
                <input
                  type="number"
                  value={formData.estimatedRevenue || ''}
                  onChange={(e) => setFormData({ ...formData, estimatedRevenue: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                <input
                  type="text"
                  value={formData.zipCode || ''}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active Lead</span>
                  <span className="text-xs text-gray-500">(Uncheck to archive this lead)</span>
                </label>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Contact Name</dt>
                <dd className="mt-1 font-medium text-gray-900">{lead.contactName}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="mt-1 font-medium text-gray-900">
                  <a href={`mailto:${lead.email}`} className="text-emerald-600 hover:underline">{lead.email}</a>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="mt-1 font-medium text-gray-900">
                  <Link href={`/admin/sales/dialer?phone=${encodeURIComponent(lead.phone || '')}&name=${encodeURIComponent((lead.companyName || '') + ' - ' + (lead.contactName || ''))}`} className="text-emerald-600 hover:underline">{lead.phone}</Link>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Vehicle Count</dt>
                <dd className="mt-1 font-medium text-gray-900">{lead.vehicleCount || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Est. Monthly Revenue</dt>
                <dd className="mt-1 font-medium text-gray-900">
                  {lead.estimatedRevenue ? `$${lead.estimatedRevenue.toLocaleString()}` : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Website</dt>
                <dd className="mt-1 font-medium text-gray-900">
                  {lead.website ? (
                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                      {lead.website}
                    </a>
                  ) : '-'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm text-gray-500">Notes</dt>
                <dd className="mt-1 text-gray-900 whitespace-pre-wrap">{lead.notes || 'No notes'}</dd>
              </div>
            </dl>
          )}
        </div>

        {/* Quick Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 h-fit">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Created</dt>
              <dd className="mt-1 text-gray-900">{formatDate(lead.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Last Contacted</dt>
              <dd className="mt-1 text-gray-900">{formatDate(lead.lastContactedAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Source</dt>
              <dd className="mt-1 text-gray-900 capitalize">{lead.source || 'Unknown'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
          <button
            onClick={() => setShowActivityForm(!showActivityForm)}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium text-sm"
          >
            + Log Activity
          </button>
        </div>

        {showActivityForm && (
          <form onSubmit={handleAddActivity} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as ActivityType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  {Object.entries(ACTIVITY_TYPE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  placeholder="What happened?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                <select
                  value={activityOutcome}
                  onChange={(e) => setActivityOutcome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select outcome...</option>
                  <option value="no_answer">No Answer</option>
                  <option value="voicemail">Left Voicemail</option>
                  <option value="busy">Busy</option>
                  <option value="callback_requested">Callback Requested</option>
                  <option value="interested">Interested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="meeting_booked">Meeting Booked</option>
                  <option value="proposal_sent">Proposal Sent</option>
                  <option value="sale_made">Sale Made</option>
                  <option value="wrong_number">Wrong Number</option>
                  <option value="gatekeeper">Gatekeeper</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowActivityForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Log Activity'}
              </button>
            </div>
          </form>
        )}

        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => {
              const config = ACTIVITY_TYPE_CONFIG[activity.type];
              return (
                <div key={activity.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-500 text-sm">{config.label.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{config.label}</span>
                      <span className="text-sm text-gray-400">{formatDate(activity.createdAt)}</span>
                    </div>
                    <p className="text-gray-600 mt-1">{activity.description}</p>
                    {activity.outcome && (
                      <p className="text-sm text-gray-500 mt-1">Outcome: {activity.outcome}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No activities logged yet</p>
        )}
      </div>

      {/* Email Composer Modal */}
      {lead && (
        <EmailComposer
          lead={lead}
          isOpen={showEmailComposer}
          onClose={() => setShowEmailComposer(false)}
          onEmailSent={() => {
            fetchActivities();
            setSuccess('Email composed and opened in your email client');
          }}
        />
      )}
    </div>
  );
}
