// ==========================================================================
// MÓDULO DE CONTROLE DA SIDEBAR (Mobile, Logout & Active State Instantâneo)
// ==========================================================================

import { logout } from '../auth-guard.js';

// --- 1. AÇÃO IMEDIATA (Executa assim que o script é carregado, antes do DOMContentLoaded) ---
(function () {
    const paginaAtual = window.location.pathname.split("/").pop() || "dashboard.html";
    const links = document.querySelectorAll(".sidebar-menu .sidebar-link");
    
    links.forEach(link => {
        const href = link.getAttribute("href");
        if (href === paginaAtual) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
})();

// --- 2. RESTANTE LÓGICA QUANDO O DOM ESTIVER PRONTO ---
document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("btn-toggle-sidebar") || document.getElementById("sidebarToggle");
    const sidebar = document.querySelector(".sidebar");

    if (!sidebar) return;

    // Gestão do overlay e mobile
    let overlay = document.querySelector(".sidebar-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "sidebar-overlay";
        document.body.appendChild(overlay);
    }

    if (toggleBtn) {
        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.toggle("show");
            overlay.classList.toggle("show");
        });
    }

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("show");
        overlay.classList.remove("show");
    });

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