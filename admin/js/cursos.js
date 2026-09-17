import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Verificação de Autenticação
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }
  const userDisplay = document.getElementById("user-display");
  if (userDisplay) userDisplay.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;

  iniciarListeners();
});

// Logout (com proteção caso o botão não exista na tela)
const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => window.location.replace("login.html"));
  });
}

// Declaração de variáveis globais do módulo
let totalMatriculasPorCurso = {};
let cursosCadastrados = [];

function iniciarListeners() {
  // Listener 1: Matrículas (para contar alunos em cada curso em andamento)
  onSnapshot(collection(db, "matriculas"), (snap) => {
    totalMatriculasPorCurso = {};
    snap.forEach((docSnap) => {
      const mat = docSnap.data();
      const nomeCurso = (mat.curso_nome || "").toLowerCase().trim();
      totalMatriculasPorCurso[nomeCurso] = (totalMatriculasPorCurso[nomeCurso] || 0) + 1;
    });
    renderizarCardsAndamento(cursosCadastrados);
  });

  // Listener 2: Cursos
  onSnapshot(collection(db, "cursos"), (snap) => {
    cursosCadastrados = [];
    // console.table(cursosCadastrados);
    snap.forEach((docSnap) => {
      cursosCadastrados.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderizarCardsAndamento(cursosCadastrados);
    renderizarTabelaCursos(cursosCadastrados);
  });
}

// 3. Renderizar Cards de Turmas em Andamento
function renderizarCardsAndamento(cursos) {
  const container = document.getElementById("cards-turmas-andamento");
  if (!container) return;

  const emAndamento = cursos.filter(c => c.status === "em_andamento" || c.status === "ativo");

  if (emAndamento.length === 0) {
    container.innerHTML = `<p style="color: #94a3b8; font-size: 0.9rem;">Nenhum curso com turma em andamento no momento.</p>`;
    return;
  }

  container.innerHTML = "";
  emAndamento.forEach(curso => {
    const nomeChave = (curso.nome || "").toLowerCase().trim();
    const qtdAlunos = totalMatriculasPorCurso[nomeChave] || 0;
    const professor = curso.professor || "Instrutor Técnico Training Work";

    const card = document.createElement("div");
    card.className = "turma-card";
    card.innerHTML = `
      <div>
        <div class="turma-card-header">
          <h3>${curso.nome}</h3>
          <span class="turma-badge">${curso.modalidade || "Presencial"}</span>
        </div>
        <div class="turma-meta">
          <span><i class="fas fa-user-tie"></i> <strong>Instrutor:</strong> ${professor}</span>
          <span><i class="fas fa-clock"></i> <strong>Carga:</strong> ${curso.carga_horaria || 40}h</span>
        </div>
      </div>
      <div class="turma-footer">
        <span class="aluno-count"><i class="fas fa-users"></i> ${qtdAlunos} Aluno(s)</span>
        <button class="btn-icon-table edit" data-edit-id="${curso.id}" title="Editar Detalhes">
          <i class="fas fa-pen"></i>
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  configurarBotoesEditar();
}

// 4. Renderizar Tabela do Catálogo Completo
function renderizarTabelaCursos(cursos) {
  const tbody = document.getElementById("cursos-tbody");
  if (!tbody) return;

  const termo = (document.getElementById("busca-curso")?.value || "").toLowerCase();

  tbody.innerHTML = "";
  const filtrados = cursos.filter(c => 
    (c.nome || "").toLowerCase().includes(termo) || 
    (c.slug || "").toLowerCase().includes(termo)
  );

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhum curso cadastrado.</td></tr>`;
    return;
  }

  filtrados.forEach(c => {
    const statusLabel = c.status === "em_andamento" ? "Em Andamento" : (c.status === "ativo" ? "Ativo" : "Inativo");
    const statusColor = c.status === "em_andamento" ? "#0284c7" : (c.status === "ativo" ? "#16a34a" : "#64748b");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${c.nome}</strong><br>
        <small style="color: #64748b;">${c.slug || c.id}</small>
      </td>
      <td>${c.carga_horaria || 0} horas</td>
      <td>R$ ${Number(c.valor || 0).toFixed(2).replace(".", ",")}</td>
      <td>${c.modalidade || "Presencial"}</td>
      <td>${c.professor || "A definir"}</td>
      <td><span style="color: ${statusColor}; font-weight: 700; font-size: 0.85rem;">● ${statusLabel}</span></td>
      <td style="text-align: right;">
        <button class="btn-icon-table edit" data-edit-id="${c.id}" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-icon-table delete" data-delete-id="${c.id}" data-nome="${c.nome}" title="Excluir">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  configurarBotoesEditar();
  configurarBotoesExcluir();
}

// 5. Abertura e Manipulação do Modal (Blindado com verificações de nulidade)
const modalCurso = document.getElementById("modal-curso");
const formCurso = document.getElementById("form-curso");
const btnNovoCurso = document.getElementById("btn-novo-curso");

if (btnNovoCurso && modalCurso && formCurso) {
  btnNovoCurso.addEventListener("click", () => {
    formCurso.reset();
    document.getElementById("curso-id").value = "";
    document.getElementById("modal-curso-titulo").textContent = "Novo Treinamento";
    document.getElementById("curso-slug").disabled = false;
    modalCurso.style.display = "flex";
  });
}

document.getElementById("modal-curso-fechar")?.addEventListener("click", () => modalCurso.style.display = "none");
document.getElementById("btn-cancelar-curso")?.addEventListener("click", () => modalCurso.style.display = "none");

// Salvar / Editar (Create / Update)
if (formCurso) {
  formCurso.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSalvar = document.getElementById("btn-salvar-curso");
    if (btnSalvar) {
      btnSalvar.disabled = true;
      btnSalvar.textContent = "Salvando...";
    }

    const idExistente = document.getElementById("curso-id").value;
    const slugInput = document.getElementById("curso-slug");
    const slug = (slugInput?.value || "").trim().toLowerCase().replace(/\s+/g, "-");
    const idDocumento = idExistente || slug;

    const ementaTexto = document.getElementById("curso-ementa")?.value || "";
    const ementaArray = ementaTexto.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    const dadosCurso = {
      nome: document.getElementById("curso-nome")?.value.trim() || "",
      slug: slug,
      carga_horaria: Number(document.getElementById("curso-carga")?.value || 0),
      valor: Number(document.getElementById("curso-valor")?.value || 0),
      modalidade: document.getElementById("curso-modalidade")?.value || "Presencial",
      professor: document.getElementById("curso-professor")?.value.trim() || "Instrutor Técnico Training Work",
      status: document.getElementById("curso-status")?.value || "ativo",
      descricao: document.getElementById("curso-descricao")?.value.trim() || "",
      ementa: ementaArray,
      atualizado_em: serverTimestamp()
    };

    try {
      await setDoc(doc(db, "cursos", idDocumento), dadosCurso, { merge: true });
      if (modalCurso) modalCurso.style.display = "none";
    } catch (err) {
      console.error("Erro ao salvar curso:", err);
      alert("Erro ao salvar curso: " + err.message);
    } finally {
      if (btnSalvar) {
        btnSalvar.disabled = false;
        btnSalvar.textContent = "Salvar Curso";
      }
    }
  });
}

// Configurar Ações de Edição
function configurarBotoesEditar() {
  document.querySelectorAll("[data-edit-id]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-edit-id");
      const curso = cursosCadastrados.find(c => c.id === id);
      if (!curso || !modalCurso) return;

      document.getElementById("curso-id").value = curso.id;
      document.getElementById("curso-nome").value = curso.nome || "";
      document.getElementById("curso-slug").value = curso.slug || curso.id;
      document.getElementById("curso-slug").disabled = true;
      document.getElementById("curso-carga").value = curso.carga_horaria || 40;
      document.getElementById("curso-valor").value = curso.valor || 0;
      document.getElementById("curso-modalidade").value = curso.modalidade || "Presencial";
      document.getElementById("curso-professor").value = curso.professor || "";
      document.getElementById("curso-status").value = curso.status || "ativo";
      document.getElementById("curso-descricao").value = curso.descricao || "";
      document.getElementById("curso-ementa").value = Array.isArray(curso.ementa) ? curso.ementa.join("\n") : "";

      document.getElementById("modal-curso-titulo").textContent = `Editar: ${curso.nome}`;
      modalCurso.style.display = "flex";
    });
  });
}

// Configurar Exclusão (Delete)
function configurarBotoesExcluir() {
  document.querySelectorAll("[data-delete-id]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-delete-id");
      const nome = e.currentTarget.getAttribute("data-nome");

      const querExcluir = confirm(`Tem certeza que deseja excluir o curso "${nome}"? Esta ação removerá o curso do catálogo.`);
      if (!querExcluir) return;

      try {
        await deleteDoc(doc(db, "cursos", id));
      } catch (err) {
        console.error("Erro ao excluir curso:", err);
        alert("Erro ao excluir: " + err.message);
      }
    });
  });
}

// Filtro de Busca
document.getElementById("busca-curso")?.addEventListener("input", () => {
  renderizarTabelaCursos(cursosCadastrados);
});