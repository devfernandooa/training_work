import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Validação de Sessão
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }
  const userDisplay = document.getElementById("user-display");
  if (userDisplay) userDisplay.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;

  escutarMatriculas();
});

// Logout
document.getElementById("btn-logout").addEventListener("click", () => {
  signOut(auth).then(() => window.location.replace("login.html"));
});

// 2. Escuta da Coleção Matriculas
let listaMatriculas = [];

function escutarMatriculas() {
  const colRef = collection(db, "matriculas");

  onSnapshot(colRef, (snapshot) => {
    listaMatriculas = [];

    snapshot.forEach((docSnap) => {
      listaMatriculas.push({ id: docSnap.id, ...docSnap.data() });
    });

    listaMatriculas.sort((a, b) => {
      const dataA = new Date(a.data_matricula || 0).getTime();
      const dataB = new Date(b.data_matricula || 0).getTime();
      return dataB - dataA;
    });

    renderizarTabela(listaMatriculas);
  }, (error) => {
    console.error("Erro ao carregar matrículas:", error);
  });
}

function renderizarTabela(matriculas) {
  const tbody = document.getElementById("matriculas-tbody");
  const termo = (document.getElementById("busca-matricula")?.value || "").toLowerCase();

  if (!tbody) return;
  tbody.innerHTML = "";

  const filtrados = matriculas.filter(m => 
    (m.aluno_nome || "").toLowerCase().includes(termo) || 
    (m.curso_nome || "").toLowerCase().includes(termo)
  );

  let confirmadas = 0;
  let pendentesAviso = 0;

  matriculas.forEach(m => {
    if (m.status_matricula === "confirmada") confirmadas++;
    if (!m.notificacao_enviada) pendentesAviso++;
  });

  document.getElementById("metric-total-matriculas").textContent = matriculas.length;
  document.getElementById("metric-confirmadas").textContent = confirmadas;
  document.getElementById("metric-pendentes").textContent = pendentesAviso;

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhuma matrícula encontrada.</td></tr>`;
    return;
  }

  filtrados.forEach(mat => {
    const dataFormatada = mat.data_matricula 
      ? new Date(mat.data_matricula).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) 
      : "Recente";

    const cleanPhone = (mat.aluno_telefone || "").replace(/\D/g, "");
    const ddiPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const textoBoasVindas = encodeURIComponent(
      `Olá ${mat.aluno_nome}! 🎓 Sua matrícula no curso *${mat.curso_nome}* foi confirmada com sucesso na Training Work. Seja bem-vindo(a)!`
    );
    const zapLink = `https://wa.me/${ddiPhone}?text=${textoBoasVindas}`;

    // Badge Notificação
    const badgeNotificacao = mat.notificacao_enviada
      ? `<span style="color: #15803d; font-weight: 700; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Enviado</span>`
      : `<span style="color: #b45309; font-weight: 700; font-size: 0.8rem;"><i class="fas fa-clock"></i> Pendente</span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${dataFormatada}</td>
      <td>
        <strong>${mat.aluno_nome || "Aluno não identificado"}</strong><br>
        <small style="color: #64748b;">${mat.aluno_email || mat.aluno_telefone || ""}</small>
      </td>
      <td><strong>${mat.curso_nome || "Geral"}</strong></td>
      <td><span style="background: #dcfce7; color: #15803d; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.78rem;">Pago</span></td>
      <td><span style="color: #0284c7; font-weight: 700; font-size: 0.85rem;">● Confirmada</span></td>
      <td>${badgeNotificacao}</td>
      <td style="text-align: right;">
        <a href="${zapLink}" target="_blank" class="btn-whatsapp btn-enviar-aviso" data-id="${mat.id}" title="Enviar confirmação e marcar como enviado">
          <i class="fab fa-whatsapp"></i> Confirmar
        </a>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Marcar como notificado ao clicar no WhatsApp
  document.querySelectorAll(".btn-enviar-aviso").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      try {
        await updateDoc(doc(db, "matriculas", id), {
          notificacao_enviada: true,
          data_envio_notificacao: new Date().toISOString()
        });
      } catch (err) {
        console.error("Erro ao atualizar notificação:", err);
      }
    });
  });
}

document.getElementById("busca-matricula")?.addEventListener("input", () => {
  renderizarTabela(listaMatriculas);
});