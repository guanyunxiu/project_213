const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { apiLimiter } = require('./middleware/rateLimit');

const userRoutes = require('./routes/user');
const questionnaireRoutes = require('./routes/questionnaire');
const responseRoutes = require('./routes/response');
const templateRoutes = require('./routes/template');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(apiLimiter);

app.use('/api/user', userRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/response', responseRoutes);
app.use('/api/template', templateRoutes);

app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '服务运行正常', timestamp: new Date().toISOString() });
});

app.get('/api/config/server-url', (req, res) => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let serverIp = 'localhost';
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        serverIp = iface.address;
        break;
      }
    }
    if (serverIp !== 'localhost') break;
  }
  
  const clientPort = 5174;
  const clientUrl = `http://${serverIp}:${clientPort}`;
  
  res.json({
    code: 200,
    data: {
      serverIp,
      clientUrl,
      clientPort
    }
  });
});

app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

async function startServer() {
  try {
    await initDatabase();
    await connectRedis();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
