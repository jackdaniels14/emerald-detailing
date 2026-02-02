'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  SalesLead,
  PipelineStage,
  LeadType,
  LEAD_TYPE_CONFIG,
  PIPELINE_STAGE_CONFIG,
  TIER_CONFIG,
} from '@/lib/sales-types';

interface PipelineStats {
  stage: PipelineStage;
  count: number;
  value: number;
}

interface TypeStats {
  type: LeadType;
  count: number;
}

export default function SalesDashboard() {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats[]>([]);
  const [typeStats, setTypeStats] = useState<TypeStats[]>([]);
  const [recentLeads, setRecentLeads] = useState<SalesLead[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const leadsRef = collection(db, 'salesLeads');
        const q = query(leadsRef, where('isActive', '==', true));
        const snapshot = await getDocs(q);

        const leadsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SalesLead[];

        setLeads(leadsData);

        // Calculate pipeline stats
        const stages: PipelineStage[] = ['new', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
        const pStats = stages.map(stage => ({
          stage,
          count: leadsData.filter(l => l.stage === stage).length,
          value: leadsData.filter(l => l.stage === stage).reduce((sum, l) => sum + (l.estimatedRevenue || 0), 0),
        }));
        setPipelineStats(pStats);

        // Calculate type stats
        const types: LeadType[] = ['dealership', 'fleet', 'turo_host', 'affiliate', 'sales_rep'];
        const tStats = types.map(type => ({
          type,
          count: leadsData.filter(l => l.leadType === type).length,
        }));
        setTypeStats(tStats);

        // Get recent leads
        const sorted = [...leadsData].sort((a, b) => {
          const aDate = a.createdAt instanceof Date ? a.createdAt : new Date((a.createdAt as any)?.seconds * 1000 || 0);
          const bDate = b.createdAt instanceof Date ? b.createdAt : new Date((b.createdAt as any)?.seconds * 1000 || 0);
          return bDate.getTime() - aDate.getTime();
        });
        setRecentLeads(sorted.slice(0, 5));

      } catch (error) {
        console.error('Error fetching sales data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const activePipelineValue = pipelineStats
    .filter(s => !['won', 'lost'].includes(s.stage))
    .reduce((sum, s) => sum + s.value, 0);

  const wonValue = pipelineStats.find(s => s.stage === 'won')?.value || 0;
  const totalLeads = leads.length;
  const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.stage)).length;

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
          <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="text-gray-500 mt-1">Track your sales pipeline and leads</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/sales/dialer"
            className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Start Dialing
          </Link>
          <Link
            href="/admin/sales/leads/import"
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Leads</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalLeads}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Pipeline</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{activeLeads}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pipeline Value</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">${activePipelineValue.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">/month potential</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Won Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-1">${wonValue.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">/month closed</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Overview</h2>
          <div className="space-y-3">
            {pipelineStats.filter(s => s.stage !== 'lost').map((stat) => {
              const config = PIPELINE_STAGE_CONFIG[stat.stage];
              const maxCount = Math.max(...pipelineStats.map(s => s.count), 1);
              const percentage = (stat.count / maxCount) * 100;

              return (
                <Link
                  key={stat.stage}
                  href={`/admin/sales/leads?stage=${stat.stage}`}
                  className="block hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                    <span className="text-sm text-gray-600">
                      {stat.count} leads {stat.value > 0 && `- $${stat.value.toLocaleString()}/mo`}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${config.bgColor.replace('100', '400')}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Leads by Type */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Leads by Type</h2>
          <div className="space-y-3">
            {typeStats.map((stat) => {
              const config = LEAD_TYPE_CONFIG[stat.type];
              return (
                <Link
                  key={stat.type}
                  href={`/admin/sales/leads?type=${stat.type}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{stat.count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
          <Link href="/admin/sales/leads" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
            View All
          </Link>
        </div>

        {recentLeads.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {recentLeads.map((lead) => {
              const typeConfig = LEAD_TYPE_CONFIG[lead.leadType];
              const stageConfig = PIPELINE_STAGE_CONFIG[lead.stage];
              const tierConfig = TIER_CONFIG[lead.tier];

              return (
                <Link
                  key={lead.id}
                  href={`/admin/sales/leads/view?id=${lead.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{lead.companyName}</p>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${tierConfig.bgColor} ${tierConfig.color}`}>
                        {tierConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{lead.contactName} - {lead.email}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
                      {lead.leadType === 'custom' && lead.customLeadType ? lead.customLeadType : typeConfig.label}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${stageConfig.bgColor} ${stageConfig.color}`}>
                      {stageConfig.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">No leads yet</h3>
            <p className="text-gray-500 mt-1">Import your first leads to get started</p>
            <Link
              href="/admin/sales/leads/import"
              className="inline-flex items-center mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
            >
              Import CSV
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
