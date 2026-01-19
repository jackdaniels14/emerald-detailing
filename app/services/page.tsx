import Link from 'next/link';
import Image from 'next/image';
import ServiceCard from '@/components/ServiceCard';

export const metadata = {
  title: 'Our Services | Emerald Detailing',
  description: 'Professional interior, exterior, and full detail services for all vehicle types.',
};

export default function ServicesPage() {
  const services = [
    {
      title: 'Interior Detailing',
      description: 'Complete interior cleaning and restoration to make your cabin feel brand new.',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      features: [
        'Complete vacuum of carpets, seats, and trunk',
        'Dashboard, console, and door panel cleaning',
        'Leather conditioning (if applicable)',
        'Window and mirror cleaning (interior)',
        'Air vent and crevice detailing',
        'Floor mat cleaning',
        'Odor elimination treatment',
      ],
    },
    {
      title: 'Exterior Detailing',
      description: 'Thorough exterior cleaning and protection to restore your vehicle\'s shine.',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      features: [
        'Hand wash with pH-balanced soap',
        'Clay bar treatment to remove contaminants',
        'Wheel and tire cleaning',
        'Tire dressing application',
        'Window and mirror cleaning (exterior)',
        'Hand wax/sealant application',
        'Trim restoration',
      ],
    },
    {
      title: 'Full Detail',
      description: 'The complete package combining interior and exterior services with added care.',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      features: [
        'All interior detailing services',
        'All exterior detailing services',
        'Engine bay cleaning',
        'Door jamb cleaning',
        'Extended protection treatment',
        'Discounted bundle pricing',
      ],
    },
  ];

  const addOns = [
    { name: 'Pet Hair Removal', description: 'Specialized removal of stubborn pet hair from upholstery' },
    { name: 'Headlight Restoration', description: 'Restore clarity to foggy or yellowed headlights' },
    { name: 'Engine Bay Cleaning', description: 'Degrease and detail your engine compartment' },
    { name: 'Ceramic Coating', description: 'Long-lasting paint protection (ask for pricing)' },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white py-16 md:py-24">
        <div className="absolute inset-0">
          <Image
            src="/images/car-wash-soap.jpg"
            alt="Car detailing in progress"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gray-900/80"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Our <span className="text-emerald-400">Services</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Professional detailing services tailored to your vehicle&apos;s needs.
            We offer Express and Premium tiers for each service.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <ServiceCard key={index} {...service} />
            ))}
          </div>
        </div>
      </section>

      {/* Service Tiers Explanation */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Service <span className="text-emerald-500">Tiers</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Express Detail</h3>
              <p className="text-gray-600 mb-4">
                Our Express package is perfect for regular maintenance and quick refreshes.
                Ideal for vehicles that are regularly maintained and need a thorough clean.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Standard cleaning products
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Essential services included
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Great for regular maintenance
                </li>
              </ul>
            </div>
            <div className="bg-emerald-50 rounded-xl p-8 border-2 border-emerald-500">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Premium Detail</h3>
              <p className="text-gray-600 mb-4">
                Our Premium package delivers the ultimate detailing experience with
                top-tier products and extended care for vehicles needing extra attention.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Premium-grade products
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Extended service time
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Deep cleaning & restoration
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Add-Ons */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Add-On <span className="text-emerald-500">Services</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {addOns.map((addon, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{addon.name}</h3>
                <p className="text-gray-600 text-sm">{addon.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-emerald-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Check out our pricing or book your appointment today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing"
              className="bg-white text-emerald-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200 inline-block"
            >
              View Pricing
            </Link>
            <Link
              href="/book"
              className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200 inline-block"
            >
              Book Now
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
