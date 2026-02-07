import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Affiliate,
  Referral,
  AffiliateCommission,
  AffiliatePayout,
  AffiliateApplication,
  AffiliateStatus,
  DEFAULT_FIRST_BOOKING_RATE,
  DEFAULT_RECURRING_RATE,
  generateReferralCode
} from './affiliate-types';

// Collection references
const COLLECTIONS = {
  AFFILIATES: 'affiliates',
  REFERRALS: 'referrals',
  COMMISSIONS: 'affiliateCommissions',
  PAYOUTS: 'affiliatePayouts',
  USERS: 'users',
  CLIENTS: 'clients',
  BOOKINGS: 'bookings'
};

// ============ AFFILIATES ============

export async function getAffiliates(): Promise<Affiliate[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.AFFILIATES), orderBy('createdAt', 'desc'))
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Affiliate));
}

export async function getAffiliate(id: string): Promise<Affiliate | null> {
  const docRef = await getDoc(doc(db, COLLECTIONS.AFFILIATES, id));
  if (!docRef.exists()) return null;
  return { id: docRef.id, ...docRef.data() } as Affiliate;
}

export async function getAffiliateByUserId(userId: string): Promise<Affiliate | null> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.AFFILIATES),
      where('userId', '==', userId)
    )
  );
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Affiliate;
}

export async function getAffiliateByReferralCode(code: string): Promise<Affiliate | null> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.AFFILIATES),
      where('referralCode', '==', code.toUpperCase()),
      where('status', '==', 'approved')
    )
  );
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Affiliate;
}

export async function getAffiliatesByStatus(status: AffiliateStatus): Promise<Affiliate[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.AFFILIATES),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Affiliate));
}

export async function createAffiliateApplication(
  application: AffiliateApplication,
  userId: string
): Promise<string> {
  // Generate unique referral code
  let referralCode = application.referralCode?.toUpperCase() ||
    generateReferralCode(application.firstName, application.lastName);

  // Check if code already exists
  const existingAffiliate = await getAffiliateByReferralCode(referralCode);
  if (existingAffiliate) {
    // Regenerate with random suffix
    referralCode = generateReferralCode(application.firstName, application.lastName);
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.AFFILIATES), {
    userId,
    email: application.email,
    firstName: application.firstName,
    lastName: application.lastName,
    phone: application.phone,
    referralCode,
    firstBookingRate: DEFAULT_FIRST_BOOKING_RATE,
    recurringRate: DEFAULT_RECURRING_RATE,
    status: 'pending',
    totalEarnings: 0,
    pendingPayout: 0,
    createdAt: Timestamp.now()
  });
  return docRef.id;
}

export async function approveAffiliate(id: string, approvedBy: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.AFFILIATES, id), {
    status: 'approved',
    approvedAt: Timestamp.now(),
    approvedBy
  });
}

export async function suspendAffiliate(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.AFFILIATES, id), {
    status: 'suspended'
  });
}

export async function updateAffiliate(id: string, data: Partial<Affiliate>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.AFFILIATES, id), data);
}

export async function updateAffiliateRates(
  id: string,
  firstBookingRate: number,
  recurringRate: number
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.AFFILIATES, id), {
    firstBookingRate,
    recurringRate
  });
}

// ============ REFERRALS ============

export async function getReferrals(): Promise<Referral[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.REFERRALS), orderBy('createdAt', 'desc'))
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
}

export async function getReferral(id: string): Promise<Referral | null> {
  const docRef = await getDoc(doc(db, COLLECTIONS.REFERRALS, id));
  if (!docRef.exists()) return null;
  return { id: docRef.id, ...docRef.data() } as Referral;
}

export async function getReferralsByAffiliate(affiliateId: string): Promise<Referral[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.REFERRALS),
      where('affiliateId', '==', affiliateId),
      orderBy('createdAt', 'desc')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
}

export async function getReferralByClient(clientId: string): Promise<Referral | null> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.REFERRALS),
      where('clientId', '==', clientId)
    )
  );
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Referral;
}

export async function createReferral(
  affiliateId: string,
  clientId: string,
  referralCode: string
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.REFERRALS), {
    affiliateId,
    clientId,
    referralCode,
    isFirstBooking: true,
    createdAt: Timestamp.now()
  });
  return docRef.id;
}

export async function markFirstBookingComplete(referralId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.REFERRALS, referralId), {
    isFirstBooking: false
  });
}

// ============ COMMISSIONS ============

export async function getCommissions(): Promise<AffiliateCommission[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.COMMISSIONS), orderBy('createdAt', 'desc'))
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AffiliateCommission));
}

export async function getCommission(id: string): Promise<AffiliateCommission | null> {
  const docRef = await getDoc(doc(db, COLLECTIONS.COMMISSIONS, id));
  if (!docRef.exists()) return null;
  return { id: docRef.id, ...docRef.data() } as AffiliateCommission;
}

export async function getCommissionsByAffiliate(affiliateId: string): Promise<AffiliateCommission[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.COMMISSIONS),
      where('affiliateId', '==', affiliateId),
      orderBy('createdAt', 'desc')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AffiliateCommission));
}

export async function getPendingCommissionsByAffiliate(affiliateId: string): Promise<AffiliateCommission[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.COMMISSIONS),
      where('affiliateId', '==', affiliateId),
      where('status', '==', 'pending')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AffiliateCommission));
}

export async function getCommissionByBooking(bookingId: string): Promise<AffiliateCommission | null> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.COMMISSIONS),
      where('bookingId', '==', bookingId)
    )
  );
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as AffiliateCommission;
}

export async function createCommission(data: {
  affiliateId: string;
  referralId: string;
  bookingId: string;
  clientId: string;
  bookingTotal: number;
  commissionRate: number;
  commissionAmount: number;
  isFirstBooking: boolean;
}): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.COMMISSIONS), {
    ...data,
    status: 'pending',
    createdAt: Timestamp.now()
  });

  // Update affiliate's pending payout and total earnings
  await updateDoc(doc(db, COLLECTIONS.AFFILIATES, data.affiliateId), {
    pendingPayout: increment(data.commissionAmount),
    totalEarnings: increment(data.commissionAmount)
  });

  return docRef.id;
}

export async function markCommissionsAsPaid(
  commissionIds: string[],
  affiliateId: string,
  totalAmount: number
): Promise<void> {
  const paidAt = Timestamp.now();

  // Update each commission
  const updates = commissionIds.map(id =>
    updateDoc(doc(db, COLLECTIONS.COMMISSIONS, id), {
      status: 'paid',
      paidAt
    })
  );
  await Promise.all(updates);

  // Reduce affiliate's pending payout
  await updateDoc(doc(db, COLLECTIONS.AFFILIATES, affiliateId), {
    pendingPayout: increment(-totalAmount)
  });
}

// ============ PAYOUTS ============

export async function getPayouts(): Promise<AffiliatePayout[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.PAYOUTS), orderBy('createdAt', 'desc'))
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AffiliatePayout));
}

export async function getPayout(id: string): Promise<AffiliatePayout | null> {
  const docRef = await getDoc(doc(db, COLLECTIONS.PAYOUTS, id));
  if (!docRef.exists()) return null;
  return { id: docRef.id, ...docRef.data() } as AffiliatePayout;
}

export async function getPayoutsByAffiliate(affiliateId: string): Promise<AffiliatePayout[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.PAYOUTS),
      where('affiliateId', '==', affiliateId),
      orderBy('createdAt', 'desc')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AffiliatePayout));
}

export async function createPayout(data: {
  affiliateId: string;
  amount: number;
  commissionIds: string[];
  paymentMethod: string;
  notes?: string;
  processedBy: string;
}): Promise<string> {
  // First mark commissions as paid
  await markCommissionsAsPaid(data.commissionIds, data.affiliateId, data.amount);

  // Create payout record
  const docRef = await addDoc(collection(db, COLLECTIONS.PAYOUTS), {
    ...data,
    createdAt: Timestamp.now()
  });

  return docRef.id;
}

// ============ AFFILIATE TRACKING INTEGRATION ============

/**
 * Check if a client was referred by an affiliate and create commission if needed
 * Called when a booking is completed
 */
export async function processBookingCommission(
  bookingId: string,
  clientId: string,
  bookingTotal: number
): Promise<string | null> {
  // Get client's referral
  const referral = await getReferralByClient(clientId);
  if (!referral) return null;

  // Get affiliate
  const affiliate = await getAffiliate(referral.affiliateId);
  if (!affiliate || affiliate.status !== 'approved') return null;

  // Calculate commission
  const isFirstBooking = referral.isFirstBooking;
  const commissionRate = isFirstBooking ? affiliate.firstBookingRate : affiliate.recurringRate;
  const commissionAmount = Math.round(bookingTotal * commissionRate * 100) / 100;

  // Create commission record
  const commissionId = await createCommission({
    affiliateId: affiliate.id,
    referralId: referral.id,
    bookingId,
    clientId,
    bookingTotal,
    commissionRate,
    commissionAmount,
    isFirstBooking
  });

  // If this was first booking, mark it as complete
  if (isFirstBooking) {
    await markFirstBookingComplete(referral.id);
  }

  // Update booking with affiliate info
  await updateDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId), {
    affiliateId: affiliate.id,
    affiliateCommissionId: commissionId
  });

  return commissionId;
}

/**
 * Attribute a new client to an affiliate via referral code
 * Called when a new client signs up with a referral code
 */
export async function attributeClientToAffiliate(
  clientId: string,
  referralCode: string
): Promise<boolean> {
  // Find affiliate by code
  const affiliate = await getAffiliateByReferralCode(referralCode);
  if (!affiliate) return false;

  // Create referral record
  await createReferral(affiliate.id, clientId, referralCode);

  // Update client with affiliate info
  await updateDoc(doc(db, COLLECTIONS.CLIENTS, clientId), {
    affiliateId: affiliate.id,
    referralCode: referralCode.toUpperCase()
  });

  return true;
}

// ============ ANALYTICS HELPERS ============

export async function getAffiliateStats(affiliateId: string): Promise<{
  totalReferrals: number;
  totalCommissions: number;
  totalEarnings: number;
  pendingPayout: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}> {
  const affiliate = await getAffiliate(affiliateId);
  if (!affiliate) {
    return {
      totalReferrals: 0,
      totalCommissions: 0,
      totalEarnings: 0,
      pendingPayout: 0,
      thisMonthEarnings: 0,
      lastMonthEarnings: 0
    };
  }

  const referrals = await getReferralsByAffiliate(affiliateId);
  const commissions = await getCommissionsByAffiliate(affiliateId);

  // Calculate monthly earnings
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonthEarnings = commissions
    .filter(c => {
      const date = c.createdAt instanceof Date ? c.createdAt : (c.createdAt as any).toDate();
      return date >= thisMonthStart;
    })
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  const lastMonthEarnings = commissions
    .filter(c => {
      const date = c.createdAt instanceof Date ? c.createdAt : (c.createdAt as any).toDate();
      return date >= lastMonthStart && date <= lastMonthEnd;
    })
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  return {
    totalReferrals: referrals.length,
    totalCommissions: commissions.length,
    totalEarnings: affiliate.totalEarnings,
    pendingPayout: affiliate.pendingPayout,
    thisMonthEarnings: Math.round(thisMonthEarnings * 100) / 100,
    lastMonthEarnings: Math.round(lastMonthEarnings * 100) / 100
  };
}

export async function getMonthlyEarnings(affiliateId: string, months: number = 12): Promise<{
  month: string;
  earnings: number;
}[]> {
  const commissions = await getCommissionsByAffiliate(affiliateId);
  const now = new Date();
  const result: { month: string; earnings: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const earnings = commissions
      .filter(c => {
        const date = c.createdAt instanceof Date ? c.createdAt : (c.createdAt as any).toDate();
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    result.push({
      month: monthLabel,
      earnings: Math.round(earnings * 100) / 100
    });
  }

  return result;
}
