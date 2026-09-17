document.addEventListener("DOMContentLoaded", () => {
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("appSidebar");
  const overlay = document.getElementById("sidebarOverlay");

  function toggleSidebar() {
    if (sidebar && overlay) {
      sidebar.classList.toggle("show");
      overlay.classList.toggle("show");
    }
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", toggleSidebar);
  }

  if (overlay) {
    overlay.addEventListener("click", toggleSidebar);
  }

  // Fecha o menu automaticamente ao clicar em qualquer link da sidebar no mobile
  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  sidebarLinks.forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        toggleSidebar();
      }
    });
  });
});


________________________________________________________________________