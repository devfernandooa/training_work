/**
 * =========================================================================
 * TRAINING WORK — UI DE LEADS (lead-ui.js)
 * =========================================================================
 *
 * Este arquivo cuida da TELA de leads.
 *
 * O QUE É UM UI?
 * O UI pega os dados do service e mostra no HTML.
 * Ele NUNCA fala direto com o Firestore — quem faz isso é o service.
 *
 * DIVISÃO DE RESPONSABILIDADES:
 *   - lead-service.js → conversa com o Firestore
 *   - lead-ui.js      → mostra no HTML, trata cliques
 *   - lead_e_triagem.html → estrutura da página
 * =========================================================================
 */

// ✅ IMPORTS CORRIGIDOS — só funções que EXISTEM no service
import {
    escutarLeads,
    atualizarStatusLead,
    salvarEdicaoLead,
    obterLeadPorId,
    excluirLead
} from "../backend/lead-service.js";

// Referências dos modais do Bootstrap
let editModalInstance = null;
let excluirModalInstance = null;
let leadIdParaExcluir = null;

// Guarda a lista atual de leads para filtros
let listaLeadsAtual = [];


/* ==========================================================================
 * INICIALIZAÇÃO
 * ==========================================================================
 *
 * Tudo começa aqui: quando a página carrega, começamos a escutar os leads
 * no Firestore. Sempre que mudar algo, a função `renderizarTabela` roda.
 * ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 [lead-ui] Inicializando...");

    // 1. Configurar modais
    configurarModais();

    // 2. Escutar leads em tempo real
    try {
        escutarLeads((leads) => {
            console.log("📊 [lead-ui] Recebi", leads.length, "leads");
            listaLeadsAtual = leads;
            renderizarTabela(leads);
        });
    } catch (erro) {
        console.error("❌ Erro ao escutar leads:", erro);
    }

    // 3. Configurar filtros e formulários
    configurarFiltros();
    configurarFormularioEdicao();
    configurarViaCEP();
    configurarBotaoConversao();
});


/* ==========================================================================
 * MODAIS
 * ========================================================================== */

function configurarModais() {
    const modalEditEl = document.getElementById("editLeadModal");
    if (modalEditEl && window.bootstrap) {
        editModalInstance = new bootstrap.Modal(modalEditEl);
    }

    const modalExcluirEl = document.getElementById("modalConfirmarExclusao");
    if (modalExcluirEl && window.bootstrap) {
        excluirModalInstance = new bootstrap.Modal(modalExcluirEl);
    }

    // Botão de confirmar exclusão
    const btnConfirmarExclusao = document.getElementById("btn-confirmar-exclusao");
    if (btnConfirmarExclusao) {
        btnConfirmarExclusao.addEventListener("click", async () => {
            if (!leadIdParaExcluir) return;

            btnConfirmarExclusao.disabled = true;
            btnConfirmarExclusao.textContent = "A remover...";

            try {
                await excluirLead(leadIdParaExcluir);
                if (excluirModalInstance) excluirModalInstance.hide();
            } catch (erro) {
                console.error("Erro ao excluir lead:", erro);
                alert("Não foi possível excluir. Tente novamente.");
            } finally {
                btnConfirmarExclusao.disabled = false;
                btnConfirmarExclusao.textContent = "Sim, Remover";
                leadIdParaExcluir = null;
            }
        });
    }
}


/* ==========================================================================
 * RENDERIZAÇÃO DA TABELA (DESKTOP) E CARDS (MOBILE)
 * ==========================================================================
 *
 * Essa função é chamada SEMPRE que a lista de leads muda no Firestore.
 * Ela monta o HTML da tabela e dos cards mobile.
 * ========================================================================== */

function renderizarTabela(leads) {
    const tbody = document.getElementById("leads-tbody");
    const mobileContainer = document.getElementById("leads-mobile-container");
    const filterElement = document.getElementById("filter-priority");
    const filtro = filterElement ? filterElement.value : "all";

    if (!tbody) return;

    // Aplica filtro de prioridade
    const filtrados = filtro === "all"
        ? leads
        : leads.filter((l) => (l.prioridade || "Média").toLowerCase() === filtro.toLowerCase());

    // Contadores para os KPIs
    let alta = 0;
    let emAtendimento = 0;

    leads.forEach((l) => {
        const prio = (l.prioridade || "").toLowerCase();
        const stat = (l.status || "").toLowerCase();
        if (prio === "alta") alta++;
        if (stat === "em_contato" || stat === "em atendimento" || stat === "em atendimento") emAtendimento++;
    });

    const elTotal = document.getElementById("metric-total");
    const elAlta = document.getElementById("metric-alta");
    const elAtendimento = document.getElementById("metric-atendimento");

    if (elTotal) elTotal.textContent = leads.length;
    if (elAlta) elAlta.textContent = alta;
    if (elAtendimento) elAtendimento.textContent = emAtendimento;

    // Se não tem leads, mostra mensagem
    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhuma inscrição encontrada.</td></tr>`;
        if (mobileContainer) {
            mobileContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhuma inscrição encontrada.</div>`;
        }
        return;
    }

    let htmlDesktop = "";
    let htmlMobile = "";

    filtrados.forEach((lead) => {
        // ── Badge de prioridade ──
        const prioridade = lead.prioridade || "Média";
        let badgeClass = "bg-warning text-dark";
        if (prioridade.toLowerCase() === "alta") badgeClass = "bg-danger text-white";
        if (prioridade.toLowerCase() === "baixa") badgeClass = "bg-success text-white";

        const prioridadePill = `<span class="badge rounded-pill ${badgeClass} px-3 py-1" style="font-size: 0.8rem; font-weight: 500;">${prioridade}</span>`;

        // ── Badge de status ──
        const status = (lead.status || "novo").toLowerCase();
        let statusStyle = "border: 1px solid #cbd5e1; color: #64748b; background: #f8fafc;";

        if (status === "novo" || status === "pendente") {
            statusStyle = "border: 1px solid #3b82f6; color: #1d4ed8; background: #eff6ff;";
        } else if (status === "em_contato" || status === "em atendimento") {
            statusStyle = "border: 1px solid #f97316; color: #c2410c; background: #fff7ed;";
        } else if (status === "matriculado") {
            statusStyle = "border: 1px solid #22c55e; color: #15803d; background: #f0fdf4;";
        } else if (status === "cancelado" || status === "perdido") {
            statusStyle = "border: 1px solid #94a3b8; color: #475569; background: #f1f5f9;";
        }

        const statusPill = `<span class="status-pill px-3 py-1 rounded-pill d-inline-flex align-items-center gap-1" style="${statusStyle} font-size: 0.82rem; font-weight: 500;">${lead.status || "Novo"}</span>`;

        // ── Data formatada ──
        let dataFormatada = "Recente";
        if (lead.criado_em) {
            dataFormatada = new Date(lead.criado_em).toLocaleDateString("pt-BR");
        } else if (lead.data?.toDate) {
            dataFormatada = lead.data.toDate().toLocaleDateString("pt-BR");
        } else if (lead.data?.seconds) {
            dataFormatada = new Date(lead.data.seconds * 1000).toLocaleDateString("pt-BR");
        }

        // ── Botões de ação ──
        const acoesBotoes = `
            <div class="actions-group" style="display: inline-flex; gap: 0.4rem; justify-content: center;">
                <a href="https://wa.me/${lead.telefone || ""}" target="_blank"
                   class="btn-icon btn-icon-whatsapp text-decoration-none"
                   title="Contatar WhatsApp"
                   data-action="contatar"
                   data-id="${lead.id}">
                    <i class="fab fa-whatsapp"></i>
                </a>
                <button class="btn-icon btn-icon-edit btn-editar-action"
                        data-id="${lead.id}"
                        title="Editar Lead">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn-icon btn-icon-delete btn-excluir-action"
                        data-id="${lead.id}"
                        title="Excluir Lead">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        // ── Versão DESKTOP ──
        htmlDesktop += `
            <tr>
                <td>${dataFormatada}</td>
                <td>
                    <strong>${lead.nome || "Não informado"}</strong><br>
                    <small style="color: #64748b;">${lead.email || ""}</small>
                </td>
                <td>${lead.curso || "Geral"}</td>
                <td>${prioridadePill}</td>
                <td style="max-width: 250px; font-size: 0.8rem; color: #475569; line-height: 1.3;">
                    ${lead.resumo_ia || lead.mensagem || "-"}
                </td>
                <td>${statusPill}</td>
                <td style="text-align: center;">${acoesBotoes}</td>
            </tr>
        `;

        // ── Versão MOBILE ──
        htmlMobile += `
            <div class="card-lead-item" style="background: white; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div>
                        <strong>${lead.nome || "Não informado"}</strong><br>
                        <small style="color: #64748b;">${lead.email || ""}</small>
                    </div>
                    <div>${prioridadePill}</div>
                </div>
                <div style="font-size: 0.85rem; color: #475569; margin-bottom: 0.75rem;">
                    <p style="margin: 0.2rem 0;"><strong>Curso:</strong> ${lead.curso || "Geral"}</p>
                    <p style="margin: 0.2rem 0;"><strong>Análise:</strong> ${lead.resumo_ia || lead.mensagem || "-"}</p>
                    <p style="margin: 0.2rem 0;"><strong>Status:</strong> ${statusPill}</p>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; margin-top: 0.5rem; padding-top: 0.5rem;">
                    <span style="font-size: 0.75rem; color: #94a3b8;">${dataFormatada}</span>
                    <div>${acoesBotoes}</div>
                </div>
            </div>
        `;
    });

    tbody.innerHTML = htmlDesktop;
    if (mobileContainer) mobileContainer.innerHTML = htmlMobile;

    // Configura os cliques dos botões recém-criados
    configurarEventosTabela();
}


/* ==========================================================================
 * EVENTOS DA TABELA (delegação)
 * ==========================================================================
 *
 * Usamos DELEGAÇÃO: registramos o listener UMA VEZ no tbody.
 * Quando o HTML muda, os cliques continuam funcionando.
 * Isso é melhor do que registrar listener em cada botão.
 * ========================================================================== */

function configurarEventosTabela() {
    const tbody = document.getElementById("leads-tbody");
    if (!tbody) return;

    // Remove listeners antigos (evita duplicação)
    if (tbody._handler) {
        tbody.removeEventListener("click", tbody._handler);
    }

    tbody._handler = async (e) => {
        // Botão WhatsApp → marca como "em contato"
        const btnContatar = e.target.closest("[data-action='contatar']");
        if (btnContatar) {
            const id = btnContatar.getAttribute("data-id");
            try {
                await atualizarStatusLead(id, "em_contato");
            } catch (erro) {
                console.error("Erro ao atualizar status:", erro);
            }
            return;
        }

        // Botão Editar → abre modal
        const btnEditar = e.target.closest(".btn-editar-action");
        if (btnEditar) {
            const id = btnEditar.getAttribute("data-id");
            await abrirModalEdicao(id);
            return;
        }

        // Botão Excluir → abre modal de confirmação
        const btnExcluir = e.target.closest(".btn-excluir-action");
        if (btnExcluir) {
            leadIdParaExcluir = btnExcluir.getAttribute("data-id");
            if (excluirModalInstance) excluirModalInstance.show();
            return;
        }
    };

    tbody.addEventListener("click", tbody._handler);
}


/* ==========================================================================
 * MODAL DE EDIÇÃO
 * ========================================================================== */

async function abrirModalEdicao(id) {
    try {
        const lead = await obterLeadPorId(id);
        if (!lead) {
            alert("Lead não encontrado.");
            return;
        }

        preencherModalEdicao(id, lead);
    } catch (erro) {
        console.error("Erro ao abrir modal:", erro);
        alert("Erro ao carregar dados do lead.");
    }
}

function preencherModalEdicao(id, data) {
    const setVal = (elementId, val) => {
        const el = document.getElementById(elementId);
        if (el) el.value = val !== undefined && val !== null ? val : "";
    };

    const setCheck = (elementId, checked) => {
        const el = document.getElementById(elementId);
        if (el) el.checked = !!checked;
    };

    setVal("edit-lead-id", id);
    setVal("edit-nome", data.nome || data.candidato || "");
    setVal("edit-email", data.email || "");
    setVal("edit-telefone", data.telefone || "");
    setVal("edit-curso", data.curso || "");
    setVal("edit-resumo-ia", data.resumo_ia || data.mensagem || "");
    setVal("edit-status", data.status || "Novo");
    setVal("edit-prioridade", data.prioridade || "Média");

    setVal("edit-cpf", data.cpf || "");
    setVal("edit-empresa", data.empresa || "");
    setVal("edit-cargo", data.cargo || "");

    setVal("edit-cep", data.cep || "");
    setVal("edit-logradouro", data.logradouro || "");
    setVal("edit-numero", data.numero || "");
    setVal("edit-bairro", data.bairro || "");
    setVal("edit-cidade", data.cidade || "");
    setVal("edit-estado", data.estado || "");

    setVal("edit-linkedin", data.linkedin || "");
    setVal("edit-instagram", data.instagram || "");
    setVal("edit-facebook", data.facebook || "");

    setVal("input-valor-curso", data.valorCurso || "");
    setVal("select-forma-pagamento", data.formaPagamento || "Pix");
    setVal("select-status-pagamento", data.statusPagamento || "Aguardando pagamento");
    setVal("edit-obs-financeiro", data.obsFinanceiro || "");

    if (data.atualizado_por && data.atualizado_em) {
        const dataFormatada = new Date(data.atualizado_em).toLocaleString("pt-BR");
        setVal("edit-atualizado-por", `${data.atualizado_por} em ${dataFormatada}`);
    } else {
        setVal("edit-atualizado-por", "Nenhuma alteração registada anteriormente");
    }

    setCheck("edit-zap-msg", data.aceita_msg_zap);
    setCheck("edit-zap-ligacao", data.aceita_ligacao_zap);
    setCheck("edit-email-validado", data.email_validado);

    const feedbackEl = document.getElementById("feedback-matricula");
    if (feedbackEl) feedbackEl.className = "alert d-none";

    if (editModalInstance) editModalInstance.show();
}


/* ==========================================================================
 * FILTROS
 * ========================================================================== */

function configurarFiltros() {
    const filterPriority = document.getElementById("filter-priority");
    if (filterPriority) {
        filterPriority.addEventListener("change", () => {
            renderizarTabela(listaLeadsAtual);
        });
    }
}


/* ==========================================================================
 * FORMULÁRIO DE EDIÇÃO
 * ========================================================================== */

function configurarFormularioEdicao() {
    const editForm = document.getElementById("edit-lead-form");
    if (!editForm) return;

    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("edit-lead-id")?.value;
        if (!id) return;

        const btnSave = document.getElementById("btn-save-edit");
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.textContent = "A salvar...";
        }

        const getVal = (elementId) => document.getElementById(elementId)?.value || "";
        const getCheck = (elementId) => document.getElementById(elementId)?.checked || false;

        // Valida CPF (11 dígitos)
        const cpfValor = getVal("edit-cpf").replace(/\D/g, "");
        if (cpfValor.length !== 11) {
            alert("O CPF é obrigatório e deve conter exatamente 11 dígitos.");
            document.getElementById("edit-cpf")?.focus();
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.textContent = "Salvar";
            }
            return;
        }

        const dados = {
            nome: getVal("edit-nome"),
            email: getVal("edit-email"),
            telefone: getVal("edit-telefone"),
            curso: getVal("edit-curso"),
            cpf: cpfValor,
            empresa: getVal("edit-empresa"),
            cargo: getVal("edit-cargo"),
            cep: getVal("edit-cep"),
            logradouro: getVal("edit-logradouro"),
            numero: getVal("edit-numero"),
            bairro: getVal("edit-bairro"),
            cidade: getVal("edit-cidade"),
            estado: getVal("edit-estado"),
            status: getVal("edit-status"),
            prioridade: getVal("edit-prioridade"),
            linkedin: getVal("edit-linkedin"),
            instagram: getVal("edit-instagram"),
            facebook: getVal("edit-facebook"),
            resumo_ia: getVal("edit-resumo-ia"),
            aceita_msg_zap: getCheck("edit-zap-msg"),
            aceita_ligacao_zap: getCheck("edit-zap-ligacao"),
            email_validado: getCheck("edit-email-validado")
        };

        try {
            await salvarEdicaoLead(id, dados);
            if (editModalInstance) editModalInstance.hide();
        } catch (erro) {
            console.error("Erro ao salvar:", erro);
            alert("Erro ao salvar alterações.");
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.textContent = "Salvar";
            }
        }
    });
}


/* ==========================================================================
 * VIACEP (preenchimento automático de endereço)
 * ========================================================================== */

function configurarViaCEP() {
    const cepInput = document.getElementById("edit-cep");
    if (!cepInput) return;

    cepInput.addEventListener("blur", async (e) => {
        const cep = e.target.value.replace(/\D/g, "");
        if (cep.length !== 8) return;

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (!data.erro) {
                const setVal = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val || "";
                };
                setVal("edit-logradouro", data.logradouro);
                setVal("edit-bairro", data.bairro);
                setVal("edit-cidade", data.localidade);
                setVal("edit-estado", data.uf);
                document.getElementById("edit-numero")?.focus();
            }
        } catch (erro) {
            console.error("Erro ViaCEP:", erro);
        }
    });
}


/* ==========================================================================
 * BOTÃO DE CONVERSÃO EM ALUNO
 * ==========================================================================
 *
 * ⚠️ ATENÇÃO: este botão está desativado por enquanto.
 *
 * A função `processarMatriculaLead` foi removida do `lead-service.js`
 * e será refatorada num PR separado (dividir em funções menores).
 *
 * Enquanto isso, o botão mostra uma mensagem avisando.
 * ========================================================================== */

function configurarBotaoConversao() {
    const btn = document.getElementById("btn-executar-matricula");
    const feedback = document.getElementById("feedback-matricula");

    if (!btn) return;

    btn.addEventListener("click", () => {
        if (feedback) {
            feedback.className = "alert alert-warning py-2 px-3 small mb-0 d-block";
            feedback.textContent = "⚠️ A conversão em aluno será reativada após refatoração do serviço. Em desenvolvimento.";
        }
    });
}