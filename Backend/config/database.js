import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../queue.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) console.error('Database connection error:', err);
      else console.log('✓ Connected to SQLite database');
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async initialize() {
    try {
      // Services table
      await this.run(`
        CREATE TABLE IF NOT EXISTS services (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          booths INTEGER DEFAULT 1,
          avg_service_time INTEGER DEFAULT 300,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Service booths table
      await this.run(`
        CREATE TABLE IF NOT EXISTS service_booths (
          id TEXT PRIMARY KEY,
          service_id TEXT NOT NULL,
          booth_number INTEGER,
          status TEXT DEFAULT 'available',
          current_user_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(service_id) REFERENCES services(id)
        )
      `);

      // Analytics table - track queue events
      await this.run(`
        CREATE TABLE IF NOT EXISTS queue_analytics (
          id TEXT PRIMARY KEY,
          service_id TEXT NOT NULL,
          event_type TEXT,
          queue_length INTEGER,
          avg_wait_time INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(service_id) REFERENCES services(id)
        )
      `);

      // Service statistics - daily summary
      await this.run(`
        CREATE TABLE IF NOT EXISTS service_stats (
          id TEXT PRIMARY KEY,
          service_id TEXT NOT NULL,
          date TEXT,
          total_served INTEGER DEFAULT 0,
          avg_wait_time INTEGER DEFAULT 0,
          peak_queue_length INTEGER DEFAULT 0,
          peak_time TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(service_id) REFERENCES services(id)
        )
      `);

      // Users table
      await this.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          department TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Time slots table - supports both service_id and teacher_id
      await this.run(`
        CREATE TABLE IF NOT EXISTS time_slots (
          id TEXT PRIMARY KEY,
          service_id TEXT,
          teacher_id TEXT,
          date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          capacity INTEGER DEFAULT 1,
          booked_count INTEGER DEFAULT 0,
          status TEXT DEFAULT 'available',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(service_id) REFERENCES services(id),
          FOREIGN KEY(teacher_id) REFERENCES users(id),
          CHECK((service_id IS NOT NULL) OR (teacher_id IS NOT NULL))
        )
      `);

      // Slot bookings table - supports both user_id/student_id schemas
      await this.run(`
        CREATE TABLE IF NOT EXISTS slot_bookings (
          id TEXT PRIMARY KEY,
          slot_id TEXT NOT NULL,
          user_id TEXT,
          student_id TEXT,
          teacher_id TEXT,  -- New column for teacher booking a colleague
          user_type TEXT,
          purpose TEXT,
          status TEXT DEFAULT 'confirmed',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(slot_id) REFERENCES time_slots(id),
          FOREIGN KEY(user_id) REFERENCES users(id),
          FOREIGN KEY(student_id) REFERENCES users(id),
          FOREIGN KEY(teacher_id) REFERENCES users(id), -- Foreign key for teacher_id
          CHECK((user_id IS NOT NULL) OR (student_id IS NOT NULL) OR (teacher_id IS NOT NULL))
        )
      `);
      console.log('✓ Authentication and slot tables created');

      // Admin users - for authentication
      await this.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'staff',
          service_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(service_id) REFERENCES services(id)
        )
      `);

      console.log('✓ Analytics tables created');

      // Queue entries table
      await this.run(`
        CREATE TABLE IF NOT EXISTS queue_entries (
          id TEXT PRIMARY KEY,
          service_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          status TEXT DEFAULT 'waiting',
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          served_at DATETIME,
          FOREIGN KEY(service_id) REFERENCES services(id)
        )
      `);

      console.log('✓ Database tables initialized');
    } catch (err) {
      console.error('Database initialization error:', err);
    }
  }
}

export default new Database();