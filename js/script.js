// ============================================
// TRAINING WORK - SCRIPT.JS
// ============================================


// ──────────────────────────────────────────
// 2. RENDERIZAÇÃO DINÂMICA
// ──────────────────────────────────────────
function renderCourses() {
  const container = document.getElementById('coursesGrid');
  if (!container) return;
  
  container.innerHTML = coursesData.map(course => `
    <div class="course-card" data-cat="${course.category}">
      <div class="course-card-header">
        <div class="course-icon">${course.icon}</div>
        <div class="course-nr">${course.nr}</div>
        <div class="course-title">${course.title}</div>
      </div>
      <div class="course-card-body">
        <p class="course-desc">${course.desc}</p>
        <div class="course-meta">
          <span class="meta-item">⏱ ${course.duration}</span>
          <span class="meta-item">📍 ${course.location}</span>
          <span class="meta-item">🎓 ${course.cert}</span>
        </div>
      </div>
      <div class="course-card-footer">
        <span class="course-price">${course.price}</span>
        <button class="btn-card" onclick="scrollToContact()">Inscrever-se</button>
      </div>
    </div>
  `).join('');
  
  // Mostrar todos os cursos inicialmente
  document.querySelectorAll('.course-card').forEach(card => {
    card.classList.add('visible');
  });
}

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
  
  const uniqueCourses = [...new Map(coursesData.map(c => [c.title, c.title])).values()];
  select.innerHTML = '<option value="">Selecione um curso...</option>' + 
    uniqueCourses.map(course => `<option>${course}</option>`).join('');
}

// ──────────────────────────────────────────
// 3. FILTRO DE CURSOS (com localStorage)
// ──────────────────────────────────────────
function initCourseFilters() {
  const savedFilter = localStorage.getItem('selectedCourseFilter') || 'todos';
  const tabs = document.querySelectorAll('.course-tab');
  const cards = document.querySelectorAll('.course-card');
  
  if (!tabs.length || !cards.length) return;
  
  function filterCourses(category) {
    cards.forEach(card => {
      const cardCats = card.dataset.cat ? card.dataset.cat.split(' ') : [];
      const isVisible = category === 'todos' || cardCats.includes(category);
      card.classList.toggle('visible', isVisible);
    });
    localStorage.setItem('selectedCourseFilter', category);
  }
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filterCourses(tab.dataset.cat);
    });
  });
  
  // Aplicar filtro salvo
  const activeTab = Array.from(tabs).find(tab => tab.dataset.cat === savedFilter);
  if (activeTab) {
    activeTab.classList.add('active');
    filterCourses(savedFilter);
  } else {
    filterCourses('todos');
  }
}

// ──────────────────────────────────────────
// 4. GALERIA COM MODAL DE VÍDEO
// ──────────────────────────────────────────
window.openVideoModal = function(videoUrl) {
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

// Event listeners para modal
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
// 8. MICRO-INTERAÇÕES
// ──────────────────────────────────────────
function initMicroInteractions() {
  // Efeito ripple em botões
  const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-card, .course-tab, .gallery-tab');
  
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size/2}px`;
      ripple.style.top = `${e.clientY - rect.top - size/2}px`;
      btn.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  });
  
  // Efeito hover em cards
  const cards = document.querySelectorAll('.course-card, .norma-item, .method-step');
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-8px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// // Adicionar CSS para ripple
// const rippleStyle = document.createElement('style');
// rippleStyle.textContent = `
//   .ripple {
//     position: absolute;
//     border-radius: 50%;
//     background: rgba(255,255,255,0.4);
//     transform: scale(0);
//     animation: ripple-animation 0.6s linear;
//     pointer-events: none;
//   }
  
//   @keyframes ripple-animation {
//     to {
//       transform: scale(4);
//       opacity: 0;
//     }
//   }
  
//   .btn-primary, .btn-secondary, .btn-card, .course-tab, .gallery-tab {
//     position: relative;
//     overflow: hidden;
//   }
// `;
// document.head.appendChild(rippleStyle);

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
