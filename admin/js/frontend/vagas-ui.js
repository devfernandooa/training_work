// ==========================================================================
// TRAINING WORK - FRONTEND UI: VAGAS, CARDS DO TOPO E MODAL DE ALUNOS
// ==========================================================================

import { obterLotacaoTurmasService } from "../backend/vagas-service.js";

let lotacaoCache = [];

export async function renderizarVagasEHeader() {
    const containerVagas = document.getElementById("tabela-vagas-tbody");
    
    try {
        const dados = await obterLotacaoTurmasService();
        lotacaoCache = dados.turmas;

        // 1. ATUALIZA OS CARDS KPI DO HEADER NO TOPO
        atualizarCardsHeader(dados.metricas);

        // 2. ATUALIZA A COLUNA "LOTAÇÃO (VAGAS)" NA ABA "GESTÃO DE TURMAS"
        atualizarTabelaGestaoTurmas(dados.turmas);

        // 3. RENDERIZA A TABELA "VAGAS EM ABERTO" COM AÇÕES
        if (containerVagas) {
            if (dados.turmas.length === 0) {
                containerVagas.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma turma encontrada.</td></tr>`;
                return;
            }

            let htmlRows = "";
            dados.turmas.forEach(item => {
                let badgeClass = "bg-success text-success bg-opacity-10";
                if (item.status_lotacao === "Esgotado") badgeClass = "bg-danger text-danger bg-opacity-10";
                if (item.status_lotacao === "Quase Lotado") badgeClass = "bg-warning text-dark bg-opacity-10";

                htmlRows += `
                    <tr>
                        <td>
                            <div class="fw-bold text-dark">${item.nome_turma}</div>
                            <small class="text-muted"><i class="fas fa-user-tie me-1"></i>Instrutor: ${item.instrutor}</small>
                        </td>
                        <td class="text-muted small">${item.horario}</td>
                        <td class="fw-bold text-center">${item.vagas_maximas}</td>
                        <td class="text-center">
                            <span class="badge bg-light text-dark border px-3 py-1 rounded-pill">
                                ${item.matriculados} matriculados
                            </span>
                        </td>
                        <td>
                            <span class="badge ${badgeClass} px-3 py-2 rounded-pill fw-bold">
                                ${item.vagas_restantes} vagas disponíveis
                            </span>
                        </td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-primary rounded-circle me-1 btn-listar-alunos-turma" data-id="${item.id}" title="Listar Alunos Matriculados">
                                <i class="fas fa-users"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary rounded-circle me-1 btn-ver-turma" data-id="${item.id}" title="Ver Detalhes da Turma">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            containerVagas.innerHTML = htmlRows;
            configurarAcoesVagas();
        }

    } catch (error) {
        console.error("Erro ao renderizar lotação:", error);
    }
}

/**
 * Preenche os cards de estatística no topo da página
 */
function atualizarCardsHeader(metricas) {
    // Card 1: Turmas Ativas
    const elAtivas = document.querySelector(".card-kpi:nth-child(1) h3, #kpi-turmas-ativas");
    if (elAtivas) elAtivas.textContent = metricas.turmasAtivas;

    // Card 2: Vagas Disponíveis Reais
    const elVagas = document.querySelector(".card-kpi:nth-child(2) h3, #kpi-vagas-disponiveis");
    if (elVagas) elVagas.textContent = metricas.vagasDisponiveis;

    // Card 3: Turmas Lotadas
    const elLotadas = document.querySelector(".card-kpi:nth-child(3) h3, #kpi-turmas-lotadas");
    if (elLotadas) elLotadas.textContent = metricas.turmasLotadas;
}

/**
 * Atualiza a coluna "Lotação (Vagas)" na aba "Gestão de Turmas"
 */
function atualizarTabelaGestaoTurmas(turmas) {
    const tbodyGestao = document.getElementById("tabela-turmas-tbody");
    if (!tbodyGestao) return;

    // Varre as linhas da tabela de gestão e atualiza a coluna de lotação correspondente
    turmas.forEach(t => {
        const linha = tbodyGestao.querySelector(`tr[data-turma-id="${t.id}"]`);
        if (linha) {
            const celulaLotacao = linha.querySelector(".col-lotacao-vagas");
            if (celulaLotacao) {
                celulaLotacao.innerHTML = `<span class="fw-bold ${t.matriculados > 0 ? 'text-primary' : 'text-dark'}">${t.matriculados} / ${t.vagas_maximas}</span>`;
            }
        }
    });
}

// Substitua o trecho correspondente no vagas-ui.js
function configurarAcoesVagas() {
    // Botão "Listar Alunos Matriculados"
    document.querySelectorAll(".btn-listar-alunos-turma").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            abrirModalAlunosTurma(id);
        });
    });

    // Botão "Ver Turma" (Substituído o alert pelo Modal Bootstrap)
    document.querySelectorAll(".btn-ver-turma").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            const turma = lotacaoCache.find(t => t.id === id);

            if (turma) {
                document.getElementById("detalheNomeTurma").textContent = turma.nome_turma;
                document.getElementById("detalheInstrutor").textContent = turma.instrutor;
                document.getElementById("detalheHorario").textContent = turma.horario;
                document.getElementById("detalheTotalVagas").textContent = turma.vagas_maximas;
                document.getElementById("detalheMatriculados").textContent = turma.matriculados;
                document.getElementById("detalheVagasRestantes").textContent = turma.vagas_restantes;

                const modalEl = document.getElementById("modalDetalhesTurma");
                if (modalEl) {
                    const modal = new bootstrap.Modal(modalEl);
                    modal.show();
                }
            }
        });
    });
}

/**
 * Abre o modal detalhado com a lista de alunos da turma
 */
function abrirModalAlunosTurma(turmaId) {
    const turma = lotacaoCache.find(t => t.id === turmaId);
    if (!turma) return;

    const modalTitle = document.getElementById("modalAlunosTurmaTitle");
    const modalBody = document.getElementById("modalAlunosTurmaBody");

    if (modalTitle) modalTitle.textContent = `Alunos Matriculados - ${turma.nome_turma}`;

    if (modalBody) {
        if (!turma.alunos || turma.alunos.length === 0) {
            modalBody.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-users-slash fa-2x mb-2 d-block text-secondary"></i>
                    Nenhum aluno matriculado nesta turma até o momento.
                </div>
            `;
        } else {
            let htmlAlunos = `
                <div class="mb-3 p-3 bg-light rounded-3 border d-flex justify-content-between align-items-center">
                    <div><strong>Instrutor:</strong> ${turma.instrutor}</div>
                    <div><strong>Vagas Livres:</strong> <span class="badge bg-success">${turma.vagas_restantes} / ${turma.vagas_maximas}</span></div>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Aluno</th>
                                <th>E-mail</th>
                                <th>Pagamento</th>
                                <th>Status Fin.</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            turma.alunos.forEach(al => {
                htmlAlunos += `
                    <tr>
                        <td><strong class="text-dark">${al.nome}</strong></td>
                        <td class="text-muted small">${al.email}</td>
                        <td><span class="badge bg-light text-dark border">${al.forma_pagamento}</span></td>
                        <td><span class="badge bg-success bg-opacity-10 text-success">${al.status_pagamento}</span></td>
                    </tr>
                `;
            });

            htmlAlunos += `</tbody></table></div>`;
            modalBody.innerHTML = htmlAlunos;
        }
    }

    const modalEl = document.getElementById("modalAlunosTurma");
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    renderizarVagasEHeader();
});