import { auth, db } from "../firebase-config.js";
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
      window.location.replace("login.html");
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
      signOut(auth).then(() => window.location.replace("login.html"));
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

      if (!matriculasPorAluno[alunoId]) {
        matriculasPorAluno[alunoId] = [];
      }
      matriculasPorAluno[alunoId].push(mat.curso_nome || mat.curso || "Geral");

      if (!matriculasDetalhesPorAluno[alunoId]) {
        matriculasDetalhesPorAluno[alunoId] = [];
      }
      matriculasDetalhesPorAluno[alunoId].push(mat);
    });

    if (callback) callback(matriculasPorAluno, matriculasDetalhesPorAluno);
  });
}

export function escutarAlunos(callback) {
  return onSnapshot(collection(db, "alunos"), (snapshot) => {
    const listaAlunos = [];
    snapshot.forEach((docSnap) => {
      listaAlunos.push({ id: docSnap.id, ...docSnap.data() });
    });

    listaAlunos.sort((a, b) => new Date(b.criado_em || b.data_cadastro || 0) - new Date(a.criado_em || a.data_cadastro || 0));
    
    if (callback) callback(listaAlunos);
  });
}

/* ==========================================================================
 * OPERAÇÕES DE ESCRITA NO FIRESTORE (CRUD E SINCRONIZAÇÃO)
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
  // 1. Normalização rigorosa do Status Financeiro para bater certo com o Dashboard Financeiro
  let statusBruto = (dadosFinanceiros.status_pagamento || "").toLowerCase();
  let statusNormalizado = "Aguardando pagamento"; // Valor padrão seguro

  if (statusBruto.includes("recebido") || statusBruto.includes("pago") || statusBruto.includes("confirmado")) {
    statusNormalizado = "Recebido";
  } else if (statusBruto.includes("pendente")) {
    statusNormalizado = "Pendente";
  } else if (statusBruto.includes("aguardando")) {
    statusNormalizado = "Aguardando pagamento";
  }

  const dadosFiltroFinanceiro = {
    ...dadosFinanceiros,
    status_pagamento: statusNormalizado
  };

  // 2. Atualiza dados principais no documento do aluno
  await updateDoc(doc(db, "alunos", alunoId), {
    ...dadosAtualizados,
    ...dadosFiltroFinanceiro,
    atualizado_em: new Date().toISOString()
  });

  const batch = writeBatch(db);

  // 3. Atualiza as Matrículas associadas
  const qMatriculas = query(collection(db, "matriculas"), where("aluno_id", "==", alunoId));
  const snapMat = await getDocs(qMatriculas);
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
      valor: dadosFiltroFinanceiro.valor || "0.00",
      status_pagamento: statusNormalizado,
      forma_pagamento: dadosFiltroFinanceiro.modalidade_pagamento || "Pix",
      status_matricula: "confirmada",
      atualizado_em: new Date().toISOString()
    });
  }

  // 4. Atualiza/Sincroniza a coleção "financeiro" (forçando o recálculo automático nos cartões e projeção)
  const qFinanceiro = query(collection(db, "financeiro"), where("alunoId", "==", alunoId));
  const snapFin = await getDocs(qFinanceiro);
  snapFin.forEach((docFin) => { 
    batch.delete(docFin.ref); 
  });

  if (cursoEscolhido) {
    const novoFinanceiroRef = doc(collection(db, "financeiro"));
    batch.set(novoFinanceiroRef, {
      alunoId: alunoId,
      alunoNome: dadosAtualizados.nome || "",
      curso: cursoEscolhido,
      valor: parseFloat(dadosFiltroFinanceiro.valor) || 0,
      formaPagamento: dadosFiltroFinanceiro.modalidade_pagamento || "Pix",
      status: statusNormalizado, // Chave exata que alimenta os totais do financeiro
      atualizado_em: new Date().toISOString()
    });
  }

  await batch.commit();
}