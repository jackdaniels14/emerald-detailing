'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, Client, Employee } from '@/lib/types';

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

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch bookings
        const bookingsRef = collection(db, 'bookings');
        const bookingsSnap = await getDocs(query(bookingsRef, orderBy('scheduledDate', 'desc')));
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
        const employeesMap: Record<string, Employee> = {};
        employeesSnap.docs.forEach(doc => {
          employeesMap[doc.id] = { id: doc.id, ...doc.data() } as Employee;
        });
        setEmployees(employeesMap);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const updateStatus = async (bookingId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: newStatus as any } : b)
      );
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter !== 'all' && booking.status !== filter) return false;
    return true;
  });

  const getClientName = (clientId: string) => {
    const client = clients[clientId];
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
  };

  const getEmployeeName = (employeeId: string | undefined) => {
    if (!employeeId) return 'Unassigned';
    const employee = employees[employeeId];
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const getEmployeeColor = (employeeId: string | undefined) => {
    if (!employeeId) return '#9ca3af';
    const employee = employees[employeeId];
    return employee?.scheduleColor || '#10b981';
  };

  const formatDate = (date: any) => {
    if (!date) return 'No date';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-1">
            {bookings.length} total booking{bookings.length !== 1 ? 's' : ''}
          </p>
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

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : statusLabels[status]}
              {status !== 'all' && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                  {bookings.filter(b => b.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading bookings...</p>
          </div>
        ) : filteredBookings.length > 0 ? (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="p-4 space-y-3">
                  {/* Header: Client & Status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{getClientName(booking.clientId)}</h3>
                      <p className="text-sm text-gray-500 capitalize">{booking.serviceType} - {booking.serviceTier}</p>
                    </div>
                    <select
                      value={booking.status}
                      onChange={(e) => updateStatus(booking.id, e.target.value)}
                      className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${statusStyles[booking.status]}`}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Date & Time</p>
                      <p className="font-medium">{formatDate(booking.scheduledDate)}</p>
                      <p className="text-gray-600">{booking.scheduledTime}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total</p>
                      <p className="font-semibold text-lg">${booking.totalPrice}</p>
                      <p className={`text-xs ${booking.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {booking.paymentStatus}
                      </p>
                    </div>
                  </div>

                  {/* Assigned To */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getEmployeeColor(booking.employeeId) }}
                    />
                    <span className="text-sm">{getEmployeeName(booking.employeeId)}</span>
                  </div>

                  {/* Address */}
                  <p className="text-sm text-gray-500 truncate">{booking.serviceAddress}</p>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link
                      href={`/admin/bookings/edit?id=${booking.id}`}
                      className="flex-1 text-center px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-medium text-sm"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/bookings/photos?id=${booking.id}`}
                      className="flex-1 text-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm"
                    >
                      Photos
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{getClientName(booking.clientId)}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{booking.serviceAddress}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">{booking.serviceType} - {booking.serviceTier}</div>
                        {booking.addOns && booking.addOns.length > 0 && (
                          <div className="text-xs text-gray-500">+ {booking.addOns.length} add-on{booking.addOns.length !== 1 ? 's' : ''}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(booking.scheduledDate)}</div>
                        <div className="text-sm text-gray-500">{booking.scheduledTime}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getEmployeeColor(booking.employeeId) }} />
                          <span className="text-sm text-gray-900">{getEmployeeName(booking.employeeId)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={booking.status}
                          onChange={(e) => updateStatus(booking.id, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer ${statusStyles[booking.status]}`}
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">${booking.totalPrice}</div>
                        <div className={`text-xs ${booking.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>{booking.paymentStatus}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                        <Link href={`/admin/bookings/photos?id=${booking.id}`} className="text-blue-600 hover:text-blue-900 font-medium">Photos</Link>
                        <Link href={`/admin/bookings/edit?id=${booking.id}`} className="text-emerald-600 hover:text-emerald-900 font-medium">Edit</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">No bookings found</h3>
            <p className="text-gray-500 mt-1">Get started by creating a new booking.</p>
            <Link
              href="/admin/bookings/new"
              className="inline-flex items-center mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
            >
              Create Booking
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
