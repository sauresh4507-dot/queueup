// Backend/scripts/seedUsers.js
import AuthModel from '../models/Auth.js';
import db from '../config/database.js';

async function createUserSafely(username, password, role, name, email, department = null) {
  try {
    await AuthModel.createUser(username, password, role, name, email, department);
    return true;
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return false; // User already exists
    }
    throw err; // Re-throw other errors
  }
}

async function seedUsers() {
  console.log('🌱 Seeding default users...');

  try {
    // Initialize database first
    await db.initialize();
    
    console.log('📝 Creating users (skipping duplicates)...\n');
    let created = 0;
    let skipped = 0;

    // Create students
    if (await createUserSafely('student1', 'password123', 'student', 'Alice Johnson', 'alice@university.edu', null)) created++; else skipped++;
    if (await createUserSafely('student2', 'password123', 'student', 'Bob Smith', 'bob@university.edu', null)) created++; else skipped++;
    if (await createUserSafely('student3', 'password123', 'student', 'Carol White', 'carol@university.edu', null)) created++; else skipped++;

    // Create teachers
    if (await createUserSafely('teacher1', 'password123', 'teacher', 'Dr. Emily Brown', 'emily.brown@university.edu', 'Computer Science')) created++; else skipped++;
    if (await createUserSafely('teacher2', 'password123', 'teacher', 'Prof. Michael Davis', 'michael.davis@university.edu', 'Mathematics')) created++; else skipped++;
    if (await createUserSafely('teacher3', 'password123', 'teacher', 'Dr. Sarah Wilson', 'sarah.wilson@university.edu', 'Physics')) created++; else skipped++;
    if (await createUserSafely('teacher4', 'password123', 'teacher', 'Prof. James Taylor', 'james.taylor@university.edu', 'English Literature')) created++; else skipped++;

    // Create Chancellors
    if (await createUserSafely('chancellor1', 'password123', 'teacher', 'Chancellor Dr. Robert Anderson', 'chancellor@university.edu', 'Administration')) created++; else skipped++;
    if (await createUserSafely('chancellor2', 'password123', 'teacher', 'Vice Chancellor Dr. Patricia Martinez', 'vc@university.edu', 'Administration')) created++; else skipped++;

    // Create HODs (Heads of Department)
    if (await createUserSafely('hod_cs', 'password123', 'teacher', 'HOD Prof. David Chen', 'hod.cs@university.edu', 'Computer Science')) created++; else skipped++;
    if (await createUserSafely('hod_math', 'password123', 'teacher', 'HOD Prof. Jennifer Lee', 'hod.math@university.edu', 'Mathematics')) created++; else skipped++;
    if (await createUserSafely('hod_physics', 'password123', 'teacher', 'HOD Prof. Richard Kumar', 'hod.physics@university.edu', 'Physics')) created++; else skipped++;
    if (await createUserSafely('hod_english', 'password123', 'teacher', 'HOD Prof. Lisa Thompson', 'hod.english@university.edu', 'English Literature')) created++; else skipped++;
    if (await createUserSafely('hod_chemistry', 'password123', 'teacher', 'HOD Prof. Mark Rodriguez', 'hod.chemistry@university.edu', 'Chemistry')) created++; else skipped++;
    if (await createUserSafely('hod_economics', 'password123', 'teacher', 'HOD Prof. Susan Kim', 'hod.economics@university.edu', 'Economics')) created++; else skipped++;

    // Create more College Teachers
    if (await createUserSafely('teacher5', 'password123', 'teacher', 'Dr. Thomas Walker', 'thomas.walker@university.edu', 'Chemistry')) created++; else skipped++;
    if (await createUserSafely('teacher6', 'password123', 'teacher', 'Prof. Maria Garcia', 'maria.garcia@university.edu', 'Economics')) created++; else skipped++;
    if (await createUserSafely('teacher7', 'password123', 'teacher', 'Dr. Kevin Patel', 'kevin.patel@university.edu', 'Computer Science')) created++; else skipped++;
    if (await createUserSafely('teacher8', 'password123', 'teacher', 'Prof. Amanda White', 'amanda.white@university.edu', 'Mathematics')) created++; else skipped++;
    if (await createUserSafely('teacher9', 'password123', 'teacher', 'Dr. Daniel Kim', 'daniel.kim@university.edu', 'Physics')) created++; else skipped++;
    if (await createUserSafely('teacher10', 'password123', 'teacher', 'Prof. Rachel Green', 'rachel.green@university.edu', 'English Literature')) created++; else skipped++;
    if (await createUserSafely('teacher11', 'password123', 'teacher', 'Dr. Chris Johnson', 'chris.johnson@university.edu', 'Computer Science')) created++; else skipped++;
    if (await createUserSafely('teacher12', 'password123', 'teacher', 'Prof. Laura Brown', 'laura.brown@university.edu', 'Chemistry')) created++; else skipped++;

    // Create organizations
    if (await createUserSafely('org1', 'password123', 'organization', 'Tech Club', 'techclub@university.edu', 'Student Organizations')) created++; else skipped++;
    if (await createUserSafely('org2', 'password123', 'organization', 'Drama Society', 'drama@university.edu', 'Student Organizations')) created++; else skipped++;
    if (await createUserSafely('org3', 'password123', 'organization', 'Debate Club', 'debate@university.edu', 'Student Organizations')) created++; else skipped++;

    // Create admin
    if (await createUserSafely('admin', 'admin123', 'admin', 'System Administrator', 'admin@university.edu', 'Administration')) created++; else skipped++;

    console.log(`\n✅ User seeding complete!`);
    console.log(`   Created: ${created} new users`);
    console.log(`   Skipped: ${skipped} existing users`);
    console.log('\n📋 Login Credentials:');
    console.log('┌─────────────────────────────────────────────┐');
    console.log('│ STUDENTS:                                   │');
    console.log('│ student1 / password123 (Alice Johnson)      │');
    console.log('│ student2 / password123 (Bob Smith)          │');
    console.log('│ student3 / password123 (Carol White)        │');
    console.log('├─────────────────────────────────────────────┤');
    console.log('│ CHANCELLORS:                                │');
    console.log('│ chancellor1 / password123 (Dr. Robert Anderson)│');
    console.log('│ chancellor2 / password123 (Dr. Patricia Martinez)│');
    console.log('├─────────────────────────────────────────────┤');
    console.log('│ HODs (Heads of Department):                 │');
    console.log('│ hod_cs / password123 (Prof. David Chen)     │');
    console.log('│ hod_math / password123 (Prof. Jennifer Lee) │');
    console.log('│ hod_physics / password123 (Prof. Richard Kumar)│');
    console.log('│ hod_english / password123 (Prof. Lisa Thompson)│');
    console.log('│ hod_chemistry / password123 (Prof. Mark Rodriguez)│');
    console.log('│ hod_economics / password123 (Prof. Susan Kim)│');
    console.log('├─────────────────────────────────────────────┤');
    console.log('│ COLLEGE TEACHERS:                           │');
    console.log('│ teacher1 / password123 (Dr. Emily Brown)    │');
    console.log('│ teacher2 / password123 (Prof. Michael Davis)│');
    console.log('│ teacher3 / password123 (Dr. Sarah Wilson)   │');
    console.log('│ teacher4 / password123 (Prof. James Taylor) │');
    console.log('│ teacher5 / password123 (Dr. Thomas Walker)  │');
    console.log('│ teacher6 / password123 (Prof. Maria Garcia)  │');
    console.log('│ teacher7 / password123 (Dr. Kevin Patel)    │');
    console.log('│ teacher8 / password123 (Prof. Amanda White) │');
    console.log('│ teacher9 / password123 (Dr. Daniel Kim)     │');
    console.log('│ teacher10 / password123 (Prof. Rachel Green)│');
    console.log('│ teacher11 / password123 (Dr. Chris Johnson) │');
    console.log('│ teacher12 / password123 (Prof. Laura Brown) │');
    console.log('├─────────────────────────────────────────────┤');
    console.log('│ ORGANIZATIONS:                              │');
    console.log('│ org1 / password123 (Tech Club)              │');
    console.log('│ org2 / password123 (Drama Society)          │');
    console.log('│ org3 / password123 (Debate Club)            │');
    console.log('├─────────────────────────────────────────────┤');
    console.log('│ ADMIN:                                      │');
    console.log('│ admin / admin123 (System Administrator)     │');
    console.log('└─────────────────────────────────────────────┘\n');

  } catch (err) {
    console.error('❌ Error seeding users:', err);
  } finally {
    process.exit(0);
  }
}

seedUsers();