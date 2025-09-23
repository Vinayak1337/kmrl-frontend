# KMRL Frontend Application

A modern, multilingual content delivery platform built with Next.js 13+, featuring AI-powered translation services, real-time content management, and a responsive user interface.

## 🚀 Tech Stack

- **Framework**: Next.js 13+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API / Zustand (when needed)
- **Authentication**: Session-based with cookies (NextAuth ready)
- **Deployment**: Optimized for Vercel

## 📋 Features

- ✅ **Multilingual Support**: Real-time translation powered by AI services
- ✅ **Responsive Design**: Mobile-first approach with Tailwind CSS
- ✅ **Authentication System**: Secure login/register with session management
- ✅ **Dashboard Interface**: Analytics and content management
- ✅ **AI Integration**: Chat interface for AI-powered assistance
- ✅ **Error Handling**: Custom error and 404 pages
- ✅ **Server-Side Rendering**: Optimized for SEO and performance
- ✅ **Type Safety**: Full TypeScript implementation

## 🛠 Prerequisites

- Node.js 18.17 or later
- npm, yarn, pnpm, or bun package manager
- Git for version control

## 📦 Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd kmrl-frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your configuration:
- Backend API URL
- AI Service endpoints
- Authentication secrets
- Translation API keys

## 🚀 Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

See also:
- Ingestion & Agent guide: `INGESTION_AND_AGENT.md`
- Project status: `PROJECT_STATUS.md`
- Workflow tracker: `WORKFLOW_TRACKER.md`

## 📁 Project Structure

```
kmrl-frontend/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication routes group
│   │   ├── login/           # Login page
│   │   └── register/        # Registration page
│   ├── dashboard/           # Protected dashboard
│   ├── api/                 # API routes
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── error.tsx            # Error boundary
│   └── not-found.tsx        # 404 page
├── components/              # Reusable components
│   ├── Navbar.tsx          # Navigation component
│   ├── Footer.tsx          # Footer component
│   └── UI/                 # UI components
├── styles/                  # Global styles
│   └── globals.css         # Tailwind imports
├── public/                  # Static assets
├── .env.example            # Environment variables template
├── .env.local              # Local environment variables
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
```

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 🗃 Database & Utilities

```bash
# Prisma client
npm run db:generate

# Push Prisma schema to MongoDB
npm run db:push

# Seed an admin user
npm run seed:admin
```

## 🧪 Testing & API

- See `API_TESTING_GUIDE.md` for endpoint testing tips.
- Ingestion & Agent guide: `INGESTION_AND_AGENT.md`.
- Project status and next steps: `PROJECT_STATUS.md`.

## 🌐 Environment Variables

Key environment variables (see `.env.example` for full list):

- `MONGODB_URI`, `MONGODB_DB_NAME`, `MONGODB_COLLECTION`
- `GEMINI_API_KEY` (from `.env`)
- `AUTH_SECRET` (JWT for middleware)

## 📱 Pages Overview

### Public Pages
- `/` - Landing page with features overview
- `/login` - User authentication
- `/register` - New user registration

### Protected Pages
- `/dashboard` - Main application dashboard
- `/dashboard/[id]` - Document detail with sections, chat, feedback
- `/profile` - User profile management (coming soon)
- `/settings` - Application settings (coming soon)

## 🔐 Authentication Flow

1. User registers/logs in via auth pages
2. Backend validates credentials
3. Session cookie is set
4. Middleware protects dashboard routes
5. Unauthorized users redirected to login

## 🎨 Styling Guidelines

- **Tailwind CSS**: Utility-first approach
- **Responsive**: Mobile-first design
- **Dark Mode**: Support planned for future
- **Consistency**: Follow established component patterns

## 🧪 Testing

```bash
# Unit tests (to be implemented)
npm run test

# E2E tests (to be implemented)
npm run test:e2e
```

## 📈 Performance Optimization

- Server Components for static content
- Client Components only when necessary
- Image optimization with Next/Image
- Code splitting at route level
- Lazy loading for heavy components

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Self-hosted

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 Development Phases

Refer to `FRONTEND.md` for detailed development phases:

- **Phase 1**: ✅ Initial Setup and Configuration
- **Phase 2**: 🚧 Core Pages and UI Components
- **Phase 3**: 📅 Integration with Backend and AI Services
- **Phase 4**: 📅 Optimization and Deployment Prep

## 🐛 Known Issues

- Atlas Vector Search not yet wired; similarity computed in app for now
- Word document parsing uses placeholder; add mammoth for production

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs)
- [Lucide Icons](https://lucide.dev)

## 📄 License

This project is private and proprietary.

## 👥 Team

Developed for the KMRL Project.

---

**Note**: This is a development version. Some features are still under construction.
