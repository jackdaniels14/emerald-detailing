'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Affiliate, AffiliateCommission, Referral } from '@/lib/affiliate-types';
import { getAffiliateStats, getMonthlyEarnings } from '@/lib/affiliate-db';
import AffiliateStats from '@/components/affiliate/AffiliateStats';
import CommissionChart from '@/components/affiliate/CommissionChart';
import ShareLinks from '@/components/affiliate/ShareLinks';

export default function AffiliateDashboardPage() {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [stats, setStats] = useState<{
    totalReferrals: number;
    totalCommissions: number;
    totalEarnings: number;
    pendingPayout: number;
    thisMonthEarnings: number;
    lastMonthEarnings: number;
  } | null>(null);
  const [monthlyData, setMonthlyData] = useState<{ month: string; earnings: number }[]>([]);
  const [recentCommissions, setRecentCommissions] = useState<AffiliateCommission[]>([]);
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

        // Get stats
        const affiliateStats = await getAffiliateStats(affData.id);
        setStats(affiliateStats);

        // Get monthly earnings
        const monthly = await getMonthlyEarnings(affData.id, 6);
        setMonthlyData(monthly);

        // Get recent commissions
        const commSnapshot = await getDocs(
          query(
            collection(db, 'affiliateCommissions'),
            where('affiliateId', '==', affData.id),
            orderBy('createdAt', 'desc')
          )
        );
        setRecentCommissions(
          commSnapshot.docs.slice(0, 5).map(d => ({ id: d.id, ...d.data() })) as AffiliateCommission[]
        );
      } catch (error) {
        console.error('Error loading dashboard:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!affiliate || !stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {affiliate.firstName}!
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s an overview of your affiliate performance
        </p>
      </div>

      {/* Stats Cards */}
      <AffiliateStats stats={stats} />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Earnings Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Earnings Overview</h2>
          <CommissionChart data={monthlyData} />
        </div>

        {/* Share Links */}
        <ShareLinks referralCode={affiliate.referralCode} />
      </div>

      {/* Recent Commissions */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Commissions</h2>
          <Link
            href="/affiliate/dashboard/commissions"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            View All
          </Link>
        </div>
        {recentCommissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(comm.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">${comm.bookingTotal.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {(comm.commissionRate * 100).toFixed(0)}%
                      <span className="text-xs text-gray-400 ml-1">
                        ({comm.isFirstBooking ? 'first' : 'recurring'})
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-emerald-600">
                      ${comm.commissionAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        comm.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {comm.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No commissions yet. Share your referral link to start earning!
          </div>
        )}
      </div>

      {/* Commission Rates Info */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Your Commission Rates</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white/20 rounded-lg p-4">
            <p className="text-emerald-100 text-sm">First Booking</p>
            <p className="text-3xl font-bold">{(affiliate.firstBookingRate * 100).toFixed(0)}%</p>
            <p className="text-emerald-100 text-xs mt-1">on new customer&apos;s first booking</p>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <p className="text-emerald-100 text-sm">Recurring Bookings</p>
            <p className="text-3xl font-bold">{(affiliate.recurringRate * 100).toFixed(0)}%</p>
            <p className="text-emerald-100 text-xs mt-1">on all future bookings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
