'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Affiliate, AffiliateCommission, Referral, AffiliatePayout, AFFILIATE_STATUS_CONFIG, COMMISSION_STATUS_CONFIG } from '@/lib/affiliate-types';
import { approveAffiliate, suspendAffiliate, updateAffiliateRates } from '@/lib/affiliate-db';
import { useAuth } from '@/lib/auth-context';
import { Client } from '@/lib/types';

export default function AffiliateDetailPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const affiliateId = searchParams.get('id') || '';

  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'commissions' | 'payouts'>('overview');
  const [editRates, setEditRates] = useState(false);
  const [firstRate, setFirstRate] = useState(10);
  const [recurringRate, setRecurringRate] = useState(5);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!affiliateId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch affiliate
        const affDoc = await getDoc(doc(db, 'affiliates', affiliateId));
        if (!affDoc.exists()) {
          setLoading(false);
          return;
        }
        const affData = { id: affDoc.id, ...affDoc.data() } as Affiliate;
        setAffiliate(affData);
        setFirstRate(affData.firstBookingRate * 100);
        setRecurringRate(affData.recurringRate * 100);

        // Fetch referrals
        const refsSnapshot = await getDocs(
          query(
            collection(db, 'referrals'),
            where('affiliateId', '==', affiliateId),
            orderBy('createdAt', 'desc')
          )
        );
        const refsData = refsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Referral[];
        setReferrals(refsData);

        // Fetch clients for referrals
        const clientIds = Array.from(new Set(refsData.map(r => r.clientId)));
        const clientsData: Record<string, Client> = {};
        for (const clientId of clientIds) {
          const clientDoc = await getDoc(doc(db, 'clients', clientId));
          if (clientDoc.exists()) {
            clientsData[clientId] = { id: clientDoc.id, ...clientDoc.data() } as Client;
          }
        }
        setClients(clientsData);

        // Fetch commissions
        const commSnapshot = await getDocs(
          query(
            collection(db, 'affiliateCommissions'),
            where('affiliateId', '==', affiliateId),
            orderBy('createdAt', 'desc')
          )
        );
        setCommissions(commSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AffiliateCommission[]);

        // Fetch payouts
        const paySnapshot = await getDocs(
          query(
            collection(db, 'affiliatePayouts'),
            where('affiliateId', '==', affiliateId),
            orderBy('createdAt', 'desc')
          )
        );
        setPayouts(paySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AffiliatePayout[]);
      } catch (error) {
        console.error('Error fetching affiliate data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [affiliateId]);

  const handleApprove = async () => {
    if (!user?.uid || !affiliate) return;
    setProcessing(true);
    try {
      await approveAffiliate(affiliate.id, user.uid);
      setAffiliate({ ...affiliate, status: 'approved' });
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!affiliate) return;
    setProcessing(true);
    try {
      await suspendAffiliate(affiliate.id);
      setAffiliate({ ...affiliate, status: 'suspended' });
    } catch (error) {
      console.error('Error suspending:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateRates = async () => {
    if (!affiliate) return;
    setProcessing(true);
    try {
      await updateAffiliateRates(affiliate.id, firstRate / 100, recurringRate / 100);
      setAffiliate({
        ...affiliate,
        firstBookingRate: firstRate / 100,
        recurringRate: recurringRate / 100
      });
      setEditRates(false);
    } catch (error) {
      console.error('Error updating rates:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Affiliate not found</h2>
        <Link href="/admin/affiliates" className="text-emerald-600 hover:text-emerald-700 mt-2 inline-block">
          Back to Affiliates
        </Link>
      </div>
    );
  }

  const statusConfig = AFFILIATE_STATUS_CONFIG[affiliate.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/admin/affiliates" className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Affiliate Details</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-2xl font-semibold text-emerald-600">
                {affiliate.firstName?.[0]}{affiliate.lastName?.[0]}
              </span>
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {affiliate.firstName} {affiliate.lastName}
              </h2>
              <p className="text-gray-500">{affiliate.email}</p>
              <p className="text-gray-500">{affiliate.phone}</p>
              <div className="mt-2">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {affiliate.status === 'pending' && (
              <button
                onClick={handleApprove}
                disabled={processing}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50"
              >
                Approve
              </button>
            )}
            {affiliate.status === 'approved' && (
              <button
                onClick={handleSuspend}
                disabled={processing}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50"
              >
                Suspend
              </button>
            )}
            {affiliate.status === 'suspended' && (
              <button
                onClick={handleApprove}
                disabled={processing}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50"
              >
                Reactivate
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Referral Code</p>
            <code className="text-lg font-mono font-bold text-gray-900">{affiliate.referralCode}</code>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Referrals</p>
            <p className="text-lg font-bold text-gray-900">{referrals.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Earnings</p>
            <p className="text-lg font-bold text-emerald-600">${affiliate.totalEarnings.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Pending Payout</p>
            <p className="text-lg font-bold text-orange-600">${affiliate.pendingPayout.toFixed(2)}</p>
          </div>
        </div>

        {/* Commission Rates */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Commission Rates</h3>
            {!editRates && (
              <button
                onClick={() => setEditRates(true)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Edit Rates
              </button>
            )}
          </div>
          {editRates ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Booking Rate (%)
                  </label>
                  <input
                    type="number"
                    value={firstRate}
                    onChange={(e) => setFirstRate(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recurring Rate (%)
                  </label>
                  <input
                    type="number"
                    value={recurringRate}
                    onChange={(e) => setRecurringRate(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateRates}
                  disabled={processing}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditRates(false);
                    setFirstRate(affiliate.firstBookingRate * 100);
                    setRecurringRate(affiliate.recurringRate * 100);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{(affiliate.firstBookingRate * 100).toFixed(0)}%</p>
                <p className="text-sm text-emerald-700">First Booking</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{(affiliate.recurringRate * 100).toFixed(0)}%</p>
                <p className="text-sm text-blue-700">Recurring Bookings</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'referrals', label: `Referrals (${referrals.length})` },
              { key: 'commissions', label: `Commissions (${commissions.length})` },
              { key: 'payouts', label: `Payouts (${payouts.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.key
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">Created</dt>
                    <dd className="text-gray-900">{formatDate(affiliate.createdAt)}</dd>
                  </div>
                  {affiliate.approvedAt && (
                    <div>
                      <dt className="text-sm text-gray-500">Approved</dt>
                      <dd className="text-gray-900">{formatDate(affiliate.approvedAt)}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Referral Link</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <code className="text-sm break-all">
                    https://emeralddetailers.com/book?ref={affiliate.referralCode}
                  </code>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'referrals' && (
            <div>
              {referrals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Booking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {referrals.map((ref) => {
                        const client = clients[ref.clientId];
                        return (
                          <tr key={ref.id}>
                            <td className="px-4 py-3">
                              {client ? (
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {client.firstName} {client.lastName}
                                  </p>
                                  <p className="text-sm text-gray-500">{client.email}</p>
                                </div>
                              ) : (
                                <span className="text-gray-500">Unknown Client</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{formatDate(ref.createdAt)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                ref.isFirstBooking
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {ref.isFirstBooking ? 'Pending' : 'Completed'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No referrals yet</p>
              )}
            </div>
          )}

          {activeTab === 'commissions' && (
            <div>
              {commissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {commissions.map((comm) => {
                        const statusConfig = COMMISSION_STATUS_CONFIG[comm.status];
                        return (
                          <tr key={comm.id}>
                            <td className="px-4 py-3 text-gray-600">{formatDate(comm.createdAt)}</td>
                            <td className="px-4 py-3 text-gray-900">${comm.bookingTotal.toFixed(2)}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {(comm.commissionRate * 100).toFixed(0)}%
                              <span className="text-xs text-gray-400 ml-1">
                                ({comm.isFirstBooking ? 'first' : 'recurring'})
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-emerald-600">
                              ${comm.commissionAmount.toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No commissions yet</p>
              )}
            </div>
          )}

          {activeTab === 'payouts' && (
            <div>
              {payouts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commissions</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payouts.map((payout) => (
                        <tr key={payout.id}>
                          <td className="px-4 py-3 text-gray-600">{formatDate(payout.createdAt)}</td>
                          <td className="px-4 py-3 font-medium text-emerald-600">${payout.amount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-900 capitalize">{payout.paymentMethod}</td>
                          <td className="px-4 py-3 text-gray-600">{payout.commissionIds.length} included</td>
                          <td className="px-4 py-3 text-gray-500">{payout.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No payouts yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
