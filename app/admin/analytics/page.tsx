'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, Client } from '@/lib/types';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all bookings
        const bookingsRef = collection(db, 'bookings');
        const bookingsSnap = await getDocs(bookingsRef);
        const bookingData = bookingsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Booking[];
        setBookings(bookingData);

        // Fetch all clients
        const clientsRef = collection(db, 'clients');
        const clientsSnap = await getDocs(clientsRef);
        const clientData = clientsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Client[];
        setClients(clientData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get date range start
  const getStartDate = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  const getBookingDate = (booking: Booking) => {
    const scheduledDate = booking.scheduledDate as any;
    return scheduledDate?.seconds
      ? new Date(scheduledDate.seconds * 1000)
      : new Date(scheduledDate);
  };

  const getClientDate = (client: Client) => {
    const createdAt = client.createdAt as any;
    return createdAt?.seconds
      ? new Date(createdAt.seconds * 1000)
      : new Date(createdAt);
  };

  // Filter bookings by date range
  const startDate = getStartDate();
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = getBookingDate(booking);
    return bookingDate >= startDate;
  });

  // Calculate metrics
  const totalRevenue = filteredBookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const completedBookings = filteredBookings.filter(b => b.status === 'completed').length;
  const pendingBookings = filteredBookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length;
  const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled').length;
  const inProgressBookings = filteredBookings.filter(b => b.status === 'in_progress').length;

  // New clients in date range
  const newClients = clients.filter(client => {
    const clientDate = getClientDate(client);
    return clientDate >= startDate;
  }).length;

  // Active subscriptions
  const activeSubscriptions = clients.filter(
    c => c.subscriptionStatus && c.subscriptionStatus !== 'none'
  ).length;

  // Revenue by service type
  const revenueByService = filteredBookings
    .filter(b => b.status === 'completed')
    .reduce((acc, booking) => {
      const key = `${booking.serviceType} ${booking.serviceTier}`;
      if (!acc[key]) {
        acc[key] = { revenue: 0, count: 0 };
      }
      acc[key].revenue += booking.totalPrice || 0;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { revenue: number; count: number }>);

  const revenueByServiceArray = Object.entries(revenueByService)
    .map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      revenue: data.revenue,
      count: data.count,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Top clients by spending
  const clientSpending = filteredBookings
    .filter(b => b.status === 'completed')
    .reduce((acc, booking) => {
      if (!acc[booking.clientId]) {
        acc[booking.clientId] = { bookings: 0, spent: 0, lastDate: null as Date | null };
      }
      acc[booking.clientId].bookings += 1;
      acc[booking.clientId].spent += booking.totalPrice || 0;
      const bookingDate = getBookingDate(booking);
      if (!acc[booking.clientId].lastDate || bookingDate > acc[booking.clientId].lastDate!) {
        acc[booking.clientId].lastDate = bookingDate;
      }
      return acc;
    }, {} as Record<string, { bookings: number; spent: number; lastDate: Date | null }>);

  const topClients = Object.entries(clientSpending)
    .map(([clientId, data]) => {
      const client = clients.find(c => c.id === clientId);
      return {
        name: client ? `${client.firstName} ${client.lastName}` : 'Unknown',
        bookings: data.bookings,
        spent: data.spent,
        lastDate: data.lastDate,
      };
    })
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  const formatLastService = (date: Date | null) => {
    if (!date) return 'N/A';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const totalBookingsInRange = filteredBookings.length;
  const completionRate = totalBookingsInRange > 0
    ? Math.round((completedBookings / totalBookingsInRange) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Track your business performance</p>
        </div>
        <div className="flex items-center gap-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-gray-500 text-sm">{completedBookings} completed jobs</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{totalBookingsInRange}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-green-600 text-sm font-medium">{completedBookings} completed</span>
            {pendingBookings > 0 && <span className="text-yellow-600 text-sm ml-2">{pendingBookings} pending</span>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">New Clients</p>
              <p className="text-2xl font-bold text-gray-900">{newClients}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-gray-500 text-sm">{clients.length} total clients</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">{activeSubscriptions}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-emerald-600 text-sm font-medium">Recurring revenue</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Service */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Service</h2>
          {revenueByServiceArray.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No completed bookings in this period</p>
            </div>
          ) : (
            <div className="space-y-4">
              {revenueByServiceArray.map((service, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{service.name}</span>
                    <span className="font-medium text-gray-900">${service.revenue.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${(service.revenue / (totalRevenue || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{service.count} service{service.count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Booking Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Status</h2>
          <div className="flex items-center justify-center h-48">
            <div className="relative w-40 h-40">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle cx="80" cy="80" r="70" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${(completionRate / 100) * 440} 440`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{completionRate}%</p>
                  <p className="text-sm text-gray-500">Completed</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="text-center">
              <p className="text-xl font-bold text-green-600">{completedBookings}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-purple-600">{inProgressBookings}</p>
              <p className="text-xs text-gray-500">In Progress</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-yellow-600">{pendingBookings}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-600">{cancelledBookings}</p>
              <p className="text-xs text-gray-500">Cancelled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Clients */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Clients</h2>
        {topClients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No client data available for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Bookings</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Last Service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topClients.map((client, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{client.name}</td>
                    <td className="py-3 px-4 text-gray-600">{client.bookings}</td>
                    <td className="py-3 px-4 font-medium text-emerald-600">${client.spent.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-500">{formatLastService(client.lastDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
