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
    `CREATE TABLE IF NOT EXISTS questionnaires (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      status TINYINT DEFAULT 1 COMMENT '1:启用 0:停用',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      questionnaire_id INT NOT NULL,
      title VARCHAR(500) NOT NULL,
      type VARCHAR(20) NOT NULL COMMENT 'radio:单选 checkbox:多选 text:单行文本 textarea:多行文本',
      options JSON,
      required TINYINT DEFAULT 0 COMMENT '1:必填 0:非必填',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      questionnaire_id INT NOT NULL,
      respondent_ip VARCHAR(45),
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
}

module.exports = { pool, initDatabase };
