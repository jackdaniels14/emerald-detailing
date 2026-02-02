import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Client,
  Employee,
  Booking,
  TimeEntry,
  EmployeeSchedule,
  Payment,
  Invoice,
  Payroll,
  DailyMetrics,
  POSTransaction,
  TipAllocation,
  Refund
} from './types';
import { LeadOrganization } from './sales-types';

// Collection references
const COLLECTIONS = {
  CLIENTS: 'clients',
  EMPLOYEES: 'employees',
  BOOKINGS: 'bookings',
  TIME_ENTRIES: 'timeEntries',
  SCHEDULES: 'schedules',
  PAYMENTS: 'payments',
  INVOICES: 'invoices',
  PAYROLL: 'payroll',
  METRICS: 'metrics',
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  TIP_ALLOCATIONS: 'tipAllocations',
  REFUNDS: 'refunds',
  LEAD_ORGANIZATIONS: 'leadOrganizations'
};

// ============ CLIENTS ============
export async function getClients(): Promise<Client[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.CLIENTS));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
}

export async function getClient(id: string): Promise<Client | null> {
  const docRef = await getDoc(doc(db, COLLECTIONS.CLIENTS, id));
  if (!docRef.exists()) return null;
  return { id: docRef.id, ...docRef.data() } as Client;
}

export async function createClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.CLIENTS), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.CLIENTS, id), {
    ...data,
    updatedAt: Timestamp.now()
  });
}

export async function deleteClient(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.CLIENTS, id));
}

// ============ EMPLOYEES ============
export async function getEmployees(): Promise<Employee[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.EMPLOYEES));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const docRef = await getDoc(doc(db, COLLECTIONS.EMPLOYEES, id));
  if (!docRef.exists()) return null;
  return { id: docRef.id, ...docRef.data() } as Employee;
}

export async function createEmployee(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.EMPLOYEES), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.EMPLOYEES, id), {
    ...data,
    updatedAt: Timestamp.now()
  });
}

// ============ BOOKINGS ============
export async function getBookings(): Promise<Booking[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.BOOKINGS), orderBy('scheduledDate', 'desc'))
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
}

export async function getBookingsByClient(clientId: string): Promise<Booking[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('clientId', '==', clientId),
      orderBy('scheduledDate', 'desc')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
}

export async function getBookingsByDate(date: string): Promise<Booking[]> {
  const startOfDay = new Date(date);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('scheduledDate', '>=', Timestamp.fromDate(startOfDay)),
      where('scheduledDate', '<=', Timestamp.fromDate(endOfDay))
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
}

export async function createBooking(data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.BOOKINGS, id), {
    ...data,
    updatedAt: Timestamp.now()
  });
}

// ============ TIME ENTRIES ============
export async function clockIn(employeeId: string): Promise<string> {
  const now = new Date();
  const docRef = await addDoc(collection(db, COLLECTIONS.TIME_ENTRIES), {
    employeeId,
    clockIn: Timestamp.now(),
    clockOut: null,
    hoursWorked: 0,
    date: now.toISOString().split('T')[0]
  });
  return docRef.id;
}

export async function clockOut(timeEntryId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.TIME_ENTRIES, timeEntryId);
  const entry = await getDoc(docRef);

  if (entry.exists()) {
    const clockInTime = entry.data().clockIn.toDate();
    const clockOutTime = new Date();
    const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

    await updateDoc(docRef, {
      clockOut: Timestamp.now(),
      hoursWorked: Math.round(hoursWorked * 100) / 100
    });
  }
}

export async function getTimeEntriesByEmployee(employeeId: string, startDate: string, endDate: string): Promise<TimeEntry[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.TIME_ENTRIES),
      where('employeeId', '==', employeeId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));
}

export async function getActiveTimeEntry(employeeId: string): Promise<TimeEntry | null> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.TIME_ENTRIES),
      where('employeeId', '==', employeeId),
      where('clockOut', '==', null)
    )
  );

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as TimeEntry;
}

// ============ SCHEDULES ============
export async function getSchedulesByEmployee(employeeId: string, startDate: string, endDate: string): Promise<EmployeeSchedule[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.SCHEDULES),
      where('employeeId', '==', employeeId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeSchedule));
}

export async function createSchedule(data: Omit<EmployeeSchedule, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.SCHEDULES), data);
  return docRef.id;
}

export async function updateSchedule(id: string, data: Partial<EmployeeSchedule>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SCHEDULES, id), data);
}

// ============ PAYMENTS ============
export async function createPayment(data: Omit<Payment, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.PAYMENTS), {
    ...data,
    createdAt: Timestamp.now()
  });
  return docRef.id;
}

export async function getPaymentsByClient(clientId: string): Promise<Payment[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.PAYMENTS),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
}

// ============ PAYROLL ============
export function calculatePayroll(hoursWorked: number, hourlyRate: number) {
  const grossPay = hoursWorked * hourlyRate;

  // Tax calculations (simplified - these are approximate rates)
  const federalTax = grossPay * 0.12; // 12% federal tax bracket
  const stateTax = 0; // Washington state has no income tax
  const socialSecurity = grossPay * 0.062; // 6.2%
  const medicare = grossPay * 0.0145; // 1.45%

  const totalDeductions = federalTax + stateTax + socialSecurity + medicare;
  const netPay = grossPay - totalDeductions;

  return {
    hoursWorked,
    hourlyRate,
    grossPay: Math.round(grossPay * 100) / 100,
    federalTax: Math.round(federalTax * 100) / 100,
    stateTax: Math.round(stateTax * 100) / 100,
    socialSecurity: Math.round(socialSecurity * 100) / 100,
    medicare: Math.round(medicare * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100
  };
}

// ============ METRICS ============
export async function getDailyMetrics(date: string): Promise<DailyMetrics | null> {
  const docRef = await getDoc(doc(db, COLLECTIONS.METRICS, date));
  if (!docRef.exists()) return null;
  return { date, ...docRef.data() } as DailyMetrics;
}

export async function updateDailyMetrics(date: string, data: Partial<DailyMetrics>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.METRICS, date), data);
}

// ============ POS TRANSACTIONS ============
export function generateReceiptNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${dateStr}-${randomPart}`;
}

export async function getTransactions(): Promise<POSTransaction[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.TRANSACTIONS), orderBy('createdAt', 'desc'))
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as POSTransaction));
}

export async function getTransaction(id: string): Promise<POSTransaction | null> {
  const docRef = await getDoc(doc(db, COLLECTIONS.TRANSACTIONS, id));
  if (!docRef.exists()) return null;
  return { id: docRef.id, ...docRef.data() } as POSTransaction;
}

export async function getTransactionByReceiptNumber(receiptNumber: string): Promise<POSTransaction | null> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('receiptNumber', '==', receiptNumber)
    )
  );
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as POSTransaction;
}

export async function getTransactionsByDate(date: string): Promise<POSTransaction[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
      where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('createdAt', 'desc')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as POSTransaction));
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<POSTransaction[]> {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end)),
      orderBy('createdAt', 'desc')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as POSTransaction));
}

export async function getPendingCheckouts(): Promise<Booking[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('status', '==', 'completed'),
      where('paymentStatus', '==', 'pending')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
}

export async function createTransaction(data: Omit<POSTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updateTransaction(id: string, data: Partial<POSTransaction>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.TRANSACTIONS, id), {
    ...data,
    updatedAt: Timestamp.now()
  });
}

// ============ TIP ALLOCATIONS ============
export async function getTipAllocations(): Promise<TipAllocation[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.TIP_ALLOCATIONS), orderBy('createdAt', 'desc'))
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TipAllocation));
}

export async function getTipAllocationsByEmployee(employeeId: string, startDate?: string, endDate?: string): Promise<TipAllocation[]> {
  let q = query(
    collection(db, COLLECTIONS.TIP_ALLOCATIONS),
    where('employeeId', '==', employeeId)
  );

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    q = query(
      collection(db, COLLECTIONS.TIP_ALLOCATIONS),
      where('employeeId', '==', employeeId),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TipAllocation));
}

export async function getPendingTipsByEmployee(employeeId: string): Promise<TipAllocation[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.TIP_ALLOCATIONS),
      where('employeeId', '==', employeeId),
      where('status', '==', 'pending')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TipAllocation));
}

export async function createTipAllocation(data: Omit<TipAllocation, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.TIP_ALLOCATIONS), {
    ...data,
    createdAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updateTipAllocation(id: string, data: Partial<TipAllocation>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.TIP_ALLOCATIONS, id), data);
}

export async function markTipsAsPaid(tipIds: string[], payPeriodId: string): Promise<void> {
  const updates = tipIds.map(id =>
    updateDoc(doc(db, COLLECTIONS.TIP_ALLOCATIONS, id), {
      status: 'paid',
      payPeriodId
    })
  );
  await Promise.all(updates);
}

// ============ REFUNDS ============
export async function getRefunds(): Promise<Refund[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.REFUNDS), orderBy('createdAt', 'desc'))
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Refund));
}

export async function getRefundsByTransaction(transactionId: string): Promise<Refund[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.REFUNDS),
      where('transactionId', '==', transactionId)
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Refund));
}

export async function createRefund(data: Omit<Refund, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.REFUNDS), {
    ...data,
    createdAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updateRefund(id: string, data: Partial<Refund>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.REFUNDS, id), data);
}

// ============ LEAD ORGANIZATIONS ============
export async function getLeadOrganizations(): Promise<LeadOrganization[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.LEAD_ORGANIZATIONS), orderBy('createdAt', 'desc'))
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadOrganization));
}

export async function getLeadOrganization(id: string): Promise<LeadOrganization | null> {
  const docRef = await getDoc(doc(db, COLLECTIONS.LEAD_ORGANIZATIONS, id));
  if (!docRef.exists()) return null;
  return { id: docRef.id, ...docRef.data() } as LeadOrganization;
}

export async function getActiveLeadOrganizations(): Promise<LeadOrganization[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.LEAD_ORGANIZATIONS),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadOrganization));
}

export async function createLeadOrganization(data: Omit<LeadOrganization, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.LEAD_ORGANIZATIONS), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updateLeadOrganization(id: string, data: Partial<LeadOrganization>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.LEAD_ORGANIZATIONS, id), {
    ...data,
    updatedAt: Timestamp.now()
  });
}

export async function deleteLeadOrganization(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.LEAD_ORGANIZATIONS, id));
}
