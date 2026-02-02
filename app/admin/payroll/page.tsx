'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee, TimeEntry, Booking, TipAllocation } from '@/lib/types';
import { calculatePayroll } from '@/lib/db';

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tipAllocations, setTipAllocations] = useState<TipAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  // Calculate pay period dates
  const getPayPeriodDates = (period: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'current') {
      const dayOfWeek = today.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysSinceMonday);

      const weekNumber = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      const isOddWeek = weekNumber % 2 === 1;
      if (isOddWeek) {
        weekStart.setDate(weekStart.getDate() - 7);
      }

      const periodEnd = new Date(weekStart);
      periodEnd.setDate(weekStart.getDate() + 13);

      return { start: weekStart, end: periodEnd };
    } else if (period === 'previous') {
      const dayOfWeek = today.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysSinceMonday - 14);

      const periodEnd = new Date(weekStart);
      periodEnd.setDate(weekStart.getDate() + 13);

      return { start: weekStart, end: periodEnd };
    } else {
      const dayOfWeek = today.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysSinceMonday - 28);

      const periodEnd = new Date(weekStart);
      periodEnd.setDate(weekStart.getDate() + 13);

      return { start: weekStart, end: periodEnd };
    }
  };

  const periodDates = getPayPeriodDates(selectedPeriod);

  const formatPeriodLabel = (period: string) => {
    const dates = getPayPeriodDates(period);
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${formatDate(dates.start)} - ${formatDate(dates.end)}`;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all employees
        const employeesRef = collection(db, 'employees');
        const employeesSnap = await getDocs(query(employeesRef, orderBy('firstName')));
        const employeesData = employeesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Employee[];
        setEmployees(employeesData.filter(e => e.isActive));

        // Fetch time entries
        const timeEntriesRef = collection(db, 'timeEntries');
        const timeEntriesSnap = await getDocs(timeEntriesRef);
        const entriesData = timeEntriesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TimeEntry[];
        setTimeEntries(entriesData);

        // Fetch completed bookings for commission
        const bookingsRef = collection(db, 'bookings');
        const bookingsSnap = await getDocs(bookingsRef);
        const bookingsData = bookingsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Booking[];
        setBookings(bookingsData);

        // Fetch tip allocations
        const tipsRef = collection(db, 'tipAllocations');
        const tipsSnap = await getDocs(tipsRef);
        const tipsData = tipsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TipAllocation[];
        setTipAllocations(tipsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Calculate hours for each employee in the selected period
  const getEmployeeHours = (employeeId: string) => {
    const { start, end } = periodDates;

    const employeeEntries = timeEntries.filter(entry => {
      if (entry.employeeId !== employeeId) return false;
      const entryDate = entry.date ? new Date(entry.date) : null;
      if (!entryDate) return false;
      return entryDate >= start && entryDate <= end;
    });

    return employeeEntries.reduce((total, entry) => {
      return total + (entry.hoursWorked || 0);
    }, 0);
  };

  // Calculate commission for each employee (40% of completed jobs)
  const getEmployeeCommission = (employeeId: string, commissionRate: number) => {
    const { start, end } = periodDates;
    const rate = commissionRate || 0.40; // Default to 40%

    const employeeBookings = bookings.filter(booking => {
      if (booking.employeeId !== employeeId) return false;
      if (booking.status !== 'completed') return false;

      const bookingDate = booking.scheduledDate as any;
      const date = bookingDate?.seconds
        ? new Date(bookingDate.seconds * 1000)
        : new Date(bookingDate);

      return date >= start && date <= end;
    });

    const totalJobRevenue = employeeBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
    return {
      jobCount: employeeBookings.length,
      jobRevenue: totalJobRevenue,
      commission: Math.round(totalJobRevenue * rate * 100) / 100
    };
  };

  // Calculate tips for each employee
  const getEmployeeTips = (employeeId: string) => {
    const { start, end } = periodDates;

    const employeeTips = tipAllocations.filter(tip => {
      if (tip.employeeId !== employeeId) return false;

      const tipDate = tip.createdAt as any;
      const date = tipDate?.seconds
        ? new Date(tipDate.seconds * 1000)
        : new Date(tipDate);

      return date >= start && date <= end;
    });

    const totalTips = employeeTips.reduce((sum, tip) => sum + (tip.amount || 0), 0);
    const pendingTips = employeeTips.filter(t => t.status === 'pending').reduce((sum, tip) => sum + (tip.amount || 0), 0);

    return {
      tipCount: employeeTips.length,
      totalTips: Math.round(totalTips * 100) / 100,
      pendingTips: Math.round(pendingTips * 100) / 100
    };
  };

  const employeePayrollData = employees.map(emp => {
    const hours = getEmployeeHours(emp.id);
    const rate = emp.hourlyRate || 20;
    const commissionRate = emp.commissionRate || 0.40;
    const payroll = calculatePayroll(hours, rate);
    const commissionData = getEmployeeCommission(emp.id, commissionRate);
    const tipsData = getEmployeeTips(emp.id);

    // Total gross = hourly pay + commission (tips are separate, not taxed from payroll)
    const totalGross = payroll.grossPay + commissionData.commission;

    // Recalculate taxes on total gross (tips are typically reported separately)
    const federalTax = Math.round(totalGross * 0.12 * 100) / 100;
    const socialSecurity = Math.round(totalGross * 0.062 * 100) / 100;
    const medicare = Math.round(totalGross * 0.0145 * 100) / 100;
    const totalDeductions = federalTax + socialSecurity + medicare;
    const netPay = Math.round((totalGross - totalDeductions) * 100) / 100;

    // Total take-home includes tips
    const totalTakeHome = Math.round((netPay + tipsData.totalTips) * 100) / 100;

    return {
      employee: emp,
      hours,
      rate,
      hourlyPay: payroll.grossPay,
      ...commissionData,
      commissionRate,
      ...tipsData,
      totalGross,
      federalTax,
      socialSecurity,
      medicare,
      totalDeductions,
      netPay,
      totalTakeHome
    };
  });

  const totalHours = employeePayrollData.reduce((acc, emp) => acc + emp.hours, 0);
  const totalHourlyPay = employeePayrollData.reduce((acc, emp) => acc + emp.hourlyPay, 0);
  const totalCommission = employeePayrollData.reduce((acc, emp) => acc + emp.commission, 0);
  const totalTips = employeePayrollData.reduce((acc, emp) => acc + emp.totalTips, 0);
  const totalGross = employeePayrollData.reduce((acc, emp) => acc + emp.totalGross, 0);
  const totalNet = employeePayrollData.reduce((acc, emp) => acc + emp.netPay, 0);
  const totalTakeHome = employeePayrollData.reduce((acc, emp) => acc + emp.totalTakeHome, 0);
  const totalFederalTax = employeePayrollData.reduce((acc, emp) => acc + emp.federalTax, 0);
  const totalSocialSecurity = employeePayrollData.reduce((acc, emp) => acc + emp.socialSecurity, 0);
  const totalMedicare = employeePayrollData.reduce((acc, emp) => acc + emp.medicare, 0);
  const totalJobs = employeePayrollData.reduce((acc, emp) => acc + emp.jobCount, 0);

  // Export to CSV
  const exportPayrollCSV = () => {
    const headers = [
      'Employee',
      'Hours Worked',
      'Hourly Rate',
      'Hourly Pay',
      'Jobs Completed',
      'Job Revenue',
      'Commission Rate',
      'Commission',
      'Tips',
      'Gross Pay',
      'Federal Tax',
      'Social Security',
      'Medicare',
      'Net Pay',
      'Total Take Home'
    ];

    const rows = employeePayrollData.map(data => [
      `${data.employee.firstName} ${data.employee.lastName}`,
      data.hours.toFixed(2),
      data.rate.toFixed(2),
      data.hourlyPay.toFixed(2),
      data.jobCount,
      data.jobRevenue.toFixed(2),
      `${(data.commissionRate * 100).toFixed(0)}%`,
      data.commission.toFixed(2),
      data.totalTips.toFixed(2),
      data.totalGross.toFixed(2),
      data.federalTax.toFixed(2),
      data.socialSecurity.toFixed(2),
      data.medicare.toFixed(2),
      data.netPay.toFixed(2),
      data.totalTakeHome.toFixed(2)
    ]);

    // Add totals row
    rows.push([
      'TOTALS',
      totalHours.toFixed(2),
      '',
      totalHourlyPay.toFixed(2),
      totalJobs.toString(),
      '',
      '',
      totalCommission.toFixed(2),
      totalTips.toFixed(2),
      totalGross.toFixed(2),
      totalFederalTax.toFixed(2),
      totalSocialSecurity.toFixed(2),
      totalMedicare.toFixed(2),
      totalNet.toFixed(2),
      totalTakeHome.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${formatPeriodLabel(selectedPeriod).replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export tax report CSV
  const exportTaxReportCSV = () => {
    const headers = [
      'Employee',
      'SSN (Last 4)',
      'Gross Wages',
      'Federal Tax Withheld',
      'Social Security Withheld',
      'Medicare Withheld',
      'Total Withheld',
      'Net Pay'
    ];

    const rows = employeePayrollData.map(data => [
      `${data.employee.firstName} ${data.employee.lastName}`,
      '****', // Placeholder - would need to store this
      data.totalGross.toFixed(2),
      data.federalTax.toFixed(2),
      data.socialSecurity.toFixed(2),
      data.medicare.toFixed(2),
      data.totalDeductions.toFixed(2),
      data.netPay.toFixed(2)
    ]);

    rows.push([
      'TOTALS',
      '',
      totalGross.toFixed(2),
      totalFederalTax.toFixed(2),
      totalSocialSecurity.toFixed(2),
      totalMedicare.toFixed(2),
      (totalFederalTax + totalSocialSecurity + totalMedicare).toFixed(2),
      totalNet.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax_report_${formatPeriodLabel(selectedPeriod).replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-500 mt-1">Manage employee compensation & commissions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="current">Current ({formatPeriodLabel('current')})</option>
            <option value="previous">Previous ({formatPeriodLabel('previous')})</option>
            <option value="older">Older ({formatPeriodLabel('older')})</option>
          </select>
          <button
            onClick={exportPayrollCSV}
            className="px-4 py-2 border border-emerald-500 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium text-sm"
          >
            Export Payroll
          </button>
          <button
            onClick={exportTaxReportCSV}
            className="px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
          >
            Export Tax Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Total Hours</p>
          <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Hourly Pay</p>
          <p className="text-2xl font-bold text-gray-900">${totalHourlyPay.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Commissions ({totalJobs} jobs)</p>
          <p className="text-2xl font-bold text-purple-600">${totalCommission.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Tips</p>
          <p className="text-2xl font-bold text-blue-600">${totalTips.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Gross Pay</p>
          <p className="text-2xl font-bold text-gray-900">${totalGross.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Total Take Home</p>
          <p className="text-2xl font-bold text-emerald-600">${totalTakeHome.toFixed(2)}</p>
          <p className="text-xs text-gray-400">Net + Tips</p>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Employee Breakdown</h2>
        </div>
        {employeePayrollData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hourly Pay</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jobs</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission (40%)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tips</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Take Home</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employeePayrollData.map((data) => (
                  <tr key={data.employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: data.employee.scheduleColor || '#10b981' }}
                        />
                        <div className="font-medium text-gray-900">
                          {data.employee.firstName} {data.employee.lastName}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                      {data.hours.toFixed(1)} @ ${data.rate}/hr
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-900">
                      ${data.hourlyPay.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                      {data.jobCount} (${data.jobRevenue.toFixed(0)})
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-medium text-purple-600">
                      ${data.commission.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-medium text-blue-600">
                      ${data.totalTips.toFixed(2)}
                      {data.pendingTips > 0 && (
                        <span className="text-xs text-gray-400 ml-1">({data.tipCount})</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900">
                      ${data.totalGross.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-red-600">
                      -${data.totalDeductions.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-bold text-emerald-600">
                      ${data.totalTakeHome.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-4 font-bold text-gray-900">Totals</td>
                  <td className="px-4 py-4 font-bold text-gray-900">{totalHours.toFixed(1)} hrs</td>
                  <td className="px-4 py-4 font-bold text-gray-900">${totalHourlyPay.toFixed(2)}</td>
                  <td className="px-4 py-4 font-bold text-gray-900">{totalJobs} jobs</td>
                  <td className="px-4 py-4 font-bold text-purple-600">${totalCommission.toFixed(2)}</td>
                  <td className="px-4 py-4 font-bold text-blue-600">${totalTips.toFixed(2)}</td>
                  <td className="px-4 py-4 font-bold text-gray-900">${totalGross.toFixed(2)}</td>
                  <td className="px-4 py-4 font-bold text-red-600">-${(totalFederalTax + totalSocialSecurity + totalMedicare).toFixed(2)}</td>
                  <td className="px-4 py-4 font-bold text-emerald-600">${totalTakeHome.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500">No employees found. Add employees to see payroll data.</p>
          </div>
        )}
      </div>

      {/* Tax Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Federal Income Tax (12%)</p>
            <p className="text-xl font-bold text-gray-900">${totalFederalTax.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Social Security (6.2%)</p>
            <p className="text-xl font-bold text-gray-900">${totalSocialSecurity.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Medicare (1.45%)</p>
            <p className="text-xl font-bold text-gray-900">${totalMedicare.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">WA State Tax</p>
            <p className="text-xl font-bold text-gray-900">$0.00</p>
            <p className="text-xs text-gray-400">No state income tax</p>
          </div>
        </div>
      </div>
    </div>
  );
}
