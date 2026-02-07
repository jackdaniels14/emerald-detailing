'use client';

interface AffiliateStatsProps {
  stats: {
    totalReferrals: number;
    totalCommissions: number;
    totalEarnings: number;
    pendingPayout: number;
    thisMonthEarnings: number;
    lastMonthEarnings: number;
  };
}

export default function AffiliateStats({ stats }: AffiliateStatsProps) {
  const monthChange = stats.lastMonthEarnings > 0
    ? ((stats.thisMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings * 100).toFixed(0)
    : stats.thisMonthEarnings > 0 ? '100' : '0';

  const isPositiveChange = parseFloat(monthChange) >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Referrals */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v-1a6 6 0 00-3-5.197" />
            </svg>
          </div>
        </div>
        <p className="mt-4 text-2xl font-bold text-gray-900">{stats.totalReferrals}</p>
        <p className="text-sm text-gray-500">Total Referrals</p>
      </div>

      {/* Total Earnings */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p className="mt-4 text-2xl font-bold text-gray-900">${stats.totalEarnings.toFixed(2)}</p>
        <p className="text-sm text-gray-500">Total Earnings</p>
      </div>

      {/* Pending Payout */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p className="mt-4 text-2xl font-bold text-gray-900">${stats.pendingPayout.toFixed(2)}</p>
        <p className="text-sm text-gray-500">Pending Payout</p>
      </div>

      {/* This Month */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          {stats.lastMonthEarnings > 0 && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              isPositiveChange
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {isPositiveChange ? '+' : ''}{monthChange}%
            </span>
          )}
        </div>
        <p className="mt-4 text-2xl font-bold text-gray-900">${stats.thisMonthEarnings.toFixed(2)}</p>
        <p className="text-sm text-gray-500">This Month</p>
      </div>
    </div>
  );
}
