// Client Import Script for Emerald Detailing
// Run this with: node scripts/import-clients.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

// Firebase config (same as your app)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBdpSvSPo0Fbaozs-V2R9BaTkJ4BE9xKyk",
  authDomain: "emerald-7a45f.firebaseapp.com",
  projectId: "emerald-7a45f",
  storageBucket: "emerald-7a45f.firebasestorage.app",
  messagingSenderId: "346042498498",
  appId: "1:346042498498:web:07c4768a65e4619f53ef4d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Clients from CSV export
const clients = [
  {
    firstName: "Tyler",
    lastName: "Hancock",
    email: "tyhancock34@gmail.com",
    phone: "206-795-5732",
    address: "19720 1st Pl SW, Normandy Park, WA 98166",
  },
  {
    firstName: "Greg",
    lastName: "Laroche",
    email: "gl53950@gmail.com",
    phone: "805-870-5842",
    address: "125 SW 202nd Street, Normandy Park, WA",
  },
  {
    firstName: "Nick",
    lastName: "",
    email: "ngrigway7@gmail.com",
    phone: "253-431-3312",
    address: "",
  },
  {
    firstName: "Gail",
    lastName: "Thompson",
    email: "gail@junebugssauce.com",
    phone: "541-854-0156",
    address: "32552 30th Ave SW, Federal Way, WA 98023",
  },
  {
    firstName: "Troy",
    lastName: "Demark",
    email: "t.demark@comcast.net",
    phone: "206-595-6757",
    address: "",
  },
  {
    firstName: "Sherri",
    lastName: "Baker",
    email: "kiwismom2@gmail.com",
    phone: "206-334-8026",
    address: "",
  },
  {
    firstName: "Tim",
    lastName: "",
    email: "tgiamatti@gmail.com",
    phone: "206-747-0050",
    address: "27611 10th Ave S, Des Moines, WA 98198",
  },
  {
    firstName: "K.A.",
    lastName: "Pendergrass",
    email: "pksbills@comcast.net",
    phone: "206-277-9659",
    address: "",
  },
  {
    firstName: "Richard",
    lastName: "Hill",
    email: "llllll@gmail.com",
    phone: "206-953-1580",
    address: "11243 4th Pl S, Seattle, WA 98168",
  },
  {
    firstName: "Jaysen",
    lastName: "Buffington",
    email: "veronicabuffington@hotmail.com",
    phone: "253-227-0810",
    address: "27820 10th Ave S, Des Moines, WA 98198",
  },
];

async function importClients() {
  console.log('Starting client import...\n');

  for (const client of clients) {
    try {
      const clientData = {
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        address: client.address,
        notes: "",
        subscriptionStatus: "none",
        vehicles: [
          {
            id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            year: "N/A",
            make: "To Be Verified",
            model: "To Be Verified",
            type: "sedan",
            color: "",
            licensePlate: "",
            notes: "Vehicle info pending verification",
          }
        ],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'clients'), clientData);
      console.log(`✓ Added: ${client.firstName} ${client.lastName} (${client.email}) - ID: ${docRef.id}`);
    } catch (error) {
      console.error(`✗ Failed to add ${client.firstName} ${client.lastName}:`, error.message);
    }
  }

  console.log('\n--- Import Complete ---');
  console.log(`Total clients processed: ${clients.length}`);
  process.exit(0);
}

importClients();
