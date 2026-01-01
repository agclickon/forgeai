# Project Intelligence Platform for AI-Powered Project Management

## Overview

This is a SaaS platform designed to transform project briefings (text, audio, or conversation) into complete, structured, and executable projects. The system provides AI-powered generation of scope, roadmaps, technical documentation, and execution commands for AI development tools. It targets digital agencies, consultancies, software houses, and internal product/technology teams.

The platform follows a multi-level structure: Client → Project → (Briefing, Scope, Roadmap, Execution, Documents, Vault, History).

## User Preferences

Preferred communication style: Simple, everyday language.

### CRITICAL - Database Configuration
- **SEMPRE usar SUPABASE_DATABASE_URL** - O banco de dados principal é o Supabase, NÃO o DATABASE_URL do Replit
- Para rodar migrações: `DATABASE_URL=$SUPABASE_DATABASE_URL npm run db:push`
- O arquivo `server/db.ts` já está configurado para priorizar SUPABASE_DATABASE_URL
- Nunca criar tabelas ou rodar migrações sem especificar SUPABASE_DATABASE_URL

### CRITICAL - Idioma e Acentuação
- **SEMPRE usar Português Brasileiro com acentuação correta** em todo conteúdo gerado
- Exemplos de acentuação obrigatória:
  - "Decomposição" (não "Decomposicao")
  - "Não foi possível" (não "Nao foi possivel")
  - "Versão" (não "Versao")
  - "Título", "Descrição", "Ação", "Conclusão", etc.
- Todos os prompts de IA devem incluir instrução para usar português brasileiro com acentuação correta

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Design System**: Hybrid approach combining Linear's aesthetics, Notion's content hierarchy, and Material Design 3's structured components

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API at `/api/*` endpoints
- **Authentication**: Session-based auth using express-session with bcrypt password hashing
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **AI Integration**: Multi-provider fallback system via Replit's AI Integrations
  - **Primary**: Claude Sonnet 4.5 (via Anthropic AI Integrations)
  - **Fallback**: GPT-4o (via OpenAI AI Integrations)
  - Automatically tries Claude first; if fails, falls back to GPT-4o
  - No need for manual API keys - handled by Replit's integration system

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` - shared between client and server
- **Migrations**: Drizzle Kit with `drizzle-kit push` command
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

### Project Structure
```
client/           # React frontend application
├── src/
│   ├── components/   # UI components (Shadcn/ui based)
│   ├── pages/        # Route pages
│   ├── hooks/        # Custom React hooks
│   └── lib/          # Utilities and query client
server/           # Express backend
├── routes.ts     # API route definitions
├── storage.ts    # Database operations layer
├── auth.ts       # Authentication logic
├── openai.ts     # AI integration functions
└── db.ts         # Database connection
shared/           # Shared code between client/server
└── schema.ts     # Drizzle database schema and types
```

### Key Design Decisions

1. **Monorepo Structure**: Client and server share types through `@shared/*` path alias, ensuring type safety across the stack.

2. **AI-First Briefing**: The briefing system uses conversational AI to collect project requirements, automatically detecting missing fields and generating structured project artifacts.

3. **Multi-tenant Architecture**: Users own clients, clients own projects, enabling agency-style multi-client management.

4. **Specialized AI Agents**: The platform includes specialized agents for analysis, code review, testing, and security assessments.

## Recent Changes (December 2024)

### Client Portal Token Authentication (Latest - December 29)
- **Token-Based Security**: Implemented Bearer token authentication for all portal routes
  - `generatePortalToken()` creates cryptographically secure 32-byte hex tokens with 24h expiry
  - `validatePortalToken()` validates tokens and returns associated clientId
  - In-memory token store (Map) used for session management
- **Protected Endpoints**:
  - `POST /api/portal/login` returns token along with client data (password excluded)
  - `GET /api/portal/projects` requires Bearer token, extracts clientId from token
  - `GET /api/portal/project/:projectId` requires Bearer token, verifies project ownership
  - `POST /api/portal/feedbacks` requires Bearer token, forces clientId from token
- **Password Security**: bcrypt hashing for portal passwords on create/update
- **Frontend Integration**: Token stored in state, passed in Authorization header, cleared on logout

### Activity Logging System (December 27)
- **Generic Activity Logs**: Converted `progressLogs` table to handle 5 activity types:
  - `progress_update` - Stage progress changed (existing)
  - `stage_approval` - Stage approved/rejected
  - `document_created` - New documentation generated
  - `member_added` - Team member added to project
  - `project_status_changed` - Project status updated
- **Schema Updates**: Added `projectId`, `documentId`, `activityType`, `previousStatus`, `newStatus`, `description` fields
- **Activity Endpoints**:
  - Stage approval logs recorded at `/api/stages/:id/approve` (includes previous/new status + comment)
  - Member addition logs recorded at `/api/projects/:id/members` (includes member name and role)
  - Document creation logs recorded at `/api/projects/:id/documents/generate` (only for new docs)
  - Project status change logs recorded when stages are approved (shows old → new status)
- **Dashboard Integration**: Updated ActivityLog interface and activity feed to display all 5 types with context-specific formatting
  - Progress updates show: "Etapa X atualizada" with % change
  - Approvals show: "Etapa aprovada/rejeitada"
  - Documents show: "Documento gerado" with type
  - Members show: "Membro adicionado" with role
  - Status changes show: "Status do projeto alterado" with old → new

### AI Provider Fallback System
- Configured Claude Sonnet 4.5 as primary AI model (via direct Anthropic API key for cost control)
- GPT-4o as automatic fallback if Claude fails (via Replit AI Integrations for stability)
- Created `callAIWithFallback()` function in `server/openai.ts` that implements seamless provider switching
- Benefits: Better Portuguese support, higher context window, fewer hallucinations (Claude), plus stability (GPT-4o fallback)
- All 18+ AI functions updated to use `callAIWithFallback()` wrapper
- Cost control: Uses ANTHROPIC_API_KEY secret for direct API billing (not Replit credits)

### Automatic Image Style Extraction (Latest)
- New `analyzeImageForStyles()` function in `server/openai.ts` uses Claude vision API
- Automatically analyzes uploaded reference images to extract design system parameters:
  - 10 color shades (background, foreground, primary, secondary, accent, muted, card, border)
  - Typography suggestions (font families, sizes, heading scale)
  - Spacing values (border radius, padding)
- Extracted styles are saved to:
  - Individual visualReference object (with `extractedStyles` and `styleDescription` fields)
  - Briefing's `visualIdentity.styles` for later application
- Frontend shows extracted color palette preview on images with "IA" badge indicator
- All prompts use Brazilian Portuguese with correct accentuation

### Styles Tab Predefined Styles Integration (Previous)


### Phase 2 Completed Features

1. **Template-Based Briefing**: 9 project templates (Web/SaaS, E-commerce, Mobile, Landing Page, Marketing, Branding, UI/UX, Consulting, Custom) with category-specific questions in `shared/briefingTemplates.ts`.

2. **Briefing Export**: Export briefing data to text file format with complete project information and conversation history.

3. **Activity Feed**: Dashboard shows recent activity from owned and member projects using progress logs with type filtering.

4. **Favorites System**: Projects can be marked as favorites with toggle functionality on project cards.

5. **Speech Recognition**: Voice input support for briefing chat using Web Speech API (pt-BR).

6. **Document Upload**: Upload text documents (.txt, .md, .json, .csv) to inform briefing, stored in object storage.

7. **Visual References**: Upload images as visual references for briefing context.

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable

### AI Services
- **OpenAI-compatible API**: Via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`)
- Used for briefing analysis, scope generation, roadmap creation, documentation generation, and specialized agent tasks

### Object Storage
- **Google Cloud Storage**: For file uploads via `@google-cloud/storage`
- Bucket configured via `DEFAULT_OBJECT_STORAGE_BUCKET_ID` environment variable
- Uses presigned URLs for secure uploads/downloads

### Authentication
- Session secret via `SESSION_SECRET` environment variable
- Sessions stored in PostgreSQL

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption secret
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - AI API endpoint
- `AI_INTEGRATIONS_OPENAI_API_KEY` - AI API key
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` - GCS bucket ID (optional, for file uploads)