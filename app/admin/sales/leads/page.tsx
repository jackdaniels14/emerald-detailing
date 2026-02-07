'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { collection, getDocs, query, where, orderBy, addDoc, updateDoc, doc, Timestamp, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  SalesLead,
  LeadType,
  PipelineStage,
  LeadTier,
  LEAD_TYPE_CONFIG,
  PIPELINE_STAGE_CONFIG,
  TIER_CONFIG,
  calculateTier,
} from '@/lib/sales-types';

// Custom settings interface
interface CustomSettings {
  types: { id: string; label: string; color: string; bgColor: string }[];
  stages: { id: string; label: string; color: string; bgColor: string }[];
  tiers: { id: string; label: string; description: string; color: string; bgColor: string }[];
}

const DEFAULT_COLORS = [
  { color: 'text-red-700', bgColor: 'bg-red-100' },
  { color: 'text-orange-700', bgColor: 'bg-orange-100' },
  { color: 'text-amber-700', bgColor: 'bg-amber-100' },
  { color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  { color: 'text-lime-700', bgColor: 'bg-lime-100' },
  { color: 'text-green-700', bgColor: 'bg-green-100' },
  { color: 'text-teal-700', bgColor: 'bg-teal-100' },
  { color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  { color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  { color: 'text-purple-700', bgColor: 'bg-purple-100' },
  { color: 'text-pink-700', bgColor: 'bg-pink-100' },
];

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const initialStage = searchParams.get('stage') as PipelineStage | null;
  const initialType = searchParams.get('type') as LeadType | null;
  const initialTier = searchParams.get('tier') as LeadTier | null;

  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [quickActionLeadId, setQuickActionLeadId] = useState<string | null>(null);

  // Custom settings
  const [customSettings, setCustomSettings] = useState<CustomSettings>({ types: [], stages: [], tiers: [] });
  const [newType, setNewType] = useState('');
  const [newStage, setNewStage] = useState('');
  const [newTier, setNewTier] = useState({ label: '', description: '' });

  // Filters
  const [filterStage, setFilterStage] = useState<PipelineStage | 'all'>(initialStage || 'all');
  const [filterType, setFilterType] = useState<LeadType | 'all'>(initialType || 'all');
  const [filterTier, setFilterTier] = useState<LeadTier | 'all'>(initialTier || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  // Combined types/stages/tiers (built-in + custom)
  const allTypes = {
    ...LEAD_TYPE_CONFIG,
    ...Object.fromEntries(customSettings.types.map(t => [t.id, { label: t.label, color: t.color, bgColor: t.bgColor }]))
  };
  const allStages = {
    ...PIPELINE_STAGE_CONFIG,
    ...Object.fromEntries(customSettings.stages.map(s => [s.id, { label: s.label, color: s.color, bgColor: s.bgColor }]))
  };
  const allTiers = {
    ...TIER_CONFIG,
    ...Object.fromEntries(customSettings.tiers.map(t => [t.id, { label: t.label, description: t.description, color: t.color, bgColor: t.bgColor }]))
  };

  // New lead form
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    leadType: 'turo_host' as LeadType,
    customLeadType: '',
    vehicleCount: '',
    estimatedRevenue: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
  });

  useEffect(() => {
    fetchLeads();
    fetchCustomSettings();
  }, []);

  async function fetchCustomSettings() {
    try {
      const docRef = doc(db, 'settings', 'leadCustomizations');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCustomSettings(docSnap.data() as CustomSettings);
      }
    } catch (err) {
      console.error('Error fetching custom settings:', err);
    }
  }

  async function saveCustomSettings(newSettings: CustomSettings) {
    try {
      await setDoc(doc(db, 'settings', 'leadCustomizations'), newSettings);
      setCustomSettings(newSettings);
    } catch (err) {
      console.error('Error saving custom settings:', err);
    }
  }

  function addCustomType() {
    if (!newType.trim()) return;
    const id = newType.toLowerCase().replace(/\s+/g, '_');
    const colorIndex = customSettings.types.length % DEFAULT_COLORS.length;
    const newSettings = {
      ...customSettings,
      types: [...customSettings.types, { id, label: newType.trim(), ...DEFAULT_COLORS[colorIndex] }]
    };
    saveCustomSettings(newSettings);
    setNewType('');
  }

  function removeCustomType(id: string) {
    const newSettings = {
      ...customSettings,
      types: customSettings.types.filter(t => t.id !== id)
    };
    saveCustomSettings(newSettings);
  }

  function addCustomStage() {
    if (!newStage.trim()) return;
    const id = newStage.toLowerCase().replace(/\s+/g, '_');
    const colorIndex = customSettings.stages.length % DEFAULT_COLORS.length;
    const newSettings = {
      ...customSettings,
      stages: [...customSettings.stages, { id, label: newStage.trim(), ...DEFAULT_COLORS[colorIndex] }]
    };
    saveCustomSettings(newSettings);
    setNewStage('');
  }

  function removeCustomStage(id: string) {
    const newSettings = {
      ...customSettings,
      stages: customSettings.stages.filter(s => s.id !== id)
    };
    saveCustomSettings(newSettings);
  }

  function addCustomTier() {
    if (!newTier.label.trim()) return;
    const id = 'tier_' + newTier.label.toLowerCase().replace(/\s+/g, '_');
    const colorIndex = customSettings.tiers.length % DEFAULT_COLORS.length;
    const newSettings = {
      ...customSettings,
      tiers: [...customSettings.tiers, { id, label: newTier.label.trim(), description: newTier.description.trim(), ...DEFAULT_COLORS[colorIndex] }]
    };
    saveCustomSettings(newSettings);
    setNewTier({ label: '', description: '' });
  }

  function removeCustomTier(id: string) {
    const newSettings = {
      ...customSettings,
      tiers: customSettings.tiers.filter(t => t.id !== id)
    };
    saveCustomSettings(newSettings);
  }

  async function fetchLeads() {
    try {
      const leadsRef = collection(db, 'salesLeads');
      const snapshot = await getDocs(leadsRef);
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SalesLead[];

      // Sort by createdAt descending
      leadsData.sort((a, b) => {
        const aDate = a.createdAt instanceof Date ? a.createdAt : new Date((a.createdAt as any)?.seconds * 1000 || 0);
        const bDate = b.createdAt instanceof Date ? b.createdAt : new Date((b.createdAt as any)?.seconds * 1000 || 0);
        return bDate.getTime() - aDate.getTime();
      });

      setLeads(leadsData);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setFormData({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      leadType: 'turo_host',
      customLeadType: '',
      vehicleCount: '',
      estimatedRevenue: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      notes: '',
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Validation
    if (!formData.companyName.trim()) {
      setError('Company name is required');
      setSaving(false);
      return;
    }
    if (!formData.contactName.trim()) {
      setError('Contact name is required');
      setSaving(false);
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      setSaving(false);
      return;
    }
    if (formData.phone) {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        setError('Please enter a valid phone number (at least 10 digits)');
        setSaving(false);
        return;
      }
    }

    try {
      const vehicleCount = parseInt(formData.vehicleCount) || 0;
      const newLead: Omit<SalesLead, 'id'> = {
        companyName: formData.companyName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        leadType: formData.leadType,
        ...(formData.leadType === 'custom' && formData.customLeadType ? { customLeadType: formData.customLeadType } : {}),
        tier: calculateTier(formData.leadType, vehicleCount),
        stage: 'new',
        vehicleCount: vehicleCount,
        estimatedRevenue: parseFloat(formData.estimatedRevenue) || 0,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        notes: formData.notes,
        source: 'manual',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, 'salesLeads'), {
        ...newLead,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await fetchLeads();
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      console.error('Error adding lead:', err);
      setError(err.message || 'Failed to add lead');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStageChange = async (leadId: string, newStage: PipelineStage) => {
    try {
      await updateDoc(doc(db, 'salesLeads', leadId), {
        stage: newStage,
        updatedAt: Timestamp.now(),
      });
      setLeads(leads.map(lead =>
        lead.id === leadId ? { ...lead, stage: newStage } : lead
      ));
      setQuickActionLeadId(null);
    } catch (err) {
      console.error('Error updating stage:', err);
    }
  };

  // Apply filters
  const filteredLeads = leads.filter(lead => {
    if (filterStage !== 'all' && lead.stage !== filterStage) return false;
    if (filterType !== 'all' && lead.leadType !== filterType) return false;
    if (filterTier !== 'all' && lead.tier !== filterTier) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        lead.companyName?.toLowerCase().includes(q) ||
        lead.contactName?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q) ||
        lead.phone?.includes(q);
      if (!matchesSearch) return false;
    }
    return true;
  });

  // Export to CSV
  const exportToCSV = () => {
    if (filteredLeads.length === 0) return;

    // Define CSV headers
    const headers = [
      'Company Name',
      'Contact Name',
      'Email',
      'Phone',
      'Type',
      'Tier',
      'Stage',
      'City',
      'State',
      'Vehicle Count',
      'Est. Monthly Revenue',
      'Notes',
      'Source',
      'Last Contacted',
      'Next Follow-up',
      'Created At'
    ];

    // Convert leads to CSV rows
    const rows = filteredLeads.map(lead => {
      const formatDate = (date: any) => {
        if (!date) return '';
        const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
        return d.toLocaleDateString('en-US');
      };

      return [
        lead.companyName || '',
        lead.contactName || '',
        lead.email || '',
        lead.phone || '',
        lead.leadType === 'custom' && lead.customLeadType ? lead.customLeadType : LEAD_TYPE_CONFIG[lead.leadType]?.label || lead.leadType,
        TIER_CONFIG[lead.tier]?.label || lead.tier,
        PIPELINE_STAGE_CONFIG[lead.stage]?.label || lead.stage,
        lead.city || '',
        lead.state || '',
        lead.vehicleCount || '',
        lead.estimatedRevenue || '',
        (lead.notes || '').replace(/"/g, '""'), // Escape quotes
        lead.source || '',
        formatDate(lead.lastContactedAt),
        formatDate(lead.nextFollowUpAt),
        formatDate(lead.createdAt)
      ].map(val => `"${val}"`).join(',');
    });

    // Combine headers and rows
    const csv = [headers.join(','), ...rows].join('\n');

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Create filename with filter info
    const filterInfo = [];
    if (filterType !== 'all') filterInfo.push(filterType);
    if (filterStage !== 'all') filterInfo.push(filterStage);
    if (filterTier !== 'all') filterInfo.push(filterTier);
    const filterSuffix = filterInfo.length > 0 ? `_${filterInfo.join('_')}` : '';
    const date = new Date().toISOString().split('T')[0];

    link.download = `leads${filterSuffix}_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
          <p className="text-gray-500 mt-1">{filteredLeads.length} leads found</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Customize
          </button>
          <button
            onClick={exportToCSV}
            disabled={filteredLeads.length === 0}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Company, contact, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value as PipelineStage | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Stages</option>
              {Object.entries(allStages).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as LeadType | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Types</option>
              {Object.entries(allTypes).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value as LeadTier | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Tiers</option>
              {Object.entries(allTiers).map(([key, config]) => (
                <option key={key} value={key}>{config.label} - {config.description}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterStage('all');
                setFilterType('all');
                setFilterTier('all');
                setSearchQuery('');
              }}
              className="w-full px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company / Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Revenue</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => {
                  const typeConfig = allTypes[lead.leadType] || { label: lead.leadType, color: 'text-gray-700', bgColor: 'bg-gray-100' };
                  const stageConfig = allStages[lead.stage] || { label: lead.stage, color: 'text-gray-700', bgColor: 'bg-gray-100' };
                  const tierConfig = allTiers[lead.tier] || { label: lead.tier, description: '', color: 'text-gray-700', bgColor: 'bg-gray-100' };

                  return (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{lead.companyName}</p>
                          <p className="text-sm text-gray-500">{lead.contactName}</p>
                          <p className="text-sm text-gray-400">{lead.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
                          {lead.leadType === 'custom' && lead.customLeadType ? lead.customLeadType : typeConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${tierConfig.bgColor} ${tierConfig.color}`}>
                          {tierConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <button
                            onClick={() => setQuickActionLeadId(quickActionLeadId === lead.id ? null : lead.id)}
                            className={`px-2 py-1 text-xs font-medium rounded-full ${stageConfig.bgColor} ${stageConfig.color} hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 transition-all`}
                          >
                            {stageConfig.label} ▾
                          </button>
                          {quickActionLeadId === lead.id && (
                            <div className="absolute z-10 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-48 overflow-y-auto">
                              {Object.entries(allStages).map(([stage, config]) => (
                                  <button
                                    key={stage}
                                    onClick={() => handleQuickStageChange(lead.id, stage as PipelineStage)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${lead.stage === stage ? 'font-semibold' : ''} ${config.color}`}
                                  >
                                    {config.label}
                                  </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900 font-medium">
                          {lead.estimatedRevenue ? `$${lead.estimatedRevenue.toLocaleString()}/mo` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {lead.phone && (
                            <Link
                              href={`/admin/sales/dialer?phone=${encodeURIComponent(lead.phone)}&name=${encodeURIComponent(lead.companyName + ' - ' + lead.contactName)}`}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Call with Power Dialer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </Link>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Email"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </a>
                          )}
                          <Link
                            href={`/admin/sales/leads/view?id=${lead.id}`}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">No leads found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your filters or add a new lead</p>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => { setShowAddModal(false); resetForm(); }} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-auto p-6 text-left">
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Lead</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lead Type *</label>
                    <select
                      value={formData.leadType}
                      onChange={(e) => setFormData({ ...formData, leadType: e.target.value as LeadType, customLeadType: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      {Object.entries(allTypes).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.leadType === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Type Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.customLeadType}
                      onChange={(e) => setFormData({ ...formData, customLeadType: e.target.value })}
                      placeholder="e.g., Car Wash, Body Shop, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Count</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.vehicleCount}
                      onChange={(e) => setFormData({ ...formData, vehicleCount: e.target.value })}
                      placeholder="Fleet/inventory size"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Est. Monthly Revenue</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        value={formData.estimatedRevenue}
                        onChange={(e) => setFormData({ ...formData, estimatedRevenue: e.target.value })}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); resetForm(); }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Lead'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Customize Modal */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowCustomizeModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-auto p-6 text-left max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-6">Customize Lead Options</h2>

              {/* Custom Types */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Custom Lead Types</h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder="Enter new type name..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomType())}
                  />
                  <button
                    onClick={addCustomType}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customSettings.types.map((type) => (
                    <span key={type.id} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${type.bgColor} ${type.color}`}>
                      {type.label}
                      <button onClick={() => removeCustomType(type.id)} className="ml-1 hover:text-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {customSettings.types.length === 0 && (
                    <span className="text-sm text-gray-500">No custom types added yet</span>
                  )}
                </div>
              </div>

              {/* Custom Stages */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Custom Pipeline Stages</h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value)}
                    placeholder="Enter new stage name..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomStage())}
                  />
                  <button
                    onClick={addCustomStage}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customSettings.stages.map((stage) => (
                    <span key={stage.id} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${stage.bgColor} ${stage.color}`}>
                      {stage.label}
                      <button onClick={() => removeCustomStage(stage.id)} className="ml-1 hover:text-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {customSettings.stages.length === 0 && (
                    <span className="text-sm text-gray-500">No custom stages added yet</span>
                  )}
                </div>
              </div>

              {/* Custom Tiers */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Custom Tiers</h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTier.label}
                    onChange={(e) => setNewTier({ ...newTier, label: e.target.value })}
                    placeholder="Tier name..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={newTier.description}
                    onChange={(e) => setNewTier({ ...newTier, description: e.target.value })}
                    placeholder="Description..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTier())}
                  />
                  <button
                    onClick={addCustomTier}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customSettings.tiers.map((tier) => (
                    <span key={tier.id} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${tier.bgColor} ${tier.color}`}>
                      {tier.label} {tier.description && `- ${tier.description}`}
                      <button onClick={() => removeCustomTier(tier.id)} className="ml-1 hover:text-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {customSettings.tiers.length === 0 && (
                    <span className="text-sm text-gray-500">No custom tiers added yet</span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowCustomizeModal(false)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
