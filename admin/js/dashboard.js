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
//console.table(user)
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  if (userDisplay) {
    userDisplay.innerHTML = `
    <i class="fas fa-user-circle"></i> ${user.email}`;
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
      listaInscricoes.push({ id: docSnap.id, ...docSnap.data() });
    });

    listaInscricoes.sort((a, b) => {
      const dataA = new Date(a.criado_em || 0).getTime();
      const dataB = new Date(b.criado_em || 0).getTime();
      return dataB - dataA;
    });

    renderizarTabela(listaInscricoes);
  }, (error) => {
    console.error("Erro na leitura do Firestore:", error);
  });
}

// 3. Renderização com Ícones e Ações Dinâmicas por Status
function renderizarTabela(leads) {
  const tbody = document.getElementById("leads-tbody");
  const filterElement = document.getElementById("filter-priority");
  const filtro = filterElement ? filterElement.value : "all";

  if (!tbody) return;
  tbody.innerHTML = "";

  const filtrados = filtro === "all" ? leads : leads.filter(l => (l.prioridade || "Média") === filtro);

  let alta = 0;
  let emAtendimento = 0;

  leads.forEach(l => {
    if ((l.prioridade || "").toLowerCase() === "alta") alta++;
    if (l.status === "em_contato") emAtendimento++;
  });

  const elTotal = document.getElementById("metric-total");
  const elAlta = document.getElementById("metric-alta");
  const elAtendimento = document.getElementById("metric-atendimento");

  if (elTotal) elTotal.textContent = leads.length;
  if (elAlta) elAlta.textContent = alta;
  if (elAtendimento) elAtendimento.textContent = emAtendimento;

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhuma inscrição encontrada.</td></tr>`;
    return;
  }

  filtrados.forEach(lead => {
    const status = lead.status || "novo";
    const prioridade = lead.prioridade || "Média";

    let badgeClass = "priority-media";
    if (prioridade.toLowerCase() === "alta") badgeClass = "priority-alta";
    if (prioridade.toLowerCase() === "baixa") badgeClass = "priority-baixa";

    const cleanPhone = (lead.telefone || "").replace(/\D/g, "");
    const ddiPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const zapMsg = encodeURIComponent(`Olá ${lead.nome || ""}! Sou da Training Work sobre seu interesse no curso de ${lead.curso || ""}.`);
    const zapLink = `https://wa.me/${ddiPhone}?text=${zapMsg}`;

    // Coluna Status (Badge com Ícone)
    let statusPill = "";
    if (status === "novo") {
      statusPill = `<span class="status-pill status-novo"><i class="fas fa-sparkles"></i> Novo</span>`;
    } else if (status === "em_contato") {
      statusPill = `<span class="status-pill status-em_contato"><i class="fas fa-headset"></i> Em Contato</span>`;
    } else if (status === "matriculado") {
      statusPill = `<span class="status-pill status-matriculado"><i class="fas fa-check-circle"></i> Matriculado</span>`;
    } else if (status === "perdido") {
      statusPill = `<span class="status-pill status-perdido"><i class="fas fa-archive"></i> Perdido</span>`;
    }

    // Coluna Ações (Adaptada ao Status Atual)
    let botoesAcao = "";
    if (status === "novo") {
      botoesAcao = `
        <a href="${zapLink}" target="_blank" class="btn-whatsapp" data-action="contatar" data-id="${lead.id}" title="Falar e mover para Em Contato">
          <i class="fab fa-whatsapp"></i> Contatar
        </a>
      `;
    } else if (status === "em_contato") {
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

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${lead.criado_em ? new Date(lead.criado_em).toLocaleDateString("pt-BR") : "Recente"}</td>
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
      <td>
        <div class="actions-group">
          ${botoesAcao}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  configurarInteracoes(leads);
}

// 4. Modal e Eventos de Status
let leadSelecionadoParaMatricula = null;

function configurarInteracoes(leads) {
  // Quando clica em "Contatar" no WhatsApp no status Novo, move automaticamente para "Em Contato"
  document.querySelectorAll("[data-action='contatar']").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      await updateDoc(doc(db, "inscricoes", id), { status: "em_contato" });
    });
  });

  // Botão Marcar como Perdido
  document.querySelectorAll(".btn-perdido-action").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      await updateDoc(doc(db, "inscricoes", id), { status: "perdido" });
    });
  });

  // Botão Reativar
  document.querySelectorAll(".btn-reativar-action").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      await updateDoc(doc(db, "inscricoes", id), { status: "em_contato" });
    });
  });

  // Abrir Modal de Matrícula
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

      // 1. Grava no Aluno
      await setDoc(doc(db, "alunos", alunoId), {
        nome: lead.nome || "Não informado",
        email: lead.email || "",
        telefone: cleanPhone,
        status: "ativo",
        lead_origem_id: lead.id,
        criado_em: new Date().toISOString()
      }, { merge: true });

      // 2. Cria Matrícula
      await addDoc(collection(db, "matriculas"), {
        aluno_id: alunoId,
        aluno_nome: lead.nome || "Não informado",
        aluno_telefone: cleanPhone,
        aluno_email: lead.email || "",
        curso_nome: lead.curso || "Geral",
        status_pagamento: "aprovado",
        status_matricula: "confirmada",
        notificacao_enviada: false,
        canal_notificacao: "whatsapp",
        data_envio_notificacao: null,
        data_matricula: new Date().toISOString()
      });

      // 3. Atualiza o Lead para Matriculado
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

// Filtro de Prioridade
const filterPriority = document.getElementById("filter-priority");
if (filterPriority) {
  filterPriority.addEventListener("change", () => {
    renderizarTabela(listaInscricoes);
  });
}