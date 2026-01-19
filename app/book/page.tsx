import BookingForm from '@/components/BookingForm';

export const metadata = {
  title: 'Book Now | Emerald Detailing',
  description: 'Schedule your mobile car detailing appointment. We come to you!',
};

export default function BookPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gray-900 text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Book Your <span className="text-emerald-400">Detail</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Fill out the form below to request a mobile detailing appointment.
            We&apos;ll confirm your booking within 24 hours.
          </p>
        </div>
      </section>

      {/* Booking Form */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <BookingForm />
          </div>

          {/* Alternative Contact */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Prefer to book by phone? Give us a call!
            </p>
            <a
              href="tel:+12066063575"
              className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-semibold text-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              (206) 606-3575
            </a>
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What to <span className="text-emerald-500">Expect</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Submit Request</h3>
              <p className="text-gray-600">
                Fill out the booking form with your details and preferred schedule.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Confirmation</h3>
              <p className="text-gray-600">
                We&apos;ll contact you within 24 hours to confirm your appointment and answer any questions.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">We Come to You</h3>
              <p className="text-gray-600">
                On appointment day, we arrive at your location ready to make your vehicle shine!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Area Note */}
      <section className="py-12 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Area</h3>
          <p className="text-gray-600">
            We proudly serve the greater Seattle area. Not sure if we come to your location?
            Include your address in the booking form and we&apos;ll let you know!
          </p>
        </div>
      </section>
    </>
  );
}
