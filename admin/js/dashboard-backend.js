import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { renderizarTabela, preencherModalEdicao } from "./dashboard-ui.js";

/* ==========================================================================
 * CONTROLO DE SESSÃO E AUTENTICAÇÃO
 * ========================================================================== */

onAuthStateChanged(auth, (user) => {
  const userDisplay = document.getElementById("user-display");
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  if (userDisplay) {
    userDisplay.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;
  }

  escutarInscricoes();
});

const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => window.location.replace("login.html"));
  });
}


/* ==========================================================================
 * SINCRONIZAÇÃO EM TEMPO REAL (FIRESTORE)
 * ========================================================================== */

let listaInscricoes = [];

function escutarInscricoes() {
  const colRef = collection(db, "inscricoes");

  onSnapshot(colRef, (snapshot) => {
    listaInscricoes = [];

    snapshot.forEach((docSnap) => {
      const dataLead = docSnap.data();
      if (!dataLead.excluido) {
        listaInscricoes.push({ id: docSnap.id, ...dataLead });
      }
    });

    listaInscricoes.sort((a, b) => {
      const tempoA = a.criado_em ? new Date(a.criado_em).getTime() : (a.data?.seconds ? a.data.seconds * 1000 : 0);
      const tempoB = b.criado_em ? new Date(b.criado_em).getTime() : (b.data?.seconds ? b.data.seconds * 1000 : 0);
      return tempoB - tempoA;
    });

    renderizarTabela(listaInscricoes);
  }, (error) => {
    console.error("Erro na leitura do Firestore:", error);
  });
}

export function obterListaInscricoes() {
  return listaInscricoes;
}


/* ==========================================================================
 * GESTÃO DE ESTADO (WHATSAPP, PERDIDO, ETC.)
 * ========================================================================== */

export async function atualizarStatusLead(id, novoStatus) {
  try {
    await updateDoc(doc(db, "inscricoes", id), { status: novoStatus });
  } catch (err) {
    console.error("Erro ao atualizar status do lead:", err);
  }
}


/* ==========================================================================
 * FLUXO DE CONVERSÃO DE LEAD EM ALUNO E GESTÃO FINANCEIRA
 * ========================================================================== */

export async function processarMatriculaLead(lead, formaPagamento, statusPagamento) {
  try {
    const cleanPhone = (lead.telefone || "").replace(/\D/g, "");
    const alunoId = lead.cpf ? lead.cpf.replace(/\D/g, "") : `aluno_${Date.now()}`;
    const dataAtual = new Date().toISOString();

    // 1. Cria ou atualiza o registo na coleção de Alunos
   await setDoc(doc(db, "alunos", alunoId), {
      nome: lead.nome || "Não informado",
      email: lead.email || "",
      telefone: cleanPhone,
      curso: lead.curso || "Geral",
      cpf: lead.cpf || "",
      empresa: lead.empresa || "",
      status: "ativo",
      lead_origem_id: lead.id,
      criado_em: dataAtual
    }, { merge: true });

    // 2. Regista a matrícula na respetiva coleção
    await addDoc(collection(db, "matriculas"), {
      aluno_id: alunoId,
      aluno_nome: lead.nome || "Não informado",
      aluno_telefone: cleanPhone,
      aluno_email: lead.email || "",
      curso_nome: lead.curso || "Geral",
      forma_pagamento: formaPagamento || "Pix",
      status_pagamento: statusPagamento || "Aguardando pagamento",
      status_matricula: "confirmada",
      data_matricula: dataAtual
    });

    // 3. Regista na coleção financeira (Gestão Financeira & Projeções)
    await addDoc(collection(db, "financeiro"), {
      alunoId: alunoId,
      alunoNome: lead.nome || "Não informado",
      curso: lead.curso || "Geral",
      valor: Number(lead.valorCurso || 0),
      formaPagamento: formaPagamento || "Pix",
      status: statusPagamento || "Aguardando pagamento",
      criado_em: dataAtual
    });

    // 4. Atualiza o status do lead original e marca como excluído da tabela de leads
    await updateDoc(doc(db, "inscricoes", lead.id), { 
      status: "matriculado",
      convertido_aluno: true,
      excluido: true, // <--- Oculta o lead da tabela principal e migra para Alunos
      atualizado_em: dataAtual
    });

    return true;
  } catch (err) {
    console.error("Erro ao converter matrícula:", err);
    throw err;
  }
}


/* ==========================================================================
 * BUSCA E ATUALIZAÇÃO DE DADOS CADASTRADA (MODAL DE EDIÇÃO)
 * ========================================================================== */

export async function carregarDadosEdicaoLead(id) {
  try {
    const docRef = doc(db, "inscricoes", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      preencherModalEdicao(id, docSnap.data());
    } else {
      console.warn("Inscrição não encontrada.");
    }
  } catch (error) {
    console.error("Erro ao carregar dados do lead:", error);
  }
}

export async function salvarEdicaoLead(id, dadosFormulario) {
  const adminEmail = auth.currentUser ? auth.currentUser.email : "Sistema";
  const dataHoraAtual = new Date().toISOString();

  const docRef = doc(db, "inscricoes", id);
  await updateDoc(docRef, {
    ...dadosFormulario,
    atualizado_por: adminEmail,
    atualizado_em: dataHoraAtual
  });
}


/* ==========================================================================
 * EXCLUSÃO LÓGICA DE LEADS
 * ========================================================================== */

export async function executarExclusaoLogicaBackend(id) {
  const docRef = doc(db, "inscricoes", id);
  const adminEmail = auth.currentUser ? auth.currentUser.email : "Sistema";
  const dataHoraAtual = new Date().toISOString();

  await updateDoc(docRef, {
    excluido: true,
    atualizado_por: adminEmail,
    atualizado_em: dataHoraAtual
  });
}