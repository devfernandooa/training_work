// ==========================================================================
// TRAINING WORK — UI: EDITAR PERFIL DO ADMIN
// ==========================================================================
// Injeta o modal dinamicamente no DOM (funciona em qualquer tela do admin).
// ==========================================================================

import { notificar } from "../modules/notificacao.js";
import { obterPerfil, atualizarPerfil, enviarResetSenha } from "../backend/perfil-service.js";

let _modalPerfilInstance = null;

/* ==========================================================================
 * HTML DO MODAL (injetado dinamicamente)
 * ========================================================================== */
const HTML_MODAL_PERFIL = `
<div class="modal fade" id="modalEditarPerfil" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg rounded-4">

            <div class="modal-header border-bottom px-4 py-3">
                <h5 class="modal-title fw-bold text-dark m-0">
                    <i class="fas fa-user-edit text-primary me-2"></i>
                    Editar Perfil
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>

            <div class="modal-body p-4">

                <div class="text-center mb-4">
                    <div class="perfil-avatar mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                        id="perfilAvatarIniciais">
                        <span class="perfil-avatar-iniciais">?</span>
                    </div>
                    <h5 class="fw-bold text-dark mb-1" id="perfilNomeExibir">—</h5>
                    <small class="text-muted" id="perfilEmailExibir">—</small>
                </div>

                <hr class="my-3">

                <div class="mb-3">
                    <label class="form-label small fw-semibold text-muted mb-1">Nome de exibição</label>
                    <input type="text" class="form-control form-control-sm" id="perfilNomeInput"
                        placeholder="Seu nome completo">
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-semibold text-muted mb-1">Telefone / WhatsApp</label>
                    <input type="tel" class="form-control form-control-sm" id="perfilTelefoneInput"
                        placeholder="(00) 00000-0000">
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-semibold text-muted mb-1">Cargo / Função</label>
                    <input type="text" class="form-control form-control-sm" id="perfilCargoInput"
                        placeholder="Ex: Administrador, Vendedor">
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
                    <button type="button" class="btn btn-outline-warning btn-sm w-100 rounded-pill"
                        id="btnEnviarResetSenha">
                        <i class="fas fa-key me-1"></i> Redefinir minha senha
                    </button>
                    <small class="text-muted d-block text-center mt-2 perfil-aviso-reset">
                        Você receberá um e-mail com link para criar uma nova senha
                    </small>
                </div>
            </div>

            <div class="modal-footer bg-light px-4 py-3 border-top">
                <button type="button" class="btn btn-light px-4 rounded-pill fw-semibold" data-bs-dismiss="modal">
                    Cancelar
                </button>
                <button type="button" class="btn btn-primary px-4 rounded-pill fw-semibold" id="btnSalvarPerfil">
                    <i class="fas fa-save me-1"></i> Salvar Perfil
                </button>
            </div>
        </div>
    </div>
</div>
`;

/* ==========================================================================
 * INJETA O MODAL NO DOM (uma vez)
 * ========================================================================== */
function injetarModalPerfil() {
    if (document.getElementById("modalEditarPerfil")) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = HTML_MODAL_PERFIL.trim();
    document.body.appendChild(wrapper.firstChild);
}

/* ==========================================================================
 * ABRE O MODAL
 * ========================================================================== */
window.abrirModalPerfil = async function () {
    try {
        injetarModalPerfil();

        const modalEl = document.getElementById("modalEditarPerfil");
        if (!modalEl) {
            console.warn("Modal #modalEditarPerfil não encontrado.");
            return;
        }

        if (!_modalPerfilInstance && window.bootstrap) {
            _modalPerfilInstance = new bootstrap.Modal(modalEl);
        }

        // Carrega dados
        const perfil = await obterPerfil();

        // ✅ Gera iniciais pro avatar
        const iniciais = gerarIniciais(perfil.nome);
        const avatarEl = document.getElementById("perfilAvatarIniciais");
        if (avatarEl) {
            avatarEl.innerHTML = `<span class="perfil-avatar-iniciais">${iniciais}</span>`;
        }

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
 * SALVAR + RESET
 * ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    injetarModalPerfil();

    // Botão Salvar
    const btnSalvar = document.getElementById("btnSalvarPerfil");
    if (btnSalvar) {
        btnSalvar.addEventListener("click", async () => {
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

    // Botão Reset de Senha
    const btnReset = document.getElementById("btnEnviarResetSenha");
    if (btnReset) {
        btnReset.addEventListener("click", async () => {
            if (!confirm("Deseja receber um e-mail para redefinir sua senha?")) return;

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

    // Link "Editar perfil" no sidebar
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
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch { return iso; }
}

/**
 * Gera iniciais a partir do nome (ex: "Fernando Almeida" → "FA")
 */
function gerarIniciais(nome) {
    if (!nome) return "?";

    const partes = nome.trim().split(/\s+/).filter(p => p.length > 0);

    if (partes.length === 0) return "?";
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();

    const primeira = partes[0][0];
    const ultima = partes[partes.length - 1][0];

    return (primeira + ultima).toUpperCase();
}

console.log("✅ perfil-ui.js carregado.");