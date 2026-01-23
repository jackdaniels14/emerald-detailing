'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { clockIn, clockOut, getActiveTimeEntry } from '@/lib/db';

export default function TimeClockPage() {
  const { userProfile } = useAuth();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [loading, setLoading] = useState(false);

  // Demo time entries for the week
  const weeklyEntries = [
    { day: 'Monday', date: 'Jan 20', clockIn: '8:00 AM', clockOut: '4:30 PM', hours: 8.5 },
    { day: 'Tuesday', date: 'Jan 21', clockIn: '8:15 AM', clockOut: '5:00 PM', hours: 8.75 },
    { day: 'Wednesday', date: 'Jan 22', clockIn: '9:00 AM', clockOut: '-', hours: 0 },
  ];

  useEffect(() => {
    // Check if user is currently clocked in
    async function checkClockStatus() {
      if (userProfile?.uid) {
        try {
          const activeEntry = await getActiveTimeEntry(userProfile.uid);
          if (activeEntry) {
            setIsClockedIn(true);
            setCurrentEntryId(activeEntry.id);
            setClockInTime(new Date(activeEntry.clockIn));
          }
        } catch (error) {
          console.error('Error checking clock status:', error);
        }
      }
    }
    checkClockStatus();
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
    } catch (error) {
      console.error('Error clocking out:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Time Clock</h1>
        <p className="text-gray-500 mt-1">Track your work hours</p>
      </div>

      {/* Main Clock Card */}
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="text-center">
          <p className="text-gray-500 mb-2">{currentDate}</p>
          <p className="text-5xl font-mono font-bold text-gray-900 mb-8">{currentTime}</p>

          {isClockedIn ? (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                <p className="text-emerald-600 font-medium mb-2">Currently Working</p>
                <p className="text-4xl font-mono font-bold text-emerald-700">{elapsedTime}</p>
                <p className="text-sm text-emerald-600 mt-2">
                  Clocked in at {clockInTime?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <button
                onClick={handleClockOut}
                disabled={loading}
                className="w-full sm:w-auto px-12 py-4 bg-red-500 text-white text-xl font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Clock Out'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <p className="text-gray-500 font-medium mb-2">Not Clocked In</p>
                <p className="text-4xl font-mono font-bold text-gray-400">--:--:--</p>
                <p className="text-sm text-gray-500 mt-2">Ready to start your shift?</p>
              </div>

              <button
                onClick={handleClockIn}
                disabled={loading}
                className="w-full sm:w-auto px-12 py-4 bg-emerald-500 text-white text-xl font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Clock In'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* This Week */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">This Week</h2>
          <div className="space-y-3">
            {weeklyEntries.map((entry, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{entry.day}</p>
                  <p className="text-sm text-gray-500">{entry.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {entry.clockIn} - {entry.clockOut}
                  </p>
                  <p className="font-medium text-gray-900">
                    {entry.hours > 0 ? `${entry.hours} hrs` : 'In Progress'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
            <span className="font-medium text-gray-700">Total Hours</span>
            <span className="font-bold text-emerald-600">17.25 hrs</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Hours This Week</p>
                <p className="text-2xl font-bold text-gray-900">17.25</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Hours This Pay Period</p>
                <p className="text-2xl font-bold text-gray-900">72.5</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Estimated Pay (This Period)</p>
                <p className="text-2xl font-bold text-gray-900">$1,450.00</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
