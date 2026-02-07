import Link from 'next/link';
import PublicLayout from '@/components/PublicLayout';

export const metadata = {
  title: 'Gallery | Emerald Detailing',
  description: 'See our work! Before and after photos of our professional detailing services.',
};

export default function GalleryPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white py-16 md:py-24">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/red-headlight-detail.jpg)' }}
        >
          <div className="absolute inset-0 bg-gray-900/80"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Our <span className="text-emerald-400">Work</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            See the Emerald Detailing difference. Check back soon to see
            the quality of our work.
          </p>
        </div>
      </section>

      {/* Showcase Gallery */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Professional <span className="text-emerald-500">Results</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See the quality and attention to detail we bring to every vehicle.
            </p>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Image 1 - Exterior Detail */}
            <div className="group relative overflow-hidden rounded-xl shadow-lg aspect-[4/3]">
              <img
                src="/images/infiniti-parking.jpg"
                alt="Detailed black Infiniti with showroom shine"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-semibold text-lg">Exterior Detail</h3>
                  <p className="text-sm text-gray-300">Mirror-like finish</p>
                </div>
              </div>
            </div>

            {/* Image 2 - Headlight Restoration */}
            <div className="group relative overflow-hidden rounded-xl shadow-lg aspect-[4/3]">
              <img
                src="/images/bmw-headlight-detail.jpg"
                alt="Crystal clear BMW headlight after restoration"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-semibold text-lg">Headlight Clarity</h3>
                  <p className="text-sm text-gray-300">Restored to new</p>
                </div>
              </div>
            </div>

            {/* Image 3 - Interior Detailing */}
            <div className="group relative overflow-hidden rounded-xl shadow-lg aspect-[4/3]">
              <img
                src="/images/interior-detail-brush.jpg"
                alt="Professional interior detailing with precision tools"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-semibold text-lg">Interior Detail</h3>
                  <p className="text-sm text-gray-300">Every crevice cleaned</p>
                </div>
              </div>
            </div>

            {/* Image 4 - Paint Correction */}
            <div className="group relative overflow-hidden rounded-xl shadow-lg aspect-[4/3]">
              <img
                src="/images/shiny-hood-reflection.jpg"
                alt="Flawless paint with perfect reflections"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-semibold text-lg">Paint Perfection</h3>
                  <p className="text-sm text-gray-300">Flawless reflections</p>
                </div>
              </div>
            </div>

            {/* Image 5 - Red Car Detail */}
            <div className="group relative overflow-hidden rounded-xl shadow-lg aspect-[4/3]">
              <img
                src="/images/red-headlight-detail.jpg"
                alt="Vibrant red car with detailed headlights"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-semibold text-lg">Color Enhancement</h3>
                  <p className="text-sm text-gray-300">Vibrant &amp; protected</p>
                </div>
              </div>
            </div>

            {/* Image 6 - Wash Process */}
            <div className="group relative overflow-hidden rounded-xl shadow-lg aspect-[4/3]">
              <img
                src="/images/soap-black-car.jpg"
                alt="Professional hand wash with foam"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-semibold text-lg">Hand Wash</h3>
                  <p className="text-sm text-gray-300">Premium foam bath</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Photos Invite */}
          <div className="mt-12 text-center">
            <div className="inline-block bg-emerald-50 border border-emerald-200 rounded-lg px-6 py-4">
              <p className="text-emerald-700 font-medium">
                Love your detail? Tag us on social media @emeralddetailing and your car could be featured here!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-emerald-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Want Your Car to Look This Good?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Book your detail today and experience the transformation.
          </p>
          <Link
            href="/book"
            className="bg-white text-emerald-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200 inline-block"
          >
            Book Now
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
