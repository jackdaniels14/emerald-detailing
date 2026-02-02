'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { clockIn, clockOut, getActiveTimeEntry } from '@/lib/db';
import { TimeEntry, Employee } from '@/lib/types';

export default function TimeClockPage() {
  const { userProfile } = useAuth();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [loading, setLoading] = useState(false);
  const [weeklyEntries, setWeeklyEntries] = useState<TimeEntry[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current week's date range (Monday to Sunday)
  const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const monday = new Date(now);
    monday.setDate(now.getDate() - daysSinceMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  };

  useEffect(() => {
    async function fetchData() {
      if (userProfile?.uid) {
        try {
          // Check if user is currently clocked in
          const activeEntry = await getActiveTimeEntry(userProfile.uid);
          if (activeEntry) {
            setIsClockedIn(true);
            setCurrentEntryId(activeEntry.id);
            const clockInDate = activeEntry.clockIn as any;
            setClockInTime(clockInDate.seconds ? new Date(clockInDate.seconds * 1000) : new Date(clockInDate));
          }

          // Fetch employee info
          const employeesRef = collection(db, 'employees');
          const employeesSnap = await getDocs(employeesRef);
          const emp = employeesSnap.docs.find(doc => {
            const data = doc.data();
            return data.email === userProfile.email;
          });
          if (emp) {
            setEmployee({ id: emp.id, ...emp.data() } as Employee);
          }

          // Fetch time entries for this week
          const { monday, sunday } = getWeekRange();
          const timeEntriesRef = collection(db, 'timeEntries');
          const timeEntriesSnap = await getDocs(timeEntriesRef);
          const entries = timeEntriesSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() })) as TimeEntry[];

          // Filter for this user and this week
          const userEntries = entries.filter(entry => {
            if (entry.employeeId !== userProfile.uid) return false;
            const entryDate = entry.date ? new Date(entry.date) : null;
            if (!entryDate) return false;
            return entryDate >= monday && entryDate <= sunday;
          });

          // Sort by date descending (most recent first)
          userEntries.sort((a, b) => {
            const dateA = a.clockIn as any;
            const dateB = b.clockIn as any;
            const timeA = dateA?.seconds ? dateA.seconds : new Date(dateA).getTime() / 1000;
            const timeB = dateB?.seconds ? dateB.seconds : new Date(dateB).getTime() / 1000;
            return timeB - timeA;
          });

          setWeeklyEntries(userEntries);
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setEntriesLoading(false);
        }
      } else {
        setEntriesLoading(false);
      }
    }
    fetchData();
  }, [userProfile]);

  useEffect(() => {
    // Update elapsed time every second when clocked in
    if (isClockedIn && clockInTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - clockInTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isClockedIn, clockInTime]);

  const handleClockIn = async () => {
    if (!userProfile?.uid) return;
    setLoading(true);
    try {
      const entryId = await clockIn(userProfile.uid);
      setCurrentEntryId(entryId);
      setClockInTime(new Date());
      setIsClockedIn(true);
    } catch (error) {
      console.error('Error clocking in:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntryId) return;
    setLoading(true);
    try {
      await clockOut(currentEntryId);
      setIsClockedIn(false);
      setCurrentEntryId(null);
      setClockInTime(null);
      setElapsedTime('00:00:00');
      // Refresh entries
      window.location.reload();
    } catch (error) {
      console.error('Error clocking out:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format helpers
  const formatTime = (date: any) => {
    if (!date) return '-';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // Calculate totals
  const totalHoursThisWeek = weeklyEntries.reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0);
  const hourlyRate = employee?.hourlyRate || 0;
  const estimatedPay = totalHoursThisWeek * hourlyRate;

  // Get today's entries
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = weeklyEntries.filter(e => e.date === today);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Time Clock</h1>
        <p className="text-gray-500 mt-1">Track your work hours</p>
      </div>

      {/* Main Clock Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
        <div className="text-center">
          {/* Current Time Display */}
          <p className="text-gray-500 mb-1">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-5xl font-mono font-bold text-gray-900 mb-6">
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>

          {isClockedIn ? (
            <div className="space-y-4">
              {/* Clocked In Status */}
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-6 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-emerald-700 font-semibold">Currently Clocked In</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase">Start Time</p>
                    <p className="text-xl font-bold text-gray-900">
                      {clockInTime?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase">Time Worked</p>
                    <p className="text-xl font-bold text-emerald-600 font-mono">{elapsedTime}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClockOut}
                disabled={loading}
                className="px-12 py-4 bg-red-500 text-white text-xl font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 shadow-lg"
              >
                {loading ? 'Processing...' : 'Clock Out'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 max-w-md mx-auto">
                <p className="text-gray-500 font-medium mb-2">Not Clocked In</p>
                <p className="text-gray-400 text-sm">Ready to start your shift?</p>
              </div>

              <button
                onClick={handleClockIn}
                disabled={loading}
                className="px-12 py-4 bg-emerald-500 text-white text-xl font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-lg"
              >
                {loading ? 'Processing...' : 'Clock In'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase">Today</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatHours(todayEntries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase">This Week</p>
          <p className="text-2xl font-bold text-gray-900">{formatHours(totalHoursThisWeek)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase">Hourly Rate</p>
          <p className="text-2xl font-bold text-gray-900">${hourlyRate.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase">Est. Pay</p>
          <p className="text-2xl font-bold text-emerald-600">${estimatedPay.toFixed(2)}</p>
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">This Week's Time Entries</h2>
        </div>

        {entriesLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : weeklyEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {weeklyEntries.map((entry) => {
                  const isInProgress = !entry.clockOut;
                  const hours = entry.hoursWorked || 0;
                  const earnings = hours * hourlyRate;

                  return (
                    <tr key={entry.id} className={isInProgress ? 'bg-emerald-50' : ''}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{formatDate(entry.date)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 font-mono">{formatTime(entry.clockIn)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {isInProgress ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            In Progress
                          </span>
                        ) : (
                          <p className="text-gray-900 font-mono">{formatTime(entry.clockOut)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className={`font-semibold ${isInProgress ? 'text-emerald-600' : 'text-gray-900'}`}>
                          {isInProgress ? elapsedTime : formatHours(hours)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-gray-600">
                          {isInProgress ? '-' : `$${earnings.toFixed(2)}`}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-700">
                    Week Total:
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {formatHours(totalHoursThisWeek)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    ${estimatedPay.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">No time entries this week</p>
            <p className="text-sm mt-1">Clock in to start tracking your hours</p>
          </div>
        )}
      </div>
    </div>
  );
}
