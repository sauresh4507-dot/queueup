// Backend/models/SlotBooking.js
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

class SlotBookingModel {
  // Create time slots for a service or teacher
  async createSlots(serviceId, date, slots) {
    try {
      const results = [];
      for (const slot of slots) {
        const slotId = uuidv4();
        await db.run(
          `INSERT INTO time_slots 
           (id, service_id, date, start_time, end_time, capacity, booked_count, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [slotId, serviceId, date, slot.startTime, slot.endTime, slot.capacity || 1, 0, 'available']
        );
        results.push(slotId);
      }
      return results;
    } catch (err) {
      console.error('Error creating slots:', err);
      throw err;
    }
  }

  // Create time slots for a teacher (alternative method)
  async createTeacherSlots(teacherId, date, slots) {
    try {
      console.log('🆕 createTeacherSlots called with:', { teacherId, date, slotCount: slots.length });
      const results = [];
      for (const slot of slots) {
        const slotId = uuidv4();
        await db.run(
          `INSERT INTO time_slots 
           (id, teacher_id, date, start_time, end_time, capacity, booked_count, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [slotId, teacherId, date, slot.startTime, slot.endTime, slot.capacity || 1, 0, 'available']
        );
        console.log('✅ Created slot:', { slotId, teacherId, date, startTime: slot.startTime, endTime: slot.endTime });
        results.push(slotId);
      }
      console.log('✅ Successfully created', results.length, 'slots for teacher', teacherId);
      return results;
    } catch (err) {
      console.error('Error creating teacher slots:', err);
      throw err;
    }
  }

  // Get available slots for a service and date
  async getAvailableSlots(serviceId, date) {
    try {
      const slots = await db.all(
        `SELECT * FROM time_slots 
         WHERE service_id = ? AND date = ? AND status = 'available' 
         ORDER BY start_time ASC`,
        [serviceId, date]
      );
      return slots;
    } catch (err) {
      console.error('Error getting slots:', err);
      throw err;
    }
  }

  async bookSlot(slotId, userId, purpose) {
    try {
      const bookingId = uuidv4();
      
      // Check if slot is available - support both service_id and teacher_id schemas
      const slot = await db.get(
        `SELECT ts.*, COALESCE(u.name, s.name) as provider_name 
         FROM time_slots ts
         LEFT JOIN users u ON ts.teacher_id = u.id
         LEFT JOIN services s ON ts.service_id = s.id
         WHERE ts.id = ? AND ts.status = 'available'`,
        [slotId]
      );

      if (!slot) {
        throw new Error('Slot not available');
      }

      if (slot.booked_count >= slot.capacity) {
        throw new Error('Slot is full');
      }

      // Create booking - support both student_id and user_id schemas
      try {
        await db.run(
          `INSERT INTO slot_bookings 
           (id, slot_id, student_id, purpose, status) 
           VALUES (?, ?, ?, ?, ?)`,
          [bookingId, slotId, userId, purpose || '', 'confirmed']
        );
      } catch (err) {
        // Fallback to user_id schema if student_id doesn't exist
        if (err.message.includes('no such column: student_id')) {
          await db.run(
            `INSERT INTO slot_bookings 
             (id, slot_id, user_id, user_type, purpose, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [bookingId, slotId, userId, 'student', purpose || '', 'confirmed']
          );
        } else {
          throw err;
        }
      }

      // Update slot booked count
      const newCount = slot.booked_count + 1;
      const newStatus = newCount >= slot.capacity ? 'booked' : 'available';
      
      await db.run(
        'UPDATE time_slots SET booked_count = ?, status = ? WHERE id = ?',
        [newCount, newStatus, slotId]
      );

      return { bookingId, slot };
    } catch (err) {
      console.error('Error booking slot:', err);
      throw err;
    }
  }

  async getTeacherAppointments(teacherId) {
    try {
      const appointments = await db.all(
        `SELECT sb.*, ts.*, u.name as student_name, u.email as student_email 
         FROM slot_bookings sb
         JOIN time_slots ts ON sb.slot_id = ts.id
         JOIN users u ON COALESCE(sb.student_id, sb.user_id) = u.id
         WHERE ts.teacher_id = ? AND sb.status = 'confirmed'
         ORDER BY ts.date ASC, ts.start_time ASC`,
        [teacherId]
      );
      return appointments;
    } catch (err) {
      console.error('Error getting appointments:', err);
      throw err;
    }
  }

  async getStudentBookings(studentId) {
    try {
      const bookings = await db.all(
        `SELECT sb.*, ts.*, u.name as teacher_name, u.department 
         FROM slot_bookings sb
         JOIN time_slots ts ON sb.slot_id = ts.id
         JOIN users u ON ts.teacher_id = u.id
         WHERE COALESCE(sb.student_id, sb.user_id) = ? AND sb.status != 'cancelled'
         ORDER BY ts.date DESC, ts.start_time DESC`,
        [studentId]
      );
      return bookings;
    } catch (err) {
      console.error('Error getting bookings:', err);
      throw err;
    }
  }

  // Get user bookings
  async getUserBookings(userId) {
    try {
      const bookings = await db.all(
        `SELECT sb.*, ts.*, s.name as service_name 
         FROM slot_bookings sb
         JOIN time_slots ts ON sb.slot_id = ts.id
         LEFT JOIN services s ON ts.service_id = s.id
         WHERE COALESCE(sb.user_id, sb.student_id) = ? AND sb.status != 'cancelled'
         ORDER BY ts.date DESC, ts.start_time DESC`,
        [userId]
      );
      return bookings;
    } catch (err) {
      console.error('Error getting user bookings:', err);
      throw err;
    }
  }

  // Cancel booking
  async cancelBooking(bookingId, userId) {
    try {
      // Try student_id first, then fallback to user_id
      let booking = await db.get(
        'SELECT * FROM slot_bookings WHERE id = ? AND student_id = ?',
        [bookingId, userId]
      );

      if (!booking) {
        booking = await db.get(
          'SELECT * FROM slot_bookings WHERE id = ? AND user_id = ?',
          [bookingId, userId]
        );
      }

      if (!booking) {
        throw new Error('Booking not found');
      }

      await db.run(
        'UPDATE slot_bookings SET status = ? WHERE id = ?',
        ['cancelled', bookingId]
      );

      const slot = await db.get('SELECT * FROM time_slots WHERE id = ?', [booking.slot_id]);
      const newCount = Math.max(0, slot.booked_count - 1);
      
      await db.run(
        'UPDATE time_slots SET booked_count = ?, status = ? WHERE id = ?',
        [newCount, 'available', booking.slot_id]
      );

      return true;
    } catch (err) {
      console.error('Error cancelling booking:', err);
      throw err;
    }
  }

  async getTeacherSlots(teacherId, date) {
    try {
      console.log('🔍 getTeacherSlots called with:', { teacherId, date });
      const slots = await db.all(
        `SELECT ts.*, u.name as teacher_name, u.department 
         FROM time_slots ts
         JOIN users u ON ts.teacher_id = u.id
         WHERE ts.teacher_id = ? AND ts.date = ? AND ts.status = 'available' 
         ORDER BY ts.start_time ASC`,
        [teacherId, date]
      );
      console.log('✅ Found slots:', slots.length, 'for teacher', teacherId, 'on date', date);
      // Also check all slots for this teacher (for debugging)
      const allSlots = await db.all(
        `SELECT * FROM time_slots WHERE teacher_id = ?`,
        [teacherId]
      );
      console.log('📊 Total slots for this teacher:', allSlots.length);
      if (allSlots.length > 0) {
        console.log('📋 Sample slot:', { id: allSlots[0].id, date: allSlots[0].date, status: allSlots[0].status });
      }
      return slots;
    } catch (err) {
      console.error('Error getting slots:', err);
      throw err;
    }
  }

  // Get bookings for a specific slot (admin view)
  async getSlotBookings(slotId) {
    try {
      const bookings = await db.all(
        `SELECT * FROM slot_bookings 
         WHERE slot_id = ? AND status != 'cancelled'
         ORDER BY created_at ASC`,
        [slotId]
      );
      return bookings;
    } catch (err) {
      console.error('Error getting slot bookings:', err);
      throw err;
    }
  }
}

export default new SlotBookingModel();
