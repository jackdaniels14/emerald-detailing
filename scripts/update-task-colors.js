// Update existing tasks with assignee colors
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');

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

// Employee colors
const EMPLOYEE_COLORS = {
  'lidanib_11@icloud.com': '#ec4899', // pink
  'xanderpsakda@gmail.com': '#3b82f6', // blue
  'gracehelland44@gmail.com': '#ec4899', // pink
  'landong@griffithind.com': '#10b981', // emerald
};

async function main() {
  console.log('Signing in as admin...');
  await signInWithEmailAndPassword(auth, 'landong@griffithind.com', 'JackDaniels1024');

  // Wait a moment for auth to propagate
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Signed in.');

  // Get user ID to email mapping
  console.log('Fetching users...');
  const usersSnap = await getDocs(collection(db, 'users'));
  const userIdToEmail = new Map();
  usersSnap.docs.forEach(d => {
    userIdToEmail.set(d.id, d.data().email);
  });

  // Get only my tasks (created by me)
  console.log('Fetching my tasks...');
  const currentUser = auth.currentUser;
  const tasksSnap = await getDocs(
    query(collection(db, 'personalTasks'), where('userId', '==', currentUser.uid))
  );

  let updated = 0;
  for (const taskDoc of tasksSnap.docs) {
    const task = taskDoc.data();
    if (task.assignedTo && !task.assignedToColor) {
      const assigneeEmail = userIdToEmail.get(task.assignedTo);
      const color = EMPLOYEE_COLORS[assigneeEmail];

      if (color) {
        await updateDoc(doc(db, 'personalTasks', taskDoc.id), {
          assignedToColor: color
        });
        console.log(`Updated: ${task.title} -> ${color}`);
        updated++;
      }
    }
  }

  console.log(`\nUpdated ${updated} tasks with colors.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
