#!/bin/sh
# Metro + abertura do Expo Go no simulador (openurl com retry não derruba o Metro).
set -e
cd "$(dirname "$0")/.."
export REACT_NATIVE_PACKAGER_HOSTNAME="${REACT_NATIVE_PACKAGER_HOSTNAME:-127.0.0.1}"

npx expo start --lan &
metro_pid=$!

cleanup() {
  kill "$metro_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "Aguardando Metro…"
sleep 8

if sh scripts/open-expo-go-ios.sh; then
  :
else
  echo "Metro continua em http://127.0.0.1:8081 — pressione i no terminal ou npm run ios:open -w mobile"
fi

wait "$metro_pid"
