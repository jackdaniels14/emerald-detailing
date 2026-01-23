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
  id: string;
  year: number;
  make: string;
  model: string;
  type: 'sedan' | 'suv' | 'truck';
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
  role: 'admin' | 'employee';
  hourlyRate: number;
  isActive: boolean;
  hireDate: Date;
  createdAt: Date;
  updatedAt: Date;
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

  // Payment
  paymentStatus: 'pending' | 'paid' | 'refunded';
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
