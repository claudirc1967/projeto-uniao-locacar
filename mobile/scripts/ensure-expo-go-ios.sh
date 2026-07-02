#!/bin/sh
# Instala Expo Go no simulador iOS a partir do cache local (~/.expo), se ainda não estiver instalado.
set -e
APP_ID=host.exp.Exponent

if ! xcrun simctl list devices booted 2>/dev/null | grep -q Booted; then
  echo "Nenhum simulador ligado. Use npm run ios (preios liga o Simulator)."
  exit 1
fi

launch_expo_go() {
  xcrun simctl launch booted "$APP_ID" >/dev/null 2>&1 || true
  sleep 2
}

if xcrun simctl get_app_container booted "$APP_ID" >/dev/null 2>&1; then
  launch_expo_go
  exit 0
fi

CACHE_DIR="${HOME}/.expo/ios-simulator-app-cache"
APP=$(ls -dt "${CACHE_DIR}"/*.app 2>/dev/null | head -1)

if [ -z "$APP" ]; then
  echo "Expo Go não está no simulador e não há cache em ~/.expo/ios-simulator-app-cache"
  echo "Instale uma vez com internet:"
  echo "  npm run ios -w mobile"
  echo "  (ou: cd mobile && REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start --ios --lan)"
  exit 1
fi

echo "Instalando Expo Go no simulador: $APP"
xcrun simctl install booted "$APP"
launch_expo_go
