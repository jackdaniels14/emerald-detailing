'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  EmailTemplate,
  DEFAULT_TEMPLATES,
} from '@/lib/email-templates';
import { LEAD_TYPE_CONFIG, LeadType } from '@/lib/sales-types';

type TemplateCategory = 'intro' | 'follow_up' | 'meeting' | 'proposal' | 'thank_you' | 'custom';

const CATEGORY_CONFIG: Record<TemplateCategory, { label: string; color: string; bgColor: string }> = {
  intro: { label: 'Introduction', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  follow_up: { label: 'Follow Up', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  meeting: { label: 'Meeting', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  proposal: { label: 'Proposal', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  thank_you: { label: 'Thank You', color: 'text-green-700', bgColor: 'bg-green-100' },
  custom: { label: 'Custom', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<TemplateCategory | 'all'>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'intro' as TemplateCategory,
    leadTypes: [] as string[],
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const templatesRef = collection(db, 'emailTemplates');
      const snapshot = await getDocs(templatesRef);

      if (snapshot.empty) {
        // Seed default templates
        for (const template of DEFAULT_TEMPLATES) {
          await addDoc(templatesRef, {
            ...template,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }
        // Fetch again after seeding
        const newSnapshot = await getDocs(templatesRef);
        const templatesData = newSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as EmailTemplate[];
        setTemplates(templatesData);
      } else {
        const templatesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as EmailTemplate[];
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category,
      leadTypes: template.leadTypes || [],
    });
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      subject: '',
      body: '',
      category: 'custom',
      leadTypes: [],
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.body) return;
    setSaving(true);

    try {
      if (editingTemplate) {
        await updateDoc(doc(db, 'emailTemplates', editingTemplate.id), {
          ...formData,
          updatedAt: Timestamp.now(),
        });
      } else {
        await addDoc(collection(db, 'emailTemplates'), {
          ...formData,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      await fetchTemplates();
      setShowEditor(false);
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteDoc(doc(db, 'emailTemplates', templateId));
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      await updateDoc(doc(db, 'emailTemplates', template.id), {
        isActive: !template.isActive,
        updatedAt: Timestamp.now(),
      });
      await fetchTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
    }
  };

  const handleLeadTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      leadTypes: prev.leadTypes.includes(type)
        ? prev.leadTypes.filter(t => t !== type)
        : [...prev.leadTypes, type],
    }));
  };

  const filteredTemplates = templates.filter(t =>
    filterCategory === 'all' || t.category === filterCategory
  );

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
          <Link href="/admin/sales" className="text-gray-500 hover:text-gray-700 text-sm flex items-center mb-2">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Sales
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-500 mt-1">Manage your email templates for outreach</p>
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
            filterCategory === 'all'
              ? 'bg-gray-900 border-gray-900 text-white'
              : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
          }`}
        >
          All ({templates.length})
        </button>
        {(Object.entries(CATEGORY_CONFIG) as [TemplateCategory, typeof CATEGORY_CONFIG[TemplateCategory]][]).map(([key, config]) => {
          const count = templates.filter(t => t.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setFilterCategory(key)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                filterCategory === key
                  ? `${config.bgColor} ${config.color} border-current`
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const categoryConfig = CATEGORY_CONFIG[template.category];
          return (
            <div
              key={template.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${
                !template.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${categoryConfig.bgColor} ${categoryConfig.color}`}>
                      {categoryConfig.label}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleActive(template)}
                    className={`p-1 rounded-full ${
                      template.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}
                    title={template.isActive ? 'Active' : 'Inactive'}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </button>
                </div>

                <p className="text-sm text-gray-600 font-medium mb-2 truncate">
                  {template.subject}
                </p>

                <p className="text-sm text-gray-500 line-clamp-3">
                  {template.body.substring(0, 150)}...
                </p>

                {template.leadTypes && template.leadTypes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.leadTypes.map(type => (
                      <span
                        key={type}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                      >
                        {LEAD_TYPE_CONFIG[type as LeadType]?.label || type}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No templates found</h3>
          <p className="text-gray-500 mt-1">Create your first email template to get started</p>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowEditor(false)} />

            <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-auto text-left overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {editingTemplate ? 'Edit Template' : 'New Template'}
                  </h2>
                  <button
                    onClick={() => setShowEditor(false)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Follow Up - Week 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as TemplateCategory })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {(Object.entries(CATEGORY_CONFIG) as [TemplateCategory, typeof CATEGORY_CONFIG[TemplateCategory]][]).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Following up - Emerald Detailing"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Body *</label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="Write your email template..."
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Use {'{{contactName}}'}, {'{{companyName}}'}, {'{{senderName}}'}, {'{{senderPhone}}'} for personalization
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Show for Lead Types (optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(LEAD_TYPE_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleLeadTypeToggle(key)}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                          formData.leadTypes.includes(key)
                            ? `${config.bgColor} ${config.color} border-current`
                            : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Leave empty to show for all lead types
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setShowEditor(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!formData.name || !formData.subject || !formData.body || saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
