#!/usr/bin/env bash

set -e

echo "========================================================="
echo "   Smart Horizon GCS — Automated Test Suite"
echo "========================================================="

echo "[1/2] Verifying TypeScript types & compilation..."
npx tsc --noEmit

echo "[2/2] Running production build validation..."
npm run build

echo "========================================================="
echo "   All tests and build checks PASSED!"
echo "========================================================="
