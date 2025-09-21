# Repository Guidelines

## Project Structure & Module Organization
KMRL Frontend uses Next.js 15 App Router with TypeScript. Route logic lives in `app/`, with `(auth)` for grouped auth pages and `dashboard` for protected views. Shared UI sits in `components/` while global styles are in `styles/globals.css`. Static assets belong in `public/`. Keep configuration updates in `next.config.ts`, `tsconfig.json`, and `eslint.config.mjs`. Use `FRONTEND.md` for deep roadmap context, but treat `app/` as source of truth for live routes.

## Build, Test, and Development Commands
- `npm install` – install dependencies; run after pulling package updates.
- `npm run dev` – start the Turbopack dev server at http://localhost:3000/.
- `npm run build` – compile the production bundle and surface server/client boundary issues.
- `npm run start` – serve the prebuilt output locally to mirror Vercel.
- `npm run lint` – execute ESLint across the project; append `-- --fix` to auto-apply safe fixes.
- `npx tsc --noEmit` – optional type sweep until a dedicated script is added.

## Coding Style & Naming Conventions
Prefer TypeScript across modules; avoid introducing plain JavaScript files. Follow 2-space indentation as in `app/page.tsx`. Export React components with `PascalCase` filenames (`Navbar.tsx`), utility modules with `camelCase.ts`, and route segment folders in lowercase-kebab. Use grouping folders like `(auth)` to scope feature flows. Compose styling with Tailwind utilities, clustering classes by layout, spacing, then state to keep diffs readable. Run `npm run lint` before committing and suppress rules only with documented justification.

## Testing Guidelines
Automated testing is not configured yet. When you introduce tests, co-locate them beside the source (`Component.test.tsx`) or under `__tests__/` to keep context clear. Prefer Vitest with React Testing Library for component logic and Playwright for critical flows; add the required dependencies and scripts to `package.json` within the same PR. Document any mocks for Next.js primitives and ensure new tests run via CI before requesting review. Until formal suites exist, include manual verification steps in the PR template.

## Commit & Pull Request Guidelines
Recent commits (`git log -5 --oneline`) use short, imperative subjects such as `add dashboard shell` and `fix auth redirect`. Keep titles under 50 characters, start with a verb, and skip trailing punctuation. Use topic branches like `feature/auth-mfa`. PRs must include a concise summary, linked issue or ticket, screenshots or recordings for UI updates, a checklist of verification steps (lint, manual flows, temporary flags), and call out environment variable changes.

## Environment & Configuration
Configuration lives in `.env.local`; bootstrap from `.env.example` and never commit secrets. Update `FRONTEND.md` whenever you introduce new keys or architecture changes. When integrating external services, gate credentials behind `NEXT_PUBLIC_` (client) or server-only variables and describe graceful fallbacks for absent values.
