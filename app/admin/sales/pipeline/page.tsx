'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  SalesLead,
  PipelineStage,
  LEAD_TYPE_CONFIG,
  PIPELINE_STAGE_CONFIG,
  TIER_CONFIG,
} from '@/lib/sales-types';

const PIPELINE_STAGES: PipelineStage[] = ['new', 'contacted', 'meeting', 'proposal', 'won', 'lost'];

export default function PipelinePage() {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<SalesLead | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const leadsRef = collection(db, 'salesLeads');
      const snapshot = await getDocs(leadsRef);
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SalesLead[];

      setLeads(leadsData);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }

  const getLeadsByStage = (stage: PipelineStage) => {
    return leads.filter(lead => lead.stage === stage && lead.isActive);
  };

  const getStageValue = (stage: PipelineStage) => {
    return getLeadsByStage(stage).reduce((sum, lead) => sum + (lead.estimatedRevenue || 0), 0);
  };

  const handleDragStart = (e: React.DragEvent, lead: SalesLead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStage: PipelineStage) => {
    e.preventDefault();
    if (!draggedLead || draggedLead.stage === newStage) {
      setDraggedLead(null);
      return;
    }

    setUpdating(draggedLead.id);

    try {
      await updateDoc(doc(db, 'salesLeads', draggedLead.id), {
        stage: newStage,
        updatedAt: Timestamp.now(),
      });

      setLeads(leads.map(lead =>
        lead.id === draggedLead.id ? { ...lead, stage: newStage } : lead
      ));
    } catch (error) {
      console.error('Error updating lead stage:', error);
    } finally {
      setDraggedLead(null);
      setUpdating(null);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-gray-500 mt-1">Drag and drop leads between stages</p>
        </div>
        <Link
          href="/admin/sales/leads"
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          List View
        </Link>
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageConfig = PIPELINE_STAGE_CONFIG[stage];
          const stageLeads = getLeadsByStage(stage);
          const stageValue = getStageValue(stage);

          return (
            <div
              key={stage}
              className="flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {/* Column Header */}
              <div className={`rounded-t-xl p-3 ${stageConfig.bgColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${stageConfig.color}`}>{stageConfig.label}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-white/50 ${stageConfig.color}`}>
                      {stageLeads.length}
                    </span>
                  </div>
                </div>
                {stageValue > 0 && (
                  <p className={`text-sm mt-1 ${stageConfig.color} opacity-75`}>
                    ${stageValue.toLocaleString()}/mo
                  </p>
                )}
              </div>

              {/* Column Body */}
              <div className="bg-gray-100 rounded-b-xl p-2 min-h-[400px] space-y-2">
                {stageLeads.map((lead) => {
                  const typeConfig = LEAD_TYPE_CONFIG[lead.leadType];
                  const tierConfig = TIER_CONFIG[lead.tier];
                  const isUpdating = updating === lead.id;

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      className={`bg-white rounded-lg p-3 shadow-sm cursor-move hover:shadow-md transition-shadow ${
                        isUpdating ? 'opacity-50' : ''
                      } ${draggedLead?.id === lead.id ? 'opacity-50' : ''}`}
                    >
                      <Link href={`/admin/sales/leads/view?id=${lead.id}`} className="block">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900 text-sm truncate flex-1">
                            {lead.companyName}
                          </h3>
                          <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${tierConfig.bgColor} ${tierConfig.color}`}>
                            {tierConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{lead.contactName}</p>
                        {lead.organizationName && (
                          <p className="text-xs text-blue-600 truncate">{lead.organizationName}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                            {lead.leadType === 'custom' && lead.customLeadType ? lead.customLeadType : typeConfig.label}
                          </span>
                          {lead.estimatedRevenue && (
                            <span className="text-xs text-gray-600 font-medium">
                              ${lead.estimatedRevenue.toLocaleString()}/mo
                            </span>
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}

                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Drop leads here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Lead Types</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(LEAD_TYPE_CONFIG).map(([key, config]) => (
            <span key={key} className={`px-2 py-1 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
              {config.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
