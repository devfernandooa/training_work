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
confirmação** antes de entrar na fila de execução. Se não fizerem sentido,
ajustar ou remover.

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
- **Leads & Triagem:** KPIs, excluir, editar (valor do curso em Fechamento) OK; auditoria em formato antigo
- **Financeiro:** KPIs, marcar recebido, excluir, filtros, pesquisa, paginação OK; editar corrigido hoje
- **Cursos:** KPIs, pesquisa, exibição, adicionar, excluir, reativar OK; auditoria em formato antigo
- **Turmas:** gestão, cadastro, inativar/ativar, editar OK
- **Alunos:** KPIs, pesquisa, ver (abas Dados Pessoais/Curso/Matrículas/Financeiro/Histórico), editar, inativar/ativar, excluir OK
- **Presença:** listagem (Todas / Com Aulas Agendadas / Com Alunos Matriculados) — **corrigido hoje**

### 🔧 Corrigido em 15/10/2026
1. Leads: editar sem exigir valor em Fechamento da Matrícula e Pagamento
2. Financeiro: editar funcionando
3. Controle de Presença: listagem corrigida

### ⚠️ Pendências
1. **Financeiro:** tabela com colunas desajustadas / itens fora de posição
2. **Auditorias em formato antigo na UI:** Leads e Cursos (backend já grava, falta renderizar no "novo formato" visual)
3. **Sem auditoria:** Calendário de Aulas (ver/editar/registrar presença); "Ver Frequência" (Presença)
4. **"Ver Frequência":** abre modal, lista, mas sem auditoria e sem editar
5. **Matrículas:** módulo inteiro ainda NÃO refatorado
6. **Bug conhecido:** `lead-ui.js` usa `"em_contato"` em vez de `"Em Atendimento"`

---

## 4. Cronograma de Refatoração

### 🔴 URGENTE — Segurança (fazer primeiro)
| # | Item | Duração | Dificuldade |
|---|------|---------|-------------|
| ~~S1~~ | ~~Auditoria de exclusões/inativações (Alunos, Leads, Cursos, Turmas)~~ ✅ CONCLUÍDO (16/10) | 4–6h | Média |
| S2 | Auditoria em "Ver Frequência" (dado sensível) | 3–4h | Média |
| S3 | Auditoria no editar de Turmas e Calendário de Aulas | 4–5h | Média |
| S4 | ⚠️ REVISAR — Verificar permissões de acesso ao painel admin | 2–3h | Baixa |
| S5 | Validar impacto de CPF opcional (integridade/duplicidade) | 1–2h | Baixa |

### 🟠 Curto Prazo (1–2 semanas)
| # | Item | Duração | Dificuldade |
|---|------|---------|-------------|
| C1 | Padronizar auditoria (novo formato) em Leads & Triagem | 3–4h | Baixa |
| C2 | Padronizar auditoria (novo formato) em Cursos | 3–4h | Baixa |
| C3 | Corrigir tabela do Financeiro (colunas desalinhadas) | 2–4h | Baixa/Média |
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
1. S1 → S2 → S3 (segurança de auditoria)
2. C1 → C2 → C6 (padronizar onde já existe componente)
3. C3 (corrigir tabela Financeiro — rápido e visível)
4. C4 → C5 → C7 (auditoria em Alunos/Turmas/Calendário)
5. M3 (unificar componente de auditoria — facilita o resto) ⚠️ confirmar antes
6. M1 → M2 (Frequência + Matrículas)
7. Longo prazo em paralelo

### Totais
| Prazo | Horas | Dias úteis (8h) |
|-------|-------|-----------------|
| 🔴 Segurança | 14–20h | 2–3 |
| 🟠 Curto | 21–28h | 3–4 |
| 🟡 Médio | 36–52h | 5–7 |
| 🟢 Longo | 46–70h | 6–9 |
| **TOTAL** | **~117–170h** | **~15–21** |

---

## 5. Decisões Técnicas

- **CSS:** manter consolidação em 3 camadas (não voltar a fragmentar)
- **Frontend:** sem duplicatas/legado (refatorado em 11/10)
- **Auditoria:** padrão único = "novo formato" (diff visual + observações)
- **CPF:** agora opcional (15/10) — monitorar impacto em integridade
- **Sessão:** persistente ao fechar/abrir aba (comportamento intencional)

---

## 6. Como usar este arquivo em nova conversa

Ao abrir uma nova sessão de trabalho (com IA ou humano), cole/referencie:


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
- ⚠️ `turmas-ui.js` — botão "Salvar" do modal de alunos não gravava nada útil (só duplicava auditoria); ajustado para apenas fechar o modal (16/10/2026)

**Impacto no cronograma:**
- ✅ Item **S1** concluído
- ✅ **Fase 2 de UI** concluída nos 4 módulos (Alunos, Leads, Cursos, Turmas)
- ➡️ **Próximo:** S2 (auditoria em "Ver Frequência" / Presença) ou S3 (auditoria no calendário de aulas)