# Running the Food Delivery Platform Locally

## Prerequisites

Make sure these are installed on your machine before starting:

- Node.js v20+
- pnpm v9+ (`npm install -g pnpm`)
- Docker Desktop (running)
- Git

---

## Folder structure reminder

```
food-delivery-platform/
├── docker-compose.yml        ← Kafka + Postgres
├── scripts/kafka-init.sh     ← Topic creation script
├── init-db.sql               ← Database creation script
├── packages/shared/          ← Shared event types
├── services/
│   ├── api-gateway/          ← Port 3000
│   ├── order-orchestrator/   ← Port 3001
│   ├── payment-service/      ← Port 3002
│   ├── restaurant-service/   ← Port 3003
│   └── delivery-service/     ← Port 3004
└── frontend/                 ← Port 5173 
```

---

## Step 1 — Environment setup

Copy the example env file and fill in values:

```powershell
copy .env.example .env
```

Your `.env` should look like this (defaults work for local dev):

```env
# Postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Database URLs
ORDER_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/order_db
PAYMENT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/payment_db
RESTAURANT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurant_db
DELIVERY_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/delivery_db

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=food-delivery
KAFKAJS_NO_PARTITIONER_WARNING=1

# Ports
API_GATEWAY_PORT=3000
ORCHESTRATOR_PORT=3001
PAYMENT_SERVICE_PORT=3002
RESTAURANT_SERVICE_PORT=3003
DELIVERY_SERVICE_PORT=3004

# Auth
JWT_SECRET=dev-secret-change-in-production

# Orchestrator URL (used by gateway)
ORCHESTRATOR_URL=http://localhost:3001

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Restaurant rejection rate (0 = never reject, 0.5 = 50% rejection)
RESTAURANT_REJECTION_RATE=0.2
```

---

## Step 2 — Install all dependencies

Run this once from the project root:

```powershell
pnpm install
```

You should see:
```
Scope: all 6 workspace projects
Packages: +XXX
Progress: resolved XXX, reused XXX, downloaded 0, added XXX
Done in Xs
```

---

## Step 3 — Build the shared package

Every service depends on `@food-delivery/shared`. Build it first:

```powershell
pnpm --filter @food-delivery/shared build
```

You should see a `packages/shared/dist/` folder created.

---

## Step 4 — Start Docker infrastructure

Start Kafka and Postgres in the background:

```powershell
docker compose up -d
```

Wait about 30 seconds for Kafka to fully start, then verify:

```powershell
# Check all containers are healthy
docker compose ps
```

You should see these all as "running" or "healthy":

```
NAME         STATUS
kafka        Up (healthy)
kafka-init   Exited (0)      ← this is correct, it runs once and exits
postgres     Up (healthy)
kafka-ui     Up
```

Verify Kafka topics were created:

```powershell
docker exec kafka kafka-topics --bootstrap-server kafka:29092 --list
```

Expected output:
```
delivery.commands
delivery.events
orders.lifecycle
payments.commands
payments.events
restaurant.commands
restaurant.events
```

Verify all 4 databases exist:

```powershell
docker exec postgres psql -U postgres -c "\l" | findstr "_db"
```

Expected output:
```
order_db
payment_db
restaurant_db
delivery_db
```

---

## Step 5 — Run Prisma migrations

Run this once to create all database tables.
Open 4 separate PowerShell terminals or run sequentially:

```powershell
# Terminal 1 (or run one after another)
pnpm --filter @food-delivery/order-orchestrator prisma:migrate
pnpm --filter @food-delivery/payment-service prisma:migrate
pnpm --filter @food-delivery/restaurant-service prisma:migrate
pnpm --filter @food-delivery/delivery-service prisma:migrate
```

Each migration will prompt for a migration name — type anything descriptive:
```
Enter a name for the new migration: init
```

You only need to run migrations once unless you change a Prisma schema.

---

## Step 6 — Generate Prisma clients

```powershell
pnpm --filter @food-delivery/order-orchestrator prisma:generate
pnpm --filter @food-delivery/payment-service prisma:generate
pnpm --filter @food-delivery/restaurant-service prisma:generate
pnpm --filter @food-delivery/delivery-service prisma:generate
```

---

## Step 7 — Start all services

Open 5 separate PowerShell terminals — one per service.
Run each command in its own terminal:

```powershell
# Terminal 1 — Order Orchestrator
pnpm --filter @food-delivery/order-orchestrator dev

# Terminal 2 — Payment Service
pnpm --filter @food-delivery/payment-service dev

# Terminal 3 — Restaurant Service
pnpm --filter @food-delivery/restaurant-service dev

# Terminal 4 — Delivery Service
pnpm --filter @food-delivery/delivery-service dev

# Terminal 5 — API Gateway
pnpm --filter @food-delivery/api-gateway dev
```

### Expected startup output per service:

**Order Orchestrator:**
```
[Orchestrator] Database connected
[Producer] Connected to Kafka
[Consumer] Listening on: orders.lifecycle, payments.events, restaurant.events, delivery.events
[Orchestrator] Listening on port 3001
```

**Payment Service:**
```
[Payment] Database connected
[Payment:Producer] Connected to Kafka
[Payment:Consumer] Listening on: payments.commands
[Payment] Listening on port 3002
```

**Restaurant Service:**
```
[Restaurant] Database connected
[Restaurant:Producer] Connected to Kafka
[Restaurant:Consumer] Listening on: restaurant.commands
[Restaurant] Listening on port 3003
```

**Delivery Service:**
```
[Delivery] Database connected
[Delivery:Producer] Connected to Kafka
[Delivery:Consumer] Listening on: delivery.commands
[Delivery] Listening on port 3004
```

**API Gateway:**
```
[Gateway:Producer] Connected to Kafka
[Gateway] Listening on port 3000
[Gateway] CORS enabled for: http://localhost:5173
```

---

## Step 8 — Verify everything is running

Health check all 5 services:

```powershell
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
```

Each should return:
```json
{
  "status": "ok",
  "service": "...",
  "timestamp": "...",
  "checks": { "database": "ok", "kafka": "ok" }
}
```

---

## Step 9 — Test the full saga end to end

**Get a dev JWT token:**

```powershell
curl -X POST http://localhost:3000/dev/token `
  -H "Content-Type: application/json" `
  -d "{\"userId\": \"user-123\"}"
```

Response:
```json
{ "token": "eyJhbGciOiJIUzI1NiJ9..." }
```

**Place an order (paste your token):**

```powershell
curl -X POST http://localhost:3000/orders `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <YOUR_TOKEN>" `
  -d "{
    \"restaurantId\": \"rest-001\",
    \"items\": [{
      \"itemId\": \"item-1\",
      \"name\": \"Butter Chicken\",
      \"quantity\": 2,
      \"unitPrice\": 25000
    }],
    \"deliveryAddress\": {
      \"street\": \"12 MG Road\",
      \"city\": \"Kolkata\",
      \"pincode\": \"700001\"
    }
  }"
```

Response (202):
```json
{
  "orderId": "abc-123-...",
  "message": "Order accepted and is being processed",
  "statusUrl": "/orders/abc-123-.../status"
}
```

**Poll order status:**

```powershell
curl http://localhost:3000/orders/<ORDER_ID>/status `
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

Watch the status progress through:
```
PENDING → PAYMENT_PROCESSING → PAYMENT_SUCCESS
→ RESTAURANT_CONFIRMING → RIDER_ASSIGNING → COMPLETED
```

Watch all 5 terminals light up with logs as the saga flows through each service.

---

## Step 10 — Optional: Open Kafka UI

Go to **http://localhost:8080** in your browser.

- Click **Topics** in the left sidebar
- Click any topic (e.g. `orders.lifecycle`)
- Click **Messages** to see the Kafka events flowing in real time

This is the best way to visualise the saga events as they flow through the system.

---

## Startup order (important)

Always start in this order to avoid connection errors:

```
1. docker compose up -d     ← Kafka + Postgres first
2. Wait 30 seconds
3. Start all 5 services     ← order doesn't matter between services
4. Start frontend           ← last (optional, friend's app)
```

---

## Shutdown order

```powershell
# Stop all services
# Press Ctrl+C in each terminal

# Stop Docker infrastructure
docker compose down

# To also wipe all data (Kafka + Postgres volumes)
docker compose down -v
```

---

## Common issues and fixes

| Problem | Fix |
|---|---|
| `Cannot find module '@food-delivery/shared'` | Run `pnpm --filter @food-delivery/shared build` |
| Kafka topics not found | Run `docker exec kafka kafka-topics --bootstrap-server kafka:29092 --list` |
| `prisma:migrate` fails | Make sure Docker is running and `ORDER_DATABASE_URL` is in `.env` |
| Service won't start — port in use | Another process is on that port. Run `netstat -ano \| findstr :3000` to find it |
| `Producer not connected` error | Kafka isn't ready yet — wait 30s and restart the service |
| Saga stuck at PAYMENT_PROCESSING | Payment service isn't running or not connected to Kafka |
| All orders fail | Check `RESTAURANT_REJECTION_RATE` — if set to 1.0 every order will be rejected |

---

## Re-running after a restart

After rebooting your machine:

```powershell
# 1. Start Docker
docker compose up -d

# 2. Wait 30 seconds

# 3. Start services (no need to migrate again)
pnpm --filter @food-delivery/order-orchestrator dev
pnpm --filter @food-delivery/payment-service dev
pnpm --filter @food-delivery/restaurant-service dev
pnpm --filter @food-delivery/delivery-service dev
pnpm --filter @food-delivery/api-gateway dev
```

Migrations and `pnpm install` only need to run once — not on every restart.
