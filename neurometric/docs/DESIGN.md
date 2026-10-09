---
name: Cognitive Metrics
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424754'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac2'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2170e4'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#525e7d'
  on-secondary: '#ffffff'
  secondary-container: '#cdd9fe'
  on-secondary-container: '#525f7e'
  tertiary: '#523fe0'
  on-tertiary: '#ffffff'
  tertiary-container: '#6c5bfa'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#b9c6ea'
  on-secondary-fixed: '#0d1b36'
  on-secondary-fixed-variant: '#3a4664'
  tertiary-fixed: '#e4dfff'
  tertiary-fixed-dim: '#c5c0ff'
  on-tertiary-fixed: '#150067'
  on-tertiary-fixed-variant: '#3c1fcb'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-lg:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.025em
  label-md:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes an institutional, scientific, and technologically refined environment tailored for cognitive assessments, psychometric diagnostics, and high-precision IQ evaluations. It addresses clinical researchers, academic institutions, and test participants who demand rigorous scientific validity paired with minimal cognitive load.

The interface adheres to a clinical, high-clarity minimalist aesthetic combined with modern enterprise technology cues. Every layout decision reduces extraneous visual noise, directing cognitive focus exclusively toward test items, psychometric prompts, and analytical score distribution models. The visual tone eliminates gamified tropes, maintaining an authoritative, trustworthy, and precise aura through crisp typography, measured whitespace, and clinical contrast.

## Colors

The palette balances clinical precision and technological sophistication:

- **Primary (`#3B82F6`)**: Applied to primary operational targets, active testing selections, focus indicators, and confirmation states.
- **Secondary (`#14213D`)**: The bedrock of typographic authority, structural framing, high-contrast text, and institutional branding surfaces.
- **Tertiary (`#6D5DFB`)**: Represents analytical intelligence, specialized psychometric indicators, percentiles, and complex data visualizations.
- **Neutral Surface & Background (`#F8FAFC` & `#F1F5F9`)**: Soft slate-ice backgrounds that mitigate glare and eye strain during extended testing sessions. Pure white (`#FFFFFF`) is reserved for foreground assessment cards and focal interaction planes.
- **Functional Semantics**:
  - Success / Normative Range: `#10B981` (Standard deviation median / Valid submission)
  - Alert / Timed Depletion: `#F59E0B` (Warning states / Impending time bounds)
  - Error / Invalid Response: `#EF4444` (Validation failure / Incomplete task battery)

## Typography

Typography prioritizes high legibility and rapid comprehension. Inter provides neutral, highly structured letterforms with optical corrections specifically calibrated for reading dense instructions, numerical matrices, and standardized psychometric multiple-choice items.

- `display`: Reserved for overall score breakdowns, percentile totals, and summative evaluation metrics.
- `headline-lg` / `headline-md`: Dedicated to module milestones, sub-test batteries, and executive summaries.
- `body-lg` / `body-md`: Used for item prompt stems, cognitive instructions, and research contextualization.
- `label-*`: Set with subtle uppercase tracking to delineate metadata such as timer indicators, subscale labels, question indices, and validity indices.

## Layout & Spacing

The layout is built upon an 8pt architectural rhythm within a 12-column responsive fluid grid.

- **Assessment Workspace**: Fixed-width focus containers (maximum 840px) during actual active testing to prevent extraneous saccadic eye movements and minimize participant fatigue.
- **Analytical & Reporting Dashboards**: 12-column fluid grid scaling up to 1440px with a standard 1.5rem column gutter and 2rem outer canvas margin.
- **Breakpoints**:
  - `Desktop (>= 1024px)`: Multi-column subscale readouts, synchronized live matrices, and split view options.
  - `Tablet (768px - 1023px)`: Reflows side-by-side matrices into vertically grouped cohorts; margins compress to 1.5rem.
  - `Mobile (< 768px)`: Single-column linear layout. Outer margin reduces to 1rem. Matrix options reflow from 2x3 or 2x4 configurations to clear 2-column or full-width vertical stacks to maintain adequate touch target boundaries.

## Elevation & Depth

Visual hierarchy employs calibrated tonal stacking and controlled chromatic ambient glow instead of heavy drop shadows, reinforcing a precise laboratory feel:

- **Surface Levels**:
  - Base: `#F8FAFC` (Canvas foundation)
  - Level 1: `#FFFFFF` with a 1px solid border (`#E2E8F0`) for inactive test cards, metric wrappers, and control decks.
  - Level 2: Raised interaction states featuring a dual-layer shadow: `0 4px 12px -2px rgba(20, 33, 61, 0.06), 0 0 0 1px rgba(226, 232, 240, 0.8)`.
  - Focused/Active Psychometric Item: Raised with a subtle luminescent depth: `0 8px 24px -4px rgba(59, 130, 246, 0.15), 0 0 0 2px #3B82F6`.
  - Analytical Floating Panels & Modal Dialogs: `0 20px 32px -8px rgba(20, 33, 61, 0.12), 0 0 1px rgba(20, 33, 61, 0.2)`.

## Shapes

The design system implements a roundedness scale factor of 2:

- Standard structural components (cards, assessment containers, inputs, data panels) use `rounded` (0.5rem / 8px).
- Larger contextual groupings and structural assessment modules utilize `rounded-lg` (1rem / 16px) and `rounded-xl` (1.5rem / 24px) for containment framing.
- Interactive psychometric nodes, option counters, chips, and progress pills leverage fully circular forms (`rounded-full`) to differentiate discrete, selectable options from static content surfaces.

## Components

### Buttons
- **Primary**: Solid `#3B82F6` with `#FFFFFF` text, `rounded-md` (0.5rem), height of 44px for rigorous touch-target compliance. Subtle active state with `#2563EB` and no text shift.
- **Secondary**: Outlined 1px solid `#CBD5E1`, background `#FFFFFF`, text `#14213D`. Hover initiates background tint `#F1F5F9`.
- **Tertiary / Utility**: Ghost button with transparent background, `#6D5DFB` text, reserved for sub-analyses, scientific references, and help overlays.

### Psychometric Option Selectors (Single / Multi-Choice)
- Discrete circular selector indicators (`w-6 h-6 rounded-full`) wrapped in a full-width card container (`rounded-md`, 1px solid `#E2E8F0`, padding `1rem`).
- Selected state transitions the border to `#3B82F6`, fills the inner indicator with a solid primary disc, and casts a soft 8px blur glow (`rgba(59, 130, 246, 0.12)`).

### Metric & Psychometric Cards
- Pure `#FFFFFF` fill with `rounded-lg` (1rem) corner radius. Structural separation through crisp borders (`#E2E8F0`). 
- Cards host clear content separation: micro-label header, primary stimulus or quantitative score in display scale, and secondary descriptive analysis in muted `#64748B`.

### Input Fields & Matrix Inputs
- Background `#FFFFFF`, 1px solid border (`#CBD5E1`), 0.5rem corner radius, 40px height for text/numerical entries.
- Active focus invokes a solid `#3B82F6` outline with a 3px outer glow ring (`rgba(59, 130, 246, 0.2)`). Error states transition the border to `#EF4444`.

### Progress Gauges & Assessment Timers
- **Progress Track**: `#E2E8F0` track (height 6px, `rounded-full`) filled with a continuous gradient transition from `#3B82F6` to `#6D5DFB`.
- **Timer Badge**: Minimalist pill (`rounded-full`) displaying remaining assessment time in mono-spaced digits, styled with `#14213D` background and `#FFFFFF` text for maximum visual contrast.

### Chips & Normative Tags
- `rounded-full` pills with height 24px, horizontal padding 0.75rem.
- Neutral variant: `#F1F5F9` background with `#475569` text.
- Statistically significant indicator: Tinted `#EEF2FF` background with `#6D5DFB` text.