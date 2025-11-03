import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Import database
import db from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import serviceRoutes from './routes/service.js';
import queueRoutes from './routes/queue.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';
import slotRoutes from './routes/slots.js';
import teacherBookingRoutes from './routes/teacherBookings.js';

// Import middleware
import errorHandler from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Add this for debugging: Check if JWT_SECRET is loaded
console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'Yes' : 'No');

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io available to routes
app.set('io', io);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '3.0.0' // Updated version with authentication
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/teacher-bookings', teacherBookingRoutes);

// Error handling
app.use(errorHandler);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('✓ Client connected:', socket.id);

  socket.on('join-service', (serviceId) => {
    socket.join(`service:${serviceId}`);
    console.log(`Socket ${socket.id} joined service:${serviceId}`);
  });

  socket.on('leave-service', (serviceId) => {
    socket.leave(`service:${serviceId}`);
    console.log(`Socket ${socket.id} left service:${serviceId}`);
  });

  socket.on('disconnect', () => {
    console.log('✗ Client disconnected:', socket.id);
  });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('🚀 Starting QueueUp Server v3.0...');
    
    // Initialize database with new tables
    await db.initialize();
    
    // Create default services if they don't exist
    const services = await db.all('SELECT * FROM services');
    
    if (services.length === 0) {
      console.log('📝 Creating default services...');
      
      const ServiceModel = (await import('./models/Service.js')).default;
      
      await ServiceModel.createService(
        'Campus Canteen',
        'Food and beverage service',
        2,
        300
      );
      
      await ServiceModel.createService(
        'Counseling Service',
        'Student counseling and guidance',
        1,
        900
      );

      await ServiceModel.createService(
        'Main Auditorium',
        'Large event space for 500+ people',
        1,
        14400
      );

      await ServiceModel.createService(
        'Meeting Room',
        'Small meeting room for 10-20 people',
        3,
        3600
      );
      
      console.log('✓ Default services created');
    }

    // Check if default users exist
    const users = await db.all('SELECT * FROM users');
    if (users.length === 0) {
      console.log('\n⚠️  No users found in database!');
      console.log('📌 Run: npm run seed');
      console.log('   to create default users\n');
    }

    httpServer.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║   QueueUp Server v3.0 Running                ║
║                                              ║
║   🌐 API: http://localhost:${PORT}          ║
║   🔌 WebSocket: Active                       ║
║   📊 Database: SQLite Connected              ║
║   🔐 Authentication: Enabled                 ║
║                                              ║
║   Features:                                  ║
║   ✓ User Authentication                      ║
║   ✓ Role-based Access Control                ║
║   ✓ Professor-Student Booking                ║
║   ✓ Queue Management                         ║
║   ✓ Real-time Updates                        ║
║   ✓ Analytics & Reporting                    ║
╚══════════════════════════════════════════════╝

📋 Default Portals:
   - Sign In:      http://localhost:5173/signin.html
   - Student:      http://localhost:5173/student.html
   - Teacher:      http://localhost:5173/teacher.html
   - Organization: http://localhost:5173/organization.html
   - Admin:        http://localhost:5173/admin.html
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();