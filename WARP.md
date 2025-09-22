# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Development Commands

### Quick Start
```bash
# Install dependencies
npm install

# Start Turbopack development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Type checking (no dedicated script yet)
npx tsc --noEmit
```

### Database Commands
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to MongoDB
npm run db:push

# Seed admin user
npm run seed:admin
```

### Testing Commands
```bash
# Test API endpoints (PowerShell script)
./test-api.ps1

# Test specific API route (example)
curl -X POST http://localhost:3000/api/user \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Test</h1>"}'
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.5.2 with App Router and Turbopack
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Database**: MongoDB with Prisma ORM
- **Authentication**: Custom JWT-based with jose library
- **AI Integration**: Google Generative AI (Gemini) and LangChain
- **Email**: Nodemailer for SMTP notifications
- **Icons**: Lucide React
- **Editor**: CKEditor 5 for rich text editing

### Core Architecture

#### Route Organization
The application uses Next.js App Router with the following structure:
- `app/` - Main application routes using file-based routing
  - `(auth)/` - Grouped authentication routes (login, register, request-deployment)
  - `dashboard/` - Protected admin area with user management, audit logs, and policies
  - `api/` - Server-side API routes for auth, users, search, and AI processing
- Protected routes enforced via `middleware.ts` checking JWT session cookies

#### Key Libraries and Services
1. **Authentication System** (`lib/auth.ts`)
   - JWT-based session management using jose library
   - Session cookies with 24-hour expiry
   - Role-based access control (ADMIN, MANAGER)
   - Granular permissions system (Discord-like matrix in `lib/permissions.ts`)

2. **Database Layer** (`lib/prisma.ts`, `lib/mongo.ts`)
   - Prisma ORM for MongoDB interactions
   - Models: User, DeploymentRequest, UserAudit
   - Singleton pattern for Prisma client in development

3. **AI Integration** (`lib/prompt.ts`, `lib/html.ts`)
   - Google Gemini AI for content analysis
   - HTML processing with image extraction and base64 conversion
   - Structured prompts for multilingual content generation
   - Image parts handling for multimodal AI processing

4. **Email Service** (`lib/email.ts`)
   - SMTP configuration for deployment request notifications
   - Graceful fallback when SMTP not configured

#### Middleware Protection
The `middleware.ts` file:
- Protects `/dashboard/*` routes
- Validates JWT session cookies
- Redirects unauthorized users to login
- Passes user context to protected routes

#### API Routes Structure
- `/api/auth/` - Login, logout, session management
- `/api/users/` - CRUD operations for user management
- `/api/requests/` - Deployment request handling
- `/api/search/` - MongoDB text search functionality
- `/api/user/` - HTML processing and AI analysis endpoint
- `/api/ingest/` - Content ingestion with AI processing

## Environment Configuration

Required environment variables (copy from `.env.example`):
```bash
# MongoDB (Required)
MONGO_URI=mongodb://localhost:27017/kmrl_db

# Authentication (Required)
AUTH_SECRET=<generate-secure-random-string>

# Email Service (Optional - logs warning if not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@kmrl.com
DEPLOYMENT_NOTIFY_TO=admin@kmrl.com

# AI Service (Required for AI features)
GEMINI_API_KEY=your-gemini-api-key

# Public Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:5000
```

## Development Guidelines

### Code Style
- TypeScript everywhere - avoid plain JavaScript files
- 2-space indentation standard
- Component files: PascalCase (`Navbar.tsx`)
- Utility files: camelCase (`auth.ts`)
- Route folders: lowercase-kebab
- Run `npm run lint` before committing

### Component Patterns
- Server Components by default, Client Components only when needed
- Grouping folders with parentheses for feature scoping: `(auth)`
- Tailwind utilities organized by: layout → spacing → state
- Shared UI components in `components/` directory

### State Management
- Server Components for data fetching
- React Context for auth state
- Local component state for UI interactions
- Zustand considered for complex client state (not yet implemented)

### Error Handling
- Custom error boundary in `app/error.tsx`
- 404 handling in `app/not-found.tsx`
- API routes return consistent JSON with success/error fields
- Graceful degradation when services unavailable

### Security Considerations
- JWT secrets in environment variables only
- Session validation in middleware
- Role-based access control for admin features
- CSRF protection via SameSite cookies
- Input validation on all API routes

## Testing Approach

While automated tests are not yet configured, manual testing focuses on:
- Authentication flows (login → dashboard → logout)
- API endpoint validation using PowerShell scripts
- HTML processing and AI integration via test samples
- Permission matrix for role-based access

Test samples available in `test-samples/` directory for API testing.

## Deployment Notes

### Vercel Deployment (Recommended)
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with automatic builds on push

### Pre-deployment Checklist
- [ ] Run `npm run build` locally - no errors
- [ ] Configure all required environment variables
- [ ] Test production build: `npm run build && npm run start`
- [ ] Verify Prisma client generation in build step
- [ ] Check middleware protection on protected routes

## Known Integration Points

### Backend Services Expected
- Node.js CRUD API at `NEXT_PUBLIC_API_URL`
- Python AI service at `NEXT_PUBLIC_AI_SERVICE_URL`
- MongoDB instance for data persistence
- SMTP server for email notifications (optional)

### Frontend Responsibilities
- User authentication and session management
- Dashboard for content and user management
- AI-powered content analysis and translation
- Responsive UI with multilingual support
- Real-time form validation and error handling

## Current Development Phase

According to FRONTEND.md, the project is in Phase 3 (Integration with Backend and AI Services) with:
- ✅ Phase 1: Initial setup complete
- ✅ Phase 2: Core pages and UI components built
- 🚧 Phase 3: Backend/AI integration in progress
- 📅 Phase 4: Optimization and deployment prep pending

## Quick Troubleshooting

### Common Issues
1. **Prisma Client Error**: Run `npm run db:generate` after schema changes
2. **Auth Redirect Loop**: Clear cookies and check `AUTH_SECRET` is set
3. **Email Not Sending**: SMTP variables optional - check logs for warnings
4. **AI Features Failing**: Verify `GEMINI_API_KEY` is valid and has quota
5. **Build Errors**: Ensure all environment variables are set in production