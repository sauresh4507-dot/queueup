import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

class TeacherBookingModel {
  async bookColleagueSlot(teacherId, colleagueTeacherId, slotId, purpose) {
    try {
      const bookingId = uuidv4();

      // Check if slot is available for the colleague teacher
      const slot = await db.get(
        `SELECT * FROM time_slots 
         WHERE id = ? AND teacher_id = ? AND status = 'available'`,
        [slotId, colleagueTeacherId]
      );

      if (!slot) {
        throw new Error('Colleague\'s slot not available');
      }

      if (slot.booked_count >= slot.capacity) {
        throw new Error('Colleague\'s slot is full');
      }

      // Create booking for the colleague teacher
      await db.run(
        `INSERT INTO slot_bookings 
         (id, slot_id, teacher_id, user_id, user_type, purpose, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
        , [bookingId, slotId, colleagueTeacherId, teacherId, 'teacher', purpose || '', 'confirmed']
      );

      // Update slot booked count
      const newCount = slot.booked_count + 1;
      const newStatus = newCount >= slot.capacity ? 'booked' : 'available';
      
      await db.run(
        'UPDATE time_slots SET booked_count = ?, status = ? WHERE id = ?',
        [newCount, newStatus, slotId]
      );

      return { bookingId, slot };
    } catch (err) {
      console.error('Error booking colleague slot:', err);
      throw err;
    }
  }

  async getTeacherToTeacherBookings(teacherId) {
    try {
      const bookings = await db.all(
        `SELECT sb.*, ts.*, u.name as colleague_name, u.email as colleague_email 
         FROM slot_bookings sb
         JOIN time_slots ts ON sb.slot_id = ts.id
         JOIN users u ON sb.teacher_id = u.id
         WHERE sb.user_id = ? AND sb.user_type = 'teacher' AND sb.status != 'cancelled'
         ORDER BY ts.date DESC, ts.start_time DESC`,
        [teacherId]
      );
      return bookings;
    } catch (err) {
      console.error('Error getting teacher-to-teacher bookings:', err);
      throw err;
    }
  }

  async cancelTeacherBooking(bookingId, teacherId) {
    try {
      const booking = await db.get(
        `SELECT * FROM slot_bookings 
         WHERE id = ? AND user_id = ? AND user_type = 'teacher'`,
        [bookingId, teacherId]
      );

      if (!booking) {
        throw new Error('Teacher booking not found');
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
      console.error('Error cancelling teacher booking:', err);
      throw err;
    }
  }
}

export default new TeacherBookingModel();
