/**
 * =========================================================================
 * TRAINING WORK — UI DE LEADS (lead-ui.js) — CORRIGIDO
 * =========================================================================
 *
 * MUDANÇAS APLICADAS:
 *   - lead.nome → lead.name
 *   - lead.curso → lead.curso_interesse_name
 *   - Ao salvar edição, grava em `name` e `curso_interesse_name`
 *   - Fase 2 (S1): toggle "Mostrar Excluídos" + restaurar lead
 * =========================================================================
 */

import {
  escutarLeads,
  atualizarStatusLead,
  salvarEdicaoLead,
  obterLeadPorId,
  excluirLead,
  restaurarLead,
} from "../backend/lead-service.js";
import { renderizarTimelineAuditoria } from "../modules/auditoria-timeline.js";

/* ====== ESTADO GLOBAL ====== */
let listaLeadsCompleta = [];
let listaLeadsFiltrada = [];
let paginaAtual = 1;
let itensPorPagina = 20;
let termoBusca = "";
let editModalInstance = null;
let excluirModalInstance = null;
let restaurarModalInstance = null;
let leadIdParaExcluir = null;
let leadIdParaRestaurar = null;
let timerBusca = null;
let mostrarExcluidos = false; // ⬅️ NOVO
let unsubscribeLeads = null; // ⬅️ NOVO

/* ====== HELPERS DE CAMPO ====== */
function getNomeLead(lead) {
  return lead.name || lead.nome || "";
}
function getCursoLead(lead) {
  return lead.curso_interesse_name || lead.curso || "";
}

/* ====== INICIALIZAÇÃO ====== */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 [lead-ui] Inicializando...");

  configurarModais();
  configurarFiltros();
  configurarBusca();
  configurarSeletorItensPorPagina();
  configurarFormularioEdicao();
  configurarViaCEP();
  configurarBotaoConversao();
  configurarToggleExcluidos();

  iniciarEscutaLeads();
});

/* ====== ESCUTA DE LEADS (recriável) ====== */
function iniciarEscutaLeads() {
  if (unsubscribeLeads) unsubscribeLeads();

  try {
    unsubscribeLeads = escutarLeads(
      (leads) => {
        listaLeadsCompleta = leads;
        paginaAtual = 1;
        aplicarFiltrosERenderizar();
      },
      { incluirExcluidos: mostrarExcluidos },
    );
  } catch (erro) {
    console.error("❌ Erro ao escutar leads:", erro);
  }
}

/* ====== MODAIS ====== */
function configurarModais() {
  const modalEditEl = document.getElementById("editLeadModal");
  if (modalEditEl && window.bootstrap) {
    editModalInstance = new bootstrap.Modal(modalEditEl);
  }

  const modalExcluirEl = document.getElementById("modalConfirmarExclusao");
  if (modalExcluirEl && window.bootstrap) {
    excluirModalInstance = new bootstrap.Modal(modalExcluirEl);
  }

  const modalRestaurarEl = document.getElementById("modalRestaurarLead");
  if (modalRestaurarEl && window.bootstrap) {
    restaurarModalInstance = new bootstrap.Modal(modalRestaurarEl);
  }

  // Confirmar exclusão
  const btnConfirmarExclusao = document.getElementById(
    "btn-confirmar-exclusao",
  );
  if (btnConfirmarExclusao) {
    btnConfirmarExclusao.addEventListener("click", async () => {
      if (!leadIdParaExcluir) return;
      btnConfirmarExclusao.disabled = true;
      btnConfirmarExclusao.textContent = "A remover...";
      try {
        await excluirLead(leadIdParaExcluir);
        if (excluirModalInstance) excluirModalInstance.hide();
      } catch (erro) {
        console.error("Erro ao excluir lead:", erro);
        alert("Não foi possível excluir. Tente novamente.");
      } finally {
        btnConfirmarExclusao.disabled = false;
        btnConfirmarExclusao.textContent = "Sim, Remover";
        leadIdParaExcluir = null;
      }
    });
  }

  // Confirmar restauração (NOVO)
  const btnConfirmarRestaurar = document.getElementById(
    "btnConfirmarRestaurarLead",
  );
  if (btnConfirmarRestaurar) {
    btnConfirmarRestaurar.addEventListener("click", async () => {
      if (!leadIdParaRestaurar) return;
      const txt = btnConfirmarRestaurar.innerHTML;
      btnConfirmarRestaurar.disabled = true;
      btnConfirmarRestaurar.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Restaurando...`;
      try {
        await restaurarLead(leadIdParaRestaurar);
        if (restaurarModalInstance) restaurarModalInstance.hide();
      } catch (erro) {
        console.error("Erro ao restaurar lead:", erro);
        alert("Não foi possível restaurar. Tente novamente.");
      } finally {
        btnConfirmarRestaurar.disabled = false;
        btnConfirmarRestaurar.innerHTML = txt;
        leadIdParaRestaurar = null;
      }
    });
  }
}

/* ====== TOGGLE EXCLUÍDOS (NOVO) ====== */
function configurarToggleExcluidos() {
  const btn = document.getElementById("btn-alternar-leads-excluidos");
  if (!btn) return;

  btn.addEventListener("click", () => {
    mostrarExcluidos = !mostrarExcluidos;

    // Ao ligar excluídos, reseta filtro de prioridade
    if (mostrarExcluidos) {
      const filterPriority = document.getElementById("filter-priority");
      if (filterPriority) filterPriority.value = "all";
    }

    btn.innerHTML = mostrarExcluidos
      ? `<i class="fas fa-users me-1"></i> Ver Ativos`
      : `<i class="fas fa-trash-alt me-1"></i> Mostrar Excluídos`;

    btn.classList.toggle("active", mostrarExcluidos);
    btn.classList.toggle("btn-danger", mostrarExcluidos);
    btn.classList.toggle("btn-outline-danger", !mostrarExcluidos);

    iniciarEscutaLeads();
  });
}

/* ====== FILTROS ====== */
function configurarFiltros() {
  const filterPriority = document.getElementById("filter-priority");
  if (filterPriority) {
    filterPriority.addEventListener("change", () => {
      // Se mudar a prioridade, desliga o modo "excluídos"
      if (mostrarExcluidos) {
        mostrarExcluidos = false;
        const btnExcluidos = document.getElementById(
          "btn-alternar-leads-excluidos",
        );
        if (btnExcluidos) {
          btnExcluidos.innerHTML = `<i class="fas fa-trash-alt me-1"></i> Mostrar Excluídos`;
          btnExcluidos.classList.remove("active", "btn-danger");
          btnExcluidos.classList.add("btn-outline-danger");
        }
        iniciarEscutaLeads();
        return;
      }

      paginaAtual = 1;
      aplicarFiltrosERenderizar();
    });
  }
}

/* ====== BUSCA ====== */
function configurarBusca() {
  const inputBusca = document.getElementById("busca-lead");
  if (!inputBusca) return;

  inputBusca.addEventListener("input", (e) => {
    clearTimeout(timerBusca);
    timerBusca = setTimeout(() => {
      termoBusca = e.target.value.trim().toLowerCase();
      paginaAtual = 1;
      aplicarFiltrosERenderizar();
    }, 300);
  });
}

/* ====== ITENS POR PÁGINA ====== */
function configurarSeletorItensPorPagina() {
  const selectItens = document.getElementById("itens-por-pagina");
  if (!selectItens) return;

  selectItens.addEventListener("change", (e) => {
    itensPorPagina = parseInt(e.target.value, 10) || 20;
    paginaAtual = 1;
    aplicarFiltrosERenderizar();
  });
}

/* ====== FILTRAR + PAGINAR + RENDERIZAR ====== */
function aplicarFiltrosERenderizar() {
  let filtrados = [...listaLeadsCompleta];

  if (termoBusca) {
    filtrados = filtrados.filter((lead) => {
      const nome = getNomeLead(lead).toLowerCase();
      const email = (lead.email || "").toLowerCase();
      const curso = getCursoLead(lead).toLowerCase();
      return (
        nome.includes(termoBusca) ||
        email.includes(termoBusca) ||
        curso.includes(termoBusca)
      );
    });
  }

  // Filtro de prioridade — só se NÃO estiver no modo "excluídos"
  if (!mostrarExcluidos) {
    const filterPriority = document.getElementById("filter-priority");
    const filtroPrio = filterPriority ? filterPriority.value : "all";

    if (filtroPrio !== "all") {
      filtrados = filtrados.filter((lead) => {
        const prio = (lead.prioridade || "média").toLowerCase();
        return prio === filtroPrio.toLowerCase();
      });
    }
  }

  listaLeadsFiltrada = filtrados;

  const totalPaginas = Math.max(
    1,
    Math.ceil(filtrados.length / itensPorPagina),
  );
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
  if (paginaAtual < 1) paginaAtual = 1;

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const pagina = filtrados.slice(inicio, fim);

  renderizarTabela(pagina, filtrados.length, inicio, fim);
  renderizarContador(filtrados.length, inicio, fim);
  renderizarPaginacao(totalPaginas);
  atualizarKPIs();
}

/* ====== KPIs ====== */
function atualizarKPIs() {
  let alta = 0;
  let emAtendimento = 0;

  // KPIs sempre consideram TODOS os leads (não só o filtro)
  listaLeadsCompleta.forEach((l) => {
    const prio = (l.prioridade || "").toLowerCase();
    const stat = (l.status || "").toLowerCase();
    if (prio === "alta") alta++;
    if (stat === "em_contato" || stat === "em atendimento") emAtendimento++;
  });

  const elTotal = document.getElementById("metric-total");
  const elAlta = document.getElementById("metric-alta");
  const elAtendimento = document.getElementById("metric-atendimento");

  if (elTotal) elTotal.textContent = listaLeadsCompleta.length;
  if (elAlta) elAlta.textContent = alta;
  if (elAtendimento) elAtendimento.textContent = emAtendimento;
}

/* ====== TABELA ====== */
function renderizarTabela(pagina, totalFiltrados, inicio, fim) {
  const tbody = document.getElementById("leads-tbody");
  const mobileContainer = document.getElementById("leads-mobile-container");

  if (!tbody) return;

  if (pagina.length === 0) {
    const msg = mostrarExcluidos
      ? "Nenhum lead excluído."
      : listaLeadsCompleta.length === 0
        ? "Nenhuma inscrição encontrada."
        : "Nenhum lead corresponde aos filtros atuais.";

    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">${msg}</td></tr>`;
    if (mobileContainer) {
      mobileContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 2rem;">${msg}</div>`;
    }
    return;
  }

  let htmlDesktop = "";
  let htmlMobile = "";

  pagina.forEach((lead) => {
    const nomeLead = getNomeLead(lead) || "Não informado";
    const cursoLead = getCursoLead(lead) || "Geral";

    const prioridade = lead.prioridade || "Média";
    let badgeClass = "bg-warning text-dark";
    if (prioridade.toLowerCase() === "alta")
      badgeClass = "bg-danger text-white";
    if (prioridade.toLowerCase() === "baixa")
      badgeClass = "bg-success text-white";

    const prioridadePill = `<span class="badge rounded-pill ${badgeClass} px-3 py-1" style="font-size: 0.8rem; font-weight: 500;">${prioridade}</span>`;

    const status = (lead.status || "novo").toLowerCase();
    let statusStyle =
      "border: 1px solid #cbd5e1; color: #64748b; background: #f8fafc;";

    if (status === "novo" || status === "pendente") {
      statusStyle =
        "border: 1px solid #3b82f6; color: #1d4ed8; background: #eff6ff;";
    } else if (status === "em_contato" || status === "em atendimento") {
      statusStyle =
        "border: 1px solid #f97316; color: #c2410c; background: #fff7ed;";
    } else if (status === "matriculado") {
      statusStyle =
        "border: 1px solid #22c55e; color: #15803d; background: #f0fdf4;";
    } else if (status === "cancelado" || status === "perdido") {
      statusStyle =
        "border: 1px solid #94a3b8; color: #475569; background: #f1f5f9;";
    }

    const statusPill = `<span class="status-pill px-3 py-1 rounded-pill d-inline-flex align-items-center gap-1" style="${statusStyle} font-size: 0.82rem; font-weight: 500;">${lead.status || "Novo"}</span>`;

    let dataFormatada = "Recente";
    if (lead.criado_em) {
      dataFormatada = new Date(lead.criado_em).toLocaleDateString("pt-BR");
    } else if (lead.data?.toDate) {
      dataFormatada = lead.data.toDate().toLocaleDateString("pt-BR");
    } else if (lead.data?.seconds) {
      dataFormatada = new Date(lead.data.seconds * 1000).toLocaleDateString(
        "pt-BR",
      );
    }

    const estaExcluido = lead.excluido === true;

    // ⬇️ Ações: excluído mostra [Ver] [Restaurar]; normal mostra WhatsApp/Editar/Excluir
    const acoesBotoes = estaExcluido
      ? `
                <div class="actions-group" style="display: inline-flex; gap: 0.4rem; justify-content: center;">
                    <button class="btn-icon btn-icon-edit btn-restaurar-action" data-id="${lead.id}" title="Restaurar Lead">
                        <i class="fas fa-recycle"></i>
                    </button>
                </div>
            `
      : `
                <div class="actions-group" style="display: inline-flex; gap: 0.4rem; justify-content: center;">
                    <a href="https://wa.me/${lead.telefone || ""}" target="_blank"
                       class="btn-icon btn-icon-whatsapp text-decoration-none"
                       title="Contatar WhatsApp" data-action="contatar" data-id="${lead.id}">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                    <button class="btn-icon btn-icon-edit btn-editar-action" data-id="${lead.id}" title="Editar Lead">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-icon btn-icon-delete btn-excluir-action" data-id="${lead.id}" title="Excluir Lead">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

    // Badge de status especial se estiver excluído
    const statusPillFinal = estaExcluido
      ? `<span class="status-pill px-3 py-1 rounded-pill d-inline-flex align-items-center gap-1" style="border: 1px solid #dc2626; color: #b91c1c; background: #fef2f2; font-size: 0.82rem; font-weight: 500;">Excluído</span>`
      : statusPill;

    htmlDesktop += `
            <tr>
                <td>${dataFormatada}</td>
                <td>
                    <strong>${nomeLead}</strong><br>
                    <small style="color: #64748b;">${lead.email || ""}</small>
                </td>
                <td>${cursoLead}</td>
                <td>${prioridadePill}</td>
                <td style="max-width: 250px; font-size: 0.8rem; color: #475569; line-height: 1.3;">
                    ${lead.resumo_ia || lead.mensagem || "-"}
                </td>
                <td>${statusPillFinal}</td>
                <td style="text-align: center;">${acoesBotoes}</td>
            </tr>
        `;

    htmlMobile += `
            <div class="card-lead-item" style="background: white; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div>
                        <strong>${nomeLead}</strong><br>
                        <small style="color: #64748b;">${lead.email || ""}</small>
                    </div>
                    <div>${prioridadePill}</div>
                </div>
                <div style="font-size: 0.85rem; color: #475569; margin-bottom: 0.75rem;">
                    <p style="margin: 0.2rem 0;"><strong>Curso:</strong> ${cursoLead}</p>
                    <p style="margin: 0.2rem 0;"><strong>Análise:</strong> ${lead.resumo_ia || lead.mensagem || "-"}</p>
                    <p style="margin: 0.2rem 0;"><strong>Status:</strong> ${statusPillFinal}</p>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; margin-top: 0.5rem; padding-top: 0.5rem;">
                    <span style="font-size: 0.75rem; color: #94a3b8;">${dataFormatada}</span>
                    <div>${acoesBotoes}</div>
                </div>
            </div>
        `;
  });

  tbody.innerHTML = htmlDesktop;
  if (mobileContainer) mobileContainer.innerHTML = htmlMobile;

  configurarEventosTabela();
}

/* ====== CONTADOR ====== */
function renderizarContador(totalFiltrado, inicio, fim) {
  const el = document.getElementById("contador-leads");
  if (!el) return;

  if (totalFiltrado === 0) {
    el.textContent = mostrarExcluidos
      ? "Nenhum lead excluído"
      : "Nenhum lead encontrado";
    return;
  }

  const fimExibido = Math.min(fim, totalFiltrado);
  const prefixo = mostrarExcluidos ? "Mostrando excluídos" : "Mostrando";
  el.textContent = `${prefixo} ${inicio + 1}-${fimExibido} de ${totalFiltrado} lead${totalFiltrado > 1 ? "s" : ""}`;
}

/* ====== PAGINAÇÃO ====== */
function renderizarPaginacao(totalPaginas) {
  const ul = document.getElementById("paginacao-leads");
  if (!ul) return;

  if (totalPaginas <= 1) {
    ul.innerHTML = "";
    return;
  }

  let html = "";
  html += `
        <li class="page-item ${paginaAtual === 1 ? "disabled" : ""}">
            <a class="page-link" href="#" data-page="${paginaAtual - 1}" aria-label="Anterior">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;

  const paginas = calcularPaginasVisiveis(paginaAtual, totalPaginas);

  paginas.forEach((p) => {
    if (p === "...") {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    } else {
      html += `
                <li class="page-item ${p === paginaAtual ? "active" : ""}">
                    <a class="page-link" href="#" data-page="${p}">${p}</a>
                </li>
            `;
    }
  });

  html += `
        <li class="page-item ${paginaAtual === totalPaginas ? "disabled" : ""}">
            <a class="page-link" href="#" data-page="${paginaAtual + 1}" aria-label="Próxima">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;

  ul.innerHTML = html;

  ul.querySelectorAll("a.page-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const p = parseInt(link.getAttribute("data-page"), 10);
      if (!isNaN(p) && p >= 1 && p <= totalPaginas && p !== paginaAtual) {
        paginaAtual = p;
        aplicarFiltrosERenderizar();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

function calcularPaginasVisiveis(atual, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const paginas = [1];
  if (atual > 4) paginas.push("...");

  const inicio = Math.max(2, atual - 1);
  const fim = Math.min(total - 1, atual + 1);

  for (let i = inicio; i <= fim; i++) paginas.push(i);

  if (atual < total - 3) paginas.push("...");
  paginas.push(total);

  return paginas;
}

/* ====== EVENTOS DA TABELA ====== */
function configurarEventosTabela() {
  const tbody = document.getElementById("leads-tbody");
  if (!tbody) return;

  if (tbody._handler) {
    tbody.removeEventListener("click", tbody._handler);
  }

  tbody._handler = async (e) => {
    const btnContatar = e.target.closest("[data-action='contatar']");
    if (btnContatar) {
      const id = btnContatar.getAttribute("data-id");
      try {
        await atualizarStatusLead(id, "em_contato");
      } catch (erro) {
        console.error("Erro ao atualizar status:", erro);
      }
      return;
    }

    const btnEditar = e.target.closest(".btn-editar-action");
    if (btnEditar) {
      const id = btnEditar.getAttribute("data-id");
      await abrirModalEdicao(id);
      return;
    }

    const btnExcluir = e.target.closest(".btn-excluir-action");
    if (btnExcluir) {
      leadIdParaExcluir = btnExcluir.getAttribute("data-id");
      if (excluirModalInstance) excluirModalInstance.show();
      return;
    }

    // ⬇️ NOVO: Restaurar lead
    const btnRestaurar = e.target.closest(".btn-restaurar-action");
    if (btnRestaurar) {
      const id = btnRestaurar.getAttribute("data-id");
      const lead = listaLeadsCompleta.find((l) => l.id === id);

      leadIdParaRestaurar = id;
      const nomeEl = document.getElementById("nomeLeadRestaurar");
      if (nomeEl) nomeEl.textContent = getNomeLead(lead) || "este lead";

      if (restaurarModalInstance) restaurarModalInstance.show();
      return;
    }
  };

  tbody.addEventListener("click", tbody._handler);
}

/* ====== MODAL DE EDIÇÃO ====== */
async function abrirModalEdicao(id) {
  try {
    const lead = await obterLeadPorId(id);
    if (!lead) {
      alert("Lead não encontrado.");
      return;
    }
    preencherModalEdicao(id, lead);

    // ⬇️ NOVO: Carrega o histórico de auditoria
    await renderizarTimelineAuditoria({
      colecao: "leads",
      docId: id,
      containerId: "leadAuditoriaContainer",
      limite: 20,
    });
  } catch (erro) {
    console.error("Erro ao abrir modal:", erro);
    alert("Erro ao carregar dados do lead.");
  }
}

function preencherModalEdicao(id, data) {
  const setVal = (elementId, val) => {
    const el = document.getElementById(elementId);
    if (el) el.value = val !== undefined && val !== null ? val : "";
  };

  const setCheck = (elementId, checked) => {
    const el = document.getElementById(elementId);
    if (el) el.checked = !!checked;
  };

  setVal("edit-lead-id", id);
  setVal("edit-nome", data.name || data.nome || data.candidato || "");
  setVal("edit-email", data.email || "");
  setVal("edit-telefone", data.telefone || "");
  setVal("edit-curso", data.curso_interesse_name || data.curso || "");
  setVal("edit-resumo-ia", data.resumo_ia || data.mensagem || "");
  setVal("edit-status", data.status || "Novo");
  setVal("edit-prioridade", data.prioridade || "Média");

  setVal("edit-cpf", data.cpf || "");
  setVal("edit-empresa", data.empresa || "");
  setVal("edit-cargo", data.cargo || "");

  setVal("edit-cep", data.cep || "");
  setVal("edit-logradouro", data.logradouro || "");
  setVal("edit-numero", data.numero || "");
  setVal("edit-bairro", data.bairro || "");
  setVal("edit-cidade", data.cidade || "");
  setVal("edit-estado", data.estado || "");

  setVal("edit-linkedin", data.linkedin || "");
  setVal("edit-instagram", data.instagram || "");
  setVal("edit-facebook", data.facebook || "");

  setVal("input-valor-curso", data.valorCurso || "");
  setVal("select-forma-pagamento", data.formaPagamento || "Pix");
  setVal(
    "select-status-pagamento",
    data.statusPagamento || "Aguardando pagamento",
  );
  setVal("edit-obs-financeiro", data.obsFinanceiro || "");

  if (data.atualizado_por && data.atualizado_em) {
    const dataFormatada = new Date(data.atualizado_em).toLocaleString("pt-BR");
    setVal("edit-atualizado-por", `${data.atualizado_por} em ${dataFormatada}`);
  } else {
    setVal("edit-atualizado-por", "Nenhuma alteração registada anteriormente");
  }

  setCheck("edit-zap-msg", data.aceita_msg_zap);
  setCheck("edit-zap-ligacao", data.aceita_ligacao_zap);
  setCheck("edit-email-validado", data.email_validado);

  const feedbackEl = document.getElementById("feedback-matricula");
  if (feedbackEl) feedbackEl.className = "alert d-none";

  if (editModalInstance) editModalInstance.show();
}

/* ====== FORMULÁRIO DE EDIÇÃO ====== */
function configurarFormularioEdicao() {
  const editForm = document.getElementById("edit-lead-form");
  if (!editForm) return;

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("edit-lead-id")?.value;
    if (!id) return;

    const btnSave = document.getElementById("btn-save-edit");
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = "A salvar...";
    }

    const getVal = (elementId) =>
      document.getElementById(elementId)?.value || "";
    const getCheck = (elementId) =>
      document.getElementById(elementId)?.checked || false;

    const cpfValor = getVal("edit-cpf").replace(/\D/g, "");
    if (cpfValor.length > 0 && cpfValor.length !== 11) {
      alert("O CPF deve conter exatamente 11 dígitos (ou ficar em branco).");
      document.getElementById("edit-cpf")?.focus();
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = "Salvar";
      }
      return;
    }

    const dados = {
      name: getVal("edit-nome"),
      email: getVal("edit-email"),
      telefone: getVal("edit-telefone"),
      curso_interesse_name: getVal("edit-curso"),
      cpf: cpfValor || "",
      empresa: getVal("edit-empresa"),
      cargo: getVal("edit-cargo"),
      cep: getVal("edit-cep"),
      logradouro: getVal("edit-logradouro"),
      numero: getVal("edit-numero"),
      bairro: getVal("edit-bairro"),
      cidade: getVal("edit-cidade"),
      estado: getVal("edit-estado"),
      status: getVal("edit-status"),
      prioridade: getVal("edit-prioridade"),
      linkedin: getVal("edit-linkedin"),
      instagram: getVal("edit-instagram"),
      facebook: getVal("edit-facebook"),
      resumo_ia: getVal("edit-resumo-ia"),
      aceita_msg_zap: getCheck("edit-zap-msg"),
      aceita_ligacao_zap: getCheck("edit-zap-ligacao"),
      email_validado: getCheck("edit-email-validado"),
    };

    try {
      await salvarEdicaoLead(id, dados);

      // ⬇️ NOVO: Atualiza a timeline (se o modal continuar aberto)
      await renderizarTimelineAuditoria({
        colecao: "leads",
        docId: id,
        containerId: "leadAuditoriaContainer",
        limite: 20,
      });

      if (editModalInstance) editModalInstance.hide();
    } catch (erro) {
      console.error("Erro ao salvar:", erro);
      alert("Erro ao salvar alterações.");
    } finally {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = "Salvar";
      }
    }
  });
}

/* ====== VIACEP ====== */
function configurarViaCEP() {
  const cepInput = document.getElementById("edit-cep");
  if (!cepInput) return;

  cepInput.addEventListener("blur", async (e) => {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        const setVal = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.value = val || "";
        };
        setVal("edit-logradouro", data.logradouro);
        setVal("edit-bairro", data.bairro);
        setVal("edit-cidade", data.localidade);
        setVal("edit-estado", data.uf);
        document.getElementById("edit-numero")?.focus();
      }
    } catch (erro) {
      console.error("Erro ViaCEP:", erro);
    }
  });
}

/* ====== BOTÃO DE CONVERSÃO ====== */
function configurarBotaoConversao() {
  const btn = document.getElementById("btn-executar-matricula");
  const feedback = document.getElementById("feedback-matricula");

  if (!btn) return;

  btn.addEventListener("click", () => {
    if (feedback) {
      feedback.className = "alert alert-warning py-2 px-3 small mb-0 d-block";
      feedback.textContent =
        "⚠️ A conversão em aluno será reativada após refatoração do serviço.";
    }
  });
}
