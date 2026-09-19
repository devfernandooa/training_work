import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Verificação de Autenticação
onAuthStateChanged(auth, (user) => {
  const userDisplay = document.getElementById("user-display");
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  if (userDisplay) {
    userDisplay.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;
  }

  escutarInscricoes();
});

// Logout
const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => window.location.replace("login.html"));
  });
}

// 2. Escuta Firestore em Tempo Real
let listaInscricoes = [];

function escutarInscricoes() {
  const colRef = collection(db, "inscricoes");

  onSnapshot(colRef, (snapshot) => {
    listaInscricoes = [];

    snapshot.forEach((docSnap) => {
      const dataLead = docSnap.data();
      listaInscricoes.post ? null : listaInscricoes.push({ id: docSnap.id, ...dataLead });
    });

    // Ordenação segura por data (compatível com timestamp ou string)
    listaInscricoes.sort((a, b) => {
      const tempoA = a.criado_em ? new Date(a.criado_em).getTime() : (a.data?.seconds ? a.data.seconds * 1000 : 0);
      const tempoB = b.criado_em ? new Date(b.criado_em).getTime() : (b.data?.seconds ? b.data.seconds * 1000 : 0);
      return tempoB - tempoA;
    });

    renderizarTabela(listaInscricoes);
  }, (error) => {
    console.error("Erro na leitura do Firestore:", error);
  });
}

// 3. Renderização com Segurança contra Erros e Suporte Mobile
function renderizarTabela(leads) {
  const tbody = document.getElementById("leads-tbody");
  const mobileContainer = document.getElementById("leads-mobile-container");
  const filterElement = document.getElementById("filter-priority");
  const filtro = filterElement ? filterElement.value : "all";

  if (!tbody) {
    console.warn("Elemento 'leads-tbody' não encontrado no HTML.");
    return;
  }

  tbody.innerHTML = "";
  if (mobileContainer) mobileContainer.innerHTML = "";

  const filtrados = filtro === "all" ? leads : leads.filter(l => (l.prioridade || "Média").toLowerCase() === filtro.toLowerCase());

  let alta = 0;
  let emAtendimento = 0;

  leads.forEach(l => {
    const prio = (l.prioridade || "").toLowerCase();
    const stat = (l.status || "").toLowerCase();
    if (prio === "alta") alta++;
    if (stat === "em_contato" || stat === "em atendimento") emAtendimento++;
  });

  const elTotal = document.getElementById("metric-total");
  const elAlta = document.getElementById("metric-alta");
  const elAtendimento = document.getElementById("metric-atendimento");

  if (elTotal) elTotal.textContent = leads.length;
  if (elAlta) elAlta.textContent = alta;
  if (elAtendimento) elAtendimento.textContent = emAtendimento;

  if (filtrados.length === 0) {
    const msgVazia = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhuma inscrição encontrada.</td></tr>`;
    tbody.innerHTML = msgVazia;
    if (mobileContainer) {
      mobileContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhuma inscrição encontrada.</div>`;
    }
    return;
  }

  let htmlDesktop = "";
  let htmlMobile = "";

  filtrados.forEach(lead => {
    const status = (lead.status || "novo").toLowerCase();
    const prioridade = lead.prioridade || "Média";

    let badgeClass = "priority-media";
    if (prioridade.toLowerCase() === "alta") badgeClass = "priority-alta";
    if (prioridade.toLowerCase() === "baixa") badgeClass = "priority-baixa";

    const cleanPhone = (lead.telefone || "").replace(/\D/g, "");
    const ddiPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const zapMsg = encodeURIComponent(`Olá ${lead.nome || ""}! Sou da Training Work sobre seu interesse no curso de ${lead.curso || ""}.`);
    const zapLink = `https://wa.me/${ddiPhone}?text=${zapMsg}`;

    let statusPill = "";
    if (status === "novo" || status === "pendente") {
      statusPill = `<span class="status-pill status-novo"><i class="fas fa-sparkles"></i> Novo</span>`;
    } else if (status === "em_contato" || status === "em atendimento") {
      statusPill = `<span class="status-pill status-em_contato"><i class="fas fa-headset"></i> Em Contato</span>`;
    } else if (status === "matriculado") {
      statusPill = `<span class="status-pill status-matriculado"><i class="fas fa-check-circle"></i> Matriculado</span>`;
    } else if (status === "perdido") {
      statusPill = `<span class="status-pill status-perdido"><i class="fas fa-archive"></i> Perdido</span>`;
    }

    let botoesAcao = "";
    if (status === "novo" || status === "pendente") {
      botoesAcao = `
        <a href="${zapLink}" target="_blank" class="btn-whatsapp" data-action="contatar" data-id="${lead.id}" title="Falar e mover para Em Contato">
          <i class="fab fa-whatsapp"></i> Contatar
        </a>
      `;
    } else if (status === "em_contato" || status === "em atendimento") {
      botoesAcao = `
        <a href="${zapLink}" target="_blank" class="btn-whatsapp" title="Continuar no WhatsApp">
          <i class="fab fa-whatsapp"></i>
        </a>
        <button class="btn-action-icon btn-matricular-action" data-id="${lead.id}" title="Matricular Aluno">
          <i class="fas fa-user-plus"></i> Matricular
        </button>
        <button class="btn-action-icon btn-perdido-action" data-id="${lead.id}" title="Marcar como Perdido">
          <i class="fas fa-times"></i>
        </button>
      `;
    } else if (status === "matriculado") {
      botoesAcao = `
        <span style="color: #15803d; font-size: 0.85rem; font-weight: 600;">
          <i class="fas fa-user-check"></i> Aluno Oficial
        </span>
      `;
    } else if (status === "perdido") {
      botoesAcao = `
        <button class="btn-action-icon btn-reativar-action" data-id="${lead.id}" title="Reativar Lead">
          <i class="fas fa-redo"></i> Reativar
        </button>
      `;
    }

    // Formatação segura da data
    let dataFormatada = "Recente";
    if (lead.criado_em) {
      dataFormatada = new Date(lead.criado_em).toLocaleDateString("pt-BR");
    } else if (lead.data?.toDate) {
      dataFormatada = lead.data.toDate().toLocaleDateString("pt-BR");
    } else if (lead.data?.seconds) {
      dataFormatada = new Date(lead.data.seconds * 1000).toLocaleDateString("pt-BR");
    }

    // 1. Linha Desktop (com os ícones de ação alinhados que construímos)
    htmlDesktop += `
      <tr>
        <td>${dataFormatada}</td>
        <td>
          <strong>${lead.nome || "Não informado"}</strong><br>
          <small style="color: #64748b;">${lead.email || ""}</small>
        </td>
        <td>${lead.curso || "Geral"}</td>
        <td><span class="badge-priority ${badgeClass}">${prioridade}</span></td>
        <td style="max-width: 250px; font-size: 0.8rem; color: #475569; line-height: 1.3;">
          ${lead.resumo_ia || lead.mensagem || "-"}
        </td>
        <td>${statusPill}</td>
        <td style="text-align: center;">
          <div class="actions-group" style="display: inline-flex; gap: 0.4rem; justify-content: center;">
            <a href="https://wa.me/${lead.telefone || ''}" target="_blank" class="btn-icon" title="Contatar WhatsApp">
              <i class="fab fa-whatsapp"></i>
            </a>
            <button onclick="abrirModalEditar('${lead.id}')" class="btn-icon" title="Editar Lead">
              <i class="fas fa-pen"></i>
            </button>
            <button onclick="excluirLeadLogico('${lead.id}')" class="btn-icon" title="Excluir Lead" style="color: #dc3545;">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;

    // 2. Bloco Mobile (Cartões)
    htmlMobile += `
      <div class="card-lead-item" style="background: white; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <div>
            <strong>${lead.nome || "Não informado"}</strong><br>
            <small style="color: #64748b;">${lead.email || ""}</small>
          </div>
          <span class="badge-priority ${badgeClass}">${prioridade}</span>
        </div>
        <div style="font-size: 0.85rem; color: #475569; margin-bottom: 0.75rem;">
          <p style="margin: 0.2rem 0;"><strong>Curso:</strong> ${lead.curso || "Geral"}</p>
          <p style="margin: 0.2rem 0;"><strong>Análise:</strong> ${lead.resumo_ia || lead.mensagem || "-"}</p>
          <p style="margin: 0.2rem 0;"><strong>Status:</strong> ${statusPill}</p>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; pt: 0.5rem; margin-top: 0.5rem; padding-top: 0.5rem;">
          <span style="font-size: 0.75rem; color: #94a3b8;">${dataFormatada}</span>
          <div style="display: inline-flex; gap: 0.4rem;">
            <a href="https://wa.me/${lead.telefone || ''}" target="_blank" class="btn-icon" title="Contatar WhatsApp">
              <i class="fab fa-whatsapp"></i>
            </a>
            <button onclick="abrirModalEditar('${lead.id}')" class="btn-icon" title="Editar Lead">
              <i class="fas fa-pen"></i>
            </button>
            <button onclick="excluirLeadLogico('${lead.id}')" class="btn-icon" title="Excluir Lead" style="color: #dc3545;">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  tbody.innerHTML = htmlDesktop;
  if (mobileContainer) {
    mobileContainer.innerHTML = htmlMobile;
  }

  configurarInteracoes(leads);
}

// 4. Modal e Eventos de Status
let leadSelecionadoParaMatricula = null;

function configurarInteracoes(leads) {
  document.querySelectorAll("[data-action='contatar']").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      await updateDoc(doc(db, "inscricoes", id), { status: "em_contato" });
    });
  });

  document.querySelectorAll(".btn-perdido-action").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      await updateDoc(doc(db, "inscricoes", id), { status: "perdido" });
    });
  });

  document.querySelectorAll(".btn-reativar-action").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      await updateDoc(doc(db, "inscricoes", id), { status: "em_contato" });
    });
  });

  document.querySelectorAll(".btn-matricular-action").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      leadSelecionadoParaMatricula = leads.find(l => l.id === id);

      if (leadSelecionadoParaMatricula) {
        document.getElementById("modal-titulo").textContent = `Matricular ${leadSelecionadoParaMatricula.nome}`;
        document.getElementById("modal-mensagem").innerHTML = `Confirmar matrícula no curso <strong>${leadSelecionadoParaMatricula.curso}</strong>?`;
        document.getElementById("modal-confirmacao").style.display = "flex";
      }
    });
  });
}

// Eventos do Modal
const modalConfirmacao = document.getElementById("modal-confirmacao");
const btnModalCancelar = document.getElementById("modal-btn-cancelar");
const btnModalConfirmar = document.getElementById("modal-btn-confirmar");

if (btnModalCancelar) {
  btnModalCancelar.addEventListener("click", () => {
    modalConfirmacao.style.display = "none";
    leadSelecionadoParaMatricula = null;
  });
}

if (btnModalConfirmar) {
  btnModalConfirmar.addEventListener("click", async () => {
    if (!leadSelecionadoParaMatricula) return;

    btnModalConfirmar.disabled = true;
    btnModalConfirmar.textContent = "Gravando...";

    try {
      const lead = leadSelecionadoParaMatricula;
      const cleanPhone = (lead.telefone || "").replace(/\D/g, "");
      const alunoId = lead.cpf ? lead.cpf.replace(/\D/g, "") : `aluno_${Date.now()}`;

      await setDoc(doc(db, "alunos", alunoId), {
        nome: lead.nome || "Não informado",
        email: lead.email || "",
        telefone: cleanPhone,
        status: "ativo",
        lead_origem_id: lead.id,
        criado_em: new Date().toISOString()
      }, { merge: true });

      await addDoc(collection(db, "matriculas"), {
        aluno_id: alunoId,
        aluno_nome: lead.nome || "Não informado",
        aluno_telefone: cleanPhone,
        aluno_email: lead.email || "",
        curso_nome: lead.curso || "Geral",
        status_pagamento: "aprovado",
        status_matricula: "confirmada",
        data_matricula: new Date().toISOString()
      });

      await updateDoc(doc(db, "inscricoes", lead.id), { status: "matriculado" });

      modalConfirmacao.style.display = "none";
    } catch (err) {
      console.error("Erro ao converter matrícula:", err);
      alert("Erro ao matricular: " + err.message);
    } finally {
      btnModalConfirmar.disabled = false;
      btnModalConfirmar.textContent = "Confirmar Matrícula";
      leadSelecionadoParaMatricula = null;
    }
  });
}

const filterPriority = document.getElementById("filter-priority");
if (filterPriority) {
  filterPriority.addEventListener("change", () => {
    renderizarTabela(listaInscricoes);
  });
}