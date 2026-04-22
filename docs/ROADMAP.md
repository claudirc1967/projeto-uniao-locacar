# Roadmap de produto — União LocaCar

Documento vivo: prioridades podem mudar conforme feedback de locadores, motoristas e operação.

## Estado atual (baseline)

Já existem no monorepo:

- **Autenticação:** login, cadastro por papel (locador / motorista), JWT, recuperação de senha.
- **Privacidade:** aceite de política, exclusão de conta (LGPD em linha com o modelo atual).
- **Locador:** CRUD de veículos, fotos (S3 presigned), requisitos, parceiros tipo CRM e vínculo por veículo (ver [PARCEIROS.md](./PARCEIROS.md)), marketplace do ponto de vista de dono, aprovação/recusa de locações, instruções e contrato (texto/PDF), bloqueio motorista–veículo, conclusão de locação com situação (ativa / liberada / pendente).
- **Motorista:** pré-cadastro com CEP, marketplace com filtros, solicitação de locação, visualização de contrato quando aplicável.
- **Avaliações:** pós-locação bidirecional com agregados no perfil; ideias adicionais em [github-issue-avaliacoes-pos-locacao.md](./github-issue-avaliacoes-pos-locacao.md).
- **Limites de negócio no veículo:** km por contrato / km livre, texto de formas de pagamento (`paymentNotes`), caução descritiva, seguro/manutenção e apólice em texto.

**Lacunas explícitas hoje:** sem calendário de reserva por data/hora; pagamento é apenas descritivo; sem vistoria estruturada por locação; e-mail transacional ainda em modo console no backend; sem push no app; sem chat in-app.

---

## Fase 1 — Operação e confiança (alto impacto / relativamente contido)

Objetivo: reduzir disputas e dar rastreio mínimo do que aconteceu na locação.

| Entrega | Descrição | Notas |
|--------|-----------|--------|
| **Vistoria entrada/saída** | Checklist (lataria, vidros, pneus, interior, etc.), nível de combustível, **hodômetro** na retirada e na devolução, com fotos no storage (reutilizar padrão presigned). | Amarra limite de km do veículo à leitura real por `rentalId`. |
| **Registro financeiro mínimo por locação** | Valor combinado (ex.: centavos), status simples (pendente / pago / parcial), opcional campo de caução registrada. | Não exige gateway no primeiro passo; pode ser “marcar como pago” + histórico. |
| **E-mail transacional real** | Substituir ou complementar `consoleEmail` com provedor (SES, Resend, etc.): nova solicitação, aprovação/recusa, lembrete opcional. | Alinhar variáveis de ambiente e limites de envio. |

**Critério de sucesso:** locador e motorista conseguem provar estado do carro e km no início/fim; existe histórico financeiro consultável por locação.

---

## Fase 2 — Engajamento e retenção

Objetivo: lembrar usuários no momento certo e manter comunicação no ecossistema.

| Entrega | Descrição | Notas |
|--------|-----------|--------|
| **Push notifications (Expo)** | Novas solicitações, mudança de status da locação, lembrete de avaliação (conforme [github-issue-avaliacoes-pos-locacao.md](./github-issue-avaliacoes-pos-locacao.md)). | Tokens por dispositivo, preferências de opt-in. |
| **Lembretes de avaliação** | Job agendado ou fila: se locação concluída e não avaliou em X horas, um lembrete (push e/ou e-mail). | Respeitar “pular” e não spammar. |
| **Mensagens na locação (MVP)** | Thread ou lista curta de mensagens atreladas a `rentalId` (não substituir WhatsApp de imediato, mas registrar o essencial). | Moderar escopo: texto + timestamps; anexos opcionais depois. |

**Critério de sucesso:** queda de “esqueci de responder” e aumento da taxa de avaliação sem tornar o app intrusivo.

---

## Fase 3 — Calendário e concorrência

Objetivo: suportar planejamento e reduzir conflito manual.

| Entrega | Descrição | Notas |
|--------|-----------|--------|
| **Datas de reserva** | Início e fim previstos (ou janela) no fluxo de solicitação/aprovação. | Regras de sobreposição com `ACTIVE` / `APPROVED` e indisponibilidade. |
| **Indisponibilidade do veículo** | Locador marca períodos em que o carro não aluga (manutenção, uso próprio). | Pode conviver com o flag `available` atual evoluindo para regra por intervalo. |
| **Favoritos e alertas (opcional)** | Motorista salva veículos; notificação quando houver vaga ou mudança de preço na região. | Depende de Fase 2 (push). |

**Critério de sucesso:** menos idas e vindas por DM para combinar data; menos erro humano de “dois interessados no mesmo dia”.

---

## Fase 4 — Risco, compliance e escala (Brasil)

Objetivo: cobrir dores típicas de locação e preparar crescimento.

| Entrega | Descrição | Notas |
|--------|-----------|--------|
| **Multas e responsabilidade** | Cadastro de autuação vinculado a locação/placa: valor, status, quem assume. | Integração com órgãos é fase posterior; começar como registro + anexo. |
| **Evidência de CNH** | Upload seguro da CNH (mesmo padrão de storage), política de retenção explícita. | Revisar base legal e texto de privacidade. |
| **Recibo / NF** | Fluxo manual: anexar PDF gerado fora do app ou campos para número de NF; automação depois. | Alinha MEI/PJ sem travar quem é PF. |
| **Suporte e mediação** | Tipo “chamado” ligado à locação (categoria, status). | Pode ser só visível a operação interna no início. |
| **Gateway de pagamento (quando fizer sentido)** | PIX, cartão ou split — depende de modelo de receita da plataforma. | Depende de definição comercial e jurídica. |

**Critério de sucesso:** operação consegue fechar o ciclo multa/documento sem planilhas paralelas para tudo.

---

## Fase 5 — Marketplace e parceiros (evolução)

Objetivo: profundidade de produto já alinhada em documentos existentes.

| Entrega | Descrição | Notas |
|--------|-----------|--------|
| **Reputação na listagem** | Ordenação ou selos por avaliação (a [issue de avaliações](./github-issue-avaliacoes-pos-locacao.md) lista isso como fora do MVP inicial). | Cuidado com viés e cold start. |
| **Parceiro com acesso (opcional)** | Conta ou link mágico para oficina/seguradora, conforme [PARCEIROS.md](./PARCEIROS.md). | Só quando houver demanda clara. |
| **Painel web para locador** | Gestão de frota e locações no desktop. | Complementa o app mobile. |

---

## O que não é prioridade neste roadmap (até mudar requisito)

- Motorização completa de sinistro com seguradora.
- Integração automática com DETRAN para multas.
- App white-label ou multi-tenant sem necessidade de negócio explícita.

---

## Como usar este documento

1. **Fase 1** costuma ser o melhor custo/benefício após o estável atual.
2. Cada fase pode virar issues no GitHub com critérios de aceite próprios.
3. Rever trimestralmente: o que está “Fase 3” pode subir se o time operacional pedir calendário antes de push.

Última atualização: abril/2026.
