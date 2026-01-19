'use client';

import { useState, FormEvent } from 'react';

export default function BookingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // TODO: Replace YOUR_FORMSPREE_ID with your actual Formspree form ID
    const FORMSPREE_ID = 'YOUR_FORMSPREE_ID';

    if (FORMSPREE_ID === 'YOUR_FORMSPREE_ID') {
      // Formspree not configured yet - show contact info instead
      setIsSubmitting(false);
      setError('Online booking is coming soon! Please call or text us at (206) 606-3575 or email emeralddetailer@gmail.com to book your appointment.');
      return;
    }

    try {
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        setIsSubmitted(true);
        form.reset();
      } else {
        throw new Error('Form submission failed');
      }
    } catch {
      setError('There was a problem submitting your booking. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Request Received!</h3>
        <p className="text-gray-600 mb-4">
          Thank you for your booking request. We&apos;ll review your information and contact you
          within 24 hours to confirm your appointment.
        </p>
        <button
          onClick={() => setIsSubmitted(false)}
          className="text-emerald-600 hover:text-emerald-700 font-semibold"
        >
          Submit Another Booking
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
              name="name"
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
              name="phone"
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
              name="email"
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
              name="vehicle_year"
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
              name="vehicle_make"
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
              name="vehicle_model"
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
            name="vehicle_type"
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

      {/* Booking Type */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Type</h3>
        <div>
          <label htmlFor="booking_type" className="block text-sm font-medium text-gray-700 mb-1">
            One-Time or Membership? *
          </label>
          <select
            id="booking_type"
            name="booking_type"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select booking type</option>
            <option value="one_time">One-Time Service</option>
            <option value="membership_weekly">Membership - Weekly (30% off Express)</option>
            <option value="membership_biweekly">Membership - Bi-Weekly (20% off Express)</option>
            <option value="membership_monthly">Membership - Monthly (10% off Express)</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Memberships use Express Detail pricing with additional discounts for recurring service.
          </p>
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
              name="service_tier"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select tier</option>
              <option value="express">Express Detail</option>
              <option value="premium">Premium Detail</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Note: Memberships are based on Express pricing.
            </p>
          </div>
          <div>
            <label htmlFor="service_type" className="block text-sm font-medium text-gray-700 mb-1">
              Service Type *
            </label>
            <select
              id="service_type"
              name="service_type"
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

      {/* Scheduling */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferred Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="preferred_date" className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Date *
            </label>
            <input
              type="date"
              id="preferred_date"
              name="preferred_date"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="preferred_time" className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Time *
            </label>
            <select
              id="preferred_time"
              name="preferred_time"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select time</option>
              <option value="morning">Morning (8am - 12pm)</option>
              <option value="afternoon">Afternoon (12pm - 4pm)</option>
              <option value="evening">Evening (4pm - 7pm)</option>
            </select>
          </div>
        </div>
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
            name="address"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="123 Main St, Seattle, WA 98101"
          />
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Any special requests, vehicle condition notes, or questions?"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
      >
        {isSubmitting ? 'Submitting...' : 'Request Booking'}
      </button>

      <p className="text-sm text-gray-500 text-center">
        By submitting this form, you agree to be contacted regarding your booking request.
        We&apos;ll confirm your appointment within 24 hours.
      </p>
    </form>
  );
}
