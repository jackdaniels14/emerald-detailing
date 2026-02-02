'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee } from '@/lib/types';
import { useAuth, isAdmin } from '@/lib/auth-context';

type EmployeeRole = 'admin' | 'office_desk' | 'sales_rep' | 'detailing_tech';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  office_desk: 'bg-blue-100 text-blue-800',
  sales_rep: 'bg-green-100 text-green-800',
  detailing_tech: 'bg-orange-100 text-orange-800',
  employee: 'bg-yellow-100 text-yellow-800', // Legacy role
};

// Map for display names including legacy
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: 'Admin',
  office_desk: 'Office Desk',
  sales_rep: 'Sales Rep',
  detailing_tech: 'Detailing Tech',
  employee: 'Employee (Legacy)',
};

const SCHEDULE_COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
];

export default function EmployeesPage() {
  const { userProfile } = useAuth();
  const userIsAdmin = isAdmin(userProfile?.role);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'detailing_tech' as EmployeeRole,
    hourlyRate: '',
    commissionRate: '40',
    hireDate: '',
    scheduleColor: '#10b981',
  });

  const fetchEmployees = async () => {
    try {
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const employeeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      setEmployees(employeeData);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'detailing_tech',
      hourlyRate: '',
      commissionRate: '40',
      hireDate: '',
      scheduleColor: '#10b981',
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const employeeData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        hourlyRate: parseFloat(formData.hourlyRate) || 0,
        commissionRate: (parseFloat(formData.commissionRate) || 40) / 100, // Store as decimal
        hireDate: formData.hireDate ? new Date(formData.hireDate) : new Date(),
        scheduleColor: formData.scheduleColor,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'employees'), employeeData);
      await fetchEmployees();
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      console.error('Error adding employee:', err);
      setError(err.message || 'Failed to add employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (employeeId: string) => {
    try {
      await deleteDoc(doc(db, 'employees', employeeId));
      setEmployees(employees.filter(e => e.id !== employeeId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const handleRoleChange = async (employeeId: string, newRole: EmployeeRole) => {
    try {
      await updateDoc(doc(db, 'employees', employeeId), {
        role: newRole,
        updatedAt: Timestamp.now(),
      });
      setEmployees(employees.map(e =>
        e.id === employeeId ? { ...e, role: newRole } : e
      ));
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const activeCount = employees.filter(e => e.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500 mt-1">Manage your team members</p>
        </div>
        {userIsAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add Employee
          </button>
        )}
      </div>

      {/* Quick Stats */}
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
              <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Admins</p>
              <p className="text-2xl font-bold text-gray-900">{employees.filter(e => e.role === 'admin').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Employees List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading employees...</p>
          </div>
        ) : employees.length > 0 ? (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {employees.map((employee) => (
                <div key={employee.id} className="p-4 space-y-3">
                  {/* Header: Avatar & Name */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: employee.scheduleColor || '#10b981' }}
                      >
                        <span className="text-lg font-semibold text-white">
                          {employee.firstName?.[0]}{employee.lastName?.[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{employee.firstName} {employee.lastName}</h3>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          employee.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Role</p>
                      {userIsAdmin ? (
                        <select
                          value={employee.role}
                          onChange={(e) => handleRoleChange(employee.id, e.target.value as EmployeeRole)}
                          className={`mt-1 px-2 py-1 text-xs font-medium rounded-full border-0 ${
                            ROLE_COLORS[employee.role] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <option value="detailing_tech">Detailing Tech</option>
                          <option value="sales_rep">Sales Rep</option>
                          <option value="office_desk">Office Desk</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          ROLE_COLORS[employee.role] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {ROLE_DISPLAY_NAMES[employee.role] || employee.role}
                        </span>
                      )}
                    </div>
                    {userIsAdmin && (
                      <div>
                        <p className="text-gray-500">Hourly Rate</p>
                        <p className="font-semibold text-lg">${employee.hourlyRate}/hr</p>
                      </div>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="text-sm">
                    <a href={`mailto:${employee.email}`} className="text-blue-600 block truncate">{employee.email}</a>
                    {employee.phone && (
                      <a href={`tel:${employee.phone}`} className="text-gray-600">{employee.phone}</a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {userIsAdmin && (
                      <Link
                        href={`/admin/employees/edit?id=${employee.id}`}
                        className="flex-1 text-center px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-medium text-sm"
                      >
                        Edit
                      </Link>
                    )}
                    {userIsAdmin && (
                      <Link
                        href={`/admin/employees/documents?id=${employee.id}`}
                        className="flex-1 text-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm"
                      >
                        Documents
                      </Link>
                    )}
                    {userIsAdmin && (
                      deleteConfirm === employee.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="px-3 py-2 bg-red-500 text-white rounded-lg font-medium text-sm"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(employee.id)}
                          className="px-3 py-2 bg-red-50 text-red-700 rounded-lg font-medium text-sm"
                        >
                          Delete
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    {userIsAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    {userIsAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: employee.scheduleColor || '#10b981' }}
                          >
                            <span className="text-sm font-semibold text-white">
                              {employee.firstName?.[0]}{employee.lastName?.[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{employee.firstName} {employee.lastName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.email}</div>
                        <div className="text-sm text-gray-500">{employee.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {userIsAdmin ? (
                          <select
                            value={employee.role}
                            onChange={(e) => handleRoleChange(employee.id, e.target.value as EmployeeRole)}
                            className={`px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${
                              ROLE_COLORS[employee.role] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <option value="detailing_tech">Detailing Tech</option>
                            <option value="sales_rep">Sales Rep</option>
                            <option value="office_desk">Office Desk</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            ROLE_COLORS[employee.role] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {ROLE_DISPLAY_NAMES[employee.role] || employee.role}
                          </span>
                        )}
                      </td>
                      {userIsAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">${employee.hourlyRate}/hr</div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          employee.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {userIsAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                          <Link href={`/admin/employees/documents?id=${employee.id}`} className="text-blue-600 hover:text-blue-900 font-medium">Docs</Link>
                          <Link href={`/admin/employees/edit?id=${employee.id}`} className="text-emerald-600 hover:text-emerald-900 font-medium">Edit</Link>
                          {deleteConfirm === employee.id ? (
                            <span className="inline-flex gap-2">
                              <button onClick={() => handleDelete(employee.id)} className="text-red-600 hover:text-red-900 font-medium">Confirm</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-gray-600 hover:text-gray-900 font-medium">Cancel</button>
                            </span>
                          ) : (
                            <button onClick={() => setDeleteConfirm(employee.id)} className="text-red-600 hover:text-red-900 font-medium">Delete</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">No employees yet</h3>
            <p className="text-gray-500 mt-1">{userIsAdmin ? 'Get started by adding your first team member.' : 'No team members have been added yet.'}</p>
            {userIsAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
              >
                Add Employee
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto p-6 text-left">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Employee</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="detailing_tech">Detailing Tech</option>
                      <option value="sales_rep">Sales Rep</option>
                      <option value="office_desk">Office Desk</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                      className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Percentage of completed job revenue</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Color</label>
                  <div className="flex flex-wrap gap-2">
                    {SCHEDULE_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, scheduleColor: color.value })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.scheduleColor === color.value
                            ? 'border-gray-900 scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
