const express = require('express');
const { pool } = require('../config/db');
const { client } = require('../config/redis');
const { authMiddleware } = require('../middleware/auth');
const { preventDuplicateSubmit } = require('../middleware/rateLimit');
const XLSX = require('xlsx');

const router = express.Router();

router.post('/:id', preventDuplicateSubmit, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { answers } = req.body;
    const ip = req.ip;
    
    const [questionnaires] = await connection.execute(
      'SELECT id, status FROM questionnaires WHERE id = ?',
      [id]
    );
    
    if (questionnaires.length === 0) {
      await connection.rollback();
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }
    
    if (questionnaires[0].status !== 1) {
      await connection.rollback();
      return res.status(400).json({ code: 400, message: '问卷已停用' });
    }
    
    const [questions] = await connection.execute(
      'SELECT id, title, type, required, options FROM questions WHERE questionnaire_id = ? ORDER BY sort_order ASC',
      [id]
    );
    
    for (const q of questions) {
      if (q.required === 1) {
        const answer = answers[q.id];
        if (answer === undefined || answer === null || answer === '' || 
            (Array.isArray(answer) && answer.length === 0)) {
          await connection.rollback();
          return res.status(400).json({ code: 400, message: `「${q.title}」为必填项` });
        }
      }
    }
    
    const [responseResult] = await connection.execute(
      'INSERT INTO responses (questionnaire_id, respondent_ip) VALUES (?, ?)',
      [id, ip]
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
      message: '提交成功'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Submit response error:', error);
    res.status(500).json({ code: 500, message: '提交失败' });
  } finally {
    connection.release();
  }
});

router.get('/questionnaire/:id', authMiddleware, async (req, res) => {
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
      r.answers = JSON.parse(r.answers);
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

router.get('/questionnaire/:id/stats', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const [questionnaires] = await pool.execute(
      'SELECT id, title FROM questionnaires WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
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
      if (q.type === 'radio' || q.type === 'checkbox') {
        const options = JSON.parse(q.options || '[]');
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
      } else {
        const [answers] = await pool.execute(
          'SELECT answer FROM response_answers WHERE question_id = ? ORDER BY id DESC LIMIT 100',
          [q.id]
        );
        
        stats.push({
          questionId: q.id,
          questionTitle: q.title,
          type: q.type,
          answers: answers.map(a => a.answer).filter(a => a),
          totalResponses: responseCount[0].total
        });
      }
    }
    
    res.json({
      code: 200,
      data: {
        questionnaire: questionnaires[0],
        totalResponses: responseCount[0].total,
        stats
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ code: 500, message: '获取统计数据失败' });
  }
});

router.get('/questionnaire/:id/export', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const [questionnaires] = await pool.execute(
      'SELECT id, title FROM questionnaires WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }
    
    const [questions] = await pool.execute(
      'SELECT id, title FROM questions WHERE questionnaire_id = ? ORDER BY sort_order ASC',
      [id]
    );
    
    const [responses] = await pool.execute(
      `SELECT r.id, r.submit_time,
       JSON_OBJECTAGG(ra.question_id, ra.answer) as answers
       FROM responses r
       LEFT JOIN response_answers ra ON r.id = ra.response_id
       WHERE r.questionnaire_id = ?
       GROUP BY r.id
       ORDER BY r.submit_time DESC`,
      [id]
    );
    
    const headers = ['序号', '提交时间', ...questions.map(q => q.title)];
    const rows = responses.map((r, idx) => {
      const answers = JSON.parse(r.answers);
      return [
        idx + 1,
        r.submit_time,
        ...questions.map(q => answers[q.id] || '')
      ];
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, '填写记录');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(questionnaires[0].title)}_填写记录.xlsx"`);
    
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ code: 500, message: '导出失败' });
  }
});

module.exports = router;
