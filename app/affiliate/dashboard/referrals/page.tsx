'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Affiliate, Referral } from '@/lib/affiliate-types';
import { Client } from '@/lib/types';

export default function AffiliateReferralsPage() {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
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

        // Get referrals
        const refSnapshot = await getDocs(
          query(
            collection(db, 'referrals'),
            where('affiliateId', '==', affData.id),
            orderBy('createdAt', 'desc')
          )
        );
        const refs = refSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Referral[];
        setReferrals(refs);

        // Get client info
        const clientsData: Record<string, Client> = {};
        for (const ref of refs) {
          const clientDoc = await getDoc(doc(db, 'clients', ref.clientId));
          if (clientDoc.exists()) {
            clientsData[ref.clientId] = { id: clientDoc.id, ...clientDoc.data() } as Client;
          }
        }
        setClients(clientsData);
      } catch (error) {
        console.error('Error loading referrals:', error);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your Referrals</h1>
        <p className="text-gray-500 mt-1">
          Customers who signed up using your referral link
        </p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Total Referrals</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{referrals.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">First Booking Pending</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {referrals.filter(r => r.isFirstBooking).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Converted</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">
            {referrals.filter(r => !r.isFirstBooking).length}
          </p>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {referrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referral Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {referrals.map((ref) => {
                  const client = clients[ref.clientId];
                  return (
                    <tr key={ref.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {client ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {client.firstName} {client.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{client.email}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Customer #{ref.clientId.slice(0, 8)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(ref.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          ref.isFirstBooking
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {ref.isFirstBooking ? 'Awaiting First Booking' : 'Converted'}
                        </span>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v-1a6 6 0 00-3-5.197" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">No referrals yet</h3>
            <p className="text-gray-500 mt-1">
              Share your referral link to start building your network
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
