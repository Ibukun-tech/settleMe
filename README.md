# SettleMe

SettleMe is a backend service for tracking debts, repayments, profiles, and notifications between people. It exposes a JSON API built with Express and uses PostgreSQL for persistence, RabbitMQ for queue-based work, Redis for caching or shared state, and OpenTelemetry for tracing.

## Features

- User authentication with registration, login, OTP verification, password reset, and OTP resend flows
- Profile management for authenticated users
- Debt creation, lookup, confirmation, and dispute workflows
- Repayment creation and confirmation endpoints
- Notification delivery through a server-sent events stream
- Structured logging and process-level error handling

## Tech Stack

- Node.js
- Express 5
- PostgreSQL with Sequelize
- RabbitMQ
- Redis
- JWT authentication
- Zod validation
- Pino logging
- OpenTelemetry instrumentation

## Project Structure

- `src/server.js` starts the service, initializes the database, connects to RabbitMQ, starts the worker consumer, and listens on port `3000`
- `src/app.js` wires Express middleware and API routes
- `src/common/` contains configuration, middleware, logging, and infrastructure helpers
- `src/module/` contains feature modules for auth, users, ledger, notifications, and mail

## Prerequisites

- Node.js 18+ recommended
- PostgreSQL database
- RabbitMQ instance
- Redis instance

## Installation

```bash
npm install
```

## Environment Variables

Set your environment file at `src/.env`. A template is available at `src/.env.example`.

Required variables:

```env
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/settleme
NODE_ENV=development
DB_POOL_MAX=10
DB_POOL_MIN=0
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1h
REDIS_URL=redis://localhost:6379
MAIL_FROM=no-reply@example.com
RABBITMQ_URL=amqp://localhost
```

Notes:

- `JWT_SECRET` must be at least 10 characters long.
- `MAIL_FROM` must be a valid email address.
- The application currently reads configuration from `src/.env`, not from a root-level `.env`.
- The config code also expects `RESEND_API_KEY`; if you use Resend in your deployment, add it to `src/.env` even though it is not listed in `src/.env.example` yet.

## Running the App

Start the development server:

```bash
npm run dev
```

The app listens on port `3000` by default.

## API Routes

Base path: `/api/v1`

### Auth

- `POST /auth/register`
- `POST /auth/verify`
- `POST /auth/resend-otp`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

### Users

All user routes require authentication.

- `POST /user/create-profile`
- `PATCH /user/update-profile`
- `GET /user/profile`
- `GET /user/profiles/:id`

### Ledger

All ledger routes require authentication.

- `POST /ledger/create-debt`
- `GET /ledger/my-debts`
- `GET /ledger/debts/:id`
- `PATCH /ledger/debts/:id/confirm`
- `PATCH /ledger/debts/:id/dispute`
- `POST /ledger/debts/:id/repayments`
- `PATCH /ledger/debts/:id/repayments/:repaymentId/confirm`

### Notifications

All notification routes require authentication.

- `GET /notifications/stream` - server-sent events stream for live notifications
- `PATCH /notifications/:id/read` - mark a notification as read

## Development Notes

- The server initializes the database before starting the HTTP listener.
- RabbitMQ consumer startup happens during process boot.
- Authentication is enforced by middleware on protected routes.
- Validation is handled with Zod-based DTO schemas.

## Testing

No automated test suite is configured yet. The current `test` script exits with an error placeholder.

## License

ISC

