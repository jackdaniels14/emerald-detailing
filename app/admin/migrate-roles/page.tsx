'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

type NewRole = 'admin' | 'office_desk' | 'sales_rep' | 'detailing_tech';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  collection: 'users' | 'employees';
}

export default function MigrateRolesPage() {
  const { user, userProfile } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const allUsers: UserData[] = [];

      // Fetch from users collection
      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        allUsers.push({
          id: doc.id,
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          role: data.role || 'unknown',
          collection: 'users'
        });
      });

      // Fetch from employees collection
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      employeesSnapshot.forEach(doc => {
        const data = doc.data();
        allUsers.push({
          id: doc.id,
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          role: data.role || 'unknown',
          collection: 'employees'
        });
      });

      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage('Error fetching users. Make sure you are logged in as admin.');
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userData: UserData, newRole: NewRole) => {
    setUpdating(userData.id);
    try {
      await updateDoc(doc(db, userData.collection, userData.id), {
        role: newRole,
        updatedAt: new Date()
      });

      setUsers(users.map(u =>
        u.id === userData.id ? { ...u, role: newRole } : u
      ));
      setMessage(`Updated ${userData.email} to ${newRole}`);
    } catch (error: any) {
      console.error('Error updating role:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const createUserProfile = async (uid: string, email: string, role: NewRole) => {
    setUpdating(uid);
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        role,
        firstName: '',
        lastName: '',
        phone: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await fetchAllUsers();
      setMessage(`Created user profile for ${email} with role ${role}`);
    } catch (error: any) {
      console.error('Error creating user profile:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'office_desk': return 'bg-blue-100 text-blue-800';
      case 'sales_rep': return 'bg-green-100 text-green-800';
      case 'detailing_tech': return 'bg-orange-100 text-orange-800';
      case 'employee': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Migration Tool</h1>
          <p className="text-gray-500 mt-1">Update user roles to the new 4-role system</p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          Back to Dashboard
        </Link>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">New Role System</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="font-medium text-purple-800">Admin</div>
            <div className="text-xs text-purple-600">Full access to everything</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="font-medium text-blue-800">Office Desk</div>
            <div className="text-xs text-blue-600">POS, Payroll, Analytics</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="font-medium text-green-800">Sales Rep</div>
            <div className="text-xs text-green-600">Bookings, Clients</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="font-medium text-orange-800">Detailing Tech</div>
            <div className="text-xs text-orange-600">My Jobs, Time Clock</div>
          </div>
        </div>

        <h3 className="font-medium mb-3">Current User: {user?.email}</h3>
        <p className="text-sm text-gray-500 mb-4">Your current role: <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor(userProfile?.role || '')}`}>{userProfile?.role || 'unknown'}</span></p>

        {/* Quick fix buttons for known users */}
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">Quick Setup for Known Users</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => createUserProfile('ci1XrZ8XXaX7Wha6usAien2Vr5o2', 'landong@griffithind.com', 'admin')}
              disabled={updating !== null}
              className="px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Set landong@griffithind.com as Admin
            </button>
            <button
              onClick={() => createUserProfile('zCz4QaBr3edfWs01NZUjRTI08ZB2', 'emeralddetailer@gmail.com', 'admin')}
              disabled={updating !== null}
              className="px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Set emeralddetailer@gmail.com as Admin
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">All Users & Employees</h2>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No users found in database. Use the quick setup buttons above to create user profiles.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change To</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((userData) => (
                <tr key={`${userData.collection}-${userData.id}`}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{userData.firstName} {userData.lastName}</div>
                    <div className="text-sm text-gray-500">{userData.email}</div>
                    <div className="text-xs text-gray-400">ID: {userData.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{userData.collection}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(userData.role)}`}>
                      {userData.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {(['admin', 'office_desk', 'sales_rep', 'detailing_tech'] as NewRole[]).map((role) => (
                        <button
                          key={role}
                          onClick={() => updateRole(userData, role)}
                          disabled={updating !== null || userData.role === role}
                          className={`px-2 py-1 text-xs rounded ${
                            userData.role === role
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          } disabled:opacity-50`}
                        >
                          {updating === userData.id ? '...' : role.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
