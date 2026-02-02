'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

export default function CreateEmployeePage() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Xander's info
  const employeeData = {
    email: 'xanderpsakda@gmail.com',
    password: '5683',
    firstName: 'Xander',
    lastName: 'Psakda',
    phone: '2539516730',
    role: 'detailing_tech' as const,
    hourlyRate: 18.98,
    commissionRate: 0.40,
    scheduleColor: '#3b82f6', // blue
    hireDate: '2026-01-27',
  };

  const createEmployee = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Step 1: Create Firebase Auth account
      let uid: string;
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          employeeData.email,
          employeeData.password
        );
        uid = userCredential.user.uid;
        setMessage({ type: 'success', text: 'Auth account created...' });
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          // Account exists, sign in to get UID
          const signInResult = await signInWithEmailAndPassword(
            auth,
            employeeData.email,
            employeeData.password
          );
          uid = signInResult.user.uid;
          setMessage({ type: 'success', text: 'Existing account found...' });
        } else {
          throw authError;
        }
      }

      // Step 2: Create user profile in Firestore
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: employeeData.email,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        phone: employeeData.phone,
        role: employeeData.role,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Step 3: Create employee record
      await addDoc(collection(db, 'employees'), {
        email: employeeData.email,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        phone: employeeData.phone,
        role: employeeData.role,
        hourlyRate: employeeData.hourlyRate,
        commissionRate: employeeData.commissionRate,
        scheduleColor: employeeData.scheduleColor,
        hireDate: employeeData.hireDate,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setMessage({
        type: 'success',
        text: `Successfully created account for ${employeeData.firstName} ${employeeData.lastName}!`
      });

      // Sign back in as admin
      setTimeout(async () => {
        await signInWithEmailAndPassword(auth, 'landong@griffithind.com', 'JackDaniels1024');
      }, 1000);

    } catch (error: any) {
      console.error('Error creating employee:', error);
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  if (userProfile?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          Only admins can access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Employee Account</h1>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Employee Details</h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Name:</span>
            <span className="ml-2 font-medium">{employeeData.firstName} {employeeData.lastName}</span>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <span className="ml-2 font-medium">{employeeData.email}</span>
          </div>
          <div>
            <span className="text-gray-500">Phone:</span>
            <span className="ml-2 font-medium">{employeeData.phone}</span>
          </div>
          <div>
            <span className="text-gray-500">Role:</span>
            <span className="ml-2 font-medium">{employeeData.role}</span>
          </div>
          <div>
            <span className="text-gray-500">Hourly Rate:</span>
            <span className="ml-2 font-medium">${employeeData.hourlyRate}</span>
          </div>
          <div>
            <span className="text-gray-500">Commission:</span>
            <span className="ml-2 font-medium">{employeeData.commissionRate * 100}%</span>
          </div>
          <div>
            <span className="text-gray-500">Hire Date:</span>
            <span className="ml-2 font-medium">{employeeData.hireDate}</span>
          </div>
          <div>
            <span className="text-gray-500">Color:</span>
            <span className="ml-2 inline-block w-4 h-4 rounded" style={{ backgroundColor: employeeData.scheduleColor }}></span>
            <span className="ml-1 font-medium">Blue</span>
          </div>
        </div>
      </div>

      <button
        onClick={createEmployee}
        disabled={loading}
        className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating Account...' : 'Create Account for Xander'}
      </button>
    </div>
  );
}
