# 🤖 HAL - Home AI Box

> Your personal, self-hosted family AI assistant with complete privacy and parental oversight.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-15-blue.svg)

## 🎯 What is HAL?

HAL is a self-hosted AI platform designed for families who want the benefits of AI assistance while maintaining complete privacy and control. All conversations, data, and AI processing happen on your own hardware - nothing leaves your home.

**Perfect for:**
- 👨‍👩‍👧‍👦 Families wanting AI help for kids' homework and learning
- 🔒 Privacy-conscious users who don't want data sent to cloud services
- 🏠 Home lab enthusiasts looking for a practical AI project
- 🎨 Creative users who want local image generation

## ✨ Features

### For Everyone
- 💬 **Natural conversations** with Llama 3.1 AI model
- 🎨 **Image generation** using Stable Diffusion (if you have a compatible GPU)
- ⭐ **Star important chats** to keep them at the top
- 🌙 **Dark/Light themes** for comfortable viewing
- 📱 **Responsive design** works on desktop, tablet, and mobile
- 🔒 **Complete privacy** - all data stays on your server

### For Parents
- 📊 **Dashboard** with family activity overview
- 👀 **View all conversations** across the household
- 🗑️ **Review deleted chats** before permanent removal
- 🔍 **Search messages** by keyword
- 👥 **Manage family members** and accounts
- 🔐 **Full control** over the system

### For Kids
- 🎓 Homework help and tutoring
- 💭 Safe space to explore ideas and ask questions
- 🖼️ Generate creative images from text descriptions
- 📚 Learn through conversation
- ✅ Parents can see conversations (encouraging responsible use)

## 🚀 Quick Start

### Prerequisites

**Hardware:**
- Server or PC (Linux recommended)
- 8GB+ RAM minimum
- NVIDIA GPU optional (for image generation)

**Software:**
- Ubuntu 20.04+ (or similar Linux distribution)
- Node.js 20+
- PostgreSQL 15+
- Redis
- [Ollama](https://ollama.ai) with Llama 3.1 8B model

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hal.git
   cd hal
   ```

2. **Set up PostgreSQL database**
   ```bash
   sudo -u postgres psql
   ```

   In PostgreSQL:
   ```sql
   CREATE DATABASE hal;
   CREATE USER hal_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE hal TO hal_user;
   \c hal
   GRANT ALL ON SCHEMA public TO hal_user;
   \q
   ```

3. **Install Ollama and pull the model**
   ```bash
   # Install Ollama (see https://ollama.ai)
   curl -fsSL https://ollama.ai/install.sh | sh

   # Pull Llama 3.1 8B
   ollama pull llama3.1:8b
   ```

4. **Configure environment**
   ```bash
   cd server
   cp .env.example .env
   nano .env
   ```

   Update these values in `.env`:
   ```env
   DATABASE_URL="postgresql://hal_user:your_secure_password@localhost:5432/hal"
   JWT_SECRET="generate_a_random_32_character_string"
   SESSION_SECRET="generate_another_random_32_character_string"
   ```

   Generate secrets with: `openssl rand -base64 32`

5. **Install dependencies and initialize database**
   ```bash
   npm install
   npx prisma db push
   ```

6. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode (recommended with PM2)
   npm install -g pm2
   pm2 start src/index.js --name hal
   pm2 save
   pm2 startup  # Follow instructions to start on boot
   ```

7. **Access HAL**
   - Open `http://localhost:3000` in your browser
   - Create your first account (will be a parent account)
   - Start chatting!

## 🎨 Optional: Image Generation Setup

If you have an NVIDIA GPU (2GB+ VRAM), you can enable image generation:

```bash
# Install PyTorch with CUDA support
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Install Stable Diffusion dependencies
pip3 install diffusers transformers accelerate

# Test it (will download Stable Diffusion 1.5 model ~2GB)
cd server
python3 generate_image.py "a beautiful sunset over mountains"
```

Once installed, users will see a "🎨 New Image" button in the chat interface!

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           Frontend (Vanilla JS)             │
│  • Chat Interface  • Parent Dashboard       │
│  • Image Generator • User Profiles          │
└─────────────────┬───────────────────────────┘
                  │ HTTPS / WebSocket
┌─────────────────▼───────────────────────────┐
│         Backend (Node.js + Express)         │
│  • REST API      • Authentication           │
│  • WebSocket     • Rate Limiting            │
└─────┬─────────┬──────────┬─────────────────┘
      │         │          │
┌─────▼────┐ ┌──▼─────┐ ┌─▼──────────────────┐
│PostgreSQL│ │ Redis  │ │ Ollama (Llama 3.1) │
│  +Prisma │ │ Cache  │ │   + Stable Diffusion│
└──────────┘ └────────┘ └────────────────────┘
```

**Tech Stack:**
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL 15
- **Cache:** Redis
- **AI Models:**
  - Llama 3.1 8B (via Ollama)
  - Stable Diffusion 1.5 (optional, for images)

## 📖 Usage

### Creating Accounts

1. First user becomes a **Parent** automatically
2. Parents can share the signup link with family members
3. New users choose role: **Parent** or **Child**

### Chatting with HAL

1. Click "💬 New Chat" to start a conversation
2. Type your question and press Enter or click Send
3. HAL responds using the Llama 3.1 model
4. Conversations auto-save with generated titles
5. Star important conversations to keep them at the top

### Generating Images

1. Click "🎨 New Image" button
2. Describe what you want to create
3. Click "Generate Image"
4. Wait ~15-20 seconds for your image!

### Parent Dashboard

Parents get access to a special dashboard at `/parent.html`:

- **Overview:** Activity stats and recent messages
- **Conversations:** View all family chats
- **Pending Deletions:** Review deleted conversations before they're gone forever
- **Family Members:** See all users and their activity
- **Search:** Find messages by keyword across all conversations

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | Secret for JWT tokens | Required |
| `SESSION_SECRET` | Secret for sessions | Required |
| `OLLAMA_BASE_URL` | Ollama API endpoint | `http://localhost:11434` |
| `OLLAMA_MODEL` | AI model to use | `llama3.1:8b` |

### Using a Reverse Proxy (nginx)

For production, use nginx with SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /generated-images/ {
        alias /home/yourusername/hal/public/generated-images/;
    }
}
```

## 🛠️ Development

### Project Structure

```
hal/
├── server/
│   ├── src/
│   │   ├── config/          # Database, Redis, Ollama setup
│   │   ├── routes/          # API endpoints
│   │   │   ├── auth.js      # Login, signup
│   │   │   ├── chat.js      # Conversations, messages
│   │   │   ├── parent.js    # Parent dashboard
│   │   │   └── image.js     # Image generation
│   │   ├── middleware/      # Authentication, logging
│   │   ├── services/        # AI service, utilities
│   │   └── index.js         # Main server file
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── generate_image.py    # Stable Diffusion script
│   └── package.json
├── public/                  # Frontend static files
│   ├── index.html           # Login page
│   ├── chat.html            # Chat interface
│   ├── parent.html          # Parent dashboard
│   ├── profile.html         # User settings
│   ├── styles.css           # Global styles
│   ├── chat.js              # Chat functionality
│   └── parent.js            # Dashboard functionality
└── README.md
```

### Available Scripts

```bash
# Development (auto-reload on changes)
npm run dev

# Production
npm start

# Database
npm run db:push    # Push schema changes to database
npm run db:studio  # Open Prisma Studio (database GUI)

# PM2 (production process manager)
pm2 start src/index.js --name hal
pm2 logs hal       # View logs
pm2 restart hal    # Restart server
pm2 stop hal       # Stop server
```

### API Endpoints

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/change-password` - Change password

**Chat (requires authentication):**
- `GET /api/chat/conversations` - List user's conversations
- `GET /api/chat/conversations/:id` - Get conversation with messages
- `POST /api/chat/conversations` - Create new conversation
- `POST /api/chat/conversations/:id/messages` - Send message
- `PATCH /api/chat/conversations/:id` - Update conversation title
- `PATCH /api/chat/conversations/:id/star` - Star/unstar conversation
- `DELETE /api/chat/conversations/:id` - Soft delete conversation

**Image Generation (requires authentication):**
- `POST /api/image/generate` - Generate image from prompt

**Parent Dashboard (requires parent role):**
- `GET /api/parent/users` - List all family members
- `GET /api/parent/conversations` - View all conversations
- `GET /api/parent/pending-deletions` - View deleted conversations
- `POST /api/parent/conversations/:id/restore` - Restore deleted conversation
- `DELETE /api/parent/conversations/:id/permanent` - Permanently delete conversation
- `GET /api/parent/stats` - Activity statistics
- `GET /api/parent/search?q=keyword` - Search messages

## 🔐 Security

- **Authentication:** JWT tokens with 30-day expiration
- **Passwords:** bcrypt hashing with salt
- **Rate Limiting:** 60 requests/minute per IP
- **SQL Injection:** Protected via Prisma ORM parameterized queries
- **XSS Protection:** Input sanitization on frontend and backend
- **HTTPS:** Use nginx with Let's Encrypt for production

## 📊 Performance

Tested on Intel Xeon E5-2687W with GTX 1070 (8GB):
- **Response Time:** 2-3 seconds average
- **AI Speed:** 40-50 tokens/second
- **Image Generation:** 15-20 seconds per image (512x512)
- **Concurrent Users:** 5-10+ easily supported

Lower-end hardware will work but with slower responses.

## 🐛 Troubleshooting

### Server won't start
```bash
# Check logs
pm2 logs hal

# Check if port 3000 is already in use
sudo lsof -i :3000

# Verify database connection
psql -U hal_user -d hal -h localhost
```

### Ollama not responding
```bash
# Check Ollama service
systemctl status ollama

# Test Ollama directly
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "Hello"
}'
```

### Image generation fails
```bash
# Check GPU availability
nvidia-smi

# Test Python script directly
python3 server/generate_image.py "test image"
```

## 🤝 Contributing

This is a personal project, but contributions are welcome! Feel free to:
- 🐛 Report bugs via issues
- 💡 Suggest features
- 🔧 Submit pull requests
- 📖 Improve documentation

## 📝 License

MIT License - feel free to use this for your own family!

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai) for making local LLMs easy
- [Meta](https://ai.meta.com/llama/) for Llama 3.1
- [Stability AI](https://stability.ai) for Stable Diffusion
- The open-source community for amazing tools

## 💬 Support & Community

- **Issues:** Found a bug? [Open an issue](https://github.com/yourusername/hal/issues)
- **Discussions:** Have questions? Start a [discussion](https://github.com/yourusername/hal/discussions)
- **Self-Hosting:** Check out [r/selfhosted](https://reddit.com/r/selfhosted) for more projects

---

**Built with ❤️ for family privacy, education, and fun!**

*"I'm sorry Dave, I'm afraid I can do that."* - HAL (the friendly version)
