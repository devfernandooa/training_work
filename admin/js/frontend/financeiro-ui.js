/**
 * =========================================================================
 * TRAINING WORK — UI FINANCEIRO (financeiro-ui.js)
 * =========================================================================
 */

import { criarTransacaoFinanceira } from "../backend/financeiro-service.js";
import {
    escutarFinanceiro,
    atualizarStatusFinanceiro,
    editarTransacaoFinanceira,
    excluirTransacaoFinanceira
} from "../backend/financeiro-service.js";
import { renderizarTimelineAuditoria } from "../modules/auditoria-timeline.js";

let toastSucessoInstance = null;
let modalEdicaoInstance = null;
let modalNovaTransacaoInstance = null;

let listaCompleta = [];
let paginaAtual = 1;
let itensPorPagina = 20;
let termoBusca = "";
let filtroStatus = "todos";
let filtroForma = "todas";
let graficoFluxoInstance = null;
let graficoFormasInstance = null;
let timerBusca = null;

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ==========================================
// CONFIRMAÇÃO VIA SWEETALERT2
// ==========================================
async function pedirConfirmacao(opcoes) {
    const iconesSwal = {
        "warning": "warning",
        "success": "success",
        "danger": "error",
        "info": "info",
    };
    
    const tipoSwal = iconesSwal[opcoes.tipo] || "question";
    const htmlMensagem = (opcoes.mensagem || "Tem certeza?").replace(/\n/g, "<br>");

    const result = await Swal.fire({
        icon: tipoSwal,
        title: opcoes.titulo || "Confirmação",
        html: `<div style="text-align: left; font-size: 0.95rem; color: #475569;">${htmlMensagem}</div>`,
        showCancelButton: true,
        confirmButtonText: opcoes.textoBotao || "Confirmar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: opcoes.corBotao === "btn-danger" ? "#dc2626" : "#0d6efd",
        cancelButtonColor: "#e2e8f0",
        customClass: {
            cancelButton: 'text-dark fw-semibold'
        },
        reverseButtons: true
    });

    if (result.isConfirmed && typeof opcoes.onConfirmar === "function") {
        await opcoes.onConfirmar();
    }
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

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 [financeiro-ui] Inicializando...");

    const modalEl = document.getElementById("modalEditarFinanceiro");
    if (modalEl && window.bootstrap) {
        modalEdicaoInstance = new bootstrap.Modal(modalEl);
    }

    const modalNovaEl = document.getElementById("modalNovaTransacao");
    if (modalNovaEl && window.bootstrap) {
        modalNovaTransacaoInstance = new bootstrap.Modal(modalNovaEl);
    }

    configurarFiltros();
    configurarFormularioEdicao();
    configurarEventosTabela();
    configurarNovaTransacao();

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
    let recebido = 0, pendente = 0, aguardando = 0, saidas = 0;

    listaCompleta.forEach(t => {
        const v = Number(t.valor || 0);
        if (t.tipo === "saida") {
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
    set("financeiro-total-saidas", saidas);
}

function renderizarGraficos() {
    let recebido = 0, pendente = 0, aguardando = 0;
    const formas = { "Pix": 0, "Cartão de Crédito": 0, "Boleto Bancário": 0, "À Vista": 0 };

    listaCompleta.forEach((t) => {
        const v = Number(t.valor || 0);
        if (t.status === "Recebido") recebido += v;
        else if (t.status === "Pendente") pendente += v;
        else aguardando += v;

        if (formas[t.formaPagamento] !== undefined) formas[t.formaPagamento] += v;
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
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
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
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } } }
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
            <td data-label="Data">${dataFmt}</td>
            <td data-label="Tipo">${tipoBadge}</td>
            <td data-label="Aluno"><strong>${t.alunoNome || "—"}</strong></td>
            <td data-label="Curso">${t.curso || "—"}</td>
            <td data-label="Forma"><span class="badge bg-light text-dark border">${t.formaPagamento}</span></td>
            <td data-label="Valor">${valorHtml}</td>
            <td data-label="Status"><span class="badge rounded-pill ${badgeClass} px-3 py-2">${t.status}</span></td>
            <td class="text-end">
                <div class="d-flex justify-content-end gap-1">
                    <button class="btn btn-sm btn-outline-success px-2 py-1 btn-validar-pagamento" data-id="${t.id}" title="Marcar como Recebido"><i class="fas fa-check"></i></button>
                    <button class="btn btn-sm btn-outline-primary px-2 py-1 btn-editar-financeiro" data-id="${t.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger px-2 py-1 btn-excluir-financeiro" data-id="${t.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function renderizarContador(total, inicio, fim) {
    const el = document.getElementById("contador-transacoes");
    if (!el) return;
    if (total === 0) { el.textContent = "Nenhuma transação encontrada"; return; }
    el.textContent = `Mostrando ${inicio + 1}-${Math.min(fim, total)} de ${total} transações`;
}

function renderizarPaginacao(totalPaginas) {
    const ul = document.getElementById("paginacao-financeiro");
    if (!ul) return;

    if (totalPaginas <= 1) { ul.innerHTML = ""; return; }
    let html = "";

    html += `<li class="page-item ${paginaAtual === 1 ? "disabled" : ""}"><a class="page-link" href="#" data-page="${paginaAtual - 1}"><i class="fas fa-chevron-left"></i></a></li>`;
    const paginas = calcularPaginasVisiveis(paginaAtual, totalPaginas);
    paginas.forEach((p) => {
        if (p === "...") {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        } else {
            html += `<li class="page-item ${p === paginaAtual ? "active" : ""}"><a class="page-link" href="#" data-page="${p}">${p}</a></li>`;
        }
    });
    html += `<li class="page-item ${paginaAtual === totalPaginas ? "disabled" : ""}"><a class="page-link" href="#" data-page="${paginaAtual + 1}"><i class="fas fa-chevron-right"></i></a></li>`;

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
                tipo: "success",
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
                tipo: "danger",
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
            mensagem: `Deseja realmente guardar as alterações desta transação?\n\n• Aluno: ${alunoNome}\n• Valor final: R$ ${valorFinal.toFixed(2).replace(".", ",")}\n• Status: ${status}\n• Forma: ${forma}`,
            textoBotao: "Salvar Alterações",
            onConfirmar: async () => {
                const btn = form.querySelector('button[type="submit"]');
                if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Salvando...'; }

                try {
                    await editarTransacaoFinanceira(id, { tipo, alunoNome, valor: valorFinal, status, formaPagamento: forma, observacoes: obs });
                    if (modalEdicaoInstance) modalEdicaoInstance.hide();
                    mostrarSucesso("Transação atualizada com sucesso!");
                } catch (err) {
                    mostrarErro("Erro ao guardar: " + err.message);
                } finally {
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i> Salvar'; }
                }
            }
        });
    });
}

/* ==========================================================================
 * MODAL DE NOVA TRANSAÇÃO
 * ========================================================================== */
let listaAlunosParaNova = [];
let mapaAlunosParaNova = {};

function configurarNovaTransacao() {
    const btnNova = document.getElementById("btnNovaTransacao");
    if (btnNova) {
        btnNova.addEventListener("click", async (e) => {
            e.preventDefault();
            if (modalNovaTransacaoInstance) modalNovaTransacaoInstance.show();
            await carregarAlunosParaNova(); 
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
            const tipo = document.getElementById("novaTipoTransacao").value || "entrada"; 
            const alunoObj = listaAlunosParaNova.find(a => a.id === alunoId);
            const curso = document.getElementById("novaCurso").value.trim() || "Geral";
            const valor = parseFloat(document.getElementById("novaValor").value) || 0;
            const status = document.getElementById("novaStatus").value;
            const forma = document.getElementById("novaForma").value;
            const dataPagamento = document.getElementById("novaData").value;
            const observacoes = document.getElementById("novaObs").value.trim();

            if (!alunoId) { mostrarErro("Selecione um aluno."); return; }
            if (valor <= 0) { mostrarErro("Informe um valor maior que zero."); return; }

            const btn = form.querySelector('button[type="submit"]');
            const txtOriginal = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Criando...`;

            try {
                await criarTransacaoFinanceira({
                    alunoId, tipo, alunoNome: alunoObj?.nome || "Aluno", curso, valor, status, formaPagamento: forma, dataPagamento, observacoes
                });

                if (modalNovaTransacaoInstance) modalNovaTransacaoInstance.hide();
                form.reset();
                mostrarSucesso("Transação criada com sucesso!");

            } catch (err) {
                console.error("Erro ao criar transação:", err);
                mostrarErro("Erro ao criar: " + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = txtOriginal;
            }
        });
    }
}

async function carregarAlunosParaNova() {
    const select = document.getElementById("novaAluno");
    if (!select) return;
    if (listaAlunosParaNova.length > 0) { preencherSelectAlunos(); return; }

    select.innerHTML = `<option value="">Carregando alunos...</option>`;

    try {
        const { getDocs, collection } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");
        const { db } = await import("../firebase-config.js");

        const snap = await getDocs(collection(db, "alunos"));

        listaAlunosParaNova = [];
        mapaAlunosParaNova = {};

        snap.forEach(d => {
            const data = d.data();
            if (data.excluido === true) return;
            listaAlunosParaNova.push({
                id: d.id,
                nome: data.nome || data.nome_completo || "Aluno sem nome",
                email: data.email || ""
            });
        });

        listaAlunosParaNova.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

        await Promise.all(listaAlunosParaNova.map(async (aluno) => {
            try {
                const { collection, getDocs: gd } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");
                const { db: dbRef } = await import("../firebase-config.js");
                const matSnap = await gd(collection(dbRef, "alunos", aluno.id, "matriculas"));
                if (!matSnap.empty) {
                    mapaAlunosParaNova[aluno.id] = matSnap.docs[0].data().curso_nome || "Geral";
                }
            } catch (e) { console.warn("Erro matrícula", aluno.id); }
        }));

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
    listaAlunosParaNova.forEach(aluno => {
        html += `<option value="${aluno.id}">${aluno.nome}</option>`;
    });

    select.innerHTML = html;
}