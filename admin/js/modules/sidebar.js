// ==========================================================================
// MÓDULO DE CONTROLE DA SIDEBAR (Mobile, Logout & Active State Universal)
// ==========================================================================

import { logout } from '../auth-guard.js';

// --- 1. DESTAQUE ATIVO DA SIDEBAR (Compatível com Vercel e Local) ---
(function () {
  // Extrai a página atual da URL, converte para minúsculas e remove a extensão .html
  let paginaAtual = window.location.pathname.split("/").pop().toLowerCase();
  paginaAtual = paginaAtual.replace(".html", "") || "lead_e_triagem";

  document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll(".sidebar-menu .sidebar-link");
    
    links.forEach(link => {
      const href = link.getAttribute("href") || "";
      const hrefLimpo = href.toLowerCase().replace(".html", "");

      // Verifica correspondência exata ou fallback para a página principal
      if (hrefLimpo === paginaAtual || (paginaAtual === "" && hrefLimpo.includes("lead_e_triagem"))) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  });
})();

// --- 2. GESTÃO DO MENU MOBILE, OVERLAY E LOGOUT ---
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