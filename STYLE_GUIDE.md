# MiniMeet - Complete Design System & Style Guide

> A comprehensive design system for the MiniMeet athletics event and spectator platform.
> Covers Web (Next.js), Mobile (React Native/Expo), and shared components.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing System](#4-spacing-system)
5. [Border Radius](#5-border-radius)
6. [Shadows & Elevation](#6-shadows--elevation)
7. [Components](#7-components)
8. [Icons](#8-icons)
9. [Animation & Motion](#9-animation--motion)
10. [Responsive Design](#10-responsive-design)
11. [Dark Mode](#11-dark-mode)
12. [Platform-Specific Guidelines](#12-platform-specific-guidelines)
13. [CSS Variables Reference](#13-css-variables-reference)
14. [Tailwind Configuration](#14-tailwind-configuration)

---

## 1. Design Philosophy

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Performance First** | Fast load times, smooth animations, instant feedback for real-time results |
| **Clarity** | Clear visual hierarchy - spectators need to scan results quickly |
| **Trust** | Professional appearance for organizers and officials |
| **Energy** | Dynamic feel that captures the excitement of athletics |
| **Accessibility** | WCAG 2.1 AA compliant, high contrast for outdoor viewing |

### Design Guidelines

1. **Clean and Athletic** - Modern, energetic yet professional
2. **High Contrast** - Readable on phones in bright outdoor conditions
3. **Data-Dense but Clear** - Results tables must be scannable
4. **Consistent Across Platforms** - Same visual language on web and mobile
5. **Motion with Purpose** - Animations enhance UX, not distract
6. **No Unnecessary Emojis** - Keep UI professional
7. **Natural Capitalization** - Avoid ALL CAPS except labels/badges

---

## 2. Color System

### Primary Brand Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Primary** | `#1E3A5F` | rgb(30, 58, 95) | Main brand, headers, primary buttons |
| **Primary Light** | `#2C5282` | rgb(44, 82, 130) | Hover states, links |
| **Primary Dark** | `#152A45` | rgb(21, 42, 69) | Dark accents, gradients |
| **Primary Muted** | `#E8EDF4` | rgb(232, 237, 244) | Light backgrounds, subtle highlights |

### Accent Colors (Athletics/Energy)

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Accent** | `#FF6B35` | rgb(255, 107, 53) | CTAs, highlights, live indicators |
| **Accent Light** | `#FF8F66` | rgb(255, 143, 102) | Hover states |
| **Accent Dark** | `#E55A2B` | rgb(229, 90, 43) | Active states |

### Background Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Background** | `#FFFFFF` | Main page background |
| **Background Secondary** | `#F7F9FC` | Section backgrounds, cards |
| **Background Tertiary** | `#EDF2F7` | Alternating rows, subtle sections |
| **Background Dark** | `#1A202C` | Dark mode primary |

### Text Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Text Primary** | `#1A202C` | Headings, primary text |
| **Text Secondary** | `#4A5568` | Body text, descriptions |
| **Text Muted** | `#718096` | Captions, helper text, timestamps |
| **Text Inverse** | `#FFFFFF` | Text on dark/primary backgrounds |

### Semantic/Status Colors

| Name | Hex | Light BG | Usage |
|------|-----|----------|-------|
| **Success** | `#22C55E` | `#DCFCE7` | Personal bests, records, completed |
| **Warning** | `#F59E0B` | `#FEF3C7` | Warnings, pending, wind-assisted |
| **Error** | `#EF4444` | `#FEE2E2` | Errors, DQ, DNS, DNF |
| **Info** | `#3B82F6` | `#DBEAFE` | Information, current event |
| **Live** | `#EF4444` | `#FEE2E2` | Live event indicator (pulsing) |

### Athletics-Specific Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Gold** | `#FFD700` | 1st place |
| **Silver** | `#C0C0C0` | 2nd place |
| **Bronze** | `#CD7F32` | 3rd place |
| **PB (Personal Best)** | `#22C55E` | Personal best indicator |
| **SB (Season Best)** | `#3B82F6` | Season best indicator |
| **NR (National Record)** | `#9333EA` | National record |
| **WR (World Record)** | `#DC2626` | World record |

### Border Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Border Default** | `#E2E8F0` | Standard borders |
| **Border Light** | `#EDF2F7` | Subtle borders |
| **Border Dark** | `#CBD5E0` | Emphasized borders |
| **Border Focus** | `#1E3A5F` | Focus states |

---

## 3. Typography

### Font Stack

**Primary Font**: Inter (Google Fonts)
- Excellent readability at small sizes
- Great for data-heavy interfaces
- Modern, clean aesthetic

```css
/* Font imports */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* CSS Variables */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', Monaco, monospace; /* For times/results */
```

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text |
| Medium | 500 | Labels, emphasized text |
| Semibold | 600 | Buttons, card titles |
| Bold | 700 | Headings |
| Extrabold | 800 | Hero headlines |

### Font Size Scale

| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| `xs` | 11px | 1.4 | Fine print, timestamps |
| `sm` | 13px | 1.4 | Labels, captions |
| `base` | 15px | 1.5 | Body text |
| `lg` | 17px | 1.5 | Large body, card titles |
| `xl` | 19px | 1.4 | Section subtitles |
| `2xl` | 23px | 1.3 | Section titles |
| `3xl` | 29px | 1.2 | Page headers |
| `4xl` | 35px | 1.2 | Large headers |
| `5xl` | 47px | 1.1 | Hero titles |
| `6xl` | 59px | 1.1 | Display text |

### Typography Presets

**Hero Title**
```css
.hero-title {
  font-family: var(--font-sans);
  font-size: 47px;
  font-weight: 800;
  line-height: 1.1;
  color: #1A202C;
  letter-spacing: -0.02em;
}
```

**Section Title**
```css
.section-title {
  font-family: var(--font-sans);
  font-size: 29px;
  font-weight: 700;
  line-height: 1.2;
  color: #1A202C;
}
```

**Card Title**
```css
.card-title {
  font-family: var(--font-sans);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  color: #1A202C;
}
```

**Body Text**
```css
.body {
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5;
  color: #4A5568;
}
```

**Results/Times (Monospace)**
```css
.result-time {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: #1A202C;
  font-variant-numeric: tabular-nums;
}
```

**Badge/Label**
```css
.label {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
```

---

## 4. Spacing System

Base unit: **4px**

| Token | Value | Usage |
|-------|-------|-------|
| `0` | 0px | None |
| `0.5` | 2px | Micro adjustments |
| `1` | 4px | Tight spacing |
| `2` | 8px | Small gaps, icon padding |
| `3` | 12px | Medium gaps |
| `4` | 16px | Standard padding |
| `5` | 20px | Card padding |
| `6` | 24px | Section gaps |
| `8` | 32px | Large gaps |
| `10` | 40px | Section margins |
| `12` | 48px | Major sections |
| `16` | 64px | Page sections |
| `20` | 80px | Hero spacing |
| `24` | 96px | Large hero spacing |

### Common Spacing Patterns

```css
/* Card padding */
.card { padding: 20px; }              /* --space-5 */

/* Section spacing */
.section { padding: 48px 0; }         /* --space-12 */

/* Button padding */
.btn { padding: 12px 20px; }          /* --space-3 / --space-5 */

/* Input padding */
.input { padding: 12px 16px; }        /* --space-3 / --space-4 */

/* Gap between items */
.stack { gap: 16px; }                 /* --space-4 */
```

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `none` | 0px | Square corners |
| `sm` | 4px | Small elements, tags |
| `base` | 6px | Inputs, small cards |
| `md` | 8px | Buttons, standard cards |
| `lg` | 12px | Large cards, modals |
| `xl` | 16px | Feature cards |
| `2xl` | 20px | Prominent elements |
| `3xl` | 24px | Large containers |
| `full` | 9999px | Pills, avatars, circular |

### Usage Guidelines

| Element | Radius |
|---------|--------|
| Buttons | `md` (8px) |
| Cards | `lg` (12px) |
| Inputs | `base` (6px) |
| Badges/Tags | `full` (pill) |
| Avatars | `full` (circular) |
| Modals | `xl` (16px) |
| Tooltips | `md` (8px) |

---

## 6. Shadows & Elevation

Shadows use a blue-tinted shadow color for cohesion.

### Shadow Scale

| Level | CSS | Usage |
|-------|-----|-------|
| **xs** | `0 1px 2px rgba(30, 58, 95, 0.04)` | Subtle lift |
| **sm** | `0 2px 4px rgba(30, 58, 95, 0.06)` | Buttons, inputs |
| **base** | `0 4px 8px rgba(30, 58, 95, 0.08)` | Cards |
| **md** | `0 6px 16px rgba(30, 58, 95, 0.10)` | Dropdowns, elevated cards |
| **lg** | `0 12px 24px rgba(30, 58, 95, 0.12)` | Modals, popovers |
| **xl** | `0 20px 40px rgba(30, 58, 95, 0.14)` | Large modals |

### Ring/Focus Shadows

```css
/* Focus ring for accessibility */
.focus-ring {
  box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.2);
}

/* Accent focus ring */
.focus-ring-accent {
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.3);
}
```

### Elevation System

| Level | Shadow | Z-Index | Usage |
|-------|--------|---------|-------|
| 0 | none | auto | Base layer |
| 1 | xs | 10 | Slightly raised |
| 2 | sm | 20 | Buttons, inputs |
| 3 | base | 30 | Cards |
| 4 | md | 40 | Dropdowns |
| 5 | lg | 50 | Modals, dialogs |
| 6 | xl | 60 | Toasts, notifications |

---

## 7. Components

### Buttons

#### Primary Button
```css
.btn-primary {
  background: linear-gradient(135deg, #1E3A5F 0%, #2C5282 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  padding: 12px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 4px rgba(30, 58, 95, 0.15);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2C5282 0%, #3D6BA8 100%);
  box-shadow: 0 4px 12px rgba(30, 58, 95, 0.2);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}
```

#### Accent Button
```css
.btn-accent {
  background: linear-gradient(135deg, #FF6B35 0%, #FF8F66 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  padding: 12px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-accent:hover {
  background: linear-gradient(135deg, #E55A2B 0%, #FF6B35 100%);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}
```

#### Secondary Button
```css
.btn-secondary {
  background-color: #F7F9FC;
  color: #1E3A5F;
  font-size: 15px;
  font-weight: 600;
  padding: 12px 20px;
  border-radius: 8px;
  border: 1px solid #E2E8F0;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background-color: #EDF2F7;
  border-color: #CBD5E0;
}
```

#### Ghost Button
```css
.btn-ghost {
  background: transparent;
  color: #1E3A5F;
  font-size: 15px;
  font-weight: 500;
  padding: 12px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-ghost:hover {
  background-color: rgba(30, 58, 95, 0.05);
}
```

#### Button Sizes

| Size | Padding | Font Size |
|------|---------|-----------|
| `sm` | 8px 12px | 13px |
| `base` | 12px 20px | 15px |
| `lg` | 16px 28px | 17px |

### Cards

#### Standard Card
```css
.card {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(30, 58, 95, 0.08);
  border: 1px solid #EDF2F7;
}
```

#### Interactive Card
```css
.card-interactive {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(30, 58, 95, 0.08);
  border: 1px solid #EDF2F7;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-interactive:hover {
  box-shadow: 0 6px 16px rgba(30, 58, 95, 0.12);
  transform: translateY(-2px);
  border-color: #CBD5E0;
}
```

#### Live Event Card
```css
.card-live {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(30, 58, 95, 0.08);
  border: 2px solid #EF4444;
  position: relative;
}

.card-live::before {
  content: '';
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  background-color: #EF4444;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}
```

### Form Inputs

```css
.input {
  background-color: #ffffff;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 15px;
  font-family: var(--font-sans);
  color: #1A202C;
  width: 100%;
  transition: all 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: #1E3A5F;
  box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
}

.input::placeholder {
  color: #A0AEC0;
}

.input:disabled {
  background-color: #F7F9FC;
  cursor: not-allowed;
}

.input-error {
  border-color: #EF4444;
}

.input-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

### Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.badge-primary {
  background-color: #E8EDF4;
  color: #1E3A5F;
}

.badge-live {
  background-color: #FEE2E2;
  color: #DC2626;
}

.badge-success {
  background-color: #DCFCE7;
  color: #16A34A;
}

.badge-pb {
  background-color: #DCFCE7;
  color: #16A34A;
}

.badge-sb {
  background-color: #DBEAFE;
  color: #2563EB;
}

.badge-gold {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #1A202C;
}
```

### Results Table

```css
.results-table {
  width: 100%;
  border-collapse: collapse;
}

.results-table th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #718096;
  text-align: left;
  padding: 12px 16px;
  border-bottom: 2px solid #E2E8F0;
}

.results-table td {
  font-size: 15px;
  padding: 16px;
  border-bottom: 1px solid #EDF2F7;
  vertical-align: middle;
}

.results-table tr:hover {
  background-color: #F7F9FC;
}

/* Place column */
.results-table .place {
  font-weight: 700;
  width: 48px;
  text-align: center;
}

/* Athlete name */
.results-table .athlete {
  font-weight: 500;
}

/* Time/Result */
.results-table .result {
  font-family: var(--font-mono);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
```

---

## 8. Icons

### Recommended Icon Library

**Lucide Icons** - Clean, consistent, tree-shakeable

```bash
# Installation
npm install lucide-react        # React/Next.js
npm install lucide-react-native # React Native
```

### Icon Sizes

| Size | Pixels | Usage |
|------|--------|-------|
| `xs` | 14px | Inline text |
| `sm` | 16px | Small buttons, badges |
| `md` | 20px | Default UI |
| `lg` | 24px | Cards, navigation |
| `xl` | 32px | Features, empty states |
| `2xl` | 48px | Hero sections |

### Common Icons for MiniMeet

**Navigation**
- `Home`, `Search`, `Menu`, `X`, `ChevronLeft`, `ChevronRight`

**Actions**
- `Plus`, `Edit`, `Trash2`, `Download`, `Share2`, `ExternalLink`

**Status**
- `Check`, `CheckCircle`, `AlertCircle`, `Info`, `Clock`

**Athletics**
- `Trophy`, `Medal`, `Timer`, `TrendingUp`, `BarChart2`, `Users`
- `MapPin`, `Calendar`, `Flag`, `Zap` (for live)

**Social**
- `User`, `Heart`, `MessageCircle`, `Share`

### Icon Colors

```css
.icon { color: #4A5568; }           /* Default */
.icon-primary { color: #1E3A5F; }   /* Primary actions */
.icon-muted { color: #A0AEC0; }     /* Disabled/muted */
.icon-success { color: #22C55E; }   /* Success */
.icon-error { color: #EF4444; }     /* Error */
.icon-inverse { color: #ffffff; }   /* On dark bg */
```

---

## 9. Animation & Motion

### Timing Functions

| Name | Value | Usage |
|------|-------|-------|
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | General transitions |
| `spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Bouncy effects |

### Duration Scale

| Speed | Duration | Usage |
|-------|----------|-------|
| `instant` | 0ms | Immediate feedback |
| `fast` | 100ms | Micro-interactions |
| `normal` | 150ms | Standard transitions |
| `moderate` | 200ms | Page elements |
| `slow` | 300ms | Page transitions |
| `slower` | 500ms | Complex animations |

### Common Animations

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scale in */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Live pulse */
@keyframes livePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Skeleton loading */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, #EDF2F7 25%, #F7F9FC 50%, #EDF2F7 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## 10. Responsive Design

### Breakpoints

| Name | Width | Description |
|------|-------|-------------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Container Widths

```css
.container {
  width: 100%;
  margin: 0 auto;
  padding: 0 16px;
}

@media (min-width: 640px) { .container { max-width: 640px; padding: 0 24px; } }
@media (min-width: 768px) { .container { max-width: 768px; } }
@media (min-width: 1024px) { .container { max-width: 1024px; padding: 0 32px; } }
@media (min-width: 1280px) { .container { max-width: 1200px; } }
```

### Mobile-First Patterns

```css
/* Stack on mobile, row on desktop */
.flex-responsive {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 768px) {
  .flex-responsive {
    flex-direction: row;
  }
}
```

---

## 11. Dark Mode

### Dark Mode Colors

| Token | Light | Dark |
|-------|-------|------|
| `bg` | `#FFFFFF` | `#0F172A` |
| `bg-secondary` | `#F7F9FC` | `#1E293B` |
| `bg-tertiary` | `#EDF2F7` | `#334155` |
| `text-primary` | `#1A202C` | `#F1F5F9` |
| `text-secondary` | `#4A5568` | `#CBD5E1` |
| `text-muted` | `#718096` | `#94A3B8` |
| `border` | `#E2E8F0` | `#334155` |
| `card` | `#FFFFFF` | `#1E293B` |

### Implementation

```css
/* CSS Variables with dark mode */
:root {
  --color-bg: #FFFFFF;
  --color-text: #1A202C;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0F172A;
    --color-text: #F1F5F9;
  }
}

/* Or with class toggle */
.dark {
  --color-bg: #0F172A;
  --color-text: #F1F5F9;
}
```

---

## 12. Platform-Specific Guidelines

### React Native (Expo)

```typescript
// theme.ts
export const theme = {
  colors: {
    primary: '#1E3A5F',
    accent: '#FF6B35',
    background: '#FFFFFF',
    text: '#1A202C',
    // ... etc
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
  },
  borderRadius: {
    sm: 4,
    base: 6,
    md: 8,
    lg: 12,
    full: 9999,
  },
  typography: {
    fontFamily: {
      regular: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semibold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
    },
  },
};
```

### Next.js / Web

Use Tailwind CSS with custom configuration (see section 14).

---

## 13. CSS Variables Reference

```css
:root {
  /* ===== Colors ===== */
  /* Primary */
  --color-primary: #1E3A5F;
  --color-primary-light: #2C5282;
  --color-primary-dark: #152A45;
  --color-primary-muted: #E8EDF4;

  /* Accent */
  --color-accent: #FF6B35;
  --color-accent-light: #FF8F66;
  --color-accent-dark: #E55A2B;

  /* Background */
  --color-bg: #FFFFFF;
  --color-bg-secondary: #F7F9FC;
  --color-bg-tertiary: #EDF2F7;

  /* Text */
  --color-text: #1A202C;
  --color-text-secondary: #4A5568;
  --color-text-muted: #718096;
  --color-text-inverse: #FFFFFF;

  /* Status */
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;
  --color-live: #EF4444;

  /* Borders */
  --color-border: #E2E8F0;
  --color-border-light: #EDF2F7;
  --color-border-dark: #CBD5E0;

  /* ===== Typography ===== */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Monaco, monospace;

  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-lg: 17px;
  --text-xl: 19px;
  --text-2xl: 23px;
  --text-3xl: 29px;
  --text-4xl: 35px;
  --text-5xl: 47px;

  /* ===== Spacing ===== */
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  /* ===== Border Radius ===== */
  --radius-none: 0px;
  --radius-sm: 4px;
  --radius-base: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-full: 9999px;

  /* ===== Shadows ===== */
  --shadow-xs: 0 1px 2px rgba(30, 58, 95, 0.04);
  --shadow-sm: 0 2px 4px rgba(30, 58, 95, 0.06);
  --shadow-base: 0 4px 8px rgba(30, 58, 95, 0.08);
  --shadow-md: 0 6px 16px rgba(30, 58, 95, 0.10);
  --shadow-lg: 0 12px 24px rgba(30, 58, 95, 0.12);
  --shadow-xl: 0 20px 40px rgba(30, 58, 95, 0.14);

  /* ===== Transitions ===== */
  --transition-fast: 100ms ease;
  --transition-normal: 150ms ease;
  --transition-moderate: 200ms ease;
  --transition-slow: 300ms ease;
}
```

---

## 14. Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A5F',
          light: '#2C5282',
          dark: '#152A45',
          muted: '#E8EDF4',
        },
        accent: {
          DEFAULT: '#FF6B35',
          light: '#FF8F66',
          dark: '#E55A2B',
        },
        background: {
          DEFAULT: '#FFFFFF',
          secondary: '#F7F9FC',
          tertiary: '#EDF2F7',
        },
        live: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.4' }],
        base: ['15px', { lineHeight: '1.5' }],
        lg: ['17px', { lineHeight: '1.5' }],
        xl: ['19px', { lineHeight: '1.4' }],
        '2xl': ['23px', { lineHeight: '1.3' }],
        '3xl': ['29px', { lineHeight: '1.2' }],
        '4xl': ['35px', { lineHeight: '1.2' }],
        '5xl': ['47px', { lineHeight: '1.1' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(30, 58, 95, 0.04)',
        sm: '0 2px 4px rgba(30, 58, 95, 0.06)',
        DEFAULT: '0 4px 8px rgba(30, 58, 95, 0.08)',
        md: '0 6px 16px rgba(30, 58, 95, 0.10)',
        lg: '0 12px 24px rgba(30, 58, 95, 0.12)',
        xl: '0 20px 40px rgba(30, 58, 95, 0.14)',
      },
      animation: {
        'pulse-live': 'pulse-live 2s infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
```

---

## Quick Reference Card

| Element | Value |
|---------|-------|
| **Primary Color** | `#1E3A5F` |
| **Accent Color** | `#FF6B35` |
| **Font** | Inter |
| **Base Font Size** | 15px |
| **Base Spacing** | 16px |
| **Card Radius** | 12px |
| **Button Radius** | 8px |
| **Card Shadow** | `0 4px 8px rgba(30, 58, 95, 0.08)` |
| **Transition** | 150ms ease |

---

*MiniMeet Design System v1.0*
*Last updated: November 2024*
