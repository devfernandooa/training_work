# ARCHITECTURE.md — Training_Work

> **Propósito:** Este documento descreve a arquitetura, os padrões e os fluxos do sistema.
> É agnóstico à stack: quando o frontend migrar para React/Vue, estas regras continuarão válidas.

---

## 1. Estrutura de Pastas e Camadas

O projeto segue o padrão de **separação de responsabilidades** (inspirado em Clean Architecture):

/admin → Páginas HTML (apenas estrutura visual)
/css → Estilos globais e módulos (consolidados em 3 camadas)
/js
/auth → Autenticação e sessão (auth-guard, sidebar)
/backend → Serviços (regras de negócio e comunicação com Firestore)
/frontend → UIs (manipulação de DOM e eventos)
/modules → Componentes reutilizáveis (paginação, modais, auditoria)


### Regra de Ouro:
- **`/backend`** só conversa com o Firestore. Não mexe em DOM.
- **`/frontend`** só mexe em DOM. Não acessa o Firestore diretamente (usa o `/backend`).
- **`/modules`** são componentes genéricos e reutilizáveis por qualquer tela.

---

## 2. Fluxo de Dados

1. **Login:** `auth-service.js` autentica no Firebase. `auth-guard.js` valida o admin.
2. **Leitura:** A UI chama `escutarX()` (ex: `escutarAlunos`). O backend abre um listener em tempo real (`onSnapshot`) e devolve os dados para a UI.
3. **Escrita:** A UI chama uma função do backend (ex: `excluirAlunoBackend`). O backend valida, atualiza o Firestore e **grava o log de auditoria**.
4. **Auditoria:** Todos os módulos gravam logs na subcoleção `/{modulo}/{id}/auditoria` (ou `auditoria_auth` para login).

---

## 3. Padrões de Auditoria

O sistema usa o formato "Novo Padrão" (diff visual):
- **Campos alterados:** Array de objetos `{ campo, valor_anterior, valor_novo }`.
- **Metadados:** `admin_email`, `criado_em`, `tipo`, `descricao`.
- **Renderização:** O componente `auditoria-timeline.js` lê esses logs e monta o diff visual.

---

## 4. Regras de Negócio Críticas

- **Soft Delete:** Nenhum registro é apagado permanentemente. Usa-se `excluido: true`.
- **Validação de Vaga:** Matrícula só é permitida se houver vaga na turma.
- **Duplicidade:** Aluno não pode ter 2 matrículas no mesmo curso.
- **Sessão:** Expira ao fechar a aba (browserSessionPersistence).
- **Auditoria:** Toda ação sensível (criar, editar, excluir) gera log.

---

## 5. Padrões de UI

- **Modais:** Sempre usar o `modal-helper.js` para alinhamento com a sidebar.
- **Tabelas:** No mobile, viram Acordeão (cards). No desktop, tabelas com scroll.
- **Paginação:** Componente global `paginacao.js`.
- **Feedback:** Usar `notificar()` (toast) ou modal de confirmação, nunca `alert()` nativo.