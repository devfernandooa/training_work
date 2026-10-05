import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  addDoc,
  query,
  where,
  increment
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
 * FLUXO DE CONVERSÃO DE LEAD EM ALUNO COM VALIDAÇÃO E GESTÃO DE VAGAS
 * ========================================================================== */

export async function processarMatriculaLead(lead, formaPagamento, statusPagamento) {
  try {
    // 1. REGRA DE PROTEÇÃO: Validação flexível do status de pagamento
    const statusNormalizado = (statusPagamento || "").trim().toLowerCase();
    if (statusNormalizado !== "recebido" && statusNormalizado !== "pago") {
      throw new Error("A conversão em aluno e geração de matrícula só é permitida após a confirmação e recebimento do pagamento!");
    }

    const cleanPhone = (lead.telefone || "").replace(/\D/g, "");
    const alunoId = lead.cpf ? lead.cpf.replace(/\D/g, "") : `aluno_${Date.now()}`;
    const dataAtual = new Date().toISOString();

    // Captura segura dos valores de input do modal
    const inputValorEl = document.getElementById("input-valor-curso");
    const selectParcelasEl = document.getElementById("select-parcelas");

    const valorCurso = inputValorEl ? parseFloat(inputValorEl.value) || 0 : Number(lead.valorCurso || 0);
    const parcelasStr = selectParcelasEl ? selectParcelasEl.value : "1x";

    let formaPagamentoFinal = formaPagamento || "Pix";
    if ((formaPagamentoFinal.includes("Cartão") || formaPagamentoFinal.includes("Boleto")) && parcelasStr && parcelasStr !== "1x") {
      formaPagamentoFinal = `${formaPagamentoFinal} (${parcelasStr})`;
    }

    const nomeCursoDesejado = (lead.curso || "Geral").trim();

    // 2. Localiza o curso correspondente na coleção de cursos para atualizar as vagas (com fallback seguro)
    const cursosRef = collection(db, "cursos");
    const cursoSnapshot = await getDocs(cursosRef);

    let cursoDocId = null;
    cursoSnapshot.forEach((cursoDoc) => {
      const data = cursoDoc.data();
      // Compara ignorando maiúsculas/minúsculas ou correspondência parcial
      if (data.nome && data.nome.trim().toLowerCase() === nomeCursoDesejado.toLowerCase()) {
        cursoDocId = cursoDoc.id;
      }
    });

    // 3. Cria ou atualiza o registo na coleção de Alunos
    await setDoc(doc(db, "alunos", alunoId), {
      nome: lead.nome || "Não informado",
      email: lead.email || "",
      telefone: cleanPhone,
      curso: nomeCursoDesejado,
      cpf: lead.cpf || "",
      empresa: lead.empresa || "",
      status: "ativo",
      lead_origem_id: lead.id,
      criado_em: dataAtual
    }, { merge: true });

    // 4. Regista a matrícula formal para gerar a ficha de presença
    await addDoc(collection(db, "matriculas"), {
      aluno_id: alunoId,
      aluno_nome: lead.nome || "Não informado",
      aluno_telefone: cleanPhone,
      aluno_email: lead.email || "",
      curso_nome: nomeCursoDesejado,
      forma_pagamento: formaPagamentoFinal,
      status_pagamento: "Recebido",
      status_matricula: "confirmada",
      data_matricula: dataAtual
    });

    // 5. Regista a transação na coleção financeira
    await addDoc(collection(db, "financeiro"), {
      alunoId: alunoId,
      alunoNome: lead.nome || "Não informado",
      curso: nomeCursoDesejado,
      valor: valorCurso,
      formaPagamento: formaPagamentoFinal,
      status: "Recebido",
      criado_em: dataAtual
    });

    // 6. Atualiza as vagas do curso no Firestore (decrementa 1 vaga se encontrado)
    if (cursoDocId) {
      await updateDoc(doc(db, "cursos", cursoDocId), {
        vagasDisponiveis: increment(-1)
      });
    }

    // 7. Atualiza o status do lead original e oculta da listagem principal
    await updateDoc(doc(db, "inscricoes", lead.id), { 
      status: "matriculado",
      convertido_aluno: true,
      excluido: true, 
      atualizado_em: dataAtual
    });

    return true;
  } catch (err) {
    console.error("Erro ao processar matrícula e conversão:", err);
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

document.addEventListener("DOMContentLoaded", () => {
  const selectPagamento = document.getElementById("select-forma-pagamento");
  const blocoParcelas = document.getElementById("bloco-parcelas");

  if (selectPagamento) {
    selectPagamento.addEventListener("change", (e) => {
      const valor = e.target.value;
      if (valor === "Cartão de Crédito" || valor === "Boleto Bancário") {
        blocoParcelas.style.display = "block";
      } else {
        blocoParcelas.style.display = "none";
      }
    });
  }
});