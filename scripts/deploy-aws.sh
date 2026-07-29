#!/bin/bash
set -e

echo "🚀 Starting FoodRush AWS EC2 Deployment..."

# 1. Enable 4GB Swap memory to prevent Out-Of-Memory (OOM) build process freezes
if [ ! -f /swapfile ]; then
  echo "🧠 Creating and enabling 4GB Swap space..."
  sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile || true
  sudo sysctl vm.swappiness=60 || true
  echo "✅ 4GB Swap memory enabled."
else
  sudo swapon /swapfile || true
fi

# 2. Update system packages and install Docker + Docker Compose
echo "📦 Installing Docker & system dependencies..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release

if ! command -v docker &> /dev/null; then
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker $USER
  echo "✅ Docker installed successfully."
fi

# 3. Fetch Public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || curl -s ifconfig.me)
echo "🌐 Detected EC2 Public IP: $PUBLIC_IP"

# 4. Create .env file for Docker Compose
cat <<EOF > .env.prod
EC2_PUBLIC_IP=$PUBLIC_IP
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
JWT_SECRET=production-secret-jwt-key-foodrush
EOF

# 5. Build images sequentially with memory limit
echo "🔨 Building containers sequentially to conserve RAM..."
export DOCKER_BUILDKIT=0

sudo docker compose -f docker-compose.prod.yml --env-file .env.prod build api-gateway
sleep 2
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod build order-orchestrator
sleep 2
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod build payment-service
sleep 2
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod build restaurant-service
sleep 2
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod build delivery-service
sleep 2
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod build frontend

# 6. Start containers
echo "🚀 Starting all containers..."
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "⏳ Waiting for database and Kafka to initialize..."
sleep 15

# 7. Push Prisma database schemas
echo "🗄️ Initializing database tables via Prisma..."
sudo docker exec foodrush-order-orchestrator npx prisma db push --skip-generate || true
sudo docker exec foodrush-payment-service npx prisma db push --skip-generate || true
sudo docker exec foodrush-restaurant-service npx prisma db push --skip-generate || true
sudo docker exec foodrush-delivery-service npx prisma db push --skip-generate || true

echo "🎉 Deployment complete!"
echo "🌐 Access your app at: http://$PUBLIC_IP"
echo "🔌 API Gateway live at: http://$PUBLIC_IP:3000"
