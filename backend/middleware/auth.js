const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = 'questionnaire_system_secret_key_2024';

function generateToken(userId, username) {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未提供认证令牌' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await pool.execute('SELECT id, username FROM users WHERE id = ?', [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(401).json({ code: 401, message: '用户不存在' });
    }
    
    req.user = users[0];
    next();
  } catch (error) {
    return res.status(401).json({ code: 401, message: '认证令牌无效或已过期' });
  }
}

module.exports = { generateToken, authMiddleware, JWT_SECRET };
