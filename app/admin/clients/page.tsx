'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Client } from '@/lib/types';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const clientData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
      setClients(clientData);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async (clientId: string) => {
    try {
      await deleteDoc(doc(db, 'clients', clientId));
      setClients(clients.filter(c => c.id !== clientId));
      setDeleteConfirm(null);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const filteredClients = clients.filter(client => {
    const searchLower = searchQuery.toLowerCase();
    return (
      client.firstName?.toLowerCase().includes(searchLower) ||
      client.lastName?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phone?.includes(searchQuery)
    );
  });

  const subscriptionBadge = (status: string | undefined) => {
    const styles: Record<string, string> = {
      none: 'bg-gray-100 text-gray-600',
      monthly: 'bg-blue-100 text-blue-800',
      biweekly: 'bg-emerald-100 text-emerald-800',
      weekly: 'bg-purple-100 text-purple-800',
    };
    return styles[status || 'none'] || styles.none;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">
            {clients.length} total client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add Client
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading clients...</p>
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedClient(client)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-lg font-semibold text-emerald-600">
                      {client.firstName?.[0]}{client.lastName?.[0]}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {client.firstName} {client.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{client.email}</p>
                  </div>
                </div>
                {client.subscriptionStatus && client.subscriptionStatus !== 'none' && (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${subscriptionBadge(client.subscriptionStatus)}`}>
                    {client.subscriptionStatus}
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {client.phone}
                  </div>
                  {client.phone && (
                    <Link
                      href={`/admin/sales/dialer?phone=${encodeURIComponent(client.phone)}&name=${encodeURIComponent(client.firstName + ' ' + client.lastName)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Call with Power Dialer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </Link>
                  )}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{client.address}</span>
                </div>
              </div>

              {/* Vehicles */}
              {client.vehicles && client.vehicles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                    Vehicles ({client.vehicles.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {client.vehicles.slice(0, 2).map((vehicle, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                      >
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </span>
                    ))}
                    {client.vehicles.length > 2 && (
                      <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                        +{client.vehicles.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                <Link
                  href={`/admin/clients/edit?id=${client.id}`}
                  className="flex-1 text-center px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Edit
                </Link>
                <Link
                  href={`/admin/bookings/new?client=${client.id}`}
                  className="flex-1 text-center px-3 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Book Service
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">
            {searchQuery ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="text-gray-500 mt-1">
            {searchQuery ? 'Try a different search term.' : 'Get started by adding your first client.'}
          </p>
          {!searchQuery && (
            <Link
              href="/admin/clients/new"
              className="inline-flex items-center mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
            >
              Add Client
            </Link>
          )}
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => {
                setSelectedClient(null);
                setDeleteConfirm(null);
              }}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-auto p-6 text-left">
              <button
                onClick={() => {
                  setSelectedClient(null);
                  setDeleteConfirm(null);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-emerald-600">
                    {selectedClient.firstName?.[0]}{selectedClient.lastName?.[0]}
                  </span>
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedClient.firstName} {selectedClient.lastName}
                  </h2>
                  <p className="text-gray-500">
                    Client since {selectedClient.createdAt ? new Date((selectedClient.createdAt as any).seconds ? (selectedClient.createdAt as any).seconds * 1000 : selectedClient.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
                  <div className="space-y-2">
                    <p className="text-gray-900">{selectedClient.email}</p>
                    <p className="text-gray-900">{selectedClient.phone}</p>
                    <p className="text-gray-900">{selectedClient.address}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Membership</h3>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${subscriptionBadge(selectedClient.subscriptionStatus)}`}>
                    {selectedClient.subscriptionStatus || 'None'}
                  </span>
                </div>
              </div>

              {selectedClient.notes && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{selectedClient.notes}</p>
                </div>
              )}

              {selectedClient.vehicles && selectedClient.vehicles.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Vehicles</h3>
                  <div className="space-y-2">
                    {selectedClient.vehicles.map((vehicle, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">
                            {vehicle.type}
                            {vehicle.color && ` • ${vehicle.color}`}
                            {vehicle.licensePlate && ` • ${vehicle.licensePlate}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delete Confirmation */}
              {deleteConfirm === selectedClient.id ? (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">Are you sure you want to delete this client?</p>
                  <p className="text-red-600 text-sm mt-1">This action cannot be undone.</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleDelete(selectedClient.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex gap-3">
                  <Link
                    href={`/admin/clients/${selectedClient.id}`}
                    className="flex-1 text-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
                  >
                    Edit Client
                  </Link>
                  <Link
                    href={`/admin/bookings/new?client=${selectedClient.id}`}
                    className="flex-1 text-center px-4 py-2 border border-emerald-500 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
                  >
                    Book Service
                  </Link>
                  <button
                    onClick={() => setDeleteConfirm(selectedClient.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
