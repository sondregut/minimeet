# MiniMeet Activity Log

This log tracks all significant changes and updates to the MiniMeet application.

---

## 2025-12-06

### BUG FIX: Mobile App Distance Unit Conversion
Fixed critical bug where mobile app was storing distances in meters instead of centimeters.

**Problem**: Results entered on mobile (e.g., 11.0m) were displayed as 0.11m because:
- Web app stores distances in **centimeters** (e.g., 1100 for 11.00m)
- Mobile app was storing in **meters** without conversion
- When loaded, values were divided by 100 (web convention), causing the error

**Changes** in `apps/mobile/app/(official)/record.tsx`:
1. **Saving**: Now multiplies input by 100 (meters → centimeters) before saving
2. **Loading**: Now divides by 100 (centimeters → meters) when loading from database
3. **Local state**: Properly converts the result and best_mark back to meters for display

**Note**: Existing incorrectly saved data will need to be re-entered.

---

### Three-View Result Registration UI - MAJOR ENHANCEMENT
Implemented full UX specification for result registration in technical events with three-view swipe navigation.

**Based on UX Specification**: `/docs/UXregister.txt`

**Three Main Views** (horizontal swipe navigation):

1. **Startlist / Opprop (Roll Call)**
   - Full list of all athletes in the event(s)
   - Swipe gestures for roll call:
     - Swipe right on athlete row = tilstede (present)
     - Swipe left on athlete row = ikke mott (not present)
   - Tap status button to cycle through statuses
   - Shows count: "12 / 24 tilstede"
   - Background reveals action indicators when swiping

2. **Registrering (Registration)** - Default landing view
   - 4-athlete "Active Queue":
     - Previous athlete (small, faded)
     - Current athlete (large, highlighted with border)
     - Next athlete (medium)
     - Next+1 athlete (medium)
   - Current athlete shows all attempts so far
   - Result input field with decimal keyboard
   - Three action buttons: Godkjent (green), X/Ugyldig (red), Pass (gray)
   - Round indicator and progress counter

3. **Live Resultater (Results)**
   - Ranked list sorted by best result
   - Medal colors for positions 1-3 (gold/silver/bronze)
   - Shows best result per athlete
   - "Venter pa resultat" section for athletes without results

**UI Flow**:
```
+------------------+  +------------------+  +------------------+
|   STARTLISTE     |  |   REGISTRERING   |  |   RESULTATER     |
|                  |  |                  |  |                  |
| All athletes     |  | 4-athlete queue  |  | Ranked list      |
| with roll call   |  | Result input     |  | Best results     |
| swipe gestures   |  | Action buttons   |  | Medal colors     |
+------------------+  +------------------+  +------------------+
       <-- swipe -->        <-- swipe -->

[  Liste  ] [ Registrer ] [ Resultater ]  <- Tab bar
```

**Features Implemented**:
- Horizontal ScrollView with paging for swipe navigation
- Tab bar at bottom for quick navigation
- Sync status indicator ("Live" with green dot)
- Haptic feedback on all interactions
- Animated swipe backgrounds for roll call
- Age group badges for merged events
- Attempt badges showing results/fouls/passes

**Modified Files**:
- `apps/mobile/app/(official)/record.tsx` - Complete rewrite with three-view navigation

---

### Merged Events Feature - NEW FEATURE
Added the ability for officials to merge multiple technical events that run simultaneously (e.g., pole vault for G14, G15, G16 running together).

**Use Case**:
- Multiple age groups often compete in technical events (throws, jumps) at the same time
- Previously, officials had to switch between separate event screens
- Now, officials can merge events and register results for all athletes in a single session

**Features Implemented**:

1. **Event Grouping** (`apps/mobile/app/(official)/events.tsx`):
   - Events with the same name (e.g., "Stav") are automatically grouped
   - Badge shows number of classes: "Stav [4 klasser]"
   - "Sla sammen" (merge) button on grouped events

2. **Selection Mode**:
   - Long-press or tap "Velg" to enter selection mode
   - Select multiple events across different groups
   - "Sla sammen" button appears when 2+ events selected
   - Useful when merging events with different names

3. **Recording Screen** (`apps/mobile/app/(official)/record.tsx`):
   - Unified athlete queue from all merged events
   - Athletes tagged with their age group badge
   - Header shows merged indicator: "Stav (G14 M, G15 M, G16 M)"
   - 4-athlete queue display (previous, current, next, next+1)
   - Result input with Godkjent/X/Pass buttons

**UI Flow**:
```
Events Screen                    Recording Screen
+----------------------------+   +----------------------------+
| Stav         [4 klasser]   |   | <- Stav (G14, G15, G16)    |
| [Sla sammen]               |   |    [Sammenslatt]  2/24     |
| +------------------------+ |   |                            |
| | G14 M    Kl. 10:00    >| |   | [Previous athlete]         |
| +------------------------+ |   |                            |
| | G15 M    Kl. 10:00    >| |   | +========================+ |
| +------------------------+ |   | | 42  Ole Hansen    [G15]| |
| | G16 M    Kl. 10:00    >| |   | |     IL Gansen          | |
| +------------------------+ |   | +========================+ |
|                            |   |                            |
| Lengde         [2 klasser] |   | [Next athlete]             |
| ...                        |   | [Next+1 athlete]           |
+----------------------------+   |                            |
                                 | [___.___ m]                |
                                 |                            |
                                 | [Godkjent] [X] [-]         |
                                 +----------------------------+
```

**New Files**:
- `apps/mobile/app/(official)/record.tsx` - Recording screen with merged support

**Modified Files**:
- `apps/mobile/app/(official)/events.tsx` - Added grouping, selection mode, and merge UI

---

### Mobile App Access Code Authentication - BUG FIX
Fixed access codes created in the web app not working in the mobile app.

**Problem**:
- Web app creates access codes that are stored in `event_access_codes` table
- Mobile app (Expo/React Native) calls `supabase.rpc('validate_official_access_code', ...)` to authenticate
- The RPC function `validate_official_access_code` did not exist in the database
- Mobile app login always failed with "Ugyldig tilgangskode"

**Root Cause**:
- Mismatch between web and mobile authentication approaches
- Web app validates access codes directly via SQL queries in server actions
- Mobile app expected a Supabase RPC function that was never created

**Solution**:
Created the missing `validate_official_access_code` Supabase function that:
1. Validates the access code against `event_access_codes` table
2. Checks if code is active and not expired
3. Creates a new session in `official_sessions` table
4. Logs the login in `access_code_log`
5. Returns competition info, linked events, and session token

**Database Changes**:
- Added `validate_official_access_code(p_access_code TEXT)` RPC function
- Function runs as SECURITY DEFINER to bypass RLS for session creation
- Granted execute permission to `anon` and `authenticated` roles

**New Files**:
- `supabase/migrations/20241206000001_official_access_codes.sql` - Migration with tables and RPC function

**Return Format** (for mobile app):
```json
{
  "valid": true,
  "session_id": "uuid",
  "session_token": "64-char-hex",
  "competition_id": "uuid",
  "competition_name": "string",
  "access_code_name": "string",
  "events": [{"id": "uuid", "name": "string"}],
  "expires_at": "timestamp"
}
```

### Global Theme Files - ARCHITECTURE IMPROVEMENT
Created centralized theme/color files for both mobile and web apps to avoid hardcoded colors throughout the codebase.

**Mobile App** (`apps/mobile/constants/Colors.ts`):
- Complete rewrite with comprehensive palette colors (emerald, red, amber, blue, slate, gray)
- Semantic colors for consistent usage (primary, success, error, warning, info)
- Text colors (textPrimary, textSecondary, textTertiary, textMuted, textInverse)
- Background and border colors
- Medal colors (gold, silver, bronze) for rankings
- Typography system (fontFamily, fontSize, fontWeight, lineHeight)
- Spacing scale matching Tailwind (0-16 units)
- Border radius scale (none, sm, md, lg, xl, 2xl, full)
- Shadow presets for React Native (sm, md, lg with proper elevation)

**Web App** (`apps/web/lib/theme.ts`):
- New file mirroring Tailwind config colors for use in TypeScript/JavaScript
- Primary brand colors (#1E3A5F dark blue) and accent (#FF6B35 orange)
- Status colors (success, warning, error, info) with light/dark variants
- Emerald, slate, and gray color scales
- Typography, spacing, borderRadius, shadows, zIndex, breakpoints, transitions
- Helper functions:
  - `getColor(path)` - get color by dot-notation path (e.g., 'primary.light')
  - `hexToRgb(hex)` - convert hex to RGB object
  - `hexToRgba(hex, alpha)` - convert hex to rgba string

**Usage Pattern**:
```typescript
// Mobile
import { colors, typography, spacing } from '@/constants/Colors';
style={{ backgroundColor: colors.primary, fontSize: typography.fontSize.lg }}

// Web (when Tailwind classes aren't possible)
import { colors, hexToRgba } from '@/lib/theme';
style={{ backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.5) }}
```

---

### Mobile App Event Display - UX IMPROVEMENT
Added age group, gender, and scheduled time to event display in the mobile app.

**Problem**:
- Events in mobile app only showed the event name (e.g., "Stav")
- When multiple events with the same name existed (e.g., pole vault for different age groups), they were indistinguishable
- No scheduled time was shown, making it hard to know when events start

**Solution**:
1. Updated `validate_official_access_code` RPC function to return additional event fields:
   - `age_group` (e.g., "G15", "J17")
   - `gender` (M/F)
   - `event_type` (track, field_vertical, etc.)
   - `scheduled_time` (from competition schedule)
   - Events are now ordered by scheduled_time, then age_group, then name

2. Updated mobile app to display formatted event info:
   - Event name with age group and gender: "Stav - G15 - Menn"
   - Scheduled time shown below: "Kl. 10:30"

**Database Changes**:
- New migration: `20241206000002_update_access_code_events.sql`
- Updated RPC function with additional fields and ordering

**Modified Files**:
- `apps/mobile/app/(official)/events.tsx`:
  - Extended EventItem type with new fields
  - Added `formatEventDisplay()` helper function
  - Added `formatScheduledTime()` helper function
  - Updated event card to show formatted name and time
- `apps/mobile/src/contexts/AuthContext.tsx`:
  - Added EventInfo interface with all fields
  - Updated OfficialSession to use EventInfo[]

**Display Format**:
- "Stav - G15 - Menn" (with age group and gender)
- "Kl. 10:30" (scheduled time if available)

---

### Mobile App Access Code Format - BUG FIX
Fixed mobile app rejecting valid access codes with "Ugyldig kode" error.

**Problem**:
- Mobile app expected 12-character codes in format XX-XXXX-XXXX (with prefix)
- Web app generates 9-character codes in format XXXX-XXXX (without prefix)
- Codes like `3V48-PKCZ` and `B44D-BN6T` were rejected by the mobile app

**Root Cause**:
- Mobile app formatAccessCode() only handled 12-character format
- Validation required exactly 12 characters before submission
- Web app `generateAccessCode()` creates 8-character codes formatted as XXXX-XXXX

**Solution**:
Updated mobile app login.tsx to support both code formats:
1. Updated `formatAccessCode()` to handle variable length (8-10 alphanumeric characters)
2. Changed validation to require minimum 8 alphanumeric characters (instead of 12)
3. Updated placeholder from "XX-XXXX-XXXX" to "XXXX-XXXX"
4. Increased maxLength from 12 to 14 to accommodate both formats

**Modified Files**:
- `apps/mobile/app/(official)/login.tsx`:
  - Reworked formatAccessCode() to auto-detect format
  - For 4-8 chars: formats as XXXX-XXXX (no prefix)
  - For 9-10 chars: formats as XX-XXXX-XXXX (with prefix)
  - Validation now checks for minimum 8 alphanumeric chars

**Supported Code Formats**:
- `3V48-PKCZ` (9 chars, no prefix) - generated by web app
- `KG-3C9G-HYEQ` (12 chars, with prefix) - legacy format with prefix

---

### Access Codes - Age Group Display - UX IMPROVEMENT
Added age group and gender display to the access code creation page to distinguish between events with the same name.

**Problem**:
- When creating access codes, events were only shown by name
- Multiple events with the same name (e.g., "Hoyde" for different age groups) were indistinguishable
- Officials couldn't tell which "Hoyde" event was for which age class

**Solution**:
- Updated Event interface to include `age_group` and `gender` fields
- Created `formatEventDisplay()` helper function to format events as "Name - Age Group - Gender"
- Updated `getAccessCodesForCompetition` to fetch age_group and gender from events table
- Events now display as e.g., "Hoyde - G15 - Menn" instead of just "Hoyde"

**Modified Files**:
- `apps/web/app/dashboard/competitions/[id]/access-codes/AccessCodesManager.tsx`:
  - Extended Event interface with age_group and gender
  - Added formatEventDisplay() helper function
  - Updated checkbox labels and event tags to use formatted display
- `apps/web/lib/actions/access-codes.ts`:
  - Extended AccessCode.events type to include age_group and gender
  - Updated getAccessCodesForCompetition query to select age_group and gender

**Display Format**:
- "Hoyde" (if Senior age group)
- "Hoyde - G15" (with age group)
- "Hoyde - G15 - Menn" (with age group and gender)

---

## 2025-12-05

### PWA Setup - NEW FEATURE (EasyMeet Mobile)
Set up Progressive Web App (PWA) functionality to allow the web app to be installed on mobile devices and tablets. This is Phase 1 of the EasyMeet mobile strategy.

**Context**:
- EasyMeet is designed to work as both web app and mobile/tablet app
- PWA provides "Add to Home Screen" capability for native-like experience
- Officials and speakers can use tablets in the field with app-like experience
- Spectators can install the app on their phones

**New Files**:
- `apps/web/public/manifest.json` - Web app manifest with app name, icons, theme colors
- `apps/web/public/sw.js` - Service worker for offline caching
- `apps/web/public/icons/icon.svg` - Base SVG icon for the app
- `apps/web/scripts/generate-icons.js` - Script to generate PNG icons from SVG
- `apps/web/app/icon.tsx` - Next.js dynamic favicon generation
- `apps/web/app/apple-icon.tsx` - Apple touch icon generation
- `apps/web/app/offline/page.tsx` - Offline fallback page
- `apps/web/components/ServiceWorkerRegistration.tsx` - Client component for SW registration

**Modified Files**:
- `apps/web/app/layout.tsx`:
  - Updated metadata for PWA (manifest, apple web app, open graph)
  - Added viewport configuration for mobile optimization
  - Added service worker registration component
  - Changed title from MiniMeet to EasyMeet
  - Set language to Norwegian (no)

**PWA Features**:
1. **Installable**: Users can add to home screen on iOS, Android, and desktop
2. **Offline Support**: Shows offline page when no connection
3. **Service Worker**: Caches static assets for faster loading
4. **Mobile Optimized**: Viewport settings prevent unwanted zooming
5. **Native Feel**: Standalone display mode, theme color, splash screen

**Next Steps**:
- Generate actual PNG icons using the script or online tool
- Add app shortcuts for quick access to results/official pages
- Consider React Native/Expo for Phase 2 if more native features needed

---

### Relay Team Management System - NEW FEATURE
Implemented comprehensive relay team management with per-leg athlete assignment following Norwegian athletics workflow.

**Problem**:
- Relay events (stafetter) require a different workflow than individual events
- Clubs register teams first, then assign athletes to legs 1 hour before start
- Needed support for various relay formats: 4x100m, 3x600m, Hurricane, Donaldstafett, etc.

**Database Migration** (`20241205000002_relay_teams_system.sql`):
- `relay_teams` table: Team entries with club_name, team_name, seed_time, heat/lane assignment
- `relay_team_legs` table: Per-leg athlete assignments with status tracking
- Auto-create legs trigger based on event code (3 legs for 3x, 4 legs for 4x, etc.)
- Full RLS policies for public viewing and organizer management
- Helper function `get_relay_leg_count()` for determining legs from event code

**New Files**:
- `apps/web/lib/actions/relay-teams.ts` - Server actions for relay team CRUD:
  - `createRelayTeam()`, `updateRelayTeam()`, `deleteRelayTeam()`
  - `getRelayTeamsForEvent()`, `getRelayTeam()`, `getRelayTeamsForCompetition()`
  - `assignLegAthlete()`, `assignAllLegs()` - Athlete assignment to legs
  - `checkInRelayTeam()`, `scratchRelayTeam()`, `markRelayTeamDNS()`
  - `assignRelayTeamToHeat()`, `clearRelayTeamHeat()` - Heat management
  - `getPublicRelayTeams()` - For speaker/results pages
- `apps/web/components/RelayTeamManager.tsx` - UI component for relay team management:
  - Add new teams with club name, team name, seed time
  - Expandable team cards with leg assignments
  - Athlete selection dropdowns filtered by club
  - Status indicators (Registrert, Sjekket inn, Strøket)
  - Check-in, scratch, and delete actions
  - Summary stats showing teams and check-in status

**Modified Files**:
- `apps/web/app/dashboard/competitions/[id]/events/[eventId]/page.tsx`
  - Added conditional rendering for relay events
  - Shows RelayTeamManager instead of entries table for relay events
- `apps/web/lib/event-templates.ts`
  - Added all Norwegian relay events (4x60m, 4x100m, 3x600m, Hurricane, Donaldstafett, etc.)

**Features**:
1. **Team Registration**: Create teams with club name and optional seed time
2. **Leg Assignment**: Assign athletes to specific legs (etapper)
3. **Club Filtering**: Athlete dropdown filters to show only club members
4. **Status Tracking**: Track team status through registration → check-in → scratched
5. **Leg Count Auto-Detection**: Automatically creates correct number of legs based on event code

**Supported Relay Types**:
- 4x60m, 4x100m, 4x200m, 4x400m (4 legs)
- 3x600m, 3x800m, 3x1000m, 3x1500m (3 legs)
- Hurricane relays 1000m/2000m/3000m (3 legs)
- 8x200m (8 legs)
- Donaldstafett (4 legs)

---

## 2025-12-04

### Auto-Activate Competition on Event Start - ENHANCEMENT
Added automatic competition activation when an event is started or completed.

**Problem**:
- Users could complete events but still not see public results because competition was in 'draft' status
- Had to manually click "Start stevne" before results would be visible publicly

**Solution**:
When an event status is changed to 'in_progress' or 'completed', the system now automatically sets the competition status to 'active' if it's still in 'draft'.

**Modified Files**:
- `apps/web/lib/actions/events.ts`
  - Added auto-activation logic in `updateEventStatus()` function (lines 172-186)
  - Checks competition status when event is set to 'in_progress' or 'completed'
  - Automatically updates competition from 'draft' to 'active'

---

### Public Results Navigation & Status Consistency Fix - BUG FIX
Fixed issue where clicking "Se offentlige resultater" (View Public Results) from the control center page would not navigate to the results page.

**Problem**:
- The `getPublicCompetition()` function in `public.ts` filtered competitions by status `['published', 'active', 'completed']`
- The dashboard was checking for 'live' status instead of 'active'
- Control center sets status to 'active' when starting a competition

**Modified Files**:
- `apps/web/lib/actions/public.ts`
  - Added 'live' to status filter for backwards compatibility
  - Status filter now: `['published', 'active', 'live', 'completed']`
- `apps/web/app/dashboard/page.tsx`
  - Changed status check from 'live' to 'active' (lines 149, 155)
  - Now dashboard correctly shows "Pågår" for active competitions

---

### Retired (r) Display in Vertical Event Grid - UI IMPROVEMENT
Updated vertical event results grid to show retired status ('r') as an attempt in the grid rather than as a parenthetical note after the athlete name.

**Before**: "Ola Nordmann (r)" with attempts "XX"
**After**: "Ola Nordmann" with attempts "XXr"

**Modified Files**:
- `apps/web/app/dashboard/competitions/[id]/field-official/vertical-competition.tsx`
  - Updated `formatAttempts()` functions to include 'r' → 'r' in output
  - Removed "(r)" display after athlete name
  - Added orange color styling for cells containing 'r'

**Examples**:
- Just retired: "r" (orange)
- Missed once then retired: "Xr" (orange)
- Missed twice then retired: "XXr" (orange)

---

### Vertical Event Completion Fix - BUG FIX
Fixed issue where vertical events (high jump, pole vault) could not be properly completed and results were not being transferred to the public results page.

**Problem**:
- Vertical events could be recorded but had no way to mark them as "completed"
- Places were not being calculated
- Results did not show as "official" on the public results page

**Modified Files**:
- `apps/web/app/dashboard/competitions/[id]/field-official/vertical-competition.tsx`
  - Added `completeEvent()` function that saves all results, calculates places, and sets event status to completed
  - Added "Fullfør øvelse" (Complete Event) button in the bottom action bar
  - Imported `recalculateVerticalEventPlaces` from results actions
  - Added `completing` state for button loading state

**Fix Details**:
1. **Complete Event Function**: New function that:
   - Saves all athlete results
   - Calls `recalculateVerticalEventPlaces()` to calculate places using IAAF tie-breaking rules
   - Sets event status to 'completed' via `updateEventStatus()`
   - Navigates back to event list
2. **UI Button**: Green "Fullfør øvelse" button next to existing "Lagre alt" button
3. **Loading States**: Both buttons disabled during save/complete operations

---

### Club Filter for Public Results - NEW FEATURE
Added club filter functionality to the public results page, allowing users to filter competition results by participating club.

**Modified Files**:
- `apps/web/lib/actions/public.ts` - Added `getCompetitionClubs()` function to retrieve all clubs participating in a competition
- `apps/web/app/results/[competitionId]/EventFilters.tsx` - Added club filter dropdown and filtering logic
- `apps/web/app/results/[competitionId]/page.tsx` - Updated to fetch and pass clubs to EventFilters

**Features**:
1. **Club Dropdown Filter**: New dropdown in filter section showing all participating clubs
2. **Event Filtering**: Filters events to only show those with athletes from the selected club
3. **Integration with Existing Filters**: Works alongside existing age group, event type, gender, and status filters
4. **Clear Filters**: Club filter included in "Clear all" functionality

**Usage**:
- Navigate to `/results/{competitionId}` to view competition results
- Select a club from the "Klubb" dropdown to filter events
- Only events with participants from that club will be displayed

---

### World Athletics Seeding Rules Implementation - NEW FEATURE
Implemented WA-compliant seeding system for track events following World Athletics Technical Rules 20.1-20.8.

**New Files**:
- `apps/web/lib/seeding/seeding-rules.ts` - Core seeding algorithms (zigzag distribution, lane assignment by ranking groups)
- `apps/web/lib/seeding/seeding-presets.ts` - Preset configurations for different competition types
- `apps/web/lib/seeding/index.ts` - Module exports
- `apps/web/lib/actions/seeding.ts` - Server actions for seeding operations

**Modified Files**:
- `apps/web/app/dashboard/competitions/[id]/events/[eventId]/heats/page.tsx` - Updated UI with preset selection and WA lane rules

**Features**:
1. **Zigzag Heat Distribution** (Rule 20.3.3): Athletes seeded in serpentine pattern across heats
2. **Lane Assignment by Ranking Groups**: Different rules for straight races, 200m/300m, and 400m/relay/800m
3. **Support for 6, 8, and 9 Lane Tracks**: Specific lane group configurations per WA rules
4. **Competition Presets**:
   - WA Standard: Full rules with zigzag, ranking-based lane draw, club separation
   - Club Simplified: Zigzag distribution with simpler lane assignment
   - School Basic: Random assignment for informal meets
   - Manual: No automatic seeding

**Seeding Algorithm**:
- Zigzag distribution ensures even talent distribution across heats
- Lane priority assigns center lanes (4, 5, 3, 6...) to faster athletes
- Qualification rules configurable per preset (e.g., "Top 3 + 2 fastest")

---

### Track Official Page Updated to Use WA Seeding Module - UPDATE
Updated the track official control page (`/dashboard/competitions/{id}/track-official`) to use the new WA-compliant seeding system instead of the previous simple seeding methods.

**Modified Files**:
- `apps/web/app/dashboard/competitions/[id]/track-official/page.tsx` - Replaced local seeding functions with WA module

**Changes**:
1. **Preset Selection**: Now uses the same preset system (WA Standard, Club, School, Manual) as the heats page
2. **WA-Compliant Seeding**: Uses `generateSeeding()` action from `@/lib/actions/seeding.ts`
3. **Auto-detection**: Automatically recommends appropriate preset based on competition type
4. **Lane Support**: Updated to support 6, 8, and 9 lane configurations
5. **Heat Count Control**: Added manual heat count override option
6. **Retained Exports**: Kept timing system export functionality (FinishLynx, Alge, CSV)

**Workflow**:
The track-official page is the main interface for secretariat working with timing systems:
1. Select track event from list
2. Choose seeding preset and lane count
3. Click "Generer heat" to create WA-compliant heat assignments
4. Export to timing system (FinishLynx, Alge, or CSV)

---

### Role-Based Access Control for Officials - NEW FEATURE
Implemented a complete access code system for event officials. Officials can now log in with unique codes to access and record results for their assigned events without needing full user accounts.

**New Files**:
- `apps/web/lib/actions/access-codes.ts` - Server actions for access code management
- `apps/web/app/official/page.tsx` - Official login page with code entry
- `apps/web/app/official/dashboard/page.tsx` - Official dashboard showing assigned events
- `apps/web/app/official/dashboard/LogoutButton.tsx` - Logout client component
- `apps/web/app/official/event/[eventId]/page.tsx` - Event recording page with access control
- `apps/web/app/official/event/[eventId]/OfficialVerticalRecording.tsx` - Vertical jump recording UI
- `apps/web/app/official/event/[eventId]/OfficialHorizontalRecording.tsx` - Horizontal events recording UI
- `apps/web/app/official/event/[eventId]/OfficialTrackRecording.tsx` - Track events recording UI
- `apps/web/app/dashboard/competitions/[id]/access-codes/page.tsx` - Admin page for managing codes
- `apps/web/app/dashboard/competitions/[id]/access-codes/AccessCodesManager.tsx` - Code management UI

**Modified Files**:
- `apps/web/lib/actions/events.ts` - Added `getEventEntries()` and `getEventHeights()` helper functions
- `apps/web/app/dashboard/competitions/[id]/page.tsx` - Added navigation link to access codes page

**Database Tables** (created in previous session):
- `access_codes` - Stores access codes with competition reference
- `access_code_events` - Junction table for many-to-many code-to-event relationship
- `official_sessions` - Tracks active sessions with expiration
- `access_code_audit_log` - Audit trail for security

**Features**:
1. **Code Generation**: Organizers can create access codes with optional prefix (e.g., HJ-ABCD-1234)
2. **Event Assignment**: Each code can be linked to multiple events
3. **Session Management**: Secure cookie-based session with automatic expiration
4. **Official Interface**: Mobile-friendly recording interfaces for track, field horizontal, and field vertical events
5. **Access Control**: Officials can only view and modify results for their assigned events

**Usage Flow**:
1. Organizer creates access code at `/dashboard/competitions/{id}/access-codes`
2. Organizer shares code with official (SMS, print, etc.)
3. Official visits `/official` and enters code
4. Official sees assigned events and can record results

---

### Vertical Jump Retirement Display ('r') - NEW FEATURE
Added support for displaying 'r' (retired/gitt seg) in the vertical jump results grid.

**Modified Files**:
- `apps/web/app/dashboard/competitions/[id]/field-official/vertical-competition.tsx` - Records 'r' attempt when athlete retires
- `apps/web/app/results/[competitionId]/[eventId]/LiveResultsTable.tsx` - Displays 'r' with orange styling
- `apps/web/app/results/[competitionId]/[eventId]/page.tsx` - Added 'r' to legend

**Changes**:
1. **Recording retirement**: When an athlete clicks the 'r' (retire) button, the system now records an 'r' attempt at the current height in addition to setting the status to 'retired'
2. **Display styling**: 'r' is displayed in orange color (`text-orange-500`) in the results grid
3. **Legend update**: Added explanation "r = Gitt seg" (retired) to the vertical event legend

**Example**:
If an athlete has attempts `XO` at 1.20m then retires at 1.25m after one miss, the grid will show:
- 1.20: `XO` (cleared)
- 1.25: `Xr` (one miss, then retired)

---

### Vertical Jump Tie-Breaking Bug Fix - CRITICAL FIX
Fixed incorrect tie-breaking calculation for vertical events (high jump, pole vault).

**Modified Files**:
- `apps/web/lib/actions/results.ts` - `saveVerticalResult` function (lines 461-468)

**Bug Description**:
When calculating `total_misses` for tie-breaking, the system was counting ALL misses including those at heights the athlete never cleared. According to WA/IAAF rules, only misses at heights up to and including the best cleared height should count.

**Example of the bug**:
- Athlete A: Clears 1.20 (1 miss), stops → `totalMisses = 1` (correct)
- Athlete B: Clears 1.20 (1 miss), fails XXX at 1.25 → `totalMisses = 4` (WRONG - was counting 3 misses at 1.25)
- Result: Athlete A incorrectly ranked higher even though both should be tied

**Fix**:
Changed the totalMisses calculation from:
```typescript
const totalMisses = input.attempts.filter(a => a.outcome === 'x').length;
```

To:
```typescript
const totalMisses = bestHeightCm
  ? input.attempts.filter(a => a.outcome === 'x' && a.height <= bestHeightCm).length
  : 0;
```

Now only misses at heights up to and including the best cleared height are counted, following WA/IAAF tie-breaking rules.

---

### Public Results Page Redesign - MAJOR UI UPDATE
Complete redesign of the public-facing results pages with Norwegian localization and modern styling.

**Modified Files**:
- `apps/web/app/results/page.tsx` - Main competitions list
- `apps/web/app/results/[competitionId]/page.tsx` - Competition events overview
- `apps/web/app/results/[competitionId]/[eventId]/page.tsx` - Event results page
- `apps/web/app/results/[competitionId]/[eventId]/LiveResultsTable.tsx` - Live results component

**New Files**:
- `apps/web/app/results/[competitionId]/EventFilters.tsx` - Client-side filtering component

**Features**:

**1. Norwegian Localization**:
- All text translated to Norwegian
- Date formatting with `nb-NO` locale
- Status labels: Pagar, Offisiell, Planlagt, Innsjekk, Direkte, etc.

**2. Professional Design**:
- Modern slate/emerald color scheme
- Gradient headers with subtle grid pattern overlay
- Consistent card-based layouts
- Responsive design for mobile and desktop
- Smooth hover animations and transitions

**3. Advanced Event Filtering**:
- Search by event name
- Filter by status (Pagar/Offisielle/Kommende)
- Filter by gender (Menn/Kvinner/Blandet)
- Filter by age group/class
- Filter by event type (Lop/Stafett/Hopp/Kast)
- Tab-based quick status navigation

**4. Live Results Improvements**:
- Auto-refresh every 5 seconds when event is live
- Manual refresh button
- Last updated timestamp
- Red pulsing indicator for live events
- Norwegian column headers (Plass, Nr, Utover, Klubb, Tid, Beste)

**5. Results Tables**:
- Track results with time display
- Vertical jump matrix with height progression
- Field/throw results with 6-round attempt columns
- Winner/podium highlighting with amber/gold styling
- Record badges integration (PB, SB, NR, etc.)

**6. Breadcrumb Navigation**:
- Full navigation path: Stevner > Competition > Event
- Easy back navigation

---

### Track/Running Events Control Page - NEW FEATURE
Added a comprehensive track event management page (`/track-official`) accessible from the control center.

**New Files**:
- `apps/web/app/dashboard/competitions/[id]/track-official/page.tsx`

**Features**:

**1. Event Selection**:
- List of all track/relay events in the competition
- Quick status indicators (Planlagt/Pagar/Ferdig)
- Click to select and manage event

**2. Seeding System**:
- **Time ascending**: Sort by seed time (fastest first)
- **Serpentine**: Even heat distribution (fastest in slowest heat, snake pattern)
- **Random**: Fisher-Yates shuffle

**3. Heat Distribution**:
- Automatic calculation of number of heats based on entries and lanes
- Supports 6, 8, or 10 lane tracks
- Sequential or serpentine distribution methods

**4. Lane Draw**:
- **IAAF method**: Center lanes (4,5) to fastest, then (3,6), (2,7), (1,8)
- **Random**: Random lane assignment within each heat

**5. Timing System Export**:
- Detects timing system from competition settings
- **FinishLynx**: LIF format (Event,Heat,Lane,ID,LastName,FirstName,Affiliation)
- **Alge-Timing**: ALG format (Bib;Lane;Name;Club;Event;Heat)
- **CSV/Manual**: Generic CSV format with Norwegian headers

**Control Center Button**:
- Added green "Lop" button in control center header (next to "Teknisk" button)
- Links to `/dashboard/competitions/[id]/track-official`

---

## 2025-12-03

### Vertical Events Enhancements - COMPLETE
Enhanced vertical event (høyde/stav) result recording workflow:

**Auto-Advance to Next Athlete** (`/field-official/vertical-competition.tsx`):
- After recording O (cleared), X (foul), or - (pass), automatically expands next athlete
- If athlete is done at current height (cleared, passed, or 3 failures), moves to next active athlete
- If athlete still has attempts, moves to next in round-robin queue
- 150ms delay to prevent "ghost clicks" on mobile devices
- Proper round-robin: all athletes get 1st attempt before anyone gets 2nd
- **Bugfix**: Auto-advance now properly skips athletes who have passed (-) at current height
- **Bugfix**: Athletes with 3 total failures (including carried) now properly excluded

**Recently Finished Display (Cleared or Eliminated)**:
- Athletes who clear a height stay visible with "KLART!" badge until next attempt is recorded
- Green highlight and pulsing animation for recently cleared athletes
- **New**: Athletes who are eliminated (3 failures) also stay visible with "UTE!" badge
- Red highlight and pulsing animation for eliminated athletes
- Both cleared and eliminated athletes stay in their original position until next attempt
- Athletes who fail on opening height appear in results list as NM (No Mark) without placement
- **New**: Results list updates in real-time as athletes compete
  - Athletes show in grid immediately after first attempt
  - Active athletes with only failures show "-" as result (still competing)
  - Eliminated athletes show "NM" as result (no valid mark)

**Auto-Save (Critical)**:
- Every attempt (O, X, -) is automatically saved to database immediately
- Status changes (retired/withdrawn) are automatically saved
- Undo operations (Angre) are automatically saved
- No data loss when navigating away - all changes are persisted instantly

**Compact Header**:
- Reduced header height to show more athletes on screen
- Combined event name, navigation, and status info into minimal space

**Results Grid with Series**:
- Standings now show full attempt series for each height
- Table format with heights as columns
- Shows XO, XXO, O, -, etc. for each height attempted
- Color-coded: green for cleared (O), red for failures (X), gray for passes (-)
- Horizontal scrolling for many heights on mobile

**Pass (-) Rule Implementation**:
- Pass means athlete is done at THIS height, cannot attempt again until next height
- Consecutive failures before pass carry over to next height:
  - `-` alone = 3 attempts at next height
  - `X, -` = 2 attempts at next height
  - `X, X, -` = 1 attempt at next height
- Shows "X igjen" badge (yellow/red) for athletes with reduced attempts
- Athletes eliminated when total failures (current + carried) = 3

**Retired (r) Status Handling**:
- No attempts = DNS (Did Not Start)
- Attempts but no cleared height = NM (No valid Mark)
- Cleared a height = shows best height with "r" badge
- Auto-advances to next athlete after marking retired

**Current Round Indicator**:
- Header shows "Forsøk X • Y gjenstår" (Attempt X • Y remaining)
- Calculates current round based on minimum attempts among active athletes

**IAAF-Compliant Standings**:
- Ranking follows official rules:
  1. Best height (descending)
  2. Fewest failures at winning height
  3. Fewest total failures
- Displays (failures at height / total failures) for each athlete
- Medal colors for top 3 positions
- Shows all athletes including DNS/NM at the end

### Horizontal/Throw Events Enhancements - COMPLETE
Enhanced kast/kule/lengde event result recording with same improvements as vertical events:

**Auto-Save (Critical)** (`/field-official/page.tsx`):
- Every attempt is automatically saved to database immediately
- Foul (X) and Pass (-) buttons trigger auto-save
- Distance confirmation with OK button triggers auto-save
- Status changes (DNS, NM, r, DQ) are automatically saved
- Clear/Nullstill operations are automatically saved
- No data loss when navigating away - all changes are persisted instantly

**Auto-Advance to Next Athlete**:
- After confirming distance (OK button), automatically expands next athlete
- After recording X (foul) or - (pass), automatically expands next athlete
- Round-robin style: all athletes get 1st round before anyone gets 2nd
- Automatically moves to next round when all athletes have attempted

**Compact Header**:
- Reduced header height to show more athletes on screen
- Shows current round prominently ("Runde X")
- Shows remaining athletes count and total

**Real-time Results List**:
- Live standings displayed at bottom of screen
- Updates automatically as results are recorded
- Shows position with medal colors for top 3
- Mini attempt grid showing all rounds (X, -, or distance markers)
- Athletes with no valid marks show "NM"
- Athletes still competing show current best or "-" if no valid mark yet

**Distance Input with Confirm Button**:
- Large number input field for easy mobile entry
- Green checkmark button to confirm and advance
- Quick action buttons for X (foul), - (pass), and Nullstill (clear)

### Official Athletics Result Codes (Rule 132) - COMPLETE
Implemented official World Athletics / Norsk Friidrett result codes:

**New Constants File** (`/lib/constants/result-codes.ts`):
- `ATTEMPT_CODES`: O (valid vertical), X (foul), - (pass)
- `AthleteStatusCode` type: active, DNS, DNF, NM, r, DQ
- `STATUS_LABELS` and `STATUS_DESCRIPTIONS` for display
- `QUALIFICATION_CODES`: Q, q, qR, qJ
- `RACE_WALK_CODES` and `CARD_CODES`
- `getAttemptDisplayCode()` helper function

**Field Official Page Updates** (`/dashboard/competitions/[id]/field-official/page.tsx`):
- Status selector with official codes: DNS, NM, r (retired), DQ
- Attempt buttons now show X and - instead of "Feil" and "Pass"
- O shown for valid attempts in høyde/stav (vertical events)
- Status badge in athlete header for non-active athletes
- `isVerticalEvent()` helper to detect høyde/stav events
- All UI elements use official notation

**Source**: docs/koderresultat.pdf (World Athletics Rule 132)

### Timing System Selection & Competition Settings - COMPLETE
Added timing system configuration for competitions:

**New Constants** (`/lib/constants/timing-systems.ts`):
- TIMING_SYSTEMS array with supported systems:
  - `manual` - Manual timing (hand-held)
  - `alge` - ALGE-TIMING (photofinish)
  - `finishlynx` - FinishLynx (photofinish)
  - `macfini` - MacFini (photofinish)
  - `other` - Other system

**Competition Creation** (`/dashboard/competitions/new/page.tsx`):
- Added timing system dropdown selector
- Timing system saved to competition settings JSON

**Competition Settings Page** (`/dashboard/competitions/[id]/settings/page.tsx`):
- New page for editing competition settings after creation
- Edit: name, date, location, venue, description
- Venue type selection: Indoor, Outdoor, Road
- Timing system selection with descriptions
- Accessible via Settings button in competition header

**API Route** (`/api/competitions/[id]/route.ts`):
- New API route for fetching competition data
- Used by settings page for client-side data loading

**Server Actions** (`/lib/actions/competitions.ts`):
- Added `updateCompetition()` function for editing competition details
- Merges existing settings with new venue_type and timing_system

### Control Dashboard Performance & Age Group Display - COMPLETE
Optimized control dashboard loading and added age group display:

**Performance Optimization** (`/lib/actions/entries.ts`):
- Created `getControlDashboardData()` combined data fetch function
- Reduced database queries from ~46 to just 6 queries
- Previous: 5 separate server action calls + N+1 pattern for result counts
- Now: Single function with parallel queries and in-memory aggregation
- Expected improvement: 80-90% faster loading

**Age Group Display** (`/dashboard/competitions/[id]/control/page.tsx`):
- Added `age_group` field to Event interface and database query
- Age group now displayed on all event cards: "Kvinner U20 • Finale"
- Conditionally shown only when age_group is set

**Timezone Fix - Local Time Display**:
- Added `getLocalHour()` helper function for timeline grouping
- Timeline now groups by correct local hour (no timezone conversion)
- All event times use `formatLocalTime()` - extracts HH:MM from ISO string
- Fixed "Florida time" issue - times now display as entered
- Also fixed in field-official (Teknisk) page

**Norwegian Localization Update**:
- Gender labels translated: Men → Menn, Women → Kvinner
- "Check-in Open" → "Innsjekk åpen"
- "athletes" → "utøvere"
- "Competition Timeline" → "Tidslinje"
- "Coming Up Next" → "Neste øvelser"
- "Next Event" → "Neste"
- "No upcoming events scheduled" → "Ingen planlagte øvelser"
- "No events with scheduled times" → "Ingen øvelser med planlagte tider"
- "Unscheduled Events" → "Øvelser uten tidspunkt"
- "No events currently in progress" → "Ingen øvelser pågår"

### Control Dashboard Enhancements - COMPLETE
Enhanced the live competition control dashboard:

**Timezone Fix** (`/dashboard/competitions/[id]/control/page.tsx`):
- Added `formatLocalTime()` helper function
- Extracts HH:MM directly from ISO string without Date conversion
- Times display as entered (local time), not converted to user's timezone

**Norwegian Localization**:
- Translated all status labels to Norwegian:
  - draft → Kladd, scheduled → Planlagt, checkin → Avkrysning
  - in_progress → Pågår, official → Offisiell, completed → Ferdig, cancelled → Avlyst
- Translated action buttons: Planlegg, Åpne avkrysning, Start, Offisiell, Fullfør, Detaljer
- Updated empty states and labels to Norwegian

**Start/End Competition Controls**:
- Added "Start stevne" button when competition is not active
- Added "Avslutt stevne" button when competition is active
- Live status bar showing "Stevnet pågår" with pulsing indicator
- Competition status updates via `updateCompetitionStatus()` action

### Field Official Mobile Interface (Phase 7.1) - PARTIAL
Created mobile-optimized interface for field event officials:

**New Page** (`/dashboard/competitions/[id]/field-official/page.tsx`):
- **Event Selection Screen**:
  - List of field events (horizontal jumps, throws)
  - Status indicators (Pågår, Ferdig, Planlagt)
  - Connection status indicator (Online/Offline)
- **Results Entry Screen**:
  - Mobile-first card-based design with large touch targets
  - Expandable athlete cards with best mark and position
  - Round selector (1-6) for quick navigation between attempts
  - Quick action buttons: Feil (X), Pass (-), Nullstill
  - Distance input with large numeric keypad-friendly field
  - Wind reading input per attempt
  - Individual save per athlete or "Lagre alt" bulk action
  - Sorted standings by best mark
  - Medal styling for top 3 positions
  - Connection monitoring with last sync timestamp
  - Norwegian localization throughout

**Control Dashboard Update**:
- Added orange "Teknisk" button linking to field official interface

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
