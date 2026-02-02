'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, addDoc, query, orderBy, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Client, Employee, Vehicle } from '@/lib/types';
import { notifyBookingAssigned } from '@/lib/notifications';

// Service pricing by vehicle type - 20% increase applied
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

const SUBSCRIPTION_DISCOUNT: Record<string, number> = {
  none: 0,
  monthly: 0.10,
  biweekly: 0.20,
  weekly: 0.30,
};

const RECURRING_OPTIONS = [
  { value: 'none', label: 'One-time booking' },
  { value: 'weekly', label: 'Weekly (30% off)', discount: 0.30 },
  { value: 'biweekly', label: 'Bi-weekly (20% off)', discount: 0.20 },
  { value: 'monthly', label: 'Monthly (10% off)', discount: 0.10 },
];

export default function NewBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('client');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);
  const [serviceType, setServiceType] = useState<'interior' | 'exterior' | 'full'>('full');
  const [serviceTier, setServiceTier] = useState<'express' | 'premium'>('premium');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [assignedEmployee, setAssignedEmployee] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // New features
  const [bookingType, setBookingType] = useState<'standard' | 'membership'>('standard');
  const [recurringSchedule, setRecurringSchedule] = useState('none');
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientsRef = collection(db, 'clients');
        const clientsSnap = await getDocs(query(clientsRef, orderBy('createdAt', 'desc')));
        const clientsData = clientsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];
        setClients(clientsData);

        if (preselectedClientId) {
          const preselected = clientsData.find(c => c.id === preselectedClientId);
          if (preselected) {
            setSelectedClient(preselected);
            if (preselected.vehicles?.length === 1) {
              setSelectedVehicleIndexes([0]);
            }
          }
        }

        const employeesRef = collection(db, 'employees');
        const employeesSnap = await getDocs(query(employeesRef, orderBy('firstName')));
        const employeesData = employeesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Employee[];
        setEmployees(employeesData.filter(e => e.isActive));
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [preselectedClientId]);

  const getVehiclePricingCategory = (vehicleType: string | undefined): keyof typeof PRICING => {
    if (!vehicleType) return 'sedan';
    const type = vehicleType.toLowerCase();
    if (type === 'sedan' || type === 'coupe') return 'sedan';
    if (type === 'suv') return 'suv';
    if (type === 'truck') return 'truck';
    if (type === 'van') return 'van';
    return 'other';
  };

  // Calculate total for all selected vehicles
  const calculateTotals = () => {
    let vehiclesSubtotal = 0;

    selectedVehicles.forEach(vehicle => {
      const category = getVehiclePricingCategory(vehicle?.type);
      const pricing = PRICING[category];
      vehiclesSubtotal += pricing[serviceTier][serviceType];
    });

    const addOnsPrice = ADD_ONS.filter(a => selectedAddOns.includes(a.id)).reduce((sum, a) => sum + a.price, 0);
    // Add-ons apply once per booking, not per vehicle
    const subtotal = vehiclesSubtotal + addOnsPrice;

    // Determine discount rate
    let discountRate = 0;
    if (bookingType === 'membership' && recurringSchedule !== 'none') {
      const recurring = RECURRING_OPTIONS.find(r => r.value === recurringSchedule);
      discountRate = recurring?.discount || 0;
    } else if (selectedClient?.subscriptionStatus && selectedClient.subscriptionStatus !== 'none') {
      discountRate = SUBSCRIPTION_DISCOUNT[selectedClient.subscriptionStatus] || 0;
    }

    const discount = Math.round(subtotal * discountRate);
    const calculatedTotal = subtotal - discount;

    return {
      vehiclesSubtotal,
      addOnsPrice,
      subtotal,
      discountRate,
      discount,
      total: useCustomPrice && customPrice ? parseFloat(customPrice) : calculatedTotal,
      calculatedTotal,
    };
  };

  const totals = calculateTotals();

  const filteredClients = clients.filter(client => {
    if (!clientSearch) return true;
    const search = clientSearch.toLowerCase();
    return (
      client.firstName?.toLowerCase().includes(search) ||
      client.lastName?.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone?.includes(search)
    );
  });

  // Use index-based selection to handle vehicles with same make/model/year
  const [selectedVehicleIndexes, setSelectedVehicleIndexes] = useState<number[]>([]);

  const toggleVehicleByIndex = (index: number) => {
    setSelectedVehicleIndexes(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  // Keep selectedVehicles in sync with indexes
  useEffect(() => {
    if (selectedClient?.vehicles) {
      const vehicles = selectedVehicleIndexes.map(idx => selectedClient.vehicles[idx]).filter(Boolean);
      setSelectedVehicles(vehicles);
    }
  }, [selectedVehicleIndexes, selectedClient]);

  const isVehicleSelectedByIndex = (index: number) => {
    return selectedVehicleIndexes.includes(index);
  };

  const handleSubmit = async () => {
    if (!selectedClient || selectedVehicles.length === 0) {
      setError('Please select a client and at least one vehicle');
      return;
    }
    if (!scheduledDate) {
      setError('Please select a date');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Create a booking for each vehicle
      const bookingPromises = selectedVehicles.map(async (vehicle, index) => {
        const category = getVehiclePricingCategory(vehicle?.type);
        const pricing = PRICING[category];
        const basePrice = pricing[serviceTier][serviceType];

        // For multi-vehicle, split add-ons price among vehicles or apply to first only
        const vehicleAddOnsPrice = index === 0 ? totals.addOnsPrice : 0;
        const vehicleSubtotal = basePrice + vehicleAddOnsPrice;
        const vehicleDiscount = Math.round(vehicleSubtotal * totals.discountRate);

        // Custom price split evenly among vehicles if set
        let vehicleTotal = vehicleSubtotal - vehicleDiscount;
        if (useCustomPrice && customPrice) {
          vehicleTotal = Math.round(parseFloat(customPrice) / selectedVehicles.length);
        }

        const bookingData = {
          clientId: selectedClient.id,
          vehicleId: vehicle.id || `v_${Date.now()}_${index}`,
          employeeId: assignedEmployee || null,
          serviceType,
          serviceTier,
          addOns: index === 0 ? selectedAddOns : [],
          scheduledDate: new Date(scheduledDate),
          scheduledTime,
          estimatedDuration: serviceTier === 'premium' ? 180 : 90,
          serviceAddress: selectedClient.address,
          status: 'pending',
          basePrice,
          addOnsPrice: vehicleAddOnsPrice,
          discount: vehicleDiscount,
          totalPrice: vehicleTotal,
          paymentStatus: 'pending',
          clientNotes: notes,
          // New fields
          bookingType,
          recurringSchedule: bookingType === 'membership' ? recurringSchedule : 'none',
          isRecurring: bookingType === 'membership' && recurringSchedule !== 'none',
          customPriceApplied: useCustomPrice,
          vehicleInfo: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          multiVehicleBooking: selectedVehicles.length > 1,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        return addDoc(collection(db, 'bookings'), bookingData);
      });

      const results = await Promise.all(bookingPromises);

      // Update client subscription status if membership booking
      if (bookingType === 'membership' && recurringSchedule !== 'none') {
        await updateDoc(doc(db, 'clients', selectedClient.id), {
          subscriptionStatus: recurringSchedule,
          subscriptionStartDate: new Date(scheduledDate),
          updatedAt: Timestamp.now(),
        });
      }

      // Send notification if employee is assigned
      if (assignedEmployee) {
        const employee = employees.find(e => e.id === assignedEmployee);
        const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        const formattedTime = parseInt(scheduledTime) > 12
          ? `${parseInt(scheduledTime) - 12}:00 PM`
          : `${scheduledTime} AM`;

        const vehicleText = selectedVehicles.length > 1
          ? `${selectedVehicles.length} vehicles`
          : `${selectedVehicles[0].year} ${selectedVehicles[0].make}`;

        await notifyBookingAssigned(
          assignedEmployee,
          employee ? `${employee.firstName} ${employee.lastName}` : 'Employee',
          `${selectedClient.firstName} ${selectedClient.lastName}`,
          `${serviceType} ${serviceTier} (${vehicleText})`,
          formattedDate,
          formattedTime,
          results[0].id
        );
      }

      router.push('/admin/bookings');
    } catch (err: any) {
      console.error('Error creating booking:', err);
      setError(err.message || 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  };

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOns(prev =>
      prev.includes(addOnId)
        ? prev.filter(id => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
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
        {/* Progress Steps */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Client' },
              { num: 2, label: 'Service' },
              { num: 3, label: 'Schedule' },
              { num: 4, label: 'Review' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                    step >= s.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s.num}
                </div>
                <span className={`ml-2 text-sm font-medium ${step >= s.num ? 'text-gray-900' : 'text-gray-500'}`}>
                  {s.label}
                </span>
                {idx < 3 && (
                  <div className={`w-16 h-0.5 mx-4 ${step > s.num ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Select Client & Vehicles */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Select Client & Vehicles</h2>

              {/* Booking Type Toggle */}
              <div className="flex gap-4 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                  onClick={() => {
                    setBookingType('standard');
                    setRecurringSchedule('none');
                  }}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                    bookingType === 'standard'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Standard Booking
                </button>
                <button
                  onClick={() => setBookingType('membership')}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                    bookingType === 'membership'
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Membership / Recurring
                </button>
              </div>

              {/* Recurring Schedule (for membership) */}
              {bookingType === 'membership' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-emerald-800 mb-2">
                    Recurring Schedule
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {RECURRING_OPTIONS.filter(r => r.value !== 'none').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setRecurringSchedule(option.value)}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          recurringSchedule === option.value
                            ? 'border-emerald-500 bg-white'
                            : 'border-emerald-200 bg-white/50 hover:border-emerald-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900 text-sm">{option.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search clients by name, email, or phone..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="grid gap-3 max-h-60 overflow-y-auto">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client);
                      setSelectedVehicles([]);
                      setSelectedVehicleIndexes([]);
                    }}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedClient?.id === client.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {client.firstName} {client.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{client.email} • {client.phone}</p>
                      </div>
                      {client.subscriptionStatus && client.subscriptionStatus !== 'none' && (
                        <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full capitalize">
                          {client.subscriptionStatus} Member
                        </span>
                      )}
                    </div>
                    {client.vehicles && client.vehicles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {client.vehicles.map((v, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-gray-100 rounded">
                            {v.year} {v.make} {v.model}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Multi-Select Vehicles */}
              {selectedClient && selectedClient.vehicles && selectedClient.vehicles.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select Vehicle(s)
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      (Select multiple for multi-car booking)
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedClient.vehicles.map((vehicle, idx) => (
                      <div
                        key={idx}
                        onClick={() => toggleVehicleByIndex(idx)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isVehicleSelectedByIndex(idx)
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-sm text-gray-500 capitalize">{vehicle.type}</p>
                          </div>
                          {isVehicleSelectedByIndex(idx) && (
                            <svg className="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedVehicles.length > 1 && (
                    <p className="mt-2 text-sm text-emerald-600 font-medium">
                      {selectedVehicles.length} vehicles selected - separate bookings will be created
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedClient || selectedVehicles.length === 0}
                  className="px-6 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Service */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Select Service</h2>

              {/* Service Type */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Type</h3>
                {selectedVehicles.length > 0 && (
                  <p className="text-sm text-gray-500 mb-3">
                    Vehicles: {selectedVehicles.map(v => `${v.year} ${v.make}`).join(', ')}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-4">
                  {(['interior', 'exterior', 'full'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setServiceType(type)}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        serviceType === type
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900 capitalize">{type}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {type === 'interior' && 'Deep clean interior'}
                        {type === 'exterior' && 'Wash & wax exterior'}
                        {type === 'full' && 'Complete detail'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Tier */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Tier</h3>
                <div className="grid grid-cols-2 gap-4">
                  {(['express', 'premium'] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setServiceTier(tier)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        serviceTier === tier
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-gray-900 capitalize">{tier}</p>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {tier === 'express' ? '~1.5 hours per vehicle' : '~3 hours per vehicle'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Add-ons (Optional)</h3>
                <div className="grid grid-cols-2 gap-3">
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

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Schedule & Price */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Schedule, Assign & Price</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Employee</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAssignedEmployee('')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      !assignedEmployee
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">Unassigned</p>
                    <p className="text-sm text-gray-500">Assign later</p>
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
                          className="w-6 h-6 rounded-full"
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

              {/* Custom Price Option */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">Calculated Price</p>
                    <p className="text-2xl font-bold text-emerald-600">${totals.calculatedTotal}</p>
                    {totals.discount > 0 && (
                      <p className="text-sm text-emerald-600">
                        Includes {Math.round(totals.discountRate * 100)}% discount (-${totals.discount})
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
                    <span className="text-sm font-medium text-gray-700">Use custom price</span>
                  </label>
                </div>

                {useCustomPrice && (
                  <div>
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
              </div>

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

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!scheduledDate}
                  className="px-6 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Review Booking
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Review Booking</h2>

              {bookingType === 'membership' && recurringSchedule !== 'none' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="font-medium text-emerald-800">
                    Membership Booking - {RECURRING_OPTIONS.find(r => r.value === recurringSchedule)?.label}
                  </p>
                  <p className="text-sm text-emerald-600 mt-1">
                    Client will be set as a {recurringSchedule} member with recurring appointments
                  </p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                {/* Client Info */}
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Client</p>
                    <p className="font-medium text-gray-900">
                      {selectedClient?.firstName} {selectedClient?.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Vehicle(s)</p>
                    {selectedVehicles.map((v, idx) => (
                      <p key={idx} className="font-medium text-gray-900">
                        {v.year} {v.make} {v.model}
                      </p>
                    ))}
                  </div>
                </div>

                <hr />

                {/* Service */}
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Service</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {serviceType} Detail - {serviceTier}
                    </p>
                    {selectedVehicles.length > 1 && (
                      <p className="text-sm text-gray-500">x {selectedVehicles.length} vehicles</p>
                    )}
                  </div>
                  <p className="font-medium text-gray-900">${totals.vehiclesSubtotal}</p>
                </div>

                {/* Add-ons */}
                {selectedAddOns.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Add-ons</p>
                    {ADD_ONS.filter(a => selectedAddOns.includes(a.id)).map(addOn => (
                      <div key={addOn.id} className="flex justify-between text-sm">
                        <p className="text-gray-700">{addOn.name}</p>
                        <p className="text-gray-700">${addOn.price}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Discount */}
                {totals.discount > 0 && (
                  <>
                    <hr />
                    <div className="flex justify-between text-emerald-600">
                      <p className="font-medium">
                        {bookingType === 'membership' ? 'Membership' : selectedClient?.subscriptionStatus} Discount ({Math.round(totals.discountRate * 100)}%)
                      </p>
                      <p className="font-medium">-${totals.discount}</p>
                    </div>
                  </>
                )}

                {useCustomPrice && customPrice && (
                  <>
                    <hr />
                    <div className="flex justify-between text-orange-600">
                      <p className="font-medium">Custom Price Applied</p>
                      <p className="font-medium">
                        <span className="line-through text-gray-400 mr-2">${totals.calculatedTotal}</span>
                        ${customPrice}
                      </p>
                    </div>
                  </>
                )}

                <hr />

                {/* Total */}
                <div className="flex justify-between text-lg">
                  <p className="font-bold text-gray-900">Total</p>
                  <p className="font-bold text-emerald-600">${totals.total}</p>
                </div>

                <hr />

                {/* Schedule */}
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-medium text-gray-900">
                      {new Date(scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      {' at '}
                      {parseInt(scheduledTime) > 12
                        ? `${parseInt(scheduledTime) - 12}:00 PM`
                        : parseInt(scheduledTime) === 12 ? '12:00 PM' : `${scheduledTime} AM`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Assigned To</p>
                    <p className="font-medium text-gray-900">
                      {assignedEmployee
                        ? employees.find(e => e.id === assignedEmployee)?.firstName + ' ' + employees.find(e => e.id === assignedEmployee)?.lastName
                        : 'Unassigned'}
                    </p>
                  </div>
                </div>

                <hr />

                {/* Estimated Duration & Pay */}
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Estimated Duration</p>
                    <p className="font-medium text-gray-900">
                      {serviceTier === 'premium' ? '~3 hours' : '~1.5 hours'} per vehicle
                      {selectedVehicles.length > 1 && (
                        <span className="text-gray-500"> ({Math.round((serviceTier === 'premium' ? 180 : 90) * selectedVehicles.length / 60 * 10) / 10} hrs total)</span>
                      )}
                    </p>
                  </div>
                  {assignedEmployee && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Est. Employee Pay</p>
                      {(() => {
                        const emp = employees.find(e => e.id === assignedEmployee);
                        if (!emp) return <p className="font-medium text-gray-400">-</p>;
                        const durationHours = (serviceTier === 'premium' ? 180 : 90) * selectedVehicles.length / 60;
                        const hourlyPay = durationHours * emp.hourlyRate;
                        const commissionPay = totals.total * emp.commissionRate;
                        return (
                          <div>
                            <p className="font-medium text-blue-600">
                              ${Math.round(hourlyPay + commissionPay)}
                            </p>
                            <p className="text-xs text-gray-400">
                              ${Math.round(hourlyPay)} hourly + ${Math.round(commissionPay)} commission
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {notes && (
                  <>
                    <hr />
                    <div>
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="text-gray-700">{notes}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-8 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : `Create ${selectedVehicles.length > 1 ? `${selectedVehicles.length} Bookings` : 'Booking'}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
