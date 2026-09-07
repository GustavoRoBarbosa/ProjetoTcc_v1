# Roadmap final — GRB OFICE (RT-TDS-2026-036)

Este arquivo lista o que falta implementar para o sistema atender 100% dos
Requisitos Funcionais descritos em `RT-TDS-2026-036_v0_5.docx`, com base na
comparação entre a documentação e o estado atual do projeto (ver
`docs/overview.md`, `docs/backend.md`, `docs/frontend.md`,
`docs/known-issues.md`).

**Como usar este arquivo com o Claude Code:** peça para ele ler este roadmap
junto com os `.md` de `docs/` antes de começar cada item. Trabalhe **um item
por vez**, na ordem abaixo — peça o plano antes do código, teste manualmente
antes de avançar, e atualize `docs/overview.md`/`docs/known-issues.md` ao
final de cada item.

---

## Status geral dos requisitos

| Requisito | Descrição | Status |
|---|---|---|
| RF01 | Cadastro de clientes | ✅ Feito |
| RF02 | Login/autenticação | ✅ Feito |
| RF03 | Cadastro de produtos (admin) | ✅ Feito |
| RF04 | Catálogo de produtos | ✅ Feito |
| RF05 | Adicionar ao carrinho | ✅ Feito |
| RF06 | Finalizar pedido de compra **ou reserva** | ⚠️ Só "compra" existe |
| RF07 | Solicitar encomenda de produto fora de estoque | ❌ Não existe |
| RF08 | Funcionário validar encomendas | ❌ Não existe |
| RF09 | Atualizar estoque automaticamente | ✅ Feito |
| RF10 | Exibir valor de instalação da peça | ❌ Não existe |
| RF11 | Alerta de estoque abaixo do mínimo | ⚠️ Só contador no Dashboard, sem destaque ativo |
| RF12 | Relatórios de produtos mais vendidos/lucros | ❌ Não existe |

**Definições confirmadas com o autor do projeto:**
- "Reserva" e "encomenda" são **fluxos diferentes**: reserva separa uma peça
  que já está em estoque; encomenda é pedir uma peça que está com
  `quantidade_estoque == 0`.
- O alerta de estoque baixo (RF11) precisa ser mais visível que o contador
  atual do Dashboard — não basta só o número.

---

## Item 1 — Fluxo de Encomenda (RF07 + RF08) 🔴 Prioridade máxima

**Regra de negócio envolvida:** "Encomendas realizadas devem ser validadas
por um funcionário antes de serem confirmadas."

### Backend
- Novo model `Encomenda` (provavelmente no app `pedidos`, por proximidade
  com `Pedido`/`ItemPedido`):
  - `cliente` (FK `Usuario`)
  - `peca` (FK `Peca`)
  - `quantidade`
  - `status` (`pendente` / `aprovada` / `recusada`)
  - `criado_em`, `respondido_em`
  - `respondido_por` (FK `Usuario`, `null=True` — qual funcionário validou)
- Endpoint para o cliente criar uma encomenda — só deve aceitar peças com
  `quantidade_estoque == 0` (senão faz sentido comprar direto).
- Endpoint para equipe (`PodeGerenciarPecas` ou uma permissão própria)
  listar encomendas pendentes e aprovar/recusar.
- Registrar em `auditoria.LogAtividade` tanto a criação quanto a validação.

### Frontend
- `LojaProduto.jsx`: quando a peça está indisponível, trocar o botão
  "Comprar" por "Encomendar".
- Nova tela (só equipe), ex. `Encomendas.jsx`: lista encomendas pendentes,
  botões aprovar/recusar — mesmo padrão visual das outras telas de gestão.
- Cliente precisa conseguir ver o status das próprias encomendas (pode ser
  uma seção nova em `HistoricoCompras.jsx` ou uma aba separada).

### Testar antes de avançar
- Encomendar peça sem estoque → aparece pra equipe → aprovar → cliente vê
  status atualizado → auditoria registrou os dois passos.

---

## Item 2 — Reserva (RF06)

**Antes de implementar:** decidir com o orientador se reserva tem prazo
(ex: peça fica "presa" por 24h aguardando confirmação do cliente) ou se é
só um pedido marcado como reservado sem prazo definido. Isso muda a
modelagem — vale confirmar antes de codar.

- Provavelmente não precisa de model novo: um novo valor em `Pedido.status`
  (ex: `reservado`) ou um campo booleano/flag, reaproveitando a estrutura
  que já existe em `finalizar_pedido`.
- Se houver prazo, considerar como/quando expirar reservas antigas
  (job periódico está fora do escopo comum de TCC — pode ser resolvido na
  hora da consulta, verificando se passou o prazo).

---

## Item 3 — Alerta de estoque visível (RF11)

- Endpoint (ou reaproveitar dado já existente) que retorna as peças com
  `quantidade_estoque <= quantidade_minima`.
- Frontend: algo mais visível que o contador atual — por exemplo, um badge
  com contagem no `Sidebar.jsx`, ou uma seção dedicada no Dashboard
  listando quais peças estão baixas (não só o número total).

---

## Item 4 — Valor de instalação (RF10)

**Regra de negócio envolvida:** "O valor de instalação será exibido apenas
para produtos que possuírem essa opção cadastrada."

- Novo campo em `Peca`: `valor_instalacao` (`DecimalField`, `null=True,
  blank=True` — opcional, conforme a regra de negócio).
- Exibir em `LojaProduto.jsx` e em `Carrinho.jsx`, mas **só quando
  preenchido** — não mostrar linha/campo vazio.
- Formulário de `Pecas.jsx` (equipe) ganha o campo, também opcional.

---

## Item 5 — Relatórios (RF12)

Tecnicamente o mais simples, porque os dados já existem em `ItemPedido`.

- Endpoint que agrega `ItemPedido` por peça: quantidade total vendida e
  receita gerada (soma de `preco_unitario * quantidade`).
- Tela nova (só equipe/admin) com uma tabela simples — gráfico é opcional,
  não é exigência da documentação.

---

## Depois de cada item

1. Testar manualmente o fluxo completo (não só o "caminho feliz").
2. Atualizar `docs/overview.md` com o que foi feito nesta rodada.
3. Se algum bug ou decisão de arquitetura aparecer no caminho, registrar em
   `docs/known-issues.md`, seguindo o padrão já usado no projeto.
