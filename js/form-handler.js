// ============================================================================
// TRAINING WORK - MODULE: FORM HANDLER & WHATSAPP AUTOMATION
// ============================================================================

// 1. Aplicação Automática da Máscara de Telefone (UX)
document.addEventListener('DOMContentLoaded', () => {
  const telInput = document.getElementById('telefone');
  if (telInput) {
    telInput.addEventListener('input', (e) => {
      let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
      e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });
  }
});

// 2. Processamento Principal do Formulário
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

  // Validação rígida de preenchimento e tamanho mínimo da máscara (xx) xxxxx-xxxx
  if (!data.nome || !data.email || data.telefone.length < 14) {
    alert("Por favor, preencha o Nome, E-mail e um Telefone válido com DDD.");
    return;
  }

  // Feedback Visual e proteção contra múltiplos cliques por ansiedade
  const originalText = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processando...`;

  // NÚMERO DE WHATSAPP DA EMPRESA (Ajuste o DDD e o número aqui se necessário)
  const numeroWhatsApp = "5575992849369"; 

  // Texto Institucional Solicitado Formatado para o Cliente ler no Bloco de Texto
  const textoMensagem = `*🚀 INSCRIÇÃO CONFIRMADA - TRAINING WORK*

Olá, ${data.nome}!
A Training Work agradece o seu contato!

Recebemos a sua inscrição com sucesso. Em breve, a confirmação da sua participação no curso será enviada para o WhatsApp e para o e-mail informados no momento do cadastro.

Agradecemos pela confiança e desejamos muito sucesso em sua jornada de aprendizado!

---------------------------------------
*📋 RESUMO DOS DADOS ENVIADOS:*
*Curso de Interesse:* ${data.curso || 'Não selecionado'}
*WhatsApp Cadastrado:* ${data.telefone}
*E-mail Cadastrado:* ${data.email}
*Observações:* ${data.mensagem || 'Nenhuma.'}`;

  // Codificação segura para evitar falhas de caracteres especiais na URL
  const urlWhatsApp = `https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${encodeURIComponent(textoMensagem)}`;

  // Disparo assíncrono paralelo (EmailJS) + Redirecionamento
  emailjs.send('service_xuqyqgs', 'template_blvq78f', data)
    .then(() => {
      // Sucesso: Limpa os inputs e abre o canal de atendimento
      Object.values(fields).forEach(f => { if (f) f.value = ''; });
      window.open(urlWhatsApp, '_blank');
    })
    .catch((error) => {
      console.error('Falha temporária no servidor de e-mail. Direcionando para contingência WhatsApp.', error);
      // Fallback de Segurança: Garante a abertura do WhatsApp mesmo se o EmailJS falhar
      window.open(urlWhatsApp, '_blank');
    })
    .finally(() => {
      // Restaura o estado original do botão do formulário
      button.disabled = false;
      button.innerHTML = originalText;
    });
};