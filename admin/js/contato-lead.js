/**
 * =========================================================================
 * TRAINING WORK — CONTATO/LEAD PÚBLICO (contato-lead.js)
 * =========================================================================
 *
 * Fluxo:
 *   1. Carrega cursos no <select>
 *   2. Aplica máscara de telefone
 *   3. Ao enviar:
 *        - Grava lead no Firestore (com aceita_whatsapp)
 *        - Dispara e-mail via EmailJS pro admin
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
 * Substitua os valores abaixo pelos do seu painel EmailJS.
 */
const EMAILJS_PUBLIC_KEY  = "SUA_PUBLIC_KEY_AQUI";
const EMAILJS_SERVICE_ID  = "SEU_SERVICE_ID_AQUI";
const EMAILJS_TEMPLATE_ID = "SEU_TEMPLATE_ID_AQUI";

// Número do WhatsApp do admin (pro botão no e-mail)
const NUMERO_ADMIN = "5575992849369";


/* ==========================================================================
 * 1. POPULAR O <select id="curso">
 * ========================================================================== */
async function carregarCursosNoSelect() {
  const selectCurso = document.getElementById("curso");
  if (!selectCurso) return;

  try {
    const snapshot = await getDocs(collection(db, "cursos"));
    if (snapshot.empty) return;

    selectCurso.innerHTML = '<option value="">Selecione um curso...</option>';

    const cursos = [];
    snapshot.forEach((docSnap) => {
      const curso = docSnap.data();
      if (curso.excluido === true) return;
      if (curso.ativo === false) return;

      cursos.push({
        id: docSnap.id,
        nome: curso.nome || curso.titulo || docSnap.id
      });
    });

    cursos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    cursos.forEach(({ id, nome }) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = nome;
      option.dataset.nome = nome;
      selectCurso.appendChild(option);
    });
  } catch (erro) {
    console.error("❌ Erro ao carregar cursos:", erro);
  }
}


/* ==========================================================================
 * 2. MÁSCARA DE TELEFONE
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
 * 3. ENVIA O E-MAIL VIA EMAILJS
 * ==========================================================================
 * Essa função é separada pra facilitar debug e reuso.
 */
async function enviarEmailNotificacao(dados) {
  // EmailJS precisa ser carregado globalmente no HTML via <script>
  if (!window.emailjs) {
    console.warn("⚠️ EmailJS não carregado. Pulando notificação por e-mail.");
    return false;
  }

  try {
    await window.emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        // Variáveis disponíveis no template (use {{nome}} no HTML do EmailJS):
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        curso: dados.cursoNome,
        mensagem: dados.mensagem,
        aceita_whatsapp: dados.aceitaWhatsapp ? "Sim ✅" : "Não",
        data_envio: new Date().toLocaleString("pt-BR"),
        // Link do WhatsApp do cliente (já formatado pra uso direto no template)
        whatsapp_link: `https://wa.me/55${dados.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${dados.nome}, recebemos seu contato sobre o curso "${dados.cursoNome}". Podemos conversar?`)}`,
        whatsapp_numero_limpo: `55${dados.telefone.replace(/\D/g, "")}`
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
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = e.submitter || form.querySelector('button[type="submit"]');

    const nome      = document.getElementById("nome")?.value.trim()     || "";
    const telefone  = document.getElementById("telefone")?.value.trim() || "";
    const email     = document.getElementById("email")?.value.trim()    || "";
    const selectCurso = document.getElementById("curso");
    const cursoId   = selectCurso?.value || "";
    const cursoNome = selectCurso?.selectedOptions?.[0]?.dataset?.nome
                    || selectCurso?.selectedOptions?.[0]?.textContent?.trim()
                    || "Não selecionado";
    const mensagem  = document.getElementById("mensagem")?.value.trim()
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

    const originalText = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Enviando...`;
    }

    const dados = { nome, telefone, email, cursoId, cursoNome, mensagem, aceitaWhatsapp };

    try {
      // ── 1) Grava o lead no Firestore ────────────────────────────────
      const agora = new Date().toISOString();

      await addDoc(collection(db, "leads"), {
        name: nome,
        email: email,
        telefone: telefone,
        curso_interesse_id: cursoId,
        curso_interesse_name: cursoNome,
        mensagem: mensagem,
        aceita_whatsapp: aceitaWhatsapp,      // ← novo campo
        origem: "Site / Formulário",
        status: "Novo",
        prioridade: "Média",
        excluido: false,
        criado_em: agora,
        atualizado_em: agora,
        atualizado_por: "Site / Formulário"
      });

      // ── 2) Dispara o e-mail pro admin (não bloqueia se falhar) ──────
      await enviarEmailNotificacao(dados);

      // ── 3) Limpa o formulário ───────────────────────────────────────
      form.reset();

      // ── 4) Feedback pro cliente ─────────────────────────────────────
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
