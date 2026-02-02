'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth, isAdmin } from '@/lib/auth-context';

interface SyncRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeRole: string;
  userRole: string | null;
  userId: string | null;
  isMismatched: boolean;
  synced?: boolean;
}

export default function SyncRolesPage() {
  const { userProfile } = useAuth();
  const userIsAdmin = isAdmin(userProfile?.role);

  const [records, setRecords] = useState<SyncRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all employees
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      const employees = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Build sync records
      const syncRecords: SyncRecord[] = employees.map((emp: any) => {
        const matchingUser = users.find((u: any) =>
          u.email?.toLowerCase() === emp.email?.toLowerCase()
        );

        return {
          id: emp.id,
          email: emp.email,
          firstName: emp.firstName,
          lastName: emp.lastName,
          employeeRole: emp.role,
          userRole: matchingUser ? (matchingUser as any).role : null,
          userId: matchingUser ? matchingUser.id : null,
          isMismatched: matchingUser ? (matchingUser as any).role !== emp.role : true,
        };
      });

      // Sort: mismatched first, then alphabetically
      syncRecords.sort((a, b) => {
        if (a.isMismatched && !b.isMismatched) return -1;
        if (!a.isMismatched && b.isMismatched) return 1;
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      });

      setRecords(syncRecords);
    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const syncSingleUser = async (record: SyncRecord) => {
    if (!record.userId) {
      showMessage('error', `No user account found for ${record.email}. They need to create an account first.`);
      return;
    }

    setSyncingId(record.id);
    try {
      await updateDoc(doc(db, 'users', record.userId), {
        role: record.employeeRole,
        updatedAt: new Date(),
      });

      setRecords(records.map(r =>
        r.id === record.id
          ? { ...r, userRole: record.employeeRole, isMismatched: false, synced: true }
          : r
      ));

      showMessage('success', `Updated ${record.firstName} ${record.lastName}'s role to ${record.employeeRole}`);
    } catch (error) {
      console.error('Error syncing user:', error);
      showMessage('error', `Failed to update ${record.firstName}'s role`);
    } finally {
      setSyncingId(null);
    }
  };

  const syncAllMismatched = async () => {
    const mismatched = records.filter(r => r.isMismatched && r.userId);
    if (mismatched.length === 0) {
      showMessage('success', 'All roles are already in sync!');
      return;
    }

    setSyncing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const record of mismatched) {
      try {
        await updateDoc(doc(db, 'users', record.userId!), {
          role: record.employeeRole,
          updatedAt: new Date(),
        });
        successCount++;
      } catch (error) {
        console.error(`Error syncing ${record.email}:`, error);
        errorCount++;
      }
    }

    await fetchData();
    setSyncing(false);

    if (errorCount === 0) {
      showMessage('success', `Successfully synced ${successCount} user(s)`);
    } else {
      showMessage('error', `Synced ${successCount}, failed ${errorCount}`);
    }
  };

  const getRoleColor = (role: string | null) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      office_desk: 'bg-blue-100 text-blue-800',
      sales_rep: 'bg-green-100 text-green-800',
      detailing_tech: 'bg-orange-100 text-orange-800',
      client: 'bg-gray-100 text-gray-800',
    };
    return colors[role || ''] || 'bg-gray-100 text-gray-600';
  };

  const getRoleDisplayName = (role: string | null) => {
    const names: Record<string, string> = {
      admin: 'Admin',
      office_desk: 'Office Desk',
      sales_rep: 'Sales Rep',
      detailing_tech: 'Detailing Tech',
      client: 'Client',
    };
    return names[role || ''] || role || 'No Account';
  };

  if (!userIsAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-600 mt-2">Only admins can access this page.</p>
      </div>
    );
  }

  const mismatchedCount = records.filter(r => r.isMismatched).length;
  const noAccountCount = records.filter(r => !r.userId).length;

  return (
    <div className="space-y-6">
      {/* Message Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync User Roles</h1>
          <p className="text-gray-500 mt-1">
            Sync employee roles to user login accounts
          </p>
        </div>
        <button
          onClick={syncAllMismatched}
          disabled={syncing || mismatchedCount === 0}
          className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync All ({mismatchedCount})
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{records.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${mismatchedCount > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
              <svg className={`w-6 h-6 ${mismatchedCount > 0 ? 'text-yellow-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Mismatched Roles</p>
              <p className="text-2xl font-bold text-gray-900">{mismatchedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${noAccountCount > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <svg className={`w-6 h-6 ${noAccountCount > 0 ? 'text-red-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">No User Account</p>
              <p className="text-2xl font-bold text-gray-900">{noAccountCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How this works</h3>
            <p className="text-sm text-blue-700 mt-1">
              This page compares roles in the <strong>employees</strong> collection with roles in the <strong>users</strong> collection.
              When you sync, it updates the user&apos;s login role to match their employee role, giving them the correct permissions.
            </p>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No employees found.
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-200">
              {records.map((record) => (
                <div
                  key={record.id}
                  className={`p-4 space-y-3 ${record.isMismatched ? 'bg-yellow-50' : ''} ${record.synced ? 'bg-green-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {record.firstName} {record.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{record.email}</p>
                    </div>
                    {record.isMismatched && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Mismatched
                      </span>
                    )}
                    {record.synced && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Synced!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Employee:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(record.employeeRole)}`}>
                      {getRoleDisplayName(record.employeeRole)}
                    </span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="text-gray-500">User:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(record.userRole)}`}>
                      {getRoleDisplayName(record.userRole)}
                    </span>
                  </div>

                  {record.isMismatched && record.userId && (
                    <button
                      onClick={() => syncSingleUser(record)}
                      disabled={syncingId === record.id}
                      className="w-full px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {syncingId === record.id ? 'Syncing...' : 'Sync Role'}
                    </button>
                  )}
                  {!record.userId && (
                    <p className="text-xs text-red-600">No user account - they need to sign up first</p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className={`${record.isMismatched ? 'bg-yellow-50' : ''} ${record.synced ? 'bg-green-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {record.firstName} {record.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{record.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(record.employeeRole)}`}>
                          {getRoleDisplayName(record.employeeRole)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(record.userRole)}`}>
                          {getRoleDisplayName(record.userRole)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.synced ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Synced!
                          </span>
                        ) : record.isMismatched ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Mismatched
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            In Sync
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {record.isMismatched && record.userId ? (
                          <button
                            onClick={() => syncSingleUser(record)}
                            disabled={syncingId === record.id}
                            className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
                          >
                            {syncingId === record.id ? 'Syncing...' : 'Sync'}
                          </button>
                        ) : !record.userId ? (
                          <span className="text-xs text-red-600">No account</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
