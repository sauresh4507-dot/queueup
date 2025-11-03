import express from 'express';
import TeacherBookingModel from '../models/TeacherBooking.js';
import SlotBookingModel from '../models/SlotBooking.js'; // For getTeacherSlots
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js'; // Import auth middleware

const router = express.Router();

// Middleware to check if the user is a teacher (basic example, enhance with proper auth)
// const isTeacher = (req, res, next) => {
//   // In a real app, this would involve checking a JWT or session
//   // For now, we'll assume a 'teacherId' in the body or params means a teacher is making the request
//   // This needs to be integrated with actual authentication middleware later.
//   next(); 
// };

// GET /api/teacher-bookings/colleague-slots/:colleagueTeacherId/:date - Get a colleague's available slots
router.get('/colleague-slots/:colleagueTeacherId/:date', authenticateToken, authorizeRole(['teacher']), async (req, res, next) => {
  try {
    const { colleagueTeacherId, date } = req.params;
    const slots = await SlotBookingModel.getTeacherSlots(colleagueTeacherId, date);
    res.json({ success: true, data: slots });
  } catch (err) {
    next(err);
  }
});

// POST /api/teacher-bookings/book - Book a colleague's slot
router.post('/book', authenticateToken, authorizeRole(['teacher']), async (req, res, next) => {
  try {
    const { colleagueTeacherId, slotId, purpose } = req.body;
    const teacherId = req.user.id; // Get teacherId from authenticated user
    
    if (!teacherId || !colleagueTeacherId || !slotId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Teacher ID, Colleague Teacher ID, and Slot ID required' 
      });
    }

    const booking = await TeacherBookingModel.bookColleagueSlot(teacherId, colleagueTeacherId, slotId, purpose);

    // Broadcast update via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('slot-updated', { slotId, action: 'booked', byTeacher: true });
    }

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    if (err.message.includes('not available') || err.message.includes('full')) {
      res.status(400).json({ success: false, message: err.message });
    } else {
      next(err);
    }
  }
});

// GET /api/teacher-bookings/my-colleague-bookings/:teacherId - Get all bookings a teacher has made for colleagues
router.get('/my-colleague-bookings/:teacherId', authenticateToken, authorizeRole(['teacher']), async (req, res, next) => {
  try {
    const bookings = await TeacherBookingModel.getTeacherToTeacherBookings(req.user.id); // Use req.user.id
    res.json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/teacher-bookings/cancel/:bookingId - Cancel a teacher-to-teacher booking
router.delete('/cancel/:bookingId', authenticateToken, authorizeRole(['teacher']), async (req, res, next) => {
  try {
    const teacherId = req.user.id; // Get teacherId from authenticated user

    await TeacherBookingModel.cancelTeacherBooking(req.params.bookingId, teacherId);

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.emit('slot-updated', { bookingId: req.params.bookingId, action: 'cancelled', byTeacher: true });
    }

    res.json({ success: true, message: 'Teacher booking cancelled' });
  } catch (err) {
    if (err.message.includes('not found')) {
      res.status(404).json({ success: false, message: err.message });
    } else {
      next(err);
    }
  }
});

export default router;
