const { client } = require('../config/redis');
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { code: 429, message: '请求过于频繁，请稍后再试' }
});

async function preventDuplicateSubmit(req, res, next) {
  const questionnaireId = req.params.id || req.body.questionnaireId;
  const ip = req.ip;
  const key = `submit:${questionnaireId}:${ip}`;

  try {
    const exists = await client.get(key);
    if (exists) {
      return res.status(400).json({ code: 400, message: '您已提交过该问卷，请勿重复提交' });
    }
    
    req.submitKey = key;
    next();
  } catch (error) {
    next();
  }
}

module.exports = { apiLimiter, preventDuplicateSubmit };
