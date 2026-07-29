#!/bin/bash
set -e

echo "🚀 Starting FoodRush AWS EC2 Deployment..."

# 1. Clean apt cache & allocate a balanced 1.5GB Swap file (to prevent disk full error on 8GB EBS)
sudo apt-get clean
sudo dpkg --configure -a || true

if [ -f /swapfile ]; then
  SWAP_SIZE=$(stat -c%s /swapfile 2>/dev/null || echo "0")
  if [ "$SWAP_SIZE" -gt 2500000000 ]; then
    echo "🧹 Shrinking oversized swapfile to 1.5GB to free disk space..."
    sudo swapoff /swapfile || true
    sudo rm -f /swapfile
  fi
fi

if [ ! -f /swapfile ]; then
  echo "🧠 Creating 1.5GB Swap space..."
  sudo dd if=/dev/zero of=/swapfile bs=1M count=1536
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile || true
  sudo sysctl vm.swappiness=60 || true
  echo "✅ 1.5GB Swap memory enabled."
else
  sudo swapon /swapfile || true
fi

# 2. Update system packages and install Docker + Docker Compose plugin
echo "📦 Installing Docker & system dependencies..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release docker-compose-plugin docker-compose || true

if ! command -v docker &> /dev/null; then
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker $USER
  echo "✅ Docker installed successfully."
fi

# 3. Detect docker compose binary
if command -v docker-compose &> /dev/null; then
  DC="sudo docker-compose"
else
  DC="sudo docker compose"
fi

# 4. Fetch Public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || curl -s ifconfig.me)
echo "🌐 Detected EC2 Public IP: $PUBLIC_IP"

# 5. Create .env file for Docker Compose
cat <<EOF > .env
EC2_PUBLIC_IP=$PUBLIC_IP
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
JWT_SECRET=production-secret-jwt-key-foodrush
EOF

cp .env .env.prod

# 6. Build images sequentially with memory limit
echo "🔨 Building containers sequentially to conserve RAM & Disk..."
export DOCKER_BUILDKIT=0

$DC -f docker-compose.prod.yml build api-gateway
sleep 2
$DC -f docker-compose.prod.yml build order-orchestrator
sleep 2
$DC -f docker-compose.prod.yml build payment-service
sleep 2
$DC -f docker-compose.prod.yml build restaurant-service
sleep 2
$DC -f docker-compose.prod.yml build delivery-service
sleep 2
$DC -f docker-compose.prod.yml build frontend

# 7. Start containers
echo "🚀 Starting all containers..."
$DC -f docker-compose.prod.yml up -d

echo "⏳ Waiting for database and Kafka to initialize..."
sleep 15

# 8. Push Prisma database schemas
echo "🗄️ Initializing database tables via Prisma..."
sudo docker exec foodrush-order-orchestrator npx prisma db push --skip-generate || true
sudo docker exec foodrush-payment-service npx prisma db push --skip-generate || true
sudo docker exec foodrush-restaurant-service npx prisma db push --skip-generate || true
sudo docker exec foodrush-delivery-service npx prisma db push --skip-generate || true

echo "🎉 Deployment complete!"
echo "🌐 Access your app at: http://$PUBLIC_IP"
echo "🔌 API Gateway live at: http://$PUBLIC_IP:3000"
