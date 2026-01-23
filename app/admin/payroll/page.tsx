'use client';

import { useState } from 'react';
import { calculatePayroll } from '@/lib/db';

export default function PayrollPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  // Demo payroll data
  const employees = [
    { id: '1', name: 'Alex Martinez', hours: 80, rate: 25 },
    { id: '2', name: 'Jordan Taylor', hours: 72, rate: 20 },
    { id: '3', name: 'Casey Wilson', hours: 65, rate: 18 },
  ];

  const calculateEmployeePayroll = (hours: number, rate: number) => {
    return calculatePayroll(hours, rate);
  };

  const totalGross = employees.reduce((acc, emp) => {
    const payroll = calculateEmployeePayroll(emp.hours, emp.rate);
    return acc + payroll.grossPay;
  }, 0);

  const totalNet = employees.reduce((acc, emp) => {
    const payroll = calculateEmployeePayroll(emp.hours, emp.rate);
    return acc + payroll.netPay;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-500 mt-1">Manage employee compensation</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="current">Current Period (Jan 13-26)</option>
            <option value="previous">Previous Period (Dec 30 - Jan 12)</option>
            <option value="older">Dec 16-29</option>
          </select>
          <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium">
            Run Payroll
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {employees.reduce((acc, emp) => acc + emp.hours, 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Gross Pay</p>
              <p className="text-2xl font-bold text-gray-900">${totalGross.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Net Pay</p>
              <p className="text-2xl font-bold text-gray-900">${totalNet.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Employee Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Federal Tax</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SS + Medicare</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((emp) => {
                const payroll = calculateEmployeePayroll(emp.hours, emp.rate);
                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{emp.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {emp.hours}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      ${emp.rate}/hr
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      ${payroll.grossPay.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-red-600">
                      -${payroll.federalTax.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-red-600">
                      -${(payroll.socialSecurity + payroll.medicare).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-emerald-600">
                      ${payroll.netPay.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-emerald-600 hover:text-emerald-900 font-medium text-sm">
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-4 font-bold text-gray-900">Totals</td>
                <td className="px-6 py-4 font-bold text-gray-900">
                  {employees.reduce((acc, emp) => acc + emp.hours, 0)}
                </td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 font-bold text-gray-900">${totalGross.toFixed(2)}</td>
                <td className="px-6 py-4 font-bold text-red-600">
                  -${employees.reduce((acc, emp) => acc + calculateEmployeePayroll(emp.hours, emp.rate).federalTax, 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 font-bold text-red-600">
                  -${employees.reduce((acc, emp) => {
                    const p = calculateEmployeePayroll(emp.hours, emp.rate);
                    return acc + p.socialSecurity + p.medicare;
                  }, 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 font-bold text-emerald-600">${totalNet.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tax Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Federal Income Tax</p>
            <p className="text-xl font-bold text-gray-900">
              ${employees.reduce((acc, emp) => acc + calculateEmployeePayroll(emp.hours, emp.rate).federalTax, 0).toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Social Security (6.2%)</p>
            <p className="text-xl font-bold text-gray-900">
              ${employees.reduce((acc, emp) => acc + calculateEmployeePayroll(emp.hours, emp.rate).socialSecurity, 0).toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Medicare (1.45%)</p>
            <p className="text-xl font-bold text-gray-900">
              ${employees.reduce((acc, emp) => acc + calculateEmployeePayroll(emp.hours, emp.rate).medicare, 0).toFixed(2)}
            </p>
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
