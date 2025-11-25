# 🤖 Claude Context System v1.0

## 🎯 For Claude: Read This First Every Session!

You are Claude, and you've just been started in a project that uses the **Claude Context System**. This system helps you maintain continuity across sessions by providing structured context, session history, and project knowledge.

---

## 🔍 First, Detect Your Situation

Look for the file: `.claude/CONTEXT.md`

- ✅ **File EXISTS** → Jump to [Established Project Mode](#established-project-mode)
- ❌ **File DOES NOT exist** → Continue to [First-Time Setup](#first-time-setup-mode)

---

## 🌱 First-Time Setup Mode

**You're in a new project!** The user wants you to set up the Claude Context System here.

### Step 1: Confirm with User

Before creating anything, ask the user:

```
Hi! I see this is a new project with the Claude Context System.

I can set up a complete context framework that will help me:
- Remember project details across sessions
- Track architectural decisions
- Maintain coding patterns
- Log session history
- Keep TODO lists

This will create a `.claude/` directory with several files.

Would you like me to set this up? [Y/n]
```

If they say no, stop here and just work normally.

### Step 2: Gather Project Information

If they say yes, ask these questions:

1. **"What is this project called?"** (e.g., "My Awesome App")
2. **"What's the tech stack?"** (e.g., "React + Node.js" or "Python + Django")
3. **"What's the main goal/vision?"** (brief description)
4. **"Any specific code patterns or preferences?"** (optional)

### Step 3: Create Directory Structure

Create this structure:
```
.claude/
├── CONTEXT.md              # Main context file
├── README.md               # System documentation
├── sessions/               # Session logs
│   └── .gitkeep
└── templates/
    └── session-log.md      # Template for sessions
```

### Step 4: Generate CONTEXT.md

Create `.claude/CONTEXT.md` using this template, filling in with their answers:

```markdown
# [Project Name] - Claude Context

> **Last Updated:** [Today's date]
> **Version:** 0.1.0
> **Status:** Initial Setup

## 🎯 Project Vision

[What they described as the goal]

## 📊 Current State

### What's Working
- Initial project setup
- Claude Context System installed

### In Progress
- [Ask user what they're working on]

### Next Priorities
- [Ask user what's next]

## 🏗️ Tech Stack

[What they described]

## 💻 Code Patterns & Preferences

[Any patterns they mentioned, or default to:]
- Clear, readable code
- Descriptive commit messages
- Test before committing
- Document decisions

## 📝 Recent Sessions

### Session 1 ([Today's Date]) - Initial Setup
- Installed Claude Context System
- Created project structure
- [Any other initial work]

## 🐛 Known Issues

None yet!

## 📋 Next Session TODO

- [ ] [Ask user what's priority #1]

---

**Remember:** Update this file as the project evolves!
```

### Step 5: Create Supporting Files

Create `.claude/README.md`:
```markdown
# Claude Context System

This directory contains context files that help Claude maintain continuity across sessions.

## How It Works

- `CONTEXT.md` - Main project context (READ THIS FIRST!)
- `sessions/` - Logs of each development session
- `templates/` - Templates for consistent documentation

## For Claude

At the start of each session:
1. Read `CONTEXT.md` thoroughly
2. Check recent session logs in `sessions/`
3. Ask user about today's goals
4. Work with full context!

At the end of each session:
1. Offer to create a session log
2. Update `CONTEXT.md` if significant changes
3. Commit changes with clear messages

## For Humans

Keep `CONTEXT.md` updated with:
- Architecture changes
- Important decisions
- New patterns or conventions
- Progress updates
```

Create `.claude/templates/session-log.md`:
```markdown
# Session: [DATE] - [DESCRIPTION]

**Date:** [Full date and time]
**Duration:** [Start] - [End]

## 🎯 Goals
- [ ] Goal 1
- [ ] Goal 2

## ✅ Accomplished
- What was completed

## 💡 Decisions Made
- Important choices and why

## 🐛 Issues Encountered
- Problems and solutions

## 📋 Next Session
- What to work on next

## 📝 Notes
- Any additional context
```

Create `.claude/sessions/.gitkeep`:
```
# This directory contains session logs
# Add .claude/sessions/*.md to your .gitignore to keep logs local
```

### Step 6: Update .gitignore

Check if `.gitignore` exists. If it does, add:
```
# Claude Context System - Session logs are local only
.claude/sessions/*.md
!.claude/sessions/.gitkeep
```

If `.gitignore` doesn't exist, ask user if they want one created.

### Step 7: Confirm Completion

Tell the user:
```
✅ Claude Context System is set up!

I've created:
- .claude/CONTEXT.md (your project brain)
- .claude/README.md (system documentation)
- .claude/sessions/ (session logs directory)
- .claude/templates/ (for consistent docs)

From now on, I'll start each session by reading CONTEXT.md to 
understand the project state. This means I'll remember:
- Project goals and architecture
- Code patterns you prefer
- What we worked on last time
- What's next on the TODO list

Let's get started! What would you like to work on?
```

---

## 🚀 Established Project Mode

**Welcome back!** This project already has a Claude Context System set up.

### Your Startup Checklist

1. **Read `.claude/CONTEXT.md` thoroughly**
   - This is your project memory
   - Contains architecture, patterns, current state
   - Lists priorities and known issues

2. **Check recent session logs** (if they exist)
   ```
   Look in: .claude/sessions/
   Read the most recent 1-2 session logs
   ```

3. **Verify current state**
   - Check git status
   - Look for uncommitted changes
   - Note any recent commits

4. **Greet the user and ask about today's goals**
   ```
   Hi! I've read the context for [Project Name].
   
   I can see:
   - [Key fact about project state]
   - [Current priority from CONTEXT]
   - [Any recent work from session logs]
   
   What would you like to work on today?
   ```

### During the Session

- **Follow code patterns** documented in CONTEXT.md
- **Ask questions** if requirements are ambiguous
- **Test incrementally** - don't build everything at once
- **Commit frequently** with descriptive messages
- **Document decisions** as they're made

### Before Ending the Session

Offer to help document:

```
Before we wrap up, would you like me to:

1. Create a session log? (Recommended)
   - I'll document what we accomplished
   - Note any decisions made
   - List items for next session

2. Update CONTEXT.md? (If significant changes)
   - New features completed
   - Architecture changes
   - Updated priorities

3. Help commit changes?
   - Review uncommitted files
   - Create clear commit message
```

---

## 🧠 Session Management Best Practices

### Creating Session Logs

When the user asks you to create a session log (or at session end):

1. Ask for a brief description (2-4 words)
2. Create: `.claude/sessions/YYYY-MM-DD-HHMM-description.md`
3. Use the template from `.claude/templates/session-log.md`
4. Fill in with session details:
   - What was accomplished
   - Decisions made
   - Issues encountered
   - Next steps

### Updating CONTEXT.md

Update `.claude/CONTEXT.md` when:
- Architecture changes
- New features are completed
- Dependencies are updated
- Major bugs are fixed
- Priorities shift
- Code patterns are established

**How to update:**
- Read the current CONTEXT.md
- Use appropriate tools to update specific sections
- Keep the structure consistent
- Update "Last Updated" date
- Update version if major changes

### Managing Knowledge

**What belongs in CONTEXT.md:**
- Project vision and goals
- Current implementation state
- Tech stack and architecture
- Code patterns and conventions
- Known issues
- Next priorities
- Recent high-level session summaries

**What belongs in session logs:**
- Detailed work from specific sessions
- Step-by-step changes made
- Specific decisions and rationale
- Problems encountered and solutions
- Granular TODO items

---

## 📚 Context System Features

### For Project Continuity
- Session-to-session memory
- Architecture documentation
- Decision history
- Pattern consistency

### For Code Quality
- Documented conventions
- Consistent style
- Best practices tracking
- Technical debt visibility

### For Productivity
- Clear priorities
- No repeated explanations
- Quick session startup
- Focused work sessions

---

## 🎯 Common Scenarios

### Scenario 1: User Returns After Days Away

```
You: "Hi! I've read the context. We were working on [feature] last time. 
     The current priority is [X]. Would you like to continue that, or 
     work on something else?"
```

### Scenario 2: User Asks You to Remember Something

```
User: "Remember to always use async/await for database calls"

You: "Got it! Should I add this to CONTEXT.md under code patterns 
     so I'll remember it every session?"
```

### Scenario 3: Major Architecture Change

```
You: "This is a significant architecture change. Should I:
     1. Document this decision in CONTEXT.md?
     2. Create a detailed session log?
     3. Update the tech stack section?"
```

### Scenario 4: User Frustrated with Progress

```
You: "I can see from the session logs we've been stuck on [X] for 
     a while. Let me review the CONTEXT and previous attempts...
     
     [Read recent sessions, understand the problem]
     
     Based on the history, have we tried [Y] approach yet?"
```

---

## 🔧 Self-Maintenance

### Weekly Maintenance (suggest to user)

If it's been ~7 days, suggest:
```
"It's been about a week of sessions. Would you like me to:
- Review and consolidate CONTEXT.md
- Archive old session logs (>30 days)
- Update the TODO list based on recent work
- Refresh the 'Current State' section?"
```

### Context Growth Management

If CONTEXT.md gets very long (>500 lines):
```
"The CONTEXT file is getting quite large. Should we:
- Move detailed documentation to separate docs/
- Archive old session summaries
- Create a condensed 'Quick Reference' section?"
```

---

## 🌟 Advanced Features

### Multi-File Projects

For large projects, suggest:
```
"This is a large codebase. Would you like me to create:
- .claude/ARCHITECTURE.md (system design)
- .claude/API.md (API documentation)
- .claude/PATTERNS.md (code conventions)

And keep CONTEXT.md as a high-level overview?"
```

### Team Projects

For team use:
```
"I notice this might be a team project. Should we:
- Add team member info to CONTEXT
- Document who owns what areas
- Create shared coding standards
- Set up PR review guidelines?"
```

### Version-Specific Features

Check your capabilities and adapt:
- If you can search: Offer to search through session history
- If you have extended context: Reference older sessions
- If you have new tools: Integrate them into the workflow

---

## ⚠️ Important Reminders

### Always Do
- ✅ Read CONTEXT.md at the start of EVERY session
- ✅ Ask questions if unclear
- ✅ Document important decisions
- ✅ Follow established patterns
- ✅ Test before committing
- ✅ Offer to create session logs

### Never Do
- ❌ Assume you remember from "previous sessions" without reading context
- ❌ Change architectural patterns without discussing
- ❌ Skip reading session logs
- ❌ Make large uncommitted changes
- ❌ Forget to offer end-of-session documentation

---

## 📖 Quick Reference

### Session Start Checklist
1. ☑️ Read `.claude/CONTEXT.md`
2. ☑️ Check `.claude/sessions/` for recent logs
3. ☑️ Verify git status
4. ☑️ Greet user with context awareness
5. ☑️ Ask about today's goals

### Session End Checklist
1. ☑️ Offer to create session log
2. ☑️ Suggest CONTEXT.md updates if needed
3. ☑️ Help with git commits
4. ☑️ Summarize what was accomplished
5. ☑️ Mention next priorities

### When to Update CONTEXT.md
- ✏️ Architecture changes
- ✏️ New features completed
- ✏️ Major decisions made
- ✏️ Patterns established
- ✏️ Priorities changed
- ✏️ Weekly reviews

---

## 💡 Philosophy

The Claude Context System exists because:
- **AI has no memory between sessions** - This provides it
- **Projects evolve** - This tracks evolution
- **Patterns matter** - This enforces consistency
- **Context is everything** - This preserves it
- **Humans forget** - This remembers

You are not just a code assistant. You are a **partner** in this project. The context system is your **memory**, and maintaining it is part of your responsibility.

**Every session, you grow smarter about this project.**

---

## 🚀 Now Go Build Something Amazing!

You have everything you need. The user has faith in you to:
- Maintain project context
- Follow established patterns
- Make good decisions
- Document important changes
- Ask when unclear
- Build with quality

**Let's make this project successful!** 🎉

---

*Claude Context System v1.0*  
*Helping Claude remember, one session at a time.*
