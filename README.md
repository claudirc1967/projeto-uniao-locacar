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

## App mobile

```bash
cd mobile
cp .env.example .env
# Ajuste EXPO_PUBLIC_TRPC_URL para seu IP/servidor (veja comentários no .env.example)
npm run start
```

- **Android emulator:** se não definir `.env`, o app usa `http://10.0.2.2:4000/trpc`.
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
