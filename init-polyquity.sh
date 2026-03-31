#!/bin/bash

# ==============================================================================
# 🛑 TRAP: Automatically kill background processes and Docker when you press Ctrl+C
# ==============================================================================
trap "echo -e '\n🛑 Shutting down all Polyquity services...'; kill \$(jobs -p) 2>/dev/null; docker stop \$(docker ps -q --filter ancestor=otterscan/otterscan:latest) 2>/dev/null; exit" SIGINT SIGTERM

echo "🚀 Starting Polyquity Local Environment..."
echo "======================================================="

# 1. Start Anvil in the background
echo "⚡ Starting Anvil on port 8545..."
anvil > anvil.log 2>&1 &
sleep 3 # Give Anvil a few seconds to fully boot up

# 2. Start Otterscan via Docker (in background)
echo "🦦 Starting Otterscan on port 5840..."
export DOCKER_HOST=unix:///var/run/docker.sock
docker run --rm -p 5840:80 -d otterscan/otterscan:latest > /dev/null &

# 3. Deploy Contracts via Foundry
echo "🏗️ Deploying smart contracts..."
cd polyquity-c || { echo "❌ Could not find polyquity-c directory"; exit 1; }

# Run forge and broadcast to the local anvil network
forge script script/DeployPolyquity.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 4. Extract addresses from the broadcast JSON using jq
echo "🔍 Extracting deployed contract addresses..."
BROADCAST_FILE="broadcast/DeployPolyquity.s.sol/31337/run-latest.json"

if [ ! -f "$BROADCAST_FILE" ]; then
    echo "❌ Broadcast file not found! Deployment may have failed."
    exit 1
fi

IDENTITY_REGISTRY_ADDRESS=$(jq -r '.transactions[0].contractAddress' "$BROADCAST_FILE")
POLY_FACTORY_ADDRESS=$(jq -r '.transactions[1].contractAddress' "$BROADCAST_FILE")

echo "✅ Identity Registry: $IDENTITY_REGISTRY_ADDRESS"
echo "✅ Poly Factory: $POLY_FACTORY_ADDRESS"

# 5. Inject addresses into frontend constants.ts
echo "📝 Updating constants.ts..."
cd ../polyquity || { echo "❌ Could not find polyquity directory"; exit 1; }

CONSTANTS_FILE="src/lib/constants.ts"

sed -i.bak -E "s/export const IDENTITY_REGISTRY_ADDRESS = '.*'/export const IDENTITY_REGISTRY_ADDRESS = '$IDENTITY_REGISTRY_ADDRESS'/" "$CONSTANTS_FILE"
sed -i.bak -E "s/export const POLY_FACTORY_ADDRESS = '.*'/export const POLY_FACTORY_ADDRESS = '$POLY_FACTORY_ADDRESS'/" "$CONSTANTS_FILE"

rm -f "${CONSTANTS_FILE}.bak"

# 6. Start Indexer and Drizzle Kit Studio
echo "📡 Starting Viem Indexer..."
pnpm run indexer > indexer.log 2>&1 &

echo "🗄️ Starting Drizzle Kit Studio..."
pnpm drizzle-kit studio > drizzle.log 2>&1 &

# 7. Start the TanStack Frontend
echo "======================================================="
echo "🎉 All background services are running!"
echo "👉 Otterscan: http://localhost:5840"
echo "👉 Anvil, Indexer, and Drizzle logs are saving to their .log files."
echo "======================================================="
echo "🌐 Starting TanStack Frontend (Press Ctrl+C to stop EVERYTHING)..."

# Run the frontend in the foreground
pnpm dev
