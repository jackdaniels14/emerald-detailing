'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { POSTransaction, Booking, Client, Employee } from '@/lib/types';
import { getTransactionsByDate, getPendingCheckouts, getClients, getEmployees } from '@/lib/db';

export default function POSDashboard() {
  const [todayTransactions, setTodayTransactions] = useState<POSTransaction[]>([]);
  const [pendingCheckouts, setPendingCheckouts] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [transactions, checkouts, clientList, employeeList] = await Promise.all([
        getTransactionsByDate(today),
        getPendingCheckouts(),
        getClients(),
        getEmployees(),
      ]);

      setTodayTransactions(transactions);
      setPendingCheckouts(checkouts);

      // Create lookup maps
      const clientMap: Record<string, Client> = {};
      clientList.forEach(c => { clientMap[c.id] = c; });
      setClients(clientMap);

      const employeeMap: Record<string, Employee> = {};
      employeeList.forEach(e => { employeeMap[e.id] = e; });
      setEmployees(employeeMap);
    } catch (error) {
      console.error('Error loading POS data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalRevenue = todayTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.total, 0);

  const totalTips = todayTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.tip, 0);

  const transactionCount = todayTransactions.filter(t => t.status === 'completed').length;

  const cardTransactions = todayTransactions.filter(t =>
    t.payments.some(p => p.method === 'card' && p.status === 'completed')
  ).length;

  const cashTransactions = todayTransactions.filter(t =>
    t.payments.some(p => p.method === 'cash' && p.status === 'completed')
  ).length;

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
          <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-gray-500">Process payments and manage transactions</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/pos/walk-in"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            + New Sale
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href="/admin/pos/checkout"
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Checkout Booking</p>
              <p className="text-sm text-gray-500">Process completed jobs</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/pos/walk-in"
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Walk-in Sale</p>
              <p className="text-sm text-gray-500">Quick sale for walk-ins</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/pos/transactions"
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Transactions</p>
              <p className="text-sm text-gray-500">View history</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/pos/refunds"
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Refunds</p>
              <p className="text-sm text-gray-500">Process refunds</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Today's Revenue</p>
          <p className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Transactions</p>
          <p className="text-2xl font-bold text-gray-900">{transactionCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Tips Collected</p>
          <p className="text-2xl font-bold text-emerald-600">${totalTips.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Payment Split</p>
          <p className="text-lg font-medium">
            <span className="text-blue-600">{cardTransactions} card</span>
            {' / '}
            <span className="text-green-600">{cashTransactions} cash</span>
          </p>
        </div>
      </div>

      {/* Pending Checkouts */}
      {pendingCheckouts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-200">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="font-medium text-yellow-800">Pending Checkouts ({pendingCheckouts.length})</h2>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingCheckouts.slice(0, 5).map((booking) => {
              const client = clients[booking.clientId];
              const employee = booking.employeeId ? employees[booking.employeeId] : null;

              return (
                <div key={booking.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">
                      {client ? `${client.firstName} ${client.lastName}` : 'Unknown Client'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {booking.serviceType} {booking.serviceTier} - ${booking.totalPrice.toFixed(2)}
                    </p>
                    {employee && (
                      <p className="text-xs text-gray-400">
                        Serviced by: {employee.firstName} {employee.lastName}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/admin/pos/checkout?bookingId=${booking.id}`}
                    className="px-3 py-1 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Checkout
                  </Link>
                </div>
              );
            })}
          </div>
          {pendingCheckouts.length > 5 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <Link
                href="/admin/pos/checkout"
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                View all {pendingCheckouts.length} pending checkouts
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-medium text-gray-900">Recent Transactions</h2>
          <Link
            href="/admin/pos/transactions"
            className="text-sm text-emerald-600 hover:text-emerald-700"
          >
            View All
          </Link>
        </div>
        {todayTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No transactions today
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {todayTransactions.slice(0, 10).map((transaction) => {
              const client = transaction.clientId ? clients[transaction.clientId] : null;
              const statusColors = {
                completed: 'bg-green-100 text-green-700',
                pending: 'bg-yellow-100 text-yellow-700',
                partially_refunded: 'bg-orange-100 text-orange-700',
                fully_refunded: 'bg-red-100 text-red-700',
              };

              return (
                <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {transaction.receiptNumber}
                      </p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[transaction.status]}`}>
                        {transaction.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {client ? `${client.firstName} ${client.lastName}` : 'Walk-in'}
                      {' - '}
                      {new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${transaction.total.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">
                      {transaction.payments.map(p => p.method).join(', ')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
