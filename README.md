# EVE Healthcare — Diagnostic Booking API

A backend service for diagnostic test bookings and simulated payments, built with **Express.js**, **PostgreSQL** (via Sequelize ORM), and **JWT authentication**.

> Built for the EVE Healthcare SDE Intern Backend Engineering Assignment.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
  - [Without Docker](#without-docker)
  - [With Docker](#with-docker)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Assumptions](#assumptions)
- [Edge Cases Handled](#edge-cases-handled)
- [Bonus Features](#bonus-features)
- [Running Tests](#running-tests)
- [Future Improvements](#future-improvements)

---

## Tech Stack

| Layer         | Technology                        |
|---------------|-----------------------------------|
| Runtime       | Node.js (v18+)                    |
| Framework     | Express.js 4.x                    |
| Database      | PostgreSQL 16 (Sequelize ORM)     |
| Auth          | JWT (jsonwebtoken + bcryptjs)     |
| Validation    | express-validator                 |
| API Docs      | Swagger / OpenAPI 3.0             |
| Testing       | Jest + Supertest (SQLite in-memory)|
| Logging       | Winston                          |
| Security      | Helmet, CORS, express-rate-limit  |
| Containerization | Docker + Docker Compose        |

---

## Project Structure

```
├── src/
│   ├── config/
│   │   ├── database.js          # Sequelize config (PostgreSQL / SQLite for tests)
│   │   └── swagger.js           # OpenAPI specification
│   ├── controllers/
│   │   ├── authController.js    # Signup, login, profile
│   │   ├── bookingController.js # CRUD bookings
│   │   ├── centreController.js  # CRUD centres & tests
│   │   └── paymentController.js # Simulated payments & webhook
│   ├── middleware/
│   │   ├── auth.js              # JWT verification
│   │   ├── errorHandler.js      # Global error handler
│   │   └── rateLimiter.js       # API & auth rate limiters
│   ├── models/
│   │   ├── Booking.js
│   │   ├── DiagnosticCentre.js
│   │   ├── DiagnosticTest.js
│   │   ├── Payment.js
│   │   ├── User.js
│   │   └── index.js             # Associations
│   ├── routes/
│   │   ├── auth.js
│   │   ├── bookings.js
│   │   ├── centres.js
│   │   └── payments.js
│   ├── seeders/
│   │   └── seed.js              # Sample data seeder
│   ├── utils/
│   │   └── logger.js            # Winston structured logging
│   ├── app.js                   # Express app setup
│   └── server.js                # Entry point
├── tests/
│   ├── setup.js                 # Test utilities
│   ├── auth.test.js
│   ├── bookings.test.js
│   ├── centres.test.js
│   └── payments.test.js
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── jest.config.js
├── package.json
└── README.md
```

---

## Setup & Installation

### Without Docker

**Prerequisites:** Node.js 18+, PostgreSQL 14+

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd backend-assignment
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials
   ```

4. **Create PostgreSQL database:**
   ```sql
   CREATE DATABASE eve_healthcare;
   ```

5. **Start the server** (auto-syncs schema):
   ```bash
   npm run dev
   ```

6. **(Optional) Seed sample data:**
   ```bash
   npm run db:seed
   ```

7. The API is now available at `http://localhost:3000`  
   Swagger docs: `http://localhost:3000/api-docs`

### With Docker

```bash
docker-compose up --build
```

This starts both the API (`localhost:3000`) and PostgreSQL (`localhost:5432`).

---

## API Endpoints

### Health Check
| Method | Endpoint    | Auth | Description         |
|--------|-------------|------|---------------------|
| GET    | `/health`   | No   | Service health check |

### Authentication
| Method | Endpoint           | Auth | Description              |
|--------|--------------------|------|--------------------------|
| POST   | `/api/auth/signup`  | No   | Register a new user      |
| POST   | `/api/auth/login`   | No   | Login and get JWT token  |
| GET    | `/api/auth/me`      | Yes  | Get current user profile |

### Diagnostic Centres & Tests
| Method | Endpoint                         | Auth | Description                    |
|--------|----------------------------------|------|--------------------------------|
| GET    | `/api/centres`                   | No   | List all centres (paginated)   |
| GET    | `/api/centres/:id`               | No   | Get centre details with tests  |
| POST   | `/api/centres`                   | Yes  | Create a new centre            |
| GET    | `/api/centres/:centreId/tests`   | No   | List tests for a centre        |
| POST   | `/api/centres/:centreId/tests`   | Yes  | Add a test to a centre         |

### Bookings
| Method | Endpoint                      | Auth | Description                     |
|--------|-------------------------------|------|---------------------------------|
| POST   | `/api/bookings`               | Yes  | Create a new booking            |
| GET    | `/api/bookings`               | Yes  | List user's bookings (paginated)|
| GET    | `/api/bookings/:id`           | Yes  | Get booking details             |
| PATCH  | `/api/bookings/:id/cancel`    | Yes  | Cancel a PENDING booking        |

### Payments
| Method | Endpoint                      | Auth | Description                          |
|--------|-------------------------------|------|--------------------------------------|
| POST   | `/api/payments`               | Yes  | Process simulated payment            |
| POST   | `/api/payments/webhook`       | No   | Receive payment webhook (idempotent) |
| GET    | `/api/payments/:bookingId`    | Yes  | Get payment history for a booking    |

### Example Requests

<details>
<summary><strong>Signup</strong></summary>

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aman Srivastava",
    "email": "aman@example.com",
    "password": "password123",
    "phone": "9876543210"
  }'
```
</details>

<details>
<summary><strong>Login</strong></summary>

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "aman@example.com",
    "password": "password123"
  }'
```
</details>

<details>
<summary><strong>Create Booking</strong></summary>

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "test_id": "<TEST_UUID>",
    "centre_id": "<CENTRE_UUID>",
    "appointment_date": "2026-10-15",
    "appointment_time": "10:30",
    "notes": "Fasting required"
  }'
```
</details>

<details>
<summary><strong>Process Payment</strong></summary>

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "booking_id": "<BOOKING_UUID>"
  }'
```
</details>

<details>
<summary><strong>Payment Webhook</strong></summary>

```bash
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TXN_abc-123-def",
    "status": "SUCCESS",
    "booking_id": "<BOOKING_UUID>"
  }'
```
</details>

---

## Database Schema

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    users     │     │diagnostic_centres│     │diagnostic_tests  │
├──────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK, UUID)│     │ id (PK, UUID)    │     │ id (PK, UUID)    │
│ name         │     │ name             │────▶│ centre_id (FK)   │
│ email (UQ)   │     │ address          │     │ name             │
│ password     │     │ city             │     │ description      │
│ phone        │     │ state            │     │ price            │
│ created_at   │     │ pincode          │     │ is_active        │
│ updated_at   │     │ phone            │     │ created_at       │
└──────┬───────┘     │ is_active        │     │ updated_at       │
       │             │ created_at       │     └────────┬─────────┘
       │             │ updated_at       │              │
       │             └────────┬─────────┘              │
       │                      │                        │
       ▼                      ▼                        ▼
┌──────────────────────────────────────────────────────────────┐
│                         bookings                             │
├──────────────────────────────────────────────────────────────┤
│ id (PK, UUID)                                                │
│ user_id (FK → users)                                         │
│ test_id (FK → diagnostic_tests)                              │
│ centre_id (FK → diagnostic_centres)                          │
│ appointment_date                                             │
│ appointment_time                                             │
│ amount                                                       │
│ status (ENUM: PENDING | CONFIRMED | FAILED | CANCELLED)      │
│ notes                                                        │
│ created_at, updated_at                                       │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────┐
            │     payments     │
            ├──────────────────┤
            │ id (PK, UUID)    │
            │ booking_id (FK)  │
            │ amount           │
            │ status (ENUM)    │
            │ transaction_id   │  ← UNIQUE (idempotency key)
            │ payment_method   │
            │ processed_at     │
            │ created_at       │
            │ updated_at       │
            └──────────────────┘
```

### Key Design Decisions

- **UUIDs** for all primary keys — avoids sequential ID guessing.
- **`transaction_id` is UNIQUE** on the payments table — this is the idempotency key for the webhook endpoint.
- **Booking has a one-to-many relationship with Payment** — allows retry scenarios where a failed payment can be retried.
- **`amount` is stored on the booking** at creation time — this snapshots the price, protecting against future price changes on the test.
- **Soft-delete via `is_active` flags** on centres and tests — data is never hard-deleted.

---

## Assumptions

1. **Any authenticated user can create centres and tests** — in a real system, this would be restricted to admin roles. Role-based access was not implemented to keep the scope focused.

2. **The webhook endpoint does not require authentication** — in production, this would be secured with a shared secret or signature verification. It's intentionally unauthenticated since webhooks are called by external payment providers, not end users.

3. **Simulated payment randomly succeeds (~70%) or fails (~30%)** — this mimics real-world payment processing where failures do occur.

4. **A booking can have multiple payment records** — if a payment fails, the user can retry. The booking status tracks the latest outcome.

5. **Only PENDING bookings can be cancelled or paid for** — once a booking is CONFIRMED, FAILED, or CANCELLED, it cannot be modified (except a FAILED booking could potentially be retried via a new payment).

6. **Appointment dates must be in the future** — past dates are rejected during booking creation.

7. **Tests must belong to the specified centre** — you cannot book a test at a centre that doesn't offer it.

8. **The `amount` on a booking is auto-populated** from the test's price at booking time — users cannot specify a custom amount.

---

## Edge Cases Handled

| Edge Case | How It's Handled |
|-----------|-----------------|
| Duplicate webhook events | Idempotent: same `transaction_id` + `status` → returns 200, no side effects |
| Conflicting webhook status | Returns 409 if `transaction_id` exists with a different status |
| Invalid booking ID in payment | Returns 404 with clear message |
| Payment for non-PENDING booking | Returns 400 — only PENDING bookings accept payments |
| Booking a test at wrong centre | Returns 404 — test must belong to the specified centre |
| Past appointment dates | Returns 400 — cannot book in the past |
| Unauthorized access to other user's data | Returns 404 (not 403) — prevents information leakage |
| Duplicate email registration | Returns 409 with clear message |
| Invalid/expired JWT tokens | Returns 401 with specific error messages |
| Malformed request bodies | Returns 400 with field-level validation errors |
| Cancelling a non-PENDING booking | Returns 400 with explanation |
| Missing required fields | Returns 400 with per-field validation messages |
| Database constraint violations | Caught by global error handler, returns appropriate HTTP status |

---

## Bonus Features

- ✅ **Swagger/OpenAPI Documentation** — Interactive docs at `/api-docs`
- ✅ **Docker & Docker Compose** — One-command deployment
- ✅ **Unit/Integration Tests** — 35+ tests covering auth, bookings, payments, edge cases
- ✅ **Structured Logging** — Winston with JSON format, HTTP request logging via Morgan
- ✅ **Pagination** — All list endpoints support `page` and `limit` query params
- ✅ **Rate Limiting** — General API limiter + stricter auth endpoint limiter
- ✅ **Database Seeder** — Pre-populated sample data for quick testing
- ✅ **Input Validation** — express-validator with detailed error messages
- ✅ **Security Headers** — Helmet middleware for secure HTTP headers

---

## Running Tests

Tests use SQLite in-memory database — **no PostgreSQL required**.

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage
```

---

## Future Improvements

If I had more time, I would add:

- **Role-based access control (RBAC)** — Admin vs. patient roles for centre/test management
- **Redis caching** — Cache frequently accessed centre/test listings
- **Celery-style background jobs** — Bull/BullMQ for async payment processing and email notifications
- **Webhook signature verification** — HMAC-based signature validation for security
- **Email notifications** — Send booking confirmation and payment receipts
- **Search & filtering** — Search centres by city, test name, price range
- **Booking time slot management** — Prevent double-booking at the same time slot
- **Soft-delete for bookings** — Allow admin to archive old bookings
- **API versioning** — `/api/v1/` prefix for future backward-compatible changes
- **Database migrations** — Sequelize CLI migrations instead of `sync({ alter: true })`
- **CI/CD pipeline** — GitHub Actions for automated testing and deployment

---

## Author

**Aman Srivastava**

Built with ❤️ for EVE Healthcare
