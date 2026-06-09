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
      if (!q.options) {
        q.options = [];
      } else if (typeof q.options === 'string') {
        try {
          q.options = JSON.parse(q.options);
        } catch (e) {
          q.options = [];
        }
      }
      if (q.jump_logic && typeof q.jump_logic === 'string') {
        try {
          q.jump_logic = JSON.parse(q.jump_logic);
        } catch (e) {
          q.jump_logic = null;
        }
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
    const { title, description, status, questions, publish_at, expire_at, access_type, password, max_responses_per_user, ip_limit } = req.body;
    const userId = req.user.id;
    
    const [questionnaires] = await pool.execute(
      'SELECT id FROM questionnaires WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }
    
    const hasBasicUpdate = title !== undefined || description !== undefined || status !== undefined || 
      publish_at !== undefined || expire_at !== undefined || access_type !== undefined || 
      password !== undefined || max_responses_per_user !== undefined || ip_limit !== undefined;
    
    if (hasBasicUpdate) {
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
      if (publish_at !== undefined) {
        updateFields.push('publish_at = ?');
        updateValues.push(publish_at || null);
      }
      if (expire_at !== undefined) {
        updateFields.push('expire_at = ?');
        updateValues.push(expire_at || null);
      }
      if (access_type !== undefined) {
        updateFields.push('access_type = ?');
        updateValues.push(access_type || 'public');
      }
      if (password !== undefined) {
        updateFields.push('password = ?');
        updateValues.push(password || null);
      }
      if (max_responses_per_user !== undefined) {
        updateFields.push('max_responses_per_user = ?');
        updateValues.push(max_responses_per_user || 0);
      }
      if (ip_limit !== undefined) {
        updateFields.push('ip_limit = ?');
        updateValues.push(ip_limit ? 1 : 0);
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
          'INSERT INTO questions (questionnaire_id, title, type, options, required, sort_order, jump_logic) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            id,
            q.title,
            q.type,
            q.options ? JSON.stringify(q.options) : null,
            q.required ? 1 : 0,
            i,
            q.jump_logic ? JSON.stringify(q.jump_logic) : null
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

router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    const [questionnaires] = await pool.execute(
      'SELECT id FROM questionnaires WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }
    
    await pool.execute(
      'UPDATE questionnaires SET status = ? WHERE id = ?',
      [status ? 1 : 0, id]
    );
    
    res.json({
      code: 200,
      message: '状态更新成功'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ code: 500, message: '状态更新失败' });
  }
});

router.get('/:id/stats', authMiddleware, async (req, res) => {
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
      
      if (q.type === 'radio' || q.type === 'checkbox') {
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

router.post('/public/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    const [questionnaires] = await pool.execute(
      'SELECT * FROM questionnaires WHERE id = ? AND status = 1',
      [id]
    );
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在或已停用' });
    }
    
    const questionnaire = questionnaires[0];
    const now = new Date();
    
    if (questionnaire.publish_at && new Date(questionnaire.publish_at) > now) {
      return res.status(403).json({ code: 403, message: '问卷尚未发布' });
    }
    
    if (questionnaire.expire_at && new Date(questionnaire.expire_at) < now) {
      return res.status(403).json({ code: 403, message: '问卷已过期' });
    }
    
    if (questionnaire.access_type === 'password') {
      if (!password) {
        return res.json({
          code: 200,
          message: '需要密码验证',
          data: { needPassword: true }
        });
      }
      if (password !== questionnaire.password) {
        return res.status(401).json({ code: 401, message: '密码错误' });
      }
    }
    
    res.json({
      code: 200,
      message: '验证成功',
      data: { needPassword: false }
    });
  } catch (error) {
    console.error('Verify questionnaire access error:', error);
    res.status(500).json({ code: 500, message: '验证失败' });
  }
});

router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.query;
    
    const [questionnaires] = await pool.execute(
      'SELECT * FROM questionnaires WHERE id = ? AND status = 1',
      [id]
    );
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在或已停用' });
    }
    
    const questionnaire = questionnaires[0];
    const now = new Date();
    
    if (questionnaire.publish_at && new Date(questionnaire.publish_at) > now) {
      return res.status(403).json({ code: 403, message: '问卷尚未发布' });
    }
    
    if (questionnaire.expire_at && new Date(questionnaire.expire_at) < now) {
      return res.status(403).json({ code: 403, message: '问卷已过期' });
    }
    
    if (questionnaire.access_type === 'password') {
      if (!password || password !== questionnaire.password) {
        return res.status(403).json({ code: 403, message: '该问卷需要密码访问，请先验证密码' });
      }
    }
    
    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE questionnaire_id = ? ORDER BY sort_order ASC, id ASC',
      [id]
    );
    
    questions.forEach(q => {
      if (!q.options) {
        q.options = [];
      } else if (typeof q.options === 'string') {
        try {
          q.options = JSON.parse(q.options);
        } catch (e) {
          q.options = [];
        }
      }
      if (q.jump_logic && typeof q.jump_logic === 'string') {
        try {
          q.jump_logic = JSON.parse(q.jump_logic);
        } catch (e) {
          q.jump_logic = null;
        }
      }
    });
    
    res.json({
      code: 200,
      data: {
        questionnaire: {
          id: questionnaire.id,
          title: questionnaire.title,
          description: questionnaire.description,
          access_type: questionnaire.access_type,
          max_responses_per_user: questionnaire.max_responses_per_user,
          ip_limit: questionnaire.ip_limit
        },
        questions
      }
    });
  } catch (error) {
    console.error('Get public questionnaire error:', error);
    res.status(500).json({ code: 500, message: '获取问卷失败' });
  }
});

router.get('/:id/settings', authMiddleware, async (req, res) => {
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
    
    res.json({
      code: 200,
      data: questionnaires[0]
    });
  } catch (error) {
    console.error('Get questionnaire settings error:', error);
    res.status(500).json({ code: 500, message: '获取问卷设置失败' });
  }
});

router.put('/:id/settings', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { publish_at, expire_at, access_type, password, max_responses_per_user, ip_limit, status } = req.body;
    
    const [questionnaires] = await pool.execute(
      'SELECT id FROM questionnaires WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }
    
    const updateFields = [];
    const updateValues = [];
    
    if (publish_at !== undefined) {
      updateFields.push('publish_at = ?');
      updateValues.push(publish_at || null);
    }
    if (expire_at !== undefined) {
      updateFields.push('expire_at = ?');
      updateValues.push(expire_at || null);
    }
    if (access_type !== undefined) {
      updateFields.push('access_type = ?');
      updateValues.push(access_type || 'public');
    }
    if (password !== undefined) {
      updateFields.push('password = ?');
      updateValues.push(password || null);
    }
    if (max_responses_per_user !== undefined) {
      updateFields.push('max_responses_per_user = ?');
      updateValues.push(max_responses_per_user || 0);
    }
    if (ip_limit !== undefined) {
      updateFields.push('ip_limit = ?');
      updateValues.push(ip_limit ? 1 : 0);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status ? 1 : 0);
    }
    
    updateValues.push(id);
    
    await pool.execute(
      `UPDATE questionnaires SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    res.json({
      code: 200,
      message: '设置更新成功'
    });
  } catch (error) {
    console.error('Update questionnaire settings error:', error);
    res.status(500).json({ code: 500, message: '更新问卷设置失败' });
  }
});

module.exports = router;
