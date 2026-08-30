# Mini Marketplace MVP

A production-grade, full-stack marketplace application built as an evaluation project. Inspired by marketplace platforms such as Adsy/Vefogix, this MVP provides a robust, multi-role transaction workflow for digital services, sponsored articles, newsletter sponsorships, and backlink placements.

---

## Table of Contents
1. [Key Features](#key-features)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Database Design & Schema](#database-design--schema)
5. [Role-Based Access Control (RBAC) & Ownership](#role-based-access-control-rbac--ownership)
6. [Order Workflow & State Machine](#order-workflow--state-machine)
7. [API Documentation](#api-documentation)
8. [Demo Credentials](#demo-credentials)
9. [Local Setup & Installation](#local-setup--installation)
10. [Automated Testing](#automated-testing)
11. [Project Directory Structure](#project-directory-structure)
12. [Architectural Decisions & Integrity Guarantees](#architectural-decisions--integrity-guarantees)

---

## Key Features

### 🛒 Buyer Experience
- **Public & Authenticated Marketplace Browsing**: Explore verified service offerings with keyword search and category filters.
- **Listing Details**: Detailed overview of deliverable descriptions, seller profiles, and price transparency.
- **Order Placement**: Place orders with a single click. The price is frozen as an authoritative snapshot at creation time.
- **Order Tracking**: Track real-time progress through clear visual status badges (`PENDING`, `APPROVED`, `COMPLETED`, `REJECTED`).

### 💼 Seller Experience
- **Listing Management**: Create, edit, and soft-deactivate listings.
- **Fulfillment Dashboard**: View incoming orders linked to own listings.
- **Order Delivery**: Mark `APPROVED` orders as `COMPLETED` once deliverables are fulfilled.

### 🛡️ Admin Experience
- **Marketplace Overview**: Real-time metrics dashboard tracking total, pending, approved, completed, and rejected orders.
- **Compliance & Approval Queue**: Review `PENDING` orders with one-click **Approve** or **Reject** actions.

---

## Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19 (Vite SPA) | Fast, modern client with React Router, Auth Context, and Vanilla CSS tokens |
| **Backend** | Node.js / Express.js | 4-tier layered architecture (Routes → Middleware → Controllers → Services) |
| **Database** | PostgreSQL | Relational storage with foreign keys, indexes, and referential constraints |
| **ORM** | Prisma ORM | Type-safe migrations, query building, connection pooling, and seeding |
| **Authentication** | JWT & bcryptjs | Stateless JWT (`sub`), bcrypt password hashing (12 salt rounds) |
| **Authorization** | Backend RBAC & Ownership | Granular role enforcement and service-level resource ownership guards |
| **Validation** | Zod | Request body, query parameter, and UUID validation schemas |

---

## System Architecture

```
   ┌────────────────────────────────────────────────────────┐
   │              React Client (SPA / Vite)                 │
   │      (Auth Context, Route Guards, Responsive UI)       │
   └───────────────────────────┬────────────────────────────┘
                               │ HTTP / JSON (Bearer JWT)
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │                 Express.js REST API                    │
   │                                                        │
   │              [Zod Validation Middleware]               │
   │                           │                            │
   │            [Auth Middleware (JWT sub)]                 │
   │            (DB Lookup: User & Role Source of Truth)    │
   │                           │                            │
   │             [RBAC & Ownership Middleware]              │
   │                           │                            │
   │                  [Controllers Layer]                   │
   │                           │                            │
   │             [Services Layer (State Machine)]           │
   └───────────────────────────┬────────────────────────────┘
                               │ Prisma ORM (Connection Pool)
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │               PostgreSQL Database                      │
   │       (Users, Listings, Orders, State Constraints)     │
   └────────────────────────────────────────────────────────┘
```

---

## Database Design & Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  BUYER
  SELLER
  ADMIN
}

enum ListingStatus {
  ACTIVE
  INACTIVE
}

enum OrderStatus {
  PENDING
  APPROVED
  REJECTED
  COMPLETED
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  name         String
  role         UserRole
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  listings     Listing[] @relation("SellerListings")
  buyerOrders  Order[]   @relation("BuyerOrders")
  sellerOrders Order[]   @relation("SellerOrders")

  @@index([role])
  @@map("users")
}

model Listing {
  id          String        @id @default(uuid())
  sellerId    String
  title       String        @db.VarChar(255)
  description String        @db.Text
  price       Decimal       @db.Decimal(10, 2)
  category    String        @db.VarChar(100)
  status      ListingStatus @default(ACTIVE)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  seller      User          @relation("SellerListings", fields: [sellerId], references: [id], onDelete: Restrict)
  orders      Order[]

  @@index([sellerId])
  @@index([status])
  @@index([category])
  @@map("listings")
}

model Order {
  id        String      @id @default(uuid())
  buyerId   String
  sellerId  String
  listingId String
  amount    Decimal     @db.Decimal(10, 2) // Frozen authoritative price snapshot
  status    OrderStatus @default(PENDING)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  buyer     User        @relation("BuyerOrders", fields: [buyerId], references: [id], onDelete: Restrict)
  seller    User        @relation("SellerOrders", fields: [sellerId], references: [id], onDelete: Restrict)
  listing   Listing     @relation(fields: [listingId], references: [id], onDelete: Restrict)

  @@index([buyerId])
  @@index([sellerId])
  @@index([listingId])
  @@index([status])
  @@map("orders")
}
```

---

## Role-Based Access Control (RBAC) & Ownership

| Role | Permitted Actions | Prohibited Actions | Backend Ownership Check |
| :--- | :--- | :--- | :--- |
| **BUYER** | • Browse `ACTIVE` listings<br>• View listing details<br>• Place orders on `ACTIVE` listings<br>• View own orders | • Cannot create/edit/deactivate listings<br>• Cannot approve/reject/complete orders<br>• Cannot view other buyers' orders<br>• Cannot access admin endpoints | `order.buyerId === authenticatedUser.id` |
| **SELLER** | • Create listings<br>• View own listings (`ACTIVE` & `INACTIVE`)<br>• Edit own listings<br>• Deactivate own listings<br>• View incoming orders for own listings<br>• Mark `APPROVED` orders as `COMPLETED` | • Cannot order own listing (`sellerId !== buyerId`)<br>• Cannot modify other sellers' listings<br>• Cannot approve/reject orders<br>• Cannot complete other sellers' orders<br>• Cannot access admin endpoints | `listing.sellerId === authenticatedUser.id`<br>`order.sellerId === authenticatedUser.id` |
| **ADMIN** | • View all marketplace orders (with status filters)<br>• Approve `PENDING` orders (`PENDING` → `APPROVED`)<br>• Reject `PENDING` orders (`PENDING` → `REJECTED`) | • Cannot create listings or place orders<br>• Cannot mark orders `COMPLETED`<br>• Strictly scoped to order administration (no extraneous CRUD) | Global marketplace visibility |

---

## Order Workflow & State Machine

```
                 ┌──────────────┐
                 │   PENDING    │ (Created by BUYER)
                 └──────┬───────┘
                        │
          ┌─────────────┴─────────────┐
          │ (Admin Approve)           │ (Admin Reject)
          ▼                           ▼
   ┌──────────────┐            ┌──────────────┐
   │   APPROVED   │            │   REJECTED   │ [Terminal State]
   └──────┬───────┘            └──────────────┘
          │ (Seller Complete)
          ▼
   ┌──────────────┐
   │  COMPLETED   │ [Terminal State]
   └──────────────┘
```

### Transition Enforcement Matrix:
| From State | Target State | Actor | Valid? | Error on Violation |
| :--- | :--- | :--- | :--- | :--- |
| `[None]` | `PENDING` | `BUYER` | **Yes** | — |
| `PENDING` | `APPROVED` | `ADMIN` | **Yes** | — |
| `PENDING` | `REJECTED` | `ADMIN` | **Yes** | — |
| `APPROVED` | `COMPLETED`| `SELLER` (Listing Owner) | **Yes** | — |
| `PENDING` | `COMPLETED`| Any | **No** | `409 Conflict` (Must be approved first) |
| `REJECTED` | `APPROVED` | Any | **No** | `409 Conflict` (Terminal state) |
| `REJECTED` | `COMPLETED`| Any | **No** | `409 Conflict` (Terminal state) |
| `COMPLETED`| `*` (Any)  | Any | **No** | `409 Conflict` (Terminal state) |

---

## API Documentation

All responses follow a consistent JSON envelope:
- **Success**: `{ "success": true, "message": "...", "data": { ... } }`
- **Error**: `{ "success": false, "error": { "code": 400, "message": "...", "details": [...] } }`

### Authentication (`/api/auth`)
| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | None | Public | Register new `BUYER` or `SELLER` (`ADMIN` blocked) |
| `POST` | `/api/auth/login` | None | Public | Authenticate user & issue JWT |
| `POST` | `/api/auth/logout` | JWT | Any | Acknowledge session termination |
| `GET` | `/api/auth/me` | JWT | Any | Return authoritative user record from DB |

### Listings (`/api/listings`)
| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/listings` | None | Public | Browse `ACTIVE` marketplace listings |
| `GET` | `/api/listings/:id` | None | Public | Get single listing details with seller info |
| `GET` | `/api/listings/seller/my` | JWT | `SELLER` | Get seller's own listings (ACTIVE & INACTIVE) |
| `POST` | `/api/listings` | JWT | `SELLER` | Create a new listing |
| `PUT` | `/api/listings/:id` | JWT | `SELLER` | Update listing (verified ownership) |
| `DELETE`| `/api/listings/:id` | JWT | `SELLER` | Soft-deactivate listing (`ACTIVE` → `INACTIVE`) |

### Orders (`/api/orders`)
| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | JWT | `BUYER` | Place order (DB price snapshot, self-order check) |
| `GET` | `/api/orders` | JWT | `BUYER`, `SELLER` | Get scoped orders (Buyer: placed; Seller: incoming) |
| `GET` | `/api/orders/:id` | JWT | `BUYER`, `SELLER`, `ADMIN` | Get order details with ownership verification |
| `PATCH`| `/api/orders/:id/complete` | JWT | `SELLER` | Mark `APPROVED` order as `COMPLETED` |

### Admin (`/api/admin`)
| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/orders` | JWT | `ADMIN` | List all marketplace orders (with `?status=` filter) |
| `PATCH`| `/api/admin/orders/:id/approve` | JWT | `ADMIN` | Transition `PENDING` → `APPROVED` |
| `PATCH`| `/api/admin/orders/:id/reject` | JWT | `ADMIN` | Transition `PENDING` → `REJECTED` |

---

## Demo Credentials

Pre-seeded demo accounts for instant evaluation:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **🛡️ ADMIN** | `admin@test.com` | `Password123!` | Marketplace moderator & order approval authority |
| **💼 SELLER** | `seller@test.com` | `Password123!` | Publisher with 4 pre-seeded active service listings |
| **🛒 BUYER** | `buyer@test.com` | `Password123!` | Marketplace buyer |

> **Tip**: The login page includes **⚡ One-Click Demo Buttons** to log in as any role instantly!

---

## Local Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [Docker Desktop](https://www.docker.com/) (for PostgreSQL) or a local PostgreSQL instance

### 2. Start PostgreSQL Database
```powershell
docker run -d --name marketplace-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=marketplace_db -p 5432:5432 postgres:17
```

### 3. Backend Setup
```powershell
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run prisma:seed
npm run dev
```
*Backend runs on `http://localhost:5000`*.

### 4. Frontend Setup
```powershell
cd frontend
cp .env.example .env
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*.

---

## Automated Testing

The backend includes a comprehensive suite of **92 integration and end-to-end tests** covering all security constraints, state machine transitions, and RBAC rules using Node's native test runner:

```powershell
cd backend
npm test
```

### Test Suite Summary:
- `Phase 1 Foundation Tests` (Database ping, health endpoint, centralized 404 handler)
- `Phase 2 Authentication Tests` (Registration, login, duplicate email, password hashing, JWT verification, `/api/auth/me`)
- `Phase 3 RBAC & Authorization Tests` (Role barriers, ownership verification helpers)
- `Phase 4 Listings Tests` (Seller CRUD, soft-deactivation, public active browsing, category filters)
- `Phase 5 Orders Tests` (Order creation, DB price snapshot, self-order prevention, scoped order queries)
- `Phase 6 Order Workflow Tests` (Admin approve/reject, seller complete, forbidden transition locks)
- `Phase 8 Full Integration & Hardening Suite` (Multi-role end-to-end flows, terminal state locks, boundary security)

---

## Project Directory Structure

```
marketplace-mvp/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            # PostgreSQL schema with enums & indexes
│   │   └── seed.js                  # Database seeder (Admin, Seller, Buyer, Listings)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js               # Environment config
│   │   │   └── prisma.js            # PrismaClient singleton instance
│   │   ├── constants/
│   │   │   └── roles.js             # UserRole, ListingStatus, OrderStatus
│   │   ├── controllers/
│   │   │   ├── admin.controller.js
│   │   │   ├── auth.controller.js
│   │   │   ├── listing.controller.js
│   │   │   └── order.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js   # JWT verification & DB-driven identity hydration
│   │   │   ├── error.middleware.js  # Centralized error & 404 handler
│   │   │   ├── rbac.middleware.js   # authorize(...allowedRoles)
│   │   │   └── validate.middleware.js# Zod schema validation
│   │   ├── routes/
│   │   │   ├── admin.routes.js
│   │   │   ├── auth.routes.js
│   │   │   ├── index.js
│   │   │   ├── listing.routes.js
│   │   │   └── order.routes.js
│   │   ├── services/
│   │   │   ├── admin.service.js
│   │   │   ├── auth.service.js
│   │   │   ├── listing.service.js
│   │   │   └── order.service.js
│   │   ├── utils/
│   │   │   ├── api-error.js         # Custom ApiError class
│   │   │   ├── api-response.js      # Standardized JSON response helper
│   │   │   ├── ownership.js         # Resource ownership assertion helpers
│   │   │   └── password.js          # bcrypt hashing and comparison
│   │   ├── validators/
│   │   │   ├── auth.validator.js
│   │   │   ├── listing.validator.js
│   │   │   └── order.validator.js
│   │   ├── app.js                   # Express app configuration
│   │   └── server.js                # Server entrypoint with graceful shutdown
│   ├── tests/                       # 92 Automated integration & E2E tests
│   │   ├── auth.test.js
│   │   ├── e2e-integration.test.js
│   │   ├── health.test.js
│   │   ├── listings.test.js
│   │   ├── orders.test.js
│   │   ├── rbac.test.js
│   │   └── workflow.test.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/              # StatusBadge, Spinner, Alert, Modal
│   │   │   └── layout/              # Navbar
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Authentication session & state provider
│   │   ├── hooks/
│   │   │   └── useAuth.js           # Auth context consumer hook
│   │   ├── pages/
│   │   │   ├── admin/               # AdminDashboardPage
│   │   │   ├── auth/                # LoginPage, RegisterPage
│   │   │   ├── buyer/               # BuyerOrdersPage
│   │   │   ├── marketplace/         # MarketplacePage, ListingDetailPage
│   │   │   ├── seller/              # SellerDashboardPage, CreateListingPage, EditListingPage, SellerOrdersPage
│   │   │   └── NotFoundPage.jsx
│   │   ├── routes/
│   │   │   ├── AppRoutes.jsx        # Routes registry
│   │   │   └── ProtectedRoute.jsx   # Role-based route guard wrapper
│   │   ├── services/                # API client & domain service wrappers
│   │   ├── App.jsx
│   │   ├── index.css                # Global design system tokens & styles
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Architectural Decisions & Integrity Guarantees

1. **Database-Driven Role Authority**: JWTs only carry the user's ID (`sub`). The `authenticate` middleware loads the authoritative user and role from PostgreSQL on every request, guaranteeing that revoked access or changed roles apply immediately.
2. **Price Snapshot Integrity**: The frontend never supplies order amounts. The backend queries `listing.price` directly from the database and writes it to `order.amount`, permanently insulating historical order data from subsequent listing price updates.
3. **Soft-Deactivation over Physical Deletion**: `DELETE /api/listings/:id` updates `status: INACTIVE` and foreign keys enforce `onDelete: Restrict`, preserving relational data integrity across historical orders.
4. **Self-Order Prevention**: Sellers attempting to place an order on their own listing are rejected on the backend (`400 Bad Request`).
5. **Atomic Concurrency Handling**: State machine transitions use atomic conditional updates (`where: { id, status: PRECONDITION }`), throwing `409 Conflict` on concurrent or invalid transition attempts.
6. **Defense-in-Depth**: Frontend route guards and button visibility provide seamless UX, while backend middlewares (`authenticate`, `authorize`, `assertOwnership`) independently validate identity, role, and resource ownership on every protected endpoint.
