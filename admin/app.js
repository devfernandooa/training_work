import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Substitua com as chaves do seu projeto training-work
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "training-work.firebaseapp.com",
  projectId: "training-work",
  storageBucket: "training-work.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 1. Verificação de Autenticação
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("../login.html");
  } else {
    document.getElementById("app-container").style.display = "flex";
    document.getElementById("user-email").innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;
    iniciarMonitoramentoLeads();
  }
});

// Botão Sair
document.getElementById("btn-logout").addEventListener("click", () => {
  signOut(auth).then(() => window.location.replace("../login.html"));
});

// 2. Monitoramento em Tempo Real das Inscrições
function iniciarMonitoramentoLeads() {
  const tbody = document.getElementById("leads-tbody");
  const q = query(collection(db, "inscricoes"), orderBy("criado_em", "desc"));

  onSnapshot(q, (snapshot) => {
    tbody.innerHTML = "";
    let total = 0;
    let alta = 0;
    let emAtendimento = 0;

    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">Nenhuma inscrição encontrada.</td></tr>`;
      return;
    }

    snapshot.forEach((docSnapshot) => {
      total++;
      const lead = docSnapshot.data();
      const id = docSnapshot.id;

      // Métricas
      const prioridade = lead.prioridade || "Média";
      if (prioridade === "Alta") alta++;
      if (lead.status === "em_contato") emAtendimento++;

      // Badge de prioridade
      let priorityClass = "priority-media";
      if (prioridade === "Alta") priorityClass = "priority-alta";
      if (prioridade === "Baixa") priorityClass = "priority-baixa";

      // Formatação de telefone e link WhatsApp
      const cleanPhone = (lead.telefone || "").replace(/\D/g, "");
      const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      const msgPadrao = encodeURIComponent(`Olá ${lead.nome}! Sou da Training Work. Vi seu interesse no curso de ${lead.curso}. Como podemos te ajudar?`);
      const zapLink = `https://wa.me/${fullPhone}?text=${msgPadrao}`;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${lead.criado_em ? new Date(lead.criado_em).toLocaleDateString("pt-BR") : "Hoje"}</td>
        <td>
          <strong>${lead.nome || "Não informado"}</strong><br>
          <small style="color:#64748b;">${lead.email || ""}</small>
        </td>
        <td>${lead.curso || "Geral"}</td>
        <td><span class="badge-priority ${priorityClass}">${prioridade}</span></td>
        <td style="max-width: 280px; font-size: 0.8rem; color: #475569;">${lead.resumo_ia || lead.mensagem || "Sem observações"}</td>
        <td>
          <select class="status-select" data-id="${id}">
            <option value="novo" ${lead.status === "novo" ? "selected" : ""}>Novo</option>
            <option value="em_contato" ${lead.status === "em_contato" ? "selected" : ""}>Em Contato</option>
            <option value="matriculado" ${lead.status === "matriculado" ? "selected" : ""}>Matriculado</option>
            <option value="perdido" ${lead.status === "perdido" ? "selected" : ""}>Perdido</option>
          </select>
        </td>
        <td>
          <a href="${zapLink}" target="_blank" class="btn-whatsapp">
            <i class="fab fa-whatsapp"></i> Chamar
          </a>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Atualiza os cards
    document.getElementById("metric-total").textContent = total;
    document.getElementById("metric-alta").textContent = alta;
    document.getElementById("metric-atendimento").textContent = emAtendimento;

    // Listener para troca de status em tempo real
    document.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", async (e) => {
        const leadId = e.target.getAttribute("data-id");
        const novoStatus = e.target.value;
        try {
          await updateDoc(doc(db, "inscricoes", leadId), { status: novoStatus });
        } catch (err) {
          console.error("Erro ao atualizar status:", err);
        }
      });
    });
  });
}