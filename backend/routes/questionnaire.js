const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const keyword = req.query.keyword || '';
    const offset = (page - 1) * pageSize;
    const userId = req.user.id;
    
    let whereSql = 'WHERE user_id = ?';
    let params = [userId];
    
    if (keyword) {
      whereSql += ' AND title LIKE ?';
      params.push(`%${keyword}%`);
    }
    
    const [questionnaires] = await pool.execute(
      `SELECT * FROM questionnaires ${whereSql} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );
    
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM questionnaires ${whereSql}`,
      params
    );
    
    for (const q of questionnaires) {
      const [qCount] = await pool.execute(
        'SELECT COUNT(*) as responseCount FROM responses WHERE questionnaire_id = ?',
        [q.id]
      );
      q.responseCount = qCount[0].responseCount;
    }
    
    res.json({
      code: 200,
      data: {
        list: questionnaires,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('Get questionnaires error:', error);
    res.status(500).json({ code: 500, message: '获取问卷列表失败' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, status = 1 } = req.body;
    const userId = req.user.id;
    
    if (!title) {
      return res.status(400).json({ code: 400, message: '问卷标题不能为空' });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO questionnaires (user_id, title, description, status) VALUES (?, ?, ?, ?)',
      [userId, title, description || '', status]
    );
    
    res.json({
      code: 200,
      message: '创建成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Create questionnaire error:', error);
    res.status(500).json({ code: 500, message: '创建问卷失败' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const [questionnaires] = await pool.execute(
      'SELECT * FROM questionnaires WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }
    
    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE questionnaire_id = ? ORDER BY sort_order ASC, id ASC',
      [id]
    );
    
    questions.forEach(q => {
      if (q.options) {
        q.options = JSON.parse(q.options);
      }
    });
    
    res.json({
      code: 200,
      data: {
        questionnaire: questionnaires[0],
        questions
      }
    });
  } catch (error) {
    console.error('Get questionnaire error:', error);
    res.status(500).json({ code: 500, message: '获取问卷详情失败' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, questions } = req.body;
    const userId = req.user.id;
    
    const [questionnaires] = await pool.execute(
      'SELECT id FROM questionnaires WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }
    
    if (title !== undefined || description !== undefined || status !== undefined) {
      const updateFields = [];
      const updateValues = [];
      
      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      
      updateValues.push(id);
      await pool.execute(
        `UPDATE questionnaires SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }
    
    if (questions && Array.isArray(questions)) {
      await pool.execute('DELETE FROM questions WHERE questionnaire_id = ?', [id]);
      
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await pool.execute(
          'INSERT INTO questions (questionnaire_id, title, type, options, required, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [
            id,
            q.title,
            q.type,
            q.options ? JSON.stringify(q.options) : null,
            q.required ? 1 : 0,
            i
          ]
        );
      }
    }
    
    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('Update questionnaire error:', error);
    res.status(500).json({ code: 500, message: '更新问卷失败' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const [questionnaires] = await pool.execute(
      'SELECT id FROM questionnaires WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }
    
    await pool.execute('DELETE FROM questionnaires WHERE id = ?', [id]);
    
    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('Delete questionnaire error:', error);
    res.status(500).json({ code: 500, message: '删除问卷失败' });
  }
});

router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [questionnaires] = await pool.execute(
      'SELECT * FROM questionnaires WHERE id = ? AND status = 1',
      [id]
    );
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在或已停用' });
    }
    
    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE questionnaire_id = ? ORDER BY sort_order ASC, id ASC',
      [id]
    );
    
    questions.forEach(q => {
      if (q.options) {
        q.options = JSON.parse(q.options);
      }
    });
    
    res.json({
      code: 200,
      data: {
        questionnaire: questionnaires[0],
        questions
      }
    });
  } catch (error) {
    console.error('Get public questionnaire error:', error);
    res.status(500).json({ code: 500, message: '获取问卷失败' });
  }
});

module.exports = router;
