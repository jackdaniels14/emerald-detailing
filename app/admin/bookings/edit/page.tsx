'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, Client, Employee, Vehicle } from '@/lib/types';

const PRICING = {
  sedan: {
    express: { interior: 150, exterior: 120, full: 242 },
    premium: { interior: 360, exterior: 300, full: 528 },
  },
  suv: {
    express: { interior: 210, exterior: 180, full: 350 },
    premium: { interior: 420, exterior: 360, full: 624 },
  },
  truck: {
    express: { interior: 270, exterior: 240, full: 458 },
    premium: { interior: 480, exterior: 420, full: 720 },
  },
  coupe: {
    express: { interior: 150, exterior: 120, full: 242 },
    premium: { interior: 360, exterior: 300, full: 528 },
  },
  van: {
    express: { interior: 270, exterior: 240, full: 458 },
    premium: { interior: 480, exterior: 420, full: 720 },
  },
  other: {
    express: { interior: 210, exterior: 180, full: 350 },
    premium: { interior: 420, exterior: 360, full: 624 },
  },
};

const ADD_ONS = [
  { id: 'ceramic', name: 'Ceramic Coating', price: 150 },
  { id: 'engine', name: 'Engine Bay Cleaning', price: 50 },
  { id: 'headlight', name: 'Headlight Restoration', price: 75 },
  { id: 'odor', name: 'Odor Elimination', price: 40 },
  { id: 'pet', name: 'Pet Hair Removal', price: 35 },
  { id: 'leather', name: 'Leather Conditioning', price: 45 },
];

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const paymentStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
];

export default function EditBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Data
  const [booking, setBooking] = useState<Booking | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Form state
  const [serviceType, setServiceType] = useState<'interior' | 'exterior' | 'full'>('full');
  const [serviceTier, setServiceTier] = useState<'express' | 'premium'>('premium');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [assignedEmployee, setAssignedEmployee] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [status, setStatus] = useState('pending');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) {
        setError('No booking ID provided');
        setLoading(false);
        return;
      }

      try {
        // Fetch booking
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
        if (!bookingDoc.exists()) {
          setError('Booking not found');
          setLoading(false);
          return;
        }

        const bookingData = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;
        setBooking(bookingData);

        // Set form values from booking
        setServiceType(bookingData.serviceType as any || 'full');
        setServiceTier(bookingData.serviceTier as any || 'premium');
        setSelectedAddOns(bookingData.addOns || []);
        setAssignedEmployee(bookingData.employeeId || '');
        setStatus(bookingData.status || 'pending');
        setPaymentStatus(bookingData.paymentStatus || 'pending');
        setNotes(bookingData.clientNotes || '');

        // Handle date conversion
        if (bookingData.scheduledDate) {
          const rawDate = bookingData.scheduledDate as any;
          const date = rawDate.seconds
            ? new Date(rawDate.seconds * 1000)
            : new Date(rawDate);
          setScheduledDate(date.toISOString().split('T')[0]);
        }
        setScheduledTime(bookingData.scheduledTime || '10:00');

        // Check for custom price
        if (bookingData.customPriceApplied) {
          setUseCustomPrice(true);
          setCustomPrice(bookingData.totalPrice?.toString() || '');
        }

        // Fetch client
        if (bookingData.clientId) {
          const clientDoc = await getDoc(doc(db, 'clients', bookingData.clientId));
          if (clientDoc.exists()) {
            setClient({ id: clientDoc.id, ...clientDoc.data() } as Client);
          }
        }

        // Fetch employees
        const employeesRef = collection(db, 'employees');
        const employeesSnap = await getDocs(query(employeesRef, orderBy('firstName')));
        const employeesData = employeesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Employee[];
        setEmployees(employeesData.filter(e => e.isActive));

      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('Failed to load booking');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bookingId]);

  const getVehiclePricingCategory = (vehicleType: string | undefined): keyof typeof PRICING => {
    if (!vehicleType) return 'sedan';
    const type = vehicleType.toLowerCase();
    if (type === 'sedan' || type === 'coupe') return 'sedan';
    if (type === 'suv') return 'suv';
    if (type === 'truck') return 'truck';
    if (type === 'van') return 'van';
    return 'other';
  };

  const calculateTotals = () => {
    // Get vehicle from booking
    const vehicle = client?.vehicles?.find(v => v.id === booking?.vehicleId);
    const category = getVehiclePricingCategory(vehicle?.type);
    const pricing = PRICING[category];
    const basePrice = pricing[serviceTier][serviceType];

    const addOnsPrice = ADD_ONS.filter(a => selectedAddOns.includes(a.id)).reduce((sum, a) => sum + a.price, 0);
    const subtotal = basePrice + addOnsPrice;

    // Check for subscription discount
    let discountRate = 0;
    if (client?.subscriptionStatus && client.subscriptionStatus !== 'none') {
      const discounts: Record<string, number> = { monthly: 0.10, biweekly: 0.20, weekly: 0.30 };
      discountRate = discounts[client.subscriptionStatus] || 0;
    }

    const discount = Math.round(subtotal * discountRate);
    const calculatedTotal = subtotal - discount;

    return {
      basePrice,
      addOnsPrice,
      subtotal,
      discountRate,
      discount,
      total: useCustomPrice && customPrice ? parseFloat(customPrice) : calculatedTotal,
      calculatedTotal,
    };
  };

  const totals = calculateTotals();

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOns(prev =>
      prev.includes(addOnId)
        ? prev.filter(id => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  const handleSave = async () => {
    if (!bookingId || !booking) return;

    setSaving(true);
    setError('');

    try {
      const updateData = {
        serviceType,
        serviceTier,
        addOns: selectedAddOns,
        employeeId: assignedEmployee || null,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        status,
        paymentStatus,
        clientNotes: notes,
        basePrice: totals.basePrice,
        addOnsPrice: totals.addOnsPrice,
        discount: totals.discount,
        totalPrice: totals.total,
        customPriceApplied: useCustomPrice,
        estimatedDuration: serviceTier === 'premium' ? 180 : 90,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, 'bookings', bookingId), updateData);
      router.push('/admin/bookings');
    } catch (err: any) {
      console.error('Error updating booking:', err);
      setError(err.message || 'Failed to update booking');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!bookingId) return;

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      router.push('/admin/bookings');
    } catch (err: any) {
      console.error('Error deleting booking:', err);
      setError(err.message || 'Failed to delete booking');
      setSaving(false);
    }
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
          <h1 className="text-xl font-bold text-gray-900">Edit Booking</h1>
          <p className="text-sm text-gray-500 mt-1">Booking ID: {bookingId}</p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Client Info (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Client</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {client?.firstName} {client?.lastName}
                </p>
                <p className="text-sm text-gray-500">{client?.email} • {client?.phone}</p>
                <p className="text-sm text-gray-500">{booking?.serviceAddress}</p>
              </div>
              {client?.subscriptionStatus && client.subscriptionStatus !== 'none' && (
                <span className="px-3 py-1 text-sm font-medium bg-emerald-100 text-emerald-800 rounded-full capitalize">
                  {client.subscriptionStatus} Member
                </span>
              )}
            </div>
            {booking?.vehicleInfo && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">Vehicle</p>
                <p className="font-medium text-gray-900">{booking.vehicleInfo}</p>
              </div>
            )}
          </div>

          {/* Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Booking Status</label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatus(option.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      status === option.value
                        ? option.color + ' ring-2 ring-offset-2 ring-gray-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
              <div className="flex flex-wrap gap-2">
                {paymentStatusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPaymentStatus(option.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      paymentStatus === option.value
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Service Type */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Service Type</h3>
            <div className="grid grid-cols-3 gap-3">
              {(['interior', 'exterior', 'full'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setServiceType(type)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    serviceType === type
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900 capitalize">{type}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Service Tier */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Service Tier</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['express', 'premium'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setServiceTier(tier)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    serviceTier === tier
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900 capitalize">{tier}</p>
                  <p className="text-sm text-gray-500">
                    {tier === 'express' ? '~1.5 hours' : '~3 hours'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Add-ons */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add-ons</h3>
            <div className="grid grid-cols-2 gap-2">
              {ADD_ONS.map((addOn) => (
                <button
                  key={addOn.id}
                  onClick={() => toggleAddOn(addOn.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedAddOns.includes(addOn.id)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-900">{addOn.name}</p>
                    <p className="text-sm font-medium text-emerald-600">+${addOn.price}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <select
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map((time) => (
                  <option key={time} value={time}>
                    {parseInt(time) > 12 ? `${parseInt(time) - 12}:00 PM` : parseInt(time) === 12 ? '12:00 PM' : `${time} AM`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Employee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Employee</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setAssignedEmployee('')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  !assignedEmployee
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900">Unassigned</p>
              </button>
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => setAssignedEmployee(employee.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    assignedEmployee === employee.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: employee.scheduleColor || '#10b981' }}
                    />
                    <p className="font-medium text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-500">Calculated Price</p>
                <p className="text-2xl font-bold text-emerald-600">${totals.calculatedTotal}</p>
                {totals.discount > 0 && (
                  <p className="text-sm text-emerald-600">
                    Includes {Math.round(totals.discountRate * 100)}% member discount (-${totals.discount})
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomPrice}
                  onChange={(e) => {
                    setUseCustomPrice(e.target.checked);
                    if (!e.target.checked) setCustomPrice('');
                  }}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-gray-700">Custom price</span>
              </label>
            </div>

            {useCustomPrice && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Total Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder={totals.calculatedTotal.toString()}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Base service</span>
                <span className="text-gray-900">${totals.basePrice}</span>
              </div>
              {totals.addOnsPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Add-ons</span>
                  <span className="text-gray-900">${totals.addOnsPrice}</span>
                </div>
              )}
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Member discount</span>
                  <span>-${totals.discount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-emerald-600">${totals.total}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any special instructions..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-600 hover:text-red-700 font-medium"
            >
              Delete Booking
            </button>
            <div className="flex gap-3">
              <Link
                href="/admin/bookings"
                className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Booking?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete this booking. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
