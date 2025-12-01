# MiniMeet - Product Roadmap

> Based on Roster Athletics analysis + improvements for better UX.
> Target: Small clubs, regional federations, schools - Norwegian athletics focus.

---

## Phase 1: MVP - COMPLETE
- [x] 1A: Authentication (login/signup with Supabase)
- [x] 1B: Organizations (create, manage, member invitations)
- [x] 1C: Competitions (create, manage events, athletes, entries)
- [x] 1D: Results Recording
  - [x] Track event results with time input
  - [x] Field event results with distance/throw marks
  - [x] Vertical jump results with height progression
  - [x] Startlist printing with clean print styles

---

## Phase 2: Spectator Features - COMPLETE
- [x] 2.1: Public competition results page (no login required)
- [x] 2.2: Live results feed with auto-refresh
- [x] 2.2b: Full series display for field events (height matrix, attempt columns)
- [x] 2.4: Quick Event Adding
  - [x] Event templates with Norwegian standard events
  - [x] Quick Add buttons (one-click event creation)
  - [x] Bulk Add with category checkboxes
  - [x] Copy events from another competition
- [x] 2.3: Public athlete profiles
  - [x] Athlete search across competitions
  - [x] Competition history
  - [x] Personal bests display

---

## Phase 3: Competition Control Center
*Improvement: Unified dashboard instead of Roster's scattered screens*

### 3.1: Competition Dashboard - COMPLETE
- [x] Live overview showing events in progress, upcoming, completed
- [x] Quick stats: Entries count, results entered, records broken
- [x] Announcer view: What's happening now + what's next
- [x] Timeline view of competition schedule

### 3.2: Event Status Management - COMPLETE
- [x] Status flow: Draft → Scheduled → Check-in Open → In Progress → Official → Finished
- [x] One-click status changes from dashboard
- [x] Visibility controls (hide/show from public)
- [x] Bulk status updates

### 3.3: Heat/Round Management - COMPLETE
- [x] Heats for track events (Heat 1, Heat 2... → Semi → Final)
- [x] Advancement rules: Top N by place + next M fastest times
- [x] Auto-generate heats from entries (seeding by PB/SB)
- [x] Q (qualified by place) / q (qualified by time) indicators
- [x] Lane assignments per heat (center-lane priority)

### 3.4: Start List Management - COMPLETE
- [x] Drag-and-drop lane/order assignment (swap positions)
- [x] Auto-seeding algorithms (by PB, SB, random, serpentine)
- [x] Filter by status (all, assigned, unassigned, registered, checked_in, DNS, scratched)
- [x] Bulk actions (DNS selected, Check In selected, DNS all unassigned, Clear all)
- [x] Print start lists (print view with clean formatting)

---

## Phase 4: Results Entry Enhancements
*Improvement: Faster entry, fewer clicks, keyboard-first design*

### 4.1: Quick Results Entry Mode - COMPLETE
- [x] Tab-through entry (place → time → next athlete)
- [x] Keyboard shortcuts: D=DNS, F=DNF, Q=DQ, S=FS, Enter=Next, Ctrl+S=Save
- [x] Auto-calculate places as times/marks entered
- [x] Wind reading input for sprints (<200m) and jumps
- [x] Reaction time column for sprints
- [x] Live place preview with medal styling
- [x] Row focus highlighting
- [x] Pre-fill existing results
- [x] Status-aware dropdown styling

### 4.2: Automatic Calculations - COMPLETE
- [x] Auto-calculate places from times/distances
- [x] Auto-detect records (PB, SB)
- [x] Auto-detect meeting records (MR, CR, NR)
- [x] Auto-calculate advancement to next round (Q/q)
- [x] One-click "Recalculate All" button
- [ ] Points calculation for combined events

### 4.3: Status Codes - COMPLETE
- [x] Full status support: OK, DNS, DNF, DQ, DSQ, OOC (implemented in Phase 4.1 - track: finished/DNS/DNF/DQ/FS)
- [x] Notes field per athlete per event
- [x] Reaction times for track events (schema exists, UI in place)
- [x] Wind readings per attempt for field events (schema exists)

### 4.4: Records System - COMPLETE
- [x] Configure enabled record types per competition
  - [x] Meeting Record (MR)
  - [x] Championship Record (CR)
  - [x] Club Record (CLR)
  - [x] National Record (NR)
  - [x] Personal Best (PB)
  - [x] Season Best (SB)
- [x] Initial records setup (existing records to beat)
- [x] Auto-highlight new records in results display
- [x] Record history tracking and verification

---

## Phase 5: Athlete & Entry Management
*Improvement: Simpler athlete creation, smart duplicate detection*

### 5.1: Athlete Database - COMPLETE
- [x] Organization-level athlete database (reuse across competitions)
- [x] Athlete profile fields:
  - [x] Name (first, last)
  - [x] Date of birth
  - [x] Gender
  - [x] Country/Nationality
  - [x] Club affiliation
  - [x] License number (optional)
- [x] Personal bests tracking (auto-update from results)
- [x] Season bests (auto-reset yearly or manual)
- [x] Duplicate detection on creation

### 5.2: Entry Management - COMPLETE
- [x] Add athletes to events (search existing or create new)
- [x] BIB number assignment
  - [x] Auto-assign sequential
  - [x] Manual assignment
  - [x] Import from list
- [x] Entry status: Registered → Confirmed → Scratched
- [x] Bulk entry via CSV import with smart matching
- [ ] Entry deadline per event (pending)

### 5.3: Check-in System - COMPLETE
- [x] Check-in deadline configuration per event
- [x] Check-in status icons (✓ checked in, ✗ scratched, ? pending)
- [x] Bulk scratch no-shows after deadline
- [x] Check-in by BIB (manual entry or future: scan)
- [x] Call room management view

---

## Phase 6: Registration System - COMPLETE
*Support both self-service AND organizer-only entry*

### 6.1: Registration Configuration (per competition) - COMPLETE
- [x] Registration mode: Disabled / Organizer-only / Self-service / Hybrid
- [x] Registration deadline (global and per-event)
- [x] Required fields: PB, SB, License number, DOB, Club
- [x] Qualification standards (optional min/max marks) - schema ready
- [x] Max participants per event - schema ready
- [x] Age group restrictions - schema ready
- [x] Welcome message, terms & conditions, contact email
- [x] Auto-approve toggle

### 6.2: Athlete Self-Registration - COMPLETE
- [x] Public registration page per competition (`/register/[id]`)
- [x] Registration period validation (opens/closes)
- [x] Event selection with availability status
- [x] Entry form with PB/SB input (when required)
- [x] Message to organizer field
- [x] Terms acceptance checkbox
- [x] Success confirmation with summary
- [ ] Registration confirmation email (pending)

### 6.3: Registration Management (Organizer) - COMPLETE
- [x] Registration inbox with approve/reject actions
- [x] Expand/collapse registration details
- [x] Status filter (all, pending, approved, rejected, waitlist)
- [x] Bulk approve/reject with select all pending
- [x] Rejection reason input
- [x] Auto-create athlete & entries on approval
- [x] Export registrations to CSV
- [ ] Email notifications to athletes (pending)
- [x] Waitlist status support (schema ready)

### 6.4: Payment Integration (Future)
- [ ] Stripe integration
- [ ] Entry fees per event or flat rate
- [ ] Group/club payments
- [ ] Refund handling
- [ ] Payment status tracking

---

## Phase 7: Mobile Apps
*Improvement: Native iOS/Android apps, not just tablet web views*

### 7.1: Field Event Official App
- [ ] Offline-capable (sync when online)
- [ ] Event selection and athlete list
- [ ] Horizontal events: Enter mark per attempt (6 rounds)
- [ ] Vertical events: O/X/- per height with progression
- [ ] Foul marking (X) and pass marking (-)
- [ ] Wind reading entry
- [ ] Real-time sync to web dashboard

### 7.2: Track Timer App
- [ ] Start/stop timer with gun sync
- [ ] BIB entry as athletes cross finish
- [ ] Auto place assignment by finish order
- [ ] Lap counter for distance events
- [ ] Split times recording
- [ ] Manual time entry fallback

### 7.3: Check-in App
- [ ] Search athlete by name or BIB
- [ ] Mark as checked-in or scratched
- [ ] See missing athletes per event
- [ ] Call room queue display
- [ ] Offline support with sync

### 7.4: Spectator App (Future)
- [ ] Live results feed
- [ ] Follow favorite athletes
- [ ] Push notifications for results
- [ ] Competition schedule

---

## Phase 8: Timing System Integration
*Start with most common systems in Norway*

### 8.1: Integration Bridge
- [ ] Desktop agent app connecting timing systems to cloud
- [ ] WebSocket connection for real-time sync
- [ ] Offline queue with auto-retry
- [ ] Status indicator in web dashboard

### 8.2: FinishLynx Integration
**Reference**: https://help.finishlynx.com/Content/OnlineManual/Databases.htm

**Data Flow** (FinishLynx acts as "head finish judge"):
1. MiniMeet → FinishLynx: Export start lists (lynx.ppl, lynx.evt, lynx.sch)
2. FinishLynx captures photo finish
3. Operator evaluates image for place/time
4. FinishLynx → MiniMeet: Import results (.lif files)

---

#### File Format Specifications (all CSV, text files)

**lynx.ppl** (Participant List):
```
ID, LastName, FirstName, Affiliation, License
101, Hansen, Erik, Lyn SK, 12345
102, Johansen, Anna, IK Tjalve, 12346
```
Fields: ID (BIB), Last Name, First Name, Affiliation (Club), License (optional)

**lynx.evt** (Event Start List):
```
; Comment line (semicolon = comment)
1,1,1,Men 100m,,,,,,,,,
,101,1,Hansen,Erik,Lyn SK,,,,,,,,,,,,
,102,2,Johansen,Olav,IK Tjalve,,,,,,,,,,,,
1,1,2,Men 100m,,,,,,,,,
,103,1,Pedersen,Lars,BUL,,,,,,,,,,,,
```
- Event row (13 fields): EventNum, Round, Heat, Name, <Wind>, <WindUnit>, Template, CaptureTime, CaptureDuration, Distance, <StartTime>, WindMode, LaptimeInfo
- Competitor row (starts with comma, 19 fields): ,ID, Lane, LastName, FirstName, Affiliation, <Time>, License, <DeltaTime>, <ReacTime>, <Splits>, TTStartTime, User1, User2, User3, <DeltaTime2>, <DeltaTime3>, <Speed>, <Pace>
- Fields in <brackets> are optional

**lynx.sch** (Schedule):
```
1,1,1,Men 100m
1,1,2,Men 100m
2,1,1,Women 100m
```
Fields: EventNum, Round, Heat, EventName

**lynx.lif** (Results - FinishLynx outputs this):
```
1,101,1,Hansen,Erik,Lyn SK,10.52,,,,,,,,
2,102,2,Johansen,Olav,IK Tjalve,10.67,,0.143,,,,,,,
```
Fields (15): Place, ID, Lane, LastName, FirstName, Affiliation, Time, License, DeltaTime, ReacTime, Splits, TTStartTime, User1, User2, User3

---

**Export Tasks (MiniMeet → FinishLynx)**:
- [ ] Export lynx.ppl from athletes table
- [ ] Export lynx.evt from events + entries (with heats/lanes)
- [ ] Export lynx.sch from events schedule
- [ ] Add "Export to FinishLynx" button on competition page
- [ ] Download as ZIP or to shared folder

**Import Tasks (FinishLynx → MiniMeet)**:
- [ ] Parse .lif result files
- [ ] Match ID (BIB) to entries
- [ ] Import times (convert to ms)
- [ ] Import reaction times
- [ ] Import places
- [ ] Handle multiple heats/rounds
- [ ] Add "Import FinishLynx Results" button

**Integration Options**:
- [ ] Manual file upload/download (simplest)
- [ ] Shared folder sync (desktop watches folder)
- [ ] Desktop bridge app with WebSocket (real-time)

### 8.3: ALGE-TIMING Integration
- [ ] Import result files
- [ ] Live connection option

### 8.4: Manual Timing Support
- [ ] Hand timing mode with +0.24s auto-correction
- [ ] Multiple timer entry with averaging
- [ ] Timing mode indicator (FAT vs Hand)

---

## Phase 9: Reports & Exports
*Improvement: Modern design, customizable templates*

### 9.1: Print Reports - COMPLETE
- [x] Reports hub page with stats, links, and exports
- [x] Start lists
  - [x] By event (existing)
  - [ ] By athlete (all events for one person)
  - [x] Combined (full competition)
- [x] Results
  - [x] Individual event (existing via live results)
  - [x] Full competition summary
  - [ ] Records report
- [x] Competition schedule print view
- [ ] BIB labels for printing
- [ ] Announcer scripts with pronunciations

### 9.2: Live Scoreboard
- [ ] Embeddable widget for external websites
- [ ] Full-screen mode for venue displays
- [ ] Auto-rotate through events
- [ ] Customizable branding

### 9.3: Data Export - PARTIAL
- [x] CSV export (start lists, entries, athletes, events)
- [x] JSON export (full competition data)
- [ ] Norwegian federation format (if applicable)
- [ ] JSON API for custom integrations

---

## Phase 10: Team Competitions
*Support club/school team scoring*

### 10.1: Team Setup
- [ ] Create teams (schools, clubs, countries)
- [ ] Assign athletes to teams
- [ ] Team colors and logos
- [ ] Team manager role

### 10.2: Team Scoring
- [ ] Points by place (configurable table: 10-8-6-5-4-3-2-1)
- [ ] Running team totals throughout competition
- [ ] Team standings display
- [ ] Relay scoring integration

---

## Phase 11: Settings & Polish

### 11.1: Organization Settings
- [ ] Team members & roles (Admin, Official, Viewer)
- [ ] Default competition settings
- [ ] Organization branding (logo, colors)
- [ ] Subscription/billing (if applicable)

### 11.2: Competition Settings
- [ ] All settings on one organized page
- [ ] Copy competition feature (with/without entries)
- [ ] Competition templates
- [ ] Archive/delete competitions

### 11.3: User Preferences
- [ ] Date format (DD/MM/YYYY vs YYYY-MM-DD)
- [ ] Time format (24h vs 12h)
- [ ] Language (Norwegian / English)
- [ ] Notification preferences

---

## Key Improvements Over Roster Athletics

| Area | Roster | MiniMeet |
|------|--------|----------|
| **Navigation** | 15+ sidebar items, scattered | Unified dashboard, clear hierarchy |
| **Data Entry** | Many clicks, mouse-heavy | Keyboard-first, tab-through |
| **Mobile** | Tablet web app only | Native iOS/Android apps |
| **Offline** | Limited | Full offline with smart sync |
| **UI Design** | Cluttered, small text | Clean, spacious, readable |
| **Defaults** | Manual everything | Auto-calculate where possible |
| **Focus** | Global, complex | Norwegian athletics first |
| **Onboarding** | Steep learning curve | Progressive disclosure |

---

## Priority Order (Suggested)

1. **Phase 3** - Control Center (foundation for everything)
2. **Phase 4** - Results Enhancements (core functionality)
3. **Phase 5** - Athlete Management (data foundation)
4. **Phase 7.1** - Field Event App (biggest pain point for officials)
5. **Phase 9** - Reports (always needed)
6. **Phase 6** - Registration (nice to have)
7. **Phase 8** - Timing Integration (advanced users)
8. **Phase 10** - Teams (specific use case)

---

*Last updated: November 30, 2025*
