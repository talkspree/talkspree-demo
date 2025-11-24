# TalkSpree - Community Speed Networking Platform

TalkSpree is a community speed-networking platform that helps members of private groups (like NGOs, universities, or corporate teams) connect through guided 1-on-1 video conversations.

## 🚀 Quick Start

**New to this project?** Start here: **[QUICKSTART.md](./QUICKSTART.md)**

## 📚 Documentation

- **[Quick Start Guide](./QUICKSTART.md)** - Get running in 10 minutes
- **[Supabase Setup](./SUPABASE_SETUP.md)** - Complete backend setup guide
- **[API Documentation](./API_DOCUMENTATION.md)** - How to use the API
- **[Backend Summary](./BACKEND_SETUP_SUMMARY.md)** - What's been built
- **[Production Checklist](./PRODUCTION_CHECKLIST.md)** - Deploy to production

## Project info

**URL**: https://lovable.dev/projects/c8e8c9e7-4a49-4eb5-b987-e7aa04d6e5a3

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/c8e8c9e7-4a49-4eb5-b987-e7aa04d6e5a3) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

### Frontend
- **Vite** - Build tool
- **TypeScript** - Type safety
- **React** - UI framework
- **shadcn-ui** - Component library
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **React Query** - Data fetching

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Row Level Security
  - Real-time subscriptions
  - Storage for profile pictures
- **Complete API Layer** - Type-safe API utilities

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/c8e8c9e7-4a49-4eb5-b987-e7aa04d6e5a3) and click on Share -> Publish.

## 🎯 Current Status

### ✅ Completed
- User authentication (email/password, Google OAuth ready)
- User profiles with interests
- Onboarding flow
- Circle (community) management
- Invite code system
- Database schema (11 tables)
- API layer (profiles, circles, matchmaking, calls)
- Protected routes
- Type-safe API with full TypeScript support

### 🚧 In Progress / To Do
- Video calling integration (WebRTC)
- Matchmaking UI
- Real-time notifications
- Admin dashboard

## 🏗️ Architecture

```
Frontend (React + TypeScript)
    ↓
API Layer (src/lib/api/)
    ↓
Supabase (PostgreSQL + Auth + Storage)
```

### Database Schema
- **profiles** - User information
- **interests** - Available interests (163 pre-seeded)
- **user_interests** - User's selected interests
- **circles** - Communities/groups
- **circle_members** - Membership with roles
- **call_history** - All calls with ratings
- **matchmaking_queue** - Real-time matching
- **reports** - User reporting system
- **notifications** - In-app notifications
- **blocked_users** - User blocking
- **invite_codes** - Invitation system

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

See [QUICKSTART.md](./QUICKSTART.md) for setup instructions.

## 📦 Project Structure

```
talkspree-demo/
├── src/
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client
│   │   └── api/                  # API utilities
│   │       ├── profiles.ts       # Profile operations
│   │       ├── circles.ts        # Circle management
│   │       ├── matchmaking.ts    # Matchmaking queue
│   │       └── calls.ts          # Call management
│   ├── contexts/
│   │   └── AuthContext.tsx       # Authentication
│   ├── components/               # React components
│   ├── pages/                    # Page components
│   └── hooks/                    # Custom hooks
├── supabase/
│   └── migrations/               # Database migrations
├── public/                       # Static assets
└── scripts/                      # Utility scripts
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🚀 Deployment

### Option 1: Lovable (Recommended for quick deploys)
1. Open [Lovable](https://lovable.dev/projects/c8e8c9e7-4a49-4eb5-b987-e7aa04d6e5a3)
2. Click Share → Publish

### Option 2: Vercel/Netlify
1. Connect your GitHub repository
2. Set environment variables
3. Deploy!

See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for complete deployment guide.

## 🤝 Contributing

1. Clone the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

[Add your license here]

## 🆘 Support

Need help? Check:
1. [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
2. [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Backend setup
3. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API usage
4. [Supabase Documentation](https://supabase.com/docs)

## Can I connect a custom domain?

Yes! Navigate to Project > Settings > Domains and click Connect Domain.

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
