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
import { registrarAuditoriaGenerica, compararAlteracoes } from "./auditoria-service.js";
import { auth, db } from "../firebase-config.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    onSnapshot,
    addDoc,
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
        // 1. Busca o estado ANTES (para comparar depois)
        const transacaoRef = doc(db, NOME_COLECAO, id);
        const snapAntes = await getDoc(transacaoRef);

        if (!snapAntes.exists()) {
            throw new Error("Transação não encontrada.");
        }

        const dadosAntes = snapAntes.data();

        const batch = writeBatch(db);
        const agora = new Date().toISOString();
        const usuario = auth.currentUser?.email || "Sistema";

        const statusNorm = normalizarStatus(dados.status);
        const valorNum = parseFloat(dados.valor) || 0;

        // 2. Monta o payload do novo estado
        const dadosDepois = {
            tipo: dados.tipo || dadosAntes.tipo || "entrada",   // ← NOVO
            alunoNome: dados.alunoNome || "",
            valor: valorNum,
            status: statusNorm,
            formaPagamento: dados.formaPagamento || "Pix",
            dataPagamento: dados.dataPagamento || "",
            auditoriaFinanceira: dados.observacoes || "",
            ultimaAlteracaoEm: agora,
            ultimaAlteracaoPor: usuario
        };

        // 3. Detecta alterações (antes vs depois)
        const alteracoes = enriquecerComRotulos(compararAlteracoes(dadosAntes, dadosDepois));

        // 4. Atualiza a transação
        batch.update(transacaoRef, dadosDepois);

        // 5. Propaga em cascata
        const alunoId = dadosAntes.alunoId || dadosAntes.aluno_id;

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

        await batch.commit();

        // 6. Registra auditoria (só se houver mudanças reais)
        if (alteracoes.length > 0) {
            try {
                await registrarAuditoriaGenerica("financeiro", id, {
                    tipo: "alteracao",
                    entidade: "financeiro",
                    descricao: `${alteracoes.length} campo(s) alterado(s)`,
                    campos_alterados: alteracoes
                });
            } catch (errAud) {
                // Não falha a transação principal por causa da auditoria
                console.warn("⚠️ Falha ao registrar auditoria:", errAud);
            }
        }

        console.log(`✅ Transação ${id} editada — ${alteracoes.length} campo(s) alterado(s)`);

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

/* ==========================================================================
 * RÓTULOS AMIGÁVEIS PARA AUDITORIA
 * ========================================================================== */
const ROTULOS_FINANCEIRO = {
    "tipo": "Tipo",
    "alunoNome": "Nome do Aluno",
    "valor": "Valor",
    "status": "Status",
    "formaPagamento": "Forma de Pagamento",
    "dataPagamento": "Data de Pagamento",
    "auditoriaFinanceira": "Observações"
};

// Helper para adicionar rótulo nas alterações
function enriquecerComRotulos(alteracoes) {
    return alteracoes.map(a => ({
        ...a,
        rotulo: ROTULOS_FINANCEIRO[a.campo] || a.campo
    }));
}

/* =========================================================================
 * CRIAR NOVA TRANSAÇÃO
 * =========================================================================
 * Cria uma transação manualmente no financeiro.
 * Também propaga o status/pagamento para o aluno vinculado (se houver).
 * ========================================================================== */

export async function criarTransacaoFinanceira(dados) {
    try {
        const agora = new Date().toISOString();
        const usuario = auth.currentUser?.email || "Sistema";

        // Normaliza o status
        const statusNorm = normalizarStatus(dados.status);
        const valorNum = parseFloat(dados.valor) || 0;

        if (valorNum <= 0) {
            throw new Error("O valor deve ser maior que zero.");
        }

        // 1. Monta o payload da transação
        const payload = {
            tipo: dados.tipo || "entrada",        // ← NOVO
            alunoId: dados.alunoId || "",
            alunoNome: dados.alunoNome || "",
            curso: dados.curso || "Geral",
            valor: valorNum,
            status: statusNorm,
            formaPagamento: dados.formaPagamento || "Pix",
            dataPagamento: dados.dataPagamento || "",
            auditoriaFinanceira: dados.observacoes || "",
            ultimaAlteracaoEm: agora,
            ultimaAlteracaoPor: usuario,
            criadoEm: agora,
            criadoPor: usuario,
            excluido: false
        };

        // 2. Cria a transação
        const refNova = await addDoc(collection(db, NOME_COLECAO), payload);

        // 3. Propaga para o aluno (se houver alunoId)
        if (dados.alunoId) {
            try {
                const alunoRef = doc(db, "alunos", dados.alunoId);
                await updateDoc(alunoRef, {
                    status_pagamento: statusNorm,
                    modalidade_pagamento: dados.formaPagamento || "Pix",
                    atualizado_em: agora
                });
            } catch (errAluno) {
                console.warn("⚠️ Não foi possível atualizar o aluno:", errAluno);
            }
        }

        // 4. Registra auditoria de criação
        try {
            await registrarAuditoriaGenerica("financeiro", refNova.id, {
                tipo: "criacao",
                entidade: "financeiro",
                descricao: "Transação criada manualmente",
                campos_alterados: []
            });
        } catch (errAud) {
            console.warn("⚠️ Falha ao registrar auditoria de criação:", errAud);
        }

        console.log(`✅ Transação ${refNova.id} criada — R$ ${valorNum}`);
        return { id: refNova.id, ...payload };

    } catch (erro) {
        console.error("❌ Erro ao criar transação:", erro);
        throw erro;
    }
}