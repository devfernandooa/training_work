const midias = [
  {
    tipo: 'video',
    id: '5PUUwkI_UCE',
    titulo: 'Curso de Fibra Óptica',
    desc: 'Introdução à tecnologia de fibra óptica'
  },
  {
    tipo: 'imagem',
    url: '/training_work/img/galeria/img_01.jpeg',
    titulo: 'Infraestrutura de Rede',
    desc: 'Organização de racks estruturados.'
  },
  {
    tipo: 'video',
    id: 'K8M-ZwBh7gU',
    titulo: 'NR-35 Trabalho Altura',
    desc: 'Treinamento completo de segurança'
  },
  {
    tipo: 'imagem',
    url: '/training_work/img/galeria/img_02.jpeg',
    titulo: 'Fusão de Fibra',
    desc: 'Máquinas de alta precisão.'
  },
  {
    tipo: 'video',
    id: 'fYJl-7jRzuw',
    titulo: 'NR-10 Elétrica',
    desc: 'Segurança em instalações elétricas'
  },   {
    tipo: 'imagem',
    url: '/training_work/img/galeria/img_04.jpeg',
    titulo: 'Fusão de Fibra',
    desc: 'Máquinas de alta precisão.'
  }
];

document.addEventListener('DOMContentLoaded', function() {
  const grid = document.getElementById('galeriaGrid');
  const modal = document.getElementById('meuModal');
  const videoIframe = document.getElementById('videoIframe');
  const modalImagem = document.getElementById('modalImagem');
  const videoContainer = document.getElementById('modalVideoContainer');
  const imagemContainer = document.getElementById('modalImagemContainer');
  const btnFechar = document.querySelector('.fechar');
  const botoesFiltro = document.querySelectorAll('.filtro-btn');
  
  let filtroAtual = 'todos';

  // Substitua APENAS as funções de abrir e fechar no seu DOMContentLoaded:

  function abrirModal(item) {
    // 1. Limpa estados anteriores para não vazar áudio/imagem antiga
    videoIframe.src = '';
    modalImagem.src = '';

    // 2. Verifica o tipo de mídia e exibe o container correto
    if (item.tipo === 'video') {
      imagemContainer.style.display = 'none';
      videoContainer.style.display = 'block';
      // Injeta a URL do iframe
      videoIframe.src = `https://www.youtube.com/embed/${item.id}?autoplay=1&rel=0`;
    } else {
      videoContainer.style.display = 'none';
      imagemContainer.style.display = 'block';
      // Injeta a URL da imagem
      modalImagem.src = item.url;
      modalImagem.alt = item.titulo;
    }
    
    // 3. Adiciona a classe que ativa a opacidade e os cliques (pointer-events)
    modal.classList.add('mostrar');
    document.body.style.overflow = 'hidden'; // Trava o scroll da página de fundo
  }

  function fecharModal() {
    // 1. Remove a classe de visibilidade (inicia o fade-out do CSS)
    modal.classList.remove('mostrar');
    
    // 2. Limpa as mídias imediatamente para cortar o som do vídeo na hora
    videoIframe.src = '';
    
    // 3. Devolve o scroll para a página principal
    document.body.style.overflow = '';
  }

  // Função para montar a galeria baseada no filtro selecionado
  function montarGaleria() {
    grid.innerHTML = '';
    
    // Filtra os itens antes de desenhar na tela
    const itensFiltrados = midias.filter(item => filtroAtual === 'todos' || item.tipo === filtroAtual);

    itensFiltrados.forEach(item => {
      const card = document.createElement('div');
      card.className = 'galeria-item';
      card.addEventListener('click', () => abrirModal(item));
      
      const capaUrl = item.tipo === 'video' 
        ? `https://img.youtube.com/vi/${item.id}/maxresdefault.jpg` 
        : item.url;
        
      // Se for imagem, exibe a lupa (🔍), se for vídeo exibe o Play (▶)
      const botaoHover = item.tipo === 'video'
        ? `<div class="play-btn">▶</div>`
        : `<div class="zoom-btn">🔍</div>`;

      const onErrorAttr = item.tipo === 'video'
        ? `onerror="this.onerror=null; this.src='https://img.youtube.com/vi/${item.id}/hqdefault.jpg';"`
        : '';
      
      card.innerHTML = `
        <div class="galeria-thumb">
          <img src="${capaUrl}" alt="${item.titulo}" ${onErrorAttr}>
          ${botaoHover}
        </div>
        <div class="galeria-info">
          <h3>${item.titulo}</h3>
          <p>${item.desc}</p>
        </div>
      `;
      
      grid.appendChild(card);
    });
  }

  // Configuração dos cliques nas abas/filtros
  botoesFiltro.forEach(botao => {
    botao.addEventListener('click', function() {
      botoesFiltro.forEach(b => b.classList.remove('ativo'));
      this.classList.add('ativo');
      
      filtroAtual = this.getAttribute('data-tipo');
      montarGaleria();
    });
  });

  // Eventos de fechar o modal
  if (btnFechar) btnFechar.addEventListener('click', fecharModal);
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target === imagemContainer) fecharModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('mostrar')) fecharModal(); });

  // Inicializa a galeria com todos os itens
  montarGaleria();
});