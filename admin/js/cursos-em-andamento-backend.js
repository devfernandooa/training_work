import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ==========================================================================
 * AUTENTICAÇÃO E SESSÃO
 * ========================================================================== */

export function iniciarAutenticacaoTurmas(callbackSucesso) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.replace("login.html");
      return;
    }
    
    const userDisplay = document.getElementById("user-name") || document.querySelector(".user-name");
    if (userDisplay) userDisplay.textContent = user.email.split('@')[0];

    if (callbackSucesso) callbackSucesso();
  });
}

export function configurarLogout() {
  const btnLogout = document.getElementById("btnLogoutSidebar") || document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      signOut(auth).then(() => window.location.replace("login.html"));
    });
  }
}

/* ==========================================================================
 * OPERAÇÕES DE DADOS (FIRESTORE)
 * ========================================================================== */

export async function buscarCursosEAlunos() {
  const querySnapshot = await getDocs(collection(db, "cursos"));
  const cursos = [];
  querySnapshot.forEach((docSnap) => {
    cursos.push({ id: docSnap.id, ...docSnap.data() });
  });

  const snapshotMatriculas = await getDocs(collection(db, "matriculas"));
  const contagemAlunos = {};
  snapshotMatriculas.forEach((docMat) => {
    const mat = docMat.data();
    const cursoIdMat = mat.curso_id || mat.cursoId;
    if (cursoIdMat) {
      contagemAlunos[cursoIdMat] = (contagemAlunos[cursoIdMat] || 0) + 1;
    }
  });

  return { cursos, contagemAlunos };
}

export async function buscarDadosModalCurso(cursoId) {
  const docRef = doc(db, "cursos", cursoId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error("Curso não encontrado.");

  const cursoData = docSnap.data();
  const nomeCursoAtual = (cursoData.nome || "").trim().toLowerCase();

  const snapshotMatriculas = await getDocs(collection(db, "matriculas"));
  const alunosMatriculadosNestaTurma = new Set();
  const matriculasDesteCurso = [];

  snapshotMatriculas.forEach((docMat) => {
    const data = docMat.data();
    const matCursoId = data.curso_id || data.cursoId;
    const matCursoNome = (data.curso_nome || data.curso || "").trim().toLowerCase();
    const alunoId = data.aluno_id || data.alunoId;

    const pertenceAoCurso = (matCursoId === cursoId) || (matCursoNome && matCursoNome === nomeCursoAtual);

    if (pertenceAoCurso && alunoId) {
      matriculasDesteCurso.push({ id: docMat.id, aluno_id: alunoId });
      alunosMatriculadosNestaTurma.add(alunoId); // Apenas os alunos DESSA turma bloqueiam a seleção para duplicados
    }
  });

  // Busca detalhes dos alunos matriculados nesta turma
  const listaMatriculadosDetalhes = [];
  for (const mat of matriculasDesteCurso) {
    const alunoDoc = await getDoc(doc(db, "alunos", mat.aluno_id));
    const nomeAluno = alunoDoc.exists() ? (alunoDoc.data().nome || alunoDoc.data().email || "Aluno sem nome") : "Aluno desconhecido";
    listaMatriculadosDetalhes.push({ matriculaId: mat.id, nome: nomeAluno });
  }

  // Busca todos os alunos cadastrados na coleção "alunos" para listar no dropdown
  const snapshotAlunos = await getDocs(collection(db, "alunos"));
  const alunosDisponiveis = [];
  snapshotAlunos.forEach((docAluno) => {
    const alunoId = docAluno.id;
    const alunoData = docAluno.data();
    
    // Lista todos os alunos disponíveis (ou pode remover a restrição se quiser mostrar todos)
    alunosDisponiveis.push({
      id: alunoId,
      nome: alunoData.nome || alunoData.email || `Aluno ${alunoId.substring(0, 5)}`
    });
  });

  return {
    curso: cursoData,
    matriculados: listaMatriculadosDetalhes,
    disponiveis: alunosDisponiveis
  };
}

export async function alterarStatusInativacaoCurso(cursoId, novoStatusAtivo) {
  await updateDoc(doc(db, "cursos", cursoId), { ativo: novoStatusAtivo });
}

export async function atualizarCursoBackend(cursoId, dados) {
  await updateDoc(doc(db, "cursos", cursoId), dados);
}

export async function removerMatriculaBackend(matriculaId) {
  await deleteDoc(doc(db, "matriculas", matriculaId));
}

export async function adicionarMatriculaBackend(cursoId, alunoId) {
  const cursoDoc = await getDoc(doc(db, "cursos", cursoId));
  const nomeCurso = cursoDoc.exists() ? cursoDoc.data().nome : "Geral";

  await addDoc(collection(db, "matriculas"), {
    curso_id: cursoId,
    curso_nome: nomeCurso,
    aluno_id: alunoId,
    data_matricula: new Date().toISOString(),
    status: "ativo",
    status_matricula: "confirmada"
  });
}