# WhatsApp — envio efetivo (implementação futura)

> Status atual: **somente log**. O backend monta as mensagens e registra no console
> (`[WHATSAPP:log]`), sem envio real. Este documento descreve o trâmite para ativar
> o envio efetivo via WhatsApp Business API.

---

## Arquitetura já pronta

O código está estruturado com driver plugável em `backend/src/whatsapp/`:

| Arquivo | Papel |
|---|---|
| `sendWhatsApp.ts` | Ponto de entrada; decide driver e normaliza telefone (E.164) |
| `config.ts` | Lê envs (`WHATSAPP_ENABLED`, `WHATSAPP_DRIVER`, nomes de templates) |
| `templates.ts` | Monta as mensagens (templateId + variáveis + corpo) |
| `logDriver.ts` | Driver atual: imprime no console com telefone mascarado |
| `httpDriver.ts` | Driver de envio real via HTTP (genérico — adaptar ao provedor) |
| `phone.ts` | Normalização/máscara de telefone |
| `types.ts` | `WHATSAPP_TEMPLATE_IDS` e tipos |

### Eventos que disparam WhatsApp (6)

| Evento (`templateId`) | Gatilho | Destinatário | Env var do template |
|---|---|---|---|
| `rental_requested` | Motorista solicita locação | Locador | `WHATSAPP_TEMPLATE_RENTAL_REQUESTED` |
| `driver_approved` | Cadastro de motorista aprovado | Motorista | `WHATSAPP_TEMPLATE_DRIVER_APPROVED` |
| `driver_rejected` | Cadastro de motorista reprovado | Motorista | `WHATSAPP_TEMPLATE_DRIVER_REJECTED` |
| `rental_approved` | Locação aprovada | Motorista | `WHATSAPP_TEMPLATE_RENTAL_APPROVED` |
| `rental_rejected` | Locação não aprovada | Motorista | `WHATSAPP_TEMPLATE_RENTAL_REJECTED` |
| `highlight_expiring` | Destaque expira em até 3 dias (job fase 5) | Locador | `WHATSAPP_TEMPLATE_HIGHLIGHT_EXPIRING` |

Todos os envios são *fire-and-forget* (`.catch()`): falha no WhatsApp nunca quebra a
operação principal. Eventos que têm e-mail mas **não** têm WhatsApp (decisão atual):
recuperação de senha (segurança) e lembrete de avaliação.

---

## Trâmite para ativar o envio real

### 1. Contratar um provedor de WhatsApp Business API

Opções:

- **Meta Cloud API direto** — sem custo de intermediário (paga por conversa de
  template); exige mais configuração própria.
- **BSPs**: Twilio, Zenvia, Infobip, 360dialog, Gupshup — cobram por mensagem,
  simplificam integração e suporte.

Trâmite junto ao provedor/Meta:

1. Criar conta **Meta Business** e verificar a empresa (CNPJ da União Locacar).
2. Registrar um **número de telefone dedicado** para a API (não pode ser número já
   usado no app WhatsApp comum).
3. Definir nome de exibição e aguardar aprovação.

### 2. Aprovar os templates de mensagem (HSM)

Mensagens iniciadas pela empresa exigem **templates pré-aprovados pela Meta**.
São 6 templates a submeter (um por evento da tabela acima), com placeholders
`{{1}}`, `{{2}}`, … correspondendo às `variables` que `templates.ts` já monta.

- Os textos atuais estão em `backend/src/whatsapp/templates.ts` (campo `body`)
  e servem de base para a submissão.
- Aprovação leva de minutos a dias; textos transacionais costumam passar fácil.

### 3. Configurar o ambiente do backend

No `backend/.env` local e nas variáveis do serviço no Railway (linhas já existem
comentadas no `.env`):

```bash
WHATSAPP_ENABLED=true
WHATSAPP_DRIVER=http
WHATSAPP_API_URL=<endpoint do provedor>
WHATSAPP_API_TOKEN=<token>
WHATSAPP_FROM_NUMBER=+55...
WHATSAPP_TEMPLATE_RENTAL_REQUESTED=uniao_rental_requested_v1
WHATSAPP_TEMPLATE_DRIVER_APPROVED=uniao_driver_approved_v1
WHATSAPP_TEMPLATE_DRIVER_REJECTED=uniao_driver_rejected_v1
WHATSAPP_TEMPLATE_RENTAL_APPROVED=uniao_rental_approved_v1
WHATSAPP_TEMPLATE_RENTAL_REJECTED=uniao_rental_rejected_v1
WHATSAPP_TEMPLATE_HIGHLIGHT_EXPIRING=uniao_highlight_expiring_v1
```

Para desativar o envio (voltar ao log): `WHATSAPP_DRIVER=log`.
Para desligar tudo: `WHATSAPP_ENABLED=false` (ou remover a env).

### 4. Adaptar o `httpDriver.ts` ao formato do provedor

Único ponto de **código** provável. O payload atual é genérico:

```json
{
  "from": "...",
  "to": "+55...",
  "template": "nome_do_template",
  "variables": ["..."],
  "body": "texto completo"
}
```

Cada provedor tem o seu formato (Meta Cloud API usa `messaging_product: "whatsapp"`
+ `components`; Twilio usa `ContentSid` + form-encoded; etc.). Ajustar apenas
`sendWhatsAppViaHttp` — o restante do fluxo (templates, eventos, fire-and-forget)
não muda.

### 5. Testar e ativar

1. Testar em dev com número próprio (provedores têm número/sandbox de teste).
2. Conferir telefones válidos em `OwnerProfile.phone` e no perfil do motorista
   (`normalizePhoneToE164` já cuida do formato +55).
3. Ativar as envs no Railway e acompanhar os logs — erros aparecem como
   `Falha ao enviar WhatsApp (...)` sem quebrar as operações.

---

## Pontos de atenção

- **Custo**: no Brasil, conversas de utilidade custam centavos por mensagem —
  relevante se o volume crescer.
- **Opt-in**: a política do WhatsApp exige consentimento do usuário para receber
  mensagens; incluir o aceite no cadastro (termos de uso).
- **Qualidade do número**: mensagens marcadas como spam degradam o *quality rating*
  e podem limitar o envio — manter apenas mensagens transacionais como as atuais.

---

## Relacionado

- `docs/DESTAQUES.md` — fase 5 (lembrete de expiração usa e-mail + WhatsApp).
- `backend/src/email/templates.ts` — e-mails equivalentes aos eventos.
