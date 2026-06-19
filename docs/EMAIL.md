# E-mail transacional — Amazon SES

> Status atual: envio **real** via **Amazon SES v2** (`backend/src/email/consoleEmail.ts`).
> Contas SES novas ficam no **modo Sandbox**: só enviam para endereços previamente
> verificados. Para enviar a qualquer usuário do app, é necessário **sair do sandbox**
> (acesso de produção).

---

## Arquitetura no projeto

| Arquivo | Papel |
|---|---|
| `backend/src/email/consoleEmail.ts` | Cliente SES v2; função `sendEmail({ to, subject, text })` |
| `backend/src/email/templates.ts` | Textos dos e-mails (assunto + corpo) |

Variáveis de ambiente (backend / Railway):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SES_FROM_EMAIL` | Sim | Remetente verificado no SES (ex.: `noreply@seudominio.com.br`) |
| `AWS_REGION` | Sim | Região do SES (padrão no código: `sa-east-1`) |
| `AWS_ACCESS_KEY_ID` | Sim | Credencial IAM com permissão de envio |
| `AWS_SECRET_ACCESS_KEY` | Sim | Credencial IAM |
| `PASSWORD_RESET_URL` | Recomendada | URL da página de reset (ex.: `https://api.../reset-password`). Sem ela, o e-mail de senha envia só o código |
| `ADMIN_NOTIFY_EMAIL` | Opcional | E-mail operacional: aviso com texto pronto para colar no WhatsApp (6 eventos principais). Ver abaixo. |

Permissão IAM mínima: `ses:SendEmail` (API SES v2) na região configurada.

---

## Aviso admin para WhatsApp manual (`ADMIN_NOTIFY_EMAIL`)

Enquanto a WhatsApp Business API não estiver ativa, defina `ADMIN_NOTIFY_EMAIL`
(ex.: `admin@uniaolocacar.com.br`) no backend. A cada evento principal, o admin
recebe um e-mail **interno** com:

- nome e telefone do destinatário (E.164 quando possível);
- **mensagem sugerida** (mesmo texto de `whatsapp/templates.ts`) para copiar e colar.

Eventos cobertos: nova locação, motorista aprovado/reprovado, locação aprovada/recusada,
destaque expirando. **Não** inclui recuperação de senha.

Implementação: `backend/src/email/adminNotify.ts`. Se a variável estiver ausente,
nenhum aviso admin é enviado.

---

## Eventos que disparam e-mail (8)

| Situação | Gatilho (API) | Destinatário |
|---|---|---|
| Nova solicitação de locação | `driver.requestRental` | Locador (`emailLocador` ou e-mail do usuário) |
| Cadastro de motorista aprovado | `owner.approveDriver` | Motorista |
| Cadastro de motorista reprovado | `owner.rejectDriver` | Motorista |
| Recuperação de senha | `auth.requestPasswordReset` | Usuário solicitante |
| Locação aprovada | `owner.approveRental` | Motorista |
| Locação não aprovada | `owner.rejectRental` | Motorista |
| Lembrete de avaliação | `owner.submitRentalReturn` (situação LIBERADA) | Locador e motorista |
| Destaque expirando | Job `runHighlightExpirationSweep` (fase 5) | Locador |

Falha no envio **não interrompe** a operação principal (aprovação, locação, etc.):
erros são logados como `[EMAIL:ses:error]` e a mutation continua.

---

## Sandbox vs produção

| | **Sandbox** (conta nova) | **Production** (após aprovação) |
|---|---|---|
| Destinatário | Só e-mails **verificados** no SES | **Qualquer** e-mail válido |
| Remetente | Precisa estar verificado | Precisa estar verificado |
| Volume | Limite baixo (ex.: 200/dia) | Limites maiores (ajustáveis) |

**Importante:** em produção o usuário final **não** precisa ser cadastrado no SES.
Só o **remetente** (`SES_FROM_EMAIL` / domínio) precisa de identidade verificada.

---

## Procedimento: enviar para qualquer conta

### 1. Verificar identidade do remetente

No **AWS Console** → **Amazon SES** → região **`sa-east-1`** (mesma de `AWS_REGION`):

1. **Verified identities** → **Create identity**.
2. Preferir **Domain** (ex.: `uniaolocacar.com.br`) em vez de um e-mail solto:
   - Adicionar registros **DKIM** (e SPF, se aplicável) no DNS.
   - Usar `SES_FROM_EMAIL` com esse domínio (ex.: `noreply@uniaolocacar.com.br`).
3. Aguardar status **Verified**.

### 2. Sair do modo Sandbox

1. **Account dashboard** → ver **Account status**.
2. Se **Sandbox**, clicar em **Request production access**.
3. Preencher o formulário (exemplos úteis):
   - **Mail type:** Transactional.
   - **Use case:** Notificações do app União Locacar (locação, aprovação de motorista,
     recuperação de senha, lembrete de destaque).
   - **Website:** URL do app ou do backend no Railway.
   - **Opt-in:** Cadastro no app + aceite de termos e política de privacidade.
   - **Volume:** estimativa inicial (ex.: dezenas a centenas de e-mails/mês).
   - **Bounces/complaints:** monitorar métricas no console SES; apenas mensagens
     transacionais, sem marketing em massa.
4. Aguardar aprovação da AWS (geralmente 24–48 h, pode levar mais).
5. Confirmar que o status passou a **Production**.

### 3. Configurar produção (Railway)

Definir as variáveis listadas acima no serviço do backend e redeploy.

Teste: disparar um fluxo (ex.: recuperação de senha) para um e-mail **não** cadastrado
no SES — deve ser entregue após sair do sandbox.

---

## Desenvolvimento e testes (ainda no Sandbox)

Enquanto a conta estiver no sandbox:

1. **Verified identities** → **Create identity** → **Email address**.
2. Confirmar o link na caixa de entrada de cada e-mail de teste (locador, motorista, etc.).
3. Só esses endereços receberão mensagens.

Alternativa: manter sandbox só em dev local e usar conta em **Production** no Railway.

---

## Boas práticas (produção)

- Verificar **domínio** + **DKIM** (melhora entrega e reduz spam).
- Configurar **MAIL FROM** no SES (opcional, recomendado).
- Monitorar **bounce rate** e **complaint rate** no dashboard SES.
- Manter mensagens **transacionais** (sem campanhas não solicitadas).
- `PASSWORD_RESET_URL` apontando para `GET /reset-password` do backend (página já
  existente em `backend/src/index.ts`).

---

## Solução de problemas

| Sintoma | Causa provável |
|---|---|
| `MessageRejected: Email address is not verified` (destinatário) | Conta ainda em **Sandbox** |
| `SES não configurado. Defina SES_FROM_EMAIL` | Variável ausente no ambiente |
| E-mail não chega, sem erro no app | Verificar spam; identidade do remetente; região SES vs `AWS_REGION` |
| `[EMAIL:ses:error]` no log Railway | Credenciais IAM, permissão `ses:SendEmail`, ou remetente não verificado |

Logs: buscar `[EMAIL:ses:error]` nos **Deploy Logs** do serviço backend no Railway.

---

## Relacionado

- `docs/WHATSAPP.md` — notificações paralelas por WhatsApp (hoje só log).
- `docs/DESTAQUES.md` — lembrete de expiração de destaque (e-mail + WhatsApp).
- `README.md` — variáveis mínimas do backend.
