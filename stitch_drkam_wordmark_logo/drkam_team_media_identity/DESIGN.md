---
name: DrKam Team Media Identity
colors:
  surface: '#fff8f7'
  surface-dim: '#f2d3d0'
  surface-bright: '#fff8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0ef'
  surface-container: '#ffe9e7'
  surface-container-high: '#ffe2de'
  surface-container-highest: '#fbdbd8'
  on-surface: '#281716'
  on-surface-variant: '#5c403d'
  inverse-surface: '#3f2c2a'
  inverse-on-surface: '#ffedeb'
  outline: '#916f6c'
  outline-variant: '#e5bdb9'
  surface-tint: '#be091b'
  primary: '#ac0015'
  on-primary: '#ffffff'
  primary-container: '#d32027'
  on-primary-container: '#ffeae8'
  inverse-primary: '#ffb3ad'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#525556'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b6d6e'
  on-tertiary-container: '#eeeff0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb3ad'
  on-primary-fixed: '#410003'
  on-primary-fixed-variant: '#930010'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e1e3e4'
  tertiary-fixed-dim: '#c5c7c8'
  on-tertiary-fixed: '#191c1d'
  on-tertiary-fixed-variant: '#454748'
  background: '#fff8f7'
  on-background: '#281716'
  surface-variant: '#fbdbd8'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  container-max: 1440px
---

## Brand & Style
This design system establishes a high-performance, professional aesthetic for the TEAM MEDIA module. It balances the energetic authority of the parent brand with a clean, data-focused interface designed for high-velocity content production. 

The style is **Corporate Modern**, characterized by a light, airy canvas that allows media assets and status indicators to remain the focal point. The emotional response is one of reliability, precision, and creative momentum. Every interface element is structured to facilitate the transition from strategic planning to execution, reflecting the collaborative dynamic between leadership and production staff.

## Colors
The palette is anchored by **DrKam Red (#D32027)**, used strategically for primary actions, branding, and high-priority status indicators. To ensure professional clarity, we utilize a spectrum of semantic accents to categorize content types:

- **Primary (DrKam Red):** Main branding and critical CTAs.
- **Branding (#6366F1):** Indigo for corporate identity tasks.
- **BS Nguyên (#0EA5E9):** Sky blue for medical-specific content.
- **Bán hàng (#F59E0B):** Amber for sales-driven media.
- **Xào KOC (#EC4899):** Pink for influencer and talent content.
- **ADS FB (#10B981):** Emerald for paid performance tracking.
- **FB Daily (#64748B):** Slate for routine community management.

Backgrounds remain neutral white or light gray to minimize cognitive load during long production sessions.

## Typography
**Montserrat** is used exclusively to maintain a bold, geometric, and modern feel. 

- **Headlines:** Use Bold (700) or SemiBold (600) weights. Scale down for mobile to ensure readability in the dashboard's dense data views.
- **Body:** Use Regular (400) for all descriptive text.
- **Labels:** Use Medium (500) or SemiBold (600) at 12px-14px. Small labels for content categories (e.g., "ADS FB") should utilize a slight letter spacing increase and uppercase transform for instant recognition.

## Layout & Spacing
The layout follows a **fluid grid system** with a 12-column structure for desktop and a single column for mobile. 

- **Grid:** 24px side margins on desktop, reducing to 16px on mobile.
- **Rhythm:** An 8px base grid governs all component spacing. 
- **Density:** The "TEAM MEDIA" module uses a "Comfortable" density for cards and "Compact" density for data tables to maximize information visibility without feeling cluttered.

## Elevation & Depth
To maintain a professional and clean look, we avoid heavy shadows. Instead, the design system utilizes **Soft Ambient Shadows**:

- **Surface Level (Level 0):** Pure white background (#FFFFFF) or light gray (#F8F9FA).
- **Dashboard Cards (Level 1):** 1px subtle border (#E2E8F0) combined with a soft, diffused shadow (Offset: 0, 4px; Blur: 20px; Color: rgba(0, 0, 0, 0.04)).
- **Interactive Elements/Hover (Level 2):** Slightly deeper shadow to indicate lift (Offset: 0, 8px; Blur: 24px; Color: rgba(0, 0, 0, 0.08)).
- **Modals (Level 3):** Backdrop blur (8px) with a structured shadow to focus attention on input forms.

## Shapes
In alignment with the core brand requirements, this design system utilizes a **rounded-2xl** (1rem / 16px) standard for all primary containers and cards.

- **Main Cards:** 16px (rounded-2xl).
- **Buttons & Inputs:** 12px (rounded-xl) to provide a slightly more "tooled" feel while maintaining the friendly curve.
- **Small Chips/Labels:** 8px (rounded-lg) for category tags like "Branding" or "Xào KOC".
- **Avatar Profiles:** Circular for personnel like Nguyễn Trọng Khải and Vũ Văn Sơn.

## Components

### Dashboard Cards
Professional containers with 16px corner radius and level 1 elevation. Cards should feature a subtle 4px vertical accent bar on the left side using the **Content Type** color tokens to visually categorize tasks at a glance.

### Content Labels (Chips)
Small, semi-bold text inside a capsule shape. Use a 10% opacity background of the category color with 100% opacity text for a "tonal" look that doesn't overwhelm the UI.
*Example: "ADS FB" appears as an Emerald text on a light Emerald tint.*

### Personnel Profiles
- **Leader Style:** Use a primary red border or a "Lead" badge for "Nguyễn Trọng Khải".
- **Staff Style:** Standard clean circular avatar for "Vũ Văn Sơn" with role-based secondary text.

### Buttons
- **Primary:** DrKam Red background with white Montserrat SemiBold text.
- **Secondary:** White background with DrKam Red border (1.5px).
- **Action Icons:** Use simple, geometric line icons to maintain the "clean" aesthetic.

### Input Fields
12px corner radius, 1.5px light gray border. Focus state uses a 1px DrKam Red ring with a soft glow.