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