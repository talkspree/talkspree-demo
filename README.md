# TalkSpree

**TalkSpree** is a community speed-networking platform that connects members of private groups — NGOs, universities, corporate teams, and more — through structured 1-on-1 video conversations. It combines smart matchmaking, real-time video, and community management into a single cohesive experience.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS | Styling |
| shadcn/ui + Radix UI | Component library |
| Framer Motion | Animations |
| React Router v6 | Client-side routing |
| TanStack Query v5 | Data fetching & caching |
| React Hook Form + Zod | Form validation |

### Backend & Infrastructure
| Technology | Purpose |
|---|---|
| Supabase | Backend-as-a-Service (PostgreSQL, Auth, Storage, Realtime) |
| Agora RTC SDK | Live video calling |
| Row Level Security | Database access control |

---

## Project Structure

```
talkspree-demo/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── call/            # Video call components
│   │   ├── chat/            # Chat components
│   │   └── ui/              # Base UI components (shadcn)
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication context
│   ├── hooks/               # Custom React hooks
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client
│   │   └── api/             # Type-safe API utilities
│   │       ├── profiles.ts
│   │       ├── circles.ts
│   │       ├── matchmaking.ts
│   │       └── calls.ts
│   └── pages/               # Page-level components
├── supabase/
│   └── migrations/          # Database migration files
├── public/                  # Static assets
└── scripts/                 # Utility scripts
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://npmjs.com/) v9 or higher
- A [Supabase](https://supabase.com/) project

### Installation

```bash
# Clone the repository
git clone <your-repository-url>
cd talkspree-demo

# Install dependencies
npm install

# Copy the environment template and fill in your values
cp .env.example .env

# Start the development server
npm run dev
```

The app will be available at `http://localhost:8080`.

---

## Environment Variables

Create a `.env` file in the project root. Required variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> Never commit your `.env` file. It is listed in `.gitignore` by default.

---

## Available Scripts

```bash
# Start development server (with hot module replacement)
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview

# Lint the codebase
npm run lint
```

---

## Architecture

```
Browser (React + TypeScript)
        │
        ▼
  API Layer (src/lib/api/)
        │
        ├── Supabase (PostgreSQL · Auth · Storage · Realtime)
        │
        └── Agora RTC (Video / Audio Calls)
```

- **Authentication** is handled entirely by Supabase Auth (email/password, OAuth providers).
- **Database access** is gated by Row Level Security policies — all queries respect the authenticated user's permissions.
- **Real-time features** (matchmaking queue, notifications) are powered by Supabase Realtime subscriptions.
- **Video calls** are routed through Agora's global media network.

---

## Database Schema

| Table | Description |
|---|---|
| `profiles` | User information and preferences |
| `interests` | Interest taxonomy (163 pre-seeded entries) |
| `user_interests` | Many-to-many: users ↔ interests |
| `circles` | Communities / groups |
| `circle_members` | Membership records with roles |
| `call_history` | Completed calls with ratings |
| `matchmaking_queue` | Active matching requests |
| `reports` | User reports |
| `notifications` | In-app notification records |
| `blocked_users` | Blocked user relationships |
| `invite_codes` | Invitation management |

---

## Deployment

### Vercel / Netlify

1. Connect your GitHub repository to your hosting provider.
2. Set the required environment variables in the platform dashboard.
3. Deploy — the build command is `npm run build` and the output directory is `dist`.

### Self-hosted

1. Build the project: `npm run build`
2. Serve the `dist/` folder with any static file server (nginx, Caddy, etc.).
3. Ensure environment variables are injected at build time.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Make your changes, following the existing code style.
3. Ensure `npm run lint` passes without errors.
4. Open a pull request with a clear description of the changes.

---

## License

[Specify your license here.]
