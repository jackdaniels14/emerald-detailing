'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeadOrganization, SalesLead, LeadType, LEAD_TYPE_CONFIG } from '@/lib/sales-types';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<LeadOrganization[]>([]);
  const [allLeads, setAllLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<LeadOrganization | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<LeadType | 'all'>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'auto_shop' as LeadType,
    customType: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
    estimatedMonthlyVolume: '',
    isActive: true,
  });

  useEffect(() => {
    fetchOrganizations();
    fetchAllLeads();
  }, []);

  async function fetchOrganizations() {
    try {
      const orgsRef = collection(db, 'leadOrganizations');
      const snapshot = await getDocs(orgsRef);
      const orgsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeadOrganization[];

      // Sort by name
      orgsData.sort((a, b) => a.name.localeCompare(b.name));

      setOrganizations(orgsData);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllLeads() {
    try {
      const leadsRef = collection(db, 'salesLeads');
      const snapshot = await getDocs(leadsRef);
      const leadsData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as SalesLead[];
      setAllLeads(leadsData);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  }

  function getLeadsForOrg(orgId: string) {
    return allLeads.filter(lead => lead.organizationId === orgId);
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'auto_shop',
      customType: '',
      contactName: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      notes: '',
      estimatedMonthlyVolume: '',
      isActive: true,
    });
    setError('');
    setEditingOrg(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (org: LeadOrganization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      type: org.type,
      customType: org.customType || '',
      contactName: org.contactName || '',
      email: org.email || '',
      phone: org.phone || '',
      website: org.website || '',
      address: org.address || '',
      city: org.city || '',
      state: org.state || '',
      zipCode: org.zipCode || '',
      notes: org.notes || '',
      estimatedMonthlyVolume: org.estimatedMonthlyVolume?.toString() || '',
      isActive: org.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const orgData = {
        name: formData.name,
        type: formData.type,
        ...(formData.type === 'custom' && formData.customType ? { customType: formData.customType } : {}),
        contactName: formData.contactName || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        website: formData.website || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        notes: formData.notes || undefined,
        estimatedMonthlyVolume: formData.estimatedMonthlyVolume ? parseInt(formData.estimatedMonthlyVolume) : undefined,
        isActive: formData.isActive,
      };

      if (editingOrg) {
        // Update existing
        await updateDoc(doc(db, 'leadOrganizations', editingOrg.id), {
          ...orgData,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Create new
        await addDoc(collection(db, 'leadOrganizations'), {
          ...orgData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      await fetchOrganizations();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      console.error('Error saving organization:', err);
      setError(err.message || 'Failed to save organization');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'leadOrganizations', id));
      await fetchOrganizations();
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error deleting organization:', err);
      setError(err.message || 'Failed to delete organization');
    }
  };

  const toggleActive = async (org: LeadOrganization) => {
    try {
      await updateDoc(doc(db, 'leadOrganizations', org.id), {
        isActive: !org.isActive,
        updatedAt: Timestamp.now(),
      });
      setOrganizations(organizations.map(o =>
        o.id === org.id ? { ...o, isActive: !o.isActive } : o
      ));
    } catch (err) {
      console.error('Error toggling active status:', err);
    }
  };

  // Apply filters
  const filteredOrgs = organizations.filter(org => {
    if (filterType !== 'all' && org.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        org.name?.toLowerCase().includes(q) ||
        org.contactName?.toLowerCase().includes(q) ||
        org.email?.toLowerCase().includes(q) ||
        org.city?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Organizations</h1>
          <p className="text-gray-500 mt-1">
            {filteredOrgs.length} organization{filteredOrgs.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Organization
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Name, contact, email, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as LeadType | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {Object.entries(LEAD_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterType('all');
                setSearchQuery('');
              }}
              className="w-full px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Organizations Grid */}
      {filteredOrgs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrgs.map((org) => {
            const typeConfig = LEAD_TYPE_CONFIG[org.type];
            return (
              <div
                key={org.id}
                className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${
                  org.isActive ? 'border-blue-500' : 'border-gray-300 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{org.name}</h3>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${typeConfig.bgColor} ${typeConfig.color}`}>
                      {org.type === 'custom' && org.customType ? org.customType : typeConfig.label}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleActive(org)}
                    className={`p-1 rounded-full ${org.isActive ? 'text-green-600' : 'text-gray-400'}`}
                    title={org.isActive ? 'Active - click to deactivate' : 'Inactive - click to activate'}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {org.contactName && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Contact:</span> {org.contactName}
                  </p>
                )}

                {org.phone && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Phone:</span>{' '}
                    <a href={`tel:${org.phone}`} className="text-blue-600 hover:underline">{org.phone}</a>
                  </p>
                )}

                {org.email && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Email:</span>{' '}
                    <a href={`mailto:${org.email}`} className="text-blue-600 hover:underline">{org.email}</a>
                  </p>
                )}

                {(org.city || org.state) && (
                  <p className="text-sm text-gray-500 mb-1">
                    {[org.city, org.state].filter(Boolean).join(', ')}
                  </p>
                )}

                {org.estimatedMonthlyVolume && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Est. Volume:</span> {org.estimatedMonthlyVolume}/mo
                  </p>
                )}

                {/* Linked Leads */}
                {(() => {
                  const orgLeads = getLeadsForOrg(org.id);
                  if (orgLeads.length === 0) return null;
                  return (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        {orgLeads.length} Linked Lead{orgLeads.length !== 1 ? 's' : ''}
                      </p>
                      <div className="space-y-1">
                        {orgLeads.slice(0, 3).map(lead => (
                          <Link
                            key={lead.id}
                            href={`/admin/sales/leads/view?id=${lead.id}`}
                            className="block text-sm text-blue-600 hover:text-blue-800 hover:underline truncate"
                          >
                            {lead.companyName} - {lead.contactName}
                          </Link>
                        ))}
                        {orgLeads.length > 3 && (
                          <p className="text-xs text-gray-400">+{orgLeads.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(org)}
                    className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(org.id)}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Remove
                  </button>
                </div>

                {/* Delete confirmation */}
                {deleteConfirm === org.id && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 mb-2">Delete this organization?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(org.id)}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No organizations found</h3>
          <p className="text-gray-500 mt-1">Get started by adding your first lead organization</p>
          <button
            onClick={openAddModal}
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Organization
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => { setShowModal(false); resetForm(); }} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-auto p-6 text-left max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingOrg ? 'Edit Organization' : 'Add New Organization'}
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Mike's Auto Shop"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as LeadType, customType: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(LEAD_TYPE_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                {formData.type === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Type *</label>
                    <input
                      type="text"
                      required
                      value={formData.customType}
                      onChange={(e) => setFormData({ ...formData, customType: e.target.value })}
                      placeholder="e.g., Tire Shop, Towing Company"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={formData.contactName}
                        onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Address</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                      <input
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Est. Monthly Volume</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimatedMonthlyVolume}
                      onChange={(e) => setFormData({ ...formData, estimatedMonthlyVolume: e.target.value })}
                      placeholder="Number of vehicles/jobs per month"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingOrg ? 'Save Changes' : 'Add Organization'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
