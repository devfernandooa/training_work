/**
 * =========================================================================
 * TRAINING WORK — UI FINANCEIRO (financeiro-ui.js)
 * =========================================================================
 *
 * Camada de apresentação: só mexe no DOM.
 * Escuta os dados do service e renderiza.
 * =========================================================================
 */
import {
  renderizarTimelineAuditoria,
  formatarValorAudit,
} from "../modules/auditoria-timeline.js";
import { criarTransacaoFinanceira } from "../backend/financeiro-service.js";
import {
  escutarFinanceiro,
  atualizarStatusFinanceiro,
  editarTransacaoFinanceira,
  excluirTransacaoFinanceira,
} from "../backend/financeiro-service.js";
import { renderizarTimelineAuditoria } from "../modules/auditoria-timeline.js";

/* =========================================================================
 * ESTADO
 * ========================================================================= */

let modalConfirmacaoInstance = null;
let toastSucessoInstance = null;
let callbackConfirmacao = null;

/**
 * Mostra um modal de confirmação estilizado.
 */
function pedirConfirmacao(opcoes) {
    const modalEl = document.getElementById("modalConfirmacao");
    if (!modalEl) {
        if (window.confirm(opcoes.mensagem)) {
            if (typeof opcoes.onConfirmar === "function") opcoes.onConfirmar();
        }
        return;
    }

    const icones = {
        "warning": { icone: "fa-exclamation-triangle", cor: "#f59e0b", fundo: "#fef3c7" },
        "success": { icone: "fa-check-circle", cor: "#16a34a", fundo: "#dcfce7" },
        "danger": { icone: "fa-trash-alt", cor: "#dc2626", fundo: "#fee2e2" },
        "info": { icone: "fa-info-circle", cor: "#0284c7", fundo: "#e0f2fe" },
    };

    const tipo = opcoes.tipo || "info";
    const cfg = icones[tipo] || icones.info;

    const iconeEl = document.getElementById("modalConfirmacaoIcone");
    if (iconeEl) {
        iconeEl.style.background = cfg.fundo;
        iconeEl.innerHTML = `<i class="fas ${cfg.icone} fa-2x" style="color: ${cfg.cor};"></i>`;
    }

    const titulo = document.getElementById("modalConfirmacaoTitulo");
    if (titulo) titulo.textContent = opcoes.titulo || "Confirmação";

    const mensagem = document.getElementById("modalConfirmacaoMensagem");
    if (mensagem) {
        mensagem.innerHTML = (opcoes.mensagem || "Tem certeza?").replace(/\n/g, "<br>");
    }

    const btn = document.getElementById("modalConfirmacaoBtn");
    if (btn) {
        btn.textContent = opcoes.textoBotao || "Confirmar";
        btn.className = `btn ${opcoes.corBotao || "btn-primary"} px-4 rounded-pill fw-semibold`;
    }

    callbackConfirmacao = opcoes.onConfirmar;

    if (!modalConfirmacaoInstance && window.bootstrap) {
        modalConfirmacaoInstance = new bootstrap.Modal(modalEl);
    }
    if (modalConfirmacaoInstance) modalConfirmacaoInstance.show();
}

function mostrarSucesso(mensagem) {
  const toastEl = document.getElementById("toastSucesso");
  const mensagemEl = document.getElementById("toastSucessoMensagem");

    if (!toastEl) {
        console.log("✅", mensagem);
        return;
    }

    if (mensagemEl) mensagemEl.textContent = mensagem;
    if (!toastSucessoInstance && window.bootstrap) {
        toastSucessoInstance = new bootstrap.Toast(toastEl, { delay: 3000 });
    }
    if (toastSucessoInstance) toastSucessoInstance.show();
}

function mostrarErro(mensagem) {
    const toastEl = document.getElementById("toastSucesso");
    const mensagemEl = document.getElementById("toastSucessoMensagem");

    if (!toastEl) {
        console.error("❌", mensagem);
        return;
    }

    toastEl.classList.remove("bg-success");
    toastEl.classList.add("bg-danger");

    if (mensagemEl) mensagemEl.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>${mensagem}`;

    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();

    toastEl.addEventListener("hidden.bs.toast", () => {
        toastEl.classList.remove("bg-danger");
        toastEl.classList.add("bg-success");
    }, { once: true });
}

let listaCompleta = [];
let listaFiltrada = [];

let paginaAtual = 1;
let itensPorPagina = 20;

let termoBusca = "";
let filtroStatus = "todos";
let filtroForma = "todas";

let graficoFluxoInstance = null;
let graficoFormasInstance = null;
let modalEdicaoInstance = null;

let timerBusca = null;

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 [financeiro-ui] Inicializando...");

    const modalEl = document.getElementById("modalEditarFinanceiro");
    if (modalEl && window.bootstrap) {
        modalEdicaoInstance = new bootstrap.Modal(modalEl);
    }

    const btnConf = document.getElementById("modalConfirmacaoBtn");
    if (btnConf) {
        btnConf.addEventListener("click", async () => {
            if (typeof callbackConfirmacao === "function") {
                const cb = callbackConfirmacao;
                callbackConfirmacao = null;
                if (modalConfirmacaoInstance) modalConfirmacaoInstance.hide();
                try {
                    await cb();
                } catch (err) {
                    console.error("Erro na ação confirmada:", err);
                }
            }
        });
    }

    configurarFiltros();
    configurarFormularioEdicao();
    configurarEventosTabela();

    escutarFinanceiro((transacoes) => {
        console.log("📊 [financeiro-ui] Recebi", transacoes.length, "transações");
        listaCompleta = transacoes;
        paginaAtual = 1;
        aplicarFiltrosERenderizar();
    });
  }

  configurarFiltros();
  configurarFormularioEdicao();
  configurarEventosTabela();

  escutarFinanceiro((transacoes) => {
    console.log("📊 [financeiro-ui] Recebi", transacoes.length, "transações");
    listaCompleta = transacoes;
    paginaAtual = 1;
    aplicarFiltrosERenderizar();
  });
});

function configurarFiltros() {
  const inputBusca = document.getElementById("busca-transacao");
  if (inputBusca) {
    inputBusca.addEventListener("input", (e) => {
      clearTimeout(timerBusca);
      timerBusca = setTimeout(() => {
        termoBusca = e.target.value.trim().toLowerCase();
        paginaAtual = 1;
        aplicarFiltrosERenderizar();
      }, 300);
    });
  }

  const selectStatus = document.getElementById("filtroStatusFinanceiro");
  if (selectStatus) {
    selectStatus.addEventListener("change", (e) => {
      filtroStatus = e.target.value;
      paginaAtual = 1;
      aplicarFiltrosERenderizar();
    });
  }

  const selectForma = document.getElementById("filtroFormaPagamento");
  if (selectForma) {
    selectForma.addEventListener("change", (e) => {
      filtroForma = e.target.value;
      paginaAtual = 1;
      aplicarFiltrosERenderizar();
    });
  }

  const selectItens = document.getElementById("itens-por-pagina-financeiro");
  if (selectItens) {
    selectItens.addEventListener("change", (e) => {
      itensPorPagina = parseInt(e.target.value, 10) || 20;
      paginaAtual = 1;
      aplicarFiltrosERenderizar();
    });
  }
}

function aplicarFiltrosERenderizar() {
    let filtrados = [...listaCompleta];

    if (termoBusca) {
        filtrados = filtrados.filter((t) => {
            const nome = (t.alunoNome || "").toLowerCase();
            const curso = (t.curso || "").toLowerCase();
            const descricao = (t.descricao || "").toLowerCase();
            return nome.includes(termoBusca) || curso.includes(termoBusca) || descricao.includes(termoBusca);
        });
    }

    if (filtroStatus !== "todos") {
        filtrados = filtrados.filter((t) => t.status === filtroStatus);
    }

    if (filtroForma !== "todas") {
        filtrados = filtrados.filter((t) => t.formaPagamento === filtroForma);
    }

    listaFiltrada = filtrados;

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / itensPorPagina));
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const pagina = filtrados.slice(inicio, fim);

    renderizarTabela(pagina);
    renderizarContador(filtrados.length, inicio, fim);
    renderizarPaginacao(totalPaginas);
    atualizarKPIs();
    renderizarGraficos();
}

function atualizarKPIs() {
    let recebido = 0;
    let pendente = 0;
    let aguardando = 0;
    let saidas = 0;

    listaCompleta.forEach(t => {
        const v = Number(t.valor || 0);
        const tipo = t.tipo || "entrada";

        if (tipo === "saida") {
            saidas += v;
            return;
        }

    if (t.status === "Recebido") recebido += v;
    else if (t.status === "Pendente") pendente += v;
    else if (t.status === "Aguardando pagamento") aguardando += v;
  });

  const liquido = recebido - saidas;

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = formatarMoeda(val);
    };

    set("financeiro-total-recebido", recebido);
    set("financeiro-total-pendente", pendente);
    set("financeiro-total-aguardando", aguardando);
    set("financeiro-total-geral", liquido);

    const elSaidas = document.getElementById("financeiro-total-saidas");
    if (elSaidas) elSaidas.textContent = formatarMoeda(saidas);

    const labelTotal = document.querySelector('[data-kpi-label="total-geral"]');
    if (labelTotal) labelTotal.textContent = "Total Líquido";
}

function renderizarGraficos() {
  let recebido = 0,
    pendente = 0,
    aguardando = 0;
  const formas = {
    Pix: 0,
    "Cartão de Crédito": 0,
    "Boleto Bancário": 0,
    "À Vista": 0,
  };

  listaCompleta.forEach((t) => {
    const v = Number(t.valor || 0);
    if (t.status === "Recebido") recebido += v;
    else if (t.status === "Pendente") pendente += v;
    else aguardando += v;

    if (formas[t.formaPagamento] !== undefined) formas[t.formaPagamento] += v;
  });

  // Gráfico 1 — Fluxo
  const ctx1 = document.getElementById("graficoFluxoCaixa")?.getContext("2d");
  if (ctx1) {
    if (graficoFluxoInstance) graficoFluxoInstance.destroy();
    graficoFluxoInstance = new Chart(ctx1, {
      type: "bar",
      data: {
        labels: ["Recebido", "Pendente", "Aguardando"],
        datasets: [
          {
            label: "R$",
            data: [recebido, pendente, aguardando],
            backgroundColor: ["#198754", "#0dcaf0", "#ffc107"],
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });

    const ctx1 = document.getElementById("graficoFluxoCaixa")?.getContext("2d");
    if (ctx1) {
        if (graficoFluxoInstance) graficoFluxoInstance.destroy();
        graficoFluxoInstance = new Chart(ctx1, {
            type: "bar",
            data: {
                labels: ["Recebido", "Pendente", "Aguardando"],
                datasets: [{
                    label: "R$",
                    data: [recebido, pendente, aguardando],
                    backgroundColor: ["#198754", "#0dcaf0", "#ffc107"],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    const ctx2 = document.getElementById("graficoFormasPagamento")?.getContext("2d");
    if (ctx2) {
        if (graficoFormasInstance) graficoFormasInstance.destroy();
        graficoFormasInstance = new Chart(ctx2, {
            type: "doughnut",
            data: {
                labels: ["Pix", "Cartão", "Boleto", "À Vista"],
                datasets: [{
                    data: [formas["Pix"], formas["Cartão de Crédito"], formas["Boleto Bancário"], formas["À Vista"]],
                    backgroundColor: ["#0d6efd", "#6610f2", "#6c757d", "#20c997"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } }
            }
        });
    }
}

function renderizarTabela(pagina) {
    const tbody = document.getElementById("financeiro-tbody");
    if (!tbody) return;

    if (pagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Nenhuma transação encontrada.</td></tr>`;
        return;
    }

    let html = "";

    pagina.forEach((t) => {
        const dataFmt = t.criado_em ? new Date(t.criado_em).toLocaleDateString("pt-BR") : "—";
        const tipo = t.tipo || "entrada";
        const tipoBadge = tipo === "saida"
            ? `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1" style="font-size: 0.7rem;"><i class="fas fa-arrow-down me-1"></i>Saída</span>`
            : `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1" style="font-size: 0.7rem;"><i class="fas fa-arrow-up me-1"></i>Entrada</span>`;

        let badgeClass = "bg-warning bg-opacity-10 text-warning border border-warning";
        if (t.status === "Recebido") badgeClass = "bg-success bg-opacity-10 text-success border border-success";
        else if (t.status === "Pendente") badgeClass = "bg-info bg-opacity-10 text-info border border-info";

        const valorHtml = tipo === "saida"
            ? `<span class="text-danger fw-bold">-${formatarMoeda(t.valor)}</span>`
            : `<span class="fw-bold">${formatarMoeda(t.valor)}</span>`;

        html += `
        <tr>
            <td>${dataFmt}</td>
            <td>${tipoBadge}</td>
            <td><strong>${t.alunoNome || "—"}</strong></td>
            <td>${t.curso || "—"}</td>
            <td><span class="badge bg-light text-dark border">${t.formaPagamento}</span></td>
            <td>${valorHtml}</td>
            <td><span class="badge rounded-pill ${badgeClass} px-3 py-2">${t.status}</span></td>
            <td class="text-end">
                <div class="d-flex justify-content-end gap-1">
                    <button class="btn btn-sm btn-outline-success px-2 py-1 btn-validar-pagamento" data-id="${t.id}" title="Marcar como Recebido">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary px-2 py-1 btn-editar-financeiro" data-id="${t.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger px-2 py-1 btn-excluir-financeiro" data-id="${t.id}" title="Excluir">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
  });

  tbody.innerHTML = html;
}

function renderizarContador(total, inicio, fim) {
  const el = document.getElementById("contador-transacoes");
  if (!el) return;
  if (total === 0) {
    el.textContent = "Nenhuma transação encontrada";
    return;
  }
  el.textContent = `Mostrando ${inicio + 1}-${Math.min(fim, total)} de ${total} transações`;
}

function renderizarPaginacao(totalPaginas) {
  const ul = document.getElementById("paginacao-financeiro");
  if (!ul) return;

  if (totalPaginas <= 1) {
    ul.innerHTML = "";
    return;
  }

  let html = "";

  html += `<li class="page-item ${paginaAtual === 1 ? "disabled" : ""}">
        <a class="page-link" href="#" data-page="${paginaAtual - 1}"><i class="fas fa-chevron-left"></i></a>
    </li>`;

  const paginas = calcularPaginasVisiveis(paginaAtual, totalPaginas);
  paginas.forEach((p) => {
    if (p === "...") {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    } else {
      html += `<li class="page-item ${p === paginaAtual ? "active" : ""}">
                <a class="page-link" href="#" data-page="${p}">${p}</a>
            </li>`;
    }
  });

  html += `<li class="page-item ${paginaAtual === totalPaginas ? "disabled" : ""}">
        <a class="page-link" href="#" data-page="${paginaAtual + 1}"><i class="fas fa-chevron-right"></i></a>
    </li>`;

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
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const paginas = [1];
  if (atual > 4) paginas.push("...");
  const inicio = Math.max(2, atual - 1);
  const fim = Math.min(total - 1, atual + 1);
  for (let i = inicio; i <= fim; i++) paginas.push(i);
  if (atual < total - 3) paginas.push("...");
  paginas.push(total);
  return paginas;
}

function configurarEventosTabela() {
    const tbody = document.getElementById("financeiro-tbody");
    if (!tbody) return;

    tbody.addEventListener("click", async (e) => {
        const btnValidar = e.target.closest(".btn-validar-pagamento");
        if (btnValidar) {
            const id = btnValidar.getAttribute("data-id");
            pedirConfirmacao({
                titulo: "Marcar como Recebido",
                mensagem: "Deseja marcar esta transação como RECEBIDA? O status será propagado para o aluno e matrículas.",
                textoBotao: "Marcar Recebido",
                corBotao: "btn-success",
                icone: "fa-check-circle",
                onConfirmar: async () => {
                    try {
                        await atualizarStatusFinanceiro(id, "Recebido", "Pix");
                        mostrarSucesso("Transação marcada como recebida!");
                    } catch (err) {
                        mostrarErro("Erro ao validar pagamento: " + err.message);
                    }
                }
            });
            return;
        }

        const btnEditar = e.target.closest(".btn-editar-financeiro");
        if (btnEditar) {
            const id = btnEditar.getAttribute("data-id");
            abrirModalEdicao(id);
            return;
        }

        const btnExcluir = e.target.closest(".btn-excluir-financeiro");
        if (btnExcluir) {
            const id = btnExcluir.getAttribute("data-id");
            pedirConfirmacao({
                titulo: "Excluir Transação",
                mensagem: "Deseja excluir esta transação? A exclusão é lógica (mantém histórico), e a transação desaparecerá da listagem.",
                textoBotao: "Excluir",
                corBotao: "btn-danger",
                icone: "fa-exclamation-triangle",
                onConfirmar: async () => {
                    try {
                        await excluirTransacaoFinanceira(id);
                        mostrarSucesso("Transação excluída com sucesso!");
                    } catch (err) {
                        mostrarErro("Erro ao excluir: " + err.message);
                    }
                }
            });
            return;
        }
    });
}

function abrirModalEdicao(id) {
    const t = listaCompleta.find((x) => x.id === id);
    if (!t) return;

    document.getElementById("finTransacaoId").value = t.id;
    document.getElementById("finTipo").value = t.tipo || "entrada";
    document.getElementById("finAlunoId").value = t.alunoId || "";
    document.getElementById("finNomeAluno").value = t.alunoNome || "";
    document.getElementById("finCurso").value = t.curso || "";
    document.getElementById("finValorBase").value = t.valor || 0;
    document.getElementById("finAjusteTipo").value = "nenhum";
    document.getElementById("finValorAjuste").value = "0";
    document.getElementById("finFormaPagamento").value = t.formaPagamento || "Pix";
    document.getElementById("finStatusPagamento").value = t.status || "Aguardando pagamento";
    document.getElementById("finAuditoriaNotas").value = t.auditoriaFinanceira || "";

    const boxInfo = document.getElementById("infoUltimaAlteracao");
    const textoInfo = document.getElementById("textoUltimaAlteracao");
    if (boxInfo && textoInfo) {
        if (t.ultimaAlteracaoEm && t.ultimaAlteracaoPor) {
            const fmt = new Date(t.ultimaAlteracaoEm).toLocaleString("pt-BR");
            textoInfo.innerHTML = `Última alteração por <strong>${t.ultimaAlteracaoPor}</strong> em <em>${fmt}</em>`;
            boxInfo.style.display = "block";
        } else {
            boxInfo.style.display = "none";
        }
    }
  }

    // ⬇️ NOVO: Chamada do componente compartilhado
    renderizarTimelineAuditoria({
        colecao: "financeiro",
        docId: t.id,
        containerId: "timelineAuditoriaContainer",
        limite: 20
    });

  if (modalEdicaoInstance) modalEdicaoInstance.show();
}

function configurarFormularioEdicao() {
  const form = document.getElementById("formEditarFinanceiro");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const alunoId = document.getElementById("novaAluno").value;
    const tipo =
      document.getElementById("novaTipoTransacao").value || "entrada";
    const alunoObj = listaAlunosParaNova.find((a) => a.id === alunoId);
    const curso = document.getElementById("novaCurso").value.trim() || "Geral";
    const valor = parseFloat(document.getElementById("novaValor").value) || 0;
    const status = document.getElementById("novaStatus").value;
    const forma = document.getElementById("novaForma").value;
    const dataPagamento = document.getElementById("novaData").value;
    const observacoes = document.getElementById("novaObs").value.trim();

    // Validações
    if (!alunoId) {
      mostrarErro("Selecione um aluno.");
      return;
    }
    if (valor <= 0) {
      mostrarErro("Informe um valor maior que zero.");
      return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("finTransacaoId").value;
        const tipo = document.getElementById("finTipo").value || "entrada";
        const alunoNome = document.getElementById("finNomeAluno").value;
        const valorBase = parseFloat(document.getElementById("finValorBase").value) || 0;
        const ajusteTipo = document.getElementById("finAjusteTipo").value;
        const valorAjuste = parseFloat(document.getElementById("finValorAjuste").value) || 0;
        const status = document.getElementById("finStatusPagamento").value;
        const forma = document.getElementById("finFormaPagamento").value;
        const obs = document.getElementById("finAuditoriaNotas").value;

        let valorFinal = valorBase;
        if (ajusteTipo === "desconto") valorFinal = valorBase - (valorBase * valorAjuste / 100);
        else if (ajusteTipo === "acrescimo") valorFinal = valorBase + (valorBase * valorAjuste / 100);

        pedirConfirmacao({
            tipo: "warning",
            titulo: "Confirmar Alterações?",
            mensagem: `Deseja realmente guardar as alterações desta transação?\n\n` +
                `• Aluno: ${alunoNome}\n` +
                `• Valor final: R$ ${valorFinal.toFixed(2).replace(".", ",")}\n` +
                `• Status: ${status}\n` +
                `• Forma: ${forma}`,
            textoBotao: "Salvar Alterações",
            corBotao: "btn-primary",
            onConfirmar: async () => {
                const btn = form.querySelector('button[type="submit"]');
                if (btn) { btn.disabled = true; btn.textContent = "A guardar..."; }

                try {
                    await editarTransacaoFinanceira(id, {
                        tipo, alunoNome, valor: valorFinal, status,
                        formaPagamento: forma, observacoes: obs
                    });

                    if (modalEdicaoInstance) modalEdicaoInstance.hide();
                    mostrarSucesso("Transação atualizada com sucesso!");

                } catch (err) {
                    mostrarErro("Erro ao guardar: " + err.message);
                } finally {
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i> Guardar'; }
                }
            }
        });
    });
  });
}

/* ==========================================================================
 * MODAL DE NOVA TRANSAÇÃO
 * ========================================================================== */
let modalNovaTransacaoInstance = null;
let listaAlunosParaNova = [];
let mapaAlunosParaNova = {};

document.addEventListener("DOMContentLoaded", () => {
    const modalEl = document.getElementById("modalNovaTransacao");
    if (modalEl && window.bootstrap) {
        modalNovaTransacaoInstance = new bootstrap.Modal(modalEl);
    }

    const btnNova = document.getElementById("btnNovaTransacao");
    if (btnNova) {
        btnNova.addEventListener("click", () => {
            const form = document.getElementById("formNovaTransacao");
            if (form) form.reset();
            document.getElementById("novaCurso").value = "";

            document.getElementById("novaTipo").value = "entrada";

            const hoje = new Date().toISOString().split("T")[0];
            document.getElementById("novaData").value = hoje;

            carregarAlunosParaNova();

            if (modalNovaTransacaoInstance) modalNovaTransacaoInstance.show();
        });
    }

    const selectAluno = document.getElementById("novaAluno");
    if (selectAluno) {
        selectAluno.addEventListener("change", (e) => {
            const alunoId = e.target.value;
            const curso = mapaAlunosParaNova[alunoId] || "";
            document.getElementById("novaCurso").value = curso || "Geral";
        });
    }

    const form = document.getElementById("formNovaTransacao");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const alunoId = document.getElementById("novaAluno").value;
            const tipo = document.getElementById("novaTipo").value || "entrada";
            const alunoObj = listaAlunosParaNova.find(a => a.id === alunoId);
            const curso = document.getElementById("novaCurso").value.trim() || "Geral";
            const valor = parseFloat(document.getElementById("novaValor").value) || 0;
            const status = document.getElementById("novaStatus").value;
            const forma = document.getElementById("novaForma").value;
            const dataPagamento = document.getElementById("novaData").value;
            const observacoes = document.getElementById("novaObs").value.trim();

            if (!alunoId) {
                mostrarErro("Selecione um aluno.");
                return;
            }
            if (valor <= 0) {
                mostrarErro("Informe um valor maior que zero.");
                return;
            }

  // Submit do form
  const form = document.getElementById("formNovaTransacao");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const alunoId = document.getElementById("novaAluno").value;
      const tipo =
        document.getElementById("novaTipoTransacao").value || "entrada";
      const alunoObj = listaAlunosParaNova.find((a) => a.id === alunoId);
      const curso =
        document.getElementById("novaCurso").value.trim() || "Geral";
      const valor = parseFloat(document.getElementById("novaValor").value) || 0;
      const status = document.getElementById("novaStatus").value;
      const forma = document.getElementById("novaForma").value;
      const dataPagamento = document.getElementById("novaData").value;
      const observacoes = document.getElementById("novaObs").value.trim();

      // Validações
      if (!alunoId) {
        mostrarErro("Selecione um aluno.");
        return;
      }
      if (valor <= 0) {
        mostrarErro("Informe um valor maior que zero.");
        return;
      }

      // 📋 Confirmação antes de criar (padrão das outras ações do Financeiro)
      const tipoLabel =
        tipo === "saida" ? "Saída de Caixa" : "Entrada (Receita)";
      const valorFormatado = valor.toFixed(2).replace(".", ",");

      pedirConfirmacao({
        tipo: "info",
        titulo: "Confirmar Nova Transação?",
        mensagem:
          `Deseja criar esta transação?\n\n` +
          `• Aluno: ${alunoObj?.nome || "Aluno"}\n` +
          `• Tipo: ${tipoLabel}\n` +
          `• Curso: ${curso}\n` +
          `• Valor: R$ ${valorFormatado}\n` +
          `• Status: ${status}\n` +
          `• Forma: ${forma}`,
        textoBotao: "Criar Transação",
        corBotao: "btn-primary",
        onConfirmar: async () => {
          const btn = form.querySelector('button[type="submit"]');
          const txtOriginal = btn ? btn.innerHTML : "";
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Criando...`;
          }

          try {
            await criarTransacaoFinanceira({
              alunoId,
              tipo,
              alunoNome: alunoObj?.nome || "Aluno",
              curso,
              valor,
              status,
              formaPagamento: forma,
              dataPagamento,
              observacoes,
            });

            if (modalNovaTransacaoInstance) modalNovaTransacaoInstance.hide();
            mostrarSucesso("Transação criada com sucesso!");
          } catch (err) {
            console.error("Erro ao criar transação:", err);
            mostrarErro("Erro ao criar: " + err.message);
          } finally {
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = txtOriginal;
            }
          }
        },
      });
    });
  }
});

async function carregarAlunosParaNova() {
    const select = document.getElementById("novaAluno");
    if (!select) return;

    if (listaAlunosParaNova.length > 0) {
        preencherSelectAlunos();
        return;
    }

    select.innerHTML = `<option value="">Carregando...</option>`;

  // Se já carregou, não recarrega
  if (listaAlunosParaNova.length > 0) {
    preencherSelectAlunos();
    return;
  }

  select.innerHTML = `<option value="">Carregando...</option>`;

  try {
    const { getDocs, collection } =
      await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");
    const { db } = await import("../firebase-config.js");

    const snap = await getDocs(collection(db, "alunos"));

    listaAlunosParaNova = [];
    mapaAlunosParaNova = {};

    snap.forEach((d) => {
      const data = d.data();
      if (data.excluido === true) return;

        listaAlunosParaNova.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

        await Promise.all(listaAlunosParaNova.map(async (aluno) => {
            try {
                const { collectionGroup, query, where, getDocs: gd } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");
                const { db: dbRef } = await import("../firebase-config.js");

                const matRef = collection(dbRef, "alunos", aluno.id, "matriculas");
                const matSnap = await gd(matRef);

                if (!matSnap.empty) {
                    const primeira = matSnap.docs[0].data();
                    mapaAlunosParaNova[aluno.id] = primeira.curso_nome || "Geral";
                }
            } catch (e) {
                // ignora
            }
        }));

        preencherSelectAlunos();

    // Ordena por nome
    listaAlunosParaNova.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    // Busca cursos em paralelo
    await Promise.all(
      listaAlunosParaNova.map(async (aluno) => {
        try {
          const {
            collectionGroup,
            query,
            where,
            getDocs: gd,
          } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");
          const { db: dbRef } = await import("../firebase-config.js");

          // Busca matrículas desse aluno
          const matRef = collection(dbRef, "alunos", aluno.id, "matriculas");
          const matSnap = await gd(matRef);

          if (!matSnap.empty) {
            const primeira = matSnap.docs[0].data();
            mapaAlunosParaNova[aluno.id] = primeira.curso_nome || "Geral";
          }
        } catch (e) {
          // ignora
        }
      }),
    );

    preencherSelectAlunos();
  } catch (err) {
    console.error("Erro ao carregar alunos:", err);
    select.innerHTML = `<option value="">Erro ao carregar alunos</option>`;
  }
}

function preencherSelectAlunos() {
  const select = document.getElementById("novaAluno");
  if (!select) return;

  let html = '<option value="">Selecione um aluno...</option>';
  listaAlunosParaNova.forEach((aluno) => {
    html += `<option value="${aluno.id}">${aluno.nome}</option>`;
  });

  select.innerHTML = html;
}
