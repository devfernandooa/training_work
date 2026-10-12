/**
 * =========================================================================
 * TRAINING WORK — SISTEMA DE NOTIFICAÇÕES (notificacao.js)
 * =========================================================================
 * Toast reutilizável para feedback visual em qualquer tela do admin.
 *
 * USO:
 *   import { notificar } from "../modules/notificacao.js";
 *
 *   notificar("Aula agendada com sucesso!", "sucesso");
 *   notificar("Erro ao salvar.", "erro");
 *   notificar("Atenção: verifique os campos.", "aviso");
 *   notificar("Dica: use o filtro.", "info");
 * =========================================================================
 */

let _containerCriado = false;

/**
 * Garante que o container de toasts existe no DOM.
 */
function garantirContainer() {
    if (_containerCriado) return;

    let container = document.getElementById("tw-toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "tw-toast-container";
        container.className = "toast-container position-fixed top-0 end-0 p-3";
        container.style.zIndex = "9999";
        document.body.appendChild(container);
    }

    _containerCriado = true;
}

/**
 * Mapeia tipo → classes Bootstrap + ícone
 */
function configurarTipo(tipo) {
    switch (String(tipo).toLowerCase()) {
        case "sucesso":
        case "success":
            return {
                bg: "bg-success",
                icone: '<i class="fas fa-check-circle me-2"></i>'
            };
        case "erro":
        case "error":
        case "danger":
            return {
                bg: "bg-danger",
                icone: '<i class="fas fa-exclamation-circle me-2"></i>'
            };
        case "aviso":
        case "warning":
            return {
                bg: "bg-warning text-dark",
                icone: '<i class="fas fa-exclamation-triangle me-2"></i>'
            };
        case "info":
        default:
            return {
                bg: "bg-primary",
                icone: '<i class="fas fa-info-circle me-2"></i>'
            };
    }
}

/**
 * Mostra um toast.
 *
 * @param {string} mensagem - Texto a exibir
 * @param {string} tipo - "sucesso" | "erro" | "aviso" | "info"
 * @param {number} duracao - milissegundos (padrão: 3500)
 */
export function notificar(mensagem, tipo = "info", duracao = 3500) {
    garantirContainer();

    const container = document.getElementById("tw-toast-container");
    if (!container) return;

    const { bg, icone } = configurarTipo(tipo);

    // Cria o elemento
    const toastEl = document.createElement("div");
    toastEl.className = `toast align-items-center text-white ${bg} border-0 shadow-sm`;
    toastEl.setAttribute("role", "alert");
    toastEl.setAttribute("aria-live", "assertive");
    toastEl.setAttribute("aria-atomic", "true");

    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center">
                ${icone}
                <span>${mensagem}</span>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>
    `;

    container.appendChild(toastEl);

    // Inicializa com Bootstrap
    if (window.bootstrap && window.bootstrap.Toast) {
        const bsToast = new bootstrap.Toast(toastEl, {
            delay: duracao,
            autohide: true
        });
        bsToast.show();

        // Remove do DOM após esconder
        toastEl.addEventListener("hidden.bs.toast", () => {
            toastEl.remove();
        });
    } else {
        // Fallback simples se Bootstrap não estiver disponível
        toastEl.style.opacity = "1";
        setTimeout(() => toastEl.remove(), duracao);
    }
}

// Expõe globalmente também (pra usar sem import, se precisar)
window.notificar = notificar;

console.log("✅ notificacao.js carregado. Use notificar('msg', 'tipo') no console.");