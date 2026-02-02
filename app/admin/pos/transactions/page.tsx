'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { POSTransaction, Client, Employee } from '@/lib/types';
import { getTransactions, getTransactionsByDateRange, getTransactionByReceiptNumber, getClients, getEmployees } from '@/lib/db';
import ReceiptModal from '@/components/pos/ReceiptModal';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<POSTransaction[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Selected transaction for receipt
  const [selectedTransaction, setSelectedTransaction] = useState<POSTransaction | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (dateFilter !== 'custom') {
      filterTransactions();
    }
  }, [dateFilter, statusFilter, typeFilter]);

  const loadData = async () => {
    try {
      const [transactionList, clientList, employeeList] = await Promise.all([
        getTransactions(),
        getClients(),
        getEmployees(),
      ]);

      setTransactions(transactionList);

      const clientMap: Record<string, Client> = {};
      clientList.forEach(c => { clientMap[c.id] = c; });
      setClients(clientMap);

      const employeeMap: Record<string, Employee> = {};
      employeeList.forEach(e => { employeeMap[e.id] = e; });
      setEmployees(employeeMap);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = async () => {
    setLoading(true);
    try {
      let filtered: POSTransaction[];

      if (dateFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filtered = await getTransactionsByDateRange(today, today);
      } else if (dateFilter === 'week') {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = await getTransactionsByDateRange(
          weekAgo.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        );
      } else if (dateFilter === 'month') {
        const today = new Date();
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = await getTransactionsByDateRange(
          monthAgo.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        );
      } else if (dateFilter === 'custom' && startDate && endDate) {
        filtered = await getTransactionsByDateRange(startDate, endDate);
      } else {
        filtered = await getTransactions();
      }

      setTransactions(filtered);
    } catch (error) {
      console.error('Error filtering transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      filterTransactions();
      return;
    }

    setLoading(true);
    try {
      // Search by receipt number
      const result = await getTransactionByReceiptNumber(searchQuery.trim().toUpperCase());
      if (result) {
        setTransactions([result]);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDateSearch = () => {
    if (startDate && endDate) {
      filterTransactions();
    }
  };

  // Apply local filters
  const filteredTransactions = transactions.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    return true;
  });

  // Calculate totals
  const totalRevenue = filteredTransactions
    .filter(t => t.status === 'completed' || t.status === 'partially_refunded')
    .reduce((sum, t) => sum + t.total, 0);

  const totalTips = filteredTransactions
    .filter(t => t.status === 'completed' || t.status === 'partially_refunded')
    .reduce((sum, t) => sum + t.tip, 0);

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    partially_refunded: 'bg-orange-100 text-orange-700',
    fully_refunded: 'bg-red-100 text-red-700',
  };

  if (loading && transactions.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500">View and search transaction history</p>
        </div>
        <Link
          href="/admin/pos"
          className="text-gray-500 hover:text-gray-700"
        >
          Back to POS
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by receipt number (e.g., RCP-20240115-ABCD)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Search
          </button>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                filterTransactions();
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-4">
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Date:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                onClick={handleCustomDateSearch}
                className="px-3 py-1 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
              >
                Apply
              </button>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="partially_refunded">Partially Refunded</option>
              <option value="fully_refunded">Fully Refunded</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All</option>
              <option value="booking_checkout">Booking Checkout</option>
              <option value="walk_in_sale">Walk-in Sale</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Transactions</p>
          <p className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Tips</p>
          <p className="text-2xl font-bold text-emerald-600">${totalTips.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Average Transaction</p>
          <p className="text-2xl font-bold text-gray-900">
            ${filteredTransactions.length > 0
              ? (totalRevenue / filteredTransactions.length).toFixed(2)
              : '0.00'}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No transactions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Receipt #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date/Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Payment</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Tip</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((transaction) => {
                  const client = transaction.clientId ? clients[transaction.clientId] : null;

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">{transaction.receiptNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                        <br />
                        <span className="text-xs text-gray-400">
                          {new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          transaction.type === 'booking_checkout'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {transaction.type === 'booking_checkout' ? 'Booking' : 'Walk-in'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {client ? `${client.firstName} ${client.lastName}` : 'Walk-in'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {transaction.payments.map(p => p.method).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${transaction.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600">
                        {transaction.tip > 0 ? `$${transaction.tip.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[transaction.status]}`}>
                          {transaction.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedTransaction(transaction)}
                            className="text-emerald-600 hover:text-emerald-700 text-sm"
                          >
                            View
                          </button>
                          {(transaction.status === 'completed' || transaction.status === 'partially_refunded') && (
                            <Link
                              href={`/admin/pos/refunds?transactionId=${transaction.id}`}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Refund
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedTransaction && (
        <ReceiptModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onEmailSent={() => {}}
        />
      )}
    </div>
  );
}
