// admin/js/frontend/calendario-aulas-ui.js

import { escutarTurmas } from "../backend/turmas-service.js";
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

function atualizarDropdownTurmas() {
    const select = document.getElementById("selectCursoCronograma");
    if (!select) return;

    const fonteDados = (listaTurmasGlobal && listaTurmasGlobal.length > 0) 
        ? listaTurmasGlobal 
        : listaCursosGlobal;

    let html = '<option value="">Todas as Turmas (Visão Geral)</option>';
    
    fonteDados.forEach(t => {
        if (!t.id) return;

        const nomeTurma = t.nome_turma || t.nome || t.titulo || "Turma sem nome";
        const codTurma = t.codigo_turma || t.codigo_nr || t.codigo_curso || t.codigo || "S/C";
        const codEmenta = t.codigo_nr || t.codigo_curso || t.codigo || "";
        const instrutor = t.instrutor || t.professor || "";
        const horario = t.horario || "";

        html += `<option value="${t.id}" data-instrutor="${instrutor}" data-horario="${horario}" data-codigo="${codTurma}" data-ementa="${codEmenta}">${nomeTurma} (${codTurma})</option>`;
    });

    select.innerHTML = html;
}

function configurarEventosUI() {
    const selectCurso = document.getElementById("selectCursoCronograma");
    const filtroProf = document.getElementById("filtroProfessorCronograma");
    const filtroData = document.getElementById("filtroDataCronograma");
    const formAula = document.getElementById("formAdicionarAula");
    const formEditar = document.getElementById("formEditarAula");

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
                    badgeCurso.textContent = optionSelecionada.textContent;
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

    if (formAula) {
        formAula.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!cursoSelecionadoId) {
                alert("Por favor, selecione primeiro uma turma no painel de filtros acima para agendar a aula.");
                return;
            }

            const professor = document.getElementById("aulaInstrutorInput")?.value.trim();
            const data = document.getElementById("aulaDataInput")?.value;
            const horaInicio = document.getElementById("aulaHoraInicioInput")?.value;
            const horaFim = document.getElementById("aulaHoraFimInput")?.value;
            const sala = document.getElementById("aulaSalaInput")?.value.trim() || "";

            if (horaInicio >= horaFim) {
                alert("O horário de término deve ser posterior ao horário de início.");
                return;
            }

            const fonteDados = (listaTurmasGlobal && listaTurmasGlobal.length > 0) ? listaTurmasGlobal : listaCursosGlobal;
            const conflito = verificarConflitoProfessorMemoria(fonteDados, professor, data, horaInicio, horaFim, cursoSelecionadoId);
            
            if (conflito) {
                exibirAlertaConflito(`🚫 <strong>Agendamento Bloqueado:</strong> O professor <strong>${professor}</strong> já possui aula marcada das <strong>${conflito.horario}</strong> no curso/turma <strong>${conflito.cursoNome}</strong>.`);
                return;
            }

            const btnSubmit = document.getElementById("btnSalvarAulaCronograma");

            try {
                if (btnSubmit) {
                    btnSubmit.disabled = true;
                    btnSubmit.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> A guardar...`;
                }

                await salvarAulaBackend(cursoSelecionadoId, { 
                    instrutor: professor, 
                    data, 
                    hora_inicio: horaInicio, 
                    hora_fim: horaFim, 
                    sala 
                });

                document.getElementById("aulaDataInput").value = "";
                document.getElementById("aulaHoraInicioInput").value = "";
                document.getElementById("aulaHoraFimInput").value = "";
                document.getElementById("aulaSalaInput").value = "";
                esconderAlertaConflito();

            } catch (err) {
                console.error("Erro ao salvar aula no cronograma:", err);
                alert("Erro ao guardar a aula no Firestore.");
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<i class="fas fa-calendar-plus me-1"></i> Guardar Aula`;
                }
            }
        });
    }

    if (formEditar) {
        formEditar.addEventListener("submit", async (e) => {
            e.preventDefault();

            const cId = document.getElementById("editCursoId").value;
            const prof = document.getElementById("editAulaInstrutor").value.trim();
            const data = document.getElementById("editAulaData").value;
            const hInicio = document.getElementById("editAulaHoraInicio").value;
            const hFim = document.getElementById("editAulaHoraFim").value;
            const sala = document.getElementById("editAulaSala").value.trim();
            const notificar = document.getElementById("checkNotificarAlunos").checked;

            const fonteDados = (listaTurmasGlobal && listaTurmasGlobal.length > 0) ? listaTurmasGlobal : listaCursosGlobal;
            const conflito = verificarConflitoProfessorMemoria(fonteDados, prof, data, hInicio, hFim, cId, aulaParaEditar.id);
            
            if (conflito) {
                alert(`Conflito de horário! O professor ${prof} já possui aula das ${conflito.horario} em ${conflito.cursoNome}.`);
                return;
            }

            try {
                await atualizarAulaBackend(cId, aulaParaEditar, { instrutor: prof, data, hora_inicio: hInicio, hora_fim: hFim, sala });

                if (notificar) {
                    alert(`✅ Aula reagendada com sucesso! Notificação enviada para os alunos da turma.`);
                }

                const modalEl = document.getElementById("modalEditarAula");
                if (modalEl && window.bootstrap) {
                    const m = bootstrap.Modal.getInstance(modalEl);
                    if (m) m.hide();
                }
            } catch (err) {
                console.error("Erro ao reagendar aula:", err);
                alert("Erro ao reagendar aula no Firestore.");
            }
        });
    }

    // Cliques na Tabela (Ver, Editar e Remover)
    document.addEventListener("click", async (e) => {

        // 👁️ 1. VER DETALHES DA AULA
        const btnVer = e.target.closest(".btn-ver-aula");
        if (btnVer) {
            const cId = btnVer.getAttribute("data-curso-id");
            const aId = btnVer.getAttribute("data-aula-id");

            const fonteDados = (listaTurmasGlobal && listaTurmasGlobal.length > 0) ? listaTurmasGlobal : listaCursosGlobal;
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

            document.getElementById("detalheAulaCursoNome").textContent = elementoObj.nome_turma || elementoObj.nome || elementoObj.nome_curso || "Curso sem nome";
            document.getElementById("detalheAulaCodTurma").textContent = elementoObj.codigo_turma || "S/C";
            document.getElementById("detalheAulaCodEmenta").textContent = elementoObj.codigo_nr || elementoObj.codigo_curso || elementoObj.codigo || "S/C";
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

        // ✏️ 2. EDITAR / REAGENDAR
        const btnEdit = e.target.closest(".btn-editar-aula");
        if (btnEdit) {
            const cId = btnEdit.getAttribute("data-curso-id");
            const aId = btnEdit.getAttribute("data-aula-id");

            const fonteDados = (listaTurmasGlobal && listaTurmasGlobal.length > 0) ? listaTurmasGlobal : listaCursosGlobal;
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

        // 🗑️ 3. REMOVER AULA
        const btnRem = e.target.closest(".btn-remover-aula-cronograma");
        if (btnRem) {
            const cId = btnRem.getAttribute("data-curso-id");
            const aId = btnRem.getAttribute("data-aula-id");

            const fonteDados = (listaTurmasGlobal && listaTurmasGlobal.length > 0) ? listaTurmasGlobal : listaCursosGlobal;
            const elementoObj = fonteDados.find(c => c.id === cId);
            if (!elementoObj) return;

            const aula = (elementoObj.cronograma || []).find(a => a.id === aId);
            if (!aula) return;

            if (confirm(`Tem certeza de que deseja remover a aula do dia ${aula.data}?`)) {
                await removerAulaBackend(cId, aula);
            }
        }
    });
}

function renderizarTabelaGeralCronograma() {
    const tbody = document.getElementById("tabelaCronogramaAulasTbody");
    const containerMobile = document.getElementById("cardsCronogramaMobile");
    
    if (!tbody) return;

    const selectCursoVal = document.getElementById("selectCursoCronograma")?.value || "";
    const filtroProfVal = (document.getElementById("filtroProfessorCronograma")?.value || "").toLowerCase().trim();
    const filtroDataVal = document.getElementById("filtroDataCronograma")?.value || "";

    const fonteDados = (listaTurmasGlobal && listaTurmasGlobal.length > 0) ? listaTurmasGlobal : listaCursosGlobal;
    let todasAulas = [];

    fonteDados.forEach(item => {
        if (selectCursoVal && item.id !== selectCursoVal) return;

        const cronograma = item.cronograma || [];
        cronograma.forEach(aula => {
            const nomeExibicao = item.nome_turma || item.nome || item.nome_curso || item.titulo || "Curso sem nome";
            const codTurma = item.codigo_turma || item.turmaCodigoNr || item.turmaNome || item.codigo_nr || item.codigo_curso || "";
            const codEmenta = item.codigo_nr || item.codigo_curso || item.codigo || "";

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

        // 💻 1. HTML PARA DESKTOP (Tabela)
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
                <td class="text-end text-nowrap" style="width: 100px;">
                    <button class="btn btn-sm btn-light border p-1 px-2 me-1 btn-ver-aula" data-curso-id="${a.cursoId}" data-aula-id="${a.id}" title="Ver Detalhes">
                        <i class="fas fa-eye text-info fa-xs"></i>
                    </button>
                    <button class="btn btn-sm btn-light border p-1 px-2 me-1 btn-editar-aula" data-curso-id="${a.cursoId}" data-aula-id="${a.id}" title="Reagendar">
                        <i class="fas fa-pen text-primary fa-xs"></i>
                    </button>
                    <button class="btn btn-sm btn-light border p-1 px-2 btn-remover-aula-cronograma" data-curso-id="${a.cursoId}" data-aula-id="${a.id}" title="Remover">
                        <i class="fas fa-trash-alt text-danger fa-xs"></i>
                    </button>
                </td>
            </tr>
        `;

        // 📱 2. HTML PARA MOBILE (Cards Elegantes)
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