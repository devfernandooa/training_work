/**
 * =========================================================================
 * TRAINING WORK — SIDEBAR (sidebar.js)
 * =========================================================================
 *
 * Este arquivo cuida da sidebar administrativa:
 *   1. Marca o link da página atual como "active";
 *   2. Mostra o nome e e-mail do admin logado;
 *   3. Trata o clique no botão "Sair";
 *   4. Cuida do menu mobile (abrir/fechar).
 *
 * Ele depende do auth-guard.js para saber quem está logado.
 * =========================================================================
 */

import { checkAuth, logout } from "./auth-guard.js";

/* =========================================================================
 * 1. VERIFICAÇÃO DE LOGIN + PREENCHIMENTO DE NOME/EMAIL
 * ========================================================================= */

// checkAuth garante que só roda em páginas onde o usuário está logado.
// Se não estiver, ele redireciona pra login.html antes do callback rodar.
checkAuth((user, adminData) => {
    const nameEl = document.querySelector(".user-name");
    const emailEl = document.querySelector(".user-email");

    // Mostra o nome que veio do Firestore. Se não tiver, tenta o displayName
    // do Auth. Se nenhum dos dois, mostra "Administrador".
    if (nameEl) {
        nameEl.textContent = adminData.nome || user.displayName || "Administrador";
    }

    if (emailEl) {
        emailEl.textContent = user.email || "";
    }
    window.__adminLogado = { user, adminData };

    // ✅ Disparar um evento customizado
    window.dispatchEvent(new CustomEvent("auth:ready", {
        detail: { user, adminData }
    }));
});

/* =========================================================================
 * 2. DESTAQUE DO LINK ATIVO
 * ========================================================================= */

// A ideia: pegar a URL atual (ex.: "turmas.html") e marcar o <a> que aponta
// para essa mesma página com a classe "active".
(function marcarLinkAtivo() {
    // Extrai só o nome do arquivo da URL, em minúsculas.
    // Ex.: "/admin/turmas.html" → "turmas.html"
    let paginaAtual = window.location.pathname.split("/").pop().toLowerCase();

    // Remove a extensão .html. Ex.: "turmas.html" → "turmas"
    paginaAtual = paginaAtual.replace(".html", "") || "dashboard";

    document.addEventListener("DOMContentLoaded", () => {
        const links = document.querySelectorAll(".sidebar-menu .sidebar-link");

        links.forEach((link) => {
            const href = (link.getAttribute("href") || "").toLowerCase().replace(".html", "");

            if (href === paginaAtual) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    });
})();

/* =========================================================================
 * 3. MENU MOBILE + LOGOUT
 * ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("btn-toggle-sidebar")
        || document.getElementById("sidebarToggle");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");

    if (!sidebar) return;

    // ---------- Abrir/fechar sidebar no mobile ----------
    if (toggleBtn) {
        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.toggle("show");
            if (overlay) overlay.classList.toggle("show");
        });
    }

    // ---------- Fechar ao clicar no overlay ----------
    if (overlay) {
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("show");
            overlay.classList.remove("show");
        });
    }

    // ---------- Fechar ao clicar fora ----------
    document.addEventListener("click", (event) => {
        if (window.innerWidth <= 992) {
            const clicouDentro = sidebar.contains(event.target)
                || (toggleBtn && toggleBtn.contains(event.target));

            if (!clicouDentro && sidebar.classList.contains("show")) {
                sidebar.classList.remove("show");
                if (overlay) overlay.classList.remove("show");
            }
        }
    });

    // ---------- Logout ----------
    // Usamos delegação de evento no document porque o botão pode ser
    // recriado pelo Bootstrap ou estar em variações do HTML.
    document.addEventListener("click", async (e) => {
        const btnLogout = e.target.closest("#btnLogoutSidebar")
            || e.target.closest(".logout-icon-btn");

        if (!btnLogout) return;
        e.preventDefault();

        try {
            await logout();
            window.location.replace("login.html");
        } catch (erro) {
            console.error("Erro ao fazer logout:", erro);
            alert("Não foi possível sair. Tente novamente.");
        }
    });
});