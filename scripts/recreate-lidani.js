// Recreate Lidani's account
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, doc, setDoc, Timestamp } = require('firebase/firestore');

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

const lidaniData = {
  email: 'lidanib_11@icloud.com',
  password: '08112006',
  firstName: 'Lidani',
  lastName: '',
  phone: '',
  role: 'sales_rep',
  hourlyRate: 15.00,
  commissionRate: 0.40,
  scheduleColor: '#ec4899', // pink
  hireDate: '2026-01-26',
};

async function main() {
  console.log('=== RECREATING LIDANI ACCOUNT ===\n');

  // Create auth account
  console.log('1. Creating auth account...');
  let uid;
  try {
    const userCred = await createUserWithEmailAndPassword(auth, lidaniData.email, lidaniData.password);
    uid = userCred.user.uid;
    console.log('   Auth account created.');
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('   Account exists, signing in...');
      const signIn = await signInWithEmailAndPassword(auth, lidaniData.email, lidaniData.password);
      uid = signIn.user.uid;
    } else {
      throw err;
    }
  }
  console.log(`   UID: ${uid}`);

  // Sign in as admin to create records
  console.log('\n2. Signing in as admin...');
  await signInWithEmailAndPassword(auth, 'landong@griffithind.com', 'JackDaniels1024');
  await new Promise(r => setTimeout(r, 1000));
  console.log('   Signed in as admin.');

  // Create user profile
  console.log('\n3. Creating user profile...');
  await setDoc(doc(db, 'users', uid), {
    uid,
    email: lidaniData.email,
    firstName: lidaniData.firstName,
    lastName: lidaniData.lastName,
    phone: lidaniData.phone,
    role: lidaniData.role,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log('   User profile created.');

  // Create employee record
  console.log('\n4. Creating employee record...');
  await addDoc(collection(db, 'employees'), {
    email: lidaniData.email,
    firstName: lidaniData.firstName,
    lastName: lidaniData.lastName,
    phone: lidaniData.phone,
    role: lidaniData.role,
    hourlyRate: lidaniData.hourlyRate,
    commissionRate: lidaniData.commissionRate,
    scheduleColor: lidaniData.scheduleColor,
    hireDate: lidaniData.hireDate,
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log('   Employee record created.');

  console.log('\n=== COMPLETE ===');
  console.log(`Email: ${lidaniData.email}`);
  console.log(`Password: ${lidaniData.password}`);
  console.log(`Role: ${lidaniData.role}`);
  console.log(`UID: ${uid}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
