'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function AffiliateLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Check if user is an affiliate
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        setError('User profile not found.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      if (userData.role !== 'affiliate') {
        setError('This login is for affiliate partners only. Please use the regular login page.');
        setLoading(false);
        return;
      }

      // Check affiliate status
      const affiliateSnapshot = await getDoc(doc(db, 'affiliates', userId));
      if (!affiliateSnapshot.exists()) {
        // Try to find affiliate by userId field
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const affQuery = query(collection(db, 'affiliates'), where('userId', '==', userId));
        const affSnapshot = await getDocs(affQuery);

        if (affSnapshot.empty) {
          setError('Affiliate account not found. Please contact support.');
          setLoading(false);
          return;
        }

        const affiliate = affSnapshot.docs[0].data();
        if (affiliate.status === 'pending') {
          setError('Your application is still pending review. We\'ll notify you once approved.');
          setLoading(false);
          return;
        }

        if (affiliate.status === 'suspended') {
          setError('Your affiliate account has been suspended. Please contact support.');
          setLoading(false);
          return;
        }
      }

      // Redirect to dashboard
      router.push('/affiliate/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <span className="text-3xl font-bold text-emerald-600">Emerald</span>
          <span className="text-3xl font-bold text-gray-900 ml-1">Detailing</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Affiliate Login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Access your affiliate dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Not an affiliate yet?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/affiliate"
                className="w-full flex justify-center py-2 px-4 border border-emerald-500 rounded-lg shadow-sm text-sm font-medium text-emerald-600 bg-white hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Apply to become an affiliate
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          <Link href="/" className="text-emerald-600 hover:text-emerald-700">
            Return to main site
          </Link>
        </p>
      </div>
    </div>
  );
}
