#!/bin/bash
set -e

echo "=== Building Voltrix Platform ==="

# Build admin panel
echo "→ Building admin panel..."
cd admin && npm run build && cd ..

# Build B2B portal
echo "→ Building B2B portal..."
cd b2b-portal && npm run build && cd ..

# Build desktop app
echo "→ Building desktop app..."
cd desktop && npm run build && cd ..

echo ""
echo "=== Deploy with Docker ==="
echo "Run: docker-compose up -d"
echo ""
echo "=== Desktop Packaging ==="
echo "Run: cd desktop && npm run dist"
echo ""
echo "=== Mobile Build ==="
echo "Run: cd mobile && npx eas build --platform android"
echo "     cd mobile && npx eas build --platform ios"
