'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth, getRoleDisplayName } from '@/lib/auth-context';
import { Employee } from '@/lib/types';

export default function MyProfilePage() {
  const { user, userProfile } = useAuth();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    async function fetchMyEmployee() {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        // Find employee record by matching email
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('email', '==', user.email.toLowerCase()));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const empDoc = snapshot.docs[0];
          const empData = { id: empDoc.id, ...empDoc.data() } as Employee;
          setEmployee(empData);
          setFirstName(empData.firstName || '');
          setLastName(empData.lastName || '');
          setPhone(empData.phone || '');
        } else {
          // Try case-insensitive search
          const allEmployees = await getDocs(collection(db, 'employees'));
          const match = allEmployees.docs.find(
            doc => doc.data().email?.toLowerCase() === user.email?.toLowerCase()
          );
          if (match) {
            const empData = { id: match.id, ...match.data() } as Employee;
            setEmployee(empData);
            setFirstName(empData.firstName || '');
            setLastName(empData.lastName || '');
            setPhone(empData.phone || '');
          }
        }
      } catch (err) {
        console.error('Error fetching employee:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchMyEmployee();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Only update allowed fields (name and phone)
      await updateDoc(doc(db, 'employees', employee.id), {
        firstName,
        lastName,
        phone,
        updatedAt: Timestamp.now(),
      });

      setEmployee({ ...employee, firstName, lastName, phone });
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <svg className="w-12 h-12 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-lg font-semibold text-yellow-800">No Employee Profile Found</h2>
          <p className="text-yellow-700 mt-2">
            Your account ({user?.email}) is not linked to an employee record.
            Please contact an administrator to set up your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">View and update your personal information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header with Avatar */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-8">
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center border-4 border-white/30"
              style={{ backgroundColor: employee.scheduleColor || '#10b981' }}
            >
              <span className="text-2xl font-bold text-white">
                {firstName?.[0]}{lastName?.[0]}
              </span>
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">{firstName} {lastName}</h2>
              <p className="text-emerald-100">{employee.email}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Alerts */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          {/* Editable Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-6 py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </form>

          {/* Read-only Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Account Information</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Role</dt>
                <dd className="mt-1">
                  <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-emerald-100 text-emerald-800">
                    {getRoleDisplayName(employee.role as any)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                    employee.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Hire Date</dt>
                <dd className="mt-1 text-gray-900">{formatDate(employee.hireDate)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Schedule Color</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border border-gray-200"
                    style={{ backgroundColor: employee.scheduleColor || '#10b981' }}
                  />
                  <span className="text-gray-600 text-sm">Used on team calendar</span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Documents Link */}
          <div className="border-t border-gray-200 pt-6">
            <Link
              href={`/admin/employees/documents?id=${employee.id}`}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">My Documents</p>
                  <p className="text-sm text-gray-500">View your uploaded documents (ID, W-4, etc.)</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
