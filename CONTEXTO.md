# CONTEXTO.md — Training_Work

> **Propósito:** Este arquivo é a fonte da verdade do projeto. Deve ser lido no início
> de qualquer nova sessão de trabalho (por humano ou IA) para retomar o contexto sem
> perder o fio da meada. Mantenha-o atualizado ao fim de cada bloco de trabalho.

**Última atualização:** 16/10/2026
**Responsável:** Fernando (devfernandooa)
**Repo:** https://github.com/devfernandooa/training_work

---

## ⚠️ REVISAR ANTES DE EXECUTAR

Os itens abaixo foram **inferidos** durante a análise do projeto e **precisam de
confirmação** antes de entrar na fila de execução.

- **S4 — Verificar permissões de acesso ao painel admin**
  Não havia menção a controle de permissões no status atual. Pode já estar
  resolvido, pode não ser problema, ou pode ser uma lacuna real. **Confirmar.**

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
- Financeiro / Leads & Triagem (modal de auditoria)
- Alunos → aba "Histórico" (com cabeçalho de contexto: Nome, email, CPF)

> ⚠️ **Ação pendente:** localizar o componente exato que gera esse formato e
> extraí-lo para módulo reutilizável (ver item M3 do cronograma).

### ⚠️ Formato antigo (a migrar)
Apenas lista o registro, sem diff visual nem observações. Presente em:
- Leads & Triagem
- Cursos
- Turmas (editar, calendário)
- Presença (ver frequência)

---

## 3. Status dos Módulos (16/10/2026)

### ✅ Funcionando / Concluído
- **Index:** renderização de cursos OK; formulário de contato cria lead OK
- **Perfil:** sidebar OK; editar OK
- **Login/Logout:** OK (sessão persistente ao fechar/abrir aba — comportamento correto)
- **Dashboard:** KPIs OK; ações rápidas OK
- **Leads & Triagem:** KPIs, excluir, editar OK; auditoria em formato antigo (falta renderização)
- **Financeiro:** KPIs, marcar recebido, excluir, filtros, pesquisa, paginação OK; editar corrigido
- **Cursos:** KPIs, pesquisa, exibição, adicionar, excluir, reativar OK; auditoria em formato antigo (falta renderização)
- **Turmas:** gestão, cadastro, inativar/ativar, editar OK; auditoria OK
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
4. **Fix** — Remoção de gravação redundante no botão Salvar do modal de alunos (PR #120)

### ⚠️ Pendências
1. **Financeiro:** tabela com colunas desajustadas / itens fora de posição (visual)
2. **Layout do Quadro Geral de Aulas:** tabela estoura horizontalmente, coluna Ações sai da tela (visual)
3. **Auditorias em formato antigo na UI:** Leads e Cursos (backend já grava, falta renderizar no "novo formato" visual)
4. **"Ver Frequência":** abre modal, lista, mas sem auditoria e sem editar (edição é M1)
5. **Matrículas:** módulo inteiro ainda NÃO refatorado (M2)
6. **Bug conhecido:** `lead-ui.js` usa `"em_contato"` em vez de `"Em Atendimento"`
7. **`configurarBotaoConversao()`** está desativado (só mostra alerta) — mantido por ora

---

## 4. Cronograma de Refatoração

### 🔴 URGENTE — Segurança (fazer primeiro)
| # | Item | Duração | Dificuldade |
|---|------|---------|-------------|
| ~~S1~~ | ~~Auditoria de exclusões/inativações~~ ✅ CONCLUÍDO (16/10) | 4–6h | Média |
| ~~S2~~ | ~~Auditoria em presença~~ ✅ CONCLUÍDO (16/10) | 3–4h | Média |
| ~~S3~~ | ~~Auditoria no Calendário de Aulas~~ ✅ CONCLUÍDO (16/10) | 4–5h | Média |
| S4 | ⚠️ REVISAR — Verificar permissões de acesso ao painel admin | 2–3h | Baixa |
| S5 | Validar impacto de CPF opcional (integridade/duplicidade) | 1–2h | Baixa |

### 🟠 Curto Prazo (1–2 semanas)
| # | Item | Duração | Dificuldade |
|---|------|---------|-------------|
| C1 | Padronizar auditoria (novo formato) em Leads & Triagem | 3–4h | Baixa |
| C2 | Padronizar auditoria (novo formato) em Cursos | 3–4h | Baixa |
| C3 | Corrigir tabela do Financeiro (colunas desalinhadas) | 2–4h | Baixa/Média |
| C3.5 | Corrigir layout do Quadro Geral de Aulas (overflow horizontal) | 2–3h | Baixa |
| C4 | Auditoria no editar de Alunos | 2–3h | Baixa |
| C5 | Auditoria em adicionar/remover aluno da Turma | 3–4h | Média |
| C6 | Auditoria no editar de Turmas | 3–4h | Baixa |
| C7 | Auditoria em Calendário de Aulas (ver/editar/registrar) | 5–6h | Média |

### 🟡 Médio Prazo (3–6 semanas)
| # | Item | Duração | Dificuldade |
|---|------|---------|-------------|
| M1 | "Ver Frequência": adicionar editar + auditoria | 6–8h | Média |
| M2 | Refatorar módulo de Matrículas (inteiro) | 16–24h | Alta |
| M3 | ⚠️ REVISAR — Unificar componente de auditoria reutilizável | 8–12h | Média |
| M4 | Auditoria em exclusões (UI) — complementa S1 | 6–8h | Média |

### 🟢 Longo Prazo (2–3 meses)
| # | Item | Duração | Dificuldade |
|---|------|---------|-------------|
| L1 | Auditoria de login/logout e sessão | 6–8h | Média |
| L2 | Exportação de relatórios de auditoria (CSV/PDF) | 8–12h | Média |
| L3 | Revisão geral de UX do admin (consistência) | 12–20h | Alta |
| L4 | Testes automatizados / smoke tests | 16–24h | Alta |
| L5 | Documentação de arquitetura e fluxos | 4–6h | Baixa |

### Ordem recomendada de execução
1. ~~S1 → S2 → S3~~ ✅ (segurança de auditoria — concluído em 16/10)
2. S4 → S5 (fecha a fila de segurança)
3. C3 → C3.5 (correções visuais rápidas)
4. C1 → C2 (padronizar auditoria no formato visual)
5. C4 → C5 → C6 → C7 (auditoria restante)
6. M3 (unificar componente de auditoria) ⚠️ confirmar antes
7. M1 → M2 (Frequência + Matrículas)
8. Longo prazo em paralelo

### Totais
| Prazo | Horas | Dias úteis (8h) |
|-------|-------|-----------------|
| 🔴 Segurança (restante) | 3–5h | 0,5 |
| 🟠 Curto | 23–31h | 3–4 |
| 🟡 Médio | 36–52h | 5–7 |
| 🟢 Longo | 46–70h | 6–9 |
| **TOTAL restante** | **~108–158h** | **~14–20** |

---

## 5. Decisões Técnicas

- **CSS:** manter consolidação em 3 camadas (não voltar a fragmentar)
- **Frontend:** sem duplicatas/legado (refatorado em 11/10)
- **Auditoria:** padrão único = "novo formato" (diff visual + observações)
- **CPF:** agora opcional (15/10) — monitorar impacto em integridade
- **Sessão:** persistente ao fechar/abrir aba (comportamento intencional)
- **Soft delete:** toda exclusão é reversível (marca `excluido: true`)
- **Auditoria de presença/calendário:** grava na subcoleção `turmas/{id}/auditoria`
- **Exclusão de aluno:** preserva matrículas (Opção 1)

---

## 6. Como usar este arquivo em nova conversa

Ao abrir uma nova sessão de trabalho (com IA ou humano), cole/referencie:

`Projeto: training_work (github.com/devfernandooa/training_work)
Leia o CONTEXTO.md na raiz do repo.
Ponto de parada atual: [descrever]
Próximo passo: [descrever]`


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
- ⚠️ `lead-ui.js` chama `atualizarStatusLead(id, "em_contato")` mas o status real é `"Em Atendimento"` — corrigir futuramente
- ⚠️ `atualizarAlunoComMatriculaBackend` ainda faz hard delete de matrículas ao editar — faz parte do M2 (refatorar Matrículas)

---

### Fix — Remoção de gravação redundante no botão Salvar do modal de alunos ✅
**Status:** Concluído · **PR:** [#120](https://github.com/devfernandooa/training_work/pull/120)
**Data:** 16/10/2026

**O que entrou:**
- `turmas-ui.js`: botão "Salvar" do modal de alunos agora apenas fecha o modal
- Elimina log de auditoria duplicado (matricular/remover já gravam)
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
- `calendario-aulas-service.js`: auditoria nas 3 operações de escrita
  - `salvarAulaBackend` → `"criacao_aula"`
  - `atualizarAulaBackend` → `"alteracao_aula"`
  - `removerAulaBackend` → `"remocao_aula"`
- `removerAulaBackend` trocou `arrayRemove` por `findIndex + filter` (mais confiável)

**Impacto no cronograma:**
- ✅ Itens **S2 e S3** concluídos
- ✅ **Bloco de segurança:** 3 de 5 concluídos (falta S4 e S5)
- ➡️ **Próximo:** S4 (permissões de acesso) ou C3/C3.5 (correções visuais)