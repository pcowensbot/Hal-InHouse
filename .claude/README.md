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

## Session Logs

Session logs are stored in `sessions/` and are gitignored by default to keep them local. They provide detailed records of what was accomplished each session, including:
- Goals and what was completed
- Decisions made and rationale
- Issues encountered and solutions
- Next steps for future sessions

## Maintenance

Weekly reviews help keep the context fresh:
- Review and consolidate CONTEXT.md
- Archive old session logs (>30 days)
- Update TODO lists
- Refresh current state section
