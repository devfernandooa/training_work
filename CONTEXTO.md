# CONTEXTO.md — Training_Work

> **Propósito:** Este arquivo é a fonte da verdade do projeto. Deve ser lido no início
> de qualquer nova sessão de trabalho (por humano ou IA) para retomar o contexto sem
> perder o fio da meada. Mantenha-o atualizado ao fim de cada bloco de trabalho.

**Última atualização:** 19/10/2026
**Responsável:** Fernando (devfernandooa)
**Repo:** https://github.com/devfernandooa/training_work

---

## ⚠️ REVISAR ANTES DE EXECUTAR

Os itens abaixo foram **inferidos** durante a análise do projeto e **precisam de
confirmação** antes de entrar na fila de execução.

- **M3 — Unificar componente de auditoria reutilizável**
  Inferido (a partir dos prints) que o componente de auditoria está duplicado
  entre Financeiro/Leads e Alunos. Se já for unificado internamente,
  reclassificar de "criar" para "verificar".

> Ao confirmar/ajustar, remover o marcador `⚠️ REVISAR` da linha correspondente
> no cronograma (seção 4) e atualizar esta seção.

---

## 1. Visão Geral

Site + painel administrativo da **Training_Work**.

**Stack / estrutura do repo:**

- `index.html` — site público (renderização de cursos + formulário de contato que cria lead)
- `admin/` — painel administrativo
- `css/` — consolidado em 3 camadas
- `js/` — frontend (refatorado em 11/10/2026, sem duplicatas/legado)
- `img/`, `og-template.html`, `vercel.json`, `package.json`
- Deploy: **Vercel**

**Histórico de refatorações relevantes:**

- 05/10/2026 — commit oficial do projeto limpo
- 09/10/2026 — CSS consolidado em 3 camadas + og-image
- 11/10/2026 — remoção de duplicatas e legado do frontend
- 15/10/2026 — `fix(presenca,leads)`: corrige filtro de presença e torna CPF opcional
- 16/10/2026 — `refactor(auditoria)`: S1 concluído (soft delete + auditoria)
- 16/10/2026 — `feat(auditoria)`: S2 + S3 concluídos (presença + calendário)
- 17/10/2026 — `feat(auditoria)`: C1 + C2 concluídos (Leads + Cursos) + M3 parcial

---

## 2. Padrão de Auditoria — "Novo Formato Mais Completo"

O projeto tem DOIS formatos de auditoria em uso. O objetivo é padronizar tudo no novo.

### ✅ Novo formato (referência)

Histórico cronológico visual com:

- **Cabeçalho:** "Última alteração por [email] em [data/hora]"
- **Card por alteração:**
  - Badge "N campo(s) alterado(s)"
  - Email do autor + data/hora
  - **Diff campo a campo:** valor antigo (vermelho, riscado) → valor novo (verde)
- **Campo "Observações"** (textarea) para justificar a alteração

**Onde já está implementado (referências):**

- Financeiro (modal de auditoria)
- Alunos → aba "Histórico"
- Leads → modal de edição (C1)
- Cursos → modal de edição (C2)
- Componente reutilizável: `js/modules/auditoria-timeline.js`

### ⚠️ Formato antigo (a migrar)

Apenas lista o registro, sem diff visual nem observações. Presente em:

- Turmas (editar, calendário)
- Presença (ver frequência)

---

## 3. Status dos Módulos (17/10/2026)

### ✅ Funcionando / Concluído

- **Index:** renderização de cursos OK; formulário de contato cria lead OK
- **Perfil:** sidebar OK; editar OK
- **Login/Logout:** OK (sessão persistente ao fechar/abrir aba — comportamento correto)
- **Dashboard:** KPIs OK; ações rápidas OK
- **Leads & Triagem:** KPIs, excluir, editar OK; auditoria OK (C1)
- **Financeiro:** KPIs, marcar recebido, excluir, filtros, pesquisa, paginação OK; editar corrigido
- **Cursos:** KPIs, pesquisa, exibição, adicionar, excluir, reativar OK; auditoria OK (C2)
- **Turmas:** gestão, cadastro, inativar/ativar, editar OK; auditoria OK (backend)
- **Alunos:** KPIs, pesquisa, ver, editar, inativar/ativar, excluir OK; auditoria OK
- **Presença:** listagem OK; auditoria OK (S2)

### 🔧 Corrigido em 15/10/2026

1. Leads: editar sem exigir valor em Fechamento da Matrícula e Pagamento
2. Financeiro: editar funcionando
3. Controle de Presença: listagem corrigida

### 🎉 Concluído em 16/10/2026

1. **S1** — Soft delete + auditoria em exclusões/inativações (PR #119)
2. **S2** — Auditoria em presença (PR #121)
3. **S3** — Auditoria no calendário de aulas (PR #121)
4. **S4** — Verificação de permissões admin e Firestore Rules (confirmado)
5. **S5** — Validação de CPF opcional (confirmado)
6. **Fix** — Remoção de gravação redundante no botão Salvar do modal de alunos (PR #120)
7. **C3 + C3.5** — Correções visuais no Financeiro e Calendário

### 🎉 Concluído em 17/10/2026

1. **C1** — Auditoria visual no módulo de Leads (formato diff vermelho/verde)
2. **C2** — Auditoria visual no módulo de Cursos
3. **M3 (parcial)** — Componente `auditoria-timeline.js` unificado
4. **Labels amigáveis** — Dicionário `ROTULOS_CAMPOS` expandido para Cursos

### ⚠️ Pendências
1. **"Ver Frequência":** abre modal, lista, mas sem auditoria e sem editar (edição é M1)
2. **Matrículas:** módulo inteiro ainda NÃO refatorado (M2)
3. **Bug conhecido:** `lead-ui.js` usa `"em_contato"` em vez de `"Em Atendimento"`
4. **`configurarBotaoConversao()`** está desativado (só mostra alerta) — mantido por ora
5. **Melhoria (baixa prioridade) — Validação de email único:**
   - C-new.1 — Adicionar verificação de email único ao criar **aluno**
   - C-new.2 — Adicionar verificação de email único ao criar **lead**
   - Contexto: CPF opcional desde 15/10 (S5 confirmou risco zero). Email passa a ser a barreira contra duplicidade.
6. **M3 completo:** migrar `financeiro-ui.js` para usar o módulo compartilhado `auditoria-timeline.js`
7. **Pendência visual (baixa):** modal de confirmação no Financeiro não escurece o de baixo quando empilhado (funcional, só estético)

---

## 4. Cronograma de Refatoração

### 🔴 URGENTE — Segurança

| #      | Item                                                                     | Duração | Dificuldade |
| ------ | ------------------------------------------------------------------------ | ------- | ----------- |
| ~~S1~~ | ~~Auditoria de exclusões/inativações~~ ✅ CONCLUÍDO (16/10)              | 4–6h    | Média       |
| ~~S2~~ | ~~Auditoria em presença~~ ✅ CONCLUÍDO (16/10)                           | 3–4h    | Média       |
| ~~S3~~ | ~~Auditoria no Calendário de Aulas~~ ✅ CONCLUÍDO (16/10)                | 4–5h    | Média       |
| ~~S4~~ | ~~Verificar permissões de acesso ao painel admin~~ ✅ CONFIRMADO (16/10) | 2–3h    | Baixa       |
| ~~S5~~ | ~~Validar impacto de CPF opcional~~ ✅ CONFIRMADO (16/10)                | 1–2h    | Baixa       |

### 🟠 Curto Prazo (1–2 semanas)

| #        | Item                                                                            | Duração | Dificuldade |
| -------- | ------------------------------------------------------------------------------- | ------- | ----------- |
| ~~C1~~   | ~~Padronizar auditoria (novo formato) em Leads & Triagem~~ ✅ CONCLUÍDO (17/10) | 3–4h    | Baixa       |
| ~~C2~~   | ~~Padronizar auditoria (novo formato) em Cursos~~ ✅ CONCLUÍDO (17/10)          | 3–4h    | Baixa       |
| ~~C3~~   | ~~Corrigir tabela do Financeiro~~ ✅ CONCLUÍDO (16/10)                          | 2–4h    | Baixa/Média |
| ~~C3.5~~ | ~~Corrigir layout do Quadro Geral de Aulas~~ ✅ CONCLUÍDO (16/10)               | 2–3h    | Baixa       |
| ~~C4~~   | ~~Auditoria no editar de Alunos~~ ✅ CONCLUÍDO (17/10 - já estava ok) | 2–3h    | Baixa       |
| ~~C5~~   | ~~Auditoria em adicionar/remover aluno da Turma~~ ✅ CONCLUÍDO (19/10) | 3–4h    | Média       |
| ~~C6~~   | ~~Auditoria no editar de Turmas~~ ✅ CONCLUÍDO (17/10)                       | 3–4h    | Baixa       |
| ~~C7~~   | ~~Auditoria em Calendário de Aulas (ver/editar/registrar)~~ ✅ CONCLUÍDO (17/10) | 5–6h    | Média       |

### 🟡 Médio Prazo (3–6 semanas)

| #      | Item                                                                 | Duração | Dificuldade |
| ------ | -------------------------------------------------------------------- | ------- | ----------- |
| M1     | "Ver Frequência": adicionar editar + auditoria                       | 6–8h    | Média       |
| M2     | Refatorar módulo de Matrículas (inteiro)                             | 16–24h  | Alta        |
| ~~M3~~ | ~~Unificar componente de auditoria reutilizável~~ ✅ PARCIAL (17/10) | 8–12h   | Média       |
| M4     | Auditoria em exclusões (UI) — complementa S1                         | 6–8h    | Média       |

### 🟢 Longo Prazo (2–3 meses)

| #   | Item                                            | Duração | Dificuldade |
| --- | ----------------------------------------------- | ------- | ----------- |
| L1  | Auditoria de login/logout e sessão              | 6–8h    | Média       |
| L2  | Exportação de relatórios de auditoria (CSV/PDF) | 8–12h   | Média       |
| L3  | Revisão geral de UX do admin (consistência)     | 12–20h  | Alta        |
| L4  | Testes automatizados / smoke tests              | 16–24h  | Alta        |
| L5  | Documentação de arquitetura e fluxos            | 4–6h    | Baixa       |

### Ordem recomendada de execução

1. ~~S1 → S2 → S3 → S4 → S5~~ ✅ (segurança — concluído em 16/10)
2. ~~C3 → C3.5~~ ✅ (correções visuais — concluído em 16/10)
3. ~~C1 → C2 → C4 → C5 → C6 → C7~~ ✅ (auditoria visual completa na UI — concluído em 19/10)
4. M3 completo (migrar financeiro-ui para o módulo)
5. M1 → M2 (Frequência + Matrículas)
6. Longo prazo em paralelo

### Totais restantes

| Prazo              | Horas        | Dias úteis (8h) |
| ------------------ | ------------ | --------------- |
| 🟠 Curto           | 0h           | 0               |
| 🟡 Médio           | 30–44h       | 4–6             |
| 🟢 Longo           | 46–70h       | 6–9             |
| **TOTAL restante** | **~76–114h** | **~10–15**      |

---

## 5. Decisões Técnicas

- **CSS:** manter consolidação em 3 camadas
- **Frontend:** sem duplicatas/legado (refatorado em 11/10)
- **Auditoria:** padrão único = "novo formato" (diff visual + observações), renderizado por `js/modules/auditoria-timeline.js`
- **CPF:** opcional desde 15/10 — monitorar duplicidade (mitigação sugerida: email único)
- **Sessão:** persistente ao fechar/abrir aba
- **Soft delete:** toda exclusão é reversível (`excluido: true`)
- **Auditoria de presença/calendário:** subcoleção `turmas/{id}/auditoria`
- **Exclusão de aluno:** preserva matrículas (Opção 1)
- **Admin:** validação por `administradores/{uid}` + `ativo: true`; logout por inatividade (30 min)
- **Firestore Rules:** bloqueio no fim + `isAdmin()` server-side; auditoria imutável
- **Form público de leads:** validação server-side via `leadValido()`
- **Labels de auditoria:** dicionário `ROTULOS_CAMPOS` no `auditoria-service.js` (compartilhado entre módulos)

---

## 6. Como usar este arquivo em nova conversa

Ao abrir uma nova sessão de trabalho (com IA ou humano), cole/referencie:
Projeto: training_work (github.com/devfernandooa/training_work)
Leia o CONTEXTO.md na raiz do repo.
Ponto de parada atual: [descrever]
Próximo passo: [descrever]

Isso substitui a necessidade de relembrar conversas antigas — o contexto fica
versionado no Git e é acessível a qualquer momento.

---

## 7. Histórico de Entregas

### S1 — Soft delete e auditoria em exclusões/inativações ✅

**Status:** Concluído · **PR:** [#119](https://github.com/devfernandooa/training_work/pull/119)
**Data:** 16/10/2026

**O que entrou:**

- Backend dos 4 services (`alunos`, `cursos`, `lead`, `turmas`) com auditoria
- Exclusões viraram **soft delete** (reversíveis)
- Subcoleção `/{modulo}/{id}/auditoria` com logs estruturados
- UI de Alunos e Leads com toggle "Mostrar Excluídos" + botão Restaurar
- UIs de Cursos e Turmas já usavam o service → auditoria passou a funcionar automaticamente

**Decisões registradas:**

- Exclusão de aluno **preserva matrículas** (Opção 1)
- Auditoria no formato novo (diff + observações)
- Toggle de excluídos é mutuamente exclusivo com filtros de status/prioridade

**Pendências conhecidas:**

- ⚠️ `lead-ui.js` usa `"em_contato"` em vez de `"Em Atendimento"`
- ⚠️ `atualizarAlunoComMatriculaBackend` ainda faz hard delete de matrículas ao editar (M2)

---

### Fix — Remoção de gravação redundante no botão Salvar do modal de alunos ✅

**Status:** Concluído · **PR:** [#120](https://github.com/devfernandooa/training_work/pull/120)
**Data:** 16/10/2026

- `turmas-ui.js`: botão "Salvar" do modal de alunos agora apenas fecha o modal
- Elimina log de auditoria duplicado
- Remove envio do campo legado `logs_auditoria`

---

### S2 + S3 — Auditoria em Presença e Calendário de Aulas ✅

**Status:** Concluído · **PR:** [#121](https://github.com/devfernandooa/training_work/pull/121)
**Data:** 16/10/2026

**S2 — Presença:**

- `presenca-service.js`: `salvarPresencasDaAula` gera auditoria em `turmas/{id}/auditoria`
- Tipos: `"registro_presenca"` (1ª vez) e `"alteracao_presenca"` (edição)
- Diff granular por aluno; sem log se nada mudou

**S3 — Calendário de Aulas:**

- `calendario-aulas-service.js`: auditoria em criação/edição/remoção
- `removerAulaBackend` trocou `arrayRemove` por `findIndex + filter` (mais confiável)

---

### S4 — Verificação de permissões admin e Firestore Rules ✅

**Status:** Confirmado · **Data:** 16/10/2026

- `auth-guard.js` + `auth-service.js` validam admin por **UID** (`administradores/{user.uid}`)
- Só libera se `ativo === true`
- Logout automático por inatividade (30 min)
- Firestore Rules:
  - `isAdmin()` valida no servidor
  - Bloqueio geral no fim
  - Auditoria imutável
  - Validação server-side do form público de leads
- **Nenhuma correção necessária**

---

### S5 — Validação de impacto do CPF opcional ✅

**Status:** Confirmado · **Data:** 16/10/2026

**Verificado (24 alunos):**

- **0** alunos sem CPF
- **0** emails duplicados
- CPF opcional **não causou problemas** nos dados atuais

**Conclusão:** risco aceito. Pendências (baixa prioridade): C-new.1 e C-new.2 (validação de email único).

---

### C3 + C3.5 — Correções visuais no Financeiro e Calendário ✅

**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 16/10/2026

**C3 — Financeiro:**

- Corrige colspan da linha de loading (7 → 8)
- Remove IDs duplicados no modal de Nova Transação
- Adiciona modal de confirmação antes de criar transação
- Ajusta z-index do modal de confirmação quando empilhado

**C3.5 — Quadro Geral de Aulas:**

- Adiciona `min-width: 900px` na tabela
- Ajusta larguras das colunas
- Cria classe `.tabela-cronograma` com regras específicas
- Coluna "Ações" agora visível

---

### C1 + C2 + M3 (parcial) — Auditoria visual em Leads e Cursos ✅

**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 17/10/2026

**O que entrou:**

- **C1 (Leads):** modal de edição exibe timeline de auditoria no novo formato
- **C2 (Cursos):** modal de edição exibe timeline de auditoria no novo formato
- **M3 (parcial):** componente extraído para `js/modules/auditoria-timeline.js`
- **Labels:** dicionário `ROTULOS_CAMPOS` expandido para campos de Curso
- **Limpeza:** campos duplicados/órfãos removidos do modal de Lead

**Impacto:**

- ✅ C1 e C2 concluídos
- ✅ M3 parcialmente concluído (falta migrar `financeiro-ui.js`)
- ✅ Componente pronto para os próximos módulos
- ➡️ Próximo: C6 (auditoria visual em Turmas)

### C4 + C6 + C7 — Auditoria visual completa na UI ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 17/10/2026

- **C4 (Verificado):** Aba "Histórico" do Alunos já estava no novo formato desde o S1.
- **C6 (Turmas):** Modal de edição agora renderiza o histórico de alterações.
- **C7 (Calendário):** Modal de edição de Aula renderiza o histórico filtrado por aula.

---

### C5 — Auditoria de alunos no modal da Turma ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 19/10/2026

- **C5 (Turmas):** Modal de Alunos agora renderiza o histórico de adições/remoções.
- **Separação:** Editar Turma mostra alterações gerais; Alunos mostra apenas entradas/saídas.
- **Melhoria:** O log de matrícula passou a gravar o nome do aluno em vez do ID no Firestore.