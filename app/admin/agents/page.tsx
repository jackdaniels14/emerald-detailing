'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'error';
  type: 'chatbot' | 'automation' | 'monitor' | 'pipeline' | 'other';
  endpoint: string;
  apiKey: string;
  config: string;
  lastPing?: any;
  createdAt: any;
}

interface AgentForm {
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'error';
  type: 'chatbot' | 'automation' | 'monitor' | 'pipeline' | 'other';
  endpoint: string;
  apiKey: string;
  config: string;
}

const emptyAgent: AgentForm = {
  name: '',
  description: '',
  status: 'stopped',
  type: 'chatbot',
  endpoint: '',
  apiKey: '',
  config: '{}',
};

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyAgent);
  const [saving, setSaving] = useState(false);

  const fetchAgents = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'agents'), orderBy('name')));
      setAgents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Agent[]);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'agents', editingId), { ...form });
      } else {
        await addDoc(collection(db, 'agents'), { ...form, createdAt: new Date() });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyAgent);
      await fetchAgents();
    } catch (error) {
      console.error('Error saving agent:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (agent: Agent) => {
    const newStatus = agent.status === 'running' ? 'stopped' : 'running';
    try {
      await updateDoc(doc(db, 'agents', agent.id), { status: newStatus });
      await fetchAgents();
    } catch (error) {
      console.error('Error toggling agent:', error);
    }
  };

  const handleEdit = (agent: Agent) => {
    setForm({
      name: agent.name,
      description: agent.description,
      status: agent.status,
      type: agent.type,
      endpoint: agent.endpoint || '',
      apiKey: agent.apiKey || '',
      config: agent.config || '{}',
    });
    setEditingId(agent.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
      await deleteDoc(doc(db, 'agents', id));
      await fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-500 mt-1">Configure, control, and monitor your AI agents.</p>
        </div>
        <button
          onClick={() => { setForm(emptyAgent); setEditingId(null); setShowForm(true); }}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Agent
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Agent' : 'New Agent'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Agent name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="chatbot">Chatbot</option>
                <option value="automation">Automation</option>
                <option value="monitor">Monitor</option>
                <option value="pipeline">Pipeline</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="What does this agent do?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
              <input
                type="url"
                value={form.endpoint}
                onChange={e => setForm({ ...form, endpoint: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://api.example.com/agent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                value={form.apiKey}
                onChange={e => setForm({ ...form, apiKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="sk-..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Config (JSON)</label>
              <textarea
                value={form.config}
                onChange={e => setForm({ ...form, config: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                rows={4}
                placeholder='{"model": "claude-sonnet-4-6", "temperature": 0.7}'
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors font-medium text-sm"
            >
              {saving ? 'Saving...' : editingId ? 'Update Agent' : 'Create Agent'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyAgent); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Agent Cards */}
      {agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map(agent => (
            <div key={agent.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    agent.status === 'running' ? 'bg-green-500 animate-pulse' :
                    agent.status === 'error' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`}></div>
                  <h3 className="text-lg font-bold text-gray-900">{agent.name}</h3>
                </div>
                <span className="text-xs text-gray-500 capitalize">{agent.type}</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">{agent.description || 'No description'}</p>
              {agent.endpoint && (
                <p className="text-xs text-gray-400 mb-4 truncate font-mono">{agent.endpoint}</p>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleToggleStatus(agent)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    agent.status === 'running'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {agent.status === 'running' ? 'Stop' : 'Start'}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(agent)} className="text-gray-500 hover:text-gray-700 text-sm">Edit</button>
                  <button onClick={() => handleDelete(agent.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No AI agents yet</h3>
          <p className="text-gray-500 mb-4">Add your first AI agent to get started.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
          >
            Add Agent
          </button>
        </div>
      ) : null}
    </div>
  );
}
