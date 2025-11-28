# MiniMeet - Athletics Rules & Symbols Reference

> Official World Athletics rules, symbols, and abbreviations for implementing results management.
> Based on World Athletics Technical Rules and Competition Rules.

---

## Table of Contents

1. [Universal Symbols & Abbreviations](#1-universal-symbols--abbreviations)
2. [Vertical Jumps (High Jump & Pole Vault)](#2-vertical-jumps-high-jump--pole-vault)
3. [Horizontal Jumps (Long Jump & Triple Jump)](#3-horizontal-jumps-long-jump--triple-jump)
4. [Throwing Events](#4-throwing-events)
5. [Track Events](#5-track-events)
6. [Combined Events](#6-combined-events)
7. [Records & Performance Indicators](#7-records--performance-indicators)
8. [Wind Rules](#8-wind-rules)
9. [Tie-Breaking Rules](#9-tie-breaking-rules)
10. [Time Limits](#10-time-limits)
11. [Implementation Guide](#11-implementation-guide)

---

## 1. Universal Symbols & Abbreviations

### Attempt/Trial Symbols

| Symbol | Name | Description | Events |
|--------|------|-------------|--------|
| `o` | Clear/Valid | Successful clearance | High Jump, Pole Vault |
| `x` | Miss/Foul | Failed attempt | All field events |
| `-` | Pass | Athlete chose to skip | High Jump, Pole Vault |
| `r` | Retired | Withdrew from competition | All field events |

### Competition Status Codes

| Code | Full Name | Description |
|------|-----------|-------------|
| `DNS` | Did Not Start | Athlete did not begin the event |
| `DNF` | Did Not Finish | Athlete started but did not complete (track/road) |
| `DQ` | Disqualified | Rule violation (include rule number: `DQ TR16.8`) |
| `NM` | No Mark | No valid trial recorded (field events) |
| `NH` | No Height | No successful clearance (vertical jumps) |
| `ND` | No Distance | No valid throw/jump (horizontal/throws) |
| `SCR` | Scratched | Withdrew before competition |
| `FS` | False Start | Disqualified for false start |

### Qualification Symbols

| Symbol | Meaning | Usage |
|--------|---------|-------|
| `Q` | Qualified by place | Advanced based on finishing position |
| `q` | Qualified by time/mark | Advanced as fastest loser or by standard |
| `qR` | Advanced by Referee | Referee decision (e.g., interference) |
| `qJ` | Advanced by Jury | Jury of Appeal decision |

### Timing Notations

| Symbol | Meaning | Example |
|--------|---------|---------|
| `a` | Automatic timing (FAT) | `10.23a` |
| `h` | Hand timing | `10.4h` |
| `c` | Converted time | `10.44c` (hand + 0.24) |
| `w` | Wind-assisted | `10.12w` (wind > +2.0 m/s) |

---

## 2. Vertical Jumps (High Jump & Pole Vault)

### Attempt Recording

```
Height:   1.80  1.85  1.90  1.95  2.00  2.05
Athlete:   o    xo    o     xxo   xxx
Result: 1.95m (3 total misses)
```

| Symbol | Meaning | What Happens Next |
|--------|---------|-------------------|
| `o` | Cleared | Advances to next height, miss counter continues |
| `x` | Failed | Stays at height, back in queue (max 3 consecutive) |
| `xx` | Two failures | One more attempt at this height |
| `xxx` | Three failures | **Eliminated** - best height is final result |
| `-` | Pass | Skips to next height, keeps accumulated misses |
| `r` | Retired | Competition over for athlete |

### Height Progression Rules

**Standard Increments:**
- High Jump: Typically 3-5 cm increments
- Pole Vault: Typically 5-10 cm increments
- Jump-off (tie-breaker): 2 cm (HJ) or 5 cm (PV)

**Minimum Increments (cannot be smaller):**
- High Jump: 2 cm
- Pole Vault: 5 cm

**Starting Height:**
- Set by organizer based on entry standards
- Athletes may enter at any height at or above starting height
- Late entry = starts with accumulated passes

### Passing Strategy

Athletes can pass any height, but:
- Accumulated misses carry forward
- Example: `x` at 1.90, pass to 1.95, then `xx` at 1.95 = eliminated (3 consecutive misses)

```
Height:   1.85  1.90  1.95  Result
Pass example:
Athlete A:  o    -     o    1.95m (0 misses)
Athlete B:  o    x     -xx  1.85m (3 consecutive misses across heights)
```

### Pole Vault Specific

**Standards Position:**
- Athlete can request horizontal position of uprights
- Measured from back of box
- Must declare before each attempt
- Range: 0 to 80 cm from back of box

**Valid Attempt:**
- Bar must not be dislodged
- Athlete must not move hand higher on pole after leaving ground
- Pole may bend/touch bar without fault (if bar stays)

**Broken Pole:**
- Equipment failure = new attempt awarded
- Not counted as a miss

### Data Model for Vertical Jumps

```typescript
interface VerticalJumpResult {
  athleteId: string;
  eventId: string;
  attempts: VerticalAttempt[];
  bestHeight: number | null;  // in meters, e.g., 1.95
  totalMisses: number;
  place: number | null;
  status: 'active' | 'eliminated' | 'retired' | 'NH';
}

interface VerticalAttempt {
  height: number;           // e.g., 1.95
  attemptNumber: 1 | 2 | 3; // which attempt at this height
  result: 'o' | 'x' | '-' | 'r';
  standardsPosition?: number; // pole vault only, in cm
}

// Display format for results
// "1.80o 1.85xo 1.90o 1.95xxo 2.00xxx" → Result: 1.95m
```

---

## 3. Horizontal Jumps (Long Jump & Triple Jump)

### Attempt Recording

Each athlete gets:
- **Preliminary rounds**: 3 attempts
- **Final rounds**: 3 additional attempts (top 8 advance)
- Total: Up to 6 attempts

| Symbol | Meaning | Recorded Distance |
|--------|---------|-------------------|
| Valid mark | `8.12` | Distance in meters |
| `x` | Foul | No distance recorded |
| `-` | Pass | Chose not to attempt |
| `r` | Retired | Withdrew from competition |

### Foul Conditions

**Long Jump Fouls:**
1. Foot crosses vertical plane of take-off line (foul line)
2. Takes off from outside the board (either end)
3. Touches ground beyond take-off line before jumping
4. Walks back through pit after landing
5. Somersaults during approach or landing
6. Exceeds time limit

**Triple Jump Additional Fouls:**
1. Wrong foot sequence (must be: hop → step → jump)
   - Hop: Take off and land on SAME foot
   - Step: Land on OTHER foot
   - Jump: Final landing in pit
2. "Sleeping leg" touching ground (scrape) is NOT a foul (rule changed mid-1980s)

### Wind Reading

- Wind gauge activated when athlete passes marked point
- Measured for 5 seconds (long jump) or until landing
- Wind reading displayed with each valid attempt
- `w` suffix if wind > +2.0 m/s

```typescript
interface HorizontalJumpAttempt {
  attemptNumber: 1 | 2 | 3 | 4 | 5 | 6;
  result: number | 'x' | '-' | 'r';  // distance in meters or status
  wind: number | null;               // e.g., 1.2 or -0.3
  isWindLegal: boolean;              // wind <= 2.0 m/s
  isFoul: boolean;
}

interface HorizontalJumpResult {
  athleteId: string;
  attempts: HorizontalJumpAttempt[];
  bestMark: number | null;
  bestLegalMark: number | null;  // for records, wind <= 2.0
  bestMarkWind: number | null;
  place: number | null;
  status: 'competing' | 'NM' | 'retired';
}
```

### Display Format

```
Athlete    1      2      3      4      5      6     Best
Smith    7.89   x    8.12w   8.05   x    8.21    8.21
         +1.2        +2.4   +0.8        +1.1
Jones    x      7.95   8.01   -     8.15   x      8.15
               +0.3   +1.5         +0.9
```

### 2025 Rule Change (Test Phase)

- New 40 cm take-off zone instead of traditional board
- Aims to reduce ~30% foul rate
- Distance measured from actual take-off point
- May affect how app records/displays results

---

## 4. Throwing Events

### Events & Equipment

| Event | Circle Diameter | Sector Angle | Implement Weight (Senior) |
|-------|-----------------|--------------|---------------------------|
| Shot Put | 2.135m (7 ft) | 34.92° | M: 7.26 kg, W: 4 kg |
| Discus | 2.50m (8 ft 2.5 in) | 34.92° | M: 2 kg, W: 1 kg |
| Hammer | 2.135m (7 ft) | 34.92° | M: 7.26 kg, W: 4 kg |
| Javelin | Runway + Arc | 28.96° | M: 800g, W: 600g |

### Attempt Recording

Same as horizontal jumps:
- 3 attempts in preliminary round
- 3 more for top 8 in final
- Best valid throw counts

| Symbol | Meaning |
|--------|---------|
| `XX.XX` | Valid throw (meters) |
| `x` | Foul |
| `-` | Pass |
| `r` | Retired |

### Foul Conditions

**All Throwing Events:**
1. Implement lands on or outside sector lines
2. Athlete leaves circle/runway before implement lands
3. Athlete exits from front half of circle (must exit rear)
4. Exceeds time limit

**Shot Put Specific:**
- Shot must be put from shoulder with one hand
- Shot must not drop behind or below shoulder
- Cannot touch top of toeboard

**Discus Specific:**
- Cannot touch top of rim
- Must be released within circle

**Hammer Specific:**
- Head can start inside or outside circle
- If hammer breaks during throw = new attempt
- Incidental touch of rear circle allowed in first rotation

**Javelin Specific:**
- Must be thrown overarm, over shoulder
- Cannot rotate body 360° during approach
- Must grip at cord grip
- Tip must strike ground before any other part

### Sector Rules

```
         34.92°
          /\
         /  \
        /    \
       /      \
      /   ●    \   ← Circle center
     /          \
    /____________\

Sector lines are FOUL if implement touches them.
Inside sector = VALID
```

### Data Model for Throws

```typescript
interface ThrowAttempt {
  attemptNumber: 1 | 2 | 3 | 4 | 5 | 6;
  result: number | 'x' | '-' | 'r';  // distance in meters
  isFoul: boolean;
}

interface ThrowResult {
  athleteId: string;
  attempts: ThrowAttempt[];
  bestMark: number | null;
  place: number | null;
  status: 'competing' | 'NM' | 'retired';
}
```

---

## 5. Track Events

### Event Categories

| Category | Events | Timing Precision |
|----------|--------|------------------|
| Sprints | 60m, 100m, 200m | 0.001s (FAT) |
| Hurdles | 60mH, 100mH, 110mH, 400mH | 0.001s (FAT) |
| Middle Distance | 400m, 800m, 1500m | 0.01s or 0.001s |
| Long Distance | 3000m, 5000m, 10000m | 0.01s |
| Steeplechase | 2000mSC, 3000mSC | 0.01s |
| Relays | 4x100m, 4x400m | 0.01s |

### Result Recording

```typescript
interface TrackResult {
  athleteId: string;
  eventId: string;
  time: number;              // in seconds, e.g., 10.234
  place: number | null;
  lane: number;
  reactionTime: number | null;  // e.g., 0.142
  splits: number[];          // for longer races
  wind: number | null;       // sprints/hurdles up to 200m
  isWindLegal: boolean;
  status: 'finished' | 'DNS' | 'DNF' | 'DQ' | 'FS';
  dqRule?: string;           // e.g., "TR16.8"
}
```

### False Start Rules

- **One false start allowed per race** (not per athlete)
- Second false start = DQ for responsible athlete
- Reaction time < 0.100s = false start (human cannot react faster)

### Lane Assignments

| Event | Lane Usage |
|-------|------------|
| 100m, 100mH, 110mH | Stay in lane entire race |
| 200m | Stay in lane entire race |
| 400m | Stay in lane entire race |
| 800m | Stay in lane first curve (break line) |
| 4x100m | Stay in lane + exchange zones |
| 4x400m | First leg in lanes, break after first curve |

### Relay Exchange Zones

- Zone length: 30m (20m for 4x400m)
- Baton must be exchanged within zone
- Outgoing runner may start 10m before zone

---

## 6. Combined Events

### Events

| Combined Event | Events | Gender |
|----------------|--------|--------|
| Decathlon | 10 events over 2 days | Men |
| Heptathlon | 7 events over 2 days | Women |
| Pentathlon (Indoor) | 5 events in 1 day | Women |
| Indoor Heptathlon | 7 events over 2 days | Men |

### Decathlon Order (Men)

**Day 1:**
1. 100m
2. Long Jump
3. Shot Put
4. High Jump
5. 400m

**Day 2:**
6. 110m Hurdles
7. Discus
8. Pole Vault
9. Javelin
10. 1500m

### Heptathlon Order (Women)

**Day 1:**
1. 100m Hurdles
2. High Jump
3. Shot Put
4. 200m

**Day 2:**
5. Long Jump
6. Javelin
7. 800m

### Scoring

Points calculated using IAAF/World Athletics scoring tables:
- Based on time/distance/height achieved
- Different formulas for track vs field events
- Total points determine placing

```typescript
interface CombinedEventResult {
  athleteId: string;
  events: CombinedEventScore[];
  totalPoints: number;
  place: number | null;
  status: 'competing' | 'DNF' | 'DQ';
}

interface CombinedEventScore {
  eventName: string;
  performance: number | string;  // time or distance
  points: number;
  place: number;  // place in that event
}
```

### DNF Rules for Combined Events

- DNS in any event = overall DNF
- Three consecutive failures in field event = 0 points for that event (can continue)
- DQ in track event = 0 points for that event (can continue)

---

## 7. Records & Performance Indicators

### Record Types

| Abbreviation | Full Name | Scope |
|--------------|-----------|-------|
| `WR` | World Record | Global best |
| `OR` | Olympic Record | Olympic Games |
| `CR` | Championship Record | Specific championship |
| `AR` | Area Record | Continental (e.g., European) |
| `ER` | European Record | Europe |
| `NR` | National Record | Country |
| `MR` | Meet Record | Specific competition |
| `DLR` | Diamond League Record | Diamond League series |
| `WL` | World Lead | Best in current year |

### Performance Indicators

| Abbreviation | Meaning | Usage |
|--------------|---------|-------|
| `PB` | Personal Best | Athlete's all-time best |
| `SB` | Season Best | Best in current season |
| `=PB` | Equals Personal Best | Tied PB |
| `=SB` | Equals Season Best | Tied SB |
| `WL` | World Lead | Best performance globally this year |
| `NL` | National Lead | Best in country this year |

### Display Priority

When displaying, show most significant:
```
WR > OR > CR > AR > NR > MR > PB > SB
```

Example: `10.23 WR` (if it's a world record, don't also show PB/SB)

---

## 8. Wind Rules

### Wind Legal Limits

| Event Type | Max Legal Wind | Measurement Duration |
|------------|----------------|---------------------|
| Sprints (up to 200m) | +2.0 m/s | From start for 10s (100m) or 13s (200m) |
| Long Jump | +2.0 m/s | 5 seconds from passing marker |
| Triple Jump | +2.0 m/s | 5 seconds from passing marker |

### Wind Display

```
Format: +1.2 or -0.3 (positive = tailwind/helping, negative = headwind)

Examples:
100m: 10.23 (+1.8)     ← Legal
100m: 10.12 (+2.4) w   ← Wind-assisted, not record-eligible
LJ:   8.95 (-0.2)      ← Legal (headwind)
```

### Events WITHOUT Wind Recording

- 400m and longer track events
- Shot Put, Discus, Hammer, Javelin
- High Jump, Pole Vault

---

## 9. Tie-Breaking Rules

### Track Events

1. **Same time to 1/1000th**: Declared a tie (same place)
2. **Photo finish**: Visual inspection of finish image
3. **Heats/qualifying**: Both advance, or if positions limited, draw lots or re-run

### Vertical Jumps (High Jump & Pole Vault)

**Tie-break order:**

1. **Fewest misses at final height cleared**
   - A: cleared 2.00 on first attempt (1 miss total at 2.00)
   - B: cleared 2.00 on second attempt (2 misses total at 2.00)
   - **Winner: A**

2. **Fewest total misses** (if still tied)
   - Count all misses throughout competition
   - **Winner: fewer total misses**

3. **Jump-off** (if still tied for 1st place, optional)
   - Single attempt at each height
   - Bar raised 2cm (HJ) or 5cm (PV) if both clear
   - Bar lowered 2cm (HJ) or 5cm (PV) if both fail
   - First to have sole clearance wins
   - **Note**: Since 2009, athletes can agree to share 1st place

```typescript
interface TieBreakData {
  athleteId: string;
  bestHeight: number;
  missesAtBestHeight: number;
  totalMisses: number;
}

function breakVerticalTie(athletes: TieBreakData[]): TieBreakData[] {
  return athletes.sort((a, b) => {
    // First: best height (higher wins)
    if (b.bestHeight !== a.bestHeight) return b.bestHeight - a.bestHeight;
    // Second: fewer misses at best height
    if (a.missesAtBestHeight !== b.missesAtBestHeight) {
      return a.missesAtBestHeight - b.missesAtBestHeight;
    }
    // Third: fewer total misses
    return a.totalMisses - b.totalMisses;
  });
}
```

### Horizontal Jumps & Throws

1. **Second-best mark** compared
2. If still tied, **third-best mark**, etc.
3. If identical across all attempts: **tie stands**

```typescript
function breakHorizontalTie(
  athleteA: number[], // all valid marks
  athleteB: number[]
): number {
  const sortedA = [...athleteA].sort((a, b) => b - a);
  const sortedB = [...athleteB].sort((a, b) => b - a);

  for (let i = 0; i < Math.max(sortedA.length, sortedB.length); i++) {
    const markA = sortedA[i] || 0;
    const markB = sortedB[i] || 0;
    if (markA !== markB) return markB - markA;
  }
  return 0; // True tie
}
```

---

## 10. Time Limits

### Field Events Time Limits

| Situation | Time Allowed |
|-----------|--------------|
| Individual trials (standard) | 1 minute |
| Consecutive trials (same athlete) | 2 minutes |
| High Jump / Pole Vault (2-3 athletes remaining) | 2 minutes |
| High Jump / Pole Vault (1 athlete remaining) | 3 minutes |
| Pole Vault jump-off | 2 minutes |
| Combined events | 2 minutes |

### Warnings

- Yellow flag/card at 15 seconds remaining
- Red flag/card when time expires = foul

### Track Events

- Call room reporting times vary by event
- Must be in blocks/position when "Set" is called

---

## 11. Implementation Guide

### Database Schema Additions

```sql
-- Attempt types enum
CREATE TYPE attempt_result AS ENUM (
  'valid',      -- Successful (o for vertical, distance for others)
  'foul',       -- Failed (x)
  'pass',       -- Skipped (-)
  'retired'     -- Withdrew (r)
);

-- Status codes enum
CREATE TYPE competition_status AS ENUM (
  'DNS',        -- Did not start
  'DNF',        -- Did not finish
  'DQ',         -- Disqualified
  'NM',         -- No mark (field)
  'NH',         -- No height (vertical)
  'ND',         -- No distance (throws/horizontal)
  'FS',         -- False start
  'finished'    -- Completed normally
);

-- Vertical jump attempts
CREATE TABLE vertical_attempts (
  id UUID PRIMARY KEY,
  result_id UUID REFERENCES results(id),
  height DECIMAL(4,2) NOT NULL,        -- e.g., 2.05
  attempt_number SMALLINT NOT NULL,    -- 1, 2, or 3
  outcome attempt_result NOT NULL,
  standards_position SMALLINT,         -- Pole vault only, in cm
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field event attempts (horizontal/throws)
CREATE TABLE field_attempts (
  id UUID PRIMARY KEY,
  result_id UUID REFERENCES results(id),
  attempt_number SMALLINT NOT NULL,    -- 1-6
  distance DECIMAL(5,2),               -- NULL if foul
  wind DECIMAL(3,1),                   -- NULL for throws
  is_foul BOOLEAN DEFAULT FALSE,
  is_pass BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### UI Display Components

```typescript
// Vertical jump display
interface VerticalAttemptDisplay {
  height: string;      // "2.05"
  attempts: string;    // "xo" or "xxo" or "xxx" or "-"
}

function formatVerticalAttempts(attempts: VerticalAttempt[]): string {
  const byHeight = groupBy(attempts, 'height');
  return Object.entries(byHeight)
    .map(([height, atts]) => {
      const symbols = atts.map(a => {
        switch(a.result) {
          case 'o': return 'o';
          case 'x': return 'x';
          case '-': return '-';
          case 'r': return 'r';
        }
      }).join('');
      return `${height}:${symbols}`;
    })
    .join(' ');
}

// Result: "1.90:o 1.95:xo 2.00:xxo 2.05:xxx"
```

### Validation Rules

```typescript
// Vertical jumps
const verticalRules = {
  maxConsecutiveMisses: 3,
  minHeightIncrement: { highJump: 0.02, poleVault: 0.05 },
  jumpOffIncrement: { highJump: 0.02, poleVault: 0.05 },
};

// Validate attempt sequence
function validateVerticalAttempt(
  existingAttempts: VerticalAttempt[],
  newAttempt: VerticalAttempt
): boolean {
  const missCount = countConsecutiveMisses(existingAttempts);
  if (missCount >= 3) return false; // Already eliminated

  const lastHeight = getLastHeight(existingAttempts);
  if (newAttempt.height < lastHeight) return false; // Can't go back

  return true;
}

// Wind legal check
function isWindLegal(wind: number): boolean {
  return wind <= 2.0;
}
```

### Real-time Update Events

```typescript
// Events to broadcast
type FieldEventUpdate =
  | { type: 'attempt_recorded'; athleteId: string; attempt: Attempt }
  | { type: 'height_changed'; newHeight: number }
  | { type: 'athlete_eliminated'; athleteId: string; finalHeight: number }
  | { type: 'athlete_retired'; athleteId: string }
  | { type: 'event_complete'; results: FinalResults };

// Subscribe to vertical jump updates
supabase
  .channel('high-jump-results')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'vertical_attempts',
    filter: `event_id=eq.${eventId}`
  }, handleAttemptUpdate)
  .subscribe();
```

---

## Quick Reference Card

### Vertical Jumps (HJ/PV)
```
o = Clear    x = Miss    - = Pass    r = Retired
xxx = Eliminated (3 consecutive misses)
```

### Horizontal Jumps & Throws
```
8.12 = Valid mark    x = Foul    - = Pass    r = Retired
```

### Status Codes
```
DNS = Did Not Start       DNF = Did Not Finish
DQ  = Disqualified        NM  = No Mark
NH  = No Height           ND  = No Distance
FS  = False Start         SCR = Scratched
```

### Records
```
WR = World Record         NR = National Record
PB = Personal Best        SB = Season Best
```

### Wind
```
Legal: ≤ +2.0 m/s
Format: +1.2 (tailwind) or -0.3 (headwind)
w = wind-assisted (> +2.0)
```

---

*MiniMeet Athletics Rules Reference v1.0*
*Based on World Athletics Technical Rules 2024-2025*
