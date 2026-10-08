// ==========================================================================
// TRAINING WORK - FRONTEND UI: CATÁLOGO DE CURSOS & TREINAMENTOS
// ==========================================================================

import { auth } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
    escutarCursosService,
    obterCursoPorIdService,
    salvarCursoService,
    inativarCursoService
} from "../backend/cursos-service.js";

let listaCursos = [];
let cursoIdParaExcluir = null;
let cursoModalInstance = null;

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    escutarCursosService((cursos) => {
        listaCursos = cursos;
        atualizarMetricas(listaCursos);
        renderizarTabelaCursos(listaCursos);
    });
});

/**
 * Atualiza os indicadores quantitativos no painel superior.
 */
function atualizarMetricas(cursos) {
    const total = cursos.length;
    let turmasAbertas = 0;
    let ativos = 0;

    cursos.forEach(c => {
        const status = (c.status || "").toLowerCase();
        if (status === "turma aberta") turmasAbertas++;
        if (status === "ativo" || status === "em andamento") ativos++;
    });

    const elTotal = document.getElementById("metric-total-cursos");
    const elTurmas = document.getElementById("metric-turmas-abertas");
    const elAtivos = document.getElementById("metric-ativos");

    if (elTotal) elTotal.textContent = total;
    if (elTurmas) elTurmas.textContent = turmasAbertas;
    if (elAtivos) elAtivos.textContent = ativos;
}

function capitalizarPrimeiraLetra(string) {
    if (!string) return "Ativo";
    const str = string.toLowerCase();
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Renderiza as visões desktop (tabela) e mobile (cards) com base nos dados filtrados.
 */
function renderizarTabelaCursos(cursos) {
    const tbody = document.getElementById("cursos-tbody");
    const mobileContainer = document.getElementById("cursos-mobile-container");
    const inputBusca = document.getElementById("busca-curso");
    const termoBusca = inputBusca ? inputBusca.value.toLowerCase() : "";

    if (!tbody) return;

    const filtrados = cursos.filter(c => {
        const nome = (c.nome || "").toLowerCase();
        const codigo = (c.codigo || c.codigo_curso || "").toLowerCase();
        return nome.includes(termoBusca) || codigo.includes(termoBusca);
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhum curso encontrado.</td></tr>`;
        if (mobileContainer) {
            mobileContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhum curso encontrado.</div>`;
        }
        return;
    }

    let htmlDesktop = "";
    let htmlMobile = "";

    filtrados.forEach((curso, index) => {
        const codCurso = curso.codigo_curso || curso.codigo || '-';
        const codLimpo = codCurso.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const anoAtual = new Date().getFullYear();

        let numeroTurma = curso.codigo_turma || curso.numero_turma || "";
        if (!numeroTurma || numeroTurma.startsWith("TR-2026-") || numeroTurma === codCurso) {
            const seq = String(index + 1).padStart(3, '0');
            numeroTurma = `TR-${codLimpo}-${anoAtual}/${seq}`;
        }

        const statusBruto = (curso.status || "Ativo").toLowerCase();
        const statusLabel = capitalizarPrimeiraLetra(curso.status || "Ativo");

        let statusStyle = "border: 1px solid #22c55e; color: #15803d; background: #f0fdf4;";
        if (statusBruto === "em andamento") {
            statusStyle = "border: 1px solid #3b82f6; color: #1d4ed8; background: #eff6ff;";
        } else if (statusBruto === "turma aberta") {
            statusStyle = "border: 1px solid #10b981; color: #047857; background: #ecfdf5;";
        } else if (statusBruto === "finalizado") {
            statusStyle = "border: 1px solid #94a3b8; color: #475569; background: #f1f5f9;";
        } else if (statusBruto === "turma lotada") {
            statusStyle = "border: 1px solid #f97316; color: #c2410c; background: #fff7ed;";
        }

        const statusPill = `<span class="px-3 py-1 rounded-pill d-inline-flex align-items-center gap-1" style="${statusStyle} font-size: 0.82rem; font-weight: 500;">${statusLabel}</span>`;

        const acoesBotoes = `
            <div style="display: inline-flex; gap: 0.4rem; justify-content: center;">
                <button data-id="${curso.id}" class="btn-icon btn-icon-edit btn-editar-curso" title="Editar Curso">
                    <i class="fas fa-pen"></i>
                </button>
                <button data-id="${curso.id}" class="btn-icon btn-icon-delete btn-excluir-curso" title="Inativar Curso">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        htmlDesktop += `
            <tr>
                <td>
                    <span class="fw-bold text-dark">${numeroTurma}</span><br>
                    <small class="badge bg-light text-muted border font-monospace mt-1">${codCurso}</small>
                </td>
                <td>
                    <strong>${curso.nome || "Não informado"}</strong><br>
                    <small class="text-muted">${curso.instrutor || "A definir"}</small>
                </td>
                <td>${curso.carga || "0"} horas</td>
                <td>R$ ${Number(curso.valor || 0).toFixed(2)}</td>
                <td>${curso.modalidade || "Presencial"}</td>
                <td>
                    <span class="fw-semibold text-dark">${curso.vagasDisponiveis ?? '-'}</span> 
                    <small class="text-muted">/ ${curso.vagasTotal ?? '-'}</small>
                </td>
                <td>${statusPill}</td>
                <td style="text-align: right;">${acoesBotoes}</td>
            </tr>
        `;

        htmlMobile += `
            <div class="card bg-white border-0 shadow-sm p-3 mb-3 rounded-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <span class="badge bg-secondary mb-1">${numeroTurma}</span>
                        <h6 class="fw-bold mb-0">${curso.nome || "Não informado"}</h6>
                        <small class="text-muted">${curso.instrutor || "A definir"}</small>
                    </div>
                    <div>${statusPill}</div>
                </div>
                <div class="small text-muted mb-2">
                    <div><strong>Carga:</strong> ${curso.carga || "0"}h | <strong>Valor:</strong> R$ ${Number(curso.valor || 0).toFixed(2)}</div>
                    <div><strong>Vagas Disponíveis:</strong> <span class="text-dark fw-bold">${curso.vagasDisponiveis ?? '-'}</span> de ${curso.vagasTotal ?? '-'}</div>
                </div>
                <div class="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
                    <small class="text-muted font-monospace">${codCurso}</small>
                    <div>${acoesBotoes}</div>
                </div>
            </div>
        `;
    });

    tbody.innerHTML = htmlDesktop;
    if (mobileContainer) mobileContainer.innerHTML = htmlMobile;

    configurarAcoesTabela();
}

/**
 * Atribui os event listeners aos elementos dinâmicos da tabela.
 */
function configurarAcoesTabela() {
    document.querySelectorAll(".btn-editar-curso").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            abrirModalEditarCurso(id);
        });
    });

    document.querySelectorAll(".btn-excluir-curso").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            iniciarExclusaoCurso(id);
        });
    });
}

/**
 * Carrega a entidade do curso e popula o formulário para edição.
 */
async function abrirModalEditarCurso(id) {
    try {
        const data = await obterCursoPorIdService(id);
        if (!data) return;

        const setVal = (elementId, val) => {
            const el = document.getElementById(elementId);
            if (el) el.value = val !== undefined && val !== null ? val : "";
        };

        const codigoCursoBase = data.codigo_curso || data.codigo || "";
        const codLimpo = codigoCursoBase.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const anoAtual = new Date().getFullYear();

        setVal("codigoCurso", codigoCursoBase);

        let codigoTurmaCalculado = data.codigo_turma || data.numero_turma || "";
        if (!codigoTurmaCalculado || codigoTurmaCalculado === codigoCursoBase || codigoTurmaCalculado.startsWith("TR-2026-")) {
            codigoTurmaCalculado = `TR-${codLimpo}-${anoAtual}/001`;
        }

        setVal("codigoTurma", codigoTurmaCalculado);
        setVal("codigoCursoBase", codigoTurmaCalculado);

        setVal("nomeCurso", data.nome);
        setVal("cargaCurso", data.carga);
        setVal("valorCurso", data.valor);
        setVal("modalidadeCurso", data.modalidade || "Presencial");
        setVal("statusCurso", data.status || "Ativo");
        setVal("secaoExibicao", data.secaoExibicao || "grade");
        setVal("vagasTotal", data.vagasTotal);
        setVal("vagasDisponiveis", data.vagasDisponiveis);
        setVal("instrutorCurso", data.instrutor);
        setVal("descricaoCurso", data.descricao);
        setVal("ementaCurso", data.ementa);

        const modalEl = document.getElementById("novoCursoModal");
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.show();

    } catch (err) {
        console.error("Erro ao carregar curso para edição:", err);
    }
}

function iniciarExclusaoCurso(id) {
    cursoIdParaExcluir = id;
    const modalEl = document.getElementById("modalConfirmarExclusaoCurso");
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.show();
    }
}

async function executarInativacaoCurso() {
    if (!cursoIdParaExcluir) return;

    try {
        await inativarCursoService(cursoIdParaExcluir);

        const modalEl = document.getElementById("modalConfirmarExclusaoCurso");
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        }
    } catch (err) {
        console.error("Erro ao inativar curso:", err);
        alert("Não foi possível inativar o curso.");
    } finally {
        cursoIdParaExcluir = null;
    }
}

/**
 * Processa a submissão do formulário de criação/edição de curso.
 */
async function salvarCursoHandler(e) {
    e.preventDefault();

    const inputId = document.getElementById("curso-id-oculto");
    const cursoId = inputId ? inputId.value : "";

    const getVal = (elementId) => {
        const el = document.getElementById(elementId);
        return el ? el.value : "";
    };

    const dadosCurso = {
        nome: getVal("nomeCurso"),
        codigo: getVal("codigoCurso"),
        codigo_curso: getVal("codigoCurso"),
        codigo_turma: getVal("codigoTurma") || getVal("codigoCursoBase"),
        carga: getVal("cargaCurso"),
        valor: Number(getVal("valorCurso") || 0),
        modalidade: getVal("modalidadeCurso"),
        status: getVal("statusCurso"),
        secaoExibicao: getVal("secaoExibicao") || "grade",
        vagasTotal: Number(getVal("vagasTotal") || 0),
        vagasDisponiveis: Number(getVal("vagasDisponiveis") || 0),
        instrutor: getVal("instrutorCurso"),
        descricao: getVal("descricaoCurso"),
        ementa: getVal("ementaCurso")
    };

    try {
        await salvarCursoService(dadosCurso, cursoId || null);

        const modalEl = document.getElementById("novoCursoModal");
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        }
    } catch (err) {
        console.error("Erro ao salvar curso:", err);
        alert(err.message || "Erro ao gravar dados do curso.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const modalCursoEl = document.getElementById("novoCursoModal");
    if (modalCursoEl && window.bootstrap) {
        cursoModalInstance = new bootstrap.Modal(modalCursoEl);
    }

    const btnConfirmarExcluir = document.getElementById("btn-confirmar-exclusao-curso");
    if (btnConfirmarExcluir) {
        btnConfirmarExcluir.addEventListener("click", executarInativacaoCurso);
    }

    const formCurso = document.getElementById("formNovoCurso");
    if (formCurso) {
        formCurso.addEventListener("submit", salvarCursoHandler);
    }

    const inputBusca = document.getElementById("busca-curso");
    if (inputBusca) {
        inputBusca.addEventListener("input", () => {
            renderizarTabelaCursos(listaCursos);
        });
    }

    const btnNovoCurso = document.getElementById("btn-novo-curso");
    if (btnNovoCurso) {
        btnNovoCurso.addEventListener("click", () => {
            if (formCurso) formCurso.reset();
            const inputId = document.getElementById("curso-id-oculto");
            if (inputId) inputId.value = "";
            const modalTitulo = document.getElementById("novoCursoModalLabel");
            if (modalTitulo) modalTitulo.textContent = "Novo Treinamento";
            const auditEl = document.getElementById("curso-atualizado-por");
            if (auditEl) auditEl.value = "Registro novo";

            if (cursoModalInstance) cursoModalInstance.show();
        });
    }
});