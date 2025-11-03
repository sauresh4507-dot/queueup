// Backend/routes/slots.js - UPDATED VERSION
import express from 'express';
import SlotBookingModel from '../models/SlotBooking.js';

const router = express.Router();

// GET /api/slots/teacher/:teacherId/:date - Get teacher's available slots
router.get('/teacher/:teacherId/:date', async (req, res, next) => {
  try {
    const { teacherId, date } = req.params;
    const slots = await SlotBookingModel.getTeacherSlots(teacherId, date);
    res.json({ success: true, data: slots, slots: slots });
  } catch (err) {
    next(err);
  }
});

// POST /api/slots/create - Create slots (teachers or services)
router.post('/create', async (req, res, next) => {
  try {
    const { teacherId, serviceId, date, slots } = req.body;
    
    if ((!teacherId && !serviceId) || !date || !slots || slots.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Teacher ID or Service ID, date, and slots required' 
      });
    }

    const slotIds = teacherId 
      ? await SlotBookingModel.createTeacherSlots(teacherId, date, slots)
      : await SlotBookingModel.createSlots(serviceId, date, slots);
    
    // Broadcast update via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('slot-updated', { teacherId, serviceId, date });
    }
    
    res.status(201).json({ success: true, data: slotIds });
  } catch (err) {
    next(err);
  }
});

// POST /api/slots/book - Book a slot (students)
router.post('/book', async (req, res, next) => {
  try {
    const { slotId, userId, purpose } = req.body;
    
    if (!slotId || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Slot ID and user ID required' 
      });
    }

    const booking = await SlotBookingModel.bookSlot(slotId, userId, purpose);
    
    // Broadcast update via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('slot-updated', { slotId, action: 'booked' });
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

// GET /api/slots/student-bookings/:studentId - Get student's bookings
router.get('/student-bookings/:studentId', async (req, res, next) => {
  try {
    const bookings = await SlotBookingModel.getStudentBookings(req.params.studentId);
    res.json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
});

// GET /api/slots/teacher-appointments/:teacherId - Get teacher's appointments
router.get('/teacher-appointments/:teacherId', async (req, res, next) => {
  try {
    const appointments = await SlotBookingModel.getTeacherAppointments(req.params.teacherId);
    res.json({ success: true, appointments });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/slots/cancel/:bookingId - Cancel booking
router.delete('/cancel/:bookingId', async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID required' 
      });
    }

    await SlotBookingModel.cancelBooking(req.params.bookingId, userId);
    
    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.emit('slot-updated', { bookingId: req.params.bookingId, action: 'cancelled' });
    }
    
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (err) {
    if (err.message.includes('not found')) {
      res.status(404).json({ success: false, message: err.message });
    } else {
      next(err);
    }
  }
});

export default router;