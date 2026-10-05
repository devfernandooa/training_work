import {
    escutarTurmas,
    salvarTurmaBackend,
    alternarStatusTurmaBackend
} from "../backend/turmas-service.js";

let listaTurmasGlobal = [];
let mostrandoInativos = false;

// 1. Inicialização ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    configurarEventosUI();

    // Inicia a escuta em tempo real das turmas
    escutarTurmas((turmas) => {
        listaTurmasGlobal = turmas;
        atualizarInterfaceTurmas(listaTurmasGlobal);
    });
});

/* ==========================================================================
 * RENDERIZAÇÃO E ATUALIZAÇÃO DA INTERFACE
 * ========================================================================== */

function atualizarInterfaceTurmas(turmas) {
    const termoBusca = (document.getElementById("busca-turma")?.value || "").toLowerCase();

    // Atualiza os cartões estatísticos do topo com todas as turmas
    atualizarEstatisticasTopo(turmas);

    // Filtra por status (Ativo / Inativo) e termo de busca
    const filtradas = turmas.filter(t => {
        const statusTurma = (t.status || "Ativo").trim().toLowerCase();
        const statusMatch = mostrandoInativos ? statusTurma === "inativo" : (statusTurma === "ativo" || statusTurma === "");

        const nomeTurma = (t.nome_turma || t.nome || t.titulo || "").toLowerCase();
        const nomeInstrutor = (t.instrutor || "").toLowerCase();
        const buscaMatch = nomeTurma.includes(termoBusca) || nomeInstrutor.includes(termoBusca);

        return statusMatch && buscaMatch;
    });

    renderizarTabelaGestao(filtradas);
    renderizarTabelaVagas(turmas.filter(t => (t.status || "Ativo").trim().toLowerCase() === "ativo"));
}

function atualizarEstatisticasTopo(turmas) {
    const turmasAtivas = turmas.filter(t => (t.status || "Ativo").trim().toLowerCase() === "ativo");

    let totalTurmas = turmasAtivas.length;
    let somaVagasDisponiveis = 0;
    let turmasLotadas = 0;

    turmasAtivas.forEach(t => {
        const matriculados = Array.isArray(t.alunos_matriculados) ? t.alunos_matriculados.length : 0;
        const max = Number(t.vagas_maximas || 20);
        const restantes = max - matriculados;

        if (restantes > 0) {
            somaVagasDisponiveis += restantes;
        } else {
            turmasLotadas++;
        }
    });

    // Atualiza os elementos no HTML
    const elTurmas = document.getElementById("stat-total-turmas");
    const elVagas = document.getElementById("stat-vagas-disponiveis");
    const elLotadas = document.getElementById("stat-turmas-lotadas");

    if (elTurmas) elTurmas.textContent = totalTurmas;
    if (elVagas) elVagas.textContent = somaVagasDisponiveis;
    if (elLotadas) elLotadas.textContent = turmasLotadas;
}

function renderizarTabelaGestao(turmas) {
    const tbody = document.getElementById("tabela-turmas-tbody");
    if (!tbody) return;

    if (turmas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma turma encontrada.</td></tr>`;
        return;
    }

    let html = "";
    turmas.forEach(t => {
        const status = t.status || "Ativo";
        const badgeStatus = status === "Ativo"
            ? '<span class="badge rounded-pill bg-success bg-opacity-10 text-success px-3 py-1 fw-normal border border-success border-opacity-25">Ativo</span>'
            : '<span class="badge rounded-pill bg-secondary bg-opacity-10 text-secondary px-3 py-1 fw-normal border border-secondary border-opacity-25">Inativo</span>';

        const categoria = t.categoria || "Grade de Treinamentos";
        // Distinção visual entre Normas Regulamentadoras (Laranja/Amarelo) e Grade de Treinamentos (Azul)
        const badgeCategoria = categoria.includes("Normas")
            ? '<span class="badge bg-warning text-dark me-1"><i class="fas fa-shield-alt me-1"></i>Normas Regulamentadoras</span>'
            : '<span class="badge bg-info text-dark me-1"><i class="fas fa-bolt me-1"></i>Grade de Treinamentos</span>';

        const matriculadosCount = Array.isArray(t.alunos_matriculados) ? t.alunos_matriculados.length : 0;
        const vagasMax = t.vagas_maximas || 20;

        html += `
            <tr>
                <td>
                    <div class="fw-bold text-dark text-truncate" style="max-width: 320px;" title="${t.nome_turma || t.nome || "Turma sem nome"}">${t.nome_turma || t.nome || "Turma sem nome"}</div>
                    <div class="mb-1">${badgeCategoria}</div>
                    <small class="text-muted">Carga: ${t.carga_horaria || 'N/D'} | R$ ${(Number(t.valor || t.preco || 0)).toFixed(2)}</small>
                </td>
                <td>
                    <div class="text-truncate" style="max-width: 200px;" title="${t.instrutor || "Não atribuído"}">
                        <i class="fas fa-user-tie text-muted me-1"></i> ${t.instrutor || "Não atribuído"}
                    </div>
                </td>
                <td>
                    <div class="small text-truncate" style="max-width: 180px;"><i class="fas fa-clock text-muted me-1"></i> ${t.horario || "Horário flexível"}</div>
                    <small class="text-muted">${t.dias_semana || "Dias a definir"} (${t.modalidade || 'Presencial'})</small>
                </td>
                <td>
                    <span class="fw-bold">${matriculadosCount} / ${vagasMax}</span>
                </td>
                <td>${badgeStatus}</td>
                <td class="text-end text-nowrap" style="width: 1%;">
                    <div class="d-inline-flex align-items-center gap-1">
                        <button class="btn btn-sm btn-outline-info p-1 lh-1 btn-alunos-turma" data-id="${t.id}" title="Alunos Matriculados" style="width: 28px; height: 28px;">
                            <i class="fas fa-users fa-xs"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success p-1 lh-1 btn-frequencia-turma" data-id="${t.id}" title="Controle de Presença" style="width: 28px; height: 28px;">
                            <i class="fas fa-clipboard-check fa-xs"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary p-1 lh-1 btn-editar-turma" data-id="${t.id}" title="Editar Turma" style="width: 28px; height: 28px;">
                            <i class="fas fa-edit fa-xs"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary p-1 lh-1 btn-status-turma" data-id="${t.id}" data-status="${status}" title="${status === 'Ativo' ? 'Inativar' : 'Ativar'} Turma" style="width: 28px; height: 28px;">
                            <i class="fas ${status === 'Ativo' ? 'fa-ban' : 'fa-check-circle'} fa-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function renderizarTabelaVagas(turmasAtivas) {
    const tbody = document.getElementById("tabela-vagas-tbody");
    const badgeCount = document.getElementById("badgeVagasCount");
    if (!tbody) return;

    const comVagas = turmasAtivas.filter(t => {
        const matriculados = Array.isArray(t.alunos_matriculados) ? t.alunos_matriculados.length : 0;
        const max = Number(t.vagas_maximas || 20);
        return matriculados < max;
    });

    if (badgeCount) badgeCount.textContent = comVagas.length;

    if (comVagas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No momento, não existem turmas com vagas em aberto.</td></tr>`;
        return;
    }

    let html = "";
    comVagas.forEach(t => {
        const matriculados = Array.isArray(t.alunos_matriculados) ? t.alunos_matriculados.length : 0;
        const max = Number(t.vagas_maximas || 20);
        const restantes = max - matriculados;

        html += `
            <tr>
                <td>
                    <div class="fw-bold text-dark">${t.nome_turma || t.nome}</div>
                    <small class="text-muted">Instrutor: ${t.instrutor || 'N/D'}</small>
                </td>
                <td>${t.horario || 'N/D'} (${t.dias_semana || 'N/D'})</td>
                <td>${max}</td>
                <td><span class="badge bg-light text-dark border">${matriculados} matriculados</span></td>
                <td><strong class="text-success">${restantes} vagas disponíveis</strong></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary px-3 py-1 btn-matricular-aluno" data-id="${t.id}">
                        <i class="fas fa-user-plus me-1"></i> Enturmar
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/* ==========================================================================
 * CONFIGURAÇÃO DE EVENTOS E INTERAÇÕES
 * ========================================================================== */

function configurarEventosUI() {
    // Pesquisa em tempo real
    const inputBusca = document.getElementById("busca-turma");
    if (inputBusca) {
        inputBusca.addEventListener("input", () => {
            atualizarInterfaceTurmas(listaTurmasGlobal);
        });
    }

    // Alternar entre Turmas Ativas e Inativas
    const btnVerInativos = document.getElementById("btnVerInativos");
    if (btnVerInativos) {
        btnVerInativos.addEventListener("click", () => {
            mostrandoInativos = !mostrandoInativos;
            btnVerInativos.textContent = mostrandoInativos ? "Ver Ativos" : "Ver Inativos";
            btnVerInativos.classList.toggle("btn-outline-secondary");
            btnVerInativos.classList.toggle("btn-secondary");
            atualizarInterfaceTurmas(listaTurmasGlobal);
        });
    }

    // Botão Nova Turma (Limpa o formulário)
    const btnNovaTurma = document.getElementById("btnNovaTurma");
    if (btnNovaTurma) {
        btnNovaTurma.addEventListener("click", () => {
            document.getElementById("turmaId").value = "";
            document.getElementById("formSalvarTurma").reset();
            document.getElementById("turmaVagas").value = "20";
            document.getElementById("turmaCategoria").value = "Grade de Treinamentos";
            document.getElementById("turmaPreco").value = "0.00";
            document.getElementById("turmaModalidade").value = "Presencial";
        });
    }

    // Ouvinte de cliques unificado na tabela e botões de ação
    document.addEventListener("click", async (e) => {
        // Inativar ou Ativar Turma
        const btnStatus = e.target.closest(".btn-status-turma");
        if (btnStatus) {
            const id = btnStatus.getAttribute("data-id");
            const statusAtual = btnStatus.getAttribute("data-status");
            const novoStatus = statusAtual === "Ativo" ? "Inativo" : "Ativo";

            try {
                await alternarStatusTurmaBackend(id, novoStatus);
            } catch (err) {
                console.error("Erro ao alterar status da turma:", err);
            }
            return;
        }

        // Visualizar Alunos da Turma
        const btnAlunos = e.target.closest(".btn-alunos-turma");
        if (btnAlunos) {
            alert("Módulo de visualização de alunos da turma em desenvolvimento.");
            return;
        }

        // Ir para Frequência
        const btnFrequencia = e.target.closest(".btn-frequencia-turma");
        if (btnFrequencia) {
            const tabEl = document.querySelector('#frequencia-tab');
            if (tabEl) {
                const tab = new bootstrap.Tab(tabEl);
                tab.show();
            }
            return;
        }

        // Editar Turma
        const btnEditar = e.target.closest(".btn-editar-turma");
        if (btnEditar) {
            const id = btnEditar.getAttribute("data-id");
            const turma = listaTurmasGlobal.find(t => t.id === id);

            if (turma) {
                document.getElementById("turmaId").value = turma.id;
                document.getElementById("turmaNome").value = turma.nome_turma || turma.nome || "";

                // CORREÇÃO: Preenche os novos campos ao editar
                const inputCodigoNr = document.getElementById("turmaCodigoNr");
                if (inputCodigoNr) inputCodigoNr.value = turma.codigo_nr || "";

                const inputDescricao = document.getElementById("turmaDescricao");
                if (inputDescricao) inputDescricao.value = turma.descricao || "";

                const inputPreco = document.getElementById("turmaPreco");
                if (inputPreco) inputPreco.value = turma.valor || turma.preco || 0.00;

                document.getElementById("turmaCategoria").value = turma.categoria || "Grade de Treinamentos";
                document.getElementById("turmaCarga").value = turma.carga_horaria || "";
                document.getElementById("turmaInstrutor").value = turma.instrutor || "";
                document.getElementById("turmaVagas").value = turma.vagas_maximas || 20;
                document.getElementById("turmaHorario").value = turma.horario || "";
                document.getElementById("turmaDias").value = turma.dias_semana || "";
                document.getElementById("turmaModalidade").value = turma.modalidade || "Presencial";

                const modalEl = document.getElementById("modalEditarTurma");
                if (modalEl) {
                    const modal = new bootstrap.Modal(modalEl);
                    modal.show();
                }
            }
            return;
        }
    });

    // Submissão do Formulário de Turma
    const formSalvarTurma = document.getElementById("formSalvarTurma");
    if (formSalvarTurma) {
        formSalvarTurma.addEventListener("submit", async (e) => {
            e.preventDefault();

            const turmaId = document.getElementById("turmaId").value;

            // CORREÇÃO: Captura correta de todos os campos do modal atualizado
            const dados = {
                nome_turma: document.getElementById("turmaNome").value,
                codigo_nr: document.getElementById("turmaCodigoNr")?.value || "",
                descricao: document.getElementById("turmaDescricao")?.value || "",
                categoria: document.getElementById("turmaCategoria").value,
                valor: Number(document.getElementById("turmaPreco")?.value || 0),
                carga_horaria: document.getElementById("turmaCarga").value,
                instrutor: document.getElementById("turmaInstrutor").value,
                vagas_maximas: Number(document.getElementById("turmaVagas").value) || 20,
                horario: document.getElementById("turmaHorario").value,
                dias_semana: document.getElementById("turmaDias").value,
                modalidade: document.getElementById("turmaModalidade").value
            };

            try {
                await salvarTurmaBackend(dados, turmaId ? turmaId : null);

                const modalEl = document.getElementById("modalEditarTurma");
                if (modalEl) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            } catch (error) {
                console.error("Erro ao salvar turma:", error);
                alert("Erro ao guardar os dados da turma.");
            }
        });
    }
}