# Design Guidelines - Plataforma de Inteligência para Gestão de Projetos com IA

## Design Approach

**Selected System:** Hybrid approach combining Linear's modern aesthetics, Notion's content hierarchy, and Material Design 3's structured components

**Rationale:** This is a professional productivity tool requiring exceptional information density management, clear data hierarchy, and seamless workflows. The design must balance sophistication with operational efficiency.

**Key Principles:**
- Information clarity over decoration
- Purposeful hierarchy through typography and spacing
- Streamlined workflows with minimal friction
- Professional credibility through refined execution

---

## Typography System

**Font Families:**
- Primary: Inter (headers, navigation, labels)
- Secondary: JetBrains Mono (code blocks, technical documentation, JSON outputs)

**Type Scale:**
- Display: 3xl (36px) - Page headers, empty states
- H1: 2xl (24px) - Section titles, modal headers
- H2: xl (20px) - Card headers, subsections
- H3: lg (18px) - List headers, categories
- Body: base (16px) - Primary content, forms
- Small: sm (14px) - Secondary info, labels
- Caption: xs (12px) - Timestamps, metadata

**Weights:**
- Semibold (600): Headers, primary actions
- Medium (500): Subheaders, navigation
- Regular (400): Body text, inputs

---

## Layout System

**Spacing Primitives:** Use Tailwind units: 2, 4, 6, 8, 12, 16, 24

**Grid System:**
- Main layout: Sidebar (240px fixed) + Content (fluid)
- Content max-width: 1400px with px-8 padding
- Card grids: 2-3 columns on desktop, single column mobile
- Form layouts: Single column max-w-2xl for readability

**Responsive Breakpoints:**
- Mobile: < 768px (stack everything)
- Tablet: 768px - 1024px (2-column grids)
- Desktop: > 1024px (full 3-column layouts)

---

## Component Library

### Navigation
**Sidebar:**
- Fixed left sidebar (240px width)
- Hierarchical tree structure: Clients → Projects → Stages
- Collapsible sections with expand/collapse icons
- Active state: subtle background treatment, semibold text
- Spacing: py-2 for items, px-4 for container

**Top Bar:**
- Height: h-16
- Contains: Breadcrumbs, search, user profile, notifications
- Sticky positioning

### Data Display

**Cards:**
- Rounded corners: rounded-lg
- Padding: p-6
- Shadow: subtle elevation
- Hover: slight scale transform (scale-[1.01])

**Project Cards:**
- Header: Project name + status badge
- Body: Progress bar, key metrics (2-column grid)
- Footer: Last updated, assigned team

**Tables:**
- Striped rows for readability
- Sticky headers
- Row hover states
- Action buttons right-aligned
- Sortable columns with indicator icons

**Progress Indicators:**
- Linear progress bars (h-2, rounded-full)
- Percentage display (right-aligned)
- Stage indicators with checkmarks/pending states
- Timeline view with connector lines

### Forms & Inputs

**Briefing Interface:**
- Large textarea: min-h-[200px] with clear focus states
- Chat-style conversation bubbles for AI questions
- File upload dropzone: border-dashed, p-12, centered icon
- Audio recording: waveform visualization, duration counter

**Input Fields:**
- Height: h-11
- Padding: px-4
- Rounded: rounded-md
- Label above input with text-sm font-medium
- Helper text below with text-xs

**Select Dropdowns:**
- Custom styled with chevron icon
- Max height with scroll for long lists
- Search functionality for >10 items

**Buttons:**
- Primary: h-11, px-6, rounded-md, font-medium
- Secondary: Same size, different treatment
- Icon buttons: w-11 h-11 (square)
- Loading states with spinner

### Kanban Board
- Columns: min-w-[320px], max-w-[400px]
- Cards: Drag handle, title, assignee avatar, due date
- Horizontal scroll on overflow
- Column headers with count badges
- Add card button at column bottom

### Timeline View
- Horizontal axis with date markers
- Milestone diamonds with connecting lines
- Task bars with drag-to-resize
- Today indicator line
- Zoom controls (week/month/quarter views)

### Modals & Overlays
- Backdrop: semi-transparent with blur
- Modal: max-w-2xl, rounded-lg, p-8
- Header with close button (top-right)
- Footer with action buttons (right-aligned)
- Slide-in animation from bottom

### Documentation Display
- Markdown rendering with syntax highlighting
- Code blocks: JetBrains Mono, rounded-lg, p-4
- Copy button on code blocks
- Collapsible sections
- Table of contents sidebar for long docs

### Command Output Card
- Monospace font throughout
- JSON formatting with indentation
- Copy entire command button
- Download as file option
- Syntax highlighting for technical fields

---

## Animations

**Minimal Motion Principle:**
- Page transitions: None (instant navigation)
- Hover states: Subtle opacity/scale changes (150ms)
- Loading states: Spinner only
- Progress updates: Smooth number counting (500ms)
- Modal enter/exit: 200ms fade + slide

---

## Dashboard Layout

**Executive Dashboard:**
- Top: KPI cards in 4-column grid (projects count, active stages, completion rate, upcoming deadlines)
- Middle: Recent projects table
- Right sidebar: Activity feed (280px)

**Project Detail View:**
- Header: Project name, status, progress bar, action buttons
- Tab navigation: Overview | Briefing | Scope | Roadmap | Execution | Documents
- Content area: Full-width forms and data displays
- Right sidebar (320px): Metadata, team, history

---

## Empty States

- Centered icon (96px)
- Heading: "Nenhum projeto ainda"
- Description: Helper text explaining next action
- Primary CTA button: "Criar Primeiro Projeto"
- Spacing: py-24 vertical padding

---

## Accessibility

- Focus visible states on all interactive elements
- ARIA labels on icon-only buttons
- Keyboard navigation support (Tab, Shift+Tab, Enter, Escape)
- Screen reader announcements for dynamic content
- Minimum touch target: 44px × 44px