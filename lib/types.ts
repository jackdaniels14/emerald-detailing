// Database types for Emerald Detailing

// ============ CLIENTS ============
export interface Client {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address: string;
  vehicles: Vehicle[];
  notes: string;
  creditCardLast4?: string;
  subscriptionStatus?: 'none' | 'monthly' | 'biweekly' | 'weekly';
  subscriptionStartDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id?: string;
  year: string;
  make: string;
  model: string;
  type: 'sedan' | 'suv' | 'truck' | 'coupe' | 'van' | 'other';
  color?: string;
  licensePlate?: string;
  notes?: string;
}

// ============ EMPLOYEES ============
export interface Employee {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'office_desk' | 'sales_rep' | 'detailing_tech';
  hourlyRate: number;
  commissionRate: number; // e.g., 0.40 for 40%
  isActive: boolean;
  hireDate: Date;
  scheduleColor: string; // Hex color for calendar display
  documents?: EmployeeDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  type: 'id' | 'w4' | 'w2' | 'i9' | 'direct_deposit' | 'other';
  url: string;
  uploadedAt: Date;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: Date;
  clockOut?: Date;
  hoursWorked?: number;
  date: string; // YYYY-MM-DD format
  notes?: string;
}

export interface EmployeeSchedule {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isOff: boolean;
  notes?: string;
}

// ============ BOOKINGS/JOBS ============
export interface Booking {
  id: string;
  clientId: string;
  vehicleId: string;
  employeeId?: string;

  // Service details
  serviceType: 'interior' | 'exterior' | 'full';
  serviceTier: 'express' | 'premium';
  addOns: string[];

  // Scheduling
  scheduledDate: Date;
  scheduledTime: string;
  estimatedDuration: number; // in minutes

  // Location
  serviceAddress: string;

  // Status
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

  // Pricing
  basePrice: number;
  addOnsPrice: number;
  discount: number;
  totalPrice: number;
  customPriceApplied?: boolean;

  // Booking type & recurring
  bookingType?: 'standard' | 'membership';
  recurringSchedule?: 'none' | 'weekly' | 'biweekly' | 'monthly';
  isRecurring?: boolean;

  // Multi-vehicle support
  vehicleInfo?: string;
  multiVehicleBooking?: boolean;

  // Payment
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  paymentMethod?: 'card' | 'cash' | 'venmo' | 'zelle';
  paymentDate?: Date;

  // Notes
  clientNotes?: string;
  employeeNotes?: string;

  // Photos
  beforePhotos?: string[];
  afterPhotos?: string[];

  createdAt: Date;
  updatedAt: Date;
}

// ============ PAYMENTS ============
export interface Payment {
  id: string;
  bookingId: string;
  clientId: string;
  amount: number;
  method: 'card' | 'cash' | 'venmo' | 'zelle';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripePaymentId?: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  bookingId: string;
  clientId: string;
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: Date;
  paidDate?: Date;
  createdAt: Date;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ============ PAYROLL ============
export interface PayPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'paid';
}

export interface Payroll {
  id: string;
  employeeId: string;
  payPeriodId: string;
  hoursWorked: number;
  hourlyRate: number;
  grossPay: number;
  // Tax withholdings
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  totalDeductions: number;
  netPay: number;
  status: 'pending' | 'approved' | 'paid';
  paidDate?: Date;
  createdAt: Date;
}

// ============ ANALYTICS ============
export interface DailyMetrics {
  date: string;
  totalBookings: number;
  completedJobs: number;
  cancelledJobs: number;
  revenue: number;
  newClients: number;
  pageViews?: number;
}

export interface ServiceMetrics {
  serviceType: string;
  count: number;
  revenue: number;
  averageRating?: number;
}

// ============ NOTIFICATIONS ============
export interface Notification {
  id: string;
  recipientId: string; // Employee ID who should see this
  type: 'booking_assigned' | 'booking_updated' | 'booking_cancelled' | 'schedule_change' | 'general';
  title: string;
  message: string;
  bookingId?: string;
  read: boolean;
  createdAt: Date;
}

// ============ POS SYSTEM ============
export interface TransactionItem {
  id: string;
  description: string;
  type: 'service' | 'addon' | 'product' | 'discount';
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface TransactionPayment {
  id: string;
  method: 'card' | 'cash' | 'venmo' | 'zelle';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  cardLast4?: string;
  cardBrand?: string;
  refundedAmount?: number;
  processedAt?: Date;
}

export interface POSTransaction {
  id: string;
  type: 'booking_checkout' | 'walk_in_sale';
  bookingId?: string;
  clientId?: string;
  employeeId: string;           // Who processed the transaction
  assignedEmployeeId?: string;  // Who did the work (for tips)

  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;

  payments: TransactionPayment[];  // Split payment support
  status: 'pending' | 'completed' | 'partially_refunded' | 'fully_refunded';

  receiptNumber: string;
  receiptSentTo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TipAllocation {
  id: string;
  transactionId: string;
  employeeId: string;
  amount: number;
  status: 'pending' | 'paid';
  payPeriodId?: string;
  createdAt: Date;
}

export interface Refund {
  id: string;
  transactionId: string;
  paymentId: string;
  amount: number;
  reason: string;
  type: 'full' | 'partial';
  stripeRefundId?: string;
  processedBy: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

// ============ PERSONAL TASK TRACKER ============
export interface PersonalTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  dueTime?: string;
  category?: string;
  reminder?: Date;
  reminderSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  color?: string;
  isPinned?: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalReminder {
  id: string;
  userId: string;
  title: string;
  message?: string;
  reminderTime: Date;
  isRecurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  isCompleted: boolean;
  createdAt: Date;
}

// Team Notes - visible to all staff
export interface TeamNote {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  isPinned?: boolean;
  priority?: 'normal' | 'important' | 'urgent';
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Direct Messages between users
export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}
