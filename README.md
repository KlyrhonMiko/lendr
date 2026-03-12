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
- [Project Structure](#project-structure)

---

## Overview

Lendr tracks equipment/items and manages borrow requests through a full lifecycle: **request → approve → release → return**. It provides:

- JWT-based authentication
- User management with role support
- Inventory management (items, categories, quantities)
- Borrow request workflow with status tracking
- System configuration settings
- Interactive API docs via Swagger UI

---

## Architecture

| Layer     | Technology                                  | Port |
|-----------|---------------------------------------------|------|
| Frontend  | Next.js 16, React 19, TypeScript, Tailwind  | 3000 |
| Backend   | FastAPI, SQLModel, Uvicorn                  | 5000 |
| Database  | PostgreSQL 15                               | 5432 |
| DB Admin  | Adminer (optional)                          | 8080 |

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
| Backend API    | http://localhost:5000        |
| API Docs       | http://localhost:5000/docs   |
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
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

The API will be available at http://localhost:5000 and interactive docs at http://localhost:5000/docs.

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

---

## Environment Variables

| Variable                    | Required | Default  | Description                                      |
|-----------------------------|----------|----------|--------------------------------------------------|
| `DATABASE_URL`              | Yes      | —        | PostgreSQL connection string (psycopg2 format)   |
| `SECRET_KEY`                | Yes      | —        | Secret key for signing JWT tokens                |
| `ALGORITHM`                 | No       | `HS256`  | JWT signing algorithm                            |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No     | `30`     | JWT token lifetime in minutes                    |
| `DEBUG`                     | No       | `false`  | Enable SQLAlchemy query logging                  |
| `APP_HOST`                  | No       | `0.0.0.0`| Host the backend binds to                       |
| `APP_PORT`                  | No       | `5000`   | Port the backend listens on                      |
| `POSTGRES_USER`             | Docker   | `postgres` | PostgreSQL username (Docker Compose only)      |
| `POSTGRES_PASSWORD`         | Docker   | `password` | PostgreSQL password (Docker Compose only)      |
| `POSTGRES_DB`               | Docker   | `lendr`    | PostgreSQL database name (Docker Compose only) |

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

The full interactive API documentation is available at **http://localhost:5000/docs** (Swagger UI) when the backend is running.

### Endpoints Summary

| Module         | Method | Path                                      | Auth Required | Description                     |
|----------------|--------|-------------------------------------------|---------------|---------------------------------|
| Auth           | POST   | `/api/auth/login`                         | No            | Login, returns JWT token        |
| Auth           | GET    | `/api/auth/me`                            | Yes           | Get current user info           |
| Users          | POST   | `/api/users/register`                     | No            | Register a new user             |
| Users          | GET    | `/api/users`                              | Yes           | List all users                  |
| Users          | GET    | `/api/users/{user_id}`                    | Yes           | Get a specific user             |
| Users          | PATCH  | `/api/users/{user_id}`                    | Yes           | Update a user                   |
| Inventory      | POST   | `/api/inventory/items`                    | Yes           | Create an inventory item        |
| Inventory      | GET    | `/api/inventory/items`                    | Yes           | List all items                  |
| Inventory      | GET    | `/api/inventory/items/{item_id}`          | Yes           | Get a specific item             |
| Inventory      | PATCH  | `/api/inventory/items/{item_id}`          | Yes           | Update an item                  |
| Borrowing      | POST   | `/api/borrowing/requests`                 | Yes           | Create a borrow request         |
| Borrowing      | GET    | `/api/borrowing/requests`                 | Yes           | List all borrow requests        |
| Borrowing      | POST   | `/api/borrowing/requests/{id}/approve`    | Yes           | Approve a borrow request        |
| Borrowing      | POST   | `/api/borrowing/requests/{id}/release`    | Yes           | Mark request as released        |
| Configuration  | GET    | `/api/config`                             | Yes           | List system settings            |
| Configuration  | POST   | `/api/config`                             | Yes           | Create a system setting         |
| Configuration  | PATCH  | `/api/config/{key}`                       | Yes           | Update a system setting         |

**Authentication:** Send the JWT token in the `Authorization` header:

```
Authorization: Bearer <your_token>
```

---

## Project Structure

```
lendr/
├── docker-compose.yml          # Orchestrates all services
├── Dockerfile.frontend         # Frontend container
├── package.json                # Frontend dependencies
├── next.config.ts              # Next.js configuration
│
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile.backend      # Backend container
│   ├── alembic.ini             # Alembic configuration
│   │
│   ├── alembic/                # Database migrations
│   │   └── versions/
│   │
│   ├── core/                   # Shared application core
│   │   ├── config.py           # Settings (pydantic-settings)
│   │   ├── database.py         # SQLAlchemy engine & session
│   │   ├── deps.py             # FastAPI dependencies (auth)
│   │   ├── base_model.py       # Shared SQLModel base (UUID PK, timestamps)
│   │   └── schemas.py          # Generic response wrappers
│   │
│   ├── systems/
│   │   └── inventory/          # Inventory management system
│   │       ├── models/         # SQLModel table definitions
│   │       ├── schemas/        # Pydantic request/response schemas
│   │       ├── services/       # Business logic layer
│   │       └── routers/        # FastAPI route handlers
│   │
│   └── utils/
│       ├── security.py         # Password hashing (argon2) & JWT
│       ├── id_generator.py     # Custom ID generation
│       └── time_utils.py       # Timezone utilities
│
└── src/
    └── app/                    # Next.js app router pages
        ├── page.tsx            # Dashboard
        ├── inventory/          # Inventory management page
        ├── borrows/            # Borrow requests page
        └── pos/                # Point-of-sale / new borrow page
```
