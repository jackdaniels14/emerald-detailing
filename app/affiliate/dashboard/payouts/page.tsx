'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Affiliate, AffiliatePayout } from '@/lib/affiliate-types';

export default function AffiliatePayoutsPage() {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        // Get affiliate data
        const affQuery = query(collection(db, 'affiliates'), where('userId', '==', user.uid));
        const affSnapshot = await getDocs(affQuery);

        if (affSnapshot.empty) return;

        const affData = { id: affSnapshot.docs[0].id, ...affSnapshot.docs[0].data() } as Affiliate;
        setAffiliate(affData);

        // Get payouts
        const paySnapshot = await getDocs(
          query(
            collection(db, 'affiliatePayouts'),
            where('affiliateId', '==', affData.id),
            orderBy('createdAt', 'desc')
          )
        );
        setPayouts(paySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AffiliatePayout[]);
      } catch (error) {
        console.error('Error loading payouts:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalPaid = payouts.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payout History</h1>
        <p className="text-gray-500 mt-1">
          View all your received payouts
        </p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Total Paid Out</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">${totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Pending Payout</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">${(affiliate?.pendingPayout || 0).toFixed(2)}</p>
          {(affiliate?.pendingPayout || 0) > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Payouts are processed regularly. Contact us for questions.
            </p>
          )}
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {payouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commissions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(payout.createdAt)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-emerald-600">${payout.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 capitalize">{payout.paymentMethod.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{payout.commissionIds.length} commissions</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{payout.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">No payouts yet</h3>
            <p className="text-gray-500 mt-1">
              {(affiliate?.pendingPayout || 0) > 0
                ? 'You have pending commissions that will be paid out soon'
                : 'Payouts will appear here once you earn commissions'}
            </p>
          </div>
        )}
      </div>

      {/* Payout Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">About Payouts</h3>
        <ul className="text-sm text-blue-700 space-y-2">
          <li className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Payouts are processed regularly once your pending balance reaches a minimum threshold
          </li>
          <li className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            We support multiple payment methods including check, bank transfer, PayPal, and more
          </li>
          <li className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Contact us to update your preferred payment method or request an early payout
          </li>
        </ul>
      </div>
    </div>
  );
}
