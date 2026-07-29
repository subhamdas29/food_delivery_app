#!/bin/bash
set -e

PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || curl -s ifconfig.me)
# Convert 3.235.52.177 -> 3-235-52-177.sslip.io (Free DNS pointing to your EC2 IP)
DOMAIN="${PUBLIC_IP//./-}.sslip.io"

echo "🔒 Setting up free HTTPS SSL certificate for domain: $DOMAIN..."

# 1. Open port 443 in firewall if needed
sudo ufw allow 443/tcp || true

# 2. Install Certbot
sudo apt-get update -y
sudo apt-get install -y certbot python3-certbot-nginx

# 3. Request free Let's Encrypt SSL certificate
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m dev@foodrush.com --redirect || true

echo "🎉 HTTPS SSL setup complete!"
echo "🌐 Your secure website is now live at: https://$DOMAIN"
