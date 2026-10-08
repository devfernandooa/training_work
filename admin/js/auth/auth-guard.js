/**
 * =========================================================================
 * TRAINING WORK — GUARDA DE AUTENTICAÇÃO (auth-guard.js)
 * =========================================================================
 *
 * Protege páginas administrativas SEM bloquear a renderização.
 *
 * REGRAS:
 *   1. Se JÁ vimos user logado → null agora é logout real → redireciona.
 *   2. Se NUNCA vimos user → espera apenas 400ms (restauração do SDK).
 * =========================================================================
 */

import { escutarSessao, obterAdminLogado, logout } from "./auth-service.js";

/* =========================================================================
 * ESTADO LOCAL DA PÁGINA
 * ========================================================================= */

let jaVimosUsuarioLogado = false;
let timerDecisao = null;
let callbackExecutado = false;

/* =========================================================================
 * VERIFICAÇÃO PRINCIPAL
 * ========================================================================= */

export function checkAuth(callbackOnSuccess) {
    escutarSessao(async (user) => {

        // ─────────────────────────────────────────────────────────────
        // CASO 1: USER EXISTE
        // ─────────────────────────────────────────────────────────────
        if (user) {
            jaVimosUsuarioLogado = true;

            if (timerDecisao) {
                clearTimeout(timerDecisao);
                timerDecisao = null;
            }

            try {
                const adminData = await obterAdminLogado(user);

                if (!adminData || adminData.ativo !== true) {
                    console.warn("[auth-guard] admin não encontrado ou inativo");
                    await logout();
                    window.location.replace("login.html");
                    return;
                }

                if (!callbackExecutado && typeof callbackOnSuccess === "function") {
                    callbackExecutado = true;
                    callbackOnSuccess(user, adminData);
                }
            } catch (erro) {
                console.error("[auth-guard] erro ao validar:", erro);
                // Não desloga em erro de rede
            }
            return;
        }

        // ─────────────────────────────────────────────────────────────
        // CASO 2: USER NULL
        // ─────────────────────────────────────────────────────────────

        // Logout real → redireciona imediato
        if (jaVimosUsuarioLogado) {
            window.location.replace("login.html");
            return;
        }

        // Restauração inicial → espera curta (400ms)
        if (timerDecisao) return;

        timerDecisao = setTimeout(() => {
            if (!jaVimosUsuarioLogado) {
                window.location.replace("login.html");
            }
        }, 400);   // ← era 2000ms, agora 400ms
    });
}

export { logout };