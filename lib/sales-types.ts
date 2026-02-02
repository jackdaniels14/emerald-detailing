/**
 * Sales CRM Types
 * Types and interfaces for the sales lead management system
 */

// Lead/Contact & Organization Types (unified)
export type LeadType = 'auto_shop' | 'dealership' | 'fleet' | 'turo_host' | 'body_shop' | 'affiliate' | 'sales_rep' | 'cold_call' | 'custom';

// Organization type is same as LeadType for consistency
export type OrganizationType = LeadType;

// Pipeline Stages
export type PipelineStage = 'new' | 'contacted' | 'meeting' | 'proposal' | 'won' | 'lost';

// Revenue Tiers
export type LeadTier = 'tier1' | 'tier2' | 'tier3';

// Activity Types
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'proposal_sent' | 'follow_up';

/**
 * Sales Lead / Contact
 */
export interface SalesLead {
  id: string;

  // Basic Info
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;

  // Classification
  leadType: LeadType;
  customLeadType?: string;         // Used when leadType is 'custom'
  tier: LeadTier;
  stage: PipelineStage;

  // Details
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  territory?: string;

  // Business Info
  vehicleCount?: number;        // Estimated fleet/inventory size
  estimatedRevenue?: number;    // Monthly potential
  currentProvider?: string;     // Who they use now

  // Sales Process
  assignedTo?: string;          // Employee ID
  source?: string;              // How we found them (CSV import, referral, etc.)
  notes?: string;

  // For affiliates/sales reps
  commissionRate?: number;      // Percentage for referral partners

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;

  // Status
  isActive: boolean;
}

/**
 * Activity Log Entry
 */
export interface LeadActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  description: string;
  outcome?: string;
  createdBy: string;            // Employee ID
  createdAt: Date;
  scheduledFor?: Date;          // For follow-ups/meetings
  completed?: boolean;
}

/**
 * CSV Import mapping
 */
export interface CSVImportMapping {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  leadType?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
}

/**
 * Display names and colors for lead/organization types (unified)
 */
export const LEAD_TYPE_CONFIG: Record<LeadType, { label: string; color: string; bgColor: string }> = {
  auto_shop: { label: 'Auto Shop', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  dealership: { label: 'Dealership', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  fleet: { label: 'Fleet', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  turo_host: { label: 'Turo Host', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  body_shop: { label: 'Body Shop', color: 'text-red-700', bgColor: 'bg-red-100' },
  affiliate: { label: 'Affiliate', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  sales_rep: { label: 'Sales Rep', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  cold_call: { label: 'Cold Call', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  custom: { label: 'Custom', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
};

// Alias for organization type config (uses same config)
export const ORGANIZATION_TYPE_CONFIG = LEAD_TYPE_CONFIG;

/**
 * Display names and colors for pipeline stages
 */
export const PIPELINE_STAGE_CONFIG: Record<PipelineStage, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New Lead', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  contacted: { label: 'Contacted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  meeting: { label: 'Meeting', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  proposal: { label: 'Proposal', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  won: { label: 'Won', color: 'text-green-700', bgColor: 'bg-green-100' },
  lost: { label: 'Lost', color: 'text-red-700', bgColor: 'bg-red-100' },
};

/**
 * Display names and colors for tiers
 */
export const TIER_CONFIG: Record<LeadTier, { label: string; description: string; color: string; bgColor: string }> = {
  tier1: { label: 'Tier 1', description: 'Enterprise', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  tier2: { label: 'Tier 2', description: 'Business', color: 'text-slate-700', bgColor: 'bg-slate-200' },
  tier3: { label: 'Tier 3', description: 'Starter', color: 'text-stone-600', bgColor: 'bg-stone-100' },
};

/**
 * Activity type config
 */
export const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { label: string; icon: string }> = {
  call: { label: 'Phone Call', icon: 'phone' },
  email: { label: 'Email', icon: 'mail' },
  meeting: { label: 'Meeting', icon: 'calendar' },
  note: { label: 'Note', icon: 'pencil' },
  proposal_sent: { label: 'Proposal Sent', icon: 'document' },
  follow_up: { label: 'Follow Up', icon: 'clock' },
};

/**
 * Auto-assign tier based on lead type and vehicle count
 */
export function calculateTier(leadType: LeadType, vehicleCount?: number): LeadTier {
  if (leadType === 'dealership') return 'tier1';
  if (leadType === 'fleet' && (vehicleCount || 0) >= 10) return 'tier1';
  if (leadType === 'fleet') return 'tier2';
  if (leadType === 'auto_shop') return 'tier2';
  if (leadType === 'body_shop') return 'tier2';
  if (leadType === 'turo_host' && (vehicleCount || 0) >= 3) return 'tier2';
  if (leadType === 'affiliate' || leadType === 'sales_rep') return 'tier2';
  if (leadType === 'cold_call') return 'tier3';
  if (leadType === 'custom') return 'tier3';
  return 'tier3';
}

// =========================================================================
// LEAD ORGANIZATIONS
// =========================================================================

/**
 * Lead Organization
 * Used to group and manage leads by organization (e.g., auto shops, dealerships)
 */
export interface LeadOrganization {
  id: string;

  // Basic Info
  name: string;
  type: LeadType;  // Uses same types as leads for consistency
  customType?: string;  // Used when type is 'custom'

  // Contact Info
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;

  // Address
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;

  // Business Details
  notes?: string;
  estimatedMonthlyVolume?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Status
  isActive: boolean;
}
