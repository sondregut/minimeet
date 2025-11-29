# Roster Athletics - Complete Feature Documentation

This document provides a comprehensive reference of all features, screens, tabs, and UI patterns from Roster Athletics, a mature athletics competition management platform. Use this as a reference for MiniMeet development.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [User Authentication](#2-user-authentication)
3. [Competition Management](#3-competition-management)
4. [Event Management](#4-event-management)
5. [Athlete & Participant Management](#5-athlete--participant-management)
6. [Registration System](#6-registration-system)
7. [Start Lists](#7-start-lists)
8. [Results Entry](#8-results-entry)
9. [Mobile Meet Management App](#9-mobile-meet-management-app)
10. [Public Views](#10-public-views)
11. [Records System](#11-records-system)
12. [Timing System Integrations](#12-timing-system-integrations)
13. [Team Competitions](#13-team-competitions)
14. [Licence Management](#14-licence-management)
15. [PDF & Exports](#15-pdf--exports)
16. [Communication Features](#16-communication-features)

---

## 1. Platform Overview

### Architecture
- **Web Admin Portal**: Full competition management
- **Meet Management App**: iPad/tablet app for field officials
- **Consumer App**: Mobile app for athletes and spectators
- **Separate databases**: Admin portal and Consumer app have separate user databases

### Navigation Structure (Admin Sidebar)
- Dashboard/Home
- Search
- Events/Schedule
- Start Lists
- Results
- Participants
- Check-in
- Registration Management
- Timing Integration
- Settings/Details

---

## 2. User Authentication

### Sign Up Options
- Sign up with Google
- Sign up with Apple
- Sign up with Facebook
- Sign up with Email

### Email Sign Up Form
- Given name (first)
- Surname (last)
- Day of birth
- Month of birth (dropdown)
- Year of birth
- Email
- Password (with visibility toggle)
- Password confirmation
- Country selection (for privacy compliance)
- Marketing opt-in checkbox
- Privacy Policy link

### Email Verification
- 6-digit verification code entry
- "Check spam folder" reminder
- Resend option

### Account Menu
- Language selector (submenu)
- Profile & Settings
- Log out

### Settings Modal
Tabs:
- **Profile**: Personal information
- **Display**: Date format (DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD), Time format (24h, 12h)
- **Password**: Change password
- **SSO**: Single sign-on settings
- **Delete**: Delete account

---

## 3. Competition Management

### Competition Details Sidebar
Sections:
- **General**: Name, Season (Outdoor/Indoor), Status (Draft/Published), Type (Regional/National/etc.), Measurement units (Metric/Imperial), Start/End date and time, Team competitions toggle, Individual scoring toggle, Public link
- **Contact**: Organizer contact information
- **Location**: Venue details
- **Country-specific options**: Federation-specific settings
- **Extra**: Additional settings
- **Timing system integration**: Connect timing systems
- **Sponsor**: Sponsor logos and information
- **Statistics**: Competition statistics

### Action Buttons
- **Use as template**: Create new competition from this one
- **Permissions**: Manage user access
- **Generate PDF**: Create printable documents
- **Import/Export**: CSV import/export
- **Agent config**: Timing system agent configuration

### Copy Competition Dialog
Fields:
- Meeting name
- Start date (with calendar picker)
- Start time
- Transfer start lists (checkbox)
- Transfer access permissions (checkbox)

### Competition Status Options
- Draft (not publicly visible)
- Published
- Cancelled (shows "CANCELLED" badge)

### Competition List/Discovery
- Search box
- Filters: Country, From date, To date, Registration status
- Quick filters: My country, Previous month, Previous week, Next week, Next month, Clear filters
- **Highlights** section showing featured competitions
- Competition cards with: Image, Date/time, Name, Venue, Location, "View" link

---

## 4. Event Management

### Events Table
Columns:
- Name (e.g., 100m, Shot Put, High Jump)
- Gender (Men/Women/Mixed)
- Age group (Senior, U20, U18, etc.)
- Registration status (Open, Closed, Pending, Excluded)
- Price (with currency, e.g., GBP 25.00)
- Qualification standard
- Max participants
- Day/Date

### Registration Status Values
- **Open**: Registration available
- **Closed**: Registration ended
- **Pending**: Awaiting approval
- **Excluded**: Not available for registration

### Event Configuration Options
- Require registrants to provide:
  - Personal best (checkbox)
  - Season best (checkbox)
  - Seeding result (checkbox)
- Qualification standard verification: Open (dropdown)
- Qualification standard record: Season best (dropdown)
- Automatically approve all registrations (toggle)

---

## 5. Athlete & Participant Management

### Athlete Profile Modal
Tabs:
- **Personal**: Name, DOB, Gender, Country, Photos
- **Clubs**: Club affiliations with primary selection
- **License**: Federation license numbers
- **Records**: Personal records
- **Sharing**: Profile sharing settings

### Personal Tab Fields
- Face photo (circular, with Upload button)
- Profile photo (square, with Upload button)
- Given name (first) *required
- Middle name (optional)
- Surname (last) *required
- Competition Category: Male/Female
- Date of birth *required
- Country (dropdown)
- Para class: Track and Jump (dropdown)
- Para class: Throws (dropdown)
- Auto-format names (checkbox)

### Clubs Tab
- Table: Primary (radio), Club/school, Country, Verification (checkmark)
- Multiple club affiliations allowed
- One primary club selection
- "Add club/school" button

### Add Club/School Dialog
- Search filters: Club/school name, Country, Type
- "Can't find the club?" section with Create & select option
- Create form: Club/school name, City, Country

### License Tab
- Table: Authority, Licence number
- Validation status indicator (green checkmark or red warning)
- Tooltip: "The licence couldn't be validated against the licence server"
- "Add licence number" button

### Create New Athlete Form
- Given name (first)
- Middle name (optional)
- Surname (last)
- Competition Category: Male/Female
- Date of birth
- Country
- Club/school association: Unattached (radio) or Add club/school
- Para class: Track and Jump
- Para class: Throws
- Auto-format names checkbox
- Reset / Save buttons

### Account Page
Tabs:
- **Registrations**: List of competition registrations
- **Athletes & relays**: Managed athletes
- **Registration credits**: Pre-paid registration credits

Athletes table columns: Name, Date of birth, Country, Club/school

### Participants Overview
- Column toggles (chips): Bib number, Gender, Event, Club/school, Country, Participant, Age group, Start time, PB, SB
- Filters row: Event, Club/school, Country, Age group, Gender, Show combined events
- "Click to sort, drag and drop to reorder" functionality
- Table columns: #, BIB, Participant, Gender, Club/school, Age group, Event, Start time, PB, SB

---

## 6. Registration System

### Registration Page (Public)
- Competition name and logo
- Registration deadline display
- "Add athlete/relay" button
- Licence verification status indicator

### Athlete Registration Table
Columns:
- Participant (Name, Gender, DOB, Country)
- Event (with "Select events" link)
- Msg (message icon)
- Fee
- Status
- Payment status

### Status Indicators
- "Missing or invalid licence" (red text)
- Approved
- Pending

### Event Selection Form
- Athlete info header (Name, DOB, Country, Club - click to change)
- Help text: "After selecting an event, you can click on the message icon to notify the organiser regarding any additional support information or reasonable adjustments required."
- Event table: Event, Gender, Age group, PB (input), SB (input), BIB, Fee, Message icon, Selection checkbox
- Unselected events show PB/SB as "HH:MM:SS.ss" placeholder

### Group Payment Registration
- Info text: "You are eligible for group payment. If you prefer to pay for your registrations yourself, please untick the box below."
- Warning: "If your group payment request is declined by the club manager, you will be required to pay independently."
- "Request group payment" checkbox
- Table: Event, Gender, Age group, PB, SB, Fee (with currency), Message icon, Selection checkbox

### Group Payments Approval (Club Manager View)
View options:
- Meetings
- Approval & payment (selected)
- Payments history

Filters:
- Name search
- Event/product: All
- Participation approval: All
- Group payment approval: All

Table columns: Name, Event/product, Club, Price, Participation approval, Payment, Group payment approval

Actions:
- Approve (green checkmark)
- Reject (red X)
- Payment button with amount (e.g., "Payment (PLN 100.00)")

### Registration Configuration (Organizer)
- Check-in options dropdown:
  - Disabled
  - Organiser only
  - Organiser & participant
  - Organiser & participant with verification

### Questionnaire Setup
- Status: Disabled/Enabled
- "Select questions" button
- Question table: Question text, Type, Delete icon
- Drag handles for reordering
- Question types: Free-text
- Example questions:
  - Emergency contact - name
  - Emergency contact - relationship
  - Emergency contact - telephone number
  - Place of birth (city)

---

## 7. Start Lists

### Start Lists Screen (Admin)
Left Panel:
- "Start lists" header with sync icon
- Search participants input
- Events grouped by:
  - **Men & Boys** (expandable)
    - Event name (e.g., "M · 100m · Senior")
    - Stage: Heat, Final
  - **Women** (expandable)
    - Event listings

Filter Panel (expandable):
- "Collapse all" button
- **Search by**:
  - Event name (radio)
  - Participant name (radio, selected)
  - Participant BIB (radio)
- Auto-filter start lists (checkbox)
- **Sort by**:
  - Event name (radio)
  - Event time (radio)
- **Filter** (checkboxes):
  - Breakdowns
  - Men
  - Women
  - Finished

### Start List Table
Header: Event name · Gender · Age group · Stage (count)
Columns: Lane, Athletes, Notes, Bib number, Initial PB, Initial SB

Athlete row display:
- Avatar placeholder
- Name (LASTNAME, Firstname format)
- DOB · Country flag · Country code
- Club name

Actions:
- "Add athletes" button
- "Seed" button (auto-assign lanes)
- Settings/options icon

---

## 8. Results Entry

### Results Screen Header
- Event: "100m · Senior · Final (8)" or "100m · Senior · Heat (8)"
- Last change timestamp: "Last change: 2024-09-03, 8:04"
- Status toggle: FINISHED (with indicator)
- "Seed" button
- Options menu icon

### Options Menu
- **Automatic calculations** (submenu):
  - Calculate places (checkbox)
  - Calculate records (checkbox)
  - Calculate advancements (checkbox)
  - One-time (submenu)
- **Sort by** (submenu)
- Records without wind reading (checkbox)
- Auto-format results (alt + q) (checkbox)
- Show unit conversions (checkbox)
- **Generate PDF**
- **Scoreboard** (submenu)
- **Event visibility** (submenu)
- **Edit notes**
- **Mark DNS** (highlighted in red box)

### Results Table Columns
- Place (1, 2, 3, etc. or "-" for DNS/DNF)
- Lane
- Athletes (with avatar, name, DOB, country, club)
- Notes
- Bib number
- Adv. (Advancement: Q, qJ, Adv.)
- Status (dropdown: OK, DNS, DNF, DQ)
- React. (Reaction time in seconds, e.g., 0.120)
- Result (time format: HH:MM:SS.ss or (-)S.sss)
- Wind (for sprints, e.g., 0.0)

### Advancement Indicators
- **Q**: Qualified (automatic by place)
- **qJ**: Qualified by time/jumping (next fastest)
- **Adv.**: Advanced
- **OOC**: Out of Competition (shown in separate row style)

### Status Codes
- **OK**: Normal finish
- **DNS**: Did Not Start
- **DNF**: Did Not Finish
- **DQ**: Disqualified

### Result Indicators
- **PB**: Personal Best (shown below time in gold)
- Wind reading displayed in header (e.g., "Q 3 / Wind: 0.0")

---

## 9. Mobile Meet Management App

### Track Event Timer Screen
Header:
- "Cloud: connected" status
- Event name (e.g., "Half Marathon")
- Close (X) button
- Options menu (...)

Tabs: Clock | Results | BIB order | Ranking

Timer display: Large format "01:20:25" (yellow background)
Participants count: "Participants: 12 (1/11)"

Results entry:
- Athlete name and BIB with time badge
- Delete button

BIB entry keypad:
- "Enter BIB" prompt
- Numeric keypad (1-9, 0)
- Backspace and confirm buttons

### Field Event Entry Screen (Horizontal Jumps/Throws)
Header:
- Version and connection status
- Event name (e.g., "Shot Put", "Men's Triple Jump")
- Search: "BIB or Name"

Event info bar:
- Time · Stage · Gender · Age group (e.g., "11:00 · Final · Men · Senior")

Athletes list:
- Attempt badges showing results (e.g., "1. 17.01", "2. x")
- Name
- BIB number
- Notes indicator (e.g., "Notes: YC")
- Round indicator (numbered circle)

Section dividers:
- "THROWING" / "JUMPING"
- "On deck: [Next athlete name]"

Result entry panel:
- BIB and Name header
- Status: OK (dropdown)
- Wind: (-)MM.m input
- Result: MM.mm input (large display)
- Attempt: OK
- Round: 1, 2, 3...
- Numeric keypad

### Combined Events (Heptathlon/Decathlon)
- Points display for each athlete
- Running points total
- "=PB" indicator for personal best marks

---

## 10. Public Views

### Competition About Page
- Competition banner image
- Competition name
- Status badge (e.g., "CANCELLED" in red)
- Date and time
- Registration deadline
- Venue information
- "Display times" section

Tabs: About | Search | Schedule / Start lists | Points | Participants

### Public Event Page
Event header:
- Event name with specification (e.g., "Hammer Throw (7.26kg) · Qualification Group A")
- Gender · Age group (e.g., "Men · Senior")

Sub-tabs: Start list | Results | Records | More

### Start List View (Public)
- Search box
- Table: #, Lane, Participant (with year, flag), Club, Result
- Qualification indicator: "Q 3 / Wind: 0.0"

### Results View (Public)
Same layout as start list with results:
- Place ranking
- Time/distance with Q indicator
- PB indicator

### Athlete Search Results
- Search box: "Search by athlete, relay or club/team"
- Country filter dropdown
- Results grouped by athlete:
  - Athlete header: "John Doe [flag] 2000 (Roster Athletics)"
  - Results table: Place, Event, Gender, Age group, Stage, Result

### Mobile Consumer App - Results View
Header: Event name with back arrow
Tabs: RESULTS | START LIST
Stage selector: Final, Senior (dropdowns)

Results list:
- Place number
- Profile indicator
- BIB and Club info
- Athlete name with flag
- PB/SB indicators
- "Show more" expandable
- Time and distance

---

## 11. Records System

### Enabled Records Configuration
Modal with checkboxes:
- Championship record (CR)
- Club record (CLR)
- Collegiate record (CollR)
- Course record (CoR)
- Facility record (FR)
- High school record (HiR)
- League record (LeR)
- Meeting record (MR)
- National record (NR)
- Olympic Games qualifying mark (OGQ)
- Personal best (PB)
- Regional record (RegR)
- Season best (SB)
- World record (WR)

### Records Tab (Public Event Page)
Table:
- Record type (e.g., "World record (WR)", "Meeting record (MR)")
- Value (e.g., "86.74", "83.63")

### Initial Records Setup
- Left panel: Men / Women tabs
- Filter by: Sport event dropdown, Age group dropdown
- "Enable/disable records" button
- Table: Event, Age group, Record values

---

## 12. Timing System Integrations

### Supported Systems
- FinishLynx
- ALGE-TIMING
- Eagle Eye Pro
- TimeTronics
- RACE RESULT

### RosterAgent
- Desktop application for timing integration
- Downloads available for Windows/Mac
- Connects to Roster Athletics cloud

### Chip Timing & Splits
Tabs: Timing | Announcer warning | Predictions

**Predictions Tab**:
- Prediction based on: Season best (dropdown)
- "Based on X participants" info
- Split times table:
  - Distance (0.5, 1.0, 1.5, 2.0 km, etc.)
  - Unit (Kilometers)
  - First (fastest split)
  - Average (average split)
  - Last (slowest split)
  - Each with timestamp

Settings panel:
- Scheduled start time
- Start time marker name
- Actual start date
- Actual start time (HH:MM:SS.ss)
- Rank by: Gun time (dropdown)
- Result display (public): Gun time (dropdown)

Actions:
- "Disable splits & chip timing" button
- Close / Save buttons

---

## 13. Team Competitions

### Team Competition Setup
- Team competitions: Enabled/Disabled toggle
- Individual scoring: Enabled/Disabled toggle

### Team Scoring Methods
- Points by place
- Custom scoring tables
- Combined team scores

---

## 14. Licence Management

### Licence Management Screen
- "Show all" button
- "Download as CSV" button
- "Active configuration" button

Table columns: Type, Licence, Name, Date of birth, Validity, Club

### Licence Detail Modal
Header: "John DOE · LTU0100013"

Table:
- Validity (date range)
- Variant (e.g., "Senior & Masters, Non-member")
- Source (e.g., "Payment")
- Price (e.g., "EURO 100.00")
- Payment status (e.g., "Payment complete")
- Active (checkbox)
- Options menu

---

## 15. PDF & Exports

### Generate PDF Options
Available from various screens via "Generate PDF" button

### Import/Export
- Import/Export CSV button on competition details
- Download as CSV on licence management
- Export participant lists
- Export results

### CSV Import Screen
Filters: Event, Gender, Age group, Stage

Import status indicators:
- Green checkmark: Matched successfully
- Yellow/Orange warning: Needs manual selection

Table columns:
- Entry id
- Start list id
- Participant (with "Select a profile from the list" dropdown)
- Gender
- Date of birth
- Licence
- Country
- Club
- PB
- SB
- SR

Actions: Upload, Finished buttons

---

## 16. Communication Features

### Meeting Chat
- Slide-out panel on right side
- Messages show: Timestamp, User name, Message text
- "Post message" input at bottom
- Real-time updates

### Registration Messages
- Message icon on each registration
- Click to open chat thread
- Allows athlete-organizer communication

### Notifications
- Email notifications for registration status changes
- Payment confirmation emails
- Group payment approval/rejection notifications

---

## UI Patterns & Components

### Color Coding
- **Teal/Cyan**: Primary brand color, selected states, links
- **Red**: Warnings, scratched athletes, rejected items
- **Green**: Success, approved, checked-in
- **Yellow/Gold**: PB indicators, warnings
- **Gray**: Disabled, inactive states

### Common UI Elements
- **Dropdown selects**: Country, Gender, Age group, Stage, Status
- **Checkboxes**: Multi-select options, filters
- **Radio buttons**: Single select options
- **Toggle switches**: Enable/disable features
- **Date pickers**: Calendar popup for date selection
- **Search inputs**: With clear (X) button
- **Filter chips**: Toggle column visibility
- **Expandable sections**: Collapsible panels with arrow indicators
- **Modals**: Overlay dialogs for forms and details
- **Slide-out panels**: Chat, filters, details
- **Data tables**: Sortable columns, pagination
- **Cards**: Competition listings with images
- **Badges**: Status indicators (CANCELLED, PB, Q)
- **Avatars**: Circular placeholders for profile photos
- **Country flags**: Small flag icons next to nationality

### Button Styles
- **Primary (Teal)**: Main actions (Save, Create, Approve)
- **Secondary (Outlined)**: Cancel, Close, alternative actions
- **Danger (Red)**: Delete, Reject
- **Link style**: Text-only buttons

### Table Patterns
- Alternating row colors for readability
- Hover states
- Sortable column headers
- Inline editing
- Row selection checkboxes
- Action menus per row

### Form Patterns
- Required field indicators (*)
- Inline validation
- Helper text below fields
- Auto-format options
- Reset/Save button pairs

---

## Key Terminology

| Term | Description |
|------|-------------|
| BIB | Athlete's race number |
| PB | Personal Best |
| SB | Season Best |
| SR | Seeding Result |
| DNS | Did Not Start |
| DNF | Did Not Finish |
| DQ | Disqualified |
| Q | Qualified (by place) |
| qJ | Qualified by time/jumping |
| Adv. | Advanced to next round |
| OOC | Out of Competition |
| Heat | Preliminary round |
| Final | Championship round |

---

*Document generated from Roster Athletics support documentation and UI screenshots.*
*Last updated: November 2024*
