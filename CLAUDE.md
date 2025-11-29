# Claude Code Instructions for MiniMeet

## Project Overview
MiniMeet is an athletics event management application built with Next.js 14 (App Router), Supabase, and Tailwind CSS. It helps organizers manage competitions, athletes, events, and results.

## Important Guidelines

### Activity Log
**ALWAYS update ACTIVITY_LOG.md when making significant changes to the app.** This includes:
- New features
- Bug fixes
- Database schema changes
- UI/UX improvements
- API changes

### Task Tracking
**ALWAYS check TODO.md for pending tasks and mark items as complete when finished.**
- Review TODO.md at the start of each session
- Mark tasks with [x] when completed
- Add new tasks discovered during development
- Keep the list organized by phase/priority

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Package Manager**: pnpm
- **Monorepo**: Turborepo with apps/web

### Key Directories
- `/apps/web` - Next.js web application
- `/apps/web/app` - App router pages
- `/apps/web/lib/actions` - Server actions
- `/supabase` - Database migrations and seed data

### Common Patterns
- Server Components by default
- Server Actions for data mutations
- Client Components only when needed (interactivity, hooks)
- RLS policies for data access control

### Development
```bash
# Start dev server
cd apps/web && pnpm dev

# Run on port 3002 (default for this project)
```

### Demo Account
- Email: demo@gmail.com
- Password: password
