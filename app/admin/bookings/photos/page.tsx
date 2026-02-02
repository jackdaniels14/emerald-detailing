'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Booking, Client } from '@/lib/types';

export default function BookingPhotosPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('before');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!bookingId) {
        setError('No booking ID provided');
        setLoading(false);
        return;
      }

      try {
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
        if (!bookingDoc.exists()) {
          setError('Booking not found');
          setLoading(false);
          return;
        }

        const bookingData = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;
        setBooking(bookingData);
        setBeforePhotos(bookingData.beforePhotos || []);
        setAfterPhotos(bookingData.afterPhotos || []);

        // Fetch client
        if (bookingData.clientId) {
          const clientDoc = await getDoc(doc(db, 'clients', bookingData.clientId));
          if (clientDoc.exists()) {
            setClient({ id: clientDoc.id, ...clientDoc.data() } as Client);
          }
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('Failed to load booking');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [bookingId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !bookingId) return;

    setUploading(true);
    setError('');
    setSuccess('');

    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError(`File "${file.name}" is too large. Max 10MB.`);
          continue;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError(`File "${file.name}" is not an image.`);
          continue;
        }

        // Create unique filename
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `job-photos/${bookingId}/${activeTab}/${timestamp}_${sanitizedName}`;

        // Upload to Firebase Storage
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        newUrls.push(downloadUrl);
      }

      // Update Firestore
      if (activeTab === 'before') {
        const updatedPhotos = [...beforePhotos, ...newUrls];
        await updateDoc(doc(db, 'bookings', bookingId), {
          beforePhotos: updatedPhotos,
          updatedAt: Timestamp.now(),
        });
        setBeforePhotos(updatedPhotos);
      } else {
        const updatedPhotos = [...afterPhotos, ...newUrls];
        await updateDoc(doc(db, 'bookings', bookingId), {
          afterPhotos: updatedPhotos,
          updatedAt: Timestamp.now(),
        });
        setAfterPhotos(updatedPhotos);
      }

      setSuccess(`${newUrls.length} photo(s) uploaded successfully`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Error uploading photos:', err);
      setError(err.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (url: string, type: 'before' | 'after') => {
    if (!bookingId || !confirm('Delete this photo? This cannot be undone.')) return;

    try {
      // Try to delete from storage
      try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
      } catch (storageErr) {
        console.log('Storage delete skipped:', storageErr);
      }

      // Update Firestore
      if (type === 'before') {
        const updatedPhotos = beforePhotos.filter(p => p !== url);
        await updateDoc(doc(db, 'bookings', bookingId), {
          beforePhotos: updatedPhotos,
          updatedAt: Timestamp.now(),
        });
        setBeforePhotos(updatedPhotos);
      } else {
        const updatedPhotos = afterPhotos.filter(p => p !== url);
        await updateDoc(doc(db, 'bookings', bookingId), {
          afterPhotos: updatedPhotos,
          updatedAt: Timestamp.now(),
        });
        setAfterPhotos(updatedPhotos);
      }

      setSuccess('Photo deleted');
    } catch (err: any) {
      console.error('Error deleting photo:', err);
      setError(err.message || 'Failed to delete photo');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
          <Link
            href="/admin/bookings"
            className="inline-block mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Bookings
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Job Photos</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500">
            <span>{client?.firstName} {client?.lastName}</span>
            <span>•</span>
            <span>{booking?.vehicleInfo}</span>
            <span>•</span>
            <span>{formatDate(booking?.scheduledDate)}</span>
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

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('before')}
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'before'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Before ({beforePhotos.length})
            </button>
            <button
              onClick={() => setActiveTab('after')}
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'after'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              After ({afterPhotos.length})
            </button>
          </div>

          {/* Upload Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Upload {activeTab === 'before' ? 'Before' : 'After'} Photos
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {activeTab === 'before'
                    ? 'Take photos before starting the job'
                    : 'Take photos after completing the job'
                  }
                </p>
              </div>
              <label className={`px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
                uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}>
                {uploading ? 'Uploading...' : 'Select Photos'}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Accepted formats: JPG, PNG, GIF, WEBP (max 10MB each)
            </p>
          </div>

          {/* Photos Grid */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {activeTab === 'before' ? 'Before' : 'After'} Photos
            </h2>

            {(activeTab === 'before' ? beforePhotos : afterPhotos).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(activeTab === 'before' ? beforePhotos : afterPhotos).map((url, index) => (
                  <div key={index} className="relative group">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-lg overflow-hidden bg-gray-100"
                    >
                      <img
                        src={url}
                        alt={`${activeTab} photo ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </a>
                    <button
                      onClick={() => handleDeletePhoto(url, activeTab)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500">No {activeTab} photos yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Upload photos using the button above
                </p>
              </div>
            )}
          </div>

          {/* Side by Side Comparison */}
          {beforePhotos.length > 0 && afterPhotos.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Before & After Comparison</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2 text-center">Before</p>
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={beforePhotos[0]}
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2 text-center">After</p>
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={afterPhotos[0]}
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
