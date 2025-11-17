# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Marca e Deixa** is a Next.js 15 application for creating visual presentations and theatrical scripts with an interactive canvas editor. The platform uses Paper.js for canvas rendering, Supabase for backend/auth, and Stripe for subscription management. It features a sophisticated visual editor with support for actors, objects, scenes, and stage configurations.

## Development Commands

### Core Development
```bash
# Start development server with Turbopack
npm run dev

# Build for production (with Turbopack)
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Stripe Management
```bash
# Setup Stripe webhooks automatically
npm run stripe:webhook:setup

# List existing webhooks
npm run stripe:webhook:list

# Initialize Stripe products
npm run stripe:products
```

### Testing
The project uses Playwright for E2E testing. Test files are in the root directory (e.g., `test-*.js`) and use Puppeteer for browser automation.

## Architecture Overview

### Core Data Flow

The application follows a client-side state management pattern with server-side persistence:

1. **Editor State Management** (`useEditorStore` - Zustand)
   - Manages canvas elements, viewport, scenes, and history
   - Auto-saves to Supabase every 5 seconds
   - Supports undo/redo with 50-state history limit
   - Uses `project_data` table for persistence

2. **Authentication Flow** (Supabase)
   - Regular users: Email/password via Supabase Auth
   - Admin users: Separate `admin_users` table with RLS policies
   - Middleware (`middleware.ts`) protects admin routes and checks subscriptions
   - Auth callback route: `/auth/callback`

3. **Subscription System** (Stripe + Supabase)
   - Stripe handles payments and webhook events
   - Supabase stores subscription state in `user_subscriptions`
   - Middleware validates active subscriptions for dashboard access
   - `useSubscription` hook provides subscription status throughout the app

### Key Architectural Patterns

#### Canvas Rendering Architecture

The visual editor uses a hybrid approach:
- **State Layer**: Zustand store (`useEditorStore`) manages element state
- **Render Layer**: Paper.js handles canvas rendering in `EditorCanvas.tsx`
- **Data Layer**: JSON serialization to Supabase via `projectData.ts`

Elements flow: UI interaction → Store update → Paper.js render → Auto-save to DB

#### Element System

All canvas elements extend the base `Element` interface with specialized properties:
- **Actors**: Characters with shapes (circle/square), initials, speech bubbles
- **Objects**: Stage props with custom shapes (triangle/square/hexagon)
- **Stage Config**: Background area with configurable shape and styling
- **Scenes**: Snapshots of editor state with elements, groups, and viewport
- **Groups**: Logical grouping of elements (normal groups or "welded" boolean operations)

#### Scene Management

Scenes work like presentation slides:
- Each scene stores: elements, groups, viewport state, stage config, notes
- Auto-fills "deixa" (cue) fields from text elements
- Supports slideshow playback with configurable intervals
- Fullscreen presentation mode in `FullscreenSlideshow.tsx`

### Database Schema (Supabase)

Critical tables:
- `projects`: User projects with basic metadata
- `project_data`: JSON storage for canvas state (elements, scenes, etc.)
- `actors`: Character definitions (limit: 30 per project)
- `objects`: Object definitions (limit: 50 per project, should be 30)
- `user_subscriptions`: Active subscription status
- `stripe_*`: Stripe integration tables (customers, payments, subscriptions, webhook_events)
- `admin_users`: Administrative access control

### Middleware Protection

`middleware.ts` provides three layers:
1. **Admin Route Protection**: Validates `admin_users` table membership
2. **Subscription Verification**: Checks active subscription for dashboard routes
3. **Session Management**: Handles Supabase auth session verification

Public routes bypass protection: `/`, `/login`, `/register`, `/plans`, `/pricing`

## Key Constraints and Limits

### Current Limits (Premium)
- Actors: 30 per project
- Objects: 50 per project (should be 30 - needs adjustment)
- Scenes: No limit (should be 300)
- Text boxes per scene: No limit (should be 30)
- Arrows/lines per scene: No limit (should be 60)

### Planned Free Tier Limits
- Actors: 10 per project
- Objects: 10 per project
- Scenes: 50 per project
- Text boxes: 10 per scene
- Arrows/lines: 20 per scene
- Ad bar: Required on sidebar

### Files to Modify for Limits
- `src/components/editor/ObjectModal.tsx` - Adjust object limit
- `src/components/editor/ScenesTab.tsx` - Implement scene limit
- `src/hooks/useEditorStore.ts` - Add per-scene element counting
- `src/hooks/useSubscription.ts` - Define tier-based limits

## Common Development Patterns

### Adding New Canvas Elements

1. Extend `Element` interface in `useEditorStore.ts`
2. Add rendering logic to `EditorCanvas.tsx` (Paper.js drawing)
3. Update SVG export in `projectData.ts` (`generateSVG` function)
4. Update PNG export in `projectData.ts` (`generatePNG` function)
5. Add UI controls to appropriate editor tab component

### Implementing Subscription Checks

```typescript
import { useSubscription } from '@/hooks/useSubscription'

const { hasFeature, hasActiveSubscription } = useSubscription(user)

if (!hasFeature('feature_name')) {
  // Show upgrade prompt
}
```

### Working with Editor State

```typescript
import { useEditorStore } from '@/hooks/useEditorStore'

// Get state and actions
const { elements, addElement, updateElement, saveToHistory } = useEditorStore()

// Add element
addElement({ type: 'rectangle', x: 0, y: 0, /* ... */ })

// Update with history tracking
updateElement(id, updates, { commitHistory: true })
```

### Auto-save Pattern

The editor implements auto-save in `VisualEditor.tsx`:
- Saves every 5 seconds via `setInterval`
- Saves on window `beforeunload` event
- Uses `saveProjectData()` from `lib/projectData.ts`

## Important Implementation Notes

### TypeScript and Build Configuration

The project has **intentional lax TypeScript/ESLint settings** in `next.config.js`:
```javascript
ignoreDuringBuilds: true
ignoreBuildErrors: true
```

This allows rapid development but means type errors won't block builds. Validate types manually when appropriate.

### Stripe Integration

Webhook endpoint: `/api/stripe/webhooks`
- Validates webhook signatures
- Processes events: customer creation, subscription changes, payment status
- Stores events in `stripe_webhook_events` table
- Updates `stripe_customers`, `stripe_subscriptions`, and `stripe_payments`

For local development, use Stripe CLI to forward webhooks:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

### Admin System

Admin login: `/admin/login`
Default credentials (change immediately):
- Email: `admin@marcaedeixa.com`
- Password: `Admin123!`

Admin features:
- Customer management at `/admin/customers`
- Stripe configuration at `/admin/settings/stripe`
- Supabase monitoring at `/admin/settings/supabase`
- Access logs in `admin_access_logs` table

### Known Issues and TODOs

From `OBSERVACOES-PLATAFORMA.md`:

1. **Export button functionality**: "Salvar" and "Exportar" buttons both save instead of the latter opening export modal with format options (SVG, PNG, JPG, GIF)

2. **Scene limit**: No validation for 300-scene limit

3. **Per-scene element limits**: No validation for text boxes (30) or arrows/lines (60) per scene

4. **Object limit**: Currently 50, should be 30 to match specification

5. **Presentation mode**: Should open fullscreen with controls, not just play in editor

6. **Supabase URL configuration**: Email confirmation links may redirect to localhost instead of production domain (see `GUIA-CORRECAO-SUPABASE.md`)

## Project-Specific Conventions

### File Organization
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - Reusable React components
- `src/components/editor/` - Canvas editor components (toolbars, sidebars, modals)
- `src/hooks/` - Custom React hooks (auth, subscription, editor state)
- `src/lib/` - Utility libraries (Supabase, Stripe, SVG utils, project data)
- `src/middleware/` - Custom middleware functions
- `supabase/migrations/` - Database migration SQL files

### Naming Conventions
- Components: PascalCase (e.g., `EditorCanvas.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useEditorStore.ts`)
- API routes: kebab-case directories (e.g., `api/stripe/webhooks/`)
- Types: PascalCase interfaces (e.g., `Element`, `Scene`, `StageConfig`)

### State Management Strategy
- **Global state**: Zustand stores (`useEditorStore`, etc.)
- **Server state**: React Query or direct Supabase calls
- **Local state**: React `useState` for component-level state
- **Form state**: React Hook Form with Zod validation

### Canvas Coordinate System
- Origin (0,0) at top-left
- Viewport can pan (translate) and zoom
- Elements have absolute coordinates (not relative to viewport)
- Stage config defines visible working area

## External Services Configuration

### Required Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_MODE=test

# App
NEXT_PUBLIC_APP_URL=
```

### Supabase Setup
- Project URL and keys from Supabase dashboard
- RLS policies protect all tables
- `service_role` key only used server-side for admin operations
- Run migrations in `supabase/migrations/` sequentially

### Stripe Setup
See `STRIPE_SETUP.md` for detailed instructions:
- Configure products and prices in Stripe dashboard
- Update price IDs in `src/lib/stripe.ts`
- Setup webhooks (automated via npm scripts)
- Test with Stripe test cards (4242 4242 4242 4242)
