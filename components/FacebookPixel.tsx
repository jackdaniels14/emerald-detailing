'use client';

import Script from 'next/script';

// Replace this with your actual Facebook Pixel ID
// Get it from: https://business.facebook.com/events_manager
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '';

export default function FacebookPixel() {
  // Don't load if no pixel ID is set
  if (!FB_PIXEL_ID) {
    return null;
  }

  return (
    <>
      {/* Facebook Pixel */}
      <Script id="facebook-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${FB_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

// Helper function to track Facebook events
export function trackFBEvent(eventName: string, parameters?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq) {
    (window as unknown as { fbq: (...args: unknown[]) => void }).fbq('track', eventName, parameters);
  }
}

// Common Facebook Pixel events
export const FBEvents = {
  // Standard events
  viewContent: (contentName: string) => trackFBEvent('ViewContent', { content_name: contentName }),
  initiateCheckout: (value: number) => trackFBEvent('InitiateCheckout', { value, currency: 'USD' }),
  purchase: (value: number) => trackFBEvent('Purchase', { value, currency: 'USD' }),
  lead: () => trackFBEvent('Lead'),
  completeRegistration: () => trackFBEvent('CompleteRegistration'),
  contact: () => trackFBEvent('Contact'),
  schedule: () => trackFBEvent('Schedule'),
};
