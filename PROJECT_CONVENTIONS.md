# Emerald Detailing - Project Conventions & Formatting Guide

## Project Overview
Next.js web application for a mobile car detailing business.

---

## Tech Stack
- **Framework:** Next.js 14.2.35 (App Router)
- **Language:** TypeScript 5.9.3
- **Styling:** Tailwind CSS 3.4.19
- **Build:** Static export enabled (`output: 'export'`)

---

## Project Structure
```
emerald-detailing/
├── app/                    # Next.js app router pages
│   ├── layout.tsx          # Root layout wrapper
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global styles
│   ├── book/page.tsx       # Booking page
│   ├── contact/page.tsx    # Contact page
│   ├── gallery/page.tsx    # Gallery page
│   ├── pricing/page.tsx    # Pricing page
│   └── services/page.tsx   # Services page
├── components/             # Reusable React components
│   ├── BookingForm.tsx
│   ├── Footer.tsx
│   ├── GalleryGrid.tsx
│   ├── Hero.tsx
│   ├── Navbar.tsx
│   ├── PricingCard.tsx
│   └── ServiceCard.tsx
├── public/                 # Static assets
├── tailwind.config.js      # Custom emerald color palette
├── tsconfig.json           # TypeScript config (strict mode)
└── next.config.js          # Static export config
```

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component files | PascalCase | `BookingForm.tsx`, `ServiceCard.tsx` |
| Page directories | kebab-case | `/book/`, `/contact/`, `/gallery/` |
| Components | PascalCase | `Navbar`, `PricingCard` |
| Functions/Variables | camelCase | `handleSubmit`, `navLinks` |
| Boolean variables | `is`/`has` prefix | `isOpen`, `isSubmitting` |
| Props interfaces | PascalCase + "Props" | `ServiceCardProps` |

---

## Code Formatting

### Indentation & Spacing
- **2 spaces** for indentation
- Consistent spacing in JSX

### Quotes
- **Single quotes** for JS/TS strings: `'use client'`
- **Double quotes** for JSX attributes: `className="..."`

### Semicolons
- **Always use semicolons** at end of statements

---

## Component Structure Pattern

```typescript
// 1. Client directive (only if needed)
'use client';

// 2. Imports - React/Next first, then components with @/ alias
import Link from 'next/link';
import { useState } from 'react';
import ComponentName from '@/components/ComponentName';

// 3. Props interface
interface ComponentProps {
  title: string;
  description?: string;
}

// 4. Default export function
export default function ComponentName({ title, description }: ComponentProps) {
  // 5. State (if client component)
  const [isOpen, setIsOpen] = useState(false);

  // 6. Event handlers
  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  // 7. JSX return
  return (
    <div className="...">
      {/* Content */}
    </div>
  );
}
```

---

## Import Order
1. React/Next.js imports
2. Component imports (using `@/` alias)
3. Local imports

```typescript
import type { Metadata } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
```

---

## Client vs Server Components

### Use `'use client'` for:
- Components with `useState` or `useEffect`
- Event handlers (forms, clicks)
- Interactive elements (mobile menus, filters)

### Keep as Server Components:
- Static display components
- Pages with metadata exports
- Components without interactivity

---

## Tailwind CSS Patterns

### Brand Colors
- **Primary:** Emerald (`emerald-500`, `emerald-600`, `emerald-400`)
- **Neutrals:** Gray scale (`gray-50` to `gray-900`)
- **Hover states:** Darker shade (`bg-emerald-500 hover:bg-emerald-600`)

### Responsive Design (Mobile-First)
```typescript
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
className="px-4 sm:px-6 lg:px-8"
```

### Common Utility Patterns
```typescript
// Buttons
className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"

// Cards
className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"

// Form inputs
className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"

// Section containers
className="py-16 bg-gray-50"
className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
```

### Spacing
- Use `space-y-*` / `space-x-*` for stacked elements
- Use `gap-*` for grid/flex gaps
- Common values: `2`, `4`, `6`, `8`, `12`, `16`

---

## Page Component Pattern

```typescript
import type { Metadata } from 'next';
import ComponentName from '@/components/ComponentName';

export const metadata: Metadata = {
  title: 'Page Title | Emerald Detailing',
  description: 'Page description for SEO',
};

export default function PageName() {
  return (
    <main>
      {/* Page content */}
    </main>
  );
}
```

---

## Form Handling Pattern

```typescript
'use client';

import { useState, FormEvent } from 'react';

export default function FormComponent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('https://formspree.io/f/YOUR_ID', {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

---

## JSX Comments
Use section comments to organize large components:
```typescript
{/* Hero Section */}
{/* Features Section */}
{/* CTA Section */}
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with Navbar, Footer, font |
| `app/globals.css` | Tailwind directives, smooth scroll, body styles |
| `tailwind.config.js` | Custom emerald color palette (50-900) |
| `tsconfig.json` | Strict mode, `@/*` path alias |
| `next.config.js` | Static export, unoptimized images |

---

## Quick Reference

- **Path alias:** `@/` maps to project root
- **Font:** Inter (from next/font/google)
- **Form service:** Formspree
- **Export:** Static site generation
- **Strict TypeScript:** Enabled
