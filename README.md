# Lendr

An inventory and borrowing management system built with **FastAPI** (backend) and **Next.js** (frontend), backed by **PostgreSQL**.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [Option A — Docker (Recommended)](#option-a--docker-recommended)
  - [Option B — Local Development](#option-b--local-development)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Project Structure](#project-structure)
- [Test Data Scripts](#test-data-scripts)

---

## Overview

Lendr tracks equipment/items and manages borrow requests through a full lifecycle: **request → approve → release → return**. It provides:

- JWT-based authentication with session persistence via `localStorage`
- Role-based user management (admin, dispatch, inventory manager, accountant, finance manager, viewer)
- Inventory management with configurable stock-status thresholds
- POS-style batch borrow interface — select a borrower, build a cart, submit multiple items at once
- Borrow request workflow with approve / release / return actions
- Dashboard with live metrics (total equipment, items borrowed, active users, low stock)
- System configuration key-value store with category support
- Soft-delete with restore on all entities
- Global consistent response envelope (`GenericResponse`) including timestamps and pagination metadata
- Interactive API docs via Swagger UI

---

## Architecture

| Layer     | Technology                                               | Port  |
|-----------|----------------------------------------------------------|-------|
| Frontend  | Next.js 16, React 19, TypeScript, Tailwind CSS 4         | 3000  |
| Backend   | FastAPI, SQLModel, Uvicorn                               | 8000  |
| Database  | PostgreSQL 15                                            | 5432  |
| DB Admin  | Adminer (optional)                                       | 8080  |

> **Note:** The backend defaults to port **8000** when run locally with `uvicorn main:app --reload`. The Docker Compose service also exposes port 8000. The frontend `NEXT_PUBLIC_API_URL` should point to the backend accordingly.

---

## Prerequisites

### For Docker setup (recommended)

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+

### For local setup

- [Python](https://www.python.org/downloads/) 3.11+
- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/download/) 15+
- `pip` and `npm` (bundled with Python and Node.js respectively)

---

## Setup

### Option A — Docker (Recommended)

This spins up all services (database, backend, frontend, Adminer) in containers.

**1. Clone the repository**

```bash
git clone <repository-url>
cd lendr
```

**2. Create the environment file**

Create `.env.local` in the project root:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=lendr

# Backend
DATABASE_URL=postgresql+psycopg2://postgres:your_secure_password@postgres:5432/lendr
SECRET_KEY=your_super_secret_jwt_key_change_this_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=false
```

> Generate a strong `SECRET_KEY` with: `python -c "import secrets; print(secrets.token_hex(32))"`

**3. Build and start all services**

```bash
docker compose up --build
```

**4. Run database migrations**

In a separate terminal, after the containers are up:

```bash
docker compose exec backend alembic upgrade head
```

**5. Access the services**

| Service        | URL                          |
|----------------|------------------------------|
| Frontend       | http://localhost:3000        |
| Backend API    | http://localhost:8000        |
| API Docs       | http://localhost:8000/docs   |
| Adminer (DB)   | http://localhost:8080        |

---

### Option B — Local Development

Run each service directly on your machine without Docker.

#### Step 1 — Set up PostgreSQL

Create a database for the project:

```bash
psql -U postgres
CREATE DATABASE lendr;
\q
```

#### Step 2 — Set up the Backend

**Navigate to the backend directory:**

```bash
cd backend
```

**Create and activate a virtual environment:**

```bash
python -m venv .venv
source .venv/bin/activate        # Linux / macOS
.venv\Scripts\activate           # Windows
```

**Install dependencies:**

```bash
pip install -r requirements.txt
```

**Create the environment file:**

Create `.env.local` inside the `backend/` directory (or in the project root — the app auto-discovers it):

```env
DATABASE_URL=postgresql+psycopg2://postgres:your_password@localhost:5432/lendr
SECRET_KEY=your_super_secret_jwt_key_change_this_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=true
```

**Run database migrations:**

```bash
alembic upgrade head
```

**Start the backend server:**

```bash
uvicorn main:app --reload
```

The API will be available at http://localhost:8000 and interactive docs at http://localhost:8000/docs.

#### Step 3 — Set up the Frontend

Open a new terminal and navigate to the project root:

```bash
cd lendr   # project root (not backend/)
```

**Install dependencies:**

```bash
npm install
```

**Start the development server:**

```bash
npm run dev
```

The frontend will be available at http://localhost:3000.

> The frontend reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`) to reach the backend. You can set this in a `.env.local` at the project root if needed.

---

## Environment Variables

| Variable                      | Required | Default      | Description                                      |
|-------------------------------|----------|--------------|--------------------------------------------------|
| `DATABASE_URL`                | Yes      | —            | PostgreSQL connection string (psycopg2 format)   |
| `SECRET_KEY`                  | Yes      | —            | Secret key for signing JWT tokens                |
| `ALGORITHM`                   | No       | `HS256`      | JWT signing algorithm                            |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No       | `30`         | JWT token lifetime in minutes                    |
| `DEBUG`                       | No       | `false`      | Enable SQLAlchemy query logging                  |
| `APP_HOST`                    | No       | `0.0.0.0`    | Host the backend binds to                        |
| `APP_PORT`                    | No       | `5000`       | Port the backend listens on (Docker only)        |
| `POSTGRES_USER`               | Docker   | `postgres`   | PostgreSQL username (Docker Compose only)        |
| `POSTGRES_PASSWORD`           | Docker   | `password`   | PostgreSQL password (Docker Compose only)        |
| `POSTGRES_DB`                 | Docker   | `lendr`      | PostgreSQL database name (Docker Compose only)   |
| `NEXT_PUBLIC_API_URL`         | No       | `http://localhost:8000` | Backend base URL used by the frontend |

The backend resolves environment variables from `.env.local` first, then `.env`, then the system environment. For Docker, a single `.env.local` in the project root is used by all services.

---

## Database Migrations

Migrations are managed with **Alembic**. All commands run from inside the `backend/` directory (or via `docker compose exec backend`).

```bash
# Apply all pending migrations
alembic upgrade head

# Roll back the last migration
alembic downgrade -1

# Generate a new migration after model changes
alembic revision --autogenerate -m "describe your change"

# View migration history
alembic history
```

**With Docker:**

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend alembic revision --autogenerate -m "describe your change"
```

---

## API Reference

The full interactive API documentation is available at **http://localhost:8000/docs** (Swagger UI) when the backend is running.

All responses use a consistent `GenericResponse` envelope:

```json
{
  "status": "success",
  "message": "...",
  "timestamp": "03/13/2026 - 10:00:00",
  "path": "/api/...",
  "method": "GET",
  "data": { ... },
  "meta": { "total": 100, "limit": 20, "offset": 0 }
}
```

### Endpoints Summary

| Module        | Method | Path                                          | Auth | Description                            |
|---------------|--------|-----------------------------------------------|------|----------------------------------------|
| Auth          | POST   | `/api/auth/login`                             | No   | Login — returns JWT access token       |
| Auth          | GET    | `/api/auth/me`                                | Yes  | Get the currently authenticated user   |
| Users         | POST   | `/api/users/register`                         | No   | Register a new user                    |
| Users         | GET    | `/api/users`                                  | Yes  | List all users (paginated)             |
| Users         | GET    | `/api/users/{user_id}`                        | Yes  | Get a specific user                    |
| Users         | PATCH  | `/api/users/{user_id}`                        | Yes  | Update a user                          |
| Users         | DELETE | `/api/users/{user_id}`                        | Yes  | Soft-delete a user                     |
| Users         | POST   | `/api/users/{user_id}/restore`                | Yes  | Restore a soft-deleted user            |
| Inventory     | POST   | `/api/inventory/items`                        | Yes  | Create an inventory item               |
| Inventory     | GET    | `/api/inventory/items`                        | Yes  | List all items (paginated)             |
| Inventory     | GET    | `/api/inventory/items/{item_id}`              | Yes  | Get a specific item                    |
| Inventory     | PATCH  | `/api/inventory/items/{item_id}`              | Yes  | Update an item                         |
| Inventory     | DELETE | `/api/inventory/items/{item_id}`              | Yes  | Soft-delete an item                    |
| Inventory     | POST   | `/api/inventory/items/{item_id}/restore`      | Yes  | Restore a soft-deleted item            |
| Borrowing     | POST   | `/api/borrowing/requests`                     | Yes  | Create a single borrow request         |
| Borrowing     | POST   | `/api/borrowing/batch`                        | Yes  | Create multiple borrow requests at once|
| Borrowing     | GET    | `/api/borrowing/requests`                     | Yes  | List all borrow requests (paginated)   |
| Borrowing     | POST   | `/api/borrowing/requests/{id}/approve`        | Yes  | Approve a pending request              |
| Borrowing     | POST   | `/api/borrowing/requests/{id}/release`        | Yes  | Mark an approved request as released   |
| Borrowing     | POST   | `/api/borrowing/requests/{id}/return`         | Yes  | Mark a released request as returned    |
| Dashboard     | GET    | `/api/dashboard/stats`                        | Yes  | Platform overview metrics              |
| Dashboard     | GET    | `/api/dashboard/recent`                       | Yes  | Most recent borrow activity            |
| Configuration | GET    | `/api/config`                                 | Yes  | List all system settings               |
| Configuration | POST   | `/api/config`                                 | Yes  | Create a system setting                |
| Configuration | PATCH  | `/api/config/{key}`                           | Yes  | Update a system setting by key         |

**Authentication:** Include the JWT token in every authenticated request:

```
Authorization: Bearer <your_token>
```

**Borrow request lifecycle:**

```
pending → approved → released → returned
```

---

## Frontend Pages

All dashboard pages are protected by `AuthGuard` and require a valid JWT session. The layout includes a fixed `Sidebar` (navigation) and a sticky `Header` (user info, logout).

| Route        | Page              | Description                                                               |
|--------------|-------------------|---------------------------------------------------------------------------|
| `/login`     | Login             | Username/password form. Stores JWT in `localStorage` on success.         |
| `/register`  | Register          | Multi-step form (credentials → personal info → role). No auth required.  |
| `/`          | Dashboard         | Live stats cards (equipment, borrowed, active users, low stock) + recent activity feed. |
| `/inventory` | Inventory         | Full CRUD table for equipment items. Inline modal for create/edit. Search + soft-delete. |
| `/borrows`   | Borrow History    | List of all borrow requests with status filter. Approve/release/return actions per row. |
| `/pos`       | POS / Borrow      | Cart-style interface. Select a borrower, search & add items, set quantities, submit as a batch. |
| `/settings`  | Settings          | Key-value system configuration manager. Create and update settings by key. |

**Shared frontend infrastructure:**

- `AuthContext` — React context providing the current user, `loading` state, `logout`, and `refreshUser` throughout the app.
- `AuthGuard` — Wraps the dashboard layout; redirects unauthenticated users to `/login`.
- `api` client (`src/lib/api.ts`) — Thin typed fetch wrapper that attaches the JWT header, handles 401 auto-logout, and raises errors with readable messages.
- Toast notifications via **Sonner** on all user actions.
- Fonts: Inter (body) + Plus Jakarta Sans (headings) via `next/font`.

---

## Project Structure

```
lendr/
├── docker-compose.yml              # Orchestrates all services
├── Dockerfile.frontend             # Frontend container
├── package.json                    # Frontend dependencies
├── next.config.ts                  # Next.js configuration
│
├── backend/
│   ├── main.py                     # FastAPI app entry point, CORS, routers, error handlers
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile.backend          # Backend container
│   ├── alembic.ini                 # Alembic configuration
│   │
│   ├── alembic/                    # Database migrations
│   │   └── versions/               # Migration files
│   │
│   ├── core/                       # Shared application core
│   │   ├── config.py               # Settings via pydantic-settings (.env auto-discovery)
│   │   ├── database.py             # SQLAlchemy engine & session factory
│   │   ├── deps.py                 # FastAPI dependencies (JWT auth → current user)
│   │   ├── base_model.py           # SQLModel base (UUID PK, timestamps, soft-delete)
│   │   ├── base_service.py         # Generic CRUD service (get, get_all, create, update, delete, restore)
│   │   └── schemas.py              # GenericResponse envelope + pagination metadata
│   │
│   ├── systems/
│   │   └── inventory/              # Main business domain
│   │       ├── models/
│   │       │   ├── user.py         # User table (user_id, role, hashed_password, …)
│   │       │   ├── inventory.py    # InventoryItem table (item_id, qty, condition, …)
│   │       │   ├── borrow_request.py  # BorrowRequest table (lifecycle status, timestamps)
│   │       │   └── configuration.py   # SystemSetting table (key/value store)
│   │       ├── schemas/            # Pydantic request/response schemas per model
│   │       ├── services/
│   │       │   ├── auth_service.py         # Login, token creation
│   │       │   ├── user_service.py         # User CRUD + uniqueness validation
│   │       │   ├── inventory_service.py    # Item CRUD + stock adjustment + status thresholds
│   │       │   ├── borrow_request_service.py  # Request lifecycle + stock deduction/restoration
│   │       │   ├── configuration_service.py   # Key-value config access
│   │       │   └── dashboard_service.py       # Aggregate stats queries
│   │       └── routers/
│   │           ├── auth.py         # /api/auth/*
│   │           ├── users.py        # /api/users/*
│   │           ├── inventory.py    # /api/inventory/*
│   │           ├── borrowing.py    # /api/borrowing/*
│   │           ├── dashboard.py    # /api/dashboard/*
│   │           └── configuration.py  # /api/config/*
│   │
│   ├── utils/
│   │   ├── security.py             # Argon2 password hashing + JWT creation/verification
│   │   ├── id_generator.py         # Sequential prefixed IDs (e.g. ITEM-000001, BRW-000042)
│   │   └── time_utils.py           # Manila (GMT+8) timezone helpers
│   │
│   └── .tests/
│       ├── test_api.py             # End-to-end smoke tests (single flow per module)
│       ├── seed_test_data.py       # Seeds realistic dummy data via the live API
│       └── cleanup_test_data.py    # Hard-deletes all test data directly via SQL
│
└── src/
    ├── app/
    │   ├── layout.tsx              # Root layout (AuthProvider, Sonner toaster, fonts)
    │   ├── globals.css
    │   ├── (auth)/                 # Unauthenticated route group
    │   │   ├── layout.tsx          # Centered dark auth shell
    │   │   ├── login/              # Login page + api.ts
    │   │   └── register/           # Multi-step register page + api.ts
    │   └── (dashboard)/            # Authenticated route group (AuthGuard + Sidebar + Header)
    │       ├── layout.tsx
    │       ├── page.tsx            # Dashboard — stats + recent activity
    │       ├── dashboard-api.ts    # Typed API calls for dashboard endpoints
    │       ├── inventory/          # Inventory CRUD page + api.ts
    │       ├── borrows/            # Borrow history & workflow page + api.ts
    │       ├── pos/                # POS batch-borrow page + api.ts
    │       └── settings/           # System settings page + api.ts
    ├── components/
    │   ├── AuthGuard.tsx           # Redirects unauthenticated users to /login
    │   ├── Sidebar.tsx             # Fixed navigation sidebar
    │   ├── Header.tsx              # Sticky header (user avatar, role, logout)
    │   └── ui/                     # Shared UI primitives (shadcn/ui)
    ├── contexts/
    │   └── AuthContext.tsx         # React context: current user, loading, logout, refreshUser
    └── lib/
        ├── api.ts                  # Fetch wrapper (auto-auth header, 401 handling, typed methods)
        ├── auth.ts                 # Token storage (localStorage), getUser, isAuthenticated
        └── utils.ts                # Shared utilities (cn, etc.)
```

---

## Test Data Scripts

Located in `backend/.tests/`. Require the backend venv to be active.

### Seed dummy data

Creates 5 users, 10 inventory items, 6 borrow requests (3 full lifecycle + 3 pending), and 3 config entries by calling the live API — exercises every relevant endpoint.

```bash
cd backend
python .tests/seed_test_data.py
```

All seeded records are prefixed with `test_` (usernames, item names) or `test.` (config keys) for easy identification.

### Remove test data

Bypasses the API and issues raw `DELETE` statements directly against the database, removing all test records in foreign-key-safe order.

```bash
cd backend
python .tests/cleanup_test_data.py
```

> Run `seed_test_data.py` after `cleanup_test_data.py` for a clean round-trip.
