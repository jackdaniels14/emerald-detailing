# Emerald Detailing - TODO List

## Analytics Setup (Required for Ad Tracking)

### Google Analytics 4
- [ ] Create a Google Analytics 4 property at https://analytics.google.com/
- [ ] Get your Measurement ID (format: G-XXXXXXXXXX)
- [ ] Add to `.env.local` file: `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX`
- [ ] Redeploy after adding: `npm run build && firebase deploy --only hosting`

### Facebook Pixel (for Ad Retargeting)
- [ ] Create a Facebook Pixel at https://business.facebook.com/events_manager
- [ ] Get your Pixel ID
- [ ] Add to `.env.local` file: `NEXT_PUBLIC_FB_PIXEL_ID=your_pixel_id`
- [ ] Redeploy after adding

---

## Gallery Photos
- [ ] Add real before/after photos from completed detailing jobs
- [ ] Place images in `public/images/` folder
- [ ] Update `app/gallery/page.tsx` to display actual work photos
- [ ] Consider organizing by service type (interior, exterior, full detail)

---

## Affiliate Program Enhancements
- [ ] Set up affiliate payout method (PayPal, Venmo, check, etc.)
- [ ] Create affiliate marketing materials (banners, social media posts)
- [ ] Consider adding affiliate performance tiers (higher commission for top performers)

---

## Booking System Enhancements
- [ ] Add employee schedule checking to prevent double-bookings
- [ ] Add email confirmation notifications to customers
- [ ] Add SMS reminders before appointments
- [ ] Integrate with calendar (Google Calendar sync)

---

## Payment Integration
- [ ] Set up Stripe or Square for online payment processing
- [ ] Add option to pay deposit at booking
- [ ] Enable recurring billing for membership customers

---

## Marketing & SEO
- [ ] Add customer testimonials/reviews section
- [ ] Set up Google Business Profile
- [ ] Add schema markup for local SEO
- [ ] Create blog section for detailing tips (helps SEO)

---

## Contact Form
- [ ] Set up Formspree account for contact form
- [ ] Update `components/ContactForm.tsx` with Formspree ID
- [ ] Or integrate with email service (SendGrid, Mailgun)

---

## Future Features to Consider
- [ ] Online chat support
- [ ] Gift cards/vouchers
- [ ] Referral program for customers (not just affiliates)
- [ ] Fleet/business accounts with special pricing
- [ ] Mobile app for customers to track appointments

---

## Technical Debt
- [ ] Add error tracking (Sentry)
- [ ] Add automated testing
- [ ] Set up staging environment
- [ ] Database backups schedule

---

*Last updated: February 2, 2026*
