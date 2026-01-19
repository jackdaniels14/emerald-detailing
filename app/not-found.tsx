import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="min-h-[70vh] flex items-center justify-center bg-gray-50">
      <div className="max-w-xl mx-auto px-4 text-center">
        <h1 className="text-6xl font-bold text-emerald-500 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
          It might have been moved or doesn&apos;t exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
          >
            Go Home
          </Link>
          <Link
            href="/contact"
            className="border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}
