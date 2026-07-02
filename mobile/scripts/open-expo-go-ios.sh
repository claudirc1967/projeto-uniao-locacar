#!/bin/sh
# Abre exp:// no simulador iOS (com retry). Requer Metro já rodando.
set -e
APP_ID=host.exp.Exponent
URL="${1:-exp://127.0.0.1:8081}"

if ! xcrun simctl list devices booted 2>/dev/null | grep -q Booted; then
  echo "Nenhum simulador ligado. Rode npm run ios -w mobile (preios liga o Simulator)."
  exit 1
fi

if ! xcrun simctl get_app_container booted "$APP_ID" >/dev/null 2>&1; then
  echo "Expo Go não instalado no simulador. Rode: npm run install-expo-go -w mobile"
  exit 1
fi

xcrun simctl launch booted "$APP_ID" >/dev/null 2>&1 || true
sleep 2

attempt=1
max=5
while [ "$attempt" -le "$max" ]; do
  if xcrun simctl openurl booted "$URL" 2>/dev/null; then
    echo "Aberto no simulador: $URL"
    exit 0
  fi
  echo "Tentativa $attempt/$max: simulador não respondeu; aguardando…"
  sleep 3
  attempt=$((attempt + 1))
done

echo "Não foi possível abrir $URL automaticamente."
echo "Com Metro rodando, tente manualmente:"
echo "  xcrun simctl openurl booted \"$URL\""
exit 1
