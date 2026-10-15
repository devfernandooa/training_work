// ==========================================================================
// TRAINING WORK — UI DE PRESENÇA (presenca-ui.js)
// ==========================================================================
// Responsável por:
//   - Modal de registro de presença (aula específica) — aberto pelo calendário
//   - Cards de turmas na aba "Controle de Presença"
//   - Modal de frequência por aluno
// ==========================================================================

import { notificar } from "../modules/notificacao.js";
import {
    escutarTurmas,
    nomeExibicaoTurma
} from "../backend/turmas-service.js";
import { escutarAlunos, escutarMatriculas } from "../backend/alunos-service.js";
import {
    obterPresencasDaAula,
    salvarPresencasDaAula,
    calcularEstatisticasTurma
} from "../backend/presenca-service.js";

/* =========================================================================
 * ESTADO GLOBAL
 * ========================================================================= */

let listaTurmasGlobal = [];
let listaAlunosGlobal = [];
let mapaMatriculasGlobal = {};
let turmaAtualPresenca = null;
let aulaAtualPresenca = null;
let presencasTemporarias = {}; // { alunoId: "presente" | "ausente" | "justificado" }

let _presencaUIIniciada = false;

/* =========================================================================
 * INICIALIZAÇÃO
 * ========================================================================= */

function inicializar() {
    if (_presencaUIIniciada) return;
    _presencaUIIniciada = true;

    configurarEventos();

    try {
        escutarTurmas((turmas) => {
            listaTurmasGlobal = turmas || [];
            atualizarKPIsPresenca();
            renderizarCardsTurmas();
        });
    } catch (e) {
        console.warn("Erro ao escutar turmas:", e);
    }

    try {
        escutarAlunos((alunos) => {
            listaAlunosGlobal = alunos || [];
            renderizarCardsTurmas();
        });
    } catch (e) {
        console.warn("Erro ao escutar alunos:", e);
    }

    try {
        escutarMatriculas((porAluno, detalhes) => {
            mapaMatriculasGlobal = detalhes || porAluno || {};
            renderizarCardsTurmas();
        });
    } catch (e) {
        console.warn("Erro ao escutar matrículas:", e);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializar);
} else {
    inicializar();
}

/* =========================================================================
 * HELPERS
 * ========================================================================= */

function obterAlunosDaTurma(turma) {
    if (!turma) return [];

    // 1. Array no próprio doc
    if (Array.isArray(turma.alunos_matriculados) && turma.alunos_matriculados.length > 0) {
        return turma.alunos_matriculados.map(m => {
            const alunoId = m.aluno_id || m.id;
            const alunoCompleto = listaAlunosGlobal.find(a => (a.id || a.aluno_id) === alunoId) || {};
            return {
                aluno_id: alunoId,
                nome: alunoCompleto.nome || alunoCompleto.nome_aluno || m.nome || "Aluno",
                email: alunoCompleto.email || "",
                telefone: alunoCompleto.telefone || ""
            };
        });
    }

    // 2. Cruzamento com matrículas
    const alunos = [];
    listaAlunosGlobal.forEach(al => {
        const alunoId = al.id || al.aluno_id;
        const matriculas = mapaMatriculasGlobal[alunoId] || [];
        const lista = Array.isArray(matriculas) ? matriculas : Object.values(matriculas);
        const achou = lista.find(m => (m.turma_id || m.turmaId) === turma.id);

        if (achou) {
            alunos.push({
                aluno_id: alunoId,
                nome: al.nome || al.nome_aluno || "Aluno",
                email: al.email || "",
                telefone: al.telefone || ""
            });
        }
    });

    return alunos;
}

/* =========================================================================
 * KPIs DO TOPO
 * ========================================================================= */

function atualizarKPIsPresenca() {
    let turmasComAulas = 0;
    let aulasRegistradas = 0;
    let presencasTotais = 0;

    listaTurmasGlobal.forEach(turma => {
        if (turma.excluido) return;
        const cronograma = turma.cronograma || [];
        const aulasComPresenca = cronograma.filter(a => Array.isArray(a.presencas) && a.presencas.length > 0);

        if (aulasComPresenca.length > 0) {
            turmasComAulas++;
            aulasRegistradas += aulasComPresenca.length;

            aulasComPresenca.forEach(aula => {
                presencasTotais += aula.presencas.filter(p => p.status === "presente").length;
            });
        }
    });

    const elTurmas = document.getElementById("kpi-presenca-turmas");
    const elAulas = document.getElementById("kpi-presenca-aulas");
    const elTotal = document.getElementById("kpi-presenca-total");

    if (elTurmas) elTurmas.textContent = turmasComAulas;
    if (elAulas) elAulas.textContent = aulasRegistradas;
    if (elTotal) elTotal.textContent = presencasTotais;
}

/* =========================================================================
 * CARDS DE TURMAS
 * ========================================================================= */

function renderizarCardsTurmas() {
    const container = document.getElementById("presencaCardsContainer");
    const vazio = document.getElementById("presencaEstadoVazio");
    const contador = document.getElementById("presencaContador");
    if (!container) return;

    const termoBusca = (document.getElementById("presencaBusca")?.value || "").toLowerCase().trim();
    const filtro = document.getElementById("presencaFiltro")?.value || "todas";

    // Todas as turmas ativas (com aulas OU alunos)
    const turmasBase = listaTurmasGlobal.filter(t =>
        !t.excluido &&
        (
            (t.cronograma || []).length > 0 ||
            obterAlunosDaTurma(t).length > 0
        )
    );

    // Estado vazio
    if (turmasBase.length === 0) {
        container.innerHTML = "";
        if (vazio) vazio.classList.remove("d-none");
        if (contador) contador.textContent = "0 turmas";
        return;
    }

    if (vazio) vazio.classList.add("d-none");

    // ✅ Aplica filtros (busca + categoria)
    let turmas = turmasBase.filter(t => {
        if (termoBusca) {
            const nome = (t.curso_nome || t.nome_turma || t.nome || "").toLowerCase();
            const instrutor = (t.instrutor || "").toLowerCase();
            const codigo = (t.codigo_turma || "").toLowerCase();
            if (!nome.includes(termoBusca) && !instrutor.includes(termoBusca) && !codigo.includes(termoBusca)) {
                return false;
            }
        }
        if (filtro === "com-aulas" && (t.cronograma || []).length === 0) return false;
        if (filtro === "com-matriculas" && obterAlunosDaTurma(t).length === 0) return false;
        return true;
    });


    if (turmas.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center text-muted py-5">
                    <i class="fas fa-search fa-2x mb-2 d-block opacity-50"></i>
                    Nenhuma turma corresponde aos filtros.
                </div>
            </div>
        `;
        if (contador) contador.textContent = "0 turmas";
        return;
    }

    if (contador) {
        contador.textContent = `${turmas.length} turma${turmas.length !== 1 ? 's' : ''}`;
    }

    let html = "";
    turmas.forEach(turma => {
        const alunos = obterAlunosDaTurma(turma);
        const cronograma = turma.cronograma || [];
        const aulasComPresenca = cronograma.filter(a => Array.isArray(a.presencas) && a.presencas.length > 0).length;
        const stats = calcularEstatisticasTurma(turma, alunos);

        const freqMedia = stats.length > 0
            ? Math.round(stats.reduce((acc, s) => acc + s.taxa, 0) / stats.length)
            : 0;

        const badgeClasse = freqMedia >= 75 ? "success" : freqMedia >= 50 ? "warning" : "danger";
        const textClasse = freqMedia >= 50 && freqMedia < 75 ? "text-dark" : "text-white";

        html += `
            <div class="col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="fw-bold text-dark mb-0 text-truncate" title="${nomeExibicaoTurma(turma)}">
                                ${nomeExibicaoTurma(turma)}
                            </h6>
                            <span class="badge bg-${badgeClasse} ${textClasse} ms-2" style="flex-shrink:0;">
                                ${freqMedia}%
                            </span>
                        </div>

                        <small class="text-muted font-monospace mb-3">
                            ${turma.codigo_turma || turma.curso_codigo || "S/C"}
                        </small>

                        <div class="d-flex flex-wrap gap-3 mb-3 pb-3 border-bottom text-muted small">
                            <span><i class="fas fa-user-tie me-1 text-primary"></i>${turma.instrutor || "A definir"}</span>
                        </div>

                        <div class="row g-2 mb-3">
                            <div class="col-4 text-center">
                                <div class="p-2 rounded-3" style="background:#f1f5f9;">
                                    <small class="text-muted d-block" style="font-size: 0.7rem;">Aulas</small>
                                    <strong class="text-dark">${cronograma.length}</strong>
                                </div>
                            </div>
                            <div class="col-4 text-center">
                                <div class="p-2 rounded-3" style="background:#f1f5f9;">
                                    <small class="text-muted d-block" style="font-size: 0.7rem;">Alunos</small>
                                    <strong class="text-dark">${alunos.length}</strong>
                                </div>
                            </div>
                            <div class="col-4 text-center">
                                <div class="p-2 rounded-3" style="background:#f1f5f9;">
                                    <small class="text-muted d-block" style="font-size: 0.7rem;">Registros</small>
                                    <strong class="text-dark">${aulasComPresenca}</strong>
                                </div>
                            </div>
                        </div>

                        <div class="mt-auto d-flex gap-2">
                            <button class="btn btn-sm btn-primary rounded-pill flex-grow-1 btn-ver-frequencia" data-turma-id="${turma.id}">
                                <i class="fas fa-chart-bar me-1"></i> Ver Frequência
                            </button>
                            <button class="btn btn-sm btn-outline-secondary rounded-pill btn-ver-calendario-turma" data-turma-id="${turma.id}" title="Ver calendário desta turma">
                                <i class="fas fa-calendar-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Bind dos botões
    container.querySelectorAll(".btn-ver-frequencia").forEach(btn => {
        btn.addEventListener("click", () => {
            const turmaId = btn.getAttribute("data-turma-id");
            abrirModalFrequencia(turmaId);
        });
    });

    container.querySelectorAll(".btn-ver-calendario-turma").forEach(btn => {
        btn.addEventListener("click", () => {
            const turmaId = btn.getAttribute("data-turma-id");
            document.getElementById("calendario-tab")?.click();
            setTimeout(() => {
                const select = document.getElementById("selectCursoCronograma");
                if (select) {
                    select.value = turmaId;
                    select.dispatchEvent(new Event("change"));
                }
            }, 200);
        });
    });
}

/* =========================================================================
 * MODAL DE FREQUÊNCIA
 * ========================================================================= */

function abrirModalFrequencia(turmaId) {
    const turma = listaTurmasGlobal.find(t => t.id === turmaId);
    if (!turma) return;

    const badge = document.getElementById("freqModalBadgeTurma");
    if (badge) badge.textContent = nomeExibicaoTurma(turma);

    const tbody = document.getElementById("freqModalTbody");
    if (!tbody) return;

    const alunos = obterAlunosDaTurma(turma);
    const stats = calcularEstatisticasTurma(turma, alunos);

    if (stats.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhum aluno matriculado.</td></tr>`;
    } else {
        let html = "";
        stats.forEach(s => {
            const badgeClasse = s.taxa >= 75 ? "bg-success" : s.taxa >= 50 ? "bg-warning text-dark" : "bg-danger";
            html += `
                <tr>
                    <td><strong class="text-dark">${s.aluno_nome}</strong></td>
                    <td class="text-center">${s.aulas_totais}</td>
                    <td class="text-center"><span class="text-success fw-bold">${s.presencas}</span></td>
                    <td class="text-center"><span class="text-danger fw-bold">${s.ausencias}</span></td>
                    <td class="text-center"><span class="text-warning fw-bold">${s.justificadas}</span></td>
                    <td class="text-center">
                        <span class="badge ${badgeClasse}" style="min-width: 50px;">${s.taxa}%</span>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    const modalEl = document.getElementById("modalFrequenciaTurma");
    if (modalEl && window.bootstrap) {
        const m = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        m.show();
    }
}

/* =========================================================================
 * MODAL DE REGISTRAR PRESENÇA (chamado pelo calendario-aulas-ui.js)
 * ========================================================================= */

window.abrirModalPresenca = async function (turmaId, aulaId) {
    try {
        turmaAtualPresenca = listaTurmasGlobal.find(t => t.id === turmaId);
        if (!turmaAtualPresenca) {
            notificar("Turma não encontrada.", "erro");
            return;
        }

        const aula = (turmaAtualPresenca.cronograma || []).find(a => a.id === aulaId);
        if (!aula) {
            notificar("Aula não encontrada.", "erro");
            return;
        }

        aulaAtualPresenca = aula;

        const presencasSalvas = await obterPresencasDaAula(turmaId, aulaId);

        presencasTemporarias = {};
        const inscritos = obterAlunosDaTurma(turmaAtualPresenca);
        inscritos.forEach(aluno => {
            const alunoId = aluno.aluno_id || aluno.id;
            const salva = presencasSalvas.find(p => p.aluno_id === alunoId);
            presencasTemporarias[alunoId] = salva ? salva.status : "ausente";
        });

        preencherCabecalhoModal(aula);
        renderizarListaPresenca(inscritos);

        const modalEl = document.getElementById("modalRegistrarPresenca");
        if (modalEl && window.bootstrap) {
            const m = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            m.show();
        }
    } catch (err) {
        console.error("Erro ao abrir modal de presença:", err);
        notificar("Erro ao carregar presenças.", "erro");
    }
};

function preencherCabecalhoModal(aula) {
    const elTurma = document.getElementById("presencaTurmaNome");
    const elAula = document.getElementById("presencaAulaInfo");
    const elProf = document.getElementById("presencaProfessor");
    const elData = document.getElementById("presencaData");

    if (elTurma && turmaAtualPresenca) {
        elTurma.textContent = nomeExibicaoTurma(turmaAtualPresenca);
    }

    let dataFmt = aula.data;
    if (aula.data && aula.data.includes("-")) {
        const [y, m, d] = aula.data.split("-");
        dataFmt = `${d}/${m}/${y}`;
        const dt = new Date(y, m - 1, d);
        const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
        dataFmt += ` (${dias[dt.getDay()]})`;
    }

    if (elData) elData.textContent = dataFmt;
    if (elAula) elAula.textContent = `${aula.hora_inicio} às ${aula.hora_fim}`;
    if (elProf) elProf.textContent = aula.instrutor || "A definir";
}

function renderizarListaPresenca(alunos) {
    const tbody = document.getElementById("presencaTbody");
    if (!tbody) return;

    if (!alunos || alunos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="2" class="text-center text-muted py-4">
                    Nenhum aluno matriculado nesta turma.
                </td>
            </tr>
        `;
        atualizarResumoPresenca();
        return;
    }

    let html = "";
    alunos.forEach(aluno => {
        const alunoId = aluno.aluno_id;
        const status = presencasTemporarias[alunoId] || "ausente";

        html += `
            <tr data-aluno-id="${alunoId}">
                <td>
                    <strong class="text-dark d-block">${aluno.nome}</strong>
                    <small class="text-muted">${aluno.email || aluno.telefone || ""}</small>
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm" role="group">
                        <input type="radio" class="btn-check" name="presenca_${alunoId}" id="pres_${alunoId}" value="presente" ${status === "presente" ? "checked" : ""}>
                        <label class="btn btn-outline-success" for="pres_${alunoId}">
                            <i class="fas fa-check"></i> Presente
                        </label>

                        <input type="radio" class="btn-check" name="presenca_${alunoId}" id="aus_${alunoId}" value="ausente" ${status === "ausente" ? "checked" : ""}>
                        <label class="btn btn-outline-danger" for="aus_${alunoId}">
                            <i class="fas fa-times"></i> Ausente
                        </label>

                        <input type="radio" class="btn-check" name="presenca_${alunoId}" id="jus_${alunoId}" value="justificado" ${status === "justificado" ? "checked" : ""}>
                        <label class="btn btn-outline-warning" for="jus_${alunoId}">
                            <i class="fas fa-file-alt"></i> Justificado
                        </label>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    tbody.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener("change", (e) => {
            const alunoId = e.target.name.replace("presenca_", "");
            presencasTemporarias[alunoId] = e.target.value;
            atualizarResumoPresenca();
        });
    });

    atualizarResumoPresenca();
}

function atualizarResumoPresenca() {
    const valores = Object.values(presencasTemporarias);
    const total = valores.length;
    const presentes = valores.filter(s => s === "presente").length;
    const ausentes = valores.filter(s => s === "ausente").length;
    const justificados = valores.filter(s => s === "justificado").length;
    const taxa = total > 0 ? Math.round((presentes / total) * 100) : 0;

    const elPresentes = document.getElementById("resumoPresentes");
    const elAusentes = document.getElementById("resumoAusentes");
    const elJustificados = document.getElementById("resumoJustificados");
    const elTaxa = document.getElementById("resumoTaxa");

    if (elPresentes) elPresentes.textContent = presentes;
    if (elAusentes) elAusentes.textContent = ausentes;
    if (elJustificados) elJustificados.textContent = justificados;
    if (elTaxa) elTaxa.textContent = `${taxa}%`;
}

/* =========================================================================
 * EVENTOS
 * ========================================================================= */

function configurarEventos() {
    // Busca
    const busca = document.getElementById("presencaBusca");
    if (busca) {
        busca.addEventListener("input", renderizarCardsTurmas);
    }

    // Filtro
    const filtro = document.getElementById("presencaFiltro");
    if (filtro) {
        filtro.addEventListener("change", renderizarCardsTurmas);
    }

    // Botão salvar presenças (modal)
    const btnSalvar = document.getElementById("btnSalvarPresencas");
    if (btnSalvar) {
        btnSalvar.addEventListener("click", async () => {
            if (!turmaAtualPresenca || !aulaAtualPresenca) return;

            const txt = btnSalvar.innerHTML;
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Salvando...`;

            try {
                const alunos = obterAlunosDaTurma(turmaAtualPresenca);
                const presencas = alunos.map(a => ({
                    aluno_id: a.aluno_id,
                    aluno_nome: a.nome,
                    status: presencasTemporarias[a.aluno_id] || "ausente"
                }));

                await salvarPresencasDaAula(
                    turmaAtualPresenca.id,
                    aulaAtualPresenca.id,
                    presencas
                );

                const modalEl = document.getElementById("modalRegistrarPresenca");
                if (modalEl && window.bootstrap) {
                    const m = bootstrap.Modal.getInstance(modalEl);
                    if (m) m.hide();
                }

                notificar("Presenças salvas com sucesso!", "sucesso");

                // Recalcula KPIs e cards
                atualizarKPIsPresenca();
                renderizarCardsTurmas();
            } catch (err) {
                console.error("Erro ao salvar presenças:", err);
                notificar("Erro ao salvar presenças.", "erro");
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = txt;
            }
        });
    }

    // Botão "Marcar todos como presente"
    const btnTodosPresentes = document.getElementById("btnTodosPresentes");
    if (btnTodosPresentes) {
        btnTodosPresentes.addEventListener("click", () => {
            Object.keys(presencasTemporarias).forEach(id => {
                presencasTemporarias[id] = "presente";
            });
            const alunos = obterAlunosDaTurma(turmaAtualPresenca);
            renderizarListaPresenca(alunos);
        });
    }
}

/* =========================================================================
 * DEBUG
 * ========================================================================= */
window.__presencaDebug = {
    get turmas() { return listaTurmasGlobal; },
    get alunos() { return listaAlunosGlobal; },
    get presencas() { return presencasTemporarias; },
    refresh: () => { atualizarKPIsPresenca(); renderizarCardsTurmas(); }
};

console.log("✅ presenca-ui.js carregado. Use __presencaDebug no console.");