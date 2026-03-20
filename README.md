# Lendr

An inventory and borrowing management system built with **FastAPI** (backend) and **Next.js** (frontend), backed by **PostgreSQL**.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Concepts](#core-concepts)
  - [Database Schema](#database-schema)
  - [System Architecture](#system-architecture)
  - [Authentication & Authorization](#authentication--authorization)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [Option A — Docker (Recommended)](#option-a--docker-recommended)
  - [Option B — Local Development](#option-b--local-development)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [API Reference](#api-reference)
- [Business Logic](#business-logic)
- [Frontend Pages](#frontend-pages)
- [Project Structure](#project-structure)
- [Development Guide](#development-guide)
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

## Core Concepts

### Database Schema

The system consists of three main domains:

#### 1. **Authentication & Users** (`systems/admin`)
- **users**: Core user entity with auto-generated `user_id` (e.g., "USER-AB12CD")
  - Fields: username, email, hashed_password, first_name, last_name, middle_name, contact_number
  - Role: admin, inventory_manager, dispatch, accountant, finance_manager, viewer, borrower
  - Shift type: "day" or "night" (used for operational access control)
  - Employee ID: Optional link to HR systems
  - Soft delete with active-only unique indexes

- **user_sessions / borrower_sessions**: Session persistence for JWT tokens
  - Tracks session_id, user_uuid, issued_at, expires_at, is_revoked
  - Used to invalidate compromised tokens

- **system_settings**: Key-value configuration store
  - Unique constraint on (key, category) pair for flexible extensibility
  - Used for configurable system parameters (status workflows, item types, etc.)

- **audit_log**: System-wide audit trail for compliance
  - Tracks entity changes: create, update, delete, restore, approve, release, etc.
  - Stores old_value, new_value, actor_user_id, actor_employee_id

#### 2. **Inventory System** (`systems/inventory`)
- **inventory**: Core catalog of equipment/items
  - Auto-generated `item_id` (e.g., "ITEM-ABC123")
  - Fields: name, category, item_type, classification, condition
  - Tracking: total_qty, available_qty, is_trackable (boolean)
  - is_trackable determines if individual units must be tracked (via serial numbers)
  - Unique constraint on (name, classification, item_type) when active

- **inventory_units**: Individual tracked items (when is_trackable=true)
  - Auto-generated `unit_id` (e.g., "UNT-XYZ789")
  - Fields: serial_number (unique), status, condition, expiration_date
  - Statuses: available, borrowed, maintenance, retired, consumed, expired, discarded
  - Status transitions validated by business rules (not all transitions allowed)
  - Expiration dates for consumable/perishable item types

- **inventory_movements**: Audit trail of all inventory changes
  - Type: stock_in, stock_out, adjustment, borrow_assignment, borrow_return, etc.
  - Tracks: qty_before, qty_after, qty_changed, actor tracking
  - Reference: related_request_id (for borrow movements)

- **inventory_batches**: Bulk receipt tracking
  - Tracks batch_number, supplier, received_qty, received_date
  - Used for origin tracking and bulk imports

#### 3. **Borrow Request System** (`systems/inventory`)
- **borrow_requests**: Main borrowing workflow entity
  - Auto-generated `request_id` (e.g., "BRE-REQ12345")
  - FK: borrower_uuid → users.id
  - Status workflow: pending → approved → [sent_to_warehouse → warehouse_approved] → released → returned
  - Request channel: "inventory_manager" (staff) or "borrower_portal" (self-service)
  - Approval channel: Labels flow path (standard, warehouse_shortage_auto, emergency_bypass, etc.)
  - Timestamps: request_date, approved_at, released_at, returned_at
  - Compliance tracking: is_emergency, compliance_followup_required, compliance_followup_notes
  - Unique constraint: One active request per borrower

- **borrow_request_items**: Multi-item support (Phase 7a)
  - FK: borrow_uuid, item_uuid
  - Tracks qty_requested per item
  - Enables requests for multiple different items in one transaction
  - Backward compatibility: First item maps to legacy item_id field

- **borrow_request_units**: Individual unit assignments for trackable items
  - FK: borrow_uuid, unit_uuid
  - Status: pending, assigned, returned, damaged, lost
  - Tracks assigned_at, returned_at timestamps

- **borrow_request_events**: Audit trail of workflow transitions
  - Types: approve, reject, release, return, reopen, warehouse_send, warehouse_approve, etc.
  - Tracks actor_user_id, note, occurred_at

- **warehouse_approval**: Warehouse-specific approval data
  - FK: borrow_uuid
  - Optional relationship for shortage routing workflows

### System Architecture

The backend follows a **layered architecture** with clear separation of concerns:

```
Routes (FastAPI routers)
  ↓ (dependency injection)
Services (business logic, database queries)
  ↓
Models (SQLModel ORM entities)
  ↓
Database (PostgreSQL)
```

**Layer Breakdown:**

1. **Routers** (`systems/*/routers/*.py`)
   - FastAPI route handlers
   - Request validation via Pydantic schemas
   - Dependency injection for auth, database session, permissions
   - Response formatting via `GenericResponse` envelope
   - HTTP status codes and error handling

2. **Services** (`systems/*/services/*.py`)
   - Business logic and workflow orchestration
   - Database CRUD operations via SQLModel
   - Cross-entity relationship handling
   - Audit logging and event emission
   - Configuration validation
   - Base service template: `BaseService[Model, CreateSchema, UpdateSchema]`

3. **Models** (`systems/*/models/*.py`)
   - SQLModel ORM entities (inherits from BaseModel)
   - Base fields: id (UUID), created_at, updated_at, is_deleted, deleted_at
   - Database relationships and constraints
   - Foreign keys and indexes

4. **Schemas** (`systems/*/schemas/*.py`)
   - Pydantic models for request/response validation
   - Separate schemas: Create, Update, Read (public API)
   - Field serializers for date formatting
   - Model validators for derived fields

### Authentication & Authorization

The system uses **JWT + Session-based hybrid authentication**:

- **JWT Token**: Signed with SECRET_KEY (HS256), payload contains {sub: user_id, session_id}
- **Sessions**: Persisted in database (user_sessions / borrower_sessions) to enable token revocation
- **Expiry**: ACCESS_TOKEN_EXPIRE_MINUTES (default 30 minutes)

**Role-Based Access Control (RBAC):**
- Permission format: `"system:resource:action"` (e.g., "inventory:items:manage")
- Router-level checks: `require_system_access("inventory")`
- Endpoint-level checks: `require_permission("inventory:items:view")`
- RBAC service: Singleton managing all permission lookups

**Security Guards:**
- `shift_guard`: Prevents non-admin night-shift users from write operations (business rule)
- `require_permission`: Validates user has required permission
- All write operations require both guards + router-level + endpoint-level checks

**Public API Design:**
- No UUID exposure (all responses use human-readable IDs)
- Schemas exclude internal audit fields (actor tracking)
- Paginated list endpoints: query params (page, per_page), response includes total count

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

**4. Run database migrations and seed configuration**

In a separate terminal, after the containers are up:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python data/seed_configuration.py
```

**5. Access the services**

| Service        | URL                          | Login              |
|----------------|------------------------------|--------------------|
| Frontend       | http://localhost:3000        | admin123/admin123  |
| Backend API    | http://localhost:8000        | —                  |
| API Docs       | http://localhost:8000/docs   | —                  |
| Adminer (DB)   | http://localhost:8080        | —                  |

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

**Seed configuration and create admin user:**

```bash
python data/seed_configuration.py
```

This creates the admin123 user and seeds all system configuration settings.

**Start the backend server:**

```bash
uvicorn main:app --reload
```

The API will be available at http://localhost:8000 and interactive docs at http://localhost:8000/docs.

**Default login credentials:**
- **Username:** admin123
- **Password:** admin123

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

### System Configuration Seeding (Post-Migration)

After running migrations, populate the system with essential configuration settings:

**Locally:**

```bash
cd backend
# Pre-creates admin123 user + seeds all configuration enums
python data/seed_configuration.py
```

**With Docker:**

```bash
docker compose exec backend python data/seed_configuration.py
```

This script:
- ✓ **Pre-creates admin123** user directly in the database (if not exists)
- ✓ **Seeds configuration categories** via API (inventory types, borrow statuses, etc.)
- ✓ **Idempotent** — safe to run multiple times
- ✓ **Logs all operations** to `.tests/logs/` for audit trail

**Complete initialization workflow:**

```bash
# Local development
cd backend
alembic upgrade head
python data/seed_configuration.py
uvicorn main:app --reload

# Docker
docker compose up -d
docker compose exec backend alembic upgrade head
docker compose exec backend python data/seed_configuration.py
```

**Access the API:**

Once seeded, login with default credentials:
- **Username:** admin123
- **Password:** admin123
- **Endpoint:** http://localhost:8000/api/auth/login

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

## Business Logic

### Inventory Management

**Item Tracking Modes:**
- **Non-trackable items**: Bulk quantity management only (e.g., bulk consumables, stationery)
  - Fields: total_qty, available_qty
  - No individual unit tracking
  - Borrow/return adjusts quantities directly

- **Trackable items**: Individual unit tracking with serial numbers (e.g., equipment, tools)
  - Requires InventoryUnit entries per physical item
  - Each unit has an optional serial_number (unique)
  - Support for condition and status tracking per unit
  - Expiration dates for consumable/perishable item types

**Unit Status Management:**
- Valid statuses: available, borrowed, maintenance, retired, consumed, expired, discarded
- Status transitions have restrictions (not all transitions allowed)
  - available → {borrowed, maintenance, retired, consumed, expired, discarded}
  - borrowed → {available, maintenance, retired, discarded}
  - Terminal states (retired, consumed, discarded) cannot transition back
- Expiration dates validated for consumable/perishable items

**Inventory Movements:**
- All stock changes logged to inventory_movements table
- Types: stock_in (receipt), stock_out (distribution), adjustment (count correction), etc.
- Actor tracking: who made the change, when, why (reason/note)
- Supports movement reversal for audit correction

**Configuration:**
- System settings in system_settings table with (key, category) uniqueness
- Categories organize settings by domain (e.g., "borrow_status", "item_type")
- Used for configurable item types, conditions, statuses, etc.

### Borrow Request Workflow

**Phase 1: Request Creation**
- Borrower or inventory manager creates request
- Multi-item support: Can request multiple items with different quantities
- Single-item tracked for backward compatibility
- Auto-generates request_id (e.g., "BRE-REQ12345")
- Validates: Borrower, item existence, borrower has no active request
- Emergency flag: Sets compliance_followup_required=true with auto-generated notes

**Phase 2: Approval**
- Inventory manager reviews request
- Can auto-detect shortages if stock insufficient
- If shortage detected + auto_route_shortage=true → Routes to warehouse
- Otherwise → Remains in approved state
- Logs approval event with actor_user_id

**Phase 3: Warehouse (Optional)**
- Only triggered if shortage detected
- Warehouse staff approves or requests provision
- Provision mode: Can create new inventory units (procure items)
- Creates procurement movement atomically with unit creation
- Transitions to warehouse_approved state

**Phase 4: Release**
- For trackable items: Individual units assigned atomically
  - Validates sufficient units available in correct condition
  - Updates unit status to "borrowed"
  - Creates unit_assignment audit events
- For non-trackable items: Logs unit_assignment_skipped event
- Emergency bypass: approved→released allowed with is_emergency=true (skips warehouse)
- Logs release event with actor_user_id

**Phase 5: Return**
- Borrower returns items
- Per-unit condition tracking (specify condition on return)
- Validates all assigned units returned
- Updates unit status back to "available"
- Logs return event, calculates returned_on_time

**Phase 6: Closure**
- Request marked as "returned"
- Compliance follow-up (if required) tracked separately
- No further transitions possible

**Request Channels:**
- "inventory_manager": Staff-initiated borrowing (POS/batch interface)
- "borrower_portal": Self-service portal requests

**Approval Channels** (labels flow path):
- "standard": Regular approve→release flow
- "warehouse_shortage_auto": Auto-routed due to shortage detection
- "warehouse_manual": Manual warehouse approval
- "warehouse_standard": Warehouse standard flow
- "warehouse_provisioned": Warehouse approval with new unit provisioning
- "emergency_bypass": Emergency approval skipping warehouse

**Compliance & Audit:**
- Emergency requests auto-marked for follow-up
- All transitions logged to borrow_request_events table
- Actor tracking: user_id (string) vs internal UUID
- Full audit trail: actor, timestamp, event type, notes

### Multi-Item Requests (Phase 7a)

**Schema:**
```python
BorrowRequestCreate(
    items: [{item_id: "ITEM-001", qty_requested: 5}, ...],
    notes: "...",
    return_at: datetime,
    is_emergency: bool
)
```

**Processing:**
- Creates BorrowRequestItem record per item
- First item maps to legacy item_id field (backward compatibility)
- Items array populated on read operations
- Serialization resolves item_uuid → item_id mappings

**Approval Workflows:**
- Each item tracked separately for shortage detection
- Unit assignment coordinates across all items
- Return validates all item units returned

### Security & Compliance

**Authentication:**
- JWT tokens with session persistence (token revocation support)
- Password hashing via bcrypt
- Username/email unique per active user

**Authorization:**
- Role-based permissions: admin, inventory_manager, dispatch, etc.
- Permission format: "system:resource:action"
- Router-level + endpoint-level checks enforced

**Business Rule Enforcement:**
- shift_guard: Prevents non-admin night-shift users from write operations
- Borrower uniqueness: One active request per borrower
- Status transition validation: Only allowed transitions permitted
- Inventory depletion prevention: Cannot release more units than available

**Audit & Compliance:**
- All user actions logged to audit_log table
- Borrow request changes tracked in borrow_request_events
- Inventory changes tracked in inventory_movements
- Emergency requests flagged for manual follow-up
- On-time return tracking for performance metrics

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
├── docker-compose.yml              # Orchestrates database, backend, frontend, adminer
├── .env.local                      # Shared environment values (Docker + local)
├── README.md
│
├── backend/
│   ├── main.py                     # FastAPI app entrypoint and router registration
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile.backend
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/               # Full migration history
│   ├── core/                       # Shared app foundation
│   │   ├── base_model.py
│   │   ├── base_service.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── deps.py
│   │   ├── schemas.py
│   │   └── models/
│   │       └── audit_log.py
│   ├── data/
│   │   └── seed_configuration.py   # Creates admin123 + seeds system settings
│   ├── systems/
│   │   ├── admin/
│   │   │   ├── models/             # user, settings, backup
│   │   │   ├── schemas/            # user, role, audit, backup schemas
│   │   │   ├── services/           # user, config, audit, backup services
│   │   │   └── routers/            # users, roles, config, audit_log, backup
│   │   ├── auth/
│   │   │   ├── models/             # user_session, borrower_session, settings
│   │   │   ├── schemas/            # auth request/response schemas
│   │   │   ├── services/           # auth, rbac, config services
│   │   │   ├── routers/            # auth and auth config endpoints
│   │   │   └── dependencies.py
│   │   ├── inventory/
│   │   │   ├── models/             # inventory, units, movements, borrow workflow models
│   │   │   ├── schemas/            # inventory/borrow/unit/movement DTOs
│   │   │   ├── services/           # inventory, borrow_request, dashboard, requested_item
│   │   │   ├── routers/            # inventory, borrowing, borrower, dashboard, audit, settings
│   │   │   └── dependencies.py
│   │   └── operations/
│   │       ├── models/
│   │       ├── schemas/
│   │       ├── services/
│   │       └── routers/
│   ├── utils/
│   │   ├── id_generator.py
│   │   ├── security.py
│   │   └── time_utils.py
│   ├── .tests/
│   │   ├── test_api.py
│   │   ├── seed_test_data.py
│   │   ├── cleanup_test_data.py
│   │   └── logs/
│   ├── .backups/
│   ├── .documentation/
│   ├── .logs/
│   └── .todo/
│
└── frontend/
    ├── Dockerfile.frontend
    ├── package.json
    ├── next.config.ts
    ├── components.json
    ├── public/
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── globals.css
        │   ├── login/
        │   │   └── page.tsx
        │   ├── register/
        │   │   └── page.tsx
        │   ├── auth/
        │   │   ├── layout.tsx
        │   │   └── login/
        │   │       ├── api.ts
        │   │       └── page.tsx
        │   ├── admin/
        │   │   ├── layout.tsx
        │   │   ├── page.tsx
        │   │   ├── dashboard/
        │   │   │   └── page.tsx
        │   │   ├── audit_logs/
        │   │   │   ├── api.ts
        │   │   │   └── page.tsx
        │   │   ├── register/
        │   │   │   ├── api.ts
        │   │   │   └── page.tsx
        │   │   └── settings/
        │   │       ├── api.ts
        │   │       └── page.tsx
        │   ├── inventory/
        │   │   ├── layout.tsx
        │   │   ├── page.tsx
        │   │   ├── dashboard/
        │   │   │   ├── dashboard-api.ts
        │   │   │   └── page.tsx
        │   │   ├── items/
        │   │   │   ├── api.ts
        │   │   │   ├── page.tsx
        │   │   │   ├── BatchManagement.tsx
        │   │   │   ├── UnitManagement.tsx
        │   │   │   └── ItemHistory.tsx
        │   │   ├── requests/
        │   │   │   ├── api.ts
        │   │   │   └── page.tsx
        │   │   ├── ledger/
        │   │   │   ├── api.ts
        │   │   │   └── page.tsx
        │   │   ├── audit_logs/
        │   │   │   ├── api.ts
        │   │   │   └── page.tsx
        │   │   └── settings/
        │   │       ├── api.ts
        │   │       └── page.tsx
        │   └── borrow_portal/
        │       ├── layout.tsx
        │       ├── login/
        │       │   ├── api.ts
        │       │   └── page.tsx
        │       └── (portal)/
        │           ├── layout.tsx
        │           ├── page.tsx
        │           ├── history/
        │           │   ├── api.ts
        │           │   └── page.tsx
        │           └── request_form/
        │               ├── api.ts
        │               └── page.tsx
        ├── components/
        │   ├── AuthGuard.tsx
        │   ├── Header.tsx
        │   ├── Sidebar.tsx
        │   └── ui/
        │       ├── button.tsx
        │       └── Pagination.tsx
        ├── contexts/
        │   └── AuthContext.tsx
        └── lib/
            ├── api.ts
            ├── auth.ts
            └── utils.ts
```

---

## Development Guide

### Adding a New API Feature

**1. Define the data model** (`systems/{domain}/models/`)
- Extend `BaseModel` for automatic id, timestamps, soft-delete
- Add relationships and indexes as needed
- Use `Field()` for constraints (unique, index, max_length, etc.)

**2. Create Pydantic schemas** (`systems/{domain}/schemas/`)
- `{EntityName}Create`: For POST requests
- `{EntityName}Update`: For PATCH requests (all fields optional)
- `{EntityName}Read`: For GET responses (public API)
- Add `@field_serializer` for date formatting
- Keep internal audit fields out of Read schema

**3. Implement business logic** (`systems/{domain}/services/`)
- Extend `BaseService[Model, CreateSchema, UpdateSchema]`
- Implement custom methods for complex queries
- Add actor tracking: `actor_id: UUID | None`
- Log audit events via `audit_service.log_action()`
- Validate configuration: `_validate_item_config()`

**4. Create API routes** (`systems/{domain}/routers/`)
- Use `APIRouter()` for modular organization
- Add `@router.post()`, `@router.get()`, etc. with response models
- Depend on `get_session`, `get_current_user`
- Apply guards: `@Depends(shift_guard)`, `@Depends(require_permission(...))`
- Use consistent response: `create_success_response(data=..., request=request)`
- Handle errors with `HTTPException(status_code=..., detail=...)`

**5. Register router in main** (`backend/main.py`)
- Import router: `from systems.{domain}.routers import router as {name}`
- Mount with auth guards: `app.include_router(router, prefix="/api/{domain}", tags=[...], dependencies=[Depends(...)])`

### Database Changes

**After model changes:**

```bash
cd backend

# Auto-generate migration
alembic revision --autogenerate -m "descriptive message"

# Review generated migration file in alembic/versions/
# Edit if needed (e.g., add constraints, fix column names)

# Apply migration
alembic upgrade head
```

**For Docker:**

```bash
docker compose exec backend alembic revision --autogenerate -m "description"
docker compose exec backend alembic upgrade head
```

### Role-Based Permission System

**Adding new permission:**

1. Define in auth system (convention: "system:resource:action")
2. Document in role policies
3. Use in routers: `Depends(require_permission("inventory:items:manage"))`

**Permission hierarchy:**
- System: admin, inventory, auth, reports
- Resource: users, items, requests, config
- Action: view, manage, delete, approve

### Schema & Validation Pattern

**Always validate at system boundaries:**

```python
# In schemas (Pydantic)
qty_requested: int = Field(..., gt=0)  # Must be > 0
notes: str = Field(max_length=500)

# In services (SQLModel queries)
verify_item_exists(session, item_uuid)
validate_status_transition(current_status, new_status)
```

**Error responses:**

```python
# 400: Bad request (validation, business rule)
raise HTTPException(status_code=400, detail="Item not found")

# 401: Unauthorized (auth required)
raise HTTPException(status_code=401, detail="Authentication required")

# 403: Forbidden (permission denied)
raise HTTPException(status_code=403, detail="Permission denied")

# 404: Not found
raise HTTPException(status_code=404, detail="User not found")

# 409: Conflict (state violation)
raise HTTPException(status_code=409, detail="Active request already exists")
```

### Frontend Development

**Setting up new page:**

```bash
# Create folder structure
mkdir -p src/app/inventory/{item_id}/edit

# Create files
touch src/app/inventory/{item_id}/edit/page.tsx
touch src/app/inventory/{item_id}/edit/api.ts
```

**API client pattern:**

```typescript
// src/app/inventory/{item_id}/edit/api.ts
import { api } from "@/lib/api";

export async function getItem(itemId: string) {
  return api.get(`/inventory/items/${itemId}`);
}

export async function updateItem(itemId: string, data: ItemUpdateRequest) {
  return api.patch(`/inventory/items/${itemId}`, data);
}
```

**Component pattern:**

```typescript
// src/app/inventory/{item_id}/edit/page.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";

export default function EditItemPage({ params }: { params: { item_id: string } }) {
  const { user } = useAuth();

  return (
    <AuthGuard>
      {/* Your component */}
    </AuthGuard>
  );
}
```

### Testing Checklist

For any new feature:

- [ ] Database model has all required fields
- [ ] Unique constraints and indexes defined
- [ ] Pydantic schemas exclude internal fields (Read schema)
- [ ] Service methods track actor_id for audit
- [ ] Error codes: 400/401/403/404/409 as appropriate
- [ ] Permissions required and checked at router + endpoint
- [ ] Pagination for list endpoints
- [ ] Soft-delete support (model inherits BaseModel)
- [ ] Response uses GenericResponse envelope
- [ ] Manual testing via API docs (/docs)
- [ ] Test script exercises the endpoint

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
