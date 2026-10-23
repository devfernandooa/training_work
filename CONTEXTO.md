# CONTEXTO.md — Training_Work

> **Propósito:** Este arquivo é a fonte da verdade do projeto. Deve ser lido no início
> de qualquer nova sessão de trabalho (por humano ou IA) para retomar o contexto sem
> perder o fio da meada. Mantenha-o atualizado ao fim de cada bloco de trabalho.

**Última atualização:** 23/10/2026
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
- 17/10/2026 — `feat(auditoria)`: C1 + C2 + C4 + C6 + C7 concluídos + M3 parcial
- 19/10/2026 — `feat(auditoria)`: C5 concluído (modal de alunos da turma)
- 20/10/2026 — `refactor(matriculas)`: M2 concluído + M3 finalizado
- 21/10/2026 — `refactor(ux)`: L3 concluído (modais, responsividade, paginação)
- 21/10/2026 — `feat(auth)`: L1 concluído (auditoria de login/logout + perfil)

---

## 2. Padrão de Auditoria — "Novo Formato Mais Completo"

### ✅ Novo formato (referência)

Histórico cronológico visual com:

- **Cabeçalho:** "Última alteração por [email] em [data/hora]"
- **Card por alteração:**
  - Badge "N campo(s) alterado(s)"
  - Email do autor + data/hora
  - **Diff campo a campo:** valor antigo (vermelho) → valor novo (verde)
- **Campo "Observações"** (textarea) para justificar a alteração

**Onde está implementado:**

- Financeiro (modal de auditoria)
- Alunos → aba "Histórico"
- Leads → modal de edição (C1)
- Cursos → modal de edição (C2)
- Turmas → modal de edição (C6)
- Calendário de Aulas → modal de edição (C7)
- Componente reutilizável: `js/modules/auditoria-timeline.js`

### ⚠️ Formato antigo (a migrar)

**Não há mais pendências!** Todos os módulos já usam o novo formato.

---

## 3. Status dos Módulos (21/10/2026)

### ✅ Funcionando / Concluído

- **Index:** renderização de cursos OK; formulário de contato cria lead OK
- **Perfil:** sidebar OK; editar OK; reset de senha OK (L1)
- **Login/Logout:** OK; sessão expira ao fechar aba (L1)
- **Dashboard:** KPIs OK; ações rápidas OK
- **Leads & Triagem:** KPIs, excluir, editar OK; auditoria OK (C1)
- **Financeiro:** KPIs, marcar recebido, excluir, filtros, pesquisa, paginação OK; editar e auditoria OK (M3)
- **Cursos:** KPIs, pesquisa, exibição, adicionar, excluir, reativar OK; auditoria OK (C2)
- **Turmas:** gestão, cadastro, inativar/ativar, editar OK; auditoria OK (C6 + C5)
- **Alunos:** KPIs, pesquisa, ver, editar, inativar/ativar, excluir OK; auditoria OK
- **Presença:** listagem OK; auditoria OK (S2)
- **Calendário de Aulas:** auditoria OK (C7)
- **Matrículas:** módulo refatorado com auditoria, soft delete, paginação e validação de duplicidade (M2)
- **Relatórios:** Central de relatórios funcional (CSV/PDF, prévia, filtros de data e relatório 360º do financeiro).

### 🎉 Concluído em 16/10/2026

1. **S1** — Soft delete + auditoria em exclusões/inativações (PR #119)
2. **S2** — Auditoria em presença (PR #121)
3. **S3** — Auditoria no calendário de aulas (PR #121)
4. **S4** — Verificação de permissões admin e Firestore Rules (confirmado)
5. **S5** — Validação de CPF opcional (confirmado)
6. **Fix** — Remoção de gravação redundante no botão Salvar do modal de alunos (PR #120)
7. **C3 + C3.5** — Correções visuais no Financeiro e Calendário

### 🎉 Concluído em 17/10/2026

1. **C1** — Auditoria visual no módulo de Leads
2. **C2** — Auditoria visual no módulo de Cursos
3. **C4** — Auditoria no editar de Alunos (já estava OK)
4. **C6** — Auditoria no editar de Turmas
5. **C7** — Auditoria em Calendário de Aulas
6. **M3 (parcial)** — Componente `auditoria-timeline.js` unificado
7. **Labels** — Dicionário `ROTULOS_CAMPOS` expandido

### 🎉 Concluído em 19/10/2026

1. **C5** — Auditoria em adicionar/remover aluno da Turma

### 🎉 Concluído em 20/10/2026

1. **M2** — Refatoração do módulo de Matrículas
2. **M3 (completo)** — Migração do `financeiro-ui.js` para o componente compartilhado

### 🎉 Concluído em 21/10/2026

1. **L3** — Revisão de UX, Responsividade e Componente de Paginação
2. **L1** — Auditoria de Login/Logout e Ajustes no Perfil

### ⚠️ Pendências

1. **Bug conhecido:** `lead-ui.js` usa `"em_contato"` em vez de `"Em Atendimento"`
2. **`configurarBotaoConversao()`** está desativado (só mostra alerta) — mantido por ora
3. **Melhoria (baixa prioridade) — Validação de email único:**
   - C-new.1 — Adicionar verificação de email único ao criar **aluno**
   - C-new.2 — Adicionar verificação de email único ao criar **lead**
   - Contexto: CPF opcional desde 15/10 (S5 confirmou risco zero). Email passa a ser a barreira contra duplicidade.
4. **Pendência visual (baixa):** modal de confirmação no Financeiro não escurece o de baixo quando empilhado (funcional, só estético)
5. **Criação de novos usuários admin:** não há tela para isso. Adicionar como item futuro (L6 - Gestão de Admins).
6. **Inconsistência Financeira:** O botão "Marcar como Recebido" atualiza o status do aluno, mas não cria/atualiza o documento na coleção raiz `/financeiro`. Investigar e sincronizar as duas fontes de dados.
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

### 🟠 Curto Prazo

| #        | Item                                                                            | Duração | Dificuldade |
| -------- | ------------------------------------------------------------------------------- | ------- | ----------- |
| ~~C1~~   | ~~Padronizar auditoria em Leads & Triagem~~ ✅ CONCLUÍDO (17/10)               | 3–4h    | Baixa       |
| ~~C2~~   | ~~Padronizar auditoria em Cursos~~ ✅ CONCLUÍDO (17/10)                        | 3–4h    | Baixa       |
| ~~C3~~   | ~~Corrigir tabela do Financeiro~~ ✅ CONCLUÍDO (16/10)                          | 2–4h    | Baixa/Média |
| ~~C3.5~~ | ~~Corrigir layout do Quadro Geral de Aulas~~ ✅ CONCLUÍDO (16/10)               | 2–3h    | Baixa       |
| ~~C4~~   | ~~Auditoria no editar de Alunos~~ ✅ CONCLUÍDO (17/10 - já estava ok)           | 2–3h    | Baixa       |
| ~~C5~~   | ~~Auditoria em adicionar/remover aluno da Turma~~ ✅ CONCLUÍDO (19/10)          | 3–4h    | Média       |
| ~~C6~~   | ~~Auditoria no editar de Turmas~~ ✅ CONCLUÍDO (17/10)                          | 3–4h    | Baixa       |
| ~~C7~~   | ~~Auditoria em Calendário de Aulas~~ ✅ CONCLUÍDO (17/10)                       | 5–6h    | Média       |

### 🟡 Médio Prazo

| #      | Item                                                                 | Duração | Dificuldade |
| ------ | -------------------------------------------------------------------- | ------- | ----------- |
| ~~M1~~   | ~~"Ver Frequência": adicionar editar + auditoria~~ ✅ CONCLUÍDO (20/10) | 6–8h    | Média       |
| ~~M2~~   | ~~Refatorar módulo de Matrículas~~ ✅ CONCLUÍDO (20/10) | 16–24h  | Alta        |
| ~~M3~~   | ~~Unificar componente de auditoria reutilizável~~ ✅ CONCLUÍDO (20/10) | 8–12h   | Média       |
| M4     | Auditoria em exclusões (UI) — complementa S1                         | 6–8h    | Média       |

### 🟢 Longo Prazo

| #   | Item                                            | Duração | Dificuldade |
| --- | ----------------------------------------------- | ------- | ----------- |
| ~~L1~~   | ~~Auditoria de login/logout e sessão~~ ✅ CONCLUÍDO (21/10) | 6–8h    | Média       |
| ~~L2~~ | ~~Exportação de relatórios de auditoria (CSV/PDF)~~ ✅ CONCLUÍDO (23/10) | 8–12h   | Média       |
| ~~L3~~   | ~~Revisão geral de UX do admin (consistência)~~ ✅ CONCLUÍDO (21/10) | 12–20h  | Alta        |
| L4  | Testes automatizados / smoke tests              | 16–24h  | Alta        |
| L5  | Documentação de arquitetura e fluxos            | 4–6h    | Baixa       |

### Ordem recomendada de execução

1. ~~S1 → S2 → S3 → S4 → S5~~ ✅ (segurança — 16/10)
2. ~~C1 → C2 → C3 → C3.5 → C4 → C5 → C6 → C7~~ ✅ (auditoria visual + correções — 17-19/10)
3. ~~M1 → M2 → M3~~ ✅ (Frequência + Matrículas + Financeiro unificado — 20/10)
4. ~~L3~~ ✅ (Revisão de UX e Responsividade — 21/10)
5. ~~L1~~ ✅ (Auditoria de Login/Logout — 21/10)
6. ~~L2~~ ✅ (Exportação de Relatórios — 23/10)
7. **L4 → L5** (Longo prazo: testes e documentação final)

### Totais restantes

| Prazo              | Horas        | Dias úteis (8h) |
| ------------------ | ------------ | --------------- |
| 🟠 Curto           | 0h           | 0               |
| 🟡 Médio           | 6–8h         | 1               |
| 🟢 Longo (restante)| 28–42h       | 3–5             |
| **TOTAL restante** | **~34–50h**  | **~4–6**        |

---

## 5. Decisões Técnicas

- **CSS:** manter consolidação em 3 camadas
- **Frontend:** sem duplicatas/legado (refatorado em 11/10)
- **Auditoria:** padrão único = "novo formato" (diff visual + observações), renderizado por `js/modules/auditoria-timeline.js`
- **CPF:** opcional desde 15/10 — monitorar duplicidade (mitigação sugerida: email único)
- **Sessão:** expira ao fechar a aba (`browserSessionPersistence`)
- **Soft delete:** toda exclusão é reversível (`excluido: true`)
- **Auditoria de presença/calendário:** subcoleção `turmas/{id}/auditoria`
- **Exclusão de aluno:** preserva matrículas (Opção 1)
- **Admin:** validação por `administradores/{uid}` + `ativo: true`; logout por inatividade (30 min)
- **Firestore Rules:** bloqueio no fim + `isAdmin()` server-side; auditoria imutável
- **Form público de leads:** validação server-side via `leadValido()`
- **Labels de auditoria:** dicionário `ROTULOS_CAMPOS` no `auditoria-service.js` (compartilhado entre módulos)
- **Auditoria de Auth:** logs centralizados na coleção global `auditoria_auth`
- **Paginação:** componente global reutilizável em `js/modules/paginacao.js`
- **Modais:** alinhamento dinâmico com a sidebar via `js/modules/modal-helper.js`; visual padronizado (cabeçalho cinza, blocos com borda azul, rodapé alinhado)
- **Tabelas (Mobile):** viram Acordeão em telas < 992px (via `data-label` + JS de toggle)

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

- Backend dos 4 services (`alunos`, `cursos`, `lead`, `turmas`) com auditoria
- Exclusões viraram **soft delete** (reversíveis)
- Subcoleção `/{modulo}/{id}/auditoria` com logs estruturados
- UI de Alunos e Leads com toggle "Mostrar Excluídos" + botão Restaurar

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

- **S2:** `presenca-service.js`: auditoria em `turmas/{id}/auditoria` (tipos `registro_presenca` e `alteracao_presenca`)
- **S3:** `calendario-aulas-service.js`: auditoria em criação/edição/remoção de aulas

---

### S4 — Verificação de permissões admin e Firestore Rules ✅
**Status:** Confirmado · **Data:** 16/10/2026

- Validação por UID em `administradores/{user.uid}` com `ativo === true`
- Logout por inatividade (30 min)
- Firestore Rules com `isAdmin()` server-side, bloqueio geral e auditoria imutável

---

### S5 — Validação de impacto do CPF opcional ✅
**Status:** Confirmado · **Data:** 16/10/2026

- 0 alunos sem CPF
- 0 emails duplicados
- Risco aceito. Pendências: C-new.1 e C-new.2 (validação de email único)

---

### C3 + C3.5 — Correções visuais no Financeiro e Calendário ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 16/10/2026

- **C3:** corrige colspan, remove IDs duplicados, adiciona modal de confirmação, ajusta z-index
- **C3.5:** adiciona `min-width` na tabela, ajusta larguras das colunas, cria classe `.tabela-cronograma`

---

### C1 + C2 + M3 (parcial) — Auditoria visual em Leads e Cursos ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 17/10/2026

- **C1:** auditoria visual em Leads
- **C2:** auditoria visual em Cursos
- **M3 (parcial):** componente `js/modules/auditoria-timeline.js`
- **Labels:** dicionário `ROTULOS_CAMPOS` expandido para Cursos

---

### C4 + C6 + C7 — Auditoria visual completa na UI ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 17/10/2026

- **C4:** Aba Histórico de Alunos (já estava OK)
- **C6:** auditoria visual em Turmas
- **C7:** auditoria visual no Calendário de Aulas (filtrada por aula)

---

### C5 — Auditoria de alunos no modal da Turma ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 19/10/2026

- Modal de Alunos da Turma com histórico de adições/remoções
- Separação: Editar Turma (geral) vs. Alunos (entradas/saídas)
- Log de matrícula grava nome do aluno em vez do ID

---

### M1 — Edição e Auditoria na Frequência ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 20/10/2026

- Tela "Ver Frequência" permite editar presença direto do relatório
- Histórico de alterações exibido no modal
- Modal alterado para `modal-xl` e rodapé padronizado

---

### M2 — Refatoração do módulo de Matrículas ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 20/10/2026

- Migração para subcoleção `turmas/{turmaId}/matriculas`
- Auditoria em criar/editar/excluir/restaurar
- Soft delete + restaurar
- Paginação, busca, filtro "Mostrar Excluídos" e modal de exclusão padronizado
- Validação de duplicidade (aluno não pode ter 2 matrículas no mesmo curso)
- Validação de vaga máxima mantida

---

### M3 Completo — Refatoração do Financeiro ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 20/10/2026

- Removida a função `renderizarTimelineAuditoria` duplicada no `financeiro-ui.js`
- Módulo Financeiro usa o componente compartilhado
- Corrigido erro de redeclaração que quebrava a tela do Financeiro

---

### L3 — Revisão de UX, Responsividade e Componente de Paginação ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 21/10/2026

- Padronização visual de modais (cabeçalho cinza, blocos com borda azul, rodapé)
- Alinhamento inteligente de modais e backdrop em relação à sidebar (via JS)
- Tabelas transformadas em Cards Acordeão em telas < 992px
- Menu hambúrguer e layout mobile ajustados
- **NOVO:** Componente `js/modules/paginacao.js` para padronização e reuso
- Paginação aplicada no módulo de Alunos

---

### L1 — Auditoria de Login/Logout e Ajustes no Perfil ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 21/10/2026

- Registro de `login_sucesso`, `login_falha`, `logout` e `logout_inatividade` na coleção `auditoria_auth`
- Sessão expira ao fechar a aba (`browserSessionPersistence`)
- Modal de perfil corrigido para notebooks (largura 600px, scroll interno, rodapé fixo)
- Substituição do `alert` nativo por modal de confirmação estilizado no botão "Redefinir senha"


### Refatoração de Responsividade e UX Mobile ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 23/10/2026

- **Cards Mobile:** Todas as tabelas (Alunos, Financeiro, Cursos, Turmas, Matrículas, Dashboard, Leads) agora viram Cards no mobile.
- **Design System:** Estrutura de Card dividida em Header (destaque), Body (dados) e Footer (ações).
- **Acordeão:** Mantido exclusivamente para a tabela de Alunos.
- **Botões:** Padronizados para formato quadrado e alinhados à esquerda no mobile.
- **Correções:** Resolvido bug de modal de confirmação travado no Firefox.

### Refatoração e Limpeza do CSS ✅
**Status:** Concluído · **PR:** [#148](https://github.com/devfernandooa/training_work/pull/148)
**Data:** 23/10/2026

- Consolidação do CSS em 3 arquivos (base, componentes, páginas).
- Remoção de 8 arquivos obsoletos e regras duplicadas.
- Isolamento do `login.css` e `sidebar.css`.
- Padronização de modais (larguras, z-index e scroll).
- Base pronta para a migração para Tailwind.

### L2 — Central de Relatórios e Exportação ✅
**Status:** Concluído · **PR:** [#XXX](https://github.com/devfernandooa/training_work/pull/XXX)
**Data:** 23/10/2026

- Criação da página `admin/relatorios.html` com design padronizado.
- Módulo de exportação (`exportar.js`) suportando CSV e PDF.
- Prévia em HTML antes do download.
- Relatório 360º (Financeiro): cruza dados do aluno, transações e logs de auditoria.
- Filtros de data (inicial e final).
- Cabeçalho de auditoria em todos os arquivos gerados (quem gerou, data/hora e filtros).

**Pendência registrada:**
- ⚠️ Sincronização financeira: O botão "Marcar como Recebido" não reflete na coleção raiz `/financeiro`. (Registrado na seção 3).