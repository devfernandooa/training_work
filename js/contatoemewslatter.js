
// ──────────────────────────────────────────
// 5. NEWSLETTER
// ──────────────────────────────────────────
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletterEmail');
    const message = document.getElementById('newsletterMessage');
    const button = form.querySelector('button');
    
    if (!email.value || !email.value.includes('@')) {
      message.textContent = 'Por favor, insira um e-mail válido.';
      message.style.color = '#e74c3c';
      return;
    }
    
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = 'Enviando...';
    
    // Simular envio (substituir por chamada real à API)
    setTimeout(() => {
      message.textContent = 'Inscrição realizada com sucesso! 🎉';
      message.style.color = '#27ae60';
      email.value = '';
      button.disabled = false;
      button.innerHTML = originalText;
      
      setTimeout(() => {
        message.textContent = '';
      }, 5000);
    }, 1000);
  });
}


// ──────────────────────────────────────────
// 13. EMAILJS E FORMULÁRIO
// ──────────────────────────────────────────
emailjs.init("Fg-rRL1eurjzwgTIE");

window.scrollToContact = function() {
  document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
};

window.submitContactForm = function(button) {
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
      Object.values(fields).forEach(field => { if(field) field.value = ''; });
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
// 14. INICIALIZAÇÃO
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Renderizar conteúdo dinâmico
  renderCourses();
  renderNormas();
  renderTestimonials();
  renderGallery();
  populateCourseSelect();
  
  // Inicializar funcionalidades
  initCourseFilters();
  initNewsletter();
  initThemeToggle();
  initScrollReveal();
  initMicroInteractions();
  initHamburgerMenu();
  initCounters();
  initTestimonialCarousel();
  
  // Adicionar loading lazy às imagens
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
  });
  
  // Adicionar validação em tempo real ao formulário
  const formInputs = document.querySelectorAll('.form-input, .form-textarea');
  formInputs.forEach(input => {
    input.addEventListener('input', function() {
      if (this.value.trim()) {
        this.classList.add('has-value');
      } else {
        this.classList.remove('has-value');
      }
    });
  });
});

// Prevenir scroll durante animações
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
});



// Newsletter com EmailJS - Versão Corrigida
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const emailInput = document.getElementById('newsletterEmail');
    const messageEl = document.getElementById('newsletterMessage');
    const button = form.querySelector('button');
    const email = emailInput.value.trim();
    
    // Validação
    if (!email) {
      showNewsletterMessage(messageEl, 'Por favor, insira seu e-mail.', 'error');
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      showNewsletterMessage(messageEl, 'Por favor, insira um e-mail válido.', 'error');
      return;
    }
    
    // Desabilitar botão durante envio
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = 'Enviando...';
    
    // Dados para enviar
    const templateParams = {
      email: email,
      data: new Date().toLocaleString('pt-BR')
    };
    
    try {
      // ATENÇÃO: Substitua pelos SEUS IDs do EmailJS
      const serviceId = 'service_xuqyqgs';  // Seu Service ID
      const templateId = 'template_newsletter';  // Template criado
      const publicKey = 'Fg-rRL1eurjzwgTIE';  // Sua Public Key
      
      const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);
      
      console.log('Sucesso:', response);
      showNewsletterMessage(messageEl, 'Inscrição realizada com sucesso! 🎉', 'success');
      emailInput.value = ''; // Limpar campo
      
    } catch (error) {
      console.error('Erro detalhado:', error);
      
      // Mensagens de erro específicas
      if (error.text === 'template not found') {
        showNewsletterMessage(messageEl, 'Erro de configuração. Template não encontrado. Contate o suporte.', 'error');
      } else if (error.text === 'invalid template parameter') {
        showNewsletterMessage(messageEl, 'Erro nos parâmetros do template. Contate o suporte.', 'error');
      } else {
        showNewsletterMessage(messageEl, 'Erro ao inscrever. Tente novamente mais tarde.', 'error');
      }
    } finally {
      // Reativar botão
      button.disabled = false;
      button.innerHTML = originalText;
      
      // Limpar mensagem após 5 segundos
      setTimeout(() => {
        if (messageEl) messageEl.textContent = '';
      }, 5000);
    }
  });
}

// Função auxiliar para mostrar mensagens
function showNewsletterMessage(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.style.color = type === 'success' ? '#27ae60' : '#e74c3c';
  element.style.fontSize = '0.85rem';
  element.style.marginTop = '1rem';
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  initNewsletter();
});