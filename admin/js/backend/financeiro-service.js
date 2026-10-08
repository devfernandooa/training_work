/**
 * =========================================================================
 * TRAINING WORK — SERVIÇO FINANCEIRO (financeiro-service.js)
 * =========================================================================
 *
 * Camada de serviço: SÓ conversa com o Firestore.
 * NÃO mexe em DOM, NÃO faz autenticação.
 *
 * Coleção: /financeiro
 * =========================================================================
 */

import { auth, db } from "../firebase-config.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    onSnapshot,
    query,
    where,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const NOME_COLECAO = "financeiro";

/* =========================================================================
 * HELPERS INTERNOS
 * ========================================================================= */

/**
 * Normaliza o status para um dos 3 valores padronizados.
 * Aceita variações antigas: "Confirmado", "Recebido (Pago)", etc.
 */
function normalizarStatus(status) {
    const s = String(status || "").toLowerCase();
    if (s.includes("recebido") || s.includes("pago") || s.includes("confirmado")) {
        return "Recebido";
    }
    if (s.includes("pendente")) return "Pendente";
    if (s.includes("aguardando")) return "Aguardando pagamento";
    return "Aguardando pagamento";
}

/**
 * Extrai o curso de um documento financeiro.
 * Se não tiver campo `curso`, tenta extrair da `descricao`.
 * Padrão esperado: "Matrícula: NOME - CURSO" ou "Matricula: NOME - CURSO"
 */
function extrairCurso(dados) {
    if (dados.curso) return dados.curso;

    if (dados.descricao) {
        // Procura o último " - " e pega o que vem depois
        const partes = dados.descricao.split(/\s[-–]\s/);
        if (partes.length > 1) {
            return partes[partes.length - 1].trim();
        }
    }
    return "";
}

/* =========================================================================
 * ESCUTA EM TEMPO REAL
 * ========================================================================= */

export function escutarFinanceiro(callback) {
    const colRef = collection(db, NOME_COLECAO);

    return onSnapshot(
        colRef,
        (snapshot) => {
            const transacoes = [];

            snapshot.forEach((docSnap) => {
                const dados = docSnap.data();

                // Ignora soft-deleted
                if (dados.excluido) return;

                // Normaliza e tolera campos antigos
                transacoes.push({
                    id: docSnap.id,
                    ...dados,
                    alunoNome: dados.alunoNome || dados.aluno_nome || "",
                    alunoId: dados.alunoId || dados.aluno_id || "",
                    curso: extrairCurso(dados),
                    formaPagamento: dados.formaPagamento || dados.forma_pagamento || "Pix",
                    dataPagamento: dados.dataPagamento || dados.data_pagamento || "",
                    status: normalizarStatus(dados.status),
                    statusOriginal: dados.status || "",
                    ultimaAlteracaoEm: dados.ultimaAlteracaoEm || dados.ultima_alteracao_em || "",
                    ultimaAlteracaoPor: dados.ultimaAlteracaoPor || dados.ultima_alteracao_por || "",
                    auditoriaFinanceira: dados.auditoriaFinanceira || dados.auditoria_financeira || ""
                });
            });

            transacoes.sort((a, b) => {
                const tA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
                const tB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
                return tB - tA;
            });

            if (typeof callback === "function") callback(transacoes);
        },
        (erro) => {
            console.error("❌ Erro ao escutar /financeiro:", erro);
            if (typeof callback === "function") callback([]);
        }
    );
}

/* =========================================================================
 * LEITURA PONTUAL
 * ========================================================================= */

export async function obterFinanceiro() {
    try {
        const snap = await getDocs(collection(db, NOME_COLECAO));
        const transacoes = [];

        snap.forEach((d) => {
            const dados = d.data();
            if (!dados.excluido) {
                transacoes.push({ id: d.id, ...dados });
            }
        });

        return transacoes;
    } catch (erro) {
        console.error("❌ Erro ao obter financeiro:", erro);
        throw erro;
    }
}

/* =========================================================================
 * ATUALIZAR STATUS (com propagação em cascata)
 * ========================================================================= */

export async function atualizarStatusFinanceiro(id, novoStatus, formaPagamento) {
    try {
        const batch = writeBatch(db);
        const statusNorm = normalizarStatus(novoStatus);
        const agora = new Date().toISOString();

        // 1. Atualiza a transação
        const transacaoRef = doc(db, NOME_COLECAO, id);
        batch.update(transacaoRef, {
            status: statusNorm,
            formaPagamento: formaPagamento || "Pix",
            ultimaAlteracaoEm: agora,
            ultimaAlteracaoPor: auth.currentUser?.email || "Sistema"
        });

        // 2. Propaga em cascata para aluno + matrículas
        const snap = await getDoc(transacaoRef);
        if (!snap.exists()) throw new Error("Transação não encontrada.");

        const dados = snap.data();
        const alunoId = dados.alunoId || dados.aluno_id;

        if (alunoId) {
            const alunoRef = doc(db, "alunos", alunoId);
            batch.update(alunoRef, {
                status_pagamento: statusNorm,
                modalidade_pagamento: formaPagamento || "Pix",
                atualizado_em: agora
            });

            const q = query(collection(db, "matriculas"), where("aluno_id", "==", alunoId));
            const snapMat = await getDocs(q);
            snapMat.forEach((d) => {
                batch.update(d.ref, {
                    status_pagamento: statusNorm,
                    forma_pagamento: formaPagamento || "Pix",
                    atualizado_em: agora
                });
            });
        }

        await batch.commit();
        console.log("✅ Status atualizado");
    } catch (erro) {
        console.error("❌ Erro ao atualizar status financeiro:", erro);
        throw erro;
    }
}

/* =========================================================================
 * EDITAR TRANSAÇÃO COMPLETA
 * ========================================================================= */

export async function editarTransacaoFinanceira(id, dados) {
    try {
        const batch = writeBatch(db);
        const agora = new Date().toISOString();
        const usuario = auth.currentUser?.email || "Sistema";

        const statusNorm = normalizarStatus(dados.status);
        const valorNum = parseFloat(dados.valor) || 0;

        // 1. Atualiza a transação
        const transacaoRef = doc(db, NOME_COLECAO, id);
        batch.update(transacaoRef, {
            alunoNome: dados.alunoNome || "",
            valor: valorNum,
            status: statusNorm,
            formaPagamento: dados.formaPagamento || "Pix",
            dataPagamento: dados.dataPagamento || "",
            auditoriaFinanceira: dados.observacoes || "",
            ultimaAlteracaoEm: agora,
            ultimaAlteracaoPor: usuario
        });

        // 2. Propaga em cascata
        const snap = await getDoc(transacaoRef);
        if (snap.exists()) {
            const dadosOriginais = snap.data();
            const alunoId = dadosOriginais.alunoId || dadosOriginais.aluno_id;

            if (alunoId) {
                const alunoRef = doc(db, "alunos", alunoId);
                batch.update(alunoRef, {
                    nome: dados.alunoNome || "",
                    status_pagamento: statusNorm,
                    modalidade_pagamento: dados.formaPagamento || "Pix",
                    atualizado_em: agora
                });

                const q = query(collection(db, "matriculas"), where("aluno_id", "==", alunoId));
                const snapMat = await getDocs(q);
                snapMat.forEach((d) => {
                    batch.update(d.ref, {
                        aluno_nome: dados.alunoNome || "",
                        status_pagamento: statusNorm,
                        forma_pagamento: dados.formaPagamento || "Pix",
                        atualizado_em: agora
                    });
                });
            }
        }

        await batch.commit();
        console.log("✅ Transação editada");
    } catch (erro) {
        console.error("❌ Erro ao editar transação:", erro);
        throw erro;
    }
}

/* =========================================================================
 * EXCLUSÃO LÓGICA (SOFT DELETE)
 * ========================================================================= */

export async function excluirTransacaoFinanceira(id) {
    try {
        const agora = new Date().toISOString();
        await updateDoc(doc(db, NOME_COLECAO, id), {
            excluido: true,
            ultimaAlteracaoEm: agora,
            ultimaAlteracaoPor: auth.currentUser?.email || "Sistema"
        });
        console.log(`🗑️ Transação ${id} marcada como excluída`);
    } catch (erro) {
        console.error("❌ Erro ao excluir transação:", erro);
        throw erro;
    }
}