'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { CallLog, LEAD_TYPE_CONFIG } from '@/lib/sales-types';

export default function CallLogsPage() {
  const { userProfile } = useAuth();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCaller, setFilterCaller] = useState<string>('all');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [callers, setCallers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchLogs();
  }, [filterCaller, filterOutcome, filterDate]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const logsRef = collection(db, 'callLogs');
      const q = query(logsRef, orderBy('createdAt', 'desc'), limit(500));
      const snapshot = await getDocs(q);

      let logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startedAt: doc.data().startedAt?.toDate() || new Date(),
        endedAt: doc.data().endedAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as CallLog[];

      // Extract unique callers for filter
      const uniqueCallers = new Map<string, string>();
      logsData.forEach(log => {
        if (!uniqueCallers.has(log.callerId)) {
          uniqueCallers.set(log.callerId, log.callerName);
        }
      });
      setCallers(Array.from(uniqueCallers, ([id, name]) => ({ id, name })));

      // Apply filters
      if (filterCaller !== 'all') {
        logsData = logsData.filter(log => log.callerId === filterCaller);
      }

      if (filterOutcome !== 'all') {
        logsData = logsData.filter(log => log.outcome === filterOutcome);
      }

      if (filterDate !== 'all') {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        logsData = logsData.filter(log => {
          const logDate = log.createdAt;
          if (filterDate === 'today') {
            return logDate >= startOfToday;
          } else if (filterDate === 'week') {
            return logDate >= startOfWeek;
          } else if (filterDate === 'month') {
            return logDate >= startOfMonth;
          }
          return true;
        });
      }

      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching call logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'Manual';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getOutcomeColor = (outcome: string) => {
    const colors: Record<string, string> = {
      'no_answer': 'bg-gray-100 text-gray-700',
      'voicemail': 'bg-yellow-100 text-yellow-700',
      'busy': 'bg-orange-100 text-orange-700',
      'wrong_number': 'bg-red-100 text-red-700',
      'not_interested': 'bg-red-100 text-red-700',
      'callback_requested': 'bg-blue-100 text-blue-700',
      'interested': 'bg-green-100 text-green-700',
      'meeting_booked': 'bg-emerald-100 text-emerald-700',
      'proposal_sent': 'bg-purple-100 text-purple-700',
      'sale_made': 'bg-emerald-200 text-emerald-800',
      'gatekeeper': 'bg-slate-100 text-slate-700'
    };
    return colors[outcome] || 'bg-gray-100 text-gray-700';
  };

  const formatOutcome = (outcome: string) => {
    return outcome
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Calculate stats
  const totalCalls = logs.length;
  const totalDuration = logs.reduce((sum, log) => sum + log.duration, 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
  const positiveOutcomes = logs.filter(log =>
    ['interested', 'meeting_booked', 'proposal_sent', 'sale_made'].includes(log.outcome)
  ).length;
  const contactRate = totalCalls > 0 ? Math.round((positiveOutcomes / totalCalls) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/sales" className="text-gray-500 hover:text-gray-700 text-sm flex items-center mb-2">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Sales
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
          <p className="text-gray-500 mt-1">View all calls made through the power dialer</p>
        </div>
        <Link
          href="/admin/sales/dialer"
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Open Dialer
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Total Calls</p>
          <p className="text-3xl font-bold text-gray-900">{totalCalls}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Total Talk Time</p>
          <p className="text-3xl font-bold text-gray-900">{formatDuration(totalDuration)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Avg Duration</p>
          <p className="text-3xl font-bold text-gray-900">{formatDuration(avgDuration)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">Contact Rate</p>
          <p className="text-3xl font-bold text-emerald-600">{contactRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date Range</label>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Caller</label>
            <select
              value={filterCaller}
              onChange={(e) => setFilterCaller(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Callers</option>
              {callers.map(caller => (
                <option key={caller.id} value={caller.id}>{caller.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Outcome</label>
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Outcomes</option>
              <option value="no_answer">No Answer</option>
              <option value="voicemail">Voicemail</option>
              <option value="busy">Busy</option>
              <option value="callback_requested">Callback Requested</option>
              <option value="interested">Interested</option>
              <option value="meeting_booked">Meeting Booked</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="sale_made">Sale Made</option>
              <option value="not_interested">Not Interested</option>
              <option value="wrong_number">Wrong Number</option>
              <option value="gatekeeper">Gatekeeper</option>
            </select>
          </div>
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p className="text-gray-500">No call logs yet</p>
            <p className="text-sm text-gray-400 mt-1">Start making calls in the power dialer</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caller</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(log.createdAt)}</div>
                      <div className="text-xs text-gray-500">{formatTime(log.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/sales/leads/view?id=${log.leadId}`}
                        className="text-sm font-medium text-gray-900 hover:text-emerald-600"
                      >
                        {log.leadName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 font-mono">{log.phoneNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{log.callerName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-600">{formatDuration(log.duration)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOutcomeColor(log.outcome)}`}>
                        {formatOutcome(log.outcome)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${LEAD_TYPE_CONFIG[log.leadType]?.bgColor || 'bg-gray-100'} ${LEAD_TYPE_CONFIG[log.leadType]?.color || 'text-gray-700'}`}>
                        {LEAD_TYPE_CONFIG[log.leadType]?.label || log.leadType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
