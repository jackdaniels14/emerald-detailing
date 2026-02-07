/**
 * Affiliate Tracking System Types
 * Types and interfaces for the affiliate program
 */

// Affiliate Status
export type AffiliateStatus = 'pending' | 'approved' | 'suspended';

// Commission Status
export type CommissionStatus = 'pending' | 'paid';

/**
 * Affiliate Profile
 * Approved affiliates who can earn commissions on referrals
 */
export interface Affiliate {
  id: string;
  userId: string;              // Links to users collection (for auth)
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  referralCode: string;        // Unique code (e.g., "JOHN123")
  firstBookingRate: number;    // 0.10 (10%)
  recurringRate: number;       // 0.05 (5%)
  status: AffiliateStatus;
  totalEarnings: number;       // Running total
  pendingPayout: number;       // Unpaid balance
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;         // Admin who approved
}

/**
 * Referral Record
 * Tracks customer attribution to affiliates
 */
export interface Referral {
  id: string;
  affiliateId: string;
  clientId: string;
  referralCode: string;
  isFirstBooking: boolean;     // Track if first booking completed
  createdAt: Date;
}

/**
 * Affiliate Commission
 * Commission record per booking
 */
export interface AffiliateCommission {
  id: string;
  affiliateId: string;
  referralId: string;
  bookingId: string;
  clientId: string;
  bookingTotal: number;
  commissionRate: number;      // 0.10 or 0.05
  commissionAmount: number;
  isFirstBooking: boolean;
  status: CommissionStatus;
  createdAt: Date;
  paidAt?: Date;
}

/**
 * Affiliate Payout
 * Record of payments made to affiliates
 */
export interface AffiliatePayout {
  id: string;
  affiliateId: string;
  amount: number;
  commissionIds: string[];     // Which commissions included
  paymentMethod: string;
  notes?: string;
  createdAt: Date;
  processedBy: string;         // Admin who processed
}

/**
 * Affiliate Application
 * Used for the application form submission
 */
export interface AffiliateApplication {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  referralCode?: string;       // Requested code (optional)
  notes?: string;              // Why they want to be an affiliate
}

/**
 * Display config for affiliate status
 */
export const AFFILIATE_STATUS_CONFIG: Record<AffiliateStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100' },
  suspended: { label: 'Suspended', color: 'text-red-700', bgColor: 'bg-red-100' },
};

/**
 * Display config for commission status
 */
export const COMMISSION_STATUS_CONFIG: Record<CommissionStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  paid: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
};

/**
 * Default commission rates
 */
export const DEFAULT_FIRST_BOOKING_RATE = 0.10;  // 10%
export const DEFAULT_RECURRING_RATE = 0.05;      // 5%

/**
 * Calculate commission for a booking
 */
export function calculateCommission(bookingTotal: number, isFirstBooking: boolean, affiliate: Affiliate): number {
  const rate = isFirstBooking ? affiliate.firstBookingRate : affiliate.recurringRate;
  return Math.round(bookingTotal * rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Generate a referral code from name
 */
export function generateReferralCode(firstName: string, lastName: string): string {
  const base = (firstName.substring(0, 4) + lastName.substring(0, 4)).toUpperCase();
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return base + suffix;
}
