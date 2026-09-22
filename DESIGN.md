---
name: Alfon Professional
colors:
  surface: '#f7fafc'
  surface-dim: '#d7dadc'
  surface-bright: '#f7fafc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f6'
  surface-container: '#ebeef0'
  surface-container-high: '#e5e9eb'
  surface-container-highest: '#e0e3e5'
  on-surface: '#181c1e'
  on-surface-variant: '#43474b'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eef1f3'
  outline: '#73787c'
  outline-variant: '#c3c7cc'
  surface-tint: '#4a6171'
  primary: '#152d3b'
  on-primary: '#ffffff'
  primary-container: '#2c4352'
  on-primary-container: '#97afc1'
  inverse-primary: '#b1cadc'
  secondary: '#4a6171'
  on-secondary: '#ffffff'
  secondary-container: '#cde6f9'
  on-secondary-container: '#506777'
  tertiary: '#1c2c35'
  on-tertiary: '#ffffff'
  tertiary-container: '#32424c'
  on-tertiary-container: '#9daeb9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cde6f9'
  primary-fixed-dim: '#b1cadc'
  on-primary-fixed: '#041e2b'
  on-primary-fixed-variant: '#324a58'
  secondary-fixed: '#cde6f9'
  secondary-fixed-dim: '#b1cadc'
  on-secondary-fixed: '#041e2c'
  on-secondary-fixed-variant: '#334959'
  tertiary-fixed: '#d4e5f1'
  tertiary-fixed-dim: '#b8c9d5'
  on-tertiary-fixed: '#0d1d26'
  on-tertiary-fixed-variant: '#394953'
  background: '#f7fafc'
  on-background: '#181c1e'
  surface-variant: '#e0e3e5'
  whatsapp-green: '#25D366'
typography:
  display-lg:
    fontFamily: Domine
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Domine
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Domine
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Domine
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  max-width: 1280px
---

## Brand & Style
Alfon is a professional business directory designed with an air of authority and reliability. The aesthetic follows a **Corporate / Modern** style, emphasizing clarity and ease of use. It balances a sturdy, traditional serif for headlines with a clean, functional sans-serif for information display. 

The brand personality is trustworthy, institutional, and efficient. It avoids excessive ornamentation in favor of structural integrity, using clear dividers and subtle tonal shifts to organize large datasets. The target audience includes business professionals and service seekers who require a no-nonsense, accessible interface for contact management.

## Colors
The palette is built on deep slate blues and cool grays, evoking a sense of stability. 

- **Primary**: A deep navy (#152d3b) used for critical branding, primary actions, and emphasis.
- **Secondary**: A muted steel blue (#4a6171) for supporting elements and interactive states.
- **Surface**: The system uses a layered approach to "f7fafc" (Background) and "ffffff" (Containers) to create a clean, high-contrast reading environment.
- **Accents**: WhatsApp green is used as a specific functional brand color for communication. Functional neutrals like "outline-variant" provide structure without visual noise.

## Typography
The system utilizes a dual-font approach. **Domine** provides a sturdy, authoritative serif for displays and headlines, ensuring the brand feels established. **Work Sans** is used for all functional UI, body copy, and labels to maintain high legibility at smaller sizes. 

For RTL contexts, special care is taken with line heights to ensure no clipping occurs with Hebrew characters. Display sizes scale down for mobile devices to maintain visual hierarchy without overwhelming the viewport.

## Layout & Spacing
The design employs a **Fixed Grid** philosophy for desktop, centering a 1280px container with generous 64px side margins. On mobile, the system shifts to a fluid model with 16px margins.

Spacing follows a 4px base unit. 
- **Gutters**: A consistent 24px gap is used between grid items (cards).
- **Sections**: Vertical rhythm is maintained with 32px to 48px gaps between major sections.
- **In-component**: Cards and modules use 24px (6 units) of internal padding to maintain a premium feel.

## Elevation & Depth
Elevation is primarily conveyed through **Tonal Layers** and **Low-contrast Outlines**. 

- **Level 0 (Base)**: The background uses "surface" (#f7fafc).
- **Level 1 (Cards)**: White (#ffffff) surfaces with a 1px border (#c3c7cc).
- **Interactivity**: On hover, cards transition from a flat state to an **Ambient Shadow** state (extra-diffused, 8% opacity of the seed color) to indicate "lift."
- **Navigation**: The Top Bar is "sticky" with a solid bottom border, creating a fixed anchor for the UI.

## Shapes
The shape language is "Soft" and controlled. 
- **Standard Elements**: Buttons and inputs use a 4px (rounded-lg) radius.
- **Containers**: Cards and alphabet navigation strips use an 8px (rounded-xl) radius.
- **Avatars/Icons**: Full circles (rounded-full) are used for profile initials and action buttons within cards to distinguish them from structural containers.
- **Decorative**: A heavy 4px height pill-shaped bar is used as a header underline to add brand weight.

## Components
- **Buttons**: Primary buttons are solid navy with white text and icons. Secondary/Action buttons within cards use a primary-colored border with a ghost background, transitioning to a light gray on hover.
- **Input Fields**: Search inputs are minimal, utilizing a bottom-border-only style (2px) in the secondary color, providing a clean, "forms" inspired look that avoids heavy boxes.
- **Contact Cards**: Use a vertical layout with a clear avatar-headline header. Information is gated behind a "Reveal" button to keep the grid clean. A dedicated icon row at the bottom provides quick-action access.
- **Alphabet Nav**: A horizontal scrolling strip of square/rectangular chips with a 4px radius. Active state is indicated by a solid primary background.
- **Avatars**: Circular containers using "primary-fixed" or "secondary-fixed" tints with high-contrast text for the user's initial.