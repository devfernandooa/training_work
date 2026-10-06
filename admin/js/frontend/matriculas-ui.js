// ==========================================================================
// TRAINING WORK - FRONTEND UI: MATRÍCULAS (RENDERIZAÇÃO COM PILL VERDE)
// ==========================================================================

import { 
    listarMatriculasService, 
    obterAlunosParaMatriculaService, 
    obterTurmasParaMatriculaService,
    criarMatriculaService,
    atualizarMatriculaService,
    excluirMatriculaService
} from "../backend/matriculas-service.js";

let alunosCache = [];
let turmasCache = [];
let matriculasCache = [];
let matriculaEmEdicaoId = null;

export async function renderizarTabelaMatriculas() {
    const tbody = document.getElementById("tabela-matriculas-tbody");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-muted py-4">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                A carregar matrículas...
            </td>
        </tr>
    `;

    try {
        matriculasCache = await listarMatriculasService();

        if (matriculasCache.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma matrícula registrada.</td></tr>`;
            return;
        }

        let htmlRows = "";
        matriculasCache.forEach(mat => {
            const statusLower = String(mat.status).toLowerCase();
            const isConfirmado = statusLower.includes("confirmad") || statusLower.includes("pago") || statusLower.includes("recebido");
            
            let statusBadgeClass = "bg-success";
            if (statusLower.includes("pendente")) statusBadgeClass = "bg-warning text-dark";
            if (statusLower.includes("cancelad")) statusBadgeClass = "bg-danger";

            const valorFormatado = Number(mat.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

            // PILL VERDE SE VINCULADO E CONFIRMADO / VERMELHA SE PENDENTE OU SEM TURMA_ID
            const pillViculoHtml = (mat.turma_id && isConfirmado)
                ? '<span class="badge bg-success bg-opacity-10 text-success ms-2" style="font-size:0.7rem;"><i class="fas fa-check-circle me-1"></i>Vinculado</span>'
                : '<span class="badge bg-danger bg-opacity-10 text-danger ms-2" style="font-size:0.7rem;"><i class="fas fa-exclamation-circle me-1"></i>Sem Vincular</span>';

            htmlRows += `
                <tr>
                    <td>
                        <div class="fw-bold text-dark">${mat.aluno_nome}</div>
                        <small class="text-muted">ID: ${mat.aluno_id || 'N/A'}</small>
                    </td>
                    <td>
                        <div class="d-flex align-items-center flex-wrap">
                            <span class="text-dark">${mat.turma_nome}</span>
                            ${pillViculoHtml}
                        </div>
                    </td>
                    <td class="fw-bold text-secondary">${valorFormatado}</td>
                    <td>
                        <span class="badge bg-light text-dark border">${mat.forma_pagamento}</span>
                    </td>
                    <td>
                        <span class="badge ${statusBadgeClass} px-3 py-2 rounded-pill text-capitalize">
                            ${mat.status}
                        </span>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary rounded-circle me-1 btn-editar-matricula" data-id="${mat.id}" title="Editar / Vincular Turma">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger rounded-circle btn-excluir-matricula" data-id="${mat.id}" title="Excluir Matrícula">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = htmlRows;
        configurarAcoesTabela();

    } catch (error) {
        console.error("Erro ao renderizar matrículas:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Erro ao carregar matrículas.</td></tr>`;
    }
}

function configurarAcoesTabela() {
    document.querySelectorAll(".btn-editar-matricula").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            await abrirModalEdicao(id);
        });
    });

    document.querySelectorAll(".btn-excluir-matricula").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            if (confirm("Deseja realmente remover esta matrícula?")) {
                await excluirMatriculaService(id);
                renderizarTabelaMatriculas();
            }
        });
    });
}

function exibirInfoAluno(alunoId) {
    const cardInfo = document.getElementById("cardInfoAluno");
    const aluno = alunosCache.find(a => a.id === alunoId);

    if (aluno && cardInfo) {
        document.getElementById("infoAlunoCpf").textContent = aluno.cpf || "Não informado";
        document.getElementById("infoAlunoEmail").textContent = aluno.email || "Não informado";
        cardInfo.classList.remove("d-none");
    } else if (cardInfo) {
        cardInfo.classList.add("d-none");
    }
}

async function abrirModalEdicao(id) {
    if (turmasCache.length === 0 || alunosCache.length === 0) {
        await carregarOpcoesFormulario();
    }

    const mat = matriculasCache.find(m => m.id === id);
    if (!mat) return;

    matriculaEmEdicaoId = id;

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
    exibirInfoAluno(mat.aluno_id);

    if (mat.turma_id) {
        selectTurma.value = mat.turma_id;
    } else {
        const turmaEncontrada = turmasCache.find(t => 
            t.nome_turma.toLowerCase().trim() === String(mat.turma_nome).toLowerCase().trim() ||
            t.nome_turma.toLowerCase().includes(String(mat.turma_nome).toLowerCase()) ||
            String(mat.turma_nome).toLowerCase().includes(t.nome_turma.toLowerCase())
        );
        selectTurma.value = turmaEncontrada ? turmaEncontrada.id : "";
    }
    selectTurma.disabled = false;

    inputValor.value = mat.valor;

    const pagLower = String(mat.forma_pagamento).toLowerCase();
    if (pagLower.includes("pix")) selectPagamento.value = "PIX";
    else if (pagLower.includes("crédito") || pagLower.includes("credito")) selectPagamento.value = "Cartão de Crédito";
    else if (pagLower.includes("boleto")) selectPagamento.value = "Boleto";
    else if (pagLower.includes("dinheiro") || pagLower.includes("vista")) selectPagamento.value = "Dinheiro";

    const statusLower = String(mat.status).toLowerCase();
    const isConfirmado = statusLower.includes("confirmad") || statusLower.includes("pago") || statusLower.includes("recebido");
    selectStatus.value = isConfirmado ? "Confirmado" : "Pendente";

    if (isConfirmado) {
        inputValor.readOnly = true;
        selectPagamento.disabled = true;
        selectStatus.disabled = true;

        if (btnLiberar) {
            btnLiberar.classList.remove("d-none");
            btnLiberar.innerHTML = `<i class="fas fa-lock me-1"></i> Permitir Edição`;
            btnLiberar.onclick = () => {
                if (confirm("ATENÇÃO: Deseja realmente desbloquear os campos protegidos?\nAlterar valores ou status de um registro confirmado pode causar inconsistências com o Financeiro.")) {
                    inputValor.readOnly = false;
                    selectPagamento.disabled = false;
                    selectStatus.disabled = false;
                    selectAluno.disabled = false;
                    btnLiberar.classList.add("d-none");
                    if (alerta) alerta.classList.remove("d-none");
                }
            };
        }
    } else {
        inputValor.readOnly = false;
        selectPagamento.disabled = false;
        selectStatus.disabled = false;
        if (btnLiberar) btnLiberar.classList.add("d-none");
    }

    const modalTitle = document.querySelector("#modalNovaMatricula .modal-title");
    if (modalTitle) modalTitle.innerHTML = `<i class="fas fa-edit text-primary me-2"></i>Vincular Turma / Editar Matrícula`;

    const modalEl = document.getElementById("modalNovaMatricula");
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

export async function carregarOpcoesFormulario() {
    const selectAluno = document.getElementById("selectAlunoMatricula");
    const selectTurma = document.getElementById("selectTurmaMatricula");

    if (!selectAluno || !selectTurma) return;

    alunosCache = await obterAlunosParaMatriculaService();
    turmasCache = await obterTurmasParaMatriculaService();

    let alunoOptions = '<option value="">Selecione o aluno...</option>';
    alunosCache.forEach(a => {
        alunoOptions += `<option value="${a.id}">${a.nome} (${a.cpf})</option>`;
    });
    selectAluno.innerHTML = alunoOptions;

    let turmaOptions = '<option value="">Selecione a turma/curso...</option>';
    turmasCache.forEach(t => {
        turmaOptions += `<option value="${t.id}">${t.nome_turma}</option>`;
    });
    selectTurma.innerHTML = turmaOptions;

    selectTurma.addEventListener("change", (e) => {
        const inputValor = document.getElementById("valorMatricula");
        const turmaSelecionada = turmasCache.find(t => t.id === e.target.value);
        if (turmaSelecionada && inputValor && !inputValor.readOnly) {
            inputValor.value = turmaSelecionada.valor;
        }
    });

    selectAluno.addEventListener("change", (e) => {
        exibirInfoAluno(e.target.value);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    renderizarTabelaMatriculas();
    carregarOpcoesFormulario();

    const btnNovaMatricula = document.getElementById("btnNovaMatricula");
    if (btnNovaMatricula) {
        btnNovaMatricula.addEventListener("click", async () => {
            matriculaEmEdicaoId = null;
            const form = document.getElementById("formSalvarMatricula");
            if (form) form.reset();

            if (turmasCache.length === 0 || alunosCache.length === 0) {
                await carregarOpcoesFormulario();
            }

            document.getElementById("selectAlunoMatricula").disabled = false;
            document.getElementById("selectTurmaMatricula").disabled = false;
            document.getElementById("valorMatricula").readOnly = false;
            document.getElementById("formaPagamentoMatricula").disabled = false;
            document.getElementById("statusMatricula").disabled = false;

            const cardInfo = document.getElementById("cardInfoAluno");
            if (cardInfo) cardInfo.classList.add("d-none");

            const btnLiberar = document.getElementById("btnLiberarEdicao");
            if (btnLiberar) btnLiberar.classList.add("d-none");

            const alerta = document.getElementById("alertaInconsistencia");
            if (alerta) alerta.classList.add("d-none");

            const modalTitle = document.querySelector("#modalNovaMatricula .modal-title");
            if (modalTitle) modalTitle.innerHTML = `<i class="fas fa-user-plus text-primary me-2"></i>Nova Matrícula`;
        });
    }

   // admin/js/frontend/matriculas-ui.js

const formMatricula = document.getElementById("formSalvarMatricula");
if (formMatricula) {
    formMatricula.addEventListener("submit", async (e) => {
        e.preventDefault();

        const alunoId = document.getElementById("selectAlunoMatricula").value;
        const turmaId = document.getElementById("selectTurmaMatricula").value; // ID real da turma/curso
        const formaPagamento = document.getElementById("formaPagamentoMatricula").value;
        const status = document.getElementById("statusMatricula").value;
        const valor = document.getElementById("valorMatricula").value;

        const alunoObj = alunosCache.find(a => a.id === alunoId);
        const turmaObj = turmasCache.find(t => t.id === turmaId);

        if (!turmaId) {
            alert("Por favor, selecione uma turma/curso válida para vincular.");
            return;
        }

        const dados = {
            aluno_id: alunoId,
            aluno_nome: alunoObj ? alunoObj.nome : "",
            aluno_email: alunoObj ? alunoObj.email : "",
            turma_id: turmaId, // Envia o ID para gravação direta no Firestore
            turma_nome: turmaObj ? turmaObj.nome_turma : "",
            valor: valor,
            forma_pagamento: formaPagamento,
            status: status
        };

        try {
            if (matriculaEmEdicaoId) {
                await atualizarMatriculaService(matriculaEmEdicaoId, dados);
            } else {
                await criarMatriculaService(dados);
            }

            const modalEl = document.getElementById("modalNovaMatricula");
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            formMatricula.reset();
            renderizarTabelaMatriculas();

        } catch (error) {
            console.error("Erro ao salvar matrícula:", error);
            alert(error.message || "Não foi possível confirmar a matrícula.");
        }
    });
}
});