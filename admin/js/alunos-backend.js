import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ==========================================================================
 * AUTENTICAÇÃO E SESSÃO
 * ========================================================================== */

export function iniciarAutenticacaoAlunos(callbackSucesso) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.replace("/admin/login");
      return;
    }
    const userDisplay = document.getElementById("user-display");
    if (userDisplay) userDisplay.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;

    if (callbackSucesso) callbackSucesso();
  });
}

export function configurarLogout() {
  const btnLogout = document.getElementById("btn-logout") || document.getElementById("btnLogoutSidebar");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      signOut(auth).then(() => window.location.replace("/admin/login"));
    });
  }
}

/* ==========================================================================
 * OUVINTES EM TEMPO REAL (FIRESTORE LISTENERS)
 * ========================================================================== */

export function escutarCursosDisponiveis(callback) {
  return onSnapshot(collection(db, "cursos"), (snapshot) => {
    const cursos = [];
    snapshot.forEach((docSnap) => {
      cursos.push({ id: docSnap.id, ...docSnap.data() });
    });
    if (callback) callback(cursos);
  });
}

export function escutarMatriculas(callback) {
  return onSnapshot(collection(db, "matriculas"), (snapshot) => {
    const matriculasPorAluno = {};
    const matriculasDetalhesPorAluno = {};

    snapshot.forEach((docSnap) => {
      const mat = { id: docSnap.id, ...docSnap.data() };
      const alunoId = mat.aluno_id;
      if (!alunoId) return;

      // Mapeia os nomes dos cursos
      if (!matriculasPorAluno[alunoId]) {
        matriculasPorAluno[alunoId] = [];
      }
      matriculasPorAluno[alunoId].push(mat.curso_nome || mat.curso || "Geral");

      // Mapeia os detalhes completos da matrícula (incluindo financeiro e pagamento)
      if (!matriculasDetalhesPorAluno[alunoId]) {
        matriculasDetalhesPorAluno[alunoId] = [];
      }
      matriculasDetalhesPorAluno[alunoId].push(mat);
    });

    // Devolve os dois mapas exigidos pelo alunos.js
    if (callback) callback(matriculasPorAluno, matriculasDetalhesPorAluno);
  });
}

export function escutarAlunos(callback) {
  return onSnapshot(collection(db, "alunos"), (snapshot) => {
    const listaAlunos = [];
    snapshot.forEach((docSnap) => {
      listaAlunos.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Ordena do mais recente para o mais antigo
    listaAlunos.sort((a, b) => new Date(b.criado_em || b.data_cadastro || 0) - new Date(a.criado_em || a.data_cadastro || 0));
    
    if (callback) callback(listaAlunos);
  });
}

/* ==========================================================================
 * OPERAÇÕES DE ESCRITA NO FIRESTORE (CRUD)
 * ========================================================================== */

export async function alterarStatusAlunoBackend(alunoId, statusAtual) {
  const novoStatus = statusAtual === "ativo" ? "inativo" : "ativo";
  await updateDoc(doc(db, "alunos", alunoId), { status: novoStatus });
}

export async function excluirAlunoBackend(alunoId) {
  await deleteDoc(doc(db, "alunos", alunoId));
}

export async function cadastrarAlunoBackend(dadosAluno, enderecoCompleto) {
  await addDoc(collection(db, "alunos"), {
    ...dadosAluno,
    endereco: enderecoCompleto,
    criado_em: new Date().toISOString()
  });
}

export async function atualizarAlunoComMatriculaBackend(alunoId, dadosAtualizados, dadosFinanceiros, cursoEscolhido) {
  // Atualiza dados cadastrais e financeiros no documento do aluno
  await updateDoc(doc(db, "alunos", alunoId), {
    ...dadosAtualizados,
    ...dadosFinanceiros
  });

  // Atualiza a matrícula correspondente utilizando Batch
  const qMatriculas = query(collection(db, "matriculas"), where("aluno_id", "==", alunoId));
  const snapMat = await getDocs(qMatriculas);
  
  const batch = writeBatch(db);
  snapMat.forEach((docMat) => {
    batch.delete(docMat.ref);
  });

  if (cursoEscolhido) {
    const novaMatriculaRef = doc(collection(db, "matriculas"));
    batch.set(novaMatriculaRef, {
      aluno_id: alunoId,
      aluno_nome: dadosAtualizados.nome || "",
      aluno_email: dadosAtualizados.email || "",
      curso_nome: cursoEscolhido,
      valor: dadosFinanceiros.valor || "0.00",
      status_pagamento: dadosFinanceiros.status_pagamento || "pendente",
      forma_pagamento: dadosFinanceiros.modalidade_pagamento || "",
      status_matricula: "confirmada",
      criado_em: new Date().toISOString()
    });
  }

  await batch.commit();
}