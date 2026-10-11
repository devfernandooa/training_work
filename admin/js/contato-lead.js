/**
 * =========================================================================
 * TRAINING WORK — CONTATO/LEAD PÚBLICO (contato-lead.js)
 * =========================================================================
 *
 * Responsabilidades:
 *   1. Popular o <select id="curso"> com cursos do Firestore
 *   2. Aplicar máscara de telefone
 *   3. Ao enviar:
 *        - Grava lead no Firestore (com aceita_whatsapp)
 *        - Dispara e-mail de notificação via EmailJS
 *        - Mostra confirmação
 * =========================================================================
 */

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/* ==========================================================================
 * ⚙️ CONFIGURAÇÃO DO EMAILJS
 * ==========================================================================
 * Substitua os valores pelos do seu painel EmailJS.
 */
const EMAILJS_PUBLIC_KEY = "Fg-rRL1eurjzwgTIE";
const EMAILJS_SERVICE_ID = "service_lif41td";
const EMAILJS_TEMPLATE_ID = "template_7ttj50m";

// Número do WhatsApp do admin (caso queira usar em algum lugar)
const NUMERO_ADMIN = "5575992849369";


/* ==========================================================================
 * 1. POPULAR O <select id="curso">
 * ========================================================================== */
async function carregarCursosNoSelect() {
  const selectCurso = document.getElementById("curso");
  if (!selectCurso) return;

  try {
    const snapshot = await getDocs(collection(db, "cursos"));
    if (snapshot.empty) {
      console.warn("⚠️ Coleção 'cursos' vazia.");
      return;
    }

    selectCurso.innerHTML = '<option value="">Selecione um curso...</option>';

    const cursos = [];
    snapshot.forEach((docSnap) => {
      const curso = docSnap.data();

      // Ignora cursos excluídos ou inativos
      if (curso.excluido === true) return;
      if (curso.ativo === false) return;

      cursos.push({
        id: docSnap.id,
        nome: curso.nome || curso.titulo || docSnap.id
      });
    });

    // Ordena alfabeticamente
    cursos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    cursos.forEach(({ id, nome }) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = nome;
      option.dataset.nome = nome;
      selectCurso.appendChild(option);
    });

    console.log(`✅ ${cursos.length} cursos carregados.`);
  } catch (erro) {
    console.error("❌ Erro ao carregar cursos:", erro);
  }
}


/* ==========================================================================
 * 2. MÁSCARA DE TELEFONE (75) 99999-9999
 * ========================================================================== */
function aplicarMascaraTelefone() {
  const telInput = document.getElementById("telefone");
  if (!telInput) return;

  telInput.addEventListener("input", (e) => {
    const x = e.target.value
      .replace(/\D/g, "")
      .match(/(\d{0,2})(\d{0,5})(\d{0,4})/);

    e.target.value = !x[2]
      ? x[1]
      : "(" + x[1] + ") " + x[2] + (x[3] ? "-" + x[3] : "");
  });
}


/* ==========================================================================
 * 3. ENVIO DE E-MAIL VIA EMAILJS
 * ========================================================================== */
async function enviarEmailNotificacao(dados) {
  if (!window.emailjs) {
    console.warn("⚠️ EmailJS não carregado.");
    return false;
  }

  // Gera link do WhatsApp do cliente (pra colocar no e-mail)
  const numeroLimpo = "55" + dados.telefone.replace(/\D/g, "");
  const textoWhats = `Olá ${dados.nome}, recebemos seu contato sobre o curso "${dados.cursoNome}". Podemos conversar?`;
  const whatsappLink = `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(textoWhats)}`;

  try {
    await window.emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        // Estas variáveis devem bater com as {{tags}} do template EmailJS
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        curso: dados.cursoNome,
        mensagem: dados.mensagem,
        aceita_whatsapp: dados.aceitaWhatsapp ? "Sim ✅" : "Não",
        data_envio: new Date().toLocaleString("pt-BR"),
        whatsapp_link: whatsappLink
      },
      EMAILJS_PUBLIC_KEY
    );

    console.log("✅ E-mail de notificação enviado!");
    return true;
  } catch (erro) {
    console.error("❌ Falha ao enviar e-mail:", erro);
    return false;
  }
}


/* ==========================================================================
 * 4. SUBMIT DO FORMULÁRIO
 * ========================================================================== */
function ligarSubmitFormulario() {
  const form = document.getElementById("formContato");
  if (!form) {
    console.warn("⚠️ #formContato não encontrado.");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = e.submitter || form.querySelector('button[type="submit"]');

    // Coleta dados
    const nome = document.getElementById("nome")?.value.trim() || "";
    const telefone = document.getElementById("telefone")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const selectCurso = document.getElementById("curso");
    const cursoId = selectCurso?.value || "";
    const cursoNome = selectCurso?.selectedOptions?.[0]?.dataset?.nome
      || selectCurso?.selectedOptions?.[0]?.textContent?.trim()
      || "Não selecionado";
    const mensagem = document.getElementById("mensagem")?.value.trim()
      || "Sem observações adicionais.";
    const aceitaWhatsapp = document.getElementById("aceita_whatsapp")?.checked || false;

    // Validação
    if (!nome || !email || telefone.length < 14) {
      alert("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }
    if (!cursoId) {
      alert("Por favor, selecione um curso de interesse.");
      return;
    }

    // Feedback visual
    const originalText = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Enviando...`;
    }

    const dados = { nome, telefone, email, cursoId, cursoNome, mensagem, aceitaWhatsapp };

    try {
      // ── 1) Grava no Firestore ───────────────────────────────────────
      const agora = new Date().toISOString();

      await addDoc(collection(db, "leads"), {
        name: nome,
        email: email,
        telefone: telefone,
        curso_interesse_id: cursoId,
        curso_interesse_name: cursoNome,
        mensagem: mensagem,
        aceita_whatsapp: aceitaWhatsapp,
        origem: "Site / Formulário",
        status: "Novo",
        prioridade: "Média",
        excluido: false,
        criado_em: agora,
        atualizado_em: agora,
        atualizado_por: "Site / Formulário"
      });

      console.log("✅ Lead gravado no Firestore.");

      // ── 2) Dispara e-mail (não bloqueia se falhar) ──────────────────
      await enviarEmailNotificacao(dados);

      // ── 3) Limpa o form ─────────────────────────────────────────────
      form.reset();

      // ── 4) Confirma pro cliente ─────────────────────────────────────
      alert("✅ Recebemos seu contato! Em breve nossa equipe entrará em contato.");

    } catch (erro) {
      console.error("❌ Erro ao registrar lead:", erro);
      alert("Ocorreu um erro ao enviar. Tente novamente em instantes.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  });
}


/* ==========================================================================
 * INICIALIZAÇÃO
 * ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  carregarCursosNoSelect();
  aplicarMascaraTelefone();
  ligarSubmitFormulario();
});