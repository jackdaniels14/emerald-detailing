'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Employee, EmployeeDocument } from '@/lib/types';
import { useAuth, isAdmin } from '@/lib/auth-context';

const DOCUMENT_TYPES = [
  { value: 'id', label: 'Government ID' },
  { value: 'w4', label: 'W-4 Form' },
  { value: 'w2', label: 'W-2 Form' },
  { value: 'i9', label: 'I-9 Form' },
  { value: 'direct_deposit', label: 'Direct Deposit' },
  { value: 'other', label: 'Other' },
];

export default function EmployeeDocumentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const employeeId = searchParams.get('id');
  const { user, userProfile, loading: authLoading } = useAuth();
  const userIsAdmin = isAdmin(userProfile?.role);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isOwnDocuments, setIsOwnDocuments] = useState(false);

  const [selectedType, setSelectedType] = useState('other');
  const [customName, setCustomName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if user can access these documents
  const canAccess = userIsAdmin || isOwnDocuments;

  useEffect(() => {
    async function fetchEmployee() {
      if (authLoading) return;

      if (!employeeId) {
        setError('No employee ID provided');
        setLoading(false);
        return;
      }

      try {
        const employeeDoc = await getDoc(doc(db, 'employees', employeeId));
        if (!employeeDoc.exists()) {
          setError('Employee not found');
          setLoading(false);
          return;
        }

        const employeeData = { id: employeeDoc.id, ...employeeDoc.data() } as Employee;

        // Check if this employee record belongs to the current user by matching email
        const isOwn = user?.email && employeeData.email?.toLowerCase() === user.email.toLowerCase();
        setIsOwnDocuments(!!isOwn);

        // If not admin and not own documents, redirect
        if (!isAdmin(userProfile?.role) && !isOwn) {
          router.push('/admin/employees');
          return;
        }

        setEmployee(employeeData);
        setDocuments(employeeData.documents || []);
      } catch (err) {
        console.error('Error fetching employee:', err);
        setError('Failed to load employee');
      } finally {
        setLoading(false);
      }
    }

    fetchEmployee();
  }, [employeeId, authLoading, user, userProfile, router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employeeId || !employee) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Create unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `employee-documents/${employeeId}/${timestamp}_${sanitizedName}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // Create document record
      const newDoc: EmployeeDocument = {
        id: `doc_${timestamp}`,
        name: customName || file.name,
        type: selectedType as EmployeeDocument['type'],
        url: downloadUrl,
        uploadedAt: new Date(),
      };

      // Update Firestore
      const updatedDocs = [...documents, newDoc];
      await updateDoc(doc(db, 'employees', employeeId), {
        documents: updatedDocs,
        updatedAt: Timestamp.now(),
      });

      setDocuments(updatedDocs);
      setSuccess(`"${newDoc.name}" uploaded successfully`);
      setCustomName('');
      setSelectedType('other');

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docToDelete: EmployeeDocument) => {
    if (!employeeId || !confirm(`Delete "${docToDelete.name}"? This cannot be undone.`)) return;

    try {
      // Try to delete from storage (may fail if URL format changed)
      try {
        const storageRef = ref(storage, docToDelete.url);
        await deleteObject(storageRef);
      } catch (storageErr) {
        console.log('Storage delete skipped:', storageErr);
      }

      // Update Firestore
      const updatedDocs = documents.filter(d => d.id !== docToDelete.id);
      await updateDoc(doc(db, 'employees', employeeId), {
        documents: updatedDocs,
        updatedAt: Timestamp.now(),
      });

      setDocuments(updatedDocs);
      setSuccess(`"${docToDelete.name}" deleted`);
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err.message || 'Failed to delete document');
    }
  };

  const getDocTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case 'id':
        return (
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
        );
      case 'w4':
      case 'w2':
      case 'i9':
        return (
          <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'direct_deposit':
        return (
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Don't render if access check hasn't completed yet
  if (!canAccess && !error) {
    return null;
  }

  if (error && !employee) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
          <Link
            href="/admin/employees"
            className="inline-block mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/employees"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Employees
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            Documents for {employee?.firstName} {employee?.lastName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload and manage important employee documents (ID, W-4, W-2, I-9, etc.)
          </p>
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

          {/* Upload Section - Admin Only */}
          {userIsAdmin && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Document</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Name (optional)
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g., 2024 W-2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>
              {uploading && (
                <div className="mt-4 flex items-center gap-2 text-emerald-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                  <span>Uploading...</span>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Accepted formats: PDF, DOC, DOCX, JPG, PNG, GIF (max 10MB)
              </p>
            </div>
          )}

          {/* Documents List */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Uploaded Documents ({documents.length})
            </h2>

            {documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.map((docItem) => (
                  <div
                    key={docItem.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {getDocTypeIcon(docItem.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {docItem.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {getDocTypeLabel(docItem.type)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Uploaded {new Date(docItem.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a
                        href={docItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center px-3 py-1.5 text-sm font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50"
                      >
                        View
                      </a>
                      <a
                        href={docItem.url}
                        download={docItem.name}
                        className="flex-1 text-center px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                      >
                        Download
                      </a>
                      {userIsAdmin && (
                        <button
                          onClick={() => handleDeleteDocument(docItem)}
                          className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500">No documents uploaded yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Upload employee documents using the form above
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
