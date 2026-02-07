'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Affiliate } from '@/lib/affiliate-types';
import { approveAffiliate, suspendAffiliate } from '@/lib/affiliate-db';
import { useAuth } from '@/lib/auth-context';

export default function AffiliateApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<Affiliate | null>(null);

  const fetchApplications = async () => {
    try {
      const affiliatesRef = collection(db, 'affiliates');
      const q = query(
        affiliatesRef,
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const appData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Affiliate[];
      setApplications(appData);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (affiliate: Affiliate) => {
    if (!user?.uid) return;
    setProcessing(affiliate.id);
    try {
      await approveAffiliate(affiliate.id, user.uid);
      setApplications(applications.filter(a => a.id !== affiliate.id));
      setSelectedApp(null);
    } catch (error) {
      console.error('Error approving affiliate:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (affiliate: Affiliate) => {
    setProcessing(affiliate.id);
    try {
      await suspendAffiliate(affiliate.id);
      setApplications(applications.filter(a => a.id !== affiliate.id));
      setSelectedApp(null);
    } catch (error) {
      console.error('Error rejecting affiliate:', error);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/affiliates"
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Pending Applications</h1>
          </div>
          <p className="text-gray-500 mt-1">
            Review and approve affiliate applications
          </p>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading applications...</p>
        </div>
      ) : applications.length > 0 ? (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <span className="text-lg font-semibold text-yellow-600">
                      {app.firstName?.[0]}{app.lastName?.[0]}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {app.firstName} {app.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{app.email}</p>
                    <p className="text-sm text-gray-500">{app.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Applied</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(app.createdAt)}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Requested Referral Code</p>
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                      {app.referralCode}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleReject(app)}
                      disabled={processing === app.id}
                      className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 font-medium text-sm disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(app)}
                      disabled={processing === app.id}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium text-sm disabled:opacity-50"
                    >
                      {processing === app.id ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No pending applications</h3>
          <p className="text-gray-500 mt-1">All applications have been reviewed.</p>
          <Link
            href="/admin/affiliates"
            className="inline-flex items-center mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Affiliates
          </Link>
        </div>
      )}

      {/* Application Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setSelectedApp(null)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-auto p-6 text-left">
              <button
                onClick={() => setSelectedApp(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-yellow-600">
                    {selectedApp.firstName?.[0]}{selectedApp.lastName?.[0]}
                  </span>
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedApp.firstName} {selectedApp.lastName}
                  </h2>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                    Pending Review
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Contact Information</h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-gray-900">{selectedApp.email}</p>
                    <p className="text-gray-900">{selectedApp.phone}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Referral Code</h3>
                  <code className="inline-block mt-2 px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono">
                    {selectedApp.referralCode}
                  </code>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Commission Rates (Default)</h3>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600">
                        {(selectedApp.firstBookingRate * 100).toFixed(0)}%
                      </p>
                      <p className="text-sm text-emerald-700">First Booking</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {(selectedApp.recurringRate * 100).toFixed(0)}%
                      </p>
                      <p className="text-sm text-blue-700">Recurring</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Application Date</h3>
                  <p className="mt-1 text-gray-900">{formatDate(selectedApp.createdAt)}</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleApprove(selectedApp)}
                  disabled={processing === selectedApp.id}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50"
                >
                  {processing === selectedApp.id ? 'Processing...' : 'Approve Application'}
                </button>
                <button
                  onClick={() => handleReject(selectedApp)}
                  disabled={processing === selectedApp.id}
                  className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
