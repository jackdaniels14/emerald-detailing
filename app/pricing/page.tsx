import Link from 'next/link';
import PricingCard from '@/components/PricingCard';

export const metadata = {
  title: 'Pricing | Emerald Detailing',
  description: 'Transparent pricing for all our detailing services. Express and Premium packages available.',
};

export default function PricingPage() {
  const expressPricing = {
    title: 'Express Detail',
    description: 'Perfect for regular maintenance and quick refreshes.',
    discount: '10%',
    tiers: [
      { vehicle: 'Sedan', interior: 125, exterior: 100, full: 202 },
      { vehicle: 'SUV/Crossover', interior: 175, exterior: 150, full: 292 },
      { vehicle: 'Truck', interior: 225, exterior: 200, full: 382 },
    ],
  };

  const premiumPricing = {
    title: 'Premium Detail',
    description: 'The ultimate detailing experience with top-tier products.',
    discount: '20%',
    featured: true,
    tiers: [
      { vehicle: 'Sedan', interior: 300, exterior: 250, full: 440 },
      { vehicle: 'SUV/Crossover', interior: 350, exterior: 300, full: 520 },
      { vehicle: 'Truck', interior: 400, exterior: 350, full: 600 },
    ],
  };

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gray-900 text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Simple, Transparent <span className="text-emerald-400">Pricing</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Choose the service level that fits your needs. Full detail packages include
            both interior and exterior services at a discounted rate.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PricingCard {...expressPricing} />
            <PricingCard {...premiumPricing} />
          </div>
        </div>
      </section>

      {/* Membership Plans */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block bg-emerald-100 text-emerald-700 text-sm font-semibold px-4 py-1 rounded-full mb-4">
              Save More with Memberships
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Recurring <span className="text-emerald-500">Membership Plans</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Keep your vehicle looking its best with our membership plans.
              The more frequent the service, the more you save!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Monthly Plan */}
            <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 hover:border-emerald-300 transition-colors">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Monthly</h3>
                <div className="mt-2">
                  <span className="inline-block bg-emerald-100 text-emerald-700 text-sm font-semibold px-3 py-1 rounded-full">
                    10% Off Express
                  </span>
                </div>
                <p className="text-gray-500 text-sm mt-2">Once per month</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500">
                    <th className="pb-2 text-left font-medium">Vehicle</th>
                    <th className="pb-2 text-center font-medium">Int.</th>
                    <th className="pb-2 text-center font-medium">Ext.</th>
                    <th className="pb-2 text-center font-medium">Full</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900">
                  <tr className="border-t border-gray-200">
                    <td className="py-2">Sedan</td>
                    <td className="py-2 text-center">$113</td>
                    <td className="py-2 text-center">$90</td>
                    <td className="py-2 text-center text-emerald-600 font-semibold">$182</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="py-2">SUV</td>
                    <td className="py-2 text-center">$158</td>
                    <td className="py-2 text-center">$135</td>
                    <td className="py-2 text-center text-emerald-600 font-semibold">$263</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="py-2">Truck</td>
                    <td className="py-2 text-center">$203</td>
                    <td className="py-2 text-center">$180</td>
                    <td className="py-2 text-center text-emerald-600 font-semibold">$344</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bi-Weekly Plan */}
            <div className="bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  POPULAR
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Bi-Weekly</h3>
                <div className="mt-2">
                  <span className="inline-block bg-emerald-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
                    20% Off Express
                  </span>
                </div>
                <p className="text-gray-500 text-sm mt-2">Every 2 weeks</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500">
                    <th className="pb-2 text-left font-medium">Vehicle</th>
                    <th className="pb-2 text-center font-medium">Int.</th>
                    <th className="pb-2 text-center font-medium">Ext.</th>
                    <th className="pb-2 text-center font-medium">Full</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900">
                  <tr className="border-t border-gray-200">
                    <td className="py-2">Sedan</td>
                    <td className="py-2 text-center">$100</td>
                    <td className="py-2 text-center">$80</td>
                    <td className="py-2 text-center text-emerald-600 font-semibold">$162</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="py-2">SUV</td>
                    <td className="py-2 text-center">$140</td>
                    <td className="py-2 text-center">$120</td>
                    <td className="py-2 text-center text-emerald-600 font-semibold">$234</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="py-2">Truck</td>
                    <td className="py-2 text-center">$180</td>
                    <td className="py-2 text-center">$160</td>
                    <td className="py-2 text-center text-emerald-600 font-semibold">$306</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Weekly Plan */}
            <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 hover:border-emerald-300 transition-colors">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Weekly</h3>
                <div className="mt-2">
                  <span className="inline-block bg-emerald-100 text-emerald-700 text-sm font-semibold px-3 py-1 rounded-full">
                    30% Off Express
                  </span>
                </div>
                <p className="text-gray-500 text-sm mt-2">Once per week</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500">
                    <th className="pb-2 text-left font-medium">Vehicle</th>
                    <th className="pb-2 text-center font-medium">Int.</th>
                    <th className="pb-2 text-center font-medium">Ext.</th>
                    <th className="pb-2 text-center font-medium">Full</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900">
                  <tr className="border-t border-gray-200">
                    <td className="py-2">Sedan</td>
                    <td className="py-2 text-center">$88</td>
                    <td className="py-2 text-center">$70</td>
                    <td className="py-2 text-center text-emerald-600 font-semibold">$141</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="py-2">SUV</td>
                    <td className="py-2 text-center">$123</td>
                    <td className="py-2 text-center">$105</td>
                    <td className="py-2 text-center text-emerald-600 font-semibold">$204</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="py-2">Truck</td>
                    <td className="py-2 text-center">$158</td>
                    <td className="py-2 text-center">$140</td>
                    <td className="py-2 text-center text-emerald-600 font-semibold">$267</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Membership pricing is based on Express Detail rates. Commit to regular service and save!
            </p>
            <Link
              href="/book"
              className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200"
            >
              Start a Membership
            </Link>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What&apos;s <span className="text-emerald-500">Included</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Interior */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Interior Service
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full vacuum (seats, carpets, trunk)
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Surface wipe-down & sanitization
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Window & mirror cleaning
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Dashboard & console detail
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Air freshener application
                </li>
              </ul>
            </div>

            {/* Exterior */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Exterior Service
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Hand wash with quality soap
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Wheel & tire cleaning
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Tire dressing
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Window cleaning
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Spray wax finish
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-2">
              <strong>Premium tier</strong> includes enhanced products, deeper cleaning, and additional services like
              clay bar treatment, leather conditioning, and longer-lasting protection.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Frequently Asked <span className="text-emerald-500">Questions</span>
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How long does a detail take?
              </h3>
              <p className="text-gray-600">
                Express details typically take 1-2 hours depending on vehicle size and condition.
                Premium details can take 2-4 hours for the thorough, comprehensive service.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do I need to be home during the service?
              </h3>
              <p className="text-gray-600">
                Not necessarily. As long as we have access to your vehicle and a water source
                (for exterior services), you can go about your day.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What if my vehicle is extra dirty?
              </h3>
              <p className="text-gray-600">
                We may need to assess particularly dirty or neglected vehicles. Additional charges
                may apply for excessive pet hair, heavy staining, or biohazard cleanup.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What forms of payment do you accept?
              </h3>
              <p className="text-gray-600">
                We accept cash, credit/debit cards, Venmo, and Zelle for your convenience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-emerald-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Book?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Schedule your mobile detailing appointment today.
          </p>
          <Link
            href="/book"
            className="bg-white text-emerald-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200 inline-block"
          >
            Book Your Detail
          </Link>
        </div>
      </section>
    </>
  );
}
