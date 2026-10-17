import {
  listarAuditoriaGenerica,
  obterRotuloCampo,
} from "../backend/auditoria-service.js";

export async function renderizarTimelineAuditoria({
  colecao,
  docId,
  containerId,
  limite = 20,
}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div><small class="text-muted ms-2">Carregando histórico...</small></div>`;

  try {
    const logs = await listarAuditoriaGenerica(colecao, docId, limite);

    if (!logs || logs.length === 0) {
      container.innerHTML = `<div class="text-center py-3 text-muted small"><i class="fas fa-history me-1"></i>Nenhuma alteração registrada ainda.</div>`;
      return;
    }

    let html = "";
    logs.forEach((log) => {
      const data = log.criado_em ? new Date(log.criado_em) : null;
      const dataFmt = data
        ? `${data.toLocaleDateString("pt-BR")} às ${data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
        : "—";
      const campos = log.campos_alterados || [];

      let camposHtml = "";
      if (campos.length > 0) {
        camposHtml = `
                    <table class="table table-sm table-borderless mb-0 mt-2" style="font-size: 0.78rem;">
                        <tbody>
                            ${campos
                              .map(
                                (c) => `
                                <tr>
                                    <td class="text-muted" style="width: 40%;"><strong>${obterRotuloCampo(c.campo) || c.campo}</strong></td>
                                    <td>
                                        <span class="badge bg-danger bg-opacity-10 text-danger">${formatarValorAudit(c.valor_anterior)}</span>
                                        <i class="fas fa-arrow-right mx-1 text-muted" style="font-size: 0.65rem;"></i>
                                        <span class="badge bg-success bg-opacity-10 text-success">${formatarValorAudit(c.valor_novo)}</span>
                                    </td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                `;
      }

      html += `
                <div class="mb-3 pb-3 border-bottom" style="border-color: #e2e8f0 !important;">
                    <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-primary bg-opacity-10 text-primary" style="font-size: 0.7rem;"><i class="fas fa-edit me-1"></i>${log.descricao || "Alteração"}</span>
                        </div>
                        <small class="text-muted" style="font-size: 0.72rem;">${dataFmt}</small>
                    </div>
                    <small class="text-muted d-block" style="font-size: 0.75rem;"><i class="fas fa-user me-1"></i>${log.admin_email || "Sistema"}</small>
                    ${camposHtml}
                </div>
            `;
    });
    container.innerHTML = html;
  } catch (err) {
    console.error("[auditoria-timeline] Erro:", err);
    container.innerHTML = `<small class="text-muted">Erro ao carregar histórico.</small>`;
  }
}

export function formatarValorAudit(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return "R$ " + v.toFixed(2).replace(".", ",");
  return String(v);
}
