# MiniMeet - Technical Architecture & Stack

> Complete technical specification for the MiniMeet athletics event and spectator platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Frontend - Mobile](#frontend---mobile)
4. [Frontend - Web](#frontend---web)
5. [Backend](#backend)
6. [Database](#database)
7. [Real-time Layer](#real-time-layer)
8. [External Integrations](#external-integrations)
9. [DevOps & Infrastructure](#devops--infrastructure)
10. [Project Structure](#project-structure)
11. [Getting Started](#getting-started)

---

## Overview

### Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Mobile** | React Native + Expo | iOS & Android apps |
| **Web** | Next.js 14 | Organizer dashboard + public results |
| **Backend** | Node.js + Fastify | API server + WebSocket |
| **Database** | Supabase (PostgreSQL) | Data persistence + real-time |
| **Auth** | Supabase Auth | Authentication |
| **Real-time** | Supabase Realtime | Live results subscriptions |
| **Hosting** | Vercel + Supabase | Deployment |

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **React Native over Flutter** | Code sharing with Next.js, larger ecosystem, TypeScript throughout |
| **Next.js 14 over CRA** | Server components, SEO for public results, built-in API routes |
| **Fastify over Express** | 2x faster, better TypeScript support, schema validation |
| **Supabase over Firebase** | PostgreSQL (relational data fits better), row-level security, generous free tier |
| **Monorepo structure** | Shared types, components, and utilities across platforms |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
├─────────────────────────────┬───────────────────────────────────────────┤
│                             │                                           │
│   ┌─────────────────────┐   │   ┌─────────────────────────────────┐    │
│   │   React Native      │   │   │        Next.js 14               │    │
│   │   (Expo)            │   │   │                                 │    │
│   │                     │   │   │  ┌───────────┐ ┌─────────────┐  │    │
│   │   - iOS App         │   │   │  │ Organizer │ │   Public    │  │    │
│   │   - Android App     │   │   │  │ Dashboard │ │  Results    │  │    │
│   │   - Spectator View  │   │   │  │  (Auth)   │ │   (SSR)     │  │    │
│   │                     │   │   │  └───────────┘ └─────────────┘  │    │
│   └──────────┬──────────┘   │   └───────────────┬─────────────────┘    │
│              │              │                   │                       │
└──────────────┼──────────────┴───────────────────┼───────────────────────┘
               │                                  │
               │         Shared: TypeScript       │
               │         Types & Utilities        │
               │                                  │
               └─────────────────┬────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │                         │
                    │   Fastify API Server    │
                    │   (Node.js + TypeScript)│
                    │                         │
                    │   - REST endpoints      │
                    │   - WebSocket server    │
                    │   - Validation (Zod)    │
                    │   - Rate limiting       │
                    │                         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │                         │
                    │       SUPABASE          │
                    │                         │
                    │  ┌─────────────────┐    │
                    │  │   PostgreSQL    │    │
                    │  │   Database      │    │
                    │  └────────┬────────┘    │
                    │           │             │
                    │  ┌────────▼────────┐    │
                    │  │    Realtime     │◄───┼──── Live Subscriptions
                    │  │   (WebSocket)   │    │
                    │  └─────────────────┘    │
                    │                         │
                    │  ┌─────────────────┐    │
                    │  │      Auth       │    │
                    │  │  (OAuth, JWT)   │    │
                    │  └─────────────────┘    │
                    │                         │
                    │  ┌─────────────────┐    │
                    │  │    Storage      │    │
                    │  │ (Photos, Files) │    │
                    │  └─────────────────┘    │
                    │                         │
                    └─────────────────────────┘
                                 │
               ┌─────────────────┼─────────────────┐
               │                 │                 │
    ┌──────────▼─────┐  ┌───────▼───────┐  ┌─────▼──────┐
    │ World Athletics│  │   FinishLynx  │  │   Vipps    │
    │      API       │  │  (Timing)     │  │  Payments  │
    └────────────────┘  └───────────────┘  └────────────┘
```

---

## Frontend - Mobile

### React Native + Expo

**Why Expo?**
- Managed workflow simplifies builds
- OTA updates without app store review
- Expo Router for file-based navigation
- Pre-built UI components
- Easy push notifications

### Dependencies

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "expo-router": "~3.4.0",
    "react-native": "0.73.0",
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.5.0",
    "react-native-reanimated": "~3.6.0",
    "expo-secure-store": "~12.8.0",
    "expo-notifications": "~0.27.0",
    "@expo-google-fonts/inter": "^0.2.3",
    "lucide-react-native": "^0.312.0",
    "date-fns": "^3.2.0",
    "zod": "^3.22.4"
  }
}
```

### Key Libraries

| Library | Purpose |
|---------|---------|
| `expo-router` | File-based navigation |
| `@tanstack/react-query` | Server state management, caching |
| `zustand` | Client state management |
| `react-native-reanimated` | Smooth animations |
| `@supabase/supabase-js` | Database, auth, realtime |
| `zod` | Runtime type validation |

### Mobile Features

- Push notifications for followed athletes
- Offline mode with local caching
- Biometric authentication
- Deep linking to specific events/athletes
- Share results to social media

---

## Frontend - Web

### Next.js 14 (App Router)

**Why Next.js 14?**
- Server Components for fast initial load
- Streaming SSR for live results pages
- Built-in image optimization
- API routes for BFF pattern
- Great SEO for public results

### Dependencies

```json
{
  "dependencies": {
    "next": "14.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.1.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.5.0",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.312.0",
    "date-fns": "^3.2.0",
    "zod": "^3.22.4",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^3.3.4"
  }
}
```

### Web Features

| Feature | Implementation |
|---------|----------------|
| **Public Results** | SSR pages with ISR for caching |
| **Organizer Dashboard** | Protected routes with auth |
| **Results Entry** | Real-time form with WebSocket sync |
| **Analytics** | Server components + client interactivity |

---

## Backend

### Fastify + TypeScript

**Why Fastify?**
- ~2x faster than Express
- Built-in schema validation
- First-class TypeScript support
- Plugin architecture
- Excellent logging

### Dependencies

```json
{
  "dependencies": {
    "fastify": "^4.25.0",
    "@fastify/cors": "^8.5.0",
    "@fastify/helmet": "^11.1.0",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/websocket": "^8.3.0",
    "@fastify/jwt": "^8.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "zod": "^3.22.4",
    "pino": "^8.17.0",
    "pino-pretty": "^10.3.0"
  }
}
```

### API Structure

```
/api
├── /auth
│   ├── POST /login
│   ├── POST /register
│   ├── POST /logout
│   └── GET  /me
├── /competitions
│   ├── GET    /                    # List competitions
│   ├── POST   /                    # Create competition
│   ├── GET    /:id                 # Get competition
│   ├── PUT    /:id                 # Update competition
│   ├── DELETE /:id                 # Delete competition
│   └── GET    /:id/events          # Get events
├── /events
│   ├── GET    /:id                 # Get event details
│   ├── GET    /:id/results         # Get results
│   ├── POST   /:id/results         # Submit result
│   └── PUT    /:id/results/:rid    # Update result
├── /athletes
│   ├── GET    /                    # Search athletes
│   ├── GET    /:id                 # Get athlete profile
│   ├── GET    /:id/results         # Get athlete results
│   └── GET    /:id/pbs             # Get personal bests
├── /live
│   └── WS     /                    # WebSocket for live updates
└── /webhooks
    └── POST   /timing              # Timing system webhook
```

### Middleware Stack

```typescript
// Fastify plugin registration order
app.register(cors, { origin: true });
app.register(helmet);
app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
app.register(jwt, { secret: process.env.JWT_SECRET });
app.register(websocket);
```

---

## Database

### Supabase (PostgreSQL)

**Why Supabase?**
- PostgreSQL = proper relational data
- Built-in real-time subscriptions
- Row-level security (RLS)
- Auth with social providers
- Storage for media
- Generous free tier (500MB, 50k MAU)

### Schema Overview

```sql
-- Organizations (clubs, federations)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('club', 'federation', 'organizer')),
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitions
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT,
  organizer_id UUID REFERENCES organizations(id),
  status TEXT CHECK (status IN ('draft', 'published', 'live', 'completed')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events (100m, Long Jump, etc.)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('track', 'field', 'combined')),
  gender TEXT CHECK (gender IN ('M', 'W', 'X')),
  age_group TEXT,
  scheduled_time TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  wind_reading DECIMAL(3,1),
  settings JSONB DEFAULT '{}'
);

-- Athletes
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('M', 'W', 'X')),
  nationality TEXT,
  club_id UUID REFERENCES organizations(id),
  wa_id TEXT, -- World Athletics ID
  profile_image_url TEXT,
  social_links JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entries (athlete registered for event)
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES athletes(id),
  seed_mark TEXT, -- Entry time/distance
  bib_number TEXT,
  heat_number INT,
  lane_position INT,
  status TEXT DEFAULT 'registered'
);

-- Results
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  place INT,
  result_value TEXT NOT NULL, -- "10.23" or "8.95"
  result_type TEXT CHECK (result_type IN ('time', 'distance', 'height', 'points')),
  wind DECIMAL(3,1),
  is_pb BOOLEAN DEFAULT FALSE,
  is_sb BOOLEAN DEFAULT FALSE,
  record_type TEXT, -- 'NR', 'WR', 'CR', etc.
  reaction_time DECIMAL(4,3),
  attempts JSONB, -- For field events: [{value: "8.12", wind: 1.2, valid: true}, ...]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal Bests
CREATE TABLE personal_bests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  result_value TEXT NOT NULL,
  result_type TEXT,
  competition_name TEXT,
  date DATE,
  location TEXT,
  UNIQUE(athlete_id, event_name)
);

-- Indexes for performance
CREATE INDEX idx_competitions_date ON competitions(date);
CREATE INDEX idx_events_competition ON events(competition_id);
CREATE INDEX idx_results_entry ON results(entry_id);
CREATE INDEX idx_athletes_name ON athletes(last_name, first_name);
CREATE INDEX idx_entries_event ON entries(event_id);
```

### Row Level Security (RLS)

```sql
-- Anyone can read published competitions
CREATE POLICY "Public competitions readable"
ON competitions FOR SELECT
USING (status = 'published' OR status = 'live' OR status = 'completed');

-- Only organizers can update their competitions
CREATE POLICY "Organizers can update own competitions"
ON competitions FOR UPDATE
USING (organizer_id IN (
  SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
));

-- Results are always public
CREATE POLICY "Results are public"
ON results FOR SELECT
USING (true);

-- Only authorized users can insert results
CREATE POLICY "Authorized users can insert results"
ON results FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_officials
    WHERE event_id = (SELECT event_id FROM entries WHERE id = entry_id)
    AND user_id = auth.uid()
  )
);
```

---

## Real-time Layer

### Supabase Realtime

```typescript
// Subscribe to live results for an event
const subscription = supabase
  .channel('event-results')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'results',
      filter: `entry_id=in.(${entryIds.join(',')})`
    },
    (payload) => {
      // Update UI with new result
      handleResultUpdate(payload);
    }
  )
  .subscribe();

// Broadcast for custom events (e.g., event status changes)
const broadcastChannel = supabase.channel('live-updates');

broadcastChannel.on('broadcast', { event: 'event-status' }, ({ payload }) => {
  // Handle event status change (starting, in_progress, completed)
});

broadcastChannel.subscribe();
```

### Real-time Use Cases

| Use Case | Implementation |
|----------|----------------|
| Live results | Postgres changes on `results` table |
| Event status | Broadcast channel |
| Heat start times | Broadcast channel |
| Spectator count | Presence channel |

---

## External Integrations

### World Athletics API

```typescript
// Fetch athlete data from World Athletics
async function fetchAthleteFromWA(waId: string) {
  const response = await fetch(
    `https://api.worldathletics.org/athletes/${waId}`,
    {
      headers: {
        'Authorization': `Bearer ${WA_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.json();
}

// Data available:
// - Personal bests
// - Season bests
// - World rankings
// - Competition history
```

### FinishLynx Timing Integration

```typescript
// FinishLynx sends results via Network COM Port
// We expose a TCP server to receive results

import net from 'net';

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const result = parseLynxResult(data.toString());
    // {
    //   place: 1,
    //   lane: 4,
    //   time: "10.23",
    //   reactionTime: 0.142
    // }
    processTimingResult(result);
  });
});

server.listen(LYNX_PORT);
```

### Payment (Vipps)

```typescript
// Entry fee payment with Vipps
async function createVippsPayment(entryId: string, amount: number) {
  const response = await fetch('https://api.vipps.no/ecomm/v2/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VIPPS_ACCESS_TOKEN}`,
      'Ocp-Apim-Subscription-Key': VIPPS_SUBSCRIPTION_KEY,
    },
    body: JSON.stringify({
      merchantSerialNumber: VIPPS_MSN,
      orderId: entryId,
      amount: amount * 100, // øre
      transactionText: 'MiniMeet Entry Fee',
      callbackPrefix: `${API_URL}/webhooks/vipps`,
    })
  });
  return response.json();
}
```

---

## DevOps & Infrastructure

### Hosting

| Service | Platform | Purpose |
|---------|----------|---------|
| **Web App** | Vercel | Next.js hosting, edge functions |
| **API** | Railway / Render | Fastify server |
| **Database** | Supabase | PostgreSQL + Realtime |
| **Mobile Builds** | EAS (Expo) | iOS/Android builds |
| **CDN** | Vercel Edge | Static assets, images |

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# API
API_URL=https://api.minimeet.no
JWT_SECRET=xxx

# World Athletics
WA_API_KEY=xxx

# Vipps
VIPPS_CLIENT_ID=xxx
VIPPS_CLIENT_SECRET=xxx
VIPPS_MSN=xxx
VIPPS_SUBSCRIPTION_KEY=xxx

# FinishLynx
LYNX_PORT=5000
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      - run: npm run type-check

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/railway-deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Project Structure

### Monorepo with Turborepo

```
minimeet/
├── apps/
│   ├── mobile/                 # React Native (Expo)
│   │   ├── app/                # Expo Router screens
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── package.json
│   │
│   ├── web/                    # Next.js 14
│   │   ├── app/                # App Router
│   │   │   ├── (public)/       # Public routes (results)
│   │   │   ├── (dashboard)/    # Protected organizer routes
│   │   │   └── api/            # API routes
│   │   ├── components/
│   │   ├── lib/
│   │   └── package.json
│   │
│   └── api/                    # Fastify server
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── middleware/
│       │   └── index.ts
│       └── package.json
│
├── packages/
│   ├── ui/                     # Shared UI components
│   │   ├── src/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── types/                  # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── competition.ts
│   │   │   ├── athlete.ts
│   │   │   ├── result.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── utils/                  # Shared utilities
│   │   ├── src/
│   │   │   ├── format.ts
│   │   │   ├── validation.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── config/                 # Shared configs
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── supabase/
│   ├── migrations/             # SQL migrations
│   ├── seed.sql               # Test data
│   └── config.toml
│
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Supabase CLI
- Expo CLI (for mobile)

### Setup

```bash
# Clone repository
git clone https://github.com/your-org/minimeet.git
cd minimeet

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Start Supabase locally
supabase start

# Run database migrations
supabase db push

# Start development servers
pnpm dev
```

### Development Commands

```bash
# Start all apps
pnpm dev

# Start specific app
pnpm dev --filter=web
pnpm dev --filter=mobile
pnpm dev --filter=api

# Build all
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm type-check

# Generate types from Supabase
pnpm supabase:types
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| **Time to First Byte (TTFB)** | < 200ms |
| **First Contentful Paint (FCP)** | < 1.5s |
| **Time to Interactive (TTI)** | < 3s |
| **Result Update Latency** | < 500ms |
| **API Response Time (p95)** | < 100ms |
| **Mobile App Size** | < 30MB |

---

## Security Considerations

1. **Authentication**: Supabase Auth with JWT tokens
2. **Authorization**: Row-level security (RLS) policies
3. **Input Validation**: Zod schemas on all endpoints
4. **Rate Limiting**: 100 req/min per IP
5. **CORS**: Whitelist specific origins
6. **HTTPS**: Enforced everywhere
7. **Secrets**: Environment variables, never in code

---

*MiniMeet Technical Specification v1.0*
*Last updated: November 2024*
