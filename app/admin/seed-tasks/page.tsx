'use client';

import { useState } from 'react';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

interface TaskToSeed {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueTime: string;
  category: string;
  assignTo: 'landon' | 'lidani' | 'xander' | 'all' | 'self';
}

// Tomorrow's date (01/27/2026)
const TOMORROW = '2026-01-27';

// Onboarding tasks for 8:00 AM - 2:00 PM
const ONBOARDING_TASKS: TaskToSeed[] = [
  // 8:00 AM - Morning Setup
  {
    title: 'Team morning briefing',
    description: 'Meet with Lidani and Xander to go over the day\'s onboarding schedule, expectations, and goals. Cover company policies, dress code, and professionalism standards.',
    priority: 'high',
    dueTime: '08:00',
    category: 'Onboarding',
    assignTo: 'landon',
  },
  {
    title: 'Complete employee paperwork - Lidani',
    description: 'Fill out all remaining onboarding documents including W-4, I-9, direct deposit forms, and emergency contact information.',
    priority: 'high',
    dueTime: '08:30',
    category: 'Onboarding',
    assignTo: 'lidani',
  },
  {
    title: 'Complete employee paperwork - Xander',
    description: 'Fill out all remaining onboarding documents including W-4, I-9, direct deposit forms, and emergency contact information.',
    priority: 'high',
    dueTime: '08:30',
    category: 'Onboarding',
    assignTo: 'xander',
  },
  {
    title: 'Review employee handbook - Lidani',
    description: 'Go through company policies, safety procedures, customer service standards, and expectations. Sign acknowledgment forms.',
    priority: 'medium',
    dueTime: '09:00',
    category: 'Onboarding',
    assignTo: 'lidani',
  },
  {
    title: 'Review employee handbook - Xander',
    description: 'Go through company policies, safety procedures, customer service standards, and expectations. Sign acknowledgment forms.',
    priority: 'medium',
    dueTime: '09:00',
    category: 'Onboarding',
    assignTo: 'xander',
  },

  // 9:00 AM - System Training
  {
    title: 'App and system training - Lidani',
    description: 'Train on the Emerald Detailing app: logging in, clocking in/out, viewing schedule, checking assigned jobs, and using the workspace.',
    priority: 'high',
    dueTime: '09:00',
    category: 'Training',
    assignTo: 'lidani',
  },
  {
    title: 'App and system training - Xander',
    description: 'Train on the Emerald Detailing app: logging in, clocking in/out, viewing schedule, checking assigned jobs, and using the workspace.',
    priority: 'high',
    dueTime: '09:00',
    category: 'Training',
    assignTo: 'xander',
  },
  {
    title: 'Verify employee login credentials',
    description: 'Verify Lidani and Xander can log into the app, test clock in/out functionality, and ensure all permissions are working correctly.',
    priority: 'high',
    dueTime: '09:30',
    category: 'Setup',
    assignTo: 'landon',
  },

  // 10:00 AM - Van Setup
  {
    title: 'Inventory detailing supplies',
    description: 'Take inventory of all detailing supplies, chemicals, and equipment. Create a checklist of what\'s available and what needs to be ordered.',
    priority: 'high',
    dueTime: '10:00',
    category: 'Van Setup',
    assignTo: 'all',
  },
  {
    title: 'Organize detailing van storage',
    description: 'Set up storage bins, organize chemicals (keep separate from towels), arrange tools for easy access. Label everything clearly.',
    priority: 'high',
    dueTime: '10:30',
    category: 'Van Setup',
    assignTo: 'all',
  },
  {
    title: 'Check van equipment functionality',
    description: 'Test pressure washer, vacuum, steamer, polisher, and all other equipment. Note any items needing repair or replacement.',
    priority: 'high',
    dueTime: '11:00',
    category: 'Van Setup',
    assignTo: 'xander',
  },
  {
    title: 'Stock water tank',
    description: 'Fill the van\'s water tank. Check for leaks. Verify water pump is working properly.',
    priority: 'medium',
    dueTime: '11:15',
    category: 'Van Setup',
    assignTo: 'xander',
  },

  // 11:30 AM - Product Training
  {
    title: 'Learn product knowledge - Lidani',
    description: 'Review all detailing products: what each chemical does, dilution ratios, safety precautions, and proper application techniques.',
    priority: 'high',
    dueTime: '11:30',
    category: 'Training',
    assignTo: 'lidani',
  },
  {
    title: 'Learn product knowledge - Xander',
    description: 'Review all detailing products: what each chemical does, dilution ratios, safety precautions, and proper application techniques.',
    priority: 'high',
    dueTime: '11:30',
    category: 'Training',
    assignTo: 'xander',
  },
  {
    title: 'Practice detailing techniques - Xander',
    description: 'Hands-on training: proper washing technique, clay bar use, polish application, interior cleaning process, and final inspection standards.',
    priority: 'high',
    dueTime: '12:00',
    category: 'Training',
    assignTo: 'xander',
  },

  // 12:30 PM - Lunch & Service Standards
  {
    title: 'Lunch break',
    description: 'Take a 30-minute lunch break.',
    priority: 'low',
    dueTime: '12:30',
    category: 'Break',
    assignTo: 'all',
  },
  {
    title: 'Review service packages and pricing - Lidani',
    description: 'Go over all service packages (Express, Premium), add-ons, pricing structure, and how to explain value to customers.',
    priority: 'high',
    dueTime: '13:00',
    category: 'Training',
    assignTo: 'lidani',
  },
  {
    title: 'Review service packages and pricing - Xander',
    description: 'Go over all service packages (Express, Premium), add-ons, pricing structure, and how to explain value to customers.',
    priority: 'high',
    dueTime: '13:00',
    category: 'Training',
    assignTo: 'xander',
  },
  {
    title: 'Customer service training - Lidani',
    description: 'Review customer interaction standards: greeting customers, handling complaints, upselling techniques, and maintaining professionalism.',
    priority: 'high',
    dueTime: '13:30',
    category: 'Training',
    assignTo: 'lidani',
  },
  {
    title: 'Customer service training - Xander',
    description: 'Review customer interaction standards: greeting customers, handling complaints, upselling techniques, and maintaining professionalism.',
    priority: 'high',
    dueTime: '13:30',
    category: 'Training',
    assignTo: 'xander',
  },

  // 2:00 PM - Wrap Up
  {
    title: 'End of day review',
    description: 'Recap the day\'s training, answer any questions, discuss tomorrow\'s schedule, and set expectations for the first real job.',
    priority: 'medium',
    dueTime: '14:00',
    category: 'Onboarding',
    assignTo: 'all',
  },
  {
    title: 'Create supply order list',
    description: 'Based on inventory, create a list of supplies that need to be ordered. Include chemicals, towels, brushes, and any equipment repairs needed.',
    priority: 'medium',
    dueTime: '14:00',
    category: 'Admin',
    assignTo: 'landon',
  },
];

export default function SeedTasksPage() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [seededCount, setSeededCount] = useState(0);

  // Get user IDs
  const getUserIds = async () => {
    const usersSnap = await getDocs(collection(db, 'users'));
    const employeesSnap = await getDocs(collection(db, 'employees'));

    let landonId = '';
    let lidaniId = '';
    let xanderId = '';

    // Check users collection
    usersSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.email === 'landong@griffithind.com') landonId = doc.id;
      if (data.email === 'lidanib_11@icloud.com') lidaniId = doc.id;
      if (data.email === 'xanderpsakda@gmail.com') xanderId = doc.id;
    });

    // Also check employees collection
    employeesSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.email === 'landong@griffithind.com' && !landonId) landonId = doc.id;
      if (data.email === 'lidanib_11@icloud.com' && !lidaniId) lidaniId = doc.id;
      if (data.email === 'xanderpsakda@gmail.com' && !xanderId) xanderId = doc.id;
    });

    return { landonId, lidaniId, xanderId };
  };

  const checkExistingTasks = async (landonId: string) => {
    // Check if tasks for tomorrow already exist
    const existingTasks = await getDocs(
      query(
        collection(db, 'personalTasks'),
        where('userId', '==', landonId),
        where('dueDate', '==', TOMORROW)
      )
    );
    return existingTasks.docs.map(doc => doc.data().title);
  };

  const seedTasks = async () => {
    if (!userProfile?.uid) {
      setMessage({ type: 'error', text: 'You must be logged in' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { landonId, lidaniId, xanderId } = await getUserIds();

      if (!landonId) {
        setMessage({ type: 'error', text: 'Could not find Landon\'s user ID' });
        setLoading(false);
        return;
      }

      // Check for existing tasks to avoid duplicates
      const existingTitles = await checkExistingTasks(landonId);

      let count = 0;
      for (const task of ONBOARDING_TASKS) {
        // Skip if task already exists
        if (existingTitles.includes(task.title)) {
          console.log(`Skipping duplicate: ${task.title}`);
          continue;
        }

        // Determine who to assign to
        let userId = landonId;
        let assignedTo = '';
        let assignedToName = '';

        if (task.assignTo === 'lidani' && lidaniId) {
          // Create as Landon, assign to Lidani
          userId = landonId;
          assignedTo = lidaniId;
          assignedToName = 'Lidani';
        } else if (task.assignTo === 'xander' && xanderId) {
          // Create as Landon, assign to Xander
          userId = landonId;
          assignedTo = xanderId;
          assignedToName = 'Xander';
        } else if (task.assignTo === 'all') {
          // Create for Landon (he can share with team)
          userId = landonId;
        }

        const taskData = {
          userId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: 'pending',
          dueDate: TOMORROW,
          dueTime: task.dueTime,
          category: task.category,
          assignedTo,
          assignedToName,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        await addDoc(collection(db, 'personalTasks'), taskData);
        count++;
      }

      setSeededCount(count);
      setMessage({
        type: 'success',
        text: `Successfully created ${count} tasks for tomorrow (${TOMORROW})!`
      });
    } catch (error: any) {
      console.error('Error seeding tasks:', error);
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  if (userProfile?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          Only admins can access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Seed Onboarding Tasks</h1>
      <p className="text-gray-600 mb-6">
        Create tomorrow's onboarding task list for the sales rep and detailing van setup.
      </p>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Tasks to Create ({ONBOARDING_TASKS.length} total)
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Date: Tuesday, January 27, 2026 | Time: 8:00 AM - 2:00 PM
        </p>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {ONBOARDING_TASKS.map((task, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-mono text-gray-500 w-14">
                {task.dueTime}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{task.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {task.priority}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    {task.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Assigned to: {task.assignTo === 'landon' ? 'Landon' :
                              task.assignTo === 'lidani' ? 'Lidani' :
                              task.assignTo === 'xander' ? 'Xander' :
                              task.assignTo === 'all' ? 'Team' : 'Self'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={seedTasks}
        disabled={loading}
        className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating Tasks...' : 'Create All Tasks'}
      </button>

      {seededCount > 0 && (
        <p className="text-center text-sm text-gray-500 mt-4">
          Go to <a href="/admin/workspace" className="text-emerald-600 hover:underline">Workspace</a> to view your tasks.
        </p>
      )}
    </div>
  );
}
