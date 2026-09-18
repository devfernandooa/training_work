// ==========================================
// MÓDULO: Controle da Sidebar (Global)
// ===========================================

document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("sidebarToggle");
    const sidebar = document.querySelector(".sidebar");

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("sidebar-show");
        });
    }
});

// ==========================================
// MÓDULO: Controle da Sidebar (Global)
// ===========================================

document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("sidebarToggle");
    const closeBtn = document.getElementById("sidebarClose");
    const sidebar = document.querySelector(".sidebar");

    if (sidebar) {
        // Abrir sidebar
        if (toggleBtn) {
            toggleBtn.addEventListener("click", () => {
                sidebar.classList.add("sidebar-show");
            });
        }

        // Fechar sidebar pelo botão X
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                sidebar.classList.remove("sidebar-show");
            });
        }

        // Fechar ao clicar fora em telas pequenas
        document.addEventListener("click", (event) => {
            if (window.innerWidth <= 992) {
                const isClickInside = sidebar.contains(event.target) || (toggleBtn && toggleBtn.contains(event.target));
                if (!isClickInside && sidebar.classList.contains("sidebar-show")) {
                    sidebar.classList.remove("sidebar-show");
                }
            }
        });
    }
});


import { logout } from '../auth-guard.js'; // Ajuste o caminho se necessário

// Procura pelo botão de sair e adiciona o evento de clique via código
document.addEventListener('click', async (e) => {
  const btnLogout = e.target.closest('.btn-logout-modern') || e.target.closest('#btnLogout');
  if (btnLogout) {
    e.preventDefault();
    try {
      await logout();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  }
});

