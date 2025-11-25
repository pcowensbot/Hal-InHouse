# HAL - Home AI Box

> Your personal, self-hosted family AI assistant with complete privacy and parental oversight.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-15-blue.svg)

## What is HAL?

HAL is a self-hosted AI platform designed for families who want the benefits of AI assistance while maintaining complete privacy and control. All conversations, data, and AI processing happen on your own hardware - nothing leaves your home.

**Perfect for:**
- Families wanting AI help for kids' homework and learning
- Privacy-conscious users who don't want data sent to cloud services
- Home lab enthusiasts looking for a practical AI project
- Creative users who want local image generation

## Features

### Chat & AI
- **Natural conversations** with Llama 3.1 AI model (via Ollama)
- **Voice input/output** - speak to HAL and hear responses (browser STT/TTS)
- **Real-time streaming** responses via WebSocket
- **Conversation history** with auto-generated titles
- **Chat import** from Claude.ai and ChatGPT share links (with images)

### Knowledge Base
- **Star important responses** to save them for later
- **Organize into books** - group related notes by topic
- **AI-powered auto-organize** - local Llama suggests book groupings
- **Quick access** from chat sidebar

### Image Generation
- **Text-to-image** with Stable Diffusion (requires NVIDIA GPU)
- **Image import** from external chat links

### For Parents
- **Dashboard** with family activity overview
- **View all conversations** across the household
- **Invite-only system** - generate codes to add family members
- **Email invites** with customizable templates
- **Review deleted chats** before permanent removal
- **Search messages** by keyword
- **Archive user data** before deletion
- **GPU assignment controls** for multi-GPU systems

### Personalization
- **User avatars** stored in database
- **18 font choices** across 3 categories (Professional, Easy to Read, Fun)
- **Dark/Light themes** with per-user preference
- **Mobile responsive** design

## Quick Start

### Prerequisites

**Hardware:**
- Server or PC (Linux recommended)
- 16GB+ RAM recommended
- NVIDIA GPU with 8GB+ VRAM required (for Llama 3.1 8B model)
- Second NVIDIA GPU optional (can be assigned to image generation or other services)

**Software:**
- Ubuntu 20.04+ (or similar Linux distribution)
- Node.js 20+
- PostgreSQL 15+
- Redis
- [Ollama](https://ollama.ai) with Llama 3.1 8B model

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pcowensbot/Hal-InHouse.git
   cd Hal-InHouse
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

   For development:
   ```bash
   npm run dev
   ```

   For production (recommended):
   ```bash
   # From the hal root directory (not server/)
   cd ..
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup  # Follow instructions to start on boot
   ```

7. **Access HAL**
   - Open `http://localhost:3000` in your browser
   - The first account created becomes a parent/admin
   - Generate invite codes to add family members

## Optional: Image Generation Setup

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

Once installed, users will see a "New Image" button in the chat interface.

## Architecture

```
┌─────────────────────────────────────────────┐
│           Frontend (Vanilla JS)             │
│  • Chat Interface  • Parent Dashboard       │
│  • Knowledge Base  • User Profiles          │
└─────────────────┬───────────────────────────┘
                  │ HTTP / WebSocket
┌─────────────────▼───────────────────────────┐
│         Backend (Node.js + Express)         │
│  • REST API      • Authentication (JWT)     │
│  • WebSocket     • Rate Limiting            │
└─────┬─────────┬──────────┬─────────────────┘
      │         │          │
┌─────▼────┐ ┌──▼─────┐ ┌──▼─────────────────┐
│PostgreSQL│ │ Redis  │ │ Ollama (Llama 3.1) │
│  +Prisma │ │ Cache  │ │ + Stable Diffusion │
└──────────┘ └────────┘ └────────────────────┘
```

**Tech Stack:**
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL 15
- **Cache:** Redis
- **AI Models:**
  - Llama 3.1 8B (via Ollama) - chat
  - Stable Diffusion 1.5 (optional) - images
- **Web Scraping:** Puppeteer with stealth plugin (for chat imports)

## Project Structure

```
hal/
├── server/
│   ├── src/
│   │   ├── config/          # Database, Redis, Ollama setup
│   │   ├── routes/          # API endpoints
│   │   │   ├── auth.js      # Login, signup, invites
│   │   │   ├── chat.js      # Conversations, messages
│   │   │   ├── parent.js    # Parent dashboard
│   │   │   ├── knowledge.js # Knowledge Base
│   │   │   ├── import.js    # Chat import
│   │   │   ├── image.js     # Image generation
│   │   │   └── admin.js     # System settings
│   │   ├── services/        # AI, chat importer, utilities
│   │   └── index.js         # Main server file
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── generate_image.py    # Stable Diffusion script
│   └── package.json
├── public/                  # Frontend static files
│   ├── index.html           # Login page
│   ├── chat.html            # Chat interface
│   ├── parent.html          # Parent dashboard
│   ├── knowledge.html       # Knowledge Base
│   ├── profile.html         # User settings
│   ├── uploads/             # User uploads (gitignored)
│   │   └── imported-images/ # Images from chat imports
│   ├── styles.css           # Global styles
│   └── *.js                 # Client-side scripts
├── ecosystem.config.js      # PM2 configuration
├── .claude/                 # Claude Context System
│   ├── CONTEXT.md           # Project context
│   └── sessions/            # Session logs (gitignored)
└── README.md
```

## Usage

### Invite-Only Authentication

HAL uses an invite-only system for security:

1. First user becomes a **Parent** automatically
2. Parents generate invite codes in the dashboard
3. Share codes with family members
4. Optional: Send email invites directly from HAL
5. Codes can be one-time use with optional expiration

### Chatting with HAL

1. Click "New Chat" to start a conversation
2. Type your question and press Enter
3. HAL responds using the local Llama model
4. Star important responses to save to Knowledge Base
5. Rename conversations by clicking the title

### Knowledge Base

1. Star any AI response to save it
2. Access via sidebar "Knowledge Base" link
3. Organize notes into books (topics)
4. Use "Auto-Organize" for AI-suggested groupings

### Chat Import

Import conversations from other AI platforms:

1. Click "Import Chat" in the sidebar
2. Paste a share link from Claude.ai or ChatGPT
3. HAL scrapes the conversation (including images)
4. View imported chat in your history

### Parent Dashboard

Parents access `/parent.html` for:

- **Overview:** Activity stats and recent messages
- **Conversations:** View all family chats
- **Family Members:** Manage users and invites
- **Pending Deletions:** Review before permanent delete
- **Search:** Find messages across all conversations
- **GPU Settings:** Assign GPUs to services (multi-GPU systems)

## Configuration

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

### PM2 Commands

```bash
pm2 start ecosystem.config.js  # Start server
pm2 logs hal                   # View logs
pm2 restart hal                # Restart server
pm2 stop hal                   # Stop server
pm2 status                     # Check status
```

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
}
```

## Security

- **Authentication:** JWT tokens with configurable expiration
- **Passwords:** bcrypt hashing with salt
- **Rate Limiting:** Configurable per-IP limits
- **SQL Injection:** Protected via Prisma ORM
- **XSS Protection:** Input sanitization
- **Invite System:** No public signup
- **HTTPS:** Use nginx with Let's Encrypt for production

## Troubleshooting

### Server won't start
```bash
pm2 logs hal                           # Check logs
sudo lsof -i :3000                     # Check if port in use
psql -U hal_user -d hal -h localhost   # Verify database
```

### Ollama not responding
```bash
systemctl status ollama
curl http://localhost:11434/api/generate -d '{"model": "llama3.1:8b", "prompt": "Hello"}'
```

### Image generation fails
```bash
nvidia-smi                                    # Check GPU
python3 server/generate_image.py "test"       # Test directly
```

### Chat import fails
```bash
# Check Puppeteer dependencies (Debian/Ubuntu)
sudo apt-get install -y libx11-xcb1 libxcomposite1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0
```

## Contributing

Contributions are welcome! Feel free to:
- Report bugs via issues
- Suggest features
- Submit pull requests
- Improve documentation

## License

MIT License - feel free to use this for your own family!

## Acknowledgments

- [Ollama](https://ollama.ai) for making local LLMs easy
- [Meta](https://ai.meta.com/llama/) for Llama 3.1
- [Stability AI](https://stability.ai) for Stable Diffusion
- The open-source community

---

**Built with care for family privacy, education, and fun!**
