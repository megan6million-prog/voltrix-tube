#!/bin/bash
# Run this on your VPS to set up SSL + nginx
# Usage: bash setup-ssl.sh yourdomain.com

DOMAIN=$1
if [ -z "$DOMAIN" ]; then echo "Usage: bash setup-ssl.sh yourdomain.com"; exit 1; fi

# Install nginx + certbot
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx

# Copy nginx config
cp nginx.conf /etc/nginx/sites-available/voltrix
sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/voltrix
ln -sf /etc/nginx/sites-available/voltrix /etc/nginx/sites-enabled/voltrix
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t && systemctl reload nginx

# Get SSL certs for all subdomains
certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN -d admin.$DOMAIN -d b2b.$DOMAIN \
  --non-interactive --agree-tos -m admin@$DOMAIN

# Auto-renew cron
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -

echo ""
echo "✅ Done! Your platform is live at:"
echo "   API:   https://api.$DOMAIN"
echo "   Admin: https://admin.$DOMAIN"
echo "   B2B:   https://b2b.$DOMAIN"
