#!/bin/bash
set -e

PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || curl -s ifconfig.me)
DOMAIN="${PUBLIC_IP//./-}.sslip.io"

echo "🔒 Setting up free HTTPS SSL certificate for domain: $DOMAIN..."

# 1. Stop host nginx service & pause frontend container to free port 80 for Certbot
sudo systemctl stop nginx || true
sudo systemctl disable nginx || true
sudo docker stop foodrush-frontend || true

# 2. Install Certbot
sudo apt-get update -y
sudo apt-get install -y certbot

# 3. Request free Let's Encrypt SSL certificate in standalone mode
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos -m dev@foodrush.com || true

# 4. Ensure host nginx stays stopped so Docker container can use port 80
sudo systemctl stop nginx || true
sudo systemctl disable nginx || true

# 5. Start Docker frontend container back up
sudo docker start foodrush-frontend || true

echo "🎉 SSL Certificate obtained!"
echo "🌐 Restarting app deployment..."
./scripts/deploy-aws.sh
