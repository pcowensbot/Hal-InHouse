# HAL In-House - Claude Context

> **Last Updated:** 2025-11-22
> **Version:** 1.1.0
> **Status:** Production - Active Development

## 🎯 Project Vision

HAL is a multi-agent AI system designed for families, featuring a web interface, voice capabilities, and team collaboration features. The system enables dynamic agent creation, agent-to-agent communication, and personalized AI interactions with conversation history and knowledge management.

## 📊 Current State

### What's Working
- ✅ Multi-agent system with dynamic creation and management
- ✅ Real-time web interface with chat and team monitoring
- ✅ Voice input/output (STT/TTS) with multiple voices
- ✅ PostgreSQL database with conversation history and agent persistence
- ✅ PM2 production deployment configuration
- ✅ Comprehensive tool system (web search, file ops, code execution)
- ✅ Agent-to-agent communication framework
- ✅ Invite-only authentication system for families
- ✅ Parent dashboard with invite management and user deletion
- ✅ Email invite functionality
- ✅ Knowledge Base backend (database schema + API)
- ✅ Star functionality on AI responses in chat
- ✅ Conversation rename functionality
- ✅ Mobile responsiveness with fixed sidebar scroll
- ✅ Theme consistency across all pages
- ✅ Database-backed user avatars
- ✅ Diverse font selection (18 fonts in 3 categories)
- ✅ Live font preview in profile settings
- ✅ User account deletion with archive functionality
- ✅ Parent/admin user management with archive capability
- ✅ Chat import from external platforms (Claude.ai and ChatGPT)
- ✅ Headless browser scraping with bot detection bypass

### In Progress
- 🔨 Knowledge Base UI implementation (backend complete, frontend pending)
  - Phases 1-5 planned in detail
  - Star button functional in chat
  - Need to build full book/note organization interface

### Next Priorities
1. **Knowledge Base Phase 1**: Create basic UI for viewing starred notes and books
2. **Knowledge Base Phase 2**: Implement book management (create, edit, delete)
3. **Knowledge Base Phase 3**: Note organization and editing features
4. Mobile responsiveness polish
5. Parent dashboard integration for family knowledge sharing

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSocket via Socket.io
- **AI**: OpenAI API integration
- **Process Management**: PM2 with ecosystem.config.js
- **Web Scraping**: Puppeteer with stealth plugin for chat imports

### Frontend
- **Framework**: Static HTML/CSS/JS (no framework - vanilla JS)
- **Styling**: Custom CSS with modern features
- **Real-time Updates**: Socket.io client
- **Voice**: Browser STT/TTS APIs

### Database Schema (Prisma)
- `User` - Family members with authentication
- `Agent` - AI agents with personalities and context
- `Conversation` - Chat sessions
- `Message` - Individual messages in conversations
- `InviteCode` - Family invite system
- `Book` - Collections for organizing starred notes
- `StarredNote` - Saved AI responses with titles and notes

### Tools & Services
- Web search integration
- File operations
- Code execution capabilities
- System commands
- Text-to-speech with multiple voices

## 💻 Code Patterns & Preferences

### General Principles
- Clear, readable code over clever solutions
- Descriptive commit messages following the established format
- Test incrementally - don't build everything at once
- Document important decisions in session logs
- Keep frontend vanilla JS (no framework dependencies)

### Commit Message Format
```
Brief description of changes

Details:
- Bullet point list of specific changes
- What was modified and why
- File locations when relevant

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### File Organization
```
/hal
├── server/          # Backend application
│   ├── src/         # Source code
│   │   ├── routes/  # API endpoints
│   │   └── index.js # Main server
│   ├── prisma/      # Database schema
│   ├── agents/      # Agent system
│   └── services/    # Core services
├── public/          # Frontend assets
│   ├── chat.html    # Main chat interface
│   ├── knowledge.html # Knowledge Base UI
│   ├── team.html    # Team monitoring
│   └── *.js/css     # Client-side code
├── database/        # SQLite files (gitignored)
├── logs/            # Application logs (gitignored)
└── .claude/         # Context system
```

### CSS Patterns
- Use CSS custom properties for theming
- Mobile-first responsive design
- Smooth transitions and hover effects
- Consistent spacing and layout patterns

### API Patterns
- RESTful endpoints under `/api/`
- Express router organization by feature
- Error handling with try/catch and proper status codes
- Socket.io for real-time updates

## 📝 Recent Sessions

### Session 8 (2025-11-22 Evening) - Chat Import Feature
- Implemented chat import from Claude.ai and ChatGPT share links
- Installed Puppeteer with stealth plugin to bypass Cloudflare bot detection
- Created `/server/src/services/chatImporter.js` for headless browser scraping
- Added `/api/import/chat` endpoint for processing imports
- Built import UI with modal and "Import Chat" button in sidebar
- Fixed disk usage BigInt serialization error in admin dashboard
- Successfully tested both Claude and ChatGPT imports

**Major Features**:
- Headless browser with stealth mode bypasses bot detection
- Intelligent message grouping for multi-part Claude responses
- Supports both Claude.ai and ChatGPT share link formats
- Auto-refreshes conversation list after import
- Loading states and error handling in UI

**Files Modified**:
- `server/package.json` - Added puppeteer-extra and stealth plugin
- `server/src/services/chatImporter.js` - New scraping service
- `server/src/routes/import.js` - New import API endpoint
- `server/src/index.js` - Registered import routes
- `public/chat.html` - Added import button and modal
- `public/chat.js` - Import form handling and API integration
- `server/src/routes/admin.js` - Fixed BigInt serialization bug

**Commits**: (Pending)

### Session 7 (2025-11-22) - UI Improvements & User Management
- Fixed mobile sidebar scroll causing page refresh
- Added theme consistency across all pages (Knowledge Base fixed)
- Added 9 new fonts with live preview (18 total fonts in categories)
- Fixed avatar display using database-backed avatars
- Implemented user account deletion with archive functionality
- Moved archive feature to Family Members page for parent/admin control
- Simplified profile deletion to complete-only for users
- Set user 'fraz' as SUPER_ADMIN
- Enhanced menu blocks with accent color borders

**Major Features**:
- Mobile overscroll fixes (position: fixed, overscroll-behavior)
- Font categories: Professional, Easy to Read, Fun & Whimsical
- Archive downloads conversations as JSON before deletion
- Parent/admin can archive family members' data
- Code blocks always use monospace regardless of body font

**Commits**: `63792df`, `40e240d`, `9018030`, `0f56623`, `7a54859`

### Session 6 (2025-11-17) - Context System Migration
- Migrated from WORKLOG.md to Claude Context System
- Created `.claude/` directory structure
- Consolidated all project knowledge into CONTEXT.md

### Session 5 (2025-11-16) - UI/UX Improvements
- Fixed collapse button positioning across all pages
- Moved collapse button inside sidebar-header for better layout
- Added Knowledge Base page mobile improvements
- Implemented mobile overlay for proper mobile UX
- Consistent sidebar toggle behavior

**Commits**: `45def21` - Fix collapse button position and add to Knowledge Base page, `63e0d77` - Add Knowledge Base quick access to chat sidebar

### Session 4 (2025-11-11) - Knowledge Base Foundation
- Implemented complete backend for Knowledge Base
- Added `Book` and `StarredNote` models to database
- Created `/api/knowledge` endpoints (CRUD for books and notes)
- Added star button to all AI responses in chat
- Added conversation rename functionality
- Message footer layout improvements

**Files**: `server/prisma/schema.prisma`, `server/src/routes/knowledge.js`, `public/chat.js`, `public/styles.css`

### Session 3 (2025-11-11) - Email Invites & Sidebar
- Email invite functionality with customizable templates
- Improved sidebar UI for parent dashboard
- Email tracking (emailedTo, emailedAt) in database
- Better icon-only collapsed view

### Session 2 (2025-11-11) - Invite-Only Authentication
- Removed public signup
- Implemented invite code system
- Added InviteCode model
- Created invite management UI for parents
- One-time use codes with expiration support

### Session 1 - Initial Setup
- Complete HAL multi-agent system implementation
- Web interface with voice support
- Database and persistence layer
- PM2 configuration
- Comprehensive documentation

## 🐛 Known Issues

### Current Issues
- Knowledge Base UI not yet implemented (only backend exists)
- Some mobile responsiveness edge cases may remain

### Technical Debt
- Consider adding TypeScript for better type safety
- Could benefit from component framework if UI grows significantly
- Session logs should be created for each development session

## 📋 Knowledge Base Implementation Plan

**Current Status**: Backend complete, star functionality working, UI needed

### Phase 1: Basic UI (NEXT PRIORITY)
- [ ] Create `public/knowledge.html` or add tab to sidebar
- [ ] Create `public/knowledge.js` with book/note loading
- [ ] Display books and unorganized notes
- [ ] Add "📚 Knowledge Base" nav item to chat sidebar
- [ ] Basic styling for book and note cards

### Phase 2: Book Management
- [ ] "Create Book" button with modal (name + description)
- [ ] Display books as cards with note counts
- [ ] Click book to view its notes
- [ ] Edit/delete book functionality

### Phase 3: Note Organization
- [ ] Move notes between books
- [ ] Edit note title and custom notes
- [ ] View full AI response with context
- [ ] Delete/unstar functionality
- [ ] Search notes within Knowledge Base

### Phase 4: Parent Dashboard Integration
- [ ] "Family Knowledge" tab in parent dashboard
- [ ] View all users' starred notes
- [ ] Filter by user
- [ ] See what topics kids are learning about

### Phase 5: Polish
- [ ] Resizable sidebar for chat
- [ ] Mobile responsiveness fixes
- [ ] Export notes/books to markdown or PDF
- [ ] Tags/categories for notes

## 📋 General Backlog

- [ ] Agent memory improvements
- [ ] More tool integrations
- [ ] Conversation export features
- [ ] Agent learning capabilities
- [ ] Metrics and monitoring dashboard

## 🔑 Important Files Reference

### Backend Core
- `server/src/index.js:1` - Main server entry point
- `server/services/database.js:1` - Database interface
- `server/agents/baseAgent.js:1` - Agent base class
- `server/prisma/schema.prisma:1` - Database schema

### Frontend Pages
- `public/chat.html:1` - Main chat interface
- `public/knowledge.html:1` - Knowledge Base UI (to be created)
- `public/team.html:1` - Team monitoring interface

### API Routes
- `server/src/routes/knowledge.js:1` - Knowledge Base endpoints
- `server/src/routes/` - All API route modules

### Configuration
- `ecosystem.config.js:1` - PM2 configuration
- `.gitignore` - Ignores logs, database, node_modules

## 🚀 Running the Project

### Start Development
```bash
npm install
pm2 start ecosystem.config.js
pm2 logs hal-server  # View logs
```

### Database
- Initializes automatically on first run
- Uses Prisma migrations
- SQLite file stored in `database/`

### Environment
- Voice features require proper API keys
- WebSocket for real-time updates
- All conversations logged to database

## 🔐 Authentication Flow

1. Invite-only system (no public signup)
2. Parents generate invite codes via dashboard
3. Codes can be one-time use with optional expiration
4. Email invite templates customizable
5. Track code usage and status

## 📚 Key Dependencies

- `express` - Web server
- `socket.io` - Real-time communication
- `@prisma/client` - Database ORM
- `better-sqlite3` - SQLite driver
- `openai` - AI integration
- Various tool libraries (search, TTS, etc.)

---

**Remember**: This context file is your memory. Update it when:
- Architecture changes
- New features are completed
- Major decisions are made
- Priorities shift
- Patterns are established

**Next Session**: Focus on Knowledge Base Phase 1 - create the basic UI for viewing and organizing starred notes into books.
