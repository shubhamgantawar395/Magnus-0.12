# Aaniry VMS - Technology Stack

**Application:** Aaniry Vendor Management System  
**Version:** 1.0.0  
**Last Updated:** 2026-02-06

---

## 📋 System Requirements

### Minimum Requirements
- **OS:** Windows 10/11, macOS 10.15+, Ubuntu 20.04+
- **RAM:** 4 GB (8 GB recommended)
- **Storage:** 2 GB free space
- **Internet:** Broadband connection

### Recommended for Development
- **RAM:** 8 GB or more
- **CPU:** Multi-core processor (4+ cores)
- **Storage:** SSD with 5 GB+ free space

---

## 🔧 Core Technologies

### Runtime Environment
| Technology | Version | Required | Purpose |
|------------|---------|----------|---------|
| **Node.js** | 20.x or 24.x | ✅ Yes | JavaScript runtime |
| **npm** | 10.x+ | ✅ Yes | Package manager (comes with Node.js) |

**Installation:**
```bash
# Download from: https://nodejs.org/
# Verify installation:
node --version  # Should show v20.x.x or v24.x.x
npm --version   # Should show 10.x.x+
```

---

## 🗄️ Database

### PostgreSQL
| Component | Version | Required | Purpose |
|-----------|---------|----------|---------|
| **PostgreSQL** | 14.x, 15.x, or 16.x | ✅ Yes | Primary database |

**Installation:**
```bash
# Windows: Download from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql@16
# Ubuntu: sudo apt install postgresql-16

# Verify installation:
psql --version  # Should show PostgreSQL 14.x, 15.x, or 16.x
```

**Database Setup:**
```sql
-- Create database
CREATE DATABASE aaniry_vms;

-- Create user (optional)
CREATE USER aaniry_admin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE aaniry_vms TO aaniry_admin;
```

---

## 🎨 Frontend Stack

### Framework & Core
| Package | Version | Type | Purpose |
|---------|---------|------|---------|
| **Next.js** | 14.1.0 | Framework | React framework with SSR |
| **React** | ^18 | Library | UI library |
| **React DOM** | ^18 | Library | React rendering |
| **TypeScript** | ^5 | Language | Type-safe JavaScript |

### UI & Styling
| Package | Version | Purpose |
|---------|---------|---------|
| **Tailwind CSS** | ^3.3.0 | Utility-first CSS framework |
| **PostCSS** | ^8 | CSS processing |
| **Autoprefixer** | ^10.0.1 | CSS vendor prefixing |
| **class-variance-authority** | ^0.7.1 | CSS variant management |
| **clsx** | ^2.1.1 | Conditional classnames |
| **tailwind-merge** | ^2.6.1 | Tailwind class merging |

### UI Components
| Package | Version | Purpose |
|---------|---------|---------|
| **@radix-ui/react-slot** | ^1.2.4 | Radix UI primitives |
| **lucide-react** | ^0.330.0 | Icon library |

### State Management & Data Fetching
| Package | Version | Purpose |
|---------|---------|---------|
| **Zustand** | ^4.5.0 | State management |
| **@tanstack/react-query** | ^5.0.0 | Server state management |
| **Axios** | ^1.6.0 | HTTP client |

### Development Tools
| Package | Version | Purpose |
|---------|---------|---------|
| **ESLint** | ^8 | Code linting |
| **eslint-config-next** | 14.1.0 | Next.js ESLint config |
| **@types/node** | ^20 | Node.js TypeScript types |
| **@types/react** | ^18 | React TypeScript types |
| **@types/react-dom** | ^18 | React DOM TypeScript types |

---

## ⚙️ Backend Stack

### Framework & Core
| Package | Version | Type | Purpose |
|---------|---------|------|---------|
| **NestJS** | ^10.0.0 | Framework | Progressive Node.js framework |
| **TypeScript** | ^5.1.3 | Language | Type-safe JavaScript |
| **Node.js** | 20.x+ | Runtime | JavaScript runtime |

### NestJS Modules
| Package | Version | Purpose |
|---------|---------|---------|
| **@nestjs/common** | ^10.0.0 | Common utilities |
| **@nestjs/core** | ^10.0.0 | Core framework |
| **@nestjs/platform-express** | ^10.0.0 | Express platform adapter |
| **@nestjs/config** | ^3.2.0 | Configuration module |
| **@nestjs/jwt** | ^10.2.0 | JWT authentication |
| **@nestjs/passport** | ^10.0.3 | Passport integration |
| **@nestjs/swagger** | ^11.2.6 | API documentation |
| **@nestjs/mapped-types** | ^2.1.0 | DTO mapping utilities |

### Database & ORM
| Package | Version | Purpose |
|---------|---------|---------|
| **Prisma** | ^5.10.2 | Database ORM (dev) |
| **@prisma/client** | ^5.10.2 | Prisma client (runtime) |

### Authentication & Security
| Package | Version | Purpose |
|---------|---------|---------|
| **bcryptjs** | ^2.4.3 | Password hashing |
| **passport** | ^0.7.0 | Authentication middleware |
| **passport-jwt** | ^4.0.1 | JWT strategy for Passport |

### Validation & Transformation
| Package | Version | Purpose |
|---------|---------|---------|
| **class-validator** | ^0.14.1 | DTO validation |
| **class-transformer** | ^0.5.1 | Object transformation |

### Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| **rxjs** | ^7.8.1 | Reactive programming |
| **reflect-metadata** | ^0.1.13 | Metadata reflection |
| **exceljs** | ^4.4.0 | Excel file generation |

### Development Tools
| Package | Version | Purpose |
|---------|---------|---------|
| **@nestjs/cli** | ^10.0.0 | NestJS CLI |
| **@nestjs/schematics** | ^10.0.0 | Code generation |
| **@nestjs/testing** | ^10.0.0 | Testing utilities |
| **ts-node** | ^10.9.1 | TypeScript execution |
| **ts-loader** | ^9.4.3 | TypeScript loader |
| **tsconfig-paths** | ^4.2.0 | Path mapping |

### Testing
| Package | Version | Purpose |
|---------|---------|---------|
| **Jest** | ^29.5.0 | Testing framework |
| **ts-jest** | ^29.1.0 | TypeScript Jest preset |
| **supertest** | ^6.3.3 | HTTP testing |

### Code Quality
| Package | Version | Purpose |
|---------|---------|---------|
| **ESLint** | ^8.42.0 | Code linting |
| **@typescript-eslint/eslint-plugin** | ^6.0.0 | TypeScript ESLint rules |
| **@typescript-eslint/parser** | ^6.0.0 | TypeScript parser |
| **Prettier** | ^3.0.0 | Code formatting |
| **eslint-config-prettier** | ^9.0.0 | Prettier ESLint config |
| **eslint-plugin-prettier** | ^5.0.0 | Prettier ESLint plugin |

### Type Definitions
| Package | Version | Purpose |
|---------|---------|---------|
| **@types/bcryptjs** | ^2.4.6 | bcryptjs types |
| **@types/express** | ^4.17.17 | Express types |
| **@types/jest** | ^29.5.2 | Jest types |
| **@types/node** | ^20.3.1 | Node.js types |
| **@types/passport-jwt** | ^4.0.1 | Passport JWT types |
| **@types/supertest** | ^6.0.0 | Supertest types |

---

## 🔌 Optional Tools (Development)

### Recommended IDE
| Tool | Version | Purpose |
|------|---------|---------|
| **VS Code** | Latest | Code editor |
| **Cursor** | Latest | AI-powered code editor |

### VS Code Extensions (Recommended)
- ESLint
- Prettier
- Prisma
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- GitLens

### Database Management
| Tool | Version | Purpose |
|------|---------|---------|
| **Prisma Studio** | Included | Database GUI (built-in) |
| **pgAdmin** | 4.x+ | PostgreSQL GUI (optional) |
| **DBeaver** | Latest | Universal database tool (optional) |

### API Testing
| Tool | Version | Purpose |
|------|---------|---------|
| **Postman** | Latest | API testing (optional) |
| **Insomnia** | Latest | API testing (optional) |
| **Thunder Client** | VS Code Extension | API testing in VS Code |

---

## 📦 Installation Instructions

### 1. Install Node.js
```bash
# Download and install Node.js 20.x or 24.x from:
# https://nodejs.org/

# Verify installation
node --version
npm --version
```

### 2. Install PostgreSQL
```bash
# Windows: Download installer from postgresql.org
# macOS: brew install postgresql@16
# Ubuntu: sudo apt install postgresql-16

# Start PostgreSQL service
# Windows: Starts automatically
# macOS: brew services start postgresql@16
# Ubuntu: sudo systemctl start postgresql
```

### 3. Clone Repository
```bash
git clone https://github.com/your-username/aaniry-vms.git
cd aaniry-vms
```

### 4. Install Backend Dependencies
```bash
cd backend
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database (optional)
npx ts-node prisma/seed-comprehensive.ts
```

### 5. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 6. Configure Environment Variables
```bash
# Backend (.env)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aaniry_vms"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRATION="7d"
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"

# Frontend (.env.local)
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 7. Start Development Servers
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 🌐 Production Dependencies

### Deployment Platforms (Choose One)
| Platform | Free Tier | Best For |
|----------|-----------|----------|
| **Railway** | 500 hrs/month | Quick deployment |
| **Render** | 750 hrs/month | All-in-one solution |
| **Vercel** | Unlimited | Frontend hosting |
| **AWS** | 12 months free | Enterprise scale |

### Required for Production
- SSL Certificate (included with most platforms)
- Domain name (optional, platforms provide subdomains)
- Environment variables configured
- Database backup solution

---

## 📊 Version Compatibility Matrix

| Node.js | PostgreSQL | NestJS | Next.js | Status |
|---------|------------|--------|---------|--------|
| 20.x | 14.x - 16.x | 10.x | 14.1.0 | ✅ Tested |
| 24.x | 14.x - 16.x | 10.x | 14.1.0 | ✅ Compatible |
| 18.x | 14.x - 16.x | 10.x | 14.1.0 | ⚠️ May work |
| 16.x | 14.x - 16.x | 10.x | 14.1.0 | ❌ Not supported |

---

## 🔄 Update Strategy

### Keeping Dependencies Updated
```bash
# Check for outdated packages
npm outdated

# Update all packages (careful!)
npm update

# Update specific package
npm install package-name@latest
```

### Major Version Updates
- **Node.js:** Update every 2 years (LTS releases)
- **PostgreSQL:** Update every 1-2 years
- **NestJS:** Monitor releases, update quarterly
- **Next.js:** Update every 6 months
- **Dependencies:** Update monthly for security patches

---

## 🆘 Troubleshooting

### Node.js Version Issues
```bash
# Use nvm (Node Version Manager)
nvm install 20
nvm use 20
```

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
# Windows: services.msc → PostgreSQL
# macOS: brew services list
# Ubuntu: sudo systemctl status postgresql

# Test connection
psql -U postgres -d aaniry_vms
```

### Prisma Issues
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Port Already in Use
```bash
# Windows: Find and kill process
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux: Find and kill process
lsof -ti:3001 | xargs kill -9
```

---

## 📚 Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**Last Verified:** 2026-02-06  
**Maintained By:** Development Team
