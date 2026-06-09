const express = require('express');
const { pool } = require('../config/db');
const { client } = require('../config/redis');
const { authMiddleware } = require('../middleware/auth');
const { preventDuplicateSubmit } = require('../middleware/rateLimit');
const XLSX = require('xlsx');

const router = express.Router();

function generateIdentity(req, questionnaireId) {
  const ip = req.ip;
  const userAgent = req.headers['user-agent'] || '';
  const identity = `${questionnaireId}_${ip}_${userAgent}`;
  return require('crypto').createHash('md5').update(identity).digest('hex');
}

router.post('/:id', preventDuplicateSubmit, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { answers, respondent_identity } = req.body;
    const ip = req.ip;
    
    const [questionnaires] = await connection.execute(
      'SELECT * FROM questionnaires WHERE id = ?',
      [id]
    );
    
    if (questionnaires.length === 0) {
      await connection.rollback();
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }
    
    const questionnaire = questionnaires[0];
    const now = new Date();
    
    if (questionnaire.status !== 1) {
      await connection.rollback();
      return res.status(400).json({ code: 400, message: '问卷已停用' });
    }
    
    if (questionnaire.publish_at && new Date(questionnaire.publish_at) > now) {
      await connection.rollback();
      return res.status(403).json({ code: 403, message: '问卷尚未发布' });
    }
    
    if (questionnaire.expire_at && new Date(questionnaire.expire_at) < now) {
      await connection.rollback();
      return res.status(403).json({ code: 403, message: '问卷已过期' });
    }
    
    const identity = respondent_identity || generateIdentity(req, id);
    
    if (questionnaire.max_responses_per_user > 0) {
      const [countResult] = await connection.execute(
        'SELECT COUNT(*) as count FROM responses WHERE questionnaire_id = ? AND respondent_identity = ?',
        [id, identity]
      );
      if (countResult[0].count >= questionnaire.max_responses_per_user) {
        await connection.rollback();
        return res.status(400).json({ code: 400, message: `您已达到最大填写次数（${questionnaire.max_responses_per_user}次）` });
      }
    }
    
    if (questionnaire.ip_limit === 1) {
      const [ipCountResult] = await connection.execute(
        'SELECT COUNT(*) as count FROM responses WHERE questionnaire_id = ? AND respondent_ip = ?',
        [id, ip]
      );
      if (ipCountResult[0].count > 0) {
        await connection.rollback();
        return res.status(400).json({ code: 400, message: '该IP地址已提交过此问卷' });
      }
    }
    
    const [questions] = await connection.execute(
      'SELECT id, title, type, required, options, jump_logic FROM questions WHERE questionnaire_id = ? ORDER BY sort_order ASC',
      [id]
    );
    
    const questionMap = {};
    questions.forEach(q => {
      questionMap[q.id] = q;
      if (q.options && typeof q.options === 'string') {
        try {
          q.options = JSON.parse(q.options);
        } catch (e) {
          q.options = [];
        }
      }
    });
    
    for (const q of questions) {
      if (q.type === 'description') continue;
      
      if (q.required === 1) {
        const answer = answers[q.id];
        if (answer === undefined || answer === null || answer === '' || 
            (Array.isArray(answer) && answer.length === 0)) {
          await connection.rollback();
          return res.status(400).json({ code: 400, message: `「${q.title}」为必填项` });
        }
      }
      
      if (q.type === 'rating') {
        const answer = answers[q.id];
        if (answer !== undefined && answer !== null && answer !== '') {
          const max = q.options?.max || 5;
          const val = parseInt(answer);
          if (isNaN(val) || val < 1 || val > max) {
            await connection.rollback();
            return res.status(400).json({ code: 400, message: `「${q.title}」评分值必须在1-${max}之间` });
          }
        }
      }
    }
    
    const [responseResult] = await connection.execute(
      'INSERT INTO responses (questionnaire_id, respondent_ip, respondent_identity) VALUES (?, ?, ?)',
      [id, ip, identity]
    );
    
    const responseId = responseResult.insertId;
    
    for (const q of questions) {
      const answer = answers[q.id];
      let answerValue = '';
      
      if (answer !== undefined && answer !== null) {
        if (Array.isArray(answer)) {
          answerValue = answer.join(',');
        } else {
          answerValue = String(answer);
        }
      }
      
      await connection.execute(
        'INSERT INTO response_answers (response_id, question_id, answer) VALUES (?, ?, ?)',
        [responseId, q.id, answerValue]
      );
    }
    
    if (req.submitKey) {
      await client.setEx(req.submitKey, 24 * 60 * 60, '1');
    }
    
    await connection.commit();
    
    res.json({
      code: 200,
      message: '提交成功',
      data: { identity }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Submit response error:', error);
    res.status(500).json({ code: 500, message: '提交失败' });
  } finally {
    connection.release();
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const userId = req.user.id;
    
    const [questionnaires] = await pool.execute(
      'SELECT id FROM questionnaires WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }
    
    const [responses] = await pool.execute(
      `SELECT r.id, r.respondent_ip, r.submit_time,
       JSON_ARRAYAGG(
         JSON_OBJECT('question_id', ra.question_id, 'answer', ra.answer)
       ) as answers
       FROM responses r
       LEFT JOIN response_answers ra ON r.id = ra.response_id
       WHERE r.questionnaire_id = ?
       GROUP BY r.id
       ORDER BY r.submit_time DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      [id]
    );
    
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM responses WHERE questionnaire_id = ?',
      [id]
    );
    
    responses.forEach(r => {
      if (typeof r.answers === 'string') {
        r.answers = JSON.parse(r.answers);
      }
      const answerMap = {};
      if (r.answers && Array.isArray(r.answers)) {
        r.answers.forEach(a => {
          answerMap[a.question_id] = a.answer;
        });
      }
      r.answers = answerMap;
      r.createdAt = r.submit_time;
    });
    
    res.json({
      code: 200,
      data: {
        list: responses,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ code: 500, message: '获取填写记录失败' });
  }
});

async function getResponseList(id, page, pageSize, userId) {
  const offset = (page - 1) * pageSize;
  
  const [questionnaires] = await pool.execute(
    'SELECT id FROM questionnaires WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  
  if (questionnaires.length === 0) {
    return { error: '问卷不存在', status: 404 };
  }
  
  const [responses] = await pool.execute(
    `SELECT r.id, r.respondent_ip, r.submit_time,
     JSON_ARRAYAGG(
       JSON_OBJECT('question_id', ra.question_id, 'answer', ra.answer)
     ) as answers
     FROM responses r
     LEFT JOIN response_answers ra ON r.id = ra.response_id
     WHERE r.questionnaire_id = ?
     GROUP BY r.id
     ORDER BY r.submit_time DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [id]
  );
  
  const [countResult] = await pool.execute(
    'SELECT COUNT(*) as total FROM responses WHERE questionnaire_id = ?',
    [id]
  );
  
  responses.forEach(r => {
    r.answers = JSON.parse(r.answers);
  });
  
  return {
    data: {
      list: responses,
      total: countResult[0].total,
      page: page,
      pageSize: pageSize
    }
  };
}

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const result = await getResponseList(id, page, pageSize, req.user.id);
    
    if (result.error) {
      return res.status(result.status).json({ code: result.status, message: result.error });
    }
    
    res.json({ code: 200, data: result.data });
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ code: 500, message: '获取填写记录失败' });
  }
});

router.get('/questionnaire/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const result = await getResponseList(id, page, pageSize, req.user.id);
    
    if (result.error) {
      return res.status(result.status).json({ code: result.status, message: result.error });
    }
    
    res.json({ code: 200, data: result.data });
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ code: 500, message: '获取填写记录失败' });
  }
});

async function getResponseStats(id, userId) {
  const [questionnaires] = await pool.execute(
    'SELECT id, title FROM questionnaires WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  
  if (questionnaires.length === 0) {
    return { error: '问卷不存在', status: 404 };
  }
  
  const [questions] = await pool.execute(
    'SELECT id, title, type, options FROM questions WHERE questionnaire_id = ? ORDER BY sort_order ASC',
    [id]
  );
  
  const [responseCount] = await pool.execute(
    'SELECT COUNT(*) as total FROM responses WHERE questionnaire_id = ?',
    [id]
  );
  
  const stats = [];
  
  for (const q of questions) {
    let options = [];
    if (q.options) {
      if (typeof q.options === 'string') {
        try {
          options = JSON.parse(q.options);
        } catch (e) {
          options = [];
        }
      } else {
        options = q.options;
      }
    }
    
    if (q.type === 'radio' || q.type === 'checkbox' || q.type === 'select') {
      const [answers] = await pool.execute(
        'SELECT answer FROM response_answers WHERE question_id = ?',
        [q.id]
      );
      
      const optionStats = options.map(opt => ({
        option: opt,
        count: 0,
        percentage: 0
      }));
      
      answers.forEach(a => {
        const answerValues = a.answer ? a.answer.split(',') : [];
        answerValues.forEach(val => {
          const idx = optionStats.findIndex(os => os.option === val);
          if (idx !== -1) {
            optionStats[idx].count++;
          }
        });
      });
      
      const total = responseCount[0].total;
      optionStats.forEach(os => {
        os.percentage = total > 0 ? ((os.count / total) * 100).toFixed(1) : 0;
      });
      
      stats.push({
        questionId: q.id,
        questionTitle: q.title,
        type: q.type,
        options: optionStats,
        totalResponses: total
      });
    } else if (q.type === 'rating') {
      const [answers] = await pool.execute(
        'SELECT answer FROM response_answers WHERE question_id = ? AND answer IS NOT NULL AND answer != ""',
        [q.id]
      );
      
      const maxRating = options?.max || 5;
      const ratingStats = [];
      let sum = 0;
      let validCount = 0;
      
      for (let i = 1; i <= maxRating; i++) {
        ratingStats.push({
          rating: i,
          count: 0,
          percentage: 0
        });
      }
      
      answers.forEach(a => {
        const val = parseInt(a.answer);
        if (!isNaN(val) && val >= 1 && val <= maxRating) {
          const idx = val - 1;
          ratingStats[idx].count++;
          sum += val;
          validCount++;
        }
      });
      
      const total = responseCount[0].total;
      ratingStats.forEach(rs => {
        rs.percentage = total > 0 ? ((rs.count / total) * 100).toFixed(1) : 0;
      });
      
      stats.push({
        questionId: q.id,
        questionTitle: q.title,
        type: q.type,
        options: ratingStats,
        average: validCount > 0 ? (sum / validCount).toFixed(2) : 0,
        totalResponses: total,
        validCount
      });
    } else if (q.type === 'date') {
      const [answers] = await pool.execute(
        'SELECT answer, COUNT(*) as count FROM response_answers WHERE question_id = ? AND answer IS NOT NULL AND answer != "" GROUP BY answer ORDER BY answer',
        [q.id]
      );
      
      const dateStats = answers.map(a => ({
        date: a.answer,
        count: a.count,
        percentage: responseCount[0].total > 0 ? ((a.count / responseCount[0].total) * 100).toFixed(1) : 0
      }));
      
      stats.push({
        questionId: q.id,
        questionTitle: q.title,
        type: q.type,
        dateStats,
        totalResponses: responseCount[0].total
      });
    } else if (q.type === 'description') {
    } else {
      const [answers] = await pool.execute(
        'SELECT answer FROM response_answers WHERE question_id = ? ORDER BY id DESC LIMIT 100',
        [q.id]
      );
      
      const answerList = answers.map(a => a.answer).filter(a => a);
      const wordCount = {};
      answerList.forEach(text => {
        const words = text.split(/[\s,，.。!！?？;；:：]+/).filter(w => w.length > 0);
        words.forEach(w => {
          wordCount[w] = (wordCount[w] || 0) + 1;
        });
      });
      
      const topWords = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, count]) => ({ word, count }));
      
      stats.push({
        questionId: q.id,
        questionTitle: q.title,
        type: q.type,
        answers: answerList,
        topWords,
        totalResponses: responseCount[0].total
      });
    }
  }
  
  return {
    data: {
      questionnaire: questionnaires[0],
      totalResponses: responseCount[0].total,
      stats
    }
  };
}

router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getResponseStats(id, req.user.id);
    
    if (result.error) {
      return res.status(result.status).json({ code: result.status, message: result.error });
    }
    
    res.json({ code: 200, data: result.data });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ code: 500, message: '获取统计数据失败' });
  }
});

router.get('/questionnaire/:id/stats', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getResponseStats(id, req.user.id);
    
    if (result.error) {
      return res.status(result.status).json({ code: result.status, message: result.error });
    }
    
    res.json({ code: 200, data: result.data });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ code: 500, message: '获取统计数据失败' });
  }
});

async function exportResponses(id, userId, format = 'xlsx') {
  const [questionnaires] = await pool.execute(
    'SELECT id, title FROM questionnaires WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  
  if (questionnaires.length === 0) {
    return { error: '问卷不存在', status: 404 };
  }
  
  const [questions] = await pool.execute(
    'SELECT id, title, type FROM questions WHERE questionnaire_id = ? ORDER BY sort_order ASC',
    [id]
  );
  
  const [responses] = await pool.execute(
    `SELECT r.id, r.submit_time, r.respondent_ip,
     JSON_OBJECTAGG(ra.question_id, ra.answer) as answers
     FROM responses r
     LEFT JOIN response_answers ra ON r.id = ra.response_id
     WHERE r.questionnaire_id = ?
     GROUP BY r.id
     ORDER BY r.submit_time DESC`,
    [id]
  );
  
  const headers = ['序号', '提交时间', 'IP地址', ...questions.map(q => q.title)];
  const rows = responses.map((r, idx) => {
    const answers = JSON.parse(r.answers);
    return [
      idx + 1,
      r.submit_time,
      r.respondent_ip,
      ...questions.map(q => answers[q.id] || '')
    ];
  });
  
  if (format === 'csv') {
    const csvRows = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))];
    const csvContent = '\uFEFF' + csvRows.join('\n');
    return {
      data: Buffer.from(csvContent, 'utf-8'),
      title: questionnaires[0].title,
      type: 'csv'
    };
  }
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, '填写记录');
  
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  return {
    data: buffer,
    title: questionnaires[0].title,
    type: 'xlsx'
  };
}

router.get('/:id/export', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const format = req.query.format || 'xlsx';
    const result = await exportResponses(id, req.user.id, format);
    
    if (result.error) {
      return res.status(result.status).json({ code: result.status, message: result.error });
    }
    
    if (result.type === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.title)}_填写记录.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.title)}_填写记录.xlsx"`);
    }
    
    res.send(result.data);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ code: 500, message: '导出失败' });
  }
});

router.get('/questionnaire/:id/export', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const format = req.query.format || 'xlsx';
    const result = await exportResponses(id, req.user.id, format);
    
    if (result.error) {
      return res.status(result.status).json({ code: result.status, message: result.error });
    }
    
    if (result.type === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.title)}_填写记录.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.title)}_填写记录.xlsx"`);
    }
    
    res.send(result.data);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ code: 500, message: '导出失败' });
  }
});

module.exports = router;
