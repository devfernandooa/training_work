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
