import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmNDeSYpQNzlecPYr14lyw0dOqL3HVSdo",
  authDomain: "training-work.firebaseapp.com",
  projectId: "training-work",
  storageBucket: "training-work.firebasestorage.app",
  messagingSenderId: "727749084762",
  appId: "1:727749084762:web:e000dd84decbb7d577fa63",
  measurementId: "G-1H1VC22G15"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let cursoAtualId = null;

// 1. Verificação de Autenticação antes de disparar buscas no Firestore
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }
  
  const userDisplay = document.getElementById("user-name");
  if (userDisplay) userDisplay.textContent = user.email.split('@')[0];

  // Dispara o carregamento somente após confirmar que está logado
  carregarCursosEmAndamento();
});

// 2. Função para carregar as turmas/cursos em andamento na tela principal
async function carregarCursosEmAndamento() {
  const grid = document.getElementById("turmasEmAndamentoGrid");
  if (!grid) return;

  try {
    const querySnapshot = await getDocs(collection(db, "cursos"));
    grid.innerHTML = "";

    if (querySnapshot.empty) {
      grid.innerHTML = "<p class='text-muted text-center w-100'>Nenhuma turma ou curso encontrado.</p>";
      return;
    }

    const snapshotMatriculas = await getDocs(collection(db, "matriculas"));
    const contagemAlunos = {};
    snapshotMatriculas.forEach((docMat) => {
      const mat = docMat.data();
      if (mat.curso_id) {
        contagemAlunos[mat.curso_id] = (contagemAlunos[mat.curso_id] || 0) + 1;
      }
    });

    querySnapshot.forEach((docSnap) => {
      const curso = docSnap.data();
      const cursoId = docSnap.id;
      const totalAlunos = contagemAlunos[cursoId] || 0;

      const colDiv = document.createElement("div");
      colDiv.className = "col-12 col-md-6 col-lg-3 mb-4";

      const ativo = curso.ativo !== false;
      const statusBadge = ativo 
        ? '<span class="badge bg-success bg-opacity-10 text-success px-2 py-1 rounded-pill" style="font-size: 0.70rem;">Ativo</span>'
        : '<span class="badge bg-danger bg-opacity-10 text-danger px-2 py-1 rounded-pill" style="font-size: 0.70rem;">Inativo</span>';

      const modalidadeBadge = `<span class="badge bg-primary bg-opacity-10 text-primary px-2 py-1 rounded-pill" style="font-size: 0.70rem;">${curso.modalidade || 'PRESENCIAL'}</span>`;

      colDiv.innerHTML = `
        <div class="card h-100 shadow-sm border-0 rounded-4 p-3 bg-white card-hover-effect">
          <div class="card-body d-flex flex-column justify-content-between p-2">
            <div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                ${modalidadeBadge}
                ${statusBadge}
              </div>
              <h6 class="card-title fw-bold text-dark mb-1" style="font-size: 0.95rem;">${curso.sigla ? curso.sigla + ' - ' : ''}${curso.nome}</h6>
              <p class="text-muted small mb-3" style="font-size: 0.8rem;">${curso.descricao ? curso.descricao : 'Sem descrição informada.'}</p>
              
              <div class="border-top pt-2 mb-3">
                <p class="mb-1 text-secondary small"><i class="bi bi-tag-fill me-1"></i> <strong>Categoria:</strong> ${curso.categoria || 'Geral'}</p>
                <p class="mb-1 text-secondary small"><i class="bi bi-person-fill me-1"></i> <strong>Instrutor:</strong> ${curso.instrutor || 'Instrutor Técnico Training Work'}</p>
                <p class="mb-1 text-secondary small"><i class="bi bi-clock me-1"></i> <strong>Carga:</strong> ${curso.carga_horaria || curso.carga || 0}h</p>
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center border-top pt-2 mt-auto">
              <span class="text-success fw-semibold small"><i class="bi bi-people-fill me-1"></i> ${totalAlunos} Aluno(s)</span>
              <button class="btn btn-sm btn-outline-primary rounded-circle p-1 lh-1" title="Editar Turma" onclick="editarCurso('${cursoId}')" style="width: 32px; height: 32px;">
                ✏️
              </button>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(colDiv);
    });

  } catch (err) {
    console.error("Erro ao carregar turmas em andamento:", err);
    grid.innerHTML = "<p class='text-danger text-center w-100'>Erro ao carregar dados do painel.</p>";
  }
}

// 3. Função para gerenciar alunos dentro do modal de edição
async function carregarDadosAlunosModal(cursoId) {
  cursoAtualId = cursoId;
  const listaMatriculadosEl = document.getElementById("listaAlunosMatriculados");
  const selectDisponiveisEl = document.getElementById("selectAlunoDisponivel");

  if (!listaMatriculadosEl || !selectDisponiveisEl) return;

  listaMatriculadosEl.innerHTML = "";
  selectDisponiveisEl.innerHTML = '<option value="">Selecione um aluno...</option>';

  try {
    const snapshotMatriculas = await getDocs(collection(db, "matriculas"));
    const alunosComMatricula = new Set();
    const matriculasDesteCurso = [];

    snapshotMatriculas.forEach((docMat) => {
      const data = docMat.data();
      alunosComMatricula.add(data.aluno_id);
      if (data.curso_id === cursoId) {
        matriculasDesteCurso.push({ id: docMat.id, aluno_id: data.aluno_id });
      }
    });

    if (matriculasDesteCurso.length === 0) {
      listaMatriculadosEl.innerHTML = '<li class="list-group-item text-muted small border-0">Nenhum aluno matriculado nesta turma.</li>';
    } else {
      for (const mat of matriculasDesteCurso) {
        const alunoDoc = await getDoc(doc(db, "alunos", mat.aluno_id));
        const nomeAluno = alunoDoc.exists() ? (alunoDoc.data().nome || alunoDoc.data().email) : "Aluno desconhecido";

        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center py-1 px-2 border-0 bg-light mb-1 rounded";
        li.innerHTML = `
          <span class="small">${nomeAluno}</span>
          <button class="btn btn-sm text-danger p-0 border-0 bg-transparent" onclick="removerMatricula('${mat.id}', '${cursoId}')" title="Remover da turma">
            <i class="bi bi-x-circle-fill"></i>
          </button>
        `;
        listaMatriculadosEl.appendChild(li);
      }
    }

    const snapshotAlunos = await getDocs(collection(db, "alunos"));
    snapshotAlunos.forEach((docAluno) => {
      const alunoId = docAluno.id;
      if (!alunosComMatricula.has(alunoId)) {
        const alunoData = docAluno.data();
        const option = document.createElement("option");
        option.value = alunoId;
        option.textContent = alunoData.nome || alunoData.email || `Aluno ${alunoId.substring(0, 5)}`;
        selectDisponiveisEl.appendChild(option);
      }
    });

  } catch (error) {
    console.error("Erro ao carregar dados de alunos para o modal:", error);
  }
}

// 4. Função global chamada ao clicar no botão de editar do card
window.editarCurso = async function(id) {
  try {
    const docRef = doc(db, "cursos", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      
      document.getElementById("editCursoId").value = id;
      document.getElementById("editNomeCurso").value = data.nome || "";
      document.getElementById("editSiglaCurso").value = data.sigla || "";
      document.getElementById("editInstrutorCurso").value = data.instrutor || "";
      document.getElementById("editCargaCurso").value = data.carga_horaria || data.carga || "";
      document.getElementById("editStatusCurso").value = data.ativo !== false ? "true" : "false";
      document.getElementById("editDescricaoCurso").value = data.descricao || "";

      await carregarDadosAlunosModal(id);

      const modalElement = document.getElementById('editarCursoModal');
      const modal = new window.bootstrap.Modal(modalElement);
      modal.show();
    } else {
      alert("Curso não encontrado.");
    }
  } catch (error) {
    console.error("Erro ao buscar curso para edição:", error);
  }
};

// 5. Função global para remover aluno da turma
window.removerMatricula = async function(matriculaId, cursoId) {
  if (!confirm("Deseja realmente remover este aluno da turma?")) return;
  try {
    await deleteDoc(doc(db, "matriculas", matriculaId));
    await carregarDadosAlunosModal(cursoId);
    carregarCursosEmAndamento();
  } catch (error) {
    console.error("Erro ao remover matrícula:", error);
  }
};

// 6. Inicialização dos eventos do DOM
document.addEventListener("DOMContentLoaded", () => {
  const btnVincular = document.getElementById("btnVincularAluno");
  if (btnVincular) {
    btnVincular.addEventListener("click", async () => {
      const alunoId = document.getElementById("selectAlunoDisponivel").value;
      if (!alunoId || !cursoAtualId) {
        alert("Selecione um aluno válido.");
        return;
      }

      try {
        await addDoc(collection(db, "matriculas"), {
          curso_id: cursoAtualId,
          aluno_id: alunoId,
          data_matricula: new Date().toISOString(),
          status: "ativo"
        });

        await carregarDadosAlunosModal(cursoAtualId);
        carregarCursosEmAndamento();
      } catch (error) {
        console.error("Erro ao matricular aluno:", error);
        alert("Erro ao realizar matrícula.");
      }
    });
  }

  const formEditar = document.getElementById("formEditarCurso");
  if (formEditar) {
    formEditar.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("editCursoId").value;
      
      const dadosAtualizados = {
        nome: document.getElementById("editNomeCurso").value,
        sigla: document.getElementById("editSiglaCurso").value,
        instrutor: document.getElementById("editInstrutorCurso").value,
        carga_horaria: Number(document.getElementById("editCargaCurso").value),
        ativo: document.getElementById("editStatusCurso").value === "true",
        descricao: document.getElementById("editDescricaoCurso").value
      };

      try {
        await updateDoc(doc(db, "cursos", id), dadosAtualizados);
        const modalElement = document.getElementById('editarCursoModal');
        const modal = window.bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        carregarCursosEmAndamento();
      } catch (error) {
        console.error("Erro ao atualizar curso:", error);
        alert("Erro ao salvar alterações.");
      }
    });
  }
});