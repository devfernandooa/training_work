// ==========================================================================
// TRAINING WORK — UI DE ALUNOS (alunos-ui.js)
// ==========================================================================
import "../modules/modal-helper.js";
import { notificar } from "../modules/notificacao.js";
import { auth, db } from "../firebase-config.js";
import { registrarAuditoriaAluno, compararAlteracoes } from "../backend/auditoria-service.js";
import {
    escutarAlunos,
    excluirAlunoBackend,
    restaurarAlunoBackend,
    alterarStatusAlunoBackend
} from "../backend/alunos-service.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
    collection,
    onSnapshot,
    collectionGroup,
    doc,
    updateDoc,
    addDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

console.log("✅ [alunos-ui] carregado");

let listaAlunos = [];
let matriculasPorAluno = {};
let iniciou = false;
let filtroInativos = false;
let filtroExcluidos = false;   // ⬅️ NOVO
let unsubscribeAlunos = null;  // ⬅️ NOVO: para recriar o listener quando o toggle mudar



/* ==========================================================================
 * AUTH
 * ========================================================================== */
onAuthStateChanged(auth, (user) => {
    if (!user) return;
    if (iniciou) return;
    iniciou = true;
    console.log("🚀 [alunos-ui] iniciando com", user.email);

    // Logout
    const btnLogout = document.getElementById("btnLogoutSidebar") || document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await auth.signOut();
            window.location.replace("login.html");
        });
    }

    // Escuta alunos (com filtro controlado pelo service)
    iniciarEscutaAlunos();

    // Escuta matrículas (subcoleção)
    onSnapshot(collectionGroup(db, "matriculas"), (snap) => {
        matriculasPorAluno = {};
        snap.forEach(d => {
            const turmaId = d.ref.parent.parent?.id;
            if (!turmaId) return;
            const m = d.data();
            const alunoId = m.aluno_id;
            if (!alunoId) return;
            if (!matriculasPorAluno[alunoId]) matriculasPorAluno[alunoId] = [];
            matriculasPorAluno[alunoId].push(m.curso_nome || "Geral");
        });
        renderizar();
    }, (err) => {
        console.warn("⚠️ [alunos-ui] onSnapshot matriculas:", err.message);
    });
});

/* ==========================================================================
 * ESCUTA DE ALUNOS (recriável quando o toggle muda)
 * ========================================================================== */
function iniciarEscutaAlunos() {
    if (unsubscribeAlunos) unsubscribeAlunos();

    unsubscribeAlunos = escutarAlunos((alunos) => {
        listaAlunos = alunos;
        console.log("📥 [alunos-ui] Alunos recebidos:", listaAlunos.length);
        renderizar();
    }, { incluirExcluidos: filtroExcluidos });
}

/* ==========================================================================
 * RENDER
 * ========================================================================== */
function renderizar() {
    const tbody = document.getElementById("alunos-tbody");
    if (!tbody) return;

    const termo = (document.getElementById("inputBuscaAluno")?.value || "").toLowerCase().trim();

    // KPIs
    let ativos = 0, inativos = 0, debitos = 0;
    listaAlunos.forEach(a => {
        const s = (a.status || "ativo").toLowerCase();
        if (s === "ativo") ativos++;
        else if (s === "inativo") inativos++;
        if (s === "debito") debitos++;
    });

    // Atualiza título da seção
    const titulo = document.getElementById("titulo-secao-alunos");
    if (titulo) {
        if (filtroExcluidos) titulo.textContent = "Alunos Excluídos";
        else titulo.textContent = filtroInativos ? "Alunos Inativos" : "Alunos Ativos";
    }

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("metric-total-alunos", listaAlunos.length);
    set("metric-alunos-ativos", ativos);
    set("metric-alunos-inativos", inativos);
    set("metric-alunos-debitos", debitos);

    // Filtro
    const filtrados = listaAlunos.filter(a => {
        const status = (a.status || "ativo").toLowerCase();
        const estaExcluido = a.excluido === true;

        // Quando "Mostrar Excluídos" está ligado, mostra SÓ excluídos
        if (filtroExcluidos && !estaExcluido) return false;

        // Quando desligado, o service já filtrou os excluídos, mas por segurança:
        if (!filtroExcluidos && estaExcluido) return false;

        // Filtro ativo/inativo (não se aplica à visão de excluídos)
        if (!filtroExcluidos) {
            if (filtroInativos && status !== "inativo") return false;
            if (!filtroInativos && status === "inativo") return false;
        }

        if (termo) {
            const nome = (a.nome || "").toLowerCase();
            const email = (a.email || "").toLowerCase();
            if (!nome.includes(termo) && !email.includes(termo)) return false;
        }

        return true;
    });

    if (filtrados.length === 0) {
        const msg = filtroExcluidos
            ? "Nenhum aluno excluído."
            : "Nenhum aluno encontrado.";
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">${msg}</td></tr>`;
        return;
    }

    let html = "";
    filtrados.forEach(aluno => {
        const cursos = matriculasPorAluno[aluno.id] || [];
        const cursosTags = cursos.length > 0
            ? cursos.map(c => `<span class="badge bg-light text-secondary border m-1">${c}</span>`).join(" ")
            : `<span class="text-muted small">Sem matrículas</span>`;

        const tel = (aluno.telefone || "").replace(/\D/g, "");
        const zapLink = tel ? `https://wa.me/55${tel}` : "#";

        const data = aluno.criado_em ? new Date(aluno.criado_em).toLocaleDateString("pt-BR") : "Recente";

        const statusAtual = (aluno.status || "ativo").toLowerCase();
        const estaExcluido = aluno.excluido === true;

        // Badge de status (se excluído, mostra "Excluído")
        const badgeStatus = estaExcluido
            ? `<span class="badge bg-danger bg-opacity-10 text-danger">Excluído</span>`
            : statusAtual === "inativo"
                ? `<span class="badge bg-secondary bg-opacity-10 text-secondary">Inativo</span>`
                : statusAtual === "debito"
                    ? `<span class="badge bg-warning bg-opacity-10 text-warning">Em Débito</span>`
                    : `<span class="badge bg-success bg-opacity-10 text-success">Ativo</span>`;

        //Ações diferentes para excluídos
        const acoes = estaExcluido
            ? `
                <button class="btn btn-sm btn-outline-info px-2 py-1 btn-ficha" data-id="${aluno.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success px-2 py-1 btn-restaurar" data-id="${aluno.id}" title="Restaurar">
                    <i class="fas fa-recycle"></i>
                </button>
            `
            : `
                <a href="${zapLink}" target="_blank" class="btn btn-sm btn-outline-success px-2 py-1">
                    <i class="fab fa-whatsapp"></i>
                </a>
                <button class="btn btn-sm btn-outline-info px-2 py-1 btn-ficha" data-id="${aluno.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary px-2 py-1 btn-editar" data-id="${aluno.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning px-2 py-1 btn-status" data-id="${aluno.id}" title="${statusAtual === "ativo" ? "Inativar" : "Reativar"}">
                    <i class="fas ${statusAtual === "ativo" ? "fa-user-slash" : "fa-user-check"}"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger px-2 py-1 btn-excluir" data-id="${aluno.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;

        html += `
    <tr>
        <td data-label="Aluno">
            <div class="fw-bold text-dark">${aluno.nome || "Não informado"}</div>
            <small class="text-muted d-block">${aluno.email || ""}</small>
        </td>
        <td data-label="Telefone" class="d-none d-lg-table-cell">${aluno.telefone || "-"}</td>
        <td data-label="Cursos" class="d-none d-lg-table-cell">${cursosTags}</td>
        <td data-label="Cadastro" class="d-none d-lg-table-cell">${data}</td>
        <td data-label="Status">${badgeStatus}</td>
        <td data-label="Ações" class="text-end">
    <div class="d-flex justify-content-end gap-1">
        ${acoes}
    </div>
</td>
    </tr>
`;
    });

    tbody.innerHTML = html;
}

/* ==========================================================================
 * DELEGAÇÃO DE CLIQUES
 * ========================================================================== */
document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;

    if (btn.classList.contains("btn-ficha")) {
        if (typeof window.abrirFichaAluno === "function") window.abrirFichaAluno(id);
        else notificar("Módulo de ficha não carregado.", "erro");
        return;
    }

    // === Inativar/Ativar Aluno ===
    if (btn.classList.contains("btn-status")) {
        const aluno = listaAlunos.find(a => a.id === id);
        if (!aluno) return;

        const statusAtual = (aluno.status || "ativo").toLowerCase();
        const vaiInativar = statusAtual === "ativo";

        const iconeWrap = document.getElementById("confirmStatusAlunoIconeWrap");
        const icone = document.getElementById("confirmStatusAlunoIcone");
        const titulo = document.getElementById("confirmStatusAlunoTitulo");
        const texto = document.getElementById("confirmStatusAlunoTexto");
        const nome = document.getElementById("confirmStatusAlunoNome");
        const idInput = document.getElementById("confirmStatusAlunoId");
        const btnConfirm = document.getElementById("btnConfirmarStatusAluno");

        if (!iconeWrap || !btnConfirm) {
            console.warn("⚠️ Modal de status não encontrado no HTML");
            return;
        }

        if (vaiInativar) {
            iconeWrap.style.background = "#fef3c7";
            iconeWrap.style.color = "#d97706";
            icone.className = "fas fa-user-slash fa-2x";
            titulo.textContent = "Inativar Aluno?";
            texto.textContent = "Deseja realmente inativar este aluno? Ele não aparecerá na lista de ativos, mas poderá ser reativado depois.";
            btnConfirm.textContent = "Inativar Aluno";
            btnConfirm.style.background = "#d97706";
        } else {
            iconeWrap.style.background = "#dcfce7";
            iconeWrap.style.color = "#16a34a";
            icone.className = "fas fa-user-check fa-2x";
            titulo.textContent = "Reativar Aluno?";
            texto.textContent = "Deseja reativar este aluno? Ele voltará a aparecer na lista de ativos.";
            btnConfirm.textContent = "Reativar Aluno";
            btnConfirm.style.background = "#16a34a";
        }

        nome.textContent = aluno.nome || "este aluno";
        idInput.value = aluno.id;

        const modalEl = document.getElementById("modalConfirmarStatusAluno");
        if (modalEl && window.bootstrap) {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }
        return;
    }

    if (btn.classList.contains("btn-editar")) {
        const aluno = listaAlunos.find(a => a.id === id);
        if (!aluno) return;

        // Guarda o "antes" para comparar depois
        window.__alunoAntesEdicao = { ...aluno };

        // Preenche os campos
        document.getElementById("editAlunoId").value = aluno.id;
        document.getElementById("editNomeAluno").value = aluno.nome || "";
        document.getElementById("editEmailAluno").value = aluno.email || "";
        document.getElementById("editCpfAluno").value = aluno.cpf || "";
        document.getElementById("editTelefoneAluno").value = aluno.telefone || "";
        document.getElementById("editNascimentoAluno").value = aluno.nascimento || aluno.data_nascimento || "";
        document.getElementById("editStatusAluno").value = aluno.status || "ativo";
        document.getElementById("editObservacoesAluno").value = aluno.observacoes || "";

        // Endereço
        const end = aluno.endereco || {};
        document.getElementById("editCepAluno").value = end.cep || "";
        document.getElementById("editLogradouroAluno").value = end.logradouro || "";
        document.getElementById("editNumeroAluno").value = end.numero || "";
        document.getElementById("editBairroAluno").value = end.bairro || "";
        document.getElementById("editCidadeAluno").value = end.cidade || "";
        document.getElementById("editEstadoAluno").value = end.estado || "";

        // Abre o modal de edição
        const modalEl = document.getElementById("modalEditarAluno");
        if (modalEl && window.bootstrap) {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }
        return;
    }

    if (btn.classList.contains("btn-excluir")) {
        const aluno = listaAlunos.find(a => a.id === id);
        if (!aluno) return;

        document.getElementById("excluirAlunoId").value = aluno.id;
        document.getElementById("nomeAlunoExcluir").textContent = aluno.nome || "este aluno";

        const modalEl = document.getElementById("modalExcluirAluno");
        if (modalEl && window.bootstrap) {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }
        return;
    }

    // ⬇️ NOVO: Restaurar aluno
    if (btn.classList.contains("btn-restaurar")) {
        const aluno = listaAlunos.find(a => a.id === id);
        if (!aluno) return;

        document.getElementById("restaurarAlunoId").value = aluno.id;
        document.getElementById("nomeAlunoRestaurar").textContent = aluno.nome || "este aluno";

        const modalEl = document.getElementById("modalRestaurarAluno");
        if (modalEl && window.bootstrap) {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }
        return;
    }
});

// Busca
document.addEventListener("DOMContentLoaded", () => {
    const busca = document.getElementById("inputBuscaAluno");
    if (busca) busca.addEventListener("input", renderizar);
});


/* ==========================================================================
 * CONFIRMAR MUDANÇA DE STATUS (agora usa o service)
 * ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const btnConfirmar = document.getElementById("btnConfirmarStatusAluno");
    if (!btnConfirmar) return;

    btnConfirmar.addEventListener("click", async () => {
        const id = document.getElementById("confirmStatusAlunoId")?.value;
        if (!id) return;

        const aluno = listaAlunos.find(a => a.id === id);
        if (!aluno) return;

        const statusAtual = (aluno.status || "ativo").toLowerCase();
        const novoStatus = statusAtual === "ativo" ? "inativo" : "ativo";
        const acaoPassada = novoStatus === "inativo" ? "inativado" : "reativado";

        const txt = btnConfirmar.innerHTML;
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Processando...`;

        try {
            // ⬇️ Agora chama o service (que grava auditoria)
            await alterarStatusAlunoBackend(id, statusAtual);

            const modalEl = document.getElementById("modalConfirmarStatusAluno");
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();

            notificar(`Aluno ${acaoPassada} com sucesso.`, "sucesso");

        } catch (error) {
            console.error("Erro:", error);
            notificar("Erro ao alterar status.", "erro");
        } finally {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = txt;
        }
    });
});

/* ==========================================================================
 * CONFIRMAR EXCLUSÃO (agora soft delete via service)
 * ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const btnConfirmar = document.getElementById("btnConfirmarExclusao");
    if (!btnConfirmar) return;

    btnConfirmar.addEventListener("click", async () => {
        const id = document.getElementById("excluirAlunoId")?.value;
        if (!id) return;

        const txt = btnConfirmar.innerHTML;
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Excluindo...`;

        try {
            // ⬇️ Agora é SOFT DELETE (não apaga) + grava auditoria
            await excluirAlunoBackend(id);

            const modalEl = document.getElementById("modalExcluirAluno");
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();

            notificar("Aluno excluído com sucesso.", "sucesso");

        } catch (error) {
            console.error("Erro ao excluir:", error);
            notificar("Erro ao excluir o aluno.", "erro");
        } finally {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = txt;
        }
    });
});

/* ==========================================================================
 * CONFIRMAR RESTAURAÇÃO (NOVO)
 * ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const btnConfirmar = document.getElementById("btnConfirmarRestaurarAluno");
    if (!btnConfirmar) return;

    btnConfirmar.addEventListener("click", async () => {
        const id = document.getElementById("restaurarAlunoId")?.value;
        if (!id) return;

        const txt = btnConfirmar.innerHTML;
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Restaurando...`;

        try {
            await restaurarAlunoBackend(id);

            const modalEl = document.getElementById("modalRestaurarAluno");
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();

            notificar("Aluno restaurado com sucesso.", "sucesso");

        } catch (error) {
            console.error("Erro ao restaurar:", error);
            notificar("Erro ao restaurar o aluno.", "erro");
        } finally {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = txt;
        }
    });
});


/* ==========================================================================
 * FORM EDITAR ALUNO → ABRE MODAL DE CONFIRMAÇÃO
 * ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const formEditar = document.getElementById("formEditarAluno");
    if (!formEditar) return;

    formEditar.addEventListener("submit", (e) => {
        e.preventDefault();

        const alunoId = document.getElementById("editAlunoId")?.value;
        if (!alunoId) {
            notificar("ID do aluno não encontrado.", "erro");
            return;
        }

        // Coleta dados atualizados
        const dadosAtualizados = {
            nome: document.getElementById("editNomeAluno")?.value.trim() || "",
            email: document.getElementById("editEmailAluno")?.value.trim() || "",
            cpf: document.getElementById("editCpfAluno")?.value.trim() || "",
            telefone: document.getElementById("editTelefoneAluno")?.value.trim() || "",
            nascimento: document.getElementById("editNascimentoAluno")?.value || "",
            status: document.getElementById("editStatusAluno")?.value || "ativo",
            observacoes: document.getElementById("editObservacoesAluno")?.value.trim() || "",
            endereco: {
                cep: document.getElementById("editCepAluno")?.value.trim() || "",
                logradouro: document.getElementById("editLogradouroAluno")?.value.trim() || "",
                numero: document.getElementById("editNumeroAluno")?.value.trim() || "",
                bairro: document.getElementById("editBairroAluno")?.value.trim() || "",
                cidade: document.getElementById("editCidadeAluno")?.value.trim() || "",
                estado: document.getElementById("editEstadoAluno")?.value.trim() || ""
            }
        };

        // Compara com o estado anterior
        const antes = window.__alunoAntesEdicao || {};
        const alteracoes = compararAlteracoes(antes, dadosAtualizados);

        // Guarda para usar quando confirmar
        window.__alteracoesPendentes = { alunoId, dadosAtualizados, alteracoes };

        // Preenche o modal de confirmação
        document.getElementById("confirmAlteracoesAlunoNome").textContent = antes.nome || "Aluno(a)";

        const listaEl = document.getElementById("confirmAlteracoesLista");
        if (alteracoes.length === 0) {
            listaEl.innerHTML = `<p class="text-muted small text-center py-2">Nenhuma alteração detectada.</p>`;
        } else {
            listaEl.innerHTML = `
                <small class="text-muted d-block mb-2 fw-semibold">Campos alterados (${alteracoes.length}):</small>
                <div class="table-responsive" style="max-height: 250px; overflow-y: auto;">
                    <table class="table table-sm align-middle mb-0" style="font-size: 0.82rem;">
                        <thead class="table-light">
                            <tr><th>Campo</th><th>Antes</th><th>Depois</th></tr>
                        </thead>
                        <tbody>
                            ${alteracoes.map(a => `
                                <tr>
                                    <td><strong>${a.rotulo || a.campo}</strong></td>
                                    <td class="text-muted">${a.valor_anterior !== null && a.valor_anterior !== "" ? String(a.valor_anterior) : "—"}</td>
                                    <td class="text-success">${a.valor_novo !== null && a.valor_novo !== "" ? String(a.valor_novo) : "—"}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Fecha o modal de edição e abre o de confirmação
        const modalEditar = bootstrap.Modal.getInstance(document.getElementById("modalEditarAluno"));
        if (modalEditar) modalEditar.hide();

        const modalConfirm = document.getElementById("modalConfirmarAlteracoesAluno");
        if (modalConfirm && window.bootstrap) {
            const modal = bootstrap.Modal.getInstance(modalConfirm) || new bootstrap.Modal(modalConfirm);
            modal.show();
        }
    });

    /* ==========================================================================
     * CONFIRMAR ALTERAÇÕES
     * ========================================================================== */
    const btnConfirmar = document.getElementById("btnConfirmarAlteracoesAluno");
    if (btnConfirmar) {
        btnConfirmar.addEventListener("click", async () => {
            const pendentes = window.__alteracoesPendentes;
            if (!pendentes) return;

            const { alunoId, dadosAtualizados, alteracoes } = pendentes;

            const txt = btnConfirmar.innerHTML;
            btnConfirmar.disabled = true;
            btnConfirmar.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Salvando...`;

            try {
                // Atualiza no Firestore
                await updateDoc(doc(db, "alunos", alunoId), {
                    ...dadosAtualizados,
                    atualizado_em: new Date().toISOString()
                });

                // Registra auditoria
                if (alteracoes.length > 0) {
                    await registrarAuditoriaAluno(alunoId, {
                        tipo: "alteracao",
                        entidade: "aluno",
                        descricao: `${alteracoes.length} campo(s) alterado(s)`,
                        campos_alterados: alteracoes
                    });
                }

                // Fecha modal
                const modalEl = document.getElementById("modalConfirmarAlteracoesAluno");
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) modalInstance.hide();

                notificar("Alterações salvas com sucesso.", "sucesso");

                window.__alteracoesPendentes = null;
                window.__alunoAntesEdicao = null;

            } catch (error) {
                console.error("Erro ao salvar:", error);
                notificar("Erro ao salvar alterações.", "erro");
            } finally {
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = txt;
            }
        });
    }
});

/* ==========================================================================
 * BOTÃO "VER INATIVOS" / "VER ATIVOS"
 * ========================================================================== */
const btnVerInativos = document.getElementById("btn-alternar-alunos-inativos");
if (btnVerInativos) {
    btnVerInativos.addEventListener("click", () => {
        filtroInativos = !filtroInativos;
        filtroExcluidos = false; // desliga excluídos ao alternar inativos

        // Reseta o botão de excluídos
        const btnExcluidos = document.getElementById("btn-alternar-alunos-excluidos");
        if (btnExcluidos) {
            btnExcluidos.innerHTML = `<i class="fas fa-trash-alt me-1"></i> Mostrar Excluídos`;
            btnExcluidos.classList.remove("active", "btn-danger");
            btnExcluidos.classList.add("btn-outline-danger");
        }

        btnVerInativos.innerHTML = filtroInativos
            ? `<i class="fas fa-eye me-1"></i> Ver Ativos`
            : `<i class="fas fa-eye-slash me-1"></i> Ver Inativos`;

        iniciarEscutaAlunos();
        renderizar();
    });
}

/* ==========================================================================
 * BOTÃO "MOSTRAR EXCLUÍDOS" (NOVO)
 * ========================================================================== */
const btnExcluidos = document.getElementById("btn-alternar-alunos-excluidos");
if (btnExcluidos) {
    btnExcluidos.addEventListener("click", () => {
        filtroExcluidos = !filtroExcluidos;

        // Ao ligar excluídos, desliga inativos
        if (filtroExcluidos) {
            filtroInativos = false;
            if (btnVerInativos) {
                btnVerInativos.innerHTML = `<i class="fas fa-eye-slash me-1"></i> Ver Inativos`;
            }
        }

        btnExcluidos.innerHTML = filtroExcluidos
            ? `<i class="fas fa-users me-1"></i> Ver Ativos`
            : `<i class="fas fa-trash-alt me-1"></i> Mostrar Excluídos`;

        btnExcluidos.classList.toggle("active", filtroExcluidos);
        btnExcluidos.classList.toggle("btn-danger", filtroExcluidos);
        btnExcluidos.classList.toggle("btn-outline-danger", !filtroExcluidos);

        iniciarEscutaAlunos();
        renderizar();
    });
}

/* ==========================================================================
 * FORM NOVO ALUNO
 * ========================================================================== */
const formNovoAluno = document.getElementById("formNovoAluno");
if (formNovoAluno) {
    formNovoAluno.addEventListener("submit", async (e) => {
        e.preventDefault();

        const dados = {
            nome: document.getElementById("nomeAluno")?.value.trim() || "",
            email: document.getElementById("emailAluno")?.value.trim() || "",
            cpf: document.getElementById("cpfAluno")?.value.trim() || "",
            telefone: document.getElementById("telefoneAluno")?.value.trim() || "",
            nascimento: document.getElementById("nascimentoAluno")?.value || "",
            status: document.getElementById("statusAluno")?.value || "ativo",
            observacoes: document.getElementById("observacoesAluno")?.value.trim() || "",
            endereco: {
                cep: document.getElementById("cepAluno")?.value.trim() || "",
                logradouro: document.getElementById("enderecoLogradouro")?.value.trim() || "",
                numero: document.getElementById("enderecoNumero")?.value.trim() || "",
                bairro: document.getElementById("enderecoBairro")?.value.trim() || "",
                cidade: document.getElementById("enderecoCidade")?.value.trim() || "",
                estado: document.getElementById("enderecoEstado")?.value.trim() || ""
            }
        };

        if (!dados.nome || !dados.email) {
            notificar("Preencha nome e e-mail.", "aviso");
            return;
        }

        const btnSubmit = formNovoAluno.querySelector('button[type="submit"]');
        const txt = btnSubmit ? btnSubmit.innerHTML : "";
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Salvando...`;
        }

        try {
            await addDoc(collection(db, "alunos"), {
                ...dados,
                excluido: false,
                criado_em: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            });

            const modalEl = document.getElementById("modalNovoAluno");
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();

            formNovoAluno.reset();
            notificar("Aluno cadastrado com sucesso.", "sucesso");
        } catch (error) {
            console.error("Erro ao cadastrar aluno:", error);
            notificar("Erro ao cadastrar o aluno.", "erro");
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = txt;
            }
        }
    });
}


/* ==========================================================================
 * VIACEP — Autopreenchimento genérico de endereço
 * ========================================================================== */
function configurarViaCEP({ inputCepId, mapaCampos = {}, campoFocoId = null }) {
    const cepInput = document.getElementById(inputCepId);
    if (!cepInput) return;

    // Máscara enquanto digita
    cepInput.addEventListener("input", (e) => {
        let v = e.target.value.replace(/\D/g, "").substring(0, 8);
        if (v.length > 5) v = v.replace(/^(\d{5})(\d{0,3})/, "$1-$2");
        e.target.value = v;
    });

    // Busca ao sair do campo
    cepInput.addEventListener("blur", async (e) => {
        const cep = e.target.value.replace(/\D/g, "");
        if (cep.length !== 8) return;

        const elLogradouro = mapaCampos.logradouro
            ? document.getElementById(mapaCampos.logradouro)
            : null;
        const placeholderOriginal = elLogradouro?.placeholder || "";
        if (elLogradouro) elLogradouro.placeholder = "Buscando...";

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();

            if (data.erro) {
                notificar("CEP não encontrado.", "aviso");
                if (elLogradouro) elLogradouro.placeholder = placeholderOriginal;
                return;
            }

            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || "";
            };

            setVal(mapaCampos.logradouro, data.logradouro);
            setVal(mapaCampos.bairro, data.bairro);
            setVal(mapaCampos.cidade, data.localidade);
            setVal(mapaCampos.estado, data.uf);

            if (campoFocoId) document.getElementById(campoFocoId)?.focus();

            notificar("Endereço preenchido automaticamente.", "sucesso");

        } catch (err) {
            console.error("Erro ViaCEP:", err);
            notificar("Erro ao buscar CEP.", "erro");
        } finally {
            if (elLogradouro) elLogradouro.placeholder = placeholderOriginal;
        }
    });
}

/* ==========================================================================
 * REGISTRA O VIACEP NOS DOIS MODAIS
 * ========================================================================== */
configurarViaCEP({
    inputCepId: "editCepAluno",
    mapaCampos: {
        logradouro: "editLogradouroAluno",
        bairro: "editBairroAluno",
        cidade: "editCidadeAluno",
        estado: "editEstadoAluno"
    },
    campoFocoId: "editNumeroAluno"
});

configurarViaCEP({
    inputCepId: "cepAluno",
    mapaCampos: {
        logradouro: "enderecoLogradouro",
        bairro: "enderecoBairro",
        cidade: "enderecoCidade",
        estado: "enderecoEstado"
    },
    campoFocoId: "enderecoNumero"
});

/* ==========================================================================
 * DEBUG
 * ========================================================================== */
window.__alunosDebug = {
    get alunos() { return listaAlunos; },
    get matriculas() { return matriculasPorAluno; },
    get filtroInativos() { return filtroInativos; },
    get filtroExcluidos() { return filtroExcluidos; },
    refresh: () => renderizar()
};

console.log("✅ [alunos-ui] listeners registrados. Use __alunosDebug no console.");
console.log("✅ [alunos-ui] listeners registrados");