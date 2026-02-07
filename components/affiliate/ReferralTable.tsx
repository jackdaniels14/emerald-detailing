'use client';

import { Referral } from '@/lib/affiliate-types';
import { Client } from '@/lib/types';

interface ReferralTableProps {
  referrals: Referral[];
  clients: Record<string, Client>;
}

export default function ReferralTable({ referrals, clients }: ReferralTableProps) {
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (referrals.length === 0) {
    return (
      <div className="p-8 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-sm text-gray-500">No referrals yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referred</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {referrals.map((ref) => {
            const client = clients[ref.clientId];
            return (
              <tr key={ref.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {client ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{client.email}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Customer</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(ref.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    ref.isFirstBooking
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {ref.isFirstBooking ? 'Pending' : 'Converted'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
