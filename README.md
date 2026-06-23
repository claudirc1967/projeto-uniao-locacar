# União LocaCar — backend + app mobile

Monorepo com **API Node (Express + tRPC + JWT + Prisma)** e **app Expo (React Native)**.

## Requisitos

- Node 20+
- Conta AWS (ou R2 compatível com S3) com bucket **privado** na região **`sa-east-1`** para fotos de veículos
- npm

## Backend

```bash
cd backend
cp .env.example .env
# Preencha AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
npm run db:push
npm run dev
```

API: `http://localhost:4000/trpc` (health: `GET /health`).

Para recuperação de senha em produção, configure o envio por Amazon SES com
`SES_FROM_EMAIL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`.
Defina `PASSWORD_RESET_URL` apontando para a rota estática do backend, por
exemplo `https://uniaolocacar.com.br/reset-password` (ou o domínio público da API
na EC2). Sem essa variável, o
e-mail envia apenas o código para colar no app.

## App mobile

```bash
cd mobile
cp .env.example .env
# Ajuste EXPO_PUBLIC_TRPC_URL para seu IP/servidor (veja comentários no .env.example)
npm run start
```

- **Android emulator:** se não definir `.env`, o app usa `http://10.0.2.2:4000/trpc`.
- **Simulador iOS:** use `npm run dev:mobile:ios` (`--lan` + `127.0.0.1`; resolve ícone/splash do manifest). Se o menu de login do Expo aparecer: **↓** → **Proceed anonymously** → **Enter**, ou `npx expo login` uma vez. Para pular validações online (pode gerar aviso de `icon.png`): `npm run ios:offline -w mobile`. **Não** use `CI=1`.
- Erro *Unable to lookup in current state: Shutdown*: o simulador estava desligado; `npm run dev:mobile:ios` agora liga o Simulator e espera o boot (`preios`) antes do Expo Go.
- *Could not connect to the server*: **Ctrl+C**, `npm run dev:mobile:ios` de novo. Com Metro rodando: `xcrun simctl openurl booted \"exp://127.0.0.1:8081\"`.
- *Expo Go is not installed*: o `preios` tenta instalar do cache (`~/.expo`). Se falhar: `npm run install-expo-go -w mobile` ou, com internet, `npm run dev:mobile:ios`.
- **Dispositivo físico:** use o IP da máquina na LAN, ex. `http://192.168.x.x:4000/trpc`.

### Fotos (presigned PUT)

1. `owner.createVehicle` → `vehicleId`
2. `owner.requestVehiclePhotoUploads` → URLs PUT + `key`
3. App faz `PUT` direto no storage
4. `owner.addVehiclePhotos` confirma metadados

Sem upload multipart pesado no backend.

## Estrutura do app (`mobile/src`)

- `api/` — cliente tRPC tipado (`AppRouter` importado do backend), header `Authorization: Bearer`
- `navigation/` — stack principal
- `screens/` — auth, owner, driver, marketplace, rental
- `components/` — `CepAddressForm`, botões
- `hooks/` — `AuthContext` + SecureStore
- `utils/` — máscaras, validação de fotos, upload com retry

## Papéis

- **Proprietário:** veículos, fotos, requisitos, motoristas pendentes, aprovar/recusar locações, instruções de retirada e contrato.
- **Motorista:** pré-cadastro (CEP via `address.lookupCep`), status, marketplace, solicitar locação, ver instruções/contrato quando ativo.
