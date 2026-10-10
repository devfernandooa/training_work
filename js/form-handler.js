// ============================================================================
// TRAINING WORK - FORMULÁRIO DE CONTATO → FIRESTORE + WHATSAPP ADMIN
// ============================================================================
import { db } from './firebase-config.js'; // ajuste o caminho se necessário
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ----------------------------------------------------------------------------
// 1. Máscara de telefone com DDD
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const telInput = document.getElementById('telefone');
  if (telInput) {
    telInput.addEventListener('input', (e) => {
      let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
      e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });
  }

  // Liga o submit do form ao handler (evita recarregar a página)
  const form = document.getElementById('formContato');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      window.submitContactForm(e.submitter || form.querySelector('button[type="submit"]'));
    });
  }
});

// ----------------------------------------------------------------------------
// 2. Rola suavemente até a seção de contato
// ----------------------------------------------------------------------------
window.scrollToContact = () =>
  document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });

// ----------------------------------------------------------------------------
// 3. Envio do formulário
// ----------------------------------------------------------------------------
window.submitContactForm = async function (button) {
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
    cursoId: fields.curso?.value || '',
    cursoNome:
      fields.curso?.selectedOptions?.[0]?.textContent?.trim() || 'Não selecionado',
    mensagem: fields.mensagem?.value.trim() || 'Sem observações adicionais.'
  };

  // Validação
  if (!data.nome || !data.email || data.telefone.length < 14) {
    alert('Por favor, preencha todos os campos obrigatórios (*)');
    return;
  }

  const originalText = button ? button.innerHTML : '';
  if (button) {
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Registrando...`;
  }

  try {
    // ── 1) Grava no Firestore ────────────────────────────────────────────
    await addDoc(collection(db, 'leads'), {
      name: data.nome,
      email: data.email,
      telefone: data.telefone,
      curso_interesse_id: data.cursoId,
      curso_interesse_name: data.cursoNome,
      mensagem: data.mensagem,
      origem: 'Site / Formulário',
      status: 'Novo',
      excluido: false,
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp()
    });

    // ── 2) Notifica o admin no WhatsApp ─────────────────────────────────
    const numeroAdmin = '5575992849369';
    const msgAdmin = `🔔 *NOVO LEAD CADASTRADO - TRAINING WORK*

*Nome:* ${data.nome}
*Curso:* ${data.cursoNome}
*WhatsApp:* ${data.telefone}
*E-mail:* ${data.email}
*Mensagem:* ${data.mensagem}

👉 Acesse o painel para tratar este lead.`;

    const urlWhatsApp = `https://wa.me/${numeroAdmin}?text=${encodeURIComponent(msgAdmin)}`;
    window.open(urlWhatsApp, '_blank');

    // ── 3) Limpa o formulário ───────────────────────────────────────────
    Object.values(fields).forEach((f) => {
      if (f) f.value = '';
    });

  } catch (error) {
    console.error('Erro ao registrar lead:', error);
    alert('Não foi possível registrar seu contato. Tente novamente em instantes.');
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }
};