'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, Client, Employee } from '@/lib/types';

export default function SchedulePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch bookings
        const bookingsRef = collection(db, 'bookings');
        const bookingsSnap = await getDocs(bookingsRef);
        const bookingData = bookingsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Booking[];
        setBookings(bookingData);

        // Fetch clients
        const clientsRef = collection(db, 'clients');
        const clientsSnap = await getDocs(clientsRef);
        const clientsMap: Record<string, Client> = {};
        clientsSnap.docs.forEach(doc => {
          clientsMap[doc.id] = { id: doc.id, ...doc.data() } as Client;
        });
        setClients(clientsMap);

        // Fetch employees
        const employeesRef = collection(db, 'employees');
        const employeesSnap = await getDocs(employeesRef);
        const employeesData = employeesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Employee[];
        setEmployees(employeesData.filter(e => e.isActive));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Get week dates
  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentDate);

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const getBookingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(booking => {
      const scheduledDate = booking.scheduledDate as any;
      const bookingDate = scheduledDate?.seconds
        ? new Date(scheduledDate.seconds * 1000)
        : new Date(scheduledDate);
      const bookingDateStr = bookingDate.toISOString().split('T')[0];
      const matchesDate = bookingDateStr === dateStr;
      const matchesEmployee = selectedEmployee === 'all' || booking.employeeId === selectedEmployee;
      return matchesDate && matchesEmployee && booking.status !== 'cancelled';
    });
  };

  const getClientName = (clientId: string) => {
    const client = clients[clientId];
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown';
  };

  const getEmployee = (employeeId: string | undefined) => {
    if (!employeeId) return null;
    return employees.find(e => e.id === employeeId);
  };

  const formatTime = (time: string) => {
    const hour = parseInt(time);
    if (hour > 12) return `${hour - 12}:00 PM`;
    if (hour === 12) return '12:00 PM';
    return `${hour}:00 AM`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'border-blue-400';
      case 'in_progress': return 'border-purple-400';
      case 'completed': return 'border-green-400';
      default: return 'border-yellow-400';
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Calendar</h1>
          <p className="text-gray-500 mt-1">View and manage appointments</p>
        </div>
        <Link
          href="/admin/bookings/new"
          className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Booking
        </Link>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center min-w-[200px]">
              <p className="font-semibold text-gray-900">
                {weekDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
              <p className="text-sm text-gray-500">
                {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg"
            >
              Today
            </button>
          </div>

          {/* Employee Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Filter:</span>
            <button
              onClick={() => setSelectedEmployee('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedEmployee === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {employees.map((employee) => (
              <button
                key={employee.id}
                onClick={() => setSelectedEmployee(employee.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  selectedEmployee === employee.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: employee.scheduleColor || '#10b981' }}
                />
                {employee.firstName}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile List View */}
      <div className="lg:hidden space-y-4">
        {weekDates.map((date, idx) => {
          const dayBookings = getBookingsForDate(date);
          return (
            <div
              key={idx}
              className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                isToday(date) ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              {/* Day Header */}
              <div className={`px-4 py-3 ${isToday(date) ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-lg font-bold ${isToday(date) ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Day Bookings */}
              <div className="divide-y divide-gray-100">
                {dayBookings.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No bookings</p>
                ) : (
                  dayBookings
                    .sort((a, b) => parseInt(a.scheduledTime) - parseInt(b.scheduledTime))
                    .map((booking) => {
                      const employee = getEmployee(booking.employeeId);
                      return (
                        <Link
                          key={booking.id}
                          href={`/admin/bookings/edit?id=${booking.id}`}
                          className="flex items-center gap-3 p-4 hover:bg-gray-50"
                        >
                          <div
                            className="w-1 h-12 rounded-full flex-shrink-0"
                            style={{ backgroundColor: employee?.scheduleColor || '#9ca3af' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{formatTime(booking.scheduledTime)}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                booking.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                                booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {booking.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900 truncate">{getClientName(booking.clientId)}</p>
                            <p className="text-sm text-gray-500 capitalize">{booking.serviceType} - {booking.serviceTier}</p>
                            {employee && (
                              <p className="text-sm text-gray-400">{employee.firstName} {employee.lastName}</p>
                            )}
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      );
                    })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Calendar Grid */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDates.map((date, idx) => (
            <div
              key={idx}
              className={`p-4 text-center border-r last:border-r-0 ${
                isToday(date) ? 'bg-emerald-50' : 'bg-gray-50'
              }`}
            >
              <p className="text-xs font-medium text-gray-500 uppercase">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p className={`text-2xl font-bold mt-1 ${
                isToday(date) ? 'text-emerald-600' : 'text-gray-900'
              }`}>
                {date.getDate()}
              </p>
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="grid grid-cols-7 min-h-[500px]">
          {weekDates.map((date, idx) => {
            const dayBookings = getBookingsForDate(date);
            return (
              <div
                key={idx}
                className={`border-r last:border-r-0 p-2 ${
                  isToday(date) ? 'bg-emerald-50/30' : ''
                }`}
              >
                <div className="space-y-2">
                  {dayBookings.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">No bookings</p>
                  ) : (
                    dayBookings
                      .sort((a, b) => parseInt(a.scheduledTime) - parseInt(b.scheduledTime))
                      .map((booking) => {
                        const employee = getEmployee(booking.employeeId);
                        return (
                          <Link
                            key={booking.id}
                            href={`/admin/bookings/edit?id=${booking.id}`}
                            className={`block p-2 rounded-lg text-white text-xs hover:opacity-90 transition-opacity border-l-4 ${getStatusColor(booking.status)}`}
                            style={{
                              backgroundColor: employee?.scheduleColor || '#9ca3af',
                            }}
                          >
                            <p className="font-bold truncate">
                              {formatTime(booking.scheduledTime)}
                            </p>
                            <p className="font-medium truncate">
                              {getClientName(booking.clientId)}
                            </p>
                            <p className="truncate opacity-90 capitalize">
                              {booking.serviceType}
                            </p>
                            {employee && (
                              <p className="truncate opacity-75 text-[10px] mt-1">
                                {employee.firstName} {employee.lastName}
                              </p>
                            )}
                          </Link>
                        );
                      })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Team Colors</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-400" />
                <span className="text-sm text-gray-600">Unassigned</span>
              </div>
              {employees.map((employee) => (
                <div key={employee.id} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: employee.scheduleColor || '#10b981' }}
                  />
                  <span className="text-sm text-gray-600">
                    {employee.firstName} {employee.lastName}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Status</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-yellow-400 rounded" />
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-400 rounded" />
                <span className="text-sm text-gray-600">Confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-purple-400 rounded" />
                <span className="text-sm text-gray-600">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-green-400 rounded" />
                <span className="text-sm text-gray-600">Completed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
