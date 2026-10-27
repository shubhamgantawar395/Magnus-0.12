# Aaniry VMS - Developer Quick Start Guide

This guide will help you set up your development environment and start building the Aaniry VMS.

## Prerequisites

### Required Software
- Node.js 20+ LTS
- PostgreSQL 16+
- Redis 7+
- Git
- Docker & Docker Compose (optional but recommended)
- VS Code (recommended IDE)

### VS Code Extensions (Recommended)
- ESLint
- Prettier
- TypeScript
- Prisma
- GitLens
- REST Client

---

## Quick Start (Docker Method - Recommended)

### 1. Clone and Setup

```bash
# Create project directory
mkdir aaniry-vms
cd aaniry-vms

# Initialize Git
git init
```

### 2. Create Docker Compose Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: aaniry-vms-db
    environment:
      POSTGRES_USER: aaniry
      POSTGRES_PASSWORD: aaniry_dev_2026
      POSTGRES_DB: aaniry_vms
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database_schema.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aaniry"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: aaniry-vms-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f
```

---

## Backend Setup (NestJS)

### 1. Initialize Backend Project

```bash
# Install NestJS CLI globally
npm install -g @nestjs/cli

# Create backend project
nest new backend
cd backend

# Select npm as package manager
```

### 2. Install Core Dependencies

```bash
# Core dependencies
npm install @nestjs/config @nestjs/jwt @nestjs/passport
npm install @prisma/client passport passport-jwt bcryptjs
npm install class-validator class-transformer

# Dev dependencies
npm install -D @types/passport-jwt @types/bcryptjs
npm install -D prisma
```

### 3. Initialize Prisma

```bash
# Initialize Prisma
npx prisma init

# This creates:
# - prisma/schema.prisma
# - .env
```

### 4. Configure Environment Variables

Create/edit `.env`:

```env
# Database
DATABASE_URL="postgresql://aaniry:aaniry_dev_2026@localhost:5432/aaniry_vms?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# App
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Email (optional for now)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### 5. Create Prisma Schema

Edit `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                      String    @id @default(uuid())
  email                   String    @unique
  passwordHash            String    @map("password_hash")
  role                    String
  firstName               String?   @map("first_name")
  lastName                String?   @map("last_name")
  phone                   String?
  isActive                Boolean   @default(true) @map("is_active")
  isEmailVerified         Boolean   @default(false) @map("is_email_verified")
  emailVerificationToken  String?   @map("email_verification_token")
  passwordResetToken      String?   @map("password_reset_token")
  passwordResetExpires    DateTime? @map("password_reset_expires")
  lastLogin               DateTime? @map("last_login")
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")

  @@map("users")
}

model Customer {
  id             String    @id @default(uuid())
  companyName    String    @map("company_name")
  gstin          String    @unique
  pan            String?
  address        String?
  city           String?
  state          String?
  pincode        String?
  country        String    @default("India")
  contactPerson  String?   @map("contact_person")
  contactEmail   String?   @map("contact_email")
  contactPhone   String?   @map("contact_phone")
  website        String?
  logoUrl        String?   @map("logo_url")
  status         String    @default("active")
  createdBy      String?   @map("created_by")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@map("customers")
}

// Add more models as needed...
```

### 6. Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Or create migration
npx prisma migrate dev --name init

# Open Prisma Studio to view data
npx prisma studio
```

### 7. Project Structure

Create the following folder structure:

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   └── guards/
│   │   │       └── jwt-auth.guard.ts
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   ├── customers/
│   │   ├── vendors/
│   │   ├── challans/
│   │   ├── jobs/
│   │   ├── dispatch/
│   │   └── invoices/
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   └── pipes/
│   ├── config/
│   │   └── database.config.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma
├── test/
├── .env
├── .gitignore
├── nest-cli.json
├── package.json
└── tsconfig.json
```

### 8. Create Core Services

**Prisma Service** (`src/prisma/prisma.service.ts`):

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**Auth Module** (`src/modules/auth/auth.service.ts`):

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
```

### 9. Run Backend

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

Backend will run on `http://localhost:3001`

---

## Frontend Setup (Next.js)

### 1. Create Frontend Project

```bash
# Go back to root
cd ..

# Create Next.js app
npx create-next-app@latest frontend

# Configuration options:
# ✔ Would you like to use TypeScript? Yes
# ✔ Would you like to use ESLint? Yes
# ✔ Would you like to use Tailwind CSS? Yes
# ✔ Would you like to use `src/` directory? Yes
# ✔ Would you like to use App Router? Yes
# ✔ Would you like to customize the default import alias? No

cd frontend
```

### 2. Install Core Dependencies

```bash
# UI and state management
npm install zustand
npm install @tanstack/react-query
npm install react-hook-form zod @hookform/resolvers

# Icons and utilities
npm install lucide-react
npm install date-fns
npm install clsx tailwind-merge

# Charts
npm install recharts

# HTTP client
npm install axios
```

### 3. Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── vendors/
│   │   │   ├── challans/
│   │   │   ├── jobs/
│   │   │   ├── dispatch/
│   │   │   ├── invoices/
│   │   │   └── layout.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   └── table.tsx
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── footer.tsx
│   │   └── features/
│   │       ├── challan-form.tsx
│   │       ├── process-update.tsx
│   │       └── vendor-card.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   └── use-toast.ts
│   ├── store/
│   │   ├── auth-store.ts
│   │   └── app-store.ts
│   └── types/
│       └── index.ts
├── public/
├── .env.local
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

### 4. Configure Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_NAME=Aaniry VMS
```

### 5. Create API Client

**`src/lib/api.ts`**:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 6. Create Auth Store

**`src/store/auth-store.ts`**:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('access_token', token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### 7. Run Frontend

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Frontend will run on `http://localhost:3000`

---

## Development Workflow

### Daily Development Cycle

1. **Morning:**
   ```bash
   # Start infrastructure
   docker-compose up -d
   
   # Start backend
   cd backend && npm run start:dev
   
   # Start frontend (new terminal)
   cd frontend && npm run dev
   ```

2. **During Development:**
   - Backend changes auto-reload via NestJS
   - Frontend changes auto-reload via Next.js Fast Refresh
   - Database changes via Prisma migrations

3. **Evening:**
   ```bash
   # Commit your work
   git add .
   git commit -m "feat: implemented challan creation"
   git push
   
   # Stop infrastructure (optional)
   docker-compose down
   ```

### Common Tasks

**Add New API Endpoint:**
```bash
cd backend

# Generate new module
nest g module modules/challans
nest g controller modules/challans
nest g service modules/challans
```

**Add New Page:**
```bash
cd frontend/src/app/(dashboard)

# Create new directory and page
mkdir challans
touch challans/page.tsx
```

**Database Changes:**
```bash
cd backend

# Edit prisma/schema.prisma
# Then run:
npx prisma migrate dev --name add_new_table

# Or just push changes without migration:
npx prisma db push
```

---

## Testing

### Backend Testing

```bash
cd backend

# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend Testing

```bash
cd frontend

# Install testing libraries
npm install -D @testing-library/react @testing-library/jest-dom jest

# Run tests
npm run test
```

---

## Debugging

### VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

### Database Debugging

```bash
# Connect to PostgreSQL
docker exec -it aaniry-vms-db psql -U aaniry -d aaniry_vms

# Common queries
\dt                    # List tables
\d users              # Describe table
SELECT * FROM users;  # Query data

# Exit
\q
```

### Redis Debugging

```bash
# Connect to Redis
docker exec -it aaniry-vms-redis redis-cli

# Common commands
KEYS *                # List all keys
GET key_name          # Get value
FLUSHALL              # Clear all data

# Exit
exit
```

---

## Deployment Preparation

### Environment-Specific Configs

**Development** (`.env.development`):
```env
NODE_ENV=development
DATABASE_URL=postgresql://aaniry:aaniry_dev_2026@localhost:5432/aaniry_vms
```

**Production** (`.env.production`):
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/aaniry_vms
JWT_SECRET=strong-random-secret-key
```

### Build Commands

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
npm start
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Prisma Issues

```bash
# Reset database
npx prisma migrate reset

# Regenerate client
npx prisma generate

# View database in browser
npx prisma studio
```

---

## Next Steps

1. **Complete Authentication Module**
   - Implement JWT strategy
   - Add role-based guards
   - Create login/logout endpoints

2. **Build Core Features**
   - Start with vendor onboarding
   - Then delivery challan creation
   - Then job tracking

3. **Add UI Components**
   - Create reusable button/input components
   - Build data tables
   - Add forms with validation

4. **Implement Business Logic**
   - Challan number generation
   - Process flow engine
   - Notification system

---

## Helpful Resources

- **NestJS Docs:** https://docs.nestjs.com/
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **React Query:** https://tanstack.com/query/latest

---

## Support

For questions or issues:
- Create an issue in the repository
- Check the implementation roadmap document
- Review the database schema

---

**Happy Coding! 🚀**
