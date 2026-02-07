'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAffiliateByReferralCode } from '@/lib/affiliate-db';

// Pricing data
const PRICING = {
  express: {
    sedan: { interior: 150, exterior: 120, full: 242 },
    suv_crossover: { interior: 210, exterior: 180, full: 350 },
    truck: { interior: 270, exterior: 240, full: 458 },
  },
  premium: {
    sedan: { interior: 360, exterior: 300, full: 528 },
    suv_crossover: { interior: 420, exterior: 360, full: 624 },
    truck: { interior: 480, exterior: 420, full: 720 },
  },
};

const MEMBERSHIP_DISCOUNTS = {
  weekly: 0.30,
  biweekly: 0.20,
  monthly: 0.10,
};

const REFERRAL_DISCOUNT = 0.10; // 10% discount for referred customers

interface AffiliateInfo {
  id: string;
  referralCode: string;
  firstName: string;
}

export default function BookingForm() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Referral state
  const [referralCode, setReferralCode] = useState<string>('');
  const [affiliateInfo, setAffiliateInfo] = useState<AffiliateInfo | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleType, setVehicleType] = useState<'sedan' | 'suv_crossover' | 'truck' | ''>('');
  const [bookingType, setBookingType] = useState<'one_time' | 'weekly' | 'biweekly' | 'monthly' | ''>('');
  const [serviceTier, setServiceTier] = useState<'express' | 'premium' | ''>('');
  const [serviceType, setServiceType] = useState<'interior' | 'exterior' | 'full' | ''>('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Capture referral code from URL on mount
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      const code = ref.toUpperCase();
      setReferralCode(code);
      localStorage.setItem('emerald_referral_code', code);
      validateReferralCode(code);
    } else {
      const storedRef = localStorage.getItem('emerald_referral_code');
      if (storedRef) {
        setReferralCode(storedRef);
        validateReferralCode(storedRef);
      }
    }
  }, [searchParams]);

  // Validate referral code
  const validateReferralCode = async (code: string) => {
    if (!code) {
      setAffiliateInfo(null);
      setReferralError(null);
      return;
    }

    setValidatingCode(true);
    setReferralError(null);

    try {
      const affiliate = await getAffiliateByReferralCode(code);
      if (affiliate) {
        setAffiliateInfo({
          id: affiliate.id,
          referralCode: affiliate.referralCode,
          firstName: affiliate.firstName,
        });
        setReferralError(null);
      } else {
        setAffiliateInfo(null);
        setReferralError('Invalid referral code');
      }
    } catch (err) {
      console.error('Error validating referral code:', err);
      setAffiliateInfo(null);
    } finally {
      setValidatingCode(false);
    }
  };

  // Calculate pricing
  const calculatePrice = () => {
    if (!vehicleType || !serviceTier || !serviceType) {
      return { basePrice: 0, discount: 0, finalPrice: 0, discountLabel: '' };
    }

    const tier = serviceTier as 'express' | 'premium';
    const vehicle = vehicleType as 'sedan' | 'suv_crossover' | 'truck';
    const service = serviceType as 'interior' | 'exterior' | 'full';

    let basePrice = PRICING[tier][vehicle][service];
    let discount = 0;
    let discountLabel = '';

    // Apply membership discount (only on express)
    if (bookingType && bookingType !== 'one_time' && serviceTier === 'express') {
      const membershipDiscount = MEMBERSHIP_DISCOUNTS[bookingType as keyof typeof MEMBERSHIP_DISCOUNTS];
      discount += basePrice * membershipDiscount;
      discountLabel = `${(membershipDiscount * 100).toFixed(0)}% membership`;
    }

    // Apply referral discount
    if (affiliateInfo) {
      const referralDiscountAmount = basePrice * REFERRAL_DISCOUNT;
      discount += referralDiscountAmount;
      discountLabel = discountLabel
        ? `${discountLabel} + 10% referral`
        : '10% referral discount';
    }

    const finalPrice = basePrice - discount;

    return { basePrice, discount, finalPrice, discountLabel };
  };

  const { basePrice, discount, finalPrice, discountLabel } = calculatePrice();

  const handleReferralCodeChange = (code: string) => {
    const upperCode = code.toUpperCase();
    setReferralCode(upperCode);
    if (upperCode.length >= 4) {
      validateReferralCode(upperCode);
    } else {
      setAffiliateInfo(null);
      setReferralError(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Check if client already exists by email
      const clientsRef = collection(db, 'clients');
      const existingClientQuery = query(clientsRef, where('email', '==', email.toLowerCase()));
      const existingClients = await getDocs(existingClientQuery);

      let clientId: string;

      if (!existingClients.empty) {
        // Use existing client
        clientId = existingClients.docs[0].id;
      } else {
        // Create new client
        const clientData: Record<string, unknown> = {
          firstName: name.split(' ')[0] || name,
          lastName: name.split(' ').slice(1).join(' ') || '',
          email: email.toLowerCase(),
          phone,
          address,
          notes: '',
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        // Add affiliate info if present
        if (affiliateInfo) {
          clientData.affiliateId = affiliateInfo.id;
          clientData.referralCode = affiliateInfo.referralCode;
        }

        const clientRef = await addDoc(clientsRef, clientData);
        clientId = clientRef.id;

        // Create referral record if affiliate
        if (affiliateInfo) {
          await addDoc(collection(db, 'referrals'), {
            affiliateId: affiliateInfo.id,
            clientId: clientId,
            referralCode: affiliateInfo.referralCode,
            isFirstBooking: true,
            createdAt: Timestamp.now(),
          });
        }
      }

      // Create vehicle record
      const vehicleData = {
        clientId,
        year: parseInt(vehicleYear),
        make: vehicleMake,
        model: vehicleModel,
        type: vehicleType,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const vehicleRef = await addDoc(collection(db, 'vehicles'), vehicleData);

      // Create booking
      const bookingData: Record<string, unknown> = {
        clientId,
        vehicleId: vehicleRef.id,
        status: 'confirmed', // Auto-confirmed!
        serviceType,
        serviceTier,
        bookingType: bookingType === 'one_time' ? 'standard' : 'membership',
        recurringSchedule: bookingType !== 'one_time' ? bookingType : null,
        scheduledDate: preferredDate,
        scheduledTime: preferredTime,
        address,
        basePrice,
        discount,
        totalPrice: finalPrice,
        discountLabel: discountLabel || null,
        paymentStatus: 'pending',
        notes: notes || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Add affiliate tracking to booking
      if (affiliateInfo) {
        bookingData.affiliateId = affiliateInfo.id;
        bookingData.referralCode = affiliateInfo.referralCode;
      }

      const bookingRef = await addDoc(collection(db, 'bookings'), bookingData);
      setBookingId(bookingRef.id);

      // Clear referral code from localStorage after successful booking
      localStorage.removeItem('emerald_referral_code');

      setIsSubmitted(true);
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('There was a problem creating your booking. Please try again or call us at (206) 606-3575.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  if (isSubmitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
        <svg
          className="w-16 h-16 text-emerald-500 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
        <p className="text-gray-600 mb-2">
          Your appointment has been scheduled for <strong>{preferredDate}</strong> ({preferredTime}).
        </p>
        {bookingId && (
          <p className="text-sm text-gray-500 mb-4">
            Confirmation #: <code className="bg-gray-100 px-2 py-1 rounded">{bookingId.slice(0, 8).toUpperCase()}</code>
          </p>
        )}
        <p className="text-gray-600 mb-4">
          We&apos;ll send you a confirmation email and reminder before your appointment.
          {affiliateInfo && (
            <span className="block mt-2 text-emerald-600 font-medium">
              Your 10% referral discount has been applied!
            </span>
          )}
        </p>
        <div className="bg-white rounded-lg p-4 mb-4 inline-block">
          <p className="text-gray-700">
            <strong>Total:</strong>{' '}
            {discount > 0 && (
              <span className="text-gray-400 line-through mr-2">${basePrice.toFixed(2)}</span>
            )}
            <span className="text-2xl font-bold text-emerald-600">${finalPrice.toFixed(2)}</span>
          </p>
          <p className="text-sm text-gray-500">Payment due at time of service</p>
        </div>
        <button
          onClick={() => {
            setIsSubmitted(false);
            setBookingId(null);
            // Reset form
            setName('');
            setPhone('');
            setEmail('');
            setVehicleYear('');
            setVehicleMake('');
            setVehicleModel('');
            setVehicleType('');
            setBookingType('');
            setServiceTier('');
            setServiceType('');
            setPreferredDate('');
            setPreferredTime('');
            setAddress('');
            setNotes('');
          }}
          className="text-emerald-600 hover:text-emerald-700 font-semibold"
        >
          Book Another Appointment
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Referral Code Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <label htmlFor="referral_code" className="block text-sm font-medium text-gray-700 mb-2">
          Have a referral code? Get 10% off!
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="referral_code"
            value={referralCode}
            onChange={(e) => handleReferralCodeChange(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 uppercase"
            placeholder="Enter code (e.g., JOHN123)"
            maxLength={10}
          />
          {validatingCode && (
            <div className="flex items-center px-3">
              <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
        {affiliateInfo && (
          <div className="mt-2 flex items-center text-emerald-600">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">10% discount applied!</span>
            <span className="text-gray-500 ml-2">Referred by {affiliateInfo.firstName}</span>
          </div>
        )}
        {referralError && (
          <p className="mt-2 text-sm text-red-600">{referralError}</p>
        )}
      </div>

      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="(206) 555-1234"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="john@example.com"
            />
          </div>
        </div>
      </div>

      {/* Vehicle Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="vehicle_year" className="block text-sm font-medium text-gray-700 mb-1">
              Year *
            </label>
            <input
              type="text"
              id="vehicle_year"
              value={vehicleYear}
              onChange={(e) => setVehicleYear(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="2022"
            />
          </div>
          <div>
            <label htmlFor="vehicle_make" className="block text-sm font-medium text-gray-700 mb-1">
              Make *
            </label>
            <input
              type="text"
              id="vehicle_make"
              value={vehicleMake}
              onChange={(e) => setVehicleMake(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Toyota"
            />
          </div>
          <div>
            <label htmlFor="vehicle_model" className="block text-sm font-medium text-gray-700 mb-1">
              Model *
            </label>
            <input
              type="text"
              id="vehicle_model"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Camry"
            />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="vehicle_type" className="block text-sm font-medium text-gray-700 mb-1">
            Vehicle Type *
          </label>
          <select
            id="vehicle_type"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value as typeof vehicleType)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select vehicle type</option>
            <option value="sedan">Sedan</option>
            <option value="suv_crossover">SUV/Crossover</option>
            <option value="truck">Truck</option>
          </select>
        </div>
      </div>

      {/* Service Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Selection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="service_tier" className="block text-sm font-medium text-gray-700 mb-1">
              Service Tier *
            </label>
            <select
              id="service_tier"
              value={serviceTier}
              onChange={(e) => setServiceTier(e.target.value as typeof serviceTier)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select tier</option>
              <option value="express">Express Detail</option>
              <option value="premium">Premium Detail</option>
            </select>
          </div>
          <div>
            <label htmlFor="service_type" className="block text-sm font-medium text-gray-700 mb-1">
              Service Type *
            </label>
            <select
              id="service_type"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as typeof serviceType)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select service</option>
              <option value="interior">Interior Only</option>
              <option value="exterior">Exterior Only</option>
              <option value="full">Full Detail (Interior + Exterior)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Booking Type */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Type</h3>
        <div>
          <label htmlFor="booking_type" className="block text-sm font-medium text-gray-700 mb-1">
            One-Time or Membership? *
          </label>
          <select
            id="booking_type"
            value={bookingType}
            onChange={(e) => setBookingType(e.target.value as typeof bookingType)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select booking type</option>
            <option value="one_time">One-Time Service</option>
            <option value="weekly">Membership - Weekly (30% off Express)</option>
            <option value="biweekly">Membership - Bi-Weekly (20% off Express)</option>
            <option value="monthly">Membership - Monthly (10% off Express)</option>
          </select>
          {serviceTier === 'premium' && bookingType && bookingType !== 'one_time' && (
            <p className="text-sm text-amber-600 mt-1">
              Note: Membership discounts only apply to Express tier services.
            </p>
          )}
        </div>
      </div>

      {/* Price Display */}
      {basePrice > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Your Price:</p>
              {discount > 0 && (
                <p className="text-sm text-gray-500">
                  <span className="line-through">${basePrice.toFixed(2)}</span>
                  <span className="ml-2 text-emerald-600 font-medium">
                    Save ${discount.toFixed(2)} ({discountLabel})
                  </span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-emerald-600">${finalPrice.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Payment at time of service</p>
            </div>
          </div>
        </div>
      )}

      {/* Scheduling */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Your Appointment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="preferred_date" className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              id="preferred_date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              min={today}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="preferred_time" className="block text-sm font-medium text-gray-700 mb-1">
              Time Slot *
            </label>
            <select
              id="preferred_time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select time</option>
              <option value="8:00 AM">8:00 AM</option>
              <option value="9:00 AM">9:00 AM</option>
              <option value="10:00 AM">10:00 AM</option>
              <option value="11:00 AM">11:00 AM</option>
              <option value="12:00 PM">12:00 PM</option>
              <option value="1:00 PM">1:00 PM</option>
              <option value="2:00 PM">2:00 PM</option>
              <option value="3:00 PM">3:00 PM</option>
              <option value="4:00 PM">4:00 PM</option>
              <option value="5:00 PM">5:00 PM</option>
              <option value="6:00 PM">6:00 PM</option>
            </select>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          We operate Monday - Saturday, 8am - 7pm. Sunday by appointment only.
        </p>
      </div>

      {/* Service Location */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Location</h3>
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address *
          </label>
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="123 Main St, Seattle, WA 98101"
          />
          <p className="text-sm text-gray-500 mt-1">
            We serve the Greater Seattle area. We come to you!
          </p>
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Any special requests or notes about your vehicle?"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Booking...
          </span>
        ) : (
          `Book Now${finalPrice > 0 ? ` - $${finalPrice.toFixed(2)}` : ''}`
        )}
      </button>

      <p className="text-sm text-gray-500 text-center">
        Your appointment will be instantly confirmed. Payment is collected at time of service.
      </p>
    </form>
  );
}
