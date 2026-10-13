// ==========================================================================
// TRAINING WORK — UI: FICHA DO ALUNO (com abas)
// ==========================================================================
import { listarAuditoriaAluno } from "../backend/auditoria-service.js";
import { notificar } from "../modules/notificacao.js";
import { obterFichaCompleta } from "../backend/aluno-ficha-service.js";

let _fichaModalInstance = null;
let _fichaAlunoAtual = null;

/* ==========================================================================
 * API PÚBLICA — abre a ficha
 * ========================================================================== */
window.abrirFichaAluno = async function (alunoId) {
    try {
        // 1. Fecha modais abertos
        document.querySelectorAll(".modal.show").forEach(m => {
            const inst = bootstrap.Modal.getInstance(m);
            if (inst) inst.hide();
        });

        // 2. Remove backdrops órfãos
        document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());
        document.body.classList.remove("modal-open");
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";

        // 3. Pega o modal
        const modalEl = document.getElementById("modalFichaAluno");
        if (!modalEl) {
            console.error("❌ #modalFichaAluno não encontrado");
            notificar("Erro: modal não encontrado.", "erro");
            return;
        }

        // 4. Cria instância se não existe
        if (!_fichaModalInstance) {
            _fichaModalInstance = new bootstrap.Modal(modalEl);
        }

        // 5. BUSCA OS DADOS PRIMEIRO
        console.log("🔵 [ficha] Buscando dados de:", alunoId);
        const ficha = await obterFichaCompleta(alunoId);
        console.log("🔵 [ficha] Dados carregados:", ficha);
        _fichaAlunoAtual = ficha;

        // 6. Restaura HTML original (se já foi mexido antes)
        const conteudo = document.getElementById("fichaConteudo");
        if (window.__fichaConteudoOriginalHTML) {
            conteudo.innerHTML = window.__fichaConteudoOriginalHTML;
        } else {
            window.__fichaConteudoOriginalHTML = conteudo.innerHTML;
        }

        // 7. Preenche os dados
        renderizarCabecalho(ficha.aluno);
        ativarAba("pessoais");
        renderizarAbaPessoais(ficha);
        renderizarAbaMatriculas(ficha);
        renderizarAbaFinanceiro(ficha);
        renderizarAbaHistorico(alunoId);
        console.log("🔵 [ficha] Abas renderizadas");

        // 8. Mostra o modal
        _fichaModalInstance.show();
        console.log("🔵 [ficha] Modal.show() chamado");

    } catch (err) {
        console.error("❌ [ficha] ERRO:", err);
        console.error("❌ [ficha] Stack:", err.stack);
        notificar("Erro ao carregar ficha do aluno.", "erro");
    }
};

/* ==========================================================================
 * CABEÇALHO
 * ========================================================================== */
function renderizarCabecalho(aluno) {
    const nome = aluno.nome || aluno.nome_completo || "Aluno";
    const email = aluno.email || "—";
    const cpf = aluno.cpf || "—";

    const elNome = document.getElementById("fichaNome");
    const elEmail = document.getElementById("fichaEmail");
    const elCpf = document.getElementById("fichaCpf");

    if (elNome) elNome.textContent = nome;
    if (elEmail) elEmail.textContent = email;
    if (elCpf) elCpf.textContent = `CPF ${cpf}`;
}

/* ==========================================================================
 * CONTROLE DE ABAS
 * ========================================================================== */
function ativarAba(aba) {
    document.querySelectorAll(".ficha-tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.aba === aba);
    });
    document.querySelectorAll(".ficha-tab-pane").forEach(pane => {
        pane.classList.toggle("d-none", pane.dataset.aba !== aba);
    });
}

/* ==========================================================================
 * ABA 1 — DADOS PESSOAIS
 * ========================================================================== */
function renderizarAbaPessoais(ficha) {
    const a = ficha.aluno;
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
    };

    setVal("fichaNomeInput", a.nome);
    setVal("fichaEmailInput", a.email);
    setVal("fichaCpfInput", a.cpf);
    setVal("fichaTelefoneInput", a.telefone);
    setVal("fichaNascimentoInput", a.nascimento || a.data_nascimento);
    setVal("fichaObservacoesInput", a.observacoes);

    const end = a.endereco || {};
    setVal("fichaCepInput", end.cep);
    setVal("fichaLogradouroInput", end.logradouro);
    setVal("fichaNumeroInput", end.numero);
    setVal("fichaBairroInput", end.bairro);
    setVal("fichaCidadeInput", end.cidade);
    setVal("fichaEstadoInput", end.estado);
}

/* ==========================================================================
 * ABA 2 — MATRÍCULAS
 * ========================================================================== */
function renderizarAbaMatriculas(ficha) {
    const container = document.getElementById("fichaMatriculasContainer");
    if (!container) return;

    const matriculas = ficha.matriculas || [];

    if (matriculas.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-graduation-cap fa-3x text-muted opacity-50 mb-3"></i>
                <p class="text-muted">Este aluno ainda não tem matrículas.</p>
            </div>
        `;
        return;
    }

    let html = "";
    matriculas.forEach(m => {
        const freq = m._frequencia || { taxa: 0, total_aulas: 0, presencas: 0 };
        const apto = freq.taxa >= 75 && freq.total_aulas > 0;

        let badgeClasse = "bg-danger";
        if (freq.taxa >= 75) badgeClasse = "bg-success";
        else if (freq.taxa >= 50) badgeClasse = "bg-warning text-dark";

        const statusLower = String(m.status || "").toLowerCase();
        let statusClasse = "bg-secondary";
        if (statusLower.includes("cursando") || statusLower.includes("matricul")) statusClasse = "bg-primary";
        else if (statusLower.includes("conclu")) statusClasse = "bg-success";
        else if (statusLower.includes("cancel")) statusClasse = "bg-danger";

        html += `
            <div class="card border shadow-sm mb-3 rounded-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                        <div>
                            <h6 class="fw-bold text-dark mb-1">${m.curso_nome || "Curso não informado"}</h6>
                            <small class="text-muted font-monospace">${m.turma_codigo || m.turma_id || "—"}</small>
                        </div>
                        <div class="d-flex gap-2">
                            <span class="badge ${statusClasse}">${m.status || "—"}</span>
                            <span class="badge ${badgeClasse}">${freq.taxa}% frequência</span>
                        </div>
                    </div>

                    <div class="row g-2 mb-3 text-sm small">
                        <div class="col-md-3">
                            <span class="text-muted d-block">📅 Matrícula</span>
                            <strong>${formatarData(m.data_matricula)}</strong>
                        </div>
                        <div class="col-md-3">
                            <span class="text-muted d-block">📚 Aulas</span>
                            <strong>${freq.total_aulas}</strong>
                        </div>
                        <div class="col-md-3">
                            <span class="text-muted d-block">✅ Presenças</span>
                            <strong class="text-success">${freq.presencas}</strong>
                        </div>
                        <div class="col-md-3">
                            <span class="text-muted d-block">🎯 Apto a Certificado</span>
                            <strong class="${apto ? 'text-success' : 'text-danger'}">${apto ? "✅ Sim" : "❌ Não"}</strong>
                        </div>
                    </div>

                    <div class="d-flex gap-2 flex-wrap">
                        <button class="btn btn-sm btn-outline-primary rounded-pill btn-ficha-frequencia" data-matricula-id="${m.id}">
                            <i class="fas fa-chart-line me-1"></i> Ver Frequência
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/* ==========================================================================
 * ABA 3 — FINANCEIRO
 * ========================================================================== */
function renderizarAbaFinanceiro(ficha) {
    const container = document.getElementById("fichaFinanceiroContainer");
    if (!container) return;

    const matriculas = ficha.matriculas || [];
    const resumo = ficha.financeiro || { total_geral: 0, total_pago: 0, total_pendente: 0 };

    let cardsResumo = `
        <div class="row g-3 mb-4">
            <div class="col-md-4">
                <div class="card border-0 shadow-sm p-3 rounded-3">
                    <small class="text-muted text-uppercase fw-semibold" style="font-size:0.72rem;">Total Geral</small>
                    <h4 class="mb-0 fw-bold text-dark">${formatarMoeda(resumo.total_geral)}</h4>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card border-0 shadow-sm p-3 rounded-3">
                    <small class="text-muted text-uppercase fw-semibold" style="font-size:0.72rem;">Pago</small>
                    <h4 class="mb-0 fw-bold text-success">${formatarMoeda(resumo.total_pago)}</h4>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card border-0 shadow-sm p-3 rounded-3">
                    <small class="text-muted text-uppercase fw-semibold" style="font-size:0.72rem;">Pendente</small>
                    <h4 class="mb-0 fw-bold text-warning">${formatarMoeda(resumo.total_pendente)}</h4>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = cardsResumo;
}

/* ==========================================================================
 * HELPERS
 * ========================================================================== */
function formatarData(iso) {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString("pt-BR");
    } catch { return iso; }
}

function formatarMoeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ==========================================================================
 * EVENTOS
 * ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("click", (e) => {
        const btnTab = e.target.closest(".ficha-tab-btn");
        if (btnTab) {
            ativarAba(btnTab.dataset.aba);
            return;
        }
    });
});

/* ==========================================================================
 * ABA 4 — HISTÓRICO
 * ========================================================================== */
async function renderizarAbaHistorico(alunoId) {
    const container = document.getElementById("fichaHistoricoContainer");
    if (!container) return;

    try {
        const logs = await listarAuditoriaAluno(alunoId, 50);

        if (logs.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-history fa-3x text-muted opacity-50 mb-3"></i>
                    <p class="text-muted">Nenhuma alteração registrada ainda.</p>
                </div>
            `;
            return;
        }

        let html = `<div class="timeline">`;

        logs.forEach(log => {
            const data = log.criado_em ? new Date(log.criado_em) : null;
            const dataFmt = data
                ? `${data.toLocaleDateString("pt-BR")} às ${data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : "—";

            let icone = "fa-edit", cor = "#0284c7", bg = "#e0f2fe";
            if (log.tipo === "criacao") { icone = "fa-plus"; cor = "#16a34a"; bg = "#dcfce7"; }
            else if (log.tipo === "exclusao") { icone = "fa-trash"; cor = "#dc2626"; bg = "#fee2e2"; }
            else if (log.tipo === "status") { icone = "fa-toggle-on"; cor = "#d97706"; bg = "#fef3c7"; }

            const campos = log.campos_alterados || [];
            let camposHtml = "";
            if (campos.length > 0) {
                camposHtml = `<div class="mt-2">
                    <table class="table table-sm table-borderless mb-0" style="font-size: 0.82rem;">
                        <tbody>
                            ${campos.map(c => `
                                <tr>
                                    <td class="text-muted" style="width: 30%;"><strong>${c.rotulo || c.campo}</strong></td>
                                    <td>
                                        <span class="badge bg-danger bg-opacity-10 text-danger">${formatarValor(c.valor_anterior)}</span>
                                        <i class="fas fa-arrow-right mx-1 text-muted"></i>
                                        <span class="badge bg-success bg-opacity-10 text-success">${formatarValor(c.valor_novo)}</span>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>`;
            }

            html += `
                <div class="card border-0 shadow-sm mb-3 rounded-3">
                    <div class="card-body">
                        <div class="d-flex align-items-start gap-3">
                            <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                style="width: 40px; height: 40px; background: ${bg}; color: ${cor};">
                                <i class="fas ${icone}"></i>
                            </div>
                            <div class="flex-grow-1">
                                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                                    <div>
                                        <strong class="text-dark d-block">${log.descricao || "Alteração"}</strong>
                                        <small class="text-muted"><i class="fas fa-user me-1"></i>${log.admin_email || "Sistema"}</small>
                                    </div>
                                    <small class="text-muted"><i class="far fa-clock me-1"></i>${dataFmt}</small>
                                </div>
                                ${camposHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

    } catch (err) {
        console.error("Erro ao carregar histórico:", err);
        container.innerHTML = `<p class="text-muted text-center py-4">Erro ao carregar histórico.</p>`;
    }
}

function formatarValor(v) {
    if (v === null || v === undefined || v === "") return "—";
    return String(v);
}
console.log("✅ aluno-ficha-ui.js carregado.");