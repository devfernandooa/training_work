// ============================================================================
// TRAINING WORK - CAPTURA DE DADOS, MAKE.COM E WHATSAPP AUTOMÁTICO
// ============================================================================

// 1. Aplica máscara automática de telefone com DDD (Ex: (75) 99999-9999)
document.addEventListener('DOMContentLoaded', () => {
  const telInput = document.getElementById('telefone');
  if (telInput) {
    telInput.addEventListener('input', (e) => {
      let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
      e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });
  }
});

// 2. Rola suavemente até a seção de contato ao clicar em "Inscrever-se" nos cards
window.scrollToContact = () => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });

// 3. Função acionada ao clicar no botão de envio
window.submitContactForm = async function (button) {
  // Captura os elementos do formulário
  const fields = {
    nome: document.getElementById('nome'),
    telefone: document.getElementById('telefone'),
    email: document.getElementById('email'),
    curso: document.getElementById('curso'),
    mensagem: document.getElementById('mensagem')
  };

  // Coleta os valores digitados pelo usuário
  const data = {
    nome: fields.nome?.value.trim() || '',
    telefone: fields.telefone?.value.trim() || '',
    email: fields.email?.value.trim() || '',
    curso: fields.curso?.value || 'Não selecionado',
    mensagem: fields.mensagem?.value.trim() || 'Sem observações adicionais.'
  };

  // Validação básica de campos obrigatórios
  if (!data.nome || !data.email || data.telefone.length < 14) {
    alert("Por favor, preencha todos os campos obrigatórios (*)");
    return;
  }

  // Feedback visual no botão enquanto processa
  const originalText = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Registrando agendamento...`;

  // 🔴 COLE AQUI A SUA URL DO WEBHOOK GERADA NO MAKE.COM
  const makeWebhookUrl = "https://hook.eu2.make.com/SUA_URL_DO_WEBHOOK_AQUI";

  // 🔴 COLOQUE O SEU NÚMERO DO WHATSAPP (com DDI 55 + DDD + Número sem traços)
  const numeroWhatsApp = "5575999999999"; 

  // Mensagem institucional estruturada para o WhatsApp
  const textoWhatsApp = `*🚀 INSCRIÇÃO CONFIRMADA - TRAINING WORK*

Olá, ${data.nome}!
A Training Work agradece o seu contato!

Recebemos a sua inscrição com sucesso. Em breve, a confirmação da sua participação no curso será enviada para o WhatsApp e para o e-mail informados no momento do cadastro.

Agradecemos pela confiança e desejamos muito sucesso em sua jornada de aprendizado!

---------------------------------------
*📋 RESUMO DOS DADOS ENVIADOS:*
*Curso:* ${data.curso}
*WhatsApp:* ${data.telefone}
*E-mail:* ${data.email}
*Observações:* ${data.mensagem}`;

  const urlWhatsApp = `https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${encodeURIComponent(textoWhatsApp)}`;

  try {
    // Dispara os dados em formato JSON diretamente para o Webhook do Make.com
    await fetch(makeWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    // Limpa os campos do formulário após envio bem-sucedido
    Object.values(fields).forEach(f => { if (f) f.value = ''; });

    // Redireciona o usuário para o WhatsApp com a mensagem pronta
    window.open(urlWhatsApp, '_blank');
  } catch (error) {
    console.error("Erro ao enviar para o Make.com:", error);
    // Redireciona para o WhatsApp mesmo em caso de oscilação de rede para não perder o lead
    window.open(urlWhatsApp, '_blank');
  } finally {
    // Restaura o botão ao estado normal
    button.disabled = false;
    button.innerHTML = originalText;
  }
};