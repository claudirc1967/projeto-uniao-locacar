# Banco de dados: dev vs produção

Este backend usa **PostgreSQL** (Prisma + Supabase). As migrations em
`prisma/migrations/` são só para Postgres (enums, RLS, etc.).

**Não use SQLite local** (`file:./dev.db`) neste projeto — o `schema.prisma`
está fixo em `provider = "postgresql"`. Trocar para SQLite exigiria reescrever
migrations e perder compatibilidade com produção.

## Recomendado: segundo projeto Supabase para dev

### 1. Criar projeto de desenvolvimento

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard).
2. **New project** → nome ex.: `uniao-locacar-dev`.
3. Anote a senha do banco (`postgres`).
4. Em **Project Settings → Database → Connection string → URI**, copie a URL
   (modo *Session* ou *Direct*; inclua `?sslmode=require`).

### 2. Configurar o `.env` local (só na sua máquina)

No `backend/.env` **da sua máquina**, use o projeto **dev**:

```env
NODE_ENV=development
DATABASE_URL="postgresql://postgres:SENHA_DEV@db.SEU_PROJETO_DEV.supabase.co:5432/postgres?sslmode=require"
PORT=4000
```

Na **EC2 (produção)**, mantenha o projeto **prod**:

```env
NODE_ENV=production
DATABASE_URL="postgresql://postgres:SENHA_PROD@db.SEU_PROJETO_PROD.supabase.co:5432/postgres?sslmode=require"
PORT=4000
```

Nunca commite `.env` — só `backend/.env.example`.

### 3. Aplicar o schema no banco dev (primeira vez)

```bash
cd backend
npm run db:migrate:deploy
```

Isso roda todas as migrations em `prisma/migrations/` no banco apontado pelo
`DATABASE_URL` do seu `.env` local.

### 4. Dados iniciais (opcional)

```bash
npm run admin:seed -w backend
npm run catalog:seed -w backend
```

Credenciais padrão do admin: ver comentários em `scripts/seed-admin.mjs`.

### 5. Desenvolvimento do dia a dia

| Comando | Quando usar | Onde |
|--------|-------------|------|
| `npm run dev -w backend` | API local | sua máquina |
| `npm run db:migrate -w backend` | Nova migration após mudar `schema.prisma` | **só contra dev** |
| `npm run db:migrate:deploy -w backend` | Aplicar migrations existentes | dev local ou EC2 prod |
| `npm run db:push -w backend` | Atalho sem migration (evite em prod) | preferir só dev |

Fluxo seguro:

1. Altere `schema.prisma` localmente (`.env` → banco **dev**).
2. `npm run db:migrate -w backend` → gera arquivo em `prisma/migrations/`.
3. Commit da migration no Git.
4. Na EC2: `git pull`, `npm run db:migrate:deploy -w backend`, restart da API.

### 6. Backup de produção

No Supabase prod: **Database → Backups** (plano pago) ou export manual:

```bash
pg_dump "$DATABASE_URL_PROD" -Fc -f backup-prod.dump
```

O script `npm run db:backup` deste repo é legado para SQLite e **não** serve
para Postgres/Supabase.

## Egress no Supabase e backup semanal (produção)

Com banco pequeno (~30 MB), o uso normal do app gera **pouco egress**. Picos de
**GB por dia** costumam vir de **backup repetido**, **migrate/deploy** ou **dev
local apontando para prod** — não do número de usuários.

Estimativa saudável: app + 4 backups/mês + deploys **< 1 GB/mês** (limite free:
5 GB).

### 1. Conferir no EC2

Conecte na EC2 e rode na ordem:

**Cron / tarefas agendadas**

```bash
crontab -l
sudo crontab -l
ls -la /etc/cron.d/ /etc/cron.daily/ 2>/dev/null
systemctl list-timers --all 2>/dev/null | head -30
```

Procure: `pg_dump`, `backup`, `prisma`, `migrate`, scripts em loop.

**Processos Node / PM2**

```bash
pm2 list
pm2 logs --lines 100 --nostream
# ou, se usar systemd:
systemctl status seu-backend
journalctl -u seu-backend -n 200 --no-pager
```

Procure: reinícios em loop, erro de conexão ao banco a cada poucos segundos.

**`.env` de produção (só no servidor)**

```bash
cd /caminho/do/projeto/backend
grep DATABASE_URL .env | sed 's/:[^:@]*@/:***@/'   # mascara senha
```

Confirme:

- URL aponta para **Supabase de produção**
- **`pg_dump`** usa Session/Direct (porta 5432), **sem** `pgbouncer=true`
- **Uma** instância do backend rodando (não duas apontando pro mesmo banco)

**Histórico de comandos**

```bash
history | grep -E 'pg_dump|migrate|prisma|backup' | tail -50
```

Procure várias tentativas no mesmo dia (comum durante deploy/backup).

**Scripts de deploy**

```bash
ls -la ~/scripts/ /opt/*/scripts/ 2>/dev/null
cat deploy.sh 2>/dev/null || true
```

Procure `migrate deploy` + `pg_dump` a cada deploy.

### 2. Conferir no Mac (dev local)

**`.env` local não deve apontar para produção no dia a dia**

```bash
cd backend
grep DATABASE_URL .env
```

| Uso | Recomendação |
|-----|----------------|
| Dev diário | Supabase **dev** (segundo projeto) |
| Migrate/backup em prod | Só quando for deploy, com cuidado |

Se o Mac usou produção durante testes de backup/migrate, o egress **soma** com
o EC2.

**Ferramentas abertas contra prod**

- Supabase Table Editor / SQL Editor
- `npx prisma studio` com `.env` de produção
- Vários terminais com `tsx watch` + prod

Feche ou use banco dev.

### 3. Regras para não estourar egress

| Faça | Evite |
|------|--------|
| Backup **1× por semana**, só no **EC2** | `pg_dump` “só pra testar” várias vezes |
| Migrate **1× por deploy** (`db:migrate:deploy`) | Rodar migrate local **e** no EC2 sem necessidade |
| Dev local no Supabase **dev** | Mac + EC2 + painel Supabase no prod ao mesmo tempo |
| Manter **últimos 4–8 backups** | Backup diário (desnecessário com banco pequeno) |

### 4. Backup semanal no EC2

**Script** (ajuste `/caminho/do/projeto/backend`):

```bash
sudo mkdir -p /opt/uniao/backups
sudo nano /opt/uniao/backup-db.sh
```

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/uniao/backups"
KEEP=8
STAMP=$(date +%Y-%m-%d_%H-%M)
FILE="$BACKUP_DIR/uniao_${STAMP}.sql.gz"

set -a
source /caminho/do/projeto/backend/.env
set +a

mkdir -p "$BACKUP_DIR"
pg_dump "$DATABASE_URL" | gzip > "$FILE"

ls -1t "$BACKUP_DIR"/uniao_*.sql.gz | tail -n +$((KEEP + 1)) | xargs -r rm --

echo "Backup OK: $FILE ($(du -h "$FILE" | cut -f1))"
```

```bash
chmod +x /opt/uniao/backup-db.sh
/opt/uniao/backup-db.sh   # teste manual 1×
```

**Cron — domingo 3h**

```bash
crontab -e
```

```cron
0 3 * * 0 /opt/uniao/backup-db.sh >> /var/log/uniao-backup.log 2>&1
```

**URL para `pg_dump`:** Supabase → Settings → Database → **Session** ou
**Direct**, com `sslmode=require`, **sem** `pgbouncer=true`. Se IPv6 falhar no
EC2, use pooler IPv4 ou `hostaddr`.

Egress do backup: ~tamanho do banco por semana (ex.: 29 MB × 4 ≈ 116 MB/mês).

### 5. Se o egress continuar alto

1. Supabase → **Settings → Usage** → breakdown por dia.
2. Anote dias com pico e cruze com deploy/backup no EC2 e testes no Mac.
3. Supabase → **Database Settings** → reset da senha se suspeitar de vazamento
   (improvável).
4. Abrir ticket no **Supabase Support** informando: tamanho do banco (~MB),
   egress total (~GB), sem uso de Storage/Auth/Realtime.

| Item | Ação |
|------|------|
| Origem provável de picos | Leituras repetidas (backup/migrate/dev), não usuários |
| Backup ideal | 1×/semana no EC2, manter 8 arquivos |
| Dev local | Supabase **dev**, não prod |
| Próximo passo | Rodar a seção 1 no EC2 e anotar cron/history |

## O que não misturar

- **Mesmo `DATABASE_URL` em dev e prod** — risco de apagar ou corromper dados
  reais com seeds, migrations de teste ou `db push`.
- **`db push` / `db migrate dev` na EC2** sem revisar — use `db:migrate:deploy`
  com migrations já commitadas.
- **S3**: dev e prod podem compartilhar bucket; para isolamento total, use
  bucket separado no `.env` local.

## Resumo

| Ambiente | Onde | `DATABASE_URL` | `NODE_ENV` |
|----------|------|----------------|------------|
| Desenvolvimento | sua máquina | Supabase **dev** | `development` |
| Produção | EC2 | Supabase **prod** | `production` |
