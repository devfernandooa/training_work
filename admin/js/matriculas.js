import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc,
  updateDoc 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// 1. Verificação de Autenticação
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }
  const userDisplay = document.getElementById("user-name");
  if (userDisplay) userDisplay.textContent = user.email.split('@')[0];

  iniciarListeners();
});

// Logout
const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => window.location.replace("login.html"));
  });
}

// Declaração de variáveis globais do módulo
let listaMatriculas = [];

function iniciarListeners() {
  const colRef = collection(db, "matriculas");
  
  onSnapshot(colRef, (snapshot) => {
    listaMatriculas = [];
    snapshot.forEach((docSnap) => {
      listaMatriculas.push({ id: docSnap.id, ...docSnap.data() });
    });

    atualizarCardsMetricas(listaMatriculas);
    renderizarTabelaMatriculas(listaMatriculas);
  }, (error) => {
    console.error("Erro ao escutar matrículas:", error);
    const tbody = document.getElementById("matriculas-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 2rem;">Erro ao carregar matrículas.</td></tr>`;
    }
  });
}

// 2. Atualizar Cards de Métricas do Topo (Busca por ID exato ou por posição nos cards)
function atualizarCardsMetricas(matriculas) {
  const total = matriculas.length;
  const confirmadas = matriculas.filter(m => {
    const status = m.status_matricula || m.status || "";
    return status.toLowerCase() === "confirmada" || status.toLowerCase() === "matriculado";
  }).length;
  
  const pendentes = matriculas.filter(m => {
    const aviso = m.aviso_whatsapp || "";
    return aviso === "pendente" || !aviso || m.notificacao_enviada === false;
  }).length;

  // Atualiza por ID se existirem, ou tenta achar pelos títulos dos cards visuais
  const elTotal = document.getElementById("stat-total");
  const elConfirmadas = document.getElementById("stat-confirmadas");
  const elPendentes = document.getElementById("stat-pendentes");

  if (elTotal) elTotal.textContent = total;
  if (elConfirmadas) elConfirmadas.textContent = confirmadas;
  if (elPendentes) elPendentes.textContent = pendentes;

  // Fallback caso os IDs não estejam nos elementos HTML do topo
  document.querySelectorAll(".card h6, .card span, .card p").forEach(el => {
    const texto = el.textContent.trim().toLowerCase();
    const h3 = el.parentElement.querySelector("h3");
    if (h3) {
      if (texto.includes("total de matrículas")) h3.textContent = total;
      if (texto.includes("confirmadas")) h3.textContent = confirmadas;
      if (texto.includes("avisos pendentes")) h3.textContent = pendentes;
    }
  });
}

// 3. Renderizar Tabela de Histórico de Matrículas
function renderizarTabelaMatriculas(matriculas) {
  const tbody = document.getElementById("matriculas-tbody");
  if (!tbody) return;

  const termo = (document.getElementById("busca-matricula")?.value || "").toLowerCase();

  tbody.innerHTML = "";
  const filtradas = matriculas.filter(m => {
    const nomeAluno = m.aluno_nome || m.nome_aluno || m.nome || "";
    const nomeCurso = m.curso_nome || m.nome_curso || m.curso || "";
    return nomeAluno.toLowerCase().includes(termo) || nomeCurso.toLowerCase().includes(termo);
  });

  if (filtradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhuma matrícula encontrada.</td></tr>`;
    return;
  }

  filtradas.forEach(m => {
    // Formatação robusta de Data (suporta data_matricula, criado_em, created_at, etc.)
    let dataFormatada = "Data não informada";
    const rawData = m.data_matricula || m.criado_em || m.data || m.created_at;
    
    if (rawData) {
      if (typeof rawData.toDate === "function") {
        dataFormatada = rawData.toDate().toLocaleDateString("pt-BR");
      } else {
        const parsedDate = new Date(rawData);
        if (!isNaN(parsedDate.getTime())) {
          dataFormatada = parsedDate.toLocaleDateString("pt-BR");
        } else if (typeof rawData === "string") {
          dataFormatada = rawData.split("T")[0].split("-").reverse().join("/");
        }
      }
    }

    const alunoNome = m.aluno_nome || m.nome_aluno || m.nome || m.nome_completo || "Aluno não identificado";
    const alunoContato = m.aluno_email || m.aluno_telefone || m.aluno_tel || m.email || m.telefone || "";
    const cursoNome = m.curso_nome || m.nome_curso || m.curso || "Curso não especificado";

    const statusMatricula = (m.status_matricula || m.status || "pendente").toLowerCase();
    const statusLabel = statusMatricula === "confirmada" || statusMatricula === "matriculado" ? "Confirmada" : (statusMatricula === "cancelada" ? "Cancelada" : "Pendente");
    const statusColor = statusLabel === "Confirmada" ? "#16a34a" : (statusLabel === "Cancelada" ? "#dc2626" : "#d97706");

    const pagamentoLabel = m.status_pagamento || m.pagamento || "Pendente";
    const avisoEnviado = m.aviso_whatsapp === "enviado" || m.notificacao_enviada === true;
    const avisoLabel = avisoEnviado ? "Enviado" : "Pendente";
    const avisoColor = avisoEnviado ? "#16a34a" : "#d97706";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${dataFormatada}</td>
      <td>
        <strong>${alunoNome}</strong><br>
        <small style="color: #64748b;">${alunoContato}</small>
      </td>
      <td>${cursoNome}</td>
      <td>${pagamentoLabel}</td>
      <td><span style="color: ${statusColor}; font-weight: 700; font-size: 0.85rem;">● ${statusLabel}</span></td>
      <td><span style="color: ${avisoColor}; font-weight: 600; font-size: 0.85rem;">● ${avisoLabel}</span></td>
      <td style="text-align: right;">
        <button class="btn btn-sm btn-outline-success me-1 whatsapp" data-wa-id="${m.id}" title="Enviar Aviso WhatsApp">
          <i class="fab fa-whatsapp"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger delete" data-delete-id="${m.id}" data-nome="${alunoNome}" title="Excluir Matrícula">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  configurarBotoesAcoes();
}

// 4. Configurar Eventos dos Botões da Tabela (WhatsApp e Excluir)
function configurarBotoesAcoes() {
  document.querySelectorAll("[data-wa-id]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-wa-id");
      const matricula = listaMatriculas.find(m => m.id === id);
      if (!matricula) return;

      const telefone = matricula.aluno_telefone || matricula.aluno_tel || matricula.telefone || "";
      const nomeAluno = matricula.aluno_nome || matricula.nome_aluno || "Aluno";
      const nomeCurso = matricula.curso_nome || matricula.nome_curso || "Treinamento";

      if (!telefone) {
        alert("O aluno não possui telefone cadastrado para envio de WhatsApp.");
        return;
      }

      try {
        await updateDoc(doc(db, "matriculas", id), { aviso_whatsapp: "enviado", notificacao_enviada: true });
      } catch (err) {
        console.error("Erro ao atualizar status do WhatsApp:", err);
      }

      const mensagem = encodeURIComponent(`Olá ${nomeAluno}, sua matrícula no curso ${nomeCurso} na Training Work foi registrada com sucesso! Estamos à disposição.`);
      window.open(`https://api.whatsapp.com/send?phone=55${telefone.replace(/\D/g, '')}&text=${mensagem}`, '_blank');
    });
  });

  document.querySelectorAll("[data-delete-id]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-delete-id");
      const nome = e.currentTarget.getAttribute("data-nome");

      const querExcluir = confirm(`Tem certeza que deseja excluir a matrícula de "${nome}"?`);
      if (!querExcluir) return;

      try {
        await deleteDoc(doc(db, "matriculas", id));
      } catch (err) {
        console.error("Erro ao excluir matrícula:", err);
        alert("Erro ao excluir: " + err.message);
      }
    });
  });
}

// 5. Filtro de Busca
document.getElementById("busca-matricula")?.addEventListener("input", () => {
  renderizarTabelaMatriculas(listaMatriculas);
});