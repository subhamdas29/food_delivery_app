# Food Delivery Platform

An event-driven, distributed microservices platform for food delivery, built with Node.js, TypeScript, Apache Kafka, PostgreSQL, Prisma ORM, and React. The system utilizes the **Saga Pattern (Orchestration)** to manage distributed multi-step transactions across order creation, payment processing, restaurant confirmation, and driver assignment with automated failure recovery and compensation mechanisms.

---

## Key Features

- **Distributed Saga Orchestration**: Centralized order orchestrator handling multi-step saga state machines with backward compensation (refunds, cancellations) on step failure.
- **Event-Driven Architecture**: Decoupled asynchronous messaging powered by Apache Kafka across dedicated topic partitions.
- **Microservices Architecture**: Monorepo structure managed by Turborepo and PNPM Workspaces, separating core domain services:
  - API Gateway
  - Order Orchestrator
  - Payment Service
  - Restaurant Service
  - Delivery Service
- **Database-per-Service**: Each microservice maintains isolated PostgreSQL databases with schema migrations powered by Prisma ORM.
- **API Gateway**: Central entry point providing JWT authentication, rate limiting, and request routing to internal microservices.
- **Modern Web Dashboard**: Single-page application built with React, Vite, TypeScript, Tailwind CSS, Zustand, and TanStack React Query.
- **Containerized Infrastructure**: Docker Compose configuration for local development including Kafka broker, Zookeeper, PostgreSQL, and Kafka UI.

---

## System Architecture & Saga Workflow

The platform handles order placement using an **Orchestration-based Saga Pattern**:

```
[ Client / Web App ]
         │
         ▼ (HTTP POST /api/v1/orders)
┌───────────────────┐
│    API Gateway    │ (JWT Auth & Rate Limiting)
└─────────┬─────────┘
          │ (Produce: OrderPlaced)
          ▼
┌───────────────────┐        Kafka Topics         ┌─────────────────────┐
│                   │ ──────────────────────────► │   Payment Service   │
│                   │ ◄────────────────────────── │ (Charge / Refund)   │
│                   │
│ Order Orchestrator│ ──────────────────────────► ┌─────────────────────┐
│ (Saga Controller) │ ◄────────────────────────── │ Restaurant Service  │
│                   │                             │ (Confirm / Reject)  │
│                   │
│                   │ ──────────────────────────► ┌─────────────────────┐
│                   │ ◄────────────────────────── │  Delivery Service   │
└───────────────────┘                             │  (Assign Rider)     │
```

### Order Saga State Transitions
1. **Order Creation**: Client posts an order request. The API Gateway validates JWT and routes the order to the `orders.lifecycle` topic as an `OrderPlaced` event.
2. **Payment Processing**: Order Orchestrator emits `ChargePayment`. Payment Service processes transaction and emits `PaymentSuccessful` or `PaymentFailed`.
   - *Failure Path*: Saga marks order as `FAILED`.
3. **Restaurant Confirmation**: Upon payment success, Orchestrator emits `ConfirmOrder`. Restaurant Service confirms inventory and emits `OrderConfirmed` or `OrderRejected`.
   - *Failure Path*: Saga initiates compensation flow (`RefundPayment`) and updates state to `REFUND_ISSUED`.
4. **Delivery Rider Assignment**: Upon restaurant confirmation, Orchestrator emits `AssignRider`. Delivery Service matches an available rider and emits `RiderAssigned`.
   - *Failure Path*: If no rider is available, Saga triggers restaurant order cancellation and issues payment refund.
5. **Order Completion**: Orchestrator updates order status to `COMPLETED`.

---

## Tech Stack

### Backend & Core Services
- **Runtime**: Node.js (v20+)
- **Language**: TypeScript (v5.4+)
- **Monorepo Management**: Turborepo & PNPM Workspaces
- **Message Broker**: Apache Kafka (`kafkajs`)
- **Database**: PostgreSQL (v16)
- **ORM**: Prisma ORM

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query & Axios

### Infrastructure & DevOps
- **Containerization**: Docker & Docker Compose
- **Kafka Monitoring**: Provectus Labs Kafka UI

---

## Repository Structure

```
food-delivery-platform/
├── .github/
│   └── workflows/              # CI/CD workflows
├── frontend/                   # React + Vite web dashboard
├── packages/
│   └── shared/                 # Shared TypeScript contracts & Kafka schemas
├── services/
│   ├── api-gateway/            # Authentication, rate-limiting, and routing
│   ├── order-orchestrator/     # Saga orchestrator & state machine engine
│   ├── payment-service/        # Payment execution & compensation handlers
│   ├── restaurant-service/     # Order confirmation & rejection handlers
│   └── delivery-service/       # Rider assignment & delivery tracking
├── scripts/                    # Automation scripts (Kafka topic initialization)
├── docker-compose.yml          # Local infrastructure (Kafka, Postgres, Kafka UI)
├── docker-compose.prod.yml     # Production compose setup
├── package.json                # Monorepo root configuration
├── pnpm-workspace.yaml         # Workspace definitions
└── turbo.json                  # Turborepo task pipeline configuration
```

---

## Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **PNPM**: v9.x or higher (`npm i -g pnpm`)
- **Docker & Docker Compose**: Installed and running

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/subhamdas29/food_delivery_app.git
   cd food_delivery_app
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Start Infrastructure Services**:
   Launch Kafka, Zookeeper, PostgreSQL, and Kafka UI:
   ```bash
   docker compose up -d
   ```

5. **Run Database Migrations**:
   ```bash
   pnpm --filter @food-delivery/order-orchestrator exec prisma db push
   pnpm --filter @food-delivery/payment-service exec prisma db push
   pnpm --filter @food-delivery/restaurant-service exec prisma db push
   pnpm --filter @food-delivery/delivery-service exec prisma db push
   ```

6. **Start Application Services**:
   Run all microservices and frontend concurrently in development mode:
   ```bash
   pnpm dev
   ```

---

## Environment Configuration

The application uses environment variables for configuration. Key variables defined in `.env.example`:

| Variable Name | Default Value | Description |
|---|---|---|
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host address |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `ORDER_DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/order_db` | Connection string for Order DB |
| `PAYMENT_DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/payment_db` | Connection string for Payment DB |
| `RESTAURANT_DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/restaurant_db` | Connection string for Restaurant DB |
| `DELIVERY_DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/delivery_db` | Connection string for Delivery DB |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker endpoints |
| `KAFKA_CLIENT_ID` | `food-delivery` | Kafka client identifier |
| `API_GATEWAY_PORT` | `3000` | Port for API Gateway |
| `ORCHESTRATOR_PORT` | `3001` | Port for Order Orchestrator |
| `JWT_SECRET` | `change-me-in-production` | Secret key for JWT generation/verification |

---

## API Endpoints

### API Gateway (`http://localhost:3000`)

#### Authentication
- `POST /api/v1/auth/login`: Authenticate user and receive JWT token.
- `POST /api/v1/auth/register`: Register new user account.

#### Orders
- `POST /api/v1/orders`: Submit a new order (Triggers Saga Workflow).
- `GET /api/v1/orders/:id`: Get order status and tracking details.
- `GET /api/v1/orders`: List all orders for the authenticated user.

#### Restaurants
- `GET /api/v1/restaurants`: List available restaurants and menus.
- `GET /api/v1/restaurants/:id`: Get details for a specific restaurant.

---

## Development & Testing Commands

- **Build all packages and services**:
  ```bash
  pnpm build
  ```

- **Run all services in development mode**:
  ```bash
  pnpm dev
  ```

- **Execute unit and integration tests**:
  ```bash
  pnpm test
  ```

- **Run typecheck across monorepo**:
  ```bash
  pnpm typecheck
  ```

- **Run linter**:
  ```bash
  pnpm lint
  ```

---

## Infrastructure Dashboard

When running `docker compose up -d`, Kafka UI is accessible at:
- **Kafka UI**: `http://localhost:8080` (Inspect topics, messages, consumer groups, and partitions)

---

## License

This project is licensed under the ISC License.
