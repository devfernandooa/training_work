/**
 * =========================================================================
 * TRAINING WORK — GUARDA DE AUTENTICAÇÃO (auth-guard.js)
 * =========================================================================
 */

import { escutarSessao, obterAdminLogado, logout } from "./auth-service.js";

let jaVimosUsuarioLogado = false;
let timerDecisao = null;
let callbackExecutado = false;

export function checkAuth(callbackOnSuccess) {
    escutarSessao(async (user) => {

        // ─────────────────────────────────────────────────────────────
        // USER EXISTE
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
                console.error("[auth-guard] erro:", erro);
                // Não desloga por erro de rede
            }
            return;
        }

        // ─────────────────────────────────────────────────────────────
        // USER NULL
        // ─────────────────────────────────────────────────────────────

        if (jaVimosUsuarioLogado) {
            window.location.replace("login.html");
            return;
        }

        if (timerDecisao) return;

        timerDecisao = setTimeout(() => {
            if (!jaVimosUsuarioLogado) {
                window.location.replace("login.html");
            }
        }, 400);
    });
}

export { logout };