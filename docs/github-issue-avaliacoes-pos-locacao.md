# Issue (copiar/colar no GitHub)

## Título sugerido

```
feat: avaliações pós-locação (estrelas 1–5, bidirecional, UX leve)
```

## Corpo da issue (Markdown)

```markdown
## Objetivo

Permitir que **locador** e **locatário** avaliem um ao outro após uma locação, com nota de **1 a 5 estrelas**, sem tornar o fluxo pesado nem forçar comentários longos.

## Contexto / problema

Avaliações espontâneas tendem a vir mais de quem teve problema. A UX deve priorizar **rapidez** (estrelas + chips opcionais) e **momento certo** (pós-conclusão), para aumentar a taxa de resposta e a confiança na plataforma.

## Decisões de produto (já alinhadas)

### Quando

- Disparar após a locação estar **concluída** (status adequado no domínio).
- Janela opcional (ex.: 14 dias) para avaliar depois, mas o foco é capturar **na hora** ou em tela dedicada.

### Onde (UX)

- Card/modal na tela de **detalhe da locação** quando ela estiver concluída.
- Alternativa: modal leve **uma vez** ao concluir; se o usuário fechar, o convite permanece como card na tela.
- Lembrete único (push/email) opcional se não avaliou em 24–48h.

### Como (para não ser chato)

1. **Passo 1 (rápido):** “Como foi?” → **1–5 estrelas** (tap).
2. **Passo 2 (opcional):**
   - Se **4–5**: chips de elogio (ex.: “Pontual”, “Comunicação boa”, “Veículo em bom estado”).
   - Se **1–3**: chips de problema (ex.: “Atraso”, “Comunicação ruim”, “Problema no veículo”).
3. Comentário **sempre opcional**.
4. Botões claros: **Enviar** e **Pular** (sem culpa).

### Regras de negócio

- Avaliação vinculada a **`rentalId`** (participantes reais da locação).
- Duas direções independentes:
  - Locador → locatário
  - Locatário → locador
- **Uma avaliação por direção por locação** (unique `(rentalId, direction)` ou equivalente).
- Opcional: edição curta (ex.: 30 min) ou sem edição (MVP mais simples).

## Escopo técnico (alto nível)

### Dados (sugestão)

- Tabela/modelo de avaliação com: `rentalId`, `fromUserId`, `toUserId`, `direction` (enum), `stars` (1–5), `tags` (JSON/array opcional), `comment` (opcional), timestamps.
- Agregados no perfil: `averageRating`, `ratingCount` (atualizar ao salvar ou job).

### Backend

- Procedure(s) tRPC: criar avaliação (validações de status da locação e papel do usuário), eventualmente listar avaliações públicas agregadas.

### Mobile

- UI de estrelas + chips + comentário opcional.
- Exibir média/contagem no perfil quando existir.

## Critérios de aceite (MVP)

- [ ] Usuário conclui locação e consegue **avaliar em ≤ 10 segundos** só com estrelas.
- [ ] É possível **pular** sem bloquear o restante do app.
- [ ] Não é possível avaliar sem pertencer àquela locação / papel incorreto.
- [ ] Não permite duplicar avaliação na mesma direção para o mesmo `rentalId`.
- [ ] Perfil exibe **média e quantidade** (mesmo que só no próprio usuário no MVP).

## Fora do escopo (fase 2)

- Moderação de comentários, denúncias, ML, ordenação do marketplace por reputação.

## Notas

- Referência de UX: chips reduzem comentários negativos longos e aumentam taxa de resposta.
```

---

*Este arquivo existe só para copiar/colar. Pode apagar depois de abrir a issue no GitHub.*

## Implementação neste repositório

### Domínio / dados
- **Status “locação concluída”:** `RentalStatus.COMPLETED` em `backend/prisma/schema.prisma` (enum `RentalStatus`, modelo `Rental`).
- **Persistência:** criar migration no Prisma (SQLite); novo modelo (ex. avaliação) com `rentalId`, avaliador, avaliado, direção (owner→driver / driver→owner), `stars` 1–5, `tags` opcional (JSON), `comment` opcional, `createdAt`; **`@@unique([rentalId, direction])`** (ou equivalente) para impedir duplicata na mesma direção.
- **Agregados (média / contagem):** campos em `OwnerProfile` / `DriverProfile` **ou** view calculada nas queries — fechar no MVP (atualizar no `create` da avaliação é o caminho mais simples).

### Backend (tRPC)
- Registro em `backend/src/router.ts` (hoje: `auth`, `address`, `owner`, `driver`, `marketplace`).
- Procedimentos sugeridos: **mutation** submeter avaliação (validar JWT, papel do usuário, `rental` existe, `status === COMPLETED`, participante é dono do veículo ou `driverUserId`, e não duplicar); **query** opcional para “já avaliei / posso avaliar” e para médias no perfil.
- Lógica de rental **owner** está concentrada em `backend/src/routers/owner.ts` (ex.: `getIncomingRentalDetail`, listagens); **motorista** em `backend/src/routers/driver.ts` (ex.: `getRentalDetail`). Reutilizar os mesmos critérios de ownership ao validar “pertence à locação”.

### Mobile
- **Telas de detalhe da locação (ponto de UX principal):**
  - Proprietário: `mobile/src/screens/owner/OwnerRentalDetailScreen.tsx`, rota `OwnerRentalDetail` com `{ rentalId }` (`mobile/src/navigation/types.ts`).
  - Motorista: `mobile/src/screens/rental/RentalDetailScreen.tsx`, rota `RentalDetail` com `{ rentalId }`.
- **Onde mostrar média + contagem:** `mobile/src/screens/owner/OwnerProfileScreen.tsx` para locador; para locatário, alinhar ao fluxo atual (motorista não tem espelho de “Meu perfil” tão óbvio quanto o owner — usar tela de cadastro/status ou card na home, conforme menor atrito).
- Tipos de navegação: `mobile/src/navigation/types.ts` / `RootNavigator.tsx`.

### Fora do primeiro PR (confirmar)
- Push/e-mail de lembrete; jobs agendados; edição da avaliação após envio; moderação.

### Decisões MVP a fixar antes de codar
- Edição após envio: **sem edição** no MVP (mais simples).
- Lembrete 24–48h: **fora** do MVP.