'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { PersonalTask, PersonalNote, PersonalReminder, TeamNote, DirectMessage } from '@/lib/types';

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const NOTE_COLORS = [
  { name: 'Yellow', value: '#fef9c3' },
  { name: 'Green', value: '#dcfce7' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Purple', value: '#f3e8ff' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Orange', value: '#ffedd5' },
];

const TEAM_PRIORITY_COLORS = {
  normal: 'bg-gray-100 text-gray-700',
  important: 'bg-yellow-100 text-yellow-700',
  urgent: 'bg-red-100 text-red-700',
};

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  scheduleColor?: string;
}

export default function WorkspacePage() {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'reminders' | 'team' | 'messages'>('tasks');

  // Tasks state
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<PersonalTask[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as PersonalTask['priority'],
    dueDate: '',
    dueTime: '',
    category: '',
    assignedTo: '', // empty = self
  });

  // Notes state
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [assignedNotes, setAssignedNotes] = useState<PersonalNote[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    color: '#fef9c3',
    assignedTo: '', // empty = self
  });

  // Reminders state
  const [reminders, setReminders] = useState<PersonalReminder[]>([]);
  const [assignedReminders, setAssignedReminders] = useState<PersonalReminder[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    title: '',
    message: '',
    reminderDate: '',
    reminderTime: '',
    isRecurring: false,
    recurringPattern: 'daily' as PersonalReminder['recurringPattern'],
    assignedTo: '', // empty = self
  });

  // Team Notes state
  const [teamNotes, setTeamNotes] = useState<TeamNote[]>([]);
  const [showTeamNoteModal, setShowTeamNoteModal] = useState(false);
  const [teamNoteForm, setTeamNoteForm] = useState({
    title: '',
    content: '',
    priority: 'normal' as TeamNote['priority'],
    category: '',
  });

  // Messages state
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [sentMessages, setSentMessages] = useState<DirectMessage[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [messageForm, setMessageForm] = useState({
    recipientId: '',
    subject: '',
    content: '',
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch my tasks (created by me)
      const tasksQuery = query(
        collection(db, 'personalTasks'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksData = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalTask[];
      setTasks(tasksData);

      // Fetch tasks assigned to me (by others)
      const assignedTasksQuery = query(
        collection(db, 'personalTasks'),
        where('assignedTo', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const assignedTasksSnapshot = await getDocs(assignedTasksQuery);
      const assignedTasksData = assignedTasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalTask[];
      setAssignedTasks(assignedTasksData.filter(t => t.userId !== user.uid));

      // Fetch my notes
      const notesQuery = query(
        collection(db, 'personalNotes'),
        where('userId', '==', user.uid),
        orderBy('isPinned', 'desc')
      );
      const notesSnapshot = await getDocs(notesQuery);
      const notesData = notesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalNote[];
      setNotes(notesData);

      // Fetch notes assigned to me
      const assignedNotesQuery = query(
        collection(db, 'personalNotes'),
        where('assignedTo', '==', user.uid)
      );
      const assignedNotesSnapshot = await getDocs(assignedNotesQuery);
      const assignedNotesData = assignedNotesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalNote[];
      setAssignedNotes(assignedNotesData.filter(n => n.userId !== user.uid));

      // Fetch my reminders
      const remindersQuery = query(
        collection(db, 'personalReminders'),
        where('userId', '==', user.uid),
        orderBy('reminderTime', 'asc')
      );
      const remindersSnapshot = await getDocs(remindersQuery);
      const remindersData = remindersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalReminder[];
      setReminders(remindersData);

      // Fetch reminders assigned to me
      const assignedRemindersQuery = query(
        collection(db, 'personalReminders'),
        where('assignedTo', '==', user.uid)
      );
      const assignedRemindersSnapshot = await getDocs(assignedRemindersQuery);
      const assignedRemindersData = assignedRemindersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalReminder[];
      setAssignedReminders(assignedRemindersData.filter(r => r.userId !== user.uid));

      // Fetch team notes
      const teamNotesQuery = query(
        collection(db, 'teamNotes'),
        orderBy('createdAt', 'desc')
      );
      const teamNotesSnapshot = await getDocs(teamNotesQuery);
      const teamNotesData = teamNotesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamNote[];
      setTeamNotes(teamNotesData);

      // Fetch received messages
      const messagesQuery = query(
        collection(db, 'directMessages'),
        where('recipientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const messagesData = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DirectMessage[];
      setMessages(messagesData);

      // Fetch sent messages
      const sentQuery = query(
        collection(db, 'directMessages'),
        where('senderId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const sentSnapshot = await getDocs(sentQuery);
      const sentData = sentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DirectMessage[];
      setSentMessages(sentData);

      // Fetch team members for message dropdown (from both users and employees)
      // First get all employees to have schedule colors
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      const employeeColors = new Map<string, string>();
      employeesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.email && data.scheduleColor) {
          employeeColors.set(data.email, data.scheduleColor);
        }
      });

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersMap = new Map<string, TeamMember>();
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (doc.id !== user.uid) {
          usersMap.set(data.email, {
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email,
            scheduleColor: employeeColors.get(data.email) || '#9ca3af', // gray default
          });
        }
      });

      // Also add from employees collection if not in users
      employeesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        // If employee not already in users, add them (using their employee doc id)
        if (!usersMap.has(data.email) && data.email !== userProfile?.email) {
          usersMap.set(data.email, {
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email,
            scheduleColor: data.scheduleColor || '#9ca3af',
          });
        }
      });

      setTeamMembers(Array.from(usersMap.values()));

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Task functions
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    try {
      const assignee = teamMembers.find(m => m.id === taskForm.assignedTo);
      const taskData = {
        userId: user.uid,
        createdByName: `${userProfile.firstName} ${userProfile.lastName}`,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        status: 'pending' as const,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : null,
        dueTime: taskForm.dueTime || null,
        category: taskForm.category || null,
        assignedTo: taskForm.assignedTo || null,
        assignedToName: assignee ? `${assignee.firstName} ${assignee.lastName}` : null,
        assignedToColor: assignee?.scheduleColor || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (editingTask) {
        await updateDoc(doc(db, 'personalTasks', editingTask.id), {
          ...taskData,
          createdAt: editingTask.createdAt,
        });
      } else {
        await addDoc(collection(db, 'personalTasks'), taskData);
      }

      await fetchData();
      resetTaskForm();
      showMessage('success', taskForm.assignedTo ? `Task assigned to ${assignee?.firstName}!` : 'Task saved!');
    } catch (error: any) {
      console.error('Error saving task:', error);
      showMessage('error', `Failed to save task: ${error.message}`);
    }
  };

  const toggleTaskStatus = async (task: PersonalTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateDoc(doc(db, 'personalTasks', task.id), {
      status: newStatus,
      updatedAt: Timestamp.now(),
    });
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, 'personalTasks', taskId));
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const resetTaskForm = () => {
    setTaskForm({ title: '', description: '', priority: 'medium', dueDate: '', dueTime: '', category: '', assignedTo: '' });
    setEditingTask(null);
    setShowTaskModal(false);
  };

  // Helper to get assignee's color (check task's stored color first, then lookup)
  const getAssigneeColor = (assignedToId: string | null | undefined, storedColor?: string | null): string => {
    if (storedColor) return storedColor;
    if (!assignedToId) return '#9ca3af';
    const member = teamMembers.find(m => m.id === assignedToId);
    return member?.scheduleColor || '#9ca3af';
  };

  // Helper to lighten a color for background
  const lightenColor = (hex: string, percent: number = 85): string => {
    if (!hex || !hex.startsWith('#')) return '#f3f4f6';
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * (percent / 100)));
    const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * (percent / 100)));
    const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * (percent / 100)));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  };

  // Note functions
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    try {
      const assignee = teamMembers.find(m => m.id === noteForm.assignedTo);
      const noteData = {
        userId: user.uid,
        createdByName: `${userProfile.firstName} ${userProfile.lastName}`,
        title: noteForm.title,
        content: noteForm.content,
        color: noteForm.color,
        isPinned: editingNote?.isPinned || false,
        assignedTo: noteForm.assignedTo || null,
        assignedToName: assignee ? `${assignee.firstName} ${assignee.lastName}` : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (editingNote) {
        await updateDoc(doc(db, 'personalNotes', editingNote.id), {
          ...noteData,
          createdAt: editingNote.createdAt,
        });
      } else {
        await addDoc(collection(db, 'personalNotes'), noteData);
      }

      await fetchData();
      resetNoteForm();
      showMessage('success', noteForm.assignedTo ? `Note sent to ${assignee?.firstName}!` : 'Note saved!');
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const toggleNotePin = async (note: PersonalNote) => {
    await updateDoc(doc(db, 'personalNotes', note.id), {
      isPinned: !note.isPinned,
      updatedAt: Timestamp.now(),
    });
    await fetchData();
  };

  const deleteNote = async (noteId: string) => {
    await deleteDoc(doc(db, 'personalNotes', noteId));
    setNotes(notes.filter(n => n.id !== noteId));
  };

  const resetNoteForm = () => {
    setNoteForm({ title: '', content: '', color: '#fef9c3', assignedTo: '' });
    setEditingNote(null);
    setShowNoteModal(false);
  };

  // Reminder functions
  const handleReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    try {
      const reminderDateTime = new Date(`${reminderForm.reminderDate}T${reminderForm.reminderTime}`);
      const assignee = teamMembers.find(m => m.id === reminderForm.assignedTo);

      const reminderData = {
        userId: user.uid,
        createdByName: `${userProfile.firstName} ${userProfile.lastName}`,
        title: reminderForm.title,
        message: reminderForm.message,
        reminderTime: reminderDateTime,
        isRecurring: reminderForm.isRecurring,
        recurringPattern: reminderForm.isRecurring ? reminderForm.recurringPattern : null,
        isCompleted: false,
        assignedTo: reminderForm.assignedTo || null,
        assignedToName: assignee ? `${assignee.firstName} ${assignee.lastName}` : null,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'personalReminders'), reminderData);
      await fetchData();
      resetReminderForm();
      showMessage('success', reminderForm.assignedTo ? `Reminder assigned to ${assignee?.firstName}!` : 'Reminder saved!');
    } catch (error: any) {
      console.error('Error saving reminder:', error);
      showMessage('error', `Failed to save reminder: ${error.message}`);
    }
  };

  const completeReminder = async (reminderId: string) => {
    await updateDoc(doc(db, 'personalReminders', reminderId), {
      isCompleted: true,
    });
    setReminders(reminders.map(r => r.id === reminderId ? { ...r, isCompleted: true } : r));
  };

  const deleteReminder = async (reminderId: string) => {
    await deleteDoc(doc(db, 'personalReminders', reminderId));
    setReminders(reminders.filter(r => r.id !== reminderId));
  };

  const resetReminderForm = () => {
    setReminderForm({ title: '', message: '', reminderDate: '', reminderTime: '', isRecurring: false, recurringPattern: 'daily', assignedTo: '' });
    setShowReminderModal(false);
  };

  // Team Note functions
  const handleTeamNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    try {
      const teamNoteData = {
        authorId: user.uid,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`,
        title: teamNoteForm.title,
        content: teamNoteForm.content,
        priority: teamNoteForm.priority,
        category: teamNoteForm.category || null,
        isPinned: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'teamNotes'), teamNoteData);
      await fetchData();
      resetTeamNoteForm();
    } catch (error) {
      console.error('Error saving team note:', error);
    }
  };

  const deleteTeamNote = async (noteId: string) => {
    await deleteDoc(doc(db, 'teamNotes', noteId));
    setTeamNotes(teamNotes.filter(n => n.id !== noteId));
  };

  const toggleTeamNotePin = async (note: TeamNote) => {
    await updateDoc(doc(db, 'teamNotes', note.id), {
      isPinned: !note.isPinned,
      updatedAt: Timestamp.now(),
    });
    await fetchData();
  };

  const resetTeamNoteForm = () => {
    setTeamNoteForm({ title: '', content: '', priority: 'normal', category: '' });
    setShowTeamNoteModal(false);
  };

  // Message functions
  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    const recipient = teamMembers.find(m => m.id === messageForm.recipientId);
    if (!recipient) return;

    try {
      const messageData = {
        senderId: user.uid,
        senderName: `${userProfile.firstName} ${userProfile.lastName}`,
        recipientId: messageForm.recipientId,
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        subject: messageForm.subject,
        content: messageForm.content,
        isRead: false,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'directMessages'), messageData);
      await fetchData();
      resetMessageForm();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const markMessageRead = async (messageId: string) => {
    await updateDoc(doc(db, 'directMessages', messageId), {
      isRead: true,
    });
    setMessages(messages.map(m => m.id === messageId ? { ...m, isRead: true } : m));
  };

  const deleteMessage = async (messageId: string) => {
    await deleteDoc(doc(db, 'directMessages', messageId));
    setMessages(messages.filter(m => m.id !== messageId));
    setSentMessages(sentMessages.filter(m => m.id !== messageId));
  };

  const resetMessageForm = () => {
    setMessageForm({ recipientId: '', subject: '', content: '' });
    setShowMessageModal(false);
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date: any) => {
    if (!date) return '';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const upcomingReminders = reminders.filter(r => !r.isCompleted);
  const unreadMessages = messages.filter(m => !m.isRead);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Workspace</h1>
          <p className="text-gray-500 mt-1">Tasks, notes, team updates & messages</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs text-gray-500">Tasks</p>
              <p className="text-xl font-bold text-gray-900">{pendingTasks.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs text-gray-500">Notes</p>
              <p className="text-xl font-bold text-gray-900">{notes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs text-gray-500">Reminders</p>
              <p className="text-xl font-bold text-gray-900">{upcomingReminders.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs text-gray-500">Team Notes</p>
              <p className="text-xl font-bold text-gray-900">{teamNotes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs text-gray-500">Unread</p>
              <p className="text-xl font-bold text-gray-900">{unreadMessages.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {[
              { id: 'tasks', label: 'Tasks', icon: '📋' },
              { id: 'notes', label: 'My Notes', icon: '📝' },
              { id: 'reminders', label: 'Reminders', icon: '🔔' },
              { id: 'team', label: 'Team Board', icon: '👥' },
              { id: 'messages', label: `Messages ${unreadMessages.length > 0 ? `(${unreadMessages.length})` : ''}`, icon: '✉️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                >
                  + Add Task
                </button>
              </div>

              {/* Tasks assigned to me by others */}
              {assignedTasks.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Assigned to me ({assignedTasks.filter(t => t.status !== 'completed').length})
                  </h4>
                  {assignedTasks.filter(t => t.status !== 'completed').map((task) => (
                    <div key={task.id} className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className="mt-1 w-5 h-5 rounded border-2 border-blue-400 hover:border-emerald-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">{task.title}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                        )}
                        <p className="text-xs text-blue-600 mt-1">
                          From: {(task as any).createdByName || 'Unknown'}
                          {task.dueDate && ` • Due: ${formatDate(task.dueDate)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* My own tasks */}
              {pendingTasks.length === 0 && completedTasks.length === 0 && assignedTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tasks yet. Create your first task!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tasks assigned to others */}
                  {pendingTasks.filter(t => (t as any).assignedTo).length > 0 && (
                    <>
                      <h4 className="text-sm font-medium text-gray-500">Assigned to Others ({pendingTasks.filter(t => (t as any).assignedTo).length})</h4>
                      {pendingTasks.filter(t => (t as any).assignedTo).map((task) => {
                        const assigneeColor = getAssigneeColor((task as any).assignedTo, (task as any).assignedToColor);
                        return (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 p-4 rounded-lg border-l-4"
                            style={{
                              backgroundColor: lightenColor(assigneeColor, 90),
                              borderLeftColor: assigneeColor
                            }}
                          >
                            <button
                              onClick={() => toggleTaskStatus(task)}
                              className="mt-1 w-5 h-5 rounded border-2 hover:border-emerald-500 flex-shrink-0"
                              style={{ borderColor: assigneeColor }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-gray-900">{task.title}</p>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                                  {task.priority}
                                </span>
                                <span
                                  className="px-2 py-0.5 text-xs rounded-full font-medium"
                                  style={{
                                    backgroundColor: assigneeColor,
                                    color: 'white'
                                  }}
                                >
                                  {(task as any).assignedToName}
                                </span>
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
                            <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* My own tasks (not assigned to anyone) */}
                  {pendingTasks.filter(t => !(t as any).assignedTo).length > 0 && (
                    <>
                      <h4 className="text-sm font-medium text-gray-500 mt-4">My Personal Tasks ({pendingTasks.filter(t => !(t as any).assignedTo).length})</h4>
                      {pendingTasks.filter(t => !(t as any).assignedTo).map((task) => (
                        <div key={task.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                          <button
                            onClick={() => toggleTaskStatus(task)}
                            className="mt-1 w-5 h-5 rounded border-2 border-gray-300 hover:border-emerald-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900">{task.title}</p>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                                {task.priority}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                            )}
                            {task.dueDate && (
                              <p className="text-xs text-gray-400 mt-1">
                                Due: {formatDate(task.dueDate)} {task.dueTime && `at ${task.dueTime}`}
                              </p>
                            )}
                          </div>
                          <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {completedTasks.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Completed ({completedTasks.length})</h4>
                      {completedTasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-60 mb-2">
                          <button
                            onClick={() => toggleTaskStatus(task)}
                            className="w-5 h-5 rounded border-2 border-emerald-500 bg-emerald-500 flex-shrink-0 flex items-center justify-center"
                          >
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <p className="flex-1 line-through text-gray-500 text-sm">{task.title}</p>
                          <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
                <button
                  onClick={() => setShowNoteModal(true)}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                >
                  + Add Note
                </button>
              </div>

              {/* Notes sent to me */}
              {assignedNotes.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Received ({assignedNotes.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-4 rounded-lg shadow-sm relative border-2 border-blue-300"
                        style={{ backgroundColor: note.color || '#dbeafe' }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{note.title}</h4>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-blue-600 mt-3">From: {(note as any).createdByName || 'Unknown'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {notes.length === 0 && assignedNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No notes yet. Create your first note!</p>
                </div>
              ) : notes.length > 0 && (
                <>
                  <h4 className="text-sm font-medium text-gray-500">My Notes ({notes.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-4 rounded-lg shadow-sm relative group"
                        style={{ backgroundColor: note.color || '#fef9c3' }}
                      >
                        {note.isPinned && <span className="absolute -top-2 -right-2 text-lg">📌</span>}
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{note.title}</h4>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => toggleNotePin(note)} className="p-1 hover:bg-black/10 rounded text-sm">📌</button>
                            <button onClick={() => deleteNote(note.id)} className="p-1 hover:bg-black/10 rounded text-sm">🗑️</button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                        <div className="flex justify-between items-center mt-3">
                          <p className="text-xs text-gray-500">{formatDate(note.updatedAt)}</p>
                          {(note as any).assignedToName && (
                            <span className="text-xs text-purple-600">→ {(note as any).assignedToName}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Reminders Tab */}
          {activeTab === 'reminders' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Reminders</h3>
                <button
                  onClick={() => setShowReminderModal(true)}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                >
                  + Add Reminder
                </button>
              </div>

              {/* Reminders assigned to me */}
              {assignedReminders.filter(r => !r.isCompleted).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Assigned to me ({assignedReminders.filter(r => !r.isCompleted).length})
                  </h4>
                  <div className="space-y-3">
                    {assignedReminders.filter(r => !r.isCompleted).map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 border border-blue-200"
                      >
                        <div className="p-2 bg-blue-100 rounded-lg">🔔</div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{reminder.title}</p>
                          {reminder.message && <p className="text-sm text-gray-500">{reminder.message}</p>}
                          <p className="text-xs text-blue-600 mt-1">
                            From: {(reminder as any).createdByName || 'Unknown'} • {formatDate(reminder.reminderTime)} at {formatTime(reminder.reminderTime)}
                          </p>
                        </div>
                        <button onClick={() => completeReminder(reminder.id)} className="px-3 py-1 bg-emerald-500 text-white text-sm rounded-lg">
                          Done
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reminders.length === 0 && assignedReminders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No reminders yet.</p>
                </div>
              ) : reminders.length > 0 && (
                <>
                  <h4 className="text-sm font-medium text-gray-500">My Reminders ({upcomingReminders.length})</h4>
                  <div className="space-y-3">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className={`flex items-center gap-4 p-4 rounded-lg ${reminder.isCompleted ? 'bg-gray-100 opacity-60' : 'bg-purple-50'}`}
                      >
                        <div className="p-2 bg-purple-100 rounded-lg">🔔</div>
                        <div className="flex-1">
                          <p className={`font-medium ${reminder.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {reminder.title}
                          </p>
                          {reminder.message && <p className="text-sm text-gray-500">{reminder.message}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-400">
                              {formatDate(reminder.reminderTime)} at {formatTime(reminder.reminderTime)}
                            </p>
                            {(reminder as any).assignedToName && (
                              <span className="text-xs text-purple-600">→ {(reminder as any).assignedToName}</span>
                            )}
                          </div>
                        </div>
                        {!reminder.isCompleted && (
                          <button onClick={() => completeReminder(reminder.id)} className="px-3 py-1 bg-emerald-500 text-white text-sm rounded-lg">
                            Done
                          </button>
                        )}
                        <button onClick={() => deleteReminder(reminder.id)} className="text-gray-400 hover:text-red-600">✕</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Team Board Tab */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Team Board</h3>
                <button
                  onClick={() => setShowTeamNoteModal(true)}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                >
                  + Post Note
                </button>
              </div>

              <p className="text-sm text-gray-500">Notes posted here are visible to all team members.</p>

              {teamNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No team notes yet. Be the first to post!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamNotes
                    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                    .map((note) => (
                    <div key={note.id} className={`p-4 rounded-lg border ${note.isPinned ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {note.isPinned && <span>📌</span>}
                          <h4 className="font-semibold text-gray-900">{note.title}</h4>
                          {note.priority && note.priority !== 'normal' && (
                            <span className={`px-2 py-0.5 text-xs rounded-full ${TEAM_PRIORITY_COLORS[note.priority]}`}>
                              {note.priority}
                            </span>
                          )}
                        </div>
                        {note.authorId === user?.uid && (
                          <div className="flex gap-2">
                            <button onClick={() => toggleTeamNotePin(note)} className="text-gray-400 hover:text-emerald-600 text-sm">
                              {note.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button onClick={() => deleteTeamNote(note.id)} className="text-gray-400 hover:text-red-600 text-sm">
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{note.content}</p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                        <span className="font-medium">{note.authorName}</span>
                        <span>•</span>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                >
                  + New Message
                </button>
              </div>

              {/* Inbox */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Inbox ({messages.length})</h4>
                {messages.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg text-gray-500">
                    <p>No messages received.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          msg.isRead ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
                        }`}
                        onClick={() => markMessageRead(msg.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              {!msg.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                              <p className="font-medium text-gray-900">{msg.subject}</p>
                            </div>
                            <p className="text-sm text-gray-500">From: {msg.senderName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                            <button onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }} className="text-gray-400 hover:text-red-600">✕</button>
                          </div>
                        </div>
                        <p className="text-gray-700 mt-2 text-sm">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sent */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Sent ({sentMessages.length})</h4>
                {sentMessages.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg text-gray-500">
                    <p>No messages sent.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sentMessages.map((msg) => (
                      <div key={msg.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{msg.subject}</p>
                            <p className="text-sm text-gray-500">To: {msg.recipientName}</p>
                          </div>
                          <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                        </div>
                        <p className="text-gray-600 mt-2 text-sm">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={resetTaskForm} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">New Task</h2>
              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as PersonalTask['priority'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Myself</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={resetTaskForm} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={resetNoteForm} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">New Note</h2>
              <form onSubmit={handleNoteSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={noteForm.title}
                    onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                  <textarea
                    required
                    value={noteForm.content}
                    onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex gap-2">
                    {NOTE_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setNoteForm({ ...noteForm, color: color.value })}
                        className={`w-8 h-8 rounded-full border-2 ${noteForm.color === color.value ? 'border-gray-900' : 'border-transparent'}`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Send To</label>
                  <select
                    value={noteForm.assignedTo}
                    onChange={(e) => setNoteForm({ ...noteForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Keep for myself</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={resetNoteForm} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">{noteForm.assignedTo ? 'Send' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={resetReminderForm} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">New Reminder</h2>
              <form onSubmit={handleReminderSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={reminderForm.title}
                    onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={reminderForm.reminderDate}
                      onChange={(e) => setReminderForm({ ...reminderForm, reminderDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                    <input
                      type="time"
                      required
                      value={reminderForm.reminderTime}
                      onChange={(e) => setReminderForm({ ...reminderForm, reminderTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <select
                    value={reminderForm.assignedTo}
                    onChange={(e) => setReminderForm({ ...reminderForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Myself</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={resetReminderForm} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Team Note Modal */}
      {showTeamNoteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={resetTeamNoteForm} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Post Team Note</h2>
              <p className="text-sm text-gray-500 mb-4">This note will be visible to all team members.</p>
              <form onSubmit={handleTeamNoteSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={teamNoteForm.title}
                    onChange={(e) => setTeamNoteForm({ ...teamNoteForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                  <textarea
                    required
                    value={teamNoteForm.content}
                    onChange={(e) => setTeamNoteForm({ ...teamNoteForm, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={teamNoteForm.priority}
                    onChange={(e) => setTeamNoteForm({ ...teamNoteForm, priority: e.target.value as TeamNote['priority'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={resetTeamNoteForm} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">Post</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={resetMessageForm} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Send Message</h2>
              <form onSubmit={handleMessageSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
                  <select
                    required
                    value={messageForm.recipientId}
                    onChange={(e) => setMessageForm({ ...messageForm, recipientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select recipient...</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={messageForm.subject}
                    onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea
                    required
                    value={messageForm.content}
                    onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={resetMessageForm} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">Send</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
