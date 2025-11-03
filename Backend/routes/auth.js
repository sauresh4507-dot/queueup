import express from 'express';
import AuthModel from '../models/Auth.js';
import jwt from 'jsonwebtoken'; // Import jsonwebtoken
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password required' 
      });
    }

    const result = await AuthModel.authenticate(username, password);
    
    if (result.success) {
      // Generate JWT
      const token = jwt.sign(
        { id: result.user.id, role: result.user.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' } // Token expires in 1 hour
      );

      res.json({ ...result, token }); // Include token in the response
    } else {
      res.status(401).json(result);
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register (admin only - create users)
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, role, name, email, department } = req.body;
    
    if (!username || !password || !role || !name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields required' 
      });
    }

    const userId = await AuthModel.createUser(
      username, 
      password, 
      role, 
      name, 
      email, 
      department
    );
    
    res.status(201).json({ 
      success: true, 
      userId,
      message: 'User created successfully'
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    } else {
      next(err);
    }
  }
});

// GET /api/auth/user/:userId
router.get('/user/:userId', async (req, res, next) => {
  try {
    const user = await AuthModel.getUserById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/teachers - Get all teachers
router.get('/teachers', async (req, res, next) => {
  try {
    const teachers = await AuthModel.getAllTeachers();
    res.json({ success: true, teachers });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/teacher/:teacherId - Get specific teacher
router.get('/teacher/:teacherId', async (req, res, next) => {
  try {
    const teacher = await AuthModel.getTeacherById(req.params.teacherId);
    
    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }
    
    res.json({ success: true, teacher });
  } catch (err) {
    next(err);
  }
});

export default router;