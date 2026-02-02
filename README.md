# Emerald Detailing - Business Management System

A comprehensive business management platform for a mobile car detailing business, featuring booking management, sales CRM with power dialer, POS system, employee management, and payroll.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Firebase (Firestore, Auth, Functions, Storage, Hosting)
- **Calling:** Twilio Voice SDK (browser-based WebRTC calling)
- **Payments:** Stripe (POS transactions)
- **Build:** Static export (`output: 'export'`)

## Project Structure

```
emerald-detailing/
├── app/                      # Next.js pages
│   ├── admin/                # Protected admin dashboard
│   │   ├── analytics/        # Business analytics (admin only)
│   │   ├── bookings/         # Booking management
│   │   ├── clients/          # Client management
│   │   ├── employees/        # Employee management
│   │   ├── payroll/          # Payroll management (admin only)
│   │   ├── pos/              # Point of sale system
│   │   ├── sales/            # Sales CRM
│   │   │   ├── dialer/       # Power dialer with Twilio
│   │   │   ├── leads/        # Lead management
│   │   │   ├── pipeline/     # Sales pipeline view
│   │   │   └── emails/       # Email templates
│   │   ├── schedule/         # Scheduling calendar
│   │   ├── timeclock/        # Employee time tracking
│   │   └── workspace/        # Personal workspace
│   ├── book/                 # Public booking page
│   ├── contact/              # Public contact page
│   ├── gallery/              # Public gallery
│   ├── login/                # Authentication
│   ├── pricing/              # Public pricing
│   └── services/             # Public services
├── components/               # React components
│   ├── sales/                # Sales CRM components
│   ├── pos/                  # POS components
│   └── ...                   # Shared components
├── lib/                      # Utilities and contexts
│   ├── auth-context.tsx      # Authentication & role management
│   ├── firebase.ts           # Firebase initialization
│   ├── twilio-context.tsx    # Twilio calling context
│   ├── types.ts              # TypeScript types
│   └── sales-types.ts        # Sales CRM types
├── functions/                # Firebase Cloud Functions
│   └── src/
│       ├── index.ts          # Function exports
│       └── twilio.ts         # Twilio integration
├── firestore.rules           # Firestore security rules
└── firebase.json             # Firebase configuration
```

## Role-Based Access Control

| Role | Access Level |
|------|-------------|
| `admin` | Full access to all features |
| `office_desk` | POS, bookings, clients, employees (no payroll/analytics) |
| `sales_rep` | Sales CRM, bookings, clients |
| `detailing_tech` | View bookings, timeclock, personal workspace |

## Firebase Setup

### Environment Variables (.env.local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Firestore Collections
- `users` - User profiles and roles
- `clients` - Customer records
- `bookings` - Service appointments
- `employees` - Staff records
- `salesLeads` - CRM leads
- `leadActivities` - Lead interaction history
- `transactions` - POS transactions
- `callRecordings` - Twilio call recordings
- `twilioLogs` - Call status logs

## Twilio Setup (Power Dialer)

The Sales CRM includes a browser-based calling feature using Twilio Voice SDK.

### Prerequisites
1. Twilio account (trial or paid)
2. Twilio phone number
3. TwiML App configured

### Twilio Console Setup

1. **Get Account Credentials:**
   - Account SID (starts with AC)
   - Auth Token

2. **Create API Key:**
   - Go to Account > API Keys > Create API Key
   - Save the SID (starts with SK) and Secret

3. **Create TwiML App:**
   - Go to Voice > TwiML Apps > Create
   - Set Voice URL to: `https://us-central1-YOUR_PROJECT.cloudfunctions.net/twilioVoiceWebhook`
   - Save the TwiML App SID (starts with AP)

4. **Get Phone Number:**
   - Buy or use existing Twilio number (format: +1XXXXXXXXXX)

### Firebase Functions Config

Set Twilio credentials:
```bash
firebase functions:config:set \
  twilio.account_sid="ACxxxxxx" \
  twilio.auth_token="your_auth_token" \
  twilio.api_key="SKxxxxxx" \
  twilio.api_secret="your_api_secret" \
  twilio.twiml_app_sid="APxxxxxx" \
  twilio.phone_number="+1XXXXXXXXXX"
```

### Enable Public Access for Webhooks

In Google Cloud Console (https://console.cloud.google.com/functions):
1. Select each webhook function: `twilioVoiceWebhook`, `twilioCallStatus`, `twilioRecordingStatus`
2. Go to Permissions tab
3. Add principal: `allUsers`
4. Role: `Cloud Functions Invoker`

### Cloud Functions

| Function | Type | Purpose |
|----------|------|---------|
| `getTwilioToken` | Callable | Generate access token for browser calling |
| `twilioVoiceWebhook` | HTTP | TwiML instructions for outbound calls |
| `twilioCallStatus` | HTTP | Call status webhook (logs to Firestore) |
| `twilioRecordingStatus` | HTTP | Recording completion webhook |
| `getCallRecordings` | Callable | Retrieve recordings for a lead |

### Frontend Integration

The `TwilioProvider` context (`lib/twilio-context.tsx`) provides:
- `isReady` - Device registered and ready
- `isOnCall` - Currently in a call
- `makeCall(phoneNumber)` - Initiate outbound call
- `endCall()` - Hang up current call
- `toggleMute()` - Mute/unmute microphone

## Development

### Install Dependencies
```bash
npm install
cd functions && npm install
```

### Run Development Server
```bash
npm run dev
```

### Deploy

**Build and deploy everything:**
```bash
npm run build
firebase deploy
```

**Deploy only functions:**
```bash
cd functions
npm run build
npm run deploy
```

**Deploy only hosting:**
```bash
npm run build
firebase deploy --only hosting
```

**Deploy only Firestore rules:**
```bash
firebase deploy --only firestore:rules
```

## Key Features

### Sales CRM
- Lead management with status pipeline
- Power dialer with browser-based calling
- Call recording and playback
- Email templates
- Activity tracking

### POS System
- Walk-in and booking checkout
- Tip allocation
- Refund processing
- Transaction history

### Employee Management
- Role-based permissions
- Document storage
- Time clock
- Schedule management

### Booking System
- Service scheduling
- Photo documentation
- Client history

## Troubleshooting

### Twilio Calls Not Working
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify TwiML App Voice URL is correct
3. Ensure webhook functions have public access (allUsers invoker)
4. Check browser console for Twilio SDK errors

### CORS Errors on Cloud Functions
- Usually means the function is crashing before responding
- Check `firebase functions:log` for actual error
- Ensure `package-lock.json` is in sync: delete `node_modules` and `package-lock.json`, then `npm install`

### Deploy Fails Silently
- Run `firebase functions:log` to check for build errors
- Common issue: package-lock.json sync problems
- Force redeploy by making a small code change

## Project Conventions

See `PROJECT_CONVENTIONS.md` for detailed coding standards including:
- Naming conventions
- Component structure
- Tailwind patterns
- Import order
