// ============================================
// TRAINING WORK - MAIN SCRIPT (OTIMIZADO)
// ============================================

const testimonialsData = [
  { name: "Ricardo Melo", role: "Técnico em Telecom – Salvador/BA", text: "O curso de NR-35 foi excelente. Saí com pleno domínio das técnicas de trabalho em altura.", stars: 5, avatar: "RM" },
  { name: "Juliana Souza", role: "Instaladora FTTH – Feira de Santana/BA", text: "Fiz o treinamento de fibra óptica e montagem de conectores. A parte prática é muito bem estruturada.", stars: 5, avatar: "JS" },
  { name: "Carlos Lima", role: "Gestor de Segurança – ISP Regional", text: "Empresa com quem contratei treinamento in company. Profissionalismo impecável.", stars: 5, avatar: "CL" },
  { name: "Paulo Figueiredo", role: "Eletricista Industrial – Alagoinhas/BA", text: "O curso de NR-10 superou minhas expectativas. Conteúdo completo e instrutores excelentes.", stars: 5, avatar: "PF" },
  { name: "Anderson Leal", role: "Instalador de Internet – Região Norte/BA", text: "Consegui meu primeiro emprego após o curso. O certificado é reconhecido pelas empresas.", stars: 5, avatar: "AL" },
  { name: "Maria Alves", role: "Engenheira de Segurança – Salvador/BA", text: "O curso de NR-10 elevou a segurança da minha equipe. Recomendo a todos.", stars: 5, avatar: "MA" },
  { name: "João Santos", role: "Coordenador Técnico – ISP Regional", text: "Treinamento in company com didática prática e objetiva. Excelente investimento.", stars: 5, avatar: "JS" }
];

const galleryData = [
  { type: "foto", url: "img/galeria/img_01.jpeg", label: "Treinamento de Fibra Óptica" },
  { type: "foto", url: "img/galeria/img_02.jpeg", label: "Treinamento em Alturas" },
  { type: "foto", url: "img/galeria/imagem_3.png", label: "Turma da Linknet" },
  { type: "foto", url: "img/galeria/img_04.jpeg", label: "Caixa de Emenda" },
  { type: "foto", url: "img/galeria/img_05.jpeg", label: "Turma de Fibra Óptica" },
  { type: "foto", url: "img/galeria/img_13.jpeg", label: "Manuseio de OTDR" },
  { type: "foto", url: "img/galeria/imagem_1.png", label: "Caixa de Emenda" },
  { type: "foto", url: "img/galeria/imagem_2.png", label: "Treinamento NR" },
  { type: "foto", url: "img/galeria/img_57.jpeg", label: "Treinamento REDEDIGITAL" },
  { type: "foto", url: "img/galeria/img_52.jpeg", label: "Treinamento BEL INFONET" },
  { type: "foto", url: "img/galeria/img_53.jpeg", label: "Treinamento TURBO NETWORK" },
  { type: "foto", url: "img/galeria/img_45.jpeg", label: "Treinamento RIOS NETWORK" },
  { type: "foto", url: "img/galeria/img_48.jpeg", label: "Caixa de Emenda" },
  { type: "foto", url: "img/galeria/img_54.jpeg", label: "Treinamento NR" },
  { type: "foto", url: "img/galeria/img_55.jpeg", label: "Treinamento NR" }
];

function renderTestimonials() {
  const container = document.getElementById('testimonialsTrack');
  if (!container) return;

  container.innerHTML = testimonialsData.map(testimonial => `
    <div class="testimonial-card">
      <div class="stars">${'★'.repeat(testimonial.stars)}</div>
      <p class="testimonial-text">"${testimonial.text}"</p>
      <div class="testimonial-author">
        <div class="author-avatar">${testimonial.avatar}</div>
        <div>
          <div class="author-name">${testimonial.name}</div>
          <div class="author-role">${testimonial.role}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderGallery() {
  const container = document.getElementById('galleryGrid');
  if (!container) return;

  container.innerHTML = galleryData.map((item, index) => `
    <article class="gallery-card" data-type="${item.type}" data-index="${index}">
      <img src="${item.url}" alt="${item.label}" class="gallery-image" loading="lazy">
      <div class="gallery-label">${item.label}</div>
    </article>
  `).join('');
}

// ──────────────────────────────────────────
// FILTRO DE CURSOS E GALERIA
// ──────────────────────────────────────────
function initFilters() {
  const courseTabs = document.querySelectorAll('.course-tab');
  
  if (courseTabs.length) {
    function filterCourses(category) {
      const courseCards = document.querySelectorAll('.course-card');
      courseCards.forEach(card => {
        const cardCats = card.dataset.cat ? card.dataset.cat.split(' ') : [];
        const isVisible = category === 'todos' || cardCats.includes(category);
        card.classList.toggle('visible', isVisible);
      });
      localStorage.setItem('selectedCourseFilter', category);
    }

    courseTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        courseTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        filterCourses(tab.dataset.cat);
      });
    });
  }

  const galleryTabs = document.querySelectorAll('.gallery-tab');
  const galleryCards = document.querySelectorAll('.gallery-card');
  const galleryGrid = document.getElementById('galleryGrid');

  if (galleryTabs.length && galleryCards.length) {
    galleryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        galleryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const type = tab.dataset.type;
        galleryCards.forEach(card => {
          const isVisible = type === 'todos' || card.dataset.type === type;
          card.style.display = isVisible ? '' : 'none';
        });
        if (galleryGrid) galleryGrid.scrollTo({ left: 0, behavior: 'smooth' });
      });
    });
  }
}

// ──────────────────────────────────────────
// TEMA CLARO/ESCURO
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
  if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ──────────────────────────────────────────
// ANIMAÇÕES DE ENTRADA & SCROLL
// ──────────────────────────────────────────
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(el => observer.observe(el));
}

window.addEventListener('scroll', () => {
  const winScroll = document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  const progressBar = document.getElementById('progressBar');
  if (progressBar) progressBar.style.width = scrolled + '%';

  const nav = document.getElementById('mainNav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 80);
});

// ──────────────────────────────────────────
// HAMBURGER MENU
// ──────────────────────────────────────────
function initHamburgerMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    document.querySelectorAll('.mob-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
}

// ──────────────────────────────────────────
// COUNTER ANIMATION
// ──────────────────────────────────────────
function initCounters() {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'));
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          let displayValue = Math.floor(current);
          if (target === 97) displayValue = Math.floor(current) + '%';
          else if (target > 100) displayValue = Math.floor(current) + '+';
          el.textContent = displayValue;
        }, 20);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));
}

// ──────────────────────────────────────────
// UTILITÁRIOS GLOBAIS DE NAVEGAÇÃO
// ──────────────────────────────────────────
window.scrollToContact = function () {
  document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
};

// ──────────────────────────────────────────
// INICIALIZAÇÃO GERAL OTIMIZADA
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderTestimonials();
  renderGallery();
  initFilters();

  initThemeToggle();
  initScrollReveal();
  initHamburgerMenu();
  initCounters();

  // Lazy loading nativo otimizado para dispositivos móveis
  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
  });
});