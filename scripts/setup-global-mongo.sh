#!/usr/bin/env bash
set -euo pipefail

echo "[1/5] Create docker volume (global_mongo_data)"
docker volume create global_mongo_data >/dev/null || true

echo "[2/5] Stop old global-mongo if exists"
docker rm -f global-mongo >/dev/null 2>&1 || true

echo "[3/5] Run global MongoDB container"
docker run -d \
  --name global-mongo \
  --restart unless-stopped \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin123 \
  -e MONGO_INITDB_DATABASE=madrasah \
  -v global_mongo_data:/data/db \
  mongo:7

echo "[4/5] Wait for health"
for i in {1..30}; do
  if docker exec global-mongo mongosh --quiet -u admin -p admin123 --authenticationDatabase admin --eval "db.adminCommand('ping').ok" | grep -q 1; then
    echo "MongoDB ready"
    break
  fi
  sleep 1
done

echo "[5/5] Done"
echo "Connection string: mongodb://admin:admin123@localhost:27017/madrasah?authSource=admin"
