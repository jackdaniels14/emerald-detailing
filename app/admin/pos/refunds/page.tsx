'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { POSTransaction, Refund, Client } from '@/lib/types';
import { getTransaction, getTransactionByReceiptNumber, getRefunds, getClients } from '@/lib/db';
import { useAuth } from '@/lib/auth-context';
import RefundForm from '@/components/pos/RefundForm';

function RefundsContent() {
  const searchParams = useSearchParams();
  const { userProfile } = useAuth();
  const transactionIdParam = searchParams.get('transactionId');

  const [recentRefunds, setRecentRefunds] = useState<Refund[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<POSTransaction | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Refund state
  const [selectedTransaction, setSelectedTransaction] = useState<POSTransaction | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<Partial<Refund> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (transactionIdParam) {
      loadTransactionById(transactionIdParam);
    }
  }, [transactionIdParam]);

  const loadData = async () => {
    try {
      const [refunds, clientList] = await Promise.all([
        getRefunds(),
        getClients(),
      ]);

      setRecentRefunds(refunds.slice(0, 10));

      const clientMap: Record<string, Client> = {};
      clientList.forEach(c => { clientMap[c.id] = c; });
      setClients(clientMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionById = async (id: string) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const transaction = await getTransaction(id);
      if (transaction) {
        setSearchResult(transaction);
        setSelectedTransaction(transaction);
      } else {
        setSearchError('Transaction not found');
      }
    } catch (error) {
      setSearchError('Error loading transaction');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);
    setSelectedTransaction(null);
    setRefundSuccess(null);

    try {
      // Search by receipt number
      const result = await getTransactionByReceiptNumber(searchQuery.trim().toUpperCase());
      if (result) {
        setSearchResult(result);
      } else {
        setSearchError('No transaction found with that receipt number');
      }
    } catch (error) {
      setSearchError('Error searching for transaction');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRefundComplete = (refund: Partial<Refund>) => {
    setRefundSuccess(refund);
    setSelectedTransaction(null);
    loadData(); // Refresh refunds list
  };

  const canRefund = (transaction: POSTransaction) => {
    return transaction.status === 'completed' || transaction.status === 'partially_refunded';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Process Refunds</h1>
          <p className="text-gray-500">Search for a transaction to process a refund</p>
        </div>
        <Link
          href="/admin/pos"
          className="text-gray-500 hover:text-gray-700"
        >
          Back to POS
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Section */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-medium text-gray-900 mb-3">Find Transaction</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter receipt number (e.g., RCP-20240115-ABCD)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 transition-colors"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchError && (
              <p className="mt-2 text-sm text-red-600">{searchError}</p>
            )}
          </div>

          {/* Search Result */}
          {searchResult && !selectedTransaction && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Transaction Found</h3>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Receipt #:</span>
                  <span className="font-mono">{searchResult.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span>{new Date(searchResult.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-medium">${searchResult.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    searchResult.status === 'completed' ? 'bg-green-100 text-green-700' :
                    searchResult.status === 'partially_refunded' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {searchResult.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-gray-100 pt-3 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                {searchResult.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className={item.type === 'discount' ? 'text-emerald-600' : ''}>
                      {item.description}
                    </span>
                    <span className={item.type === 'discount' ? 'text-emerald-600' : ''}>
                      {item.type === 'discount' ? '-' : ''}${Math.abs(item.total).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Payments */}
              <div className="border-t border-gray-100 pt-3 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Payments:</p>
                {searchResult.payments.map((payment, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="capitalize">
                      {payment.method}
                      {payment.cardLast4 && ` (**** ${payment.cardLast4})`}
                    </span>
                    <span>
                      ${payment.amount.toFixed(2)}
                      {payment.refundedAmount && payment.refundedAmount > 0 && (
                        <span className="text-red-500 ml-1">
                          (${payment.refundedAmount.toFixed(2)} refunded)
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {canRefund(searchResult) ? (
                <button
                  onClick={() => setSelectedTransaction(searchResult)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Process Refund
                </button>
              ) : (
                <p className="text-center text-gray-500 text-sm">
                  This transaction has been fully refunded
                </p>
              )}
            </div>
          )}

          {/* Refund Form */}
          {selectedTransaction && userProfile && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-4">Process Refund</h3>
              <RefundForm
                transaction={selectedTransaction}
                onRefundComplete={handleRefundComplete}
                onCancel={() => setSelectedTransaction(null)}
                processedBy={userProfile.uid}
              />
            </div>
          )}

          {/* Success Message */}
          {refundSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Refund Processed Successfully</span>
              </div>
              <p className="mt-2 text-sm text-green-600">
                Refund of ${refundSuccess.amount?.toFixed(2)} has been processed.
              </p>
              <button
                onClick={() => {
                  setRefundSuccess(null);
                  setSearchResult(null);
                  setSearchQuery('');
                }}
                className="mt-3 text-sm text-green-700 underline hover:no-underline"
              >
                Process Another Refund
              </button>
            </div>
          )}
        </div>

        {/* Recent Refunds */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">Recent Refunds</h2>
          </div>

          {recentRefunds.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No refunds processed yet
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentRefunds.map((refund) => (
                <div key={refund.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        ${refund.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {refund.type === 'full' ? 'Full' : 'Partial'} refund
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {refund.reason}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        refund.status === 'completed' ? 'bg-green-100 text-green-700' :
                        refund.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {refund.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(refund.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RefundsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <RefundsContent />
    </Suspense>
  );
}
