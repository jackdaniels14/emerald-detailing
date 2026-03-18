'use client';

export default function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "AutoDetailing",
    "name": "Emerald Detailing",
    "description": "Professional mobile car detailing services in the Greater Seattle area. Interior, exterior, and full detail packages available. We come to you!",
    "url": "https://emeralddetailers.com",
    "telephone": "+1-206-606-3575",
    "email": "emeralddetailer@gmail.com",
    "areaServed": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": "47.6062",
        "longitude": "-122.3321"
      },
      "geoRadius": "50000"
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Seattle",
      "addressRegion": "WA",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "47.6062",
      "longitude": "-122.3321"
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "08:00",
        "closes": "19:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Sunday",
        "opens": "00:00",
        "closes": "00:00",
        "description": "By appointment only"
      }
    ],
    "priceRange": "$$",
    "image": "https://emeralddetailers.com/images/logo.png",
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Mobile Auto Detailing Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Interior Detailing",
            "description": "Complete interior cleaning and restoration including vacuuming, dashboard cleaning, leather conditioning, window cleaning, and odor elimination."
          },
          "priceSpecification": {
            "@type": "PriceSpecification",
            "priceCurrency": "USD",
            "minPrice": "150",
            "maxPrice": "480"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Exterior Detailing",
            "description": "Thorough exterior cleaning including hand wash, clay bar treatment, wheel and tire cleaning, hand wax/sealant application, and trim restoration."
          },
          "priceSpecification": {
            "@type": "PriceSpecification",
            "priceCurrency": "USD",
            "minPrice": "120",
            "maxPrice": "420"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Full Detail",
            "description": "Complete interior and exterior detailing package with engine bay cleaning, door jamb cleaning, and extended protection treatment."
          },
          "priceSpecification": {
            "@type": "PriceSpecification",
            "priceCurrency": "USD",
            "minPrice": "242",
            "maxPrice": "720"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Headlight Restoration",
            "description": "Professional headlight restoration to improve clarity and visibility."
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Ceramic Coating",
            "description": "Long-lasting ceramic coating protection for your vehicle's paint."
          }
        }
      ]
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "127"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
