// ==========================================================================
// TRAINING WORK — UI: EDITAR PERFIL DO ADMIN
// ==========================================================================

import { notificar } from "../modules/notificacao.js";
import { obterPerfil, atualizarPerfil, enviarResetSenha } from "../backend/perfil-service.js";

let _modalPerfilInstance = null;

/* ==========================================================================
 * HTML DO MODAL DE PERFIL
 * ========================================================================== */
const HTML_MODAL_PERFIL = `
<div class="modal fade" id="modalEditarPerfil" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg rounded-4">
            <div class="modal-header border-bottom px-4 py-3">
                <h5 class="modal-title fw-bold text-dark m-0">
                    <i class="fas fa-user-edit text-primary me-2"></i> Editar Perfil
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body p-4">
                <div class="text-center mb-4">
                    <div class="perfil-avatar mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle" id="perfilAvatarIniciais">
                        <span class="perfil-avatar-iniciais">?</span>
                    </div>
                    <h5 class="fw-bold text-dark mb-1" id="perfilNomeExibir">—</h5>
                    <small class="text-muted" id="perfilEmailExibir">—</small>
                </div>
                <hr class="my-3">
                <div class="mb-3">
                    <label class="form-label small fw-semibold text-muted mb-1">Nome de exibição</label>
                    <input type="text" class="form-control form-control-sm" id="perfilNomeInput" placeholder="Seu nome completo">
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-semibold text-muted mb-1">Telefone / WhatsApp</label>
                    <input type="tel" class="form-control form-control-sm" id="perfilTelefoneInput" placeholder="(00) 00000-0000">
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-semibold text-muted mb-1">Cargo / Função</label>
                    <input type="text" class="form-control form-control-sm" id="perfilCargoInput" placeholder="Ex: Administrador, Vendedor">
                </div>
                <div class="perfil-info-readonly alert alert-light border small mb-0">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted">E-mail:</span>
                        <strong id="perfilEmailInfo">—</strong>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted">Último login:</span>
                        <strong id="perfilUltimoLogin">—</strong>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span class="text-muted">Criado em:</span>
                        <strong id="perfilCriadoEm">—</strong>
                    </div>
                </div>
                <div class="mt-3">
                    <button type="button" class="btn btn-outline-warning btn-sm rounded-pill" id="btnEnviarResetSenha">
                        <i class="fas fa-key me-1"></i> Redefinir minha senha
                    </button>
                    <small class="text-muted d-block mt-2 perfil-aviso-reset">
                        Você receberá um e-mail com link para criar uma nova senha
                    </small>
                </div>
            </div>
            <div class="modal-footer bg-light px-4 py-3 border-top">
                <button type="button" class="btn btn-light px-4 rounded-pill fw-semibold" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary px-4 rounded-pill fw-semibold" id="btnSalvarPerfil">
                    <i class="fas fa-save me-1"></i> Salvar Perfil
                </button>
            </div>
        </div>
    </div>
</div>
`;

/* ==========================================================================
 * HTML DO MODAL DE CONFIRMAÇÃO (INJETADO INTERNAMENTE)
 * ========================================================================== */
const HTML_MODAL_CONFIRM = `
<div class="modal fade" id="modalConfirmarResetSenha" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" width: 300px; style="max-width: 350px;">
        <div class="modal-content border-0 shadow-lg rounded-4">
            <div class="modal-body text-center p-4">
                <div class="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle" style="width: 64px; height: 64px; background: #fef3c7; color: #d97706;">
                    <i class="fas fa-key fa-2x"></i>
                </div>
                <h5 class="fw-bold mb-2">Redefinir Senha?</h5>
                <p class="text-muted small mb-4">Deseja receber um e-mail para redefinir sua senha?</p>
                <div class="d-flex gap-2 justify-content-center">
                    <button type="button" class="btn btn-light px-3 rounded-pill btn-sm" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-warning px-3 rounded-pill btn-sm" id="btnConfirmarResetSenha">
                        <i class="fas fa-paper-plane me-1"></i> Enviar E-mail
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
`;

/* ==========================================================================
 * HTML DO MODAL DE CONFIRMAÇÃO DE SALVAR PERFIL
 * ========================================================================== */
const HTML_MODAL_CONFIRM_SAVE = `
<div class="modal fade" id="modalConfirmarSalvarPerfil" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" style="max-width: 400px;">
        <div class="modal-content border-0 shadow-lg rounded-4">
            <div class="modal-body text-center p-4">
                <div class="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle" style="width: 64px; height: 64px; background: #e0f2fe; color: #0284c7;">
                    <i class="fas fa-save fa-2x"></i>
                </div>
                <h5 class="fw-bold mb-2">Salvar Alterações?</h5>
                <p class="text-muted small mb-4">Deseja realmente atualizar seus dados de perfil?</p>
                <div class="d-flex gap-2 justify-content-center">
                    <button type="button" class="btn btn-light px-3 rounded-pill btn-sm" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-primary px-3 rounded-pill btn-sm" id="btnConfirmarSalvarPerfil">
                        <i class="fas fa-check me-1"></i> Salvar
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
`;

/* ==========================================================================
 * INJETA OS MODAIS NO DOM
 * ========================================================================== */
function injetarModais() {
    if (!document.getElementById("modalEditarPerfil")) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = HTML_MODAL_PERFIL.trim();
        document.body.appendChild(wrapper.firstChild);
    }
    if (!document.getElementById("modalConfirmarResetSenha")) {
        const wrapperConfirm = document.createElement("div");
        wrapperConfirm.innerHTML = HTML_MODAL_CONFIRM.trim();
        document.body.appendChild(wrapperConfirm.firstChild);
    }

    if (!document.getElementById("modalConfirmarSalvarPerfil")) {
        const wrapperConfirmSave = document.createElement("div");
        wrapperConfirmSave.innerHTML = HTML_MODAL_CONFIRM_SAVE.trim();
        document.body.appendChild(wrapperConfirmSave.firstChild);
    }
}

/* ==========================================================================
 * ABRE O MODAL DE PERFIL
 * ========================================================================== */
window.abrirModalPerfil = async function () {
    try {
        injetarModais();
        const modalEl = document.getElementById("modalEditarPerfil");
        if (!modalEl) return;

        if (!_modalPerfilInstance && window.bootstrap) {
            _modalPerfilInstance = new bootstrap.Modal(modalEl);
        }

        const perfil = await obterPerfil();
        const iniciais = gerarIniciais(perfil.nome);

        document.getElementById("perfilAvatarIniciais").innerHTML = `<span class="perfil-avatar-iniciais">${iniciais}</span>`;
        document.getElementById("perfilNomeExibir").textContent = perfil.nome || "Sem nome";
        document.getElementById("perfilEmailExibir").textContent = perfil.email || "—";
        document.getElementById("perfilNomeInput").value = perfil.nome || "";
        document.getElementById("perfilTelefoneInput").value = perfil.telefone || "";
        document.getElementById("perfilCargoInput").value = perfil.cargo || "";
        document.getElementById("perfilEmailInfo").textContent = perfil.email || "—";
        document.getElementById("perfilUltimoLogin").textContent = formatarData(perfil.ultimo_login);
        document.getElementById("perfilCriadoEm").textContent = formatarData(perfil.criado_em);

        if (_modalPerfilInstance) _modalPerfilInstance.show();

    } catch (err) {
        console.error("Erro ao abrir perfil:", err);
        notificar("Erro ao carregar perfil.", "erro");
    }
};

/* ==========================================================================
 * CONFIGURAÇÃO DOS EVENTOS (SALVAR E RESET)
 * ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    injetarModais();

        // --- BOTÃO SALVAR PERFIL ---
    const btnSalvar = document.getElementById("btnSalvarPerfil");
    if (btnSalvar) {
        btnSalvar.addEventListener("click", () => {
            // Abre o modal de confirmação customizado
            const modalConfirmEl = document.getElementById("modalConfirmarSalvarPerfil");
            if (modalConfirmEl) {
                const modalConfirm = new bootstrap.Modal(modalConfirmEl);
                modalConfirm.show();
            }
        });
    }

    // --- BOTÃO CONFIRMAR SALVAR (DENTRO DO NOVO MODAL) ---
    const btnConfirmarSalvar = document.getElementById("btnConfirmarSalvarPerfil");
    if (btnConfirmarSalvar) {
        btnConfirmarSalvar.addEventListener("click", async () => {
            const modalConfirmEl = document.getElementById("modalConfirmarSalvarPerfil");
            const modalConfirm = bootstrap.Modal.getInstance(modalConfirmEl);
            if (modalConfirm) modalConfirm.hide();

            const btnSalvar = document.getElementById("btnSalvarPerfil");
            const txt = btnSalvar.innerHTML;
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Salvando...`;

            try {
                await atualizarPerfil({
                    nome: document.getElementById("perfilNomeInput").value.trim(),
                    telefone: document.getElementById("perfilTelefoneInput").value.trim(),
                    cargo: document.getElementById("perfilCargoInput").value.trim()
                });

                if (_modalPerfilInstance) _modalPerfilInstance.hide();
                notificar("Perfil atualizado com sucesso.", "sucesso");
            } catch (err) {
                console.error("Erro ao salvar perfil:", err);
                notificar("Erro ao salvar perfil.", "erro");
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = txt;
            }
        });
    }

    // Função auxiliar para realizar o salvamento
    async function salvarPerfilReal(nome, telefone, cargo, btnSalvar) {
        const txt = btnSalvar.innerHTML;
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Salvando...`;

        try {
            await atualizarPerfil({ nome, telefone, cargo });
            if (_modalPerfilInstance) _modalPerfilInstance.hide();
            notificar("Perfil atualizado com sucesso.", "sucesso");
        } catch (err) {
            console.error("Erro ao salvar perfil:", err);
            notificar("Erro ao salvar perfil.", "erro");
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = txt;
        }
    }
    // --- BOTÃO RESET DE SENHA (ABRE MODAL) ---
    const btnReset = document.getElementById("btnEnviarResetSenha");
    if (btnReset) {
        btnReset.addEventListener("click", () => {
            const modalConfirmEl = document.getElementById("modalConfirmarResetSenha");
            if (modalConfirmEl) {
                const modalConfirm = new bootstrap.Modal(modalConfirmEl);
                modalConfirm.show();
            }
        });
    }

    // --- BOTÃO CONFIRMAR RESET (DENTRO DO MODAL) ---
    const btnConfirmarReset = document.getElementById("btnConfirmarResetSenha");
    if (btnConfirmarReset) {
        btnConfirmarReset.addEventListener("click", async () => {
            const modalConfirmEl = document.getElementById("modalConfirmarResetSenha");
            const modalConfirm = bootstrap.Modal.getInstance(modalConfirmEl);
            if (modalConfirm) modalConfirm.hide();

            const txt = btnReset.innerHTML;
            btnReset.disabled = true;
            btnReset.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Enviando...`;

            try {
                await enviarResetSenha();
                notificar("E-mail enviado! Verifique sua caixa de entrada.", "sucesso");
            } catch (err) {
                console.error("Erro ao enviar reset:", err);
                notificar("Erro ao enviar e-mail de redefinição.", "erro");
            } finally {
                btnReset.disabled = false;
                btnReset.innerHTML = txt;
            }
        });
    }

    // --- LINK "EDITAR PERFIL" NO SIDEBAR ---
    const linkEditar = document.querySelector('a[href="#editar-perfil"]');
    if (linkEditar) {
        linkEditar.addEventListener("click", (e) => {
            e.preventDefault();
            window.abrirModalPerfil();
        });
    }
});

/* ==========================================================================
 * HELPERS
 * ========================================================================== */
function formatarData(iso) {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
    } catch { return iso; }
}

function gerarIniciais(nome) {
    if (!nome) return "?";
    const partes = nome.trim().split(/\s+/).filter(p => p.length > 0);
    if (partes.length === 0) return "?";
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    const primeira = partes[0][0];
    const ultima = partes[partes.length - 1][0];
    return (primeira + ultima).toUpperCase();
}