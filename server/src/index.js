import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import parentRoutes from './routes/parent.js';
import imageRoutes from './routes/image.js';
import knowledgeRoutes from './routes/knowledge.js';
import deviceRoutes from './routes/devices.js';
import llmRoutes from './routes/llm.js';
import adminRoutes from './routes/admin.js';

// Import services
import ollamaService from './services/ollama.js';
import redisClient from './config/redis.js';
import prisma from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, '../../public')));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const [dbHealth, ollamaHealth] = await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      ollamaService.checkHealth(),
    ]);

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth ? 'connected' : 'disconnected',
        redis: redisClient.isOpen ? 'connected' : 'disconnected',
        ollama: ollamaHealth ? 'connected' : 'disconnected',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/admin', adminRoutes);

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   HAL - Home AI Box                    ║
║   Server running on port ${PORT}         ║
╚════════════════════════════════════════╝

🌐 Local:    http://localhost:${PORT}
🔒 SSL:      https://mini-claude.pcowens.com

Services:
  📊 Database: PostgreSQL (localhost:5432)
  🔴 Redis:    localhost:6379
  🤖 Ollama:   ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}

Press Ctrl+C to stop
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});
