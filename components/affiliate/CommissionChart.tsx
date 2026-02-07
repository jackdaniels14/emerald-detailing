'use client';

interface CommissionChartProps {
  data: { month: string; earnings: number }[];
}

export default function CommissionChart({ data }: CommissionChartProps) {
  const maxEarnings = Math.max(...data.map(d => d.earnings), 1);

  return (
    <div className="h-64">
      {data.some(d => d.earnings > 0) ? (
        <div className="flex items-end justify-between h-full gap-2">
          {data.map((item, index) => {
            const height = (item.earnings / maxEarnings) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end h-48">
                  <div
                    className="w-full max-w-12 bg-emerald-500 rounded-t-lg transition-all duration-300 hover:bg-emerald-600"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${item.month}: $${item.earnings.toFixed(2)}`}
                  />
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-500 whitespace-nowrap">{item.month}</p>
                  <p className="text-xs font-medium text-gray-700">${item.earnings.toFixed(0)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm text-gray-500">No earnings data yet</p>
            <p className="text-xs text-gray-400 mt-1">Start sharing your referral link!</p>
          </div>
        </div>
      )}
    </div>
  );
}
