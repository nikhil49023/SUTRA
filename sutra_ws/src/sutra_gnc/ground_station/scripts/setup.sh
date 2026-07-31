#!/usr/bin/env bash

set -e

echo "========================================================="
echo "   Smart Horizon GCS — Environment Setup Script"
echo "========================================================="

echo "[1/3] Checking Node.js version..."
node -v

echo "[2/3] Installing NPM dependencies..."
npm ci

echo "[3/3] Testing production build..."
npm run build

echo "========================================================="
echo "   Setup completed successfully! Run 'npm run dev' to start."
echo "========================================================="
