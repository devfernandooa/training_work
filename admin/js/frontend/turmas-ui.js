// admin/js/frontend/turmas-ui.js

import {
    escutarTurmas,
    salvarTurmaBackend,
    alternarStatusTurmaBackend
} from "../backend/turmas-service.js";

import { escutarCursosService } from "../backend/cursos-service.js";
import { escutarAlunos, escutarMatriculas } from "../backend/alunos-service.js";

// Variáveis Globais de Estado
let listaTurmasGlobal = [];
let listaCursosGlobal = [];
let listaAlunosSistemaGlobal = [];
let mapaMatriculasGerais = {};
let turmaAtualGestao = null;
let exibirApenasInativos = false; // Estado para alternar entre ativas e inativas

document.addEventListener("DOMContentLoaded", () => {
    configurarEventosUI();

    // 1. Escuta Catálogo de Cursos Base
    try {
        if (typeof escutarCursosService === "function") {
            escutarCursosService((cursos) => {
                listaCursosGlobal = cursos || [];
                popularSelectCursos(listaCursosGlobal);
            });
        }
    } catch (err) {
        console.warn("Aviso ao carregar catálogo de cursos:", err);
    }

    // 2. Escuta Matrículas/Pagamentos
    try {
        if (typeof escutarMatriculas === "function") {
            escutarMatriculas((porAluno, detalhesPorAluno) => {
                mapaMatriculasGerais = detalhesPorAluno || porAluno || {};
                if (turmaAtualGestao) {
                    popularSelectAlunosModal(listaAlunosSistemaGlobal);
                }
            });
        }
    } catch (err) {
        console.warn("Aviso ao escutar matrículas:", err);
    }

    // 3. Escuta Alunos do Sistema
    try {
        if (typeof escutarAlunos === "function") {
            escutarAlunos((alunos) => {
                listaAlunosSistemaGlobal = alunos || [];
                if (turmaAtualGestao) {
                    popularSelectAlunosModal(listaAlunosSistemaGlobal);
                }
            });
        }
    } catch (err) {
        console.warn("Aviso ao escutar alunos do sistema:", err);
    }

    // 4. Escuta Coleção de Turmas em Tempo Real
    try {
        if (typeof escutarTurmas === "function") {
            escutarTurmas((turmas) => {
                listaTurmasGlobal = turmas || [];

                if (turmaAtualGestao) {
                    const atualizada = listaTurmasGlobal.find(t => t.id === turmaAtualGestao.id);
                    if (atualizada) {
                        turmaAtualGestao = atualizada;
                        renderizarTabelaModalAlunos(turmaAtualGestao);
                    }
                }

                atualizarInterfaceTurmas(listaTurmasGlobal);
            });
        }
    } catch (err) {
        console.error("Erro ao escutar turmas do Firestore:", err);
    }
});

function popularSelectCursos(cursos) {
    const select = document.getElementById("selectCursoBase");
    if (!select) return;

    let html = '<option value="">Selecione um curso do catálogo...</option>';
    cursos.forEach(c => {
        html += `<option value="${c.id}" data-codigo="${c.codigo_curso || c.codigo || ''}" data-carga="${c.carga || ''}" data-valor="${c.valor || 0}" data-desc="${c.descricao || ''}" data-vagas="${c.vagasTotal || 20}">${c.nome || c.nome_curso} (${c.codigo_curso || c.codigo || 'S/C'})</option>`;
    });

    select.innerHTML = html;
}

function popularSelectAlunosModal(alunos) {
    const select = document.getElementById("selectAlunoParaMatricular");
    if (!select) return;

    if (!turmaAtualGestao) {
        select.innerHTML = '<option value="">Selecione uma turma primeiro</option>';
        return;
    }

    if (!alunos || alunos.length === 0) {
        select.innerHTML = '<option value="">Nenhum aluno cadastrado no sistema</option>';
        return;
    }

    const idsAlunosMatriculadosEmQualquerTurma = new Set();

    listaTurmasGlobal.forEach(t => {
        const st = String(t.status || "Ativo").toLowerCase();
        if (st === "inativo") return;

        const inscritos = t.alunos_matriculados || t.alunos_inscritos || [];
        inscritos.forEach(a => {
            const id = a.aluno_id || a.id;
            if (id) idsAlunosMatriculadosEmQualquerTurma.add(id);
        });
    });

    const alunosElegiveis = alunos.filter(al => {
        const alunoId = al.id || al.aluno_id;

        if (idsAlunosMatriculadosEmQualquerTurma.has(alunoId)) {
            return false;
        }

        let matriculasDoAluno = mapaMatriculasGerais[alunoId] || [];
        if (!Array.isArray(matriculasDoAluno) && typeof matriculasDoAluno === 'object') {
            matriculasDoAluno = Object.values(matriculasDoAluno);
        }

        const temPagamentoConfirmadoMatricula = matriculasDoAluno.some(m => {
            const st = String(m.status_pagamento || m.status || m.situacao || "").toLowerCase();
            return st.includes("pago") || st.includes("recebido") || st.includes("confirmad") || st.includes("ativo");
        });

        const statusDoc = String(al.status_pagamento || al.status || "").toLowerCase();
        const temPagamentoConfirmadoDoc = statusDoc.includes("pago") || statusDoc.includes("recebido") || statusDoc.includes("ativo");

        return temPagamentoConfirmadoMatricula || temPagamentoConfirmadoDoc;
    });

    if (alunosElegiveis.length === 0) {
        select.innerHTML = '<option value="">Sem alunos elegíveis (pagamento pendente ou já matriculado noutro curso)</option>';
        return;
    }

    let html = '<option value="">Selecione o Aluno registrado no sistema...</option>';
    alunosElegiveis.forEach(al => {
        const nome = al.nome || al.nome_aluno || al.nome_completo || "Aluno sem nome";
        const contato = al.email || al.telefone || al.cpf || "Sem contacto";
        html += `<option value="${al.id || al.aluno_id}" data-nome="${nome}" data-email="${al.email || ''}">${nome} (${contato})</option>`;
    });

    select.innerHTML = html;
}

// FILTRA TURMAS ATIVAS E INATIVAS COM BASE NO BOTÃO 'VER INATIVOS'
function atualizarInterfaceTurmas(turmas) {
    const termoBusca = (document.getElementById("busca-turma")?.value || "").toLowerCase().trim();

    const filtradas = turmas.filter(t => {
        const statusBruto = String(t.status || "Ativo").toLowerCase();
        const ehInativo = statusBruto === "inativo";

        // Filtra pelo estado da alternância (Ativas vs Inativas)
        if (exibirApenasInativos && !ehInativo) return false;
        if (!exibirApenasInativos && ehInativo) return false;

        const nomeTurma = (t.nome_turma || t.nome || t.titulo || "").toLowerCase();
        const nomeInstrutor = (t.instrutor || "").toLowerCase();
        const codTurma = (t.codigo_turma || "").toLowerCase();

        return nomeTurma.includes(termoBusca) || nomeInstrutor.includes(termoBusca) || codTurma.includes(termoBusca);
    });

    renderizarTabelaGestao(filtradas);
    atualizarContadorAtivasTopo();
}

function atualizarContadorAtivasTopo() {
    try {
        let totalTurmasAtivas = 0;
        listaTurmasGlobal.forEach(t => {
            const statusBruto = (t.status || "Ativo").toLowerCase();
            if (statusBruto !== "inativo") totalTurmasAtivas++;
        });

        const elTurmas = document.getElementById("kpi-turmas-ativas") || document.getElementById("stat-total-turmas");
        if (elTurmas) elTurmas.textContent = totalTurmasAtivas;
    } catch (err) {
        console.warn("Aviso ao atualizar turmas ativas:", err);
    }
}

function renderizarTabelaGestao(turmas) {
    const tbody = document.getElementById("tabela-turmas-tbody");
    if (!tbody) return;

    if (!turmas || turmas.length === 0) {
        const mensagem = exibirApenasInativos 
            ? "Nenhuma turma inativa encontrada." 
            : "Nenhuma turma ativa encontrada.";
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">${mensagem}</td></tr>`;
        return;
    }

    let html = "";
    turmas.forEach((t, index) => {
        const statusBruto = (t.status || "Ativo").toLowerCase();

        let statusStyle = "border: 1px solid #22c55e; color: #15803d; background: #f0fdf4;";
        if (statusBruto === "inativo") {
            statusStyle = "border: 1px solid #94a3b8; color: #475569; background: #f1f5f9;";
        }
        const badgeStatus = `<span class="px-3 py-1 rounded-pill d-inline-flex align-items-center gap-1" style="${statusStyle} font-size: 0.82rem; font-weight: 500;">${statusBruto === 'ativo' ? 'Ativo' : 'Inativo'}</span>`;

        const categoria = t.categoria || "Grade de Treinamentos";
        const badgeCategoria = categoria.includes("Normas") || categoria === "nr"
            ? '<span class="badge bg-warning text-dark me-1" style="font-size: 0.72rem;">⚡ Normas Regulamentadoras</span>'
            : '<span class="badge bg-info text-dark me-1" style="font-size: 0.72rem;">⚡ Grade de Treinamentos</span>';

        const codEmenta = t.codigo_nr || t.codigo_curso || t.codigo || 'S/C';
        const codLimpo = codEmenta.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const anoAtual = new Date().getFullYear();

        let codTurma = t.codigo_turma || "";
        if (!codTurma || codTurma === t.nome || codTurma.length > 25) {
            codTurma = `TR-${codLimpo}-${anoAtual}/${String(index + 1).padStart(3, '0')}`;
        }

        const inscritosCount = (t.alunos_matriculados || t.alunos_inscritos || []).length;
        const vagasMax = Number(t.vagas_maximas || 20);
        const vagasRestantes = Math.max(0, vagasMax - inscritosCount);

        const acoesBotoes = `
            <div style="display: inline-flex; gap: 0.38rem; justify-content: center;">
                <button class="btn-icon btn-acao-alunos" data-id="${t.id}" data-index="${index}" title="Alunos Matriculados" style="color: #0284c7; background: #e0f2fe;">
                    <i class="fas fa-users"></i>
                </button>
                <button class="btn-icon btn-acao-presenca" data-id="${t.id}" title="Ir para Controle de Presença" style="color: #16a34a; background: #dcfce7;">
                    <i class="fas fa-clipboard-check"></i>
                </button>
                <button class="btn-icon btn-icon-edit btn-acao-editar" data-id="${t.id}" title="Editar Turma">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn-icon btn-icon-delete btn-acao-inativar" data-id="${t.id}" data-nome="${t.nome || t.nome_turma}" data-status="${t.status || 'Ativo'}" title="${statusBruto === 'ativo' ? 'Inativar' : 'Ativar'} Turma">
                    <i class="fas ${statusBruto === 'ativo' ? 'fa-ban' : 'fa-check-circle'}"></i>
                </button>
            </div>
        `;

        html += `
            <tr>
                <td style="max-width: 220px;">
                    <strong class="text-dark d-block text-truncate" title="${t.nome || t.nome_turma}">${t.nome || t.nome_turma || "Turma sem nome"}</strong>
                    <div class="my-1">${badgeCategoria}</div>
                    <small class="text-muted">Carga: ${t.carga_horaria || '0'}h | R$ ${(Number(t.valor || t.preco || 0)).toFixed(2)}</small>
                </td>
                <td style="max-width: 180px;">
                    <span class="fw-bold text-dark font-monospace text-truncate d-block">${codTurma}</span>
                    <small class="badge bg-light text-muted border font-monospace mt-1">${codEmenta}</small>
                </td>
                <td style="max-width: 150px;">
                    <small class="text-dark text-truncate d-block"><i class="fas fa-user-tie text-muted me-1"></i>${t.instrutor || "A definir"}</small>
                </td>
                <td>
                    <div class="fw-bold text-dark" style="font-size: 0.85rem;"><i class="fas fa-calendar-alt text-muted me-1"></i>${t.dias_semana || "Dias a definir"}</div>
                    <small class="text-muted" style="font-size: 0.78rem;"><i class="fas fa-clock text-muted me-1"></i>${t.horario || "Horário flexível"} (${t.modalidade || 'Presencial'})</small>
                </td>
                <td>
                    <span class="fw-bold text-dark">${inscritosCount} / ${vagasMax}</span><br>
                    <small class="text-success fw-semibold" style="font-size: 0.75rem;">${vagasRestantes} vagas disponíveis</small>
                </td>
                <td>${badgeStatus}</td>
                <td style="text-align: center; white-space: nowrap;">${acoesBotoes}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function configurarEventosUI() {
    const inputBusca = document.getElementById("busca-turma");
    if (inputBusca) {
        inputBusca.addEventListener("input", () => {
            atualizarInterfaceTurmas(listaTurmasGlobal);
        });
    }

    // BOTÃO DE ALTERNÂNCIA "VER INATIVOS" / "VER ATIVOS"
    const btnVerInativos = document.getElementById("btn-ver-inativos") || document.querySelector("button.btn:has(i.fa-eye)") || Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Inativos"));
    if (btnVerInativos) {
        btnVerInativos.addEventListener("click", () => {
            exibirApenasInativos = !exibirApenasInativos;

            if (exibirApenasInativos) {
                btnVerInativos.innerHTML = `<i class="fas fa-eye me-1"></i> Ver Ativos`;
                btnVerInativos.classList.remove("btn-outline-secondary");
                btnVerInativos.classList.add("btn-secondary");
            } else {
                btnVerInativos.innerHTML = `<i class="fas fa-eye-slash me-1"></i> Ver Inativos`;
                btnVerInativos.classList.remove("btn-secondary");
                btnVerInativos.classList.add("btn-outline-secondary");
            }

            atualizarInterfaceTurmas(listaTurmasGlobal);
        });
    }

    const selectCursoBase = document.getElementById("selectCursoBase");
    if (selectCursoBase) {
        selectCursoBase.addEventListener("change", (e) => {
            const option = e.target.selectedOptions[0];
            if (!option || !option.value) return;

            const codEmenta = option.getAttribute("data-codigo") || "";
            const carga = option.getAttribute("data-carga") || "";
            const valor = option.getAttribute("data-valor") || 0;
            const desc = option.getAttribute("data-desc") || "";
            const vagas = option.getAttribute("data-vagas") || 20;

            const codLimpo = codEmenta.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            const anoAtual = new Date().getFullYear();

            const elNr = document.getElementById("turmaCodigoNr");
            const elNome = document.getElementById("turmaNome");
            const elCarga = document.getElementById("turmaCarga");
            const elPreco = document.getElementById("turmaPreco");
            const elVagas = document.getElementById("turmaVagas");
            const elDesc = document.getElementById("turmaDescricao");

            if (elNr) elNr.value = codEmenta;
            if (elNome) elNome.value = `TR-${codLimpo}-${anoAtual}/001`;
            if (elCarga) elCarga.value = carga;
            if (elPreco) elPreco.value = Number(valor).toFixed(2);
            if (elVagas) elVagas.value = vagas;
            if (elDesc) elDesc.value = desc;
        });
    }

    // CLIQUES DE AÇÃO (ABRIR MODAL, REMOVER ALUNO, SALVAR, EDITAR, INATIVAR)
    document.addEventListener("click", async (e) => {

        // 1. ABRIR MODAL DE ALUNOS
        const btnAlunos = e.target.closest(".btn-acao-alunos");
        if (btnAlunos) {
            const id = btnAlunos.getAttribute("data-id");
            const index = Number(btnAlunos.getAttribute("data-index") || 0);
            turmaAtualGestao = listaTurmasGlobal.find(t => t.id === id);

            if (!turmaAtualGestao) return;

            const codEmenta = turmaAtualGestao.codigo_nr || turmaAtualGestao.codigo_curso || turmaAtualGestao.codigo || 'S/C';
            const codLimpo = codEmenta.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            const anoAtual = new Date().getFullYear();

            let codTurmaCalculado = turmaAtualGestao.codigo_turma || "";
            if (!codTurmaCalculado || codTurmaCalculado === turmaAtualGestao.nome || codTurmaCalculado.length > 25) {
                codTurmaCalculado = `TR-${codLimpo}-${anoAtual}/${String(index + 1).padStart(3, '0')}`;
            }

            const modalTitle = document.getElementById("modalAlunosTurmaTitle");
            const elCodTurma = document.getElementById("modalBadgeCodTurma");
            const elCodEmenta = document.getElementById("modalBadgeCodEmenta");

            if (modalTitle) modalTitle.innerHTML = `<i class="fas fa-users text-primary me-2"></i> Alunos Matriculados: ${turmaAtualGestao.nome || turmaAtualGestao.nome_turma}`;
            if (elCodTurma) elCodTurma.textContent = codTurmaCalculado;
            if (elCodEmenta) elCodEmenta.textContent = codEmenta;

            const elInstrutor = document.getElementById("modalInfoInstrutor");
            const elDias = document.getElementById("modalInfoDias");
            const elHorario = document.getElementById("modalInfoHorario");

            if (elInstrutor) elInstrutor.textContent = turmaAtualGestao.instrutor || "Não atribuído";
            if (elDias) elDias.textContent = turmaAtualGestao.dias_semana || "Dias a definir";
            if (elHorario) elHorario.textContent = `${turmaAtualGestao.horario || 'Flexível'} (${turmaAtualGestao.modalidade || 'Presencial'})`;

            popularSelectAlunosModal(listaAlunosSistemaGlobal);
            renderizarTabelaModalAlunos(turmaAtualGestao);

            const modalEl = document.getElementById("modalAlunosTurma");
            if (modalEl && window.bootstrap) {
                const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                modal.show();
            }
            return;
        }

        // 2. REMOVER ALUNO DA TURMA
        const btnRemoverAluno = e.target.closest(".btn-remover-aluno-turma");
        if (btnRemoverAluno) {
            const alunoId = btnRemoverAluno.getAttribute("data-aluno-id");
            const alunoNome = btnRemoverAluno.getAttribute("data-aluno-nome");

            if (confirm(`Tem a certeza de que deseja remover o aluno "${alunoNome}" desta turma?`)) {
                let matriculados = turmaAtualGestao.alunos_matriculados || turmaAtualGestao.alunos_inscritos || [];
                matriculados = matriculados.filter(a => (a.aluno_id || a.id) !== alunoId);

                const novoLog = {
                    data_hora: new Date().toISOString(),
                    usuario: localStorage.getItem("usuario_nome") || "Administrador",
                    acao: `Removeu o aluno "${alunoNome}" da turma.`
                };
                const logsAtuais = turmaAtualGestao.logs_auditoria || [];
                logsAtuais.unshift(novoLog);

                turmaAtualGestao.alunos_matriculados = matriculados;
                turmaAtualGestao.logs_auditoria = logsAtuais;

                await salvarTurmaBackend({
                    alunos_matriculados: turmaAtualGestao.alunos_matriculados,
                    logs_auditoria: turmaAtualGestao.logs_auditoria
                }, turmaAtualGestao.id);

                renderizarTabelaModalAlunos(turmaAtualGestao);
                popularSelectAlunosModal(listaAlunosSistemaGlobal);
                renderizarTabelaGestao(listaTurmasGlobal);
            }
            return;
        }

        // 3. SALVAR MODAL DE ALUNOS
        const btnSalvarModal = e.target.closest("#btnSalvarModalAlunosTurma") ||
                               e.target.closest("#modalAlunosTurma .modal-footer .btn-primary") ||
                               e.target.closest(".btn-salvar-modal-alunos");
        if (btnSalvarModal) {
            if (!turmaAtualGestao) return;

            try {
                btnSalvarModal.disabled = true;
                const textoOriginal = btnSalvarModal.innerHTML;
                btnSalvarModal.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> A guardar...`;

                await salvarTurmaBackend({
                    alunos_matriculados: turmaAtualGestao.alunos_matriculados || [],
                    logs_auditoria: turmaAtualGestao.logs_auditoria || []
                }, turmaAtualGestao.id);

                btnSalvarModal.disabled = false;
                btnSalvarModal.innerHTML = textoOriginal;

                const modalEl = document.getElementById("modalAlunosTurma");
                if (modalEl && window.bootstrap) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            } catch (err) {
                console.error("Erro ao guardar alterações:", err);
                alert("Erro ao guardar as alterações no Firestore.");
                btnSalvarModal.disabled = false;
                btnSalvarModal.innerHTML = `<i class="fas fa-save me-1"></i> Salvar`;
            }
            return;
        }

        // 4. EDITAR TURMA
        const btnEditar = e.target.closest(".btn-acao-editar");
        if (btnEditar) {
            const id = btnEditar.getAttribute("data-id");
            const turma = listaTurmasGlobal.find(t => t.id === id);

            if (turma) {
                const setVal = (elementId, val) => {
                    const el = document.getElementById(elementId);
                    if (el) el.value = val !== undefined && val !== null ? val : "";
                };

                setVal("turmaId", turma.id);
                setVal("turmaNome", turma.codigo_turma || turma.nome_turma || turma.nome);
                setVal("turmaCodigoNr", turma.codigo_nr || turma.codigo_curso);
                setVal("turmaDescricao", turma.descricao);
                setVal("turmaPreco", Number(turma.valor || turma.preco || 0).toFixed(2));
                setVal("turmaCarga", turma.carga_horaria);
                setVal("turmaInstrutor", turma.instrutor);
                setVal("turmaVagas", turma.vagas_maximas || 20);
                setVal("turmaHorario", turma.horario);
                setVal("turmaDias", turma.dias_semana);
                setVal("turmaModalidade", turma.modalidade || "Presencial");

                const modalEl = document.getElementById("modalEditarTurma");
                if (modalEl && window.bootstrap) {
                    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                    modal.show();
                }
            }
            return;
        }

        // 5. INATIVAR / ATIVAR TURMA
        const btnInativar = e.target.closest(".btn-acao-inativar");
        if (btnInativar) {
            const id = btnInativar.getAttribute("data-id");
            const nome = btnInativar.getAttribute("data-nome") || "Turma";
            const statusAtual = btnInativar.getAttribute("data-status") || "Ativo";
            const novoStatus = (statusAtual.toLowerCase() === "ativo") ? "Inativo" : "Ativo";

            const acaoTexto = novoStatus === "Inativo" ? "inativar" : "ativar";

            if (confirm(`Tem certeza de que deseja ${acaoTexto} a turma "${nome}"?`)) {
                try {
                    btnInativar.disabled = true;
                    if (typeof alternarStatusTurmaBackend === "function") {
                        await alternarStatusTurmaBackend(id, novoStatus);
                    } else {
                        await salvarTurmaBackend({ status: novoStatus }, id);
                    }
                } catch (err) {
                    console.error("Erro ao alterar status da turma:", err);
                    alert(`Erro ao ${acaoTexto} a turma no Firestore.`);
                    btnInativar.disabled = false;
                }
            }
            return;
        }
    });

    // MATRICULAR NOVO ALUNO (SUBMIT DO FORMULÁRIO)
    const formMatricular = document.getElementById("formMatricularAlunoTurma");
    if (formMatricular) {
        formMatricular.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!turmaAtualGestao) return;

            const select = document.getElementById("selectAlunoParaMatricular");
            const option = select?.selectedOptions[0];
            if (!option || !option.value) {
                alert("Por favor, selecione um aluno válido.");
                return;
            }

            const alunoId = option.value;
            const alunoNome = option.getAttribute("data-nome");
            const alunoEmail = option.getAttribute("data-email");

            let matriculados = turmaAtualGestao.alunos_matriculados || [];

            if (matriculados.some(a => (a.aluno_id || a.id) === alunoId)) {
                alert("Este aluno já está matriculado nesta turma!");
                return;
            }

            matriculados.push({
                id: alunoId,
                aluno_id: alunoId,
                nome: alunoNome,
                nome_aluno: alunoNome,
                email: alunoEmail,
                data_matricula: new Date().toISOString()
            });

            const novoLog = {
                data_hora: new Date().toISOString(),
                usuario: localStorage.getItem("usuario_nome") || "Administrador",
                acao: `Matriculou o aluno "${alunoNome}" na turma.`
            };
            const logsAtuais = turmaAtualGestao.logs_auditoria || [];
            logsAtuais.unshift(novoLog);

            turmaAtualGestao.alunos_matriculados = matriculados;
            turmaAtualGestao.logs_auditoria = logsAtuais;

            await salvarTurmaBackend({
                alunos_matriculados: turmaAtualGestao.alunos_matriculados,
                logs_auditoria: turmaAtualGestao.logs_auditoria
            }, turmaAtualGestao.id);

            renderizarTabelaModalAlunos(turmaAtualGestao);
            popularSelectAlunosModal(listaAlunosSistemaGlobal);
            renderizarTabelaGestao(listaTurmasGlobal);

            select.value = "";
        });
    }

    // FORMULÁRIO DE REGISTRAR / EDITAR TURMA
    const formSalvarTurma = document.getElementById("formSalvarTurma");
    if (formSalvarTurma) {
        formSalvarTurma.addEventListener("submit", async (e) => {
            e.preventDefault();

            const getVal = (elementId) => {
                const el = document.getElementById(elementId);
                return el ? el.value : "";
            };

            const turmaId = getVal("turmaId");

            const dados = {
                nome_turma: getVal("turmaNome"),
                codigo_turma: getVal("turmaNome"),
                codigo_nr: getVal("turmaCodigoNr"),
                codigo_curso: getVal("turmaCodigoNr"),
                descricao: getVal("turmaDescricao"),
                valor: Number(getVal("turmaPreco") || 0),
                carga_horaria: getVal("turmaCarga"),
                instrutor: getVal("turmaInstrutor"),
                vagas_maximas: Number(getVal("turmaVagas")) || 20,
                horario: getVal("turmaHorario"),
                dias_semana: getVal("turmaDias"),
                modalidade: getVal("turmaModalidade")
            };

            try {
                await salvarTurmaBackend(dados, turmaId ? turmaId : null);

                const modalEl = document.getElementById("modalEditarTurma");
                if (modalEl && window.bootstrap) {
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

function renderizarTabelaModalAlunos(turma) {
    const tbody = document.getElementById("modalTabelaAlunosTbody");
    const countEl = document.getElementById("totalAlunosInscritosCount");
    const elVagas = document.getElementById("modalInfoVagas");
    const containerLogs = document.getElementById("modalLogsAuditoriaTurma");

    const inscritos = turma.alunos_matriculados || [];
    const vagasMax = Number(turma.vagas_maximas || 20);

    if (countEl) countEl.textContent = inscritos.length;
    if (elVagas) elVagas.textContent = `${inscritos.length} / ${vagasMax} (${Math.max(0, vagasMax - inscritos.length)} livres)`;

    if (tbody) {
        if (!inscritos || inscritos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Nenhum aluno matriculado nesta turma até o momento.</td></tr>`;
        } else {
            let html = "";
            inscritos.forEach(a => {
                const nomeExibicao = a.nome_aluno || a.nome || 'Aluno';
                const contatoExibicao = a.email || a.telefone || '-';
                const dataMat = a.data_matricula ? new Date(a.data_matricula).toLocaleDateString('pt-BR') : '-';

                html += `
                    <tr>
                        <td><strong>${nomeExibicao}</strong></td>
                        <td><small class="text-muted">${contatoExibicao}</small></td>
                        <td><small>${dataMat}</small></td>
                        <td><span class="badge bg-success bg-opacity-10 text-success">Matriculado</span></td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-danger p-1 lh-1 btn-remover-aluno-turma" data-aluno-id="${a.aluno_id || a.id}" data-aluno-nome="${nomeExibicao}" title="Remover Aluno da Turma">
                                <i class="fas fa-trash-alt fa-xs"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }
    }

    if (containerLogs) {
        const logs = turma.logs_auditoria || [];
        if (logs.length === 0) {
            containerLogs.innerHTML = `<em>Sem alterações recentes registradas.</em>`;
        } else {
            let logsHtml = '<ul class="list-unstyled m-0">';
            logs.forEach(l => {
                const dataFmt = new Date(l.data_hora).toLocaleString('pt-BR');
                logsHtml += `<li class="mb-1"><span class="text-primary fw-semibold">${dataFmt}</span> - <strong>${l.usuario}</strong>: ${l.acao}</li>`;
            });
            logsHtml += '</ul>';
            containerLogs.innerHTML = logsHtml;
        }
    }
}