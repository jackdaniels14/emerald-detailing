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
  DailyMetrics
} from './types';

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
  USERS: 'users'
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
