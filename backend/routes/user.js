const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }
    
    const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ code: 400, message: '用户名已存在' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    
    const token = generateToken(result.insertId, username);
    
    res.json({
      code: 200,
      message: '注册成功',
      data: {
        token,
        user: { id: result.insertId, username }
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ code: 500, message: '注册失败' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }
    
    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(400).json({ code: 400, message: '用户名或密码错误' });
    }
    
    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(400).json({ code: 400, message: '用户名或密码错误' });
    }
    
    const token = generateToken(user.id, user.username);
    
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: { id: user.id, username: user.username }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ code: 500, message: '登录失败' });
  }
});

router.get('/profile', authMiddleware, (req, res) => {
  res.json({
    code: 200,
    data: { user: req.user }
  });
});

router.post('/logout', authMiddleware, (req, res) => {
  res.json({
    code: 200,
    message: '退出成功'
  });
});

module.exports = router;
