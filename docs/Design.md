# CODEX 4.0 — Design System

## Design Direction
Modern, clean, responsive coding-event website with strong visual hierarchy and minimal friction.

## Shared Design
Defined primarily in `css/global.css`.

Use shared tokens for typography, spacing, border radius, shadows, page width, buttons, navigation, and theme behavior.

## Page Design

### Home
- Hero section
- Event identity
- Primary registration CTA
- Event statistics
- Supporting visual treatment

### Information Pages
About, Highlights, Prizes, Timeline, Details, Rounds, FAQ and Contact should each have a clear page-specific layout while sharing the global shell.

### Registration
- Step-based form
- Clear validation
- Review before payment
- Prominent Razorpay Pay button
- Payment state feedback
- Confirmation after verified payment

### Admin
- Dense but readable registration table
- Responsive stats cards
- Payment status badges
- Search/filter controls
- Registration detail modal

## Responsive Requirements
Design for mobile first, tablet, and desktop. No horizontal overflow on normal screen sizes.

## Accessibility
- semantic HTML
- keyboard-accessible controls
- visible focus states
- sufficient text contrast
- meaningful labels
- buttons must describe their action
