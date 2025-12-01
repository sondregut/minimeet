# MiniMeet Activity Log

This log tracks all significant changes and updates to the MiniMeet application.

---

## 2025-11-30

### Records System (Phase 4.4) - COMPLETE
Implemented comprehensive records tracking and detection for athletics competitions:

**Database Migration**: `20241130000001_records_system.sql`
- Created `record_type` enum: PB, SB, MR, CR, CLR, NR, AR, WR
- **Tables**:
  - `competition_record_settings` - Configure which record types to track per competition
  - `record_definitions` - Existing records to beat (MR, CR, NR, etc.)
  - `record_breaks` - Log of all records broken during competitions
- Added `is_mr`, `is_cr`, `is_clr`, `is_nr` columns to track_results, field_results, vertical_results
- Full RLS policies for organizer management

**Server Actions** (`/lib/actions/records.ts`):
- `getRecordSettings()` / `upsertRecordSettings()` - Manage record tracking configuration
- `getRecordDefinitions()` / `createRecordDefinition()` / `deleteRecordDefinition()` - Manage existing records
- `getRecordBreaks()` / `createRecordBreak()` - Track broken records
- `markRecordBreakOfficial()` / `markRecordBreakAnnounced()` - Record verification workflow
- `checkForRecordBreaks()` - Auto-detect if result breaks any records
- `getCompetitionRecordsSummary()` - Summary stats for competition

**Records Settings UI** (`/dashboard/competitions/[id]/records`):
- **Settings Tab**: Configure which record types to track (PB, SB, MR, CR, CLR, NR)
- **Records to Beat Tab**: Add/manage existing records with form for event, mark, holder, date
- **Records Broken Tab**: View records broken during competition with official/announced status
- Stats cards showing total records, meeting records, championship records, PB/SB counts
- "Records" button added to competition detail page

**Record Badges Component** (`/components/records/RecordBadges.tsx`):
- Reusable component for displaying record badges (PB, SB, MR, CR, CLR, NR)
- Priority-based display (NR > CR > MR > CLR > PB > SB)
- Color-coded badges with tooltips
- Integrated into LiveResultsTable for track, field, and vertical results

**Auto-Detection Integration**:
- Updated `detectRecordsForEvent()` to check for MR/CR/NR in addition to PB/SB
- Updated `recalculateAll()` to pass gender and age group for proper record matching
- Records automatically updated in athlete profile when new PB/SB achieved

---

### Registration System (Phase 6) - COMPLETE
Implemented comprehensive self-service athlete registration with approval workflow:

**Database Migration**: `20241129000006_registration_system.sql`
- Created `registration_mode` enum: disabled, organizer_only, self_service, hybrid
- Created `registration_status` enum: pending, approved, rejected, waitlist, withdrawn
- **Tables**:
  - `registration_settings` - Per-competition registration configuration
  - `event_registration_settings` - Per-event overrides (limits, standards, age restrictions)
  - `registrations` - Athlete registration requests with personal info
  - `registration_events` - Event selections per registration with PB/SB marks
- Full RLS policies for public/organizer access
- Realtime enabled for registrations

**Server Actions** (`/lib/actions/registrations.ts`):
- `getRegistrationSettings()` - Get competition registration config
- `upsertRegistrationSettings()` - Create/update registration settings
- `getEventsForRegistration()` - Get events available for registration
- `submitRegistration()` - Public registration submission
- `getRegistrations()` - Get all registrations for a competition
- `approveRegistration()` - Approve registration, create athlete & entries
- `rejectRegistration()` - Reject with optional reason
- `bulkApproveRegistrations()` / `bulkRejectRegistrations()` - Bulk actions
- `addToWaitlist()` - Add registration to waitlist
- `exportRegistrationsCSV()` - Export registrations to CSV

**Registration Settings UI** (`/dashboard/competitions/[id]/registration`):
- **Settings Tab**:
  - Registration mode selection (disabled, organizer only, self-service, hybrid)
  - Registration period (opens/closes dates)
  - Required fields toggles (DOB, club, license, PB, SB)
  - Max events per athlete limit
  - Auto-approve toggle
  - Welcome message, terms & conditions, contact email
- **Inbox Tab**:
  - Registration list with expand/collapse details
  - Status filter (all, pending, approved, rejected, waitlist)
  - Bulk selection with select all pending
  - Approve/Reject buttons with optional rejection reason
  - Athlete details view: personal info, events, messages
- Stats cards showing total, pending, approved, rejected, waitlist counts
- Public registration URL display with external link

**Public Registration Page** (`/register/[id]`):
- Competition header with date, location, welcome message
- Registration period checks (not yet open, closed)
- Personal information form with conditional required fields
- Event selection grid grouped by event type
- PB/SB inputs per event when required
- Additional notes textarea for athlete messages
- Terms acceptance checkbox
- Validation against registration settings
- Success confirmation with summary

**Competition Page Updates**:
- Added "Registration" button with ClipboardList icon to competition detail header

---

## 2025-11-29

### Reports & Exports (9.1) - COMPLETE
Implemented comprehensive reports and exports system:
- **Reports Hub** (`/dashboard/competitions/[id]/reports/page.tsx`):
  - Quick stats showing events, athletes, entries counts
  - Print Reports section with links to printable views
  - Data Exports section with one-click CSV/JSON exports
  - Public Pages section with links to live results
  - Filter by event for targeted exports
- **Combined Start Lists** (`/dashboard/competitions/[id]/reports/startlist/page.tsx`):
  - Print-optimized view of all events
  - Cover page with competition details
  - Each event on new page with page breaks
  - Groups entries by heat/flight
  - Shows lane, BIB, athlete name, club, seed mark
- **Combined Results** (`/dashboard/competitions/[id]/reports/results/page.tsx`):
  - Print-optimized results for all events
  - Cover page with competition summary
  - Supports track, field, and vertical event formats
  - Shows place (with medal styling), time/mark, wind, PB/SB flags
  - Only includes events with recorded results
- **Competition Schedule** (`/dashboard/competitions/[id]/reports/schedule/page.tsx`):
  - Groups events by hour/time slot
  - Shows event name, category, type, location
  - Status badges (screen only)
  - Entry counts (screen only)
  - Lists unscheduled events separately
- **Data Export Functions**:
  - `exportStartListCSV()` - All entries with BIB, athlete, club, event
  - `exportAthletesCSV()` - Unique athletes with their events
  - `exportEventsCSV()` - All events with status and entry counts
  - `exportJSON()` - Complete competition data structure
- **Competition Page Updates**:
  - Added "Reports" button in competition detail header
  - FileText icon for reports navigation

### Check-in System (5.3) - COMPLETE
Implemented comprehensive check-in and call room management system:
- **Database Migration**: `20241129000005_checkin_system.sql`
  - Added `checkin_deadline` column to events
  - Added `checkin_opened_at` column to events
  - Created index for check-in status queries
- **Server Actions** (`/lib/actions/events.ts`):
  - `openCheckin()` - Open check-in for an event with optional deadline
  - `updateCheckinDeadline()` - Update check-in deadline
  - `getCheckinEvents()` - Get events with check-in open
  - `scratchNoShows()` - Bulk scratch athletes who didn't check in
- **Call Room Page** (`/dashboard/competitions/[id]/callroom/page.tsx`):
  - Event sidebar showing events with open check-in
  - Check-in deadline countdown with color-coded status
  - Stats bar: Total, Checked In, Pending, Scratched counts
  - Quick BIB check-in: Enter BIB number and press Enter
  - Search/filter athletes by name, BIB, or club
  - Bulk actions: Check In All, Scratch No-Shows
  - Individual check-in/scratch buttons per athlete
  - Status icons: Clock (pending), CheckCircle (checked in), XCircle (scratched)
  - Auto-refresh every 30 seconds
- **Control Dashboard Updates**:
  - Added green "Call Room" button in header
  - Links to call room management page

### Entry Management (5.2) - COMPLETE
Implemented comprehensive entry management system:
- **Entries List Page** (`/dashboard/competitions/[id]/entries/page.tsx`):
  - Competition-wide view of all entries
  - Search by athlete name, BIB, or club
  - Filter by event and status
  - Status cards showing entry counts by status (registered, confirmed, checked_in, DNS, scratched)
  - Bulk actions: Check In, Mark DNS, Scratch, Delete
  - CSV export functionality
  - Checkbox selection for bulk operations
- **Entry Edit Page** (`/dashboard/competitions/[id]/entries/[entryId]/edit/page.tsx`):
  - Edit BIB number, seed mark, status, heat/lane
  - Athlete info display card
  - Delete entry functionality
  - Seed mark parsing for times (mm:ss.xx) and distances
- **CSV Import Page** (`/dashboard/competitions/[id]/entries/import/page.tsx`):
  - Upload CSV file with preview
  - Download template CSV
  - Smart column mapping (handles bib, first_name, club, etc. variations)
  - Creates new athletes if not found
  - Shows import results with success/error counts
- **Server Actions** (`/lib/actions/entries.ts`):
  - `bulkImportEntries()` - Import entries from CSV data
  - Finds or creates athletes automatically
  - Maps event_code to event_id
  - Validates entries and prevents duplicates
- **Competition Page Updates**:
  - Added "All Entries" button in competition detail header

### Organization-Scoped Athletes (5.1) - COMPLETE
Implemented organization-level athlete database with duplicate detection:
- **Database Migration**: `20241129000004_organization_athletes.sql`
  - Added `organization_id` column to athletes table
  - Created indexes for organization queries and duplicate detection
  - Created unique indexes for duplicate prevention within organizations
  - Updated RLS policies for organization-scoped access
  - Created `season_bests` table for seasonal performance tracking
- **Server Actions** (`/lib/actions/athletes.ts`):
  - `checkDuplicateAthlete()` - Check for existing athlete in organization
  - `getUserDefaultOrganization()` - Get user's default organization
  - Updated `createAthlete()` with organization_id and duplicate detection
  - Updated `bulkCreateAthletes()` with organization_id
  - Updated `getAthletes()` with optional organization filter
  - Added `getAthletesByOrganization()` - Filter athletes by organization
  - Added `getMyOrganizationAthletes()` - Get athletes from all user's organizations
- **Type Updates** (`packages/types/src/index.ts`):
  - Added `organization_id` field to Athlete interface
  - Added `organization` joined data field
- **Athletes List UI** (`/dashboard/athletes/page.tsx`):
  - Now uses `getMyOrganizationAthletes()` to show org-scoped athletes
  - Added Organization column showing org name or "Unassigned"
  - Updated page description to mention organizations
- **Bug Fix** (`/lib/actions/entries.ts`):
  - Fixed `getResultsCountsByEvent()` - Can't use subquery in `.in()`
  - Now fetches entry IDs first, then uses array in `.in()` call

### Status Codes (4.3) - PARTIAL
Added notes field to all result tables for official annotations:
- **Database Migration**: `20241129000003_add_result_notes.sql`
  - Added `notes` TEXT column to `track_results`, `field_results`, `vertical_results`
  - Applied to production Supabase database
- **Track Results UI**:
  - Added notes column to results entry table
  - Notes saved with each athlete's result
- **Field Results UI**:
  - Added notes column to attempts table
  - Notes field per athlete for field events
- **Vertical Results UI**:
  - Added notes column to height matrix
  - Notes field per athlete for vertical events
- **Server Actions Updated**:
  - `TrackResultInput`, `FieldResultInput`, `VerticalResultInput` interfaces
  - All `saveResult` functions now handle notes field

**Note**: Status codes (DNS, DNF, DQ, FS) were already implemented in Phase 4.1. Reaction times for track events and wind readings per attempt for field events already exist in the database schema.

### Automatic Calculations (4.2) - COMPLETE
Implemented automatic place calculation, record detection, and advancement calculation:
- **Place Calculation for All Event Types**:
  - `recalculateTrackEventPlaces()` - Sort by time ascending, handle ties
  - `recalculateFieldEventPlaces()` - Sort by best_mark descending, tie-break by legal mark then attempts
  - `recalculateVerticalEventPlaces()` - IAAF rules: best height, misses at best, total misses
  - `recalculateEventPlaces()` - Router function based on event type
- **PB/SB Detection**:
  - `checkAndUpdateRecords()` - Compare against personal_bests table
  - Automatically creates new personal_bests entries for first-time results
  - Updates is_pb and is_sb flags on result records
  - `detectRecordsForEvent()` - Batch detection for all results in an event
- **Recalculate All Button**:
  - Created `RecalculateButton` client component
  - One-click button to recalculate places and detect records
  - Shows loading, success, and error states
  - Added to event detail page when results exist
- **Event Detail Page Updates**:
  - Added results display for field events (best mark, wind, PB/SB flags)
  - Added results display for vertical events (best height, misses, PB/SB flags)
  - Shows best result in stats card for all event types
  - Place column shows calculated places or index
- **Advancement Calculator (Q/q)**:
  - `calculateAdvancement()` - Calculate Q (by place) and q (by time) qualifiers
  - `getAdvancementSummary()` - Get counts of qualifiers per type
  - `updateAdvancementRule()` - Store and recalculate advancement
  - Created `AdvancementCalculator` component with:
    - Expandable UI panel on heats page
    - Quick presets: 3Q+2q, 2Q+2q, 4Q, 2Q+4q, 1Q+6q
    - Custom inputs for advanceByPlace and advanceByTime
    - Visual summary showing Q, q, total advancing, total finished
    - Legend explaining Q (green) vs q (blue) badges

### Server Action Export Fix
Fixed "A 'use server' file can only export async functions, found object" error:
- **Issue**: `/lib/actions/events.ts` had 'use server' directive but exported interfaces and objects
- **Solution**: Created `/lib/constants/event-status.ts` for non-async exports
  - Moved `EventStatus` type, `EVENT_STATUS_INFO`, `VALID_TRANSITIONS` objects
  - Moved `EventResult`, `CreateEventInput`, `BulkCreateEventInput` interfaces
- Updated imports in `events.ts` and `control/page.tsx`
- Removed duplicate `BulkCreateEventInput` interface from events.ts

### Production Supabase Setup - COMPLETE
Set up production Supabase database:
- **Project**: minimeet
- **Region**: eu-north-1 (Stockholm) - optimal for Norwegian users
- **URL**: https://pnpuwrjerprjsjeivxay.supabase.co
- **All 7 migrations applied** to production database
- Updated `.env.local` with production credentials

### Quick Results Entry Mode (4.1) - COMPLETE
Enhanced track results entry page with keyboard-first design:
- **Live Place Calculation**: Places calculated and displayed in real-time as times are entered
  - Medal styling for 1st (gold), 2nd (silver), 3rd (bronze)
  - Automatic tie handling
  - Status codes shown for DNS/DNF/DQ/FS entries
- **Keyboard Shortcuts**:
  - `D` - Set status to DNS (Did Not Start)
  - `F` - Set status to DNF (Did Not Finish)
  - `Q` - Set status to DQ (Disqualified)
  - `S` - Set status to FS (False Start)
  - `Enter` - Move to next row
  - `Tab` - Move to next field (time → reaction)
  - `Arrow Up/Down` - Navigate between rows
  - `Ctrl/Cmd + S` - Save results
- **Keyboard Shortcuts Panel**: Toggle button to show/hide shortcuts reference
- **Tab-through Navigation**: Smooth navigation between time and reaction fields
- **Row Focus Highlighting**: Visual feedback showing current row being edited
- **Pre-fill Existing Results**: Loads and displays previously saved results
- **Status-aware Styling**: Color-coded status dropdowns (orange=DNS, red=DNF/DQ, purple=FS)
- **Compact Table Design**: More efficient use of space with monospace fonts for times

### Start List Management (3.4) - COMPLETE
Implemented comprehensive start list management for event organizers:
- **New Page**: `/dashboard/competitions/[id]/events/[eventId]/startlist/manage`
  - Full-featured start list editing interface
  - Replaces basic print-only view with interactive management
- **Drag-and-Drop**: Swap athlete positions by dragging between rows
  - Visual feedback during drag operations
  - Automatic position swapping on drop
- **Auto-Generate Heats/Flights**:
  - Seeded: Fastest athletes in final heat (track) or flight (field)
  - Random: Fisher-Yates shuffle for random distribution
  - Serpentine: Snake-pattern seeding for balanced heats
  - Configurable lanes per heat (4/6/8/10) or athletes per flight (8/10/12/15)
- **Filtering**: Filter entries by status
  - All entries, Assigned only, Unassigned only
  - By status: Registered, Checked In, DNS, Scratched
- **Bulk Actions**:
  - Select multiple entries with checkboxes
  - Bulk Check In: Mark selected as checked_in
  - Bulk DNS: Mark selected as DNS
  - DNS All Unassigned: Mark all unassigned entries as DNS
  - Clear All: Remove all heat/lane assignments
- **Inline Editing**:
  - Edit lane numbers directly in table
  - Edit heat numbers for unassigned entries
- **Server Actions** (in `/lib/actions/entries.ts`):
  - `bulkUpdateEntryStatus()` - Update multiple entries at once
  - `swapEntryPositions()` - Swap two entries' positions
  - `bulkUpdateLaneAssignments()` - Update multiple assignments
- **UI Features**:
  - Expandable/collapsible heat sections
  - Selection state with visual highlighting
  - Stats bar showing entries, heats, unassigned count
  - Link to print view from management page

### Heat/Round Management (3.3) - COMPLETE
Implemented comprehensive heat management system for track events:
- **Database Schema**: Created `20241129000002_heats_management.sql`
  - `heats` table with heat_number, status (scheduled/in_progress/completed/cancelled), wind_reading
  - `heat_entries` table linking entries to heats with lane, seed_time_ms, result_time_ms, qualification_mark
  - Added `num_lanes`, `advancement_rule` (JSONB), `has_heats` columns to events
  - Full RLS policies for public viewing and official management
- **Heat Generation** (`/lib/actions/heats.ts`):
  - Three seeding methods: serpentine (even distribution), fastest_last, random
  - Center-lane priority assignment (lanes 4, 5, 3, 6, 2, 7, 1, 8)
  - Automatic calculation of required heats based on entries and lane count
  - Seed time conversion from entry marks
- **Heats Management UI** (`/dashboard/competitions/[id]/events/[eventId]/heats`):
  - Generate heats modal with lane count (4/6/8/10) and seeding method selection
  - Expandable heat cards showing athlete assignments by lane
  - Heat status controls (Start/Complete buttons)
  - Stats bar with entries count, heats count, and live indicator
  - Result display with place, time, and qualification marks (Q/q)
  - Delete heats functionality with confirmation
- **Server Actions**:
  - `generateHeats()` - Auto-generate heats with seeding
  - `getHeatsForEvent()`, `getHeatEntries()` - Fetch heat data
  - `updateHeatStatus()` - Change heat status
  - `deleteEventHeats()` - Remove all heats
  - `recordHeatResult()`, `calculateHeatResults()` - Result management
  - `getHeatResultsForQualification()` - For time-based qualification

### Event Status Management (3.2) - COMPLETE
Enhanced event status system with new statuses and controls:
- **New Status Types**: Added `draft`, `official`, and `cancelled` statuses
  - Full status flow: Draft → Scheduled → Check-in → In Progress → Official → Completed
  - Each status has distinct color coding and icon
- **Visibility Controls**: Added `is_public` field to events
  - Eye/EyeOff toggle on each event card
  - Hidden events don't appear on public results pages
  - RLS policy updated to respect visibility
- **Bulk Actions Toolbar**: New toolbar for managing multiple events
  - Toggle bulk edit mode with checkboxes on event cards
  - Select All / Clear selection buttons
  - Bulk status change buttons (Scheduled, Check-in, In Progress, Official, Complete)
  - Bulk visibility change (Public / Hide)
- **Enhanced Event Cards**: Dynamic status action buttons
  - Context-aware next status options based on current status
  - Selection checkbox when bulk mode is active
  - Visual highlight for selected cards
- **Database Migration**: Created `20241129000001_event_status_enhancements.sql`
  - Added `event_status` enum type
  - Added `is_public` boolean column
  - Updated RLS policies for visibility

### Competition Control Dashboard (3.1) - COMPLETE
Enhanced the Competition Control Dashboard at `/dashboard/competitions/[id]/control`:
- **Announcer View**: Toggle for PA announcer-optimized display
  - Shows current live events and check-in events prominently
  - Displays next 3 upcoming events with scheduled times
  - Quick stats bar with live/check-in/upcoming counts
  - Auto-refreshes every 30 seconds
  - Purple gradient design for easy visibility
- **Timeline View**: Toggle for chronological schedule
  - Groups events by hour with vertical timeline
  - Color-coded event status (gray=scheduled, yellow=checkin, red=live, green=complete)
  - Click to navigate to event details
  - Shows unscheduled events separately
- **Results Stats Bar**: New stats display
  - Total results count with trophy icon
  - Total entries count
  - Completion percentage
  - Quick link to public results page
- **Enhanced Event Cards**: Now show results count alongside entries

### Public Athlete Profiles (2.3) - COMPLETE
- Added server actions in `/lib/actions/public.ts`:
  - `searchPublicAthletes` - Search athletes by name with debounced input
  - `getPublicAthleteProfile` - Get athlete details with competition history
  - `getCompetitionAthletes` - Get all athletes at a competition
- Created `/results/athletes` - Athlete search page:
  - Real-time search with debounce (300ms)
  - Shows athlete name, birth year, nationality, club
  - Links to individual athlete profiles
- Created `/results/athletes/[id]` - Athlete profile page:
  - Athlete header with photo, name, birth year, nationality, club
  - **Personal Bests section**: Table of best marks by event code
  - **Competition History**: Results grouped by competition
  - Shows place (with medals styling), result, PB/SB indicators
  - Links to competition and event pages
- Added "Search Athletes" button on main results page

---

## 2025-11-28

### Quick Event Adding (2.4) - COMPLETE
- Created `/lib/event-templates.ts` with Norwegian standard athletics events:
  - Sprints (60m, 100m, 200m, 400m)
  - Middle Distance (800m, 1500m, 3000m)
  - Long Distance (5000m, 10000m)
  - Hurdles (60mH, 100mH, 110mH, 300mH, 400mH)
  - Jumps (High Jump, Pole Vault, Long Jump, Triple Jump)
  - Throws (Shot Put, Discus, Javelin, Hammer)
  - Relays (4x100m, 4x400m)
- Added server actions in `/lib/actions/events.ts`:
  - `bulkCreateEvents` - create multiple events at once
  - `copyEventsFromCompetition` - copy all events from another competition
  - `getCompetitionsForCopy` - get list of competitions for copy feature
- Created Quick Add page `/dashboard/competitions/[id]/events/quick-add/page.tsx`:
  - **Quick Add tab**: One-click event creation with gender/age group selection
  - **Bulk Add tab**: Checkbox grid to select multiple events by category
  - **Copy tab**: Copy all events from a previous competition
- Added amber "Quick Add" button with Zap icon to competition detail page

---

## 2024-11-28

### SPECTATOR 2.1: Public Competition Results Pages
- Created `/results` page - lists all public competitions (live, upcoming, past)
- Created `/results/[competitionId]` page - competition overview with events grouped by status
- Created `/results/[competitionId]/[eventId]` page - individual event results table
- Added `/lib/actions/public.ts` with server actions for public data fetching
- Pages accessible without login, showing only published/active/completed competitions

### SPECTATOR 2.2: Live Results Feed - COMPLETE
- Created `LiveResultsTable.tsx` client component with auto-refresh
- Created `/api/public/events/[eventId]/results` API route for live data
- Polls for updates every 5 seconds when event is "in_progress"
- Shows live indicator with red pulsing dot
- Displays last updated timestamp
- Manual refresh button available
- Automatically stops polling when event is completed

### SPECTATOR 2.2b: Full Series Display for Field Events - COMPLETE
- **Vertical Events (High Jump, Pole Vault)**:
  - Matrix-style height progression grid
  - Heights as columns, athletes as rows
  - Shows O/X/- symbols for each attempt at each height
  - Green highlighting for cleared heights, red for elimination (XXX)
  - Sticky columns for position, bib, and athlete name

- **Horizontal Jumps & Throws**:
  - 6 attempt columns (R1-R6) showing each round
  - X for fouls, - for passes
  - Best attempt highlighted in green/bold
  - Wind readings shown for horizontal jumps

- Updated API route to fetch attempts from `vertical_attempts` and `field_attempts` tables
- Updated `LiveResultsTable.tsx` with event-type-specific display components
- Context-specific legends for each event type

### Documentation
- Created `CLAUDE.md` with project instructions
- Created `TODO.md` for task tracking
- Created `ACTIVITY_LOG.md` for change history

---

## Previous Sessions

### MVP Phase 1 - Complete
- **1A**: Authentication (login/signup with Supabase)
- **1B**: Organizations (create, manage, member invitations)
- **1C**: Competitions (create, manage events, athletes, entries)
- **1D**: Results Recording
  - Track event results with time input
  - Field event results with distance/throw marks
  - Vertical jump results with height progression
  - Place calculation and ranking
- **1D.4**: Startlist printing with clean print styles
- Demo seed data script at `/supabase/seed.sql`
