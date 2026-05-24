# QuickHelp Deployment Guide

## Local Development

```bash
# 1. Start infrastructure
docker-compose up -d postgres redis

# 2. Backend
cd backend
cp .env.example .env    # fill in secrets
npm install
npx prisma migrate dev
npm run seed
npm run dev             # http://localhost:4000

# 3. Admin Dashboard
cd ../admin
npm install
npm run dev             # http://localhost:5173

# 4. Mobile App
cd ../mobile
npm install
npx expo start          # scan QR with Expo Go app
```

## Production — Docker Compose

```bash
docker-compose up -d    # starts all services
docker-compose --profile dev-tools up -d   # + pgAdmin
```

## Production — Railway (Recommended for MVP)

1. Push repo to GitHub
2. Create Railway project → "Deploy from GitHub repo"
3. Add PostgreSQL and Redis services
4. Set environment variables (copy from `.env.example`)
5. Railway auto-detects Dockerfile and deploys

## Production — AWS ECS

```bash
# Build & push images
docker build -t quickhelp-api ./backend
docker build -t quickhelp-admin ./admin

aws ecr create-repository --repository-name quickhelp-api
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
docker tag quickhelp-api $ECR_REGISTRY/quickhelp-api:latest
docker push $ECR_REGISTRY/quickhelp-api:latest

# Deploy with ECS task definitions (see ecs/ folder)
```

## Mobile — App Store

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure
eas build:configure

# iOS build
eas build --platform ios --profile production

# Android build
eas build --platform android --profile production

# Submit
eas submit --platform ios
eas submit --platform android
```

## Environment Variables (Production)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | Min 64 chars random string |
| `JWT_REFRESH_SECRET` | ✅ | Min 64 chars random string |
| `FIREBASE_PROJECT_ID` | ✅ | For push notifications |
| `FIREBASE_PRIVATE_KEY` | ✅ | Firebase service account |
| `FIREBASE_CLIENT_EMAIL` | ✅ | Firebase service account |
| `AWS_ACCESS_KEY_ID` | ✅ | For file uploads |
| `AWS_SECRET_ACCESS_KEY` | ✅ | For file uploads |
| `AWS_S3_BUCKET` | ✅ | S3 bucket name |
| `GOOGLE_MAPS_API_KEY` | ✅ | For geocoding |
| `OPENAI_API_KEY` | ⚡ | AI moderation (optional but recommended) |

## CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd backend && npm ci && npm test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        run: railway up --service quickhelp-api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Database Migrations (Production)

```bash
# Never run migrate dev in production
# Use migrate deploy instead:
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

## Scaling Considerations

- **Database**: Use connection pooling (PgBouncer) for high traffic
- **Redis**: Redis Cluster for horizontal scaling
- **Socket.io**: Use Redis adapter for multi-node: `socket.io-redis`
- **File uploads**: Direct-to-S3 signed URLs (bypass API server)
- **CDN**: CloudFront in front of S3 for avatar/image delivery
- **Rate limiting**: Use Redis-backed rate limiter for distributed setup
