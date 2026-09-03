import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  collection, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Autenticação
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("/admin/login");
    return;
  }
  const userDisplay = document.getElementById("user-display");
  if (userDisplay) userDisplay.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;

  carregarDadosAlunos();
});

// Logout
document.getElementById("btn-logout").addEventListener("click", () => {
  signOut(auth).then(() => window.location.replace("/admin/login"));
});

// 2. Escuta em Tempo Real de Alunos e Matrículas
let listaAlunos = [];
let matriculasPorAluno = {};

function carregarDadosAlunos() {
  // Listener de Matrículas (agrupa cursos por aluno_id)
  onSnapshot(collection(db, "matriculas"), (snapMatriculas) => {
    matriculasPorAluno = {};
    snapMatriculas.forEach((docSnap) => {
      const mat = docSnap.data();
      const alunoId = mat.aluno_id;
      if (!matriculasPorAluno[alunoId]) {
        matriculasPorAluno[alunoId] = [];
      }
      matriculasPorAluno[alunoId].push(mat.curso_nome || "Geral");
    });
    renderizarTabelaAlunos(listaAlunos);
  });

  // Listener da Coleção Alunos
  onSnapshot(collection(db, "alunos"), (snapAlunos) => {
    listaAlunos = [];
    snapAlunos.forEach((docSnap) => {
      listaAlunos.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Ordena do mais recente para o mais antigo
    listaAlunos.sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0));

    renderizarTabelaAlunos(listaAlunos);
  });
}

function renderizarTabelaAlunos(alunos) {
  const tbody = document.getElementById("alunos-tbody");
  const termo = (document.getElementById("busca-aluno")?.value || "").toLowerCase();

  tbody.innerHTML = "";
  const filtrados = alunos.filter(a => 
    (a.nome || "").toLowerCase().includes(termo) || 
    (a.email || "").toLowerCase().includes(termo)
  );

  let ativos = 0;
  alunos.forEach(a => {
    if (a.status === "ativo" || !a.status) ativos++;
  });

  document.getElementById("metric-total-alunos").textContent = alunos.length;
  document.getElementById("metric-alunos-ativos").textContent = ativos;

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhum aluno encontrado.</td></tr>`;
    return;
  }

  filtrados.forEach(aluno => {
    const cursos = matriculasPorAluno[aluno.id] || [];
    const cursosTags = cursos.length > 0 
      ? cursos.map(c => `<span style="display:inline-block; background:#f1f5f9; color:#334155; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.75rem; margin: 2px;">${c}</span>`).join(" ")
      : `<span style="color:#94a3b8; font-size:0.8rem;">Sem matrículas ativas</span>`;

    const cleanPhone = (aluno.telefone || "").replace(/\D/g, "");
    const ddiPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const zapLink = `https://wa.me/${ddiPhone}`;

    const dataFormatada = aluno.criado_em ? new Date(aluno.criado_em).toLocaleDateString("pt-BR") : "Recente";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${aluno.nome || "Não informado"}</strong><br>
        <small style="color: #64748b;">${aluno.email || ""}</small>
      </td>
      <td>${aluno.telefone || "-"}</td>
      <td style="max-width: 250px;">${cursosTags}</td>
      <td>${dataFormatada}</td>
      <td><span style="color: #16a34a; font-weight: 700; font-size: 0.85rem;">● Ativo</span></td>
      <td>
        <a href="${zapLink}" target="_blank" class="btn-whatsapp" title="Falar no WhatsApp">
          <i class="fab fa-whatsapp"></i> Contato
        </a>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById("busca-aluno")?.addEventListener("input", () => {
  renderizarTabelaAlunos(listaAlunos);
});