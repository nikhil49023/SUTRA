#!/usr/bin/env bash
# SUTRA Verification Agent runner (Antigravity SDK)
# Usage: ./run_sutra_verification_agent.sh ["optional task prompt"]
set -euo pipefail
cd "$(dirname "$0")/.."

VENV="scripts/.venv-antigravity"
if [ ! -x "$VENV/bin/python" ]; then
  echo "ERROR: venv missing. Run: python3 -m venv scripts/.venv-antigravity && $VENV/bin/pip install google-antigravity"
  exit 1
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "GEMINI_API_KEY is not set. Export it (or enable billing on the Vertex project)."
  exit 1
fi

exec "$VENV/bin/python" scripts/sutra_verification_agent.py "$@"
