const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/public', async (req, res) => {
  try {
    const category = req.query.category || '';
    const keyword = req.query.keyword || '';

    let whereSql = 'WHERE user_id IS NULL AND is_public = 1';
    let params = [];

    if (category) {
      whereSql += ' AND category = ?';
      params.push(category);
    }

    if (keyword) {
      whereSql += ' AND name LIKE ?';
      params.push(`%${keyword}%`);
    }

    const [templates] = await pool.execute(
      `SELECT id, name, description, category, use_count, created_at FROM templates ${whereSql} ORDER BY use_count DESC, created_at DESC`,
      params
    );

    res.json({
      code: 200,
      data: {
        list: templates,
        total: templates.length
      }
    });
  } catch (error) {
    console.error('Get public templates error:', error);
    res.status(500).json({ code: 500, message: '获取公共模板失败' });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const category = req.query.category || '';
    const keyword = req.query.keyword || '';

    let whereSql = 'WHERE user_id = ?';
    let params = [userId];

    if (category) {
      whereSql += ' AND category = ?';
      params.push(category);
    }

    if (keyword) {
      whereSql += ' AND name LIKE ?';
      params.push(`%${keyword}%`);
    }

    const [templates] = await pool.execute(
      `SELECT id, name, description, category, is_public, use_count, created_at FROM templates ${whereSql} ORDER BY created_at DESC`,
      params
    );

    res.json({
      code: 200,
      data: {
        list: templates,
        total: templates.length
      }
    });
  } catch (error) {
    console.error('Get my templates error:', error);
    res.status(500).json({ code: 500, message: '获取我的模板失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [templates] = await pool.execute(
      'SELECT * FROM templates WHERE id = ?',
      [id]
    );

    if (templates.length === 0) {
      return res.status(404).json({ code: 404, message: '模板不存在' });
    }

    const template = templates[0];
    if (template.questions && typeof template.questions === 'string') {
      try {
        template.questions = JSON.parse(template.questions);
      } catch (e) {
        template.questions = [];
      }
    }

    res.json({
      code: 200,
      data: template
    });
  } catch (error) {
    console.error('Get template detail error:', error);
    res.status(500).json({ code: 500, message: '获取模板详情失败' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, category, questions, is_public = 0 } = req.body;
    const userId = req.user.id;

    if (!name || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ code: 400, message: '参数不完整' });
    }

    const [result] = await pool.execute(
      'INSERT INTO templates (user_id, name, description, category, questions, is_public) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, description || '', category || 'custom', JSON.stringify(questions), is_public ? 1 : 0]
    );

    res.json({
      code: 200,
      message: '模板创建成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ code: 500, message: '创建模板失败' });
  }
});

router.post('/apply/:id', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user.id;
    const { title, description } = req.body;

    const [templates] = await connection.execute(
      'SELECT * FROM templates WHERE id = ?',
      [id]
    );

    if (templates.length === 0) {
      await connection.rollback();
      return res.status(404).json({ code: 404, message: '模板不存在' });
    }

    const template = templates[0];
    let questions = [];
    if (template.questions) {
      if (typeof template.questions === 'string') {
        try {
          questions = JSON.parse(template.questions);
        } catch (e) {
          questions = [];
        }
      } else {
        questions = template.questions;
      }
    }

    const [qnResult] = await connection.execute(
      'INSERT INTO questionnaires (user_id, title, description, status) VALUES (?, ?, ?, ?)',
      [userId, title || template.name, description || template.description || '', 0]
    );

    const questionnaireId = qnResult.insertId;

    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await connection.execute(
        'INSERT INTO questions (questionnaire_id, title, type, options, required, sort_order, jump_logic) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          questionnaireId,
          q.title,
          q.type,
          q.options ? JSON.stringify(q.options) : null,
          q.required ? 1 : 0,
          i,
          q.jump_logic ? JSON.stringify(q.jump_logic) : null
        ]
      );
    }

    await connection.execute(
      'UPDATE templates SET use_count = use_count + 1 WHERE id = ?',
      [id]
    );

    await connection.commit();

    res.json({
      code: 200,
      message: '套用模板成功',
      data: { id: questionnaireId }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Apply template error:', error);
    res.status(500).json({ code: 500, message: '套用模板失败' });
  } finally {
    connection.release();
  }
});

router.post('/questionnaire/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, is_public } = req.body;
    const userId = req.user.id;

    const [questionnaires] = await pool.execute(
      'SELECT id FROM questionnaires WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }

    const [questions] = await pool.execute(
      'SELECT title, type, options, required, sort_order, jump_logic FROM questions WHERE questionnaire_id = ? ORDER BY sort_order ASC',
      [id]
    );

    const templateQuestions = questions.map(q => {
      const qCopy = { ...q };
      if (qCopy.options && typeof qCopy.options === 'string') {
        try {
          qCopy.options = JSON.parse(qCopy.options);
        } catch (e) {
          qCopy.options = null;
        }
      }
      if (qCopy.jump_logic && typeof qCopy.jump_logic === 'string') {
        try {
          qCopy.jump_logic = JSON.parse(qCopy.jump_logic);
        } catch (e) {
          qCopy.jump_logic = null;
        }
      }
      return qCopy;
    });

    const [result] = await pool.execute(
      'INSERT INTO templates (user_id, name, description, category, questions, is_public) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name || '我的模板', description || '', category || 'custom', JSON.stringify(templateQuestions), is_public ? 1 : 0]
    );

    res.json({
      code: 200,
      message: '保存为模板成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Save as template error:', error);
    res.status(500).json({ code: 500, message: '保存为模板失败' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, questions, is_public } = req.body;
    const userId = req.user.id;

    const [templates] = await pool.execute(
      'SELECT id FROM templates WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (templates.length === 0) {
      return res.status(404).json({ code: 404, message: '模板不存在' });
    }

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (questions !== undefined) {
      updateFields.push('questions = ?');
      updateValues.push(JSON.stringify(questions));
    }
    if (is_public !== undefined) {
      updateFields.push('is_public = ?');
      updateValues.push(is_public ? 1 : 0);
    }

    updateValues.push(id);

    await pool.execute(
      `UPDATE templates SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ code: 500, message: '更新模板失败' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [templates] = await pool.execute(
      'SELECT id FROM templates WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (templates.length === 0) {
      return res.status(404).json({ code: 404, message: '模板不存在' });
    }

    await pool.execute('DELETE FROM templates WHERE id = ?', [id]);

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ code: 500, message: '删除模板失败' });
  }
});

module.exports = router;
