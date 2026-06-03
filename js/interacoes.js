

// ──────────────────────────────────────────
// 6. TEMA CLARO/ESCURO
// ──────────────────────────────────────────
function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
  
  toggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });
}

function updateThemeIcon(theme) {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  
  const icon = toggle.querySelector('i');
  if (icon) {
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

// ──────────────────────────────────────────
// 7. ANIMAÇÕES DE ENTRADA (Intersection Observer)
// ──────────────────────────────────────────
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Adicionar delay progressivo
        const siblings = entry.target.parentElement?.children;
        if (siblings) {
          Array.from(siblings).forEach((el, idx) => {
            if (el.classList.contains('reveal')) {
              el.style.transitionDelay = `${idx * 0.1}s`;
            }
          });
        }
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  
  elements.forEach(el => observer.observe(el));
}