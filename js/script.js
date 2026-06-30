// ============================================
// TRAINING WORK - MAIN SCRIPT (REFATORADO)
// ============================================

// ──────────────────────────────────────────
// 1. DADOS ESTÁTICOS (Simulando API)
// ──────────────────────────────────────────
const normasData = [
  { code: "NR-06", name: "Equipamentos de Proteção Individual – Uso e Gestão de EPIs" },
  { code: "NR-10", name: "Segurança em Instalações e Serviços com Eletricidade" },
  { code: "NR-17", name: "Ergonomia e Condições de Trabalho" },
  { code: "NR-33", name: "Segurança e Saúde em Espaços Confinados" },
  { code: "NR-35", name: "Trabalho em Altura – Autorização e Controle" },
  { code: "PGR", name: "Programa de Prevenção de Riscos Ambientais" },
  { code: "PCMSO", name: "Programa de Controle Médico de Saúde Ocupacional" },
  { code: "APR", name: "Análise Preliminar de Risco – Gestão de Perigos" },
  { code: "NR-05", name: "CIPA – Comissão Interna de Prevenção de Acidentes" },
  { code: "NR-12", name: "Segurança no Trabalho em Máquinas e Equipamentos" }
];

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
  { type: "foto", url: "img/galeria/img_03.jpeg", label: "Turma da Linknet" },
  { type: "foto", url: "img/galeria/img_04.jpeg", label: "Caixa de Emenda" },
  { type: "foto", url: "img/galeria/img_05.jpeg", label: "Turma de Fibra Óptica" },
  { type: "foto", url: "img/galeria/img_13.jpeg", label: "Manuseio de OTDR" },
  { type: "foto", url: "img/galeria/img_07.jpeg", label: "Caixa de Emenda" },
  { type: "foto", url: "img/galeria/img_08.jpeg", label: "Treinamento NR" },
  { type: "foto", url: "img/galeria/img_01.jpeg", label: "Treinamento de Fibra Óptica" },
  { type: "foto", url: "img/galeria/img_57.jpeg", label: "Treinamento REDEDIGITAL" },
  { type: "foto", url: "img/galeria/img_52.jpeg", label: "Treinamento BEL INFONET" },
  { type: "foto", url: "img/galeria/img_53.jpeg", label: "Treinamento TURBO NETWORK" },
  { type: "foto", url: "img/galeria/img_45.jpeg", label: "Treinamento RIOS NETWORK" },
  { type: "foto", url: "img/galeria/img_44.jpeg", label: "Manuseio de OTDR" },
  { type: "foto", url: "img/galeria/img_48.jpeg", label: "Caixa de Emenda" },
  { type: "foto", url: "img/galeria/img_54.jpeg", label: "Treinamento NR" },
  { type: "foto", url: "img/galeria/img_55.jpeg", label: "Treinamento NR" }
];

// ──────────────────────────────────────────
// 2. RENDERIZAÇÃO DINÂMICA
// ──────────────────────────────────────────
function renderNormas() {
  const container = document.getElementById('normasGrid');
  if (!container) return;

  container.innerHTML = normasData.map(norma => `
    <div class="norma-item">
      <div class="norma-code">${norma.code}</div>
      <div class="norma-name">${norma.name}</div>
    </div>
  `).join('');
}

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
    <article class="gallery-card ${item.type === 'video' ? 'gallery-video' : ''}" data-type="${item.type}" data-index="${index}">
      ${item.type === 'video' ?
      `<img src="${item.poster}" alt="${item.label}" class="gallery-image" loading="lazy" style="cursor:pointer" onclick="openVideoModal('${item.url}')">` :
      `<img src="${item.url}" alt="${item.label}" class="gallery-image" loading="lazy">`
    }
      <div class="gallery-label">${item.label}</div>
    </article>
  `).join('');
}

function populateCourseSelect() {
  const select = document.getElementById('curso');
  if (!select) return;

  // Lendo os títulos diretamente do HTML montado
  const courseCards = document.querySelectorAll('.course-card');
  const titles = Array.from(courseCards).map(card => card.querySelector('.course-title')?.textContent.trim()).filter(Boolean);
  const uniqueCourses = [...new Set(titles)];

  select.innerHTML = '<option value="">Selecione um curso...</option>' +
    uniqueCourses.map(course => `<option>${course}</option>`).join('');
}

// ──────────────────────────────────────────
// 3. FILTRO DE CURSOS E GALERIA
// ──────────────────────────────────────────
function initFilters() {
  const savedCourseFilter = localStorage.getItem('selectedCourseFilter') || 'todos';
  const courseTabs = document.querySelectorAll('.course-tab');
  const courseCards = document.querySelectorAll('.course-card');

  if (courseTabs.length && courseCards.length) {
    function filterCourses(category) {
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

    const activeCourseTab = Array.from(courseTabs).find(tab => tab.dataset.cat === savedCourseFilter);
    if (activeCourseTab) {
      activeCourseTab.classList.add('active');
      filterCourses(savedCourseFilter);
    } else {
      filterCourses('todos');
    }
  }

  // Filtro de Galeria
  const galleryTabs = document.querySelectorAll('.gallery-tab');
  const galleryCards = document.querySelectorAll('.gallery-card');
  const galleryGrid = document.getElementById('galleryGrid');

  if (galleryTabs.length && galleryCards.length) {
    function filterGallery(type) {
      galleryCards.forEach(card => {
        const cardType = card.dataset.type;
        const isVisible = type === 'todos' || cardType === type;
        card.style.display = isVisible ? '' : 'none';
      });
      if (galleryGrid) {
        galleryGrid.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }

    galleryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        galleryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        filterGallery(tab.dataset.type);
      });
    });
  }
}

// ──────────────────────────────────────────
// 4. GALERIA COM MODAL DE VÍDEO
// ──────────────────────────────────────────
window.openVideoModal = function (videoUrl) {
  const modal = document.getElementById('videoModal');
  const video = document.getElementById('modalVideo');
  if (!modal || !video) return;

  video.querySelector('source').src = videoUrl;
  video.load();
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};

function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  const video = document.getElementById('modalVideo');
  if (!modal || !video) return;

  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  video.pause();
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('videoModal');
  const closeBtn = document.querySelector('.modal-close');
  if (modal && closeBtn) {
    closeBtn.addEventListener('click', closeVideoModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeVideoModal();
    });
  }
});

// ──────────────────────────────────────────
// 5. NEWSLETTER
// ──────────────────────────────────────────
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('newsletterEmail');
    const messageEl = document.getElementById('newsletterMessage');
    const button = form.querySelector('button');
    const email = emailInput.value.trim();

    if (!email) {
      showNewsletterMessage(messageEl, 'Por favor, insira seu e-mail.', 'error');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      showNewsletterMessage(messageEl, 'Por favor, insira um e-mail válido.', 'error');
      return;
    }

    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = 'Enviando...';

    const templateParams = {
      email: email,
      data: new Date().toLocaleString('pt-BR')
    };

    try {
      const serviceId = 'service_xuqyqgs';
      const templateId = 'template_newsletter';
      const publicKey = 'R5hAfW7DI_BCx1tVj';

      await emailjs.send(serviceId, templateId, templateParams, publicKey);
      showNewsletterMessage(messageEl, 'Inscrição realizada com sucesso! 🎉', 'success');
      emailInput.value = '';

    } catch (error) {
      console.error('Erro detalhado:', error);
      showNewsletterMessage(messageEl, 'Erro ao inscrever. Tente novamente mais tarde.', 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = originalText;
      setTimeout(() => { if (messageEl) messageEl.textContent = ''; }, 5000);
    }
  });
}

function showNewsletterMessage(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.style.color = type === 'success' ? '#27ae60' : '#e74c3c';
  element.style.fontSize = '0.85rem';
  element.style.marginTop = '1rem';
}

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

// ──────────────────────────────────────────
// 8. MICRO-INTERAÇÕES
// ──────────────────────────────────────────
function initMicroInteractions() {
  const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-card, .course-tab, .gallery-tab');

  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  });

  const cards = document.querySelectorAll('.course-card, .norma-item, .method-step');
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-8px)'; });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255,255,255,0.4);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
  }
  @keyframes ripple-animation { to { transform: scale(4); opacity: 0; } }
  .btn-primary, .btn-secondary, .btn-card, .course-tab, .gallery-tab { position: relative; overflow: hidden; }
`;
document.head.appendChild(rippleStyle);

// ──────────────────────────────────────────
// 9. PROGRESS BAR, NAV E OUTROS
// ──────────────────────────────────────────
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
// 10. HAMBURGER MENU
// ──────────────────────────────────────────
function initHamburgerMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      mobileNav.setAttribute('aria-hidden', !isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    document.querySelectorAll('.mob-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        mobileNav.setAttribute('aria-hidden', 'true');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }
}

// ──────────────────────────────────────────
// 11. COUNTER ANIMATION
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
          else if (target > 100 && target !== 97) displayValue = Math.floor(current) + '+';
          el.textContent = displayValue;
        }, 20);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));
}

// ──────────────────────────────────────────
// 12. TESTIMONIAL CAROUSEL
// ──────────────────────────────────────────
let testimonialAutoplay = null;
let testimonialIndex = 0;

function initTestimonialCarousel() {
  const track = document.querySelector('.testimonials-track');
  const prevBtn = document.querySelector('.testimonial-nav.prev');
  const nextBtn = document.querySelector('.testimonial-nav.next');
  const cards = document.querySelectorAll('.testimonial-card');

  if (!track || !prevBtn || !nextBtn || !cards.length) return;

  function updateButtons() {
    prevBtn.disabled = testimonialIndex <= 0;
    nextBtn.disabled = testimonialIndex >= cards.length - 1;
  }

  function scrollToIndex(index) {
    testimonialIndex = Math.max(0, Math.min(index, cards.length - 1));
    const card = cards[testimonialIndex];
    const scrollLeft = card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    track.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    updateButtons();
  }

  function getActiveIndex() {
    const trackCenter = track.scrollLeft + track.clientWidth / 2;
    return Array.from(cards).reduce((closest, card, idx) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const diff = Math.abs(trackCenter - cardCenter);
      const closestCard = cards[closest];
      const closestDiff = Math.abs(trackCenter - (closestCard.offsetLeft + closestCard.clientWidth / 2));
      return diff < closestDiff ? idx : closest;
    }, 0);
  }

  function startAutoplay() {
    if (testimonialAutoplay) return;
    testimonialAutoplay = setInterval(() => {
      const nextIndex = testimonialIndex < cards.length - 1 ? testimonialIndex + 1 : 0;
      scrollToIndex(nextIndex);
    }, 5000);
  }

  function stopAutoplay() {
    if (testimonialAutoplay) {
      clearInterval(testimonialAutoplay);
      testimonialAutoplay = null;
    }
  }

  prevBtn.addEventListener('click', () => { scrollToIndex(testimonialIndex - 1); stopAutoplay(); startAutoplay(); });
  nextBtn.addEventListener('click', () => { scrollToIndex(testimonialIndex + 1); stopAutoplay(); startAutoplay(); });
  track.addEventListener('scroll', () => { testimonialIndex = getActiveIndex(); updateButtons(); });
  track.addEventListener('mouseenter', stopAutoplay);
  track.addEventListener('mouseleave', startAutoplay);
  window.addEventListener('resize', () => scrollToIndex(testimonialIndex));

  updateButtons();
  startAutoplay();
}

// ──────────────────────────────────────────
// 13. EMAILJS E FORMULÁRIO
// ──────────────────────────────────────────
emailjs.init("R5hAfW7DI_BCx1tVj");

window.scrollToContact = function () {
  document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
};

window.submitContactForm = function (button) {
  const fields = {
    nome: document.getElementById('nome'),
    telefone: document.getElementById('telefone'),
    email: document.getElementById('email'),
    curso: document.getElementById('curso'),
    mensagem: document.getElementById('mensagem')
  };

  const data = {
    nome: fields.nome?.value.trim() || '',
    telefone: fields.telefone?.value.trim() || '',
    email: fields.email?.value.trim() || '',
    curso: fields.curso?.value || '',
    mensagem: fields.mensagem?.value.trim() || ''
  };

  if (!data.nome || !data.email || !data.telefone) {
    alert("Por favor, preencha os campos obrigatórios: Nome, Telefone e E-mail.");
    return;
  }

  const originalText = button.innerHTML;
  button.disabled = true;
  button.innerHTML = "Enviando...";

  emailjs.send('service_xuqyqgs', 'template_blvq78f', data)
    .then(() => {
      alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
      Object.values(fields).forEach(field => { if (field) field.value = ''; });
    })
    .catch((error) => {
      console.error('Erro ao enviar:', error);
      alert('Ocorreu um erro ao enviar. Tente novamente mais tarde.');
    })
    .finally(() => {
      button.disabled = false;
      button.innerHTML = originalText;
    });
};

// ──────────────────────────────────────────
// 14. GALLERY CAROUSEL (AUTOPLAY)
// ──────────────────────────────────────────
let galleryAutoplay = null;

function initGalleryCarousel() {
  const galleryGrid = document.getElementById('galleryGrid');
  if (!galleryGrid) return;

  function startGalleryAutoplay() {
    if (galleryAutoplay) return;
    galleryAutoplay = setInterval(() => {
      const card = galleryGrid.querySelector('.gallery-card');
      if (!card) return;
      const scrollAmount = card.clientWidth + 32;

      if (galleryGrid.scrollLeft + galleryGrid.clientWidth >= galleryGrid.scrollWidth - 10) {
        galleryGrid.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        galleryGrid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 4000);
  }

  function stopGalleryAutoplay() {
    if (galleryAutoplay) {
      clearInterval(galleryAutoplay);
      galleryAutoplay = null;
    }
  }

  galleryGrid.addEventListener('mouseenter', stopGalleryAutoplay);
  galleryGrid.addEventListener('mouseleave', startGalleryAutoplay);
  galleryGrid.addEventListener('touchstart', stopGalleryAutoplay);
  galleryGrid.addEventListener('touchend', startGalleryAutoplay);

  startGalleryAutoplay();
}

// ──────────────────────────────────────────
// 15. INICIALIZAÇÃO
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderNormas();
  renderTestimonials();
  renderGallery();
  populateCourseSelect();

  initFilters();
  initNewsletter();
  initThemeToggle();
  initScrollReveal();
  initMicroInteractions();
  initHamburgerMenu();
  initCounters();
  initTestimonialCarousel();
  initGalleryCarousel();

  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
  });

  const formInputs = document.querySelectorAll('.form-input, .form-textarea');
  formInputs.forEach(input => {
    input.addEventListener('input', function () {
      if (this.value.trim()) {
        this.classList.add('has-value');
      } else {
        this.classList.remove('has-value');
      }
    });
  });
});

window.addEventListener('load', () => {
  document.body.classList.add('loaded');
});