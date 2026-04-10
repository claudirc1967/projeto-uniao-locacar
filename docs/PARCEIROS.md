# Parceiros (locação) — resumo para retomar depois

## Objetivo

Incluir **parceiros de negócio** (seguradoras, oficinas, funilarias, lojas de peças/pneus/acessórios, etc.) no ecossistema do app, sem tratar o parceiro como “quarto usuário” obrigatório no MVP.

## Quem se relaciona com parceiro

- **Somente o proprietário (locador)** cadastra e mantém parceiros.
- **Motorista não** tem vínculo nem telas com parceiros (regra de produto).
- **Motivo de negócio:** manutenção e seguro costumam ser responsabilidade do proprietário do veículo.

## Escopo do MVP vs. futuro

- **MVP:** parceiros como **cadastros do locador** (tipo agenda/CRM de fornecedores), sem necessidade de login do parceiro.
- **Futuro (opcional):** “parceiro consultar alguma informação” → aí pode entrar **conta do parceiro**, convite, link mágico ou `Role` específico, **associado** ao registro existente de parceiro.

## Modelo de dados (alinhado ao que combinamos)

- **`Partner`** (nome a definir): pertence ao **locador** (`ownerUserId` / `User` dono).
- **Não** é obrigatório novo `Role` no `User` só para ter parceiros no MVP; o `enum` pode ficar `OWNER | DRIVER` até precisar de login do parceiro.
- **Por veículo:** o mesmo cadastro de parceiro pode servir **vários carros**; **cada carro pode ter seguradora (parceiro) diferente**.
- Implementação típica:
  - **Opção A:** FKs no `Vehicle` por tipo de vínculo (ex.: `insurancePartnerId`, `workshopPartnerId`, …), opcionais, sempre validando que o `Partner` é do mesmo dono do veículo.
  - **Opção B:** tabela de associação `VehiclePartner` com `vehicleId`, `partnerId`, `category` (enum), se precisar de vários vínculos por tipo ou mais flexibilidade.

## Regras de integridade

- Todo `Partner` referenciado por um `Vehicle` deve ser do **mesmo** `ownerUserId` do veículo (validar no backend).

## Backend / app

- Rotas e telas sob **fluxo do proprietário** (`ownerProcedure`, área de dono no mobile).
- **Motorista:** sem exposição desses dados nas APIs que o motorista usa.

## O que não é prioridade no primeiro corte

- **Signup** de parceiro como no motorista/proprietário.
- **Parceiro** como terceiro papel no app até existir requisito claro de portal ou consulta.
