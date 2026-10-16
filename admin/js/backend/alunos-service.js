import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  collection,
  collectionGroup,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { registrarAuditoriaGenerica } from "./auditoria-service.js";

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
  }, (erro) => {
    console.error("❌ escutarCursosDisponiveis:", erro);
  });
}

export function escutarMatriculas(callback) {
  // ✅ Lê de /turmas/*/matriculas
  const groupRef = collectionGroup(db, "matriculas");

  return onSnapshot(groupRef,
    (snapshot) => {
      const matriculasPorAluno = {};
      const matriculasDetalhesPorAluno = {};

      snapshot.forEach((docSnap) => {
        if (!docSnap.ref.parent?.parent) return;

        const turmaId = docSnap.ref.parent.parent.id;
        const mat = { id: docSnap.id, ...docSnap.data(), turma_id: turmaId };

        const alunoId = mat.aluno_id || mat.alunoId;
        if (!alunoId) return;

        if (!matriculasPorAluno[alunoId]) matriculasPorAluno[alunoId] = [];
        matriculasPorAluno[alunoId].push(mat.curso_nome || mat.curso || "Geral");

        if (!matriculasDetalhesPorAluno[alunoId]) matriculasDetalhesPorAluno[alunoId] = [];
        matriculasDetalhesPorAluno[alunoId].push(mat);
      });

      if (callback) callback(matriculasPorAluno, matriculasDetalhesPorAluno);
    },
    (erro) => {
      console.error("❌ Erro no collectionGroup 'matriculas':", erro);
      if (callback) callback({}, {});
    }
  );
}

/**
 * Escuta alunos em tempo real.
 * Por padrão, NÃO inclui excluídos (soft delete).
 *
 * @param {Function} callback - recebe array de alunos
 * @param {Object} opcoes - { incluirExcluidos: boolean }
 * @returns {Function} unsubscribe
 */
export function escutarAlunos(callback, opcoes = {}) {
  const incluirExcluidos = opcoes.incluirExcluidos === true;

  return onSnapshot(collection(db, "alunos"), (snapshot) => {
    const listaAlunos = [];
    snapshot.forEach((docSnap) => {
      const dados = docSnap.data();
      if (!incluirExcluidos && dados.excluido) return;
      listaAlunos.push({ id: docSnap.id, ...dados });
    });

    listaAlunos.sort((a, b) =>
      new Date(b.criado_em || b.data_cadastro || 0) -
      new Date(a.criado_em || a.data_cadastro || 0)
    );

    if (callback) callback(listaAlunos);
  }, (erro) => {
    console.error("❌ escutarAlunos:", erro);
  });
}

/**
 * Escuta os leads do formulário do site (/leads).
 */
export function escutarLeads(callback) {
  return onSnapshot(collection(db, "leads"), (snapshot) => {
    const leads = [];
    snapshot.forEach((docSnap) => {
      leads.push({ id: docSnap.id, ...docSnap.data() });
    });
    if (callback) callback(leads);
  }, (erro) => {
    console.error("❌ escutarLeads:", erro);
  });
}

/* ==========================================================================
 * OPERAÇÕES DE ESCRITA NO FIRESTORE (CRUD E SINCRONIZAÇÃO)
 * ========================================================================== */

/**
 * Alterna status entre "ativo" e "inativo".
 * Registra auditoria (inativacao ou reativacao).
 */
export async function alterarStatusAlunoBackend(alunoId, statusAtual) {
  const novoStatus = statusAtual === "ativo" ? "inativo" : "ativo";
  const adminEmail = auth?.currentUser?.email || "Sistema";
  const agora = new Date().toISOString();

  const ref = doc(db, "alunos", alunoId);
  await updateDoc(ref, {
    status: novoStatus,
    atualizado_em: agora,
    atualizado_por: adminEmail
  });

  await registrarAuditoriaGenerica("alunos", alunoId, {
    tipo: novoStatus === "inativo" ? "inativacao" : "reativacao",
    entidade: "aluno",
    descricao: novoStatus === "inativo" ? "Aluno inativado" : "Aluno reativado",
    campos_alterados: [{
      campo: "status",
      valor_anterior: statusAtual,
      valor_novo: novoStatus
    }]
  });
}

/**
 * Exclui um aluno (SOFT DELETE).
 * As matrículas do aluno são PRESERVADAS (decisão de projeto).
 * Registra auditoria (exclusao).
 */
export async function excluirAlunoBackend(alunoId) {
  const adminEmail = auth?.currentUser?.email || "Sistema";
  const agora = new Date().toISOString();

  const ref = doc(db, "alunos", alunoId);
  await updateDoc(ref, {
    excluido: true,
    excluido_em: agora,
    excluido_por: adminEmail,
    atualizado_em: agora,
    atualizado_por: adminEmail
  });

  await registrarAuditoriaGenerica("alunos", alunoId, {
    tipo: "exclusao",
    entidade: "aluno",
    descricao: "Aluno excluído",
    campos_alterados: [{
      campo: "excluido",
      valor_anterior: false,
      valor_novo: true
    }]
  });
}

/**
 * Restaura um aluno previamente excluído (soft delete).
 * Registra auditoria (restauracao).
 */
export async function restaurarAlunoBackend(alunoId) {
  const adminEmail = auth?.currentUser?.email || "Sistema";
  const agora = new Date().toISOString();

  const ref = doc(db, "alunos", alunoId);
  await updateDoc(ref, {
    excluido: false,
    excluido_em: null,
    excluido_por: null,
    atualizado_em: agora,
    atualizado_por: adminEmail
  });

  await registrarAuditoriaGenerica("alunos", alunoId, {
    tipo: "restauracao",
    entidade: "aluno",
    descricao: "Aluno restaurado",
    campos_alterados: [{
      campo: "excluido",
      valor_anterior: true,
      valor_novo: false
    }]
  });
}

export async function cadastrarAlunoBackend(dadosAluno, enderecoCompleto) {
  await addDoc(collection(db, "alunos"), {
    ...dadosAluno,
    endereco: enderecoCompleto,
    excluido: false,
    criado_em: new Date().toISOString()
  });
}

export async function atualizarAlunoComMatriculaBackend(alunoId, dadosAtualizados, dadosFinanceiros, cursoEscolhido) {
  let statusBruto = (dadosFinanceiros.status_pagamento || "").toLowerCase();
  let statusNormalizado = "Aguardando pagamento";

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

  await updateDoc(doc(db, "alunos", alunoId), {
    ...dadosAtualizados,
    ...dadosFiltroFinanceiro,
    atualizado_em: new Date().toISOString()
  });

  const batch = writeBatch(db);

  const qMatriculas = query(collection(db, "matriculas"), where("aluno_id", "==", alunoId));
  try {
    const snapMat = await getDocs(qMatriculas);
    snapMat.forEach((docMat) => { batch.delete(docMat.ref); });
  } catch (e) {
    console.warn("⚠️ Coleção raiz /matriculas não existe. Ignorando.");
  }

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

  const qFinanceiro = query(collection(db, "financeiro"), where("alunoId", "==", alunoId));
  const snapFin = await getDocs(qFinanceiro);
  snapFin.forEach((docFin) => { batch.delete(docFin.ref); });

  if (cursoEscolhido) {
    const novoFinanceiroRef = doc(collection(db, "financeiro"));
    batch.set(novoFinanceiroRef, {
      alunoId: alunoId,
      alunoNome: dadosAtualizados.nome || "",
      curso: cursoEscolhido,
      valor: parseFloat(dadosFiltroFinanceiro.valor) || 0,
      formaPagamento: dadosFiltroFinanceiro.modalidade_pagamento || "Pix",
      status: statusNormalizado,
      atualizado_em: new Date().toISOString()
    });
  }

  await batch.commit();
}