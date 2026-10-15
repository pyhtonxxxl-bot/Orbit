#!/bin/bash
# SessionStart-Hook für Claude Code in der Cloud: installiert die Abhängigkeiten,
# damit `npm run typecheck`, `npm run lint` und `npm run build:web` sofort laufen.
set -euo pipefail

# Nur in Cloud-Sessions (claude.ai/code). Lokal installierst du selbst mit `npm install`.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# `npm install` statt `npm ci`: nutzt den gecachten Container-Stand und ist idempotent.
npm install --no-audit --no-fund

# Cloud-Sessions erreichen die Expo-API oft nicht. Offline-Modus lässt die Expo CLI
# (expo install, expo export, expo start) ohne diese Online-Abfragen arbeiten.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export EXPO_OFFLINE=1' >> "$CLAUDE_ENV_FILE"
fi
