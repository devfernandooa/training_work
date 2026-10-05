import { auth, db } from "../firebase-config.js";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ==========================================================================
 * SINCRONIZAÇÃO EM TEMPO REAL (CURSOS / TURMAS)
 * ========================================================================== */

export function escutarTurmas(callbackDados) {
  // Lê da coleção "cursos" existente no seu Firestore
  const colRef = collection(db, "cursos");

  onSnapshot(colRef, (snapshot) => {
    const listaTurmas = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      listaTurmas.push({ 
        id: docSnap.id, 
        nome_turma: data.nome || data.titulo || data.nome_turma || "Curso sem nome",
        instrutor: data.instrutor || "A definir",
        horario: data.horario || "Horário flexível",
        dias_semana: data.dias_semana || "Dias a definir",
        vagas_maximas: data.vagas_maximas || 20,
        carga_horaria: data.carga_horaria || data.carga || "N/D",
        categoria: data.categoria || "Geral",
        status: data.status || "Ativo",
        alunos_matriculados: data.alunos_matriculados || [],
        ...data 
      });
    });

    listaTurmas.sort((a, b) => {
      const nomeA = a.nome_turma || "";
      const nomeB = b.nome_turma || "";
      return nomeA.localeCompare(nomeB);
    });

    if (callbackDados) callbackDados(listaTurmas);
  }, (error) => {
    console.error("Erro ao escutar dados dos cursos/turmas:", error);
  });
}

/* ==========================================================================
 * OPERAÇÕES DE CRUD
 * ========================================================================== */

export async function salvarTurmaBackend(dadosTurma, turmaId = null) {
  const usuarioLogado = auth.currentUser ? auth.currentUser.email : "Sistema";
  const timestamp = new Date().toISOString();

  const payload = {
    ...dadosTurma,
    atualizado_em: timestamp,
    atualizado_por: usuarioLogado
  };

  if (turmaId) {
    const docRef = doc(db, "cursos", turmaId);
    await updateDoc(docRef, payload);
  } else {
    payload.criado_em = timestamp;
    payload.status = "Ativo";
    payload.alunos_matriculados = payload.alunos_matriculados || [];
    await addDoc(collection(db, "cursos"), payload);
  }
}

export async function alternarStatusTurmaBackend(turmaId, novoStatus) {
  const docRef = doc(db, "cursos", turmaId);
  await updateDoc(docRef, {
    status: novoStatus,
    atualizado_em: new Date().toISOString()
  });
}