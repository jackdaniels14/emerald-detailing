'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Affiliate, AffiliateCommission, AffiliatePayout } from '@/lib/affiliate-types';
import { createPayout } from '@/lib/affiliate-db';
import { useAuth } from '@/lib/auth-context';

interface AffiliateWithPending extends Affiliate {
  pendingCommissions: AffiliateCommission[];
}

export default function AffiliatePayoutsPage() {
  const { user } = useAuth();
  const [affiliatesWithPending, setAffiliatesWithPending] = useState<AffiliateWithPending[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<(AffiliatePayout & { affiliateName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateWithPending | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('check');
  const [paymentNotes, setPaymentNotes] = useState('');

  const fetchData = async () => {
    try {
      // Fetch all approved affiliates with pending payouts
      const affiliatesSnapshot = await getDocs(
        query(
          collection(db, 'affiliates'),
          where('status', '==', 'approved'),
          where('pendingPayout', '>', 0)
        )
      );
      const affiliates = affiliatesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Affiliate[];

      // Fetch pending commissions for each affiliate
      const affiliatesWithCommissions: AffiliateWithPending[] = [];
      for (const affiliate of affiliates) {
        const commSnapshot = await getDocs(
          query(
            collection(db, 'affiliateCommissions'),
            where('affiliateId', '==', affiliate.id),
            where('status', '==', 'pending')
          )
        );
        const pendingCommissions = commSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AffiliateCommission[];
        affiliatesWithCommissions.push({
          ...affiliate,
          pendingCommissions
        });
      }
      setAffiliatesWithPending(affiliatesWithCommissions);

      // Fetch recent payouts
      const payoutsSnapshot = await getDocs(
        query(collection(db, 'affiliatePayouts'), orderBy('createdAt', 'desc'))
      );
      const payouts = payoutsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AffiliatePayout[];

      // Get affiliate names for payouts
      const affiliateMap: Record<string, string> = {};
      affiliates.forEach(a => {
        affiliateMap[a.id] = `${a.firstName} ${a.lastName}`;
      });

      // Also fetch any affiliates from payouts we don't have yet
      for (const payout of payouts) {
        if (!affiliateMap[payout.affiliateId]) {
          const affDoc = await getDocs(
            query(collection(db, 'affiliates'), where('__name__', '==', payout.affiliateId))
          );
          if (!affDoc.empty) {
            const aff = affDoc.docs[0].data();
            affiliateMap[payout.affiliateId] = `${aff.firstName} ${aff.lastName}`;
          }
        }
      }

      setRecentPayouts(
        payouts.slice(0, 20).map(p => ({
          ...p,
          affiliateName: affiliateMap[p.affiliateId] || 'Unknown'
        }))
      );
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProcessPayout = async () => {
    if (!selectedAffiliate || !user?.uid) return;
    setProcessing(selectedAffiliate.id);

    try {
      const commissionIds = selectedAffiliate.pendingCommissions.map(c => c.id);
      await createPayout({
        affiliateId: selectedAffiliate.id,
        amount: selectedAffiliate.pendingPayout,
        commissionIds,
        paymentMethod,
        notes: paymentNotes || undefined,
        processedBy: user.uid
      });

      // Remove from list and reset
      setAffiliatesWithPending(prev => prev.filter(a => a.id !== selectedAffiliate.id));
      setSelectedAffiliate(null);
      setPaymentMethod('check');
      setPaymentNotes('');

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error processing payout:', error);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const totalPending = affiliatesWithPending.reduce((sum, a) => sum + a.pendingPayout, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/affiliates" className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Affiliate Payouts</h1>
          </div>
          <p className="text-gray-500 mt-1">Process pending commission payouts</p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100">Total Pending Payouts</p>
            <p className="text-4xl font-bold mt-1">${totalPending.toFixed(2)}</p>
            <p className="text-emerald-100 mt-2">{affiliatesWithPending.length} affiliate(s) awaiting payment</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading payouts...</p>
        </div>
      ) : (
        <>
          {/* Pending Payouts */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pending Payouts</h2>
            </div>
            {affiliatesWithPending.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {affiliatesWithPending.map((affiliate) => (
                  <div
                    key={affiliate.id}
                    className="p-6 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-lg font-semibold text-emerald-600">
                          {affiliate.firstName?.[0]}{affiliate.lastName?.[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">
                          {affiliate.firstName} {affiliate.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{affiliate.email}</p>
                        <p className="text-sm text-gray-500">
                          {affiliate.pendingCommissions.length} commission(s) pending
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">
                        ${affiliate.pendingPayout.toFixed(2)}
                      </p>
                      <button
                        onClick={() => setSelectedAffiliate(affiliate)}
                        className="mt-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium text-sm"
                      >
                        Process Payout
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                <p className="text-gray-500 mt-1">No pending payouts at this time.</p>
              </div>
            )}
          </div>

          {/* Recent Payouts History */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Payout History</h2>
            </div>
            {recentPayouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affiliate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentPayouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(payout.createdAt)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{payout.affiliateName}</td>
                        <td className="px-6 py-4 text-sm font-medium text-emerald-600">${payout.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">{payout.paymentMethod}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{payout.commissionIds.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">No payouts processed yet</div>
            )}
          </div>
        </>
      )}

      {/* Process Payout Modal */}
      {selectedAffiliate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setSelectedAffiliate(null)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-auto p-6 text-left">
              <button
                onClick={() => setSelectedAffiliate(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-6">Process Payout</h2>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedAffiliate.firstName} {selectedAffiliate.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{selectedAffiliate.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">
                        ${selectedAffiliate.pendingPayout.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedAffiliate.pendingCommissions.length} commission(s)
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="paypal">PayPal</option>
                    <option value="venmo">Venmo</option>
                    <option value="zelle">Zelle</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={3}
                    placeholder="Check #, transaction ID, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        This will mark {selectedAffiliate.pendingCommissions.length} commission(s) as paid and reduce the affiliate&apos;s pending balance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleProcessPayout}
                  disabled={processing === selectedAffiliate.id}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50"
                >
                  {processing === selectedAffiliate.id ? 'Processing...' : 'Confirm Payout'}
                </button>
                <button
                  onClick={() => setSelectedAffiliate(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
