'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Affiliate, AffiliateCommission, COMMISSION_STATUS_CONFIG } from '@/lib/affiliate-types';

export default function AffiliateCommissionsPage() {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');

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

        // Get commissions
        const commSnapshot = await getDocs(
          query(
            collection(db, 'affiliateCommissions'),
            where('affiliateId', '==', affData.id),
            orderBy('createdAt', 'desc')
          )
        );
        setCommissions(commSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AffiliateCommission[]);
      } catch (error) {
        console.error('Error loading commissions:', error);
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

  const filteredCommissions = commissions.filter(c =>
    statusFilter === 'all' || c.status === statusFilter
  );

  const totalEarnings = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  const pendingAmount = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.commissionAmount, 0);
  const paidAmount = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.commissionAmount, 0);

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
        <h1 className="text-2xl font-bold text-gray-900">Commission History</h1>
        <p className="text-gray-500 mt-1">
          View all your earned commissions
        </p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Total Earned</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">${totalEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Pending Payout</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">${pendingAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Paid Out</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">${paidAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-2">
          {(['all', 'pending', 'paid'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="ml-2 text-xs">
                  ({commissions.filter(c => c.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredCommissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCommissions.map((comm) => {
                  const statusConfig = COMMISSION_STATUS_CONFIG[comm.status];
                  return (
                    <tr key={comm.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(comm.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          comm.isFirstBooking
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {comm.isFirstBooking ? 'First Booking' : 'Recurring'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">${comm.bookingTotal.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{(comm.commissionRate * 100).toFixed(0)}%</td>
                      <td className="px-6 py-4 text-sm font-medium text-emerald-600">
                        ${comm.commissionAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        {comm.paidAt && (
                          <p className="text-xs text-gray-400 mt-1">
                            Paid {formatDate(comm.paidAt)}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">No commissions yet</h3>
            <p className="text-gray-500 mt-1">
              {statusFilter !== 'all'
                ? `No ${statusFilter} commissions found`
                : 'Commissions will appear here when your referrals book services'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
