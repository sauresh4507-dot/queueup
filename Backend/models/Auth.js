// Backend/models/Auth.js
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import bcrypt from 'bcrypt';

class AuthModel {
  // Create user
  async createUser(username, password, role, name, email, department = null) {
    try {
      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(password, 10);
      
      await db.run(
        `INSERT INTO users 
         (id, username, password_hash, role, name, email, department) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, username, passwordHash, role, name, email, department]
      );
      
      return userId;
    } catch (err) {
      // Don't log UNIQUE constraint errors (expected for duplicates)
      if (!err.message || !err.message.includes('UNIQUE')) {
        console.error('Error creating user:', err);
      }
      throw err;
    }
  }

  // Authenticate user
  async authenticate(username, password) {
    try {
      const user = await db.get(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return { success: false, message: 'Invalid credentials' };
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!validPassword) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Don't send password hash to client
      const { password_hash, ...userWithoutPassword } = user;
      
      return { 
        success: true, 
        user: userWithoutPassword 
      };
    } catch (err) {
      console.error('Error authenticating:', err);
      throw err;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await db.get(
        'SELECT id, username, role, name, email, department, created_at FROM users WHERE id = ?',
        [userId]
      );
      return user;
    } catch (err) {
      console.error('Error getting user:', err);
      throw err;
    }
  }

  // Get all teachers/professors
  async getAllTeachers() {
    try {
      const teachers = await db.all(
        'SELECT id, name, email, department FROM users WHERE role = ?',
        ['teacher']
      );
      return teachers;
    } catch (err) {
      console.error('Error getting teachers:', err);
      throw err;
    }
  }

  // Get teacher by ID
  async getTeacherById(teacherId) {
    try {
      const teacher = await db.get(
        'SELECT id, name, email, department FROM users WHERE id = ? AND role = ?',
        [teacherId, 'teacher']
      );
      return teacher;
    } catch (err) {
      console.error('Error getting teacher:', err);
      throw err;
    }
  }

  // Update user profile
  async updateProfile(userId, updates) {
    try {
      const fields = Object.keys(updates)
        .filter(k => k !== 'password_hash')
        .map(k => `${k} = ?`)
        .join(', ');
      const values = Object.keys(updates)
        .filter(k => k !== 'password_hash')
        .map(k => updates[k]);
      
      await db.run(
        `UPDATE users SET ${fields} WHERE id = ?`,
        [...values, userId]
      );
      
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  }
}

export default new AuthModel();