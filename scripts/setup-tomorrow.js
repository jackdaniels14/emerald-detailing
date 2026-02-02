// Setup script for tomorrow's onboarding
// Run with: node scripts/setup-tomorrow.js

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, getDocs, doc, setDoc, query, where, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDpaph4ZVGtGCkaVlWrDD1vQtqCIBiKnXA",
  authDomain: "emerald-7a45f.firebaseapp.com",
  projectId: "emerald-7a45f",
  storageBucket: "emerald-7a45f.firebasestorage.app",
  messagingSenderId: "807990028348",
  appId: "1:807990028348:web:d6ef3e0ef4385bad947b39"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TOMORROW = '2026-01-27';

// Xander's info
const xanderData = {
  email: 'xanderpsakda@gmail.com',
  password: 'xander5683',
  firstName: 'Xander',
  lastName: 'Psakda',
  phone: '2539516730',
  role: 'detailing_tech',
  hourlyRate: 18.98,
  commissionRate: 0.40,
  scheduleColor: '#3b82f6',
  hireDate: '2026-01-27',
};

// Tasks for tomorrow
const TASKS = [
  { title: 'Team morning briefing', description: 'Meet with Lidani and Xander to go over the day\'s onboarding schedule, expectations, and goals. Cover company policies, dress code, and professionalism standards.', priority: 'high', dueTime: '08:00', category: 'Onboarding', assignTo: 'landon' },
  { title: 'Complete employee paperwork - Lidani', description: 'Fill out all remaining onboarding documents including W-4, I-9, direct deposit forms, and emergency contact information.', priority: 'high', dueTime: '08:30', category: 'Onboarding', assignTo: 'lidani' },
  { title: 'Complete employee paperwork - Xander', description: 'Fill out all remaining onboarding documents including W-4, I-9, direct deposit forms, and emergency contact information.', priority: 'high', dueTime: '08:30', category: 'Onboarding', assignTo: 'xander' },
  { title: 'Review employee handbook - Lidani', description: 'Go through company policies, safety procedures, customer service standards, and expectations. Sign acknowledgment forms.', priority: 'medium', dueTime: '09:00', category: 'Onboarding', assignTo: 'lidani' },
  { title: 'Review employee handbook - Xander', description: 'Go through company policies, safety procedures, customer service standards, and expectations. Sign acknowledgment forms.', priority: 'medium', dueTime: '09:00', category: 'Onboarding', assignTo: 'xander' },
  { title: 'App and system training - Lidani', description: 'Train on the Emerald Detailing app: logging in, clocking in/out, viewing schedule, checking assigned jobs, and using the workspace.', priority: 'high', dueTime: '09:00', category: 'Training', assignTo: 'lidani' },
  { title: 'App and system training - Xander', description: 'Train on the Emerald Detailing app: logging in, clocking in/out, viewing schedule, checking assigned jobs, and using the workspace.', priority: 'high', dueTime: '09:00', category: 'Training', assignTo: 'xander' },
  { title: 'Verify employee login credentials', description: 'Verify Lidani and Xander can log into the app, test clock in/out functionality, and ensure all permissions are working correctly.', priority: 'high', dueTime: '09:30', category: 'Setup', assignTo: 'landon' },
  { title: 'Inventory detailing supplies', description: 'Take inventory of all detailing supplies, chemicals, and equipment. Create a checklist of what\'s available and what needs to be ordered.', priority: 'high', dueTime: '10:00', category: 'Van Setup', assignTo: 'all' },
  { title: 'Organize detailing van storage', description: 'Set up storage bins, organize chemicals (keep separate from towels), arrange tools for easy access. Label everything clearly.', priority: 'high', dueTime: '10:30', category: 'Van Setup', assignTo: 'all' },
  { title: 'Check van equipment functionality', description: 'Test pressure washer, vacuum, steamer, polisher, and all other equipment. Note any items needing repair or replacement.', priority: 'high', dueTime: '11:00', category: 'Van Setup', assignTo: 'xander' },
  { title: 'Stock water tank', description: 'Fill the van\'s water tank. Check for leaks. Verify water pump is working properly.', priority: 'medium', dueTime: '11:15', category: 'Van Setup', assignTo: 'xander' },
  { title: 'Learn product knowledge - Lidani', description: 'Review all detailing products: what each chemical does, dilution ratios, safety precautions, and proper application techniques.', priority: 'high', dueTime: '11:30', category: 'Training', assignTo: 'lidani' },
  { title: 'Learn product knowledge - Xander', description: 'Review all detailing products: what each chemical does, dilution ratios, safety precautions, and proper application techniques.', priority: 'high', dueTime: '11:30', category: 'Training', assignTo: 'xander' },
  { title: 'Practice detailing techniques - Xander', description: 'Hands-on training: proper washing technique, clay bar use, polish application, interior cleaning process, and final inspection standards.', priority: 'high', dueTime: '12:00', category: 'Training', assignTo: 'xander' },
  { title: 'Lunch break', description: 'Take a 30-minute lunch break.', priority: 'low', dueTime: '12:30', category: 'Break', assignTo: 'all' },
  { title: 'Review service packages and pricing - Lidani', description: 'Go over all service packages (Express, Premium), add-ons, pricing structure, and how to explain value to customers.', priority: 'high', dueTime: '13:00', category: 'Training', assignTo: 'lidani' },
  { title: 'Review service packages and pricing - Xander', description: 'Go over all service packages (Express, Premium), add-ons, pricing structure, and how to explain value to customers.', priority: 'high', dueTime: '13:00', category: 'Training', assignTo: 'xander' },
  { title: 'Customer service training - Lidani', description: 'Review customer interaction standards: greeting customers, handling complaints, upselling techniques, and maintaining professionalism.', priority: 'high', dueTime: '13:30', category: 'Training', assignTo: 'lidani' },
  { title: 'Customer service training - Xander', description: 'Review customer interaction standards: greeting customers, handling complaints, upselling techniques, and maintaining professionalism.', priority: 'high', dueTime: '13:30', category: 'Training', assignTo: 'xander' },
  { title: 'End of day review', description: 'Recap the day\'s training, answer any questions, discuss tomorrow\'s schedule, and set expectations for the first real job.', priority: 'medium', dueTime: '14:00', category: 'Onboarding', assignTo: 'all' },
  { title: 'Create supply order list', description: 'Based on inventory, create a list of supplies that need to be ordered. Include chemicals, towels, brushes, and any equipment repairs needed.', priority: 'medium', dueTime: '14:00', category: 'Admin', assignTo: 'landon' },
];

async function main() {
  console.log('=== EMERALD DETAILING SETUP SCRIPT ===\n');

  // Step 1: Sign in as admin first
  console.log('1. Signing in as admin...');
  await signInWithEmailAndPassword(auth, 'landong@griffithind.com', 'JackDaniels1024');
  console.log('   Signed in as admin.\n');

  // Step 2: Create Xander's account
  console.log('2. Creating Xander\'s account...');
  let xanderId;
  try {
    const userCred = await createUserWithEmailAndPassword(auth, xanderData.email, xanderData.password);
    xanderId = userCred.user.uid;
    console.log('   Auth account created.');
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('   Account already exists, signing in...');
      const signIn = await signInWithEmailAndPassword(auth, xanderData.email, xanderData.password);
      xanderId = signIn.user.uid;
    } else {
      throw err;
    }
  }

  // Sign back in as admin to create records
  await signInWithEmailAndPassword(auth, 'landong@griffithind.com', 'JackDaniels1024');
  console.log('   Signed back in as admin.');

  // Create user profile
  await setDoc(doc(db, 'users', xanderId), {
    uid: xanderId,
    email: xanderData.email,
    firstName: xanderData.firstName,
    lastName: xanderData.lastName,
    phone: xanderData.phone,
    role: xanderData.role,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log('   User profile created.');

  // Create employee record
  await addDoc(collection(db, 'employees'), {
    email: xanderData.email,
    firstName: xanderData.firstName,
    lastName: xanderData.lastName,
    phone: xanderData.phone,
    role: xanderData.role,
    hourlyRate: xanderData.hourlyRate,
    commissionRate: xanderData.commissionRate,
    scheduleColor: xanderData.scheduleColor,
    hireDate: xanderData.hireDate,
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log('   Employee record created.');
  console.log(`   Xander ID: ${xanderId}\n`);

  // Sign back in as admin
  await signInWithEmailAndPassword(auth, 'landong@griffithind.com', 'JackDaniels1024');

  // Step 3: Get user IDs
  console.log('3. Getting user IDs...');
  const usersSnap = await getDocs(collection(db, 'users'));
  let landonId = '', lidaniId = '';

  usersSnap.docs.forEach(d => {
    const data = d.data();
    if (data.email === 'landong@griffithind.com') landonId = d.id;
    if (data.email === 'lidanib_11@icloud.com') lidaniId = d.id;
  });

  console.log(`   Landon ID: ${landonId}`);
  console.log(`   Lidani ID: ${lidaniId}`);
  console.log(`   Xander ID: ${xanderId}\n`);

  // Step 4: Check for existing tasks
  console.log('4. Checking for existing tasks...');
  const existingSnap = await getDocs(
    query(collection(db, 'personalTasks'), where('userId', '==', landonId), where('dueDate', '==', TOMORROW))
  );
  const existingTitles = existingSnap.docs.map(d => d.data().title);
  console.log(`   Found ${existingTitles.length} existing tasks for tomorrow.\n`);

  // Step 5: Create tasks
  console.log('5. Creating tasks...');
  let created = 0;
  let skipped = 0;

  for (const task of TASKS) {
    if (existingTitles.includes(task.title)) {
      skipped++;
      continue;
    }

    let assignedTo = '';
    let assignedToName = '';

    if (task.assignTo === 'lidani' && lidaniId) {
      assignedTo = lidaniId;
      assignedToName = 'Lidani';
    } else if (task.assignTo === 'xander' && xanderId) {
      assignedTo = xanderId;
      assignedToName = 'Xander';
    }

    await addDoc(collection(db, 'personalTasks'), {
      userId: landonId,
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
    });
    created++;
    console.log(`   + ${task.title}`);
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Created: ${created} tasks`);
  console.log(`Skipped: ${skipped} duplicates`);
  console.log(`\nXander's login:`);
  console.log(`  Email: ${xanderData.email}`);
  console.log(`  Password: ${xanderData.password}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
