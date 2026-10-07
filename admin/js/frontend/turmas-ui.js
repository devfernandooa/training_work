/**
 * =========================================================================
 * TRAINING WORK - MÓDULO FRONTEND DE GESTÃO DE TURMAS (turmas-ui.js)
 * =========================================================================
 * Camada de apresentação. Consome os services, atualiza o DOM e trata eventos.
 * =========================================================================
 */

import {
    escutarTurmas,
    salvarTurmaBackend,
    alternarStatusTurmaBackend,
    matricularAlunoNaTurmaBackend,
    removerAlunoDaTurmaBackend,
    nomeExibicaoTurma
} from "../backend/turmas-service.js";

import { escutarCursosService } from "../backend/cursos-service.js";
import { escutarAlunos, escutarMatriculas } from "../backend/alunos-service.js";

/* =========================================================================
 * SEÇÃO 1: ESTADO GLOBAL
 * ========================================================================= */

let listaTurmasGlobal = [];
let listaCursosGlobal = [];
let listaAlunosSistemaGlobal = [];
let mapaMatriculasGerais = {};
let turmaAtualGestao = null;
let exibirApenasInativos = false;

// Flags de sincronização (para log de diagnóstico)
let _turmasOk = false;
let _alunosOk = false;
let _matriculasOk = false;

let _uiConfigurada = false;

/* =========================================================================
 * SEÇÃO 2: HELPERS
 * ========================================================================= */

function normalizarVagas(t) {
    const bruto = t?.vagas_maximas ?? t?.vagas ?? 20;
    const v = Number(bruto);
    return Number.isFinite(v) && v > 0 ? v : 20;
}

/**
 * Retorna a lista de alunos inscritos nesta turma.
 * Prioridade:
 *   1. Campo alunos_matriculados[] no próprio doc da turma
 *   2. Cruzamento com mapaMatriculasGerais (subcoleções turmas/{id}/inscricoes)
 *   3. Cruzamento com aluno.matriculas[] (redundância do seed)
 */
function obterInscritos(t) {
    // 1. Array no próprio doc
    if (Array.isArray(t?.alunos_matriculados) && t.alunos_matriculados.length > 0) {
        return t.alunos_matriculados;
    }
    if (Array.isArray(t?.alunos_inscritos) && t.alunos_inscritos.length > 0) {
        return t.alunos_inscritos;
    }

    // 2. Cruzamento
    const matriculados = [];

    if (Array.isArray(listaAlunosSistemaGlobal)) {
        listaAlunosSistemaGlobal.forEach((al) => {
            const alunoId = al.id || al.aluno_id;

            // 2a. Do mapa (subcoleção via collectionGroup)
            let lista = mapaMatriculasGerais[alunoId] || [];
            if (!Array.isArray(lista) && typeof lista === "object") {
                lista = Object.values(lista);
            }
            const achouNoMapa = lista.find(
                (m) => (m.turma_id || m.id_turma || m.turmaId) === t.id
            );

            // 2b. Fallback: array matriculas[] dentro do aluno
            const achouNoAluno = Array.isArray(al.matriculas)
                ? al.matriculas.find((m) => (m.turma_id || m.id_turma) === t.id)
                : null;

            const encontrada = achouNoMapa || achouNoAluno;

            if (encontrada) {
                matriculados.push({
                    aluno_id: alunoId,
                    data_matricula: encontrada.data_matricula || encontrada.data || al.criado_em,
                    status: encontrada.status || encontrada.status_financeiro || "Matriculado"
                });
            }
        });
    }

    return matriculados;
}

function calcularCodigoTurma(t, index = 0) {
    const codEmenta = t.curso_codigo || t.codigo_nr || t.codigo_curso || t.codigo || "TRW-GERAL";
    const codLimpo = String(codEmenta).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const anoAtual = new Date().getFullYear();

    let codTurma = t.codigo_turma || "";
    if (!codTurma || codTurma === t.nome || codTurma === t.nome_turma || codTurma.length > 25) {
        codTurma = `${codLimpo}-${anoAtual}/${String(index + 1).padStart(3, "0")}`;
    }
    return { codTurma, codEmenta };
}

function getEl(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`⚠️ Elemento #${id} não encontrado.`);
    return el;
}

/* =========================================================================
 * SEÇÃO 3: BOOTSTRAP
 * ========================================================================= */

function inicializarModulo() {
    //console.log("🚀 [turmas-ui] Inicializando...");
    configurarEventosUI();

    // 1. Cursos
    try {
        if (typeof escutarCursosService === "function") {
            escutarCursosService((cursos) => {
                listaCursosGlobal = cursos || [];
                popularSelectCursos(listaCursosGlobal);
            });
        }
    } catch (err) {
        console.warn("⚠️ Erro ao carregar cursos:", err);
    }

    // 2. Matrículas (subcoleções)
    try {
        if (typeof escutarMatriculas === "function") {
            escutarMatriculas((porAluno, detalhesPorAluno) => {
                mapaMatriculasGerais = detalhesPorAluno || porAluno || {};
                if (turmaAtualGestao) popularSelectAlunosModal(listaAlunosSistemaGlobal);
                atualizarKPIsTopo();
                renderizarTabelaGestao(listaTurmasGlobal);
                if (turmaAtualGestao) {
                    const turmaAtualizada = listaTurmasGlobal.find(t => t.id === turmaAtualGestao.id) || turmaAtualGestao;
                    turmaAtualGestao = turmaAtualizada;
                    renderizarTabelaModalAlunos(turmaAtualizada);
                    popularSelectAlunosModal(listaAlunosSistemaGlobal);
                }

                _matriculasOk = true;

            });
        }
    } catch (err) {
        console.warn("⚠️ Erro ao escutar matrículas:", err);
    }

    // 3. Alunos
    try {
        if (typeof escutarAlunos === "function") {
            escutarAlunos((alunos) => {
                listaAlunosSistemaGlobal = alunos || [];
                if (turmaAtualGestao) popularSelectAlunosModal(listaAlunosSistemaGlobal);
                atualizarKPIsTopo();
                renderizarTabelaGestao(listaTurmasGlobal);
                if (turmaAtualGestao) renderizarTabelaModalAlunos(turmaAtualGestao);

                _alunosOk = true;

            });
        }
    } catch (err) {
        console.warn("⚠️ Erro ao escutar alunos:", err);
    }

    // 4. Turmas
    try {
        if (typeof escutarTurmas === "function") {
            escutarTurmas((turmas) => {
                listaTurmasGlobal = Array.isArray(turmas) ? turmas : [];
                atualizarKPIsTopo();
                renderizarTabelaGestao(listaTurmasGlobal);

                // ✅ Se o modal estiver aberto, re-sincroniza com a versão mais recente
                if (turmaAtualGestao) {
                    const turmaAtualizada = listaTurmasGlobal.find(t => t.id === turmaAtualGestao.id);
                    if (turmaAtualizada) {
                        turmaAtualGestao = turmaAtualizada;
                        renderizarTabelaModalAlunos(turmaAtualizada);
                        popularSelectAlunosModal(listaAlunosSistemaGlobal);
                    }
                }
            });
        }
    } catch (err) {
        console.error("❌ Erro ao escutar turmas:", err);
    }
}

// Módulos ES são deferidos — DOMContentLoaded pode já ter disparado.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarModulo);
} else {
    inicializarModulo();
}

/* =========================================================================
 * SEÇÃO 4: DROPDOWNS
 * ========================================================================= */

function popularSelectCursos(cursos) {
    const select = getEl("selectCursoBase");
    if (!select) return;

    let html = '<option value="">Selecione um curso do catálogo...</option>';
    cursos.forEach((c) => {
        const idCurso = c.id || c.codigo_curso || c.codigo;
        html += `<option value="${idCurso}"
            data-id-real="${c.id || ""}"
            data-codigo="${c.codigo || c.codigo_curso || ""}"
            data-carga="${c.carga_horaria || c.carga || ""}"
            data-valor="${c.investimento_base || c.valor || c.preco || 0}"
            data-desc="${c.descricao || ""}"
            data-vagas="${c.vagas_maximas || 20}">
            ${c.nome || c.nome_curso} (${c.codigo || c.codigo_curso || "TRW"})
        </option>`;
    });
    select.innerHTML = html;
}

function popularSelectAlunosModal(alunos) {
    const select = getEl("selectAlunoParaMatricular");
    if (!select) return;

    if (!turmaAtualGestao) {
        select.innerHTML = '<option value="">Selecione uma turma primeiro</option>';
        return;
    }

    if (!alunos || alunos.length === 0) {
        select.innerHTML = '<option value="">Nenhum aluno cadastrado no sistema</option>';
        return;
    }

    const inscritosNesta = obterInscritos(turmaAtualGestao).map((m) => m.aluno_id || m.id);
    const idsIndisponiveis = new Set(inscritosNesta);

    const elegiveis = alunos.filter((al) => {
        const alunoId = al.id || al.aluno_id;
        return !idsIndisponiveis.has(alunoId);
    });

    if (elegiveis.length === 0) {
        select.innerHTML = '<option value="">Todos os alunos já estão nesta turma</option>';
        return;
    }

    let html = '<option value="">Selecione o Aluno registrado no sistema...</option>';
    elegiveis.forEach((al) => {
        const nome = al.nome || al.nome_aluno || "Aluno sem nome";
        const contato = al.email || al.telefone || al.cpf || "Sem contacto";
        html += `<option value="${al.id || al.aluno_id}" data-nome="${nome}">${nome} (${contato})</option>`;
    });

    select.innerHTML = html;
}

/* =========================================================================
 * SEÇÃO 5: KPIs
 * ========================================================================= */

function atualizarInterfaceTurmas(turmas) {
    const termo = (getEl("busca-turma")?.value || "").toLowerCase().trim();

    const filtradas = turmas.filter((t) => {
        const st = String(t.status || "Ativo").toLowerCase();
        const inativo = st === "inativo";
        if (exibirApenasInativos && !inativo) return false;
        if (!exibirApenasInativos && inativo) return false;

        const nome = (t.curso_nome || t.nome_turma || t.nome || "").toLowerCase();
        const instrutor = (t.instrutor || "").toLowerCase();
        const cod = (t.codigo_turma || "").toLowerCase();
        return nome.includes(termo) || instrutor.includes(termo) || cod.includes(termo);
    });

    renderizarTabelaGestao(filtradas);
    atualizarKPIsTopo();
}

function atualizarKPIsTopo() {
    try {
        let totalAtivas = 0;
        let totalAlunos = 0;
        let capacidade = 0;

        listaTurmasGlobal.forEach((t) => {
            const st = (t.status ? String(t.status).toLowerCase() : "ativo");
            if (st !== "ativo" && st !== "ativa") return;

            totalAtivas++;

            const inscritos = obterInscritos(t).length;
            const vagasMax = normalizarVagas(t);

            totalAlunos += inscritos;
            capacidade += vagasMax;
        });

        const taxa = capacidade > 0 ? Math.round((totalAlunos / capacidade) * 100) : 0;

        const elT = getEl("kpi-turmas-ativas-reais");
        const elA = getEl("kpi-total-alunos-matriculados");
        const elO = getEl("kpi-taxa-ocupacao");

        if (elT) elT.textContent = totalAtivas;
        if (elA) elA.textContent = totalAlunos;
        if (elO) elO.textContent = `${taxa}%`;
    } catch (err) {
        console.error("❌ Erro ao atualizar KPIs:", err);
    }
}

/* =========================================================================
 * SEÇÃO 6: TABELA PRINCIPAL
 * ========================================================================= */

function renderizarTabelaGestao(turmas) {
    const tbody = getEl("tabela-turmas-tbody");
    if (!tbody) return;

    if (!turmas || turmas.length === 0) {
        const msg = exibirApenasInativos
            ? "Nenhuma turma inativa encontrada."
            : "Nenhuma turma ativa encontrada.";
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:2rem;">${msg}</td></tr>`;
        return;
    }

    let html = "";
    turmas.forEach((t, index) => {
        const st = (t.status || "Ativo").toLowerCase();

        let statusStyle = "border:1px solid #22c55e;color:#15803d;background:#f0fdf4;";
        if (st === "inativo") statusStyle = "border:1px solid #94a3b8;color:#475569;background:#f1f5f9;";
        const badgeStatus = `<span class="px-3 py-1 rounded-pill d-inline-flex align-items-center gap-1" style="${statusStyle}font-size:.82rem;font-weight:500;">${st === "ativo" ? "Ativo" : "Inativo"}</span>`;

        const categoria = t.categoria || "Grade de Treinamentos";
        const badgeCategoria = categoria.includes("Normas") || categoria === "nr"
            ? '<span class="badge bg-warning text-dark me-1" style="font-size:.72rem;">⚡ Normas Regulamentadoras</span>'
            : '<span class="badge bg-info text-dark me-1" style="font-size:.72rem;">⚡ Grade de Treinamentos</span>';

        const { codTurma, codEmenta } = calcularCodigoTurma(t, index);

        const inscritosCount = obterInscritos(t).length;
        const vagasMax = normalizarVagas(t);
        const vagasRestantes = Math.max(0, vagasMax - inscritosCount);

        const acoes = `
            <div style="display:inline-flex;gap:.38rem;justify-content:center;">
                <button class="btn-icon btn-acao-alunos" data-id="${t.id}" data-index="${index}" title="Alunos Matriculados" style="color:#0284c7;background:#e0f2fe;"><i class="fas fa-users"></i></button>
                <button class="btn-icon btn-acao-presenca" data-id="${t.id}" title="Controle de Presença" style="color:#16a34a;background:#dcfce7;"><i class="fas fa-clipboard-check"></i></button>
                <button class="btn-icon btn-icon-edit btn-acao-editar" data-id="${t.id}" title="Editar Turma"><i class="fas fa-pen"></i></button>
                <button class="btn-icon btn-icon-delete btn-acao-inativar" data-id="${t.id}" data-nome="${t.curso_nome || t.nome_turma || t.nome || ""}" data-status="${t.status || "Ativo"}" title="${st === "ativo" ? "Inativar" : "Ativar"} Turma"><i class="fas ${st === "ativo" ? "fa-ban" : "fa-check-circle"}"></i></button>
            </div>
        `;

        html += `
            <tr>
                <td style="max-width:220px;">
                    <strong class="text-dark d-block text-truncate" title="${t.curso_nome || t.nome_turma || t.nome || ""}">${t.curso_nome || t.nome_turma || t.nome || "Turma sem nome"}</strong>
                    <div class="my-1">${badgeCategoria}</div>
                    <small class="text-muted">Carga: ${t.carga_horaria || "0"}h | R$ ${(Number(t.valor || t.preco || 0)).toFixed(2)}</small>
                </td>
                <td style="max-width:180px;">
                    <span class="fw-bold text-dark font-monospace text-truncate d-block">${codTurma}</span>
                    <small class="badge bg-light text-muted border font-monospace mt-1">${codEmenta}</small>
                </td>
                <td style="max-width:150px;">
                    <small class="text-dark text-truncate d-block"><i class="fas fa-user-tie text-muted me-1"></i>${t.instrutor || "A definir"}</small>
                </td>
                <td>
                    <div class="fw-bold text-dark" style="font-size:.85rem;"><i class="fas fa-calendar-alt text-muted me-1"></i>${t.dias_semana || "Dias a definir"}</div>
                    <small class="text-muted" style="font-size:.78rem;"><i class="fas fa-clock text-muted me-1"></i>${t.horario || "Horário flexível"} (${t.modalidade || "Presencial"})</small>
                </td>
                <td>
                    <span class="fw-bold text-dark">${inscritosCount} / ${vagasMax}</span><br>
                    <small class="text-success fw-semibold" style="font-size:.75rem;">${vagasRestantes} vagas disponíveis</small>
                </td>
                <td>${badgeStatus}</td>
                <td style="text-align:center;white-space:nowrap;">${acoes}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/* =========================================================================
 * SEÇÃO 7: EVENTOS
 * ========================================================================= */

function configurarEventosUI() {
    if (_uiConfigurada) return;
    _uiConfigurada = true;

    // Busca
    const inputBusca = getEl("busca-turma");
    if (inputBusca) {
        inputBusca.addEventListener("input", () => atualizarInterfaceTurmas(listaTurmasGlobal));
    }

    // Botão ver inativos
    const btnVerInativos = getEl("btnVerInativos");
    if (btnVerInativos) {
        btnVerInativos.addEventListener("click", () => {
            exibirApenasInativos = !exibirApenasInativos;
            btnVerInativos.textContent = exibirApenasInativos ? "Ver Ativos" : "Ver Inativos";
            atualizarInterfaceTurmas(listaTurmasGlobal);
        });
    }

    // Nova turma
    const btnNovaTurma = getEl("btnNovaTurma");
    if (btnNovaTurma) {
        btnNovaTurma.addEventListener("click", () => {
            const form = getEl("formSalvarTurma");
            if (form) form.reset();

            const elId = getEl("turmaId");
            if (elId) elId.value = "";

            const elNome = getEl("turmaNome");
            if (elNome) {
                elNome.disabled = false;
                elNome.classList.remove("bg-light");
            }
        });
    }

    // Desbloquear código da turma
    const btnDesbloquear = getEl("btnDesbloquearCodigoTurma");
    if (btnDesbloquear) {
        btnDesbloquear.addEventListener("click", () => {
            const input = getEl("turmaNome");
            if (!input) return;
            if (input.disabled) {
                if (confirm("⚠️ Deseja desbloquear o código da turma?")) {
                    input.disabled = false;
                    input.classList.remove("bg-light");
                    input.focus();
                }
            } else {
                input.disabled = true;
                input.classList.add("bg-light");
            }
        });
    }

    // Change select curso
    const selectCurso = getEl("selectCursoBase");
    if (selectCurso) {
        selectCurso.addEventListener("change", (e) => {
            const opt = e.target.selectedOptions[0];
            if (!opt || !opt.value) return;

            const codEmenta = opt.getAttribute("data-codigo") || "";
            const carga = opt.getAttribute("data-carga") || "";
            const valor = opt.getAttribute("data-valor") || 0;
            const desc = opt.getAttribute("data-desc") || "";
            const vagas = opt.getAttribute("data-vagas") || 20;

            const codLimpo = codEmenta.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            const ano = new Date().getFullYear();

            const turmaId = getEl("turmaId")?.value;
            const elNome = getEl("turmaNome");
            if (!turmaId && elNome) elNome.value = `${codLimpo}-${ano}/001`;

            const elNr = getEl("turmaCodigoNr"); if (elNr) elNr.value = codEmenta;
            const elCarga = getEl("turmaCarga"); if (elCarga) elCarga.value = carga;
            const elPreco = getEl("turmaPreco"); if (elPreco) elPreco.value = Number(valor).toFixed(2);
            const elVagas = getEl("turmaVagas"); if (elVagas) elVagas.value = vagas;
            const elDesc = getEl("turmaDescricao"); if (elDesc) elDesc.value = desc;
        });
    }

    // ================================================================
    // Delegação de cliques (ações nas linhas + modais)
    // ================================================================
    document.addEventListener("click", async (e) => {
        // 1) Botão "Alunos" (👥)
        const btnAlunos = e.target.closest(".btn-acao-alunos");
        if (btnAlunos) {
            const id = btnAlunos.getAttribute("data-id");
            const index = Number(btnAlunos.getAttribute("data-index") || 0);
            turmaAtualGestao = listaTurmasGlobal.find((t) => t.id === id);
            if (!turmaAtualGestao) return;

            const { codTurma, codEmenta } = calcularCodigoTurma(turmaAtualGestao, index);

            const elTitle = getEl("modalAlunosTurmaTitle");
            const elCodT = getEl("modalBadgeCodTurma");
            const elCodE = getEl("modalBadgeCodEmenta");
            const elInstr = getEl("modalInfoInstrutor");
            const elDias = getEl("modalInfoDias");
            const elHor = getEl("modalInfoHorario");

            if (elTitle) elTitle.innerHTML = `<i class="fas fa-users text-primary me-2"></i> Alunos Matriculados: ${nomeExibicaoTurma(turmaAtualGestao)}`;
            if (elCodT) elCodT.textContent = codTurma;
            if (elCodE) elCodE.textContent = codEmenta;
            if (elInstr) elInstr.textContent = turmaAtualGestao.instrutor || "A definir";
            if (elDias) elDias.textContent = turmaAtualGestao.dias_semana || "Dias a definir";
            if (elHor) elHor.textContent = `${turmaAtualGestao.horario || "Flexível"} (${turmaAtualGestao.modalidade || "Presencial"})`;

            popularSelectAlunosModal(listaAlunosSistemaGlobal);
            renderizarTabelaModalAlunos(turmaAtualGestao);

            const modalEl = getEl("modalAlunosTurma");
            if (modalEl && window.bootstrap) {
                const m = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                m.show();
            }
            return;
        }

        // 2) Botão "Presença" (📋)
        const btnPresenca = e.target.closest(".btn-acao-presenca");
        if (btnPresenca) {
            const id = btnPresenca.getAttribute("data-id");
            // Troca de aba e seleciona a turma
            const tabPresenca = document.getElementById("frequencia-tab");
            if (tabPresenca) {
                if (window.bootstrap) new bootstrap.Tab(tabPresenca).show();
            }
            console.log("🟢 Controle de presença da turma:", id);
            return;
        }

        // 3) Botão "Editar" (✏️)
        const btnEditar = e.target.closest(".btn-acao-editar");
        if (btnEditar) {
            const id = btnEditar.getAttribute("data-id");
            const turma = listaTurmasGlobal.find((t) => t.id === id);
            if (!turma) return;

            const setVal = (elId, val) => {
                const el = getEl(elId);
                if (el) el.value = val !== undefined && val !== null ? val : "";
            };

            setVal("turmaId", turma.id);
            setVal("turmaNome", turma.codigo_turma || turma.nome_turma || turma.nome || "");
            setVal("turmaCodigoNr", turma.curso_codigo || turma.codigo_nr || turma.codigo_curso);
            setVal("turmaDescricao", turma.descricao || turma.observacoes || "");
            setVal("turmaPreco", Number(turma.valor || turma.preco || 0).toFixed(2));
            setVal("turmaCarga", turma.carga_horaria);
            setVal("turmaInstrutor", turma.instrutor);
            setVal("turmaVagas", normalizarVagas(turma));
            setVal("turmaHorario", turma.horario);
            setVal("turmaDias", turma.dias_semana);
            setVal("turmaModalidade", turma.modalidade || "Presencial");

            // Pré-seleciona o curso no select
            const selectCurso = getEl("selectCursoBase");
            if (selectCurso && turma.curso_id) {
                const opt = Array.from(selectCurso.options).find((o) => o.value === turma.curso_id);
                if (opt) selectCurso.value = opt.value;
            }

            const modalEl = getEl("modalEditarTurma");
            if (modalEl && window.bootstrap) {
                const m = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                m.show();
            }
            return;
        }

        // 4) Botão "Inativar/Ativar" (🚫)
        const btnInativar = e.target.closest(".btn-acao-inativar");
        if (btnInativar) {
            const id = btnInativar.getAttribute("data-id");
            const nome = btnInativar.getAttribute("data-nome") || "Turma";
            const st = btnInativar.getAttribute("data-status") || "Ativo";
            const novo = st.toLowerCase() === "ativo" ? "Inativo" : "Ativo";

            if (confirm(`Deseja alterar o status da turma "${nome}" para ${novo}?`)) {
                await alternarStatusTurmaBackend(id, novo);
            }
            return;
        }

        // 5) Botão "Remover aluno" no modal
        const btnRemover = e.target.closest(".btn-remover-aluno-turma");
        if (btnRemover) {
            const alunoId = btnRemover.getAttribute("data-aluno-id");
            const alunoNome = btnRemover.getAttribute("data-aluno-nome") || "Aluno";
            if (!turmaAtualGestao || !alunoId) return;

            if (!confirm(`Remover "${alunoNome}" desta turma?`)) return;

            try {
                await removerAlunoDaTurmaBackend(turmaAtualGestao.id, alunoId);
                // O onSnapshot vai atualizar a tabela sozinho
            } catch (err) {
                console.error(err);
                alert("Erro ao remover aluno: " + err.message);
            }
            return;
        }

        // 6) Botão "Salvar" do rodapé do modal de alunos
        const btnSalvarModal = e.target.closest("#btnSalvarModalAlunosTurma");
        if (btnSalvarModal) {
            if (!turmaAtualGestao) return;

            // Buscar versão mais atualizada na lista global
            const turmaMaisRecente = listaTurmasGlobal.find((t) => t.id === turmaAtualGestao.id)
                || turmaAtualGestao;

            const textoOriginal = btnSalvarModal.innerHTML;

            try {
                btnSalvarModal.disabled = true;
                btnSalvarModal.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> A guardar...`;

                await salvarTurmaBackend({
                    alunos_matriculados: turmaMaisRecente.alunos_matriculados || [],
                    logs_auditoria: turmaMaisRecente.logs_auditoria || []
                }, turmaMaisRecente.id);

                // Fecha o modal
                const modalEl = getEl("modalAlunosTurma");
                if (modalEl && window.bootstrap) {
                    const m = bootstrap.Modal.getInstance(modalEl);
                    if (m) m.hide();
                }

                console.log(`✅ Alterações salvas no modal de alunos.`);
            } catch (err) {
                console.error("❌ Erro ao guardar alterações:", err);
                alert("Erro ao guardar as alterações no Firestore.");
            } finally {
                btnSalvarModal.disabled = false;
                btnSalvarModal.innerHTML = textoOriginal;
            }
            return;
        }
    });

    // ================================================================
    // Submit do formulário de turma
    // ================================================================
    const formSalvar = getEl("formSalvarTurma");
    if (formSalvar) {
        formSalvar.addEventListener("submit", async (e) => {
            e.preventDefault();

            const val = (id) => getEl(id)?.value || "";
            const turmaId = val("turmaId");

            const dados = {
                curso_id: val("selectCursoBase"),
                curso_nome: val("turmaNome"),
                codigo_turma: val("turmaNome"),
                curso_codigo: val("turmaCodigoNr"),
                codigo_nr: val("turmaCodigoNr"),
                descricao: val("turmaDescricao"),
                valor: Number(val("turmaPreco") || 0),
                carga_horaria: val("turmaCarga"),
                instrutor: val("turmaInstrutor"),
                vagas_maximas: Number(val("turmaVagas")) || 20,
                horario: val("turmaHorario"),
                dias_semana: val("turmaDias"),
                modalidade: val("turmaModalidade")
            };

            try {
                await salvarTurmaBackend(dados, turmaId || null);
                const modalEl = getEl("modalEditarTurma");
                if (modalEl && window.bootstrap) {
                    const m = bootstrap.Modal.getInstance(modalEl);
                    if (m) m.hide();
                }
            } catch (err) {
                alert("Erro ao salvar turma: " + err.message);
            }
        });
    }

    // ================================================================
    // Submit do formulário de matrícula no modal
    // ================================================================
    const formMatricular = getEl("formMatricularAlunoTurma");
    if (formMatricular) {
        formMatricular.addEventListener("submit", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await executarMatricula();
        });

        const btnConfirmar = formMatricular.querySelector('button[type="submit"]')
            || formMatricular.querySelector('button:not([type])');
        if (btnConfirmar && btnConfirmar.getAttribute("type") !== "submit") {
            btnConfirmar.setAttribute("type", "button");
            btnConfirmar.addEventListener("click", (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                executarMatricula();
            });
        }
    }
}

/* =========================================================================
 * SEÇÃO 8: MODAL DE ALUNOS
 * ========================================================================= */

function renderizarTabelaModalAlunos(turma) {
    const tbody = getEl("modalTabelaAlunosTbody");
    const countEl = getEl("totalAlunosInscritosCount");
    const elVagas = getEl("modalInfoVagas");

    const inscritos = obterInscritos(turma);
    const vagasMax = normalizarVagas(turma);
    const livres = Math.max(0, vagasMax - inscritos.length);

    if (countEl) countEl.textContent = inscritos.length;
    if (elVagas) elVagas.textContent = `${inscritos.length} / ${vagasMax} (${livres} livres)`;

    if (!tbody) return;

    if (inscritos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Nenhum aluno matriculado nesta turma até o momento.</td></tr>`;
        return;
    }

    let html = "";
    inscritos.forEach((item, idx) => {
        const alunoId = item.aluno_id || item.id;

        const alunoCompleto = listaAlunosSistemaGlobal.find(
            (al) => (al.id || al.aluno_id) === alunoId
        ) || {};

        const nome = alunoCompleto.nome || alunoCompleto.nome_aluno || item.nome_aluno || `Aluno #${idx + 1}`;
        const email = alunoCompleto.email || item.email || "-";
        const tel = alunoCompleto.telefone || item.telefone || "-";
        const dataMat = item.data_matricula
            ? new Date(item.data_matricula).toLocaleDateString("pt-BR")
            : "-";
        const status = item.status || alunoCompleto.status_pagamento || "Matriculado";

        html += `
            <tr>
                <td><strong class="text-dark">${nome}</strong></td>
                <td>
                    <div class="text-dark small">${email}</div>
                    <small class="text-muted">${tel}</small>
                </td>
                <td><small class="text-muted">${dataMat}</small></td>
                <td><span class="badge bg-success bg-opacity-10 text-success px-2 py-1">${status}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger p-1 lh-1 btn-remover-aluno-turma" data-aluno-id="${alunoId}" data-aluno-nome="${nome}" title="Remover Aluno">
                        <i class="fas fa-trash-alt fa-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

async function executarMatricula() {
    if (!turmaAtualGestao) {
        alert("Nenhuma turma selecionada.");
        return;
    }

    const select = getEl("selectAlunoParaMatricular");
    const alunoId = select?.value;
    if (!alunoId) {
        alert("Selecione um aluno para matricular.");
        return;
    }

    const aluno = listaAlunosSistemaGlobal.find(
        (a) => (a.id || a.aluno_id) === alunoId
    );
    if (!aluno) {
        alert("Aluno não encontrado no sistema.");
        return;
    }

    const form = getEl("formMatricularAlunoTurma");
    const btn = form?.querySelector('button[type="submit"], button');

    const textoOriginal = btn ? btn.innerHTML : "";

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> A matricular...`;
        }

        await matricularAlunoNaTurmaBackend(turmaAtualGestao.id, aluno);
        async function executarMatricula() {
            if (!turmaAtualGestao) {
                alert("Nenhuma turma selecionada.");
                return;
            }

            const select = getEl("selectAlunoParaMatricular");
            const alunoId = select?.value;
            if (!alunoId) {
                alert("Selecione um aluno para matricular.");
                return;
            }

            const aluno = listaAlunosSistemaGlobal.find(
                (a) => (a.id || a.aluno_id) === alunoId
            );
            if (!aluno) {
                alert("Aluno não encontrado no sistema.");
                return;
            }

            const form = getEl("formMatricularAlunoTurma");
            const btn = form?.querySelector('button[type="submit"], button');
            const textoOriginal = btn ? btn.innerHTML : "";

            try {
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> A matricular...`;
                }

                // 1. Grava no Firestore
                await matricularAlunoNaTurmaBackend(turmaAtualGestao.id, aluno);

                // 2. ⚡ UPDATE OTIMISTA — reflete na UI antes do onSnapshot chegar
                if (!Array.isArray(turmaAtualGestao.alunos_matriculados)) {
                    turmaAtualGestao.alunos_matriculados = [];
                }

                const jaEstaNaLista = turmaAtualGestao.alunos_matriculados.some(
                    (m) => (m.aluno_id || m.id) === alunoId
                );

                if (!jaEstaNaLista) {
                    turmaAtualGestao.alunos_matriculados.push({
                        aluno_id: alunoId,
                        data_matricula: new Date().toISOString(),
                        status: "Matriculado"
                    });
                }

                // 3. Re-renderiza modal + select
                renderizarTabelaModalAlunos(turmaAtualGestao);
                popularSelectAlunosModal(listaAlunosSistemaGlobal);

                // 4. Limpa o select
                if (select) select.value = "";

            } catch (err) {
                console.error("❌ Erro ao matricular:", err);
                alert("Erro ao matricular: " + err.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = textoOriginal;
                }
            }
        }
        // Limpa o select — modal permanece aberto
        if (select) select.value = "";

        console.log(`✅ Aluno ${alunoId} matriculado. Modal permanece aberto.`);

    } catch (err) {
        console.error("❌ Erro ao matricular:", err);
        alert("Erro ao matricular: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = textoOriginal;
        }
    }
}
/* =========================================================================
 * EXPOR DEBUG
 * ========================================================================= */

window.__turmasDebug = {
    get turmas() { return listaTurmasGlobal; },
    get cursos() { return listaCursosGlobal; },
    get alunos() { return listaAlunosSistemaGlobal; },
    get mapaMatriculas() { return mapaMatriculasGerais; },
    refresh: () => {
        renderizarTabelaGestao(listaTurmasGlobal);
        atualizarKPIsTopo();
        executarMatricula();
    }
};

console.log("✅ turmas-ui.js carregado. Use __turmasDebug no console.");