/**
 * =========================================================================
 * TRAINING WORK — SERVIÇO DE LEADS (lead-service.js)
 * =========================================================================
 *
 * Este arquivo é a "camada de serviço" dos leads.
 *
 * O QUE É UM SERVICE?
 * Um service só conversa com o Firestore (banco de dados).
 * Ele NÃO mexe em HTML, NÃO faz login, NÃO mostra mensagens.
 *
 * Pense num restaurante:
 *   - O SERVICE é o COZINHEIRO (só prepara os dados)
 *   - A UI (lead-ui.js) é o GARÇOM (leva os dados para a mesa/HTML)
 *   - O AUTH-GUARD é o PORTEIRO (verifica quem pode entrar)
 *
 * COLEÇÃO: /leads
 * Estrutura de um lead:
 *   {
 *     nome, email, telefone,
 *     curso_interesse_id, curso_interesse_nome,
 *     status, origem, criado_em, excluido
 *   }
 *
 * FUNÇÕES EXPORTADAS (o que este arquivo oferece):
 *   - escutarLeads(callback)              → escuta a coleção em tempo real
 *   - obterLeads()                        → lê todos uma vez
 *   - atualizarStatusLead(id, novoStatus) → muda o status
 *   - salvarEdicaoLead(id, dados)         → atualiza campos
 *   - excluirLead(id)                     → marca como excluído (soft delete)
 *   - restaurarLead(id)                   → restaura um lead excluído
 * =========================================================================
 */

import { auth, db } from "../firebase-config.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import {
    registrarAuditoriaGenerica,
    compararAlteracoes
} from "./auditoria-service.js";

// Nome da coleção no Firestore.
const NOME_COLECAO = "leads";


/* ==========================================================================
 * ESCUTA EM TEMPO REAL
 * ========================================================================== */

/**
 * Escuta todos os leads não-excluídos em tempo real.
 *
 * @param {Function} callback — recebe o array de leads (mais recentes primeiro)
 * @param {Object} opcoes — { incluirExcluidos: boolean }
 * @returns {Function} — função para CANCELAR a escuta (importante!)
 */
export function escutarLeads(callback, opcoes = {}) {
    const incluirExcluidos = opcoes.incluirExcluidos === true;
    const colRef = collection(db, NOME_COLECAO);

    return onSnapshot(
        colRef,

        // SUCESSO: o Firestore mandou os dados
        (snapshot) => {
            const leads = [];

            snapshot.forEach((docSnap) => {
                const dados = docSnap.data();

                // Ignora leads "excluídos" (soft delete) — a menos que peçam
                if (!incluirExcluidos && dados.excluido) return;

                leads.push({ id: docSnap.id, ...dados });
            });

            // Ordena: mais recentes primeiro
            leads.sort((a, b) => {
                const tempoA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
                const tempoB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
                return tempoB - tempoA;
            });

            if (typeof callback === "function") callback(leads);
        },

        // ERRO: algo deu errado (ex.: sem permissão)
        (erro) => {
            console.error("❌ Erro ao escutar /leads:", erro);
            if (typeof callback === "function") callback([]);
        }
    );
}


/* ==========================================================================
 * LEITURA PONTUAL
 * ========================================================================== */

/**
 * Lê todos os leads não-excluídos uma única vez.
 *
 * @returns {Promise<Array>} — array de leads
 */
export async function obterLeads() {
    try {
        const snap = await getDocs(collection(db, NOME_COLECAO));
        const leads = [];

        snap.forEach((d) => {
            const dados = d.data();
            if (!dados.excluido) {
                leads.push({ id: d.id, ...dados });
            }
        });

        return leads;
    } catch (erro) {
        console.error("❌ Erro ao obter leads:", erro);
        throw erro;
    }
}


/* ==========================================================================
 * ATUALIZAR STATUS DO LEAD
 * ========================================================================== */

/**
 * Atualiza o campo `status` de um lead.
 * Registra auditoria (tipo "alteracao", campo "status").
 *
 * @param {string} id — ID do documento do lead
 * @param {string} novoStatus — ex.: "Em Atendimento", "Convertido"
 */
export async function atualizarStatusLead(id, novoStatus) {
    try {
        const usuario = auth.currentUser?.email || "Sistema";
        const agora = new Date().toISOString();

        // 1. Lê estado atual (para saber o status anterior)
        const ref = doc(db, NOME_COLECAO, id);
        const snap = await getDoc(ref);
        const antes = snap.exists() ? snap.data() : {};

        // 2. Atualiza
        await updateDoc(ref, {
            status: novoStatus,
            atualizado_em: agora,
            atualizado_por: usuario
        });

        // 3. Auditoria
        await registrarAuditoriaGenerica("leads", id, {
            tipo: "alteracao",
            entidade: "lead",
            descricao: "Status alterado",
            campos_alterados: [{
                campo: "status",
                valor_anterior: antes.status ?? null,
                valor_novo: novoStatus
            }]
        });
    } catch (erro) {
        console.error("❌ Erro ao atualizar status do lead:", erro);
        throw erro;
    }
}


/* ==========================================================================
 * SALVAR EDIÇÃO COMPLETA
 * ========================================================================== */

/**
 * Atualiza vários campos do lead de uma só vez.
 * Registra auditoria com diff (compararAlteracoes).
 *
 * @param {string} id — ID do documento
 * @param {Object} dados — objeto com os campos a atualizar
 */
export async function salvarEdicaoLead(id, dados) {
    try {
        const usuario = auth.currentUser?.email || "Sistema";
        const agora = new Date().toISOString();

        // 1. Lê estado ANTES
        const ref = doc(db, NOME_COLECAO, id);
        const snap = await getDoc(ref);
        const antes = snap.exists() ? snap.data() : {};

        // 2. Atualiza
        await updateDoc(ref, {
            ...dados,
            atualizado_em: agora,
            atualizado_por: usuario
        });

        // 3. Auditoria — só registra se houve mudança real
        const camposAlterados = compararAlteracoes(antes, dados);

        if (camposAlterados.length > 0) {
            await registrarAuditoriaGenerica("leads", id, {
                tipo: "alteracao",
                entidade: "lead",
                descricao: `${camposAlterados.length} campo(s) alterado(s)`,
                campos_alterados: camposAlterados
            });
        }
    } catch (erro) {
        console.error("❌ Erro ao salvar edição do lead:", erro);
        throw erro;
    }
}


/* ==========================================================================
 * BUSCAR UM LEAD POR ID
 * ========================================================================== */

/**
 * Busca um lead específico por ID.
 *
 * @param {string} id — ID do documento
 * @returns {Promise<Object|null>} — os dados do lead, ou null se não existir
 */
export async function obterLeadPorId(id) {
    try {
        const snap = await getDoc(doc(db, NOME_COLECAO, id));

        if (!snap.exists()) {
            console.warn("⚠️ Lead não encontrado:", id);
            return null;
        }

        return { id: snap.id, ...snap.data() };
    } catch (erro) {
        console.error("❌ Erro ao buscar lead:", erro);
        throw erro;
    }
}


/* ==========================================================================
 * EXCLUSÃO LÓGICA (SOFT DELETE) + RESTAURAÇÃO
 * ========================================================================== */

/**
 * Marca um lead como excluído (não apaga de verdade).
 * Registra auditoria (tipo "exclusao").
 *
 * @param {string} id — ID do documento
 */
export async function excluirLead(id) {
    try {
        const usuario = auth.currentUser?.email || "Sistema";
        const agora = new Date().toISOString();

        await updateDoc(doc(db, NOME_COLECAO, id), {
            excluido: true,
            excluido_em: agora,
            excluido_por: usuario,
            atualizado_em: agora,
            atualizado_por: usuario
        });

        await registrarAuditoriaGenerica("leads", id, {
            tipo: "exclusao",
            entidade: "lead",
            descricao: "Lead excluído",
            campos_alterados: [{
                campo: "excluido",
                valor_anterior: false,
                valor_novo: true
            }]
        });
    } catch (erro) {
        console.error("❌ Erro ao excluir lead:", erro);
        throw erro;
    }
}

/**
 * Restaura um lead previamente excluído (soft delete).
 * Registra auditoria (tipo "restauracao").
 *
 * @param {string} id — ID do documento
 */
export async function restaurarLead(id) {
    try {
        const usuario = auth.currentUser?.email || "Sistema";
        const agora = new Date().toISOString();

        await updateDoc(doc(db, NOME_COLECAO, id), {
            excluido: false,
            excluido_em: null,
            excluido_por: null,
            atualizado_em: agora,
            atualizado_por: usuario
        });

        await registrarAuditoriaGenerica("leads", id, {
            tipo: "restauracao",
            entidade: "lead",
            descricao: "Lead restaurado",
            campos_alterados: [{
                campo: "excluido",
                valor_anterior: true,
                valor_novo: false
            }]
        });
    } catch (erro) {
        console.error("❌ Erro ao restaurar lead:", erro);
        throw erro;
    }
}