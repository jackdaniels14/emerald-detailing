import Link from 'next/link';
import Image from 'next/image';
import GalleryGrid from '@/components/GalleryGrid';

export const metadata = {
  title: 'Gallery | Emerald Detailing',
  description: 'See our work! Before and after photos of our professional detailing services.',
};

export default function GalleryPage() {
  const galleryItems = [
    {
      id: 1,
      title: 'Luxury Sedan Detail',
      category: 'exterior',
      image: '/images/infiniti-g37.jpg',
    },
    {
      id: 2,
      title: 'Premium Headlight Restoration',
      category: 'exterior',
      image: '/images/bmw-headlight.jpg',
    },
    {
      id: 3,
      title: 'Classic Car Polish',
      category: 'exterior',
      image: '/images/classic-car-hood.jpg',
    },
    {
      id: 4,
      title: 'Sports Car Detail',
      category: 'exterior',
      image: '/images/red-car-headlight.jpg',
    },
    {
      id: 5,
      title: 'Exterior Foam Wash',
      category: 'wash',
      image: '/images/car-wash-soap.jpg',
    },
    {
      id: 6,
      title: 'Console Deep Clean',
      category: 'interior',
      image: '/images/interior-detailing-console.jpg',
    },
    {
      id: 7,
      title: 'Door Panel Detailing',
      category: 'interior',
      image: '/images/interior-detailing-door.jpg',
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white py-16 md:py-24">
        <div className="absolute inset-0">
          <Image
            src="/images/red-car-headlight.jpg"
            alt="Detailed car showcase"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gray-900/80"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Our <span className="text-emerald-400">Work</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            See the Emerald Detailing difference. Browse our gallery
            to see the quality of our work.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <GalleryGrid items={galleryItems} />
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
