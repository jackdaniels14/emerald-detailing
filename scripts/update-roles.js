const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with default credentials (uses GOOGLE_APPLICATION_CREDENTIALS or gcloud auth)
initializeApp({
  projectId: 'emerald-7a45f'
});

const db = getFirestore();

async function listUsers() {
  console.log('\n=== USERS ===');
  const usersSnapshot = await db.collection('users').get();

  if (usersSnapshot.empty) {
    console.log('No users found in database.');
    return [];
  }

  const users = [];
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    users.push({ id: doc.id, ...data });
    console.log(`ID: ${doc.id}`);
    console.log(`  Name: ${data.firstName} ${data.lastName}`);
    console.log(`  Email: ${data.email}`);
    console.log(`  Current Role: ${data.role}`);
    console.log('---');
  });

  return users;
}

async function listEmployees() {
  console.log('\n=== EMPLOYEES ===');
  const employeesSnapshot = await db.collection('employees').get();

  if (employeesSnapshot.empty) {
    console.log('No employees found in database.');
    return [];
  }

  const employees = [];
  employeesSnapshot.forEach(doc => {
    const data = doc.data();
    employees.push({ id: doc.id, ...data });
    console.log(`ID: ${doc.id}`);
    console.log(`  Name: ${data.firstName} ${data.lastName}`);
    console.log(`  Email: ${data.email}`);
    console.log(`  Current Role: ${data.role}`);
    console.log('---');
  });

  return employees;
}

async function updateUserRole(userId, newRole) {
  const validRoles = ['admin', 'office_desk', 'sales_rep', 'detailing_tech', 'client'];
  if (!validRoles.includes(newRole)) {
    console.error(`Invalid role: ${newRole}. Must be one of: ${validRoles.join(', ')}`);
    return false;
  }

  try {
    await db.collection('users').doc(userId).update({ role: newRole });
    console.log(`Updated user ${userId} to role: ${newRole}`);
    return true;
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error.message);
    return false;
  }
}

async function updateEmployeeRole(employeeId, newRole) {
  const validRoles = ['admin', 'office_desk', 'sales_rep', 'detailing_tech'];
  if (!validRoles.includes(newRole)) {
    console.error(`Invalid role: ${newRole}. Must be one of: ${validRoles.join(', ')}`);
    return false;
  }

  try {
    await db.collection('employees').doc(employeeId).update({ role: newRole });
    console.log(`Updated employee ${employeeId} to role: ${newRole}`);
    return true;
  } catch (error) {
    console.error(`Error updating employee ${employeeId}:`, error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // List all users and employees
    await listUsers();
    await listEmployees();
  } else if (args[0] === 'update-user' && args.length === 3) {
    // Update user role: node update-roles.js update-user <userId> <newRole>
    await updateUserRole(args[1], args[2]);
  } else if (args[0] === 'update-employee' && args.length === 3) {
    // Update employee role: node update-roles.js update-employee <employeeId> <newRole>
    await updateEmployeeRole(args[1], args[2]);
  } else {
    console.log('Usage:');
    console.log('  List all: node update-roles.js');
    console.log('  Update user: node update-roles.js update-user <userId> <newRole>');
    console.log('  Update employee: node update-roles.js update-employee <employeeId> <newRole>');
    console.log('\nValid roles for users: admin, office_desk, sales_rep, detailing_tech, client');
    console.log('Valid roles for employees: admin, office_desk, sales_rep, detailing_tech');
  }

  process.exit(0);
}

main().catch(console.error);
