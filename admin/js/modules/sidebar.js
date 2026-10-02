// ==========================================================================
// MÓDULO DE CONTROLE DA SIDEBAR (Mobile & Logout)
// ==========================================================================

import { logout } from '../auth-guard.js';

document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("btn-toggle-sidebar") || document.getElementById("sidebarToggle");
    const sidebar = document.querySelector(".sidebar");

    if (!sidebar) return;

    // Cria dinamicamente o fundo escuro (overlay) para dispositivos móveis
    let overlay = document.querySelector(".sidebar-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "sidebar-overlay";
        document.body.appendChild(overlay);
    }

    // Ação de abrir/fechar pelo botão hambúrguer
    if (toggleBtn) {
        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.toggle("show");
            overlay.classList.toggle("show");
        });
    }

    // Fechar ao clicar no overlay escuro
    overlay.addEventListener("click", () => {
        sidebar.classList.remove("show");
        overlay.classList.remove("show");
    });

    // Fechar ao clicar fora da sidebar em ecrãs pequenos (<= 992px)
    document.addEventListener("click", (event) => {
        if (window.innerWidth <= 992) {
            const isClickInside = sidebar.contains(event.target) || (toggleBtn && toggleBtn.contains(event.target));
            if (!isClickInside && sidebar.classList.contains("show")) {
                sidebar.classList.remove("show");
                overlay.classList.remove("show");
            }
        }
    });

    // Evento para o botão de Logout
    document.addEventListener('click', async (e) => {
        const btnLogout = e.target.closest('#btnLogoutSidebar') || e.target.closest('.logout-icon-btn');
        if (btnLogout) {
            e.preventDefault();
            try {
                await logout();
            } catch (error) {
                console.error("Erro ao fazer logout:", error);
            }
        }
    });
});