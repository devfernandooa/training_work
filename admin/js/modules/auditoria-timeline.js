import {
  listarAuditoriaGenerica,
  obterRotuloCampo,
} from "../backend/auditoria-service.js";

/**
 * Limpa nomes de campos compostos (ex: "cronograma.aula_123.data" vira "data")
 * e busca o rótulo amigável no dicionário.
 */
function obterNomeAmigavel(campo) {
    let nome = campo;
    
    // Limpa campos do cronograma (aulas)
    if (nome.startsWith("cronograma.aula_")) {
        nome = nome.split('.').pop();
    }
    
    // Limpa campos de presença (ex: presenca.aula_123.aluno_030)
    if (nome.startsWith("presenca.aula_")) {
        const partes = nome.split('.');
        const alunoId = partes.pop(); // Pega o "aluno_030"
        return `Presença (Aluno: ${alunoId})`;
    }

    return obterRotuloCampo(nome) || nome;
}

/**
 * Formata o valor para exibição (Moeda, Data ISO, etc).
 */
export function formatarValorAudit(v, nomeCampo = "") {
  if (v === null || v === undefined || v === "") return "—";

  // Se for Data ISO (YYYY-MM-DD)
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-");
    return `${d}/${m}/${y}`;
  }

  // Se for Número
  if (typeof v === "number") {
    // Se o campo for carga horária, não coloca R$
    if (nomeCampo.includes("carga")) {
      return `${v}h`;
    }
    // Se for valor, investimento, preço, coloca R$
    if (
      nomeCampo.includes("valor") ||
      nomeCampo.includes("investimento") ||
      nomeCampo.includes("preco")
    ) {
      return "R$ " + v.toFixed(2).replace(".", ",");
    }
    // Outros números (vagas, horas soltas, etc) só mostra o número
    return String(v);
  }

  return String(v);
}

export async function renderizarTimelineAuditoria({
  colecao,
  docId,
  containerId,
  limite = 20,
  filtroPrefixoCampo = null,
  filtroTipo = null,
  filtroExcluirTipo = null // ⬅️ NOVO AQUI
}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div><small class="text-muted ms-2">Carregando histórico...</small></div>`;

  try {
    const logs = await listarAuditoriaGenerica(colecao, docId, limite);
    let logsFiltrados = logs;

    // 1. Filtra por tipo (incluir)
    if (filtroTipo && Array.isArray(filtroTipo)) {
      logsFiltrados = logsFiltrados.filter(log => filtroTipo.includes(log.tipo));
    }

    // 2. Filtra por tipo (excluir) ⬅️ NOVO
    if (filtroExcluirTipo && Array.isArray(filtroExcluirTipo)) {
      logsFiltrados = logsFiltrados.filter(log => !filtroExcluirTipo.includes(log.tipo));
    }

    // 3. Filtra por prefixo de campo
    if (filtroPrefixoCampo) {
      logsFiltrados = logsFiltrados.map(log => {
        const camposFiltrados = (log.campos_alterados || []).filter(c =>
          String(c.campo).startsWith(filtroPrefixoCampo)
        );
        return { ...log, campos_alterados: camposFiltrados };
      }).filter(log => log.campos_alterados.length > 0);
    }

    if (!logsFiltrados || logsFiltrados.length === 0) {
      container.innerHTML = `<div class="text-center py-3 text-muted small"><i class="fas fa-history me-1"></i>Nenhuma alteração registrada para este item.</div>`;
      return;
    }
    
    let html = "";
    logsFiltrados.forEach((log) => {
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
                                                        ${campos.map(c => {
                                const temValorAnterior = c.valor_anterior !== null && c.valor_anterior !== undefined && c.valor_anterior !== "";
                                
                                // ⬇️ NOVO: Se for alunos_matriculados, esconde o ID
                                const isAlunoMatriculado = c.campo.includes("alunos_matriculados");
                                const exibirValores = !isAlunoMatriculado;

                                const blocoAnterior = (temValorAnterior && exibirValores)
                                    ? `<span class="badge bg-danger bg-opacity-10 text-danger">${formatarValorAudit(c.valor_anterior)}</span>
                                       <i class="fas fa-arrow-right mx-1 text-muted" style="font-size: 0.65rem;"></i>`
                                    : (exibirValores ? `<i class="fas fa-plus text-success me-2" style="font-size: 0.7rem;" title="Novo registro"></i>` : "");

                                const blocoNovo = exibirValores
                                    ? `<span class="badge bg-success bg-opacity-10 text-success">${formatarValorAudit(c.valor_novo, c.campo)}</span>`
                                    : `<span class="text-muted small fst-italic">(adicionado à lista)</span>`;

                                return `
                                <tr>
                                    <td class="text-muted" style="width: 40%;"><strong>${obterNomeAmigavel(c.campo)}</strong></td>
                                    <td>
                                        ${blocoAnterior}
                                        ${blocoNovo}
                                    </td>
                                </tr>
                            `}).join("")}
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
