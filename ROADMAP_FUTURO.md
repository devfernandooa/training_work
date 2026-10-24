# ROADMAP_FUTURO — Evolução para CRM

## 1. Transição para CRM Genérico
*(Detalhes já documentados anteriormente: desacoplamento semântico, campos genéricos, multi-tenant)*

## 2. Mudança de Stack (Futura)
Quando o sistema evoluir para CRM, planejamos:
- **Frontend:** Migrar de Vanilla JS para **React** ou **Vue**.
- **Backend:** Manter Firebase (ou migrar para Node.js + PostgreSQL para escalar).
- **Estratégia:** O backend (`/js/backend`) será reaproveitado como "serviços" (ou hooks/stores).
- **Documentação:** O `ARCHITECTURE.md` continuará válido, pois documenta a lógica, não a stack.

## 3. Novas Features (CRM)
- Gestão de múltiplos pipelines de vendas.
- Automação de marketing (integração com Make/n8n).
- Relatórios avançados de conversão.
- Multi-empresa (SaaS).