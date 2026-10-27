# Magnus VMS - Setup and Development Guide

## Prerequisites

> **CRITICAL:** This project requires Node.js 20 LTS or higher. The current system has Node.js v6.10.1 which is incompatible.

### Required Software
- **Node.js 20 LTS** - [Download here](https://nodejs.org/)
- **PostgreSQL 16+** - Can be run via Docker (recommended)
- **Docker & Docker Compose** (optional but recommended)

## Quick Start

### 1. Upgrade Node.js

1. Download Node.js 20 LTS from https://nodejs.org/
2. Run the installer
3. Restart your terminal/PowerShell
4. Verify installation:
   ```powershell
   node --version  # Should show v20.x.x
   npm --version   # Should show v10.x.x
   ```

### 2. Install Dependencies

```powershell
# Backend
cd "c:\Users\user\Desktop\magnus vms\backend"
npm install
npm install @nestjs/swagger @nestjs/mapped-types --save

# Frontend
cd "c:\Users\user\Desktop\magnus vms\frontend"
npm install
```

### 3. Start Database (Docker)

```powershell
cd "c:\Users\user\Desktop\magnus vms"
docker-compose up -d
```

This will start PostgreSQL and Redis services.

### 4. Setup Database

```powershell
cd "c:\Users\user\Desktop\magnus vms\backend"

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed database
npx prisma db seed
```

### 5. Start Development Servers

**Backend:**
```powershell
cd "c:\Users\user\Desktop\magnus vms\backend"
npm run start:dev
```

**Frontend:**
```powershell
cd "c:\Users\user\Desktop\magnus vms\frontend"
npm run dev
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation (Swagger)**: http://localhost:3001/api

## Default Credentials

After running migrations, you can log in with:
- **Email**: admin@magnus.com
- **Password**: Admin@123

## Project Structure

```
magnus vms/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # Authentication (JWT, login, register)
│   │   │   └── users/         # User management
│   │   ├── prisma/            # Prisma service
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma      # Database schema (17 models)
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js app router
│   │   ├── components/        # React components
│   │   ├── lib/               # API client, utilities
│   │   └── store/             # Zustand state management
│   ├── tailwind.config.js
│   ├── next.config.js
│   └── .env.local
└── docker-compose.yml
```

## What's Been Implemented

### Backend ✅
- ✅ Prisma schema with 17 models (PostgreSQL)
- ✅ Authentication module (JWT, login, register)
- ✅ Users module (CRUD with role-based access)
- ✅ Password hashing (bcryptjs)
- ✅ Swagger API documentation
- ✅ Role-based guards (admin, customer, vendor)

### Frontend ✅
- ✅ Tailwind CSS configuration with custom design system
- ✅ Next.js configuration
- ✅ API client with axios (auth interceptors)
- ✅ Zustand authentication store
- ✅ React Query setup

### Pending Implementation
- ⏳ Feature modules (Customers, Vendors, Challans, Jobs, Dispatch, Invoices)
- ⏳ Frontend pages (login, dashboards, management pages)
- ⏳ UI component library

## Development Workflow

1. **Backend Development**:
   - API endpoints are in `backend/src/modules/`
   - Add new modules with `nest g module <name>`
   - Update Prisma schema in `backend/prisma/schema.prisma`
   - Run `npx prisma migrate dev` after schema changes

2. **Frontend Development**:
   - Pages are in `frontend/src/app/`
   - Components in `frontend/src/components/`
   - Use the API client from `frontend/src/lib/api-client.ts`

3. **Testing**:
   - Backend: `npm test`
   - Frontend: `npm run lint`

## Troubleshooting

### "Cannot find module '@prisma/client'"
Run `npx prisma generate` in the backend directory.

### "Module '@nestjs/swagger' not found"
Run `npm install @nestjs/swagger @nestjs/mapped-types` in the backend directory.

### Database connection errors
Ensure PostgreSQL is running via Docker: `docker-compose up -d`

### Port already in use
- Backend (3001): Change `PORT` in `backend/.env`
- Frontend (3000): Next.js will auto-increment to 3001, 3002, etc.

## Next Steps

1. **Upgrade Node.js to v20 LTS** (critical)
2. Install missing npm packages
3. Generate Prisma client
4. Run database migrations
5. Start development servers
6. Implement remaining feature modules
7. Build frontend pages

## Support

For issues or questions, refer to:
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
