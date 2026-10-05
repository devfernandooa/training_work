import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    getDocs,
    query,
    where,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ==========================================================================
 * CONTROLE DE SESSÃO E AUTENTICAÇÃO
 * ========================================================================== */

export function iniciarAutenticacaoFinanceiro(callbackSucesso) {
    onAuthStateChanged(auth, (user) => {
        const userDisplay = document.getElementById("user-display") || document.querySelector(".user-name");
        const userEmailDisplay = document.querySelector(".user-email");

        if (!user) {
            window.location.replace("login.html");
            return;
        }

        if (userDisplay) userDisplay.textContent = user.email.split('@')[0];
        if (userEmailDisplay) userEmailDisplay.textContent = user.email;

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
 * SINCRONIZAÇÃO EM TEMPO REAL (FIRESTORE)
 * ========================================================================== */

export function escutarFinanceiro(callbackDados) {
    const colRef = collection(db, "financeiro");

    onSnapshot(colRef, (snapshot) => {
        const listaTransacoes = [];

        snapshot.forEach((docSnap) => {
            listaTransacoes.push({ id: docSnap.id, ...docSnap.data() });
        });

        listaTransacoes.sort((a, b) => {
            const tempoA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
            const tempoB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
            return tempoB - tempoA;
        });

        if (callbackDados) callbackDados(listaTransacoes);
    }, (error) => {
        console.error("Erro ao escutar dados financeiros:", error);
    });
}

/* ==========================================================================
 * OPERAÇÕES DE ESCRITA E VALIDAÇÃO EM CASCATA
 * ========================================================================== */

export async function atualizarStatusFinanceiroBackend(transacaoId, alunoId, novoStatus, novaFormaPagamento) {
    const batch = writeBatch(db);

    // 1. Normaliza o status para o padrão unificado
    let statusNormalizado = "Aguardando pagamento";
    if (novoStatus.toLowerCase().includes("recebido") || novoStatus.toLowerCase().includes("pago")) {
        statusNormalizado = "Recebido (Pago)";
    } else if (novoStatus.toLowerCase().includes("pendente")) {
        statusNormalizado = "Pendente";
    } else if (novoStatus.toLowerCase().includes("aguardando")) {
        statusNormalizado = "Aguardando pagamento";
    }

    // 2. Atualiza o documento financeiro
    const transacaoRef = doc(db, "financeiro", transacaoId);
    batch.update(transacaoRef, {
        status: statusNormalizado,
        formaPagamento: novaFormaPagamento || "Pix",
        atualizado_em: new Date().toISOString()
    });

    // 3. Se houver um aluno associado, propaga a atualização em cascata para Alunos e Matrículas
    if (alunoId) {
        const alunoRef = doc(db, "alunos", alunoId);
        batch.update(alunoRef, {
            status_pagamento: statusNormalizado,
            modalidade_pagamento: novaFormaPagamento || "Pix",
            atualizado_em: new Date().toISOString()
        });

        const qMatriculas = query(collection(db, "matriculas"), where("aluno_id", "==", alunoId));
        const snapMat = await getDocs(qMatriculas);
        snapMat.forEach((docMat) => {
            batch.update(docMat.ref, {
                status_pagamento: statusNormalizado,
                forma_pagamento: novaFormaPagamento || "Pix",
                atualizado_em: new Date().toISOString()
            });
        });
    }

    await batch.commit();
}

export async function editarTransacaoFinanceiraBackend(transacaoId, alunoId, novoNomeAluno, novoValor, novoStatus, novaFormaPagamento, notasAuditoria) {
  const batch = writeBatch(db);

  let statusNormalizado = "Aguardando pagamento";
  if (novoStatus.toLowerCase().includes("recebido") || novoStatus.toLowerCase().includes("pago")) {
    statusNormalizado = "Recebido (Pago)";
  } else if (novoStatus.toLowerCase().includes("pendente")) {
    statusNormalizado = "Pendente";
  } else if (novoStatus.toLowerCase().includes("aguardando")) {
    statusNormalizado = "Aguardando pagamento";
  }

  const valorNumerico = parseFloat(novoValor) || 0;
  
  // Captura o e-mail do utilizador atualmente autenticado no painel
  const usuarioLogado = auth.currentUser ? auth.currentUser.email : "Sistema / Desconhecido";

  const dadosAuditoria = {
    ultima_alteracao_em: new Date().toISOString(),
    ultima_alteracao_por: usuarioLogado,
    auditoria_financeira: notasAuditoria || "Atualização financeira sem observações"
  };

  // 1. Atualiza o documento financeiro
  const transacaoRef = doc(db, "financeiro", transacaoId);
  batch.update(transacaoRef, {
    alunoNome: novoNomeAluno,
    valor: valorNumerico,
    status: statusNormalizado,
    formaPagamento: novaFormaPagamento || "Pix",
    ...dadosAuditoria
  });

  // 2. Propaga em cascata para Aluno e Matrículas
  if (alunoId) {
    const alunoRef = doc(db, "alunos", alunoId);
    batch.update(alunoRef, {
      nome: novoNomeAluno,
      valor: valorNumerico.toFixed(2),
      status_pagamento: statusNormalizado,
      modalidade_pagamento: novaFormaPagamento || "Pix",
      ...dadosAuditoria
    });

    const qMatriculas = query(collection(db, "matriculas"), where("aluno_id", "==", alunoId));
    const snapMat = await getDocs(qMatriculas);
    snapMat.forEach((docMat) => {
      batch.update(docMat.ref, {
        aluno_nome: novoNomeAluno,
        valor: valorNumerico.toFixed(2),
        status_pagamento: statusNormalizado,
        forma_pagamento: novaFormaPagamento || "Pix",
        ...dadosAuditoria
      });
    });
  }

  await batch.commit();
}