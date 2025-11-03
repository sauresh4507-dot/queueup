// Backend/scripts/seedSlots.js
import SlotBookingModel from '../models/SlotBooking.js';
import AuthModel from '../models/Auth.js';
import db from '../config/database.js';

async function generateTimeSlots(startHour = 9, endHour = 17, intervalMinutes = 60) {
  const slots = [];
  const startTime = startHour * 60; // Convert to minutes
  const endTime = endHour * 60;
  
  for (let time = startTime; time < endTime; time += intervalMinutes) {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    const startTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    
    const nextTime = time + intervalMinutes;
    const nextHours = Math.floor(nextTime / 60);
    const nextMinutes = nextTime % 60;
    const endTimeStr = `${nextHours.toString().padStart(2, '0')}:${nextMinutes.toString().padStart(2, '0')}:00`;
    
    slots.push({
      startTime: startTimeStr,
      endTime: endTimeStr,
      capacity: 1 // Each slot can have 1 booking
    });
  }
  
  return slots;
}

async function seedSlots() {
  console.log('🎫 Generating slots for all teachers...');

  try {
    // Initialize database first
    await db.initialize();

    // Get all teachers
    const teachers = await AuthModel.getAllTeachers();
    
    if (teachers.length === 0) {
      console.log('⚠️  No teachers found. Please seed users first with: npm run seed');
      return;
    }

    // Generate dates for next 30 days
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]); // Format: YYYY-MM-DD
    }

    // Generate time slots (9am to 5pm, hourly)
    const timeSlots = await generateTimeSlots(9, 17, 60); // 9am-5pm, 1 hour intervals

    console.log(`📅 Generating slots for ${teachers.length} teachers`);
    console.log(`📆 Dates: ${dates.length} days (${dates[0]} to ${dates[dates.length - 1]})`);
    console.log(`⏰ Time slots per day: ${timeSlots.length} (${timeSlots[0].startTime} to ${timeSlots[timeSlots.length - 1].endTime})`);

    let totalSlotsCreated = 0;

    // Create slots for each teacher
    for (const teacher of teachers) {
      let teacherSlotsCreated = 0;
      
      for (const date of dates) {
        // Check if slots already exist for this teacher and date
        const existingSlots = await db.all(
          'SELECT COUNT(*) as count FROM time_slots WHERE teacher_id = ? AND date = ?',
          [teacher.id, date]
        );
        
        if (existingSlots[0].count > 0) {
          continue; // Skip if slots already exist
        }
        
        // Create slots for this date
        await SlotBookingModel.createTeacherSlots(teacher.id, date, timeSlots);
        teacherSlotsCreated += timeSlots.length;
      }
      
      totalSlotsCreated += teacherSlotsCreated;
      if (teacherSlotsCreated > 0) {
        console.log(`✓ Created ${teacherSlotsCreated} slots for ${teacher.name}`);
      }
    }

    console.log(`\n✅ Successfully created ${totalSlotsCreated} slots across ${teachers.length} teachers`);
    console.log(`📊 Average: ${Math.round(totalSlotsCreated / teachers.length)} slots per teacher\n`);

  } catch (err) {
    console.error('❌ Error seeding slots:', err);
  } finally {
    process.exit(0);
  }
}

seedSlots();

