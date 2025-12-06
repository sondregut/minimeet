# Claude Code Instructions for MiniMeet

## Project Overview
MiniMeet is an athletics event management application with two frontends sharing a single Supabase backend:

- **Web App** (`apps/web`) - Next.js 14 dashboard for organizers and admins
- **Mobile App** (`apps/mobile`) - Expo/React Native app for field officials and athletes

Both apps connect to the same Supabase database and share types/constants via workspace packages.

## Monorepo Structure
```
Meet/
├── apps/
│   ├── web/           # Next.js 14 (App Router) - Organizer dashboard
│   └── mobile/        # Expo/React Native - Field official app
├── packages/
│   ├── types/         # Shared TypeScript types
│   └── constants/     # Shared constants (events, rules, etc.)
├── supabase/          # Database migrations
└── package.json       # pnpm workspace root
```

## Important Guidelines

### Git Workflow
**ALWAYS commit to git after each working change.**
- Make small, focused commits
- Use descriptive commit messages
- Commit after each feature, bug fix, or significant change is complete and working

### Activity Log
**CRITICAL: ALWAYS update ACTIVITY_LOG.md for EVERY change made to the app.**
- Update the log BEFORE moving to the next task
- Include date, feature/fix name, and bullet points of what was done
- This is a separate file from git commits - both are required
- This includes:
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
- **Web Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Mobile Frontend**: Expo SDK 52, React Native, Expo Router
- **Backend**: Supabase (PostgreSQL, Auth, RLS) - shared by both apps
- **Package Manager**: pnpm workspaces
- **Monorepo**: Turborepo

### Key Directories
- `/apps/web` - Next.js web application (organizer dashboard)
- `/apps/web/app` - App router pages
- `/apps/web/lib/actions` - Server actions
- `/apps/mobile` - Expo mobile application (field officials)
- `/apps/mobile/app` - Expo Router screens
- `/apps/mobile/src` - Components, hooks, contexts
- `/packages/types` - Shared TypeScript types
- `/packages/constants` - Shared constants
- `/supabase` - Database migrations and seed data

### Common Patterns
- Server Components by default
- Server Actions for data mutations
- Client Components only when needed (interactivity, hooks)
- RLS policies for data access control

### Development
```bash
# Start web dev server (port 3002)
cd apps/web && pnpm dev

# Start mobile dev server (Expo)
cd apps/mobile && npx expo start
```

### Demo Account
- Email: demo@gmail.com
- Password: password
