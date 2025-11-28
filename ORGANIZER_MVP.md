# MiniMeet - Organizer MVP Specification

> Complete specification for the organizer-facing features.
> This is Phase 1 - Spectator view will come in Phase 2.

---

## Overview

### Organizer User Journey

```
1. Sign Up / Log In
        ↓
2. Create Organization (Club/Federation)
        ↓
3. Create Competition (Stevne)
        ↓
4. Add Events (100m, High Jump, etc.)
        ↓
5. Set Schedule & Heights/Progressions
        ↓
6. Register Athletes / Import Entries
        ↓
7. Manage Competition (Start/Stop Events)
        ↓
8. Enter Results (Live)
        ↓
9. Publish Final Results
```

---

## Core Features

### 1. Authentication & User Management

**Features:**
- Email/password signup and login
- Organization invites (add team members)
- Role-based access (Admin, Official, Volunteer)

**User Roles:**
| Role | Permissions |
|------|-------------|
| Admin | Full access, manage organization, billing |
| Official | Create/edit competitions, enter results |
| Volunteer | Enter results only (assigned events) |

**Screens:**
- Login
- Sign Up
- Forgot Password
- Profile Settings

---

### 2. Organization Management

**Features:**
- Create organization (club, federation, school)
- Add logo and details
- Invite team members
- Manage member roles

**Data:**
```typescript
interface Organization {
  id: string;
  name: string;
  type: 'club' | 'federation' | 'school' | 'other';
  logo_url?: string;
  country: string;
  contact_email: string;
  created_at: Date;
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'official' | 'volunteer';
  invited_at: Date;
  accepted_at?: Date;
}
```

**Screens:**
- Organization Dashboard
- Organization Settings
- Team Members List
- Invite Member Modal

---

### 3. Competition Management

**Features:**
- Create new competition
- Set date, location, venue
- Configure competition settings
- Duplicate from previous competition
- Archive/delete competition

**Competition Status Flow:**
```
draft → published → active → completed → archived
```

**Data:**
```typescript
interface Competition {
  id: string;
  organization_id: string;
  name: string;
  date: Date;
  end_date?: Date;  // Multi-day competitions
  location: string;
  venue?: string;
  status: 'draft' | 'published' | 'active' | 'completed' | 'archived';
  settings: CompetitionSettings;
  created_at: Date;
  updated_at: Date;
}

interface CompetitionSettings {
  allow_online_registration: boolean;
  registration_deadline?: Date;
  entry_fee?: number;
  currency: 'NOK' | 'EUR' | 'USD';
  age_groups: string[];  // ['Senior', 'U20', 'U18', etc.]
  default_attempt_count: number;  // Usually 3 or 6
}
```

**Screens:**
- Competitions List
- Create Competition Form
- Competition Overview/Dashboard
- Competition Settings

---

### 4. Event Management

**Features:**
- Add events to competition
- Configure event-specific settings
- Set schedule (start times)
- Manage heats/flights
- Set height progressions (vertical jumps)

**Event Types:**
| Category | Events | Special Settings |
|----------|--------|------------------|
| Track | 60m, 100m, 200m, 400m, 800m, 1500m, 3000m, 5000m | Heats, lanes, reaction time |
| Hurdles | 60mH, 100mH, 110mH, 400mH | Hurdle heights, heats |
| Relays | 4x100m, 4x400m | Teams, legs |
| Vertical | High Jump, Pole Vault | Starting height, increments |
| Horizontal | Long Jump, Triple Jump | Attempts, wind |
| Throws | Shot Put, Discus, Javelin, Hammer | Attempts, implement weights |
| Combined | Decathlon, Heptathlon, Pentathlon | Multi-event scoring |

**Data:**
```typescript
interface Event {
  id: string;
  competition_id: string;
  name: string;
  event_code: string;  // '100m', 'HJ', 'SP', etc.
  event_type: 'track' | 'field_vertical' | 'field_horizontal' | 'throw' | 'combined';
  gender: 'M' | 'W' | 'X';
  age_group: string;
  scheduled_time?: Date;
  status: 'scheduled' | 'checkin' | 'active' | 'completed';
  round: 'final' | 'semi' | 'heat' | 'qualification';
  settings: EventSettings;
  created_at: Date;
}

interface EventSettings {
  // Track events
  heat_count?: number;
  lanes_per_heat?: number;
  advance_rule?: string;  // 'Q3+4q' = top 3 + 4 fastest losers

  // Vertical jumps
  starting_height?: number;
  height_increment?: number;
  height_progression?: number[];  // [1.70, 1.75, 1.80, 1.83, 1.86...]

  // Field events
  attempts_preliminary?: number;  // Usually 3
  attempts_final?: number;        // Usually 3 more for top 8
  top_n_to_final?: number;        // Usually 8

  // Wind
  wind_gauge_required?: boolean;
}
```

**Screens:**
- Events List (for competition)
- Add Event Modal/Form
- Event Settings
- Heat/Flight Setup
- Height Progression Setup

---

### 5. Athlete & Entry Management

**Features:**
- Add athletes manually
- Import athletes from CSV/Excel
- Search existing athletes
- Register athletes for events
- Assign bib numbers
- Set seed marks (entry times/distances)
- Create heats/flights with seeding

**Data:**
```typescript
interface Athlete {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: Date;
  gender: 'M' | 'W' | 'X';
  nationality?: string;
  club_id?: string;
  club_name?: string;  // Denormalized for display
  license_number?: string;
  wa_athlete_id?: string;  // World Athletics ID
  created_at: Date;
}

interface Entry {
  id: string;
  competition_id: string;
  event_id: string;
  athlete_id: string;
  bib_number?: string;
  seed_mark?: string;  // Entry time/distance
  heat_number?: number;
  lane_or_position?: number;
  status: 'registered' | 'confirmed' | 'checked_in' | 'DNS' | 'scratched';
  created_at: Date;
}
```

**Screens:**
- Athletes Database
- Add/Edit Athlete Form
- Import Athletes
- Event Entries List
- Entry Registration Form
- Heat/Flight Assignment
- Bib Number Assignment

---

### 6. Results Entry System

This is the **core feature** - must be fast and reliable.

#### 6.1 Track Event Results

**Features:**
- Enter times manually or receive from timing system
- Assign places automatically
- Record reaction times
- Record wind reading
- Handle DNS/DNF/DQ
- Split times for longer races

**UI Flow:**
```
Select Event → Select Heat → Enter Results
     ↓
┌─────────────────────────────────────────────────┐
│  100m Men Heat 1                    Wind: +1.2  │
├─────────────────────────────────────────────────┤
│  Lane  Bib   Athlete          Time    Place     │
│   1    101   Ole Hansen       10.45     2       │
│   2    102   Erik Nilsen      10.32     1    Q  │
│   3    103   Lars Berg        10.67     4       │
│   4    104   Knut Olsen       DNS       -       │
│   5    105   Per Johansen     10.58     3    q  │
│   6    106   Sven Andersen    10.89     5       │
├─────────────────────────────────────────────────┤
│  [Save Heat]  [Mark Complete]  [Next Heat →]    │
└─────────────────────────────────────────────────┘
```

**Data:**
```typescript
interface TrackResult {
  id: string;
  entry_id: string;
  time_ms?: number;  // Store as milliseconds: 10320 = 10.32s
  time_display: string;  // "10.32"
  place?: number;
  reaction_time_ms?: number;
  wind?: number;
  status: 'finished' | 'DNS' | 'DNF' | 'DQ' | 'FS';
  dq_rule?: string;
  qualification_mark?: 'Q' | 'q' | 'qR' | 'qJ';
  is_pb: boolean;
  is_sb: boolean;
  record_type?: string;
  created_at: Date;
  updated_at: Date;
}
```

#### 6.2 Vertical Jump Results (High Jump & Pole Vault)

**Features:**
- Set/modify height progression
- Record attempts (o/x/-/r)
- Auto-calculate current standings
- Auto-detect eliminations (xxx)
- Track bar position (pole vault)
- Handle ties and countback

**UI Flow:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  High Jump Women Final                           Current: 1.85m     │
├─────────────────────────────────────────────────────────────────────┤
│  Heights:  1.70  1.75  1.80  1.83  1.86  1.89  [+]                  │
├─────────────────────────────────────────────────────────────────────┤
│  Pos  Bib  Athlete           1.70  1.75  1.80  1.83  1.86  Best     │
│   1   201  Anna Larsen        o     o     o    xo    -    1.83 ●   │
│   2   202  Maria Hansen       o    xo     o    xxo   -    1.83     │
│   3   203  Kristin Berg       o     o    xo   xxx        1.80     │
│   -   204  Ingrid Olsen       -     -    xxx             NH       │
├─────────────────────────────────────────────────────────────────────┤
│  ● = Currently jumping                                              │
│                                                                     │
│  Quick Entry:  [o Clear]  [x Miss]  [- Pass]  [r Retire]           │
│                                                                     │
│  Next: Anna Larsen @ 1.86m (Attempt 1)                             │
│  [Record Attempt]                      [Raise Bar → 1.89m]          │
└─────────────────────────────────────────────────────────────────────┘
```

**Data:**
```typescript
interface VerticalJumpResult {
  id: string;
  entry_id: string;
  best_height?: number;
  total_attempts: number;
  total_misses: number;
  misses_at_best?: number;
  status: 'active' | 'eliminated' | 'retired' | 'NH';
  place?: number;
  is_pb: boolean;
  is_sb: boolean;
  record_type?: string;
}

interface VerticalAttempt {
  id: string;
  result_id: string;
  height: number;  // in meters: 1.86
  attempt_number: 1 | 2 | 3;
  outcome: 'o' | 'x' | '-' | 'r';
  standards_position?: number;  // Pole vault, in cm
  created_at: Date;
}
```

#### 6.3 Horizontal Jump Results (Long Jump & Triple Jump)

**Features:**
- Record attempts with distances
- Record wind for each attempt
- Mark fouls (x)
- Auto-calculate best mark
- Highlight PB/SB
- Top 8 advance to final 3 attempts

**UI Flow:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Long Jump Men Final                                                │
├─────────────────────────────────────────────────────────────────────┤
│  Pos  Bib  Athlete          1      2      3      4      5      6    Best   │
│   1   301  Jonas Berg      7.85   8.01   x     8.12   7.98   8.21   8.21   │
│                            +1.2   +0.8         +1.5   +0.3   +1.8          │
│   2   302  Erik Holm       7.92   x      8.05   8.15   x      8.08   8.15   │
│                            +0.5          -0.2   +1.1          +0.9          │
│   3   303  Lars Dahl       x      7.78   7.95   -      8.02   x      8.02   │
│                                   +1.8   +1.0          +0.6                 │
├─────────────────────────────────────────────────────────────────────┤
│  Current: Jonas Berg - Attempt 4                                    │
│                                                                     │
│  Distance: [____] m    Wind: [____] m/s    [x Foul]  [Save]        │
└─────────────────────────────────────────────────────────────────────┘
```

**Data:**
```typescript
interface HorizontalJumpResult {
  id: string;
  entry_id: string;
  best_mark?: number;
  best_mark_wind?: number;
  best_legal_mark?: number;  // Wind ≤ 2.0
  attempts_taken: number;
  status: 'active' | 'complete' | 'retired' | 'NM';
  place?: number;
  is_pb: boolean;
  is_sb: boolean;
  record_type?: string;
}

interface FieldAttempt {
  id: string;
  result_id: string;
  attempt_number: 1 | 2 | 3 | 4 | 5 | 6;
  distance?: number;  // NULL if foul
  wind?: number;
  is_foul: boolean;
  is_pass: boolean;
  created_at: Date;
}
```

#### 6.4 Throwing Results

Same structure as horizontal jumps, but:
- No wind reading
- Different implements per age group

---

### 7. Competition Control

**Features:**
- Start/pause/complete events
- Announce current event
- Override results if needed
- Generate start lists
- Export results (PDF, CSV)

**Screens:**
- Competition Control Dashboard
- Event Status Overview
- Start List Generator
- Results Export

---

## Screen List Summary

### Authentication (4 screens)
1. Login
2. Sign Up
3. Forgot Password
4. Profile Settings

### Organization (4 screens)
5. Organization Dashboard
6. Organization Settings
7. Team Members
8. Invite Member

### Competitions (4 screens)
9. Competitions List
10. Create Competition
11. Competition Dashboard
12. Competition Settings

### Events (5 screens)
13. Events List
14. Add/Edit Event
15. Event Settings
16. Heat/Flight Setup
17. Height Progression Setup (vertical)

### Athletes & Entries (6 screens)
18. Athletes Database
19. Add/Edit Athlete
20. Import Athletes
21. Event Entries
22. Entry Registration
23. Bib Assignment

### Results Entry (5 screens)
24. Track Results Entry
25. Vertical Jump Results Entry
26. Horizontal Jump Results Entry
27. Throw Results Entry
28. Combined Event Tracker

### Control (3 screens)
29. Competition Control
30. Event Status
31. Export Results

**Total: ~31 screens**

---

## MVP Prioritization

### Phase 1A - Core Setup (Week 1-2)
- [ ] Authentication (Login, Sign Up)
- [ ] Organization creation
- [ ] Competition creation
- [ ] Event creation (basic)

### Phase 1B - Entries (Week 3)
- [ ] Add athletes manually
- [ ] Register entries
- [ ] Bib numbers
- [ ] Basic heat setup

### Phase 1C - Results Entry (Week 4-5)
- [ ] Track event results
- [ ] Vertical jump results (full o/x/-/r system)
- [ ] Horizontal jump results
- [ ] Throw results

### Phase 1D - Polish (Week 6)
- [ ] Competition control dashboard
- [ ] Results export (PDF)
- [ ] Bug fixes and UX improvements

---

## Technical Notes

### Real-time Requirements
- Results should sync instantly across devices
- Multiple officials entering results simultaneously
- Conflict resolution (last write wins with timestamp)

### Offline Support
- Cache competition data locally
- Queue results for sync when back online
- Show sync status indicator

### Performance Targets
- Results entry: < 100ms feedback
- Page load: < 2s
- Real-time update: < 500ms

---

*MiniMeet Organizer MVP v1.0*
