'use client';

import Script from 'next/script';

// Replace this with your actual Google Analytics Measurement ID (G-XXXXXXXXXX)
// Get it from: https://analytics.google.com/ -> Admin -> Data Streams -> Web
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX';

export default function GoogleAnalytics() {
  // Don't load if no measurement ID is set
  if (GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    return null;
  }

  return (
    <>
      {/* Google Analytics */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_title: document.title,
            page_location: window.location.href,
          });
        `}
      </Script>
    </>
  );
}

// Helper function to track custom events
export function trackEvent(eventName: string, parameters?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', eventName, parameters);
  }
}

// Common events to track
export const AnalyticsEvents = {
  // Page views are automatic

  // Booking events
  bookingStarted: () => trackEvent('booking_started'),
  bookingCompleted: (value: number) => trackEvent('purchase', {
    value,
    currency: 'USD',
    items: [{ name: 'Detailing Service' }]
  }),

  // Referral events
  referralCodeApplied: (code: string) => trackEvent('referral_applied', { code }),

  // Lead events
  contactFormSubmitted: () => trackEvent('generate_lead', { lead_type: 'contact_form' }),
  affiliateSignup: () => trackEvent('sign_up', { method: 'affiliate' }),

  // Engagement
  serviceViewed: (service: string) => trackEvent('view_item', { item_name: service }),
  pricingViewed: () => trackEvent('view_pricing'),
};
