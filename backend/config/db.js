const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'questionnaire_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: ''
    });
    
    await connection.execute('CREATE DATABASE IF NOT EXISTS questionnaire_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await connection.end();
    
    await createTables();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

async function createTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL COMMENT 'NULL表示系统公共模板',
      name VARCHAR(200) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL COMMENT 'survey:调研 sign:报名 feedback:反馈 evaluation:测评 custom:自定义',
      questions JSON NOT NULL,
      is_public TINYINT DEFAULT 0 COMMENT '1:公开 0:私有',
      use_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS questionnaires (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      status TINYINT DEFAULT 1 COMMENT '1:启用 0:停用',
      publish_at DATETIME NULL COMMENT '定时发布时间',
      expire_at DATETIME NULL COMMENT '定时过期时间',
      access_type VARCHAR(20) DEFAULT 'public' COMMENT 'public:公开 password:密码',
      password VARCHAR(255) NULL,
      max_responses_per_user INT DEFAULT 0 COMMENT '0表示不限制',
      ip_limit TINYINT DEFAULT 0 COMMENT '1:启用IP限制 0:关闭',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      questionnaire_id INT NOT NULL,
      title VARCHAR(500) NOT NULL,
      type VARCHAR(30) NOT NULL COMMENT 'radio:单选 checkbox:多选 text:单行文本 textarea:多行文本 select:下拉 date:日期 rating:量表 description:说明文本',
      options JSON,
      required TINYINT DEFAULT 0 COMMENT '1:必填 0:非必填',
      sort_order INT DEFAULT 0,
      jump_logic JSON NULL COMMENT '题目逻辑跳转规则',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      questionnaire_id INT NOT NULL,
      respondent_ip VARCHAR(45),
      respondent_identity VARCHAR(255) NULL COMMENT '用户标识（用于限填）',
      submit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS response_answers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      response_id INT NOT NULL,
      question_id INT NOT NULL,
      answer TEXT,
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )`
  ];

  for (const sql of tables) {
    await pool.execute(sql);
  }

  await migrateExistingTables();
  await seedSystemTemplates();
}

async function migrateExistingTables() {
  try {
    const [columns] = await pool.execute("SHOW COLUMNS FROM questionnaires LIKE 'publish_at'");
    if (columns.length === 0) {
      await pool.execute('ALTER TABLE questionnaires ADD COLUMN publish_at DATETIME NULL AFTER status');
      await pool.execute('ALTER TABLE questionnaires ADD COLUMN expire_at DATETIME NULL AFTER publish_at');
      await pool.execute('ALTER TABLE questionnaires ADD COLUMN access_type VARCHAR(20) DEFAULT "public" AFTER expire_at');
      await pool.execute('ALTER TABLE questionnaires ADD COLUMN password VARCHAR(255) NULL AFTER access_type');
      await pool.execute('ALTER TABLE questionnaires ADD COLUMN max_responses_per_user INT DEFAULT 0 AFTER password');
      await pool.execute('ALTER TABLE questionnaires ADD COLUMN ip_limit TINYINT DEFAULT 0 AFTER max_responses_per_user');
      console.log('Questionnaires table migrated successfully');
    }

    const [qColumns] = await pool.execute("SHOW COLUMNS FROM questions LIKE 'jump_logic'");
    if (qColumns.length === 0) {
      await pool.execute("ALTER TABLE questions MODIFY COLUMN type VARCHAR(30) NOT NULL COMMENT 'radio:单选 checkbox:多选 text:单行文本 textarea:多行文本 select:下拉 date:日期 rating:量表 description:说明文本'");
      await pool.execute('ALTER TABLE questions ADD COLUMN jump_logic JSON NULL AFTER sort_order');
      console.log('Questions table migrated successfully');
    }

    const [rColumns] = await pool.execute("SHOW COLUMNS FROM responses LIKE 'respondent_identity'");
    if (rColumns.length === 0) {
      await pool.execute('ALTER TABLE responses ADD COLUMN respondent_identity VARCHAR(255) NULL AFTER respondent_ip');
      console.log('Responses table migrated successfully');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
}

async function seedSystemTemplates() {
  try {
    const [count] = await pool.execute('SELECT COUNT(*) as total FROM templates WHERE user_id IS NULL');
    if (count[0].total > 0) {
      console.log('System templates already exist');
      return;
    }

    const systemTemplates = [
      {
        name: '用户满意度调研',
        description: '用于收集用户对产品或服务的满意度反馈',
        category: 'survey',
        questions: JSON.stringify([
          { type: 'rating', title: '您对我们的产品/服务整体满意度如何？', required: true, options: { max: 5 } },
          { type: 'radio', title: '您使用我们产品/服务的频率是？', required: true, options: ['每天', '每周', '每月', '偶尔', '第一次使用'] },
          { type: 'checkbox', title: '您最喜欢我们产品的哪些方面？', required: false, options: ['价格实惠', '功能丰富', '界面友好', '响应速度快', '客户服务好', '其他'] },
          { type: 'textarea', title: '您对我们有什么建议或意见？', required: false }
        ]),
        is_public: 1
      },
      {
        name: '活动报名登记表',
        description: '通用活动报名模板，快速收集参与者信息',
        category: 'sign',
        questions: JSON.stringify([
          { type: 'text', title: '姓名', required: true },
          { type: 'text', title: '手机号码', required: true },
          { type: 'select', title: '性别', required: true, options: ['男', '女', '保密'] },
          { type: 'date', title: '出生日期', required: false },
          { type: 'radio', title: '参与人数', required: true, options: ['1人', '2人', '3人', '4人及以上'] },
          { type: 'textarea', title: '备注信息', required: false }
        ]),
        is_public: 1
      },
      {
        name: '客户反馈收集表',
        description: '收集客户意见和建议，持续改进服务质量',
        category: 'feedback',
        questions: JSON.stringify([
          { type: 'description', title: '感谢您抽出宝贵时间填写此反馈表，您的意见对我们非常重要！', required: false },
          { type: 'radio', title: '您对本次服务的整体评价是？', required: true, options: ['非常满意', '满意', '一般', '不满意', '非常不满意'] },
          { type: 'rating', title: '服务人员的专业程度', required: true, options: { max: 5 } },
          { type: 'rating', title: '问题解决效率', required: true, options: { max: 5 } },
          { type: 'textarea', title: '请详细描述您遇到的问题或建议：', required: false },
          { type: 'text', title: '联系方式（选填，便于我们回访）', required: false }
        ]),
        is_public: 1
      },
      {
        name: '员工绩效测评表',
        description: '用于企业内部员工绩效评估和360度反馈',
        category: 'evaluation',
        questions: JSON.stringify([
          { type: 'text', title: '被测评人姓名', required: true },
          { type: 'select', title: '测评维度', required: true, options: ['工作业绩', '团队协作', '创新能力', '责任心', '沟通能力', '学习能力'] },
          { type: 'rating', title: '请对该员工在本维度的表现打分', required: true, options: { max: 10 } },
          { type: 'radio', title: '该员工的优势主要体现在？', required: true, options: ['专业技能', '执行力', '领导力', '沟通协调', '解决问题', '其他'] },
          { type: 'textarea', title: '请列举具体事例说明该员工的工作表现：', required: true },
          { type: 'textarea', title: '您认为该员工需要改进的方面是？', required: false }
        ]),
        is_public: 1
      },
      {
        name: '市场调研问卷',
        description: '用于产品市场调研，了解用户需求和市场动态',
        category: 'survey',
        questions: JSON.stringify([
          { type: 'radio', title: '您的年龄段是？', required: true, options: ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '46岁以上'] },
          { type: 'radio', title: '您的职业是？', required: true, options: ['学生', '企业员工', '自由职业', '公务员/事业单位', '退休', '其他'] },
          { type: 'radio', title: '您的月收入水平？', required: true, options: ['3000以下', '3000-5000', '5000-10000', '10000-20000', '20000以上'] },
          { type: 'checkbox', title: '您通常通过哪些渠道获取产品信息？', required: true, options: ['搜索引擎', '社交媒体', '朋友推荐', '线下广告', '电商平台', '其他'] },
          { type: 'rating', title: '您对同类产品的价格接受度', required: true, options: { max: 5 } },
          { type: 'textarea', title: '您对我们的产品有什么期待？', required: false }
        ]),
        is_public: 1
      },
      {
        name: '培训课程报名表',
        description: '用于培训课程报名登记，收集学员信息',
        category: 'sign',
        questions: JSON.stringify([
          { type: 'text', title: '姓名', required: true },
          { type: 'text', title: '公司名称', required: true },
          { type: 'text', title: '职位', required: true },
          { type: 'text', title: '联系电话', required: true },
          { type: 'text', title: '电子邮箱', required: true },
          { type: 'select', title: '报名课程', required: true, options: ['初级班', '进阶班', '高级班', '定制班'] },
          { type: 'date', title: '期望参加日期', required: true },
          { type: 'textarea', title: '学习目标或特殊需求', required: false }
        ]),
        is_public: 1
      },
      {
        name: '产品使用反馈',
        description: '收集用户对产品功能的使用反馈和改进建议',
        category: 'feedback',
        questions: JSON.stringify([
          { type: 'description', title: '亲爱的用户，感谢您使用我们的产品！请花几分钟填写以下反馈，帮助我们做得更好。', required: false },
          { type: 'rating', title: '产品整体易用性', required: true, options: { max: 5 } },
          { type: 'rating', title: '功能完整性', required: true, options: { max: 5 } },
          { type: 'rating', title: '界面设计美观度', required: true, options: { max: 5 } },
          { type: 'rating', title: '运行稳定性', required: true, options: { max: 5 } },
          { type: 'checkbox', title: '您最常使用的功能有哪些？', required: true, options: ['数据统计', '报表导出', '协作功能', '模板管理', '其他'] },
          { type: 'textarea', title: '您最希望增加或改进的功能是？', required: true },
          { type: 'textarea', title: '您遇到过什么问题或Bug？', required: false }
        ]),
        is_public: 1
      },
      {
        name: '课程评价测评',
        description: '用于收集学生对课程和教师的评价反馈',
        category: 'evaluation',
        questions: JSON.stringify([
          { type: 'select', title: '课程名称', required: true, options: ['请选择课程'] },
          { type: 'rating', title: '课程内容的实用性', required: true, options: { max: 5 } },
          { type: 'rating', title: '教师讲解清晰度', required: true, options: { max: 5 } },
          { type: 'rating', title: '课堂互动性', required: true, options: { max: 5 } },
          { type: 'rating', title: '课程难度适中程度', required: true, options: { max: 5 } },
          { type: 'rating', title: '教学辅助材料质量', required: true, options: { max: 5 } },
          { type: 'radio', title: '您对本课程的整体满意度', required: true, options: ['非常满意', '满意', '一般', '不满意', '非常不满意'] },
          { type: 'textarea', title: '您对本课程的建议：', required: false }
        ]),
        is_public: 1
      }
    ];

    for (const template of systemTemplates) {
      await pool.execute(
        'INSERT INTO templates (user_id, name, description, category, questions, is_public) VALUES (NULL, ?, ?, ?, ?, ?)',
        [template.name, template.description, template.category, template.questions, template.is_public]
      );
    }

    console.log('System templates seeded successfully');
  } catch (error) {
    console.error('Seed templates error:', error);
  }
}

module.exports = { pool, initDatabase };
