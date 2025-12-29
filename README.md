# AI Council

Compare AI models side by side. Submit any prompt and see responses from GPT, Claude, and Grok in real-time.

![AI Council Landing Page](landingPage.png)

## Features

- **Multi-Model Comparison** - Compare GPT-4, Claude, and Grok responses side by side
- **Session-Based Chat** - Conversations are saved as sessions, like ChatGPT
- **User Authentication** - Secure signup/login with JWT tokens
- **Subscription Tiers** - Free (10/day), Pro (unlimited), Team plans
- **Stripe Integration** - Payment processing for upgrades
- **Theme Support** - Light, dark, and system themes
- **Chat History** - Browse and search past conversations

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- React Router
- Framer Motion

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL
- Redis (optional, for rate limiting)
- JWT Authentication

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (optional)

### 1. Clone and Install

```bash
git clone <repository-url>
cd ai-council

# Install dependencies
npm install --prefix backend
npm install --prefix ai-comparator-hub
```

### 2. Database Setup

```bash
# Create database and user
./setup-db.sh

# Or manually:
psql -U postgres -c "CREATE USER ai_hub WITH PASSWORD 'ai_hub_123';"
psql -U postgres -c "CREATE DATABASE ai_hub OWNER ai_hub;"
psql -U ai_hub -d ai_hub -f backend/src/db/schema.sql
```

### 3. Environment Configuration

**Backend** (`backend/.env`):
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://ai_hub:ai_hub_123@localhost:5432/ai_hub
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key

# AI Provider Keys
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-ant-your-key
XAI_API_KEY=your-xai-key

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Frontend** (`ai-comparator-hub/.env`):
```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Run the Application

```bash
# Start both frontend and backend
./start.sh

# Or run separately:
npm run dev --prefix backend      # Backend on :3001
npm run dev --prefix ai-comparator-hub  # Frontend on :5173
```

## Project Structure

```
ai-council/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── db/             # Database connection & schema
│   │   ├── middleware/     # Auth, rate limiting, etc.
│   │   ├── repositories/   # Data access layer
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── types/          # TypeScript types
│   └── tests/              # Test files
│
├── ai-comparator-hub/      # React frontend
│   ├── public/             # Static assets
│   └── src/
│       ├── components/     # UI components
│       ├── contexts/       # React contexts
│       ├── hooks/          # Custom hooks
│       ├── lib/            # Utilities & API client
│       └── pages/          # Page components
│
├── start.sh                # Start script
├── setup-db.sh             # Database setup script
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/sessions` | List chat sessions |
| POST | `/api/sessions` | Create new session |
| GET | `/api/sessions/:id` | Get session with messages |
| POST | `/api/sessions/:id/messages` | Send message |
| GET | `/api/profile` | Get user profile |
| PATCH | `/api/profile` | Update profile |
| PATCH | `/api/profile/theme` | Update theme |
| GET | `/api/usage` | Get usage stats |
| POST | `/api/subscription/upgrade` | Upgrade plan |
| POST | `/api/payments/create-checkout-session` | Stripe checkout |

## License

MIT
