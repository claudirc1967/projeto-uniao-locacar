# Tecnologias — União LocaCar

Visão geral das tecnologias envolvidas no monorepo **backend + app mobile/web**.

---

## Arquitetura

Monorepo **npm workspaces** com dois pacotes:

| Pacote | Papel |
|--------|--------|
| `backend` | API REST/tRPC, regras de negócio, integrações |
| `mobile` | App Expo (iOS, Android e web) |

Comunicação tipada entre app e API via **tRPC** (client no app ↔ server no backend).

---

## Backend

| Camada | Tecnologia |
|--------|------------|
| Runtime | **Node.js** (20+) |
| Linguagem | **TypeScript** |
| HTTP | **Express** |
| API | **tRPC** + **SuperJSON** |
| Validação | **Zod** |
| ORM / DB | **Prisma** → **PostgreSQL** |
| Banco (hosting) | **Supabase** (projetos separados dev/prod) |
| Auth | **JWT** + **bcryptjs** |
| Armazenamento de arquivos | **AWS S3** (fotos de veículos, contratos PDF) |
| E-mail transacional | **Amazon SES** (`@aws-sdk/client-sesv2`) |
| PDF | **pdf-lib** (contratos de locação) |
| WhatsApp | Camada própria (`backend/src/whatsapp/`) — driver `log` ou HTTP via provedor externo |
| Testes | **Node test runner** + **tsx** |

Documentação relacionada:

- [`backend/docs/DATABASE.md`](../backend/docs/DATABASE.md) — Supabase, dev vs produção
- [`docs/EMAIL.md`](EMAIL.md) — Amazon SES
- [`docs/WHATSAPP.md`](WHATSAPP.md) — WhatsApp transacional

---

## Mobile / frontend

| Camada | Tecnologia |
|--------|------------|
| Framework | **Expo SDK 55** |
| UI | **React 19** + **React Native 0.83** |
| Componentes | **React Native Paper** (Material Design) |
| Navegação | **React Navigation** (native stack) |
| Dados / cache | **TanStack React Query** + **tRPC React** |
| Plataformas | **iOS**, **Android**, **Web** (React Native Web) |
| Módulos nativos | expo-image-picker, expo-secure-store, expo-sharing, expo-clipboard, etc. |
| Build nativo | **EAS Build** (Expo Application Services) |

Estrutura principal do app: `mobile/src/` (`api/`, `navigation/`, `screens/`, `components/`, `hooks/`, `utils/`).

---

## Infraestrutura e deploy

| Parte | Onde roda |
|-------|-----------|
| API (produção) | **EC2** — `api.uniaolocacar.com.br` |
| App web | **GitHub Pages** — `uniaolocacar.com.br` |
| CI do app web | **GitHub Actions** (`.github/workflows/pages.yml`) — export Expo + deploy na branch `gh-pages` |
| Fotos e arquivos | **AWS S3** (região `sa-east-1`) |
| E-mail transacional | **Amazon SES** |

---

## Módulos de produto (referência)

| Módulo | Descrição |
|--------|-----------|
| Marketplace | Listagem de veículos, solicitação de locação |
| Destaques | Tiers Bronze/Prata/Ouro, pagamento PIX, confirmação admin — ver [`docs/DESTAQUES.md`](DESTAQUES.md) |
| Campanhas / anúncios | House ads, placements, elegibilidade — ver [`docs/ANUNCIOS.md`](ANUNCIOS.md) |
| Contratos | Template + geração de PDF |
| Páginas estáticas | `mobile/static-web/` (sobre, termos, parceiros, PWA/manifest) |

---

## Resumo

**TypeScript full-stack**: Expo/React Native (mobile + web) + Express/tRPC/Prisma no backend, PostgreSQL no Supabase, AWS (S3 + SES), deploy em EC2 + GitHub Pages.

Para setup local, ver [`README.md`](../README.md).
