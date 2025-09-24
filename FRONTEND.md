## Project Outline
This project will deliver the user-facing front end of our system, enabling users to interact with the content gathered by the backend. A key feature is **multilingual support** – while our primary data is stored in English, we want the interface to cater to users in their preferred language. We will build a responsive and intuitive web application (and possibly a mobile-friendly view) that displays the content, allows searching/browsing, and provides an option to view the content in multiple languages through on-the-fly translation. The focus is on great user experience and broad accessibility.

## Problem Statement 
Our user base may speak different languages, but our content is in English. The problem is how to serve non-English-speaking users without maintaining multiple versions of the content manually. We need to overcome language barriers so that the information can reach a wider audience. Additionally, the front end must effectively present potentially large amounts of data (from Project 2) in a clear way, and allow users to find what they need (search, filters, etc.). The challenge is to integrate a translation solution that is accurate enough and fast, ensuring that switching languages feels seamless. We must also ensure the UI remains user-friendly and secure (not exposing any internals).

## Solution 
We will develop a modern single-page application (SPA) or a web app using a framework like React, Angular, or Vue (depending on our stack), ensuring it connects securely to the backend APIs from Project 1. The UI will be designed for simplicity and clarity, with features like search functionality, categorization of content, and an admin login for curators (as part of Project 2’s interface). For **multilingual support**, we plan to integrate an automatic translation service. This means the interface text and the content can be translated in real-time into various languages. We can utilize services such as **Google Cloud Translation API** or similar AI translation services to handle this dynamically. These services allow programmatic translation of text on demand, so when a user selects a language, the app can translate the English content to that language on the fly. To manage this, the front end will be built with internationalization (i18n) in mind from the start. We'll externalize all UI strings (like navigation labels, buttons, etc.) so they can be translated easily. For content (which is stored in English in our database), when a user chooses another language, the application will call the translation API to get the content in that language. For example, if a user wants to read in Spanish, the app will send the English text to a translation service and display the returned Spanish text. This provides a near-instant translation without us storing multiple copies of content. We might also consider using an existing library or service (such as GTranslate or similar plugins) that simplifies website translation using neural machine translation.

Here is the phased plan:

# Next.js Frontend Project Outline and Phases

References:
- Ingestion & Agent: see `INGESTION_AND_AGENT.md`
- Project status: see `PROJECT_STATUS.md`

Tech Stack & Project Structure
	•	Framework & Language: Next.js 13+ (React) with App Router (using primarily Server Components and Routes). Use TypeScript on the frontend for type safety and maintainability.
	•	UI & Styling: Tailwind CSS for rapid, utility-first styling. Use Lucide (Lucide React Icons) for iconography throughout the app.
	•	State Management: Rely mostly on Next.js Server Components and built-in React state. Use a lightweight client-side state library (like Zustand) only for complex interactive components or persistent UI state as needed.
	•	Data & Auth: Use Next.js Server Actions and API Routes for form handling and data mutations (keeping logic on the server). Implement session-based authentication using cookies (possible integration with NextAuth or a custom approach communicating with the backend API). Leverage Next.js middleware for protection of certain routes if needed.
	•	Rendering: Utilize a mix of SSR (Server-Side Rendering) for dynamic pages (ensuring SEO and up-to-date data), Static Generation for public or marketing pages, and Client-Side Rendering only where truly necessary for rich interactivity. Use the Next.js App Router’s Layout feature for consistent page layouts (header, footer, etc.).
	•	Deployment: Host on Vercel for seamless Next.js support (CI/CD, serverless functions for any API routes or server actions). Ensure environment variables (e.g., API base URLs, keys) are configured on Vercel for production.

Project Structure:

frontend/
├── app/                         # Next.js App Router directory
│   ├── layout.tsx               # Root layout (e.g., includes <head>, header, footer)
│   ├── page.tsx                 # Home page (landing page for the app)
│   ├── (auth)/
│   │   ├── login/page.tsx       # Example of a nested route for login
│   │   └── register/page.tsx    # (If user registration is needed)
│   ├── dashboard/
│   │   ├── page.tsx             # Protected user dashboard page
│   │   └── layout.tsx           # Dashboard-specific layout if needed
│   ├── ... (other routes as needed)
│   └── api/                     # Next.js API routes (for any serverless functions, if needed)
│       └── hello.ts            # Example API route (can be used for testing)
├── components/                  # Reusable React components
│   ├── Navbar.tsx               # Navigation bar component
│   ├── Footer.tsx               # Footer component
│   ├── UI/                      # (Optional) smaller UI components (buttons, modals, etc.)
│   └── ... (other shared components)
├── styles/ 
│   ├── globals.css             # Global styles (Tailwind base imports, etc.)
│   └── ... (any additional CSS if needed)
├── public/                      # Public assets (e.g., images, icons if any static assets)
│   └── favicon.ico
├── middleware.ts                # Next.js middleware (for auth redirects, etc.)
├── next.config.js               # Next.js configuration
├── package.json
└── README.md

(The structure may expand as new pages and features are added, but this is the initial layout focusing on App Router organization.)

Development Phases

Phase 1: Initial Setup and Configuration
	1.	Initialize Project: Create a new Next.js app (e.g., using create-next-app) with TypeScript enabled. Set up the project repository (Git initialization and linking to version control).
	2.	Install Dependencies: Add Tailwind CSS and configure it (generate tailwind.config.js, import Tailwind directives in globals.css). Install Lucide React icons (lucide-react) and any other essential libraries (e.g., for form handling or state management if foreseen).
	3.	Project Structure: Establish the base folder structure as outlined. Create the app/ directory with a layout.tsx that defines the HTML <head> (metadata, link to Tailwind CSS) and common layout (e.g., includes a <Navbar /> and <Footer /> component). Add a basic app/page.tsx with placeholder content to verify the setup.
	4.	Routing & Layout: Implement a simple layout with a navigation bar and footer. Ensure the App Router is properly set up: for example, create placeholder routes for authentication (/login, /register) and a protected area like /dashboard (just simple text pages for now). This sets the stage for further development and confirms that nested routing works.
	5.	Server Components & Actions: Set up an example Server Action (Next 13 feature) to handle a simple form or data submission on the server. For instance, a contact form on the homepage that posts to a server action function. This is mostly to validate that the configuration for server actions (if using the experimental Next feature) is working. (If not using experimental actions yet, skip and plan to implement standard Next.js API routes or form submissions to the backend in later phases.)
	6.	State Management Setup: If any component requires client-side state in this phase (for example, a mobile menu toggle in the Navbar), implement it using local component state or Zustand. Keep it minimal; verify that Tailwind styling and React state work as expected in the browser.
	7.	Testing Setup: Configure basic development tools: set up ESLint and Prettier for code quality (Next.js comes with a default ESLint config which can be extended). Ensure TypeScript is properly catching errors. Run the dev server and test the initial pages in a browser to confirm everything renders correctly. Fix any configuration issues now.
	8.	Documentation: Create a README.md for the frontend repository explaining how to run the project and the tech stack. Document any setup steps (like how to configure environment variables for API endpoints, though at this stage the backend API may not be ready). This ensures that from the start, the project is well-documented for any new developers or AI agents joining later.

Phase 2: Core Pages and UI Components
	1.	Design & UI Components: Implement the core user interface pages. Start with building the Authentication pages (/login and /register if applicable) with proper form components. Utilize Tailwind CSS to create clean, responsive forms and use Lucide icons where appropriate (e.g., username/password icons or brand logo).
	2.	Page Layouts: Build the Dashboard page (or main application interface) as a protected page. Create a dashboard layout if the dashboard section needs a distinct structure (for example, a sidebar navigation aside from the main navbar). This page will be the primary interface for users after login – for now, it can contain placeholders or basic content (like “Welcome, [User]”).
	3.	Dynamic Content & State: Identify any interactive components (for example, a chat input for AI queries, a file upload component for media, etc.) and start implementing them with appropriate state management:
	•	If the app involves an AI chat or prompt input, design a chat box or form on the dashboard where users can enter queries. Use client-side components where user input and immediate feedback are needed (e.g., a text area controlled by React state).
	•	If the app involves media upload/streaming, create a component for uploading media files (images/audio/video). Use Next.js built-in form handling or a client component to select files, and prepare it to call the backend API (the actual upload functionality will be hooked up in a later phase when the backend endpoint is ready).
	4.	Client-Side Validation & UX: Add basic client-side validation and UX improvements. For example, ensure required form fields (like email/password on register) have validation messages. Use Zustand or component state to manage form error messages and loading states (e.g., a loading spinner on actions like “Submit” or “Upload”). Aim to make the UI responsive and accessible (use Tailwind utility classes and ARIA attributes for accessibility where needed).
	5.	Global State (if needed): If certain state must persist across pages (for instance, a logged-in user’s info or a theme preference), set up a small Zustand store or utilize Next.js cookies. For example, after a successful login (to be implemented in Phase 3 when backend is connected), you might store a session token or user data in a context or Zustand store to show user info on the navbar. (Keep this minimal and secure, deferring actual login logic to when backend is connected.)
	6.	Error Pages & Boundaries: Create a generic error page using Next.js conventions (e.g., app/[...error]/error.tsx or the error.js in a route segment) to handle unexpected errors gracefully on the client. Also design a 404 page (app/not-found.tsx) for routes that don’t exist. These pages will improve UX in case of issues.
	7.	Testing UI Components: Begin writing simple tests for critical components if possible. For example, using React Testing Library to ensure the login form renders and validation works for an invalid submission (this could be done now or in Phase 4, but listing it to ensure it’s considered). This will ensure that as we integrate with backend, the UI continues to function as expected.
	8.	Update Documentation: Document any new environment variables or configuration (e.g., if a feature flag or API endpoint URL is needed for the upcoming integration, note it in the README or an .env.example file). Update the README with instructions on how to run the frontend and any assumptions (like “requires backend running at XYZ URL for API calls in next phase”).

Phase 3: Integration with Backend and AI Services
	1.	API Integration Setup: Now that the Node.js CRUD backend and Python AI service are coming online (in their own phases), integrate the frontend with these services. Define the environment config for API URLs (for example, have a Next public environment variable for the backend base URL, so that the frontend knows where to send requests).
	2.	Authentication Flow: Hook up the login/register forms to the backend API:
	•	Call the backend endpoints (e.g., via fetch or Axios from Next.js Server Actions or client components) for logging in or registering users.
	•	On successful login, store the authentication token or session cookie. If using cookies and sessions, ensure the cookie is being set by the backend and included in requests (configure Next.js fetch calls to include credentials, and possibly use Next.js middleware to redirect unauthenticated users).
	•	Update the UI upon login: e.g., redirect to dashboard on success, and show error messages on failure (invalid credentials, etc.). This will involve handling responses from the backend and updating component state accordingly.
	3.	Protected Routes: Utilize Next.js middleware or server-side checks to protect pages like the dashboard. For example, middleware can check for a session cookie or token and redirect to login if not present. Alternatively, use server-side data fetching on the dashboard page to redirect unauthenticated users (e.g., using Next.js redirect() in an async server component if no valid session).
	4.	Data Fetching & Display: Integrate other CRUD functionalities:
	•	If the app has a user profile page, fetch the user data from the backend and display it.
	•	If there are list or feed pages (for example, a list of media items a user has uploaded, or history of AI queries), fetch those via API and render the results. Use Next.js server-side data fetching (e.g., fetch in a server component or getServerSideProps if using pages, though App Router encourages using fetch directly in Server Components) to retrieve data on page load.
	•	Ensure to handle loading states (show a spinner or skeleton UI while data loads) and error states (if the backend returns an error, display a user-friendly message).
	5.	AI Feature Integration: Connect the frontend to the AI backend service:
	•	For example, if the dashboard includes an AI chat or query input, on form submission, send the query to the Node backend (which will proxy to the AI service) or directly to the AI service if appropriate. Likely, the flow will be: Frontend calls Node API (e.g., POST /api/query), Node calls Python AI service, then returns result to frontend.
	•	Implement the frontend call (using fetch in a server action or a client-side fetch if immediate feedback is needed). Show an indication that processing is happening (loading spinner or “Thinking…” message).
	•	When the response comes back (e.g., an AI-generated answer or analysis), display it in the UI. For a chat interface, append it to the conversation thread; for other use-cases, show the result in a designated output area.
	•	Streaming Responses: If the AI service supports streaming results (token by token), consider handling that: possibly using WebSockets or Server-Sent Events. This could be advanced, so as a simpler approach, you might first implement polling or just a full-response update. (Streaming can be added in a later phase if needed for better UX, see Phase 4.)
	6.	Media Upload & Retrieval: If the application allows uploading media (images, videos, audio for AI to analyze or for storage):
	•	Implement the frontend side of file uploads. This might involve a form that sends a file via an API call to the backend (e.g., using an <input type="file"> and then a POST request).
	•	Use Next.js Server Actions if possible to handle file upload streams on the server side (Next 13 allows form submissions to server actions, but handling binary might require a standard API route). Alternatively, use a client component to upload directly to the backend endpoint (with fetch or a library like axios, showing progress).
	•	After uploading, display the uploaded media or a link to it. For example, if a user uploads an audio file for transcription by the AI, show the file name and status. The backend will store the file (in a NoSQL or cloud storage) and possibly trigger the AI service to process it; the UI should reflect when processing is done (could poll a status endpoint or get the result directly if synchronous).
	7.	Error Handling: As integration is implemented, robust error handling becomes crucial:
	•	Handle HTTP errors from the backend (e.g., unauthorized 401, validation 400, server errors 500). Show meaningful messages to the user. For instance, if a login fails, show “Invalid credentials”; if an AI query fails or times out, inform the user and perhaps suggest trying again.
	•	Ensure the app doesn’t crash on a bad response. Use try/catch around fetch calls in actions or .catch in promises, and display fallback UI when errors occur.
	•	If using Next.js error boundaries, verify they catch errors from rendering or data fetching and show the error page designed in Phase 2.
	8.	Refinement of UI/UX: With real data flowing, refine the UI:
	•	Update placeholder text with actual dynamic content (e.g., show user’s name on dashboard after fetching profile).
	•	Clean up any layout issues now that components have real data (for example, handle long text from AI gracefully with CSS word wrapping, etc.).
	•	Possibly incorporate additional interactive polish, like auto-scrolling a chat view when a new message appears, etc.
	9.	Testing (Integration): Write integration tests or end-to-end tests to ensure the frontend and backend work together:
	•	For example, using a tool like Playwright or Cypress to simulate a user logging in and seeing their dashboard, or submitting an AI query and getting a response. This can help catch any integration issues.
	•	At minimum, manually test all flows in a dev environment: Register -> Login -> Use features (AI query or media upload) -> Logout to ensure each piece works end-to-end.
	10.	Update Documentation: Expand the frontend README with information about how it communicates with the backend and AI service. Document any required environment variables (like NEXT_PUBLIC_API_URL for the backend). Also include instructions for running the whole system (e.g., “make sure backend is running on XYZ and set the URL accordingly”). Optionally, prepare some screenshots of the UI for the documentation to make it clear what the app looks like at this stage.

Phase 4: Optimization, Error Handling & Deployment Prep
	1.	Performance Improvements: Audit the frontend for performance. Use Next.js analytics or Lighthouse to check for any slow pages. Optimize images (use Next/Image for any user-uploaded or static images). Ensure that code-splitting is happening (Next does this automatically for routes) and remove any unused dependencies. Enable caching for data fetching where appropriate (e.g., Next.js fetch can cache static requests).
	2.	Comprehensive Error Handling: Review all frontend code to make sure every API call has error handling. Implement a global error handler if possible (for example, a context that catches promise rejections from fetch calls) or ensure each call uses try/catch. Also handle edge cases, such as:
	•	Token expiration (if a session token expires, detect a 401 from backend and prompt re-login).
	•	Network failures (show a “Network error, please try again” message if the backend is unreachable).
	•	AI service unavailability (if the AI service times out or is down, make sure the UI informs the user gracefully).
	3.	UX Polishing: Incorporate feedback and polish the user experience:
	•	Add loading spinners or skeleton UI where responses are not instantaneous (for example, when waiting for an AI response, show an animated ellipsis or spinner).
	•	If not done earlier, implement streaming AI responses for a better UX (optional advanced improvement): e.g., the AI answer appears word-by-word. This might involve using web sockets or server-sent events from the backend. If implementing, coordinate with backend/AI to provide a streaming endpoint. Update the frontend to append text as it arrives.
	•	Ensure the app is mobile-responsive. Tailwind makes it easy to add responsive classes; verify on various screen sizes and adjust styles as needed.
	•	Add any final touches like tooltips, confirmations (e.g., “Are you sure you want to delete X?” if any destructive actions exist), and so on.
	4.	Security Checks: Double-check that sensitive data is not exposed on the frontend. Make sure any secret keys are only used server-side. Ensure that Next.js API routes (if any) and Server Actions are protected from unauthorized access (using sessions or other checks).
	5.	Documentation & Guides: Create user-facing documentation if applicable (for example, if this app will be used by others, a short guide on how to use the AI features). However, since the focus is development, ensure developer documentation is thorough:
	•	Inline code comments for complex logic.
	•	An updated README with all setup steps, including how to set environment variables, how to build and deploy the frontend, and any troubleshooting tips.
	•	If the project is large, consider a small Architecture.md file describing the high-level frontend architecture (how state is managed, how it talks to backend, etc.).
	6.	Deployment Preparation: Ensure the frontend is ready to deploy on Vercel:
	•	Set up the Vercel project and link the Git repository.
	•	Configure environment variables in Vercel (like the backend API URL, any public keys).
	•	Test a production build locally (npm run build && npm start) to catch any build-time errors.
	•	Once ready, deploy to Vercel and perform final testing on the deployed URL to ensure everything (authentication, API calls, etc.) works in the production environment.
	7.	Monitoring & Error Tracking (Post-deploy): Optionally integrate a tool like Sentry or Vercel Analytics for runtime error monitoring and performance tracking. This will help catch any runtime errors that users might encounter in production.
	8.	Future Enhancements: Document ideas for future sprints (this is more of a note-taking step): e.g., improving SEO further, adding more pages or features, refining the UI with animations, etc., so that the project has a clear roadmap beyond the initial prototype.
## Environment Variables

- MONGO_URI: MongoDB connection string used by Prisma.
- MONGODB_URI / MONGODB_DB_NAME / MONGODB_COLLECTION: MongoDB driver for documents.
- MONGODB_NODES_COLLECTION: Collection name for node documents (default: `document_nodes`).
- AUTH_SECRET: Secret key for signing JWT session cookies.
- SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM: SMTP credentials for sending emails.
- DEPLOYMENT_NOTIFY_TO: Recipient address for deployment request notifications.

If SMTP variables are not configured, the deployment request API stores the request and skips email, logging a warning.
