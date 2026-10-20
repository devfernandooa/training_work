// ==========================================================================
// TRAINING WORK - FRONTEND UI: MATRÍCULAS (M2 Refatorado e Polido)
// ==========================================================================

import { 
    listarMatriculasService, 
    obterAlunosParaMatriculaService, 
    obterTurmasParaMatriculaService,
    criarMatriculaService,
    atualizarMatriculaService,
    excluirMatriculaService,
    restaurarMatriculaService
} from "../backend/matriculas-service.js";
import { renderizarTimelineAuditoria } from "../modules/auditoria-timeline.js";

let alunosCache = [];
let turmasCache = [];
let matriculasCache = [];
let matriculaEmEdicaoId = null;
let turmaDaMatriculaEmEdicao = null;
let mostrarExcluidos = false;
let modalEdicaoInstance = null;
let modalConfirmacaoInstance = null;
let matriculaParaExcluir = null;

let paginaAtual = 1;
let itensPorPagina = 10;

// ==========================================================================
// LISTAGEM E PAGINAÇÃO
// ==========================================================================
export async function renderizarTabelaMatriculas() {
    const tbody = document.getElementById("tabela-matriculas-tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary me-2"></div>A carregar matrículas...</td></tr>`;

    try {
        matriculasCache = await listarMatriculasService({ incluirExcluidos: mostrarExcluidos });

        const termo = (document.getElementById("busca-matricula")?.value || "").toLowerCase().trim();
        let filtradas = matriculasCache;

        if (termo) {
            filtradas = filtradas.filter(m => 
                (m.aluno_nome || "").toLowerCase().includes(termo) || 
                (m.turma_nome || "").toLowerCase().includes(termo)
            );
        }

        const totalPaginas = Math.max(1, Math.ceil(filtradas.length / itensPorPagina));
        if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
        
        const inicio = (paginaAtual - 1) * itensPorPagina;
        const fim = inicio + itensPorPagina;
        const pagina = filtradas.slice(inicio, fim);

        if (pagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma matrícula encontrada.</td></tr>`;
            renderizarPaginacao(0);
            return;
        }

        let htmlRows = "";
        pagina.forEach(mat => {
            const statusLower = String(mat.status).toLowerCase();
            const isConfirmado = statusLower.includes("confirmad") || statusLower.includes("pago") || statusLower.includes("recebido");
            const isExcluido = mat.excluido;

            let statusBadgeClass = "bg-success";
            if (statusLower.includes("pendente")) statusBadgeClass = "bg-warning text-dark";
            if (isExcluido) statusBadgeClass = "bg-secondary";

            const valorFormatado = Number(mat.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

            const pillViculoHtml = isExcluido 
                ? `<span class="badge bg-danger bg-opacity-10 text-danger ms-2">Excluído</span>`
                : (isConfirmado 
                    ? '<span class="badge bg-success bg-opacity-10 text-success ms-2"><i class="fas fa-check-circle me-1"></i>Vinculado</span>'
                    : '<span class="badge bg-warning bg-opacity-10 text-warning ms-2"><i class="fas fa-exclamation-circle me-1"></i>Pendente</span>');

            const acoes = isExcluido
                ? `<button class="btn btn-sm btn-outline-success rounded-circle btn-restaurar-matricula" data-id="${mat.id}" data-turma-id="${mat.turmaId}" title="Restaurar"><i class="fas fa-recycle"></i></button>`
                : `
                    <button class="btn btn-sm btn-outline-primary rounded-circle me-1 btn-editar-matricula" data-id="${mat.id}" data-turma-id="${mat.turmaId}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle btn-excluir-matricula" data-id="${mat.id}" data-turma-id="${mat.turmaId}" title="Excluir">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;

            htmlRows += `
                <tr ${isExcluido ? 'style="opacity: 0.6;"' : ''}>
                    <td><div class="fw-bold text-dark">${mat.aluno_nome}</div><small class="text-muted">ID: ${mat.aluno_id}</small></td>
                    <td><div class="d-flex align-items-center flex-wrap"><span>${mat.turma_nome}</span>${pillViculoHtml}</div></td>
                    <td class="fw-bold text-secondary">${valorFormatado}</td>
                    <td><span class="badge bg-light text-dark border">${mat.forma_pagamento}</span></td>
                    <td><span class="badge ${statusBadgeClass} px-3 py-2 rounded-pill text-capitalize">${isExcluido ? 'Excluída' : mat.status}</span></td>
                    <td class="text-end">${acoes}</td>
                </tr>
            `;
        });

        tbody.innerHTML = htmlRows;
        renderizarPaginacao(totalPaginas);
        configurarAcoesTabela();

    } catch (error) {
        console.error("Erro ao renderizar matrículas:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Erro ao carregar matrículas.</td></tr>`;
    }
}

function renderizarPaginacao(totalPaginas) {
    const ul = document.getElementById("paginacao-matriculas");
    if (!ul) return;

    if (totalPaginas <= 1) { ul.innerHTML = ""; return; }

    let html = `<li class="page-item ${paginaAtual === 1 ? "disabled" : ""}"><a class="page-link" href="#" data-page="${paginaAtual - 1}"><i class="fas fa-chevron-left"></i></a></li>`;
    
    for (let i = 1; i <= totalPaginas; i++) {
        html += `<li class="page-item ${i === paginaAtual ? "active" : ""}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    
    html += `<li class="page-item ${paginaAtual === totalPaginas ? "disabled" : ""}"><a class="page-link" href="#" data-page="${paginaAtual + 1}"><i class="fas fa-chevron-right"></i></a></li>`;
    
    ul.innerHTML = html;
    ul.querySelectorAll("a.page-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const p = parseInt(link.getAttribute("data-page"), 10);
            if (p >= 1 && p <= totalPaginas && p !== paginaAtual) {
                paginaAtual = p;
                renderizarTabelaMatriculas();
            }
        });
    });
}

// ==========================================================================
// AÇÕES DA TABELA
// ==========================================================================
function configurarAcoesTabela() {
    document.querySelectorAll(".btn-editar-matricula").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            const turmaId = e.currentTarget.getAttribute("data-turma-id");
            await abrirModalEdicao(id, turmaId);
        });
    });

    document.querySelectorAll(".btn-excluir-matricula").forEach(btn => {
        btn.addEventListener("click", (e) => {
            matriculaParaExcluir = {
                id: e.currentTarget.getAttribute("data-id"),
                turmaId: e.currentTarget.getAttribute("data-turma-id")
            };
            if (modalConfirmacaoInstance) modalConfirmacaoInstance.show();
        });
    });

    document.querySelectorAll(".btn-restaurar-matricula").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            const turmaId = e.currentTarget.getAttribute("data-turma-id");
            if (confirm("Deseja restaurar esta matrícula?")) {
                await restaurarMatriculaService(id, turmaId);
                renderizarTabelaMatriculas();
            }
        });
    });
}

// ==========================================================================
// MODAL DE EDIÇÃO
// ==========================================================================
async function abrirModalEdicao(id, turmaId) {
    if (turmasCache.length === 0 || alunosCache.length === 0) {
        await carregarOpcoesFormulario();
    }

    const mat = matriculasCache.find(m => m.id === id);
    if (!mat) return;

    matriculaEmEdicaoId = id;
    turmaDaMatriculaEmEdicao = turmaId;

    const selectAluno = document.getElementById("selectAlunoMatricula");
    const selectTurma = document.getElementById("selectTurmaMatricula");
    const inputValor = document.getElementById("valorMatricula");
    const selectPagamento = document.getElementById("formaPagamentoMatricula");
    const selectStatus = document.getElementById("statusMatricula");
    const btnLiberar = document.getElementById("btnLiberarEdicao");
    const alerta = document.getElementById("alertaInconsistencia");

    if (alerta) alerta.classList.add("d-none");

    selectAluno.value = mat.aluno_id;
    selectAluno.disabled = true;
    document.getElementById("infoAlunoCpf").textContent = alunosCache.find(a => a.id === mat.aluno_id)?.cpf || "Não informado";
    document.getElementById("infoAlunoEmail").textContent = alunosCache.find(a => a.id === mat.aluno_id)?.email || "Não informado";
    document.getElementById("cardInfoAluno").classList.remove("d-none");

    selectTurma.value = turmaId;
    selectTurma.disabled = true; // Bloqueia troca de turma na edição

    inputValor.value = mat.valor;

    if (String(mat.forma_pagamento).toLowerCase().includes("pix")) selectPagamento.value = "PIX";
    else if (String(mat.forma_pagamento).toLowerCase().includes("crédito")) selectPagamento.value = "Cartão de Crédito";
    else if (String(mat.forma_pagamento).toLowerCase().includes("boleto")) selectPagamento.value = "Boleto";
    else selectPagamento.value = "Dinheiro";

    selectStatus.value = mat.status === "Matriculado" ? "Confirmado" : mat.status;

    if (btnLiberar) {
        btnLiberar.classList.remove("d-none");
        btnLiberar.onclick = () => {
            inputValor.readOnly = false;
            selectPagamento.disabled = false;
            selectStatus.disabled = false;
            btnLiberar.classList.add("d-none");
            if (alerta) alerta.classList.remove("d-none");
        };
    }

    document.getElementById("formSalvarMatricula").reset();
    document.getElementById("selectAlunoMatricula").value = mat.aluno_id;
    document.getElementById("selectTurmaMatricula").value = turmaId;
    document.getElementById("valorMatricula").value = mat.valor;
    document.getElementById("formaPagamentoMatricula").value = selectPagamento.value;
    document.getElementById("statusMatricula").value = selectStatus.value;

    const modalTitle = document.querySelector("#modalNovaMatricula .modal-title");
    if (modalTitle) modalTitle.innerHTML = `<i class="fas fa-edit text-primary me-2"></i>Editar Matrícula`;

    await renderizarTimelineAuditoria({
        colecao: "turmas",
        docId: turmaId,
        containerId: "matriculaAuditoriaContainer"
    });

    if (modalEdicaoInstance) modalEdicaoInstance.show();
}

// ==========================================================================
// CARREGAR OPÇÕES DE FORMULÁRIO
// ==========================================================================
async function carregarOpcoesFormulario() {
    const selectAluno = document.getElementById("selectAlunoMatricula");
    const selectTurma = document.getElementById("selectTurmaMatricula");
    if (!selectAluno || !selectTurma) return;

    alunosCache = await obterAlunosParaMatriculaService();
    turmasCache = await obterTurmasParaMatriculaService();

    let alunoOptions = '<option value="">Selecione o aluno...</option>';
    alunosCache.forEach(a => alunoOptions += `<option value="${a.id}">${a.nome} (${a.cpf})</option>`);
    selectAluno.innerHTML = alunoOptions;

    let turmaOptions = '<option value="">Selecione a turma/curso...</option>';
    turmasCache.forEach(t => turmaOptions += `<option value="${t.id}">${t.nome_turma}</option>`);
    selectTurma.innerHTML = turmaOptions;

    selectTurma.addEventListener("change", (e) => {
        const inputValor = document.getElementById("valorMatricula");
        const turmaSelecionada = turmasCache.find(t => t.id === e.target.value);
        if (turmaSelecionada && inputValor && !inputValor.readOnly) {
            inputValor.value = turmaSelecionada.valor;
        }
    });
}

// ==========================================================================
// SALVAR (COM CONFIRMAÇÃO E DUPLICIDADE)
// ==========================================================================
async function salvarComConfirmacao(e) {
    e.preventDefault();
    const alunoId = document.getElementById("selectAlunoMatricula").value;
    const turmaId = document.getElementById("selectTurmaMatricula").value;
    const formaPagamento = document.getElementById("formaPagamentoMatricula").value;
    const status = document.getElementById("statusMatricula").value;
    const valor = document.getElementById("valorMatricula").value;

    if (!turmaId || !alunoId) return alert("Selecione um aluno e uma turma.");

    const alunoObj = alunosCache.find(a => a.id === alunoId);
    const turmaObj = turmasCache.find(t => t.id === turmaId);

    const dados = {
        aluno_id: alunoId, aluno_nome: alunoObj?.nome || "", aluno_email: alunoObj?.email || "",
        turma_id: turmaId, turma_nome: turmaObj?.nome_turma || "",
        valor, forma_pagamento: formaPagamento, status
    };

    let textoConf = matriculaEmEdicaoId 
        ? "Deseja confirmar as alterações nesta matrícula?\n\nO Financeiro não será alterado automaticamente."
        : "Confirmar nova matrícula?";
    if (!confirm(textoConf)) return;

    try {
        if (matriculaEmEdicaoId) {
            await atualizarMatriculaService(matriculaEmEdicaoId, turmaDaMatriculaEmEdicao, dados);
        } else {
            await criarMatriculaService(dados);
        }

        if (modalEdicaoInstance) modalEdicaoInstance.hide();
        document.getElementById("formSalvarMatricula").reset();
        renderizarTabelaMatriculas();

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert(error.message || "Não foi possível salvar.");
    }
}

// ==========================================================================
// INIT
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const modalEl = document.getElementById("modalNovaMatricula");
    if (modalEl && window.bootstrap) {
        modalEdicaoInstance = new bootstrap.Modal(modalEl);
    }

    const modalConfEl = document.getElementById("modalConfirmacaoExclusaoMatricula");
    if (modalConfEl && window.bootstrap) {
        modalConfirmacaoInstance = new bootstrap.Modal(modalConfEl);
    }

    document.getElementById("btnConfirmarExclusaoMatricula")?.addEventListener("click", async () => {
        if (!matriculaParaExcluir) return;
        await excluirMatriculaService(matriculaParaExcluir.id, matriculaParaExcluir.turmaId);
        if (modalConfirmacaoInstance) modalConfirmacaoInstance.hide();
        renderizarTabelaMatriculas();
        matriculaParaExcluir = null;
    });

    renderizarTabelaMatriculas();
    carregarOpcoesFormulario();

    document.getElementById("busca-matricula")?.addEventListener("input", () => {
        paginaAtual = 1;
        renderizarTabelaMatriculas();
    });

    document.getElementById("btn-alternar-excluidos")?.addEventListener("click", (e) => {
        mostrarExcluidos = !mostrarExcluidos;
        const btn = e.currentTarget;
        btn.innerHTML = mostrarExcluidos ? `<i class="fas fa-users me-1"></i> Ver Ativos` : `<i class="fas fa-trash-alt me-1"></i> Mostrar Excluídos`;
        paginaAtual = 1;
        renderizarTabelaMatriculas();
    });

    document.getElementById("btnNovaMatricula")?.addEventListener("click", async () => {
        matriculaEmEdicaoId = null;
        turmaDaMatriculaEmEdicao = null;
        document.getElementById("formSalvarMatricula").reset();
        document.getElementById("selectAlunoMatricula").disabled = false;
        document.getElementById("selectTurmaMatricula").disabled = false;
        document.getElementById("valorMatricula").readOnly = false;
        document.getElementById("formaPagamentoMatricula").disabled = false;
        document.getElementById("statusMatricula").disabled = false;
        document.getElementById("cardInfoAluno").classList.add("d-none");
        document.getElementById("btnLiberarEdicao").classList.add("d-none");
        document.getElementById("alertaInconsistencia").classList.add("d-none");
        
        if (turmasCache.length === 0) await carregarOpcoesFormulario();
        
        document.querySelector("#modalNovaMatricula .modal-title").innerHTML = `<i class="fas fa-user-plus text-primary me-2"></i>Nova Matrícula`;
        const containerAud = document.getElementById("matriculaAuditoriaContainer");
        if (containerAud) containerAud.innerHTML = `<div class="text-center py-3 text-muted small"><i class="fas fa-history me-1"></i>Nenhuma alteração registrada ainda.</div>`;
    });

    document.getElementById("formSalvarMatricula")?.addEventListener("submit", salvarComConfirmacao);
});