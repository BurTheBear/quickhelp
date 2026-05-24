# QuickHelp — Micro-Volunteering Platform

> Connect people who need small acts of help with willing volunteers in their community, within 5–30 minutes.

![QuickHelp Banner](docs/banner.png)

## 🚀 Overview

QuickHelp is a production-ready, mobile-first social platform that makes volunteering fast, easy, and addictive. Think "Uber for small acts of kindness" with social media gamification — every task completed builds real community impact.

**Key differentiators:**
- ⚡ Micro-tasks (5–30 min) — low commitment, high impact
- 🎮 Gamification — XP, levels, streaks, leaderboards
- 🤖 AI-powered matching & safety moderation
- 📍 Hyperlocal — GPS-based nearby requests
- 💬 Real-time chat & notifications

---

## 🏗️ Architecture

```
quickhelp/
├── backend/          # Node.js + Express + Prisma API
├── mobile/           # React Native (Expo) mobile app
├── admin/            # React admin dashboard
├── shared/           # Shared TypeScript types & constants
└── docs/             # Architecture docs, API specs
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo SDK 51 |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Real-time | Socket.io |
| Auth | Firebase Auth + JWT |
| Push Notifications | Firebase Cloud Messaging |
| Maps | Google Maps API + React Native Maps |
| File Storage | AWS S3 |
| AI Features | OpenAI GPT-4o |
| Caching | Redis |
| Admin UI | React + Vite + Tailwind CSS |
| Deployment | Docker + AWS ECS / Railway |

---

## 📦 Quick Start

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 15+
- Redis 7+
- Firebase project
- Google Maps API key
- OpenAI API key

### 1. Clone & Install

```bash
git clone https://github.com/yourorg/quickhelp.git
cd quickhelp

# Install all workspace dependencies
npm install

# Backend
cd backend && npm install

# Mobile
cd ../mobile && npm install

# Admin
cd ../admin && npm install
```

### 2. Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in your secrets (see backend/.env.example)

# Mobile
cp mobile/.env.example mobile/.env

# Admin
cp admin/.env.example admin/.env
```

### 3. Start with Docker

```bash
# From root
docker-compose up -d postgres redis

# Run migrations + seed
cd backend
npx prisma migrate dev
npx ts-node src/seeds/seed.ts

# Start backend
npm run dev
```

### 4. Run Mobile App

```bash
cd mobile
npx expo start
# Press 'i' for iOS simulator, 'a' for Android
```

### 5. Run Admin Dashboard

```bash
cd admin
npm run dev
# Open http://localhost:5173
```

---

## 🗄️ Database Schema

See [docs/schema.md](docs/schema.md) for full ERD.

Core entities:
- **Users** — auth, profiles, skills, reputation
- **HelpRequests** — tasks with location, category, urgency
- **Matches** — volunteer assignments and status
- **Messages** — real-time chat per request
- **Gamification** — XP events, badges, achievements, streaks
- **Reports** — safety moderation queue
- **CommunityGroups** — local volunteer organizations

---

## 🔌 API Reference

Base URL: `https://api.quickhelp.app/v1`

Full API docs: [docs/api.md](docs/api.md)

Key endpoints:
```
POST /auth/signup
POST /auth/login
GET  /requests?lat=&lng=&radius=
POST /requests
POST /requests/:id/accept
GET  /users/:id/profile
POST /matches/:id/complete
GET  /leaderboard
WS   /socket.io  (real-time events)
```

---

## 🎮 Gamification System

| Action | XP |
|--------|-----|
| Complete a task | +50–200 XP (based on difficulty) |
| Receive 5-star rating | +25 XP bonus |
| 7-day streak | +100 XP |
| First task in category | +30 XP (Explorer badge) |
| Help an elderly person | +75 XP |
| Emergency task | +150 XP |

**Levels:** 1 (Newcomer) → 10 (Community Legend)

---

## 🛡️ Safety Features

- **User verification** — ID badge system
- **AI moderation** — GPT-4o screens all requests for harmful content
- **Reporting system** — Users can report requests/users
- **Emergency SOS** — One-tap emergency contact
- **Rating system** — Bidirectional reviews after each task
- **Background checks** — Integration hook for third-party providers

---

## 🚀 Deployment

See [docs/deployment.md](docs/deployment.md) for:
- Docker production build
- AWS ECS deployment
- Railway one-click deploy
- Environment variable reference
- CI/CD pipeline (GitHub Actions)

---

## 📱 App Store

**Name:** QuickHelp — Community Tasks  
**Subtitle:** Volunteer. Help. Level Up.  
**Description:** See [docs/app-store.md](docs/app-store.md)

---

## 💰 Monetization

1. **QuickHelp Pro** ($4.99/mo) — Priority matching, profile boost, custom avatar frames
2. **Business Listings** — Local businesses sponsor volunteer tasks
3. **Nonprofit Partnerships** — White-label solution for organizations
4. **Premium Challenges** — Branded corporate volunteering events
5. **Data Insights** — Anonymized community impact reports for city governments

---

## 🗺️ Roadmap

**Q1 2026 — Beta Launch**
- [ ] Core request/match flow
- [ ] Real-time chat
- [ ] Basic gamification
- [ ] Maps & location

**Q2 2026**
- [ ] AI smart matching
- [ ] Community Groups
- [ ] Event volunteering mode
- [ ] Background checks integration

**Q3 2026**
- [ ] Corporate volunteering portal
- [ ] Impact certificates (blockchain)
- [ ] Multi-city expansion tools
- [ ] Analytics API for nonprofits

**Q4 2026**
- [ ] QuickHelp Pro subscription
- [ ] International localization
- [ ] Partner API & SDK
- [ ] City government dashboards

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow.

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

*Built with ❤️ for communities everywhere.*
