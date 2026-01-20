'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ContactForm() {
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
      setError('Contact form coming soon! Please call or text us at (206) 606-3575 or email emeralddetailer@gmail.com directly.');
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
      setError('There was a problem sending your message. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white py-16 md:py-24">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/emerald-detailing/images/interior-detailing-console.jpg)' }}
        >
          <div className="absolute inset-0 bg-gray-900/85"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Contact <span className="text-emerald-400">Us</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Have questions? We&apos;d love to hear from you. Reach out anytime!
          </p>
        </div>
      </section>

      {/* Contact Info & Form */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>

              <div className="space-y-6">
                {/* Phone */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 text-emerald-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Phone</h3>
                    <a href="tel:+12066063575" className="text-emerald-600 hover:text-emerald-700 text-lg">
                      (206) 606-3575
                    </a>
                    <p className="text-gray-500 text-sm mt-1">Call or text anytime</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 text-emerald-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Email</h3>
                    <a href="mailto:emeralddetailer@gmail.com" className="text-emerald-600 hover:text-emerald-700 text-lg">
                      emeralddetailer@gmail.com
                    </a>
                    <p className="text-gray-500 text-sm mt-1">We reply within 24 hours</p>
                  </div>
                </div>

                {/* Service Area */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 text-emerald-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Service Area</h3>
                    <p className="text-gray-700">Greater Seattle Area</p>
                    <p className="text-gray-500 text-sm mt-1">Mobile service - we come to you!</p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 text-emerald-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Hours</h3>
                    <p className="text-gray-700">Monday - Saturday: 8am - 7pm</p>
                    <p className="text-gray-700">Sunday: By appointment</p>
                  </div>
                </div>
              </div>

              {/* Quick Book CTA */}
              <div className="mt-8 p-6 bg-emerald-50 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Book?</h3>
                <p className="text-gray-600 mb-4">
                  Skip the form and book your detail directly.
                </p>
                <Link
                  href="/book"
                  className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
                >
                  Book Now
                </Link>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send a Message</h2>

                {isSubmitted ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
                    <svg
                      className="w-16 h-16 text-emerald-500 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-600 mb-4">
                      Thank you for reaching out. We&apos;ll get back to you soon!
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                        {error}
                      </div>
                    )}

                    <div>
                      <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        id="contact_name"
                        name="name"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="contact_email"
                        name="email"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        id="contact_phone"
                        name="phone"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="(206) 555-1234"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact_subject" className="block text-sm font-medium text-gray-700 mb-1">
                        Subject *
                      </label>
                      <select
                        id="contact_subject"
                        name="subject"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Select a subject</option>
                        <option value="general">General Question</option>
                        <option value="quote">Quote Request</option>
                        <option value="service">Service Question</option>
                        <option value="feedback">Feedback</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="contact_message" className="block text-sm font-medium text-gray-700 mb-1">
                        Message *
                      </label>
                      <textarea
                        id="contact_message"
                        name="message"
                        rows={5}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="How can we help you?"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
