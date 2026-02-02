'use client';

/**
 * My Schedule Page
 *
 * Unified view of all time-based items for the current user:
 * - Jobs: Detailing bookings assigned to the user
 * - Tasks: Personal to-do items with due dates
 * - Reminders: Time-based reminders
 * - Team Board: Team-wide notes and announcements
 *
 * Features:
 * - Tab-based navigation between item types
 * - Time filter (Today / Upcoming / All)
 * - Quick stats cards that also act as tab switchers
 * - Direct links to Workspace for creating new items
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Booking, Client, Employee, PersonalTask, PersonalReminder, TeamNote } from '@/lib/types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Styling for booking status badges */
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
};

/** Display labels for booking statuses */
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
};

/** Styling for task priority badges */
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

/** Styling for team note priority badges */
const TEAM_PRIORITY_COLORS: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-700',
  important: 'bg-yellow-100 text-yellow-700',
  urgent: 'bg-red-100 text-red-700',
};

/** Helper to lighten a color for background */
const lightenColor = (hex: string, percent: number = 85): string => {
  if (!hex || !hex.startsWith('#')) return '#f3f4f6';
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * (percent / 100)));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * (percent / 100)));
  const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * (percent / 100)));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
};

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'jobs' | 'tasks' | 'reminders' | 'team';
type TimeFilter = 'today' | 'upcoming' | 'all';

// ============================================================================
// COMPONENT
// ============================================================================

export default function MySchedulePage() {
  const { user, userProfile } = useAuth();

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('jobs');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [loading, setLoading] = useState(true);

  // Data State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [reminders, setReminders] = useState<PersonalReminder[]>([]);
  const [teamNotes, setTeamNotes] = useState<TeamNote[]>([]);

  // --------------------------------------------------------------------------
  // DATA FETCHING
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, userProfile?.uid]);

  /**
   * Fetch all data from Firestore:
   * - Bookings assigned to user
   * - Personal tasks
   * - Personal reminders
   * - Team notes
   */
  const fetchAllData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch bookings assigned to this employee
      if (userProfile?.uid) {
        const bookingsRef = collection(db, 'bookings');
        const bookingsSnap = await getDocs(
          query(bookingsRef, where('employeeId', '==', userProfile.uid))
        );
        setBookings(bookingsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Booking[]);

        // Fetch clients for display names
        const clientsRef = collection(db, 'clients');
        const clientsSnap = await getDocs(clientsRef);
        const clientsMap: Record<string, Client> = {};
        clientsSnap.docs.forEach(doc => {
          clientsMap[doc.id] = { id: doc.id, ...doc.data() } as Client;
        });
        setClients(clientsMap);

        // Fetch current employee's data for pay calculation
        const employeesRef = collection(db, 'employees');
        const employeesSnap = await getDocs(employeesRef);
        const emp = employeesSnap.docs.find(doc => doc.id === userProfile.uid);
        if (emp) {
          setCurrentEmployee({ id: emp.id, ...emp.data() } as Employee);
        }
      }

      // Fetch personal tasks
      const tasksQuery = query(
        collection(db, 'personalTasks'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      setTasks(tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalTask[]);

      // Fetch personal reminders
      const remindersQuery = query(
        collection(db, 'personalReminders'),
        where('userId', '==', user.uid),
        orderBy('reminderTime', 'asc')
      );
      const remindersSnapshot = await getDocs(remindersQuery);
      setReminders(remindersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalReminder[]);

      // Fetch team notes
      const teamNotesQuery = query(
        collection(db, 'teamNotes'),
        orderBy('createdAt', 'desc')
      );
      const teamNotesSnapshot = await getDocs(teamNotesQuery);
      setTeamNotes(teamNotesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamNote[]);

    } catch (error) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // --------------------------------------------------------------------------

  /** Get client full name from ID */
  const getClientName = (clientId: string): string => {
    const client = clients[clientId];
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown';
  };

  /** Get client phone from ID */
  const getClientPhone = (clientId: string): string => {
    const client = clients[clientId];
    return client?.phone || '';
  };

  /** Format Firestore timestamp or Date to readable date string */
  const formatDate = (date: any): string => {
    if (!date) return '';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  /** Format time string or timestamp to readable time */
  const formatTime = (time: string | any): string => {
    if (!time) return '';
    // Handle hour string (e.g., "14" -> "2:00 PM")
    if (typeof time === 'string') {
      const hour = parseInt(time);
      if (hour > 12) return `${hour - 12}:00 PM`;
      if (hour === 12) return '12:00 PM';
      return `${hour}:00 AM`;
    }
    // Handle timestamp
    const d = time.seconds ? new Date(time.seconds * 1000) : new Date(time);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  /** Check if date is today */
  const isToday = (date: any): boolean => {
    if (!date) return false;
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  /** Check if date is today or in the future */
  const isFuture = (date: any): boolean => {
    if (!date) return false;
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  };

  // --------------------------------------------------------------------------
  // ACTION HANDLERS
  // --------------------------------------------------------------------------

  /** Update booking status */
  const updateJobStatus = async (bookingId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: newStatus as any } : b)
      );
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  /** Toggle task completion status */
  const toggleTaskStatus = async (task: PersonalTask) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await updateDoc(doc(db, 'personalTasks', task.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Error toggling task status:', error);
    }
  };

  /** Delete a task */
  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'personalTasks', taskId));
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  /** Mark reminder as completed */
  const completeReminder = async (reminderId: string) => {
    try {
      await updateDoc(doc(db, 'personalReminders', reminderId), {
        isCompleted: true,
      });
      setReminders(reminders.map(r => r.id === reminderId ? { ...r, isCompleted: true } : r));
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  /** Delete a reminder */
  const deleteReminder = async (reminderId: string) => {
    try {
      await deleteDoc(doc(db, 'personalReminders', reminderId));
      setReminders(reminders.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  // --------------------------------------------------------------------------
  // FILTERED DATA
  // --------------------------------------------------------------------------

  /** Filter and sort jobs based on time filter */
  const filteredJobs = bookings
    .filter(booking => {
      if (timeFilter === 'today') {
        return isToday(booking.scheduledDate) && booking.status !== 'completed' && booking.status !== 'cancelled';
      }
      if (timeFilter === 'upcoming') {
        return isFuture(booking.scheduledDate) && booking.status !== 'completed' && booking.status !== 'cancelled';
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = (a.scheduledDate as any)?.seconds || new Date(a.scheduledDate as any).getTime() / 1000;
      const dateB = (b.scheduledDate as any)?.seconds || new Date(b.scheduledDate as any).getTime() / 1000;
      return dateA - dateB;
    });

  /** Filter and sort tasks based on time filter */
  const filteredTasks = tasks
    .filter(task => {
      if (task.status === 'completed') return false;
      if (!task.dueDate) return timeFilter === 'all';
      if (timeFilter === 'today') return isToday(task.dueDate);
      if (timeFilter === 'upcoming') return isFuture(task.dueDate);
      return true;
    })
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      const dateA = (a.dueDate as any)?.seconds || new Date(a.dueDate as any).getTime() / 1000;
      const dateB = (b.dueDate as any)?.seconds || new Date(b.dueDate as any).getTime() / 1000;
      return dateA - dateB;
    });

  /** Filter reminders based on time filter */
  const filteredReminders = reminders.filter(reminder => {
    if (reminder.isCompleted) return false;
    if (timeFilter === 'today') return isToday(reminder.reminderTime);
    if (timeFilter === 'upcoming') return isFuture(reminder.reminderTime);
    return true;
  });

  /** Sort team notes with pinned first */
  const filteredTeamNotes = [...teamNotes].sort((a, b) =>
    (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
  );

  // --------------------------------------------------------------------------
  // STATS
  // --------------------------------------------------------------------------

  const todayJobs = bookings.filter(b =>
    isToday(b.scheduledDate) && b.status !== 'completed' && b.status !== 'cancelled'
  ).length;

  const todayTasks = tasks.filter(t =>
    t.status !== 'completed' && t.dueDate && isToday(t.dueDate)
  ).length;

  const todayReminders = reminders.filter(r =>
    !r.isCompleted && isToday(r.reminderTime)
  ).length;

  const urgentTeamNotes = teamNotes.filter(n => n.priority === 'urgent').length;

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

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
          <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-gray-500 mt-1">
            {todayJobs} jobs, {todayTasks} tasks, {todayReminders} reminders today
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/workspace"
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New
          </Link>
          <Link
            href="/admin/timeclock"
            className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Time Clock
          </Link>
        </div>
      </div>

      {/* Quick Stats - Clickable cards that switch tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`bg-white rounded-xl shadow-sm p-4 text-left transition-all ${activeTab === 'jobs' ? 'ring-2 ring-emerald-500' : ''}`}
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs text-gray-500">Jobs</p>
              <p className="text-xl font-bold text-gray-900">{todayJobs}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`bg-white rounded-xl shadow-sm p-4 text-left transition-all ${activeTab === 'tasks' ? 'ring-2 ring-emerald-500' : ''}`}
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs text-gray-500">Tasks</p>
              <p className="text-xl font-bold text-gray-900">{todayTasks}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`bg-white rounded-xl shadow-sm p-4 text-left transition-all ${activeTab === 'reminders' ? 'ring-2 ring-emerald-500' : ''}`}
        >
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs text-gray-500">Reminders</p>
              <p className="text-xl font-bold text-gray-900">{todayReminders}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`bg-white rounded-xl shadow-sm p-4 text-left transition-all ${activeTab === 'team' ? 'ring-2 ring-emerald-500' : ''}`}
        >
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs text-gray-500">Team</p>
              <p className="text-xl font-bold text-gray-900">{urgentTeamNotes > 0 ? `${urgentTeamNotes} urgent` : teamNotes.length}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-sm">
        {/* Tab Navigation & Time Filter */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-4">
            <nav className="flex -mb-px">
              {[
                { id: 'jobs', label: 'My Jobs' },
                { id: 'tasks', label: 'Tasks' },
                { id: 'reminders', label: 'Reminders' },
                { id: 'team', label: 'Team Board' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Time Filter - hidden for Team Board tab */}
            {activeTab !== 'team' && (
              <div className="flex gap-1">
                {(['today', 'upcoming', 'all'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTimeFilter(f)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${
                      timeFilter === f
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              {filteredJobs.length === 0 ? (
                <EmptyState
                  icon="jobs"
                  title={`No jobs ${timeFilter}`}
                  description={
                    timeFilter === 'today' ? "You don't have any jobs scheduled for today" :
                    timeFilter === 'upcoming' ? "No upcoming jobs scheduled" :
                    "No jobs assigned to you"
                  }
                />
              ) : (
                filteredJobs.map((booking) => (
                  <JobCard
                    key={booking.id}
                    booking={booking}
                    clientName={getClientName(booking.clientId)}
                    clientPhone={getClientPhone(booking.clientId)}
                    employee={currentEmployee}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    onStatusChange={updateJobStatus}
                  />
                ))
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <EmptyState
                  icon="tasks"
                  title={`No tasks ${timeFilter}`}
                  linkHref="/admin/workspace"
                  linkText="Add a task in Workspace"
                />
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    formatDate={formatDate}
                    onToggle={toggleTaskStatus}
                    onDelete={deleteTask}
                  />
                ))
              )}
            </div>
          )}

          {/* Reminders Tab */}
          {activeTab === 'reminders' && (
            <div className="space-y-3">
              {filteredReminders.length === 0 ? (
                <EmptyState
                  icon="reminders"
                  title={`No reminders ${timeFilter}`}
                  linkHref="/admin/workspace"
                  linkText="Add a reminder in Workspace"
                />
              ) : (
                filteredReminders.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    onComplete={completeReminder}
                    onDelete={deleteReminder}
                  />
                ))
              )}
            </div>
          )}

          {/* Team Board Tab */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Important notes from your team.</p>

              {filteredTeamNotes.length === 0 ? (
                <EmptyState
                  icon="team"
                  title="No team notes yet"
                  linkHref="/admin/workspace"
                  linkText="Post a note in Workspace"
                />
              ) : (
                filteredTeamNotes.map((note) => (
                  <TeamNoteCard
                    key={note.id}
                    note={note}
                    formatDate={formatDate}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Empty state display */
function EmptyState({
  icon,
  title,
  description,
  linkHref,
  linkText,
}: {
  icon: 'jobs' | 'tasks' | 'reminders' | 'team';
  title: string;
  description?: string;
  linkHref?: string;
  linkText?: string;
}) {
  const icons = {
    jobs: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    tasks: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    reminders: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    team: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  };

  return (
    <div className="text-center py-12">
      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[icon]} />
      </svg>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="text-gray-500 mt-1">{description}</p>}
      {linkHref && linkText && (
        <p className="text-gray-500 mt-1">
          <Link href={linkHref} className="text-emerald-600 hover:text-emerald-700">
            {linkText}
          </Link>
        </p>
      )}
    </div>
  );
}

/** Job/Booking card */
function JobCard({
  booking,
  clientName,
  clientPhone,
  employee,
  formatDate,
  formatTime,
  onStatusChange,
}: {
  booking: Booking;
  clientName: string;
  clientPhone: string;
  employee: Employee | null;
  formatDate: (date: any) => string;
  formatTime: (time: any) => string;
  onStatusChange: (id: string, status: string) => void;
}) {
  // Calculate estimated pay
  const estimatedDuration = booking.estimatedDuration || (booking.serviceTier === 'premium' ? 180 : 90);
  const durationHours = estimatedDuration / 60;
  const hourlyPay = employee ? durationHours * employee.hourlyRate : 0;
  const commissionPay = employee ? booking.totalPrice * employee.commissionRate : 0;
  const totalEstPay = Math.round(hourlyPay + commissionPay);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[booking.status]}`}>
                {STATUS_LABELS[booking.status]}
              </span>
              <span className="text-sm text-gray-500">
                {formatDate(booking.scheduledDate)} at {formatTime(booking.scheduledTime)}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{clientName}</h3>
            <p className="text-sm text-gray-500 capitalize">
              {booking.serviceType} Detail - {booking.serviceTier}
            </p>
            <p className="text-sm text-gray-400 mt-1">{booking.serviceAddress}</p>
            {/* Estimated Duration */}
            <p className="text-xs text-blue-600 mt-1">
              Est. Duration: ~{Math.round(durationHours * 10) / 10} hrs
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-emerald-600">${booking.totalPrice}</p>
            {employee && totalEstPay > 0 && (
              <div className="mt-1">
                <p className="text-sm font-medium text-blue-600">Est. Pay: ${totalEstPay}</p>
                <p className="text-xs text-gray-400">
                  ${Math.round(hourlyPay)} hr + ${Math.round(commissionPay)} comm
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
          {booking.status === 'confirmed' && (
            <button
              onClick={() => onStatusChange(booking.id, 'in_progress')}
              className="px-3 py-1.5 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600"
            >
              Start Job
            </button>
          )}
          {booking.status === 'in_progress' && (
            <button
              onClick={() => onStatusChange(booking.id, 'completed')}
              className="px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600"
            >
              Complete
            </button>
          )}
          {booking.status === 'pending' && (
            <button
              onClick={() => onStatusChange(booking.id, 'confirmed')}
              className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
            >
              Confirm
            </button>
          )}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(booking.serviceAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            Directions
          </a>
          <a
            href={`tel:${clientPhone}`}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call
          </a>
        </div>
      </div>
    </div>
  );
}

/** Task card */
function TaskCard({
  task,
  formatDate,
  onToggle,
  onDelete,
}: {
  task: PersonalTask;
  formatDate: (date: any) => string;
  onToggle: (task: PersonalTask) => void;
  onDelete: (id: string) => void;
}) {
  const assigneeColor = (task as any).assignedToColor;
  const assigneeName = (task as any).assignedToName;
  const hasAssignee = assigneeColor && assigneeName;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg ${hasAssignee ? 'border-l-4' : 'bg-gray-50'}`}
      style={hasAssignee ? {
        backgroundColor: lightenColor(assigneeColor, 90),
        borderLeftColor: assigneeColor
      } : undefined}
    >
      <button
        onClick={() => onToggle(task)}
        className="mt-0.5 w-5 h-5 rounded border-2 hover:border-emerald-500 flex-shrink-0"
        style={{ borderColor: hasAssignee ? assigneeColor : '#d1d5db' }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900">{task.title}</p>
          <span className={`px-2 py-0.5 text-xs rounded-full ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
          {hasAssignee && (
            <span
              className="px-2 py-0.5 text-xs rounded-full font-medium"
              style={{ backgroundColor: assigneeColor, color: 'white' }}
            >
              {assigneeName}
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
        )}
        {task.dueDate && (
          <p className="text-xs text-gray-500 mt-1">
            Due: {formatDate(task.dueDate)} {task.dueTime && `at ${task.dueTime}`}
          </p>
        )}
      </div>
      <button onClick={() => onDelete(task.id)} className="text-gray-400 hover:text-red-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/** Reminder card */
function ReminderCard({
  reminder,
  formatDate,
  formatTime,
  onComplete,
  onDelete,
}: {
  reminder: PersonalReminder;
  formatDate: (date: any) => string;
  formatTime: (time: any) => string;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg">
      <div className="p-2 bg-orange-100 rounded-lg text-lg">🔔</div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{reminder.title}</p>
        {reminder.message && <p className="text-sm text-gray-500">{reminder.message}</p>}
        <p className="text-xs text-gray-400 mt-1">
          {formatDate(reminder.reminderTime)} at {formatTime(reminder.reminderTime)}
        </p>
      </div>
      <button
        onClick={() => onComplete(reminder.id)}
        className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600"
      >
        Done
      </button>
      <button onClick={() => onDelete(reminder.id)} className="text-gray-400 hover:text-red-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/** Team note card */
function TeamNoteCard({
  note,
  formatDate,
}: {
  note: TeamNote;
  formatDate: (date: any) => string;
}) {
  return (
    <div className={`p-4 rounded-lg border ${note.isPinned ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start gap-2">
        {note.isPinned && <span>📌</span>}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">{note.title}</h4>
            {note.priority && note.priority !== 'normal' && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${TEAM_PRIORITY_COLORS[note.priority]}`}>
                {note.priority}
              </span>
            )}
          </div>
          <p className="text-gray-700 mt-1 text-sm whitespace-pre-wrap">{note.content}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span className="font-medium">{note.authorName}</span>
            <span>•</span>
            <span>{formatDate(note.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
