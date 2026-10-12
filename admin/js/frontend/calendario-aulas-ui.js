// admin/js/frontend/calendario-aulas-ui.js
import { notificar } from "../modules/notificacao.js";
import { escutarTurmas, nomeExibicaoTurma } from "../backend/turmas-service.js";
import { escutarCursosService } from "../backend/cursos-service.js";
import {
    verificarConflitoProfessorMemoria,
    salvarAulaBackend,
    atualizarAulaBackend,
    removerAulaBackend
} from "../backend/calendario-aulas-service.js";

// Variáveis de Estado Local
let listaTurmasGlobal = [];
let listaCursosGlobal = [];
let cursoSelecionadoId = "";
let aulaParaEditar = null;

let modalConfirmAgendamentoInstance = null;
let dadosAulaParaConfirmar = null;

let modalConfirmEdicaoInstance = null;
let modalConfirmExclusaoInstance = null;
let dadosEdicaoParaConfirmar = null;
let dadosExclusaoParaConfirmar = null;

document.addEventListener("DOMContentLoaded", () => {
    configurarEventosUI();
    inicializarCarregamentoDados();
});

function inicializarCarregamentoDados() {
    try {
        if (typeof escutarTurmas === "function") {
            escutarTurmas((turmas) => {
                listaTurmasGlobal = turmas || [];
                atualizarDropdownTurmas();
                renderizarTabelaGeralCronograma();
            });
        }
    } catch (err) {
        console.warn("Aviso ao escutar turmas para o cronograma:", err);
    }

    try {
        if (typeof escutarCursosService === "function") {
            escutarCursosService((cursos) => {
                listaCursosGlobal = cursos || [];
                atualizarDropdownTurmas();
            });
        }
    } catch (err) {
        console.warn("Aviso ao escutar catálogo de cursos para o cronograma:", err);
    }
}

/* ==========================================================================
 * Dropdown de turmas
 * ========================================================================== */
function atualizarDropdownTurmas() {
    const select = document.getElementById("selectCursoCronograma");
    if (!select) return;

    const fonteDados = listaTurmasGlobal.length > 0 ? listaTurmasGlobal : [];

    let html = '<option value="">Todas as Turmas (Visão Geral)</option>';

    fonteDados.forEach(t => {
        if (!t.id) return;

        const codTurma = t.codigo_turma || t.codigo_nr || t.codigo_curso || t.codigo || "S/C";
        const codEmenta = t.curso_codigo || t.codigo_nr || t.codigo_curso || t.codigo || "";
        const instrutor = t.instrutor || t.professor || "";
        const horario = t.horario || "";

        const nomeExibicao = nomeExibicaoTurma(t);

        html += `<option
            value="${t.id}"
            data-instrutor="${instrutor}"
            data-horario="${horario}"
            data-codigo="${codTurma}"
            data-ementa="${codEmenta}">
            ${nomeExibicao}
        </option>`;
    });

    select.innerHTML = html;
}

function configurarEventosUI() {
    const selectCurso = document.getElementById("selectCursoCronograma");
    const filtroProf = document.getElementById("filtroProfessorCronograma");
    const filtroData = document.getElementById("filtroDataCronograma");
    const formAula = document.getElementById("formAdicionarAula");
    const formEditar = document.getElementById("formEditarAula");

    // Modais de confirmação
    const modalConfirmEdicaoEl = document.getElementById("modalConfirmarEdicaoAula");
    if (modalConfirmEdicaoEl && window.bootstrap) {
        modalConfirmEdicaoInstance = new bootstrap.Modal(modalConfirmEdicaoEl);
    }

    const modalConfirmExclusaoEl = document.getElementById("modalConfirmarExclusaoAula");
    if (modalConfirmExclusaoEl && window.bootstrap) {
        modalConfirmExclusaoInstance = new bootstrap.Modal(modalConfirmExclusaoEl);
    }

    // Botão confirmar edição
    const btnConfirmarEdicao = document.getElementById("btnConfirmarEdicaoAula");
    if (btnConfirmarEdicao) {
        btnConfirmarEdicao.addEventListener("click", async () => {
            if (!dadosEdicaoParaConfirmar) return;
            const { turmaId, aulaAntiga, dadosNovos } = dadosEdicaoParaConfirmar;
            const txt = btnConfirmarEdicao.innerHTML;
            btnConfirmarEdicao.disabled = true;
            btnConfirmarEdicao.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Salvando...`;

            try {
                await atualizarAulaBackend(turmaId, aulaAntiga, dadosNovos);

                if (modalConfirmEdicaoInstance) modalConfirmEdicaoInstance.hide();
                const modalEdicaoEl = document.getElementById("modalEditarAula");
                if (modalEdicaoEl && window.bootstrap) {
                    const m = bootstrap.Modal.getInstance(modalEdicaoEl);
                    if (m) m.hide();
                }

                notificar("Aula atualizada com sucesso!", "sucesso");
            } catch (err) {
                console.error("Erro ao atualizar aula:", err);
                notificar("Erro ao atualizar a aula.", "erro");
            } finally {
                btnConfirmarEdicao.disabled = false;
                btnConfirmarEdicao.innerHTML = txt;
                dadosEdicaoParaConfirmar = null;
            }
        });
    }

    // Botão confirmar exclusão
    const btnConfirmarExclusao = document.getElementById("btnConfirmarExclusaoAula");
    if (btnConfirmarExclusao) {
        btnConfirmarExclusao.addEventListener("click", async () => {
            if (!dadosExclusaoParaConfirmar) return;
            const { turmaId, aula } = dadosExclusaoParaConfirmar;
            const txt = btnConfirmarExclusao.innerHTML;
            btnConfirmarExclusao.disabled = true;
            btnConfirmarExclusao.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Removendo...`;

            try {
                await removerAulaBackend(turmaId, aula);
                if (modalConfirmExclusaoInstance) modalConfirmExclusaoInstance.hide();
                notificar("Aula removida com sucesso!", "sucesso");
            } catch (err) {
                console.error("Erro ao remover aula:", err);
                notificar("Erro ao remover a aula.", "erro");
            } finally {
                btnConfirmarExclusao.disabled = false;
                btnConfirmarExclusao.innerHTML = txt;
                dadosExclusaoParaConfirmar = null;
            }
        });
    }

    // Modal de confirmação de agendamento
    const modalConfirmEl = document.getElementById("modalConfirmarAgendamento");
    if (modalConfirmEl && window.bootstrap) {
        modalConfirmAgendamentoInstance = new bootstrap.Modal(modalConfirmEl);
    }

    // Botão confirmar agendamento
    const btnConfirmarAgendamento = document.getElementById("btnConfirmarAgendamento");
    if (btnConfirmarAgendamento) {
        btnConfirmarAgendamento.addEventListener("click", async () => {
            if (!dadosAulaParaConfirmar) return;

            const textoOriginal = btnConfirmarAgendamento.innerHTML;
            btnConfirmarAgendamento.disabled = true;
            btnConfirmarAgendamento.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> A guardar...`;

            try {
                await salvarAulaBackend(dadosAulaParaConfirmar.turmaId, {
                    instrutor: dadosAulaParaConfirmar.professor,
                    data: dadosAulaParaConfirmar.data,
                    hora_inicio: dadosAulaParaConfirmar.horaInicio,
                    hora_fim: dadosAulaParaConfirmar.horaFim,
                    sala: dadosAulaParaConfirmar.sala
                });

                if (modalConfirmAgendamentoInstance) modalConfirmAgendamentoInstance.hide();

                document.getElementById("aulaDataInput").value = "";
                document.getElementById("aulaHoraInicioInput").value = "";
                document.getElementById("aulaHoraFimInput").value = "";
                document.getElementById("aulaSalaInput").value = "";

                esconderAlertaConflito();

                notificar("Aula agendada com sucesso!", "sucesso");

            } catch (err) {
                console.error("Erro ao salvar aula:", err);
                notificar("Erro ao salvar a aula.", "erro");
            } finally {
                btnConfirmarAgendamento.disabled = false;
                btnConfirmarAgendamento.innerHTML = textoOriginal;
                dadosAulaParaConfirmar = null;
            }
        });
    }

    // Select de turma
    if (selectCurso) {
        selectCurso.addEventListener("change", (e) => {
            cursoSelecionadoId = e.target.value;
            const optionSelecionada = e.target.selectedOptions[0];
            const badgeCurso = document.getElementById("badgeCursoCronogramaAtual");

            const inputProfessor = document.getElementById("aulaInstrutorInput");
            const inputHoraInicio = document.getElementById("aulaHoraInicioInput");
            const inputHoraFim = document.getElementById("aulaHoraFimInput");

            if (cursoSelecionadoId && optionSelecionada) {
                if (badgeCurso) {
                    badgeCurso.textContent = optionSelecionada.textContent.trim();
                }

                const instrutorCadastrado = optionSelecionada.getAttribute("data-instrutor") || "";
                if (inputProfessor && instrutorCadastrado) {
                    inputProfessor.value = instrutorCadastrado;
                }

                const horarioBruto = optionSelecionada.getAttribute("data-horario") || "";
                if (horarioBruto && horarioBruto.includes("-")) {
                    const partesHorario = horarioBruto.split("-");
                    if (partesHorario.length === 2) {
                        if (inputHoraInicio) inputHoraInicio.value = partesHorario[0].trim();
                        if (inputHoraFim) inputHoraFim.value = partesHorario[1].trim();
                    }
                }
            } else {
                if (badgeCurso) {
                    badgeCurso.textContent = "Visão Geral (Todas as Turmas)";
                }
                if (inputProfessor) inputProfessor.value = "";
            }

            esconderAlertaConflito();
            renderizarTabelaGeralCronograma();
        });
    }

    [filtroProf, filtroData].forEach(elem => {
        if (elem) {
            elem.addEventListener("change", () => renderizarTabelaGeralCronograma());
            elem.addEventListener("input", () => renderizarTabelaGeralCronograma());
        }
    });

    // Form: agendar aula
    if (formAula) {
        formAula.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!cursoSelecionadoId) {
                notificar("Por favor, selecione primeiro uma turma no painel de filtros acima para agendar a aula.", "aviso");
                return;
            }

            const professor = document.getElementById("aulaInstrutorInput")?.value.trim();
            const data = document.getElementById("aulaDataInput")?.value;
            const horaInicio = document.getElementById("aulaHoraInicioInput")?.value;
            const horaFim = document.getElementById("aulaHoraFimInput")?.value;
            const sala = document.getElementById("aulaSalaInput")?.value.trim() || "";

            if (!professor || !data || !horaInicio || !horaFim) {
                notificar("Preencha todos os campos obrigatórios (*).", "aviso");
                return;
            }

            if (horaInicio >= horaFim) {
                notificar("O horário de término deve ser posterior ao horário de início.", "aviso");
                return;
            }

            const fonteDados = listaTurmasGlobal.length > 0 ? listaTurmasGlobal : listaCursosGlobal;
            const conflito = verificarConflitoProfessorMemoria(fonteDados, professor, data, horaInicio, horaFim, cursoSelecionadoId);

            if (conflito) {
                exibirAlertaConflito(`🚫 <strong>Agendamento Bloqueado:</strong> O professor <strong>${professor}</strong> já possui aula marcada das <strong>${conflito.horario}</strong> em <strong>${conflito.cursoNome}</strong>.`);
                return;
            }

            abrirModalConfirmacaoAgendamento({
                turmaId: cursoSelecionadoId,
                professor,
                data,
                horaInicio,
                horaFim,
                sala
            });
        });
    }

    // Form: editar aula
    if (formEditar) {
        formEditar.addEventListener("submit", async (e) => {
            e.preventDefault();

            const cId = document.getElementById("editCursoId").value;
            const prof = document.getElementById("editAulaInstrutor").value.trim();
            const data = document.getElementById("editAulaData").value;
            const hInicio = document.getElementById("editAulaHoraInicio").value;
            const hFim = document.getElementById("editAulaHoraFim").value;
            const sala = document.getElementById("editAulaSala").value.trim();

            if (!prof || !data || !hInicio || !hFim) {
                notificar("Preencha todos os campos obrigatórios.", "aviso");
                return;
            }
            if (hInicio >= hFim) {
                notificar("Horário de término inválido.", "aviso");
                return;
            }

            const fonteDados = listaTurmasGlobal.length > 0 ? listaTurmasGlobal : listaCursosGlobal;
            const conflito = verificarConflitoProfessorMemoria(fonteDados, prof, data, hInicio, hFim, cId, aulaParaEditar.id);
            if (conflito) {
                notificar(`Conflito: professor já tem aula das ${conflito.horario}.`, "erro");
                return;
            }

            dadosEdicaoParaConfirmar = {
                turmaId: cId,
                aulaAntiga: aulaParaEditar,
                dadosNovos: { instrutor: prof, data, hora_inicio: hInicio, hora_fim: hFim, sala }
            };

            if (modalConfirmEdicaoInstance) modalConfirmEdicaoInstance.show();
        });
    }

    // ========================================================================
    // Delegação de cliques (ações nas linhas)
    // ========================================================================
    document.addEventListener("click", async (e) => {

        // 👁️ 1. VER DETALHES DA AULA
        const btnVer = e.target.closest(".btn-ver-aula");
        if (btnVer) {
            const cId = btnVer.getAttribute("data-curso-id");
            const aId = btnVer.getAttribute("data-aula-id");

            const fonteDados = listaTurmasGlobal.length > 0 ? listaTurmasGlobal : listaCursosGlobal;
            const elementoObj = fonteDados.find(c => c.id === cId);
            if (!elementoObj) return;

            const aula = (elementoObj.cronograma || []).find(a => a.id === aId);
            if (!aula) return;

            let dataFmt = "-";
            let diaSemanaFmt = "-";
            if (aula.data) {
                const partes = aula.data.split("-");
                if (partes.length === 3) {
                    dataFmt = `${partes[2]}/${partes[1]}/${partes[0]}`;
                    const dt = new Date(partes[0], partes[1] - 1, partes[2]);
                    const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
                    diaSemanaFmt = diasSemana[dt.getDay()] || "-";
                }
            }

            document.getElementById("detalheAulaCursoNome").textContent = nomeExibicaoTurma(elementoObj);
            document.getElementById("detalheAulaCodTurma").textContent = elementoObj.codigo_turma || "S/C";
            document.getElementById("detalheAulaCodEmenta").textContent = elementoObj.curso_codigo || elementoObj.codigo_nr || elementoObj.codigo_curso || elementoObj.codigo || "S/C";
            document.getElementById("detalheAulaData").textContent = dataFmt;
            document.getElementById("detalheAulaDiaSemana").textContent = diaSemanaFmt;
            document.getElementById("detalheAulaHorario").textContent = `${aula.hora_inicio || ''} às ${aula.hora_fim || ''}`;
            document.getElementById("detalheAulaProfessor").textContent = aula.instrutor || "A definir";
            document.getElementById("detalheAulaSala").textContent = aula.sala || "Auditório Principal";

            const modalEl = document.getElementById("modalVerDetalhesAula");
            if (modalEl && window.bootstrap) {
                const m = new bootstrap.Modal(modalEl);
                m.show();
            }
            return;
        }

        // 📋 2. REGISTRAR PRESENÇA  ← AQUI, FORA DO if (btnVer)!
        const btnPresenca = e.target.closest(".btn-presenca-aula");
        if (btnPresenca) {
            const turmaId = btnPresenca.getAttribute("data-curso-id");
            const aulaId = btnPresenca.getAttribute("data-aula-id");

            console.log("📋 Abrindo presença:", { turmaId, aulaId });

            if (typeof window.abrirModalPresenca === "function") {
                window.abrirModalPresenca(turmaId, aulaId);
            } else {
                console.warn("⚠️ Módulo de presença não carregado.");
                notificar("Módulo de presença não disponível.", "erro");
            }
            return;
        }

        // ✏️ 3. EDITAR / REAGENDAR
        const btnEdit = e.target.closest(".btn-editar-aula");
        if (btnEdit) {
            const cId = btnEdit.getAttribute("data-curso-id");
            const aId = btnEdit.getAttribute("data-aula-id");

            const fonteDados = listaTurmasGlobal.length > 0 ? listaTurmasGlobal : listaCursosGlobal;
            const elementoObj = fonteDados.find(c => c.id === cId);
            if (!elementoObj) return;

            aulaParaEditar = (elementoObj.cronograma || []).find(a => a.id === aId);
            if (!aulaParaEditar) return;

            document.getElementById("editCursoId").value = cId;
            document.getElementById("editAulaId").value = aId;
            document.getElementById("editAulaInstrutor").value = aulaParaEditar.instrutor || "";
            document.getElementById("editAulaData").value = aulaParaEditar.data || "";
            document.getElementById("editAulaHoraInicio").value = aulaParaEditar.hora_inicio || "";
            document.getElementById("editAulaHoraFim").value = aulaParaEditar.hora_fim || "";
            document.getElementById("editAulaSala").value = aulaParaEditar.sala || "";

            const modalEl = document.getElementById("modalEditarAula");
            if (modalEl && window.bootstrap) {
                const m = new bootstrap.Modal(modalEl);
                m.show();
            }
            return;
        }

        // 🗑️ 4. REMOVER AULA
        const btnRem = e.target.closest(".btn-remover-aula-cronograma");
        if (btnRem) {
            const cId = btnRem.getAttribute("data-curso-id");
            const aId = btnRem.getAttribute("data-aula-id");

            const fonteDados = listaTurmasGlobal.length > 0 ? listaTurmasGlobal : listaCursosGlobal;
            const elementoObj = fonteDados.find(c => c.id === cId);
            if (!elementoObj) return;

            const aula = (elementoObj.cronograma || []).find(a => a.id === aId);
            if (!aula) return;

            const infoEl = document.getElementById("confirmExclusaoAulaInfo");
            if (infoEl) {
                let dataFmt = aula.data;
                if (aula.data && aula.data.includes("-")) {
                    const p = aula.data.split("-");
                    dataFmt = `${p[2]}/${p[1]}/${p[0]}`;
                }
                infoEl.textContent = `${dataFmt} · ${aula.hora_inicio} às ${aula.hora_fim}`;
            }

            dadosExclusaoParaConfirmar = { turmaId: cId, aula };

            if (modalConfirmExclusaoInstance) modalConfirmExclusaoInstance.show();
            return;
        }
    });
}

/* ==========================================================================
 * Renderização da tabela de aulas
 * ========================================================================== */
function renderizarTabelaGeralCronograma() {
    const tbody = document.getElementById("tabelaCronogramaAulasTbody");
    const containerMobile = document.getElementById("cardsCronogramaMobile");

    if (!tbody) return;

    const selectCursoVal = document.getElementById("selectCursoCronograma")?.value || "";
    const filtroProfVal = (document.getElementById("filtroProfessorCronograma")?.value || "").toLowerCase().trim();
    const filtroDataVal = document.getElementById("filtroDataCronograma")?.value || "";

    const fonteDados = listaTurmasGlobal.length > 0 ? listaTurmasGlobal : listaCursosGlobal;
    let todasAulas = [];

    fonteDados.forEach(item => {
        if (selectCursoVal && item.id !== selectCursoVal) return;

        const cronograma = item.cronograma || [];
        cronograma.forEach(aula => {
            const nomeExibicao = nomeExibicaoTurma(item);
            const codTurma = item.codigo_turma || "";
            const codEmenta = item.curso_codigo || item.codigo_nr || item.codigo_curso || item.codigo || "";

            todasAulas.push({
                ...aula,
                cursoId: item.id,
                cursoNome: nomeExibicao,
                codigoTurma: codTurma,
                codigoEmenta: codEmenta
            });
        });
    });

    let filtradas = todasAulas.filter(a => {
        const prof = (a.instrutor || "").toLowerCase();
        if (filtroProfVal && !prof.includes(filtroProfVal)) return false;
        if (filtroDataVal && a.data !== filtroDataVal) return false;
        return true;
    });

    filtradas.sort((a, b) => `${a.data} ${a.hora_inicio}`.localeCompare(`${b.data} ${b.hora_inicio}`));

    if (filtradas.length === 0) {
        const msgVazia = `<div class="text-center text-muted py-5"><i class="fas fa-calendar-times fa-2x mb-2 d-block text-secondary opacity-50"></i>Nenhuma aula encontrada para os filtros selecionados.</div>`;
        tbody.innerHTML = `<tr><td colspan="6">${msgVazia}</td></tr>`;
        if (containerMobile) containerMobile.innerHTML = msgVazia;
        return;
    }

    let htmlDesktop = "";
    let htmlMobile = "";

    filtradas.forEach(a => {
        let dataFmt = "-";
        let diaSemanaFmt = "";
        if (a.data) {
            const partes = a.data.split("-");
            if (partes.length === 3) {
                dataFmt = `${partes[2]}/${partes[1]}/${partes[0]}`;
                const dt = new Date(partes[0], partes[1] - 1, partes[2]);
                const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                diaSemanaFmt = dias[dt.getDay()] || "";
            }
        }

        const horarioFmt = (a.hora_inicio && a.hora_fim) ? `${a.hora_inicio} às ${a.hora_fim}` : "A definir";

        let badgeTurmaHtml = a.codigoTurma && a.codigoTurma !== a.cursoNome
            ? `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 font-monospace" style="font-size: 0.72rem;">${a.codigoTurma}</span>`
            : '';

        let badgeEmentaHtml = a.codigoEmenta && a.codigoEmenta !== a.codigoTurma
            ? `<span class="badge bg-light text-dark border font-monospace" style="font-size: 0.72rem;">${a.codigoEmenta}</span>`
            : '';

        // 💻 DESKTOP
        htmlDesktop += `
            <tr>
                <td class="text-nowrap" style="width: 100px;">
                    <div class="fw-bold text-dark">${dataFmt}</div>
                    <small class="text-muted" style="font-size: 0.75rem;">${diaSemanaFmt}</small>
                </td>
                <td style="max-width: 280px;">
                    <div class="d-flex flex-column gap-1">
                        <span class="fw-bold text-dark text-truncate d-block" style="max-width: 270px; font-size: 0.88rem;" title="${a.cursoNome}">
                            ${a.cursoNome}
                        </span>
                        <div class="d-flex align-items-center gap-1 flex-wrap">
                            ${badgeTurmaHtml}
                            ${badgeEmentaHtml}
                        </div>
                    </div>
                </td>
                <td class="text-nowrap" style="width: 140px;">
                    <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1 rounded-2 font-monospace" style="font-size: 0.82rem;">
                        <i class="far fa-clock me-1"></i>${horarioFmt}
                    </span>
                </td>
                <td style="max-width: 200px;">
                    <div class="d-flex align-items-center text-dark small fw-medium text-truncate" title="${a.instrutor || 'A definir'}">
                        <i class="fas fa-user-tie text-secondary me-2 flex-shrink-0"></i>
                        <span class="text-truncate">${a.instrutor || 'A definir'}</span>
                    </div>
                </td>
                <td class="text-nowrap" style="width: 120px;">
                    <div class="text-secondary small">
                        <i class="fas fa-door-open me-1 text-muted"></i>
                        <span>${a.sala || 'Auditório'}</span>
                    </div>
                </td>
                <td class="text-end text-nowrap" style="width: 130px;">
                    <button class="btn btn-sm btn-light border p-1 px-2 me-1 btn-ver-aula" data-curso-id="${a.cursoId}" data-aula-id="${a.id}" title="Ver Detalhes">
                        <i class="fas fa-eye text-info fa-xs"></i>
                    </button>
                    <button class="btn btn-sm btn-light border p-1 px-2 me-1 btn-editar-aula" data-curso-id="${a.cursoId}" data-aula-id="${a.id}" title="Reagendar">
                        <i class="fas fa-pen text-primary fa-xs"></i>
                    </button>
                    <button class="btn btn-sm btn-light border p-1 px-2 me-1 btn-presenca-aula" data-curso-id="${a.cursoId}" data-aula-id="${a.id}" title="Registrar Presença">
                        <i class="fas fa-clipboard-check text-success fa-xs"></i>
                    </button>
                    <button class="btn btn-sm btn-light border p-1 px-2 btn-remover-aula-cronograma" data-curso-id="${a.cursoId}" data-aula-id="${a.id}" title="Remover">
                        <i class="fas fa-trash-alt text-danger fa-xs"></i>
                    </button>
                </td>
            </tr>
        `;

        // 📱 MOBILE
        htmlMobile += `
            <div class="card border shadow-sm mb-3 rounded-3 bg-white p-3">
                <div class="d-flex justify-content-between align-items-start mb-2 border-bottom pb-2">
                    <div>
                        <span class="fw-bold text-dark d-block" style="font-size: 0.92rem;">${a.cursoNome}</span>
                        <div class="d-flex align-items-center gap-1 mt-1">
                            ${badgeTurmaHtml}
                            ${badgeEmentaHtml}
                        </div>
                    </div>
                    <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 font-monospace text-nowrap">
                        ${dataFmt} (${diaSemanaFmt})
                    </span>
                </div>

                <div class="row g-2 mb-3 text-sm" style="font-size: 0.82rem;">
                    <div class="col-6">
                        <span class="text-muted d-block"><i class="far fa-clock text-primary me-1"></i>Horário:</span>
                        <strong class="text-dark font-monospace">${horarioFmt}</strong>
                    </div>
                    <div class="col-6">
                        <span class="text-muted d-block"><i class="fas fa-door-open text-primary me-1"></i>Sala:</span>
                        <strong class="text-dark">${a.sala || 'Auditório'}</strong>
                    </div>
                    <div class="col-12 mt-2">
                        <span class="text-muted d-block"><i class="fas fa-user-tie text-primary me-1"></i>Professor:</span>
                        <strong class="text-dark">${a.instrutor || 'A definir'}</strong>
                    </div>
                </div>

                <div class="d-flex justify-content-end gap-2 border-top pt-2">
                    <button class="btn btn-sm btn-outline-info rounded-pill px-3 py-1 btn-ver-aula" data-curso-id="${a.cursoId}" data-aula-id="${a.id}">
                        <i class="fas fa-eye me-1"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 btn-editar-aula" data-curso-id="${a.cursoId}" data-aula-id="${a.id}">
                        <i class="fas fa-pen me-1"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-outline-success rounded-pill px-3 py-1 btn-presenca-aula" data-curso-id="${a.cursoId}" data-aula-id="${a.id}">
                        <i class="fas fa-clipboard-check me-1"></i> Presença
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-pill px-3 py-1 btn-remover-aula-cronograma" data-curso-id="${a.cursoId}" data-aula-id="${a.id}">
                        <i class="fas fa-trash-alt me-1"></i> Excluir
                    </button>
                </div>
            </div>
        `;
    });

    tbody.innerHTML = htmlDesktop;
    if (containerMobile) containerMobile.innerHTML = htmlMobile;
}

function exibirAlertaConflito(msg) {
    const alerta = document.getElementById("alertaConflitoProfessor");
    const msgEl = document.getElementById("mensagemConflitoProfessor");
    if (alerta && msgEl) {
        msgEl.innerHTML = msg;
        alerta.classList.remove("d-none");
        alerta.classList.add("d-flex");
    }
}

function esconderAlertaConflito() {
    const alerta = document.getElementById("alertaConflitoProfessor");
    if (alerta) {
        alerta.classList.add("d-none");
        alerta.classList.remove("d-flex");
    }
}

function abrirModalConfirmacaoAgendamento(dados) {
    dadosAulaParaConfirmar = dados;

    const turma = listaTurmasGlobal.find(t => t.id === dados.turmaId);

    let dataFmt = dados.data;
    let diaSemanaFmt = "";
    if (dados.data) {
        const partes = dados.data.split("-");
        if (partes.length === 3) {
            dataFmt = `${partes[2]}/${partes[1]}/${partes[0]}`;
            const dt = new Date(partes[0], partes[1] - 1, partes[2]);
            const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
            diaSemanaFmt = dias[dt.getDay()] || "";
        }
    }

    const elTurma = document.getElementById("confirmAulaTurma");
    const elCodTurma = document.getElementById("confirmAulaCodTurma");
    const elData = document.getElementById("confirmAulaData");
    const elDiaSemana = document.getElementById("confirmAulaDiaSemana");
    const elHorario = document.getElementById("confirmAulaHorario");
    const elProfessor = document.getElementById("confirmAulaProfessor");
    const elSala = document.getElementById("confirmAulaSala");

    if (elTurma && turma) {
        elTurma.textContent = nomeExibicaoTurma(turma);
    }
    if (elCodTurma && turma) {
        elCodTurma.textContent = turma.codigo_turma || turma.curso_codigo || "S/C";
    }
    if (elData) elData.textContent = dataFmt;
    if (elDiaSemana) elDiaSemana.textContent = diaSemanaFmt;
    if (elHorario) elHorario.textContent = `${dados.horaInicio} às ${dados.horaFim}`;
    if (elProfessor) elProfessor.textContent = dados.professor;
    if (elSala) elSala.textContent = dados.sala || "Auditório Principal";

    if (modalConfirmAgendamentoInstance) {
        modalConfirmAgendamentoInstance.show();
    }
}

// =========================================================================
// DEBUG
// =========================================================================
window.__cronogramaDebug = {
    get turmas() { return listaTurmasGlobal; },
    get cursos() { return listaCursosGlobal; },
    get selecionado() { return cursoSelecionadoId; },
    refresh: () => renderizarTabelaGeralCronograma()
};

console.log("✅ calendario-aulas-ui.js carregado. Use __cronogramaDebug no console.");