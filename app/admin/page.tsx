'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, Client, Employee, TimeEntry } from '@/lib/types';

// Stats card component
function StatCard({
  title,
  value,
  change,
  changeType,
  icon,
}: {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}) {
  const changeColors = {
    positive: 'text-green-600 bg-green-100',
    negative: 'text-red-600 bg-red-100',
    neutral: 'text-gray-600 bg-gray-100',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
          {icon}
        </div>
      </div>
      {change && changeType && (
        <div className="mt-4">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${changeColors[changeType]}`}>
            {changeType === 'positive' && (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
            {changeType === 'negative' && (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {change}
          </span>
          <span className="text-xs text-gray-500 ml-2">vs last week</span>
        </div>
      )}
    </div>
  );
}

// Quick action button component
function QuickAction({
  title,
  description,
  href,
  icon,
  color,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div className="ml-4">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Data states
  const [todaysBookings, setTodaysBookings] = useState<(Booking & { clientName: string })[]>([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeTimeEntries, setActiveTimeEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get start of week (Monday)
        const dayOfWeek = today.getDay();
        const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - daysSinceMonday);

        // Fetch all data in parallel
        const [bookingsSnap, clientsSnap, employeesSnap, timeEntriesSnap] = await Promise.all([
          getDocs(collection(db, 'bookings')),
          getDocs(collection(db, 'clients')),
          getDocs(query(collection(db, 'employees'), orderBy('firstName'))),
          getDocs(collection(db, 'timeEntries')),
        ]);

        // Process clients
        const clientsMap: Record<string, Client> = {};
        clientsSnap.docs.forEach(doc => {
          clientsMap[doc.id] = { id: doc.id, ...doc.data() } as Client;
        });
        setTotalClients(clientsSnap.docs.length);

        // Process bookings
        const allBookings = bookingsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Booking[];

        // Today's bookings
        const todayBookings = allBookings.filter(booking => {
          const bookingDate = booking.scheduledDate as any;
          const date = bookingDate?.seconds
            ? new Date(bookingDate.seconds * 1000)
            : new Date(bookingDate);
          return date >= today && date < tomorrow;
        }).map(booking => ({
          ...booking,
          clientName: clientsMap[booking.clientId]
            ? `${clientsMap[booking.clientId].firstName} ${clientsMap[booking.clientId].lastName}`
            : 'Unknown Client'
        }));

        // Sort by time
        todayBookings.sort((a, b) => {
          const timeA = parseInt(a.scheduledTime?.replace(':', '') || '0');
          const timeB = parseInt(b.scheduledTime?.replace(':', '') || '0');
          return timeA - timeB;
        });

        setTodaysBookings(todayBookings);

        // Weekly revenue (completed bookings this week)
        const weeklyCompletedBookings = allBookings.filter(booking => {
          if (booking.status !== 'completed') return false;
          const bookingDate = booking.scheduledDate as any;
          const date = bookingDate?.seconds
            ? new Date(bookingDate.seconds * 1000)
            : new Date(bookingDate);
          return date >= weekStart && date <= now;
        });

        const revenue = weeklyCompletedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        setWeeklyRevenue(revenue);

        // Completion rate (this month)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthBookings = allBookings.filter(booking => {
          const bookingDate = booking.scheduledDate as any;
          const date = bookingDate?.seconds
            ? new Date(bookingDate.seconds * 1000)
            : new Date(bookingDate);
          return date >= monthStart && date <= now;
        });

        const completedCount = monthBookings.filter(b => b.status === 'completed').length;
        const nonCancelledCount = monthBookings.filter(b => b.status !== 'cancelled').length;
        const rate = nonCancelledCount > 0 ? Math.round((completedCount / nonCancelledCount) * 100) : 0;
        setCompletionRate(rate);

        // Process employees
        const employeesData = employeesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Employee[];
        setEmployees(employeesData.filter(e => e.isActive));

        // Active time entries (currently clocked in)
        const timeEntries = timeEntriesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TimeEntry[];

        const active = timeEntries.filter(entry => !entry.clockOut);
        setActiveTimeEntries(active);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTime = (time: string) => {
    const hour = parseInt(time);
    if (hour > 12) return `${hour - 12}:00 PM`;
    if (hour === 12) return '12:00 PM';
    return `${time} AM`;
  };

  const getEmployeeById = (id: string) => {
    return employees.find(e => e.id === id);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}, {userProfile?.firstName || 'Admin'}
          </h1>
          <p className="text-gray-500 mt-1">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <p className="text-sm text-gray-500">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Bookings"
          value={todaysBookings.length.toString()}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          title="Weekly Revenue"
          value={`$${weeklyRevenue.toLocaleString()}`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Clients"
          value={totalClients.toString()}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            title="New Booking"
            description="Schedule a new service"
            href="/admin/bookings/new"
            icon={
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
            color="bg-emerald-500"
          />
          <QuickAction
            title="Add Client"
            description="Register new customer"
            href="/admin/clients/new"
            icon={
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            }
            color="bg-blue-500"
          />
          <QuickAction
            title="Clock In/Out"
            description="Track employee time"
            href="/admin/timeclock"
            icon={
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="bg-purple-500"
          />
          <QuickAction
            title="View Reports"
            description="Analytics & insights"
            href="/admin/analytics"
            icon={
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            color="bg-orange-500"
          />
        </div>
      </div>

      {/* Today's Bookings */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Today's Bookings</h2>
          <Link
            href="/admin/bookings"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            View all
          </Link>
        </div>
        {todaysBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {todaysBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatTime(booking.scheduledTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.clientName}</div>
                      <div className="text-xs text-gray-500">{booking.vehicleInfo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">
                        {booking.serviceType} - {booking.serviceTier}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusStyles[booking.status]}`}>
                        {statusLabels[booking.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/admin/bookings/edit?id=${booking.id}`}
                        className="text-emerald-600 hover:text-emerald-900 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500">No bookings scheduled for today</p>
            <Link
              href="/admin/bookings/new"
              className="inline-flex items-center mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium text-sm"
            >
              Create Booking
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employees on duty */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Employees On Duty</h2>
          {activeTimeEntries.length > 0 ? (
            <div className="space-y-4">
              {activeTimeEntries.map((entry) => {
                const employee = getEmployeeById(entry.employeeId);
                if (!employee) return null;

                const clockInTime = entry.clockIn as any;
                const clockInDate = clockInTime?.seconds
                  ? new Date(clockInTime.seconds * 1000)
                  : new Date(clockInTime);

                return (
                  <div key={entry.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: employee.scheduleColor || '#10b981' }}
                      >
                        <span className="text-sm font-medium text-white">
                          {employee.firstName?.[0]}{employee.lastName?.[0]}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Since {clockInDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Working
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No employees currently clocked in</p>
            </div>
          )}
          <Link
            href="/admin/timeclock"
            className="mt-4 block text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Manage Time Clock
          </Link>
        </div>

        {/* Upcoming tasks */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Today</h2>
          {todaysBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled').length > 0 ? (
            <div className="space-y-4">
              {todaysBookings
                .filter(b => b.status !== 'completed' && b.status !== 'cancelled')
                .slice(0, 5)
                .map((booking) => (
                  <div key={booking.id} className="flex items-start">
                    <div className="flex-shrink-0 w-20 text-sm font-medium text-gray-500">
                      {formatTime(booking.scheduledTime)}
                    </div>
                    <div className="ml-4 flex-1 border-l-2 border-emerald-200 pl-4">
                      <p className="text-sm font-medium text-gray-900">
                        {booking.serviceType} for {booking.clientName}
                      </p>
                      <p className="text-xs text-gray-500">{booking.vehicleInfo}</p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming jobs today</p>
            </div>
          )}
          <Link
            href="/admin/schedule"
            className="mt-4 block text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            View Full Schedule
          </Link>
        </div>
      </div>
    </div>
  );
}
