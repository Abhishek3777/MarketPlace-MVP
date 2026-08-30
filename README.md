# Mini Marketplace MVP

A full-stack marketplace web application built with Node.js, Express, PostgreSQL, Prisma ORM, and React (Vite).

## Tech Stack
- **Backend**: Node.js, Express.js, Prisma ORM, PostgreSQL, JWT, bcryptjs, Zod
- **Frontend**: React (Vite SPA), React Router, Vanilla CSS
- **Database**: PostgreSQL (with Docker support)

## Architecture Overview
- **Layered Backend Architecture**: Routes → Middlewares (Zod Validation, Auth, RBAC) → Controllers → Services → Prisma ORM → PostgreSQL.
- **Database as Source of Truth**: JWT carries identity (`sub`); user record and role are validated directly against PostgreSQL on protected requests.
- **Strict RBAC & Resource Ownership**: Distinct permissions for `BUYER`, `SELLER`, and `ADMIN`.
- **Order State Machine**: `PENDING` → `APPROVED` → `COMPLETED` or `PENDING` → `REJECTED`.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker (for PostgreSQL) or local PostgreSQL instance

### 1. Database Setup
```bash
docker run -d --name marketplace-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=marketplace_db -p 5432:5432 postgres:17
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Running Tests
```bash
cd backend
npm test
```
