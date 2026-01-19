import Link from 'next/link';

export const metadata = {
  title: 'Gallery | Emerald Detailing',
  description: 'See our work! Before and after photos of our professional detailing services.',
};

export default function GalleryPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white py-16 md:py-24">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/emerald-detailing/images/red-car-headlight.jpg)' }}
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

      {/* Coming Soon */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block bg-emerald-50 border border-emerald-200 rounded-lg p-8 max-w-xl">
              <svg className="w-16 h-16 text-emerald-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Gallery Coming Soon</h2>
              <p className="text-gray-700">
                We&apos;re building our portfolio of before and after photos.
                Check back soon to see the amazing transformations!
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
    </>
  );
}
